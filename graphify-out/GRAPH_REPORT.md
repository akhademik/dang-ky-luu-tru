# Graph Report - dang-ky-luu-tru  (2026-09-16)

## Corpus Check
- Corpus is ~36,307 words - fits in a single context window. You may not need a graph.

## Summary
- 258 nodes · 477 edges · 17 communities (6 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- SvelteKit Web UI & Reactive State
- API Routing & Backend Endpoints
- Data Transformation & OCR Normalization
- Google Sheet Service & Apps Script Sync
- OAuth Token & Session Management
- KBTT HTTP Client & Payload Dispatcher
- Catalog Manager & Address Mapping
- Logging & Telemetry Service
- End-to-end Test Pipeline
- Configuration & Environment Loader
- Type Definitions & Common Interfaces
- Build & Project Tooling

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 26 edges
2. `CatalogManager` - 22 edges
3. `Logger` - 20 edges
4. `GoogleSheetService` - 18 edges
5. `SyncPipeline` - 18 edges
6. `TokenManager` - 17 edges
7. `runTests()` - 15 edges
8. `renderTable()` - 13 edges
9. `CONFIG` - 12 edges
10. `KbttClient` - 12 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `DataTransformer` --references--> `CatalogManager`  [EXTRACTED]
  src/lib/server/dataTransformer.ts → src/lib/server/catalogManager.ts
- `SyncPipeline` --references--> `CatalogManager`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/catalogManager.ts
- `SyncResult` --references--> `RawOcrRow`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/dataTransformer.ts

## Import Cycles
- None detected.

## Communities (17 total, 6 thin omitted)

### Community 0 - "SvelteKit Web UI & Reactive State"
Cohesion: 0.10
Nodes (44): addNewRow(), availableTabs, catalogData, checkTokenStatus(), cleanRoomNumber(), closeEditModal(), copyCountryCode(), currentRows (+36 more)

### Community 1 - "API Routing & Backend Endpoints"
Cohesion: 0.12
Nodes (12): CatalogItem, CONFIG, CompletenessResult, RawOcrRow, TransformedRowResult, TabInfo, ApiResponse, LogEntry (+4 more)

### Community 2 - "Data Transformation & OCR Normalization"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 3 - "Google Sheet Service & Apps Script Sync"
Cohesion: 0.08
Nodes (25): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, svelte, svelte-check, @sveltejs/adapter-node (+17 more)

### Community 4 - "OAuth Token & Session Management"
Cohesion: 0.10
Nodes (20): node_modules/**, public/**, src/**/*.js, src/**/*.svelte, src/**/*.ts, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs (+12 more)

### Community 10 - "Type Definitions & Common Interfaces"
Cohesion: 0.20
Nodes (10): entry, ignoreDependencies, test/**/*.ts, project, $schema, src/index.ts, src/**/*.{js,ts,svelte}, src/lib/**/*.{js,ts} (+2 more)

## Knowledge Gaps
- **74 isolated node(s):** `$schema`, `src/routes/**/+*.{js,ts,svelte}`, `src/lib/**/*.{js,ts}`, `src/index.ts`, `src/**/*.{js,ts,svelte}` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 107 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `Catalog Manager & Address Mapping` to `API Routing & Backend Endpoints`, `KBTT HTTP Client & Payload Dispatcher`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `KBTT HTTP Client & Payload Dispatcher` to `API Routing & Backend Endpoints`, `Catalog Manager & Address Mapping`, `Logging & Telemetry Service`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `SyncPipeline` connect `API Routing & Backend Endpoints` to `Configuration & Environment Loader`, `KBTT HTTP Client & Payload Dispatcher`, `Catalog Manager & Address Mapping`, `Logging & Telemetry Service`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `$schema`, `src/routes/**/+*.{js,ts,svelte}`, `src/lib/**/*.{js,ts}` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SvelteKit Web UI & Reactive State` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Should `API Routing & Backend Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.11829268292682926 - nodes in this community are weakly interconnected._
- **Should `Data Transformation & OCR Normalization` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._