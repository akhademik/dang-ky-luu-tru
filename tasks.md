# Production Hardening Roadmap & Task Tracker

## 1. 6-Phase Hardening Roadmap (100% COMPLETED)

---

### Phase 1 — Security 🔴 [COMPLETED]
- [x] Create centralized API authentication gateway (`src/hooks.server.ts` & `src/lib/server/auth.ts`).
- [x] Protect every browser API (`/api/stays/*`, `/api/sheets/*`, `/api/stats`, `/api/env`, `/api/token`, `/api/logs`).
- [x] Protect webhook separately with API key/signature (`POST /api/ingest/ocr` via `x-api-key` / `Authorization: Bearer`).
- [x] Remove production credential fallbacks (fail-fast with clear configuration errors).
- [x] Fix secure cookie behavior (`session_auth` HttpOnly, SameSite=Strict, Secure).
- [x] Add CSRF protection where appropriate.
- [x] Verify no sensitive API can be called unauthenticated.
- [x] Add automated authentication & security tests (`test/api/auth-security.test.ts`).

---

### Phase 2 — Data Integrity 🟠 [COMPLETED]
- [x] Add DB constraints where appropriate (Deduplication, cascade foreign keys).
- [x] Enforce valid status transitions (`src/lib/server/validator.ts` Stay State Machine).
- [x] Centralize date/time logic (`src/lib/server/time.ts` GMT+7 `Asia/Ho_Chi_Minh`).
- [x] Add request IDs to BCA operations (`src/lib/server/kbttClient.ts`).
- [x] Make audit logs append-only in Production mode (Prevent log deletion/clearing).
- [x] Review retry/idempotency behavior (Exponential backoff & Request ID tracking).
- [x] Validate all API inputs centrally (`src/lib/server/validator.ts`).
- [x] Add data integrity tests integrated into the test suite.

---

### Phase 3 — Testing 🟠 [COMPLETED]
- [x] **Unit tests** (`test/unit/`): `catalog.test.ts`, `transformer.test.ts`, `time.test.ts`, `validator.test.ts`, `svelte-deprecation.test.ts` (`pnpm run test:unit`).
- [x] **API tests** (`test/api/`): `auth-security.test.ts` (`pnpm run test:api`).
- [x] **Integration tests** (`test/integration/`): `stay-service.test.ts` (`pnpm run test:integration`).
- [x] **E2E tests** (`test/playwright-test.ts`): UI & Browser flows (`pnpm run test:e2e`).
- [x] **Live External API tests** (`test/live/`): `live-bca-pipeline.test.ts` (`pnpm run test:live`).
- [x] **100% Offline Test Guarantee**: `pnpm test` runs zero-network-dependency offline suites.

---

### Phase 4 — Architecture Cleanup 🟡 [COMPLETED]
- [x] **time.ts**: Centralized GMT+7 date-time handling service.
- [x] **validator.ts**: Centralized business validations and Stay State Machine.
- [x] **repositories/**: Modular domain repositories (`guestRepository`, `stayRepository`, `auditRepository`, `statsRepository`).
- [x] **services/**: Modular domain services (`stayService`, `kbttClient`, `tokenManager`, `catalogManager`, `dataTransformer`).
- [x] **utils/format.ts**: Extracted shared UI formatting helpers, country resolvers, and options.
- [x] **components/**: Modular UI components (`ConfirmModal.svelte`, `StayStatusBadge.svelte` adhering to Svelte 5 Runes & Callback Props).
- [x] **db.ts**: Clean facade delegating to modular repository implementations.

---

### Phase 5 — CI/CD 🟡 [COMPLETED]
- [x] **GitHub Actions Workflow** (`.github/workflows/ci.yml`) running on Node 22 (Active LTS):
  1. Biome Linter & Formatter (`pnpm run lint:biome`)
  2. Svelte-Check Diagnostics & TypeScript checks (`pnpm run check:svelte`)
  3. Knip Dead Code & Unused Exports Analysis (`pnpm run knip`)
  4. Unified Test Suite with Svelte 5 anti-deprecation and security tests (`pnpm test`)
  5. Production Build compilation for Cloudflare Pages (`pnpm run build`)

---

### Phase 6 — Documentation 🟢 [COMPLETED]
- [x] `ARCHITECTURE.md`: Complete system architecture, D1 schema, State Machine, Repository patterns, and developer guide.
- [x] `DESIGN_PATTERN.md`: Architectural patterns, Svelte 5 Runes & Callback Props guidelines, Dark Slate Glassmorphism color palette.
- [x] `WORKFLOW_INSTRUCTION.md`: Mandatory 6-step verification workflow, coding standards, GMT+7 policies.
- [x] `tasks.md`: Full checklist of all 6 phases marked complete.
- [x] `README.md`: Modernized overview, features, directory references, and commands.

---

## 2. Review Notes & Future Backlog (Non-blocking / Phase 7+)

Below are architectural observations for future large-scale iterations:

1. **A. Session Token Enhancement**: Currently, single-admin session uses secure HttpOnly SameSite=Strict cookies (`app_session=authenticated`). For future multi-user roles, upgrade to signed JWT/Server-side sessions.
2. **B. Webhook Header-Only Auth**: Currently accepts `x-api-key`, `Authorization: Bearer`, and optional query parameters for Google Apps Script compatibility. Can be restricted to header-only in future passes.
3. **C. D1 Adapter Segregation**: `db.ts` uses direct Cloudflare binding in Prod with remote CLI fallback in local dev. Can be split into `d1.ts` and `remote-dev.ts` if local mock SQLite is preferred.
4. **D. Typed Field Whitelist in Update**: `updateStay` and `updateGuest` sanitize columns at service boundary. Future typed DTO schemas can provide strict compile-time validation.
5. **E. Scheduled Cron Worker for Checkout**: Currently uses lazy auto-checkout on request access. For exact-second background checkouts without web traffic, a Cloudflare Scheduled Worker (Cron) can be added.
