import type { Page } from '@playwright/test';
import { timeouts } from '@data/constants';

/**
 * Records every WebSocket frame a page receives, so realtime tests can assert on
 * server-pushed messages (e.g. the `sold` broadcast) without hand-wiring Playwright's
 * low-level `page.on('websocket')` / `framereceived` events inside the spec.
 *
 * Why a recorder and not a bare `find`:
 * - one page receives EVERY broadcast on the backend (other parallel tests sell too),
 *   so callers pass a predicate to pick out their own frame;
 * - frames arrive asynchronously — `waitForFrame` resolves the instant a matching frame
 *   arrives (event-driven, no polling) or rejects on timeout.
 *
 * Call `recordWebSocket(page)` BEFORE `page.goto(...)` — the listener must be attached
 * before the page opens its socket, or the opening frames are missed.
 *
 * Usage:
 *   const ws = recordWebSocket(page);
 *   await page.goto('/');
 *   const sold = await ws.waitForFrame((m) => m.type === 'sold' && m.id === giftId);
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
