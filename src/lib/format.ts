/** Plain-text builders for the copy / share buttons. */
import { MONTHS, WEEKDAYS, toGeez } from './ethiopic';
import type { BookNames } from './data';
import { SERVICE_LABELS, SLOT_LABELS } from './labels';
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

/** Amharic citation like "ወደ ሮሜ ሰዎች ም… ቍ…" plus English citation. */
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
  const en = r.kjv ?? r.en ?? (r.b && r.c != null ? `${books[r.b]?.en ?? r.b} ${r.c}` : null);
  return { am, en };
}

function readingLines(slot: string, list: Reading[] | undefined, books: BookNames): string[] {
  if (!list?.length) return [];
  const label = SLOT_LABELS[slot];
  const lines: string[] = [];
  for (const r of list) {
    const cite = citation(r, books);
    const head = `▸ ${label.am} · ${label.en}${label.reader ? ` (${label.reader.am})` : ''}`;
    lines.push(head);
    if (slot === 'msbak') {
      if (r.g) {
        lines.push(`  ${r.g}`);
        lines.push(`  (${translit(r.g)})`);
      }
      if (r.a) lines.push(`  ${r.a}`);
      if (r.e) lines.push(`  “${r.e}”`);
    } else if (r.g || r.a) {
      lines.push(`  ጥንተ ንባብ፦ ${r.g ?? r.a}${r.et ? ` … እስከ «${r.et}»` : ''}`);
    }
    const cites = [cite.am, cite.en].filter(Boolean).join('  ·  ');
    if (cites) lines.push(`  — ${cites}`);
  }
  return lines;
}

function serviceLines(name: string, svc: Service | undefined, books: BookNames): string[] {
  if (!svc) return [];
  const slots = ['msbak', 'pauline', 'catholic', 'acts', 'gospel'] as const;
  const body = slots.flatMap((s) => readingLines(s, svc[s], books));
  if (svc.anaphora?.length) {
    body.push(`▸ ቅዳሴ · Anaphora: ${svc.anaphora.join('፣ ')}`);
  }
  if (!body.length) return [];
  const label = SERVICE_LABELS[name];
  return [``, `━━ ${label.am} · ${label.en} ━━`, ...body];
}

/** The full shareable day text, ready for a group chat. */
export function formatDay(day: DayInfo, primary: Candidate, books: BookNames): string {
  const lines: string[] = [];
  lines.push(`✠ ግጻዌ · Gitsawe`);
  lines.push(`${ethDateString(day)} — ${gregDateString(day)}`);
  const wd = WEEKDAYS[day.weekday];
  const badges: string[] = [`${wd.am} · ${wd.en}`];
  if (day.season) badges.push(`${day.season.am}`);
  lines.push(badges.join('  ·  '));
  for (const f of day.feasts) lines.push(`✦ ${f.am} · ${f.en}`);
  if (day.fasting?.active) lines.push(`✝ ${day.fasting.am} · ${day.fasting.en}`);
  lines.push(``);
  if (primary.mezmur) {
    lines.push(`መዝሙር · Mezmur: ${primary.mezmur}  (${translit(primary.mezmur)})`);
  }
  lines.push(`※ ${primary.reasonAm} · ${primary.reasonEn}`);
  if (primary.record.title) lines.push(`«${primary.record.title}»`);
  for (const svc of ['serk', 'negh', 'kidassie']) {
    lines.push(...serviceLines(svc, serviceOf(primary.record, svc), books));
  }
  const sinksar = primary.record.sinksar ?? [];
  if (sinksar.length) {
    lines.push(``, `━━ ስንክሳር · Synaxarium ━━`);
    for (const s of sinksar) lines.push(`• ${s}`);
  }
  lines.push(``, `— via Gitsawe app`);
  return lines.join('\n');
}

/** One service only (for the per-service copy button). */
export function formatService(day: DayInfo, primary: Candidate, name: string, books: BookNames): string {
  const label = SERVICE_LABELS[name];
  const head = `✠ ${label.am} · ${label.en} — ${ethDateString(day)} (${gregDateString(day)})`;
  const body = serviceLines(name, serviceOf(primary.record, name), books);
  return [head, ...body.slice(2)].join('\n');
}
