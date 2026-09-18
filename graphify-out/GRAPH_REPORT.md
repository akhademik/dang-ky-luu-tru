# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 363 nodes · 754 edges · 19 communities (12 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `949fd75c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- syncPipeline.ts
- devDependencies
- scripts
- compilerOptions
- DataTransformer
- CatalogManager
- biome.json
- catalogManager.ts
- GoogleSheetService
- login/+server.ts
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 29 edges
2. `getDb()` - 29 edges
3. `CatalogManager` - 27 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `StayService` - 19 edges
7. `SyncPipeline` - 19 edges
8. `GoogleSheetService` - 18 edges
9. `KbttClient` - 17 edges
10. `TokenManager` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `include` --extends--> `src/**/*.svelte`  [EXTRACTED]
  tsconfig.json → biome.json
- `runTests()` --calls--> `checkoutStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts
- `runTests()` --calls--> `extendStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts

## Import Cycles
- None detected.

## Communities (19 total, 3 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.08
Nodes (45): autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay(), generateId(), getAuditLogs() (+37 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.07
Nodes (9): ApiEnvironment, CONFIG, ApiResponse, KbttClient, LogEntry, Logger, LogLevel, SyncPipeline (+1 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (37): @biomejs/biome, jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies (+29 more)

### Community 3 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 4 - "compilerOptions"
Cohesion: 0.08
Nodes (24): includes, src/**/*.js, src/**/*.svelte, src/**/*.ts, test/**/*.ts, node_modules/**, public/**, ./.svelte-kit/tsconfig.json (+16 more)

### Community 5 - "DataTransformer"
Cohesion: 0.24
Nodes (4): DataTransformer, CompletenessResult, RawOcrRow, SyncResult

### Community 7 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 8 - "catalogManager.ts"
Cohesion: 0.21
Nodes (5): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem

### Community 10 - "login/+server.ts"
Cohesion: 0.33
Nodes (6): handle(), getServerPassword(), verifySession(), GET(), POST(), load()

### Community 11 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 12 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 13 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **81 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `Locals`, `Platform` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 133 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `catalogManager.ts`, `syncPipeline.ts`, `DataTransformer`, `db.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `db.ts`, `syncPipeline.ts`, `CatalogManager`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07826384142173616 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06603346901854365 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._