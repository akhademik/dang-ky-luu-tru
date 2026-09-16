# Graph Report - dang-ky-luu-tru  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 251 nodes · 457 edges · 15 communities (7 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `243f42f6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- syncPipeline.ts
- package.json
- +page.svelte
- devDependencies
- compilerOptions
- DataTransformer
- TokenManager
- CatalogManager
- entry
- GoogleSheetService
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 25 edges
2. `CatalogManager` - 21 edges
3. `SyncPipeline` - 17 edges
4. `TokenManager` - 17 edges
5. `GoogleSheetService` - 16 edges
6. `runTests()` - 15 edges
7. `renderTable()` - 13 edges
8. `KbttClient` - 12 edges
9. `CONFIG` - 11 edges
10. `updatePayloadPreview()` - 10 edges

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

## Communities (15 total, 5 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.10
Nodes (44): addNewRow(), availableTabs, catalogData, checkTokenStatus(), cleanRoomNumber(), closeEditModal(), copyCountryCode(), currentRows (+36 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.13
Nodes (10): CatalogItem, CONFIG, CompletenessResult, RawOcrRow, TransformedRowResult, TabInfo, ApiResponse, SyncPipeline (+2 more)

### Community 2 - "package.json"
Cohesion: 0.08
Nodes (24): author, description, keywords, license, main, name, scripts, build (+16 more)

### Community 3 - "+page.svelte"
Cohesion: 0.13
Nodes (16): addNewRow(), checkToken(), closeEditModal(), executeSyncBatch(), handleManualLogin(), loadSampleData(), parseAndApplyAddress(), pushSelectedRows() (+8 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): jiti, devDependencies, jiti, svelte, svelte-check, @sveltejs/adapter-node, @sveltejs/kit, @sveltejs/vite-plugin-svelte (+13 more)

### Community 5 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node_modules/**, public/**, src/**/*.js, src/**/*.svelte, src/**/*.ts, ./.svelte-kit/tsconfig.json, test/**/*.ts, compilerOptions (+12 more)

### Community 9 - "entry"
Cohesion: 0.18
Nodes (11): entry, ignoreDependencies, test/**/*.ts, project, $schema, tailwindcss, src/index.ts, src/**/*.{js,ts,svelte} (+3 more)

## Knowledge Gaps
- **67 isolated node(s):** `CatalogItem`, `CompletenessResult`, `TransformedRowResult`, `TabInfo`, `ApiResponse` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 99 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `entry`, `package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `DataTransformer`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `CatalogManager`, `syncPipeline.ts`, `TokenManager`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `CatalogItem`, `CompletenessResult`, `TransformedRowResult` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._