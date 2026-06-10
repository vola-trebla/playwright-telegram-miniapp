import { test, expect } from '@fixtures';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';

test.use({ tgUser: { id: 555, first_name: 'Carol' } });

const BASE = config.marketBaseUrl;
const head = (id: number, name: string): Record<string, string> => ({
  'x-telegram-init-data': buildSignedInitData({ id, first_name: name }, config.testBotToken),
});

test.describe('Cross-system reaction @api @cross-system', () => {
  test('a purchase dispatches a Telegram notification to the buyer', async ({ market }) => {
    const id = '4'; // dedicated gift
    const { gift } = await market.buy(id);

    const { notifications } = await market.getNotifications();
    const note = notifications.find((n) => n.text.includes(gift.name));

    expect(note, 'expected a notification for the bought gift').toBeTruthy();
    expect(note!.to).toBe(555);
  });

  test('notifications are isolated per user (no leaking across buyers)', async ({ request }) => {
    await request.post(`${BASE}/api/buy`, { headers: head(701, 'Ann'), data: { id: '7' } });
    await request.post(`${BASE}/api/buy`, { headers: head(702, 'Ben'), data: { id: '8' } });

    const ann = (await (
      await request.get(`${BASE}/api/notifications`, { headers: head(701, 'Ann') })
    ).json()) as { notifications: { to: number }[] };

    expect(ann.notifications.length).toBeGreaterThan(0);
    expect(ann.notifications.every((n) => n.to === 701)).toBeTruthy();
  });
});
