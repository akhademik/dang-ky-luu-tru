# DESIGN PATTERN & STYLE GUIDE - HỆ THỐNG ĐĂNG KÝ & QUẢN LÝ LƯU TRÚ

Tài liệu này quy định các tiêu chuẩn kiến trúc (Architectural Patterns), nguyên tắc thiết kế giao diện (UI/UX Design Patterns), và bảng mã màu (Color Palette) áp dụng xuyên suốt cho toàn bộ dự án.

---

## 1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)

### 1.1. Single Source of Truth: Cloudflare D1
- **Database Core**: Mọi thao tác hiển thị, đăng ký, gia hạn, trả phòng và tra soát hồ sơ đều truy vấn và ghi trực tiếp vào Cloudflare D1 (`guests`, `stays`, `kbtt_logs`).
- **Google Sheets vai trò**: Đầu vào nhận OCR và kích hoạt Google Apps Script Webhook đẩy dữ liệu vào `POST /api/ingest/ocr`.

### 1.2. Zero-FS Edge Runtime Compatibility
- **Nguyên tắc**: Không dùng `import fs from 'node:fs'` ở cấp module static.
- **Dữ liệu tĩnh**: Toàn bộ danh mục tra cứu C06 (252 Quốc tịch, 34 Tỉnh/TP, Loại giấy tờ, Lý do lưu trú) được nhúng trực tiếp dạng TypeScript objects trong `src/lib/data/catalogs.ts`.

### 1.3. Svelte 5 Modern Runes Pattern
- State: Dùng `$state()` cho reactive state (khai báo biến đơn hoặc mảng đối tượng).
- Derived Values: Dùng `$derived()` để tính toán danh sách lọc, thống kê.
- Side-effects: Dùng `$effect()` đồng bộ dữ liệu theo tab hoạt động (`activeTab`).
- Component Props: Dùng `let { ... } = $props()`.

### 1.4. Strict GMT+7 Timezone Policy (Chính Sách Múi Giờ Bắt Buộc)
- **Múi giờ duy nhất**: Tất cả thời gian lưu trữ trong Cloudflare D1, xử lý logic, đồng bộ Sheets, gửi API BCA và hiển thị giao diện bắt buộc dùng **GMT+7 (`Asia/Ho_Chi_Minh`)**.
- **Giờ checkout chuẩn**: Mặc định là **12:00:00 GMT+7 (Trưa)**. Tuyệt đối không lưu theo UTC `05:00:00` làm sai lệch logic tự động trả phòng (auto-checkout).
- **Vòng đời khách**: Khách chỉ bị auto-checkout khi giờ thực tế GMT+7 đã vượt quá 12:00:00 trưa ngày đi.

---

## 2. COLOR CODE & THEME PALETTE (BẢNG MÃ MÀU CHUẨN)

Dự án áp dụng phong cách **Modern Dark Slate Glassmorphism** hiện đại, độ tương phản cao, tối ưu cho mắt khi làm việc ban đêm và ca trực.

### 2.1. Backgrounds & Surfaces (Nền & Thẻ chứa)
| Thành phần | Mã Tailwind | Hex / RGBA Code | Mục đích |
| :--- | :--- | :--- | :--- |
| **App Canvas** | `bg-slate-900` | `#0f172a` | Nền tổng thể toàn trang |
| **Card / Surface** | `bg-slate-800/80` | `rgba(30, 41, 59, 0.8)` | Thẻ chứa chính, panel với viền bo góc |
| **Sub-surface / Inputs** | `bg-slate-900` | `#0f172a` | Ô nhập dữ liệu, dropdown, popup phụ |
| **Borders** | `border-slate-700` | `#334155` | Đường viền các thẻ, phân cách bảng dữ liệu |
| **Modal Overlay** | `bg-slate-950/90` | `rgba(2, 6, 23, 0.9)` | Màn hình mờ khi mở modal xác thực, sửa đổi |

### 2.2. Text & Typography
| Loại văn bản | Mã Tailwind | Hex Code |
| :--- | :--- | :--- |
| **Heading / Primary** | `text-slate-100` / `text-white` | `#f1f5f9` / `#ffffff` |
| **Secondary / Labels** | `text-slate-400` | `#94a3b8` |
| **Subtle / Timestamps** | `text-slate-500` | `#64748b` |
| **Header Gradient** | `from-sky-400 via-teal-300 to-indigo-400` | Gradient nhận diện thương hiệu |

### 2.3. Semantic Accents (Màu Trạng Thái Nghiệp Vụ)
| Nghiệp vụ / Trạng thái | Accent Color | Tailwind Badge Style | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| **Khai Báo Mới (READY_TO_SYNC)** | **Amber / Vàng cam** | `bg-amber-100 text-amber-800 border-amber-300` | Khách mới nạp từ OCR, chờ duyệt gửi BCA |
| **Đã Đăng Ký (SYNCED_KBTT)** | **Emerald / Xanh lá** | `bg-emerald-100 text-emerald-800 border-emerald-300` | Đã gửi thành công API 4/5, có mã MANDK |
| **Đã Gia Hạn (EXTENDED)** | **Indigo / Tím xanh** | `bg-indigo-100 text-indigo-800 border-indigo-300` | Khách đã gia hạn thêm ngày ở |
| **Đã Checkout (CHECKED_OUT)** | **Slate / Xám trung tính**| `bg-gray-100 text-gray-700 border-gray-300` | Khách đã rời cơ sở lưu trú |
| **Lỗi / Thiếu tin (PENDING)**| **Rose / Đỏ hồng** | `bg-rose-100 text-rose-800 border-rose-300` | Dữ liệu OCR thiếu trường bắt buộc |

---

## 3. UI COMPONENT PATTERNS (CHUẨN THIẾT KẾ GIAO DIỆN)

### 3.1. Buttons & Action Elements
- **Primary CTA (Khai báo, Thêm mới)**: 
  `bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl shadow-lg active:scale-95`
- **Secondary Action (Làm mới, Hủy)**:
  `bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl border border-slate-600 active:scale-95`
- **Success Action (Gia hạn, Check-in)**:
  `bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold`
- **Danger Action (Checkout, Xóa)**:
  `bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold`

### 3.2. Form Inputs & Selects
- Quy cách: `w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500 transition-colors`
- Số phòng, CCCD, Mã Code: Sử dụng font đơn cách `font-mono`.
- Họ và tên: Luôn tự động chuyển in hoa `uppercase`.

### 3.3. Toast Notifications
- Nằm cố định ở góc trên bên phải: `fixed top-5 right-5 z-50`
- Bo góc `rounded-lg`, đổ bóng `shadow-xl`, hiệu ứng mờ `backdrop-blur-md`
- Phân loại 3 mức: `success` (Emerald), `error` (Rose), `info` (Sky).

---

## 4. QUY TẮC MÔI TRƯỜNG & BẢO MẬT
- **DEV Mode**: Mở toàn quyền truy cập không yêu cầu mật khẩu, hiển thị toggle chuyển đổi Sandbox/BCA.
- **PROD Mode**: Cố định môi trường BCA, ẩn hoàn toàn nút toggle môi trường, khóa bằng mật khẩu phiên làm việc qua biến môi trường `APP_PASSWORD`.
