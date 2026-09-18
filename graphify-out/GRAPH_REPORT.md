# Graph Report - dang-ky-luu-tru  (2026-09-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 397 nodes · 859 edges · 23 communities (11 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `147f956f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- db.ts
- compilerOptions
- devDependencies
- scripts
- DataTransformer
- data-integrity.test.ts
- CatalogManager
- auth.ts
- GoogleSheetService
- catalogManager.ts
- KbttClient
- TokenManager
- wrangler.json
- apps_script_onedit.js
- app.d.ts
- D1PreparedStatement
- RemoteD1Database
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 29 edges
2. `DataTransformer` - 28 edges
3. `CatalogManager` - 25 edges
4. `Logger` - 22 edges
5. `runTests()` - 22 edges
6. `SyncPipeline` - 19 edges
7. `runDataIntegrityTests()` - 19 edges
8. `StayService` - 18 edges
9. `GoogleSheetService` - 18 edges
10. `getStayById()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `runDataIntegrityTests()` --calls--> `DELETE()`  [EXTRACTED]
  test/data-integrity.test.ts → src/routes/api/stays/audit/+server.ts
- `includes` --extends--> `src/**/*.svelte`  [EXTRACTED]
  biome.json → tsconfig.json
- `runTests()` --calls--> `checkoutStay()`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/db.ts

## Import Cycles
- None detected.

## Communities (23 total, 8 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.07
Nodes (17): getServerPassword(), ApiEnvironment, CONFIG, ApiResponse, LogEntry, Logger, LogLevel, SyncPipeline (+9 more)

### Community 1 - "db.ts"
Cohesion: 0.12
Nodes (37): autoCheckoutExpiredStays(), checkoutStay(), clearAuditLogs(), deleteAuditLog(), deleteStay(), extendStay(), generateId(), getAuditLogs() (+29 more)

### Community 2 - "compilerOptions"
Cohesion: 0.04
Nodes (43): source, assist, actions, noUnusedVariables, files, includes, formatter, enabled (+35 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (37): @biomejs/biome, jiti, entry, ignoreDependencies, test/**/*.ts, project, $schema, devDependencies (+29 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (29): author, description, keywords, license, main, name, scripts, build (+21 more)

### Community 6 - "data-integrity.test.ts"
Cohesion: 0.22
Nodes (23): formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7(), isSameOrPastCheckoutTimeGmt7() (+15 more)

### Community 8 - "auth.ts"
Cohesion: 0.37
Nodes (8): handle(), getIngestApiKey(), verifySession(), verifyWebhookAuth(), GET(), POST(), load(), runAuthSecurityTests()

### Community 10 - "catalogManager.ts"
Cohesion: 0.23
Nodes (5): LOAI_GIAY_TO_DATA, LY_DO_CU_TRU_DATA, QUOC_TICH_DATA, StandardCatalogItem, CatalogItem

### Community 13 - "wrangler.json"
Cohesion: 0.25
Nodes (7): nodejs_compat, compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, $schema

### Community 14 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 15 - "app.d.ts"
Cohesion: 0.40
Nodes (3): App, Locals, Platform

## Knowledge Gaps
- **88 isolated node(s):** `LogEntry`, `LogLevel`, `ApiResponse`, `CatalogItem`, `Locals` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 140 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`, `db.ts`, `catalogManager.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `db.ts`, `KbttClient`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `runTests()` (e.g. with `.fetchSheetData()` and `.fetchSheetTabs()`) actually correct?**
  _`runTests()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `LogEntry`, `LogLevel`, `ApiResponse` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07139079851930195 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11986531986531987 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._