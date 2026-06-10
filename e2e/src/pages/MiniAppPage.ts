import type { Page, Locator } from '@playwright/test';
import { click } from '@actions/elementActions';
import { BasePage } from '@pages/BasePage';

/**
 * Assertion-free Page Object for the Mini App — locators + actions only; assertions live in specs.
 * Actions delegate to elementActions (named steps). The Telegram mock is installed by the fixture.
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
