import { test, expect } from '@fixtures';

test.describe('User lanes: read vs write @api', () => {
  test('read lane: shared per-worker Reader, client authenticates as it', async ({
    readMarket,
    readUser,
  }) => {
    console.log('[read] readUser', readUser);
    expect(readUser.first_name).toMatch(/^Reader_\d+$/);
    expect(readUser.id).toBeGreaterThanOrEqual(1_000_000_000);
    const { user } = await readMarket.getMe();
    expect(user.id).toBe(readUser.id);
  });

  test('read lane: a second read test reuses the SAME worker-scoped Reader', async ({
    readUser,
  }) => {
    // Same worker → same object as the test above (visible in logs: identical Reader_N).
    console.log('[read] readUser', readUser);
    expect(readUser.first_name).toMatch(/^Reader_\d+$/);
    expect(readUser.id).toBeGreaterThanOrEqual(1_000_000_000);
  });

  test('write lane: fresh per-test Tester in a disjoint id range', async ({ market, tgUser }) => {
    console.log('[write] tgUser', tgUser);
    expect(tgUser.first_name).toMatch(/^Tester_\d+$/);
    expect(tgUser.id).toBeLessThan(1_000_000_000);
    const { user } = await market.getMe();
    expect(user.id).toBe(tgUser.id);
  });
});
