# AGENT WORKFLOW & CODING STANDARDS

## 1. Package Manager
- **Bắt buộc sử dụng `pnpm`** thay cho `npm` hoặc `yarn` cho mọi thao tác cài đặt gói, quản lý dependencies và chạy scripts:
  - Cài đặt package: `pnpm add <package>`
  - Chạy script: `pnpm <script_name>` (ví dụ: `pnpm test`, `pnpm start`, `pnpm lint`, `pnpm check`)
  - Chạy lệnh dự án: `pnpm run <command>`

## 2. Quy trình kiểm tra chất lượng (Verification Workflow)
Trước khi thông báo hoàn thành bất kỳ tác vụ code nào cho người dùng:
1. **Lint Check**: Chạy kiểm tra cú pháp và lỗi linter:
   ```bash
   pnpm run lint
   ```
2. **Format & Static Check**: Đảm bảo không có lỗi runtime/formatting tiềm ẩn.
3. **Unit / Integration Tests**: Chạy toàn bộ test suite để xác thực chức năng:
   ```bash
   pnpm test
   # hoặc
   pnpm run check
   ```
4. Chỉ khi **tất cả các bước kiểm tra trên thành công (Exit Code 0)** thì mới tổng hợp và thông báo hoàn tất cho người dùng.

## 3. Kiến trúc mã nguồn tích hợp KBTT
- `src/config.js`: Tham số môi trường, endpoints, tài khoản test và cấu hình refresh token.
- `src/catalogManager.js`: Nạp và cache các danh mục Public API (Quốc tịch, Tỉnh/TP, Phường/Xã, Lý do, Loại giấy tờ, Nơi cư trú).
- `src/tokenManager.js` (Module 1): Quản lý vòng đời OAuth 2.0 token (login API 1, auto-refresh < 60s API 2, revoke API 3).
- `src/dataTransformer.js` (Module 2): Chuẩn hóa dữ liệu OCR từ Google Sheets, làm sạch chuỗi, phân luồng khách Việt Nam (API 5) và Nước ngoài (API 4).
- `src/kbttClient.js` (Module 3): Gửi payload HTTP request và xử lý log phản hồi mã 200/400.
- `src/syncPipeline.js`: Điều phối toàn bộ quy trình đồng bộ tự động.
