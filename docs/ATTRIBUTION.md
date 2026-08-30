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

**መጽሐፈ ግጻዌ ወመጽሐፈ ትክሊል** — the parish's own scan, supplied by the deacon who
reviewed this app because the earlier ethiopianorthodox.org copy was faded and
hard to read. The source is 548 pages at 229 MB; `public/metsafe-gitsawe.pdf`
carries the Gitsawe (pages 1–452, ending where መጽሐፈ ትክሊል begins), re-rendered
at 100 dpi grayscale with contrast levelling — 46 MB and noticeably sharper
than what it replaces. The PDF is excluded from the service-worker precache and
fetched only when someone opens the Book tab.

Its mezmur sections run by month; printed folio = PDF page − 7.

## Transcribed for this app

`public/data/sunday-extra.json` holds Sunday records that are in no dataset
above and were read off the page scans for this app:

| Record | Mezmur | Source |
|---|---|---|
| `tsige-2` | ኪነ ጥበቡ መንክር ወዕፁብ | printed p. 382 (ወርኀ ጥቅምት) |
| `ayne-kulu-2` | ይሁበነ ዝናመ በጊዜሁ | printed p. 415 (ወርኀ ነሐሴ) |
| `ayne-kulu-3` | ሰንበት ተዐቢ እምኵሉ ዕለት | old scan, p. 185 |
| `goh-tsibah-4` | አምላኪየ ኄር | old scan, p. 185 |

Each carries `"provenance": "scan"` and the UI labels it *“transcribed from the
page scans — please check it against the book.”* Corrections belong in that file.

`ayne-kulu-2` was corrected against the parish scan after the deacon's review:
the mezmur is **ይሁበነ ዝናመ በጊዜሁ** (the earlier dataset spelling was wrong), and
the third line of the misbak is **ትሰፍሕ የማነከ ወታጸግብ ለኵሉ እንስሳ ዘበሥርዓትከ** — not
the ትፈትሕ … ሕያው ሥምረተከ the upstream data carried.

### Still missing

About a dozen Sunday records remain undigitized (some Tsige, Astemhro,
ዘመነ ልደት, Eastertide, Kremt and Filseta Sundays). Verse numbers in these scans
turn on a single stroke — ፲፮ against ፲፯ — so they are not transcribed by eye.
The app names the section and opens the book at the right page instead; the
readings themselves are best dictated by someone who reads the fidel.

## Bible text

No Bible verse text is bundled. The app shows citations and the incipit
(opening words) that the lectionary itself prints, plus the English of the
misbak where the upstream dataset supplies it. English psalm citations are
mapped from the Ethiopian (Septuagint) numbering to KJV numbering in
`scripts/build-data.mjs`.

## Fonts

Noto Serif Ethiopic, Fraunces and Literata, served from Google Fonts.
