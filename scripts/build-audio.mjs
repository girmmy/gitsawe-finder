/**
 * Build-time index of the EOTC chanted-misbak recordings.
 *
 * ethiopianorthodox.org publishes the daily misbak as mp3, and its filenames
 * carry the Ethiopian date and the service:
 *
 *   .../01 - zemeskerem/1 - mesk 1 zenegeh.mp3   -> Meskerem 1, ዘነግሥ
 *   .../keamet eske amet/05 - zetir/10 zekidase.mp3 -> Tir 10, ዘቅዳሴ
 *
 * So the whole mapping can be derived rather than curated. We emit
 * public/data/audio.json keyed `ethMonth:ethDay:service`, where service is
 * negs, kidassie, or — when the filename does not say — the literal `day`.
 * The app labels a `day` entry as unattributed rather than guessing; the
 * source does not say which office it belongs to, so neither do we.
 *
 * We link to their files rather than mirroring them, so this script also
 * serves as the link checker: re-running it reports whatever has gone away.
 *
 * .opus is skipped (5 files, unreliable on iOS Safari). The 122 .wma files are
 * skipped here too — no browser plays them — but the 34 of them covering
 * Nehase and Pagumen, months with no mp3 at all, have been converted with the
 * church's permission by scripts/transcode-wma.mjs and sit in public/audio/.
 * Those are folded in below, so audio.json stays the single index.
 */
import { writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'data', 'audio.json');

const INDEX = 'https://www.ethiopianorthodox.org/amharic/yeqolotbet/annualmisbak.html';
/** Hrefs on the page are relative to the directory the page lives in. */
const BASE = 'https://www.ethiopianorthodox.org/amharic/yeqolotbet/';

/** Month words as they appear in paths, romanized loosely and inconsistently. */
const MONTHS = {
  mesk: 1, meskerem: 1, tikimet: 2, tikemet: 2, hidar: 3, tahesas: 4, tahsas: 4,
  tir: 5, yeka: 6, yekatit: 6, megabit: 7, miazia: 8, ginbot: 9, sene: 10,
  hamle: 11, nehase: 12, pagumen: 13,
};
/** The "keamet eske amet" (year to year) set is foldered by month number. */
const KEAMET = { '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7, '08': 8, '09': 9 };

/** A month word with or without the ዘ- ("of") prefix the folders sometimes carry. */
const monthOf = (word) => {
  const w = String(word).toLowerCase();
  return MONTHS[w] ?? MONTHS[w.replace(/^ze/, '')] ?? null;
};

/**
 * Where the service word starts. Spelling drifts badly across directories —
 * zenegeh, zenegh, znegh, zeneegh, zekidase, zekidasie, zekidse, and a couple
 * that lost their leading z altogether ("enegeh", "ekidase") — so match on the
 * shortest stem that stays unambiguous.
 */
const SERVICE_WORD = /z?e?(?:ne+g|kid)/i;

/**
 * The service, or null when the filename does not say. Check kidassie first:
 * some files read "zekidase adi", and no negs spelling is a substring of a
 * kidassie one.
 */
function serviceOf(base) {
  if (/kid/i.test(base)) return 'kidassie';
  if (/z?e?ne+g/i.test(base)) return 'negs';
  return null;
}

/** Percent-encode each path segment; these paths are full of spaces. */
const encodeHref = (href) =>
  new URL(href.split('/').map(encodeURIComponent).join('/'), BASE).href;

const dirOf = (href) => href.slice(0, href.lastIndexOf('/'));
const baseOf = (href) =>
  decodeURIComponent(href.slice(href.lastIndexOf('/') + 1)).replace(/\.[a-z0-9]+$/i, '').trim();

/** The numbers standing before the service word — the ones that address the file. */
function leadingNumbers(base) {
  const service = serviceOf(base);
  const head = service ? base.slice(0, base.search(SERVICE_WORD)) : base;
  return (head.match(/\d+/g) ?? []).map(Number);
}

/**
 * Which number is the day, when a filename carries two of them?
 *
 * The folders disagree, and the disagreement is invisible from a single name:
 *
 *   yekatit   "11 - 6 zenegeh" / "12 - 6 zekidase"   track 11, 12 -> day 6
 *   tahesas   "11 - 1 zenegeh" / "11 - 2 zekidase"   day 11 -> slot 1, 2
 *
 * Reading either one wrongly silently misfiles a whole month, so rather than
 * guess per file we test both readings across a whole directory and keep the
 * one that behaves like a calendar: every day inside 1–30, and few files
 * landing on the same day and service. Under the wrong reading Tahesas puts
 * nineteen recordings on ዘነግሥ of the 1st, and Yekatit runs past day 30.
 */
function dayPositionOf(hrefs) {
  const score = (pick) => {
    let outOfRange = 0;
    const seen = new Map();
    for (const href of hrefs) {
      const nums = leadingNumbers(baseOf(href));
      if (nums.length < 2) continue;
      const day = pick(nums);
      if (!(day >= 1 && day <= 30)) { outOfRange++; continue; }
      const key = `${day}:${serviceOf(baseOf(href)) ?? 'day'}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return outOfRange * 100 + Math.max(0, ...seen.values());
  };
  const last = score((n) => n[n.length - 1]);
  const first = score((n) => n[0]);
  return first < last ? 'first' : 'last';
}

/**
 * Pull (month, day, service) out of one href.
 *
 * A month word in the name settles it outright — the day is the number right
 * after it ("1 - mesk 1 zenegeh" is track 1, Meskerem 1). Otherwise fall back
 * to the convention worked out for the directory.
 */
function locate(href, dayPosition) {
  const dir = dirOf(href);
  const base = baseOf(href);

  let month = null;
  const keamet = dir.match(/keamet eske amet\/(\d\d)/i);
  if (keamet) month = KEAMET[keamet[1]] ?? null;
  const foldered = dir.match(/Misbak\/([a-z]+)(?:\/daily)?$/i);
  if (foldered && monthOf(foldered[1])) month = monthOf(foldered[1]);

  const service = serviceOf(base);
  const head = service ? base.slice(0, base.search(SERVICE_WORD)) : base;

  // A month word names the month and marks where the day follows.
  let day = null;
  const named = head.match(/(?:^|[^a-z])(?:ze)?([a-z]{3,9})\s*(\d{1,2})/i);
  if (named && monthOf(named[1])) {
    month = monthOf(named[1]);
    day = Number(named[2]);
  } else {
    for (const word of head.match(/[a-z]+/gi) ?? []) {
      const m = monthOf(word);
      if (m) { month = m; break; }
    }
    const numbers = (head.match(/\d+/g) ?? []).map(Number);
    // Whole-month compilations ("tir complete", "tahesas misbak") carry no
    // number at all and run to 40 MB. They belong to no single date.
    if (!numbers.length) return { compilation: true };
    day = numbers.length === 1 ? numbers[0]
      : dayPosition === 'first' ? numbers[0]
      : numbers[numbers.length - 1];
  }

  if (!month || !(day >= 1 && day <= 30)) return null;
  return { month, day, service };
}

/**
 * HEAD is not reliably answered here, so ask for the first kilobyte instead:
 * it confirms the file, its type and its length in one request.
 */
async function probe(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!/^audio\//i.test(type)) return null;
    const range = res.headers.get('content-range');
    const bytes = range ? Number(range.split('/')[1]) : Number(res.headers.get('content-length'));
    return { bytes: Number.isFinite(bytes) && bytes > 0 ? bytes : undefined };
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const verify = !process.argv.includes('--no-verify');

  process.stdout.write(`Fetching ${INDEX}\n`);
  const res = await fetch(INDEX);
  if (!res.ok) throw new Error(`Could not fetch the index page (${res.status})`);
  // The page declares charset=iso-8859-1; its Ge'ez is HTML entities, and the
  // hrefs we want are ASCII. Decoding as utf-8 mangles the high bytes.
  const html = new TextDecoder('latin1').decode(await res.arrayBuffer());

  const hrefs = [...new Set(
    [...html.matchAll(/href="([^"]+\.(?:mp3|wma|opus))"/gi)].map((m) => m[1]),
  )];
  const mp3 = hrefs.filter((h) => /\.mp3$/i.test(h));
  const skipped = hrefs.length - mp3.length;

  // Work out each directory's numbering convention before reading any file.
  const byDir = new Map();
  for (const href of mp3) {
    const dir = dirOf(href);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(href);
  }
  const dayPosition = new Map(
    [...byDir].map(([dir, group]) => [dir, dayPositionOf(group)]),
  );

  const index = {};
  const unparsed = [];
  const compilations = [];
  const dead = [];
  let kept = 0;

  for (const href of mp3) {
    const at = locate(href, dayPosition.get(dirOf(href)));
    if (at?.compilation) { compilations.push(href); continue; }
    if (!at) { unparsed.push(href); continue; }

    const url = encodeHref(href);
    let meta = {};
    if (verify) {
      const probed = await probe(url);
      if (!probed) { dead.push(href); continue; }
      meta = probed;
      await sleep(60); // someone else's server; do not hammer it
    }

    const key = `${at.month}:${at.day}:${at.service ?? 'day'}`;
    (index[key] ??= []).push({ url, ...meta });
    kept++;
  }

  // The converted Nehase and Pagumen recordings we host ourselves. Their
  // filenames carry no office, so they are day-wide entries and the app labels
  // them as unattributed, exactly like the remote ones that name only a day.
  const localDir = join(root, 'public', 'audio');
  let local = 0;
  if (existsSync(localDir)) {
    for (const file of readdirSync(localDir).filter((f) => f.endsWith('.mp3')).sort()) {
      const at = file.replace(/\.mp3$/, '').match(/^(\d{1,2})-(\d{1,2})$/);
      if (!at) continue;
      const key = `${Number(at[1])}:${Number(at[2])}:day`;
      if (index[key]) continue; // a remote recording already covers this day
      index[key] = [{ url: `/audio/${file}`, bytes: statSync(join(localDir, file)).size }];
      local++;
    }
  }

  // Stable output so a re-run produces a reviewable diff rather than churn.
  const sorted = {};
  for (const key of Object.keys(index).sort((a, b) => {
    const [am, ad] = a.split(':').map(Number);
    const [bm, bd] = b.split(':').map(Number);
    return am - bm || ad - bd || a.localeCompare(b);
  })) {
    sorted[key] = index[key].sort((x, y) => x.url.localeCompare(y.url));
  }

  writeFileSync(out, `${JSON.stringify(sorted, null, 1)}\n`);

  const services = { negs: 0, kidassie: 0, day: 0 };
  for (const key of Object.keys(sorted)) services[key.split(':')[2]] += sorted[key].length;

  process.stdout.write(
    `\nWrote ${Object.keys(sorted).length} keys / ${kept} recordings to public/data/audio.json\n` +
    `  ዘነግሥ ${services.negs}   ዘቅዳሴ ${services.kidassie}   unattributed ${services.day}\n` +
    `  skipped ${skipped} non-mp3 (.wma/.opus play in no browser we can rely on)\n` +
    `  skipped ${compilations.length} whole-month compilations (no single date)\n` +
    `  folded in ${local} converted recordings we host from public/audio/\n` +
    `  ${unparsed.length} filenames did not parse, ${dead.length} did not resolve\n`,
  );
  const flipped = [...dayPosition].filter(([, pos]) => pos === 'first').map(([dir]) => dir.split('/').pop());
  if (flipped.length) {
    process.stdout.write(`  day-first numbering detected in: ${flipped.join(', ')}\n`);
  }
  if (unparsed.length) {
    process.stdout.write('\nUnparsed:\n');
    for (const h of unparsed) process.stdout.write(`  ${decodeURIComponent(h.split('/').pop())}\n`);
  }
  if (dead.length) {
    process.stdout.write('\nDid not resolve:\n');
    for (const h of dead) process.stdout.write(`  ${h}\n`);
  }

  // Coverage against our own data, so the gaps are visible at build time.
  const daily = join(root, 'public', 'data', 'daily');
  if (existsSync(daily)) {
    let slots = 0, exact = 0, viaDay = 0;
    for (let m = 1; m <= 13; m++) {
      const f = join(daily, `${m}.json`);
      if (!existsSync(f)) continue;
      for (const [d, rec] of Object.entries(JSON.parse(readFileSync(f, 'utf8')))) {
        for (const svc of ['negs', 'kidassie']) {
          if (!rec[svc]?.msbak?.length) continue;
          slots++;
          if (sorted[`${m}:${d}:${svc}`]) exact++;
          else if (sorted[`${m}:${d}:day`]) viaDay++;
        }
      }
    }
    const pct = (n) => `${((100 * n) / slots).toFixed(0)}%`;
    process.stdout.write(
      `\nCoverage of ${slots} daily misbak slots: ` +
      `${exact} exact (${pct(exact)}), ${viaDay} unattributed (${pct(viaDay)}), ` +
      `${slots - exact - viaDay} none\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(`${err.stack ?? err}\n`);
  process.exit(1);
});
