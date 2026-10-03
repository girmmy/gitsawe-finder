import { useMemo, useState } from 'react';
import { mezmurOf } from '../lib/resolver';
import { skeleton, translit } from '../lib/translit';
import { t, type Lang } from '../lib/labels';
import type { DayRecord, ExtraRecord, MonthlyRecord, SeasonalRecord } from '../lib/types';

export interface MezmurEntry {
  key: string;
  mezmur: string;
  group: string;
  record: DayRecord;
  unverified?: boolean;
  /** Which of our own two transcriptions it came from, when it is one. */
  provenance?: 'scan' | 'deacon';
}

type AnyRecord = SeasonalRecord | MonthlyRecord | ExtraRecord;

const seasonIs = (r: AnyRecord, ...keys: string[]) =>
  'season' in r && typeof r.season === 'string' && keys.includes(r.season);
const monthIs = (r: AnyRecord, key: string) => 'month' in r && r.month === key;
/** Records read from the book carry a `period`; match on its value, not its presence. */
const periodIs = (r: AnyRecord, ...keys: string[]) =>
  'period' in r && typeof r.period === 'string' && keys.includes(r.period);

/** Human-facing names for the book's cycles, in the order the year runs. */
const GROUPS: { match: (r: AnyRecord) => boolean; name: string }[] = [
  { name: 'መስከረም · Meskerem', match: (r) => monthIs(r, 'meskerem') || periodIs(r, 'meskel') },
  { name: 'ዘመነ ጽጌ · Tsige', match: (r) => monthIs(r, 'tsige') || periodIs(r, 'tsige') },
  { name: 'ዘመነ አስተምህሮ · Astemhro', match: (r) => monthIs(r, 'hidar') || periodIs(r, 'astemhro') },
  { name: 'ጾመ ነቢያት · Advent', match: (r) => seasonIs(r, 'genaTsom') },
  { name: 'ዘመነ ልደት · Christmastide', match: (r) => seasonIs(r, 'lidet') || periodIs(r, 'lidet') },
  { name: 'ጾመ ነነዌ · Nineveh', match: (r) => seasonIs(r, 'neneweTsom') },
  { name: 'ዐቢይ ጾም · Great Lent', match: (r) => seasonIs(r, 'abiyTsom', 'holy_thursday') },
  { name: 'ዘመነ ትንሣኤ · Eastertide', match: (r) => seasonIs(r, 'tnsae', 'erget') },
  { name: 'ዘመነ ክረምት · Kremt', match: (r) => seasonIs(r, 'kremt', 'astemhro', 'zere_demena') || periodIs(r, 'kremt') },
  { name: 'ጾመ ፍልሰታ · Filseta', match: (r) => seasonIs(r, 'filseta') },
  { name: 'ጳጉሜን · Pagumen', match: (r) => seasonIs(r, 'pagumen') },
  { name: 'ዐይነ ኵሉ · End of the year', match: (r) => periodIs(r, 'ayneKulu', 'gohTsibah') },
];

export function buildIndex(
  seasonal: SeasonalRecord[], monthly: MonthlyRecord[], extra: ExtraRecord[],
): MezmurEntry[] {
  const all = [...monthly, ...seasonal, ...extra] as AnyRecord[];
  const entries: MezmurEntry[] = [];
  const seen = new Set<string>();
  all.forEach((r, i) => {
    const mezmur = mezmurOf(r as DayRecord & { mezmur?: string | null });
    if (!mezmur) return;
    const group = GROUPS.find((g) => g.match(r))?.name ?? 'ሌሎች · Other';
    // The same Sunday can appear twice (a week and its Friday part); one card.
    const dedupe = `${group}::${mezmur}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    entries.push({
      key: `${group}-${mezmur}-${i}`,
      mezmur,
      group,
      record: r as DayRecord,
      unverified: 'provenance' in r && !!r.provenance,
      provenance: 'provenance' in r ? r.provenance : undefined,
    });
  });
  return entries;
}

export default function MezmurIndex({ entries, lang, onOpen }: {
  entries: MezmurEntry[]; lang: Lang; onOpen: (e: MezmurEntry) => void;
}) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qs = skeleton(q);
    const filtered = q
      ? entries.filter((e) => {
          const latin = translit(e.mezmur).toLowerCase();
          return e.mezmur.toLowerCase().includes(q) ||
            latin.includes(q) ||
            (qs.length > 1 && skeleton(latin).includes(qs)) ||
            e.group.toLowerCase().includes(q) ||
            (e.record.title ?? '').toLowerCase().includes(q);
        })
      : entries;
    const order = GROUPS.map((g) => g.name);
    const map = new Map<string, MezmurEntry[]>();
    for (const e of filtered) {
      if (!map.has(e.group)) map.set(e.group, []);
      map.get(e.group)!.push(e);
    }
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [entries, query]);

  return (
    <section className="mezmur-index">
      <input
        className="mezmur-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={lang === 'am' ? 'መዝሙር ፈልግ…' : 'Search a mezmur — ገብር ኄር, gebir her…'}
        aria-label="Search mezmur"
      />
      {grouped.length === 0 && <p className="loading">No mezmur matches that.</p>}
      {grouped.map(([group, items]) => (
        <div key={group} className="mezmur-group">
          <h3 className="mezmur-group-title">{group}</h3>
          <div className="mezmur-list">
            {items.map((e) => (
              <button key={e.key} className="mezmur-card" onClick={() => onOpen(e)}>
                <span className="mezmur-card-geez">{e.mezmur}</span>
                <span className="mezmur-card-translit">{translit(e.mezmur)}</span>
                {e.unverified && (
                  <span className="mezmur-card-flag" title="Not in the upstream dataset — verify against the book">
                    {t(e.provenance === 'deacon' ? 'fromDeacon' : 'fromScan', lang)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
