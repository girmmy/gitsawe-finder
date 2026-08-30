import { useState } from 'react';
import type { BookNames } from '../lib/data';
import { SERVICE_LABELS, SLOT_LABELS, t, type Lang } from '../lib/labels';
import { citation, formatDay, formatService } from '../lib/format';
import { translit } from '../lib/translit';
import { serviceOf, type Candidate, type DayInfo, type Reading, type Service } from '../lib/types';

const SERVICES = ['serk', 'negh', 'kidassie'] as const;
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
    return <p className="gap-note">No record digitized for this date — please consult the PDF.</p>;
  }
  const others = day.candidates.filter((_, i) => i !== selected);

  return (
    <div className="readings">
      {day.gapNote && (
        <p className="gap-note" role="note">
          {day.gapNote}
          {day.gapPdfPage && onOpenPdf && (
            <button className="gap-link" onClick={() => onOpenPdf(day.gapPdfPage!)}>
              Open that page →
            </button>
          )}
        </p>
      )}

      <div className="candidate-head">
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
            {primary.record.title && <h2 className="record-title">{primary.record.title}</h2>}
          </>
        )}
        {primary.unverified && (
          <p className="unverified" role="note">
            Transcribed from the page scans — please check it against the book.
          </p>
        )}
        <CopyAllBar day={day} primary={primary} books={books} lang={lang} />
      </div>

      {SERVICES.map((svc) => (
        <ServiceBlock key={svc} name={svc} service={serviceOf(primary.record, svc)}
          day={day} primary={primary} books={books} lang={lang} />
      ))}

      {(primary.record.sinksar?.length ?? 0) > 0 && (
        <section className="panel sinksar">
          <h3 className="panel-title"><span className="panel-title-geez">ስንክሳር</span> {t('sinksar', lang)}</h3>
          <ul>
            {primary.record.sinksar!.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="alternates">
          <h3 className="alternates-title">{t('alsoToday', lang)}</h3>
          {others.map((c) => {
            const idx = day.candidates.indexOf(c);
            return (
              <button key={idx} className="alternate" onClick={() => setSelected(idx)}>
                <span className="alternate-reason">{lang === 'am' ? c.reasonAm : c.reasonEn}</span>
                {c.mezmur && <span className="alternate-name">{t('mezmur', lang)}፦ {c.mezmur}</span>}
                {!c.mezmur && c.record.title && <span className="alternate-name">{c.record.title}</span>}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

function CopyAllBar({ day, primary, books, lang }: { day: DayInfo; primary: Candidate; books: BookNames; lang: Lang }) {
  const [done, setDone] = useState(false);
  const text = () => formatDay(day, primary, books);
  const copy = async () => {
    await navigator.clipboard.writeText(text());
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ text: text() }).catch(() => undefined);
    else copy();
  };
  return (
    <div className="copybar">
      <button className="btn primary" onClick={copy}>{done ? t('copied', lang) : `⧉ ${t('copyAll', lang)}`}</button>
      <button className="btn" onClick={share}>↗ {t('share', lang)}</button>
    </div>
  );
}

function ServiceBlock({ name, service, day, primary, books, lang }: {
  name: string; service: Service | undefined; day: DayInfo; primary: Candidate; books: BookNames; lang: Lang;
}) {
  const [done, setDone] = useState(false);
  if (!service) return null;
  const epistles = EPISTLES.filter((s) => service[s]?.length);
  const hasContent = service.msbak?.length || service.gospel?.length || epistles.length || service.anaphora?.length;
  if (!hasContent) return null;

  const label = SERVICE_LABELS[name];
  const copy = async () => {
    await navigator.clipboard.writeText(formatService(day, primary, name, books));
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };

  return (
    <section className="panel service">
      <header className="service-head">
        <h3 className="panel-title">
          <span className="panel-title-geez">{label.am}</span> {label.en}
        </h3>
        <button className="btn small" onClick={copy} aria-label={`Copy ${label.en}`}>{done ? '✓' : '⧉'}</button>
      </header>

      {(service.msbak ?? []).map((r, i) => (
        <MisbakRow key={`msbak-${i}`} reading={r} books={books} lang={lang} />
      ))}

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
    </section>
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
      {reading.g && (
        <>
          <p className="geez-text">{reading.g}</p>
          <p className="translit-text">{translit(reading.g)}</p>
        </>
      )}
      {reading.a && <p className="amharic-text">{reading.a}</p>}
      {reading.e && <p className="english-text">“{reading.e}”</p>}
      <Citation cite={cite} />
    </div>
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

function GospelRow({ reading, books, lang }: { reading: Reading; books: BookNames; lang: Lang }) {
  const label = SLOT_LABELS.gospel;
  const cite = citation(reading, books);
  return (
    <div className="reading gospel-row">
      <p className="rubric">
        {label.am} · {label.en}
        <span className="reader"> — {label.reader![lang]}</span>
      </p>
      {(reading.g || reading.a) && (
        <p className="incipit">
          {reading.g ?? reading.a}
          {reading.et && <span className="until"> … {t('readUntil', lang)} «{reading.et}»</span>}
        </p>
      )}
      <Citation cite={cite} />
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
