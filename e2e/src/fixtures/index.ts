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

// У нас два вида юзеров для тестов.
//
// Тесты, которые НИЧЕГО не меняют (смотрят каталог, /api/me) — могут ходить под одним
// общим юзером. Нет смысла плодить нового на каждый тест. Заводим его один раз и
// переиспользуем. Это readUser / readMarket / readMiniApp.
//
// Тесты, которые МЕНЯЮТ данные (покупка) — каждому нужен свой свежий юзер, чтобы они не
// мешали друг другу. Это tgUser / market / miniApp.

// Общий юзер «только смотрит». Создаётся один раз и живёт, пока живёт воркер.
type WorkerFixtures = {
  readUser: TgUser; // сам юзер (Reader_0, Reader_1, ...)
  readMarket: MarketApi; // API-клиент от его имени
};

// Свежий юзер «меняет данные». Новый на каждый тест.
type Fixtures = {
  tgUser: TgUser; // сам юзер (Tester_<случайное число>)
  market: MarketApi; // API-клиент от его имени
  miniApp: MiniAppPage; // Mini App, открытый от его имени
  readMiniApp: MiniAppPage; // Mini App, открытый от имени общего «читателя»
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  // === Общий юзер «только смотрит» ===

  // Один юзер на воркер. id берём заведомо большим, чтобы не совпасть со свежими юзерами.
  readUser: [
    async ({}, use, workerInfo) => {
      const id = 1_000_000_000 + workerInfo.workerIndex;
      await use({ id, first_name: `Reader_${workerInfo.workerIndex}` });
    },
    { scope: 'worker' },
  ],

  // API-клиент от имени общего юзера. Подписываем initData один раз на воркер и переиспользуем.
  readMarket: [
    async ({ playwright, readUser }, use) => useSignedMarket(playwright, readUser, use),
    { scope: 'worker' },
  ],

  // Mini App, открытый от имени общего юзера.
  readMiniApp: async ({ page, readUser }, use) => {
    await installTelegramWebApp(page, readUser);
    await use(new MiniAppPage(page));
  },

  // === Свежий юзер «меняет данные» ===

  // Новый случайный юзер на каждый тест.
  tgUser: async ({}, use) => {
    const id = crypto.randomInt(100_000, 999_999_999);
    await use({ id, first_name: `Tester_${id}` });
  },

  // API-клиент от имени свежего юзера. Контекст закрываем после теста.
  market: async ({ playwright, tgUser }, use) => useSignedMarket(playwright, tgUser, use),

  // Mini App под свежим юзером.
  miniApp: async ({ page, tgUser }, use) => {
    await installTelegramWebApp(page, tgUser);
    await use(new MiniAppPage(page));
  },
});

export { expect };
export type { TgUser };
