import { test, expect } from '@fixtures';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';

test.describe('Concurrency @api @money', () => {
  test('N buyers race for one gift: exactly one wins, the rest get 409', async ({ playwright }) => {
    const N = 5;
    const giftId = '15';

    // N independent signed clients (distinct identities, disjoint id range).
    const contexts = await Promise.all(
      Array.from({ length: N }, (_, i) => {
        const initData = buildSignedInitData(
          { id: 3_000_000_000 + i, first_name: `Racer_${i}` },
          config.testBotToken,
        );
        return playwright.request.newContext({
          baseURL: config.marketBaseUrl,
          extraHTTPHeaders: { 'x-telegram-init-data': initData },
        });
      }),
    );

    try {
      const results = await Promise.all(
        contexts.map((c) => c.post('/api/buy', { data: { id: giftId } })),
      );
      const statuses = results.map((r) => r.status());
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(N - 1);
    } finally {
      await Promise.all(contexts.map((c) => c.dispose()));
    }
  });
});
