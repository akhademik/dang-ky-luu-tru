# AGENT WORKFLOW & CODING STANDARDS

## 1. Package Manager
- **Bắt buộc sử dụng `pnpm`** thay cho `npm` hoặc `yarn` cho mọi thao tác cài đặt gói, quản lý dependencies và chạy scripts:
  - Cài đặt package: `pnpm add <package>` (hoặc `pnpm add -D <package>`)
  - Chạy script: `pnpm <script_name>` (ví dụ: `pnpm test`, `pnpm check`, `pnpm run check:svelte`, `pnpm run knip`, `pnpm run format`, `pnpm run build`)
  - Chạy lệnh dự án: `pnpm run <command>`

## 2. Quy trình kiểm tra chất lượng bắt buộc (Mandatory Verification Workflow)
Mỗi lần code hoặc sửa đổi bất kỳ logic/giao diện nào xong, **BẮT BUỘC** phải thực hiện tuần tự các bước sau trước khi thông báo hoàn thành cho người dùng:

1. **SvelteKit & TypeScript Type Check**:
   ```bash
   pnpm run check:svelte
   ```
2. **Knip Dead Code & Dependency Check**: Kiểm tra các file/export/dependencies thừa:
   ```bash
   pnpm run knip
   ```
3. **Biome Formatting & Linting Check**:
   ```bash
   pnpm run lint:biome
   ```
4. **Unit, API, Integration & Svelte 5 Anti-Deprecation Test Suite (100% Offline)**:
   ```bash
   pnpm test
   ```
5. **Build Compilation Check**:
   ```bash
   pnpm run build
   ```
6. **Graphify Knowledge Graph**: Trích xuất và cập nhật kiến trúc đồ thị tri thức:
   ```bash
   graphify . --code-only && graphify cluster-only .
   ```
7. **Thông báo kết quả**: Chỉ khi **tất cả các bước trên đều thành công (Exit code 0)** thì mới tổng hợp và thông báo hoàn tất thành công cho người dùng.

## 3. Kiến trúc mã nguồn SvelteKit + TypeScript tích hợp KBTT
- `src/hooks.server.ts`: Centralized API Gateway Authentication, CSRF protection, secure cookie handling.
- `src/lib/server/auth.ts`: Authentication helpers, session verification, constant-time password comparison.
- `src/lib/server/time.ts`: Centralized GMT+7 (`Asia/Ho_Chi_Minh`) Date/Time Service.
- `src/lib/server/validator.ts`: Central input validation and Stay Lifecycle State Machine transition rules.
- `src/lib/server/config.ts`: Tham số môi trường, endpoints, tài khoản và cấu hình token.
- `src/lib/server/catalogManager.ts`: Nạp và cache các danh mục Public API (Quốc tịch, Tỉnh/TP, Lý do cư trú, Loại giấy tờ).
- `src/lib/server/tokenManager.ts`: Quản lý vòng đời OAuth 2.0 token (login, auto-refresh < 60s, revoke).
- `src/lib/server/dataTransformer.ts`: Chuẩn hóa dữ liệu OCR từ Google Sheets, phân tích ngày đa định dạng, phân luồng khách Việt Nam (API 5) và Nước ngoài (API 4).
- `src/lib/server/googleSheetService.ts`: Quét tabs ngày, tải CSV công khai và gửi Webhook Apps Script đồng bộ 2 chiều.
- `src/lib/server/kbttClient.ts`: Gửi payload HTTP request chuẩn JSON Array `[...]`, quản lý Request ID tracking và retry exponential backoff.
- `src/lib/server/stayService.ts`: Quản lý nghiệp vụ lưu trú (Ingest, Checkout, Extend, Re-register).
- `src/lib/server/db.ts`: Facade delegating to modular DB repositories.
- `src/lib/server/repositories/`: Modular database access layer (`guestRepository`, `stayRepository`, `auditRepository`, `statsRepository`).
- `src/lib/utils/format.ts`: Shared UI formatting utilities, country resolvers, and options.
- `src/lib/components/`: Modular Svelte 5 components (`ConfirmModal.svelte`, `StayStatusBadge.svelte`).
- `src/routes/+page.svelte`: Giao diện chính Svelte 5 (Runes `$state`, `$derived`, `$effect`, Callback Props).
- `src/routes/api/`: RESTful endpoints xử lý nghiệp vụ cho frontend và webhook.

## 4. Chuẩn Hóa Múi Giờ GMT+7 & Quy Chuẩn Payload Gửi API C06 (BCA)
- **Toàn bộ logic thời gian, tính toán ngày đến/ngày đi, SQL trigger, auto-checkout, OCR ingestion, và hiển thị UI** BẮT BUỘC phải cố định theo **GMT+7** (`Asia/Ho_Chi_Minh`) qua `src/lib/server/time.ts`.
- **Quy tắc Lưu trữ & Sử dụng Loại Giấy Tờ (`loai_giay_to`)**:
  - Khi khai báo thành công qua API 4/5, hệ thống lưu chính xác mã loại giấy tờ (ví dụ: `1` cho Thẻ CCCD, `8` cho Thẻ Căn cước mới, `4` cho Hộ chiếu).
  - Khi gọi API checkout (`TS`) hoặc gia hạn (`GH`), bắt buộc lấy đúng mã `loai_giay_to` đã lưu từ bản khai báo thành công.
- **Quy tắc Tự động Checkout & Thời điểm Gửi API BCA**:
  - Trên hệ thống của Bộ Công An (C06), hồ sơ lưu trú **tự động kết thúc sau 12:00:00 ngày đi dự kiến (`ngayDiDuKienStr`)**.
  - Trên database nội bộ (Cloudflare D1), khi thời gian thực tế đã qua 12:00:00 ngày đi, DB tự động chuyển trạng thái thành `CHECKED_OUT` mà **KHÔNG** gửi API lên BCA.
  - **Chỉ gửi API 12 (`doi-ngay-tra-phong` với `loai: "TS"`) khi người dùng bấm Checkout TRƯỚC 12:00:00 ngày đi dự kiến (Trả phòng sớm)**.

## 5. Quy Định UI Modal & Svelte 5 Anti-Deprecation
- **Tuyệt đối KHÔNG sử dụng `window.alert()`, `window.confirm()`, `window.prompt()`**.
- **Tuyệt đối KHÔNG sử dụng `createEventDispatcher` hoặc `on:[event]` directives**. Luôn sử dụng Svelte 5 Callback Props và standard event attributes (`onclick`, `onchange`).

## 6. Quy Định Kết Nối Mạng & Giao Tiếp API (Network Protocols)
- **Bắt buộc IPv4 & Tắt Network Family Auto-selection**:
  - Duy trì `net.setDefaultAutoSelectFamily(false)` và `dns.setDefaultResultOrder("ipv4first")` trong `config.ts` cũng như cờ `--dns-result-order=ipv4first --no-network-family-autoselection` trong `package.json`.
- **Tương thích HTTP/2**: Không truyền `Connection: close` trên HTTP/2 endpoints.
- **Vòng lặp Retry**: Bọc các lệnh gọi `fetch()` tới API C06 BCA bằng vòng lặp retry 3 lần với exponential backoff.
- **Bảo mật dữ liệu**: `ghiChu` gửi tới API BCA luôn là rỗng `""`, chỉ lưu trữ nội bộ trên Cloudflare D1.
