import { test, expect } from '@fixtures';

test.describe('Mini App catalog @web', () => {
  test('renders every gift with a name and a TON price @smoke', async ({ readMiniApp }) => {
    await readMiniApp.open();
    await expect(readMiniApp.cards).toHaveCount(22);
    await expect(readMiniApp.cards.first().locator('.name')).not.toBeEmpty();
    await expect(readMiniApp.cards.first().locator('.price')).toContainText('TON');
  });

  test('filtering by rarity shows only that rarity', async ({ readMiniApp }) => {
    await readMiniApp.open();
    await readMiniApp.filterBy('legendary');
    await expect(readMiniApp.cards).toHaveCount(2);
    for (const card of await readMiniApp.cards.all()) {
      await expect(card).toHaveAttribute('data-rarity', 'legendary');
    }
  });
});
