import { test, type Locator } from '@playwright/test';

/**
 * Thin wrappers over Locator actions — each wraps the call in a named `test.step` (report reads
 * as intent). The Page Object passes the description; `options` mirrors native Playwright options.
 * Query helpers just return values, no step.
 */

// --- Mutations (reported as steps) ---

export function click(
  element: Locator,
  description: string,
  options?: Parameters<Locator['click']>[0],
): Promise<void> {
  return test.step(`Клик по элементу «${description}»`, () => element.click(options));
}

export function fill(
  element: Locator,
  value: string,
  description: string,
  options?: Parameters<Locator['fill']>[1],
): Promise<void> {
  return test.step(`Ввод «${value}» в «${description}»`, () => element.fill(value, options));
}

export function hover(
  element: Locator,
  description: string,
  options?: Parameters<Locator['hover']>[0],
): Promise<void> {
  return test.step(`Наведение на «${description}»`, () => element.hover(options));
}

export function check(
  element: Locator,
  description: string,
  options?: Parameters<Locator['check']>[0],
): Promise<void> {
  return test.step(`Отметить чекбокс «${description}»`, () => element.check(options));
}

export function clearInput(
  element: Locator,
  description: string,
  options?: Parameters<Locator['clear']>[0],
): Promise<void> {
  return test.step(`Очистка поля «${description}»`, () => element.clear(options));
}

export function pressKey(
  element: Locator,
  key: string,
  description: string,
  options?: Parameters<Locator['press']>[1],
): Promise<void> {
  return test.step(`Нажатие «${key}» в «${description}»`, () => element.press(key, options));
}

// --- Queries (return values, no step) ---

export async function getText(element: Locator): Promise<string> {
  return String(await element.textContent()).trim();
}

export function getAttribute(element: Locator, name: string): Promise<string | null> {
  return element.getAttribute(name);
}

export function getCount(element: Locator): Promise<number> {
  return element.count();
}
