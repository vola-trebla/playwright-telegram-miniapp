import { test, expect } from '@playwright/test';
import { config } from '@utils/config';
import { installTelegramWebApp } from '@utils/telegram-mock';
import { recordWebSocket } from '@utils/ws-recorder';
import { MiniAppPage } from '@pages/MiniAppPage';

test.describe('Realtime across clients @web @realtime', () => {
  test("one client's buy flips the gift to SOLD on another, live", async ({ browser }) => {
    const ctxA = await browser.newContext({ baseURL: config.marketBaseUrl });
    const ctxB = await browser.newContext({ baseURL: config.marketBaseUrl });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await installTelegramWebApp(pageA, { id: 101, first_name: 'Alice' });
    await installTelegramWebApp(pageB, { id: 102, first_name: 'Bob' });

    const alice = new MiniAppPage(pageA);
    const bob = new MiniAppPage(pageB);

    const bobWs = recordWebSocket(pageB);

    await alice.open();
    await bob.open();

    const id = '5'; // dedicated gift — others use 3 (web), 4/7/8 (cross-system), 9 (market), 10 (user-identity)

    try {
      await expect(bob.buyButton(id)).toBeEnabled();

      await alice.buy(id);
      await expect(bob.buyButton(id)).toBeDisabled();
      await expect(bob.buyButton(id)).toContainText('SOLD');

      const sold = await bobWs.waitForFrame((m) => m.type === 'sold' && m.id === id);
      expect(sold.buyer).toBe('Alice');
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
