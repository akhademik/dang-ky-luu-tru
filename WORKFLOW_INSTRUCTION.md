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

## 4. Chuẩn Hóa Múi Giờ GMT+7 & Quy Chuẩn Payload Gửi API C06 (BCA)
- **Toàn bộ logic thời gian, tính toán ngày đến/ngày đi, SQL trigger, auto-checkout, OCR ingestion, và hiển thị UI** BẮT BUỘC phải cố định theo **GMT+7** (`Asia/Ho_Chi_Minh`).
- **Giờ checkout mặc định**: Luôn luôn là **12:00:00 GMT+7 (Trưa)**. Tuyệt đối không lưu theo UTC `05:00:00` gây lỗi checkout sớm.
- **Quy chuẩn Định dạng Thời gian gửi API C06 (BCA)**:
  - Input (OCR / Sheets / Frontend): Nhận `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`.
  - **API 4 (Khách Nước Ngoài) & API 5 (Khách Việt Nam)**:
    - `ngayThangNamSinhStr`: Bắt buộc chuẩn **`YYYY-MM-DD`** (ISO Date, ví dụ: `1990-05-15`).
    - `ngayDenCsltStr`: Bắt buộc chuẩn **`YYYY-MM-DD HH:mm:ss`** (ISO DateTime GMT+7, ví dụ: `2026-09-17 14:00:00`). Chỉ chấp nhận ngày hôm nay hoặc hôm qua.
    - `ngayDiDuKienStr`: Bắt buộc chuẩn **`YYYY-MM-DD HH:mm:ss`** (ISO DateTime GMT+7, ví dụ: `2026-09-19 12:00:00`).
    - `thoiHanTamTruStr` (NNN): Bắt buộc chuẩn **`YYYY-MM-DD HH:mm:ss`** (Ví dụ: `2026-12-31 23:59:59`).
  - **API 12 (Đổi ngày đi / Trả phòng sớm / Gia hạn lưu trú)**:
    - Trả phòng sớm (`loai: "TS"`): Payload gửi lên là `[ { "loai": "TS", "soGiayTo": "...", "loaiGiayTo": 1 } ]` (không kèm trường `thoiGianStr`).
    - Gia hạn lưu trú (`loai: "GH"`): Payload gửi lên là `[ { "loai": "GH", "soGiayTo": "...", "loaiGiayTo": 1, "thoiGianStr": "YYYY-MM-DD HH:mm:ss" } ]`.
- Khách chỉ chuyển sang `CHECKED_OUT` tự động khi thời gian hiện tại GMT+7 đã qua 12:00:00 trưa ngày đi.

## 5. Quy Định UI Modal & Xác Nhận (No Native Browser Dialogs)
- **Tuyệt đối KHÔNG sử dụng `window.alert()`, `window.confirm()`, `window.prompt()`**.
- Toàn bộ hộp thoại xác nhận, cảnh báo và form thao tác BẮT BUỘC phải dùng Custom Modal Svelte Reactive kết hợp Tailwind CSS với backdrop mờ và giao diện đồng nhất.

## 6. Quy Định Kết Nối Mạng & Giao Tiếp API (Network Protocols)
- **Bắt buộc IPv4 & Tắt Network Family Auto-selection**:
  - Không để Node.js Happy Eyeballs auto-select IPv6 trên máy chủ chưa có route IPv6, gây `ETIMEDOUT`.
  - Luôn duy trì `net.setDefaultAutoSelectFamily(false)` và `dns.setDefaultResultOrder("ipv4first")` trong `config.ts` cũng như cờ `--dns-result-order=ipv4first --no-network-family-autoselection` trong `package.json`.
- **Tuyệt đối không dùng hop-by-hop headers**:
  - Không truyền `Connection: close` trên HTTP/2 endpoints (Cloudflare).
- **Vòng lặp Retry**:
  - Bắt buộc bọc các lệnh gọi `fetch()` tới API C06 BCA bằng vòng lặp retry 3 lần với exponential backoff.
- **Dữ liệu nhạy cảm**:
  - `ghiChu` gửi tới API BCA luôn là rỗng `""`, chỉ lưu trữ nội bộ trên Cloudflare D1.
