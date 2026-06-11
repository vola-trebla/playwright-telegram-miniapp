import { test, expect } from '@fixtures';
import { giftIds } from '@data/gift-allocation';

test.describe('tgUser isolation', () => {
  test('каждый тест получает уникального юзера', async ({ tgUser }) => {
    expect(tgUser.id).toBeGreaterThanOrEqual(100_000);
    expect(tgUser.id).toBeLessThanOrEqual(999_999_999);
    expect(tgUser.first_name).toBe(`Tester_${tgUser.id}`);
  });

  test('/api/me возвращает того же юзера что в fixture', async ({ market, tgUser }) => {
    const { user } = await market.account.getMe();
    expect(user.id).toBe(tgUser.id);
  });

  test('после покупки soldTo = наш юзер', async ({ market, tgUser }) => {
    const { gift } = await market.catalog.buy(giftIds.userIdentity);
    expect(gift.soldTo).toBe(tgUser.first_name);
    expect(gift.status).toBe('sold');
  });
});
