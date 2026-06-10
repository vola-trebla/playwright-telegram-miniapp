import type { Page } from '@playwright/test';
import { goTo } from '@actions/pageActions';

/** Base Page Object: holds `page` (protected) and the shared `open(path)` navigation. New pages extend this. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async open(path = '/'): Promise<void> {
    await goTo(this.page, path);
  }
}
