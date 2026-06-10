import { test, expect } from '@playwright/test';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';
import { ErrorResponseSchema } from '@services/schemas';

const BASE = config.marketBaseUrl;
const TOKEN = config.testBotToken;

const auth = (initData: string) => ({ 'x-telegram-init-data': initData });
const freshUser = (over: Record<string, unknown> = {}): string =>
  buildSignedInitData({ id: 999, first_name: 'Mallory', ...over }, TOKEN);

test.describe('Security & edge @api @security @edge', () => {
  test('a stale auth_date is rejected even with a valid signature (replay protection)', async ({
    request,
  }) => {
    const stale = buildSignedInitData({ id: 5 }, TOKEN, { auth_date: '1700000000' });
    const res = await request.get(`${BASE}/api/me`, { headers: auth(stale) });
    expect(res.status()).toBe(401);
  });

  test('the buyer is the signed identity, never the request body (no impersonation)', async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/buy`, {
      headers: auth(freshUser()),
      data: { id: '2', soldTo: 'Victim', user: { id: 1, first_name: 'Victim' } },
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).gift.soldTo).toBe('Mallory');
  });

  test('buying a non-existent gift returns 404 with a contract-shaped error', async ({
    request,
  }) => {
    const res = await request.post(`${BASE}/api/buy`, {
      headers: auth(freshUser()),
      data: { id: 'does-not-exist' },
    });
    expect(res.status()).toBe(404);
    // The error body is a contract too — validate its shape, not just the status.
    const body = ErrorResponseSchema.parse(await res.json());
    expect(body.error).toContain('not found');
  });

  test('a buy without a gift id returns 400, not a 404 or a crash', async ({ request }) => {
    const res = await request.post(`${BASE}/api/buy`, { headers: auth(freshUser()), data: {} });
    expect(res.status()).toBe(400);
    expect(ErrorResponseSchema.parse(await res.json()).error).toBeTruthy();
  });
});
