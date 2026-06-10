import type { Page } from '@playwright/test';
import { goTo } from '@actions/pageActions';

/**
 * Base class for Page Objects. Holds the `page` (protected, so subclasses reach it) and the
 * common `open(path)` navigation, delegated to the reported pageActions.goTo. Mirrors the
 * BaseForm/BaseCustomerAccountPage scaffold in site-test — minimal here since the product has
 * one page today, but ready for more (each new page extends this).
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async open(path = '/'): Promise<void> {
    await goTo(this.page, path);
  }
}
