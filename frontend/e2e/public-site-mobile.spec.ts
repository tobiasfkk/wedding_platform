import { expect, Page, test } from '@playwright/test';

const publishedSite = {
  content: {
    hero: {
      eyebrow: 'Celebração de casamento',
      title: 'Um dia para guardar na memória.',
      introduction: 'Vamos celebrar com as pessoas que fazem parte da nossa história.',
      dateLabel: '8 de maio de 2027',
    },
    story: {
      eyebrow: 'Nossa história',
      title: 'Do encontro ao nosso sim.',
      paragraphs: ['O primeiro capítulo da nossa história.'],
      imageId: null,
      imageAlt: null,
      imageWidth: null,
      imageHeight: null,
    },
    locationMode: 'SHARED',
    schedule: [
      {
        type: 'CEREMONY',
        eyebrow: '01 · Cerimônia',
        title: 'O nosso sim',
        time: '16h',
        venue: 'Espaço Jardim',
        address: 'Rua das Flores, 100',
        visible: true,
        mapUrl: 'https://maps.app.goo.gl/example',
      },
      {
        type: 'RECEPTION',
        eyebrow: '02 · Recepção',
        title: 'Vamos celebrar',
        time: 'Após a cerimônia',
        venue: 'Espaço Jardim',
        address: 'Rua das Flores, 100',
        visible: true,
        mapUrl: 'https://maps.app.goo.gl/example',
      },
    ],
    notices: ['Chegue com antecedência.'],
    rsvp: {
      eyebrow: 'Confirmação de presença',
      title: 'Sua presença faz parte desta história.',
      description: 'Use o seu convite individual para responder.',
    },
    sectionOrder: ['STORY', 'SCHEDULE', 'NOTICES', 'RSVP'],
    photos: [
      {
        id: 'cover-photo',
        placement: 'HERO',
        alt: 'O casal diante das árvores.',
        width: 1600,
        height: 1200,
        focalX: 62,
        focalY: 38,
      },
      {
        id: 'story-photo',
        placement: 'STORY',
        alt: 'O casal caminhando no jardim.',
        width: 1200,
        height: 1600,
        focalX: 45,
        focalY: 50,
      },
    ],
  },
  version: 1,
  publishedAt: '2027-01-01T12:00:00Z',
};

async function publishSiteLocally(page: Page): Promise<void> {
  await page.route('**/api/public/site', (route) => route.fulfill({ json: publishedSite }));
  await page.route('**/api/public/site/media/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
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
  test(`keeps the public wedding experience usable at ${width}px`, async ({ page }) => {
    await publishSiteLocally(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Um dia para guardar na memória',
    );
    await expectNoHorizontalOverflow(page);

    const cover = page.locator('.hero__photo img');
    await expect(cover).toHaveAttribute('fetchpriority', 'high');
    await expect(cover).toHaveCSS('object-position', '62% 38%');

    const storyPhoto = page.locator('.photo-chapter img').first();
    await storyPhoto.scrollIntoViewIfNeeded();
    await expect(storyPhoto).toBeVisible();
    await expect(storyPhoto).toHaveAttribute('loading', 'lazy');
    await expect(storyPhoto).toHaveAttribute('srcset', /width=480/);

    const sharedLocation = page.locator('.shared-location-card');
    await sharedLocation.scrollIntoViewIfNeeded();
    await expect(sharedLocation).toBeVisible();
    await expect(sharedLocation).toContainText('Espaço Jardim');
    const mapLink = sharedLocation.getByRole('link', { name: 'Abrir no Google Maps' });
    await expect(mapLink).toHaveAttribute('rel', /noopener/);
    expect((await mapLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    const rsvpAction = page.getByRole('link', { name: 'Responder ao convite' });
    await rsvpAction.scrollIntoViewIfNeeded();
    await expect(rsvpAction).toBeVisible();
    expect((await rsvpAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
  });
}

test('removes non-essential movement when the visitor prefers reduced motion', async ({ page }) => {
  await publishSiteLocally(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animationNames = await page
    .locator('.reveal, .photo-chapter img')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationName));

  expect(animationNames.every((animationName) => animationName === 'none')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Informações importantes' })).toBeVisible();
});
