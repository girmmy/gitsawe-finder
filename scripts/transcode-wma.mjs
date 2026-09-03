/**
 * Rescue the Nehase and Pagumen misbak from Windows Media.
 *
 * ethiopianorthodox.org publishes those two months only as .wma, which no
 * current browser plays, so they were the one part of the daily cycle the app
 * could not reach. The church gave permission to convert and host copies.
 *
 * Unlike the mp3 set, these files are named by the misbak's opening words
 * rather than its office — "01weengersemake.wma" is ወእንግርሰ ምሕረተከ — with the
 * day as a leading number and the month in the directory. That the directory
 * names are honest was checked, not assumed: transliterating each incipit with
 * the app's own translit() and matching it against our records picks out the
 * named month every time, well clear of the runner-up, and identifies the
 * unlabelled `gitsawe/` directory as Meskerem.
 *
 * Only files that fill an actual hole are fetched — 34 of the 122, all of them
 * Nehase and Pagumen; the other 88 duplicate mp3 we already link. Output is
 * public/audio/<month>-<day>.mp3 at 48 kbps mono, which is about a third of
 * the source size and plenty for chant.
 *
 *   node scripts/transcode-wma.mjs [--force]
 *
 * Re-running skips whatever is already converted. build-audio.mjs picks these
 * up on its next run and folds them into public/data/audio.json.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const audioDir = join(root, 'public', 'audio');
const dataDir = join(root, 'public', 'data');

const INDEX = 'https://www.ethiopianorthodox.org/amharic/yeqolotbet/annualmisbak.html';
const BASE = 'https://www.ethiopianorthodox.org/amharic/yeqolotbet/';

/** Directory to Ethiopian month, each confirmed by incipit matching. */
const MONTHS = {
  gitsawe: 1, tikemet: 2, hidarmisbak: 3, nehasemisbak: 12, pagumenmisbak: 13,
};

const FORCE = process.argv.includes('--force');
const encodeHref = (href) =>
  new URL(href.split('/').map(encodeURIComponent).join('/'), BASE).href;

function haveFfmpeg() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

async function main() {
  if (!haveFfmpeg()) {
    process.stderr.write('ffmpeg is not on PATH — `brew install ffmpeg`.\n');
    process.exit(1);
  }

  const res = await fetch(INDEX);
  if (!res.ok) throw new Error(`Could not fetch the index page (${res.status})`);
  const html = new TextDecoder('latin1').decode(await res.arrayBuffer());
  const hrefs = [...new Set(
    [...html.matchAll(/href="([^"]+\.wma)"/gi)].map((m) => m[1]),
  )];

  const audio = existsSync(join(dataDir, 'audio.json'))
    ? JSON.parse(readFileSync(join(dataDir, 'audio.json'), 'utf8')) : {};
  const daily = {};
  for (let m = 1; m <= 13; m++) {
    const f = join(dataDir, 'daily', `${m}.json`);
    if (existsSync(f)) daily[m] = JSON.parse(readFileSync(f, 'utf8'));
  }

  /** Files for a day we have a misbak for and no recording of yet. */
  const wanted = [];
  for (const href of hrefs) {
    const month = MONTHS[href.slice(0, href.lastIndexOf('/')).split('/').pop()];
    const file = decodeURIComponent(href.split('/').pop());
    const day = Number(file.match(/^(\d{1,2})/)?.[1]);
    if (!month || !day) continue;

    const record = daily[month]?.[String(day)];
    const hasMisbak = ['negs', 'kidassie'].some((s) => record?.[s]?.msbak?.length);
    const covered = ['negs', 'kidassie', 'day'].some((s) => audio[`${month}:${day}:${s}`]);
    if (hasMisbak && !covered) wanted.push({ month, day, href });
  }

  mkdirSync(audioDir, { recursive: true });
  process.stdout.write(`${wanted.length} recordings fill a gap\n\n`);

  let converted = 0, skipped = 0, failed = 0, bytesIn = 0, bytesOut = 0;
  for (const { month, day, href } of wanted) {
    const name = `${month}-${String(day).padStart(2, '0')}.mp3`;
    const out = join(audioDir, name);
    if (existsSync(out) && !FORCE) { skipped++; continue; }

    const source = encodeHref(href);
    try {
      const wma = Buffer.from(await (await fetch(source)).arrayBuffer());
      if (wma.length < 5000) throw new Error(`only ${wma.length} bytes`);
      const tmp = join(audioDir, `.${name}.wma`);
      writeFileSync(tmp, wma);
      execFileSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', tmp,
        '-codec:a', 'libmp3lame', '-b:a', '48k', '-ac', '1', '-ar', '22050',
        // The source timestamps are not monotonic; let the encoder re-derive them.
        '-fflags', '+genpts',
        out,
      ], { stdio: ['ignore', 'ignore', 'pipe'] });
      execFileSync('rm', ['-f', tmp]);

      bytesIn += wma.length;
      bytesOut += statSync(out).size;
      converted++;
      process.stdout.write(`  ${name}  ${(wma.length / 1048576).toFixed(2)} MB -> ${(statSync(out).size / 1024).toFixed(0)} KB\n`);
    } catch (err) {
      failed++;
      process.stdout.write(`  ${name}  failed: ${err.message.split('\n')[0]}\n`);
    }
    await new Promise((r) => setTimeout(r, 80)); // their server, not ours
  }

  process.stdout.write(
    `\nconverted ${converted}, skipped ${skipped} already present, ${failed} failed\n` +
    (converted
      ? `  ${(bytesIn / 1048576).toFixed(1)} MB of .wma became ${(bytesOut / 1048576).toFixed(1)} MB of mp3\n`
      : '') +
    'Now run `npm run build:audio` to fold these into public/data/audio.json.\n');
}

main().catch((err) => { process.stderr.write(`${err.stack ?? err}\n`); process.exit(1); });
