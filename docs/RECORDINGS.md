# Recordings — where they come from and what is still missing

The app shows the misbak's text, transliteration and translation. A deacon
learning one also needs the tune, and that is what these are for.

Two sources cover two halves of the book, and neither covers the other:

| | daily cycle | mezmur (Sunday) cycle |
|---|---|---|
| source | ethiopianorthodox.org mp3, plus 34 converted from .wma | curated YouTube |
| file | `public/data/audio.json` (generated) | `public/data/videos.json` (hand-written) |
| key | `ethMonth:ethDay:service` | `PSA:39:8-9`, or `ገብር-ኄር\|PSA:39:8-9` |
| built by | `npm run build:audio` | you, helped by `npm run find:videos` |

Nothing loads from either host until a reader presses play. That is enforced by
`preload="none"` on the audio, a click-to-load facade on the video, and tests
that fail if either starts fetching on its own.

## Where coverage stands

**Daily cycle — 782 recordings over 762 keys**, of which 34 are the converted
Nehase and Pagumen files we host. Of the 728 daily misbak slots in
`public/data/daily/*.json`:

- 516 (71%) have a recording naming their exact office
- 189 (26%) have one for the day with the office unnamed, shown labelled as such
- 23 (3%) have nothing

Before the conversion those last two were 124 and 88; Nehase and Pagumen were
entirely empty.

**Mezmur cycle — 3 of 58 distinct misbaks.** Seeded so far:

| ref | Sunday | video |
|---|---|---|
| `PSA:39:8-9` | ገብር ኄር | `WqrDlZqvpfo` — its own title slide reads ፮ኛ ሰንበት ገብር ኄር, መዝሙረ ዳዊት ፴፱(፵)፥፰ |
| `PSA:46:5-6` | ዕርገት | `nba5EcJ0KWY` — title quotes the incipit ዐርገ እግዚአብሔር በይባቤ |
| `PSA:49:3-4` | ደብረ ዘይት, ጳጉሜን | `b07H_rgRT_w` — title quotes the incipit እግዚአብሔርሰ ገሃደ ይመጽእ |

## The open gaps, and what each would take

### 1. 55 mezmur misbaks with no video — *free, needs your ear*

The only real work left. There is no bulk source: these circulate through
weekly channel posts and Telegram groups.

```bash
YOUTUBE_API_KEY=... npm run find:videos -- --limit 25
```

A key is free from console.cloud.google.com (enable "YouTube Data API v3").
The free quota is 10,000 units a day and each misbak costs ~101, so **all 55
fit in a single day**. The key never reaches the built app.

The script writes ranked proposals to `research/video-candidates.json` and
**never** to `videos.json`, because deciding a recording really is a given
misbak is a judgement about chant, not about strings. It ranks by how much of
the misbak's opening Ge'ez words appear in the title — the criterion that
verified all three seeds above — and pushes down titles saying መዝሙር without
ምስባክ, since that is the hymn naming the Sunday, not the psalm chanted before
the gospel.

Scores: above 100, the title quotes the incipit almost in full; 40–80 usually
means it names the Sunday instead; at or below 0 it is probably the wrong
piece. Listen, then copy the good ones into `videos.json` as
`{ id, title, channel, seconds }`. Channels worth watching: **ምስባክ misbak**,
which titles by incipit, and **ቅዱስ እግዚአብሔር ቲዩብ**, which posts weekly.

### 2. Nehase and Pagumen — *done*

Both months were published only as `.wma`, which no browser plays. The church
gave permission to convert, so `npm run transcode:wma` fetches the 34 files
covering them and re-encodes to 48 kbps mono mp3 — 25 MB of source became 12 MB
under `public/audio/`, about 35 minutes of chant. `npm run build:audio` folds
them into the index; they are day-wide entries, since those filenames carry the
misbak's opening words rather than an office.

That the folder names were honest was checked rather than assumed:
transliterating each filename's incipit with the app's own `translit()` and
matching it against our records picks out the named month every time, clear of
the runner-up, and identifies the unlabelled `gitsawe/` folder as Meskerem.

The other 88 `.wma` duplicate mp3 already linked, and are left alone. These are
the only recordings the app hosts; `media-src` covers `'self'` for them, they
are excluded from the precache (12 MB nobody asked for) and cached on play.

### 3. No ዘሠርክ recordings anywhere — *no known source*

The collection holds only ዘነግሥ and ዘቅዳሴ. The app has 365 serk misbak slots and
offers nothing for them, deliberately: a day-wide file belongs to one of the
two recorded offices, and handing it to a Vespers reader would look like an
answer while being the wrong office (`RECORDED_OFFICES` in `src/lib/media.ts`).

### 4. We are spending their bandwidth — *permission given*

Every play streams 0.4–3 MB from a small church server with no CDN. `preload=
"none"` means only real listens cost them anything, and every player credits
them and links back.

The webmaster has agreed to both the linking and the conversion. The message
sent is kept here for the record:

> Dear Ethiopian Orthodox Tewahedo Church webmaster,
>
> I maintain a small free app that shows the daily and Sunday Gitsawe readings
> for deacons. It shows each misbak's text, but not the chant, and your ዓመታዊ
> ምስባክ page is the best collection of the daily misbak I have found.
>
> I would like to link to those mp3 files so a deacon can hear the misbak next
> to its text. The app would not copy or re-host them: it links to your files,
> each player credits ethiopianorthodox.org and links back to the page, and
> nothing is fetched until someone presses play, so pages nobody listens to
> cost you nothing.
>
> Two questions: is linking this way all right with you, and would you allow me
> to convert the 122 .wma recordings to mp3 and host those copies? The .wma
> files play in no current browser, and they include the Nehase and Pagumen
> misbak, which are otherwise missing.
>
> I am glad to remove or change anything at your word.

Should that ever be withdrawn, deleting `audio.json` and `public/audio/` leaves
the readings untouched and the daily half simply shows nothing — a path the
tests already cover.

### 5. 12 links on their page are dead — *already handled*

`build:audio` probes every file and drops what does not resolve. Re-running it
reports whatever has gone away since, so it doubles as the link checker.

## Things that bit us, so they do not again

- **`Referrer-Policy: no-referrer` breaks YouTube embeds.** The player refuses
  with "Video player configuration error, Error 153" inside a frame that looks
  fine from outside. The iframe carries
  `referrerPolicy="strict-origin-when-cross-origin"` so YouTube gets our origin
  and nothing more; every other request in the app stays refererless. Pinned by
  a test that fails when the attribute is removed.
- **The CSP lives in two files** — `vercel.json` and `public/_headers`. They
  must not drift. `npm run test:e2e` serves the built app through
  `scripts/serve-dist.mjs`, which reads `public/_headers` rather than keeping a
  copy, so a missing directive fails a test instead of a deploy.
- **A date does not always name what is on screen.** On a Sunday the seasonal
  record takes the liturgy while the daily record sits beside it, and the
  mezmur page carries today's date around another week's record. `audioFor
  Candidate` gives audio only to `kind === 'daily'`.
- **The app already loads Google Fonts**, and always has. "No third party" was
  never literally true; `AboutView` and the README now say so.

## Running it

```bash
npm run transcode:wma                # convert Nehase/Pagumen (needs ffmpeg)
npm run build:audio                  # regenerate the daily index, re-check links
YOUTUBE_API_KEY=... npm run find:videos
npm test                             # 65 unit tests
npm run test:e2e                     # 54 end-to-end, against the built app (desktop + mobile)
```
