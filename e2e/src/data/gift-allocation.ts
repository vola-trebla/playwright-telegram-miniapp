/**
 * One backend-seeded gift per buying scenario (seed ids 1–22 in apps/backend). Specs run fully
 * parallel and a gift sells exactly once per run — claim a free id here, never reuse a taken one.
 * Id '1' is implicitly owned by market.spec's race via firstListedGiftId().
 */
export const giftIds = {
  wsBroadcast: '2',
  webBuy: '3',
  crossSystemNotify: '4',
  realtimeSold: '5',
  idempotencyFreshKey: '6',
  crossSystemIsolationA: '7',
  crossSystemIsolationB: '8',
  marketSoldReadback: '9',
  userIdentity: '10',
  wsLateBefore: '11',
  wsLateAfter: '12',
  walletDebit: '13',
  idempotencySameKey: '14',
  concurrencyRace: '15',
  settlement: '16',
  paymentsTopUp: '17', // Retro Boombox, 110 TON — fits the 5000 credited by the invoice
  walletInsufficient: '18', // Bubble Gum, 12 TON — bought at zero balance, stays listed
  idemBodyMismatchA: '19',
  idemBodyMismatchB: '20', // replayed over by the cached response — stays listed
  securityImpersonation: '21',
} as const;
