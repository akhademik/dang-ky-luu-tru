# Graph Report - dang-ky-luu-tru  (2026-09-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 259 nodes · 479 edges · 16 communities (6 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d31ed478`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- app.js
- Data Transformation & OCR Normalization
- Google Sheet Service & Apps Script Sync
- compilerOptions
- DataTransformer
- CatalogManager
- entry
- GoogleSheetService
- TokenManager
- KbttClient
- API Transform Service

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 24 edges
2. `Logger` - 22 edges
3. `CatalogManager` - 19 edges
4. `GoogleSheetService` - 17 edges
5. `SyncPipeline` - 16 edges
6. `runTests()` - 15 edges
7. `TokenManager` - 14 edges
8. `renderTable()` - 13 edges
9. `CONFIG` - 13 edges
10. `KbttClient` - 11 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `ignoreDependencies` --extends--> `tailwindcss`  [EXTRACTED]
  knip.json → package.json
- `SyncResult` --references--> `RawOcrRow`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts
- `SyncPipeline` --references--> `DataTransformer`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts

## Import Cycles
- None detected.

## Communities (16 total, 6 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.08
Nodes (14): CatalogItem, ApiEnvironment, CONFIG, CompletenessResult, RawOcrRow, TransformedRowResult, TabInfo, ApiResponse (+6 more)

### Community 1 - "app.js"
Cohesion: 0.10
Nodes (44): addNewRow(), availableTabs, catalogData, checkTokenStatus(), cleanRoomNumber(), closeEditModal(), copyCountryCode(), currentRows (+36 more)

### Community 2 - "Data Transformation & OCR Normalization"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 3 - "Google Sheet Service & Apps Script Sync"
Cohesion: 0.09
Nodes (23): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, svelte, svelte-check, @sveltejs/adapter-node (+15 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node_modules/**, public/**, src/**/*.js, src/**/*.svelte, src/**/*.ts, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs (+12 more)

### Community 7 - "entry"
Cohesion: 0.18
Nodes (11): entry, ignoreDependencies, test/**/*.ts, project, $schema, tailwindcss, src/index.ts, src/**/*.{js,ts,svelte} (+3 more)

## Knowledge Gaps
- **72 isolated node(s):** `CatalogItem`, `CompletenessResult`, `TransformedRowResult`, `TabInfo`, `ApiResponse` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 108 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `KbttClient`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Google Sheet Service & Apps Script Sync` to `Data Transformation & OCR Normalization`, `entry`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `CatalogItem`, `CompletenessResult`, `TransformedRowResult` to the rest of the system?**
  _72 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0822746521476104 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `Data Transformation & OCR Normalization` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._