import crypto from 'node:crypto';
import { test as base, expect, type PlaywrightWorkerArgs } from '@playwright/test';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';
import { installTelegramWebApp, type TgUser } from '@utils/telegram-mock';
import { MarketApi } from '@services/MarketApi';
import { MiniAppPage } from '@pages/MiniAppPage';

/**
 * Build a MarketApi on a request context signed as `user`, hand it to the test, then dispose.
 * Shared by both the read (worker-scoped) and write (test-scoped) market fixtures.
 */
async function useSignedMarket(
  playwright: PlaywrightWorkerArgs['playwright'],
  user: TgUser,
  use: (market: MarketApi) => Promise<void>,
): Promise<void> {
  const initData = buildSignedInitData(user, config.testBotToken);
  const ctx = await playwright.request.newContext({
    baseURL: config.marketBaseUrl,
    extraHTTPHeaders: { 'x-telegram-init-data': initData },
  });
  await use(new MarketApi(ctx));
  await ctx.dispose();
}

// We have two kinds of test users.
//
// Tests that change NOTHING (browse the catalog, /api/me) can share one user — no point
// spawning a new one per test. Create it once and reuse it. That's readUser / readMarket /
// readMiniApp.
//
// Tests that CHANGE data (buying) each need their own fresh user, so they don't step on each
// other. That's tgUser / market / miniApp.

// Shared "read-only" user. Created once and lives as long as the worker.
type WorkerFixtures = {
  readUser: TgUser; // the user itself (Reader_0, Reader_1, ...)
  readMarket: MarketApi; // API client acting as it
};

// Fresh "writes data" user. New for every test.
type Fixtures = {
  tgUser: TgUser; // the user itself (Tester_<random number>)
  market: MarketApi; // API client acting as it
  miniApp: MiniAppPage; // Mini App opened as it
  readMiniApp: MiniAppPage; // Mini App opened as the shared reader
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  // === Shared "read-only" user ===

  // One user per worker. id is deliberately large so it can't clash with the fresh users.
  readUser: [
    async ({}, use, workerInfo) => {
      const id = 1_000_000_000 + workerInfo.workerIndex;
      await use({ id, first_name: `Reader_${workerInfo.workerIndex}` });
    },
    { scope: 'worker' },
  ],

  // API client acting as the shared user. Sign initData once per worker and reuse it.
  readMarket: [
    async ({ playwright, readUser }, use) => useSignedMarket(playwright, readUser, use),
    { scope: 'worker' },
  ],

  // Mini App opened as the shared user.
  readMiniApp: async ({ page, readUser }, use) => {
    await installTelegramWebApp(page, readUser);
    await use(new MiniAppPage(page));
  },

  // === Fresh "writes data" user ===

  // A new random user for every test.
  tgUser: async ({}, use) => {
    const id = crypto.randomInt(100_000, 999_999_999);
    await use({ id, first_name: `Tester_${id}` });
  },

  // API client acting as the fresh user. Dispose the context after the test.
  market: async ({ playwright, tgUser }, use) => useSignedMarket(playwright, tgUser, use),

  // Mini App as the fresh user.
  miniApp: async ({ page, tgUser }, use) => {
    await installTelegramWebApp(page, tgUser);
    await use(new MiniAppPage(page));
  },
});

export { expect };
export type { TgUser };
