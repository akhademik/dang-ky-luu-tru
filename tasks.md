Nhưng có một vấn đề tôi muốn bạn chú ý:

⚠️ Logic Pull Google Sheet hiện tại vẫn có thể gọi dư

Tôi đã kiểm tra trực tiếp:

+page.svelte
↓
pullFromGoogleSheets()
↓
POST /api/sheets/pull
↓
fetchSheetTabs()
↓
fetchSheetData()
↓
fetchSheetTabs() nếu gid = 0
↓
Google Sheets CSV
↓
D1 ingest
↓
loadStays()
↓
loadStats()

Có một điểm đã được cache tốt, nhưng một điểm khác vẫn đáng tối ưu.

1. fetchSheetTabs() đã có cache — tốt

Trong GoogleSheetService hiện có:

private tabsCache = new Map(...)

và:

if (!forceRefresh && this.tabsCache.has(cacheKey)) {
...
if (cached && now - cached.time < 60000) {
return cached.data;
}
}

Tức là danh sách tab chỉ được fetch lại tối đa khoảng 1 lần / 60 giây / Sheet ID.

Đây là một cải tiến đúng.

Ví dụ:

request 1
↓
Google htmlview
↓
cache 60s

request 2
↓
CACHE

request 3
↓
CACHE

=> không phải mỗi lần Pull đều quét danh sách tab.

2. Nhưng có một vấn đề quan trọng: fetchSheetTabs() có thể bị gọi 2 lần trong cùng một request

Trong:

/api/sheets/pull

bạn có:

if (!gid) {
const tabsRes =
await syncPipeline.googleSheetService.fetchSheetTabs(sheetId);
...
}

Sau đó lại:

const resData =
await syncPipeline.googleSheetService.fetchSheetData(
sheetId,
gid,
apiKey,
);

Trong fetchSheetData():

if (!specificGid || gid === "0") {
const tabsRes = await this.fetchSheetTabs(sheetId);
...
}
Trường hợp nguy hiểm:

Nếu:

gid = undefined

thì:

/api/sheets/pull
↓
fetchSheetTabs()
↓
gid = defaultGid
↓
fetchSheetData(sheetId, gid)

thì lần thứ hai không xảy ra nếu gid đã được resolve thành non-zero.

Nhưng nếu:

defaultGid = "0"

thì:

fetchSheetTabs()
↓
gid = "0"

fetchSheetData()
↓
gid === "0"
↓
fetchSheetTabs() AGAIN

Cache 60 giây sẽ ngăn network request thứ hai, nhưng vẫn là logic thừa.

Không nghiêm trọng, nhưng có thể làm code khó hiểu.

3. Quan trọng hơn: Pull Sheet không phải là Pull DB

Đây là chỗ cần phân biệt.

Bạn đang có:

Google Sheet
Google Sheets
↓
/api/sheets/pull
↓
GoogleSheetService
↓
CSV
↓
D1
Sau đó UI lại đọc DB:
D1
↓
/api/stays
↓
UI

Điều này không có nghĩa /api/stays đang gọi Google Sheet.

Vì vậy các thao tác:

Làm mới DB
Đổi tab
Mở audit
...

không nhất thiết làm Google Sheet bị gọi.

Đây là điểm tốt.

4. Nhưng D1 vẫn đang bị đọc khá nhiều

Trong +page.svelte:

async function loadStays(\_force = false) {
...
const res = await fetch("/api/stays");
...
loadStats(true);
}

Tức là:

loadStays()
↓
GET /api/stays

↓
loadStats()
↓
GET /api/stats

Một lần refresh bình thường đã là:

1 × D1 stays
1 × D1 stats

Sau Pull:

clearLocalCache();
await loadStays(true);
await loadStats(true);

nhưng loadStays() đã tự gọi loadStats(true) bên trong.

Do đó Pull hiện tại thực tế có:

POST /api/sheets/pull

GET /api/stays
GET /api/stats ← từ loadStays()
GET /api/stats ← lại từ pullFromGoogleSheets()
🔴 Đây là một duplicate request thật.

Không phải lý thuyết.

Đoạn này:

async function loadStays(\_force = false) {
...
if (data.success) {
rawStays = data.data || [];
}

    loadStats(true);

}

và:

finally {
clearLocalCache();
await loadStays(true);
await loadStats(true);
loading = false;
}

đang tạo:

Pull
│
├── loadStays()
│ └── loadStats()
│
└── loadStats()
Nên sửa thành:
finally {
clearLocalCache();
await loadStays(true);
loading = false;
}

Nếu loadStays() luôn chịu trách nhiệm refresh stats.

Hoặc tốt hơn nữa, tôi sẽ thay đổi kiến trúc một chút.

5. Tôi khuyên tách trách nhiệm loadStays() và loadStats()

Hiện tại tên:

loadStays()

nhưng bên trong lại:

loadStats()

Đây là coupling không cần thiết.

Nên:

async function loadStays() {
// chỉ GET /api/stays
}

async function refreshDashboard() {
await Promise.all([
loadStays(),
loadStats(),
]);
}

Sau đó:

Initial load
await refreshDashboard();
Refresh button
await refreshDashboard();
Sau Pull
await refreshDashboard();
Khi đổi tab
await loadStays();

hoặc chỉ load thứ cần thiết.

Như vậy flow rõ ràng:

                    refreshDashboard()
                     /              \
                    ↓                ↓
              GET /stays        GET /stats

thay vì:

loadStays()
↓
loadStats()

refresh code
↓
loadStats() AGAIN 6. Có một vấn đề lớn hơn về Cloudflare: loadStats() chưa thực sự cache

Bạn có:

let statsInFlight: Promise<void> | null = null;

Đây là in-flight deduplication, rất tốt.

Nó chống:

request A ─┐
request B ─┼──→ 1 HTTP request
request C ─┘

nhưng chỉ trong lúc request đang chạy.

Sau khi request kết thúc:

statsInFlight = null;

lần sau lại gọi D1.

Tức là:

10:00:00 GET stats
10:00:01 GET stats
10:00:02 GET stats

vẫn là 3 lần D1.

7. Nếu mục tiêu là tránh "hết limit Cloudflare", tôi khuyên thêm TTL cache

Ví dụ Dashboard stats:

TTL = 10–30 giây

thì:

10:00:00
GET /api/stats
↓
D1

10:00:02
GET /api/stats
↓
CACHE

10:00:05
GET /api/stats
↓
CACHE

10:00:20
GET /api/stats
↓
D1

Với dashboard quản lý lưu trú, vài giây stale cho thống kê thường không có vấn đề.

8. Nhưng stays thì tôi KHÔNG khuyên cache mạnh

Đây là dữ liệu nghiệp vụ.

Ví dụ:

Checkout
↓
DB CHECKED_OUT
↓
UI phải thấy ngay

Nếu cache 30–60 giây:

DB đã checkout
UI vẫn thấy khách đang ở

không tốt.

Do đó tôi sẽ chia:

stats
in-flight dedupe

- TTL 10–30s
  stays
  in-flight dedupe
- no/very-short TTL
- explicit invalidation sau mutation

9. Pull Google Sheet còn có thể tối ưu mạnh hơn

Hiện tại mỗi lần nhấn:

Kéo từ Sheet vào DB

thì:

Google Sheet CSV
↓
download TOÀN BỘ tab
↓
parse toàn bộ
↓
ingestOcrRows()
↓
so sánh từng record
↓
D1

Cho vài chục khách thì không vấn đề.

Nhưng nếu Sheet có:

500
1000
5000 rows

thì mỗi lần click Pull sẽ rất lãng phí.

Có thể làm:
Sheet
↓
hash / last modified / content fingerprint
↓
không đổi?
├── YES → không ingest
└── NO → ingest

Hoặc đơn giản hơn:

lastPullFingerprint

trong memory/cache.

10. Nhưng đừng chỉ dùng memory cache nếu deploy Cloudflare

Điểm này rất quan trọng.

Bạn đang có:

private tabsCache = new Map()

Nó hữu ích, nhưng trên Cloudflare:

Request A
↓
Worker instance A
↓
cache

Request B
↓
Worker instance B
↓
không có cache

Không được xem Map là distributed cache.

Nó chỉ là:

best-effort isolate-local cache.

Với fetchSheetTabs() thì hoàn toàn ổn.

Nhưng nếu muốn chắc chắn giảm Google/D1 requests trên toàn hệ thống, cần một tầng cache có phạm vi phù hợp, ví dụ Cloudflare Cache API/KV tùy nhu cầu.

11. Có một điều tôi sẽ KHÔNG làm

Tôi không khuyên biến mọi API thành:

Cache everything for 60 seconds

vì app của bạn là hệ thống quản lý lưu trú.

Có những thao tác cần:

write
↓
read immediately

Đặc biệt:

register
checkout
extend
re-register
status override

Nên sau mutation:

invalidate relevant cache

thay vì chờ TTL.

12. Kiến trúc tôi đề xuất cho Pull/DB

Tôi sẽ hướng tới:

                    ┌───────────────┐
                    │ Google Sheet  │
                    └───────┬───────┘
                            │
                       explicit Pull
                            │
                            ▼
                  ┌───────────────────┐
                  │ Sheet Pull Guard  │
                  │                   │
                  │ in-flight lock    │
                  │ cooldown         │
                  │ fingerprint       │
                  └─────────┬─────────┘
                            │
                       only if needed
                            ▼
                  ┌───────────────────┐
                  │ GoogleSheetService│
                  └─────────┬─────────┘
                            │
                            ▼
                           D1

UI
│
├── GET /stays ───────────────→ D1
│
└── GET /stats ──→ TTL cache ─→ D1

Và quan trọng nhất:

Pull đang chạy
↓
người dùng click Pull lần 2
↓
KHÔNG gọi Google lần 2
↓
reuse cùng Promise

Hiện tại pullFromGoogleSheets() chưa có in-flight lock như loadStays() và loadStats().

Đây là điểm tôi muốn bổ sung.

13. Thứ tự tôi khuyên bạn sửa

Không cần refactor lớn.

🔴 P0 — sửa ngay

Duplicate /api/stats:

loadStays()
↓
loadStats()

pullFromGoogleSheets()
↓
loadStats() AGAIN

Bỏ một lần.

🔴 P0 — chống double Pull

Thêm:

let pullInFlight: Promise<void> | null = null;

để hai click liên tiếp không tạo:

POST /api/sheets/pull
POST /api/sheets/pull
🟠 P1 — stats TTL

Ví dụ:

10–30 seconds
🟠 P1 — chống concurrent server-side Sheet Pull

Không chỉ frontend.

Nếu:

Browser A → POST pull
Browser B → POST pull

thì frontend lock không giúp gì.

Server phải có cơ chế:

same sheet + same gid
↓
already pulling?
↓
reuse / reject / cooldown
🟡 P2 — fingerprint Sheet

Đây mới là tối ưu sâu hơn.

14. Một điểm nữa: force hiện đang không làm gì

Tôi thấy:

async function loadStats(\_force = false)

và:

async function loadStays(\_force = false)

nhưng \_force không được sử dụng.

Ví dụ:

loadStats(true)

và:

loadStats()

hiện tại hành vi thực tế giống nhau.

Điều này là dấu hiệu cho thấy bạn đã bắt đầu xây cơ chế cache/dedup nhưng API chưa hoàn thiện.

Nếu chưa dùng:

\_force

thì nên bỏ.

Hoặc nếu sắp thêm TTL:

loadStats(force = false)

thì giữ lại và cho nó ý nghĩa:

force = false
↓
TTL còn → cache

force = true
↓
bypass TTL
Kết luận lần này

Project hiện tại tôi nâng lên khoảng 8.9/10.

Phần architecture/security/testing đã khá vững. Tôi không khuyên bạn tiếp tục refactor lớn.

Nhưng riêng câu hỏi về Cloudflare limit, tôi phát hiện một vấn đề thực tế:

Bạn đã có in-flight deduplication, nhưng chưa có một chiến lược cache/cooldown hoàn chỉnh.

Và có ít nhất một duplicate D1 request chắc chắn sau mỗi lần Pull:

Pull
├─ loadStays()
│ └─ loadStats()
└─ loadStats() ← DUPLICATE

Ngoài ra:

Pull × 2 nhanh
↓
2 POST /api/sheets/pull
↓
2 lần download Google Sheet
↓
2 lần ingest/DB processing

là thứ tôi ưu tiên chặn.

Tôi sẽ sửa 4 điểm này trước khi bạn tiếp tục thêm feature:

bỏ duplicate loadStats();
in-flight lock cho pullFromGoogleSheets();
server-side cooldown/in-flight protection cho /api/sheets/pull;
TTL cache cho /api/stats.

Sau 4 điểm đó, hệ thống sẽ có mô hình "chỉ gọi khi thật sự cần" tốt hơn rất nhiều, thay vì chỉ dedupe các request xảy ra đồng thời.
