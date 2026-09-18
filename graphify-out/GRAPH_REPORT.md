# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 369 nodes · 766 edges · 18 communities (10 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d39d9fb2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- test-pipeline.ts
- compilerOptions
- devDependencies
- scripts
- DataTransformer
- CatalogManager
- auth.ts
- catalogManager.ts
- TokenManager
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 29 edges
2. `DataTransformer` - 28 edges
3. `CatalogManager` - 25 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `SyncPipeline` - 19 edges
7. `StayService` - 18 edges
8. `GoogleSheetService` - 18 edges
9. `KbttClient` - 16 edges
10. `TokenManager` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `runTests()` --calls--> `checkoutStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts
- `runTests()` --calls--> `extendStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts
- `runTests()` --calls--> `getAuditLogs()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts

## Import Cycles
- None detected.

## Communities (18 total, 4 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.07
Nodes (45): autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay(), generateId(), getAuditLogs() (+37 more)

### Community 1 - "test-pipeline.ts"
Cohesion: 0.06
Nodes (11): ApiEnvironment, CONFIG, GoogleSheetService, ApiResponse, KbttClient, LogEntry, Logger, LogLevel (+3 more)

### Community 2 - "compilerOptions"
Cohesion: 0.04
Nodes (43): source, assist, actions, noUnusedVariables, files, includes, formatter, enabled (+35 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (36): @biomejs/biome, jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies (+28 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (28): author, description, keywords, license, main, name, scripts, build (+20 more)

### Community 7 - "auth.ts"
Cohesion: 0.27
Nodes (10): handle(), getIngestApiKey(), getServerPassword(), verifySession(), verifyWebhookAuth(), GET(), POST(), POST() (+2 more)

### Community 8 - "catalogManager.ts"
Cohesion: 0.23
Nodes (5): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem

### Community 10 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 11 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 12 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **85 isolated node(s):** `ApiResponse`, `LogEntry`, `LogLevel`, `Locals`, `Platform` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `catalogManager.ts`, `test-pipeline.ts`, `db.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `db.ts`, `test-pipeline.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `getDb()` connect `db.ts` to `test-pipeline.ts`, `DataTransformer`, `auth.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiResponse`, `LogEntry`, `LogLevel` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07034431691965938 - nodes in this community are weakly interconnected._
- **Should `test-pipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06430745814307458 - nodes in this community are weakly interconnected._