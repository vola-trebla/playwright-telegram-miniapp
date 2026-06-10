import type { Page } from '@playwright/test';
import { config } from '@utils/config';
import { buildSignedInitData } from '@utils/sign-init-data';

export type TgUser = { id: number; first_name: string; username?: string };

/**
 * Make a page behave like a Telegram Mini App webview for `tgUser`:
 * - block the real telegram-web-app.js (outside Telegram it would overwrite our mock
 *   with an empty initData), keeping the suite hermetic;
 * - inject a minimal window.Telegram.WebApp + a validly signed initData BEFORE any page
 *   script runs (the app reads it synchronously at startup).
 *
 * HapticFeedback.notificationOccurred records every call into window.__haptics, so a test
 * can read it back via page.evaluate and assert the app triggered haptic feedback.
 *
 * Reused by the miniApp fixture (single page) and multi-client realtime tests (many pages).
 */
export async function installTelegramWebApp(page: Page, tgUser: TgUser): Promise<void> {
  const initData = buildSignedInitData(tgUser, config.testBotToken);

  await page.route(/telegram-web-app\.js/, (route) => route.abort());

  await page.addInitScript(
    ({ raw, user }) => {
      (window as unknown as { Telegram: unknown }).Telegram = {
        WebApp: {
          initData: raw,
          initDataUnsafe: { user },
          version: '7.0',
          platform: 'web',
          colorScheme: 'dark',
          ready: () => {},
          expand: () => {},
          close: () => {},
          HapticFeedback: {
            notificationOccurred: (type: string) => {
              const w = window as unknown as { __haptics?: string[] };
              (w.__haptics ??= []).push(type);
            },
          },
        },
      };
    },
    { raw: initData, user: tgUser },
  );
}
