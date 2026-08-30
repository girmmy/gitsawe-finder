import { t, type Lang } from '../lib/labels';

/**
 * The whole book. `page` opens it at a specific leaf — the gap notes use this
 * to land the reader on the Sunday section they need.
 */
export default function PdfView({ lang, page }: { lang: Lang; page?: number | null }) {
  const src = page ? `/metsafe-gitsawe.pdf#page=${page}` : '/metsafe-gitsawe.pdf';
  return (
    <section className="pdfview">
      <div className="pdfbar">
        <p className="pdf-title">
          መጽሐፈ ግጻዌ · Metsafe Gitsawe
          {page && <span className="pdf-at"> — page {page} (printed {page + 4})</span>}
        </p>
        <a className="btn primary" href="/metsafe-gitsawe.pdf" download="Metsafe-Gitsawe.pdf">
          ⇩ {t('download', lang)}
        </a>
      </div>
      <object key={src} className="pdfframe" data={src} type="application/pdf" aria-label="Metsafe Gitsawe PDF">
        <p className="pdf-fallback">
          Your browser cannot display the PDF inline —{' '}
          <a href={src}>open or download it here</a>.
        </p>
      </object>
      <p className="pdf-credit">
        Distributed by the Ethiopian Orthodox Tewahedo Church (ethiopianorthodox.org).
      </p>
    </section>
  );
}
