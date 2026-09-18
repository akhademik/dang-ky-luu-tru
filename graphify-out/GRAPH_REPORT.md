# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 430 nodes · 869 edges · 24 communities (15 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3f7962b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- db.ts
- compilerOptions
- scripts
- getDb
- DataTransformer
- devDependencies
- GoogleSheetService
- catalogManager.ts
- CatalogManager
- biome.json
- auth.ts
- time.ts
- validator.ts
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- svelte-deprecation.test.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 29 edges
2. `getDb()` - 29 edges
3. `CatalogManager` - 25 edges
4. `Logger` - 22 edges
5. `SyncPipeline` - 19 edges
6. `StayService` - 19 edges
7. `GoogleSheetService` - 18 edges
8. `CONFIG` - 17 edges
9. `TokenManager` - 16 edges
10. `KbttClient` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runStayServiceIntegrationTests()` --calls--> `getDb()`  [EXTRACTED]
  test/integration/stay-service.test.ts → src/lib/server/db.ts
- `includes` --extends--> `src/**/*.svelte`  [EXTRACTED]
  biome.json → tsconfig.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts
- `runAuthSecurityApiTests()` --calls--> `handle()`  [EXTRACTED]
  test/api/auth-security.test.ts → src/hooks.server.ts

## Import Cycles
- None detected.

## Communities (24 total, 4 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.08
Nodes (8): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, TokenManager

### Community 1 - "db.ts"
Cohesion: 0.09
Nodes (32): clearAuditLogs(), deleteAuditLog(), generateId(), getAuditLogs(), logKbttAction(), generateId(), updateGuest(), upsertGuest() (+24 more)

### Community 2 - "compilerOptions"
Cohesion: 0.05
Nodes (38): includes, src/**/*.js, src/**/*.ts, test/**/*.ts, entry, ignoreDependencies, project, $schema (+30 more)

### Community 3 - "scripts"
Cohesion: 0.06
Nodes (31): author, description, keywords, license, main, name, scripts, build (+23 more)

### Community 4 - "getDb"
Cohesion: 0.11
Nodes (18): getDb(), RemoteD1Database, StayService, POST(), GET(), DELETE(), GET(), POST() (+10 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+19 more)

### Community 7 - "GoogleSheetService"
Cohesion: 0.15
Nodes (4): GoogleSheetService, KbttClient, TabInfo, runLiveBcaPipelineTests()

### Community 8 - "catalogManager.ts"
Cohesion: 0.11
Nodes (9): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, COUNTRY_OPTIONS, countryNameMap, LOAI_GIAY_TO_OPTIONS (+1 more)

### Community 10 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 11 - "auth.ts"
Cohesion: 0.27
Nodes (10): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), GET(), POST(), POST() (+2 more)

### Community 12 - "time.ts"
Cohesion: 0.40
Nodes (13): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+5 more)

### Community 13 - "validator.ts"
Cohesion: 0.37
Nodes (11): ALLOWED_STATUS_TRANSITIONS, assertValidTransition(), isValidCccd(), isValidPassport(), isValidStayStatusTransition(), validateStayCheckoutInput(), validateStayExtensionInput(), validateStayRegistrationInput() (+3 more)

### Community 14 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 15 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 16 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **98 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `DashboardStats`, `IngestResultItem` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 157 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `catalogManager.ts`, `db.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `db.ts`, `getDb`, `GoogleSheetService`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08350168350168351 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09292929292929293 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._