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
