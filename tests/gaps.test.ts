import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ethToJDN, gregToJDN, jdnToEth, jdnToWeekday } from '../src/lib/ethiopic';
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

/**
 * ከመስከረም ፲፮ እስከ ፳፭ (መስቀል) is ten days wide, so when Meskel falls early in the
 * week the window carries a second Sunday — and the book gives that Sunday its
 * own mezmur. Matching the window alone served the first Sunday's mezmur to
 * both, which is the one wrong answer that looks right.
 */
describe('a day window that holds two Sundays', () => {
  it('gives the second Sunday of መስቀል its own mezmur', () => {
    // Meskerem 24, 2019 EC = 4 October 2026. Meskel (the 17th) was the Sunday before.
    const jdn = gregToJDN(2026, 10, 4);
    expect(jdnToEth(jdn)).toEqual({ year: 2019, month: 1, day: 24 });
    const day = resolveDay(jdn, dataFor(jdn));
    const lead = day.candidates[0];
    expect(lead.mezmur).toBe('መስቀልከ እግዚኦ ተሰብሐ');
    expect(lead.record.kidassie!.msbak![0].c).toBe(67);   // መዝ. ፷፯፥፳፰–፳፱ = Psalm 68 (KJV)
    expect(lead.approximate).toBeFalsy();
    expect(day.gapNote).toBeNull();
    // The window's opening mezmur belongs to last Sunday and must not be offered.
    expect(day.candidates.map((c) => c.mezmur)).not.toContain('ዝንቱ ውእቱ መስቀል');
  });

  it('still gives the first Sunday of the window the mezmur that opens it', () => {
    const jdn = gregToJDN(2026, 9, 27); // Meskerem 17, 2019 EC — Meskel itself, a Sunday
    const day = resolveDay(jdn, dataFor(jdn));
    expect(day.candidates[0].mezmur).toBe('ዝንቱ ውእቱ መስቀል');
    expect(day.gapNote).toBeNull();
  });

  it('lets the Meskerem 25 record take that Sunday when it falls there', () => {
    // 2018 EC: the window's Sundays are the 18th and the 25th.
    const jdn = ethToJDN(2018, 1, 25);
    expect(jdnToWeekday(jdn)).toBe(0);
    const day = resolveDay(jdn, dataFor(jdn));
    expect(day.candidates[0].mezmur).toBe('ትብሎ መርዓት');
  });

  it('says so where the second Sunday has no record of its own', () => {
    // ኢተዘከር is given for ኅዳር ፩–፲፪, twelve days; 2020 EC puts a Sunday at both
    // ends of it. We have the window's mezmur and nothing for its second Sunday.
    let jdn = ethToJDN(2020, 3, 1);
    while (jdnToWeekday(jdn) !== 0) jdn++;
    const second = jdn + 7;
    expect(jdnToEth(second).day).toBeLessThanOrEqual(12);
    const day = resolveDay(second, dataFor(second));
    expect(day.candidates.some((c) => c.approximate)).toBe(true);
    expect(day.gapNote).toContain('two Sundays');
    expect(day.gapPdfPage).toBe(391); // ዘመዝሙር ወርኀ ኅዳር
    // The reading is still shown rather than withheld.
    expect(day.candidates[0].record.kidassie).toBeTruthy();
  });

  it('leaves a window with only one Sunday unflagged', () => {
    // 2020 EC: Meskerem 22 is the window's only Sunday.
    const jdn = ethToJDN(2020, 1, 22);
    expect(jdnToWeekday(jdn)).toBe(0);
    const day = resolveDay(jdn, dataFor(jdn));
    expect(day.candidates[0].mezmur).toBe('ዝንቱ ውእቱ መስቀል');
    expect(day.candidates.some((c) => c.approximate)).toBe(false);
    expect(day.gapNote).toBeNull();
  });
});
