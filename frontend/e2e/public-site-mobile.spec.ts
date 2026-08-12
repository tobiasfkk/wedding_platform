import { expect, Page, test } from '@playwright/test';

async function mockAnonymousRsvp(page: Page): Promise<void> {
  await page.route('**/api/rsvp/session', (route) =>
    route.fulfill({
      json: { identified: false, invitation: null, csrfToken: 'public-rsvp-csrf' },
    }),
  );
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(
    dimensions.scrollWidth,
    `A página possui ${dimensions.scrollWidth}px para uma viewport de ${dimensions.viewportWidth}px.`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth);
}

for (const width of [320, 390, 430]) {
  test(`keeps the single-page wedding journey usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockAnonymousRsvp(page);
    await page.goto('/');

    await expect(page.locator('.app-header')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maria Eduarda');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tobias');
    await expect(page.locator('.hero a')).toHaveCount(1);
    await expect(page.locator('.hero button')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'Continuar para o versículo' }).click();
    await expect(page.locator('.verse')).toBeInViewport();
    await expect(page.locator('blockquote')).toContainText('a mão do Senhor fez isto');

    const photoRail = page.locator('.photo-rail');
    await photoRail.scrollIntoViewIfNeeded();
    await expect(photoRail).toBeVisible();
    const railDimensions = await photoRail.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(railDimensions.scrollWidth).toBeGreaterThan(railDimensions.clientWidth);

    const rsvp = page.locator('.rsvp-section');
    await rsvp.scrollIntoViewIfNeeded();
    await expect(rsvp).toContainText('Abra o link individual que recebeu');
    await expectNoHorizontalOverflow(page);
  });
}

test('removes non-essential movement when the visitor prefers reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockAnonymousRsvp(page);
  await page.goto('/');

  const motionStyles = await page.locator('.motion-reveal').evaluateAll((elements) =>
    elements.map((element) => ({
      opacity: getComputedStyle(element).opacity,
      transitionDuration: getComputedStyle(element).transitionDuration,
    })),
  );

  expect(
    motionStyles.every(
      ({ opacity, transitionDuration }) => opacity === '1' && transitionDuration === '0s',
    ),
  ).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'Esperamos você para o nosso sim.' }),
  ).toBeVisible();
});

test('reveals staggered content as it enters the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAnonymousRsvp(page);
  await page.goto('/');

  const ceremonyHeading = page.locator('#ceremony-title');
  await expect(ceremonyHeading).not.toHaveClass(/is-visible/);

  await page.locator('.ceremony').evaluate((element) => element.scrollIntoView());

  await expect(ceremonyHeading).toHaveClass(/is-visible/);
  await expect(ceremonyHeading).toHaveCSS('opacity', '1');
});
