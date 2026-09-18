# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 406 nodes · 859 edges · 20 communities (14 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `362893e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- db.ts
- compilerOptions
- devDependencies
- CatalogManager
- scripts
- DataTransformer
- GoogleSheetService
- types/index.ts
- auth.ts
- time.ts
- validator.ts
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 29 edges
2. `DataTransformer` - 28 edges
3. `CatalogManager` - 25 edges
4. `Logger` - 22 edges
5. `SyncPipeline` - 19 edges
6. `StayService` - 18 edges
7. `GoogleSheetService` - 18 edges
8. `getStayById()` - 18 edges
9. `CONFIG` - 17 edges
10. `TokenManager` - 16 edges

## Surprising Connections (you probably didn't know these)
- `includes` --extends--> `src/**/*.svelte`  [EXTRACTED]
  biome.json → tsconfig.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts
- `POST()` --calls--> `getDb()`  [EXTRACTED]
  src/routes/api/sheets/pull/+server.ts → src/lib/server/db.ts
- `runStayServiceIntegrationTests()` --calls--> `checkoutStay()`  [EXTRACTED]
  test/integration/stay-service.test.ts → src/lib/server/db.ts

## Import Cycles
- None detected.

## Communities (20 total, 2 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.08
Nodes (9): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, TokenManager (+1 more)

### Community 1 - "db.ts"
Cohesion: 0.12
Nodes (34): autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay(), generateId(), getAuditLogs() (+26 more)

### Community 2 - "compilerOptions"
Cohesion: 0.04
Nodes (43): source, assist, actions, noUnusedVariables, files, includes, formatter, enabled (+35 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (37): @biomejs/biome, jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies (+29 more)

### Community 4 - "CatalogManager"
Cohesion: 0.09
Nodes (6): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, CatalogManager

### Community 5 - "scripts"
Cohesion: 0.06
Nodes (30): author, description, keywords, license, main, name, scripts, build (+22 more)

### Community 7 - "GoogleSheetService"
Cohesion: 0.15
Nodes (4): GoogleSheetService, KbttClient, TabInfo, runLiveBcaPipelineTests()

### Community 8 - "types/index.ts"
Cohesion: 0.11
Nodes (12): CompletenessResult, D1DatabaseLike, D1PreparedStatement, Guest, IngestResult, IngestResultItem, KbttLog, RawOcrRow (+4 more)

### Community 9 - "auth.ts"
Cohesion: 0.27
Nodes (10): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), GET(), POST(), POST() (+2 more)

### Community 10 - "time.ts"
Cohesion: 0.40
Nodes (13): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+5 more)

### Community 11 - "validator.ts"
Cohesion: 0.37
Nodes (11): ALLOWED_STATUS_TRANSITIONS, assertValidTransition(), isValidCccd(), isValidPassport(), isValidStayStatusTransition(), validateStayCheckoutInput(), validateStayExtensionInput(), validateStayRegistrationInput() (+3 more)

### Community 12 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 13 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 14 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **89 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `ValidationResult`, `Locals` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 142 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `types/index.ts`, `db.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `types/index.ts`, `db.ts`, `GoogleSheetService`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Logger` connect `syncPipeline.ts` to `types/index.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _89 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07864488808227466 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1243885394828791 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._