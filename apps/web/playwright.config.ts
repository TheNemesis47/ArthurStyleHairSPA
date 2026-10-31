import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test della vetrina (docs/15). Richiede una build: `pnpm build` poi `pnpm test:e2e`.
 * @playwright/test è fissato alla versione del Chromium preinstallato nell'ambiente.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
