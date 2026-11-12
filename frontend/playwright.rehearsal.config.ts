import { defineConfig, devices } from '@playwright/test';

// Ensaio de produção: roda os fluxos críticos contra o build de produção servido pelo Wrangler
// (Cloudflare Pages) e a API real atrás do Caddy, nos domínios reais, com HTTPS da CA local do
// Caddy. Executado dentro da rede Docker por infrastructure/production/rehearsal/run-rehearsal.sh.
const siteUrl = process.env['E2E_SITE_URL'];
if (!siteUrl || !process.env['E2E_API_BASE_URL']) {
  throw new Error('Defina E2E_SITE_URL e E2E_API_BASE_URL (use run-rehearsal.sh).');
}

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e-rehearsal/**/*.spec.ts', 'e2e-integrated/**/*.spec.ts'],
  outputDir: './test-results/playwright-rehearsal',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-rehearsal' }]],
  use: {
    baseURL: siteUrl,
    // Certificados emitidos pela CA interna do Caddy no ensaio; em produção são Let's Encrypt.
    ignoreHTTPSErrors: true,
    reducedMotion: process.env['E2E_REDUCED_MOTION'] === '1' ? 'reduce' : 'no-preference',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] } },
    { name: 'chromium-android', use: { ...devices['Pixel 7'] } },
  ],
});
