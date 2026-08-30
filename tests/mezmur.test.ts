import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mezmurOf } from '../src/lib/resolver';
import type { MonthlyRecord, SeasonalRecord } from '../src/lib/types';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));
const seasonal: SeasonalRecord[] = load('seasonal.json');
const monthly: MonthlyRecord[] = load('monthly.json');

const season = (key: string, week: number | null) =>
  seasonal.find((r) => r.season === key && r.week === week && r.part === null)!;

describe('mezmur naming', () => {
  it('names the Sundays of Great Lent', () => {
    expect(mezmurOf(season('abiyTsom', 1))).toBe('ዘወረደ');
    expect(mezmurOf(season('abiyTsom', 5))).toBe('ደብረ ዘይት');
    expect(mezmurOf(season('abiyTsom', 6))).toBe('ገብር ኄር');
    expect(mezmurOf(season('abiyTsom', 8))).toBe('ሆሳዕና');
  });

  it('reads the printed mezmur out of monthly and kremt titles', () => {
    expect(mezmurOf(monthly.find((r) => r.month === 'hidar' && r.nthSunday === 4)!))
      .toBe('ይቤሉ እስራኤል');
    expect(mezmurOf(season('kremt', 7))).toBe('ቦእ ኢየሱስ');
  });

  it('leaves records with no printed name unnamed rather than inventing one', () => {
    expect(mezmurOf(season('lidet', 1))).toBeNull();
  });
});
