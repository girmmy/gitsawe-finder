import type { Lang } from '../lib/labels';

export default function AboutView({ lang }: { lang: Lang }) {
  return (
    <section className="about">
      {lang === 'am' ? (
        <>
          <h2>ስለ መተግበሪያው</h2>
          <p>
            ይህ መተግበሪያ መጽሐፈ ግጻዌን መሠረት አድርጎ ለእያንዳንዱ ቀን የተመደበውን ምስባክ፣ መልእክታት፣
            ግብረ ሐዋርያት፣ ወንጌልና ቅዳሴ ያሳያል። እሑድና በዓላት ላይ ከመጽሐፉ መጨረሻ ባለው የወርና
            የዘመናት ክፍል የሚገኘውን ግጻዌ ያቀርባል፤ የዕለቱ ወርኃዊ ግጻዌም አብሮ ይታያል።
          </p>
          <p>
            የቀን አቆጣጠሩ በባሕረ ሐሳብ ስሌት ነው። መረጃው ገና ሙሉ በሙሉ ዲጂታል ያልሆነባቸው
            እሑዶች ሲኖሩ መተግበሪያው በግልጽ ይናገራል — በዚያን ጊዜ ሙሉውን PDF ይመልከቱ።
          </p>
        </>
      ) : (
        <>
          <h2>About this app</h2>
          <p>
            This app serves the <strong>Metsafe Gitsawe</strong> — the lectionary of the Ethiopian
            Orthodox Tewahedo Church. For any date it resolves which readings apply: the fixed
            daily cycle, the Sunday/month cycle from the back of the book, or the movable cycle
            computed by <em>Bahire Hasab</em> (Lent, Eastertide, Advent, and the rest).
          </p>
          <p>
            English citations are given so readers with English Bibles can follow along. Note that
            the Ethiopian Psalter follows the Septuagint numbering — the app shows both, e.g.
            መዝ. ፷፬ = Psalm 65 (KJV). Verse numbers can differ by one or two between traditions;
            the quoted English text is the surest guide.
          </p>
          <h3>Sources &amp; licenses</h3>
          <ul>
            <li>
              Calendar math, Bahire Hasab, and lectionary datasets: {' '}
              <a href="https://github.com/natinael96/EOTCDevAPI" target="_blank" rel="noreferrer">EOTCDevAPI</a> (MIT),
              which builds on the MIT-licensed <code>gitsawe</code> npm dataset by BereketeAb and the
              Sinq app collections.
            </li>
            <li>
              The full PDF of መጽሐፈ ግጻዌ is distributed by {' '}
              <a href="https://www.ethiopianorthodox.org" target="_blank" rel="noreferrer">ethiopianorthodox.org</a>.
            </li>
          </ul>
          <h3>Two ways through the book</h3>
          <p>
            Sundays are named by their <strong>Yaredian mezmur</strong>, so the app opens on the
            coming Sunday's mezmur. <em>By mezmur</em> lists every mezmur the book gives, grouped
            by season and searchable in Ge'ez or in Latin letters — the search matches on
            consonants, so <code>gebir her</code>, <code>gebre her</code> and ገብር ኄር all find the
            same Sunday. <em>By day</em> walks the calendar for the weekday readings.
          </p>
          <h3>Honesty about coverage</h3>
          <p>
            The end-of-year Sundays — ደለያት / ዐይነ ኵሉ and ጎህ ጽባሕ — were read off the page scans
            for this app rather than taken from an existing dataset, and are marked
            <em>“transcribed from the page scans”</em> wherever they appear. Please check them
            against the book and tell me about anything that is off.
          </p>
          <p>
            About fourteen other Sunday records — some Tsige, Astemhro, Christmastide, Eastertide
            and Kremt Sundays — are in no published dataset. They are in the book, so rather than
            transcribe blurry verse numbers and risk a wrong citation, the app tells you which
            page carries them and opens the PDF there. Those readings are real; only the
            digitisation is missing.
          </p>
          <p>
            The PDF is the authoritative text. Reading assignments also vary by local tradition
            and by the direction of the church fathers; this app is an aid, not an authority.
          </p>
          <h3>Privacy</h3>
          <p>
            No accounts, no tracking, no data collection. After the first visit the app works
            offline.
          </p>
          <p>
            Two things do reach outside. The Ethiopic typeface comes from Google Fonts on the
            first visit, and is then cached. And a recording, when you press play on one, is
            fetched from ethiopianorthodox.org or YouTube — nothing loads from either until
            you do, but pressing play sends them a request, as visiting their site would.
          </p>
        </>
      )}
    </section>
  );
}
