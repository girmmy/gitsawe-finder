/**
 * ባሕረ ሐሳብ (Bahire Hasab) — the traditional EOTC computation that fixes every
 * movable feast of an Ethiopian year from the Fast of Nineveh.
 * Ported from EOTCDevAPI (github.com/natinael96/EOTCDevAPI, MIT), which
 * cross-verifies this chain against the Alexandrian computus for 1900–2100 EC.
 */
import { AMETE_FIDA, ethToJDN, jdnToWeekday } from './ethiopic';

export const EVANGELISTS = [
  { am: 'ዮሐንስ', en: 'John' },
  { am: 'ማቴዎስ', en: 'Matthew' },
  { am: 'ማርቆስ', en: 'Mark' },
  { am: 'ሉቃስ', en: 'Luke' },
] as const;

/** ተውሳክ for Nineveh, indexed by Mebaja Hamer's weekday (0 = Sunday). */
const TEWSAK_NINEVEH = [7, 6, 5, 4, 3, 2, 8] as const;

export const MOVABLE_FEASTS = [
  { key: 'nineveh', offset: 0, am: 'ጾመ ነነዌ', en: 'Fast of Nineveh' },
  { key: 'abiy_tsome', offset: 14, am: 'ዓቢይ ጾም', en: 'Great Lent begins' },
  { key: 'debre_zeit', offset: 41, am: 'ደብረ ዘይት', en: 'Debre Zeyit (mid-Lent)' },
  { key: 'hosanna', offset: 62, am: 'ሆሳዕና', en: 'Palm Sunday' },
  { key: 'siklet', offset: 67, am: 'ስቅለት', en: 'Good Friday' },
  { key: 'fasika', offset: 69, am: 'ትንሣኤ', en: 'Easter (Fasika)' },
  { key: 'rikbe_kahnat', offset: 93, am: 'ርክበ ካህናት', en: 'Assembly of the Priests' },
  { key: 'erget', offset: 108, am: 'ዕርገት', en: 'Ascension' },
  { key: 'peraklitos', offset: 118, am: 'ጰራቅሊጦስ', en: 'Pentecost' },
  { key: 'tsome_hawaryat', offset: 119, am: 'ጾመ ሐዋርያት', en: "Apostles' Fast begins" },
  { key: 'tsome_dihnet', offset: 121, am: 'ጾመ ድህነት', en: 'Fast of Salvation begins' },
] as const;

export type MovableFeastKey = (typeof MOVABLE_FEASTS)[number]['key'];

export interface BahireHasab {
  ameteMihret: number;
  ameteAlem: number;
  evangelist: { am: string; en: string; yearOfCycle: number };
  wenber: number;
  abekte: number;
  metqi: number;
  ninevehJDN: number;
}

const cache = new Map<number, BahireHasab>();

export function bahireHasab(year: number): BahireHasab {
  const hit = cache.get(year);
  if (hit) return hit;
  const ameteAlem = AMETE_FIDA + year;
  const medeb = ameteAlem % 19;
  const wenber = medeb === 0 ? 18 : medeb - 1;
  const abekte = (wenber * 11) % 30;
  const metqi = (wenber * 19) % 30;
  const effectiveMetqi = metqi === 0 ? 30 : metqi;
  const mhMonth = effectiveMetqi > 14 ? 1 : 2;
  const mhDay = effectiveMetqi;
  const mhJDN = ethToJDN(year, mhMonth, mhDay);
  const ninevehJDN = ethToJDN(year, mhMonth + 4, mhDay) + TEWSAK_NINEVEH[jdnToWeekday(mhJDN)];
  const result: BahireHasab = {
    ameteMihret: year,
    ameteAlem,
    evangelist: { ...EVANGELISTS[ameteAlem % 4], yearOfCycle: ameteAlem % 4 },
    wenber, abekte, metqi, ninevehJDN,
  };
  cache.set(year, result);
  return result;
}

export function movableFeastJDN(year: number, key: MovableFeastKey): number {
  const feast = MOVABLE_FEASTS.find((f) => f.key === key)!;
  return bahireHasab(year).ninevehJDN + feast.offset;
}
