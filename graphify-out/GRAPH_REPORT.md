# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 351 nodes · 743 edges · 20 communities (11 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a7d4930`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- syncPipeline.ts
- devDependencies
- DataTransformer
- scripts
- compilerOptions
- CatalogManager
- biome.json
- TokenManager
- catalogManager.ts
- wrangler.json
- apps_script_onedit.js
- login/+server.ts
- RemoteD1Database
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 30 edges
2. `CatalogManager` - 28 edges
3. `getDb()` - 28 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `StayService` - 20 edges
7. `SyncPipeline` - 19 edges
8. `GoogleSheetService` - 18 edges
9. `TokenManager` - 18 edges
10. `KbttClient` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `include` --extends--> `src/**/*.svelte`  [EXTRACTED]
  tsconfig.json → biome.json
- `runTests()` --calls--> `checkoutStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts
- `runTests()` --calls--> `extendStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts

## Import Cycles
- None detected.

## Communities (20 total, 4 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.09
Nodes (43): App, Platform, autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay() (+35 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.07
Nodes (9): ApiEnvironment, CONFIG, GoogleSheetService, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline (+1 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (37): @biomejs/biome, jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies (+29 more)

### Community 3 - "DataTransformer"
Cohesion: 0.20
Nodes (6): DataTransformer, CompletenessResult, RawOcrRow, SyncResult, TransformedRowResult, POST()

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 5 - "compilerOptions"
Cohesion: 0.08
Nodes (24): includes, src/**/*.js, src/**/*.svelte, src/**/*.ts, test/**/*.ts, node_modules/**, public/**, ./.svelte-kit/tsconfig.json (+16 more)

### Community 7 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 9 - "catalogManager.ts"
Cohesion: 0.29
Nodes (5): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem

### Community 10 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 11 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 12 - "login/+server.ts"
Cohesion: 0.53
Nodes (4): GET(), getAppPassword(), getKbttEnv(), POST()

## Knowledge Gaps
- **79 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `CatalogItem`, `App` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `db.ts`, `syncPipeline.ts`, `DataTransformer`, `catalogManager.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `db.ts`, `syncPipeline.ts`, `CatalogManager`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08738277919863598 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07457627118644068 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._