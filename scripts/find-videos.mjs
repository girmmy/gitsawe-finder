/**
 * Propose YouTube recordings for the mezmur (Sunday) cycle.
 *
 * The EOTC audio collection covers the fixed daily cycle and nothing else, so
 * the 58 Sunday-cycle misbaks have no bulk source — those recordings circulate
 * through weekly channel posts and Telegram groups. This searches for them and
 * ranks what it finds; it never writes public/data/videos.json, because
 * deciding that a recording really is a given misbak is a judgement about
 * chant, not about strings.
 *
 * The ranking leans on one fact that is genuinely checkable: a misbak is named
 * by its opening Ge'ez words, and people title these videos with exactly those
 * words. "ምስባክ :- እግዚአብሔርሰ ገሃደ ይመጽእ" is the misbak of Psalm 49:3 and could
 * hardly be anything else. So the incipit carries the score, and a title that
 * says መዝሙር without ምስባክ is pushed down — that is the hymn that names the
 * Sunday, a different piece from the psalm verse chanted before the gospel.
 *
 *   node scripts/find-videos.mjs [--limit 20] [--only 'ገብር ኄር']
 *
 * The key comes from a gitignored .env at the repo root, so it stays out of
 * shell history. See the message printed when it is missing.
 *
 * search.list costs 100 quota units of the free 10,000/day, so a full sweep of
 * the 58 refs fits in a single day. Results land in research/video-candidates
 * .json (gitignored) for you to approve into public/data/videos.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'public', 'data');
const outDir = join(root, 'research');
const out = join(outDir, 'video-candidates.json');

/**
 * The key, from a gitignored .env if there is one.
 *
 * Reading it from a file rather than the command line keeps it out of shell
 * history and out of any terminal someone is sharing — `YOUTUBE_API_KEY=... npm
 * run ...` leaves the secret sitting in ~/.zsh_history for anyone who looks.
 */
function apiKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const envFile = join(root, '.env');
  if (!existsSync(envFile)) return null;
  const line = readFileSync(envFile, 'utf8')
    .split('\n')
    .find((l) => /^\s*(export\s+)?YOUTUBE_API_KEY\s*=/.test(l));
  return line
    ? line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '') || null
    : null;
}

const PLACEHOLDER = 'paste-your-key-here';
const KEY = apiKey();
if (KEY === PLACEHOLDER) {
  process.stderr.write(
    `.env still holds the placeholder. Replace ${PLACEHOLDER} with the real key.\n`);
  process.exit(1);
}
if (!KEY) {
  process.stderr.write(
    'No YouTube API key found.\n\n' +
    '  Put it in a .env file at the repo root, which is gitignored:\n' +
    '    echo \'YOUTUBE_API_KEY=your-key-here\' >> .env\n\n' +
    '  Get one free at console.cloud.google.com: a project, then\n' +
    '  APIs & Services -> Library -> "YouTube Data API v3" -> Enable,\n' +
    '  then Credentials -> Create credentials -> API key. Restrict it to that\n' +
    '  one API. The free quota is 10,000 units a day; this uses ~101 per misbak.\n\n' +
    '  Prefer the file over `YOUTUBE_API_KEY=... npm run find:videos` — the\n' +
    '  command line form leaves the key in your shell history.\n');
  process.exit(1);
}

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const LIMIT = Number(arg('--limit', '25'));
const ONLY = arg('--only', null);
/** Refs to look at again even though videos.json already has one. */
const REFRESH = (arg('--refresh', '') || '').split(',').map((r) => r.trim()).filter(Boolean);

const load = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

/** The Yaredian name of a Sunday, where the record carries or implies one. */
const NAMED_SUNDAYS = {
  'neneweTsom:1': 'ዘነነዌ', 'abiyTsom:1': 'ዘወረደ', 'abiyTsom:2': 'ቅድስት',
  'abiyTsom:3': 'ምኵራብ', 'abiyTsom:4': 'መጻጉዕ', 'abiyTsom:5': 'ደብረ ዘይት',
  'abiyTsom:6': 'ገብር ኄር', 'abiyTsom:7': 'ኒቆዲሞስ', 'abiyTsom:8': 'ሆሳዕና',
  'holy_thursday:null': 'ጸሎተ ሐሙስ', 'erget:null': 'ዕርገት', 'genaTsom:2': 'ስብከት',
  'genaTsom:3': 'ብርሃን', 'genaTsom:4': 'ኖላዊ', 'astemhro:null': 'አስተምህሮ',
  'zere_demena:null': 'ዘርዕ ደመና',
};

/** Same shape the app looks up by — see misbakRefKey in src/lib/media.ts. */
function refKey(m) {
  if (!m?.b || m.c == null) return null;
  const end = m.n != null && m.n !== m.s ? `-${m.n}` : '';
  return `${m.b}:${m.c}:${m.s ?? ''}${end}`;
}

/** Ge'ez without its punctuation, so titles and incipits compare fairly. */
const normalize = (s) => (s ?? '').replace(/[።፡፣፤፥፦፧፨\s]+/g, ' ').trim();

/** Longest run of characters the two share, as a fraction of the incipit. */
function overlap(title, incipit) {
  const a = normalize(title);
  const b = normalize(incipit);
  if (!b) return 0;
  let best = 0;
  for (let i = 0; i < b.length; i++) {
    for (let j = b.length; j > i + best; j--) {
      if (a.includes(b.slice(i, j))) { best = j - i; break; }
    }
  }
  return best / b.length;
}

/**
 * How much this result looks like the misbak we asked for.
 *
 * A run of the incipit is the strong signal. The rest are corroborating: the
 * Sunday's name, the word ምስባክ, and — pushing the other way — መዝሙር alone,
 * which names the hymn rather than the chanted psalm.
 */
function score(item, { incipit, mezmur }, seconds) {
  const title = item.snippet.title;
  let s = overlap(title, incipit) * 100;
  if (mezmur && normalize(title).includes(normalize(mezmur))) s += 25;
  if (/ምስባክ|misbak|mesbak|msbak/i.test(title)) s += 20;
  if (/መዝሙር|mezmur/i.test(title) && !/ምስባክ|misbak|mesbak/i.test(title)) s -= 35;
  // A sermon quoting the verse outranked the chant itself for Psalm 86:5-6:
  // twenty-two minutes of ስብከት, with the real misbak third. Length is the
  // giveaway — a misbak runs a minute or three.
  if (/^\s*ስብከት/.test(title.trim())) s -= 50;
  if (seconds > 600) s -= 40;
  if (seconds > 1200) s -= 40;
  return Math.round(s);
}

async function api(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** ISO 8601 duration to seconds. */
function seconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '');
  return m ? (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0)) : undefined;
}

/**
 * Every misbak's opening words, so a candidate can be checked against the
 * whole book rather than only against the one we asked for.
 *
 * Searching by a Sunday's name finds videos for the right Sunday and the wrong
 * misbak — a Sunday appoints one to each office. The ዕርገት search returned ዐርገ
 * እግዚአብሔር በይባቤ, which is a different misbak of that same feast. If a title
 * quotes some other misbak's words better than the one in hand, it is theirs.
 */
function allIncipits() {
  const records = [
    ...load('seasonal.json'), ...load('monthly.json'), ...load('sunday-extra.json'),
  ];
  for (let m = 1; m <= 13; m++) {
    const f = join(dataDir, 'daily', `${m}.json`);
    if (existsSync(f)) records.push(...Object.values(JSON.parse(readFileSync(f, 'utf8'))));
  }
  const byRef = new Map();
  for (const r of records) {
    for (const svc of ['serk', 'negs', 'kidassie']) {
      for (const m of r[svc]?.msbak ?? []) {
        const ref = refKey(m);
        if (ref && !byRef.has(ref)) byRef.set(ref, normalize(m.g).split(' ').slice(0, 6).join(' '));
      }
    }
  }
  return byRef;
}

/** The misbak whose words this title quotes better, if it is not ours. */
function belongsElsewhere(incipits, title, ref, mine) {
  for (const [other, inc] of incipits) {
    if (other !== ref && overlap(title, inc) > mine + 0.15) return other;
  }
  return null;
}

/** Every distinct Sunday-cycle misbak we do not already have a video for. */
function targets() {
  const have = existsSync(join(dataDir, 'videos.json')) ? load('videos.json') : {};
  const records = [...load('seasonal.json'), ...load('monthly.json'), ...load('sunday-extra.json')];
  const byRef = new Map();
  for (const r of records) {
    const mezmur = r.mezmur ?? NAMED_SUNDAYS[`${r.season}:${r.week ?? 'null'}`] ?? null;
    for (const svc of ['serk', 'negs', 'kidassie']) {
      const m = r[svc]?.msbak?.[0];
      const ref = refKey(m);
      if (!ref || byRef.has(ref)) continue;
      if (have[ref] && !REFRESH.includes(ref)) continue;
      byRef.set(ref, { ref, mezmur, incipit: normalize(m.g).split(' ').slice(0, 6).join(' '), cite: m.kjv ?? m.en ?? null });
    }
  }
  return [...byRef.values()].filter((t) => t.incipit && (!ONLY || t.mezmur === ONLY));
}

async function main() {
  const list = targets().slice(0, LIMIT);
  if (!list.length) { process.stdout.write('Nothing left to look for.\n'); return; }
  process.stdout.write(`Searching for ${list.length} misbak (~${list.length * 101} quota units)\n\n`);

  const incipits = allIncipits();
  const proposals = {};
  for (const target of list) {
    const queries = [`ምስባክ ${target.incipit}`];
    // The incipit is the sharpest query, but four misbak came back empty on it
    // and three drew a different psalm. Where it fails, the Sunday's name is
    // the other way people title these.
    if (target.mezmur) queries.push(`ምስባክ ዘ${target.mezmur}`);

    const items = [];
    let quotaGone = false;
    for (const q of queries) {
      try {
        const found = await api('search', {
          part: 'snippet', q, type: 'video', maxResults: '6',
          relevanceLanguage: 'am', regionCode: 'ET',
        });
        items.push(...found.items);
      } catch (err) {
        process.stdout.write(`  ${target.ref}  search failed: ${err.message}\n`);
        // Quota exhaustion ends the run rather than burning the rest of the list.
        if (/quota/i.test(err.message)) { quotaGone = true; break; }
      }
      // A first query that already found the words is enough; do not spend
      // another hundred units confirming it.
      if (items.some((i) => overlap(i.snippet.title, target.incipit) >= 0.35)) break;
    }
    if (quotaGone) break;
    const found = { items: [...new Map(items.filter((i) => i.id?.videoId).map((i) => [i.id.videoId, i])).values()] };

    const ids = found.items.map((i) => i.id.videoId).filter(Boolean);
    const details = ids.length
      ? await api('videos', { part: 'contentDetails,status,snippet', id: ids.join(',') })
      : { items: [] };
    const byId = new Map(details.items.map((d) => [d.id, d]));

    const ranked = found.items
      .filter((i) => i.id.videoId)
      .map((i) => {
        const d = byId.get(i.id.videoId);
        const mine = overlap(i.snippet.title, target.incipit);
        return {
          id: i.id.videoId,
          title: i.snippet.title,
          channel: i.snippet.channelTitle,
          seconds: seconds(d?.contentDetails?.duration),
          embeddable: d?.status?.embeddable ?? undefined,
          score: score(i, target, seconds(d?.contentDetails?.duration)),
          /** Set when the title quotes another misbak better than this one. */
          belongsTo: belongsElsewhere(incipits, i.snippet.title, target.ref, mine),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    proposals[target.ref] = { mezmur: target.mezmur, incipit: target.incipit, cite: target.cite, candidates: ranked };
    const top = ranked[0];
    const warn = top?.belongsTo ? ` [belongs to ${top.belongsTo}]` : '';
    process.stdout.write(
      `  ${target.ref.padEnd(14)} ${(target.mezmur ?? '—').padEnd(12)} ` +
      `${top ? `${String(top.score).padStart(3)}${warn}  ${top.title.slice(0, 56)}` : 'nothing found'}\n`);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(out, `${JSON.stringify(proposals, null, 1)}\n`);
  process.stdout.write(
    `\nWrote ${Object.keys(proposals).length} proposals to research/video-candidates.json\n` +
    'Nothing was added to public/data/videos.json — listen to the top candidates,\n' +
    'then copy the ones that are right into that file as { id, title, channel, seconds }.\n' +
    'Anything marked [belongs to ...] quotes another misbak better than this one —\n' +
    'usually the right Sunday but the wrong office. Do not take those.\n' +
    'Scores: above 100 the title quotes the misbak\'s opening words almost in full;\n' +
    '40-80 usually means it names the Sunday instead ("ገብር ኄር ... ምስባክ") — also a good\n' +
    'sign; at or below 0 it is most likely the መዝሙር, which is a different piece.\n');
}

main().catch((err) => { process.stderr.write(`${err.stack ?? err}\n`); process.exit(1); });
