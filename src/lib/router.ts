/**
 * A very small hash router.
 *
 * Hash routing rather than history routing so the app works from any static
 * host and from `file://` without server rewrites — a deacon can save the page
 * and it still navigates.
 *
 * Routes:
 *   #/                     the coming Sunday
 *   #/sunday/2026-09-20    another Sunday, for preparing ahead
 *   #/date/2026-08-30      one date (Gregorian, ISO)
 *   #/mezmur               the mezmur index
 *   #/mezmur/<key>         one mezmur
 *   #/book                 the book
 *   #/book/415             the book at a page
 *   #/about                about and sources
 */

export type Route =
  | { name: 'sunday'; iso?: string }
  | { name: 'date'; iso: string }
  | { name: 'mezmur' }
  | { name: 'mezmurItem'; key: string }
  | { name: 'book'; page: number | null }
  | { name: 'about' }
  | { name: 'notFound'; path: string };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A date that exists, not merely one shaped like a date.
 *
 * Matching the shape alone let "2026-13-45" through, and the calendar quietly
 * rolled it into a real-looking February 2027; "0000-00-00" rendered as
 * December -1. A reader who mistypes a URL should be told the route is wrong,
 * not shown readings for a day that never happened.
 */
function isRealDate(iso: string): boolean {
  const m = ISO.exec(iso);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  if (!path) return { name: 'sunday' };

  const [head, ...rest] = path.split('/');
  const arg = rest.map(decodeURIComponent).join('/');

  switch (head) {
    case 'sunday':
      if (!arg) return { name: 'sunday' };
      return isRealDate(arg) ? { name: 'sunday', iso: arg } : { name: 'notFound', path };
    case 'date':
      return isRealDate(arg) ? { name: 'date', iso: arg } : { name: 'notFound', path };
    case 'mezmur':
      return arg ? { name: 'mezmurItem', key: arg } : { name: 'mezmur' };
    case 'book': {
      if (!arg) return { name: 'book', page: null };
      const page = Number(arg);
      return Number.isInteger(page) && page > 0
        ? { name: 'book', page }
        : { name: 'notFound', path };
    }
    case 'about':
      return { name: 'about' };
    default:
      return { name: 'notFound', path };
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'sunday': return route.iso ? `#/sunday/${route.iso}` : '#/';
    case 'date': return `#/date/${route.iso}`;
    case 'mezmur': return '#/mezmur';
    case 'mezmurItem': return `#/mezmur/${encodeURIComponent(route.key)}`;
    case 'book': return route.page ? `#/book/${route.page}` : '#/book';
    case 'about': return '#/about';
    case 'notFound': return '#/';
  }
}

export function navigate(route: Route): void {
  const href = hrefFor(route);
  if (window.location.hash !== href) window.location.hash = href;
}

/** A stable, URL-safe key for a mezmur entry. */
export function mezmurKey(mezmur: string): string {
  return mezmur.trim().replace(/\s+/g, '-');
}
