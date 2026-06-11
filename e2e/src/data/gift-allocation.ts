/**
 * One backend-seeded gift per buying scenario (seed ids 1–20 in apps/backend). Specs run fully
 * parallel and a gift sells exactly once per run — claim a free id here, never reuse a taken one.
 */
export const giftIds = {
  webBuy: '3',
  crossSystemNotify: '4',
  realtimeSold: '5',
  idempotencyFreshKey: '6',
  crossSystemIsolationA: '7',
  crossSystemIsolationB: '8',
  marketSoldReadback: '9',
  userIdentity: '10',
  walletDebit: '13',
  idempotencySameKey: '14',
  concurrencyRace: '15',
  settlement: '16',
  paymentsTopUp: '17', // Retro Boombox, 110 TON — fits the 5000 credited by the invoice
  walletInsufficient: '18', // Bubble Gum, 12 TON — bought at zero balance, stays listed
} as const;
