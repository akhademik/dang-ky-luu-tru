# Graph Report - dang-ky-luu-tru  (2026-09-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 210 nodes · 377 edges · 15 communities (5 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9236c527`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- syncPipeline.ts
- scripts
- devDependencies
- compilerOptions
- DataTransformer
- CatalogManager
- Logger
- GoogleSheetService
- knip.json
- TokenManager
- KbttClient
- svelte.config.js

## God Nodes (most connected - your core abstractions)
1. `DataTransformer` - 23 edges
2. `Logger` - 22 edges
3. `CatalogManager` - 20 edges
4. `GoogleSheetService` - 17 edges
5. `SyncPipeline` - 15 edges
6. `TokenManager` - 15 edges
7. `runTests()` - 15 edges
8. `CONFIG` - 13 edges
9. `scripts` - 11 edges
10. `KbttClient` - 10 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `KbttClient`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/kbttClient.ts
- `runTests()` --calls--> `GoogleSheetService`  [EXTRACTED]
  test/test-pipeline.ts → src/lib/server/googleSheetService.ts
- `ignoreDependencies` --extends--> `tailwindcss`  [EXTRACTED]
  knip.json → package.json
- `SyncPipeline` --references--> `TokenManager`  [EXTRACTED]
  src/lib/server/syncPipeline.ts → src/lib/server/tokenManager.ts

## Import Cycles
- None detected.

## Communities (15 total, 7 thin omitted)

### Community 0 - "syncPipeline.ts"
Cohesion: 0.12
Nodes (12): CatalogItem, ApiEnvironment, CONFIG, CompletenessResult, RawOcrRow, TransformedRowResult, TabInfo, ApiResponse (+4 more)

### Community 1 - "scripts"
Cohesion: 0.07
Nodes (26): author, description, keywords, license, main, name, scripts, build (+18 more)

### Community 2 - "devDependencies"
Cohesion: 0.09
Nodes (23): @biomejs/biome, jiti, devDependencies, @biomejs/biome, jiti, svelte, svelte-check, @sveltejs/adapter-node (+15 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node_modules/**, public/**, src/**/*.js, src/**/*.svelte, src/**/*.ts, ./.svelte-kit/tsconfig.json, compilerOptions, allowJs (+12 more)

### Community 8 - "knip.json"
Cohesion: 0.22
Nodes (9): entry, ignoreDependencies, project, $schema, tailwindcss, src/**/*.{js,ts,svelte}, src/routes/**/+*.{js,ts,svelte}, test/**/*.ts (+1 more)

## Knowledge Gaps
- **64 isolated node(s):** `CatalogItem`, `CompletenessResult`, `TransformedRowResult`, `TabInfo`, `ApiResponse` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 98 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CatalogManager` connect `CatalogManager` to `syncPipeline.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `DataTransformer` connect `DataTransformer` to `syncPipeline.ts`, `KbttClient`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `knip.json`, `scripts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `CatalogItem`, `CompletenessResult`, `TransformedRowResult` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `syncPipeline.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12073170731707317 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._