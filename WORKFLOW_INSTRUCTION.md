# AGENT WORKFLOW & CODING STANDARDS

## 1. Package Manager
- **Bắt buộc sử dụng `pnpm`** thay cho `npm` hoặc `yarn` cho mọi thao tác cài đặt gói, quản lý dependencies và chạy scripts:
  - Cài đặt package: `pnpm add <package>` (hoặc `pnpm add -D <package>`)
  - Chạy script: `pnpm <script_name>` (ví dụ: `pnpm test`, `pnpm check`, `pnpm run check:svelte`, `pnpm run knip`, `pnpm run format`)
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
3. **Biome Formatting & Linting (tùy chọn / khuyến nghị)**:
   ```bash
   pnpm run format
   ```
4. **Unit & Integration Tests**: Chạy toàn bộ test suite để xác thực mọi chức năng:
   ```bash
   pnpm test
   # hoặc chạy tổng hợp svelte-check + knip + test:
   pnpm run check
   ```
5. **Graphify Knowledge Graph**: Chạy trích xuất và cập nhật kiến trúc đồ thị tri thức:
   ```bash
   graphify . --code-only && graphify cluster-only .
   ```
6. **Thông báo kết quả**: Chỉ khi **tất cả các bước trên đều thành công (Exit code 0)** thì mới tổng hợp và thông báo hoàn tất thành công cho người dùng.

## 3. Kiến trúc mã nguồn SvelteKit + TypeScript tích hợp KBTT
- `src/lib/server/config.ts`: Tham số môi trường, endpoints, tài khoản và cấu hình token.
- `src/lib/server/catalogManager.ts`: Nạp và cache các danh mục Public API (Quốc tịch, Tỉnh/TP, Lý do cư trú, Loại giấy tờ, Nơi cư trú), đối chiếu alias quốc gia và cross-check chuẩn xác từ `data/catalogs/quoc_tich.json`, lọc lý do cư trú (chỉ giữ 2 lý do: Du lịch & Mục đích khác).
- `src/lib/server/tokenManager.ts`: Quản lý vòng đời OAuth 2.0 token (login, auto-refresh < 60s, revoke).
- `src/lib/server/dataTransformer.ts`: Chuẩn hóa dữ liệu OCR từ Google Sheets, phân tích ngày đa định dạng (`DD/MM/YYYY`, `YYYY-MM-DD`), phân luồng khách Việt Nam (API 5) và Nước ngoài (API 4), validate ngày đến/số phòng/quốc tịch.
- `src/lib/server/googleSheetService.ts`: Quét tabs ngày, tải CSV công khai và gửi Webhook Apps Script đồng bộ 2 chiều.
- `src/lib/server/kbttClient.ts`: Gửi payload HTTP request chuẩn JSON Array `[...]` và xử lý log phản hồi.
- `src/lib/server/syncPipeline.ts`: Điều phối toàn bộ quy trình đồng bộ tự động.
- `src/routes/+page.svelte`: Giao diện chính Svelte 5 (Runes), Live-check Modal toàn diện, phản hồi lỗi thời gian thực, bảng dữ liệu tối ưu, tab điều phối.
- `src/routes/api/`: RESTful endpoints xử lý proxy cho frontend (`sheets`, `sync`, `catalogs`, `token`, `transform`, `events`).
