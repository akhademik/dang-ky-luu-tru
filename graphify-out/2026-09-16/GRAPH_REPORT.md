# Graph Report - dang-ky-luu-tru  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 155 nodes · 326 edges · 13 communities (8 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `adb2dbd9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- CatalogManager
- server.js
- app.js
- syncPipeline.js
- runTests
- GoogleSheetService
- project
- renderTable
- executeSyncBatch
- TokenManager
- pullDataFromGoogleSheet
- copyCountryCode

## God Nodes (most connected - your core abstractions)
1. `CatalogManager` - 27 edges
2. `runTests()` - 21 edges
3. `DataTransformer` - 18 edges
4. `GoogleSheetService` - 14 edges
5. `TokenManager` - 12 edges
6. `KbttClient` - 10 edges
7. `renderTable()` - 10 edges
8. `SyncPipeline` - 9 edges
9. `CONFIG` - 9 edges
10. `updatePayloadPreview()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `CatalogManager`  [EXTRACTED]
  test/test-pipeline.js → src/catalogManager.js
- `runTests()` --calls--> `TokenManager`  [EXTRACTED]
  test/test-pipeline.js → src/tokenManager.js
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.js → src/kbttClient.js
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.js → src/googleSheetService.js
- `runTests()` --calls--> `DataTransformer`  [EXTRACTED]
  test/test-pipeline.js → src/dataTransformer.js

## Import Cycles
- None detected.

## Communities (13 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (21): author, description, keywords, license, main, name, scripts, check (+13 more)

### Community 2 - "server.js"
Cohesion: 0.20
Nodes (9): runDemo(), MIME_TYPES, pipeline, readBody(), sendJson(), server, sseClients, watchDirs (+1 more)

### Community 3 - "app.js"
Cohesion: 0.18
Nodes (14): availableTabs, catalogData, currentRows, editingRowIndices, filterCatalog(), getCombinedAddress(), getDisplayAddress(), isGuestVN() (+6 more)

### Community 7 - "project"
Cohesion: 0.22
Nodes (8): entry, project, $schema, public/app.js, public/**/*.js, src/index.js, src/**/*.js, test/**/*.js

### Community 8 - "renderTable"
Cohesion: 0.42
Nodes (9): addNewRow(), loadSampleData(), removeRow(), renderTable(), toggleEditRow(), toggleRowSelect(), toggleSelectAll(), updatePayloadPreview() (+1 more)

### Community 9 - "executeSyncBatch"
Cohesion: 0.22
Nodes (9): checkTokenStatus(), executeSyncBatch(), handleManualLogin(), handleRegisterClick(), processAndSyncNow(), pushSelectedRows(), pushSingleRow(), setupHotReload() (+1 more)

### Community 11 - "pullDataFromGoogleSheet"
Cohesion: 0.50
Nodes (4): cleanRoomNumber(), fetchSheetTabsList(), handleTabChange(), pullDataFromGoogleSheet()

### Community 12 - "copyCountryCode"
Cohesion: 1.00
Nodes (3): copyCountryCode(), fallbackCopyText(), showCopyToast()

## Knowledge Gaps
- **35 isolated node(s):** `author`, `description`, `license`, `main`, `name` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 41 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `server.js`, `syncPipeline.js`, `runTests`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `runTests()` connect `runTests` to `CatalogManager`, `TokenManager`, `syncPipeline.js`, `GoogleSheetService`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `runTests` to `server.js`, `syncPipeline.js`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `runTests()` (e.g. with `.findLoaiGiayTo()` and `.findQuocTich()`) actually correct?**
  _`runTests()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `author`, `description`, `license` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._