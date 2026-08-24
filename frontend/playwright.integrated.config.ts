import { defineConfig } from '@playwright/test';
import path from 'node:path';

const frontendDirectory = process.cwd();
const backendDirectory = path.resolve(frontendDirectory, '../backend');
const backendCommand =
  process.platform === 'win32'
    ? '.\\mvnw.cmd --batch-mode --no-transfer-progress spring-boot:run'
    : './mvnw --batch-mode --no-transfer-progress spring-boot:run';

export default defineConfig({
  testDir: './e2e-integrated',
  outputDir: './test-results/playwright-integrated',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4212',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: backendCommand,
      cwd: backendDirectory,
      env: {
        ...process.env,
        ADMIN_INITIAL_EMAIL: 'e2e-admin@example.test',
        ADMIN_INITIAL_PASSWORD: 'e2e-password-change-me',
        AUTH_ALLOWED_ORIGINS: 'http://127.0.0.1:4212',
        POSTGRES_DB: 'wedding_e2e',
        POSTGRES_HOST: '127.0.0.1',
        POSTGRES_PASSWORD: 'wedding_e2e_local',
        POSTGRES_PORT: process.env['E2E_POSTGRES_PORT'] ?? '55432',
        POSTGRES_USER: 'wedding_e2e',
        PUBLIC_SITE_URL: 'http://127.0.0.1:4212',
        SERVER_PORT: '8081',
        SPRING_PROFILES_ACTIVE: 'local',
      },
      url: 'http://127.0.0.1:8081/actuator/health',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command:
        'npx ng serve --proxy-config proxy.integrated.conf.json --host 127.0.0.1 --port 4212',
      cwd: frontendDirectory,
      url: 'http://127.0.0.1:4212',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
