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
    const continueCue = page.getByRole('link', { name: 'Continuar para o versículo' });
    await expect(continueCue).toBeInViewport();
    await expect(continueCue).toHaveCSS('opacity', '1');
    await expectNoHorizontalOverflow(page);

    await continueCue.click();
    await expect(page.locator('.verse')).toBeInViewport();
    await expect(page.locator('blockquote')).toContainText('a mão do Senhor fez isto');

    const photoRail = page.locator('.photo-rail');
    await photoRail.scrollIntoViewIfNeeded();
    await expect(photoRail).toBeVisible();
    const firstPhoto = photoRail.locator('img').first();
    await expect(firstPhoto).toBeVisible();
    await expect
      .poll(() => firstPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    const railDimensions = await photoRail.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(railDimensions.scrollWidth).toBeGreaterThan(railDimensions.clientWidth);
    const cardLayout = await photoRail.locator('.photo-card').evaluateAll((cards) => ({
      firstWidth: cards[0]!.getBoundingClientRect().width,
      secondLeft: cards[1]!.getBoundingClientRect().left,
      viewportWidth: window.innerWidth,
    }));
    expect(cardLayout.firstWidth).toBeGreaterThan(width * 0.78);
    expect(cardLayout.secondLeft).toBeLessThan(width);
    await expect(photoRail).toHaveCSS('scroll-snap-type', /mandatory/);
    const firstCard = photoRail.locator('.photo-card').first();
    await expect(firstCard).toHaveCSS('scroll-snap-align', 'center');
    await expect(firstCard).toHaveCSS('scroll-snap-stop', 'always');
    await expect(firstCard.locator('.photo-card__visual')).toHaveCSS('border-radius', '24px');
    const caption = firstCard.locator('figcaption');
    await expect(caption).toHaveCSS('position', 'absolute');
    await expect(caption).toHaveCSS('font-weight', '700');
    await expect(caption).toHaveCSS('opacity', '1');
    await expect(photoRail.locator('.photo-card').nth(1)).toHaveClass(/is-visible/);
    await photoRail.evaluate((element) => element.scrollTo({ left: 230, behavior: 'smooth' }));
    await expect
      .poll(() =>
        photoRail.locator('.photo-card').evaluateAll((cards) => {
          const viewportCenter = window.innerWidth / 2;
          return Math.min(
            ...cards.map((card) => {
              const bounds = card.getBoundingClientRect();
              return Math.abs(bounds.left + bounds.width / 2 - viewportCenter);
            }),
          );
        }),
      )
      .toBeLessThan(1);
    await photoRail.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    const lastPhoto = photoRail.locator('img').last();
    await expect
      .poll(() => lastPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    const ceremony = page.locator('.ceremony');
    await ceremony.scrollIntoViewIfNeeded();
    await expect(ceremony).toContainText('24 de abril de 2026, às 16h');
    await expect(ceremony).toContainText('Sweet Home Farm');
    await expect(ceremony.locator('.map-link')).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/2wyfdkJZ5CcvLFsA7',
    );

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
