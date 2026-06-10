# E2E suite (Playwright + TypeScript)

Playwright + TS test suite for the Telegram Mini App marketplace in this monorepo
(`apps/backend` = REST + WebSocket marketplace served as a Mini App). See the root
`README.md` for the big picture and `docs/architecture-decisions.md` for the reasoning.

## Layout

```
src/
  fixtures/      DI fixtures — read (worker-scoped) vs write (test-scoped) user lanes
  services/      MarketApi client + Zod schemas (runtime contracts)
  pages/         assertion-free Page Objects (BasePage, MiniAppPage)
  actions/       element/page action helpers wrapping native calls in test.step
  utils/         initData signing, Telegram.WebApp mock, WS recorder, config
  data/          constants (timeouts)
tests/
  api/           auth, security/replay, market race, wallet, payments, idempotency,
                 concurrency, settlement, websocket, cross-system notifications
  web/           catalog, Mini App UI, realtime across clients, page.evaluate checks
```

## Run

```bash
npm test                 # everything (boots the backend via webServer)
npm run test:api         # API + WS only (no browser) — the fast gate
npm run test:web         # Mini App UI (Chromium)
npm run test:smoke       # @smoke only
npm run check            # ESLint + tsc --noEmit (pre-merge gate)
npm run report           # open the Playwright HTML report
```

Config is env-driven (`src/utils/config.ts`): `MARKET_URL` and `TEST_BOT_TOKEN`. Locally both
default for zero-config runs; in CI they must be set explicitly (fail-fast). To point the suite
at a deployed Mini App, set `MARKET_URL` to its URL and `TEST_BOT_TOKEN` to that environment's
test bot token — the specs stay the same.
