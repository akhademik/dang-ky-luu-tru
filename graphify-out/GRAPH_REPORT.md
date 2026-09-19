# Graph Report - dang-ky-luu-tru  (2026-09-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 451 nodes · 935 edges · 24 communities (13 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b7d8969`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stayService.ts
- db.ts
- compilerOptions
- scripts
- getDb
- validator.ts
- devDependencies
- auth.ts
- DataTransformer
- GoogleSheetService
- catalogManager.ts
- CatalogManager
- biome.json
- TokenManager
- wrangler.json
- apps_script_onedit.js
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
9. `TokenManager` - 16 edges
10. `KbttClient` - 16 edges

## Surprising Connections (you probably didn't know these)
- `include` --extends--> `src/**/*.js`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.ts`  [EXTRACTED]
  tsconfig.json → biome.json
- `runLiveBcaPipelineTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/googleSheetService.ts
- `runLiveBcaPipelineTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/live/live-bca-pipeline.test.ts → src/lib/server/kbttClient.ts
- `runStayServiceIntegrationTests()` --calls--> `getStayById()`  [EXTRACTED]
  test/integration/stay-service.test.ts → src/lib/server/repositories/stayRepository.ts

## Import Cycles
- None detected.

## Communities (24 total, 5 thin omitted)

### Community 0 - "stayService.ts"
Cohesion: 0.07
Nodes (18): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline, CompletenessResult (+10 more)

### Community 1 - "db.ts"
Cohesion: 0.08
Nodes (31): App, Locals, Platform, clearAuditLogs(), deleteAuditLog(), generateId(), getAuditLogs(), logKbttAction() (+23 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (35): includes, entry, ignoreDependencies, project, $schema, tailwindcss, node_modules/**, public/** (+27 more)

### Community 3 - "scripts"
Cohesion: 0.06
Nodes (33): author, description, keywords, license, main, name, scripts, build (+25 more)

### Community 4 - "getDb"
Cohesion: 0.11
Nodes (16): getDb(), RemoteD1Database, POST(), GET(), DELETE(), GET(), POST(), POST() (+8 more)

### Community 5 - "validator.ts"
Cohesion: 0.20
Nodes (24): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+16 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+19 more)

### Community 7 - "auth.ts"
Cohesion: 0.23
Nodes (22): handle(), base64UrlDecode(), base64UrlEncode(), checkLoginRateLimit(), createSessionToken(), getIngestApiKey(), getServerPassword(), getSigningKey() (+14 more)

### Community 9 - "GoogleSheetService"
Cohesion: 0.15
Nodes (4): GoogleSheetService, KbttClient, TabInfo, runLiveBcaPipelineTests()

### Community 10 - "catalogManager.ts"
Cohesion: 0.12
Nodes (11): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem, COUNTRY_OPTIONS, countryNameMap, LOAI_GIAY_TO_OPTIONS (+3 more)

### Community 12 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 14 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 15 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

## Knowledge Gaps
- **100 isolated node(s):** `IngestResultItem`, `ApiResponse`, `LogEntry`, `LogLevel`, `Locals` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 158 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `stayService.ts`, `catalogManager.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `stayService.ts`, `GoogleSheetService`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `IngestResultItem`, `ApiResponse`, `LogEntry` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stayService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0744047619047619 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08458646616541353 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.05855855855855856 - nodes in this community are weakly interconnected._