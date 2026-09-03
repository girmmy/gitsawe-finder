/**
 * Recordings of the chanted misbak.
 *
 * The text tells a deacon what to chant; only a recording tells them the tune,
 * which is the part that has to be learned. Two sources cover two halves of
 * the book, and they are kept in separate keyspaces on purpose:
 *
 *   audio  — the fixed daily cycle, keyed `ethMonth:ethDay:service`, generated
 *            from ethiopianorthodox.org by scripts/build-audio.mjs.
 *   video  — the mezmur (Sunday) cycle, keyed by the misbak's own scripture
 *            reference, curated by hand in public/data/videos.json.
 *
 * Keying audio by scripture reference would collapse the two into one lookup,
 * but the recordings follow *their* book and our readings come from
 * EOTCDevAPI. Where the two disagree about a day, a shared keyspace would
 * quietly attach the wrong chant and spread it to every other day citing the
 * same psalm. The date key claims exactly what the source claims and no more.
 */
import { mezmurKey } from './router';
import type { Candidate, Reading, ServiceName } from './types';

export interface Recording {
  url: string;
  /** Size of the file, so a deacon on mobile data knows before tapping. */
  bytes?: number;
}

export interface Video {
  /** YouTube video id. */
  id: string;
  title: string;
  channel?: string;
  seconds?: number;
  /** False when the uploader disallows embedding — link out instead. */
  embeddable?: boolean;
}

export type AudioIndex = Record<string, Recording[]>;
export type VideoIndex = Record<string, Video[]>;

/** Where a misbak sits among the ones its office appoints that day. */
export interface MisbakSlot {
  index: number;
  count: number;
}

/** One recording plus whether the source actually named this service. */
export interface AudioMatch {
  rec: Recording;
  /**
   * True when the filename named this service. False for the day-wide
   * fallback, which the UI must label rather than pass off as the office.
   */
  exact: boolean;
}

/** At most this many of either kind, so a misbak never turns into a playlist. */
const LIMIT = 3;

/**
 * The offices the source collection actually records: ዘነግሥ and ዘቅዳሴ.
 *
 * It holds nothing for ዘሠርክ, so a file that names only its day belongs to one
 * of these two and never to Vespers. Without this the day-wide fallback would
 * offer a Vespers reader a chant from a different office and call it theirs —
 * a worse failure than offering nothing, because it looks like an answer.
 */
const RECORDED_OFFICES: ServiceName[] = ['negs', 'kidassie'];

/**
 * Recordings for the misbak a reader is actually looking at.
 *
 * The guard is the whole safety of this feature. Audio is addressed by date,
 * but a date does not always name what is on screen: on a Sunday the seasonal
 * record takes the liturgy while the daily record stays a candidate beside it,
 * and the mezmur page carries today's date around a record from another week
 * entirely. In both cases the date would fetch a chant belonging to something
 * else. Only the fixed daily cycle is addressed by its date, so only it gets
 * audio — the wrong case is impossible rather than merely unlikely.
 */
export function audioForCandidate(
  index: AudioIndex | null | undefined,
  candidate: Candidate,
  eth: { month: number; day: number },
  service: ServiceName,
  slot: MisbakSlot = { index: 0, count: 1 },
): AudioMatch[] {
  if (candidate.kind !== 'daily') return [];
  // A recording is addressed by date and office. Where the office appoints
  // more than one misbak — 22 days do — the source does not say which of them
  // was recorded, so it hangs on the first and says so, rather than appearing
  // under each in turn as though there were a recording of every one.
  if (slot.index > 0) return [];
  const found = audioFor(index, eth.month, eth.day, service);
  return slot.count > 1 ? found.map((m) => ({ ...m, exact: false })) : found;
}

/**
 * Recordings for one service of one Ethiopian date.
 *
 * Prefer `audioForCandidate`, which applies the daily-cycle guard; this is the
 * raw lookup underneath it.
 */
export function audioFor(
  index: AudioIndex | null | undefined,
  month: number,
  day: number,
  service: ServiceName,
): AudioMatch[] {
  if (!index || !RECORDED_OFFICES.includes(service)) return [];
  const exact = index[`${month}:${day}:${service}`];
  if (exact?.length) return exact.slice(0, LIMIT).map((rec) => ({ rec, exact: true }));
  // Some months name only the day. Better to offer it and say so than to
  // withhold it or pretend it belongs to this office.
  const whole = index[`${month}:${day}:day`];
  return whole?.length ? whole.slice(0, LIMIT).map((rec) => ({ rec, exact: false })) : [];
}

/**
 * A misbak's scripture reference as a lookup key — "PSA:141:6-8".
 *
 * Null without a book code: a reading we cannot cite is one we cannot match a
 * recording to either.
 */
export function misbakRefKey(r: Reading): string | null {
  // A chapter with no verse would key as "PSA:7:", which can never match
  // anything and is not a reference anyone would write.
  if (!r.b || r.c == null || r.s == null) return null;
  const end = r.n != null && r.n !== r.s ? `-${r.n}` : '';
  return `${r.b}:${r.c}:${r.s}${end}`;
}

/**
 * Videos for one misbak.
 *
 * A Sunday's three services share one mezmur name but carry three different
 * misbaks, so the scripture reference is the key. Where a particular Sunday
 * chants a shared psalm to its own tune, `<mezmur>|<ref>` overrides the
 * reference alone.
 */
export function videosFor(
  index: VideoIndex | null | undefined,
  reading: Reading,
  mezmur: string | null | undefined,
): Video[] {
  if (!index) return [];
  const ref = misbakRefKey(reading);
  if (!ref) return [];
  const scoped = mezmur ? index[`${mezmurKey(mezmur)}|${ref}`] : undefined;
  return (scoped?.length ? scoped : index[ref] ?? []).slice(0, LIMIT);
}

/** Bytes as something a reader can weigh before spending their data. */
export function fileSize(bytes: number | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Seconds as m:ss. */
export function duration(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
