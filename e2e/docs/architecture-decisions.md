# Architecture Decisions

ADR-lite: the reasoning behind the suite's structure. Each entry is
_Context → Decision → Consequences_, kept short on purpose. The target is the
MRKT-like product in this monorepo (`apps/backend`: REST + WebSocket marketplace
served as a Telegram Mini App).

## 1. Reuse a portfolio framework's architecture, retarget the product

**Context.** A clean Playwright/TS skeleton already existed (fixtures, fail-fast
config, reported steps, runtime contracts, projects-per-environment). The product
changed, the engineering didn't have to.

**Decision.** Keep the architecture; strip everything product-specific (page
objects, services, schemas, specs for the old site) and point the suite at our
backend.

**Consequences.** Effort goes into MRKT-specific risk (initData, races, real-time),
not into re-deriving framework structure.

## 2. Tests run against STRICT validation, booted by Playwright

**Context.** The backend has a `DEV_MODE` bypass for manual poking. Testing against
the bypass would prove nothing about auth.

**Decision.** `playwright.config.ts` `webServer` starts the backend with
`DEV_MODE=false` on a dedicated port, fresh per run. Locally an already-running
instance is reused; on CI it is always started.

**Consequences.** Every test exercises real initData validation; state is clean each
run; the whole suite runs with one command and no manual setup.

## 3. A test-side initData signer mirrors the server's HMAC

**Context.** A strict backend only trusts a correctly signed `initData`. Tests need
to produce one — and to forge one.

**Decision.** `src/utils/sign-init-data.ts` reproduces Telegram's algorithm
(`HMAC_SHA256` keyed by `HMAC_SHA256("WebAppData", botToken)` over the sorted
data-check-string). The same helper signs valid payloads and, by tampering, invalid
ones.

**Consequences.** One helper gives the happy path (signed → `200`, user identified)
and the security negatives (missing / tampered hash / wrong-token → `401`).

## 4. Runtime contracts with zod (z.infer for types)

**Context.** A typed response that isn't validated at runtime can silently drift from
the API and leave a test green on bad data.

**Decision.** Responses are parsed through a zod schema; a breach throws a descriptive
`ZodError`. Types derive from the schema via `z.infer`, so no hand-written interface
diverges from validation.

**Consequences.** Contract testing without type/validation drift. Schemas live in
`src/services/schemas.ts`, applied by the `MarketApi` service layer (§9); error bodies are
validated too (`ErrorResponseSchema`), so a changed error shape can't slip past a status check.

## 5. Concurrency is asserted, not assumed

**Context.** "Two buyers, one gift" is the core marketplace race; double-selling is the
failure to prevent.

**Decision.** Fire both `POST /api/buy` concurrently and assert the pair of statuses is
exactly `[200, 409]` — one winner, one clean rejection.

**Consequences.** The race path is a regression-guarded behavior, not a hope.

## 6. Configuration fails fast

**Context.** Silent fallback to a wrong URL/token risks running against the wrong thing.

**Decision.** `config.ts` validates env with a zod schema. Locally it falls back to the
webServer's localhost backend; on CI all vars are required and a malformed one throws
before any test runs.

**Consequences.** Misconfiguration surfaces immediately, not mid-run.

## 7. Reported steps via `test.step`, not a decorator

**Context.** Service/Page-Object actions should read as intent in the report, not as raw
Playwright calls. An earlier draft used a `@step` method decorator (auto-label `Class.method`).

**Decision.** Dropped the decorator. Actions wrap their body in `test.step('human label', ...)`
directly: in the service layer via one private `validated()` helper, in element/page actions
via thin wrappers (`@actions/elementActions`, `@actions/pageActions`). Labels are explicit and
can interpolate safe args (gift id, rarity) — never tokens. Native `test.step` shows in BOTH
the Playwright HTML report and Allure.

**Consequences.** Readable steps without decorator magic or a TS-config flag; the label is
chosen per action instead of being a fixed `Class.method`.

## 8. Projects per execution environment

**Context.** API/WS tests and Mini App UI tests have different needs.

**Decision.** Slice by Playwright project. `api` needs no browser. A `web` project for
Mini App UI (mocked `Telegram.WebApp` + signed initData) runs alongside, not bolted into `api`.

**Consequences.** Each slice carries only what it needs; `--project=api` is the fast,
browserless gate.

## 9. Service layer: raw vs assertive, one `validated()` helper

**Context.** Specs shouldn't hand-roll HTTP, status checks and parsing — but negative paths
still need the raw response to inspect.

**Decision.** `src/services/MarketApi.ts` gives two flavours per endpoint: `*Response` (raw
`APIResponse`, no assertions) for edge/negative specs, and an assertive helper routed through
one private `validated(step, schema, call)` — named `test.step`, asserts `ok()`, zod-parses.
A new endpoint is a one-liner.

**Consequences.** No per-endpoint boilerplate; all HTTP lives in the service, specs stay about
behavior.

## 10. Two user lanes: shared reader vs fresh writer

**Context.** Auth is a per-request signed initData (no login to amortise), but write tests
mutate shared backend state.

**Decision.** Read-only tests share one **worker-scoped** `readUser`/`readMarket` (signed
context built once per worker); mutating tests get a **fresh per-test** `tgUser`/`market`. Id
ranges are disjoint so the two never collide.

**Consequences.** No phantom user per read; writes stay isolated. Not `storageState` — there's
no session to save; the split is about data isolation, expressed through fixture scope.

## 11. Money correctness modeled end-to-end

**Context.** A marketplace's real risk is money — double-charge, lost funds, races, settlement
drift — and it lives on the backend.

**Decision.** The in-memory backend models balance + deposit/withdraw, buy debiting (`402` on
insufficient), a Stars/TON top-up **invoice intent**, **idempotency keys**, and async
**settlement** (`pending → settled`). Specs assert each: balance deltas, idempotent retry,
N-buyer concurrency, poll-until-settled.

**Consequences.** The suite's weight sits where the product's risk is (a testing-trophy shape),
not on UI.

## 12. The Telegram seam is mocked, not real

**Context.** Outside Telegram a Mini App has no `window.Telegram.WebApp` and no `initData`; CI
has no Telegram client.

**Decision.** `src/utils/telegram-mock.ts` blocks the real SDK and injects
`window.Telegram.WebApp` + signed initData via `addInitScript` before page scripts run.
`page.evaluate` reads back what the app actually saw (identity, recorded `HapticFeedback`); a
`recordWebSocket` helper asserts server `sold` pushes event-driven.

**Consequences.** The Mini App runs headless in a plain browser; the Telegram-native contract is
tested at the JS seam, not by automating native UI.

## 13. CI: fast gate on PRs, heavy e2e post-merge

**Context.** This is a test-framework repo; heavy/flaky e2e gating every PR just stalls the author.

**Decision.** Only **lint + typecheck** run on PRs. The **e2e** suites (API on a plain runner, UI
in the official Playwright Docker image) run on push-to-main, nightly, and on demand —
parallelised across workers since tests are isolated. Prettier is applied at commit time (husky
at the repo root), not as a CI check.

**Consequences.** Authors merge behind a fast static gate; full e2e validates post-merge without
blocking anyone.

---

## Roadmap

Conscious boundaries, not oversight.

- **Cross-system E2E via a GramJS userbot.** Today `cross-system.spec.ts` asserts the backend
  _dispatches_ the Telegram notification; a real userbot (test account, `StringSession`) driving
  `/start` → `web_app` button → real initData and then asserting the bot's reaction is the
  product's headline scenario, still to build.
- **Telegram-native UI contract.** MainButton / `openInvoice` as contracts against the SDK mock
  — assert the app configures them and reacts to their callbacks — the native seam not yet
  exercised.
