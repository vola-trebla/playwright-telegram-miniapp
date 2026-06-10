import { test, expect } from '@fixtures';
import { timeouts } from '@data/constants';

test.describe('Settlement (semi on-chain) @api @money', () => {
  test('a buy settles asynchronously: pending first, then settled', async ({ market }) => {
    const { txId } = await market.buy('16');
    expect(txId, 'buy should return a settlement txId').toBeTruthy();

    // Right after the buy the on-chain settlement is still pending.
    expect((await market.getTx(txId!)).status).toBe('pending');

    // It flips to settled — assert by polling, never by sleeping.
    await expect
      .poll(async () => (await market.getTx(txId!)).status, { timeout: timeouts.FIVE_SECONDS })
      .toBe('settled');
  });
});
