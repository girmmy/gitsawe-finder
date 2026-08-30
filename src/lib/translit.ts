/**
 * Ge'ez / Ethiopic script -> Latin transliteration, so a reader who doesn't
 * read fidel can still pronounce the misbak aloud.
 *
 * The Ethiopic block is laid out regularly: each consonant occupies eight
 * code points, one per vowel order. So the syllable at U+1200 + 8c + v is
 * consonant c in vowel order v.
 *
 * Sixth-order (ሳድስ) syllables carry no vowel. Rendering them bare gives
 * "wengel" for ወንጌል, but leaves a word like ምስባክ starting on a consonant
 * cluster, so a word-initial sixth order gets an "i": "misbak".
 */

const CONSONANTS: Record<number, string> = {
  0x1200: 'h', 0x1208: 'l', 0x1210: 'h', 0x1218: 'm', 0x1220: 's', 0x1228: 'r',
  0x1230: 's', 0x1238: 'sh', 0x1240: 'q', 0x1248: 'qw', 0x1250: 'q', 0x1258: 'qw',
  0x1260: 'b', 0x1268: 'v', 0x1270: 't', 0x1278: 'ch', 0x1280: 'h', 0x1288: 'hw',
  0x1290: 'n', 0x1298: 'ny', 0x12a0: '', 0x12a8: 'k', 0x12b0: 'kw', 0x12b8: 'kh',
  0x12c0: 'khw', 0x12c8: 'w', 0x12d0: '', 0x12d8: 'z', 0x12e0: 'zh', 0x12e8: 'y',
  0x12f0: 'd', 0x12f8: 'dd', 0x1300: 'j', 0x1308: 'g', 0x1310: 'gw', 0x1318: 'ng',
  0x1320: 't', 0x1328: 'ch', 0x1330: 'p', 0x1338: 'ts', 0x1340: 'ts', 0x1348: 'f',
  0x1350: 'p', 0x1358: 'ry', 0x1360: 'my', 0x1368: 'fy',
};

/** Vowel orders 1..8 (ግዕዝ, ካዕብ, ሣልስ, ራብዕ, ኃምስ, ሳድስ, ሳብዕ, ዘመደ). */
const VOWELS = ['e', 'u', 'i', 'a', 'e', '', 'o', 'wa'];

/** Vowel the ኣ/ዐ (glottal) series carries on its own, per order. */
const BARE_VOWELS = ['a', 'u', 'i', 'a', 'e', 'i', 'o', 'wa'];

const PUNCT: Record<string, string> = {
  '።': '.', '፡': ' ', '፣': ',', '፤': ';', '፥': ':', '፦': ':', '፧': '?', '፨': '.',
};

interface Syllable { text: string; bare: boolean }

function syllable(code: number): Syllable | null {
  if (code < 0x1200 || code > 0x137f) return null;
  const base = 0x1200 + Math.floor((code - 0x1200) / 8) * 8;
  const order = (code - 0x1200) % 8;
  const cons = CONSONANTS[base];
  if (cons === undefined) return null;
  // The glottal series (አ, ዐ) is a vowel on its own.
  if (cons === '') return { text: BARE_VOWELS[order], bare: false };
  return { text: cons + VOWELS[order], bare: order === 5 };
}

const isBare = (ch: string | undefined): boolean => {
  if (!ch) return false;
  const s = syllable(ch.codePointAt(0)!);
  return !!s?.bare;
};

/**
 * The consonant skeleton of a Latin string, for forgiving search: the vowels
 * a reader guesses at ("qidist", "qidisit", "kidist") all reduce to the same
 * key, so any reasonable spelling finds the mezmur.
 */
export function skeleton(s: string): string {
  return s.toLowerCase().replace(/[aeiou'’\s.,;:?-]/g, '');
}

/** Transliterate one Ethiopic string into readable Latin letters. */
export function translit(input: string): string {
  if (!input) return '';
  const out: string[] = [];
  let wordStart = true;
  const chars = Array.from(input);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const code = ch.codePointAt(0)!;

    if (PUNCT[ch] !== undefined) {
      out.push(PUNCT[ch]);
      wordStart = true;
      continue;
    }
    if (/\s/.test(ch)) {
      out.push(' ');
      wordStart = true;
      continue;
    }
    const syl = syllable(code);
    if (!syl) {
      out.push(ch);
      wordStart = false;
      continue;
    }
    // A sixth order carries no vowel, which is unsayable when it opens a word
    // or runs into another bare consonant: ምስባክ -> misbak, ገብር -> gebir.
    const needsVowel = syl.bare && (wordStart || isBare(chars[i + 1]));
    out.push(needsVowel ? syl.text + 'i' : syl.text);
    wordStart = false;
  }

  return out
    .join('')
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([.,;:?])/g, '$1')
    .trim();
}
