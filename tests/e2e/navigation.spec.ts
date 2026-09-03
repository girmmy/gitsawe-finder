import { expect, test, type Page } from '@playwright/test';

/**
 * Getting around the app.
 *
 * A deacon uses this one-handed, often on a phone, sometimes mid-service. So
 * these check the things that make it usable rather than merely correct: that
 * every tab arrives somewhere, that a recording can be reached and started
 * without a mouse, and that nothing on the page scrolls sideways.
 */
const MESKEREM_1 = '#/date/2026-09-11';

/** A page that scrolls sideways on a phone is a page that has been broken. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const offenders: string[] = [];
    if (doc.scrollWidth > doc.clientWidth) {
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 || r.left < -1) {
          offenders.push(`${el.tagName.toLowerCase()}.${el.className || '(none)'}`);
        }
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: offenders.slice(0, 5) };
  });
}

test.describe('getting around', () => {
  test('every tab leads somewhere and says where you are', async ({ page }) => {
    await page.goto('#/');

    for (const [label, expected] of [
      ['Any date', /#\/date\//],
      ['Mezmurs', /#\/mezmur$/],
      ['The book', /#\/book/],
      ['Sunday', /#\/$/],
    ] as const) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(expected);
      await expect(page.getByRole('link', { name: label, exact: true }))
        .toHaveAttribute('aria-current', 'page');
    }
  });

  test('a mezmur can be found and opened, and leads back', async ({ page }) => {
    await page.goto('#/mezmur');
    const card = page.locator('.mezmur-card').first();
    const name = await card.locator('.mezmur-card-geez').innerText();

    await card.click();
    await expect(page).toHaveURL(/#\/mezmur\/./);
    await expect(page.locator('.mezmur-geez')).toHaveText(name);

    await page.getByRole('link', { name: /All mezmurs/ }).click();
    await expect(page).toHaveURL(/#\/mezmur$/);
  });

  test('an unknown route says so instead of showing nothing', async ({ page }) => {
    await page.goto('#/not-a-real-route');
    await expect(page.locator('.app')).toContainText(/not/i);
  });
});

test.describe('reaching a recording without a mouse', () => {
  test('the service fold opens from the keyboard', async ({ page }) => {
    await page.goto(MESKEREM_1);
    const vespers = page.locator('details.service-fold')
      .filter({ has: page.getByText('ዘሠርክ', { exact: true }) });

    await expect(vespers).not.toHaveAttribute('open', '');
    await vespers.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(vespers).toHaveAttribute('open', '');
  });

  test('the recordings are announced as their own region', async ({ page }) => {
    await page.goto(MESKEREM_1);
    // A screen reader lands on this rather than on a bare audio element.
    await expect(page.getByRole('region', { name: 'Recordings' }).first()).toBeVisible();
  });

  test('the audio control and its source link are both tabbable', async ({ page }) => {
    await page.goto(MESKEREM_1);
    const media = page.locator('.misbak-media').first();

    await media.locator('audio').focus();
    await expect(media.locator('audio')).toBeFocused();

    const source = media.getByRole('link', { name: 'ethiopianorthodox.org' });
    await expect(source).toHaveAttribute('href', /annualmisbak\.html$/);
    await expect(source).toHaveAttribute('rel', /noreferrer/);
  });

  test('a video card can be started with the keyboard', async ({ page }) => {
    await page.route('**/data/videos.json', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 'PSA:39:8-9': [{ id: 'aaaaaaaaaaa', title: 'A recording' }] }),
    }));
    await page.goto(`#/mezmur/${encodeURIComponent('ገብር-ኄር')}`);

    const card = page.locator('button.media-card').first();
    await card.focus();
    await expect(card).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.media-frame iframe')).toHaveCount(1);
  });

  test('the skip link jumps past the masthead', async ({ page }) => {
    await page.goto(MESKEREM_1);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /Skip to readings/ })).toBeFocused();
  });
});

test.describe('on a phone', () => {
  test('the readings never scroll sideways', async ({ page }) => {
    await page.goto(MESKEREM_1);
    await expect(page.locator('.misbak-media').first()).toBeVisible();
    const { offenders, scrollWidth, clientWidth } = await horizontalOverflow(page);
    expect(offenders, `page is ${scrollWidth}px wide in a ${clientWidth}px viewport`).toEqual([]);
  });

  test('an opened video embed stays inside the column', async ({ page }) => {
    await page.route('**/data/videos.json', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 'PSA:39:8-9': [{ id: 'aaaaaaaaaaa', title: 'A recording' }] }),
    }));
    await page.goto(`#/mezmur/${encodeURIComponent('ገብር-ኄር')}`);

    await page.locator('button.media-card').first().click();
    await expect(page.locator('.media-frame iframe')).toHaveCount(1);

    const { offenders } = await horizontalOverflow(page);
    expect(offenders, 'the 16:9 embed must be held inside the column').toEqual([]);
  });

  test('the audio control is wide enough to use with a thumb', async ({ page }) => {
    await page.goto(MESKEREM_1);
    const box = await page.locator('.misbak-media audio').first().boundingBox();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThanOrEqual(30);
  });
});

/**
 * Reading ahead. A deacon often needs the Sunday after next — that is the
 * mezmur they have to start learning — so the landing card steps by weeks
 * rather than making them work out the date and use the calendar tab.
 */
test.describe('Sundays other than the coming one', () => {
  const kicker = (page: import('@playwright/test').Page) => page.locator('.hero-kicker');

  test('steps forward a week at a time and says how far ahead it is', async ({ page }) => {
    await page.goto('#/');
    await expect(kicker(page)).toHaveText(/coming Sunday|today/);
    const first = await page.locator('.hero-date').innerText();

    await page.getByRole('button', { name: 'The Sunday after' }).click();
    await expect(kicker(page)).toHaveText('1 week ahead');
    await expect(page).toHaveURL(/#\/sunday\/\d{4}-\d{2}-\d{2}/);
    await expect(page.locator('.hero-date')).not.toHaveText(first);

    await page.getByRole('button', { name: 'The Sunday after' }).click();
    await expect(kicker(page)).toHaveText('2 weeks ahead');
  });

  test('goes back to the Sunday being prepared for', async ({ page }) => {
    await page.goto('#/');
    await page.getByRole('button', { name: 'The Sunday after' }).click();
    await page.getByRole('button', { name: /Back to this week/ }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(kicker(page)).toHaveText(/coming Sunday|today/);
  });

  test('steps backwards too', async ({ page }) => {
    await page.goto('#/');
    await page.getByRole('button', { name: 'The Sunday before' }).click();
    await expect(kicker(page)).toHaveText('1 week back');
  });

  test('a Sunday reached by link keeps its readings and its recordings', async ({ page }) => {
    await page.goto('#/');
    await page.getByRole('button', { name: 'The Sunday after' }).click();
    const url = page.url();

    await page.goto(url);           // arriving cold, as from a shared link
    await expect(kicker(page)).toHaveText('1 week ahead');
    await expect(page.locator('.hero-misbak')).toBeVisible();
  });

  test('a weekday in the URL still lands on that week\'s Sunday', async ({ page }) => {
    // 2026-09-16 is a Wednesday; the card only ever shows Sundays.
    await page.goto('#/sunday/2026-09-16');
    await expect(page.locator('.hero-date')).toContainText('September 20, 2026');
  });
});
