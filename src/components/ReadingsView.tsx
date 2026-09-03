import { useEffect, useRef, useState } from 'react';
import type { BookNames } from '../lib/data';
import { SERVICE_LABELS, SLOT_LABELS, t, type Lang } from '../lib/labels';
import { citation, formatDay, formatService, misbakEnglishLines } from '../lib/format';
import { copyText } from '../lib/clipboard';
import { translit } from '../lib/translit';
import { serviceOf, type Candidate, type DayInfo, type DayRecord, type Reading, type Service } from '../lib/types';

/**
 * Every service is a dropdown, so a long day folds down to three headings.
 * The Divine Liturgy leads and opens on load, because that is what the day is
 * prepared for; ዘሠርክ and ዘነግሥ start shut and are one tap away.
 */
const SERVICES = [
  { name: 'kidassie', open: true },
  { name: 'serk', open: false },
  { name: 'negs', open: false },
] as const;

/**
 * Which folds are open, kept outside the component so it outlives the
 * remount that every date change causes. Someone walking the calendar with
 * ዘነግሥ open wants it to stay open. Session-only on purpose: a reload comes
 * back to the defaults, with the Liturgy showing.
 */
const foldState = new Map<string, boolean>();
/** The three epistle readings sit side by side; misbak and gospel frame them. */
const EPISTLES = ['pauline', 'catholic', 'acts'] as const;

export default function ReadingsView({ day, books, lang, headless = false, onOpenPdf }: {
  day: DayInfo; books: BookNames; lang: Lang;
  /** Hide the mezmur header when a hero above already carries it. */
  headless?: boolean;
  onOpenPdf?: (page: number) => void;
}) {
  const [selected, setSelected] = useState(0);
  const primary = day.candidates[selected] ?? day.candidates[0];
  if (!primary) {
    return <p className="gap-note">{t('noRecord', lang)}</p>;
  }

  return (
    <div className="readings">
      {day.gapNote && (
        <p className="gap-note" role="note">
          {day.gapNote}
          {day.gapPdfPage && onOpenPdf && (
            <button className="gap-link" onClick={() => onOpenPdf(day.gapPdfPage!)}>
              {t('openInBook', lang)}
            </button>
          )}
        </p>
      )}

      <div className={headless ? 'candidate-head bar' : 'candidate-head'}>
        {!headless && (
          <>
            <p className="rubric why">
              <span aria-hidden="true">※ </span>
              {lang === 'am' ? primary.reasonAm : primary.reasonEn}
            </p>
            {primary.mezmur && (
              <p className="mezmur-name">
                <span className="mezmur-label">{t('mezmur', lang)}</span>
                <span className="mezmur-geez">{primary.mezmur}</span>
                <span className="mezmur-translit">{translit(primary.mezmur)}</span>
              </p>
            )}
            {/* The title often just restates the mezmur shown above it. */}
            {primary.record.title && !(primary.mezmur && primary.record.title.includes(primary.mezmur)) && (
              <h2 className="record-title">{primary.record.title}</h2>
            )}
          </>
        )}
        {primary.unverified && (
          <ScanNote record={primary.record} lang={lang} onOpenPdf={onOpenPdf} />
        )}
        <CopyAllBar day={day} primary={primary} books={books} lang={lang} />
      </div>

      {SERVICES.filter((svc) => !(headless && svc.name === 'kidassie')).map((svc) => (
        <ServiceBlock key={svc.name} name={svc.name} service={serviceOf(primary.record, svc.name)}
          day={day} primary={primary} books={books} lang={lang}
          defaultOpen={svc.open} />
      ))}

      {(primary.record.sinksar?.length ?? 0) > 0 && (
        <section className="panel sinksar">
          <h3 className="panel-title"><span className="panel-title-geez">ስንክሳር</span> {t('sinksar', lang)}</h3>
          <ul>
            {primary.record.sinksar!.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      )}

      {day.candidates.length > 1 && (
        <section className="alternates">
          <h3 className="alternates-title">{t('alsoToday', lang)}</h3>
          {day.candidates.map((c, idx) => {
            const current = idx === selected;
            return (
              <button
                key={idx}
                className={current ? 'alternate current' : 'alternate'}
                aria-pressed={current}
                onClick={() => setSelected(idx)}
              >
                <span className="alternate-reason">{lang === 'am' ? c.reasonAm : c.reasonEn}</span>
                <span className="alternate-state">
                  {current ? `✓ ${t('showingNow', lang)}` : t('switchTo', lang)}
                </span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

/** Idle, or what the last copy did — so a refusal says so instead of nothing. */
type CopyState = 'idle' | 'done' | 'failed';

/** Show the outcome of a copy, then go quiet again. */
function useCopy(): [CopyState, (text: string) => Promise<void>] {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = async (text: string) => {
    setState(await copyText(text) ? 'done' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 1600);
  };
  return [state, run];
}

function CopyAllBar({ day, primary, books, lang }: { day: DayInfo; primary: Candidate; books: BookNames; lang: Lang }) {
  const [state, copy] = useCopy();
  const text = () => formatDay(day, primary, books);
  const share = async () => {
    // A cancelled share rejects with AbortError; that is the reader saying no,
    // not a failure worth reporting.
    if (navigator.share) await navigator.share({ text: text() }).catch(() => undefined);
    else await copy(text());
  };
  const label =
    state === 'done' ? t('copied', lang)
    : state === 'failed' ? `⚠ ${t('copyFailed', lang)}`
    : `⧉ ${t('copyAll', lang)}`;
  return (
    <div className="copybar">
      <button className="btn primary" onClick={() => copy(text())}>{label}</button>
      <button className="btn" onClick={share}>↗ {t('share', lang)}</button>
      <span className="sr-only" role="status">{state === 'idle' ? '' : label}</span>
    </div>
  );
}

function ServiceBlock({ name, service, day, primary, books, lang, defaultOpen = false }: {
  name: string; service: Service | undefined; day: DayInfo; primary: Candidate;
  books: BookNames; lang: Lang;
  /** Whether the dropdown starts open. */
  defaultOpen?: boolean;
}) {
  const [copyState, copy] = useCopy();
  // Held in state rather than left to the DOM: copying re-renders this block,
  // and an uncontrolled <details open> would snap back shut mid-read.
  const [open, setOpenState] = useState(() => foldState.get(name) ?? defaultOpen);
  const setOpen = (next: boolean) => { foldState.set(name, next); setOpenState(next); };
  if (!service) return null;
  const epistles = EPISTLES.filter((s) => service[s]?.length);
  const hasContent = service.msbak?.length || service.gospel?.length || epistles.length || service.anaphora?.length;
  if (!hasContent) return null;

  const label = SERVICE_LABELS[name];

  const body = (
    <>
      {(service.msbak ?? []).map((r, i) => (
        <MisbakRow key={`msbak-${i}`} reading={r} books={books} lang={lang} />
      ))}
      <LiturgyBody service={service} books={books} lang={lang} />
    </>
  );

  return (
    <details
      className="panel service service-fold"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="service-head service-summary">
        <h3 className="panel-title">
          <span className="panel-title-geez">{label.am}</span> {label.en}
        </h3>
        <span className="service-caret" aria-hidden="true">▸</span>
      </summary>
      <div className="service-fold-body">
        <div className="service-fold-actions">
          <button
            className="btn small"
            onClick={() => copy(formatService(day, primary, name, books))}
            aria-label={copyState === 'failed'
              ? `Could not copy ${label.en}`
              : `Copy ${label.en}`}
          >
            {copyState === 'done' ? '✓' : copyState === 'failed' ? '⚠' : '⧉'}
          </button>
        </div>
        {body}
      </div>
    </details>
  );
}

/** Epistles, gospel and anaphora for one service — shared by the panel and the hero. */
export function LiturgyBody({ service, books, lang }: { service: Service; books: BookNames; lang: Lang }) {
  const epistles = EPISTLES.filter((s) => service[s]?.length);
  return (
    <>
      {epistles.length > 0 && (
        <div className="epistle-grid" data-count={epistles.length}>
          {epistles.map((slot) => (
            <EpistleCard key={slot} slot={slot} readings={service[slot]!} books={books} lang={lang} />
          ))}
        </div>
      )}

      {(service.gospel ?? []).map((r, i) => (
        <GospelRow key={`gospel-${i}`} reading={r} books={books} lang={lang} />
      ))}

      {service.anaphora && service.anaphora.length > 0 && (
        <div className="reading anaphora-row">
          <p className="rubric">{SLOT_LABELS.anaphora.am} · {SLOT_LABELS.anaphora.en}</p>
          <p className="anaphora-names">{service.anaphora.join(' ፣ ')}</p>
        </div>
      )}
    </>
  );
}

function MisbakRow({ reading, books, lang }: { reading: Reading; books: BookNames; lang: Lang }) {
  const label = SLOT_LABELS.msbak;
  const cite = citation(reading, books);
  return (
    <div className="reading misbak">
      <p className="rubric">
        {label.am} · {label.en}
        <span className="reader"> — {label.reader![lang]}</span>
      </p>
      {reading.g && <MisbakLines reading={reading} lang={lang} />}
      {reading.a && <p className="amharic-text">{reading.a}</p>}
      <Citation cite={cite} />
    </div>
  );
}

/**
 * Readings we read off the scans ourselves. Rather than a warning, this points
 * at the book, which is the authority and is one tap away.
 */
function ScanNote({ record, lang, onOpenPdf }: {
  record: DayRecord; lang: Lang; onOpenPdf?: (page: number) => void;
}) {
  const { source, bookPage } = record as { source?: string; bookPage?: number };
  return (
    <div className="scan-warning" role="note">
      <span className="scan-warning-text">
        <strong>{t('scanTitle', lang)}</strong>
        {t('scanWarning', lang)}
        {source && <span className="scan-source">{source}</span>}
      </span>
      {bookPage && onOpenPdf && (
        <button className="btn small scan-open" onClick={() => onOpenPdf(bookPage)}>
          {t('openBookAt', lang)} →
        </button>
      )}
    </div>
  );
}

/**
 * The misbak reads as one piece — the Ge'ez together, then its pronunciation.
 * Only the translation is broken out clause by clause, since that is what a
 * reader follows against the chant.
 */
function MisbakLines({ reading, lang }: { reading: Reading; lang: Lang }) {
  const geez = (reading.g ?? '').split('።').map((s) => s.trim()).filter(Boolean);
  const english = misbakEnglishLines(reading);
  return (
    <>
      <p className="geez-text">{geez.map((l) => `${l}።`).join(' ')}</p>
      <p className="translit-text">{geez.map((l) => translit(l)).join(' ')}</p>
      {english.length > 0 && (
        <div className="misbak-translation">
          <p className="translation-label">{t('translation', lang)}</p>
          {english.map((line, i) => <p key={i} className="english-text">{line}</p>)}
        </div>
      )}
    </>
  );
}

/** One of the three epistle readings, as a card in the side-by-side grid. */
function EpistleCard({ slot, readings, books, lang }: {
  slot: string; readings: Reading[]; books: BookNames; lang: Lang;
}) {
  const label = SLOT_LABELS[slot];
  return (
    <div className="epistle">
      <p className="epistle-reader">{label.reader![lang]}</p>
      <p className="epistle-slot">{label.am}</p>
      {readings.map((r, i) => {
        const cite = citation(r, books);
        return (
          <div key={i} className="epistle-body">
            <p className="epistle-cite-en">{cite.en ?? '—'}</p>
            <p className="epistle-cite-am">{cite.am}</p>
            {r.g && <p className="epistle-incipit">{r.g}{r.et && <span className="until"> … {t('readUntil', lang)} «{r.et}»</span>}</p>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The gospel is looked up by chapter and verse, not read off the page, so the
 * citation leads — English and Amharic both — and the Ge'ez incipit sits under
 * it as the confirmation that you have found the right passage.
 */
function GospelRow({ reading, books, lang }: { reading: Reading; books: BookNames; lang: Lang }) {
  const label = SLOT_LABELS.gospel;
  const cite = citation(reading, books);
  // A few readings carry no reference at all. With nothing to head the row,
  // the incipit is the reading, so it keeps its full size.
  const cited = Boolean(cite.en || cite.am);
  return (
    <div className="reading gospel-row">
      <p className="rubric">
        {label.am} · {label.en}
        <span className="reader"> — {label.reader![lang]}</span>
      </p>
      {cite.en && <p className="gospel-cite-en">{cite.en}</p>}
      {cite.am && <p className="gospel-cite-am">{cite.am}</p>}
      {(reading.g || reading.a) && (
        <p className={cited ? 'incipit gospel-incipit' : 'incipit'}>
          {reading.g ?? reading.a}
          {reading.et && <span className="until"> … {t('readUntil', lang)} «{reading.et}»</span>}
        </p>
      )}
    </div>
  );
}

function Citation({ cite }: { cite: { am: string | null; en: string | null } }) {
  if (!cite.am && !cite.en) return null;
  return (
    <p className="cite">
      {cite.am && <span className="cite-am">{cite.am}</span>}
      {cite.am && cite.en && <span className="cite-sep" aria-hidden="true"> ✦ </span>}
      {cite.en && <span className="cite-en">{cite.en}</span>}
    </p>
  );
}
