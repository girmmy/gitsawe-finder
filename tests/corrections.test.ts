/**
 * The committed public/data/ is generated, so a correction only holds as long
 * as someone reruns the build. These assert the corrected wording is actually
 * in the data a browser loads, and that every correction still describes a
 * reading that exists — a stale entry should surface here as well as in the
 * build.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const load = (f: string) => JSON.parse(readFileSync(join(root, 'public', 'data', f), 'utf8'));
const corrections: {
  cycle: string;
  where: string;
  match?: Record<string, unknown>;
  field: string;
  from: string;
  to: string;
}[] = JSON.parse(readFileSync(join(root, 'scripts', 'corrections.json'), 'utf8'));

/** Every reading text of one cycle's records, flattened. */
function texts(cycle: string, field: string): string[] {
  const records: Record<string, unknown>[] =
    cycle === 'daily'
      ? Array.from({ length: 13 }, (_, i) => load(`daily/${i + 1}.json`)).flatMap((month) =>
          Object.values(month as Record<string, Record<string, unknown>>),
        )
      : load(`${cycle}.json`);
  const out: string[] = [];
  for (const rec of records) {
    for (const svc of Object.values(rec)) {
      if (!svc || typeof svc !== 'object') continue;
      for (const slot of Object.values(svc as Record<string, unknown>)) {
        if (!Array.isArray(slot)) continue;
        for (const entry of slot) {
          const v = entry?.[field];
          if (typeof v === 'string') out.push(v);
        }
      }
    }
  }
  return out;
}

describe('corrections read off the book', () => {
  it.each(corrections)('$where', (c) => {
    const all = texts(c.cycle, c.field);
    expect(all.filter((t) => t === c.to), 'corrected wording is in the built data').toHaveLength(1);
    expect(all, 'the dataset wording was replaced, not added to').not.toContain(c.from);
  });

  it("this Sunday's misbak reads ትሁብ, as the book prints it", () => {
    const rec = load('monthly.json').find(
      (r: { month: string; fromDay: number }) => r.month === 'meskerem' && r.fromDay === 9,
    );
    expect(rec.mezmur).toBe('እኲት አንተ');
    expect(rec.kidassie.msbak[0].g).toBe(
      'ምድርኒ ትሁብ ፍሬሃ። ወይባርከነ እግዚአብሔር አምላክነ። ወይባርከነ እግዚአብሔር።',
    );
    expect(rec.kidassie.msbak[0].kjv).toBe('Psalm 67 (Eth. 66:6–7)');
  });
});
