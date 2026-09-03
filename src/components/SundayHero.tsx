import { MONTHS, WEEKDAYS, toGeez } from '../lib/ethiopic';
import { t, type Lang } from '../lib/labels';
import { translit } from '../lib/translit';
import { citation, misbakEnglishLines } from '../lib/format';
import { serviceOf, type DayInfo } from '../lib/types';
import type { BookNames } from '../lib/data';
import { LiturgyBody } from './ReadingsView';
import { SERVICE_LABELS } from '../lib/labels';
import MisbakMedia from './MisbakMedia';
import type { AudioIndex, VideoIndex } from '../lib/media';

const GREG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Which Sunday this is, in the terms a deacon would use.
 *
 * Reading ahead is the point of the controls — a mezmur three weeks out is
 * often the one to start learning now — so the card has to say plainly how far
 * from this week it has been moved, or it reads as today's.
 */
function kicker(weeksAhead: number, isToday: boolean, lang: Lang): string {
  if (weeksAhead === 0) {
    return isToday
      ? (lang === 'am' ? 'የዛሬው እሑድ' : 'This Sunday — today')
      : (lang === 'am' ? 'የሚቀጥለው እሑድ' : 'The coming Sunday');
  }
  const n = Math.abs(weeksAhead);
  const weeks = n === 1 ? 'week' : 'weeks';
  if (lang === 'am') {
    return weeksAhead > 0 ? `ከ${toGeez(n)} ሳምንት በኋላ` : `ከ${toGeez(n)} ሳምንት በፊት`;
  }
  return weeksAhead > 0 ? `${n} ${weeks} ahead` : `${n} ${weeks} back`;
}

/**
 * The landing card for the Sunday being served.
 *
 * The mezmur names the Sunday, but the misbak is what people actually come
 * for, so the mezmur sits as a modest label and the misbak carries the card.
 */
export default function SundayHero({
  day, lang, isToday, weeksAhead = 0, books, audio = null, videos = null,
  onStep, onBackToNext, onOpen,
}: {
  day: DayInfo; lang: Lang; isToday: boolean; books: BookNames;
  /** 0 for the Sunday being prepared for, 1 for the one after, and so on. */
  weeksAhead?: number;
  /** Recordings of the chanted misbak, when the indexes have loaded. */
  audio?: AudioIndex | null;
  videos?: VideoIndex | null;
  /** Move by whole weeks — the card only ever shows a Sunday. */
  onStep?: (weeks: number) => void;
  onBackToNext?: () => void;
  onOpen: () => void;
}) {
  const primary = day.candidates[0];
  const mezmur = primary?.mezmur ?? null;
  const m = MONTHS[day.eth.month - 1];
  const wd = WEEKDAYS[day.weekday];

  const liturgy = primary ? serviceOf(primary.record, 'kidassie') : undefined;
  const misbak = liturgy?.msbak?.[0];
  const cite = misbak ? citation(misbak, books) : null;
  const english = misbak ? misbakEnglishLines(misbak) : [];

  return (
    <section className="hero" aria-label="The coming Sunday">
      <p className="hero-kicker">{kicker(weeksAhead, isToday, lang)}</p>

      <p className="hero-date">
        {wd.am} · {m.am} {toGeez(day.eth.day)} {toGeez(day.eth.year)} ዓ.ም
        <span className="hero-date-sep"> — </span>
        {GREG_MONTHS[day.greg.month - 1]} {day.greg.day}, {day.greg.year}
      </p>

      {onStep && (
        <div className="hero-weeknav">
          <button className="btn ghost" onClick={() => onStep(-1)}
            aria-label={lang === 'am' ? 'ቀዳሚው እሑድ' : 'The Sunday before'}>‹</button>
          {weeksAhead !== 0 && onBackToNext && (
            <button className="btn small" onClick={onBackToNext}>
              {lang === 'am' ? 'ወደ ሚቀጥለው እሑድ' : 'Back to this week'}
            </button>
          )}
          <button className="btn ghost" onClick={() => onStep(1)}
            aria-label={lang === 'am' ? 'ቀጣዩ እሑድ' : 'The Sunday after'}>›</button>
        </div>
      )}

      {mezmur ? (
        <p className="hero-mezmur-line">
          <span className="hero-mezmur-label">{t('mezmur', lang)}</span>
          <span className="hero-mezmur-name">{mezmur}</span>
          <span className="hero-mezmur-translit">{translit(mezmur)}</span>
        </p>
      ) : (
        <p className="hero-mezmur-line">
          <span className="hero-mezmur-name hero-unnamed">
            {primary?.record.title ?? (lang === 'am' ? 'መዝሙር አልተመዘገበም' : 'No mezmur recorded')}
          </span>
        </p>
      )}

      {misbak && (
        <div className="hero-misbak">
          <p className="hero-misbak-label">
            {t('mesbak', lang)}
            {cite?.en && <span className="hero-misbak-cite">{cite.en}</span>}
          </p>
          {misbak.g && (
            <>
              <p className="hero-misbak-geez">{misbak.g}</p>
              <p className="hero-misbak-translit">
                {misbak.g.split('።').map((l) => l.trim()).filter(Boolean).map((l) => translit(l)).join(' ')}
              </p>
            </>
          )}
          {misbak.a && <p className="hero-misbak-amharic">{misbak.a}</p>}
          {english.length > 0 && (
            <div className="hero-misbak-english">
              {english.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          )}
          {primary && (
            <MisbakMedia reading={misbak} candidate={primary} service="kidassie"
              eth={day.eth} audio={audio} videos={videos} lang={lang} />
          )}
        </div>
      )}

      {liturgy && (
        <div className="hero-liturgy">
          <p className="hero-liturgy-label">
            {SERVICE_LABELS.kidassie.am} · {SERVICE_LABELS.kidassie.en}
          </p>
          <LiturgyBody service={liturgy} books={books} lang={lang} />
        </div>
      )}

      <div className="hero-badges">
        {day.season && <span className="badge season">{lang === 'am' ? day.season.am : day.season.en}</span>}
        {day.feasts.map((f) => <span key={f.en} className="badge feast-badge">✦ {f.am}</span>)}
      </div>

      <button className="btn hero-cta" onClick={onOpen}>
        {lang === 'am' ? 'በቀን መቁጠሪያ ክፈት' : 'Open in the calendar'}
      </button>
    </section>
  );
}
