/** Loads and caches the generated lectionary data from /data. */
import type { AudioIndex, VideoIndex } from './media';
import type { DayRecord, ExtraRecord, MonthlyRecord, SeasonalRecord } from './types';

export interface BookNames { [code: string]: { en: string; am: string } }

/**
 * Keyed by path, holding the request rather than its result.
 *
 * Two effects load on mount — the browsed date and the coming Sunday — and
 * they ask for the same seasonal, monthly and extra files. Caching the
 * resolved value let both miss the cache while the first request was still in
 * flight, and every cold start fetched those files twice. Caching the promise
 * means the second caller waits on the first.
 */
const cache = new Map<string, Promise<unknown>>();

function fetchJSON<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached) return cached as Promise<T>;
  const request = (async () => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return (await res.json()) as T;
  })();
  // A failed request must not be remembered, or the app can never retry it.
  cache.set(path, request);
  request.catch(() => cache.delete(path));
  return request;
}

export const loadSeasonal = () => fetchJSON<SeasonalRecord[]>('/data/seasonal.json');
export const loadExtra = () => fetchJSON<ExtraRecord[]>('/data/sunday-extra.json');
export const loadMonthly = () => fetchJSON<MonthlyRecord[]>('/data/monthly.json');
export const loadBooks = () => fetchJSON<BookNames>('/data/books.json');
export const loadDaily = (ethMonth: number) =>
  fetchJSON<Record<string, DayRecord>>(`/data/daily/${ethMonth}.json`);

/**
 * Recordings are an extra, not part of the readings. A deacon who cannot
 * reach them still needs the text, so both indexes resolve to an empty one
 * rather than failing the page.
 */
export const loadAudio = () =>
  fetchJSON<AudioIndex>('/data/audio.json').catch(() => ({}) as AudioIndex);
export const loadVideos = () =>
  fetchJSON<VideoIndex>('/data/videos.json').catch(() => ({}) as VideoIndex);
