import { t, type Lang } from '../lib/labels';

/** Shown for a link that doesn't lead anywhere, with the ways back. */
export default function NotFound({ path, lang, onGo }: {
  path: string; lang: Lang; onGo: (href: string) => void;
}) {
  const ways: { href: string; label: string; note: string }[] = [
    { href: '#/', label: t('thisSunday', lang), note: lang === 'am' ? 'የሚቀጥለው እሑድ መዝሙር' : "the coming Sunday's mezmur" },
    { href: '#/date/' + new Date().toISOString().slice(0, 10), label: t('byDay', lang), note: lang === 'am' ? 'ቀን በመምረጥ' : 'pick any date' },
    { href: '#/mezmur', label: t('byMezmur', lang), note: lang === 'am' ? 'በመዝሙር ስም ፈልግ' : 'search by mezmur' },
    { href: '#/book', label: t('pdf', lang), note: lang === 'am' ? 'ሙሉ መጽሐፉ' : 'the whole book' },
  ];

  return (
    <section className="notfound">
      <p className="notfound-mark" aria-hidden="true">✠</p>
      <h1 className="notfound-title">
        {lang === 'am' ? 'ገጹ አልተገኘም' : 'That page isn’t here'}
      </h1>
      <p className="notfound-body">
        {lang === 'am'
          ? 'የተከተሉት አድራሻ በዚህ መተግበሪያ ውስጥ የለም።'
          : 'Nothing in the app answers to that address.'}
      </p>
      {path && <p className="notfound-path"><code>#/{path}</code></p>}
      <ul className="notfound-ways">
        {ways.map((w) => (
          <li key={w.href}>
            <a href={w.href} onClick={() => onGo(w.href)}>
              <strong>{w.label}</strong>
              <span>{w.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
