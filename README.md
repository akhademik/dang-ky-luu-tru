# Hệ Thống Tích Hợp & Đồng Bộ Khai Báo Lưu Trú (KBTT API v1.4)

Hệ thống tự động hóa đồng bộ dữ liệu khách lưu trú từ **Google Sheets (OCR)** sang **Hệ thống Quản lý Khai báo Tạm trú (KBTT)** theo chuẩn **API v1.4** (OAuth 2.0, API 4 Khách Nước ngoài, API 5 Khách Việt Nam), tích hợp hai chiều với Google Apps Script Webhook trên nền tảng **SvelteKit 2 + Svelte 5 + TypeScript**.

---

## 📌 Tình Trạng Hiện Tại (Current Status)

- **Framework**: **SvelteKit 2 + Svelte 5 (Runes) + TypeScript + Tailwind CSS**.
- **Chuẩn API**: Tuân thủ 100% đặc tả API v1.4 từ `https://api-kbtt.ai-vlab.com`.
- **Package Manager**: **`pnpm`** (Bắt buộc 100% cho mọi thao tác cài đặt và chạy script).
- **Cấu hình Môi trường**: Tách toàn bộ thông tin nhạy cảm vào `.env` & `.env.example`.
- **Chất Lượng Mã Nguồn & Kiểm Thử**:
  - `pnpm run check:svelte`: Type-check & template diagnostic qua `svelte-check` (0 errors).
  - `pnpm run knip`: Quản lý dependencies và loại bỏ dead code (0 issue).
  - `pnpm run format` / `pnpm run lint:biome`: Format & lint chuẩn mực với Biome.
  - `pnpm test`: Toàn bộ bộ kiểm thử tự động (Unit test, Validation, Live Sheet sync, OAuth token, Apps Script CRUD) đạt 100% Passed.
  - `pnpm run check`: Lệnh tổng hợp tự động (`check:svelte` + `knip` + `test`).
- **Giao Diện & Trải Nghiệm (UI/UX)**:
  - **Quick-Edit Modal với Live Check thời gian thực**: Kiểm tra tính hợp lệ từng trường ngay khi gõ phím, tự động xóa viền đỏ khi nhập đúng.
  - **Auto-hint Quốc gia thời gian thực**: Nhập mã quốc gia (ví dụ: `VNM`, `ARG`, `USA`, `DEU`), hệ thống tự động hiển thị tên quốc tế (English name) tương ứng ngay cạnh input.
  - **Xác thực Đa Định Dạng Ngày Đến & Giờ Thực Tế**: Hỗ trợ chuẩn xác định dạng Việt Nam (`DD/MM/YYYY HH:mm:ss`, `DD/MM/YYYY`), tự động gán thời gian thực hiện tại khi bấm "Thêm khách".
  - **Thời hạn thị thực (Khách quốc tế)**: Đặt nhãn rõ ràng cho khách nước ngoài, chỉ cần nhập ngày theo format `DD/MM/YYYY`.
  - **Modal Xóa Khách Tùy Biến (Custom Modal & Strikethrough)**: Khi xóa khách, xuất hiện modal xác nhận hiện đại (thay thế native confirm dialog); dòng được đánh dấu gạch ngang (strikethrough) và gọi Apps Script xóa toàn bộ dòng trên Google Sheet.
  - **Chống Đăng Ký Trùng Lặp & Khóa Dòng Đã Đăng Ký**:
    - Tự động đánh dấu `Đã đăng ký` vào Cột 16 trên Google Sheet ngay khi gửi API thành công.
    - Khi tải dữ liệu từ Sheet xuống, các bản ghi đã đăng ký tự động được làm mờ (gray out), vô hiệu hóa checkbox, khóa chế độ chỉnh sửa và hiển thị huy hiệu `✓ Đã đăng ký`.
  - **Đồng bộ 2 chiều tức thì (0ms Optimistic UI)**: Khi bấm Lưu / Xóa / Modal Save, UI cập nhật tức thì 0ms latency và đồng bộ âm thầm với Google Apps Script Webhook trong nền.

---

## 🛠 Cấu Trúc Dự Án (Architecture)

```
.
├── .env                              # Biến môi trường cục bộ (tài khoản, endpoint, sheet id, webhook url)
├── .env.example                      # Mẫu cấu hình môi trường chuẩn
├── api-khai-bao-luu-tru-guide.md     # Đặc tả & hướng dẫn chi tiết API KBTT v1.4
├── instruction.md                    # Tài liệu hướng dẫn cài đặt Apps Script 2 chiều & script dọn dẹp
├── WORKFLOW_INSTRUCTION.md           # Quy chuẩn bắt buộc khi phát triển và kiểm thử
├── knip.json                         # Cấu hình kiểm tra dead code Knip
├── biome.json                        # Cấu hình linter & formatter Biome
├── tsconfig.json                     # Cấu hình TypeScript & SvelteKit aliases
├── package.json                      # Cấu hình dự án & pnpm scripts
├── data/
│   └── catalogs/                     # Bộ nhớ đệm danh mục chuẩn (quốc tịch, tỉnh thành, lý do, giấy tờ)
├── src/
│   ├── lib/
│   │   └── server/                   # Backend Type-Safe Services (TypeScript)
│   │       ├── config.ts             # Bộ nạp .env tự động, Endpoint, Credential OAuth
│   │       ├── catalogManager.ts     # Quản lý danh mục, alias quốc gia, lọc lý do cư trú
│   │       ├── tokenManager.ts       # Quản lý vòng đời OAuth 2.0 Access Token
│   │       ├── dataTransformer.ts    # Chuẩn hóa dữ liệu OCR, parse ngày đa định dạng & validate payload API 4/5
│   │       ├── googleSheetService.ts # Quét Tab ngày, kéo CSV công khai, gửi Webhook Apps Script
│   │       ├── kbttClient.ts         # Client gửi HTTP request payload chuẩn JSON Array [...]
│   │       ├── logger.ts             # Hệ thống ghi nhật ký & lưu trữ log Server
│   │       └── syncPipeline.ts       # Pipeline điều phối Kéo -> Lọc -> Chuẩn hóa -> Đẩy API -> Ghi log
│   └── routes/                       # SvelteKit Endpoints & UI Pages
│       ├── +page.svelte              # Giao diện chính (Data Table, Live-check Modal, Sync Logs, Catalog Browser)
│       └── api/                      # RESTful API Endpoints cho Frontend
│           ├── sheets/               # Quét tabs (/tabs), Kéo dữ liệu (/pull), Ghi đè (/update-row), Xóa dòng (/delete-row)
│           ├── catalogs/             # Lấy danh mục chuẩn phục vụ UI
│           ├── token/                # Trạng thái & làm mới OAuth token
│           ├── transform/            # Chuyển đổi & kiểm tra tính hợp lệ dữ liệu
│           ├── sync/                 # Đẩy dữ liệu lên CSDL KBTT
│           └── logs/                 # Trích xuất và theo dõi nhật ký thực thi
├── test/
│   └── test-pipeline.ts              # Bộ kiểm thử tự động toàn diện
└── graphify-out/                     # Knowledge Graph trích xuất mã nguồn
```

---

## 📋 Danh Sách Chức Năng Chi Tiết (Feature Matrix)

| Chức Năng | Mô Tả & Cơ Chế Hoạt Động | Trạng Thái |
|:---|:---|:---:|
| **Quét & Kéo Tab Google Sheets** | Tự động phân tích HTML Google Sheets công khai, nhận diện tất cả các tab ngày (dd-MM-yy), tự động chọn tab gần hôm nay nhất. | ✅ Sẵn sàng |
| **Bóc tách & Chuẩn hóa OCR** | Làm sạch số phòng (chuẩn hóa 1-9), bóc tách họ tên in hoa, định dạng ngày đa chuẩn (`DD/MM/YYYY HH:mm:ss`, `YYYY-MM-DD`), phân loại khách VN (API 5) / Nước ngoài (API 4). | ✅ Sẵn sàng |
| **Cross-check & Hint Quốc tịch** | Nhập mã Alpha-3 (hoặc tên nước), tự động hiển thị gợi ý tên quốc tế (English name) và kiểm tra tính hợp lệ qua `quoc_tich.json`. | ✅ Sẵn sàng |
| **Chặn Ngày đến Quá khứ & Giờ Thực tế** | Bắt buộc ngày đến là hôm nay hoặc hôm qua. Khi tạo mới khách, tự động lấy giờ phút thực tế của thời điểm tạo. | ✅ Sẵn sàng |
| **Quick-Edit Modal với Live Check** | Modal chỉnh sửa toàn diện; kiểm tra tính hợp lệ từng trường ngay khi gõ phím, tự động xóa viền đỏ khi nhập đúng. | ✅ Sẵn sàng |
| **Xóa Khách & Xóa Dòng trên Sheet** | Modal xác nhận hiện đại, hiệu ứng strikethrough báo hiệu xóa, gửi lệnh xóa toàn bộ hàng trên Google Sheet qua Apps Script. | ✅ Sẵn sàng |
| **Tự Động Cập Nhật Trạng Thái Đăng Ký** | Sau khi gửi KBTT thành công, tự động cập nhật `Đã đăng ký` lên Cột 15 của Google Sheet. | ✅ Sẵn sàng |
| **Khóa Bản Ghi Đã Đăng Ký (Anti-duplicate)** | Dữ liệu kéo về nếu đã đăng ký sẽ tự động gray out, vô hiệu hóa checkbox, ngăn chỉnh sửa để tránh lỗi trùng lặp tại CSLT. | ✅ Sẵn sàng |
| **Biên tập Full Địa chỉ có Dấu phẩy** | Hiển thị chuỗi địa chỉ đầy đủ; khi sửa sẽ tự động phân tách về `Địa chỉ chi tiết`, `Phường/Xã`, `Quận/Huyện`, `Tỉnh/TP` và map lên Google Sheet. | ✅ Sẵn sàng |
| **Đồng bộ 2 Chiều Google Sheets (0ms)** | Khi sửa trên UI hoặc Thêm khách, áp dụng Optimistic UI tức thì (0ms) và gọi Google Apps Script Webhook trong nền để cập nhật dòng trên Sheet. | ✅ Sẵn sàng |
| **Tra cứu Danh mục Tức thì** | Catalog browser tra cứu nhanh Tỉnh/TP, Quốc tịch (hỗ trợ gõ tiếng Việt không dấu), click copy mã 1 chạm. | ✅ Sẵn sàng |
| **Tự động Dọn dẹp & Resize Sheet** | Tích hợp code Apps Script tự động giữ 5 sheet gần nhất và tự động auto-fit column có padding chống che chữ mỗi phút. | ✅ Sẵn sàng |

---

## 🔄 Quy Trình Vận Hành & Đồng Bộ (Workflow)

```mermaid
flowchart TD
    A[Google Sheets công khai] -->|Quét Tab Ngày & Kéo CSV| B[GoogleSheetService]
    B -->|Parse CSV & Chuẩn hóa 15 Cột| C[DataTransformer & Validator]
    C -->|Kiểm tra Cột 15: Đã đăng ký?| C0{Đã đăng ký?}
    C0 -->|Đúng| C_LOCKED[Gray out + Khóa Checkbox + Badge Đã đăng ký]
    C0 -->|Chưa| C1{Hợp lệ thông tin?}
    
    C1 -->|Chưa đủ / Lỗi| D[Highlight Đỏ trên UI & Bung Modal Live Check]
    C1 -->|Hợp lệ| E[Sẵn sàng Đăng ký / Tạo Payload JSON Array]
    
    E -->|Khách Việt Nam| F[API 5: /client-service/kbtt-vn/kbtt-3th]
    E -->|Khách Nước ngoài| G[API 4: /client-service/kbtt-nn/kbtt-3th]
    F & G -->|TokenManager đính kèm Bearer Token| H[Hệ Thống KBTT Server]
    
    H -->|Phản hồi Thành công| SYNC_OK[Đánh dấu Cột 15: Đã đăng ký]
    SYNC_OK -->|Gửi Apps Script Webhook| A
    SYNC_OK -->|Cập nhật UI| C_LOCKED
    
    J[Thao tác Thêm / Sửa / Xóa trên UI] -->|Optimistic UI 0ms| K[Giao diện Cập nhật Tức thì]
    J -->|Async Background Sync| L[Google Apps Script Webhook]
    L -->|Cập nhật / Xóa dòng trên Sheet| A
```

---

## 🚀 Lộ Trình Nâng Cấp (Roadmap)

- [x] **Giai đoạn 1**: Xây dựng kiến trúc module Node.js ESM thuần, chuẩn hóa API 4/5 theo đặc tả v1.4.
- [x] **Giai đoạn 2**: Tích hợp quét tab ngày tự động từ Google Sheet và kiểm tra mã quốc tịch mở rộng.
- [x] **Giai đoạn 3**: Triển khai đồng bộ 2 chiều với Google Apps Script Webhook, 0ms Optimistic UI.
- [x] **Giai đoạn 4**: Tách biến môi trường `.env`, nâng cấp giao diện Focus Zoom, Quick-Edit Modal và bóc tách Địa chỉ đầy đủ theo dấu phẩy.
- [x] **Giai đoạn 5**: **Nâng cấp toàn bộ dự án lên SvelteKit 2 + Svelte 5 + TypeScript**
  - Chuyển đổi toàn bộ Backend Services sang TypeScript modules (`src/lib/server/`).
  - Giao diện Svelte 5 Runes reactivity với Live Validation, Modal chỉnh sửa nhanh, Live hint tên quốc gia.
  - Tích hợp Type-safe API endpoints (`/api/sheets`, `/api/sync`, `/api/catalogs`, `/api/transform`, `/api/token`, `/api/logs`).
  - Xóa dòng 2 chiều với Custom Modal xác nhận và hiệu ứng strikethrough.
  - Tự động cập nhật trạng thái `Đã đăng ký` lên Google Sheet cột 15 và vô hiệu hóa các bản ghi đã đăng ký để chống trùng lặp.
- [ ] **Giai đoạn 6**: Bổ sung cơ chế auto-polling định kỳ theo cron job, thông báo trạng thái qua Telegram Bot / Webhook.

---

## ⚙️ Hướng Dẫn Cài Đặt & Sử Dụng

### 1. Cài đặt môi trường
```bash
# Cài đặt dependencies bằng pnpm
pnpm install

# Sao chép và cấu hình biến môi trường
cp .env.example .env
```

### 2. Khởi động môi trường phát triển
```bash
pnpm run dev
```
Truy cập `http://localhost:3000` trên trình duyệt.

### 3. Quy trình Kiểm thử Bắt buộc (Mandatory Verification)
```bash
# Kiểm tra types, dead code và chạy unit tests
pnpm run check

# Cập nhật Knowledge Graph
graphify . --code-only && graphify cluster-only .
```
