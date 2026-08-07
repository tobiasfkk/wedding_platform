import { expect, Page, test } from '@playwright/test';

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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animationNames = await page
    .locator('.reveal')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationName));

  expect(animationNames.every((animationName) => animationName === 'none')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Informações importantes' })).toBeVisible();
});
