import { test, type Page } from '@playwright/test';
import { timeouts } from '@data/constants';

/** Page-level actions (nav/waits), each wrapped in a named `test.step`. Default timeouts from @data/constants. */

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
