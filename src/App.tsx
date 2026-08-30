import { useCallback, useEffect, useMemo, useState } from 'react';
import { gregToJDN, jdnToEth, jdnToGreg, jdnToWeekday, todayJDN, MONTHS, WEEKDAYS, toGeez } from './lib/ethiopic';
import { resolveDay, type Dataset } from './lib/resolver';
import { loadBooks, loadDaily, loadExtra, loadMonthly, loadSeasonal, type BookNames } from './lib/data';
import type { DayInfo } from './lib/types';
import { t, type Lang } from './lib/labels';
import { gregDateString } from './lib/format';
import ReadingsView from './components/ReadingsView';
import MezmurIndex, { buildIndex, type MezmurEntry } from './components/MezmurIndex';
import SundayHero from './components/SundayHero';
import PdfView from './components/PdfView';
import AboutView from './components/AboutView';

/** One tab bar, one place to be. About lives in the footer. */
type Section = 'sunday' | 'date' | 'mezmur' | 'book' | 'about';

/** The coming Sunday, or today when today is a Sunday. */
function comingSundayJDN(from: number): number {
  return from + ((7 - jdnToWeekday(from)) % 7);
}

export default function App() {
  const [section, setSection] = useState<Section>('sunday');
  const [jdn, setJdn] = useState(todayJDN());
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('gitsawe-lang') as Lang) || 'en');

  const [day, setDay] = useState<DayInfo | null>(null);
  const [sunday, setSunday] = useState<DayInfo | null>(null);
  const [books, setBooks] = useState<BookNames>({});
  const [index, setIndex] = useState<MezmurEntry[]>([]);
  const [picked, setPicked] = useState<MezmurEntry | null>(null);
  const [pdfPage, setPdfPage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('gitsawe-lang', lang); }, [lang]);

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

  const openPdfAt = useCallback((page: number) => { setPdfPage(page); setSection('book'); }, []);
  const goToday = useCallback(() => setJdn(todayJDN()), []);
  const goNextSunday = useCallback(() => setJdn((j) => j + ((7 - jdnToWeekday(j)) % 7 || 7)), []);

  const gregISO = useMemo(() => {
    const g = jdnToGreg(jdn);
    return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
  }, [jdn]);

  const onPickDate = (value: string) => {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) setJdn(gregToJDN(y, m, d));
  };

  /** Jump to a date and show it on the calendar tab. */
  const openDate = (target: number) => { setJdn(target); setSection('date'); };

  const TABS: { key: Section; label: string }[] = [
    { key: 'sunday', label: t('thisSunday', lang) },
    { key: 'date', label: t('byDay', lang) },
    { key: 'mezmur', label: t('byMezmur', lang) },
    { key: 'book', label: t('pdf', lang) },
  ];

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to readings</a>
      <div className="harag" aria-hidden="true" />

      <header className="masthead">
        <div className="masthead-row">
          <button className="brand" onClick={() => { setSection('sunday'); setPicked(null); }} aria-label="Gitsawe — home">
            <CrossMark />
            <span className="brand-text">
              <span className="brand-geez">ግጻዌ</span>
              <span className="brand-latin">Gitsawe</span>
            </span>
          </button>
          <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            aria-label={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}>
            {lang === 'en' ? 'አማርኛ' : 'English'}
          </button>
        </div>

        <nav className="tabs" aria-label="Main">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={section === tab.key ? 'tab on' : 'tab'}
              aria-current={section === tab.key ? 'page' : undefined}
              onClick={() => { setSection(tab.key); if (tab.key !== 'mezmur') setPicked(null); }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="main">
        {section === 'about' && <AboutView lang={lang} />}

        {section === 'book' && <PdfView lang={lang} page={pdfPage} />}

        {section === 'sunday' && (
          sunday ? (
            <>
              <SundayHero
                day={sunday}
                lang={lang}
                isToday={sunday.jdn === todayJDN()}
                onOpen={() => openDate(sunday.jdn)}
              />
              <ReadingsView key={`sun-${sunday.jdn}`} day={sunday} books={books} lang={lang}
                headless onOpenPdf={openPdfAt} />
            </>
          ) : <p className="loading">{t('loadingReadings', lang)}</p>
        )}

        {section === 'date' && (
          <>
            {day && <DateBanner day={day} lang={lang} />}
            <div className="daynav" role="group" aria-label="Date navigation">
              <button className="btn ghost" onClick={() => setJdn(jdn - 1)} aria-label="Previous day">‹</button>
              <input className="datepick" type="date" value={gregISO}
                onChange={(e) => onPickDate(e.target.value)} aria-label="Pick a date" />
              <button className="btn ghost" onClick={() => setJdn(jdn + 1)} aria-label="Next day">›</button>
              <button className="btn" onClick={goToday}>{t('today', lang)}</button>
              <button className="btn" onClick={goNextSunday}>{t('nextSunday', lang)}</button>
            </div>
            {error && <p className="error" role="alert">Could not load the readings: {error}</p>}
            {!error && !day && <p className="loading">{t('loadingReadings', lang)}</p>}
            {day && <ReadingsView key={day.jdn} day={day} books={books} lang={lang} onOpenPdf={openPdfAt} />}
          </>
        )}

        {section === 'mezmur' && (
          picked ? (
            <>
              <button className="btn back" onClick={() => setPicked(null)}>← {t('allMezmurs', lang)}</button>
              <MezmurDetail entry={picked} day={day ?? sunday} books={books} lang={lang} onOpenPdf={openPdfAt} />
            </>
          ) : (
            index.length
              ? <MezmurIndex entries={index} lang={lang} onOpen={setPicked} />
              : <p className="loading">{t('loadingReadings', lang)}</p>
          )
        )}
      </main>

      <footer className="colophon">
        <p>✠ መጽሐፈ ግጻዌ · The Lectionary of the Ethiopian Orthodox Tewahedo Church</p>
        <button className="colophon-link" onClick={() => setSection('about')}>{t('about', lang)}</button>
      </footer>
    </div>
  );
}

/** One mezmur opened from the index, shown with its own heading. */
function MezmurDetail({ entry, day, books, lang, onOpenPdf }: {
  entry: MezmurEntry; day: DayInfo | null; books: BookNames; lang: Lang;
  onOpenPdf: (page: number) => void;
}) {
  if (!day) return <p className="loading">{t('loadingReadings', lang)}</p>;
  return (
    <ReadingsView
      key={entry.key}
      day={{
        ...day,
        gapNote: null,
        gapPdfPage: null,
        candidates: [{
          kind: 'seasonal',
          record: entry.record,
          reasonEn: entry.group,
          reasonAm: entry.group,
          mezmur: entry.mezmur,
          unverified: entry.unverified,
        }],
      }}
      books={books}
      lang={lang}
      onOpenPdf={onOpenPdf}
    />
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
