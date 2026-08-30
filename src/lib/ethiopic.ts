/**
 * Ethiopian <-> Gregorian calendar conversion via Julian Day Number.
 * Ported from EOTCDevAPI (github.com/natinael96/EOTCDevAPI, MIT).
 */

/** JDN of Meskerem 1, 1 EC (Amete Mihret epoch). */
const JDN_EPOCH = 1723856;

/** Amete Alem (Year of the World) = Amete Mihret + 5500. */
export const AMETE_FIDA = 5500;

export const MONTHS = [
  { n: 1, am: 'መስከረም', en: 'Meskerem' },
  { n: 2, am: 'ጥቅምት', en: 'Tikimt' },
  { n: 3, am: 'ኅዳር', en: 'Hidar' },
  { n: 4, am: 'ታኅሣሥ', en: 'Tahsas' },
  { n: 5, am: 'ጥር', en: 'Tir' },
  { n: 6, am: 'የካቲት', en: 'Yekatit' },
  { n: 7, am: 'መጋቢት', en: 'Megabit' },
  { n: 8, am: 'ሚያዝያ', en: 'Miyazya' },
  { n: 9, am: 'ግንቦት', en: 'Ginbot' },
  { n: 10, am: 'ሰኔ', en: 'Sene' },
  { n: 11, am: 'ሐምሌ', en: 'Hamle' },
  { n: 12, am: 'ነሐሴ', en: 'Nehase' },
  { n: 13, am: 'ጳጉሜን', en: 'Pagumen' },
] as const;

/** Index 0 = Sunday, matching JS Date.getDay(). */
export const WEEKDAYS = [
  { n: 0, am: 'እሑድ', en: 'Sunday' },
  { n: 1, am: 'ሰኞ', en: 'Monday' },
  { n: 2, am: 'ማክሰኞ', en: 'Tuesday' },
  { n: 3, am: 'ረቡዕ', en: 'Wednesday' },
  { n: 4, am: 'ሐሙስ', en: 'Thursday' },
  { n: 5, am: 'ዓርብ', en: 'Friday' },
  { n: 6, am: 'ቅዳሜ', en: 'Saturday' },
] as const;

export interface EthDate { year: number; month: number; day: number }

export function isEthLeapYear(year: number): boolean {
  return ((year % 4) + 4) % 4 === 3;
}

export function daysInEthMonth(year: number, month: number): number {
  if (month === 13) return isEthLeapYear(year) ? 6 : 5;
  return 30;
}

export function ethToJDN(year: number, month: number, day: number): number {
  return JDN_EPOCH + 365 + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31;
}

export function jdnToEth(jdn: number): EthDate {
  const r = (((jdn - JDN_EPOCH) % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - JDN_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  return { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
}

export function gregToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function jdnToGreg(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

/** 0 = Sunday .. 6 = Saturday. */
export function jdnToWeekday(jdn: number): number {
  return (((jdn + 1) % 7) + 7) % 7;
}

/** JDN of the local "today" for the user's device clock. */
export function todayJDN(): number {
  const d = new Date();
  return gregToJDN(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const GEEZ_ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];
const GEEZ_TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'];

/** Arabic number -> Ge'ez numeral (sufficient for 1..9999). */
export function toGeez(num: number): string {
  if (num <= 0 || !Number.isInteger(num)) return String(num);
  let out = '';
  const pairs: number[] = [];
  let n = num;
  while (n > 0) { pairs.push(n % 100); n = Math.floor(n / 100); }
  for (let i = pairs.length - 1; i >= 0; i--) {
    const p = pairs[i];
    let s = GEEZ_TENS[Math.floor(p / 10)] + GEEZ_ONES[p % 10];
    if (i > 0) {
      if (i % 2 === 1) { // hundreds position
        if (s === '፩') s = '';
        s += '፻';
      } else {
        s += '፼';
      }
      if (p === 0) s = '';
    }
    out += s;
  }
  return out || String(num);
}
