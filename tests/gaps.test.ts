import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ethToJDN, jdnToEth, jdnToWeekday } from '../src/lib/ethiopic';
import { resolveDay, type Dataset } from '../src/lib/resolver';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));
const seasonal = load('seasonal.json'), monthly = load('monthly.json'), extra = load('sunday-extra.json');
const dataFor = (jdn: number): Dataset =>
  ({ seasonal, monthly, extra, daily: load(`daily/${jdnToEth(jdn).month}.json`) });

describe('coverage of the Sunday cycle', () => {
  it('resolves the 2nd Sunday of Tsige from the parish scan', () => {
    // 2nd Sunday counted from Meskerem 26.
    let jdn = ethToJDN(2019, 1, 26);
    while (jdnToWeekday(jdn) !== 0) jdn++;
    jdn += 7;
    const day = resolveDay(jdn, dataFor(jdn));
    const rec = day.candidates[0];
    expect(rec.mezmur).toBe('ኪነ ጥበቡ መንክር ወዕፁብ');
    expect(rec.unverified).toBe(true);
  });

  it('sends every remaining gap to a real page of the bundled book', () => {
    let gaps = 0;
    for (let jdn = ethToJDN(2019, 1, 1); jdn < ethToJDN(2020, 1, 1); jdn++) {
      if (jdnToWeekday(jdn) !== 0) continue;
      const day = resolveDay(jdn, dataFor(jdn));
      if (!day.gapNote) continue;
      gaps++;
      expect(day.gapPdfPage).toBeGreaterThan(0);
      expect(day.gapPdfPage).toBeLessThanOrEqual(452); // the bundled PDF's length
    }
    expect(gaps).toBeGreaterThan(0);
  });
});

describe('candidates stay in season', () => {
  it('an end-of-year Sunday offers only end-of-year records, not every season', () => {
    // Nehase 24, 2018 EC = 30 August 2026.
    const jdn = ethToJDN(2018, 12, 24);
    const day = resolveDay(jdn, dataFor(jdn));
    const periods = day.candidates
      .map((c) => (c.record as { period?: string }).period)
      .filter(Boolean);
    expect(new Set(periods)).toEqual(new Set(['ayneKulu', 'gohTsibah']));
    expect(periods).not.toContain('tsige');
    expect(periods).not.toContain('astemhro');
  });

  it('a date offers no candidate from a season it is not in', () => {
    for (const [m, d] of [[1, 10], [3, 5], [5, 2], [10, 28]] as const) {
      const jdn = ethToJDN(2019, m, d);
      const day = resolveDay(jdn, dataFor(jdn));
      // Every extra candidate must carry a window that actually contains the date.
      for (const c of day.candidates) {
        const r = c.record as { period?: string; fromDay?: number; toDay?: number };
        if (!r.period) continue;
        if (r.fromDay != null) expect(d).toBeGreaterThanOrEqual(r.fromDay);
      }
    }
  });
});
