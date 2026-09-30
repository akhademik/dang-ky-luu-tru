# Hệ Thống Khai Báo Tạm Trú Tự Động (BCA KBTT API v1.4 & Cloudflare D1)

Hệ thống quản lý và tự động hóa đồng bộ hồ sơ khách lưu trú từ **Google Sheets (OCR)** sang **Hệ thống Quản lý Khai báo Tạm trú Bộ Công An (KBTT BCA API v1.4)** trên nền tảng **SvelteKit 2 + Svelte 5 (Runes) + TypeScript + Cloudflare D1 Serverless Database**.

---

## 📌 Tổng Quan Hệ Thống

- **Framework**: SvelteKit 2 + Svelte 5 (Runes `$state`, `$derived`, `$props`, Callback Props) + TypeScript + Tailwind CSS.
- **Cơ sở dữ liệu**: **Cloudflare D1 Database** (Nguồn dữ liệu chân thực duy nhất - Single Source of Truth) kết hợp tầng **Modular Repositories** chuyên biệt.
- **Bảo mật & Phân quyền**:
  - **Môi trường DEV (`KBTT_ENV=dev`)**: Tự động bypass 100% authentication & rate limit, vào thẳng Dashboard phục vụ phát triển nhanh chóng.
  - **Môi trường PROD (`KBTT_ENV=prod`)**: Bắt buộc xác thực mật khẩu duy nhất qua biến môi trường `APP_PASSWORD`.
  - **Session Token bảo mật**: Cấp token ngẫu nhiên ký số HMAC-SHA256, thời hạn sống ngắn **15 phút** (`SESSION_TTL_SECONDS = 900`), cookie `HttpOnly`, `SameSite=Lax`, `Secure`.
  - **Cloudflare Native Rate Limiter**: Tích hợp binding `RATE_LIMITER` ở tầng Edge Network (`5 requests / 60s`), trả HTTP 429 khi bị brute-force mà không dùng RAM in-memory.
  - **Centralized Gateway**: Kiểm soát tập trung tại `hooks.server.ts`, CSRF origin protection và Webhook API Key độc lập.
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
- **[Tài Liệu Kiến Trúc & Kỹ Thuật (ARCHITECTURE.md)](file:///home/hajtran/dev/dang-ky-luu-tru/ARCHITECTURE.md)**: Chi tiết Schema Cloudflare D1, Modular Repositories, State Machine, Quy tắc Validation, Danh mục API, Cơ chế Authentication & Rate Limiting, và Hướng dẫn mở rộng tính năng.
- **[Quy Chuẩn Thiết Kế & Style Guide (DESIGN_PATTERN.md)](file:///home/hajtran/dev/dang-ky-luu-tru/DESIGN_PATTERN.md)**: Các architectural patterns, UI components, và bảng mã màu Dark Slate Glassmorphism.
- **[Quy Chuẩn Phát Triển & Kiểm Thử (WORKFLOW_INSTRUCTION.md)](file:///home/hajtran/dev/dang-ky-luu-tru/WORKFLOW_INSTRUCTION.md)**: Quy trình kiểm tra chất lượng code và testing 6 bước.

---

## 🛠 Lệnh Thực Thi (Commands)

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Chạy môi trường phát triển cục bộ (Tự động bypass auth)
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

---

## Trạng thái hệ thống

- Cập nhật lần cuối: 2026-09-30 14:55 (GMT+7)
- Đã hoàn thành: Sửa lỗi nhận diện ngày hết hạn trong `getExpiredStays` tại [`src/lib/server/repositories/stayRepository.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/repositories/stayRepository.ts), hỗ trợ lọc chuẩn xác 100% mọi định dạng ngày (`DD/MM/YYYY`, `YYYY-MM-DD`, có/không có giờ) qua hàm `isSameOrPastCheckoutTimeGmt7`. Khi qua mốc 12:00 ngày đi dự kiến, hệ thống tự động quét các khách tồn đọng, gửi API 12 (`TS`) sang C06 BCA và cập nhật trạng thái `CHECKED_OUT` kèm nhật ký chi tiết trong Dev Logs. Pipeline kiểm tra chất lượng code (`format`, `lint:biome`, `check:svelte`, `test`, `knip`, `build`, `graphify`) đều đạt 100% pass.
- Đang dở: Không có.
- Biết trước còn thiếu / nợ kỹ thuật: Không có.

## Changelog

### 2026-09-30

- Sửa Lỗi Tự Động Checkout Cho Đa Định Dạng Ngày (`DD/MM/YYYY` & `YYYY-MM-DD`):
  - Khắc phục lỗi truy vấn SQL `datetime()` không đọc được chuỗi ngày `DD/MM/YYYY` trong [`src/lib/server/repositories/stayRepository.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/repositories/stayRepository.ts).
  - Tích hợp hàm `isSameOrPastCheckoutTimeGmt7` từ [`src/lib/server/time.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/time.ts) vào tầng Repository để lọc chính xác mọi khách đang ở (`SYNCED_KBTT`, `CHECKED_IN`, `EXTENDED`) đã vượt quá 12:00 trưa ngày đi dự kiến.
  - Tự động gọi API 12 (`TS`) sang C06 BCA và ghi nhận audit logs đầy đủ trong CSDL D1 / Dev Logs.
  - Bổ sung integration test kiểm thử cho cả 2 định dạng `YYYY-MM-DD` và `DD/MM/YYYY` trong [`test/integration/stay-service.test.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/test/integration/stay-service.test.ts).
- Thêm Component Hover Tooltip Chi Tiết Khách Hàng:
  - Xây dựng component [`src/lib/components/GuestTooltip.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/components/GuestTooltip.svelte) theo phong cách Modern Dark Slate Glassmorphism.
  - Khi rê chuột (hover) vào tên khách, hiển thị bảng tooltip trực quan gồm: Họ tên, Giới tính, Số phòng, Số giấy tờ + Loại giấy tờ (`loai_giay_to`), Quốc tịch + Mã ISO (`quoc_tich`), Ngày sinh (`ngay_sinh`), Hạn thị thực/Visa (`thoi_han_thi_thuc`), Địa chỉ chi tiết (`dia_chi_chi_tiet`), Trạng thái lưu trú (`status`), và Ghi chú (`ghi_chu`).
  - Áp dụng đồng bộ cho tất cả các bảng danh sách khách hàng trong [`src/routes/+page.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/routes/+page.svelte).
- Tinh chỉnh Logic Validation Ngày đến theo Trạng thái Lưu trú:
  - Cập nhật `validateArrivalDate` và `validateStayDetail` trong [`src/routes/+page.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/routes/+page.svelte): Bỏ cờ cảnh báo lỗi đối với khách có ngày đến trong quá khứ khi đang ở các trạng thái đã đồng bộ (`SYNCED_KBTT`, `EXTENDED`, `CHECKED_OUT`).
  - Chỉ áp dụng ràng buộc nghiêm ngặt ngày đến $\ge$ hôm nay cho các lượt đăng ký mới (`READY_TO_SYNC`, `PENDING_VALIDATION`) để tránh bị BCA từ chối khi gửi API 4 / API 5.
  - Cập nhật Modal Quick-Edit: Cho phép xem và chỉnh sửa ngày đến của khách đang ở mà không bị khóa chặn `min=today` trừ khi khách đó ở trạng thái chưa sync (`READY_TO_SYNC`).
- Phân loại tiền tố Dev Logs (`db-` & `api-`): Cập nhật hàm `formatAuditAction` trong [`src/routes/+page.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/routes/+page.svelte) bổ sung các nhãn phân biệt trực quan:
  - `api-checkin`: Gửi hồ sơ khai báo lưu trú mới lên BCA (API 4 cho khách nước ngoài, API 5 cho khách Việt Nam).
  - `api-checkout`: Gửi yêu cầu trả phòng sớm lên BCA (API 12 - loại `TS`).
  - `api-extend`: Gửi yêu cầu gia hạn lưu trú lên BCA (API 12 - loại `GH`).
  - `db-checkin`: Tạo lượt lưu trú mới trong CSDL D1 (đăng ký lại `RE_REGISTER_STAY`).
  - `db-checkout`: Trả phòng nội bộ trong CSDL D1 (`CHECKOUT_STAY`).
  - `db-extend`: Gia hạn nội bộ trong CSDL D1.
  - `db-status`: Thao tác đổi/ghi đè trạng thái CSDL (`OVERWRITE_STATUS`).
- Cải tiến UI Date Picker & Ràng buộc Ngày đến: Bổ sung thuộc tính `min` và `max` cho [`src/lib/components/DatePicker.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/components/DatePicker.svelte), tự động vô hiệu hóa (disable) không cho phép người dùng chọn các ngày trong quá khứ (< ngày hiện tại hôm nay) cho trường `Ngày đến` trên lịch và form validation trong [`src/routes/+page.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/routes/+page.svelte).
- Cải tiến UI Date Picker: Xây dựng và tích hợp component [`src/lib/components/DatePicker.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/components/DatePicker.svelte) cho toàn bộ các trường ngày tháng (`Ngày sinh`, `Ngày đến`, `Ngày đi dự kiến`, `Thời hạn thị thực`) trong Modal Sửa (Quick-Edit), Modal Thêm khách mới, Modal Gia hạn (Extend) và Modal Khai báo lại (Re-Register) đảm bảo UI luôn hiển thị và nhập theo định dạng `DD/MM/YYYY`.
- Tự động hóa giờ Ngày đến & Ngày đi: Ngày đến tự động lấy giờ thực tế GMT+7 lúc nạp/tạo mới hoặc giờ tại thời điểm sửa đổi; Ngày đi dự kiến tự động hardcode `12:00:00` theo quy chuẩn BCA mà không cần hiển thị ô nhập giờ.
- Backend Normalization: Bổ sung lớp chuẩn hóa dữ liệu ngày tháng hai chiều tại [`src/routes/api/stays/+server.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/routes/api/stays/+server.ts) và [`src/lib/server/stayService.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/stayService.ts) đảm bảo CSDL D1 lưu trữ chuẩn (`YYYY-MM-DD` / `YYYY-MM-DD HH:mm:ss`) và payload gửi sang BCA (API 4, API 5, API 12) luôn chính xác 100%.
- Cập nhật tài liệu thiết kế: Ghi nhận quy định bắt buộc định dạng ngày tháng `DD/MM/YYYY` trên UI vào [`DESIGN_PATTERN.md`](file:///home/hajtran/dev/dang-ky-luu-tru/DESIGN_PATTERN.md).
- Thêm: Triển khai logic auto-checkout cho khách đang ở (`SYNCED_KBTT`, `EXTENDED`) khi ngày đi dự kiến vượt quá 12:00 trưa GMT+7, tự động gửi API 12 đổi ngày trả phòng lên C06 BCA và cập nhật trạng thái `CHECKED_OUT`.
- Thêm: API endpoint `POST /api/stays/auto-checkout` và tích hợp trigger tự động trong các luồng truy vấn `GET /api/stays` và `GET /api/stats`.
- Sửa: Cập nhật hàm `formatAuditAction` trong [`src/routes/+page.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/routes/+page.svelte) để nhận diện `API_12_DOI_NGAY_TRA_PHONG` kết hợp kiểm tra `request_payload`, tự động hiển thị nhãn `extend` cho các lượt gia hạn lưu trú (loại `GH`) và `checkout` cho các lượt trả phòng sớm (loại `TS`).
- Kết quả pipeline: format ✅ | lint ✅ | type ✅ | test ✅ (100% pass) | knip ✅ | live BCA test ✅ (HTTP 200) | build ✅
- File chính bị ảnh hưởng: [`src/lib/server/repositories/stayRepository.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/repositories/stayRepository.ts), [`test/integration/stay-service.test.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/test/integration/stay-service.test.ts), [`README.md`](file:///home/hajtran/dev/dang-ky-luu-tru/README.md)

