Kết quả thực thi và Nhật ký ghi nhận Google Sheets
1
TRỊNH NGỌC LINH
Khách Việt Nam (API 5)
Thất bại

Phản hồi / Ghi chú Sheets: Lỗi kết nối hoặc hệ thống: response.unable_to_decode_password
Xem Request Payload gửi đi (API 5)

{
"hoTen": "TRỊNH NGỌC LINH",
"gioiTinh": "F",
"soDienThoai": "",
"ngayThangNamSinhStr": "2002-09-22",
"noiCuTru": 1,
"maTT": "",
"maPX": "",
"diaChi": "Tổ 16, Thịnh Liệt, Hoàng Mai, Hà Nội",
"ngayDenCsltStr": "2026-09-15 16:53:29",
"ngayDiDuKienStr": "2026-09-16 12:00:00",
"soPhong": "P.07",
"lyDoCuTru": 1,
"lyDoChiTiet": "",
"loaiGiayTo": 1,
"soGiayTo": "001302011971",
"anhTruocB64": "",
"anhSauB64": "",
"ghiChu": ""
}

bang tra cuu danh muc van bi sai, toi muon de lai code tinh thanh, code quoc gia, va cho phep tim kiem theo kieu fuzzy matching va bao gom ca ko co dau van tra duoc.
con ly do cu tru chi de lai la 'du lich', 'muc dich khac' la duoc, va toi muon sau do co ma so qui dinh trong api, co the vao trong datasource de xem api no qui dinh code do la bao nhiu va map vao de khi post len api khi gan vao so code toi con biet no la y nghia gi de ma debug nua

Lỗi response.unable_to_decode_password xảy ra ngay ở bước API 1 (Lấy Token) trong tokenManager.js trước khi gửi được dữ liệu sang API 5. Hệ thống Spring/OAuth2 của máy chủ Demo (api-kbtt.ai-vlab.com) trả về mã lỗi này khi không thể giải mã tham số password được gửi lên trong body của API 1. 1. Nguyên nhân cốt lõiMật khẩu tài khoản demo là Demo@#$12345. Mật khẩu này chứa các ký tự đặc biệt nhạy cảm trong URL encoding: @, #, $. Trong tokenManager.js, hàm gọi API 1 cần tuân thủ nghiêm ngặt 2 điểm sau theo mục 2 của tài liệu: Phương thức & Header: POST /authorization-service/oauth/token với Content-Type: application/x-www-form-urlencoded. Body Encoding:Nếu bạn truyền qua template string thuần: username=demo_tich_hop&password=Demo@#$12345&grant-type=api_cslt, ký tự # sẽ bị xem là URL fragment, cắt đứt chuỗi password khiến server nhận thiếu hoặc sai ký tự và báo unable_to_decode_password.Nếu dùng JSON.stringify(...) thay vì form-urlencoded: Server sẽ không đọc được form field password. Header Authorization: Bắt buộc là Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ. 2. Cách khắc phục trực tiếp trong tokenManager.jsHãy mở src/tokenManager.js (hoặc vị trí thực hiện hàm lấy AccessToken) và kiểm tra lại đoạn fetch của API 1. Chuẩn hóa cách đóng gói body bằng URLSearchParams: JavaScript// Cấu hình chuẩn API 1
const TOKEN_URL = 'https://api-kbtt.ai-vlab.com/authorization-service/oauth/token';
const BASIC_AUTH = 'Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ'; // Cố định theo tài liệu v1.4

async function getAccessToken() {
// Dùng URLSearchParams để tự động encode các ký tự @, #, $ an toàn
const bodyParams = new URLSearchParams();
bodyParams.append('username', 'demo_tich_hop');
bodyParams.append('password', 'Demo@#$12345');
bodyParams.append('grant-type', 'api_cslt');

const response = await fetch(TOKEN_URL, {
method: 'POST',
headers: {
'Authorization': BASIC_AUTH,
'Content-Type': 'application/x-www-form-urlencoded'
},
body: bodyParams.toString()
});

const data = await response.json();

if (response.status !== 200 || data.code !== '200') {
throw new Error(`Lỗi lấy token: ${data.message || JSON.stringify(data)}`);
}

return data.data; // { AccessToken, RefreshToken, Exp, ... }
} 3. Lưu ý thêm về Payload API 5 trước khi bấm gửi lạiSau khi sửa được Token, khi gửi bản ghi của chị TRỊNH NGỌC LINH lên API 5, hãy đảm bảo:Mảng JSON (JSON Array): Payload gửi qua API 5 bắt buộc phải là mảng bọc trong [ và ] (ví dụ: [{ ... }]). Trong ảnh xem trước bạn đang hiển thị một Object đơn lẻ { ... }. Nếu gửi Object đơn, API 5 sẽ báo lỗi cú pháp payload. Trường soPhong: Bắt buộc có giá trị đối với loại hình khách sạn/nhà trọ (P.07 của bạn đã hợp lệ). Thời gian: ngayDenCsltStr là 2026-09-15 16:53:29 (ngày hôm qua) và ngayDiDuKienStr là 2026-09-16 12:00:00 (hôm nay) hoàn toàn đúng luật nghiệp vụ (chỉ chấp nhận ngày đến là hôm nay hoặc hôm qua). 4. Cần debug thêm thông tin gì nếu vẫn gặp lỗi?Nếu sau khi dùng URLSearchParams mà vẫn gặp lỗi, bạn chỉ cần copy thêm:Raw response body mà server trả về ở bước lấy token (HTTP Status code + JSON body đầy đủ). Đoạn code cấu hình request của hàm đăng nhập / lấy token trong tokenManager.js.

va khi send request toi bi loi, nen lam them muc test de khi edit code run do bo test cac case dam bao ko co loi
