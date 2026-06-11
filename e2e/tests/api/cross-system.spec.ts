import { test, expect } from '@fixtures';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';
import { NotificationsResponseSchema } from '@services/schemas';
import { giftIds } from '@data/gift-allocation';

test.use({ tgUser: { id: 555, first_name: 'Carol' } });

const BASE = config.marketBaseUrl;
const head = (id: number, name: string): Record<string, string> => ({
  'x-telegram-init-data': buildSignedInitData({ id, first_name: name }, config.testBotToken),
});

test.describe('Cross-system reaction @api @cross-system', () => {
  test('a purchase dispatches a Telegram notification to the buyer', async ({ market }) => {
    const { gift } = await market.catalog.buy(giftIds.crossSystemNotify);

    const { notifications } = await market.account.getNotifications();
    const note = notifications.find((n) => n.text.includes(gift.name));

    expect(note, 'expected a notification for the bought gift').toBeTruthy();
    expect(note!.to).toBe(555);
  });

  test('notifications are isolated per user (no leaking across buyers)', async ({ request }) => {
    const a = giftIds.crossSystemIsolationA;
    const b = giftIds.crossSystemIsolationB;
    await request.post(`${BASE}/api/buy`, { headers: head(701, 'Ann'), data: { id: a } });
    await request.post(`${BASE}/api/buy`, { headers: head(702, 'Ben'), data: { id: b } });

    const ann = NotificationsResponseSchema.parse(
      await (await request.get(`${BASE}/api/notifications`, { headers: head(701, 'Ann') })).json(),
    );

    expect(ann.notifications.length).toBeGreaterThan(0);
    expect(ann.notifications.every((n) => n.to === 701)).toBeTruthy();
  });
});
