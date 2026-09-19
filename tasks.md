# TASK: Chuẩn hóa Authentication DEV/PROD cho `dang-ky-luu-tru`

Bạn đang làm việc trực tiếp trên repository `akhademik/dang-ky-luu-tru`, branch hiện tại.

## 1. Mục tiêu nghiệp vụ

Tôi chỉ cần một cơ chế bảo vệ website production rất đơn giản:

### DEV

Khi chạy:

```bash
pnpm run dev
```

thì:

- Không yêu cầu đăng nhập.
- Bypass authentication hoàn toàn.
- Không cần nhập username/password.
- Không được để authentication làm ảnh hưởng workflow development.
- Các API nội bộ cũng được phép hoạt động theo cơ chế DEV hiện tại.

### PRODUCTION

Khi deploy lên Cloudflare:

- Website phải yêu cầu đăng nhập.
- Password duy nhất lấy từ Cloudflare environment variable:

```text
APP_PASSWORD
```

- Không hardcode production password trong source code.
- Không sử dụng password mặc định cho production.
- Không cần hệ thống nhiều user.
- Không cần username thực sự; nếu UI hiện tại cần username thì có thể giữ `root`/`admin` để tương thích, nhưng authentication thực tế chỉ dựa trên `APP_PASSWORD`.

Sau khi đăng nhập thành công:

- Tạo một session thực sự.
- Session phải được bảo vệ bằng cryptographically secure random token hoặc cơ chế tương đương.
- TUYỆT ĐỐI không dùng:

```text
app_session=authenticated
```

làm authentication token.

- Session phải là `HttpOnly`.
- Production phải sử dụng `Secure`.
- Sử dụng `SameSite=Lax` hoặc `Strict` phù hợp với kiến trúc hiện tại.
- Session chỉ tồn tại trong thời gian ngắn, khoảng **15 phút**.
- Không được giữ session 30 ngày.

### Khi đóng tab/browser

Tôi muốn hành vi gần với browser-session login:

- Trong cùng browser session, reload/navigation không bắt đăng nhập lại nếu session vẫn còn hiệu lực.
- Khi đóng tab/browser và mở website lại, mục tiêu là yêu cầu đăng nhập lại.
- Không sử dụng persistent cookie 30 ngày.
- Nếu có giới hạn kỹ thuật giữa "đóng tab" và "đóng browser" trên web platform, hãy giải thích chính xác và chọn cơ chế gần nhất thay vì giả vờ đảm bảo một hành vi browser không thể đảm bảo tuyệt đối.

Ngoài ra session phải có TTL server-side khoảng 15 phút để dù browser giữ cookie thì session cũng không sống vô hạn.

---

# 2. Không được làm quá phức tạp

Đây là authentication cho một website nội bộ với một password duy nhất.

KHÔNG tự ý thêm:

- OAuth
- JWT nếu không thực sự cần
- hệ thống user/database phức tạp
- RBAC
- nhiều account
- external authentication provider
- Redis
- KV nếu không cần
- D1 session table nếu có phương án đơn giản và phù hợp hơn

Ưu tiên giải pháp nhỏ, dễ audit, phù hợp Cloudflare Workers/SvelteKit.

Tuy nhiên:

**Không được dùng process/global singleton trong RAM để lưu session**, vì Cloudflare Workers có nhiều isolate và state không đảm bảo persistent/shared.

Nếu cần server-side session storage thì hãy đánh giá D1/KV phù hợp với kiến trúc hiện tại trước khi triển khai.

---

# 3. Phân biệt rõ Authentication với BCA OAuth

Project có hai loại credential khác nhau:

### A. Website authentication

```text
APP_PASSWORD
```

Dùng để bảo vệ website/dashboard.

### B. BCA API authentication

Các credential như:

```text
AUTH_USERNAME
AUTH_PASSWORD
AUTH_BASIC_AUTH
```

dùng để gọi API BCA.

KHÔNG được trộn hai hệ thống này.

Task này chủ yếu sửa **website authentication**.

Tuy nhiên trong quá trình audit, nếu phát hiện `TokenManager` đang hardcode BCA Basic Auth thì phải báo cáo riêng. Không được âm thầm gộp hai vấn đề thành một.

---

# 4. Kiểm tra architecture hiện tại trước khi sửa

Trước khi viết code:

1. Đọc:

```text
src/hooks.server.ts
src/lib/server/auth.ts
src/routes/api/auth/login/+server.ts
src/lib/server/config.ts
src/app.d.ts
```

2. Tìm toàn bộ nơi đang sử dụng:

```text
verifySession
app_session
authenticated
APP_PASSWORD
KBTT_ENV
CONFIG.isProdMode
```

3. Tìm frontend login page/component hiện tại.

4. Tìm cách frontend hiện tại xử lý:

```text
401 Unauthorized
/api/auth/login
/api/auth/login GET
/api/auth/login DELETE
```

5. Kiểm tra test authentication hiện tại.

6. Kiểm tra cách project xác định DEV/PROD.

Không được bắt đầu sửa chỉ dựa trên tên file hoặc assumption.

---

# 5. Thiết kế authentication mới

Thiết kế phải đạt các properties:

```text
DEV
  ↓
authentication bypass
  ↓
website hoạt động bình thường
```

và:

```text
PROD
  ↓
request website
  ↓
valid session?
  ├── YES → tiếp tục
  └── NO  → login
              ↓
         APP_PASSWORD
              ↓
          password đúng
              ↓
        tạo secure session
              ↓
          website
```

Session token phải:

- cryptographically random
- không thể đoán được
- không chứa password
- không chứa plaintext credential
- không phải chuỗi cố định
- HttpOnly
- Secure trên production
- SameSite phù hợp
- session cookie, không persistent 30 ngày
- có expiration/TTL khoảng 15 phút

---

# 6. Bảo vệ toàn bộ website production

Kiểm tra cả:

### Pages

Ví dụ:

```text
/
 /dashboard
 /...
```

Nếu project có một login page riêng thì:

```text
/login
```

được phép truy cập khi chưa authentication.

Các page application khác phải yêu cầu authentication.

### API

Giữ nguyên nguyên tắc:

```text
/api/auth/login
```

là public.

Các API application khác phải yêu cầu valid session.

Đừng chỉ bảo vệ API mà bỏ quên UI route.

---

# 7. Authentication state ở frontend

Kiểm tra frontend hiện tại.

Mong muốn:

```text
PROD + chưa login
        ↓
Login page
```

Login thành công:

```text
Login
 ↓
GET /api/auth/login
 ↓
authenticated=true
 ↓
show application
```

Session hết hạn:

```text
API → 401
 ↓
frontend phát hiện session hết hạn
 ↓
đưa người dùng về login
```

Không để UI tiếp tục hoạt động như thể user vẫn đăng nhập sau khi server đã hết session.

---

# 8. APP_PASSWORD trên Cloudflare

Production phải lấy password từ:

```text
APP_PASSWORD
```

trong:

```ts
event.platform.env;
```

hoặc cơ chế Cloudflare runtime environment tương ứng.

Không được đưa production password vào:

```text
src/lib/server/config.ts
```

Không được commit password vào Git.

Không được dùng:

```text
Demo@#$12345
```

hoặc bất kỳ dev password nào làm production fallback.

Nếu `APP_PASSWORD` không tồn tại trong production:

```text
login phải fail safely
```

và hệ thống không được vô tình cho phép anonymous access.

---

# 9. DEV authentication bypass

DEV phải được xác định rõ bằng environment hiện tại của project.

Không dùng kiểu:

```text
if (!APP_PASSWORD) => allow
```

để bypass authentication.

Vì nếu production cấu hình sai và APP_PASSWORD bị thiếu thì đây sẽ trở thành authentication bypass.

Phải kiểm tra environment:

```text
DEV → bypass
PROD → require authentication
```

Nếu project hiện tại dùng:

```text
KBTT_ENV
```

thì ưu tiên tái sử dụng cơ chế đó thay vì tạo thêm biến môi trường mới.

---

# 10. Session expiration

Mục tiêu:

```text
SESSION_TTL = 15 minutes
```

Có thể cho phép thay đổi thành constant/config nếu cần.

Không dùng:

```text
30 days
```

Không dùng persistent cookie.

Session phải expire server-side.

Nếu dùng D1/KV/server-side storage:

- lưu session ID/token hash thay vì plaintext token nếu phù hợp
- có expiration
- kiểm tra expiration mỗi request
- logout có thể invalidate session

Nếu dùng signed stateless cookie:

- phải có cryptographic signature
- phải có issued-at/expiration
- phải có secret riêng
- không được dùng APP_PASSWORD trực tiếp làm signing secret nếu có giải pháp phù hợp hơn
- phải đảm bảo token không thể tự forge

Hãy chọn phương án phù hợp nhất với Cloudflare runtime hiện tại và giải thích trade-off trước khi implement.

---

# 11. Logout

Giữ:

```text
DELETE /api/auth/login
```

hoặc endpoint logout hiện tại nếu architecture đã có.

Logout phải:

- xóa browser session cookie
- invalidate server-side session nếu session stateful
- sau logout truy cập application phải yêu cầu login lại.

---

# 12. Security requirements

Trong quá trình sửa, đảm bảo:

### Không còn static session

Không được tồn tại logic kiểu:

```ts
session === "authenticated";
```

để xác thực production.

### Không có production fallback password

Không được có:

```ts
"Demo@#$12345";
```

hoặc password production hardcode.

### Không log password

Không log:

```text
APP_PASSWORD
password
session token
```

### Không trả password/token ra API

Không trả credential trong JSON response.

### Cookie

Production:

```text
HttpOnly
Secure
SameSite=Lax hoặc Strict
Path=/
```

và session cookie không có `Max-Age=30 days`.

---

# 13. Rate limiting login

Vì website sử dụng một shared password, hãy đánh giá và triển khai protection chống brute-force cho:

```text
POST /api/auth/login
```

Nếu project đã có cơ chế rate limit phù hợp thì tái sử dụng.

Nếu chưa có:

- ưu tiên giải pháp đơn giản phù hợp Cloudflare
- không tự tạo một in-memory rate limiter trong Worker
- không dùng process/global memory làm security boundary

Mục tiêu là hạn chế việc thử password liên tục.

Nếu việc triển khai rate limit cần Cloudflare configuration ngoài source code, hãy ghi rõ phần cần cấu hình.

---

# 14. Không sửa ngoài phạm vi

Không tự ý thay đổi:

- business logic đăng ký lưu trú
- BCA API workflow
- checkout logic
- D1 schema không liên quan
- OAuth token manager nếu không liên quan trực tiếp
- UI khác
- API khác

Nếu phát hiện vấn đề security khác, hãy báo cáo riêng thay vì tự ý mở rộng scope.

---

# 15. Tests bắt buộc

Sau khi implement phải thêm/cập nhật tests.

Ít nhất phải test:

### DEV

```text
DEV + không session → allowed
DEV + không password → allowed
```

### PROD

```text
PROD + không session → rejected
PROD + invalid session → rejected
PROD + valid session → allowed
```

### Login

```text
wrong password → 401
correct APP_PASSWORD → success
missing APP_PASSWORD in PROD → fail safely
```

### Session

```text
random session accepted
static "authenticated" rejected
expired session rejected
logout invalidates session
```

### Cookie

Kiểm tra các flags:

```text
HttpOnly
Secure
SameSite
session cookie
```

### API

```text
unauthenticated API → 401
authenticated API → allowed
```

### Regression

Chạy:

```bash
pnpm test
pnpm check
```

và nếu project có:

```bash
pnpm lint
```

thì chạy luôn.

---

# 16. Kiểm tra production build

Sau khi sửa:

```bash
pnpm build
```

và kiểm tra Cloudflare adapter/build không bị ảnh hưởng.

Nếu có local Cloudflare runtime:

```text
DEV/local D1
```

phải tiếp tục hoạt động bình thường.

Không được vì authentication mà làm local development phụ thuộc production Cloudflare resources.

---

# 17. Cách báo cáo kết quả

Sau khi hoàn thành, báo cáo theo format:

## Authentication hiện tại

```text
DEV:
...

PROD:
...
```

## Files đã thay đổi

Liệt kê chính xác.

## Session architecture

Giải thích ngắn:

```text
cookie
session storage
TTL
expiration
logout
```

## Security

Cho biết đã xử lý:

```text
[ ] static session cookie
[ ] 30-day persistent cookie
[ ] production password fallback
[ ] session expiration
[ ] DEV bypass
[ ] login rate limiting
[ ] logout invalidation
[ ] frontend 401 handling
```

## Tests

Đưa kết quả thực tế của:

```bash
pnpm test
pnpm check
pnpm build
```

Không được nói "đã pass" nếu chưa thực sự chạy.

## Manual test checklist

Cung cấp checklist để tôi tự kiểm tra:

1. `pnpm run dev`
2. Mở website → không login.
3. Production mở website → login page.
4. Nhập sai password → bị từ chối.
5. Nhập `APP_PASSWORD` → login thành công.
6. Reload → vẫn login nếu session còn hiệu lực.
7. Sau khoảng 15 phút → login lại.
8. Logout → login lại.
9. Xóa/expire session → API trả 401 và frontend về login.
10. Kiểm tra Cloudflare production không sử dụng dev password.

---

# 18. Quy tắc quan trọng khi thực hiện

**Đừng sửa code ngay.**

Trước tiên:

1. Audit architecture hiện tại.
2. Xác định chính xác các file/component liên quan.
3. Đề xuất authentication design ngắn gọn.
4. Chỉ sau đó mới implement.

Không được tự suy đoán.

Nếu có hai phương án kỹ thuật hợp lý, hãy chọn phương án đơn giản hơn và phù hợp Cloudflare Workers/SvelteKit, đồng thời giải thích ngắn lý do.

Mục tiêu cuối cùng rất đơn giản:

> **DEV: vào thẳng.**
>
> **PROD: nhập APP_PASSWORD → được cấp session ngắn hạn → dùng website → session hết hạn thì login lại.**
>
> **Không có static `authenticated` cookie và không có session 30 ngày.**
