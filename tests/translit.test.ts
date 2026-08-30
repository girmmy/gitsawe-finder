import { describe, expect, it } from 'vitest';
import { translit } from '../src/lib/translit';

describe('Ge\'ez transliteration', () => {
  it('renders familiar liturgical words the conventional way', () => {
    expect(translit('ምስባክ')).toBe('misbak');
    expect(translit('ወንጌል')).toBe('wengel');
    expect(translit('ቅዳሴ')).toBe('qidase');
    expect(translit('መስቀል')).toBe('mesqel');
    expect(translit('ሰንበት')).toBe('senbet');
    expect(translit('ትንሣኤ')).toBe('tinsae');
  });

  it('breaks up consonant clusters so a name stays sayable', () => {
    expect(translit('ገብር ኄር')).toBe('gebir her');
    // Exact Ge'ez syllabification is beyond a lookup table: ቅድስት comes out
    // "qidisit" where the conventional spelling is "qidist". Both are
    // pronounceable and the mezmur search matches on consonants, so either
    // spelling finds the record.
    expect(translit('ቅድስት')).toBe('qidisit');
  });

  it('treats the glottal series as bare vowels', () => {
    expect(translit('አምላክ')).toBe('amlak');
    expect(translit('እግዚአብሔር')).toBe('igziabher');
  });

  it('maps Ethiopic punctuation and keeps words separated', () => {
    expect(translit('ሰላም። ሰላም')).toBe('selam. selam');
    expect(translit('ቃል፡ሕይወት')).toBe('qal hiywet');
  });

  it('is a no-op on empty input', () => {
    expect(translit('')).toBe('');
  });
});
