/**
 * The core value of the app: given a date, decide which Gitsawe readings apply.
 *
 * The printed Metsafe Gitsawe has three layers:
 *   1. the fixed daily cycle (one entry per Ethiopian month-day),
 *   2. the Sunday/month cycle at the back of the book (ወርኃዊ — by month,
 *      day-window or nth Sunday),
 *   3. the movable cycle tied to Bahire Hasab (Lent weeks, Eastertide Sundays,
 *      Advent named weeks, kremt Sundays, …).
 *
 * On Sundays and movable-season days the seasonal/monthly reading takes the
 * liturgy; the fixed daily entry remains valid for the commemoration and is
 * always returned as a candidate too. Where the digitized data has no record
 * for a matching Sunday, we say so explicitly instead of guessing.
 */
import { daysInEthMonth, ethToJDN, jdnToEth, jdnToGreg, jdnToWeekday } from './ethiopic';
import { bahireHasab, movableFeastJDN } from './bahirehasab';
import type { Candidate, DayInfo, DayRecord, ExtraRecord, MonthlyRecord, SeasonalRecord } from './types';

export interface Dataset {
  seasonal: SeasonalRecord[];
  monthly: MonthlyRecord[];
  /** Sunday records transcribed from the book's back section. */
  extra: ExtraRecord[];
  /** daily records of the Ethiopian month of the queried date, keyed by day. */
  daily: Record<string, DayRecord>;
}

/**
 * The Sundays of the movable cycle carry canonical names rather than a printed
 * "መዝሙር …" header — ዘወረደ, ቅድስት, ደብረ ዘይት and the rest. Keyed by season and week.
 */
const NAMED_SUNDAYS: Record<string, string> = {
  'neneweTsom:1': 'ዘነነዌ',
  'abiyTsom:1': 'ዘወረደ',
  'abiyTsom:2': 'ቅድስት',
  'abiyTsom:3': 'ምኵራብ',
  'abiyTsom:4': 'መጻጉዕ',
  'abiyTsom:5': 'ደብረ ዘይት',
  'abiyTsom:6': 'ገብር ኄር',
  'abiyTsom:7': 'ኒቆዲሞስ',
  'abiyTsom:8': 'ሆሳዕና',
  'holy_thursday:null': 'ጸሎተ ሐሙስ',
  'erget:null': 'ዕርገት',
  'genaTsom:2': 'ስብከት',
  'genaTsom:3': 'ብርሃን',
  'genaTsom:4': 'ኖላዊ',
  'astemhro:null': 'አስተምህሮ',
  'zere_demena:null': 'ዘርዕ ደመና',
};

/**
 * The Yaredian mezmur that names a Sunday. The book prints it in the section
 * header ("፬ኛ መዝሙር፡ አምላኪየ ኄር"), so for most records we recover it from the
 * title; monthly records carry it in a field, and the movable Sundays are
 * named from the table above.
 */
export function mezmurOf(
  record: DayRecord & { mezmur?: string | null; season?: string; week?: number | null },
): string | null {
  if (record.mezmur) return record.mezmur;
  if (record.season) {
    const named = NAMED_SUNDAYS[`${record.season}:${record.week ?? 'null'}`];
    if (named) return named;
  }
  const title = record.title ?? '';
  const printed = title.match(/መዝሙር[፡:\s]*(.+?)(?:።|$)/);
  if (printed) return printed[1].trim() || null;
  return null;
}

const SUNDAY = 0;

function findSeasonal(data: Dataset, season: string, week: number | null, part: number | null) {
  return data.seasonal.find((r) => r.season === season && r.week === week && r.part === part) ?? null;
}

/** nth Sunday on-or-after startJDN for a given jdn (jdn must be a Sunday). */
function nthSundaySince(startJDN: number, jdn: number): number {
  return Math.floor((jdn - startJDN) / 7) + 1;
}

/** The last Sunday falling on or before a jdn. */
function lastSundayOnOrBefore(jdn: number): number {
  return jdn - jdnToWeekday(jdn);
}

interface Ctx {
  jdn: number;
  eth: { year: number; month: number; day: number };
  weekday: number;
  paschal: {
    nineveh: number; lentStart: number; debreZeit: number; hosanna: number;
    siklet: number; fasika: number; erget: number; peraklitos: number;
  } | null;
}

/** Paschal anchors of the cycle that covers this jdn, if any (Nineveh eve → Pentecost + weeks after). */
function paschalCtx(jdn: number): Ctx['paschal'] {
  const year = jdnToEth(jdn).year;
  for (const y of [year + 1, year, year - 1]) {
    if (y < 1) continue;
    const nineveh = movableFeastJDN(y, 'nineveh');
    const nextNineveh = movableFeastJDN(y + 1, 'nineveh');
    // the movable cycle "owns" dates from its Nineveh until the next year's Nineveh
    if (jdn >= nineveh && jdn < nextNineveh) {
      return {
        nineveh,
        lentStart: movableFeastJDN(y, 'abiy_tsome'),
        debreZeit: movableFeastJDN(y, 'debre_zeit'),
        hosanna: movableFeastJDN(y, 'hosanna'),
        siklet: movableFeastJDN(y, 'siklet'),
        fasika: movableFeastJDN(y, 'fasika'),
        erget: movableFeastJDN(y, 'erget'),
        peraklitos: movableFeastJDN(y, 'peraklitos'),
      };
    }
  }
  return null;
}

const LENT_SUNDAY_NAMES = ['ዘወረደ', 'ቅድስት', 'ምኵራብ', 'መጻጉዕ', 'ደብረ ዘይት', 'ገብር ኄር', 'ኒቆዲሞስ', 'ሆሳዕና'];

/** Movable-cycle candidates. Highest precedence. */
function movableCandidates(ctx: Ctx, data: Dataset): Candidate[] {
  const p = ctx.paschal;
  if (!p) return [];
  const { jdn, weekday } = ctx;
  const out: Candidate[] = [];
  const push = (rec: SeasonalRecord | null, reasonEn: string, reasonAm: string) => {
    if (rec) out.push({ kind: 'seasonal', record: rec, reasonEn, reasonAm });
  };

  // Fast of Nineveh: Monday–Wednesday.
  if (jdn >= p.nineveh && jdn <= p.nineveh + 2) {
    push(findSeasonal(data, 'neneweTsom', 1, null), 'Fast of Nineveh', 'ጾመ ነነዌ');
    return out;
  }

  // Great Lent: Sunday of week n = Hosanna − 7×(8−n); ዘወረደ is the Sunday before the Monday start.
  const zewerede = p.lentStart - 1;
  if (jdn >= zewerede && jdn < p.hosanna) {
    const week = Math.floor((jdn - zewerede) / 7) + 1;
    const name = LENT_SUNDAY_NAMES[week - 1] ?? `week ${week}`;
    if (weekday === SUNDAY) {
      push(findSeasonal(data, 'abiyTsom', week, null),
        `${ordinal(week)} Sunday of Great Lent (${name})`, `${name} — ዘዐቢይ ጾም ${week}ኛ ሰንበት`);
    } else if (week === 7 && weekday === 5) {
      push(findSeasonal(data, 'abiyTsom', 7, 5), 'Friday concluding the Forty Days (ተፅዒኖ)', 'ዘዓርብ ተፍጻሜተ ጾመ ፵ (ተፅዒኖ)');
    } else {
      push(findSeasonal(data, 'abiyTsom', week, null),
        `Week of ${name} (Great Lent, week ${week}) — Sunday readings of the week`, `የ${name} ሳምንት (ዐቢይ ጾም)`);
    }
    return out;
  }

  // Holy Week.
  if (jdn >= p.hosanna && jdn < p.fasika) {
    if (jdn === p.hosanna) {
      push(findSeasonal(data, 'abiyTsom', 8, null), 'Hosanna (Palm Sunday)', 'ሆሳዕና');
    } else if (jdn === p.siklet - 1) {
      push(findSeasonal(data, 'holy_thursday', null, null), 'Holy Thursday (ጸሎተ ሐሙስ)', 'ጸሎተ ሐሙስ');
    }
    // Other Passion-week days follow the ግብረ ሕማማት, not the Gitsawe daily cycle.
    return out;
  }

  // Eastertide and after: Sundays counted from Easter (Easter itself = 1st).
  if (jdn >= p.fasika) {
    if (jdn === p.erget) {
      push(findSeasonal(data, 'erget', null, null), 'Ascension (ዕርገት)', 'ዕርገት');
      return out;
    }
    if (weekday === SUNDAY) {
      const nth = nthSundaySince(p.fasika, jdn);
      const rec = findSeasonal(data, 'tnsae', nth, null);
      const label = jdn === p.fasika ? 'Easter (Tinsae)'
        : jdn === p.peraklitos ? 'Pentecost (Peraklitos)'
        : `${ordinal(nth)} Sunday of the Resurrection cycle`;
      const labelAm = jdn === p.fasika ? 'በዓለ ትንሣኤ' : jdn === p.peraklitos ? 'በዓለ ጰራቅሊጦስ' : `ዘትንሣኤ ${nth}ኛ እሑድ`;
      // Sundays after Pentecost only match when the book has a numbered record
      // (e.g. the 11th); otherwise the fixed-window seasons below take over.
      if (rec) push(rec, label, labelAm);
    }
  }
  return out;
}

/** Fixed-window seasonal candidates (Advent, Christmastide, kremt, filseta, …). */
function windowCandidates(ctx: Ctx, data: Dataset): Candidate[] {
  const { jdn, eth, weekday } = ctx;
  const y = eth.year;
  const at = (m: number, d: number) => ethToJDN(y, m, d);
  const out: Candidate[] = [];
  const push = (rec: SeasonalRecord | null, reasonEn: string, reasonAm: string) => {
    if (rec) out.push({ kind: 'seasonal', record: rec, reasonEn, reasonAm });
  };
  const isSunday = weekday === SUNDAY;

  // ጾመ ነቢያት / Advent: fast begins Hidar 15; named weeks by Tahsas date.
  const fastStart = at(3, 15);
  if (jdn >= at(4, 7) && jdn <= at(4, 13)) {
    push(findSeasonal(data, 'genaTsom', 2, null), 'Week of Sibket (Tahsas 7–13)', 'ስብከት (ታኅሣሥ ፯–፲፫)');
  } else if (jdn >= at(4, 14) && jdn <= at(4, 20)) {
    push(findSeasonal(data, 'genaTsom', 3, null), 'Week of Birhan (Tahsas 14–20)', 'ብርሃን (ታኅሣሥ ፲፬–፳)');
  } else if (jdn >= at(4, 21) && jdn <= at(4, 27)) {
    push(findSeasonal(data, 'genaTsom', 4, null), 'Week of Nolawi (Tahsas 21–27)', 'ኖላዊ (ታኅሣሥ ፳፩–፳፯)');
  }
  if (isSunday && jdn >= fastStart && jdn < at(4, 7)) {
    const nth = nthSundaySince(fastStart, jdn);
    push(findSeasonal(data, 'genaTsom', 1, nth),
      `${ordinal(nth)} Sunday of the Fast of the Prophets`, `ዘጾመ ነቢያት ${nth}ኛ እሑድ`);
  }

  // Christmastide (ዘመነ ልደት/አስተርእዮ): Sundays counted from Gena (Tahsas 29)
  // until Zewerede Sunday (Lent eve) — Nineveh is Mon–Wed and never takes a Sunday.
  const gena = at(4, 29);
  const zeweredeBound = movableFeastJDN(y, 'abiy_tsome') - 1;
  if (isSunday && jdn > gena && jdn < zeweredeBound && jdn <= at(7, 10)) {
    const nth = nthSundaySince(gena + 1, jdn);
    push(findSeasonal(data, 'lidet', nth, null),
      `${ordinal(nth)} Sunday after the Nativity`, `ዘልደት ${nth}ኛ እሑድ`);
  }

  // ዘመነ ክረምት block.
  if (jdn >= at(10, 17) && jdn <= at(10, 25)) {
    push(findSeasonal(data, 'astemhro', null, null), 'Astemhro (Sene 17–25)', 'አስተምህሮ (ሰኔ ፲፯–፳፭)');
  }
  if (jdn >= at(10, 26) && jdn <= at(11, 18)) {
    push(findSeasonal(data, 'zere_demena', null, null), "Zer'e Demena — kremt begins (Sene 26 – Hamle 18)", 'ዘርዕ ደመና (ሰኔ ፳፮ – ሐምሌ ፲፰)');
  }
  const kremtStart = at(10, 26);
  const inFilseta = jdn >= at(12, 1) && jdn <= at(12, 16);
  if (isSunday && jdn > at(11, 18) && jdn < at(12, 1)) {
    // Sundays between Kirkos (Hamle 18) and the Fast of Filseta: count from Sene 26.
    const nth = nthSundaySince(kremtStart, jdn);
    push(findSeasonal(data, 'kremt', nth, null),
      `${ordinal(nth)} Sunday of Kremt (the rainy season)`, `ዘክረምት ${nth}ኛ ሰንበት`);
  }
  if (isSunday && inFilseta) {
    const nth = nthSundaySince(at(12, 1), jdn);
    push(findSeasonal(data, 'filseta', nth, null),
      `${ordinal(nth)} Sunday of the Fast of Filseta (Assumption)`, `ዘፍልሰታ ${nth}ኛ ሰንበት`);
  }

  // Pagumen Sunday.
  if (isSunday && eth.month === 13) {
    push(findSeasonal(data, 'pagumen', null, null), 'Sunday in Pagumen', 'ዘጳጉሜን ሰንበት');
  }

  // After Filseta the book leaves the kremt count and names the closing
  // Sundays of the year: ደለያት/ዐይነ ኵሉ up to the Sunday of Abraham, then
  // ጎህ/ጽባሕ from Abraham to John. The last Sunday of Nehase stands as ዮሐንስ.
  if (isSunday && eth.month === 12 && eth.day > 16) {
    // ዮሐንስ is the year's final Sunday. When Pagumen carries a Sunday that
    // Sunday is ዮሐንስ and has its own record, so Nehase stays in ዐይነ ኵሉ.
    const lastDay = ethToJDN(eth.year, 13, daysInEthMonth(eth.year, 13));
    const yearsLastSunday = lastSundayOnOrBefore(lastDay);
    const isYohannes = jdn === yearsLastSunday;
    const ordered = [
      ...data.extra.filter((r) => r.period === (isYohannes ? 'gohTsibah' : 'ayneKulu')),
      ...data.extra.filter((r) => r.period !== (isYohannes ? 'gohTsibah' : 'ayneKulu')),
    ];
    for (const rec of ordered) {
      out.push({
        kind: 'extra',
        record: rec,
        reasonEn: `${rec.periodEn} — ${ordinal(rec.order)} mezmur`,
        reasonAm: `${rec.periodAm} — ${rec.order}ኛ መዝሙር`,
        mezmur: rec.mezmur,
        unverified: true,
      });
    }
  }
  return out;
}

/** Month/Sunday-cycle candidates (the back-of-book section the user described). */
function monthlyCandidates(ctx: Ctx, data: Dataset): Candidate[] {
  const { jdn, eth, weekday } = ctx;
  if (weekday !== SUNDAY) return [];
  const out: Candidate[] = [];
  const push = (rec: MonthlyRecord | undefined, reasonEn: string, reasonAm: string) => {
    if (rec) out.push({ kind: 'monthly', record: rec, reasonEn, reasonAm, mezmur: rec.mezmur });
  };

  // Meskerem day windows (incl. the Meskerem-25-if-Sunday special, which
  // matches the narrower 25–25 window first).
  if (eth.month === 1) {
    const special = data.monthly.find((r) => r.month === 'meskerem' && r.fromDay === 25 && r.toDay === 25 && eth.day === 25);
    if (special) push(special, 'Meskerem 25 falling on a Sunday', 'መስከረም ፳፭ በእሑድ');
    else {
      push(
        data.monthly.find((r) => r.month === 'meskerem' && r.fromDay != null && !r.crossMonth &&
          eth.day >= r.fromDay! && eth.day <= r.toDay! && !(r.fromDay === 25 && r.toDay === 25)),
        `Sunday of Meskerem ${eth.day}`, `ዘመስከረም እሑድ`);
    }
  }

  // ዘመነ ጽጌ: nth Sunday counted from Meskerem 26 (window Meskerem 26 – Hidar 5;
  // in some years the 6th Sunday of the count lands the week after Hidar 5).
  const tsigeStart = ethToJDN(eth.year, 1, 26);
  const tsigeEnd = ethToJDN(eth.year, 3, 11);
  if (jdn >= tsigeStart && jdn <= tsigeEnd) {
    const nth = nthSundaySince(tsigeStart, jdn);
    if (nth <= 6) {
      push(data.monthly.find((r) => r.month === 'tsige' && r.nthSunday === nth),
        `${ordinal(nth)} Sunday of Tsige (Season of Flowers)`, `ዘጽጌ ${nth}ኛ ሰንበት`);
    }
  }

  // Hidar 4th/5th Sundays.
  if (eth.month === 3) {
    const nthOfMonth = Math.ceil(eth.day / 7);
    push(data.monthly.find((r) => r.month === 'hidar' && r.nthSunday === nthOfMonth),
      `${ordinal(nthOfMonth)} Sunday of Hidar`, `ዘኅዳር ${nthOfMonth}ኛ ሰንበት`);
  }
  return out;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Liturgical season badge (independent of which record wins). */
function seasonBadge(ctx: Ctx): { key: string; am: string; en: string } | null {
  const { jdn, eth } = ctx;
  const p = ctx.paschal;
  const at = (m: number, d: number) => ethToJDN(eth.year, m, d);
  if (p) {
    if (jdn >= p.nineveh && jdn <= p.nineveh + 2) return { key: 'nineveh', am: 'ጾመ ነነዌ', en: 'Fast of Nineveh' };
    if (jdn >= p.hosanna && jdn < p.fasika) return { key: 'himamat', am: 'ሰሙነ ሕማማት', en: 'Holy Week' };
    if (jdn >= p.lentStart - 1 && jdn < p.hosanna) return { key: 'lent', am: 'ዐቢይ ጾም', en: 'Great Lent' };
    if (jdn >= p.fasika && jdn <= p.peraklitos) return { key: 'eastertide', am: 'ዘመነ ትንሣኤ', en: 'Eastertide (the Fifty Days)' };
  }
  if (jdn >= at(1, 26) && jdn <= at(3, 5)) return { key: 'tsige', am: 'ዘመነ ጽጌ', en: 'Season of Flowers (Tsige)' };
  if (jdn >= at(3, 15) && jdn <= at(4, 28)) return { key: 'sibket', am: 'ዘመነ ስብከት (ጾመ ነቢያት)', en: 'Advent — Fast of the Prophets' };
  if (jdn >= at(4, 29) && p && jdn < p.nineveh) return { key: 'astereyo', am: 'ዘመነ አስተርእዮ', en: 'Season of Epiphany' };
  if (jdn >= at(10, 26) || eth.month === 13) return { key: 'kremt', am: 'ዘመነ ክረምት', en: 'Kremt (Rainy Season)' };
  return null;
}

/** Simple fasting flag: major fast windows + Wednesday/Friday. */
function fastingBadge(ctx: Ctx): { active: boolean; am: string; en: string } | null {
  const { jdn, eth, weekday } = ctx;
  const p = ctx.paschal;
  const at = (m: number, d: number) => ethToJDN(eth.year, m, d);
  if (p) {
    if (jdn >= p.nineveh && jdn <= p.nineveh + 2) return { active: true, am: 'ጾመ ነነዌ', en: 'Fast of Nineveh' };
    if (jdn >= p.lentStart && jdn < p.fasika) return { active: true, am: 'ዐቢይ ጾም', en: 'Great Lent' };
    if (jdn >= p.fasika && jdn <= p.peraklitos) return null; // fast-free fifty days
  }
  if (jdn >= at(3, 15) && jdn <= at(4, 28)) return { active: true, am: 'ጾመ ነቢያት', en: 'Fast of the Prophets (Advent)' };
  if (jdn >= at(12, 1) && jdn <= at(12, 15)) return { active: true, am: 'ጾመ ፍልሰታ', en: 'Fast of the Assumption (Filseta)' };
  // Apostles' fast: Pentecost+1 until Hamle 5 feast of Peter & Paul.
  if (p && jdn > p.peraklitos && jdn >= movableFeastJDN(jdnToEth(p.fasika).year, 'tsome_hawaryat') && jdn < at(11, 5) && jdn >= at(9, 1)) {
    return { active: true, am: 'ጾመ ሐዋርያት', en: "Apostles' Fast" };
  }
  if (weekday === 3 || weekday === 5) return { active: true, am: 'ጾመ ድህነት (ረቡዕ/ዓርብ)', en: 'Wednesday/Friday fast' };
  return null;
}

/** Major feast labels for the header (movable + a few fixed). */
function feastLabels(ctx: Ctx): { am: string; en: string }[] {
  const { jdn, eth } = ctx;
  const out: { am: string; en: string }[] = [];
  const p = ctx.paschal;
  if (p) {
    if (jdn === p.fasika) out.push({ am: 'በዓለ ትንሣኤ', en: 'Easter — the Resurrection' });
    if (jdn === p.hosanna) out.push({ am: 'ሆሳዕና', en: 'Palm Sunday' });
    if (jdn === p.siklet) out.push({ am: 'ስቅለት', en: 'Good Friday' });
    if (jdn === p.erget) out.push({ am: 'ዕርገት', en: 'Ascension' });
    if (jdn === p.peraklitos) out.push({ am: 'ጰራቅሊጦስ', en: 'Pentecost' });
  }
  const fixed: Record<string, { am: string; en: string }> = {
    '1-1': { am: 'ዕንቁጣጣሽ (አዲስ ዓመት)', en: 'Ethiopian New Year' },
    '1-17': { am: 'መስቀል', en: 'Finding of the True Cross (Meskel)' },
    '4-29': { am: 'ልደት (ገና)', en: 'Nativity (Gena)' },
    '5-11': { am: 'ጥምቀት', en: 'Epiphany (Timket)' },
    '7-29': { am: 'ትስብእት (ብስራት)', en: 'Annunciation' },
    '12-16': { am: 'ፍልሰታ', en: 'Assumption of St. Mary (Filseta)' },
  };
  const f = fixed[`${eth.month}-${eth.day}`];
  if (f) out.push(f);
  return out;
}

/** Resolve everything the UI needs for one date. */
export function resolveDay(jdn: number, data: Dataset): DayInfo {
  const eth = jdnToEth(jdn);
  const greg = jdnToGreg(jdn);
  const weekday = jdnToWeekday(jdn);
  const ctx: Ctx = { jdn, eth, weekday, paschal: paschalCtx(jdn) };
  const isSunday = weekday === SUNDAY;

  const candidates: Candidate[] = [
    ...movableCandidates(ctx, data),
    ...windowCandidates(ctx, data),
    ...monthlyCandidates(ctx, data),
  ].map((c) => ({ ...c, mezmur: c.mezmur ?? mezmurOf(c.record) }));

  // The fixed daily record is always a candidate (primary on ordinary weekdays).
  const dailyRec = data.daily[String(eth.day)];
  if (dailyRec) {
    candidates.push({
      kind: 'daily',
      record: dailyRec,
      reasonEn: `Daily cycle — the fixed reading for this day of the month`,
      reasonAm: 'የዕለቱ ግጻዌ (ወርኃዊ ዑደት)',
    });
  }

  // On ordinary (non-Sunday, non-seasonal-override) days the daily record leads.
  const hasOverride = candidates.some((c) => c.kind !== 'daily');
  if (!isSunday && hasOverride) {
    // On weekdays inside named weeks, the daily record still leads; the
    // seasonal record is context. Exceptions: Nineveh days, Lent Friday
    // ተፅዒኖ, Holy Thursday, Ascension — the movable record leads there.
    const movableLeads = ctx.paschal && (
      (jdn >= ctx.paschal.nineveh && jdn <= ctx.paschal.nineveh + 2) ||
      (jdn >= ctx.paschal.hosanna && jdn < ctx.paschal.fasika) ||
      jdn === ctx.paschal.erget ||
      (candidates[0]?.reasonEn.includes('Friday concluding'))
    );
    if (!movableLeads) {
      const di = candidates.findIndex((c) => c.kind === 'daily');
      if (di > 0) {
        const [d] = candidates.splice(di, 1);
        candidates.unshift(d);
      }
    }
  }

  const gapNote = isSunday && !hasOverride
    ? 'No Sunday-cycle record is digitized for this Sunday yet — showing the fixed daily reading. Cross-check the PDF.'
    : null;

  return {
    jdn, greg, eth, weekday, isSunday,
    evangelist: bahireHasab(eth.year).evangelist,
    season: seasonBadge(ctx),
    fasting: fastingBadge(ctx),
    feasts: feastLabels(ctx),
    candidates,
    gapNote,
  };
}
