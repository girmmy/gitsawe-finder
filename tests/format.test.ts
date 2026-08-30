import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gregToJDN, jdnToEth } from '../src/lib/ethiopic';
import { resolveDay, type Dataset } from '../src/lib/resolver';
import { formatDay, shortCitation, kjvPsalm } from '../src/lib/format';
import type { BookNames } from '../src/lib/data';

const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', f), 'utf8'));
const books: BookNames = load('books.json');
const seasonal = load('seasonal.json');
const monthly = load('monthly.json');
const extra = load('sunday-extra.json');

const dataFor = (jdn: number): Dataset =>
  ({ seasonal, monthly, extra, daily: load(`daily/${jdnToEth(jdn).month}.json`) });

describe('short citations', () => {
  it('marks an open-ended reading as running to the end of the chapter', () => {
    expect(shortCitation({ b: 'HEB', c: 3, s: 1 }, books)).toBe('Hebrews 3:1-end');
  });

  it('gives an explicit range when the lectionary supplies one', () => {
    expect(shortCitation({ b: 'JAS', c: 5, s: 1, n: 12 }, books)).toBe('James 5:1-12');
    expect(shortCitation({ b: 'ACT', c: 22, s: 1, n: 22 }, books)).toBe('Acts 22:1-22');
  });

  it('prints psalms in Ethiopian(KJV) form', () => {
    expect(shortCitation({ b: 'PSA', c: 144, s: 15, n: 16 }, books)).toBe('Psalm 144(145):15-16');
  });

  it('maps the Septuagint psalter onto KJV numbering', () => {
    expect(kjvPsalm(144)).toBe('145');
    expect(kjvPsalm(5)).toBe('5');
    expect(kjvPsalm(9)).toBe('9-10');
    expect(kjvPsalm(150)).toBe('150');
  });
});

describe('the group-chat message', () => {
  const jdn = gregToJDN(2026, 8, 30); // Nehase 24, 2018 — ዐይነ ኵሉ
  const day = resolveDay(jdn, dataFor(jdn));
  const text = formatDay(day, day.candidates[0], books);

  it('matches the shape a deacon posts', () => {
    expect(text).toBe(
`ግጻዌ ዘመዝሙር ይሁበነ ዝናመ በጊዜሁ (Lectionary for the Yaredian Mezmur yihubene ziname begizehu):
ነሐሴ ፳፬ ፳፻፲፰ ዓ.ም · Sunday, August 30, 2026

Readings:
Hebrews 3:1-end
James 5:1-12
Acts 22:1-22

Misbak:
Psalm 144(145):15-16
ayne kwilu nefis yisefo kiyake
inte tihubomu sisayomu begizehu
tisefih yemaneke wetatsegib lekwlu inissa zebesiratke

Translation:
The eyes of all wait upon thee,
and thou givest them their meat in due season.
Thou openest thy right hand, and satisfiest every living creature according to thy ordinance.

Gospel Reading:
John 6:41-end

Kidasse Epifanyos (Anaphora of St. Epiphanius)`,
    );
  });

  it('carries no Ge\'ez script, reader labels or incipits', () => {
    expect(text).not.toContain('ንፍቅ');
    expect(text).not.toContain('ጥንተ ንባብ');
    expect(text).not.toContain('▸');
    // The only Ethiopic left is the heading and the date.
    expect(text.split('\n').slice(2).join('\n')).not.toMatch(/[ሀ-፿]/);
  });
});
