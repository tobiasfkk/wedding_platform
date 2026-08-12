import { expect, Page, test } from '@playwright/test';

const invitation = {
  groupName: 'Família Exemplo com nome longo',
  companionLimit: 2,
  editable: true,
  participants: [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Ana Exemplo', status: 'PENDING' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Bruno Exemplo', status: 'DECLINED' },
  ],
  companions: [],
};

async function mockIdentifiedInvitation(page: Page): Promise<void> {
  await page.route('**/api/rsvp/session', (route) =>
    route.fulfill({
      json: {
        identified: true,
        invitation,
        csrfToken: 'csrf-for-browser-test',
      },
    }),
  );
  await page.route('**/api/rsvp/responses', async (route) => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      json: {
        savedAt: '2026-08-04T12:00:00Z',
        replayed: false,
        invitation: {
          ...invitation,
          participants: request.participants.map(
            (participant: { participantId: string; status: string }, index: number) => ({
              id: participant.participantId,
              name: invitation.participants[index].name,
              status: participant.status,
            }),
          ),
          companions: request.companions,
        },
      },
    });
  });
  await page.route('**/api/rsvp/access', (route) => route.fulfill({ json: invitation }));
}

test('opens an individual invitation inside the single-page wedding journey', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await mockIdentifiedInvitation(page);
  await page.goto('/#code=individual-secret-code');

  await expect(page).toHaveURL('/');
  await expect(page.locator('.app-header')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Maria Eduarda');
  const group = page.getByRole('heading', { name: invitation.groupName });
  await group.scrollIntoViewIfNeeded();
  await expect(group).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const selectorFor = (element: Element): string => {
      if (element.id) return `#${element.id}`;
      const classes = Array.from(element.classList).slice(0, 3).join('.');
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const candidates = Array.from(document.querySelectorAll('*')).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const outlineOverflow = Math.max(
        0,
        Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset),
      );
      return {
        selector: selectorFor(element),
        left: Math.round(rect.left * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        visualRight: Math.round((rect.right + outlineOverflow) * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        display: style.display,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        overflowX: style.overflowX,
        outline: `${style.outlineWidth} ${style.outlineOffset}`,
      };
    });
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth,
      activeElement: document.activeElement ? selectorFor(document.activeElement) : null,
      overflowingElements: candidates
        .filter(
          (candidate) =>
            candidate.left < -0.5 ||
            candidate.visualRight > viewportWidth + 0.5 ||
            candidate.scrollWidth > candidate.clientWidth + 1,
        )
        .sort((left, right) => right.visualRight - left.visualRight)
        .slice(0, 12),
      rightmostElements: candidates
        .sort((left, right) => right.visualRight - left.visualRight)
        .slice(0, 8),
    };
  });
  expect(
    dimensions.scrollWidth,
    `A página possui ${dimensions.scrollWidth}px para uma viewport de ${dimensions.viewportWidth}px. Diagnóstico: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth);
}

for (const width of [320, 360, 390, 430]) {
  test(`keeps the complete RSVP usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockIdentifiedInvitation(page);
    await page.goto('/rsvp');

    await expect(page.getByRole('heading', { name: invitation.groupName })).toBeFocused();
    await expectNoHorizontalOverflow(page);

    const buttons = page.locator('.rsvp-card button:not([disabled])');
    for (let index = 0; index < (await buttons.count()); index++) {
      expect((await buttons.nth(index).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole('button', { name: 'Vou participar' }).first().click();
    await page.getByRole('button', { name: 'Adicionar' }).click();
    const companion = page.getByLabel('Nome do acompanhante 1');
    await expect(companion).toBeFocused();
    await companion.fill('Carla Exemplo');
    await companion.press('Enter');

    await expect(page.locator('#rsvp-save-result')).toBeFocused();
    await expectNoHorizontalOverflow(page);
  });
}

test('preserves validation and focus while editing companions on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await mockIdentifiedInvitation(page);
  let submissions = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/rsvp/responses')) submissions++;
  });
  await page.goto('/rsvp');

  await page.getByRole('button', { name: 'Adicionar' }).click();
  const firstCompanion = page.getByLabel('Nome do acompanhante 1');
  await firstCompanion.press('Enter');
  expect(submissions).toBe(0);
  await expect(page.getByText('Informe o nome do acompanhante.')).toBeVisible();

  await firstCompanion.fill('Carla');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  const secondCompanion = page.getByLabel('Nome do acompanhante 2');
  await secondCompanion.fill('Daniel');
  await page.getByRole('button', { name: 'Remover acompanhante 1' }).click();
  await expect(page.getByLabel('Nome do acompanhante 1')).toBeFocused();
});

test('keeps invalid links private and usable at the minimum width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route('**/api/rsvp/session', (route) =>
    route.fulfill({ json: { identified: false, invitation: null, csrfToken: 'csrf' } }),
  );
  await page.route('**/api/rsvp/access', (route) =>
    route.fulfill({ status: 401, json: { code: 'RSVP_ACCESS_INVALID' } }),
  );
  await page.goto('/rsvp#code=secret-invalid-code');

  await expect(page.getByRole('heading', { name: 'Acesso indisponível' })).toBeFocused();
  await expect(page.locator('body')).not.toContainText('secret-invalid-code');
  await expectNoHorizontalOverflow(page);
});
