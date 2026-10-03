import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { misbakEnglishLines } from '../src/lib/format';
import { buildIndex } from '../src/components/MezmurIndex';
import type { ExtraRecord } from '../src/lib/types';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));
const extra: ExtraRecord[] = load('sunday-extra.json');

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

  it('follows the mezmur: መስቀልከ እግዚኦ ተሰብሐ belongs to መዝ. ፷፯፥፳፰–፳፱', () => {
    const rec = extra.find((r) => r.mezmur === 'መስቀልከ እግዚኦ ተሰብሐ')!;
    const m = rec.kidassie!.msbak![0];
    expect(m.c).toBe(67);          // Ethiopian Psalter numbering — Psalm 68 in the KJV
    expect(m.s).toBe(28);
    expect(m.n).toBe(29);
    expect(m.g).toContain('ጽርሐከ ዘኢየሩሳሌም');
    expect(misbakEnglishLines(m)).toHaveLength(3);
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
