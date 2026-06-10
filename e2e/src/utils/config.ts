import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for environment-driven configuration.
 *
 * Locally the suite falls back to the backend on localhost so it runs out of the box.
 * On CI (`process.env.CI`) there is NO implicit fallback: every value must be provided
 * explicitly, and a missing/malformed one fails fast with a descriptive error before
 * a single test starts.
 */
const isCI = !!process.env.CI;

// Local convenience only — the backend Playwright's webServer boots for the suite.
const DEFAULT_MARKET_URL = 'http://localhost:3100';
// Token the test backend (DEV_MODE=false) validates initData against; tests sign with it.
const DEFAULT_BOT_TOKEN = 'test-bot-token';

const EnvSchema = z.object({
  MARKET_URL: isCI ? z.url() : z.url().default(DEFAULT_MARKET_URL),
  TEST_BOT_TOKEN: isCI ? z.string().min(1) : z.string().min(1).default(DEFAULT_BOT_TOKEN),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration${isCI ? ' (CI requires all vars to be set)' : ''}:\n` +
      z.prettifyError(parsed.error),
  );
}
const env = parsed.data;

export const config = {
  marketBaseUrl: env.MARKET_URL,
  testBotToken: env.TEST_BOT_TOKEN,
} as const;
