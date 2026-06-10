import { test, expect } from '@fixtures';

test.describe('Idempotency @api @money', () => {
  test('a retried buy with the same key charges exactly once', async ({ market }) => {
    const key = `idem-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const before = (await market.wallet.getBalance()).balanceTon;

    const first = await market.catalog.buy('14', { idempotencyKey: key });
    const second = await market.catalog.buy('14', { idempotencyKey: key });

    // The replay returns the first result verbatim — same gift, same balance snapshot.
    expect(second.gift.id).toBe(first.gift.id);
    expect(second.balanceAfter).toBe(first.balanceAfter);
    // And the balance moved only once.
    expect((await market.wallet.getBalance()).balanceTon).toBe(before - first.gift.priceTon);
  });

  test('a different key re-evaluates (no stale cached success)', async ({ market }) => {
    await market.catalog.buy('6', { idempotencyKey: 'key-A' }); // sells gift 6
    // Same gift, NEW key → the request is processed fresh and sees it already sold.
    const res = await market.catalog.buyResponse('6', { idempotencyKey: 'key-B' });
    expect(res.status()).toBe(409);
  });
});
