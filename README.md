# ግጻዌ · Gitsawe

A web app for the **Metsafe Gitsawe**, the lectionary of the Ethiopian Orthodox
Tewahedo Church. For any date it resolves which readings are appointed — the
misbak (the deacon's psalm), the Pauline and Catholic epistles, Acts, the Gospel
and the anaphora — for vespers, matins and the Divine Liturgy, in Ge'ez and
Amharic with English translations and citations.

## What it does

- **Opens on the coming Sunday's mezmur.** Sundays are named by their Yaredian
  mezmur, so that name is the headline, with a Latin transliteration under it.
- **Two ways through the book.** *Sunday* (the coming Sunday), *By day* (walk the
  calendar for weekday readings), and *By mezmur* (every mezmur the book gives,
  grouped by season, searchable in Ge'ez or Latin letters).
- **Both calendars, always.** Ethiopian date in Ge'ez numerals and the American
  Gregorian date side by side.
- **English citations.** The Ethiopian Psalter follows Septuagint numbering, so
  psalms show both — መዝ. ፻፵፬ = Psalm 145 (KJV).
- **Copy and paste.** One button produces a formatted message for a group chat:
  mezmur, both dates, every reading with its reader, and the anaphora.
- **The whole book.** The full 182-page PDF is bundled and readable in-app.
- Works offline after first load (PWA). No accounts, no tracking, no analytics.

## Running it

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build:data` regenerates `public/data/` from the vendored sources in
`research/`. The generated data is committed, so a deploy never needs that clone.

## How the resolver works

The printed book has three layers, and `src/lib/resolver.ts` decides which one
governs a given date:

1. **The movable cycle**, computed from *Bahire Hasab* — the Sundays of Great
   Lent counted back from Hosanna, Eastertide counted from Fasika, Nineveh,
   Holy Thursday, Ascension.
2. **The Sunday / month cycle** from the back of the book — Meskerem day
   windows, the nth Sunday of Tsige counted from Meskerem 26, the Hidar
   Sundays, the named weeks of Advent, Kremt, Filseta, and the end-of-year
   Sundays (ደለያት / ዐይነ ኵሉ, then ጎህ ጽባሕ).
3. **The fixed daily cycle**, one entry per Ethiopian month-day, which leads on
   ordinary weekdays and stays available as a secondary panel otherwise.

Every candidate carries the reason it applies, and the user can switch between
them.

Where nothing is digitized for a Sunday the app says so rather than guessing —
and names the page of the book that carries it, with a button that opens the
bundled PDF there. The section pages were located by reading the scans: the
ዘመነ ጽጌ Sundays are on PDF page 162, the አስተምህሮ Sundays on 164, ዘመነ ልደት on 167,
ዘመነ ክረምት on 177. Printed folio = PDF page + 4.

## Data provenance

See `docs/ATTRIBUTION.md`. In short: calendar math and most lectionary records
come from the MIT-licensed [EOTCDevAPI](https://github.com/natinael96/EOTCDevAPI);
the end-of-year Sunday records were transcribed from the page scans for this app
and are flagged in the UI as unverified.
