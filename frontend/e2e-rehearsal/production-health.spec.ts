import { expect, Page, test } from '@playwright/test';

const API = process.env['E2E_API_BASE_URL'] ?? '';

interface PageProblems {
  errors: string[];
  apiHosts: Set<string>;
  pending: Promise<void>[];
}

// Registra qualquer erro que um convidado poderia encontrar: exceções JavaScript, erros no console,
// requisições que falharam e respostas HTTP de erro.
function watch(page: Page): PageProblems {
  const problems: PageProblems = { errors: [], apiHosts: new Set(), pending: [] };
  page.on('pageerror', (error) => problems.errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    problems.pending.push(
      (async () => {
        const failure = request.failure()?.errorText ?? '';
        // O FetchBackend do Angular chama abort() ao encerrar toda requisição, inclusive as já
        // concluídas; o Chromium às vezes registra isso como ERR_ABORTED depois da resposta 200.
        // Sem efeito para o usuário. Só é tolerado quando a resposta realmente chegou.
        if (failure === 'net::ERR_ABORTED' && (await request.response())?.ok()) return;
        problems.errors.push(`requestfailed: ${request.url()} ${failure}`);
      })(),
    );
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/')) problems.apiHosts.add(url.origin);
    if (response.status() >= 400) problems.errors.push(`HTTP ${response.status()}: ${url.href}`);
  });
  return problems;
}

for (const [path, callsApi] of [
  ['/', true],
  ['/rsvp', true],
  ['/admin/login', false],
] as const) {
  test(`opens ${path} directly without any error`, async ({ page }) => {
    const problems = watch(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await Promise.all(problems.pending);

    expect(problems.errors).toEqual([]);
    expect(problems.apiHosts.size > 0).toBe(callsApi);
    // Toda chamada do build de produção vai ao subdomínio da API, nunca à origem do Pages.
    for (const host of problems.apiHosts) expect(host).toBe(API);
  });
}

test('redirects the protected admin area to login without errors', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login\?returnUrl=%2Fadmin$/);
  await page.waitForLoadState('networkidle');
  await Promise.all(problems.pending);
  expect(problems.errors).toEqual([]);
});

test('serves index.html and every script it references', async ({ request }) => {
  const index = await request.get('/');
  expect(index.status()).toBe(200);
  expect(index.headers()['content-type']).toContain('text/html');

  const html = await index.text();
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((match) => match[1]!);
  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts) {
    const asset = await request.get(`/${script.replace(/^\//, '')}`);
    expect(asset.status(), script).toBe(200);
    expect(asset.headers()['content-type'], script).toContain('javascript');
  }
});

test('keeps the API surface closed to other origins and hides internals', async ({ request }) => {
  const actuator = await request.get(`${API}/actuator/health`);
  expect(actuator.status()).toBe(404);

  const preflight = await request.fetch(`${API}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://example.com',
      'Access-Control-Request-Method': 'POST',
    },
  });
  expect(preflight.status()).toBe(403);
  expect(preflight.headers()['access-control-allow-origin']).toBeUndefined();

  const session = await request.get(`${API}/api/rsvp/session`);
  expect(session.status()).toBe(200);
  expect(session.headers()['strict-transport-security']).toContain('max-age=');
  const cookie = session.headers()['set-cookie'] ?? '';
  expect(cookie).toContain('Secure');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
});
