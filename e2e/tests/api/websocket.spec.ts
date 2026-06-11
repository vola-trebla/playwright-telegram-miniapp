import { test, expect } from '@fixtures';
import { WebSocket, type RawData } from 'ws';
import { config } from '@utils/config';
import { timeouts } from '@data/constants';
import { SoldEventSchema, type SoldEvent } from '@services/schemas';
import { giftIds } from '@data/gift-allocation';

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
    const ws = await openWs();

    try {
      const id = giftIds.wsBroadcast;
      const sold = waitForMessage(ws, (m) => m.id === id);
      await market.catalog.buy(id);

      const event = await sold;
      expect(event.buyer).toBe('WsTester');
    } finally {
      ws.close();
    }
  });

  test('a late subscriber gets live events only — sales from before the connect are not replayed', async ({
    market,
  }) => {
    // Sell one gift while NOBODY is connected…
    await market.catalog.buy(giftIds.wsLateBefore);

    // …then connect and record everything this client receives.
    const ws = await openWs();
    const seen: SoldEvent[] = [];
    ws.on('message', (raw: RawData) => {
      const frame = SoldEventSchema.safeParse(JSON.parse(raw.toString()));
      if (frame.success) seen.push(frame.data);
    });

    try {
      const sold = waitForMessage(ws, (m) => m.id === giftIds.wsLateAfter);
      await market.catalog.buy(giftIds.wsLateAfter);
      await sold;

      expect(seen.map((e) => e.id)).toContain(giftIds.wsLateAfter);
      expect(seen.map((e) => e.id)).not.toContain(giftIds.wsLateBefore);
    } finally {
      ws.close();
    }
  });
});

function openWs(): Promise<WebSocket> {
  const ws = new WebSocket(wsUrl);
  return new Promise<WebSocket>((resolve, reject) => {
    ws.on('open', () => resolve(ws));
    ws.on('error', () => reject(new Error('WS failed to open')));
  });
}
