import { test, expect } from '@fixtures';
import { giftIds } from '@data/gift-allocation';

test.describe('Wallet @api @money', () => {
  test('fresh user has a positive starting balance @smoke', async ({ market }) => {
    const { balanceTon } = await market.wallet.getBalance();
    expect(balanceTon).toBeGreaterThan(0);
  });

  test('deposit increases the balance', async ({ market }) => {
    const before = (await market.wallet.getBalance()).balanceTon;
    const after = (await market.wallet.deposit(500)).balanceTon;
    expect(after).toBe(before + 500);
  });

  test('withdraw decreases the balance', async ({ market }) => {
    const before = (await market.wallet.getBalance()).balanceTon;
    const after = (await market.wallet.withdraw(300)).balanceTon;
    expect(after).toBe(before - 300);
  });

  test('withdraw above balance is rejected with 402', async ({ market }) => {
    const { balanceTon } = await market.wallet.getBalance();
    const res = await market.wallet.withdrawResponse(balanceTon + 1);
    expect(res.status()).toBe(402);
  });

  test('buying debits exactly the gift price', async ({ market }) => {
    const before = (await market.wallet.getBalance()).balanceTon;
    const { gift, balanceAfter } = await market.catalog.buy(giftIds.walletDebit);
    expect(balanceAfter).toBe(before - gift.priceTon);
    expect((await market.wallet.getBalance()).balanceTon).toBe(before - gift.priceTon);
  });

  test('buying with insufficient balance is rejected with 402', async ({ market }) => {
    const { balanceTon } = await market.wallet.getBalance();
    await market.wallet.withdraw(balanceTon); // drain to 0
    const res = await market.catalog.buyResponse(giftIds.walletInsufficient);
    expect(res.status()).toBe(402);
  });
});
