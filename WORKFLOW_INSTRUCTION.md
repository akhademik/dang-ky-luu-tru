# AGENT WORKFLOW & CODING STANDARDS

## 1. Package Manager
- **Bắt buộc sử dụng `pnpm`** thay cho `npm` hoặc `yarn` cho mọi thao tác cài đặt gói, quản lý dependencies và chạy scripts:
  - Cài đặt package: `pnpm add <package>`
  - Chạy script: `pnpm <script_name>` (ví dụ: `pnpm test`, `pnpm start`, `pnpm lint`, `pnpm knip`, `pnpm check`)
  - Chạy lệnh dự án: `pnpm run <command>`

## 2. Quy trình kiểm tra chất lượng bắt buộc (Mandatory Verification Workflow)
Mỗi lần code hoặc sửa đổi bất kỳ logic/giao diện nào xong, **BẮT BUỘC** phải thực hiện tuần tự các bước sau trước khi thông báo hoàn thành cho người dùng:

1. **Lint Check**: Chạy kiểm tra cú pháp toàn bộ các file:
   ```bash
   pnpm run lint
   ```
2. **Knip Dead Code & Dependency Check**: Kiểm tra các file/export/dependencies thừa:
   ```bash
   pnpm run knip
   ```
3. **Unit & Integration Tests**: Chạy toàn bộ test suite để xác thực mọi chức năng:
   ```bash
   pnpm test
   # hoặc chạy tổng hợp cả 3 bước:
   pnpm run check
   ```
4. **Graphify Knowledge Graph**: Chạy trích xuất và cập nhật kiến trúc đồ thị tri thức:
   ```bash
   graphify . --code-only && graphify cluster-only .
   ```
5. **Thông báo kết quả**: Chỉ khi **tất cả các bước trên đều thành công (Exit code 0)** thì mới tổng hợp và thông báo hoàn tất thành công cho người dùng.

## 3. Kiến trúc mã nguồn tích hợp KBTT
- `src/config.js`: Tham số môi trường, endpoints, tài khoản test và cấu hình refresh token.
- `src/catalogManager.js`: Nạp và cache các danh mục Public API (Quốc tịch, Tỉnh/TP, Phường/Xã, Lý do, Loại giấy tờ, Nơi cư trú), cross-check mã quốc tịch chuẩn từ `quoc_tich.json`.
- `src/tokenManager.js` (Module 1): Quản lý vòng đời OAuth 2.0 token (login API 1, auto-refresh < 60s API 2, revoke API 3).
- `src/dataTransformer.js` (Module 2): Chuẩn hóa dữ liệu OCR từ Google Sheets, làm sạch chuỗi, phân luồng khách Việt Nam (API 5) và Nước ngoài (API 4), validate ngày đến/số phòng/quốc tịch.
- `src/kbttClient.js` (Module 3): Gửi payload HTTP request và xử lý log phản hồi mã 200/400.
- `src/syncPipeline.js`: Điều phối toàn bộ quy trình đồng bộ tự động.
- `public/`: Giao diện tối ưu tone màu dịu mắt, hỗ trợ hiển thị rút gọn Tỉnh và tooltip địa chỉ, highlight trực quan các trường thiếu/lỗi mà không cần cột Chuẩn.
