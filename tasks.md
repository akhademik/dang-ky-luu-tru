Recommended roadmap

I'd do this in this exact order.

Phase 1 — Security 🔴 [COMPLETED]

Highest priority

- [x] Create centralized API authentication.
- [x] Protect every browser API.
- [x] Protect webhook separately with API key/signature.
- [x] Remove production credential fallbacks.
- [x] Fix secure cookie behavior.
- [x] Add CSRF protection where appropriate.
- [x] Verify no sensitive API can be called unauthenticated.
- [x] Add authentication tests (`test/auth-security.test.ts`).

Target:

Public
├── login
└── webhook with secret (`x-api-key`, `Authorization: Bearer`, or query token)

Authenticated
├── stays
├── guests
├── audit
├── BCA registration
├── checkout
├── extend
└── environment
Phase 2 — Data integrity 🟠
Add DB constraints where appropriate.
Enforce valid status transitions.
Centralize date/time logic.
Add request IDs to BCA operations.
Make audit logs append-only.
Review retry/idempotency behavior.
Validate all API inputs centrally.
Phase 3 — Testing 🟠

Split:

unit
integration
API
E2E
live external API

Then:

pnpm test

must never require BCA credentials or remote production infrastructure.

Phase 4 — Architecture cleanup 🟡

Refactor:

+page.svelte
db.ts
stayService.ts

into smaller units.

Especially:

time.ts
validation/
repositories/
services/
API schemas
components/

Don't over-engineer it.

Phase 5 — CI/CD 🟡

Add:

GitHub Actions
↓
Biome
↓
Svelte check
↓
Knip
↓
Unit tests
↓
Build

Then optionally:

manual workflow
↓
live BCA integration test
Phase 6 — Documentation 🟢

Finally synchronize:

ARCHITECTURE.md
DESIGN_PATTERN.md
WORKFLOW_INSTRUCTION.md
tasks.md
README.md

with the actual current source tree.

I'd specifically remove old references to:

src/lib/server/modules/

if that architecture is no longer current.

My final verdict

This is not a bad project that needs to be rescued.

It's actually a fairly solid internal business application that has reached the point where the next step should be production hardening, rather than adding more features.

The strongest parts are:

✓ Domain model
✓ Stay lifecycle
✓ D1 as source of truth
✓ Service layer
✓ BCA integration abstraction
✓ Explicit timezone/business rules
✓ Audit trail
✓ Svelte 5
✓ Documentation
✓ Recent bug-fixing discipline

The biggest weaknesses are:

🔴 API authentication boundary
🔴 Production credential fallbacks
🔴 Webhook authentication
🔴 Live external systems inside normal tests
🟠 DB adapter architecture
🟠 State transition enforcement
🟠 Monolithic frontend
🟠 Time handling duplicated
🟠 Audit deletion
🟠 Retry/idempotency
🟡 Missing CI
🟡 Documentation drift
If I were maintaining this project

I would freeze new features temporarily and do one focused:

Security + Reliability Hardening Pass

After that, I think this could reasonably move from roughly 7.6/10 → 8.5–9/10 without a rewrite.

And importantly, I would not start by changing the UI. The highest-value work is currently underneath it: authentication, API boundaries, data integrity, external API reliability, and test isolation.
