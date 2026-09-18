8. Tuy nhiên vẫn còn một số vấn đề tôi muốn bạn biết

Đây là phần quan trọng nhất của review lần này.

Tôi không cho 9.5–10, vì vẫn còn một vài điểm kỹ thuật đáng xử lý.

🔴 A. Session cookie vẫn quá đơn giản

Hiện tại:

cookies.set("app_session", "authenticated", ...)

và verify:

return session === "authenticated";

Điều này có nghĩa session thực chất là:

app_session=authenticated

chứ không phải một session token ngẫu nhiên/signed session.

Cookie đã có:

HttpOnly
SameSite=Lax
Secure
MaxAge

nên đã tốt hơn trước.

Nhưng nếu xét security architecture nghiêm túc thì:

authenticated

không nên là credential/session secret.

Tôi sẽ nâng cấp sau này thành:
random session ID
↓
server-side session

hoặc:

signed session token

Nhưng đây không phải việc cần làm ngay nếu đây là app nội bộ với một tài khoản root duy nhất.

🔴 B. Webhook đang cho phép query parameter làm secret

Trong verifyWebhookAuth():

url.searchParams.get("key")
url.searchParams.get("token")
url.searchParams.get("apiKey")

Điều này nghĩa là có thể:

/api/ingest/ocr?token=SECRET

Vấn đề là query string dễ xuất hiện trong:

access logs
reverse proxy logs
analytics
browser history
monitoring

Tốt hơn nên chỉ cho:

Authorization: Bearer <secret>

hoặc:

X-API-Key: <secret>

Tôi sẽ bỏ query secret trong phiên bản hardening tiếp theo.

🔴 C. So sánh API key chưa constant-time

Hiện tại:

providedKey === expectedKey

Với app nội bộ thì rủi ro thực tế thấp.

Nhưng nếu đã đi theo hướng security hardening thì có thể nâng lên constant-time comparison.

Không phải priority cao.

🟠 D. db.ts vẫn còn RemoteD1Database khá đặc biệt

Bạn đã tách repository, nhưng db.ts vẫn chứa:

node:child_process
node:fs
node:path

và:

wrangler d1 execute --remote

Điều này vẫn là một kiến trúc hơi "đặc biệt".

Tức là:

Production
↓
Cloudflare D1 binding

Local / fallback
↓
Node
↓
spawn wrangler
↓
remote D1

Nó hoạt động được, nhưng không phải thiết kế tôi thích nhất.

Tốt hơn:
src/lib/server/db/
d1.ts
remote-dev.ts
index.ts

hoặc adapter riêng:

D1Database
RemoteD1Database

Nhưng hiện tại tôi không khuyên bạn refactor tiếp ngay.

Nếu app đang chạy ổn thì để nguyên.

🟠 E. escapeSql() vẫn là phần tôi muốn loại bỏ

Trong RemoteD1Database vẫn có:

private escapeSql(query: string, params: unknown[])

và tự thay:

?
↓
'escaped value'

Trong D1 thật thì bạn đã dùng:

.prepare(...)
.bind(...)

rất tốt.

Nhưng dev remote adapter lại biến nó thành:

prepared statement giả
↓
manual SQL interpolation
↓
wrangler CLI

Không phải lỗi bảo mật rõ ràng trong implementation hiện tại, vì có escaping, nhưng đây là một abstraction dễ phát sinh bug lâu dài.

Nếu có Phase 7, tôi sẽ xử lý điểm này.

🟠 F. updateStay() vẫn có dynamic SQL field names

Có đoạn:

for (const [key, val] of Object.entries(fields)) {
if (key !== "id" && ...)
sets.push(`${key} = ?`);
}

Giá trị thì parameterized:

?

nhưng column name không parameterized.

Nếu fields chỉ đến từ code nội bộ thì ổn.

Nhưng nếu sau này API truyền thẳng object vào:

request.body
↓
updateStay()

thì đây sẽ là boundary nguy hiểm.

Tôi khuyên:

const ALLOWED_UPDATE_FIELDS = new Set([
"ghi_chu",
"so_phong",
"ngay_di_du_kien",
...
]);

hoặc tốt hơn dùng typed update DTO.

🟠 G. upsertStay() vẫn có một chút logic phức tạp

Đoạn:

WHERE guest_id = ?
AND (
status != 'CHECKED_OUT'
OR ngay_den LIKE ?
)

đang thực hiện dedupe ở application/repository level.

Nó đã tốt hơn trước nhưng vẫn có race condition tiềm ẩn nếu có hai request đồng thời.

Nếu nghiệp vụ thực sự yêu cầu:

1 guest

- # 1 ngày đến
  1 stay

thì nên có DB constraint/index phù hợp.

Đây là thứ tôi sẽ kiểm tra thêm nếu bạn muốn đưa app lên production với dữ liệu lớn.

🟠 H. Time service tốt hơn nhưng vẫn đang dùng offset thủ công

Bạn đã gom:

time.ts

Đây là cải tiến rất tốt.

Nhưng implementation:

Date.now() + 7 _ 60 _ 60 \* 1000

vẫn là fixed offset.

Đối với Việt Nam thì thực tế hiện tại không có DST, nên không phải bug.

Nhưng về mặt semantic thì:

Asia/Ho_Chi_Minh

sẽ rõ ràng hơn:

UTC+7

Đặc biệt nếu sau này code có xử lý timestamp BCA/API.

Không cần sửa ngay.

🟡 I. Auto checkout vẫn là lazy checkout

Hiện tại:

getStays()
↓
autoCheckoutExpiredStays()

Nghĩa là:

Không phải hệ thống tự động checkout đúng 12:00.

Mà là:

Khi hệ thống có request đọc dữ liệu, nó kiểm tra và auto-checkout những record đã quá hạn.

Đây là lazy auto checkout.

Nếu nghiệp vụ yêu cầu:

12:00:00
↓
automatically update DB

kể cả không ai mở website, thì Cloudflare Scheduled Worker/Cron sẽ phù hợp hơn.

Nếu nghiệp vụ chỉ cần:

lần tiếp theo mở app
↓
dữ liệu tự được cập nhật

thì implementation hiện tại hợp lý.
