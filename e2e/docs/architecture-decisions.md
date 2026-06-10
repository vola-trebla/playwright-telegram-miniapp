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

**Consequences.** Contract testing without type/validation drift. (Currently inline
in specs; promoted to a `MarketApi` service layer next — see Roadmap.)

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

**Context.** API/WS tests and (future) Mini App UI tests have different needs.

**Decision.** Slice by Playwright project. `api` needs no browser. A `web` project for
Mini App UI (mocked `Telegram.WebApp` + signed initData) is added alongside, not bolted
into `api`.

**Consequences.** Each slice carries only what it needs; `--project=api` is the fast,
browserless gate.

---

## Roadmap

Deliberately not built yet — boundaries are a conscious choice, captured so they read as
intent, not oversight.

- **`MarketApi` service layer.** Move the inline HTTP + zod parsing into a service with
  raw vs assertive method flavours (raw `APIResponse` for negatives, validated data for
  happy paths), steps via `test.step`.
- **WebSocket assertions.** Subscribe to `/ws`, act over REST, assert the pushed `sold`
  event arrives — the real-time seam as a test.
- **Mini App UI tests.** Playwright drives `apps/backend/public` with `addInitScript`
  mocking `window.Telegram.WebApp` and a signed `initData` — UI E2E without Telegram.
- **Cross-system E2E.** A GramJS userbot (real test account, `StringSession`) asserts a
  WEB/Mini App action triggers the expected bot reaction — the product's headline scenario.
- **Workflows to repo root.** These workflows live under `e2e/.github`; for the monorepo
  they should move to the repository-root `.github/workflows` to actually run on GitHub.
