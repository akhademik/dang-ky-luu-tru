# Graph Report - dang-ky-luu-tru  (2026-09-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 310 nodes · 649 edges · 16 communities (8 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1262158f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- syncPipeline.ts
- CatalogManager
- compilerOptions
- scripts
- devDependencies
- TokenManager
- DataTransformer
- biome.json
- GoogleSheetService
- apps_script_onedit.js
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `CatalogManager` - 30 edges
2. `DataTransformer` - 28 edges
3. `getDb()` - 23 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `SyncPipeline` - 19 edges
7. `TokenManager` - 18 edges
8. `GoogleSheetService` - 18 edges
9. `StayService` - 17 edges
10. `KbttClient` - 17 edges

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

## Communities (16 total, 4 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.12
Nodes (36): checkoutStay(), D1DatabaseLike, D1PreparedStatement, deleteStay(), extendStay(), generateId(), getAuditLogs(), getDashboardStats() (+28 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.09
Nodes (10): ApiEnvironment, CONFIG, RawOcrRow, TabInfo, ApiResponse, LogEntry, Logger, LogLevel (+2 more)

### Community 2 - "CatalogManager"
Cohesion: 0.09
Nodes (10): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, TINH_TP_DATA, CatalogItem, CatalogManager, CompletenessResult (+2 more)

### Community 3 - "compilerOptions"
Cohesion: 0.07
Nodes (30): includes, entry, ignoreDependencies, project, $schema, tailwindcss, node_modules/**, public/** (+22 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (25): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, svelte, svelte-check, @sveltejs/adapter-cloudflare (+17 more)

### Community 8 - "biome.json"
Cohesion: 0.11
Nodes (17): source, assist, actions, noUnusedVariables, files, formatter, enabled, indentStyle (+9 more)

### Community 10 - "apps_script_onedit.js"
Cohesion: 0.47
Nodes (3): installTrigger(), onEdit(), syncRowToCloudflare()

## Knowledge Gaps
- **72 isolated node(s):** `Guest`, `KbttLog`, `IngestResult`, `IngestResultItem`, `LogEntry` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 111 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `db.ts`, `syncPipeline.ts`, `TokenManager`, `DataTransformer`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `compilerOptions`, `scripts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `includes` connect `compilerOptions` to `biome.json`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Guest`, `KbttLog`, `IngestResult` to the rest of the system?**
  _72 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11554748941318814 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08784313725490196 - nodes in this community are weakly interconnected._