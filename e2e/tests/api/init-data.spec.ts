import { test, expect } from '@playwright/test';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';
import { MeResponseSchema } from '@services/schemas';

const BASE = config.marketBaseUrl;
const TOKEN = config.testBotToken;

test.describe('initData auth @api @security', () => {
  test('missing initData is rejected with 401 @smoke', async ({ request }) => {
    const res = await request.get(`${BASE}/api/me`);
    expect(res.status()).toBe(401);
  });

  test('forged initData (tampered hash) is rejected with 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/me`, {
      headers: { 'x-telegram-init-data': 'user=%7B%22id%22%3A999%7D&hash=deadbeef' },
    });
    expect(res.status()).toBe(401);
  });

  test('properly signed initData is accepted and identifies the user', async ({ request }) => {
    const initData = buildSignedInitData({ id: 42, first_name: 'Tester' }, TOKEN);
    const res = await request.get(`${BASE}/api/me`, {
      headers: { 'x-telegram-init-data': initData },
    });
    expect(res.status()).toBe(200);
    const { user } = MeResponseSchema.parse(await res.json());
    expect(user.id).toBe(42);
  });

  test('a valid signature for a DIFFERENT token is rejected (wrong bot)', async ({ request }) => {
    const initData = buildSignedInitData({ id: 42 }, 'some-other-bot-token');
    const res = await request.get(`${BASE}/api/me`, {
      headers: { 'x-telegram-init-data': initData },
    });
    expect(res.status()).toBe(401);
  });
});
