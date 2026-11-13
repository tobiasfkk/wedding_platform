import { defineConfig, devices } from '@playwright/test';

// Testes de fumaça contra o ambiente publicado (workflow "Production smoke tests").
//   E2E_SCOPE=readonly (padrão): só verificações que não gravam dados.
//   E2E_SCOPE=full: também a jornada crítica, que cria convidados e convites de teste. Usado apenas
//   antes do lançamento; os dados são apagados por reset-before-launch.sh.
const scope = process.env['E2E_SCOPE'] ?? 'readonly';
if (scope !== 'readonly' && scope !== 'full') throw new Error(`E2E_SCOPE inválido: ${scope}`);
process.env['E2E_API_BASE_URL'] ??= 'https://api.casamentodudatobi.tobiaskiefer.com.br';

export default defineConfig({
  testDir: '.',
  testMatch:
    scope === 'full'
      ? ['e2e-rehearsal/**/*.spec.ts', 'e2e-integrated/**/*.spec.ts']
      : ['e2e-rehearsal/**/*.spec.ts'],
  outputDir: './test-results/playwright-production',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter:
    scope === 'full'
      ? 'list'
      : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-production' }]],
  use: {
    baseURL: process.env['E2E_SITE_URL'] ?? 'https://casamentodudatobi.tobiaskiefer.com.br',
    // No escopo full a jornada digita a senha real do admin. Trace e vídeo a registrariam em
    // artefatos que, num repositório público, ficam acessíveis; por isso ficam desligados.
    screenshot: scope === 'full' ? 'off' : 'only-on-failure',
    trace: scope === 'full' ? 'off' : 'retain-on-failure',
    video: scope === 'full' ? 'off' : 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] } },
    { name: 'chromium-android', use: { ...devices['Pixel 7'] } },
  ],
});
