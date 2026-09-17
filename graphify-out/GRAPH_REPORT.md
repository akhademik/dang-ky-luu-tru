# Graph Report - dang-ky-luu-tru  (2026-09-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 333 nodes · 677 edges · 19 communities (8 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6301e077`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- syncPipeline.ts
- devDependencies
- compilerOptions
- scripts
- CatalogManager
- DataTransformer
- biome.json
- TokenManager
- catalogManager.ts
- GoogleSheetService
- apps_script_onedit.js
- RemoteD1Database
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `CatalogManager` - 29 edges
2. `DataTransformer` - 27 edges
3. `getDb()` - 25 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `SyncPipeline` - 19 edges
7. `GoogleSheetService` - 18 edges
8. `TokenManager` - 18 edges
9. `KbttClient` - 16 edges
10. `StayService` - 15 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `include` --extends--> `src/**/*.js`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.svelte`  [EXTRACTED]
  tsconfig.json → biome.json
- `include` --extends--> `src/**/*.ts`  [EXTRACTED]
  tsconfig.json → biome.json

## Import Cycles
- None detected.

## Communities (19 total, 6 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.09
Nodes (38): App, Platform, checkoutStay(), D1DatabaseLike, D1PreparedStatement, deleteStay(), extendStay(), generateId() (+30 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.08
Nodes (10): ApiEnvironment, CONFIG, RawOcrRow, TabInfo, ApiResponse, LogEntry, Logger, LogLevel (+2 more)

### Community 2 - "devDependencies"
Cohesion: 0.06
Nodes (32): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check (+24 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (30): includes, entry, ignoreDependencies, project, $schema, tailwindcss, node_modules/**, public/** (+22 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 7 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 9 - "catalogManager.ts"
Cohesion: 0.23
Nodes (9): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, TINH_TP_DATA, CatalogItem, CompletenessResult, TransformedRowResult (+1 more)

### Community 11 - "apps_script_onedit.js"
Cohesion: 0.47
Nodes (3): installTrigger(), onEdit(), syncRowToCloudflare()

## Knowledge Gaps
- **79 isolated node(s):** `IngestResult`, `IngestResultItem`, `Guest`, `KbttLog`, `TabInfo` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `CatalogManager` connect `CatalogManager` to `db.ts`, `syncPipeline.ts`, `catalogManager.ts`, `DataTransformer`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `includes` connect `compilerOptions` to `biome.json`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IngestResult`, `IngestResultItem`, `Guest` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09471153846153846 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08345428156748912 - nodes in this community are weakly interconnected._