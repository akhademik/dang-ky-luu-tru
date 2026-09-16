# Graph Report - dang-ky-luu-tru  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 335 nodes · 570 edges · 18 communities (7 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54ed9559`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- syncPipeline.ts
- legacy_src/syncPipeline.js
- devDependencies
- package.json
- +page.svelte
- CatalogManager
- compilerOptions
- CatalogManager
- DataTransformer
- TokenManager
- DataTransformer
- GoogleSheetService
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `CatalogManager` - 24 edges
2. `CatalogManager` - 24 edges
3. `DataTransformer` - 20 edges
4. `TokenManager` - 15 edges
5. `DataTransformer` - 15 edges
6. `renderTable()` - 13 edges
7. `GoogleSheetService` - 12 edges
8. `GoogleSheetService` - 10 edges
9. `updatePayloadPreview()` - 10 edges
10. `compilerOptions` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ignoreDependencies` --extends--> `tailwindcss`  [EXTRACTED]
  knip.json → package.json
- `SyncPipelineResult` --references--> `KbttForeignPayload`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts
- `SyncPipelineResult` --references--> `KbttVnPayload`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts
- `SyncPipelineResult` --references--> `RawOcrRow`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts
- `FullSyncReport` --references--> `SheetTabInfo`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/googleSheetService.ts

## Import Cycles
- None detected.

## Communities (18 total, 7 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.10
Nodes (44): addNewRow(), availableTabs, catalogData, checkTokenStatus(), cleanRoomNumber(), closeEditModal(), copyCountryCode(), currentRows (+36 more)

### Community 1 - "syncPipeline.ts"
Cohesion: 0.09
Nodes (17): CatalogItem, CatalogStore, AppConfig, CONFIG, CompletenessResult, KbttForeignPayload, KbttVnPayload, RawOcrRow (+9 more)

### Community 2 - "legacy_src/syncPipeline.js"
Cohesion: 0.10
Nodes (11): CONFIG, KbttClient, MIME_TYPES, pipeline, readBody(), sendJson(), server, sseClients (+3 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (32): jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies, jiti (+24 more)

### Community 4 - "package.json"
Cohesion: 0.08
Nodes (24): author, description, keywords, license, main, name, scripts, build (+16 more)

### Community 5 - "+page.svelte"
Cohesion: 0.14
Nodes (18): addNewRow(), checkToken(), closeEditModal(), executeSyncBatch(), fetchSheetData(), handleManualLogin(), loadSampleData(), loadSheetTabs() (+10 more)

### Community 7 - "compilerOptions"
Cohesion: 0.09
Nodes (21): legacy_src/**, node_modules/**, public/**, src/**/*.js, src/**/*.svelte, src/**/*.ts, ./.svelte-kit/tsconfig.json, compilerOptions (+13 more)

## Knowledge Gaps
- **73 isolated node(s):** `CatalogItem`, `CatalogStore`, `AppConfig`, `CompletenessResult`, `RawRowObject` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 116 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `CatalogManager` connect `CatalogManager` to `legacy_src/syncPipeline.js`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `CatalogItem`, `CatalogStore`, `AppConfig` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08985200845665962 - nodes in this community are weakly interconnected._
- **Should `legacy_src/syncPipeline.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10158730158730159 - nodes in this community are weakly interconnected._