import { test, expect } from '@fixtures';
import { giftIds } from '@data/gift-allocation';

test.describe('Mini App UI @web', () => {
  test('identifies the Telegram user from initData @smoke', async ({ readMiniApp, readUser }) => {
    await readMiniApp.open();
    await expect(readMiniApp.who).toContainText(readUser.first_name);
    await expect(readMiniApp.who).toContainText(String(readUser.id));
  });

  test('buying a gift flips its card to SOLD', async ({ miniApp }) => {
    await miniApp.open();
    const id = giftIds.webBuy;
    const btn = miniApp.buyButton(id);

    await expect(btn).toBeEnabled();
    await miniApp.buy(id);

    await expect(btn).toBeDisabled();
    await expect(btn).toContainText('SOLD');
    await expect(miniApp.liveFeed).toContainText('bought');
  });
});
