/** A single reading as emitted by scripts/build-data.mjs (compact keys). */
export interface Reading {
  g?: string;   // Ge'ez text
  a?: string;   // Amharic text
  e?: string;   // English text (KJV, present for most misbak)
  bt?: string;  // source book title as printed (Amharic)
  b?: string;   // USFM book code
  c?: number;   // chapter (Ethiopian numbering for Psalms)
  s?: number;   // start verse
  n?: number;   // end verse
  et?: string;  // Ge'ez end-marker text ("read until …")
  en?: string;  // English citation, e.g. "Luke 4:17–23"
  kjv?: string; // KJV psalm citation, e.g. "Psalm 142 (Eth. 141:6–8)"
}

/** One service's readings. */
export interface Service {
  msbak?: Reading[];
  pauline?: Reading[];   // ንፍቅ ዲያቆን — Pauline epistle
  catholic?: Reading[];  // ዲያቆን — Catholic (general) epistle
  acts?: Reading[];      // ንፍቅ ካህን — Acts of the Apostles
  gospel?: Reading[];
  anaphora?: string[];   // appointed ቅዳሴ
}

export type ServiceName = 'serk' | 'negh' | 'kidassie';

/** Read one service off a record without widening the record's type. */
export function serviceOf(record: DayRecord, name: string): Service | undefined {
  return record[name as ServiceName];
}

export interface DayRecord {
  title: string | null;
  sinksar?: string[];
  serk?: Service;
  negh?: Service;
  kidassie?: Service;
}

export interface SeasonalRecord extends DayRecord {
  season: string;
  week: number | null;
  part: number | null;
}

export interface MonthlyRecord extends DayRecord {
  month: string;
  fromDay: number | null;
  toDay: number | null;
  nthSunday: number | null;
  crossMonth: boolean;
  appliesTo: string | null;
  mezmur: string | null;
}

/** A Sunday record transcribed from the printed book's back section. */
export interface ExtraRecord extends DayRecord {
  id: string;
  period: string;
  order: number;
  mezmur: string;
  periodAm: string;
  periodEn: string;
  provenance: 'scan';
  /** Inclusive Ethiopian day window within one month, where the book gives one. */
  fromDay?: number;
  toDay?: number;
  /** A window that crosses a month boundary, e.g. Tahsas 29 – Tir 5. */
  monthWindow?: { fromMonth: number; fromDay: number; toMonth: number; toDay: number };
  source?: string;
}

/** One resolved candidate: a record plus why it applies. */
export interface Candidate {
  kind: 'seasonal' | 'monthly' | 'daily' | 'extra';
  record: DayRecord;
  reasonEn: string;
  reasonAm: string;
  /** The Yaredian mezmur that names this Sunday, when the book gives one. */
  mezmur?: string | null;
  /** True when the record came from our own reading of the page scans. */
  unverified?: boolean;
}

export interface DayInfo {
  jdn: number;
  greg: { year: number; month: number; day: number };
  eth: { year: number; month: number; day: number };
  weekday: number;
  isSunday: boolean;
  evangelist: { am: string; en: string };
  season: { key: string; am: string; en: string } | null;
  fasting: { active: boolean; am: string; en: string } | null;
  feasts: { am: string; en: string }[];
  candidates: Candidate[];
  /** Explicit note when a Sunday has no digitized Sunday-cycle record. */
  gapNote: string | null;
  /** The PDF page carrying that Sunday's section, so the gap is one tap away. */
  gapPdfPage: number | null;
}
