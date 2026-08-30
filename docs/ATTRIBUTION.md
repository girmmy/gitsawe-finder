# Sources and licenses

## Calendar and lectionary data

**[EOTCDevAPI](https://github.com/natinael96/EOTCDevAPI)** — MIT License,
Copyright (c) 2026 EOTCDev.

Used for:

- Ethiopian ↔ Gregorian conversion and the Bahire Hasab computation, ported into
  `src/lib/ethiopic.ts` and `src/lib/bahirehasab.ts`.
- The `data/sinq-gitsawe` collections, reshaped by `scripts/build-data.mjs` into
  `public/data/`: 366 fixed daily records, 43 movable-cycle records, 9
  month/Sunday-cycle records.
- 9,154 golden conformance vectors, sampled into `tests/fixtures/` and asserted
  against by our own calendar code.

That repository documents its own lineage: the daily and seasonal readings
originate in the MIT-licensed `gitsawe` npm dataset by BereketeAb, with missing
days back-filled from EOTCDev's transcription of the page scans; the monthly,
feast and mahlet collections were authored by the Sinq app (Apache-2.0).

## The book itself

**መጽሐፈ ግጻዌ ወመዝሙር ከነምልክቱ** — distributed as a PDF by the Ethiopian Orthodox
Tewahedo Church at [ethiopianorthodox.org](https://www.ethiopianorthodox.org).
Bundled at `public/metsafe-gitsawe.pdf` and readable in the app.

## Transcribed for this app

The end-of-year Sunday records in `public/data/sunday-extra.json` — the
ደለያት / ዐይነ ኵሉ Sundays and the ጎህ ጽባሕ Sunday — are not present in any dataset
above. They were read off page 185 of the PDF for this app.

They carry `"provenance": "scan"` and the UI labels them *“transcribed from the
page scans — please check it against the book.”* Corrections belong in that file.

## Bible text

No Bible verse text is bundled. The app shows citations and the incipit
(opening words) that the lectionary itself prints, plus the English of the
misbak where the upstream dataset supplies it. English psalm citations are
mapped from the Ethiopian (Septuagint) numbering to KJV numbering in
`scripts/build-data.mjs`.

## Fonts

Noto Serif Ethiopic, Fraunces and Literata, served from Google Fonts.
