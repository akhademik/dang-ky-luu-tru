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

### 1.4. Strict GMT+7 Timezone & C06 Date Format Policy
- **Múi giờ duy nhất**: Tất cả thời gian lưu trữ trong Cloudflare D1, xử lý logic, đồng bộ Sheets, gửi API BCA và hiển thị giao diện bắt buộc dùng **GMT+7 (`Asia/Ho_Chi_Minh`)**.
- **Giờ checkout chuẩn**: Mặc định là **12:00:00 GMT+7 (Trưa)**. Tuyệt đối không lưu theo UTC `05:00:00` làm sai lệch logic tự động trả phòng (auto-checkout).
- **Quy chuẩn Định dạng Thời gian gửi API C06 (BCA)**:
  - Đầu vào (Sheets/OCR/UI): Hỗ trợ linh hoạt `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`.
  - **Payload gửi API 4 & API 5**:
    - `ngayThangNamSinhStr`: Bắt buộc chuẩn **`YYYY-MM-DD`** (Ví dụ: `1992-10-01`).
    - `ngayDenCsltStr`: Bắt buộc chuẩn **`YYYY-MM-DD HH:mm:ss`** (Ví dụ: `2026-09-17 14:00:00`). C06 chỉ chấp nhận ngày hôm nay hoặc hôm qua.
    - `ngayDiDuKienStr`: Bắt buộc chuẩn **`YYYY-MM-DD HH:mm:ss`** (Ví dụ: `2026-09-19 12:00:00`). Phải `>= ngayDenCsltStr`.
    - `thoiHanTamTruStr` (NNN): Bắt buộc chuẩn **`YYYY-MM-DD HH:mm:ss`** (Ví dụ: `2026-12-31 23:59:59`).
  - **Payload gửi API 12 (Đổi ngày đi / Gia hạn lưu trú)**:
    - Trả phòng sớm (`loai: "TS"`): Payload chỉ bao gồm `[ { "loai": "TS", "soGiayTo": "...", "loaiGiayTo": 1 } ]` (không kèm trường `thoiGianStr`).
    - Gia hạn lưu trú (`loai: "GH"`): Payload bao gồm `[ { "loai": "GH", "soGiayTo": "...", "loaiGiayTo": 1, "thoiGianStr": "YYYY-MM-DD HH:mm:ss" } ]`.
  - **Quy tắc Số giấy tờ & Loại giấy tờ**:
    - Thẻ CCCD: `loaiGiayTo = 1` (đúng 12 số, không dấu cách).
    - Thẻ Căn cước mới: `loaiGiayTo = 8` (đúng 12 số, không dấu cách).
    - Hộ chiếu: `loaiGiayTo = 4` (tối đa 10 ký tự, chữ & số).

### 1.5. Network & Connection Protocols (Quy Chuẩn Kết Nối Mạng & API)
- **Bắt buộc IPv4 Only cho Node.js Runtime**:
  - Máy chủ Sandbox BCA (`api-kbtt.ai-vlab.com`) và Cloudflare Proxy trả về cả 2 bản ghi IPv4 và IPv6. Để chống lỗi treo `ETIMEDOUT / fetch failed` do mạng nội bộ không định tuyến IPv6, bắt buộc:
    1. Runtime: Gọi `net.setDefaultAutoSelectFamily(false)` và `dns.setDefaultResultOrder("ipv4first")` trong [`config.ts`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/config.ts).
    2. CLI/Scripts: Truyền `NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"` trong `package.json`.
- **Tương thích chuẩn HTTP/2 (RFC 7540)**:
  - Tuyệt đối không gửi header hop-by-hop `Connection: "close"` khi gọi API tới Cloudflare Proxy.
- **Cơ chế Tự Động Thử Lại (Exponential Backoff Retry)**:
  - Mọi yêu cầu HTTP ra bên ngoài ([`TokenManager`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/tokenManager.ts), [`KbttClient`](file:///home/hajtran/dev/dang-ky-luu-tru/src/lib/server/kbttClient.ts)) phải có vòng lặp retry tối thiểu 3 lần kèm độ trễ giãn cách (`attempt * 1000ms`) để triệt tiêu lỗi chập chờn.
- **Bảo mật Dữ liệu & Ghi chú Nội bộ**:
  - Ghi chú (`ghi_chu`) của khách sạn là dữ liệu lưu hành nội bộ trong DB D1. Khi đóng gói payload gửi API C06 BCA, trường `ghiChu` bắt buộc phải để chuỗi rỗng `""`.

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

### 3.4. Custom Modals & Dialogs Rule (Tuyệt đối không dùng Native Dialog)
- **CẤM SỬ DỤNG**: Tuyệt đối không sử dụng các hộp thoại mặc định của trình duyệt như `window.alert()`, `window.confirm()`, `window.prompt()`.
- **BẮT BUỘC CUSTOM MODAL**: Mọi thao tác xác nhận (xóa khách, checkout, xóa dev logs, cảnh báo...) đều phải dùng component/dialog modal tùy biến viết bằng Svelte + Tailwind:
  - Lớp phủ mờ nền: `fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4`
  - Hộp thoại: `bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl`
  - Đầy đủ tiêu đề, icon cảnh báo, nội dung giải thích rõ ràng kèm nút "Hủy" và "Xác nhận".

---

## 4. QUY TẮC MÔI TRƯỜNG & BẢO MẬT
- **DEV Mode**: Mở toàn quyền truy cập không yêu cầu mật khẩu, hiển thị toggle chuyển đổi Sandbox/BCA.
- **PROD Mode**: Cố định môi trường BCA, ẩn hoàn toàn nút toggle môi trường, khóa bằng mật khẩu phiên làm việc qua biến môi trường `APP_PASSWORD`.
