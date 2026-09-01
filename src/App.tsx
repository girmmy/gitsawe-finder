import { useCallback, useEffect, useMemo, useState } from 'react';
import { gregToJDN, jdnToEth, jdnToGreg, jdnToWeekday, todayJDN, MONTHS, WEEKDAYS, toGeez } from './lib/ethiopic';
import { resolveDay, type Dataset } from './lib/resolver';
import { loadBooks, loadDaily, loadExtra, loadMonthly, loadSeasonal, type BookNames } from './lib/data';
import type { DayInfo } from './lib/types';
import { t, type Lang } from './lib/labels';
import { gregDateString } from './lib/format';
import { hrefFor, mezmurKey, navigate, parseHash, type Route } from './lib/router';
import ReadingsView from './components/ReadingsView';
import MezmurIndex, { buildIndex, type MezmurEntry } from './components/MezmurIndex';
import SundayHero from './components/SundayHero';
import PdfView from './components/PdfView';
import AboutView from './components/AboutView';
import NotFound from './components/NotFound';

/** The coming Sunday, or today when today is a Sunday. */
function comingSundayJDN(from: number): number {
  return from + ((7 - jdnToWeekday(from)) % 7);
}

const isoOf = (jdn: number) => {
  const g = jdnToGreg(jdn);
  return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
};

const jdnOfISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return gregToJDN(y, m, d);
};

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('gitsawe-lang') as Lang) || 'en');

  const [day, setDay] = useState<DayInfo | null>(null);
  const [sunday, setSunday] = useState<DayInfo | null>(null);
  const [books, setBooks] = useState<BookNames>({});
  const [index, setIndex] = useState<MezmurEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('gitsawe-lang', lang); }, [lang]);

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /** The date the calendar tab is looking at. */
  const jdn = route.name === 'date' ? jdnOfISO(route.iso) : todayJDN();

  useEffect(() => {
    let alive = true;
    setError(null);
    const eth = jdnToEth(jdn);
    Promise.all([loadSeasonal(), loadMonthly(), loadExtra(), loadDaily(eth.month), loadBooks()])
      .then(([seasonal, monthly, extra, daily, bookNames]) => {
        if (!alive) return;
        setBooks(bookNames);
        setDay(resolveDay(jdn, { seasonal, monthly, extra, daily } satisfies Dataset));
        setIndex(buildIndex(seasonal, monthly, extra));
      })
      .catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [jdn]);

  // The coming Sunday is resolved independently of the browsed date, so the
  // landing card keeps showing the Sunday being prepared for.
  useEffect(() => {
    let alive = true;
    const sundayJDN = comingSundayJDN(todayJDN());
    const eth = jdnToEth(sundayJDN);
    Promise.all([loadSeasonal(), loadMonthly(), loadExtra(), loadDaily(eth.month)])
      .then(([seasonal, monthly, extra, daily]) => {
        if (!alive) return;
        setSunday(resolveDay(sundayJDN, { seasonal, monthly, extra, daily }));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const go = useCallback((r: Route) => navigate(r), []);
  const openPdfAt = useCallback((page: number) => go({ name: 'book', page }), [go]);

  const picked = useMemo(
    () => (route.name === 'mezmurItem' ? index.find((e) => mezmurKey(e.mezmur) === route.key) ?? null : null),
    [route, index],
  );

  // Which tab reads as current for each route.
  const tabOf = (r: Route) =>
    r.name === 'date' ? 'date'
    : r.name === 'mezmur' || r.name === 'mezmurItem' ? 'mezmur'
    : r.name === 'book' ? 'book'
    : r.name === 'sunday' ? 'sunday'
    : null;
  const current = tabOf(route);

  const TABS: { key: string; label: string; route: Route }[] = [
    { key: 'sunday', label: t('thisSunday', lang), route: { name: 'sunday' } },
    { key: 'date', label: t('byDay', lang), route: { name: 'date', iso: isoOf(todayJDN()) } },
    { key: 'mezmur', label: t('byMezmur', lang), route: { name: 'mezmur' } },
    { key: 'book', label: t('pdf', lang), route: { name: 'book', page: null } },
  ];

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to readings</a>
      <div className="harag" aria-hidden="true" />

      <header className="masthead">
        <div className="masthead-row">
          <a className="brand" href="#/" aria-label="Gitsawe Finder — home">
            <CrossMark />
            <span className="brand-text">
              <span className="brand-geez">ግጻዌ</span>
              <span className="brand-latin">Gitsawe Finder</span>
            </span>
          </a>
          <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            aria-label={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}>
            {lang === 'en' ? 'አማርኛ' : 'English'}
          </button>
        </div>

        <nav className="tabs" aria-label="Main">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              className={current === tab.key ? 'tab on' : 'tab'}
              aria-current={current === tab.key ? 'page' : undefined}
              href={hrefFor(tab.route)}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="main">
        {route.name === 'notFound' && <NotFound path={route.path} lang={lang} onGo={() => undefined} />}

        {route.name === 'about' && <AboutView lang={lang} />}

        {route.name === 'book' && <PdfView lang={lang} page={route.page} />}

        {route.name === 'sunday' && (
          sunday ? (
            <>
              <SundayHero
                day={sunday}
                lang={lang}
                isToday={sunday.jdn === todayJDN()}
                books={books}
                onOpen={() => go({ name: 'date', iso: isoOf(sunday.jdn) })}
              />
              <ReadingsView key={`sun-${sunday.jdn}`} day={sunday} books={books} lang={lang}
                headless onOpenPdf={openPdfAt} />
            </>
          ) : <p className="loading">{t('loadingReadings', lang)}</p>
        )}

        {route.name === 'date' && (
          <>
            {day && <DateBanner day={day} lang={lang} />}
            <div className="daynav" role="group" aria-label="Date navigation">
              <a className="btn ghost" href={hrefFor({ name: 'date', iso: isoOf(jdn - 1) })} aria-label="Previous day">‹</a>
              <input className="datepick" type="date" value={isoOf(jdn)}
                onChange={(e) => e.target.value && go({ name: 'date', iso: e.target.value })}
                aria-label="Pick a date" />
              <a className="btn ghost" href={hrefFor({ name: 'date', iso: isoOf(jdn + 1) })} aria-label="Next day">›</a>
              <a className="btn" href={hrefFor({ name: 'date', iso: isoOf(todayJDN()) })}>{t('today', lang)}</a>
              <a className="btn" href={hrefFor({ name: 'date', iso: isoOf(jdn + ((7 - jdnToWeekday(jdn)) % 7 || 7)) })}>
                {t('nextSunday', lang)}
              </a>
            </div>
            {error && <p className="error" role="alert">Could not load the readings: {error}</p>}
            {!error && !day && <p className="loading">{t('loadingReadings', lang)}</p>}
            {day && <ReadingsView key={day.jdn} day={day} books={books} lang={lang} onOpenPdf={openPdfAt} />}
          </>
        )}

        {route.name === 'mezmur' && (
          index.length
            ? <MezmurIndex entries={index} lang={lang}
                onOpen={(e) => go({ name: 'mezmurItem', key: mezmurKey(e.mezmur) })} />
            : <p className="loading">{t('loadingReadings', lang)}</p>
        )}

        {route.name === 'mezmurItem' && (
          !index.length ? <p className="loading">{t('loadingReadings', lang)}</p>
          : !picked ? <NotFound path={`mezmur/${route.key}`} lang={lang} onGo={() => undefined} />
          : (
            <>
              <a className="btn back" href={hrefFor({ name: 'mezmur' })}>← {t('allMezmurs', lang)}</a>
              {day && (
                <ReadingsView
                  key={picked.key}
                  day={{
                    ...day,
                    gapNote: null,
                    gapPdfPage: null,
                    candidates: [{
                      kind: 'seasonal',
                      record: picked.record,
                      reasonEn: picked.group,
                      reasonAm: picked.group,
                      mezmur: picked.mezmur,
                      unverified: picked.unverified,
                    }],
                  }}
                  books={books}
                  lang={lang}
                  onOpenPdf={openPdfAt}
                />
              )}
            </>
          )
        )}
      </main>

      <footer className="colophon">
        <p>✠ መጽሐፈ ግጻዌ · The Lectionary of the Ethiopian Orthodox Tewahedo Church</p>
        <a className="colophon-link" href={hrefFor({ name: 'about' })}>{t('about', lang)}</a>
      </footer>
    </div>
  );
}

function DateBanner({ day, lang }: { day: DayInfo; lang: Lang }) {
  const wd = WEEKDAYS[day.weekday];
  const m = MONTHS[day.eth.month - 1];
  return (
    <section className={day.isSunday ? 'banner sunday' : 'banner'} aria-label="Date">
      <p className="banner-weekday">{wd.am} · {wd.en}</p>
      <h1 className="banner-eth">
        {m.am} {toGeez(day.eth.day)} <span className="banner-year">{toGeez(day.eth.year)} ዓ.ም</span>
      </h1>
      <p className="banner-greg">
        {m.en} {day.eth.day}, {day.eth.year} — {gregDateString(day)}
      </p>
      <p className="banner-badges">
        <span className="badge evangelist">{t('evangelistYear', lang)} {lang === 'am' ? day.evangelist.am : day.evangelist.en}</span>
        {day.season && <span className="badge season">{lang === 'am' ? day.season.am : day.season.en}</span>}
        {day.fasting?.active && <span className="badge fast">✝ {lang === 'am' ? day.fasting.am : day.fasting.en}</span>}
      </p>
      {day.feasts.length > 0 && (
        <p className="banner-feasts">
          {day.feasts.map((f) => (
            <span key={f.en} className="feast">✦ {f.am} · {f.en}</span>
          ))}
        </p>
      )}
    </section>
  );
}

function CrossMark() {
  return (
    <svg className="cross" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
        <path d="M16 3v26M3 16h26" />
        <path d="M10 10h12v12H10z" opacity="0.55" />
        <path d="M16 1.5l2.5 2.5L16 6.5 13.5 4zM16 25.5l2.5 2.5-2.5 2.5-2.5-2.5zM1.5 16L4 13.5 6.5 16 4 18.5zM25.5 16l2.5-2.5 2.5 2.5-2.5 2.5z" opacity="0.8" />
      </g>
    </svg>
  );
}
