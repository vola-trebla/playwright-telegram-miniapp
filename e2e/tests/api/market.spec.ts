import { test, expect } from '@fixtures';

test.describe('Market API @api @market', () => {
  test('gifts list matches the contract @smoke', async ({ readMarket }) => {
    const { gifts } = await readMarket.getGifts();
    expect(gifts.length).toBeGreaterThan(0);
  });

  test('two buyers, one gift: exactly one wins, the other gets 409', async ({ market }) => {
    const id = await market.firstListedGiftId();

    const [first, second] = await Promise.all([market.buyResponse(id), market.buyResponse(id)]);

    const statuses = [first.status(), second.status()].sort();
    expect(statuses).toEqual([200, 409]);
  });

  test('me returns the validated Telegram identity', async ({ readMarket, readUser }) => {
    const { user } = await readMarket.getMe();
    expect(user.id).toBe(readUser.id);
  });

  test('after buying, the gift reads back as sold to me', async ({ market, tgUser }) => {
    await market.buy('9');
    const { gifts } = await market.getGifts();
    const gift = gifts.find((g) => g.id === '9');
    expect(gift?.status).toBe('sold');
    expect(gift?.soldTo).toBe(tgUser.first_name);
  });
});
