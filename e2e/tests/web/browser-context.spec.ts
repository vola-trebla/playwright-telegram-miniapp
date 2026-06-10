import { test, expect } from '@fixtures';

// page.evaluate(fn) runs fn INSIDE the browser (the page's JS world) and returns a
// JSON-serialisable result back to the test. These two checks reach into that world:
// one reads the Telegram context the app sees, the other a side effect the app triggers.

test.describe('Browser-side checks via page.evaluate @web', () => {
  test('the webview sees the injected Telegram user (not just the DOM)', async ({
    page,
    readMiniApp,
    readUser,
  }) => {
    await readMiniApp.open();

    // Read window.Telegram.WebApp.initDataUnsafe.user from inside the page — this is what the
    // app reads at startup, before any rendering. Deeper than asserting on #who text.
    const user = await page.evaluate(() => {
      const w = window as unknown as {
        Telegram: { WebApp: { initDataUnsafe: { user: { id: number; first_name: string } } } };
      };
      return w.Telegram.WebApp.initDataUnsafe.user;
    });

    expect(user.id).toBe(readUser.id);
    expect(user.first_name).toBe(readUser.first_name);
  });

  test('a failed buy triggers an error HapticFeedback in the webview', async ({
    page,
    readMiniApp,
  }) => {
    await readMiniApp.open();

    // Call the app's own buy() with a non-existent id from inside the browser → backend 404 →
    // the app fires tg.HapticFeedback.notificationOccurred('error') (app.js). The mock records
    // every haptic call into window.__haptics, which we read back here.
    await page.evaluate(() => {
      const w = window as unknown as { buy: (id: string) => Promise<void> };
      return w.buy('does-not-exist');
    });

    const haptics = await page.evaluate(() => {
      const w = window as unknown as { __haptics?: string[] };
      return w.__haptics ?? [];
    });

    expect(haptics).toContain('error');
  });
});
