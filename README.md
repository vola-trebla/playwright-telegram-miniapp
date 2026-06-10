# Playwright × Telegram Mini App — E2E testing demo

A self-contained demo of how to **test a Telegram Mini App end-to-end** with Playwright +
TypeScript. It ships a small but realistic product to test against — a TON-marketplace-style
Mini App (buy "gifts"/NFTs) — and a test suite that exercises the parts that make Mini Apps
tricky: `initData` auth, the `window.Telegram.WebApp` bridge, realtime over WebSocket, and
money correctness on the backend.

Everything runs locally with no Telegram account and no real tokens.

## Why a Mini App is different to test

A Telegram Mini App is a normal web app rendered in a webview **inside Telegram**. Two things
don't exist when you open it in a plain browser (i.e. in CI):

1. **Identity** — Telegram hands the app a signed `initData` blob; the backend trusts it via an
   HMAC check. No Telegram → no `initData`.
2. **Native bridge** — `window.Telegram.WebApp` (MainButton, haptics, theme, …) is injected by
   the Telegram client.

This repo shows how to handle both: **sign `initData` yourself** for the backend, and **mock
`window.Telegram.WebApp`** in the browser so the webview runs headless.

## Architecture

```
apps/backend   Express + WebSocket marketplace. Validates Mini App initData (HMAC-SHA256 over
               the bot token). REST (gifts, buy, wallet, invoices, settlement) + WS `sold`
               broadcasts. Also serves the Mini App itself.
apps/backend/public   The Mini App (index.html + app.js): reads window.Telegram.WebApp.initData,
                      lists gifts, Buy, live updates via WS.
apps/bot       grammy bot — the "door": /start replies with a web_app button opening the Mini App.
e2e            Playwright + TS + Zod test suite (API + UI). The substance of the demo.
```

## What the suite demonstrates

- **`initData` security** — a correct HMAC signature is accepted; missing / forged / wrong-token
  / **replayed (stale `auth_date`)** payloads are rejected. The buyer is always the signed
  identity, never the request body (no impersonation).
- **Mocking the Telegram SDK** — `addInitScript` injects `window.Telegram.WebApp` + a signed
  `initData` before the page's scripts run, so the Mini App runs in a plain browser.
- **`page.evaluate` into the webview** — read what the app actually sees
  (`Telegram.WebApp.initDataUnsafe.user`) and assert side effects (a failed buy fires an error
  `HapticFeedback`), not just the DOM.
- **Realtime over WebSocket** — one client buys, another sees `SOLD` live; the `sold` broadcast
  payload is asserted via an event-driven recorder.
- **Money correctness (backend-centric)** — balance + deposit/withdraw, buy debits the balance
  (`402` on insufficient funds), top-up via a Telegram Stars / TON **payment intent**,
  **idempotency keys** (a retried buy charges once), **multi-actor concurrency** (N buyers, one
  gift → exactly one wins), and **async settlement** (`pending → settled`).
- **Framework patterns** — assertion-free Page Objects, a service layer with **Zod runtime
  contracts** (types via `z.infer`, error bodies validated too), reported steps via `test.step`,
  fail-fast env config, and **read vs write user lanes** (a shared worker-scoped reader vs a
  fresh per-test writer) to keep tests fast and isolated.

## Run it

```bash
npm install                 # root (npm workspaces)

# Option A — just run the test suite (it boots the backend itself):
cd e2e && npm test          # API + UI; npm run test:api / test:web to split

# Option B — poke the Mini App by hand:
npm run backend             # http://localhost:3000 (DEV_MODE lets a plain browser through)
```

Inside `e2e/`: `npm run check` (ESLint + `tsc --noEmit`) is the gate; `npm run report` opens the
Playwright HTML report. See `e2e/README.md` for more commands and `e2e/docs/` for the design
decisions.

## Notes

- The product here is a toy built to be tested — the value is the **test framework and the
  patterns**, not the marketplace.
- No real bot token is needed: the suite signs `initData` with a test token and runs the backend
  with strict validation against that same token. `.env.example` files show the shape.
