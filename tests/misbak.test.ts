import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { citation, misbakEnglishLines } from '../src/lib/format';
import { buildIndex } from '../src/components/MezmurIndex';
import type { ExtraRecord } from '../src/lib/types';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));
const extra: ExtraRecord[] = load('sunday-extra.json');
const books = load('books.json');

describe('the misbak', () => {
  it('has one English line per chanted Ge\'ez clause', () => {
    for (const rec of extra) {
      const m = rec.kidassie?.msbak?.[0];
      if (!m?.el?.length) continue;
      const geez = (m.g ?? '').split('።').map((s) => s.trim()).filter(Boolean);
      expect(geez.length, `${rec.id} line counts`).toBe(m.el.length);
      expect(misbakEnglishLines(m)).toHaveLength(geez.length);
    }
  });

  /**
   * The book prints this one as a cross-reference — the incipit, then "take it
   * from the ዘሠርክ of Sene 25" — so it is the record most easily left as a
   * fragment. A deacon who gets only the first clause cannot chant it.
   */
  it('carries all three clauses where the book cross-references them', () => {
    const m = extra.find((r) => r.id === 'tsige-4')!.kidassie!.msbak![0];
    expect(m.g!.split('።').filter((s) => s.trim())).toHaveLength(3);
    expect(m.g).toContain('ክረምተ ወሐጋየ ዘአንተ ፈጠርከ');
    expect([m.b, m.c, m.s, m.n]).toEqual(['PSA', 73, 16, 17]);
  });

  /**
   * A misbak with no reference cannot be looked up, and one cut to its opening
   * clause cannot be chanted. Both are what a cross-reference in the book turns
   * into if it is transcribed as though it were the reading itself, so every
   * record is held to the three clauses the psalm verses carry.
   */
  it('gives every Sunday a psalm to look up, in full', () => {
    for (const rec of extra) {
      for (const m of rec.kidassie?.msbak ?? []) {
        expect(citation(m, books).en, `${rec.id} has a citation`).toBeTruthy();
        expect(m.g!.split('።').filter((s) => s.trim()).length,
          `${rec.id} is more than an incipit`).toBeGreaterThan(1);
      }
    }
  });

  /**
   * The book indexes these three by day window (ኅዳር ፩–፲፪, ፲፫–፲፱, ፳–፳፮) and the
   * upstream dataset by nth Sunday of ጾመ ነቢያት, but they are the same propers —
   * same epistles, same Acts, same gospel, bar a verse either way. That is what
   * licenses reading their misbak off the seasonal records.
   */
  it('matches ዘአስተምህር to the ጾመ ነቢያት records it shares propers with', () => {
    const seasonal = load('seasonal.json');
    const pairs = [['astemhro-1', 1], ['astemhro-2', 2], ['astemhro-3', 3]] as const;
    for (const [id, part] of pairs) {
      const mine = extra.find((r) => r.id === id)!.kidassie!;
      const theirs = seasonal.find(
        (r: { season: string; week: number; part: number }) =>
          r.season === 'genaTsom' && r.week === 1 && r.part === part,
      ).kidassie;
      expect(mine.msbak![0].c, `${id} misbak psalm`).toBe(theirs.msbak[0].c);
      for (const slot of ['pauline', 'catholic', 'acts', 'gospel'] as const) {
        expect(mine[slot]?.[0]?.b, `${id} ${slot} book`).toBe(theirs[slot][0].b);
        expect(mine[slot]?.[0]?.c, `${id} ${slot} chapter`).toBe(theirs[slot][0].c);
      }
    }
  });

  it('follows the mezmur: Ayne Kulu belongs to ይሁበነ ዝናመ በጊዜሁ', () => {
    const rec = extra.find((r) => r.mezmur === 'ይሁበነ ዝናመ በጊዜሁ')!;
    expect(rec.kidassie!.msbak![0].g).toContain('ዐይነ ኵሉ');
    expect(rec.kidassie!.msbak![0].c).toBe(144);
  });
});

describe('the mezmur index', () => {
  const idx = buildIndex(load('seasonal.json'), load('monthly.json'), extra);

  it('files each record under its own season, not a catch-all', () => {
    const group = (m: string) => idx.find((e) => e.mezmur === m)?.group;
    expect(group('ኪነ ጥበቡ መንክር ወዕፁብ')).toContain('Tsige');
    expect(group('ኢተዘከር')).toContain('Astemhro');
    expect(group('ይሠርቅ ኮከብ')).toContain('Christmastide');
    expect(group('ይሁበነ ዝናመ በጊዜሁ')).toContain('End of the year');
  });

  it('lists each mezmur once', () => {
    const keys = idx.map((e) => `${e.group}::${e.mezmur}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('strips season words and ordinals off the names', () => {
    const names = idx.map((e) => e.mezmur);
    expect(names).toContain('ዮም ንወድሳ ለማርያም');
    expect(names.some((n) => n.startsWith('ዘፍልሰታ'))).toBe(false);
    expect(names.some((n) => /^[፩-፺]/.test(n))).toBe(false);
    expect(names.some((n) => n.includes('('))).toBe(false);
  });
});
