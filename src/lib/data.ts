/** Loads and caches the generated lectionary data from /data. */
import type { DayRecord, ExtraRecord, MonthlyRecord, SeasonalRecord } from './types';

export interface BookNames { [code: string]: { en: string; am: string } }

const cache = new Map<string, unknown>();

async function fetchJSON<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  const json = (await res.json()) as T;
  cache.set(path, json);
  return json;
}

export const loadSeasonal = () => fetchJSON<SeasonalRecord[]>('/data/seasonal.json');
export const loadExtra = () => fetchJSON<ExtraRecord[]>('/data/sunday-extra.json');
export const loadMonthly = () => fetchJSON<MonthlyRecord[]>('/data/monthly.json');
export const loadBooks = () => fetchJSON<BookNames>('/data/books.json');
export const loadDaily = (ethMonth: number) =>
  fetchJSON<Record<string, DayRecord>>(`/data/daily/${ethMonth}.json`);
