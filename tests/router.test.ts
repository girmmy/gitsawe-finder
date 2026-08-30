import { describe, expect, it } from 'vitest';
import { hrefFor, mezmurKey, parseHash, type Route } from '../src/lib/router';

describe('routing', () => {
  it('reads the routes the app links to', () => {
    expect(parseHash('')).toEqual({ name: 'sunday' });
    expect(parseHash('#/')).toEqual({ name: 'sunday' });
    expect(parseHash('#/date/2026-08-30')).toEqual({ name: 'date', iso: '2026-08-30' });
    expect(parseHash('#/mezmur')).toEqual({ name: 'mezmur' });
    expect(parseHash('#/book')).toEqual({ name: 'book', page: null });
    expect(parseHash('#/book/415')).toEqual({ name: 'book', page: 415 });
    expect(parseHash('#/about')).toEqual({ name: 'about' });
  });

  it('round-trips a mezmur name through the URL', () => {
    const key = mezmurKey('ገብር ኄር');
    const route: Route = { name: 'mezmurItem', key };
    const href = hrefFor(route);
    expect(parseHash(href)).toEqual(route);
  });

  it('sends anything it does not recognise to the not-found page', () => {
    expect(parseHash('#/nonsense')).toEqual({ name: 'notFound', path: 'nonsense' });
    expect(parseHash('#/date/not-a-date')).toEqual({ name: 'notFound', path: 'date/not-a-date' });
    expect(parseHash('#/book/zero')).toEqual({ name: 'notFound', path: 'book/zero' });
  });

  it('tolerates stray slashes', () => {
    expect(parseHash('#//date/2026-08-30//')).toEqual({ name: 'date', iso: '2026-08-30' });
  });
});
