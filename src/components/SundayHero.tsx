import { MONTHS, WEEKDAYS, toGeez } from '../lib/ethiopic';
import { t, type Lang } from '../lib/labels';
import { translit } from '../lib/translit';
import { citation, misbakEnglishLines } from '../lib/format';
import { serviceOf, type DayInfo } from '../lib/types';
import type { BookNames } from '../lib/data';

const GREG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The landing card for the Sunday being served.
 *
 * The mezmur names the Sunday, but the misbak is what people actually come
 * for, so the mezmur sits as a modest label and the misbak carries the card.
 */
export default function SundayHero({ day, lang, isToday, books, onOpen }: {
  day: DayInfo; lang: Lang; isToday: boolean; books: BookNames; onOpen: () => void;
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
      <p className="hero-kicker">
        {isToday
          ? (lang === 'am' ? 'የዛሬው እሑድ' : 'This Sunday — today')
          : (lang === 'am' ? 'የሚቀጥለው እሑድ' : 'The coming Sunday')}
      </p>

      <p className="hero-date">
        {wd.am} · {m.am} {toGeez(day.eth.day)} {toGeez(day.eth.year)} ዓ.ም
        <span className="hero-date-sep"> — </span>
        {GREG_MONTHS[day.greg.month - 1]} {day.greg.day}, {day.greg.year}
      </p>

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
