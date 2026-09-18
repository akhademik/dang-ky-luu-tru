Đúng. Với code hiện tại, chuyển Tab vẫn có thể gọi API/đọc D1 lại. Cơ chế hiện tại chủ yếu là in-flight dedup + TTL cho stats, chưa phải một cơ chế kiểu:

“Đã lấy dữ liệu → giữ làm source hiển thị trong session → chỉ đọc DB lại khi dữ liệu có khả năng đã thay đổi.”

Và ý tưởng bạn mô tả hoàn toàn làm được, thậm chí với app này tôi nghĩ đây là kiến trúc phù hợp hơn.

1. Hiện tại đang hoạt động thế nào?

Ví dụ:

Tab Đăng ký
↓
GET /api/stays?status=READY_TO_SYNC
↓
D1

↓ chuyển sang Tab Đang ở

GET /api/stays?status=IN_HOUSE
↓
D1

↓ quay lại Tab Đăng ký

GET /api/stays?status=READY_TO_SYNC
↓
D1 lần nữa

loadStays() hiện có staysInFlight, nhưng nó chỉ chống:

Request A đang chạy
Request B đến cùng lúc
↓
dùng chung Promise

Nó không phải cache dữ liệu.

Stats thì hiện có TTL 15 giây, nhưng đó cũng chỉ là cache ngắn hạn.

2. Ý tưởng của bạn thực chất là một "client-side session cache"

Tôi sẽ thiết kế nó theo hướng:

                 ┌──────────────────────┐
                 │   SESSION DATA STORE │
                 │                      │
                 │ guests               │
                 │ stays                │
                 │ stats                │
                 │ catalogs             │
                 │ lastSync              │
                 │ version               │
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
          Tab Register   Tab Inhouse   Tab All Guests

Sau khi lần đầu lấy dữ liệu:

D1
↓
API
↓
Session Cache
↓
UI

Các Tab không cần đọc D1 lại nếu cache còn hợp lệ.

3. Quan trọng: tôi không dùng localStorage làm source chính

Bạn hiện đã có:

localStorage

với TTL 10 phút.

Nhưng đối với dữ liệu nghiệp vụ của app này, tôi sẽ tách thành:

Memory cache
Browser session
↓
Memory Store

làm nguồn hiển thị chính.

Ưu điểm:

cực nhanh
không serialize/deserialize liên tục
không stale giữa các thao tác trong cùng trang
dễ cập nhật optimistic
không cần gọi D1

Nếu F5 thì memory mất.

Lúc đó có thể:

F5
↓
sessionStorage / IndexedDB
↓
hiển thị stale ngay
↓
background revalidate

Đây mới là mô hình tôi nghĩ bạn đang muốn.

4. Tôi đề xuất mô hình: Stale-While-Revalidate

Ví dụ người dùng mở app lần đầu:

GET /api/stays
↓
D1
↓
Cache
↓
UI

Sau đó chuyển:

Register → In-house → All Guests → Register

thì:

Cache
↓
UI ngay lập tức

Không cần D1.

5. Nhưng khi có thay đổi thì sao?

Đây là phần quan trọng nhất trong ý tưởng của bạn.

Ví dụ sửa:

Phòng: 101 → 102

Flow:

User Edit
↓
PATCH /api/stays/xxx
↓
D1 UPDATE
↓
Server trả về record mới
↓
UPDATE SESSION CACHE
↓
UI

Tức là:

               ┌──────→ D1
               │

Edit ──────────┤
│
└──────→ Cache update

Không cần GET lại toàn bộ danh sách.

Ví dụ:

cache.updateStay(updatedStay);

là đủ.

6. Thêm khách cũng tương tự
   POST /api/stays
   ↓
   D1 INSERT
   ↓
   returnedStay
   ↓
   cache.addStay(returnedStay)
   ↓
   UI

Không:

POST
↓
GET /api/stays
↓
GET /api/stats

nếu không cần.

7. Xóa khách
   DELETE /api/stays/123
   ↓
   D1 DELETE
   ↓
   cache.removeStay("123")
   ↓
   UI

Không cần reload cả DB.

8. Checkout

Ví dụ:

IN_HOUSE
↓
CHECKED_OUT

API trả:

{
"id": "123",
"status": "CHECKED_OUT",
...
}

Cache:

cache.updateStay(stay)

Sau đó các derived views tự thay đổi:

In-house
↓
không còn record

All guests
↓
vẫn còn record

Stats
↓
inHouse - 1
checkedOut + 1
Đây là điểm cực kỳ mạnh.

Bạn không cần:

checkout
↓
GET /api/stays
↓
GET /api/stats 9. Stats cũng có thể được cập nhật ngay trong cache

Ví dụ:

READY_TO_SYNC → SYNCED_KBTT

thì cache biết:

readyToSync--
syncedKbtt++
inHouse++

Như vậy dashboard phản ứng ngay lập tức.

Nhưng tôi có một lưu ý quan trọng:

Không nên tự tính stats bằng cách cộng/trừ mù quáng ở mọi mutation.

Vì app có state machine:

PENDING_VALIDATION
READY_TO_SYNC
NOT_CHECKED_IN
SYNCED_KBTT
CHECKED_IN
EXTENDED
CHECKED_OUT
ERROR
CANCELLED

Nếu logic cache tự cập nhật stats bằng hàng chục if/else, rất dễ sau này xảy ra:

DB = 127 khách
Cache = 126 khách

Do đó tôi thích cách:

mutation thành công
↓
record mới
↓
cache update
↓
stats derived từ cache

hoặc có một recalculateStatsFromCache().

10. Tôi còn đề xuất một bước tốt hơn: cache toàn bộ stays

Thay vì cache riêng:

READY_TO_SYNC
IN_HOUSE
ALL_GUESTS

hãy cache:

ALL STAYS

một lần.

Sau đó Tab chỉ là filter.

Ví dụ:

Cache
└── stays[]

Tab Register:

stays.filter(...)

Tab In-house:

stays.filter(...)

Tab All:

stays.filter(...)

Bạn thực tế đã có phần này rồi:

let rawStays = $state<StayDetail[]>([]);

và:

let stays = $derived.by(...)

Vậy kiến trúc hiện tại rất thuận lợi để chuyển sang mô hình này.

11. Nhưng có một vấn đề: hiện tại mỗi Tab đang query DB theo status

Ví dụ:

Register
→ ?status=READY_TO_SYNC

In-house
→ ?status=IN_HOUSE

Nếu chuyển sang cache toàn bộ:

GET /api/stays

một lần:

D1
↓
ALL STAYS
↓
rawStays

rồi client filter.

Nhưng nếu database rất lớn, lấy toàn bộ stays mỗi lần initial load cũng không lý tưởng.

Với app của bạn

Nếu đây là hệ thống một cơ sở lưu trú và số stay không lên đến hàng trăm nghìn, tôi nghiêng về:

Load một lần toàn bộ dataset cần cho dashboard/session rồi giữ cache.

Nó đơn giản và giảm rất nhiều D1 query.

12. Có thể làm "session cache + dirty state"

Tôi sẽ thiết kế store khoảng như sau:

AppDataStore

├── stays
├── catalogs
├── stats
│
├── loaded
├── loading
├── lastLoadedAt
├── dirty
└── version

Ví dụ lần đầu:

loaded = false
↓
GET database
↓
loaded = true
dirty = false

Sau edit:

PATCH DB
↓
success
↓
update cache
↓
dirty = false 13. Và có một khái niệm cực kỳ quan trọng: revision

Tôi khuyên app có:

dataRevision

Ví dụ:

revision = 100

Pull Sheet:

revision = 101

Edit:

revision = 102

Cache biết:

cache.revision = 102

Nếu một lúc nào đó server báo:

serverRevision = 103

thì client biết:

Cache của mình đã cũ.

14. Điều này giải quyết vấn đề nhiều browser

Đây mới là phần "đảm bảo" mà bạn hỏi.

Ví dụ:

Browser A
cache revision 20

Browser B
edit khách
↓
D1 revision 21

Browser A vẫn đang hiển thị cache revision 20.

Nếu chỉ có memory cache thì A không biết B đã sửa.

Do đó cần một cơ chế revalidation.

Có nhiều cách.

Cách đơn giản nhất

Mỗi X phút:

GET /api/sync/version

chỉ trả:

{
"revision": 21
}

Query này cực nhẹ.

Nếu:

local = 20
server = 21

thì:

cache invalid
↓
GET /api/stays 15. Nhưng thậm chí không cần poll liên tục

Có thể làm:

App mở
↓
cache hiện ngay
↓
background revalidate

Ví dụ:

focus window
online event
chuyển tab trình duyệt
sau 60–120 giây

mới check revision.

Như vậy người dùng bình thường:

click Tab
click Tab
click Tab
search
xem khách
xem phòng

không phát sinh D1 request.

16. Pull Sheet là một trường hợp đặc biệt

Khi:

Kéo Sheet vào DB

thì không được chỉ update một vài record.

Flow nên là:

Pull Sheet
↓
Server ingest
↓
D1
↓
new revision
↓
return changed records / revision
↓
invalidate cache
↓
fetch dataset mới

Hoặc tốt hơn:

Pull
↓
API trả:
{
revision: 123,
changedStays: [...]
}
↓
cache.patch(changedStays)

Nếu ingest hàng trăm dòng thì cách này có thể rất hiệu quả.

17. Tôi sẽ không dùng "stale database" theo nghĩa DB stale

Nên phân biệt:

Database

Source of truth

D1 = authoritative
Cache

Read model / UI snapshot

Browser cache = nhanh

Không nên để:

Browser cache → tự coi là database

Mà:

                 ┌───────────────┐
                 │      D1       │
                 │ Source Truth  │
                 └───────┬───────┘
                         │
                    initial sync
                         │
                         ▼
                 ┌───────────────┐
                 │ Session Cache │
                 │ UI Read Model │
                 └───────┬───────┘
                         │
                    all tabs
                         │
                         ▼
                        UI

Mutation:

UI
↓
API
↓
D1
↓ success
Cache update
↓
UI

Đây là mô hình rất phù hợp.

18. Tôi đề xuất kiến trúc cuối cùng cho project này
    Tầng 1 — D1

Source of truth

Cloudflare D1
Tầng 2 — Server
GET /api/stays
GET /api/catalogs
GET /api/stats

có cache/in-flight protection thích hợp.

Tầng 3 — Client Session Store
AppStore
│
├── stays[]
├── catalogs
├── stats
├── revision
├── loaded
└── lastValidatedAt
Tầng 4 — UI
Register
In-house
All guests
Audit
Catalogs

không tự gọi DB khi đổi Tab.

19. Flow sau khi làm xong sẽ như thế này
    Mở app lần đầu
    Browser
    ↓
    GET stays
    GET catalogs
    GET stats
    ↓
    D1
    ↓
    Session Store
    ↓
    UI
    Chuyển 10 lần giữa các Tab
    Session Store
    ↓
    UI

D1 calls = 0
Xem danh sách
Cache → UI
Sửa khách
UI
↓
PATCH
↓
D1
↓
updated record
↓
Cache update
↓
UI
Checkout
UI
↓
POST/PATCH
↓
D1
↓
updated record
↓
Cache update
Pull Sheet
Sheet
↓
D1 ingest
↓
revision++
↓
cache refresh/patch
↓
UI
Browser bị mở lâu
Cache
↓
background revision check
↓
unchanged → làm gì cũng không

Nếu revision thay đổi:

revision changed
↓
revalidate
↓
cache mới
↓
UI 20. Một điểm rất quan trọng: đừng chỉ dùng sessionStorage

Nếu bạn nói "cached ở session", có hai nghĩa.

sessionStorage

Tồn tại qua reload trong cùng tab, nhưng:

giới hạn kích thước
stringify JSON
không phải state store tốt
mỗi tab có sessionStorage riêng
Memory store

Tốt hơn cho app hiện tại:

rawStays = $state(...)

vì bạn đã dùng Svelte 5.

Tôi sẽ dùng:

Svelte 5 State +
sessionStorage/IndexedDB optional persistence

chứ không lấy sessionStorage làm kiến trúc chính.

Kết luận

Đúng, ý tưởng của bạn tốt hơn cơ chế hiện tại.

Hiện tại:

Tab change
↓
API
↓
D1

Cơ chế nên chuyển thành:

                    ┌─────────────┐
                    │     D1      │
                    │ source truth│
                    └──────┬──────┘
                           │
                    initial/revalidate
                           │
                           ▼
                    ┌─────────────┐
                    │ Session/App │
                    │    Cache    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Register      In-house     All Guests

và:

Không có mutation → dùng cache.
Có mutation thành công → cập nhật D1 + cập nhật cache.
Có Pull → invalidate/patch cache.
Có khả năng browser bị stale → kiểm tra revision nhẹ theo sự kiện/thời gian, không đọc toàn bộ DB.

Đây sẽ vừa nhanh hơn rất nhiều, vừa giảm đáng kể D1 reads.

Tuy nhiên tôi sẽ không sửa ngay theo kiểu "thêm cache vào +page.svelte".

Nên làm thành một DataStore/Repository phía client riêng, vì nếu nhét thêm cache vào +page.svelte thì vài tháng nữa file này sẽ thành một đống loadX(), cacheX(), invalidateX() rất khó bảo trì.
