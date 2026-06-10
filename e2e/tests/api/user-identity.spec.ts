import { test, expect } from '@fixtures';

test.describe('tgUser isolation', () => {
  test('каждый тест получает уникального юзера', async ({ tgUser }) => {
    console.log('[tgUser]', tgUser);
    expect(tgUser.id).toBeGreaterThanOrEqual(100_000);
    expect(tgUser.id).toBeLessThanOrEqual(999_999_999);
    expect(tgUser.first_name).toBe(`Tester_${tgUser.id}`);
  });

  test('/api/me возвращает того же юзера что в fixture', async ({ market, tgUser }) => {
    console.log('[tgUser]', tgUser);
    const { user } = await market.getMe();
    console.log('[/api/me]', user);
    expect(user.id).toBe(tgUser.id);
  });

  test('после покупки soldTo = наш юзер', async ({ market, tgUser }) => {
    console.log('[tgUser]', tgUser);
    const id = '10'; // dedicated gift so it never sweeps into other specs' gifts
    const { gift } = await market.buy(id);
    console.log('[купленный подарок]', gift);
    expect(gift.soldTo).toBe(tgUser.first_name);
    expect(gift.status).toBe('sold');
  });
});
