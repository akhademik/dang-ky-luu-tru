# DESIGN PATTERN & STYLE GUIDE - HỆ THỐNG ĐĂNG KÝ & QUẢN LÝ LƯU TRÚ

Tài liệu này quy định các tiêu chuẩn kiến trúc (Architectural Patterns), nguyên tắc thiết kế giao diện (UI/UX Design Patterns), và bảng mã màu (Color Palette) áp dụng xuyên suốt cho toàn bộ dự án.

---

## 1. ARCHITECTURAL PATTERNS (KIẾN TRÚC HỆ THỐNG)

### 1.1. Single Source of Truth: Cloudflare D1 & Modular Repositories
- **Database Core**: Mọi thao tác hiển thị, đăng ký, gia hạn, trả phòng và tra soát hồ sơ đều truy vấn và ghi trực tiếp vào Cloudflare D1 (`guests`, `stays`, `kbtt_logs`) thông qua tầng Repository chuyên biệt tại `src/lib/server/repositories/`.
- **Google Sheets vai trò**: Đầu vào nhận OCR và kích hoạt Google Apps Script Webhook đẩy dữ liệu vào `POST /api/ingest/ocr` (được bảo vệ bởi Webhook API Key).

### 1.2. Zero-FS Edge Runtime Compatibility
- **Nguyên tắc**: Không dùng `import fs from 'node:fs'` ở cấp module static trong runtime production.
- **Dữ liệu tĩnh**: Toàn bộ danh mục tra cứu C06 (252 Quốc tịch, 34 Tỉnh/TP, Loại giấy tờ, Lý do lưu trú) được nhúng trực tiếp dạng TypeScript objects trong `src/lib/data/catalogs.ts`.

### 1.3. Svelte 5 Modern Runes & Callback Props Pattern
- **State**: Dùng `$state()` cho reactive state (khai báo biến đơn hoặc mảng đối tượng).
- **Derived Values**: Dùng `$derived()` hoặc `$derived.by()` để tính toán danh sách lọc, thống kê.
- **Side-effects**: Dùng `$effect()` đồng bộ dữ liệu theo tab hoạt động (`activeTab`).
- **Component Props**: Dùng `let { ... }: Props = $props()`.
- **Event Handling**: Tuyệt đối không dùng `createEventDispatcher` hay `on:click`. Sử dụng **Callback Props** (`onconfirm?: () => void`) và standard HTML event attributes (`onclick`, `onchange`).

### 1.4. Centralized Security Gateway & Auth Pattern
- Toàn bộ browser endpoints `/api/*` đều được kiểm soát phiên làm việc tập trung tại `hooks.server.ts` thông qua `session_auth` HttpOnly, SameSite=Strict cookies.
- Webhook `/api/ingest/ocr` được xác thực độc lập bằng `x-api-key` hoặc query token `?api_key=...`.
- Xác thực mật khẩu sử dụng so sánh hằng số thời gian (`crypto.timingSafeEqual`) chống tấn công Timing Attacks.

### 1.5. Strict GMT+7 Timezone & Stay State Machine Policy
- **Múi giờ duy nhất**: Tất cả thời gian lưu trữ trong Cloudflare D1, xử lý logic, đồng bộ Sheets, gửi API BCA và hiển thị giao diện bắt buộc dùng **GMT+7 (`Asia/Ho_Chi_Minh`)** được quản lý tập trung tại `src/lib/server/time.ts`.
- **Stay State Machine**: Chuyển đổi trạng thái lưu trú được kiểm soát chặt chẽ tại `src/lib/server/validator.ts` ngăn chặn các bước nhảy trạng thái không hợp lệ.
- **Quy tắc Tự Động Checkout & Thời điểm Gửi API BCA**:
  - **Cơ chế tự động của BCA**: Trên hệ thống C06 (BCA), hồ sơ lưu trú của khách **tự động checkout sau 12:00:00 của ngày đi dự kiến (`ngayDiDuKienStr`)**.
  - **Cơ chế Database nội bộ**: Khi thời gian thực tế GMT+7 vượt quá 12:00:00 trưa ngày đi dự kiến, database D1 tự động chuyển trạng thái khách sang `CHECKED_OUT` mà **TUYỆT ĐỐI KHÔNG gửi API lên BCA**.
  - **Thời điểm gửi API 12 (Trả phòng sớm - `loai: "TS"`)**: Hệ thống **chỉ gửi API 12 lên BCA khi người dùng bấm Checkout TRƯỚC 12:00:00 của ngày đi dự kiến**.

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
| **Khai Báo Mới (READY_TO_SYNC)** | **Amber / Vàng cam** | `bg-amber-500/15 border-amber-500/30 text-amber-400` | Khách mới nạp từ OCR, chờ duyệt gửi BCA |
| **Đã Đăng Ký (SYNCED_KBTT)** | **Emerald / Xanh lá** | `bg-emerald-500/15 border-emerald-500/30 text-emerald-400` | Đã gửi thành công API 4/5, có mã MANDK |
| **Đã Gia Hạn (EXTENDED)** | **Indigo / Tím xanh** | `bg-indigo-500/15 border-indigo-500/30 text-indigo-400` | Khách đã gia hạn thêm ngày ở |
| **Đã Checkout (CHECKED_OUT)** | **Slate / Xám trung tính**| `bg-slate-700/50 border-slate-600/50 text-slate-400` | Khách đã rời cơ sở lưu trú |
| **Lỗi / Thiếu tin (ERROR / PENDING)**| **Rose / Đỏ hồng** | `bg-rose-500/15 border-rose-500/30 text-rose-400` | Dữ liệu OCR thiếu trường bắt buộc hoặc BCA từ chối |

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

### 3.3. Custom Modals & Dialogs (No Native Browser Dialogs)
- **CẤM SỬ DỤNG**: Tuyệt đối không sử dụng các hộp thoại mặc định `window.alert()`, `window.confirm()`.
- **BẮT BUỘC CUSTOM MODAL**: Sử dụng [`ConfirmModal.svelte`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/components/ConfirmModal.svelte) hoặc modal custom Svelte 5 đồng bộ toàn hệ thống.
