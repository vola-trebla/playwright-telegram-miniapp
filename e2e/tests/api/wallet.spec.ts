import { test, expect } from '@fixtures';

test.describe('Wallet @api @money', () => {
  test('fresh user has a positive starting balance', async ({ market }) => {
    const { balanceTon } = await market.getBalance();
    expect(balanceTon).toBeGreaterThan(0);
  });

  test('deposit increases the balance', async ({ market }) => {
    const before = (await market.getBalance()).balanceTon;
    const after = (await market.deposit(500)).balanceTon;
    expect(after).toBe(before + 500);
  });

  test('withdraw decreases the balance', async ({ market }) => {
    const before = (await market.getBalance()).balanceTon;
    const after = (await market.withdraw(300)).balanceTon;
    expect(after).toBe(before - 300);
  });

  test('withdraw above balance is rejected with 402', async ({ market }) => {
    const { balanceTon } = await market.getBalance();
    const res = await market.withdrawResponse(balanceTon + 1);
    expect(res.status()).toBe(402);
  });

  test('buying debits exactly the gift price', async ({ market }) => {
    const before = (await market.getBalance()).balanceTon;
    const { gift, balanceAfter } = await market.buy('13');
    expect(balanceAfter).toBe(before - gift.priceTon);
    expect((await market.getBalance()).balanceTon).toBe(before - gift.priceTon);
  });

  test('buying with insufficient balance is rejected with 402', async ({ market }) => {
    const { balanceTon } = await market.getBalance();
    await market.withdraw(balanceTon); // drain to 0
    const res = await market.buyResponse('18'); // Bubble Gum, 12 TON — never sells (402)
    expect(res.status()).toBe(402);
  });
});
