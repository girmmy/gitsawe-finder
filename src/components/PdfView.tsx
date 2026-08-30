import { t, type Lang } from '../lib/labels';

export default function PdfView({ lang }: { lang: Lang }) {
  return (
    <section className="pdfview">
      <div className="pdfbar">
        <p className="pdf-title">መጽሐፈ ግጻዌ · Metsafe Gitsawe — the full book</p>
        <a className="btn primary" href="/metsafe-gitsawe.pdf" download="Metsafe-Gitsawe.pdf">
          ⇩ {t('download', lang)}
        </a>
      </div>
      <object className="pdfframe" data="/metsafe-gitsawe.pdf" type="application/pdf" aria-label="Metsafe Gitsawe PDF">
        <p className="pdf-fallback">
          Your browser cannot display the PDF inline —{' '}
          <a href="/metsafe-gitsawe.pdf">open or download it here</a>.
        </p>
      </object>
      <p className="pdf-credit">
        Distributed by the Ethiopian Orthodox Tewahedo Church (ethiopianorthodox.org).
      </p>
    </section>
  );
}
