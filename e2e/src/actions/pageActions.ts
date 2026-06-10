import { test, type Page } from '@playwright/test';
import { timeouts } from '@data/constants';

/**
 * Page-level actions (navigation, waits). Same shape as elementActions: every action wraps the
 * native Playwright call in a `test.step` with a human-readable label. Mirrors
 * site-test/helper/pageActions.ts. Default timeouts come from @data/constants, not magic numbers.
 */

export function goTo(page: Page, url: string): Promise<unknown> {
  return test.step(`Открываем страницу «${url}»`, () => page.goto(url));
}

export function reload(page: Page, pageName: string): Promise<unknown> {
  return test.step(`Перезагружаем страницу «${pageName}»`, () => page.reload());
}

export function waitForUrl(
  page: Page,
  url: string | RegExp,
  timeout: number = timeouts.THIRTY_SECONDS,
): Promise<void> {
  return test.step(`Ожидаем url «${url}»`, () => page.waitForURL(url, { timeout }));
}
