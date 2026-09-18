# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 433 nodes · 883 edges · 26 communities (16 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `70f792df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- devDependencies
- DataTransformer
- db.ts
- scripts
- getDb
- catalogManager.ts
- dataTransformer.ts
- CatalogManager
- biome.json
- compilerOptions
- time.ts
- D1PreparedStatement
- GoogleSheetService
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
9. `KbttClient` - 16 edges
10. `TokenManager` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts
- `include` --extends--> `src/**/*.js`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.ts`  [EXTRACTED]
  tsconfig.json → biome.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runTimeUnitTests()` --calls--> `formatDateTimeToGmt7()`  [EXTRACTED]
  test/unit/time.test.ts → src/lib/server/time.ts

## Import Cycles
- None detected.

## Communities (26 total, 5 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.08
Nodes (10): ApiEnvironment, CONFIG, ApiResponse, KbttClient, LogEntry, Logger, LogLevel, SyncPipeline (+2 more)

### Community 1 - "devDependencies"
Cohesion: 0.05
Nodes (46): includes, @biomejs/biome, jiti, entry, ignoreDependencies, project, $schema, devDependencies (+38 more)

### Community 2 - "DataTransformer"
Cohesion: 0.16
Nodes (6): DataTransformer, generateId(), logKbttAction(), getStayById(), StayService, runTransformerUnitTests()

### Community 3 - "db.ts"
Cohesion: 0.15
Nodes (26): clearAuditLogs(), deleteAuditLog(), getAuditLogs(), generateId(), updateGuest(), upsertGuest(), DashboardStats, getDashboardStats() (+18 more)

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (31): author, description, keywords, license, main, name, scripts, build (+23 more)

### Community 5 - "getDb"
Cohesion: 0.11
Nodes (16): getDb(), RemoteD1Database, POST(), GET(), DELETE(), GET(), POST(), POST() (+8 more)

### Community 6 - "catalogManager.ts"
Cohesion: 0.12
Nodes (11): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, COUNTRY_OPTIONS, countryNameMap, LOAI_GIAY_TO_OPTIONS (+3 more)

### Community 7 - "dataTransformer.ts"
Cohesion: 0.22
Nodes (12): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), CompletenessResult, TransformedRowResult, GET() (+4 more)

### Community 9 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (15): node_modules/**, public/**, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames (+7 more)

### Community 11 - "time.ts"
Cohesion: 0.40
Nodes (13): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+5 more)

### Community 12 - "D1PreparedStatement"
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
- **96 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `Row`, `ValidationResult` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 153 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `db.ts`, `catalogManager.ts`, `dataTransformer.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `db.ts`, `dataTransformer.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07627118644067797 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045328399629972246 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._