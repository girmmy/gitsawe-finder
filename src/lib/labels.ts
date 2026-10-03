/** Bilingual UI labels. */
export type Lang = 'en' | 'am';

export const SERVICE_LABELS: Record<string, { am: string; en: string; note: { am: string; en: string } }> = {
  serk: { am: 'ዘሠርክ', en: 'Vespers (Serk)', note: { am: 'የሠርክ ጸሎት', en: 'the evening office' } },
  negs: { am: 'ዘነግሥ', en: 'Mahlet (Negs)', note: { am: 'የማኅሌት ጸሎት', en: 'the night office' } },
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
  copyFailed: { en: 'Could not copy', am: 'መቅዳት አልተቻለም' },
  share: { en: 'Share', am: 'አጋራ' },
  sinksar: { en: 'Synaxarium (Sinksar)', am: 'ስንክሳር' },
  alsoToday: { en: 'Readings that meet this day', am: 'የዕለቱ ግጻዌዎች' },
  pdf: { en: 'The book', am: 'መጽሐፉ' },
  about: { en: 'About', am: 'ስለ መተግበሪያው' },
  readings: { en: 'Readings', am: 'ግጻዌ' },
  mezmur: { en: 'Mezmur', am: 'መዝሙር' },
  translation: { en: 'Translation', am: 'ትርጓሜ' },
  mesbak: { en: 'Misbak', am: 'ምስባክ' },
  thisSunday: { en: 'Sunday', am: 'እሑድ' },
  byDay: { en: 'Any date', am: 'ቀን ምረጥ' },
  byMezmur: { en: 'Mezmurs', am: 'መዝሙራት' },
  allMezmurs: { en: 'All mezmurs', am: 'ሁሉም መዝሙራት' },
  loadingReadings: { en: 'Loading the readings…', am: 'ግጻዌውን በመጫን ላይ…' },
  showingNow: { en: 'Showing now', am: 'አሁን የሚታየው' },
  switchTo: { en: 'Show these instead', am: 'ይህን አሳይ' },
  fromScan: { en: 'from the page scans', am: 'ከመጽሐፉ ገጽ' },
  fromDeacon: { en: "from the deacon's lectionary", am: 'ከዲያቆኑ ግጻዌ' },
  scanTitle: { en: 'Some details here may be inaccurate. ', am: 'አንዳንድ ዝርዝሮች ትክክል ላይሆኑ ይችላሉ። ' },
  scanWarning: {
    en: 'For the exact text, open the book itself.',
    am: 'ትክክለኛውን ጽሑፍ ለማየት መጽሐፉን ይክፈቱ።',
  },
  openBookAt: { en: 'Open the book', am: 'መጽሐፉን ክፈት' },
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
  recordings: { en: 'Recordings', am: 'ቅጂዎች' },
  recordingDayOnly: {
    en: "for this day — the source doesn't say which service",
    am: 'የዕለቱ ቅጂ — ምንጩ የትኛው ጸሎት እንደሆነ አልገለጸም',
  },
  recordingManyMisbak: {
    en: "for this service — the source doesn't say which of today's misbak",
    am: 'የዚህ ጸሎት ቅጂ — ምንጩ ከዕለቱ ምስባካት የትኛው እንደሆነ አልገለጸም',
  },
  recordingNone: { en: 'No recording yet', am: 'እስካሁን ቅጂ የለም' },
  recordingNoneSerk: {
    en: 'No recording yet — ዘሠርክ is not in the collections we have',
    am: 'እስካሁን ቅጂ የለም — ዘሠርክ ባለን ስብስቦች ውስጥ የለም',
  },
  recordingSource: { en: 'from', am: 'ምንጭ' },
  watchOnYouTube: { en: 'Watch on YouTube', am: 'በዩቲዩብ ተመልከት' },
  playRecording: { en: 'Play', am: 'አጫውት' },
  mediaOffline: { en: 'Needs a connection', am: 'የበይነመረብ ግንኙነት ይፈልጋል' },
} as const;

export function t(key: keyof typeof UI, lang: Lang): string {
  return UI[key][lang];
}
