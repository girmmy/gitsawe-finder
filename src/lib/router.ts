/**
 * A very small hash router.
 *
 * Hash routing rather than history routing so the app works from any static
 * host and from `file://` without server rewrites — a deacon can save the page
 * and it still navigates.
 *
 * Routes:
 *   #/                     the coming Sunday
 *   #/date/2026-08-30      one date (Gregorian, ISO)
 *   #/mezmur               the mezmur index
 *   #/mezmur/<key>         one mezmur
 *   #/book                 the book
 *   #/book/415             the book at a page
 *   #/about                about and sources
 */

export type Route =
  | { name: 'sunday' }
  | { name: 'date'; iso: string }
  | { name: 'mezmur' }
  | { name: 'mezmurItem'; key: string }
  | { name: 'book'; page: number | null }
  | { name: 'about' }
  | { name: 'notFound'; path: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  if (!path) return { name: 'sunday' };

  const [head, ...rest] = path.split('/');
  const arg = rest.map(decodeURIComponent).join('/');

  switch (head) {
    case 'sunday':
      return { name: 'sunday' };
    case 'date':
      return ISO.test(arg) ? { name: 'date', iso: arg } : { name: 'notFound', path };
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
    case 'sunday': return '#/';
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
