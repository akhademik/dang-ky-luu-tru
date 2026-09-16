# Graph Report - dang-ky-luu-tru  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 154 nodes · 323 edges · 14 communities (9 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92ac879f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.js
- package.json
- CatalogManager
- app.js
- runTests
- renderTable
- project
- GoogleSheetService
- TokenManager
- KbttClient
- pullDataFromGoogleSheet
- filterCatalog
- copyCountryCode
- getDisplayAddress

## God Nodes (most connected - your core abstractions)
1. `CatalogManager` - 27 edges
2. `runTests()` - 21 edges
3. `DataTransformer` - 18 edges
4. `GoogleSheetService` - 13 edges
5. `TokenManager` - 12 edges
6. `KbttClient` - 10 edges
7. `renderTable()` - 10 edges
8. `SyncPipeline` - 9 edges
9. `CONFIG` - 9 edges
10. `updatePayloadPreview()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `CatalogManager`  [EXTRACTED]
  test/test-pipeline.js → src/catalogManager.js
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.js → src/googleSheetService.js
- `runTests()` --calls--> `TokenManager`  [EXTRACTED]
  test/test-pipeline.js → src/tokenManager.js
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.js → src/kbttClient.js
- `runTests()` --calls--> `DataTransformer`  [EXTRACTED]
  test/test-pipeline.js → src/dataTransformer.js

## Import Cycles
- None detected.

## Communities (14 total, 5 thin omitted)

### Community 0 - "syncPipeline.js"
Cohesion: 0.20
Nodes (10): CONFIG, runDemo(), MIME_TYPES, pipeline, readBody(), sendJson(), server, sseClients (+2 more)

### Community 1 - "package.json"
Cohesion: 0.09
Nodes (21): author, description, keywords, license, main, name, scripts, check (+13 more)

### Community 3 - "app.js"
Cohesion: 0.19
Nodes (15): availableTabs, catalogData, checkTokenStatus(), currentRows, editingRowIndices, executeSyncBatch(), handleManualLogin(), handleRegisterClick() (+7 more)

### Community 5 - "renderTable"
Cohesion: 0.36
Nodes (10): addNewRow(), loadSampleData(), removeRow(), renderTable(), toggleEditRow(), toggleRowSelect(), toggleSelectAll(), updateCell() (+2 more)

### Community 6 - "project"
Cohesion: 0.22
Nodes (8): entry, project, $schema, public/app.js, public/**/*.js, src/index.js, src/**/*.js, test/**/*.js

### Community 10 - "pullDataFromGoogleSheet"
Cohesion: 0.50
Nodes (4): cleanRoomNumber(), fetchSheetTabsList(), handleTabChange(), pullDataFromGoogleSheet()

### Community 11 - "filterCatalog"
Cohesion: 0.50
Nodes (4): filterCatalog(), loadCatalogs(), normalizeStr(), renderCatalogList()

### Community 12 - "copyCountryCode"
Cohesion: 1.00
Nodes (3): copyCountryCode(), fallbackCopyText(), showCopyToast()

### Community 13 - "getDisplayAddress"
Cohesion: 0.67
Nodes (3): getCombinedAddress(), getDisplayAddress(), isGuestVN()

## Knowledge Gaps
- **35 isolated node(s):** `MIME_TYPES`, `pipeline`, `sseClients`, `watchDirs`, `author` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 41 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.js`, `KbttClient`, `runTests`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `runTests()` connect `runTests` to `syncPipeline.js`, `CatalogManager`, `GoogleSheetService`, `TokenManager`, `KbttClient`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `runTests` to `syncPipeline.js`, `KbttClient`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `runTests()` (e.g. with `.findLoaiGiayTo()` and `.findQuocTich()`) actually correct?**
  _`runTests()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MIME_TYPES`, `pipeline`, `sseClients` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._