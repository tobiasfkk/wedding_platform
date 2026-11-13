import { expect, Page, test } from '@playwright/test';

async function mockAnonymousRsvp(page: Page): Promise<void> {
  await page.route('**/api/rsvp/session', (route) =>
    route.fulfill({
      json: { identified: false, invitation: null, csrfToken: 'public-rsvp-csrf' },
    }),
  );
  await page.route('**/api/public/pix', (route) =>
    route.fulfill({
      json: {
        configured: true,
        key: 'pix@example.com',
        payload: '000201br.gov.bcb.pix6304ABCD',
        recipientName: 'Maria e Tobias',
      },
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

    const verseOffset = await page.locator('.verse').evaluate((element) => element.offsetTop);
    await continueCue.click();
    await page.waitForTimeout(180);
    const earlyScrollPosition = await page.evaluate(() => window.scrollY);
    expect(earlyScrollPosition).toBeLessThan(verseOffset);
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
    expect(cardLayout.firstWidth).toBeGreaterThanOrEqual(width - 72);
    expect(cardLayout.secondLeft).toBeLessThan(width);
    await expect(photoRail).toHaveCSS('scroll-snap-type', /mandatory/);
    const firstCard = photoRail.locator('.photo-card').first();
    await expect(firstCard).toHaveCSS('scroll-snap-align', 'center');
    await expect(firstCard).toHaveCSS('scroll-snap-stop', 'always');
    await expect(firstCard.locator('.photo-card__visual')).toHaveCSS('border-radius', '24px');
    await expect(firstCard.locator('.photo-card__visual')).toHaveCSS('box-shadow', 'none');
    await expect(firstCard.locator('figcaption')).toHaveCount(0);
    await expect(firstCard).toHaveClass(/is-active/);
    const touchLinkedMotion = await photoRail.evaluate(async (element) => {
      const card = element.querySelector<HTMLElement>('.photo-card')!;
      const image = card.querySelector<HTMLElement>('img')!;
      const originalSnapType = element.style.scrollSnapType;
      element.style.scrollSnapType = 'none';
      element.scrollLeft = 64;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const result = {
        progress: Number.parseFloat(card.style.getPropertyValue('--card-progress')),
        distance: Number.parseFloat(card.style.getPropertyValue('--card-distance')),
        imageTransform: getComputedStyle(image).transform,
      };
      element.scrollLeft = 0;
      element.style.scrollSnapType = originalSnapType;
      return result;
    });
    expect(touchLinkedMotion.progress).toBeLessThan(0);
    expect(touchLinkedMotion.distance).toBeGreaterThan(0);
    expect(touchLinkedMotion.imageTransform).not.toBe('none');
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
    const secondCard = photoRail.locator('.photo-card').nth(1);
    await expect(secondCard).toHaveClass(/is-active/);
    await photoRail.evaluate((element) => element.scrollTo({ left: 0, behavior: 'smooth' }));
    await expect.poll(() => photoRail.evaluate((element) => element.scrollLeft)).toBeLessThan(1);
    await expect(firstCard).toHaveClass(/is-active/);
    await photoRail.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    const lastPhoto = photoRail.locator('img').last();
    await expect
      .poll(() => lastPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    const ceremony = page.locator('.ceremony');
    await ceremony.scrollIntoViewIfNeeded();
    await expect(ceremony).toContainText('24-04-2027 | 16h');
    await expect(ceremony).toContainText('Sweet Home Farm');
    await expect(page.locator('.ceremony .map-link')).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/2wyfdkJZ5CcvLFsA7',
    );
    await expect(page.locator('.ceremony .map-link')).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('.ceremony .map-link')).toHaveCSS('transform', 'none');

    const rsvp = page.locator('.rsvp-section');
    await rsvp.scrollIntoViewIfNeeded();
    await expect(rsvp).toContainText('Abra o link individual que recebeu');
    await expectNoHorizontalOverflow(page);

    const gifts = page.locator('.gift-section');
    await gifts.scrollIntoViewIfNeeded();
    await expect(gifts.locator('.pix-qr img')).toBeVisible();
    await expect(gifts.getByRole('button', { name: 'Copiar código Pix' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test('navigates to the exact photo selected by its circle or visible edge', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await mockAnonymousRsvp(page);
  await page.goto('/');

  const rail = page.locator('.photo-rail');
  const dots = page.locator('.gallery-dot');
  await rail.scrollIntoViewIfNeeded();
  await expect(dots).toHaveCount(7);
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

  await dots.nth(1).click();
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');

  await rail.locator('.photo-card').nth(0).dispatchEvent('click');
  await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

  await rail.locator('.photo-card').nth(1).dispatchEvent('click');
  await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
});

test('copies the Pix code on local HTTP when Clipboard API is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get: () => undefined,
    });
  });
  await mockAnonymousRsvp(page);
  await page.goto('/');

  const gifts = page.locator('.gift-section');
  await gifts.scrollIntoViewIfNeeded();
  const qrBounds = await gifts.locator('.pix-qr img').boundingBox();
  expect(qrBounds?.width).toBeGreaterThan(280);
  const qrAlignment = await gifts.locator('.pix-qr').evaluate((qr) => {
    const bounds = qr.getBoundingClientRect();
    return Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2);
  });
  expect(qrAlignment).toBeLessThan(1);
  await expect(gifts.locator('.pix-details')).toHaveCSS('border-top-width', '0px');
  const pixLabelsGap = await gifts.locator('.pix-recipient').evaluate((recipient) => ({
    recipient: getComputedStyle(recipient).rowGap,
    key: getComputedStyle(document.querySelector('.pix-key')!).rowGap,
  }));
  expect(pixLabelsGap.recipient).toBe(pixLabelsGap.key);
  await expect(gifts.locator('.pix-recipient strong')).toHaveCSS('text-transform', 'none');
  await gifts.getByRole('button', { name: 'Copiar código Pix' }).click();

  await expect(gifts.getByRole('button', { name: 'Código copiado' })).toBeVisible();
  await expect(gifts).toContainText('Agora é só colar no aplicativo do banco.');
});

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
  await expect(page.locator('.gallery-playback')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'O nosso sim.' })).toBeVisible();
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
