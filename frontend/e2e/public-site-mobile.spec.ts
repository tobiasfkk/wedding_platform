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
    schedule: [
      {
        type: 'CEREMONY',
        eyebrow: '01 · Cerimônia',
        title: 'O nosso sim',
        time: '16h',
        venue: 'Espaço Jardim',
        address: 'Rua das Flores, 100',
      },
      {
        type: 'RECEPTION',
        eyebrow: '02 · Recepção',
        title: 'Vamos celebrar',
        time: 'Após a cerimônia',
        venue: 'Salão Jardim',
        address: 'No mesmo local',
      },
    ],
    notices: ['Chegue com antecedência.'],
    rsvp: {
      eyebrow: 'Confirmação de presença',
      title: 'Sua presença faz parte desta história.',
      description: 'Use o seu convite individual para responder.',
    },
    sectionOrder: ['STORY', 'SCHEDULE', 'NOTICES', 'RSVP'],
  },
  version: 1,
  publishedAt: '2027-01-01T12:00:00Z',
};

async function publishSiteLocally(page: Page): Promise<void> {
  await page.route('**/api/public/site', (route) => route.fulfill({ json: publishedSite }));
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
    .locator('.reveal')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationName));

  expect(animationNames.every((animationName) => animationName === 'none')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Informações importantes' })).toBeVisible();
});
