import { useCallback, useEffect, useMemo, useState } from 'react';
import { gregToJDN, jdnToEth, jdnToGreg, jdnToWeekday, todayJDN, MONTHS, WEEKDAYS, toGeez } from './lib/ethiopic';
import { resolveDay, type Dataset } from './lib/resolver';
import { loadBooks, loadDaily, loadExtra, loadMonthly, loadSeasonal, type BookNames } from './lib/data';
import type { DayInfo } from './lib/types';
import { t, type Lang } from './lib/labels';
import { ethDateString, gregDateString } from './lib/format';
import ReadingsView from './components/ReadingsView';
import MezmurIndex, { buildIndex, type MezmurEntry } from './components/MezmurIndex';
import SundayHero from './components/SundayHero';
import PdfView from './components/PdfView';
import AboutView from './components/AboutView';

type View = 'day' | 'pdf' | 'about';
type Browse = 'sunday' | 'day' | 'mezmur';

/** The coming Sunday, or today when today is a Sunday. */
function comingSundayJDN(from: number): number {
  return from + ((7 - jdnToWeekday(from)) % 7);
}

export default function App() {
  const [jdn, setJdn] = useState(todayJDN());
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('gitsawe-lang') as Lang) || 'en');
  const [view, setView] = useState<View>('day');
  const [day, setDay] = useState<DayInfo | null>(null);
  const [books, setBooks] = useState<BookNames>({});
  const [error, setError] = useState<string | null>(null);
  const [browse, setBrowse] = useState<Browse>('sunday');
  const [sunday, setSunday] = useState<DayInfo | null>(null);
  const [index, setIndex] = useState<MezmurEntry[]>([]);
  const [picked, setPicked] = useState<MezmurEntry | null>(null);

  useEffect(() => { localStorage.setItem('gitsawe-lang', lang); }, [lang]);

  useEffect(() => {
    let alive = true;
    setError(null);
    const eth = jdnToEth(jdn);
    Promise.all([loadSeasonal(), loadMonthly(), loadExtra(), loadDaily(eth.month), loadBooks()])
      .then(([seasonal, monthly, extra, daily, bookNames]) => {
        if (!alive) return;
        const data: Dataset = { seasonal, monthly, extra, daily };
        setBooks(bookNames);
        setDay(resolveDay(jdn, data));
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

  const goToday = useCallback(() => setJdn(todayJDN()), []);
  const goNextSunday = useCallback(() => {
    setJdn((j) => j + ((7 - jdnToWeekday(j)) % 7 || 7));
  }, []);

  const gregISO = useMemo(() => {
    const g = jdnToGreg(jdn);
    return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
  }, [jdn]);

  const onPickDate = (value: string) => {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) setJdn(gregToJDN(y, m, d));
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to readings</a>
      <div className="harag" aria-hidden="true" />
      <header className="masthead">
        <div className="masthead-row">
          <button className="brand" onClick={() => { setView('day'); goToday(); }} aria-label="Gitsawe — home">
            <CrossMark />
            <span className="brand-text">
              <span className="brand-geez">ግጻዌ</span>
              <span className="brand-latin">Gitsawe</span>
            </span>
          </button>
          <nav className="nav" aria-label="Main">
            <button className={view === 'day' ? 'nav-link active' : 'nav-link'} onClick={() => setView('day')}>{t('readings', lang)}</button>
            <button className={view === 'pdf' ? 'nav-link active' : 'nav-link'} onClick={() => setView('pdf')}>{t('pdf', lang)}</button>
            <button className={view === 'about' ? 'nav-link active' : 'nav-link'} onClick={() => setView('about')}>{t('about', lang)}</button>
            <button className="nav-link lang" onClick={() => setLang(lang === 'en' ? 'am' : 'en')} aria-label="Switch language">
              {lang === 'en' ? 'አማ' : 'EN'}
            </button>
          </nav>
        </div>
      </header>

      <main id="main">
        {view === 'about' && <AboutView lang={lang} />}
        {view === 'pdf' && <PdfView lang={lang} />}
        {view === 'day' && (
          <>
            <div className="browse-toggle" role="group" aria-label="Browse mode">
              <button className={browse === 'sunday' ? 'toggle on' : 'toggle'}
                onClick={() => { setBrowse('sunday'); setPicked(null); }}>{t('thisSunday', lang)}</button>
              <button className={browse === 'day' ? 'toggle on' : 'toggle'}
                onClick={() => { setBrowse('day'); setPicked(null); }}>{t('byDay', lang)}</button>
              <button className={browse === 'mezmur' ? 'toggle on' : 'toggle'}
                onClick={() => setBrowse('mezmur')}>{t('byMezmur', lang)}</button>
            </div>

            {browse === 'sunday' && (
              sunday ? (
                <>
                  <SundayHero
                    day={sunday}
                    lang={lang}
                    isToday={sunday.jdn === todayJDN()}
                    onOpen={() => { setJdn(sunday.jdn); setBrowse('day'); }}
                  />
                  <ReadingsView key={`sun-${sunday.jdn}`} day={sunday} books={books} lang={lang} headless />
                </>
              ) : <p className="loading">…</p>
            )}

            {browse === 'day' && (
              <>
                {day && <DateBanner day={day} lang={lang} />}
                <div className="daynav" role="group" aria-label="Date navigation">
                  <button className="btn ghost" onClick={() => setJdn(jdn - 1)} aria-label="Previous day">‹</button>
                  <input className="datepick" type="date" value={gregISO} onChange={(e) => onPickDate(e.target.value)} aria-label="Pick a date" />
                  <button className="btn ghost" onClick={() => setJdn(jdn + 1)} aria-label="Next day">›</button>
                  <button className="btn" onClick={goToday}>{t('today', lang)}</button>
                  <button className="btn" onClick={goNextSunday}>{t('nextSunday', lang)}</button>
                </div>
                {error && <p className="error" role="alert">Could not load the readings: {error}</p>}
                {!error && !day && <p className="loading">…</p>}
                {day && <ReadingsView key={day.jdn} day={day} books={books} lang={lang} />}
              </>
            )}

            {browse === 'mezmur' && day && (
              picked ? (
                <>
                  <button className="btn" onClick={() => setPicked(null)}>{t('backToDay', lang)}</button>
                  <ReadingsView
                    key={picked.key}
                    day={{
                      ...day,
                      gapNote: null,
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
                  />
                </>
              ) : (
                <MezmurIndex entries={index} lang={lang} onOpen={setPicked} />
              )
            )}
          </>
        )}
      </main>

      <footer className="colophon">
        <p>
          ✠ መጽሐፈ ግጻዌ · The Lectionary of the Ethiopian Orthodox Tewahedo Church
        </p>
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

export { ethDateString };
