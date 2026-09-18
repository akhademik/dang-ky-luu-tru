# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 343 nodes · 699 edges · 21 communities (9 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `44ec2b44`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- db.ts
- biome.json
- devDependencies
- scripts
- DataTransformer
- types/index.ts
- CatalogManager
- compilerOptions
- GoogleSheetService
- catalogManager.ts
- TokenManager
- KbttClient
- apps_script_onedit.js
- app.d.ts
- RemoteD1Database
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 28 edges
2. `getDb()` - 28 edges
3. `CatalogManager` - 24 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `GoogleSheetService` - 18 edges
7. `StayService` - 17 edges
8. `SyncPipeline` - 16 edges
9. `TokenManager` - 15 edges
10. `KbttClient` - 14 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `include` --extends--> `src/**/*.js`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.svelte`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.ts`  [EXTRACTED]
  tsconfig.json → biome.json

## Import Cycles
- None detected.

## Communities (21 total, 8 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.09
Nodes (7): ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline

### Community 1 - "db.ts"
Cohesion: 0.13
Nodes (33): autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay(), generateId(), getAuditLogs() (+25 more)

### Community 2 - "biome.json"
Cohesion: 0.06
Nodes (33): source, assist, actions, noUnusedVariables, files, includes, formatter, enabled (+25 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (32): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+24 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 6 - "types/index.ts"
Cohesion: 0.11
Nodes (14): CompletenessResult, D1DatabaseLike, D1PreparedStatement, Guest, IngestResult, IngestResultItem, KbttLog, RawOcrRow (+6 more)

### Community 8 - "compilerOptions"
Cohesion: 0.12
Nodes (15): node_modules/**, public/**, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames (+7 more)

### Community 10 - "catalogManager.ts"
Cohesion: 0.25
Nodes (5): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem

### Community 13 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

## Knowledge Gaps
- **74 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `CatalogItem`, `Platform` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 126 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `biome.json`, `scripts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `db.ts`, `catalogManager.ts`, `types/index.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `db.ts`, `KbttClient`, `types/index.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08897959183673469 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1346938775510204 - nodes in this community are weakly interconnected._