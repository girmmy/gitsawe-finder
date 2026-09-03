import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { audioFor, audioForCandidate, misbakRefKey, videosFor, type AudioIndex, type VideoIndex } from '../src/lib/media';
import type { Candidate, DayRecord, ServiceName } from '../src/lib/types';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));

const audio: AudioIndex = load('audio.json');
const videos: VideoIndex = load('videos.json');
const daily: Record<number, Record<string, DayRecord>> = {};
for (let m = 1; m <= 13; m++) daily[m] = load(`daily/${m}.json`);

const OFFICES: ServiceName[] = ['negs', 'kidassie'];

describe('the recordings index', () => {
  it('is keyed by a real Ethiopian date and a service we render', () => {
    for (const key of Object.keys(audio)) {
      expect(key, key).toMatch(/^\d{1,2}:\d{1,2}:(negs|kidassie|day)$/);
      const [month, day] = key.split(':').map(Number);
      expect(month, key).toBeGreaterThanOrEqual(1);
      expect(month, key).toBeLessThanOrEqual(13);
      expect(day, key).toBeGreaterThanOrEqual(1);
      expect(day, key).toBeLessThanOrEqual(30);
    }
  });

  /**
   * The join is the whole feature. A key naming a day we have no misbak for
   * means the filename parser drifted, or build:data moved underneath us.
   */
  it('only names days that actually have a misbak', () => {
    for (const key of Object.keys(audio)) {
      const [month, day, service] = key.split(':');
      const record = daily[Number(month)]?.[day];
      expect(record, `${key} has no daily record`).toBeTruthy();
      const offices = service === 'day' ? OFFICES : [service as ServiceName];
      const hasMisbak = offices.some((o) => record![o]?.msbak?.length);
      expect(hasMisbak, `${key} names no misbak`).toBe(true);
    }
  });

  it('points only at playable audio the CSP allows', () => {
    for (const [key, recs] of Object.entries(audio)) {
      expect(recs.length, key).toBeGreaterThan(0);
      for (const rec of recs) {
        // Either the church's server, or a copy we host under media-src 'self'.
        expect(rec.url, key).toMatch(/^(https:\/\/www\.ethiopianorthodox\.org\/|\/audio\/)/);
        // .wma plays in no major browser and .opus is unreliable on iOS.
        expect(rec.url, key).toMatch(/\.mp3$/i);
      }
    }
  });

  /**
   * The converted Nehase and Pagumen recordings are the only ones we host, and
   * a key pointing at a file that is not there would be a silent dead player.
   */
  it('has the file on disk for every recording we host ourselves', () => {
    const local = Object.entries(audio)
      .flatMap(([key, recs]) => recs.map((r) => [key, r.url] as const))
      .filter(([, url]) => url.startsWith('/audio/'));
    expect(local.length, 'the converted recordings should be indexed').toBeGreaterThan(0);
    for (const [key, url] of local) {
      const file = join(__dirname, '..', 'public', url);
      expect(existsSync(file), `${key} -> ${url} is missing`).toBe(true);
      expect(statSync(file).size, `${key} is empty`).toBeGreaterThan(10_000);
      // Their names carry no office, so they must be indexed as day-wide.
      expect(key, `${url} must be unattributed`).toMatch(/:day$/);
    }
  });

  it('does not stack the same recording twice on one key', () => {
    for (const [key, recs] of Object.entries(audio)) {
      expect(new Set(recs.map((r) => r.url)).size, key).toBe(recs.length);
    }
  });
});

describe('audioFor', () => {
  const idx: AudioIndex = {
    '1:1:negs': [{ url: 'https://www.ethiopianorthodox.org/a.mp3' }],
    '4:9:day': [{ url: 'https://www.ethiopianorthodox.org/b.mp3' }],
  };

  it('prefers the recording that names the service', () => {
    const [hit] = audioFor(idx, 1, 1, 'negs');
    expect(hit.exact).toBe(true);
    expect(hit.rec.url).toContain('a.mp3');
  });

  it('falls back to the day, and says that it did', () => {
    const [hit] = audioFor(idx, 4, 9, 'kidassie');
    expect(hit.exact).toBe(false);
    expect(hit.rec.url).toContain('b.mp3');
  });

  it('offers nothing rather than something from the wrong day', () => {
    expect(audioFor(idx, 1, 2, 'negs')).toEqual([]);
    expect(audioFor(null, 1, 1, 'negs')).toEqual([]);
  });

  /**
   * The source records only ዘነግሥ and ዘቅዳሴ, so a day-wide file belongs to one
   * of those. Handing it to a Vespers reader would look like an answer while
   * being the wrong office.
   */
  it('never offers a day-wide recording to ዘሠርክ, which the source never records', () => {
    expect(audioFor(idx, 4, 9, 'serk')).toEqual([]);
    expect(audioFor(idx, 1, 1, 'serk')).toEqual([]);
  });
});

/**
 * The guard that keeps a date from naming a chant it does not own. Every case
 * below is a screen a deacon actually reaches.
 */
describe('audioForCandidate', () => {
  const idx: AudioIndex = { '1:1:kidassie': [{ url: 'https://www.ethiopianorthodox.org/a.mp3' }] };
  const eth = { month: 1, day: 1 };
  const record: DayRecord = { title: null };
  const candidate = (kind: Candidate['kind']): Candidate =>
    ({ kind, record, reasonEn: '', reasonAm: '' });

  it('gives the daily cycle its recording', () => {
    expect(audioForCandidate(idx, candidate('daily'), eth, 'kidassie')).toHaveLength(1);
  });

  it("withholds it from the Sunday record sharing that day's date", () => {
    // On a Sunday the seasonal record takes the liturgy while the daily record
    // stays beside it; only the daily one is addressed by the date.
    expect(audioForCandidate(idx, candidate('seasonal'), eth, 'kidassie')).toEqual([]);
    expect(audioForCandidate(idx, candidate('monthly'), eth, 'kidassie')).toEqual([]);
    expect(audioForCandidate(idx, candidate('extra'), eth, 'kidassie')).toEqual([]);
  });

  it("withholds it on the mezmur page, which carries today's date around another week's record", () => {
    // App.tsx synthesises exactly this: today's DayInfo, a seasonal candidate.
    const mezmurPage: Candidate = {
      kind: 'seasonal', record, reasonEn: 'Great Lent', reasonAm: 'ዐቢይ ጾም', mezmur: 'ገብር ኄር',
    };
    expect(audioForCandidate(idx, mezmurPage, eth, 'kidassie')).toEqual([]);
  });
});

describe('misbakRefKey', () => {
  it('reads a psalm reference', () => {
    expect(misbakRefKey({ b: 'PSA', c: 141, s: 6, n: 8 })).toBe('PSA:141:6-8');
  });

  it('collapses a single-verse range', () => {
    expect(misbakRefKey({ b: 'PSA', c: 22, s: 4, n: 4 })).toBe('PSA:22:4');
  });

  it('is null without a citable book and chapter', () => {
    expect(misbakRefKey({ g: 'አድኅነኒ' })).toBeNull();
    expect(misbakRefKey({ b: 'PSA' })).toBeNull();
  });
});

describe('videosFor', () => {
  const reading = { b: 'PSA', c: 141, s: 6, n: 8 };
  const idx: VideoIndex = {
    'PSA:141:6-8': [{ id: 'aaaaaaaaaaa', title: 'shared' }],
    'ገብር-ኄር|PSA:141:6-8': [{ id: 'bbbbbbbbbbb', title: 'this Sunday' }],
  };

  it('lets a Sunday override the psalm it shares', () => {
    expect(videosFor(idx, reading, 'ገብር ኄር')[0].title).toBe('this Sunday');
  });

  it('falls back to the reference when the Sunday has none of its own', () => {
    expect(videosFor(idx, reading, 'ቅድስት')[0].title).toBe('shared');
    expect(videosFor(idx, reading, null)[0].title).toBe('shared');
  });

  it('offers nothing for an uncitable reading', () => {
    expect(videosFor(idx, { g: 'አድኅነኒ' }, 'ገብር ኄር')).toEqual([]);
  });
});

describe('the curated videos', () => {
  it('carries real YouTube ids, at most three to a misbak', () => {
    for (const [key, list] of Object.entries(videos)) {
      expect(list.length, key).toBeLessThanOrEqual(3);
      expect(new Set(list.map((v) => v.id)).size, key).toBe(list.length);
      for (const v of list) {
        expect(v.id, key).toMatch(/^[A-Za-z0-9_-]{11}$/);
        expect(v.title?.trim(), key).toBeTruthy();
      }
    }
  });

  it('is keyed by a citation shaped like the ones we generate', () => {
    for (const key of Object.keys(videos)) {
      const ref = key.includes('|') ? key.split('|')[1] : key;
      expect(ref, key).toMatch(/^[A-Z0-9]{3}:\d+:\d+(-\d+)?$/);
    }
  });
});
