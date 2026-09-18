# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 428 nodes · 866 edges · 25 communities (16 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b37509b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- db.ts
- compilerOptions
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
- validator.ts
- TokenManager
- wrangler.json
- apps_script_onedit.js
- app.d.ts
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

## Communities (25 total, 3 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.09
Nodes (10): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, CompletenessResult (+2 more)

### Community 1 - "db.ts"
Cohesion: 0.12
Nodes (27): clearAuditLogs(), deleteAuditLog(), getAuditLogs(), generateId(), updateGuest(), upsertGuest(), DashboardStats, getDashboardStats() (+19 more)

### Community 2 - "compilerOptions"
Cohesion: 0.05
Nodes (38): includes, src/**/*.js, src/**/*.ts, test/**/*.ts, entry, ignoreDependencies, project, $schema (+30 more)

### Community 3 - "DataTransformer"
Cohesion: 0.16
Nodes (6): DataTransformer, generateId(), logKbttAction(), getStayById(), StayService, runTransformerUnitTests()

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (31): author, description, keywords, license, main, name, scripts, build (+23 more)

### Community 5 - "getDb"
Cohesion: 0.10
Nodes (17): getDb(), RemoteD1Database, POST(), GET(), DELETE(), GET(), POST(), POST() (+9 more)

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
Cohesion: 0.27
Nodes (10): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), GET(), POST(), POST() (+2 more)

### Community 12 - "time.ts"
Cohesion: 0.40
Nodes (13): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+5 more)

### Community 13 - "validator.ts"
Cohesion: 0.37
Nodes (11): ALLOWED_STATUS_TRANSITIONS, assertValidTransition(), isValidCccd(), isValidPassport(), isValidStayStatusTransition(), validateStayCheckoutInput(), validateStayExtensionInput(), validateStayRegistrationInput() (+3 more)

### Community 15 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 16 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 17 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **98 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `IngestResultItem`, `DashboardStats` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 158 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `db.ts`, `catalogManager.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `db.ts`, `GoogleSheetService`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08853410740203194 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12439024390243902 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._