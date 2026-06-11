import { test, expect } from '@fixtures';
import { giftIds } from '@data/gift-allocation';

test.describe('Market API @api @market', () => {
  test('gifts list matches the contract @smoke', async ({ readMarket }) => {
    const { gifts } = await readMarket.catalog.getGifts();
    expect(gifts.length).toBeGreaterThan(0);
  });

  test('two buyers, one gift: exactly one wins, the other gets 409', async ({ market }) => {
    const id = await market.catalog.firstListedGiftId();

    const [first, second] = await Promise.all([
      market.catalog.buyResponse(id),
      market.catalog.buyResponse(id),
    ]);

    const statuses = [first.status(), second.status()].sort();
    expect(statuses).toEqual([200, 409]);
  });

  test('me returns the validated Telegram identity', async ({ readMarket, readUser }) => {
    const { user } = await readMarket.account.getMe();
    expect(user.id).toBe(readUser.id);
  });

  test('after buying, the gift reads back as sold to me', async ({ market, tgUser }) => {
    await market.catalog.buy(giftIds.marketSoldReadback);
    const { gifts } = await market.catalog.getGifts();
    const gift = gifts.find((g) => g.id === giftIds.marketSoldReadback);
    expect(gift?.status).toBe('sold');
    expect(gift?.soldTo).toBe(tgUser.first_name);
  });
});
