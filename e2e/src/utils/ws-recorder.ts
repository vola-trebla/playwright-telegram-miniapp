import type { Page } from '@playwright/test';
import { timeouts } from '@data/constants';

/**
 * Records WebSocket frames a page receives so realtime tests can assert server pushes (e.g. `sold`).
 * `waitForFrame(predicate)` resolves the instant a matching frame arrives (event-driven) or times out;
 * the predicate picks your own frame since one page sees every broadcast. Call BEFORE page.goto.
 */
export type WsRecorder = {
  /** All JSON frames received so far, in arrival order. */
  readonly frames: readonly unknown[];
  /** Resolve with the first frame matching `match`; reject if none arrives in `timeoutMs`. */
  waitForFrame<T = Record<string, unknown>>(
    match: (frame: T) => boolean,
    timeoutMs?: number,
  ): Promise<T>;
};

export function recordWebSocket(page: Page): WsRecorder {
  const frames: unknown[] = [];
  // Pending waiters notified the moment a frame arrives; a waiter returns true once consumed.
  const waiters = new Set<(frame: unknown) => boolean>();

  page.on('websocket', (ws) => {
    ws.on('framereceived', ({ payload }) => {
      const text = typeof payload === 'string' ? payload : payload.toString();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return; // Non-JSON frame (ping/keepalive) — tests only assert on JSON messages.
      }
      frames.push(parsed);
      for (const waiter of waiters) {
        if (waiter(parsed)) waiters.delete(waiter);
      }
    });
  });

  return {
    frames,
    waitForFrame<T = Record<string, unknown>>(
      match: (frame: T) => boolean,
      timeoutMs = timeouts.FIVE_SECONDS,
    ): Promise<T> {
      const matches = (f: unknown): f is T => {
        try {
          return match(f as T);
        } catch {
          return false; // shape mismatch — not our frame
        }
      };

      const already = frames.find(matches);
      if (already !== undefined) return Promise.resolve(already);

      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          waiters.delete(waiter);
          reject(new Error(`waitForFrame: no matching WS frame within ${timeoutMs}ms`));
        }, timeoutMs);

        const waiter = (frame: unknown): boolean => {
          if (!matches(frame)) return false;
          clearTimeout(timer);
          resolve(frame);
          return true;
        };
        waiters.add(waiter);
      });
    },
  };
}
