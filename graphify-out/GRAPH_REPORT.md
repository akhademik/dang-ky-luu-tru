# Graph Report - dang-ky-luu-tru  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 255 nodes · 474 edges · 16 communities (6 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d75ee2f6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- syncPipeline.ts
- scripts
- devDependencies
- compilerOptions
- DataTransformer
- CatalogManager
- TokenManager
- Logger
- entry
- GoogleSheetService
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 26 edges
2. `CatalogManager` - 22 edges
3. `Logger` - 19 edges
4. `SyncPipeline` - 18 edges
5. `GoogleSheetService` - 18 edges
6. `TokenManager` - 17 edges
7. `runTests()` - 15 edges
8. `renderTable()` - 13 edges
9. `KbttClient` - 12 edges
10. `CONFIG` - 12 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `ignoreDependencies` --extends--> `tailwindcss`  [EXTRACTED]
  knip.json → package.json
- `SyncResult` --references--> `RawOcrRow`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts
- `SyncPipeline` --references--> `CatalogManager`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/catalogManager.ts

## Import Cycles
- None detected.

## Communities (16 total, 6 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.10
Nodes (44): addNewRow(), availableTabs, catalogData, checkTokenStatus(), cleanRoomNumber(), closeEditModal(), copyCountryCode(), currentRows (+36 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.12
Nodes (12): CatalogItem, CONFIG, CompletenessResult, RawOcrRow, TransformedRowResult, TabInfo, ApiResponse, LogEntry (+4 more)

### Community 2 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 3 - "devDependencies"
Cohesion: 0.09
Nodes (23): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, svelte, svelte-check, @sveltejs/adapter-node (+15 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node_modules/**, public/**, src/**/*.js, src/**/*.svelte, src/**/*.ts, ./.svelte-kit/tsconfig.json, test/**/*.ts, compilerOptions (+12 more)

### Community 9 - "entry"
Cohesion: 0.18
Nodes (11): entry, ignoreDependencies, test/**/*.ts, project, $schema, tailwindcss, src/index.ts, src/**/*.{js,ts,svelte} (+3 more)

## Knowledge Gaps
- **72 isolated node(s):** `CatalogItem`, `CompletenessResult`, `TransformedRowResult`, `TabInfo`, `ApiResponse` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 104 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `DataTransformer`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `CatalogManager`, `TokenManager`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `entry`, `scripts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `CatalogItem`, `CompletenessResult`, `TransformedRowResult` to the rest of the system?**
  _72 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11707317073170732 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._