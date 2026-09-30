# Graph Report - dang-ky-luu-tru  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 465 nodes · 988 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7039ee54`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- syncPipeline.ts
- compilerOptions
- devDependencies
- scripts
- getDb
- DataTransformer
- auth.ts
- catalogManager.ts
- GoogleSheetService
- CatalogManager
- biome.json
- time.ts
- validator.ts
- apps_script_onedit.js
- app.d.ts
- svelte-deprecation.test.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 29 edges
2. `DataTransformer` - 28 edges
3. `CatalogManager` - 25 edges
4. `StayService` - 23 edges
5. `Logger` - 22 edges
6. `SyncPipeline` - 19 edges
7. `GoogleSheetService` - 18 edges
8. `scripts` - 18 edges
9. `TokenManager` - 16 edges
10. `CONFIG` - 16 edges

## Surprising Connections (you probably didn't know these)
- `include` --extends--> `src/**/*.js`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.ts`  [EXTRACTED]
  tsconfig.json → biome.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts
- `runStayServiceIntegrationTests()` --calls--> `getDashboardStats()`  [EXTRACTED]
  test/integration/stay-service.test.ts → src/lib/server/repositories/statsRepository.ts

## Import Cycles
- None detected.

## Communities (24 total, 9 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.07
Nodes (46): ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_path, src_lib_server_datatransformer_rawocrrow, src_lib_server_db_getauditlogs, src_lib_server_db_logkbttaction, src_lib_server_db_updateguest (+38 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.07
Nodes (11): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, TokenManager (+3 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (35): includes, entry, ignoreDependencies, project, $schema, tailwindcss, node_modules/**, public/** (+27 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (34): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+26 more)

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (33): author, description, keywords, license, main, name, scripts, build (+25 more)

### Community 5 - "getDb"
Cohesion: 0.10
Nodes (16): ref_sveltejs_kit, getDb(), RemoteD1Database, StayService, POST(), DELETE(), GET(), POST() (+8 more)

### Community 6 - "DataTransformer"
Cohesion: 0.19
Nodes (3): DataTransformer, POST(), runTransformerUnitTests()

### Community 7 - "auth.ts"
Cohesion: 0.26
Nodes (19): handle(), base64UrlDecode(), base64UrlEncode(), checkRateLimit(), createSessionToken(), getIngestApiKey(), getServerPassword(), getSigningKey() (+11 more)

### Community 8 - "catalogManager.ts"
Cohesion: 0.13
Nodes (12): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, COUNTRY_OPTIONS, countryNameMap, LOAI_GIAY_TO_OPTIONS (+4 more)

### Community 9 - "GoogleSheetService"
Cohesion: 0.17
Nodes (3): GoogleSheetService, KbttClient, runLiveBcaPipelineTests()

### Community 11 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 12 - "time.ts"
Cohesion: 0.40
Nodes (13): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+5 more)

### Community 13 - "validator.ts"
Cohesion: 0.37
Nodes (11): ALLOWED_STATUS_TRANSITIONS, assertValidTransition(), isValidCccd(), isValidPassport(), isValidStayStatusTransition(), validateStayCheckoutInput(), validateStayExtensionInput(), validateStayRegistrationInput() (+3 more)

### Community 14 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 15 - "app.d.ts"
Cohesion: 0.33
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **98 isolated node(s):** `IngestResultItem`, `DashboardStats`, `Row`, `ApiResponse`, `LogEntry` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 163 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `catalogManager.ts`, `syncPipeline.ts`, `db.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `db.ts`, `syncPipeline.ts`, `GoogleSheetService`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `IngestResultItem`, `DashboardStats`, `Row` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07287784679089027 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07373271889400922 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.05855855855855856 - nodes in this community are weakly interconnected._