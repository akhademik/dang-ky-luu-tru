# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 438 nodes · 891 edges · 26 communities (16 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de5ae12e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- syncPipeline.ts
- compilerOptions
- scripts
- DataTransformer
- getDb
- devDependencies
- GoogleSheetService
- catalogManager.ts
- dataTransformer.ts
- CatalogManager
- biome.json
- time.ts
- validator.ts
- TokenManager
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- svelte-deprecation.test.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 28 edges
2. `getDb()` - 27 edges
3. `CatalogManager` - 25 edges
4. `Logger` - 22 edges
5. `SyncPipeline` - 19 edges
6. `StayService` - 18 edges
7. `GoogleSheetService` - 18 edges
8. `scripts` - 18 edges
9. `CONFIG` - 17 edges
10. `TokenManager` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runStayServiceIntegrationTests()` --calls--> `getStayById()`  [EXTRACTED]
  test/integration/stay-service.test.ts → src/lib/server/repositories/stayRepository.ts
- `include` --extends--> `src/**/*.js`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.ts`  [EXTRACTED]
  tsconfig.json → biome.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.10
Nodes (32): clearAuditLogs(), deleteAuditLog(), generateId(), getAuditLogs(), logKbttAction(), generateId(), updateGuest(), upsertGuest() (+24 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.09
Nodes (9): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, RawOcrRow (+1 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (35): includes, entry, ignoreDependencies, project, $schema, tailwindcss, node_modules/**, public/** (+27 more)

### Community 3 - "scripts"
Cohesion: 0.06
Nodes (33): author, description, keywords, license, main, name, scripts, build (+25 more)

### Community 4 - "DataTransformer"
Cohesion: 0.17
Nodes (4): DataTransformer, getStayById(), StayService, runTransformerUnitTests()

### Community 5 - "getDb"
Cohesion: 0.11
Nodes (16): getDb(), RemoteD1Database, POST(), GET(), DELETE(), GET(), POST(), POST() (+8 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+19 more)

### Community 7 - "GoogleSheetService"
Cohesion: 0.15
Nodes (4): GoogleSheetService, KbttClient, TabInfo, runLiveBcaPipelineTests()

### Community 8 - "catalogManager.ts"
Cohesion: 0.12
Nodes (11): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, COUNTRY_OPTIONS, countryNameMap, LOAI_GIAY_TO_OPTIONS (+3 more)

### Community 9 - "dataTransformer.ts"
Cohesion: 0.22
Nodes (12): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), CompletenessResult, TransformedRowResult, GET() (+4 more)

### Community 11 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

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
- **98 isolated node(s):** `DashboardStats`, `IngestResultItem`, `Row`, `ApiResponse`, `LogEntry` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 156 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `catalogManager.ts`, `syncPipeline.ts`, `dataTransformer.ts`, `db.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `db.ts`, `syncPipeline.ts`, `dataTransformer.ts`, `GoogleSheetService`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `DashboardStats`, `IngestResultItem`, `Row` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1033182503770739 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09098039215686274 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.05855855855855856 - nodes in this community are weakly interconnected._