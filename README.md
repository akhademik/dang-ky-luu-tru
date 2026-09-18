# Hệ Thống Khai Báo Tạm Trú Tự Động (BCA KBTT API v1.4 & Cloudflare D1)

Hệ thống quản lý và tự động hóa đồng bộ hồ sơ khách lưu trú từ **Google Sheets (OCR)** sang **Hệ thống Quản lý Khai báo Tạm trú Bộ Công An (KBTT BCA API v1.4)** trên nền tảng **SvelteKit 2 + Svelte 5 (Runes) + TypeScript + Cloudflare D1 Serverless Database**.

---

## 📌 Tổng Quan Hệ Thống

- **Framework**: SvelteKit 2 + Svelte 5 (Runes `$state`, `$derived`, `$props`, Callback Props) + TypeScript + Tailwind CSS.
- **Cơ sở dữ liệu**: **Cloudflare D1 Database** (Nguồn dữ liệu chân thực duy nhất - Single Source of Truth) kết hợp tầng **Modular Repositories** chuyên biệt.
- **Bảo mật**: Centralized API Gateway Auth (`hooks.server.ts`), HttpOnly SameSite=Strict secure cookies, CSRF protection, Webhook API Key.
- **Độ tin cậy dữ liệu**: State Machine kiểm soát chuyển đổi trạng thái lưu trú (`validator.ts`), dịch vụ múi giờ tập trung **GMT+7 (Asia/Ho_Chi_Minh)** (`time.ts`), Request ID tracking, và Append-only audit logs trong Production.
- **Chuẩn API**: Tuân thủ 100% đặc tả API Khai báo tạm trú v1.4 của Bộ Công An (OAuth 2.0, API 4 Khách Nước ngoài, API 5 Khách Việt Nam, API 12 Thay đổi ngày đi / Gia hạn / Trả phòng sớm).
- **Package Manager**: **`pnpm`** (Bắt buộc cho mọi thao tác).
- **CI/CD**: GitHub Actions Pipeline tự động kiểm tra Linting (Biome), Svelte diagnostics, Dead Code (Knip), Offline Tests (100% không phụ thuộc internet), và Build compilation.

---

## 🚀 Các Tính Năng Chính (Core Features)

1. **Quét & Kéo Dữ Liệu Tự Động (OCR Ingestion)**:
   - Tự động nhận diện danh sách Tab ngày (`dd-MM-yy`) từ Google Sheets công khai, kéo dữ liệu OCR mới nhất vào Database D1 với trạng thái `READY_TO_SYNC`.
   - Hỗ trợ Webhook API `POST /api/ingest/ocr` nhận dữ liệu tự động từ Google Apps Script với mã bảo mật riêng.
2. **Khai Báo Lưu Trú Chuẩn BCA (API 4 & API 5)**:
   - Tự động phân loại: Khách Việt Nam gửi qua API 5 (yêu cầu CCCD 12 số, địa chỉ đầy đủ), Khách Nước Ngoài gửi qua API 4 (bắt buộc thời hạn thị thực/visa hợp lệ, mã quốc tịch Alpha-3).
   - Kiểm tra chéo nghiêm ngặt (Strict Pre-flight Validation) trước khi gửi.
3. **Quản Lý Lưu Trú & Vòng Đời Khách (Stay Lifecycle)**:
   - **Gia hạn thời hạn lưu trú (Extend Stay)**: Cập nhật ngày đi dự kiến mới và tự động thông báo C06 BCA qua API 12.
   - **Trả phòng (Checkout)**: Trả phòng sớm trước 12:00 trưa gửi API 12 (TS) lên BCA, sau 12:00 trưa tự động checkout nội bộ D1.
   - **Khai báo lại (Re-Register)**: Khách đã checkout quay lại ở tiếp, hoặc khách đã test trên DEV cần khai báo lại trên PROD -> Tự động tạo lượt lưu trú mới từ thời điểm hiện tại GMT+7.
4. **Quick-Edit Modal với Live Validation**:
   - Kiểm tra tính hợp lệ từng trường theo thời gian thực (họ tên, CCCD/Hộ chiếu, quốc tịch, ngày đến, hạn visa).
5. **Chuyển Đổi Môi Trường Linh Hoạt (DEV Sandbox <-> PROD BCA)**:
   - Cho phép chuyển đổi giữa môi trường thử nghiệm và môi trường chính thức trực tiếp trên thanh điều hướng.
6. **Nhật Ký Audit & Tra Cứu Payload**:
   - Ghi nhận chi tiết toàn bộ Request / Response JSON payload gửi và nhận từ BCA, phục vụ kiểm tra lỗi và đối soát.

---

## 📂 Cấu Trúc Dự Án & Tài Liệu Kỹ Thuật

Vui lòng tham khảo tài liệu chi tiết:
- **[Tài Liệu Kiến Trúc & Kỹ Thuật (ARCHITECTURE.md)](file:///home/hajtran/dev/dang-ky-luu-tru/ARCHITECTURE.md)**: Chi tiết Schema Cloudflare D1, Modular Repositories, State Machine, Quy tắc Validation, Danh mục API, và Hướng dẫn mở rộng tính năng.
- **[Quy Chuẩn Thiết Kế & Style Guide (DESIGN_PATTERN.md)](file:///home/hajtran/dev/dang-ky-luu-tru/DESIGN_PATTERN.md)**: Các architectural patterns, UI components, và bảng mã màu Dark Slate Glassmorphism.
- **[Quy Chuẩn Phát Triển & Kiểm Thử (WORKFLOW_INSTRUCTION.md)](file:///home/hajtran/dev/dang-ky-luu-tru/WORKFLOW_INSTRUCTION.md)**: Quy trình kiểm tra chất lượng code và testing 6 bước.

---

## 🛠 Lệnh Thực Thi (Commands)

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Chạy môi trường phát triển cục bộ
pnpm run dev

# 3. Kiểm tra định dạng & Linting Biome
pnpm run lint:biome
pnpm run format

# 4. Kiểm tra TypeScript & Svelte diagnostics
pnpm run check:svelte

# 5. Kiểm tra Dead code & Unused exports
pnpm run knip

# 6. Chạy toàn bộ Unit, API, Integration & Anti-Deprecation tests (100% Offline)
pnpm test

# 7. Biên dịch production build
pnpm run build
```
