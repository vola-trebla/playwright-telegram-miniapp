import { test, expect } from '@fixtures';

// page.evaluate(fn) runs fn inside the browser and returns a JSON-serialisable result. These two
// checks reach into that world: the Telegram context the app sees, and a side effect it triggers.

test.describe('Browser-side checks via page.evaluate @web', () => {
  test('the webview sees the injected Telegram user (not just the DOM)', async ({
    page,
    readMiniApp,
    readUser,
  }) => {
    await readMiniApp.open();

    // What the app saw at startup — deeper than asserting on the #who DOM text.
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

    // Call the app's own buy() with a bad id → backend 404 → app fires an error haptic, which the
    // mock records into window.__haptics for us to read back.
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
