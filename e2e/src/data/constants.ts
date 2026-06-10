/**
 * Centralised timeouts, by name instead of magic numbers at call sites.
 * Mirrors site-test/data/constants.ts — used by the action/page helpers and the WS recorder.
 */
export const timeouts = {
  HUNDRED_MS: 100,
  ONE_SECOND: 1_000,
  FIVE_SECONDS: 5_000,
  TEN_SECONDS: 10_000,
  FIFTEEN_SECONDS: 15_000,
  THIRTY_SECONDS: 30_000,
} as const;
