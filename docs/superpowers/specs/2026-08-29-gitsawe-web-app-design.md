# Gitsawe Web App — Design Spec (2026-08-29)

## Purpose

A web app for Ethiopian Orthodox Tewahedo deacons and faithful that answers, for any
date: **what does the Metsafe Gitsawe appoint today?** — the misbak (deacon's psalm),
the three readings (Pauline epistle / ንፍቅ ዲያቆን, Catholic epistle / ዲያቆን, Acts / ንፍቅ ካህን),
the Gospel, and the anaphora (ቅዳሴ), for matins (ነግህ), liturgy (ቅዳሴ) and vespers (ሠርክ) —
in Ge'ez and Amharic with English translations/citations so American EOTC members can
follow in their English Bibles. One-tap copy of the whole day for group chats.

## Users & success criteria

- A deacon opens the app on Sunday morning and sees the correct Sunday readings
  (from the Sunday/month section at the back of the book) without paging through the PDF.
- On a weekday, the fixed daily readings for the Ethiopian month-day appear.
- A "Copy for group chat" button produces a clean formatted text message.
- Both the American (Gregorian) and Ethiopian date are always visible.
- The full Metsafe Gitsawe PDF is available in-app.

## Data sources (all vendored at build time; attribution page in app)

- **EOTCDevAPI** (github.com/natinael96/EOTCDevAPI, MIT): calendar math
  (Ethiopian↔Gregorian via JDN), Bahire Hasab (movable feasts), seasons, and the
  `data/sinq-gitsawe` collections:
  - `daily-gitsawe.json` — 366 fixed-cycle records keyed by Ethiopian MM-DD
    (origin: MIT `gitsawe` npm package by BereketeAb + scan transcription back-fill)
  - `seasonal-gitsawe.json` — 43 movable-cycle records (Lent weeks, Nineveh,
    Advent/genaTsom, Christmastide/lidet, Eastertide/tnsae, kremt, filseta, pagumen)
  - `monthly-gitsawe.json` — 9 month/Sunday-cycle records (Meskerem ranges, Tsige
    nth-Sundays, Hidar 4th/5th Sundays)
- **Official PDF**: ethiopianorthodox.org `Metshafe gitsawe.pdf` (church-distributed).
- No runtime network dependency. Everything static.

## Architecture

Static SPA: **Vite + React + TypeScript**, hand-rolled CSS (frontend-design skill),
PWA (offline after first load), no backend, no accounts, no user data.

- `scripts/build-data.mjs` — build-time pipeline: reads the vendored JSON, normalizes
  the ~63 messy Amharic book-title variants to USFM codes, attaches English book names
  and **KJV psalm-number mapping** (Ethiopian Psalter = LXX numbering; verified against
  the English text already present in the data), emits:
  - `public/data/daily/{1..13}.json` (lazy-loaded per Ethiopian month)
  - bundled `seasonal.json` + `monthly.json` (small, eager)
- `src/lib/ethiopic.ts` — calendar conversion (ported, MIT attribution)
- `src/lib/bahirehasab.ts` — movable feasts (ported)
- `src/lib/resolver.ts` — **the core value-add**: date → ordered reading candidates:
  1. Movable/seasonal record when the date matches (Lent week Sundays counted back
     from Hosanna; Nineveh Mon; Holy Thursday; nth Sunday after Easter; Advent
     ስብከት/ብርሃን/ኖላዊ date windows; lidet = nth Sunday after Gena; astemhro,
     zere-demena, kremt nth Sunday from Sene 26, filseta during Nehase 1–16,
     Pagumen Sunday)
  2. Monthly/Sunday-cycle record (Meskerem day windows, Tsige nth Sunday from
     Meskerem 26, Hidar 4th/5th Sunday)
  3. Fixed daily record for the Ethiopian month-day — **always shown** (primary on
     weekdays; secondary "also today" panel when a Sunday/seasonal record wins)
  Every candidate is labeled with *why* it applies. When no Sunday-specific record
  exists in the data, fall back to the fixed daily record with an honest note.
- `src/lib/format.ts` — plain-text export for the copy/share buttons.

## UI (single page + PDF page + about page)

- Header: Gregorian + Ethiopian date (with Ge'ez numerals), weekday, evangelist year,
  season badge, fasting indicator.
- Date navigation: prev/next day, today, next Sunday jump, native date picker.
- Reading card per service (ሠርክ · ነግህ · ቅዳሴ) with role-labeled rows; misbak shows
  Ge'ez + Amharic + English + dual citation (Ethiopian Psalter & KJV); readings show
  incipit + citation in Amharic and English (book, chapter, verse).
- Sinksar (synaxarium) commemorations for the day.
- Copy buttons: per reading, per service, and **Copy all** (group-chat format);
  Web Share API where available.
- Language toggle for UI labels (EN/አማ). Ge'ez/Amharic body text always shown.
- PDF viewer page embedding the full Metsafe Gitsawe with download link.
- About/attribution page (sources, licenses, known data gaps).

## Security / deployment

Static hosting (Vercel/Netlify/GitHub Pages). CSP headers via `vercel.json`/`_headers`;
no third-party scripts; fonts self-hosted or Google Fonts only. No data collection.

## Error handling

- Unknown/missing record → explicit "not digitized yet, see PDF page N region" note
  rather than silence.
- Date range guarded (Ethiopian years ≥ 1); resolver pure + unit-tested against
  known anchors (Easter 2018 EC = Apr 12 2026, Hosanna, Debre Zeyit, Meskel, etc.).

## Testing

- Vitest unit tests: calendar round-trips, Bahire Hasab anchors vs. the API's
  conformance vectors, resolver picks for a set of hand-checked dates.
- Manual browser verification of copy output + PWA offline.
