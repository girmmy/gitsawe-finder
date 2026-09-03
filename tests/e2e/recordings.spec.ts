import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jdnToEth, jdnToWeekday, todayJDN } from '../../src/lib/ethiopic';
import { resolveDay } from '../../src/lib/resolver';
import { misbakRefKey } from '../../src/lib/media';
import { mezmurKey } from '../../src/lib/router';
import { serviceOf } from '../../src/lib/types';

/**
 * End-to-end cover for the misbak recordings.
 *
 * Two things here are only observable in a real browser against the built app:
 * that nothing third-party is fetched until a reader asks for it, and that the
 * deployed Content-Security-Policy actually permits the fetch when they do. A
 * missing CSP directive produces no error a user can see — just an embed that
 * never appears — so both are asserted directly.
 *
 * Dates are the Gregorian days the app resolves to the Ethiopian ones named.
 */
const MESKEREM_1 = '#/date/2026-09-11'; // both offices recorded, each its own file
const SENE_5 = '#/date/2026-06-12';     // a file for the day, office unnamed
const NEHASE_5 = '#/date/2026-08-11';   // converted from .wma, so day-wide only
const GEBR_HER = `#/mezmur/${encodeURIComponent('ገብር-ኄር')}`;

/** Fixture videos, so the curated file can stay empty until it is curated. */
const VIDEOS = {
  'PSA:39:8-9': [
    { id: 'aaaaaaaaaaa', title: 'ምስባክ ዘገብር ኄር', channel: 'A channel', seconds: 214 },
    { id: 'bbbbbbbbbbb', title: 'Another recording', channel: 'A channel', seconds: 180 },
    { id: 'ccccccccccc', title: 'Embedding disabled', channel: 'A channel', embeddable: false },
  ],
};

/** Serve the fixture in place of the curated file. */
async function withVideos(page: Page) {
  await page.route('**/data/videos.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VIDEOS) }));
}

/**
 * Hosts a recording would reach. The claim under test is that none of them is
 * contacted until a reader presses play.
 *
 * Google Fonts is deliberately not in this list: the app has always loaded
 * Noto Sans Ethiopic from fonts.googleapis.com, it is declared in the CSP, and
 * it is unrelated to recordings. Asserting on it here would only couple these
 * tests to a decision made long before this feature.
 */
const RECORDING_HOSTS = /ethiopianorthodox\.org|youtube|youtube-nocookie|ytimg|googlevideo/i;

function trackRecordingHosts(page: Page) {
  const seen: string[] = [];
  page.on('request', (req) => {
    if (RECORDING_HOSTS.test(req.url())) seen.push(req.url());
  });
  return seen;
}

/** CSP refusals surface here rather than as a visible failure. */
function trackCspViolations(page: Page) {
  const violations: string[] = [];
  page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${(e as SecurityPolicyViolationEvent).violatedDirective} blocked ${(e as SecurityPolicyViolationEvent).blockedURI}`);
    });
  });
  return violations;
}

const cspReport = (page: Page) =>
  page.evaluate(() => (window as unknown as { __csp: string[] }).__csp ?? []);

/** Open a service fold by its Ge'ez heading, and return that fold. */
function fold(page: Page, geez: string) {
  return page.locator('details.service-fold').filter({ has: page.getByText(geez, { exact: true }) });
}
async function openFold(page: Page, geez: string) {
  const f = fold(page, geez);
  // `<details open>` has the attribute as "", which is falsy — reading it with
  // getAttribute made this close the folds it was asked to open.
  if (!(await f.evaluate((el: HTMLDetailsElement) => el.open))) {
    await f.locator('summary').click();
  }
  await expect(f).toHaveAttribute('open', '');
  return f;
}

test.describe('the recordings', () => {
  test('reaches no recording host until a reader asks it to', async ({ page }) => {
    const contacted = trackRecordingHosts(page);
    await page.goto(MESKEREM_1);
    await expect(page.locator('.misbak-media').first()).toBeVisible();
    // The whole promise in one assertion: a player on screen, nothing fetched.
    expect(contacted, 'page load must reach no recording host').toEqual([]);
  });

  test('gives each office the recording of its own misbak', async ({ page }) => {
    await page.goto(MESKEREM_1);

    const liturgy = await openFold(page, 'ዘቅዳሴ');
    await expect(liturgy.locator('.misbak-media audio')).toHaveAttribute('src', /zekidase/);

    const mahlet = await openFold(page, 'ዘነግሥ');
    await expect(mahlet.locator('.misbak-media audio')).toHaveAttribute('src', /zenegeh/);
  });

  test('holds the audio back until play, then fetches it', async ({ page }) => {
    let fetched = 0;
    // Intercepting rather than pulling megabytes off a small church's server on
    // every run. Reaching this handler at all proves the CSP allowed the request:
    // media-src refuses before the network layer is ever asked.
    await page.route('**/*.mp3', (route) => { fetched++; return route.abort(); });

    await page.goto(MESKEREM_1);
    const audio = (await openFold(page, 'ዘቅዳሴ')).locator('.misbak-media audio');
    await expect(audio).toHaveAttribute('preload', 'none');
    expect(fetched, 'nothing fetched before play').toBe(0);

    await audio.evaluate((el: HTMLAudioElement) => el.play().catch(() => undefined));
    await expect.poll(() => fetched, { message: 'play must fetch the recording' }).toBeGreaterThan(0);
  });

  test('says so when the source did not name the office', async ({ page }) => {
    await page.goto(SENE_5);
    const liturgy = await openFold(page, 'ዘቅዳሴ');
    await expect(liturgy.locator('.media-caveat'))
      .toHaveText(/the source doesn't say which service/);
  });

  /**
   * The collection records only ዘነግሥ and ዘቅዳሴ. Offering a day-wide file to a
   * Vespers reader would look like an answer while being the wrong office.
   */
  test('keeps an unattributed recording away from ዘሠርክ', async ({ page }) => {
    await page.goto(SENE_5);
    const vespers = await openFold(page, 'ዘሠርክ');
    await expect(vespers.locator('.reading.misbak')).toBeVisible();
    await expect(vespers.locator('.misbak-media')).toHaveCount(0);
  });

  /**
   * Nehase and Pagumen exist only as .wma upstream, so these are the copies we
   * converted and serve ourselves — the one case where media-src 'self'
   * carries the audio rather than the church's server.
   */
  test('plays the recordings we converted for Nehase, from our own origin', async ({ page }) => {
    await page.goto(NEHASE_5);
    const liturgy = await openFold(page, 'ዘቅዳሴ');
    const audio = liturgy.locator('.misbak-media audio');
    await expect(audio).toHaveAttribute('src', /^\/audio\/12-\d\d\.mp3$/);
    // Their filenames name no office, so they must be labelled as unattributed.
    await expect(liturgy.locator('.media-caveat')).toBeVisible();

    const res = await page.request.get(await audio.getAttribute('src') ?? '');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/audio|octet-stream/);
  });

  /**
   * Audio is addressed by date, and the mezmur page carries today's date around
   * a record from another week. A player here would be the wrong chant.
   */
  test('never puts a dated recording on the mezmur page', async ({ page }) => {
    await page.goto(GEBR_HER);
    await expect(page.locator('.reading.misbak')).toBeVisible();
    await expect(page.locator('.misbak-media audio')).toHaveCount(0);
  });
});

test.describe('the video cards', () => {
  test('shows a card and loads no frame until it is tapped', async ({ page }) => {
    await withVideos(page);
    const contacted = trackRecordingHosts(page);
    await page.goto(GEBR_HER);

    await expect(page.locator('.media-card').first()).toBeVisible();
    await expect(page.locator('.media-frame iframe')).toHaveCount(0);
    expect(contacted, 'a card alone must reach nobody').toEqual([]);
  });

  test('embeds through youtube-nocookie once tapped, and the CSP allows it', async ({ page }) => {
    trackCspViolations(page);
    await withVideos(page);
    await page.goto(GEBR_HER);

    await page.locator('button.media-card').first().click();
    const frame = page.locator('.media-frame iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/aaaaaaaaaaa/);

    // frame-src is the directive that would refuse this, silently.
    expect(await cspReport(page), 'the deployed CSP must permit the embed').toEqual([]);
  });

  /**
   * Regression: the app sends Referrer-Policy: no-referrer, and YouTube will
   * not play an embed it cannot attribute to a site — it renders "Video player
   * configuration error, Error 153" inside a frame that looks perfectly fine
   * from the outside. The iframe overrides the policy to send our origin, and
   * only our origin. This failed in production and nowhere else.
   */
  test('sends YouTube an origin so the player is not refused', async ({ page }) => {
    await withVideos(page);
    await page.goto(GEBR_HER);

    const [request] = await Promise.all([
      page.waitForRequest((r) =>
        r.url().includes('youtube-nocookie.com/embed/') && r.resourceType() === 'document'),
      page.locator('button.media-card').first().click(),
    ]);

    const referer = request.headers()['referer'];
    expect(referer, 'YouTube refuses an embed with no referrer').toBeTruthy();
    // The origin and nothing after it: no path, no hash, no which-misbak.
    expect(referer).toMatch(/^https?:\/\/[^/]+\/$/);
  });

  test('plays one at a time, releasing the last', async ({ page }) => {
    await withVideos(page);
    await page.goto(GEBR_HER);

    await page.locator('button.media-card').first().click();
    await expect(page.locator('.media-frame iframe')).toHaveAttribute('src', /aaaaaaaaaaa/);

    await page.locator('button.media-card').first().click();
    await expect(page.locator('.media-frame iframe')).toHaveCount(1);
    await expect(page.locator('.media-frame iframe')).toHaveAttribute('src', /bbbbbbbbbbb/);
  });

  test('links out instead of embedding when the uploader forbids embedding', async ({ page }) => {
    await withVideos(page);
    await page.goto(GEBR_HER);

    const flat = page.locator('p.media-card');
    await expect(flat).toHaveCount(1);
    await expect(flat).toContainText('Embedding disabled');
    // No button on it, so it can never become a frame that would refuse to load.
    await expect(flat.locator('button')).toHaveCount(0);
    await expect(page.locator('.media-item', { has: flat }).getByRole('link'))
      .toHaveAttribute('href', 'https://www.youtube.com/watch?v=ccccccccccc');
  });
});

test.describe('the deployed headers', () => {
  test('carry the directives the recordings need', async ({ page }) => {
    const res = await page.goto(MESKEREM_1);
    const csp = res!.headers()['content-security-policy'];
    // 'self' for the Nehase/Pagumen copies we host, the church for the rest.
    expect(csp, 'media-src for the audio').toMatch(
      /media-src [^;]*'self'[^;]*https:\/\/www\.ethiopianorthodox\.org/);
    expect(csp, 'frame-src for the embed').toContain('frame-src https://www.youtube-nocookie.com');
    // Being framed is a different question and stays refused.
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('raises no policy violation on a normal visit', async ({ page }) => {
    trackCspViolations(page);
    await page.goto(MESKEREM_1);
    await expect(page.locator('.misbak-media').first()).toBeVisible();
    expect(await cspReport(page)).toEqual([]);
  });
});

/**
 * The landing card renders the liturgy misbak itself rather than through
 * MisbakRow, so it needs the recordings wired separately — and it is the most
 * visited misbak in the app.
 *
 * Which Sunday that is changes every week, so rather than pin a date these
 * resolve the coming Sunday the same way App.tsx does and key the fixture off
 * whatever misbak comes back.
 */
test.describe('the Sunday landing card', () => {
  const comingSunday = () => {
    const from = todayJDN();
    return from + ((7 - jdnToWeekday(from)) % 7);
  };

  const data = (f: string) =>
    JSON.parse(readFileSync(fileURLToPath(new URL(`../../public/data/${f}`, import.meta.url)), 'utf8'));

  /** The misbak the hero will show, and the key a recording for it would use. */
  function heroMisbak() {
    const jdn = comingSunday();
    const eth = jdnToEth(jdn);
    const day = resolveDay(jdn, {
      seasonal: data('seasonal.json'),
      monthly: data('monthly.json'),
      extra: data('sunday-extra.json'),
      daily: data(`daily/${eth.month}.json`),
    });
    const primary = day.candidates[0];
    const misbak = primary ? serviceOf(primary.record, 'kidassie')?.msbak?.[0] : undefined;
    return { primary, misbak, ref: misbak ? misbakRefKey(misbak) : null };
  }

  test('carries a curated video for the mezmur being prepared', async ({ page }) => {
    const { ref, primary } = heroMisbak();
    test.skip(!ref, 'the coming Sunday has no citable liturgy misbak');

    // Key it both ways so the test holds whether or not the Sunday is named.
    const body: Record<string, unknown> = { [ref!]: [{ id: 'aaaaaaaaaaa', title: 'ምስባክ', channel: 'A channel' }] };
    if (primary?.mezmur) body[`${mezmurKey(primary.mezmur)}|${ref}`] = body[ref!];
    await page.route('**/data/videos.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));

    await page.goto('#/');
    const hero = page.locator('.hero-misbak');
    await expect(hero.locator('.media-card')).toHaveCount(1);
    await expect(hero.locator('.media-frame iframe')).toHaveCount(0);

    await hero.locator('button.media-card').click();
    await expect(hero.locator('.media-frame iframe'))
      .toHaveAttribute('src', /youtube-nocookie\.com\/embed\/aaaaaaaaaaa/);
  });

  /**
   * The Sunday cycle is not what the daily audio collection records, so a
   * seasonal misbak must not pick up the recording that happens to share its
   * date. This is the same guard as the mezmur page, at the app's front door.
   */
  test('never borrows the daily recording that shares the date', async ({ page }) => {
    const { primary } = heroMisbak();
    test.skip(primary?.kind === 'daily', 'this Sunday falls back to the daily record');

    await page.goto('#/');
    await expect(page.locator('.hero-misbak')).toBeVisible();
    await expect(page.locator('.hero-misbak audio')).toHaveCount(0);
  });
});
