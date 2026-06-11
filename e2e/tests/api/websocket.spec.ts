import { test, expect } from '@fixtures';
import { WebSocket, type RawData } from 'ws';
import { config } from '@utils/config';
import { timeouts } from '@data/constants';
import { SoldEventSchema, type SoldEvent } from '@services/schemas';

test.use({ tgUser: { id: 7, first_name: 'WsTester' } });

const wsUrl = `${config.marketBaseUrl.replace(/^http/, 'ws')}/ws`;

function waitForMessage(
  ws: WebSocket,
  match: (m: SoldEvent) => boolean,
  timeoutMs = timeouts.FIVE_SECONDS,
): Promise<SoldEvent> {
  return new Promise<SoldEvent>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no matching WS message in time')), timeoutMs);
    ws.on('message', (raw: RawData) => {
      const frame = SoldEventSchema.safeParse(JSON.parse(raw.toString()));
      if (!frame.success || !match(frame.data)) return;
      clearTimeout(timer);
      resolve(frame.data);
    });
  });
}

test.describe('Live events over WebSocket @api @realtime', () => {
  test('a buy broadcasts a sold event to connected clients', async ({ market }) => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', () => reject(new Error('WS failed to open')));
    });

    try {
      const { gifts } = await market.catalog.getGifts();
      const target = [...gifts].reverse().find((g) => g.status === 'listed');
      expect(target, 'need a listed gift to sell').toBeTruthy();
      const id = target!.id;

      const sold = waitForMessage(ws, (m) => m.id === id);
      await market.catalog.buy(id);

      const event = await sold;
      expect(event.buyer).toBe('WsTester');
    } finally {
      ws.close();
    }
  });
});
