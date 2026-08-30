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
  alsoToday: { en: 'Other readings that meet this day', am: 'ሌሎች የዕለቱ ግጻዌዎች' },
  pdf: { en: 'The Book (PDF)', am: 'መጽሐፉ (PDF)' },
  about: { en: 'About', am: 'ስለ መተግበሪያው' },
  readings: { en: 'Readings', am: 'ግጻዌ' },
  mezmur: { en: 'Mezmur', am: 'መዝሙር' },
  thisSunday: { en: 'Sunday', am: 'እሑድ' },
  byDay: { en: 'By day', am: 'በዕለት' },
  byMezmur: { en: 'By mezmur', am: 'በመዝሙር' },
  backToDay: { en: '← Back to the day', am: '← ወደ ዕለቱ ተመለስ' },
  evangelistYear: { en: 'Year of', am: 'ዘመነ' },
  fastDay: { en: 'Fasting', am: 'ጾም' },
  readUntil: { en: 'read until', am: 'እስከ' },
  ethPsalter: { en: 'Ethiopian Psalter', am: 'መዝሙረ ዳዊት' },
  download: { en: 'Download PDF', am: 'PDF አውርድ' },
} as const;

export function t(key: keyof typeof UI, lang: Lang): string {
  return UI[key][lang];
}
