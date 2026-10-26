# AI_WORKFLOW.md — Quy trình làm việc bắt buộc cho AI Coding Agent

> File này là **bộ não quy trình** của AI khi làm việc trên dự án này.
> Đọc file này **mỗi lần bắt đầu phiên làm việc mới**, trước khi viết bất kỳ dòng code nào.

---

## 0. Thứ tự đọc khi mở lại project (BẮT BUỘC, không được bỏ qua bước nào)

Khi được giao việc trên project này, AI phải đọc theo đúng thứ tự sau trước khi code:

1. **`./graphify-out/GRAPH_REPORT.md`** (file report do `/graphiphy` tự sinh ra mỗi lần chạy)
   → Hiểu cấu trúc phụ thuộc hiện tại, phát hiện vòng lặp import, file mồ côi, node quá lớn (god node).
2. **`README.md`**
   → Đọc mục _"Trạng thái hệ thống"_ và _"Changelog"_ để biết lần cuối đã làm gì, cái gì đang dở, cái gì đã xong.
3. **`AI_WORKFLOW.md`** (chính file này)
   → Nhắc lại quy tắc, pipeline kiểm tra, cách cập nhật tài liệu.
4. **`DESIGN_SYSTEM.md`**
   → Bắt buộc đọc trước khi đụng vào bất kỳ UI/component nào (màu sắc, spacing, modal, typography...).

Nếu 1 trong 4 file trên chưa tồn tại → AI phải **khởi tạo trước** theo template ở cuối file này, rồi mới bắt đầu việc chính.

Sau khi đọc xong 4 file, AI tóm tắt ngắn gọn lại cho người dùng:

- Project đang ở trạng thái nào
- Việc dở dang gần nhất là gì
- Kế hoạch tiếp theo là gì

Chỉ sau khi xác nhận (hoặc người dùng đồng ý) mới bắt đầu code.

---

## 1. Ngăn xếp công nghệ & quy tắc code bắt buộc

- **SvelteKit 5** — dùng **Runes** (`$state`, `$derived`, `$effect`, `$props`), KHÔNG dùng cú pháp `export let`, `$:` reactive cũ.
- **TypeScript strict mode** — không dùng `any` trừ khi có comment `// TODO(reason)` giải thích rõ tại sao.
- **Tailwind CSS** — không viết inline style tùy tiện, không tạo class trùng lặp ý nghĩa với token đã có trong `DESIGN_SYSTEM.md`.
- **Tách type riêng file**: mọi `interface`/`type` dùng chung từ 2 nơi trở lên phải nằm trong `src/lib/types/*.ts`, KHÔNG khai báo type ngay trong file component.
- **Tránh "God Component/Node"**:
  - 1 component không vượt quá ~200 dòng logic (không tính markup thuần).
  - Nếu 1 file đảm nhiệm > 1 trách nhiệm rõ rệt (fetch data + render + xử lý form...) → tách thành:
    - component con (`ComponentName.svelte`)
    - logic riêng (`componentName.svelte.ts` dùng runes ngoài component nếu cần state chia sẻ)
    - type riêng (`types/componentName.ts`)
  - Ưu tiên composition (slot/snippet) thay vì nhồi nhét props/logic vào 1 chỗ.
- Đặt tên nhất quán: `PascalCase` cho component, `camelCase` cho biến/hàm, `kebab-case` cho route folder.

---

## 2. Pipeline bắt buộc sau MỌI lần chỉnh sửa code

> **Package manager: chỉ dùng `pnpm`.** Không dùng `npm`/`yarn`/`npx` dưới bất kỳ hình thức nào (kể cả khi gõ nhanh). Chạy binary chưa cài thì dùng `pnpm dlx ...`, không dùng `npx ...`.

Sau khi AI edit xong 1 tác vụ (dù nhỏ), **PHẢI** chạy tuần tự, dừng lại và sửa nếu bước nào fail trước khi qua bước kế:

```bash
# 1. Format
pnpm format          # biome format --write . (hoặc prettier --write .)

# 2. Lint
pnpm run lint:biome  # biome check src test

# 3. Type check
pnpm run check:svelte # svelte-check --tsconfig ./tsconfig.json

# 4. Test
pnpm test

# 5. Phát hiện code thừa / export không dùng / dependency chết
pnpm run knip        # knip

# 6. Phân tích cấu trúc / dependency graph
graphify update .
```

> Ghi chú: `graphify` là công cụ phân tích cấu trúc kiến trúc và dependency đồ thị.
>
> Thứ tự **format trước, lint sau** vì format có thể tự sửa style khiến lint chạy trên code đã chuẩn hoá, tránh báo lỗi style thừa.

**Quy tắc xử lý lỗi:**

- Nếu `format` thay đổi file → coi là bình thường, không cần giải thích, nhưng phải review lại diff trước khi chạy tiếp để chắc không đổi logic.
- Nếu `lint` fail → tự sửa theo rule, không dùng `--fix` mù quáng nếu ảnh hưởng logic.
- Nếu `check` (type) fail → ưu tiên sửa type gốc trong `src/lib/types/`, không ép `as any`/`as unknown as X` để né lỗi.
- Nếu `test` fail → xác định do code mới sai hay test cũ outdated, sửa đúng nguồn gốc, không xoá test để "cho qua".
- Nếu `knip` báo file/export thừa → cân nhắc xoá thật, hoặc nếu vẫn cần (public API, dùng động...) thì thêm annotation loại trừ trong `knip.json` kèm lý do.
- Nếu `graphify` phát hiện vòng lặp import, node quá to (god node), hoặc file cô lập bất thường → phải xử lý (tách nhỏ, phá vòng lặp) trước khi coi task là "xong".

Không được báo cáo "hoàn thành" với người dùng nếu 1 trong 6 bước trên còn fail mà chưa giải thích rõ lý do (ví dụ: fail có chủ đích, đã được note lại).

---

## 2.1 Quy tắc chỉnh sửa file (bắt buộc)

- **KHÔNG** dùng `cat > file`, `cat <<EOF`, `node -e "..."`, hay các lệnh shell khác để tạo/ghi đè nội dung file. Các cách này thường khiến hệ thống yêu cầu xác nhận nhiều lần và làm chậm/khó theo dõi diff.
- **PHẢI** dùng công cụ edit file chuyên dụng có sẵn (edit/str_replace/patch theo tool của AI đang dùng) để:
  - Sửa 1 phần trong file đã tồn tại.
  - Tạo file mới (dùng tool tạo file, không dùng heredoc).
- Chỉ dùng lệnh shell (`pnpm`, git, chạy test...) cho việc **chạy** chương trình/pipeline, không dùng shell để **soạn nội dung code**.
- Mỗi lần sửa nên là 1 thay đổi rõ ràng, có thể review qua diff — tránh gộp nhiều thay đổi không liên quan trong 1 lần edit.

---

## 3. Cập nhật tài liệu sau khi pipeline pass

### 3.1 Cập nhật `README.md`

Sau khi pipeline ở mục 2 pass, cập nhật 2 phần trong README:

**a) Mục "Trạng thái hệ thống"** (ghi đè, luôn phản ánh hiện tại):

```markdown
## Trạng thái hệ thống

- Cập nhật lần cuối: YYYY-MM-DD HH:mm
- Đã hoàn thành: [liệt kê tính năng/module đã chạy được]
- Đang dở: [nếu có]
- Biết trước còn thiếu / nợ kỹ thuật: [nếu có]
```

**b) Mục "Changelog"** (append, không xoá lịch sử cũ):

```markdown
## Changelog

### YYYY-MM-DD

- Thêm/sửa: mô tả ngắn gọn việc đã làm
- Kết quả pipeline: format ✅ | lint ✅ | type ✅ | test ✅ (x/y pass) | knip ✅ | graphify: [tóm tắt phát hiện chính nếu có]
- File chính bị ảnh hưởng: liệt kê
```

### 3.2 Cập nhật `DESIGN_SYSTEM.md`

Chỉ cập nhật khi có **quyết định thiết kế mới** (thêm màu, thêm biến thể modal, thay đổi spacing scale...). Không tự ý đổi giá trị đã có sẵn — nếu thấy cần đổi, phải hỏi người dùng trước vì sẽ ảnh hưởng toàn bộ UI cũ.

### 3.3 Báo cáo `graphify`

Chạy `graphify update .` sẽ tự ghi đè `./graphify-out/GRAPH_REPORT.md` — không cần AI tự tạo hay copy file này đi đâu khác.

Nếu phát hiện vấn đề quan trọng (vòng lặp import, god node mới xuất hiện) thì AI chỉ cần **tóm tắt lại** phát hiện đó vào `README.md` (mục Changelog, xem 3.1) để không bị mất khi report bị ghi đè ở lần chạy sau. Không cần tự tạo thư mục `reports/history/`.

---

## 4. Nguyên tắc chung khi AI làm việc trên project này

- Không tự thay đổi kiến trúc lớn (routing structure, state management pattern) mà không nêu lý do và hỏi trước.
- Mỗi task nên là 1 đơn vị nhỏ, chạy đủ pipeline rồi mới sang task tiếp theo — không gộp nhiều thay đổi lớn rồi mới kiểm tra 1 lần.
- Ưu tiên tính nhất quán với pattern đã có trong `DESIGN_SYSTEM.md` hơn là sáng tạo pattern mới.
- Nếu phát hiện code cũ vi phạm chính các quy tắc trong file này (god component, type lẫn trong component, màu sắc lệch design system...), ghi chú lại thành nợ kỹ thuật trong README thay vì tự ý sửa hàng loạt ngoài phạm vi task đang làm.
