import { useMemo, useState } from 'react';
import { mezmurOf } from '../lib/resolver';
import { skeleton, translit } from '../lib/translit';
import type { Lang } from '../lib/labels';
import type { DayRecord, ExtraRecord, MonthlyRecord, SeasonalRecord } from '../lib/types';

export interface MezmurEntry {
  key: string;
  mezmur: string;
  group: string;
  record: DayRecord;
  unverified?: boolean;
}

/** Human-facing names for the book's cycles, in the order the year runs. */
const GROUPS: { match: (r: SeasonalRecord | MonthlyRecord | ExtraRecord) => boolean; name: string }[] = [
  { name: 'መስከረም · Meskerem', match: (r) => 'month' in r && r.month === 'meskerem' },
  { name: 'ዘመነ ጽጌ · Tsige', match: (r) => 'month' in r && r.month === 'tsige' },
  { name: 'ኅዳር · Hidar', match: (r) => 'month' in r && r.month === 'hidar' },
  { name: 'ጾመ ነቢያት · Advent', match: (r) => 'season' in r && r.season === 'genaTsom' },
  { name: 'ዘመነ ልደት · Christmastide', match: (r) => 'season' in r && r.season === 'lidet' },
  { name: 'ጾመ ነነዌ · Nineveh', match: (r) => 'season' in r && r.season === 'neneweTsom' },
  { name: 'ዐቢይ ጾም · Great Lent', match: (r) => 'season' in r && (r.season === 'abiyTsom' || r.season === 'holy_thursday') },
  { name: 'ዘመነ ትንሣኤ · Eastertide', match: (r) => 'season' in r && (r.season === 'tnsae' || r.season === 'erget') },
  { name: 'ዘመነ ክረምት · Kremt', match: (r) => 'season' in r && ['kremt', 'astemhro', 'zere_demena'].includes(r.season) },
  { name: 'ጾመ ፍልሰታ · Filseta', match: (r) => 'season' in r && r.season === 'filseta' },
  { name: 'ዐይነ ኵሉ · End of the year', match: (r) => 'period' in r },
  { name: 'ጳጉሜን · Pagumen', match: (r) => 'season' in r && r.season === 'pagumen' },
];

export function buildIndex(
  seasonal: SeasonalRecord[], monthly: MonthlyRecord[], extra: ExtraRecord[],
): MezmurEntry[] {
  const all = [...monthly, ...seasonal, ...extra] as (SeasonalRecord | MonthlyRecord | ExtraRecord)[];
  const entries: MezmurEntry[] = [];
  all.forEach((r, i) => {
    const mezmur = mezmurOf(r as DayRecord & { mezmur?: string | null });
    if (!mezmur) return;
    const group = GROUPS.find((g) => g.match(r))?.name ?? 'ሌሎች · Other';
    entries.push({
      key: `${group}-${mezmur}-${i}`,
      mezmur,
      group,
      record: r as DayRecord,
      unverified: 'provenance' in r && r.provenance === 'scan',
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
                {e.unverified && <span className="mezmur-card-flag">scan</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
