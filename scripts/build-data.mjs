/**
 * Build-time data pipeline.
 *
 * Reads the vendored EOTCDevAPI sinq-gitsawe collections (research/EOTCDevAPI,
 * MIT — see docs/ATTRIBUTION.md), normalizes Amharic/Ge'ez book titles to USFM
 * codes with English names, adds KJV-numbering psalm citations (the Ethiopian
 * Psalter follows LXX numbering), applies scripts/corrections.json where the
 * dataset's wording differs from the book, and emits compact JSON under
 * public/data/:
 *   daily/{1..13}.json  — fixed-cycle records for one Ethiopian month
 *   seasonal.json       — movable-cycle records
 *   monthly.json        — month/Sunday-cycle records
 *
 * The output is committed; deploys never need the research clone.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'research', 'EOTCDevAPI', 'data', 'sinq-gitsawe');
const out = join(root, 'public', 'data');

/** Amharic/Ge'ez book-title variants -> USFM code. Titles are matched after
 *  stripping spaces and normalizing Ge'ez/Arabic numerals to suffix digits. */
const BOOKS = {
  PSA: { en: 'Psalms', am: 'መዝሙረ ዳዊት' },
  MAT: { en: 'Matthew', am: 'የማቴዎስ ወንጌል' },
  MRK: { en: 'Mark', am: 'የማርቆስ ወንጌል' },
  LUK: { en: 'Luke', am: 'የሉቃስ ወንጌል' },
  JHN: { en: 'John', am: 'የዮሐንስ ወንጌል' },
  ACT: { en: 'Acts', am: 'ግብረ ሐዋርያት' },
  ROM: { en: 'Romans', am: 'ወደ ሮሜ ሰዎች' },
  '1CO': { en: '1 Corinthians', am: '፩ኛ ወደ ቆሮንቶስ ሰዎች' },
  '2CO': { en: '2 Corinthians', am: '፪ኛ ወደ ቆሮንቶስ ሰዎች' },
  GAL: { en: 'Galatians', am: 'ወደ ገላትያ ሰዎች' },
  EPH: { en: 'Ephesians', am: 'ወደ ኤፌሶን ሰዎች' },
  PHP: { en: 'Philippians', am: 'ወደ ፊልጵስዩስ ሰዎች' },
  COL: { en: 'Colossians', am: 'ወደ ቆላስይስ ሰዎች' },
  '1TH': { en: '1 Thessalonians', am: '፩ኛ ወደ ተሰሎንቄ ሰዎች' },
  '2TH': { en: '2 Thessalonians', am: '፪ኛ ወደ ተሰሎንቄ ሰዎች' },
  '1TI': { en: '1 Timothy', am: '፩ኛ ወደ ጢሞቴዎስ' },
  '2TI': { en: '2 Timothy', am: '፪ኛ ወደ ጢሞቴዎስ' },
  TIT: { en: 'Titus', am: 'ወደ ቲቶ' },
  PHM: { en: 'Philemon', am: 'ወደ ፊልሞና' },
  HEB: { en: 'Hebrews', am: 'ወደ ዕብራውያን' },
  JAS: { en: 'James', am: 'የያዕቆብ መልእክት' },
  '1PE': { en: '1 Peter', am: '፩ኛ የጴጥሮስ መልእክት' },
  '2PE': { en: '2 Peter', am: '፪ኛ የጴጥሮስ መልእክት' },
  '1JN': { en: '1 John', am: '፩ኛ የዮሐንስ መልእክት' },
  '2JN': { en: '2 John', am: '፪ኛ የዮሐንስ መልእክት' },
  '3JN': { en: '3 John', am: '፫ኛ የዮሐንስ መልእክት' },
  JUD: { en: 'Jude', am: 'የይሁዳ መልእክት' },
  REV: { en: 'Revelation', am: 'የዮሐንስ ራእይ' },
};

const GEEZ_DIGITS = { '፩': 1, '፪': 2, '፫': 3 };

/** Normalize one raw bookTitle string to a USFM code, or null. */
function bookCode(raw) {
  if (!raw) return null;
  const t = raw.replace(/\s+/g, ' ').trim();
  // ordinal: leading or trailing ፩/፪/፫/1/2/3 (with optional ኛ/ና)
  let ord = 0;
  const mTrail = t.match(/[፩፪፫123]\s*$/);
  const mLead = t.match(/^[፩፪፫123]/);
  const pick = (ch) => GEEZ_DIGITS[ch] ?? Number(ch);
  if (mTrail) ord = pick(mTrail[0].trim());
  else if (mLead) ord = pick(mLead[0]);
  const has = (s) => t.includes(s);
  if (has('ዳዊት') || has('መዝሙር')) return 'PSA';
  if (has('ማቴዎስ')) return 'MAT';
  if (has('ማርቆስ') || has('ማርዎስ')) return 'MRK';
  if (has('ሉቃስ')) return 'LUK';
  if (has('ዮሐንስ') && has('ወንጌል')) return 'JHN';
  if (has('ራእይ') || has('ራዕይ')) return 'REV';
  if (has('ግብረ')) return 'ACT';
  if (has('ሮሜ')) return 'ROM';
  if (has('ቆሮንቶስ')) return ord === 2 ? '2CO' : '1CO';
  if (has('ገላትያ')) return 'GAL';
  if (has('ኤፌሶን')) return 'EPH';
  if (has('ፊልጵስዩስ')) return 'PHP';
  if (has('ቆላስይስ') || has('ቈላስይስ')) return 'COL';
  if (has('ተሰሎንቄ')) return ord === 2 ? '2TH' : '1TH';
  if (has('ጢሞቴዎስ')) return ord === 2 ? '2TI' : '1TI';
  if (has('ቲቶ')) return 'TIT';
  if (has('ፊልሞና')) return 'PHM';
  if (has('ዕብራውያን')) return 'HEB';
  if (has('ያዕቆብ')) return 'JAS';
  if (has('ጴጥሮስ')) return ord === 2 ? '2PE' : '1PE';
  if (has('ዮሐንስ') && (has('መልእክት') || has('መልዕክት')))
    return ord === 3 ? '3JN' : ord === 2 ? '2JN' : '1JN';
  if (has('ይሁዳ')) return 'JUD';
  if (has('ዮሐንስ') && ord) return ord === 3 ? '3JN' : ord === 2 ? '2JN' : '1JN';
  return null;
}

/**
 * Ethiopian Psalter (LXX) chapter -> KJV chapter(s), verified against the
 * English (KJV) text embedded in the dataset's misbak records.
 */
function kjvPsalm(lxx) {
  if (lxx <= 8) return String(lxx);
  if (lxx === 9) return '9–10';
  if (lxx <= 112) return String(lxx + 1);
  if (lxx === 113) return '114–115';
  if (lxx === 114) return '116:1–9';
  if (lxx === 115) return '116:10–19';
  if (lxx <= 145) return String(lxx + 1);
  if (lxx === 146) return '147:1–11';
  if (lxx === 147) return '147:12–20';
  return String(lxx); // 148-150 (and 151) align
}

/** Compact one reading entry: {t: texts, v: verse ref, b: book code, en: english citation}. */
function reading(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const v = entry.verse ?? {};
  const code = bookCode(v.bookTitle);
  const o = {};
  const text = entry.text ?? {};
  if (text.geez) o.g = text.geez;
  if (text.amharic) o.a = text.amharic;
  if (text.english) o.e = text.english;
  if (v.bookTitle) o.bt = v.bookTitle;
  if (code) o.b = code;
  if (v.chapter != null) o.c = v.chapter;
  if (v.start != null) o.s = v.start;
  // A psalm reading is a misbak, two to four verses of it. Upstream carries a
  // few ends that cannot be verses at all — Psalm 3:5–66 in a psalm with eight
  // verses, 86:1–22 in one with seven — and printing them puts a citation in
  // front of a deacon that does not exist. The start is trustworthy and the
  // Ge'ez is right, so drop only the end rather than guess what it should have
  // been. Long ranges elsewhere are real: gospels do run thirty verses.
  const impossiblePsalmEnd =
    code === 'PSA' && v.start != null && v.end != null && v.end - v.start > 20;
  if (v.end != null && !impossiblePsalmEnd) o.n = v.end;
  if (v.endText) o.et = v.endText;
  // English citation string
  if (code && v.chapter != null) {
    const name = BOOKS[code].en;
    const end = impossiblePsalmEnd ? null : v.end;
    const range = v.start != null ? (end != null && end !== v.start ? `${v.start}–${end}` : `${v.start}`) : '';
    if (code === 'PSA') {
      o.kjv = `Psalm ${kjvPsalm(v.chapter)}` + (range ? ` (Eth. ${v.chapter}:${range})` : '');
    } else {
      o.en = `${name} ${v.chapter}` + (range ? `:${range}` : (v.endText ? 'ff' : ''));
      if (end == null && v.start != null) o.en += 'ff';
    }
  }
  return o;
}

/** Compact one service block (msbak/firstDeacon/secondDeacon/secondKahn/wengel/kidassie lists). */
function service(svc) {
  if (!svc) return null;
  const o = {};
  const slot = (key) => (Array.isArray(svc[key]) ? svc[key].map(reading).filter(Boolean) : []);
  const m = slot('msbak'); if (m.length) o.msbak = m;
  const fd = slot('firstDeacon'); if (fd.length) o.pauline = fd;
  const sd = slot('secondDeacon'); if (sd.length) o.catholic = sd;
  const sk = slot('secondKahn'); if (sk.length) o.acts = sk;
  const w = slot('wengel'); if (w.length) o.gospel = w;
  if (Array.isArray(svc.kidassie) && svc.kidassie.length) o.anaphora = svc.kidassie;
  return Object.keys(o).length ? o : null;
}

/**
 * Corrections read off the page scans, applied on the way out.
 *
 * The upstream dataset is a transcription, and a transcription of one printing:
 * where the book and the data disagree about a word, the book wins. Each entry
 * names the cycle and the record it belongs to, quotes the text it expects to
 * find, and must match exactly one reading — a correction that stops matching
 * (because upstream was fixed, or reworded, or the record moved) fails the
 * build rather than going quietly stale. docs/ATTRIBUTION.md carries the
 * reasoning; `scripts/corrections.json` carries the evidence per entry.
 */
const corrections = JSON.parse(readFileSync(join(root, 'scripts', 'corrections.json'), 'utf8'))
  .map((c) => ({ ...c, hits: 0 }));

/**
 * Apply every correction scoped to `cycle`. Takes {scope, record} pairs: the
 * scope is what a correction's `match` is tested against (for daily records
 * that is the month and day, which the emitted record itself does not carry),
 * and the record is what gets rewritten, in place.
 */
function correct(cycle, entries) {
  const scoped = corrections.filter((c) => c.cycle === cycle);
  if (!scoped.length) return;
  for (const { scope, record: rec } of entries) {
    for (const c of scoped) {
      if (c.match && Object.entries(c.match).some(([k, v]) => scope[k] !== v)) continue;
      for (const svc of Object.values(rec)) {
        if (!svc || typeof svc !== 'object') continue;
        for (const slot of Object.values(svc)) {
          if (!Array.isArray(slot)) continue;
          for (const entry of slot) {
            if (entry && entry[c.field] === c.from) {
              entry[c.field] = c.to;
              c.hits++;
            }
          }
        }
      }
    }
  }
}

/** Fail the build if a correction matched anything other than exactly one reading. */
function assertCorrectionsApplied() {
  const bad = corrections.filter((c) => c.hits !== 1);
  if (!bad.length) return;
  for (const c of bad) {
    console.error(`CORRECTION matched ${c.hits} readings (expected 1): ${c.where}`);
    console.error(`  looked for: ${c.from}`);
  }
  throw new Error(`${bad.length} correction(s) did not apply — see scripts/corrections.json`);
}

function services(rec) {
  const o = {};
  const serk = service(rec.serk); if (serk) o.serk = serk;
  // Upstream calls this slot `negh`; the book prints ምስባክ ዘነግሥ — the misbak
  // of the ማኅሌት, the night office — so that is what we emit and show.
  const negs = service(rec.negh); if (negs) o.negs = negs;
  const kid = service(rec.kidassie); if (kid) o.kidassie = kid;
  return o;
}

// ---- daily ----
const daily = JSON.parse(readFileSync(join(src, 'daily-gitsawe.json'), 'utf8'));
const byMonth = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i + 1, {}]));
const unmapped = new Map();
const audit = (rec, where) => {
  for (const svc of ['negh', 'kidassie', 'serk']) {
    for (const slotEntries of Object.values(rec[svc] ?? {})) {
      if (!Array.isArray(slotEntries)) continue;
      for (const e of slotEntries) {
        const bt = e?.verse?.bookTitle;
        if (bt && !bookCode(bt)) unmapped.set(bt, where);
      }
    }
  }
};
const dailyOut = [];
for (const rec of daily) {
  const [dd, mm] = rec.date.split('-').map(Number);
  audit(rec, `daily ${rec.date}`);
  byMonth[mm][dd] = {
    title: rec.title ?? null,
    sinksar: (rec.snksar ?? []).map((s) => s.amharic).filter(Boolean),
    ...services(rec),
  };
  dailyOut.push({ scope: { month: mm, day: dd }, record: byMonth[mm][dd] });
}
// Corrections rewrite the records in place, so this reaches byMonth too.
correct('daily', dailyOut);

// ---- seasonal ----
const seasonal = JSON.parse(readFileSync(join(src, 'seasonal-gitsawe.json'), 'utf8'));
const seasonalOut = seasonal.map((rec) => {
  audit(rec, `seasonal ${rec.raw}`);
  return {
    season: rec.season,
    week: rec.week ?? null,
    part: rec.part ?? null,
    title: rec.title ?? null,
    ...services(rec),
  };
});
correct('seasonal', seasonalOut.map((record) => ({ scope: record, record })));

// ---- monthly ----
const monthly = JSON.parse(readFileSync(join(src, 'monthly-gitsawe.json'), 'utf8'));
const monthlyOut = monthly.map((rec) => {
  audit(rec, `monthly ${rec.raw}`);
  return {
    month: rec.month,
    fromDay: rec.fromDay ?? null,
    toDay: rec.toDay ?? null,
    nthSunday: rec.nthSunday ?? null,
    crossMonth: !!rec.crossMonth,
    appliesTo: rec.appliesTo ?? null,
    mezmur: rec.mezmur ?? null,
    title: rec.title ?? null,
    ...services(rec),
  };
});
correct('monthly', monthlyOut.map((record) => ({ scope: record, record })));

// ---- write ----
// Nothing is written until every correction has found its reading, so a
// correction that no longer applies leaves public/data/ as it was rather than
// half rebuilt.
assertCorrectionsApplied();
mkdirSync(join(out, 'daily'), { recursive: true });
for (const [m, days] of Object.entries(byMonth)) {
  writeFileSync(join(out, 'daily', `${m}.json`), JSON.stringify(days));
}
writeFileSync(join(out, 'seasonal.json'), JSON.stringify(seasonalOut));
writeFileSync(join(out, 'monthly.json'), JSON.stringify(monthlyOut));
writeFileSync(join(out, 'books.json'), JSON.stringify(BOOKS));

if (unmapped.size) {
  console.warn('UNMAPPED BOOK TITLES:');
  for (const [t, w] of unmapped) console.warn(`  "${t}" (${w})`);
}

console.log(`daily: 13 files; seasonal: ${seasonalOut.length}; monthly: ${monthlyOut.length}; unmapped titles: ${unmapped.size}`);
