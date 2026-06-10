import { defineConfig, devices } from '@playwright/test';
import { config } from './src/utils/config';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Retries reveal flakiness on CI; they do not exist to hide it.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [['blob'], ['github'], ['allure-playwright']]
    : [['html', { open: 'never' }], ['list'], ['allure-playwright']],

  // Boot the product under test with STRICT initData validation (no DEV_MODE bypass),
  // so the suite exercises the same auth the real backend enforces. Fresh state per run.
  // Locally an already-running :3100 is reused; on CI it is always started here.
  webServer: {
    command: 'npm run start -w apps/backend',
    cwd: '..',
    url: config.marketBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { PORT: '3100', DEV_MODE: 'false', BOT_TOKEN: config.testBotToken },
  },

  use: {
    baseURL: config.marketBaseUrl,
    // Our Mini App tags interactive elements with data-test (e.g. the Buy button).
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      // API + WebSocket tests need no browser; they drive Playwright's request context.
      name: 'api',
      testDir: './tests/api',
    },
    {
      // Mini App UI: a real browser with a mocked Telegram.WebApp + signed initData.
      name: 'web',
      testDir: './tests/web',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
