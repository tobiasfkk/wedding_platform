import { APIRequestContext, expect, Locator, Page, test } from '@playwright/test';

const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'e2e-admin@example.test';
const ADMIN_PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? 'e2e-password-change-me';
// Vazio na suíte integrada (API na mesma origem via proxy). No ensaio de produção, a API fica em
// outro subdomínio, como em produção.
const API = process.env['E2E_API_BASE_URL'] ?? '';

interface InvitationFixture {
  id: string;
  link: string;
}

async function loginThroughInterface(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible();
}

async function createGuestThroughInterface(page: Page, name: string): Promise<void> {
  await page.goto('/admin/guests');
  await page.getByRole('button', { name: 'Cadastrar convidado' }).first().click();
  await page.getByLabel('Nome completo').fill(name);
  await page
    .getByLabel('Contato (opcional)')
    .fill(`${name.toLowerCase().replaceAll(' ', '.')}@example.test`);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Convidado cadastrado com sucesso.' }),
  ).toBeVisible();
  await expect(page.getByRole('cell', { name })).toBeVisible();
}

async function createAndActivateInvitationThroughInterface(
  page: Page,
  groupName: string,
  guestName: string,
): Promise<string> {
  await page.goto('/admin/invitations');
  await page.getByRole('button', { name: 'Criar convite' }).first().click();
  await page.getByLabel('Nome do grupo ou responsável').fill(groupName);
  await page.getByLabel('Limite de acompanhantes').fill('1');

  const guestResult = page.locator('.eligible-list li').filter({ hasText: guestName });
  await expect(guestResult).toBeVisible();
  await guestResult.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Salvar convite' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Convite criado como rascunho.' }),
  ).toBeVisible();

  const invitationRow = page.getByRole('row').filter({ hasText: groupName });
  page.once('dialog', (dialog) => dialog.accept());
  await invitationRow.getByRole('button', { name: 'Ativar e gerar link' }).click();
  const linkField = page.getByLabel('Link individual do convite');
  await expect(linkField).toBeVisible();
  return linkField.inputValue();
}

// No WebKit mobile, o Playwright rola até o elemento de forma animada e pode clicar com a página
// ainda em movimento: o pointerup cai fora do botão e o clique se perde. Uma pessoa toca num botão
// parado; por isso rolamos antes e esperamos a página assentar.
async function tapWhenSettled(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  let previous = '';
  await expect
    .poll(
      async () => {
        const box = await target.boundingBox();
        const scroll = await target.page().evaluate(() => window.scrollY);
        const current = JSON.stringify([box?.x, box?.y, scroll]);
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { timeout: 10_000, intervals: [250] },
    )
    .toBe(true);
  await target.click();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

async function authenticateAdminApi(request: APIRequestContext): Promise<string> {
  const sessionResponse = await request.get(`${API}/api/auth/session`);
  expect(sessionResponse.ok()).toBeTruthy();
  const session = (await sessionResponse.json()) as { csrfToken: string };
  const login = await request.post(`${API}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    headers: { 'X-XSRF-TOKEN': session.csrfToken },
  });
  expect(login.ok()).toBeTruthy();
  return session.csrfToken;
}

async function createInvitationFixture(
  request: APIRequestContext,
  suffix: string,
): Promise<InvitationFixture> {
  const csrfToken = await authenticateAdminApi(request);
  const guest = await request.post(`${API}/api/admin/guests`, {
    data: { name: `Convidado ${suffix}`, contact: null, active: true },
    headers: { 'X-XSRF-TOKEN': csrfToken },
  });
  expect(guest.ok()).toBeTruthy();
  const guestBody = (await guest.json()) as { id: string };

  const invitation = await request.post(`${API}/api/admin/invitations`, {
    data: { name: `Grupo ${suffix}`, companionLimit: 0, guestIds: [guestBody.id] },
    headers: { 'X-XSRF-TOKEN': csrfToken },
  });
  expect(invitation.ok()).toBeTruthy();
  const invitationBody = (await invitation.json()) as { id: string };

  const activation = await request.post(
    `${API}/api/admin/invitations/${invitationBody.id}/activate`,
    { data: {}, headers: { 'X-XSRF-TOKEN': csrfToken } },
  );
  expect(activation.ok()).toBeTruthy();
  const activationBody = (await activation.json()) as { link: string };
  return { id: invitationBody.id, link: activationBody.link };
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
]) {
  test(`executes the critical journey at ${viewport.width}px against the real stack`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const suffix = `E2E ${viewport.width} ${testInfo.project.name} ${testInfo.repeatEachIndex}.${testInfo.retry}`;
    const guestName = `Ana ${suffix}`;
    const groupName = `Família ${suffix}`;

    await loginThroughInterface(page);
    const adminLinks = await page.locator('.page-intro').getByRole('link').allTextContents();
    expect(adminLinks).toEqual([
      'Gerenciar convidados',
      'Gerenciar convites',
      'Consultar respostas de RSVP',
      'Configurar Pix',
    ]);
    expect(await page.getByText(/editar (site|conteúdo)/i).count()).toBe(0);

    await createGuestThroughInterface(page, guestName);
    const invitationLink = await createAndActivateInvitationThroughInterface(
      page,
      groupName,
      guestName,
    );

    await page.goto(invitationLink);
    await expect(page.getByRole('heading', { name: groupName })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const invitationSession = await page.evaluate(async (api) => {
      const response = await fetch(`${api}/api/rsvp/session`, { credentials: 'include' });
      return response.json() as Promise<{
        csrfToken: string;
        invitation: { participants: { id: string }[] };
      }>;
    }, API);
    const rejectedLimit = await page.evaluate(
      async ({ api, csrfToken, participantId }) => {
        const response = await fetch(`${api}/api/rsvp/responses`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
          body: JSON.stringify({
            operationId: '00000000-0000-0000-0000-000000000099',
            participants: [{ participantId, status: 'CONFIRMED' }],
            companions: [
              { id: '00000000-0000-0000-0000-000000000091', name: 'Acompanhante um' },
              { id: '00000000-0000-0000-0000-000000000092', name: 'Acompanhante dois' },
            ],
          }),
        });
        return { status: response.status, body: await response.json() };
      },
      {
        api: API,
        csrfToken: invitationSession.csrfToken,
        participantId: invitationSession.invitation.participants[0]!.id,
      },
    );
    expect(rejectedLimit.status).toBe(409);
    expect(rejectedLimit.body.code).toBe('RSVP_SUBMISSION_CONFLICT');

    await tapWhenSettled(page.getByRole('button', { name: 'Sim' }));
    await tapWhenSettled(page.getByRole('button', { name: 'Adicionar' }));
    await page.getByLabel('Nome do acompanhante 1').fill(`Bruno ${suffix}`);
    await expect(page.getByRole('button', { name: 'Adicionar' })).toBeDisabled();

    const submissionRequest = page.waitForRequest(
      (request) => request.url().endsWith('/api/rsvp/responses') && request.method() === 'POST',
    );
    await tapWhenSettled(page.getByRole('button', { name: 'Confirmar e continuar' }));
    const submittedBody = (await submissionRequest).postDataJSON();
    await expect(page.locator('#rsvp-save-button')).toContainText('Tudo certo');

    const replay = await page.evaluate(
      async ({ api, body }) => {
        const session = await fetch(`${api}/api/rsvp/session`, { credentials: 'include' }).then(
          (response) => response.json(),
        );
        const response = await fetch(`${api}/api/rsvp/responses`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': session.csrfToken },
          body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
      },
      { api: API, body: submittedBody },
    );
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);

    await loginThroughInterface(page);
    await page.goto('/admin/rsvp');
    const dashboardInvitation = page.locator('.invitation').filter({ hasText: groupName });
    await expect(dashboardInvitation).toContainText(guestName);
    await expect(dashboardInvitation).toContainText('Confirmado');
    await expect(dashboardInvitation).toContainText(`Bruno ${suffix}`);
  });
}

test('rejects an invalid invitation without exposing its code at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#code=invalid-e2e-secret');
  await expect(page.getByRole('heading', { name: 'Acesso indisponível' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('invalid-e2e-secret');
  await expect(page).toHaveURL('/');
  await expectNoHorizontalOverflow(page);
});

test('revokes public access when an active invitation is inactivated', async ({
  page,
  request,
}, testInfo) => {
  const fixture = await createInvitationFixture(
    request,
    `inativo-${testInfo.project.name}-${testInfo.repeatEachIndex}.${testInfo.retry}`,
  );
  const sessionResponse = await request.get(`${API}/api/auth/session`);
  const session = (await sessionResponse.json()) as { csrfToken: string };
  const inactivation = await request.post(`${API}/api/admin/invitations/${fixture.id}/inactivate`, {
    data: {},
    headers: { 'X-XSRF-TOKEN': session.csrfToken },
  });
  expect(inactivation.ok()).toBeTruthy();

  await page.goto(fixture.link);
  await expect(page.getByRole('heading', { name: 'Acesso indisponível' })).toBeVisible();
});
