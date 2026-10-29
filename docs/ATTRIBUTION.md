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
| `tsige-4` | በዚአሁ ሐለፈ ክረምት | printed p. 382 (ወርኀ ጥቅምት) |
| `tsige-5` | ጸገየ ወይን | printed p. 382–383 (ወርኀ ጥቅምት) |
| `astemhro-1` | ኢተዘከር | printed p. 384 (ወርኀ ኅዳር) |
| `astemhro-2` | ሎቱ ስብሐት | printed pp. 384–385 |
| `astemhro-3` | አምላከ ፍጹም በሀላዌሁ | printed p. 385 |
| `lidet-yiserq-kokeb` | ይሠርቅ ኮከብ | printed p. 387 (ወርኀ ጥር) |
| `kremt-1` | ናኅብር ሰንበቶ | printed pp. 409–410 (ወርኀ ሰኔ) |
| `ayne-kulu-2` | ይሁበነ ዝናመ በጊዜሁ | printed p. 415 (ወርኀ ነሐሴ) |
| `ayne-kulu-3` | ሰንበት ተዐቢ እምኵሉ ዕለት | old scan, p. 185 |
| `goh-tsibah-4` | አምላኪየ ኄር | old scan, p. 185 |

Each carries `"provenance": "scan"` and the UI labels it *“transcribed from the
page scans — please check it against the book.”* Corrections belong in that file.

`ayne-kulu-2` was corrected against the parish scan after the deacon's review:
the mezmur is **ይሁበነ ዝናመ በጊዜሁ** (the earlier dataset spelling was wrong), and
the third line of the misbak is **ትሰፍሕ የማነከ ወታጸግብ ለኵሉ እንስሳ ዘበሥርዓትከ** — not
the ትፈትሕ … ሕያው ሥምረተከ the upstream data carried.

ዘመነ ጽጌ is now complete: all six Sundays resolve.

### How these were read

Each citation is confirmed twice — once from the printed chapter and verse, and
once from the incipit beside it. Where the two disagree the incipit wins,
because it identifies the verse on its own. That check caught a gospel read as
Matthew 7:24 whose incipit (ወበእንተዝ እብለክሙ ኢትትከዙ) is plainly Matthew 6:25, so
the record says 6:24. Citations the book does not print are left out rather
than inferred.

Where the book prints a cross-reference instead of the text, it is followed
rather than treated as a dead end. `tsige-4` is the case: the misbak row gives
the incipit and then **እም ፳ወ፭ ለሰኔ ገብ ሠርክ** — take it from the ዘሠርክ of Sene 25.
That day is ወበዐተ ክረምት, the entry of the rains, which is why the Sunday that
sings በዚአሁ ሐለፈ ክረምት borrows its misbak. The ዘሠርክ there is መዝ. ፸፫፥፲፮–፲፯ and
carries all three chanted clauses, so `tsige-4` now holds the whole misbak and
its reference rather than the opening clause alone. An earlier reading of this
page took the numeral for ፳ወ፬ and pointed at Sene 24, whose ዘሠርክ is a different
psalm altogether (፻፲፫፥፲፫–፲፬, ዐይን ቦሙ ወኢይሬእዩ); the incipit beside the
cross-reference is what settles it, as above.

Four more rows read the same way, and all five had been transcribed as though
the incipit were the whole misbak — which leaves a deacon a line he cannot
chant and, in two cases, no verse he can look up:

| Record | The book's row | Resolved from | Now |
|---|---|---|---|
| `tsige-2` | ተዘከር እግዚኦ … ገብ ፍትሐት ዘምዕራፍ ፯ (ገጽ ፪፻፺፪) | ጥቅምት ፩ ዘቅዳሴ | መዝ. ፻፪፥፲፬–፲፭ |
| `tsige-4` | አንተ ፈጠርከ … እም ፳ወ፭ ለሰኔ ገብ ሠርክ | ሰኔ ፳፭ ዘሠርክ | መዝ. ፸፫፥፲፮–፲፯ |
| `astemhro-1` | ኢትዝክር ለነ … ገብ ምዕራፍ ዘዐርብ | ጾመ ነቢያት ፩ኛ | መዝ. ፸፰፥፰–፱ |
| `astemhro-2` | ኵሎ ዘፈቀደ … ገብ ምዕራፍ | ጾመ ነቢያት ፪ኛ | መዝ. ፻፴፬፥፮–፯ |
| `astemhro-3` | ቅረቡ ኀቤሁ … ገብ ምዕራፍ | ጾመ ነቢያት ፫ኛ | መዝ. ፴፫፥፭–፮ |

`tsige-2` also read ፻፪፥፲፬–፲፬, a single verse, which is what you get by
numbering the incipit rather than the misbak. Its third clause — ወከመ ጽጌ ገዳም
ከማሁ ይፈሪ, *as a flower of the field, so he flourisheth* — is the line that
earns the Sunday its place in ዘመነ ጽጌ, and it was the clause missing.

The three ዘአስተምህር rows point at a page of the ፍትሐት section rather than at a
date, and those page numerals do not survive this scan legibly. They are
resolved instead through the propers: the book indexes these Sundays by day
window (ኅዳር ፩–፲፪, ፲፫–፲፱, ፳–፳፮) and the upstream dataset indexes the same three
by nth Sunday of ጾመ ነቢያት, and the two agree on every epistle, the Acts and the
gospel, bar a verse either way, as well as on the order of the three misbak.
`tests/misbak.test.ts` holds that pairing, so if either side is ever re-read
into a different Sunday the link breaks loudly rather than quietly.

The two schemes do not land these on the same dates — ኅዳር ፳–፳፮ and the ፩ኛ
Sunday of ጾመ ነቢያት can be the same Sunday — so both records stay, and the app
offers whichever the day matches with the other beside it, as it already does
for Christmastide below. The pairing is about which propers belong together,
not about which Sunday they fall on.

Correcting a misbak's citation moves the key its recordings are filed under in
`public/data/videos.json`, which is written by hand. `tsige-2` went from
፻፪፥፲፬–፲፬ to ፻፪፥፲፬–፲፭ and left its chant (ምስባክ ጥቅምት ፯ ተዘከር እግዚኦ) stranded under
the old key, where nothing could reach it; the key was moved to match.
`tests/media.test.ts` now fails on any recording no misbak can reach. Giving
the three ዘአስተምህር records a reference had the opposite effect: with no `b`/`c`
to key on they could never match a recording, and all three turned out to have
one waiting — one of which names its own window, ከኅዳር ፳ እስከ ኅዳር ፳፮, and so
confirms the Sunday as well as the chant.

### A note on how the book indexes Sundays

Two schemes are in play. The upstream dataset numbers Christmastide Sundays as
`lidet` weeks 1, 3, 4, 5, 8 — the nth Sunday after Gena. The book instead names
them by date window: ልደት runs Tahsas 29 – Tir 5, ናዝሬት ሕፃንት Tir 6 – 11, and so
on. Astemhro is likewise windowed (ኢተዘከር Hidar 1–12, ሎቱ ስብሐት 13–19,
አምላከ ፍጹም በሀላዌሁ 20–26).

Records read from the book carry their window and match on it; the dataset's
nth-Sunday records still appear alongside as alternates. Where the two disagree
about a Sunday, both are shown rather than one being silently preferred.

### The misbak follows the mezmur

A Sunday's misbak is fixed by its mezmur, not by the calendar date — ዐይነ ኵሉ
belongs to ይሁበነ ዝናመ በጊዜሁ, and travels with it. Records are therefore keyed by
mezmur, and `tests/misbak.test.ts` asserts that pairing directly.

The misbak is also chanted clause by clause, so its translation is stored the
same way: `el` holds one English line per Ge'ez clause, index-aligned. A test
asserts the counts match, because a translation that drifts out of step with
what is sung is worse than none.

### Still missing

- **ናዝሬት ሕፃንት** (ንጉሥኪ ጽዮን), printed p. 387 — read but *not recorded*: its
  Pauline chapter is genuinely ambiguous between ሮሜ ፲፭ and ፲፮ at the scan's
  150 ppi, and the incipit (ወርቱዕስ … ጽኑዓን) points to Romans 15:1 against a
  glyph that may read 16. Needs a human eye.
- **Eastertide 8–10.** These may not be real gaps. Printed p. 405 covers ዳግም
  ትንሣኤ and the 3rd and 4th Sundays, which the dataset already has; the book
  files the Sundays after Pentecost under the ወርኀ ሰኔ month section (አባ ገሪግ,
  ናኅብር ሰንበቶ) rather than numbering them 8, 9, 10. The dataset's numbering
  looks like an artefact of its own scheme rather than something the book
  leaves out. Worth confirming with a deacon before chasing it further.
- **Filseta** Sundays, printed pp. 411–415.

Until they are read the app names the section and opens the book at that page.

## Bible text

No Bible verse text is bundled. The app shows citations and the incipit
(opening words) that the lectionary itself prints, plus the English of the
misbak where the upstream dataset supplies it. English psalm citations are
mapped from the Ethiopian (Septuagint) numbering to KJV numbering in
`scripts/build-data.mjs`.

## Fonts

Noto Serif Ethiopic, Fraunces and Literata, served from Google Fonts.

## Recordings of the chanted misbak

[The Ethiopian Orthodox Tewahedo Church](https://www.ethiopianorthodox.org/amharic/yeqolotbet/annualmisbak.html)
publishes the ዓመታዊ ምስባክ collection on its own site. The church's webmaster gave
permission for both of the uses below.

Most of it we only link to. `scripts/build-audio.mjs` reads the index page and
writes `public/data/audio.json`, which addresses each recording by Ethiopian
month, day and office. The mp3 files stay on the church's server. Every player
in the app names the source and links back to the page above, and the audio is
marked `preload="none"`, so a page nobody listens to costs them no bandwidth.

Nehase and Pagumen are the exception. Both months exist only as `.wma`, which no
current browser plays, so they were out of reach until the church agreed we
could convert them. `scripts/transcode-wma.mjs` re-encodes the 34 files covering
those months to 48 kbps mono mp3, 25 MB in and 12 MB out, and the app serves
those copies from `public/audio/`. They are still the church's recordings and
the app credits them the same way. The other 88 `.wma` files duplicate mp3 we
already link, so we left them alone.

What the collection does not have:

- Anything for ዘሠርክ. It covers ዘነግሥ and ዘቅዳሴ only. The app leaves its 365 serk
  slots empty rather than hand a reader a chant from the wrong office.
- An office for every file. Some months name the day and stop there. Those play
  with a note saying as much.
- 23 daily slots have no recording at all.

The Sunday cycle is missing from it entirely, and as far as we can tell no
equivalent collection exists; those recordings circulate through weekly YouTube
posts and Telegram groups instead. `public/data/videos.json` is curated by hand
for that half.
