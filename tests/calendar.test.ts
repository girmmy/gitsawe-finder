import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ethToJDN, jdnToEth, gregToJDN, jdnToGreg, jdnToWeekday, toGeez } from '../src/lib/ethiopic';
import { bahireHasab, movableFeastJDN, MOVABLE_FEASTS } from '../src/lib/bahirehasab';
import { resolveDay, type Dataset } from '../src/lib/resolver';

const fixtures = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'conformance-sample.json'), 'utf8'),
);

describe('calendar conversion (EOTCDevAPI golden vectors)', () => {
  it('matches all sampled conversion vectors', () => {
    for (const v of fixtures.conversion) {
      const [gy, gm, gd] = v.gregorian;
      const [ey, em, ed] = v.ethiopic;
      expect(gregToJDN(gy, gm, gd)).toBe(v.jdn);
      expect(ethToJDN(ey, em, ed)).toBe(v.jdn);
      expect(jdnToEth(v.jdn)).toEqual({ year: ey, month: em, day: ed });
      expect(jdnToGreg(v.jdn)).toEqual({ year: gy, month: gm, day: gd });
      expect(jdnToWeekday(v.jdn)).toBe(v.weekday);
    }
  });
});

describe('bahire hasab (golden vectors)', () => {
  it('matches wenber/abekte/metqi/nineveh for 401 years', () => {
    for (const v of fixtures.bahire_hasab) {
      const b = bahireHasab(v.year);
      expect(b.ameteAlem).toBe(v.ameteAlem);
      expect(b.wenber).toBe(v.wenber);
      expect(b.abekte).toBe(v.abekte);
      expect(b.metqi).toBe(v.metqi);
      expect(b.ninevehJDN).toBe(v.ninevehJDN);
    }
  });

  it('matches every movable feast for 201 years', () => {
    for (const v of fixtures.movable_feasts) {
      for (const [key, jdn, weekday] of v.feasts) {
        if (!MOVABLE_FEASTS.some((f) => f.key === key)) continue;
        expect(movableFeastJDN(v.year, key)).toBe(jdn);
        expect(jdnToWeekday(jdn)).toBe(weekday);
      }
    }
  });

  it('known anchors', () => {
    // Orthodox Easter Apr 12 2026 = Fasika of 2018 EC.
    expect(jdnToGreg(movableFeastJDN(2018, 'fasika'))).toEqual({ year: 2026, month: 4, day: 12 });
    // Orthodox Easter Apr 20 2025 = Fasika of 2017 EC.
    expect(jdnToGreg(movableFeastJDN(2017, 'fasika'))).toEqual({ year: 2025, month: 4, day: 20 });
    // Ethiopian New Year 2019 EC = Sep 11 2026.
    expect(jdnToGreg(ethToJDN(2019, 1, 1))).toEqual({ year: 2026, month: 9, day: 11 });
  });
});

describe('geez numerals (golden vectors)', () => {
  it('matches sampled vectors', () => {
    for (const v of fixtures.geez) expect(toGeez(v.n)).toBe(v.geez);
  });
});

// --- resolver ---

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));
const seasonal = load('seasonal.json');
const monthly = load('monthly.json');
const extra = load('sunday-extra.json');
const dailyFor = (month: number) => load(`daily/${month}.json`);
const dataFor = (jdn: number): Dataset => ({ seasonal, monthly, extra, daily: dailyFor(jdnToEth(jdn).month) });

const resolve = (gy: number, gm: number, gd: number) => {
  const jdn = gregToJDN(gy, gm, gd);
  return resolveDay(jdn, dataFor(jdn));
};

describe('resolver', () => {
  it('Easter Sunday 2026 resolves to the Resurrection record', () => {
    const day = resolve(2026, 4, 12);
    expect(day.isSunday).toBe(true);
    expect(day.feasts.some((f) => f.en.includes('Easter'))).toBe(true);
    expect(day.candidates[0].kind).toBe('seasonal');
    expect((day.candidates[0].record as any).season).toBe('tnsae');
    expect((day.candidates[0].record as any).week).toBe(1);
  });

  it('Debre Zeyit (mid-Lent Sunday) 2026 = Mar 8 resolves to abiyTsom week 5', () => {
    const jdn = movableFeastJDN(2018, 'debre_zeit');
    const day = resolveDay(jdn, dataFor(jdn));
    expect(day.isSunday).toBe(true);
    expect((day.candidates[0].record as any).season).toBe('abiyTsom');
    expect((day.candidates[0].record as any).week).toBe(5);
  });

  it('Palm Sunday 2026 resolves to abiyTsom week 8 (Hosanna)', () => {
    const jdn = movableFeastJDN(2018, 'hosanna');
    const day = resolveDay(jdn, dataFor(jdn));
    expect((day.candidates[0].record as any).week).toBe(8);
  });

  it('an ordinary weekday leads with the fixed daily record', () => {
    const day = resolve(2026, 9, 15); // Meskerem 5 2019, a Tuesday
    expect(day.isSunday).toBe(false);
    expect(day.candidates[0].kind).toBe('daily');
  });

  it('a Sunday in Tsige season gets a tsige monthly candidate when digitized', () => {
    // First Sunday on/after Meskerem 26 2019 EC. Meskerem 26 2019 = Oct 6 2026 (Tue).
    const start = ethToJDN(2019, 1, 26);
    let jdn = start;
    while (jdnToWeekday(jdn) !== 0) jdn++;
    const day = resolveDay(jdn, dataFor(jdn));
    const tsige = day.candidates.find((c) => (c.record as any).month === 'tsige');
    expect(tsige).toBeTruthy();
    expect((tsige!.record as any).nthSunday).toBe(1);
  });

  it('a Sunday after Filseta gets the Ayne Kulu misbak, not the kremt count', () => {
    // Nehase 24, 2018 EC = 30 August 2026 — the case reported from the parish.
    const day = resolve(2026, 8, 30);
    expect(day.isSunday).toBe(true);
    const primary = day.candidates[0];
    expect(primary.kind).toBe('extra');
    const misbak = primary.record.kidassie!.msbak![0];
    expect(misbak.g).toContain('ዐይነ ኵሉ');
    expect(misbak.c).toBe(144);
    expect(misbak.kjv).toContain('145');
    // and it is flagged as our own transcription, not upstream data
    expect(primary.unverified).toBe(true);
  });

  it('the last Sunday of the year takes the Goh/Tsibah dawn psalm', () => {
    // Nehase 30, 2019 EC is the final Sunday before Pagumen of that year.
    let jdn = ethToJDN(2019, 12, 30);
    while (jdnToWeekday(jdn) !== 0) jdn--;
    const day = resolveDay(jdn, dataFor(jdn));
    const goh = day.candidates.find((c) => (c.record as any).period === 'gohTsibah');
    expect(goh).toBeTruthy();
    expect(goh!.record.kidassie!.msbak![0].c).toBe(5);
  });

  it('every Sunday of 2019 EC resolves without throwing and has at least one candidate', () => {
    let jdn = ethToJDN(2019, 1, 1);
    const end = ethToJDN(2020, 1, 1);
    let sundays = 0, withOverride = 0;
    for (; jdn < end; jdn++) {
      if (jdnToWeekday(jdn) !== 0) continue;
      sundays++;
      const day = resolveDay(jdn, dataFor(jdn));
      expect(day.candidates.length).toBeGreaterThan(0);
      if (day.candidates.some((c) => c.kind !== 'daily')) withOverride++;
    }
    expect(sundays).toBeGreaterThanOrEqual(52);
    // Most Sundays of the year should have a Sunday-cycle record.
    expect(withOverride / sundays).toBeGreaterThan(0.7);
  });
});
