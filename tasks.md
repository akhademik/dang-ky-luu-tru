2. Nhưng phần "cache dữ liệu để không đọc DB khi chuyển tab" vẫn chưa hoàn toàn đúng như mục tiêu

Tôi thấy bạn đã triển khai khá nhiều phần tôi đề xuất:

let rawStays = $state<StayDetail[]>([]);

và:

let staysInFlight: Promise<void> | null = null;
let lastStaysFetchTime = 0;
const CLIENT_STAYS_CACHE_TTL_MS = 300_000;

Đặc biệt:

async function loadStays(force = false) {
if (
!force &&
rawStays.length > 0 &&
now - lastStaysFetchTime < CLIENT_STAYS_CACHE_TTL_MS
) {
return;
}
Điều này có nghĩa:

Sau khi đã tải danh sách vào rawStays:

Register → In-house → All guests

không cần gọi /api/stays nữa.

Việc đổi tab hiện tại chủ yếu chỉ filter:

rawStays.filter(...)

=> đúng mục tiêu giảm DB reads.

Stats cũng đã chuyển sang $derived từ rawStays:

let stats = $derived.by<Stats>(() => {
...
});

Đây là một thay đổi tốt. Khi checkout/edit/status thay đổi rawStays, stats có thể thay đổi ngay trên UI mà không cần /api/stats.

3. Tuy nhiên có một điểm tôi muốn sửa: bạn đang có "2 tầng cache" hơi lẫn

Bạn vẫn còn:

const CACHE*KEY_PREFIX = "kbtt_stays_cache_v2*";
const CACHE*TTL_MS = 10 * 60 \_ 1000;

và sử dụng localStorage.

Nhưng cache chính hiện tại lại là:

rawStays

tức memory state.

Hai cơ chế này chưa được thống nhất.

Quan trọng hơn, loadStays() hiện không đọc localStorage để hydrate rawStays.

Nói cách khác:

F5
↓
rawStays = []
↓
GET /api/stays
↓
D1

LocalStorage có dữ liệu cũ nhưng loadStays() không dùng nó.

Vì vậy cache localStorage hiện tại chủ yếu còn là cache phụ, không phải cache thực sự điều khiển UI.

4. Vấn đề lớn hơn nằm ở mutation

Bạn đã làm optimistic update ở một số thao tác, ví dụ checkout:

rawStays = rawStays.map((s) =>
s.id === targetId
? { ...s, status: "CHECKED_OUT" }
: s,
);

Đây là đúng hướng.

Nhưng sau đó lại:

clearLocalCache();

và nếu lỗi thì:

await loadStays(true);

Điều này ổn về mặt an toàn.

Nhưng một số thao tác khác vẫn làm:

clearLocalCache();
await loadStays(true);

hoặc batch register:

await loadStays(true);

Như vậy kiến trúc hiện tại là:

Bình thường:
UI → rawStays
↑
không cần DB

Mutation:
UI → DB
↓
đôi khi fetch lại toàn bộ stays

Trong khi mục tiêu cuối cùng của chúng ta là:

UI → rawStays
↑
│
├── initial load → DB
│
├── edit → DB → patch rawStays
│
├── checkout → DB → patch rawStays
│
├── extend → DB → patch rawStays
│
├── delete → DB → remove rawStays
│
└── add → DB → add rawStays

Không refetch toàn bộ danh sách sau mỗi mutation thành công.

5. Tôi cũng phát hiện một điểm đáng chú ý trong /api/stays

API hiện:

const limit = parseInt(url.searchParams.get("limit") || "100", 10);

nhưng frontend gọi:

fetch("/api/stays?limit=500")

Trong repository:

if (filter?.limit) {
query += " LIMIT ?";
}

Vì vậy hiện tại bạn đang lấy tối đa 500 stays/lần.

Nếu database của khách sạn bạn thực tế chỉ vài trăm/hàng nghìn record thì có thể chấp nhận.

Nhưng nếu sau này lên >500 thì cache frontend không còn đại diện cho toàn bộ database.

Đây là điểm tôi sẽ ưu tiên xử lý trước khi gọi kiến trúc này là hoàn chỉnh.

6. Stats hiện tại tốt hơn trước khá nhiều

Bạn đã sửa:

COUNT(\*)

thành một scan:

COUNT(\*)
SUM(CASE ...)
SUM(CASE ...)
...

thay vì nhiều subquery riêng biệt trên stays.

Đây là cải thiện tốt.

Nhưng:

await autoCheckoutExpiredStays(db);

vẫn chạy trước stats.

Tuy nhiên frontend hiện đã:

stats = $derived.by(...)

từ rawStays.

=> Khi người dùng chỉ chuyển tab, không còn lý do gọi /api/stats.

Đây chính là hướng chúng ta muốn.

7. Có một điểm rất quan trọng: autoCheckoutExpiredStays()

getStays() vẫn làm:

await autoCheckoutExpiredStays(db);

Điều đó nghĩa là lần đầu:

GET /api/stays

không chỉ đọc DB.

Nó có thể:

UPDATE stays
SET status = 'CHECKED_OUT'
...

Sau đó mới:

SELECT ...

Nhưng vì frontend cache rawStays, những lần chuyển tab tiếp theo không gọi getStays() nữa, nên vấn đề này giảm rất nhiều.

Mutation luôn patch cache, không refetch ❌ Chưa hoàn toàn
LocalStorage cache hydrate lại UI ❌ Chưa
Cache vượt quá 500 records ❌ Chưa xử lý
Đồng bộ thay đổi từ browser/device khác ❌ Chưa có
Vì vậy:

Phần kiến trúc chính bạn làm đã đúng khoảng 80–85% so với mục tiêu ban đầu.

Đặc biệt mục tiêu:

"Đã load dữ liệu một lần → chuyển qua các tab → không tiếp tục đọc D1"

hiện tại đã đạt được.

Nhưng mục tiêu mạnh hơn:

"Có chỉnh sửa gì → ghi D1 → cập nhật đúng record trong cache → không cần tải lại toàn bộ DB"

chưa đạt hoàn toàn, vì một số mutation vẫn loadStays(true).

Tôi khuyên bước tiếp theo

Chưa cần thêm Durable Objects, KV hay cơ chế phức tạp.

Nên làm một bước rất sạch:

D1 = Source of Truth

          ↓ initial load
      rawStays cache
          ↓

┌──────┼──────┐
↓ ↓ ↓
Register Inhouse All Guests
└──────┼──────┘
↓
derived stats

và chuẩn hóa toàn bộ mutation thành:

POST/PUT/PATCH/DELETE
↓
D1
↓
server trả về record đã cập nhật
↓
patch rawStays
↓
UI cập nhật tức thì

Chỉ khi mutation thất bại mới rollback/refetch.

Còn Google Sheets Pull là trường hợp đặc biệt: sau pull, server nên trả về các stay đã tạo/cập nhật, rồi patch vào rawStays, thay vì luôn tải lại cả 500 records.

Đây mới là bước giúp giảm D1 reads đáng kể nhất mà vẫn giữ D1 làm nguồn dữ liệu chuẩn.

Tôi chưa thấy cần sửa ngay phần Local D1 — phần đó hiện đã đi đúng hướng.
