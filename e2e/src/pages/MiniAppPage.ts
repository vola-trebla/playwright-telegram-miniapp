import type { Page, Locator } from '@playwright/test';
import { click } from '@actions/elementActions';
import { BasePage } from '@pages/BasePage';

/**
 * Assertion-free Page Object for the Mini App (apps/backend/public).
 * Only actions + readonly locators; assertions live in specs (web-first, auto-retrying).
 * Extends BasePage (navigation via `open()`). Action methods delegate to the elementActions
 * helpers, passing each element's description — so the report reads as intent and the raw
 * Playwright calls nest inside the named step.
 * The Telegram.WebApp mock + signed initData are installed by the mini-app fixture.
 */
export class MiniAppPage extends BasePage {
  readonly who: Locator;
  readonly grid: Locator;
  readonly cards: Locator;
  readonly liveFeed: Locator;

  constructor(page: Page) {
    super(page);
    this.who = page.locator('#who');
    this.grid = page.locator('#grid');
    this.cards = page.locator('#grid .card');
    this.liveFeed = page.locator('#log');
  }

  card(giftId: string): Locator {
    return this.page.locator(`.card[data-id="${giftId}"]`);
  }

  buyButton(giftId: string): Locator {
    return this.card(giftId).getByTestId('buy');
  }

  filterChip(rarity: string): Locator {
    return this.page.getByTestId(`filter-${rarity}`);
  }

  async buy(giftId: string): Promise<void> {
    await click(this.buyButton(giftId), `Купить подарок #${giftId}`);
  }

  async filterBy(rarity: string): Promise<void> {
    await click(this.filterChip(rarity), `Фильтр по редкости: ${rarity}`);
  }
}
