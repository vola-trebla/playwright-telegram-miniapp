import { test, expect } from '@fixtures';
import { ErrorResponseSchema } from '@services/schemas';
import { giftIds } from '@data/gift-allocation';

test.describe('Payments / top-up @api @money', () => {
  test('invoice carries the right amount, provider and intent link @smoke', async ({ market }) => {
    const invoice = await market.payments.createInvoice(750, 'stars');
    expect(invoice.amountTon).toBe(750);
    expect(invoice.provider).toBe('stars');
    expect(invoice.payload).toBe('topup:750');
    expect(invoice.link).toContain(invoice.invoiceId);
  });

  test('paying an invoice credits the balance', async ({ market }) => {
    const before = (await market.wallet.getBalance()).balanceTon;
    const invoice = await market.payments.createInvoice(1000, 'ton');
    const { balanceTon } = await market.payments.payInvoice(invoice.invoiceId);
    expect(balanceTon).toBe(before + 1000);
  });

  test('paying the same invoice twice is rejected with 409', async ({ market }) => {
    const invoice = await market.payments.createInvoice(200, 'stars');
    await market.payments.payInvoice(invoice.invoiceId);
    const res = await market.payments.payInvoiceResponse(invoice.invoiceId);
    expect(res.status()).toBe(409);
  });

  test('paying an unknown invoice returns 404 with a contract-shaped error', async ({ market }) => {
    const res = await market.payments.payInvoiceResponse('no-such-invoice');
    expect(res.status()).toBe(404);
    expect(ErrorResponseSchema.parse(await res.json()).error).toContain('not found');
  });

  test('invalid invoice params are rejected with 400', async ({ market }) => {
    expect((await market.payments.createInvoiceResponse(0, 'stars')).status()).toBe(400);
    expect((await market.payments.createInvoiceResponse(100, 'card')).status()).toBe(400);
  });

  test('end-to-end: drain, top up via invoice, then buy off the credited balance', async ({
    market,
  }) => {
    const { balanceTon } = await market.wallet.getBalance();
    await market.wallet.withdraw(balanceTon); // → 0
    const invoice = await market.payments.createInvoice(5000, 'ton');
    await market.payments.payInvoice(invoice.invoiceId); // balance → 5000
    const { gift, balanceAfter } = await market.catalog.buy(giftIds.paymentsTopUp);
    expect(balanceAfter).toBe(5000 - gift.priceTon);
  });
});
