/** Bilingual UI labels. */
export type Lang = 'en' | 'am';

export const SERVICE_LABELS: Record<string, { am: string; en: string; note: { am: string; en: string } }> = {
  serk: { am: 'ዘሠርክ', en: 'Vespers (Serk)', note: { am: 'የሠርክ ጸሎት', en: 'the evening office' } },
  negh: { am: 'ዘነግህ', en: 'Matins (Negh)', note: { am: 'የነግህ ጸሎት', en: 'the morning office' } },
  kidassie: { am: 'ዘቅዳሴ', en: 'Divine Liturgy (Kidassie)', note: { am: 'ቅዳሴ', en: 'the Eucharistic liturgy' } },
};

export const SLOT_LABELS: Record<string, { am: string; en: string; reader: { am: string; en: string } | null }> = {
  msbak: { am: 'ምስባክ', en: 'Misbak', reader: { am: 'ዲያቆን', en: 'the deacon' } },
  pauline: { am: 'መልእክተ ጳውሎስ', en: 'Pauline Epistle', reader: { am: 'ንፍቅ ዲያቆን', en: 'first deacon' } },
  catholic: { am: 'መልእክተ ሐዋርያት', en: 'Catholic Epistle', reader: { am: 'ዲያቆን', en: 'assistant deacon' } },
  acts: { am: 'ግብረ ሐዋርያት', en: 'Acts', reader: { am: 'ንፍቅ ካህን', en: 'assistant priest' } },
  gospel: { am: 'ወንጌል', en: 'Gospel', reader: { am: 'ካህን', en: 'the priest' } },
  anaphora: { am: 'ቅዳሴ', en: 'Anaphora', reader: null },
};

export const UI = {
  today: { en: 'Today', am: 'ዛሬ' },
  nextSunday: { en: 'Next Sunday', am: 'የሚቀጥለው እሑድ' },
  copyAll: { en: 'Copy all', am: 'ሁሉንም ቅዳ' },
  copied: { en: 'Copied!', am: 'ተቀድቷል!' },
  share: { en: 'Share', am: 'አጋራ' },
  sinksar: { en: 'Synaxarium (Sinksar)', am: 'ስንክሳር' },
  alsoToday: { en: 'Readings that meet this day', am: 'የዕለቱ ግጻዌዎች' },
  pdf: { en: 'The book', am: 'መጽሐፉ' },
  about: { en: 'About', am: 'ስለ መተግበሪያው' },
  readings: { en: 'Readings', am: 'ግጻዌ' },
  mezmur: { en: 'Mezmur', am: 'መዝሙር' },
  translation: { en: 'Translation', am: 'ትርጓሜ' },
  thisSunday: { en: 'Sunday', am: 'እሑድ' },
  byDay: { en: 'Any date', am: 'ቀን ምረጥ' },
  byMezmur: { en: 'Mezmurs', am: 'መዝሙራት' },
  allMezmurs: { en: 'All mezmurs', am: 'ሁሉም መዝሙራት' },
  loadingReadings: { en: 'Loading the readings…', am: 'ግጻዌውን በመጫን ላይ…' },
  showingNow: { en: 'Showing now', am: 'አሁን የሚታየው' },
  switchTo: { en: 'Show these instead', am: 'ይህን አሳይ' },
  fromScan: { en: 'from the page scans', am: 'ከመጽሐፉ ገጽ' },
  scanTitle: { en: 'Not yet checked by a deacon. ', am: 'ገና በዲያቆን አልተረጋገጠም። ' },
  scanWarning: {
    en: 'These readings were transcribed by eye from the page scans. Confirm them against the book before serving.',
    am: 'እነዚህ ንባባት ከመጽሐፉ ገጽ ምስል በዓይን የተገለበጡ ናቸው። ከማገልገልዎ በፊት ከመጽሐፉ ጋር ያረጋግጡ።',
  },
  openInBook: { en: 'Open that page →', am: 'ያንን ገጽ ክፈት →' },
  noRecord: {
    en: 'No record is digitized for this date — please consult the book.',
    am: 'ለዚህ ቀን የተመዘገበ ግጻዌ የለም — እባክዎ መጽሐፉን ይመልከቱ።',
  },
  evangelistYear: { en: 'Year of', am: 'ዘመነ' },
  fastDay: { en: 'Fasting', am: 'ጾም' },
  readUntil: { en: 'read until', am: 'እስከ' },
  ethPsalter: { en: 'Ethiopian Psalter', am: 'መዝሙረ ዳዊት' },
  download: { en: 'Download PDF', am: 'PDF አውርድ' },
} as const;

export function t(key: keyof typeof UI, lang: Lang): string {
  return UI[key][lang];
}
