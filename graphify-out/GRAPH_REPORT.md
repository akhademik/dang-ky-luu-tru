# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 437 nodes · 884 edges · 26 communities (17 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `922d7c0a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- compilerOptions
- db.ts
- DataTransformer
- scripts
- getDb
- devDependencies
- catalogManager.ts
- GoogleSheetService
- CatalogManager
- biome.json
- auth.ts
- time.ts
- D1PreparedStatement
- validator.ts
- TokenManager
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- svelte-deprecation.test.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 29 edges
2. `getDb()` - 27 edges
3. `CatalogManager` - 25 edges
4. `Logger` - 22 edges
5. `SyncPipeline` - 19 edges
6. `StayService` - 19 edges
7. `GoogleSheetService` - 18 edges
8. `CONFIG` - 17 edges
9. `TokenManager` - 16 edges
10. `KbttClient` - 16 edges

## Surprising Connections (you probably didn't know these)
- `includes` --extends--> `src/**/*.svelte`  [EXTRACTED]
  biome.json → tsconfig.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts
- `runAuthSecurityApiTests()` --calls--> `handle()`  [EXTRACTED]
  test/api/auth-security.test.ts → src/hooks.server.ts
- `runAuthSecurityApiTests()` --calls--> `verifySession()`  [EXTRACTED]
  test/api/auth-security.test.ts → src/lib/server/auth.ts

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.09
Nodes (9): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, RawOcrRow (+1 more)

### Community 1 - "compilerOptions"
Cohesion: 0.05
Nodes (38): includes, src/**/*.js, src/**/*.ts, test/**/*.ts, entry, ignoreDependencies, project, $schema (+30 more)

### Community 2 - "db.ts"
Cohesion: 0.13
Nodes (30): clearAuditLogs(), deleteAuditLog(), generateId(), getAuditLogs(), logKbttAction(), generateId(), updateGuest(), upsertGuest() (+22 more)

### Community 3 - "DataTransformer"
Cohesion: 0.17
Nodes (4): DataTransformer, getStayById(), StayService, runTransformerUnitTests()

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (31): author, description, keywords, license, main, name, scripts, build (+23 more)

### Community 5 - "getDb"
Cohesion: 0.11
Nodes (16): getDb(), RemoteD1Database, POST(), GET(), DELETE(), GET(), POST(), POST() (+8 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+19 more)

### Community 7 - "catalogManager.ts"
Cohesion: 0.11
Nodes (9): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, COUNTRY_OPTIONS, countryNameMap, LOAI_GIAY_TO_OPTIONS (+1 more)

### Community 8 - "GoogleSheetService"
Cohesion: 0.16
Nodes (3): GoogleSheetService, KbttClient, runLiveBcaPipelineTests()

### Community 10 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 11 - "auth.ts"
Cohesion: 0.31
Nodes (9): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), GET(), POST(), load() (+1 more)

### Community 12 - "time.ts"
Cohesion: 0.40
Nodes (13): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+5 more)

### Community 13 - "D1PreparedStatement"
Cohesion: 0.20
Nodes (4): D1PreparedStatement, MockD1Database, Row, runStayServiceIntegrationTests()

### Community 14 - "validator.ts"
Cohesion: 0.37
Nodes (11): ALLOWED_STATUS_TRANSITIONS, assertValidTransition(), isValidCccd(), isValidPassport(), isValidStayStatusTransition(), validateStayCheckoutInput(), validateStayExtensionInput(), validateStayRegistrationInput() (+3 more)

### Community 16 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 17 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 18 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **99 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `Row`, `ValidationResult` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 159 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `db.ts`, `catalogManager.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `GoogleSheetService`, `db.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08925979680696662 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._