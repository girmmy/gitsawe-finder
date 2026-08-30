/**
 * Plain-text builders for the copy / share buttons.
 *
 * The shape is the one a deacon actually posts to a group chat: the mezmur as
 * the heading, the three epistles as bare English citations, the misbak as a
 * psalm reference with its transliteration and translation line by line, the
 * gospel, and the anaphora. No Ge'ez script, no reader labels, no incipits —
 * those live in the app, not in the message.
 */
import { MONTHS, WEEKDAYS, toGeez } from './ethiopic';
import type { BookNames } from './data';
import { translit } from './translit';
import { serviceOf, type Candidate, type DayInfo, type Reading, type Service } from './types';

const GREG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function ethDateString(day: DayInfo): string {
  const m = MONTHS[day.eth.month - 1];
  return `${m.am} ${toGeez(day.eth.day)} ${toGeez(day.eth.year)} ዓ.ም`;
}

export function gregDateString(day: DayInfo): string {
  return `${GREG_MONTHS[day.greg.month - 1]} ${day.greg.day}, ${day.greg.year}`;
}

/**
 * Ethiopian (Septuagint) psalm chapter -> the KJV chapter it prints as.
 * Only the plain one-to-one cases return a number; the split psalms return
 * their KJV label as given.
 */
export function kjvPsalm(lxx: number): string {
  if (lxx <= 8) return String(lxx);
  if (lxx === 9) return '9-10';
  if (lxx <= 112) return String(lxx + 1);
  if (lxx === 113) return '114-115';
  if (lxx === 114) return '116:1-9';
  if (lxx === 115) return '116:10-19';
  if (lxx <= 145) return String(lxx + 1);
  if (lxx === 146) return '147:1-11';
  if (lxx === 147) return '147:12-20';
  return String(lxx);
}

/** The fourteen anaphoras, so ዘኤጲፋንዮስ reads as "Kidasse Epifanyos". */
const ANAPHORAS: { match: string; name: string; english: string }[] = [
  { match: 'ሐዋርያት', name: 'Hawaryat', english: 'Anaphora of the Apostles' },
  { match: 'እግዚእነ', name: 'Egziene', english: 'Anaphora of Our Lord' },
  { match: 'ነጐድጓድ', name: 'Yohannes Welde Negodgwad', english: 'Anaphora of St. John, Son of Thunder' },
  { match: 'እግዝእትነ', name: 'Egzitene Maryam', english: 'Anaphora of St. Mary' },
  { match: 'ማርያም', name: 'Maryam', english: 'Anaphora of St. Mary' },
  { match: 'አትናቴዎስ', name: 'Atnatewos', english: 'Anaphora of St. Athanasius' },
  { match: 'ባስልዮስ', name: 'Baselyos', english: 'Anaphora of St. Basil' },
  { match: 'ኑሲስ', name: 'Gorgoryos ze-Nusis', english: 'Anaphora of St. Gregory of Nyssa' },
  { match: 'ጎርጎርዮስ', name: 'Gorgoryos', english: 'Anaphora of St. Gregory' },
  { match: 'ኤጲፋንዮስ', name: 'Epifanyos', english: 'Anaphora of St. Epiphanius' },
  { match: 'አፈ ወርቅ', name: 'Yohannes Afe Werq', english: 'Anaphora of St. John Chrysostom' },
  { match: 'ቄርሎስ', name: 'Qerlos', english: 'Anaphora of St. Cyril' },
  { match: 'ሥሩግ', name: "Ya'eqob ze-Sirug", english: 'Anaphora of St. Jacob of Serug' },
  { match: 'ዲዮስቆሮስ', name: 'Diyosqoros', english: 'Anaphora of St. Dioscorus' },
  { match: 'ምዕት', name: 'Selestu Me\'et', english: 'Anaphora of the 318 Nicene Fathers' },
];

function anaphoraLine(names: string[]): string | null {
  const parts = names.map((raw) => {
    const known = ANAPHORAS.find((a) => raw.includes(a.match));
    if (known) return `Kidasse ${known.name} (${known.english})`;
    // Unknown: strip the relative ዘ- prefix and transliterate what is left.
    const bare = raw.replace(/^ዘ/, '').replace(/\s*\(.*\)\s*$/, '').trim();
    return `Kidasse ${translit(bare)}`;
  });
  return parts.length ? parts.join(' / ') : null;
}

/** "Hebrews 3:1-end", "James 5:1-12", "Psalm 144(145):15-16". */
export function shortCitation(r: Reading, books: BookNames): string | null {
  if (!r.b || r.c == null) return r.en ?? null;
  const isPsalm = r.b === 'PSA';
  const book = isPsalm ? 'Psalm' : (books[r.b]?.en ?? r.b);
  const chapter = isPsalm ? `${r.c}(${kjvPsalm(r.c)})` : String(r.c);
  if (r.s == null) return `${book} ${chapter}`;
  // No end verse means the lectionary runs it to the end of the chapter.
  const end = r.n == null ? 'end' : (r.n === r.s ? null : String(r.n));
  return `${book} ${chapter}:${r.s}${end ? `-${end}` : ''}`;
}

/**
 * The bilingual citation the app's reading panels show: the Amharic book name
 * with Ge'ez numerals, and the English reference alongside it.
 */
export function citation(r: Reading, books: BookNames): { am: string | null; en: string | null } {
  let am: string | null = null;
  const bookAm = (r.b && books[r.b]?.am) || r.bt || null;
  if (bookAm && r.c != null) {
    am = `${bookAm} ${toGeez(r.c)}`;
    if (r.s != null) {
      am += `፥${toGeez(r.s)}`;
      if (r.n != null && r.n !== r.s) am += `–${toGeez(r.n)}`;
    }
  }
  // Prefer the explicit range ("Hebrews 3:1-end") over a vague "3:1ff".
  const en = shortCitation(r, books) ?? r.kjv ?? r.en ?? null;
  return { am, en };
}

/** Split a misbak into its clauses so translit and translation line up. */
function geezLines(text: string): string[] {
  return text.split('።').map((s) => s.trim()).filter(Boolean);
}

/**
 * The English of a misbak, one line per chanted clause. Where a record supplies
 * `el` the lines are used as given; otherwise a single blob is split on
 * sentence boundaries, which is a guess and can fall out of step with the Ge'ez.
 */
export function misbakEnglishLines(r: Reading): string[] {
  if (r.el?.length) return r.el.map((s) => s.trim()).filter(Boolean);
  if (!r.e) return [];
  return r.e
    .split(/(?<=[;.])\s+/)
    .map((s) => s.trim().replace(/[;.]$/, '').trim())
    .filter(Boolean);
}

function block(title: string, lines: string[]): string[] {
  return lines.length ? [`${title}:`, ...lines, ''] : [];
}

/** The message for one service, in the group-chat shape. */
function serviceBody(svc: Service, books: BookNames): string[] {
  const out: string[] = [];

  const readings = (['pauline', 'catholic', 'acts'] as const)
    .flatMap((slot) => (svc[slot] ?? []).map((r) => shortCitation(r, books)))
    .filter((s): s is string => !!s);
  out.push(...block('Readings', readings));

  for (const m of svc.msbak ?? []) {
    const lines: string[] = [];
    const ref = shortCitation(m, books);
    if (ref) lines.push(ref);
    if (m.g) lines.push(...geezLines(m.g).map(translit));
    out.push(...block('Misbak', lines));
    out.push(...block('Translation', misbakEnglishLines(m)));
  }

  const gospel = (svc.gospel ?? []).map((r) => shortCitation(r, books)).filter((s): s is string => !!s);
  out.push(...block('Gospel Reading', gospel));

  const anaphora = anaphoraLine(svc.anaphora ?? []);
  if (anaphora) out.push(anaphora);

  return out;
}

/** The heading: the mezmur names the day. */
function heading(day: DayInfo, primary: Candidate): string[] {
  const lines: string[] = [];
  if (primary.mezmur) {
    lines.push(`ግጻዌ ዘመዝሙር ${primary.mezmur} (Lectionary for the Yaredian Mezmur ${translit(primary.mezmur)}):`);
  } else {
    // Titles come from the book already punctuated; don't end up with "።:".
    const title = (primary.record.title ?? '').replace(/[።፡\s]+$/, '').trim();
    lines.push(`ግጻዌ${title ? ` ${title}` : ''}:`);
  }
  const wd = WEEKDAYS[day.weekday];
  lines.push(`${ethDateString(day)} · ${wd.en}, ${gregDateString(day)}`);
  lines.push('');
  return lines;
}

/** The whole day, ready to paste into a group chat. */
export function formatDay(day: DayInfo, primary: Candidate, books: BookNames): string {
  // The Liturgy is what gets shared; fall back to whatever the day has.
  const svc = serviceOf(primary.record, 'kidassie')
    ?? serviceOf(primary.record, 'negh')
    ?? serviceOf(primary.record, 'serk');
  const lines = heading(day, primary);
  if (svc) lines.push(...serviceBody(svc, books));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** One named service only, same shape. */
export function formatService(day: DayInfo, primary: Candidate, name: string, books: BookNames): string {
  const svc = serviceOf(primary.record, name);
  if (!svc) return '';
  const label = { serk: 'ዘሠርክ (Vespers)', negh: 'ዘነግህ (Matins)', kidassie: 'ዘቅዳሴ (Divine Liturgy)' }[name] ?? name;
  const lines = heading(day, primary);
  lines.splice(2, 0, label, '');
  lines.push(...serviceBody(svc, books));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
