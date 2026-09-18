# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 351 nodes · 739 edges · 21 communities (10 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `959db9a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- db.ts
- devDependencies
- biome.json
- scripts
- DataTransformer
- CatalogManager
- compilerOptions
- GoogleSheetService
- catalogManager.ts
- wrangler.json
- apps_script_onedit.js
- app.d.ts
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
8. `TokenManager` - 18 edges
9. `GoogleSheetService` - 18 edges
10. `KbttClient` - 17 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `include` --extends--> `src/**/*.svelte`  [EXTRACTED]
  tsconfig.json → biome.json
- `Platform` --references--> `D1DatabaseLike`  [EXTRACTED]
  src/app.d.ts → src/lib/types/index.ts
- `runTests()` --calls--> `checkoutStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts

## Import Cycles
- None detected.

## Communities (21 total, 5 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.06
Nodes (9): ApiEnvironment, CONFIG, ApiResponse, KbttClient, LogEntry, Logger, LogLevel, SyncPipeline (+1 more)

### Community 1 - "db.ts"
Cohesion: 0.09
Nodes (43): autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay(), generateId(), getAuditLogs() (+35 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (37): @biomejs/biome, jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies (+29 more)

### Community 3 - "biome.json"
Cohesion: 0.07
Nodes (26): source, assist, actions, noUnusedVariables, files, includes, formatter, enabled (+18 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 5 - "DataTransformer"
Cohesion: 0.22
Nodes (4): DataTransformer, CompletenessResult, RawOcrRow, SyncResult

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (15): node_modules/**, public/**, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames (+7 more)

### Community 9 - "catalogManager.ts"
Cohesion: 0.29
Nodes (5): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem

### Community 10 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 11 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

## Knowledge Gaps
- **79 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `CatalogItem`, `compatibility_date` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 130 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `catalogManager.ts`, `DataTransformer`, `db.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `db.ts`, `CatalogManager`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0649692712906058 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09262510974539069 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._