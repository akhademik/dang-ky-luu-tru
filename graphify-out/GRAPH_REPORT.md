# Graph Report - dang-ky-luu-tru  (2026-10-29)

## Corpus Check
- 93 files · ~74,622 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 633 nodes · 1335 edges · 44 communities (36 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `78edaf02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stayService.ts
- @sveltejs/kit
- compilerOptions
- devDependencies
- package.json
- D1PreparedStatement
- DataTransformer
- auth-security.test.ts
- format.ts
- types/index.ts
- catalogManager
- biome.json
- time.ts
- Kiến Trúc Hệ Thống & Tài Liệu Kỹ Thuật (System Architecture & Technical Guide)
- apps_script_onedit.js
- scripts
- 13\. Luồng tích hợp khuyến nghị
- 5\. API 4 – Khai báo tạm trú cho người nước ngoài
- 6\. API 5 – Khai báo lưu trú cho người Việt Nam
- AGENT WORKFLOW & CODING STANDARDS
- wrangler.json
- src_app
- 2\. API 1 – Lấy Token (Get Token)
- 3\. API 2 – Làm mới Token (Refresh Token)
- ​
- 9\. API 8 – Danh mục Phường/Xã theo Tỉnh/Thành
- 10\. API 9 – Danh mục lý do cư trú
- ​11. API 10 – Danh mục loại giấy tờ
- 12\. API 11 – Danh mục nơi cư trú
- 4\. API 3 – Xóa phiên đăng nhập (Revoke Token)
- 7\. API 6 – Danh mục Quốc tịch​
- 8\. API 7 – Danh mục Tỉnh/Thành phố
- knip.json
- src_lib_server_db_getauditlogs
- src_lib_server_db_logkbttaction
- src_lib_server_db_updateguest
- src_lib_server_db_upsertguest
- 1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)
- AI_WORKFLOW.md — Quy trình làm việc bắt buộc cho AI Coding Agent
- 1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)
- svelte.config.js
- @playwright/test
- app.d.ts

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 29 edges
2. `DataTransformer` - 28 edges
3. `stayService` - 27 edges
4. `@sveltejs/kit` - 26 edges
5. `catalogManager` - 23 edges
6. `CONFIG` - 23 edges
7. `D1DatabaseLike` - 23 edges
8. `KbttClient` - 22 edges
9. `logger` - 22 edges
10. `getStayById()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `4.4. Cơ Chế Chuyển Đổi Môi Trường API Động (Dynamic API Target Switcher)` --references--> `isProduction()`  [INFERRED]
  ARCHITECTURE.md → src/lib/server/auth.ts
- `1.4. Centralized Security Gateway, Stateless HMAC Auth & Rate Limiting Pattern` --references--> `timingSafeEqualStr()`  [INFERRED]
  DESIGN_PATTERN.md → src/lib/server/auth.ts
- `1.4. Centralized Security Gateway, Stateless HMAC Auth & Rate Limiting Pattern` --references--> `timingSafeEqualStr()`  [INFERRED]
  DESIGN_SYSTEM.md → src/lib/server/auth.ts
- `7.2. Cơ chế Smart Fallback (`isAlreadyRegisteredMessage`)` --references--> `isAlreadyRegisteredMessage()`  [INFERRED]
  ARCHITECTURE.md → src/lib/server/kbttClassifier.ts
- `3.4. Strict Date & Time Pattern (Quy Định Bắt Buộc Về Định Dạng Ngày Tháng)` --references--> `isSameOrPastCheckoutTimeGmt7()`  [INFERRED]
  DESIGN_PATTERN.md → src/lib/server/time.ts

## Import Cycles
- None detected.

## Communities (44 total, 8 thin omitted)

### Community 0 - "stayService.ts"
Cohesion: 0.10
Nodes (42): getDb(), clearAuditLogs(), deleteAuditLog(), generateId(), getAuditLogs(), logKbttAction(), generateId(), updateGuest() (+34 more)

### Community 1 - "@sveltejs/kit"
Cohesion: 0.05
Nodes (19): ref_node_http, ref_node_net, @sveltejs/kit, ApiEnvironment, CONFIG, src_lib_server_datatransformer_rawocrrow, GoogleSheetService, ApiResponse (+11 more)

### Community 2 - "compilerOptions"
Cohesion: 0.13
Nodes (14): ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule (+6 more)

### Community 3 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @biomejs/biome, jiti, @playwright/test, svelte, svelte-check, @sveltejs/adapter-cloudflare, @sveltejs/kit (+7 more)

### Community 4 - "package.json"
Cohesion: 0.11
Nodes (18): author, description, keywords, license, main, name, type, version (+10 more)

### Community 5 - "D1PreparedStatement"
Cohesion: 0.15
Nodes (4): RemoteD1Database, D1PreparedStatement, MockD1Database, Row

### Community 6 - "DataTransformer"
Cohesion: 0.20
Nodes (8): Kế hoạch theo dõi thực tế & Xử lý tiếp theo (Phase 2):, Trạng thái hệ thống, DataTransformer, CompletenessResult, RawOcrRow, TransformedRowResult, POST(), runTransformerUnitTests()

### Community 7 - "auth-security.test.ts"
Cohesion: 0.15
Nodes (28): 2026-10-29, ref_node_child_process, ref_node_fs, ref_node_path, ref_types_js, handle(), base64UrlDecode(), base64UrlEncode() (+20 more)

### Community 8 - "format.ts"
Cohesion: 0.08
Nodes (20): 2026-09-30, 2026-10-28, Changelog, 🚀 Các Tính Năng Chính (Core Features), 📂 Cấu Trúc Dự Án & Tài Liệu Kỹ Thuật, Hệ Thống Khai Báo Tạm Trú Tự Động (BCA KBTT API v1.4 & Cloudflare D1), 🛠 Lệnh Thực Thi (Commands), 📌 Tổng Quan Hệ Thống (+12 more)

### Community 9 - "types/index.ts"
Cohesion: 0.18
Nodes (16): probeBcaConnection(), classifyKbttResponse(), isAlreadyRegisteredMessage(), Guest, IngestResult, IngestResultItem, KbttLog, SyncResult (+8 more)

### Community 11 - "biome.json"
Cohesion: 0.11
Nodes (18): source, assist, actions, noUnusedVariables, files, includes, formatter, enabled (+10 more)

### Community 12 - "time.ts"
Cohesion: 0.17
Nodes (25): ref_node_assert, formatDateTimeToGmt7(), formatDateToGmt7(), getNowGmt7Date(), getNowGmt7DateString(), getNowGmt7DateTimeString(), getNowGmt7IsoString(), isPastNoonGmt7() (+17 more)

### Community 13 - "Kiến Trúc Hệ Thống & Tài Liệu Kỹ Thuật (System Architecture & Technical Guide)"
Cohesion: 0.10
Nodes (19): 1. Tổng Quan Kiến Trúc (Architecture Overview), 2.1. Bảng `guests` (Thông tin nhân thân khách hàng), 2.2. Bảng `stays` (Lượt lưu trú), 2.3. Bảng `kbtt_logs` (Nhật ký giao tiếp API BCA), 2. Mô Hình Dữ Liệu Cloudflare D1 (Database Schema), 3. Vòng Đời Trạng Thái Lượt Lưu Trú (Stay Lifecycle State Machine), 4.1. Quy tắc Xác định Môi trường (Environment Resolution), 4.2. Kiến Trúc Token Không Trạng Thái (Stateless HMAC-SHA256 Session) (+11 more)

### Community 14 - "apps_script_onedit.js"
Cohesion: 0.32
Nodes (3): handleSheetChange(), handleSheetEdit(), syncRowToCloudflare()

### Community 15 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, check, check:svelte, db:init-local, dev, dev:remote, format (+10 more)

### Community 16 - "13\. Luồng tích hợp khuyến nghị"
Cohesion: 0.18
Nodes (11): 13\.1. Sơ đồ tổng quan, 13\.2. Lưu ý quan trọng, 13\. Luồng tích hợp khuyến nghị, 14\.1. Thông tin endpoint, 14\.2. Header, 14\.3. Body – mảng JSON khai báo, 14\.4. Ví dụ Request, 14\.5. Response (+3 more)

### Community 17 - "5\. API 4 – Khai báo tạm trú cho người nước ngoài"
Cohesion: 0.22
Nodes (9): 5\.1. Thông tin endpoint, 5\.2. Header, 5\.3. Body – mảng JSON khai báo, 5\.4. Ví dụ Request, 5\.5. Response, 5\.6. Các lỗi nghiệp vụ thường gặp, 5\. API 4 – Khai báo tạm trú cho người nước ngoài, Lỗi nghiệp vụ (400) – ví dụ (+1 more)

### Community 18 - "6\. API 5 – Khai báo lưu trú cho người Việt Nam"
Cohesion: 0.22
Nodes (9): 6\.1. Thông tin endpoint, 6\.2. Header, 6\.3. Body – mảng JSON khai báo, 6\.4. Ví dụ Request, 6\.5. Response, 6\.6. Các lỗi nghiệp vụ thường gặp, 6\. API 5 – Khai báo lưu trú cho người Việt Nam, Lỗi nghiệp vụ (400) – ví dụ (+1 more)

### Community 19 - "AGENT WORKFLOW & CODING STANDARDS"
Cohesion: 0.25
Nodes (7): 1. Package Manager, 2. Quy trình kiểm tra chất lượng bắt buộc (Mandatory Verification Workflow), 3. Kiến trúc mã nguồn SvelteKit + TypeScript tích hợp KBTT, 4. Chuẩn Hóa Múi Giờ GMT+7 & Quy Chuẩn Định Dạng Ngày Tháng / Payload API C06 (BCA), 5. Quy Định UI Modal & Svelte 5 Anti-Deprecation, 6. Quy Định Kết Nối Mạng & Giao Tiếp API (Network Protocols), AGENT WORKFLOW & CODING STANDARDS

### Community 20 - "wrangler.json"
Cohesion: 0.25
Nodes (7): compatibility_date, compatibility_flags, d1_databases, name, pages_build_output_dir, ratelimits, $schema

### Community 23 - "2\. API 1 – Lấy Token (Get Token)"
Cohesion: 0.29
Nodes (7): 2\.1. Thông tin endpoint, 2\.2. Header, 2\.3. Body (Form Parameters), 2\.4. Ví dụ Request, 2\.5. Response thành công (200), 2\.6. Mô tả trường data, 2\. API 1 – Lấy Token (Get Token)

### Community 24 - "3\. API 2 – Làm mới Token (Refresh Token)"
Cohesion: 0.29
Nodes (7): 3\.1. Thông tin endpoint, 3\.2. Header, 3\.3. Query Parameter, 3\.4. Ví dụ Request, 3\.5. Response thành công (200), 3\.6. Mô tả trường data, 3\. API 2 – Làm mới Token (Refresh Token)

### Community 25 - "​"
Cohesion: 0.33
Nodes (6): ​, 1\. Tổng quan, Dành cho Cơ sở lưu trú (4rd Party), HỆ THỐNG KHAI BÁO TẠM TRÚ CHO NGƯỜI NƯỚC NGOÀI VÀ, THÔNG BÁO LƯU TRÚ CHO CÔNG DÂN VIỆT NAM, TÀI LIỆU HƯỚNG DẪN SỬ DỤNG API

### Community 26 - "9\. API 8 – Danh mục Phường/Xã theo Tỉnh/Thành"
Cohesion: 0.33
Nodes (6): 9\.1. Thông tin endpoint, 9\.2. Query Parameter, 9\.3. Ví dụ Request, 9\.4. Response thành công (200), 9\.5. Mô tả trường data, 9\. API 8 – Danh mục Phường/Xã theo Tỉnh/Thành

### Community 27 - "10\. API 9 – Danh mục lý do cư trú"
Cohesion: 0.40
Nodes (5): 10\.1. Thông tin endpoint, 10\.2. Ví dụ Request, 10\.3. Response thành công (200), 10\.4. Mô tả trường data, 10\. API 9 – Danh mục lý do cư trú

### Community 28 - "​11. API 10 – Danh mục loại giấy tờ"
Cohesion: 0.40
Nodes (5): 11\.1. Thông tin endpoint, 11\.2. Ví dụ Request, 11\.3. Response thành công (200), 11\.4. Mô tả trường data, ​11. API 10 – Danh mục loại giấy tờ

### Community 29 - "12\. API 11 – Danh mục nơi cư trú"
Cohesion: 0.40
Nodes (5): 11\.2. Ví dụ Request, 11\.3. Response thành công (200), 11\.4. Mô tả trường data, 11s.1. Thông tin endpoint, 12\. API 11 – Danh mục nơi cư trú

### Community 30 - "4\. API 3 – Xóa phiên đăng nhập (Revoke Token)"
Cohesion: 0.40
Nodes (5): 4\.1. Thông tin endpoint, 4\.3. Query Parameter, 4\.4. Ví dụ Request, 4\.5. Response thành công (200), 4\. API 3 – Xóa phiên đăng nhập (Revoke Token)

### Community 31 - "7\. API 6 – Danh mục Quốc tịch​"
Cohesion: 0.40
Nodes (5): 7\.1. Thông tin endpoint, 7\.2. Ví dụ Request, 7\.3. Response thành công (200), 7\.4. Mô tả trường data, 7\. API 6 – Danh mục Quốc tịch​

### Community 32 - "8\. API 7 – Danh mục Tỉnh/Thành phố"
Cohesion: 0.40
Nodes (5): 8\.1. Thông tin endpoint, 8\.2. Ví dụ Request, 8\.3. Response thành công (200), 8\.4. Mô tả trường data, 8\. API 7 – Danh mục Tỉnh/Thành phố

### Community 33 - "knip.json"
Cohesion: 0.40
Nodes (4): entry, ignoreDependencies, project, $schema

### Community 38 - "1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)"
Cohesion: 0.12
Nodes (16): 1.1. Single Source of Truth: Cloudflare D1 & Modular Repositories, 1.2. Zero-FS Edge Runtime Compatibility, 1.3. Svelte 5 Modern Runes & Callback Props Pattern, 1.4. Centralized Security Gateway, Stateless HMAC Auth & Rate Limiting Pattern, 1.5. Strict GMT+7 Timezone & Stay State Machine Policy, 1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG), 2.1. Backgrounds & Surfaces (Nền & Thẻ chứa), 2.2. Text & Typography (+8 more)

### Community 39 - "AI_WORKFLOW.md — Quy trình làm việc bắt buộc cho AI Coding Agent"
Cohesion: 0.18
Nodes (10): 0. Thứ tự đọc khi mở lại project (BẮT BUỘC, không được bỏ qua bước nào), 1. Ngăn xếp công nghệ & quy tắc code bắt buộc, 2.1 Quy tắc chỉnh sửa file (bắt buộc), 2. Pipeline bắt buộc sau MỌI lần chỉnh sửa code, 3.1 Cập nhật `README.md`, 3.2 Cập nhật `DESIGN_SYSTEM.md`, 3.3 Báo cáo `graphify`, 3. Cập nhật tài liệu sau khi pipeline pass (+2 more)

### Community 40 - "1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)"
Cohesion: 0.11
Nodes (17): 1.1. Single Source of Truth: Cloudflare D1 & Modular Repositories, 1.2. Zero-FS Edge Runtime Compatibility, 1.3. Svelte 5 Modern Runes & Callback Props Pattern, 1.4. Centralized Security Gateway, Stateless HMAC Auth & Rate Limiting Pattern, 1.5. Strict GMT+7 Timezone & Stay State Machine Policy, 1.6. Network Resilience & Smart Fallback Pattern, 1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG), 2.1. Backgrounds & Surfaces (Nền & Thẻ chứa) (+9 more)

### Community 42 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): @sveltejs/adapter-cloudflare, @sveltejs/vite-plugin-svelte, config

### Community 44 - "app.d.ts"
Cohesion: 0.29
Nodes (4): App, Locals, Platform, src_lib_server_db_d1databaselike

## Knowledge Gaps
- **218 isolated node(s):** `$schema`, `includes`, `enabled`, `indentStyle`, `organizeImports` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 278 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@sveltejs/kit` connect `@sveltejs/kit` to `stayService.ts`, `package.json`, `DataTransformer`, `auth-security.test.ts`, `types/index.ts`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `stayService` connect `stayService.ts` to `1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)`, `@sveltejs/kit`, `catalogManager`, `DataTransformer`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `$schema`, `includes`, `enabled` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `stayService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10400682011935208 - nodes in this community are weakly interconnected._
- **Should `@sveltejs/kit` be split into smaller, more focused modules?**
  _Cohesion score 0.054136874361593465 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._