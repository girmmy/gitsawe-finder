import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SERVICE_LABELS } from '../src/lib/labels';
import { serviceOf, type DayRecord } from '../src/lib/types';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));

describe('the three services the book names', () => {
  it('labels each one as the book heads its misbak', () => {
    expect(SERVICE_LABELS.serk.am).toBe('ዘሠርክ');
    // ዘነግሥ, not ዘነግህ: the slot is the ማኅሌት, not a morning office.
    expect(SERVICE_LABELS.negs.am).toBe('ዘነግሥ');
    expect(SERVICE_LABELS.kidassie.am).toBe('ዘቅዳሴ');
  });

  it('carries a ዘነግሥ misbak on nearly every day of the fixed cycle', () => {
    let withNegs = 0, total = 0;
    for (let m = 1; m <= 13; m++) {
      for (const rec of Object.values(load(`daily/${m}.json`)) as DayRecord[]) {
        total++;
        if (serviceOf(rec, 'negs')?.msbak?.length) withNegs++;
      }
    }
    expect(total).toBe(366);
    expect(withNegs).toBeGreaterThan(350);
  });

  it('leaves the Sunday cycle mostly ዘቅዳሴ only, as the book prints it', () => {
    const seasonal = load('seasonal.json') as DayRecord[];
    expect(seasonal.every((r) => serviceOf(r, 'kidassie')?.msbak?.length)).toBe(true);
    expect(seasonal.filter((r) => serviceOf(r, 'negs')).length).toBeLessThan(seasonal.length / 2);
  });

  it('emits no record still keyed by the upstream name', () => {
    for (const f of ['seasonal.json', 'monthly.json', 'daily/1.json']) {
      expect(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8')).not.toContain('"negh"');
    }
  });
});

describe('the gospel row', () => {
  it('has a citation to lead with on all but a handful of readings', () => {
    let total = 0, uncited = 0;
    for (let m = 1; m <= 13; m++) {
      for (const rec of Object.values(load(`daily/${m}.json`)) as DayRecord[]) {
        for (const name of ['kidassie', 'serk', 'negs']) {
          for (const g of serviceOf(rec, name)?.gospel ?? []) {
            total++;
            // Same test the row itself applies: with no reference in either
            // script there is no headline, and the incipit carries the row.
            if (!(g.en || g.kjv || ((g.bt || g.b) && g.c != null))) uncited++;
          }
        }
      }
    }
    expect(total).toBeGreaterThan(1000);
    expect(uncited).toBeLessThan(10);
  });
});
