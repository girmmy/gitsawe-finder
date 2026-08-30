import { MONTHS, WEEKDAYS, toGeez } from '../lib/ethiopic';
import { t, type Lang } from '../lib/labels';
import { translit } from '../lib/translit';
import type { DayInfo } from '../lib/types';

const GREG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The landing card: the mezmur of the Sunday being served. A deacon opening
 * the app mid-week is preparing for Sunday, so the coming Sunday's mezmur —
 * not today's date — is the headline.
 */
export default function SundayHero({ day, lang, isToday, onOpen }: {
  day: DayInfo; lang: Lang; isToday: boolean; onOpen: () => void;
}) {
  const primary = day.candidates[0];
  const mezmur = primary?.mezmur ?? null;
  const m = MONTHS[day.eth.month - 1];
  const wd = WEEKDAYS[day.weekday];

  return (
    <section className="hero" aria-label="The coming Sunday">
      <p className="hero-kicker">
        {isToday
          ? (lang === 'am' ? 'የዛሬው እሑድ' : 'This Sunday — today')
          : (lang === 'am' ? 'የሚቀጥለው እሑድ' : 'The coming Sunday')}
      </p>

      {mezmur ? (
        <>
          <p className="hero-label">{t('mezmur', lang)}</p>
          <h1 className="hero-mezmur">{mezmur}</h1>
          <p className="hero-translit">{translit(mezmur)}</p>
        </>
      ) : (
        <h1 className="hero-mezmur hero-unnamed">
          {primary?.record.title ?? (lang === 'am' ? 'መዝሙር አልተመዘገበም' : 'No mezmur recorded')}
        </h1>
      )}

      <p className="hero-date">
        {wd.am} · {m.am} {toGeez(day.eth.day)} {toGeez(day.eth.year)} ዓ.ም
        <span className="hero-date-sep"> — </span>
        {GREG_MONTHS[day.greg.month - 1]} {day.greg.day}, {day.greg.year}
      </p>

      {primary && (
        <p className="hero-why">{lang === 'am' ? primary.reasonAm : primary.reasonEn}</p>
      )}

      <div className="hero-badges">
        {day.season && <span className="badge season">{lang === 'am' ? day.season.am : day.season.en}</span>}
        {day.feasts.map((f) => <span key={f.en} className="badge feast-badge">✦ {f.am}</span>)}
      </div>

      <button className="btn hero-cta" onClick={onOpen}>
        {lang === 'am' ? 'የዕለቱን ሙሉ አሳይ →' : 'See this day in the calendar →'}
      </button>
    </section>
  );
}
