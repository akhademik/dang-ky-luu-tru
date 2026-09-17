# Hệ Thống Khai Báo Tạm Trú Tự Động (BCA KBTT API v1.4 & Cloudflare D1)

Hệ thống quản lý và tự động hóa đồng bộ hồ sơ khách lưu trú từ **Google Sheets (OCR)** sang **Hệ thống Quản lý Khai báo Tạm trú Bộ Công An (KBTT BCA API v1.4)** trên nền tảng **SvelteKit 2 + Svelte 5 + TypeScript + Cloudflare D1 Serverless Database**.

---

## 📌 Tổng Quan Hệ Thống

- **Framework**: SvelteKit 2 + Svelte 5 (Runes) + TypeScript + Tailwind CSS.
- **Cơ sở dữ liệu**: **Cloudflare D1 Database** (Nguồn dữ liệu chân thực duy nhất - Single Source of Truth).
- **Chuẩn API**: Tuân thủ 100% đặc tả API Khai báo tạm trú v1.4 của Bộ Công An (OAuth 2.0, API 4 Khách Nước ngoài, API 5 Khách Việt Nam).
- **Múi giờ**: Chuẩn hóa toàn bộ thời gian theo **GMT+7 (Asia/Ho_Chi_Minh)**.
- **Package Manager**: **`pnpm`** (Bắt buộc cho mọi thao tác).

---

## 🚀 Các Tính Năng Chính (Core Features)

1. **Quét & Kéo Dữ Liệu Tự Động (OCR Ingestion)**:
   - Tự động nhận diện danh sách Tab ngày (`dd-MM-yy`) từ Google Sheets công khai, kéo dữ liệu OCR mới nhất vào Database D1 với trạng thái `READY_TO_SYNC`.
2. **Khai Báo Lưu Trú Chuẩn BCA (API 4 & API 5)**:
   - Tự động phân loại: Khách Việt Nam gửi qua API 5 (yêu cầu CCCD 12 số, địa chỉ đầy đủ), Khách Nước Ngoài gửi qua API 4 (bắt buộc thời hạn thị thực/visa hợp lệ, mã quốc tịch Alpha-3).
   - Kiểm tra chéo nghiêm ngặt (Strict Pre-flight Validation) trước khi gửi.
3. **Quản Lý Lưu Trú & Vòng Đời Khách (Stay Lifecycle)**:
   - **Gia hạn thời hạn lưu trú (Extend Stay)**: Cập nhật ngày đi dự kiến mới.
   - **Trả phòng (Checkout)**: Trả phòng thủ công hoặc tự động checkout khi đến hạn dự kiến.
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
- **[Tài Liệu Kiến Trúc & Kỹ Thuật (ARCHITECTURE.md)](file:///home/hajtran/dev/dang-ky-luu-tru/ARCHITECTURE.md)**: Chi tiết Schema Cloudflare D1, State Machine, Quy tắc Validation, Danh mục API, và Hướng dẫn mở rộng tính năng.
- **[Quy Chuẩn Phát Triển & Kiểm Thử (WORKFLOW_INSTRUCTION.md)](file:///home/hajtran/dev/dang-ky-luu-tru/WORKFLOW_INSTRUCTION.md)**: Quy trình kiểm tra chất lượng code và testing.

---

## 🛠 Lệnh Thực Thi (Commands)

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Chạy môi trường phát triển cục bộ
pnpm run dev

# 3. Kiểm tra định dạng & Linting
pnpm run format
pnpm run lint:biome

# 4. Kiểm tra TypeScript & Svelte diagnostics
pnpm run check:svelte

# 5. Chạy toàn bộ Unit & Integration tests
pnpm test
```
