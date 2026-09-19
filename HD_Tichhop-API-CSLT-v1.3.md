# HỆ THỐNG KHAI BÁO TẠM TRÚ CHO NGƯỜI NƯỚC NGOÀI VÀ

# THÔNG BÁO LƯU TRÚ CHO CÔNG DÂN VIỆT NAM

# TÀI LIỆU HƯỚNG DẪN SỬ DỤNG API

# Dành cho Cơ sở lưu trú (4rd Party)

Phiên bản 1.4 \| Tháng 08/2026

# 1\. Tổng quan

Tài liệu mô tả các API của hệ thống KBTT dành cho cơ sở lưu trú (CSLT) tích hợp qua bên thứ ba. Hệ thống có 7 API chia thành 2 nhóm chính:

| Nhóm Xác thực   | Get Token, Refresh Token, Revoke Token                        |
|-----------------|---------------------------------------------------------------|
| Nhóm Nghiệp vụ  | Khai báo tạm trú cho NNN, Khai báo lưu trú cho người Việt Nam |
| Nhóm Danh mục   | Quốc tịch, Tỉnh/Thành phố, Phường/Xã                          |
| Base URL (KBTT) | https://api-tbltkbtt.bocongan.gov.vn                          |
| Kiểu xác thực   | OAuth 2.0 – Bearer Token                                      |

⚠ Lưu ý: Để gọi API Khai báo (API 4) bắt buộc phải có AccessToken từ API 1 (Get Token). Khi token hết hạn dùng API 2 (Refresh Token). Kết thúc phiên dùng API 3 (Revoke Token).​

​Thông tin demo:

| Demo url      | https://api-kbtt.ai-vlab.com |
|---------------|------------------------------|
| Demo username | demo\_tich\_hop              |
| Demo password | Demo@#$12345                 |

# 2\. API 1 – Lấy Token (Get Token)

## 2\.1. Thông tin endpoint

| URL          | https://api-tbltkbtt.bocongan.gov.vn/authorization-service/oauth/token |
|--------------|------------------------------------------------------------------------|
| Phương thức  | POST                                                                   |
| Content-Type | application/x-www-form-urlencoded                                      |

Authorization Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ

## 2\.2. Header

| Tên trường    | Kiểu   | Bắt buộc Mô tả     |                                             |
|---------------|--------|--------------------|---------------------------------------------|
| Authorization | string | Có Giá trị: Base64 | QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ" – của |
| Content-Type  | string | Có Bắt buộc        | là application/x-www-form-urlencoded        |

## 2\.3. Body (Form Parameters)

| Tên trường | Kiểu   | Bắt buộc Mô | tả                                             |
|------------|--------|-------------|------------------------------------------------|
| username   | string | Có Tên      | đăng nhập tài khoản CSLT. Ví dụ: toantestcslt1 |
| password   | string | Có Mật      | khẩu tài khoản. Ví dụ: Abc@1234                |
| grant-type | string | Có Loại     | grant, giá trị cố định:                        |

## 2\.4. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/authorization-service/oauth/token'\\

\--header'Authorization: Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ'\\

\--header'Content-Type: application/x-www-form-urlencoded'\\

\--data-urlencode'username=toantestcslt1'\\

\--data-urlencode'password=Abc@1234'\\

\--data-urlencode'grant-type=api\_cslt'

## 2\.5. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": {

"AccessToken":"87c19dcf-xxxx-4c46-b1b7-288feb8cb9a2",

"RefreshToken":"74d3214e-xxxx-49d2-88b3-4cfb698fe463",

"TokenType":"bearer",

"Exp": 1775631277,

"Authorities": \["kbtt:create-3th","CLIENT\_API\_CSLT"\],

"ClientId": 7,"LoaiTK":"CSLT","CsltId":"1000227",

"CsltKhuVuc": 86,"CsltDonVi": 1332,

"MaTTCuaCslt":"101","MaPxCuaCslt":"101900256",

"IsCsltChinh": true

} }

## 2\.6. Mô tả trường data

| Trường       | Kiểu       | Mô tả                                             |
|--------------|------------|---------------------------------------------------|
| AccessToken  | string     | Token truy cập (Bearer). Dùng để gọi API Khai báo |
| RefreshToken | string     | Token gia hạn. Dùng cho API Refresh Token         |
| TokenType    | string     | Loại token, luôn là                               |
| Exp          | int64      | Thời điểm hết hạn (Unix timestamp, giây)          |
| Authorities  | string\[\] | Danh sách quyền. Cần có                           |
| ClientId     | integer    | ID client trong hệ thống                          |
| LoaiTK       | string     | Loại tài khoản, giá trị:                          |
| CsltId       | string     | Mã định danh cơ sở lưu trú                        |
| CsltKhuVuc   | integer    | Mã khu vực CSLT                                   |
| CsltDonVi    | integer    | Mã đơn vị hành chính CSLT                         |
| MaTTCuaCslt  | string     | Mã tỉnh/thành phố                                 |
| MaPxCuaCslt  | string     | Mã phường/xã                                      |
| IsCsltChinh  | boolean    | true = cơ sở chính (không phải chi nhánh)         |

​

# 3\. API 2 – Làm mới Token (Refresh Token)

Gọi API này khi AccessToken hết hạn (kiểm tra trường Exp). Không cần đăng nhập lại bằng username/password.

## 3\.1. Thông tin endpoint

| URL           | https://api-tbltkbtt.bocongan.gov.vn/authorization-service/oauth/refresh-token?r efresh\_token= {RefreshToken} |
|---------------|----------------------------------------------------------------------------------------------------------------|
| Phương thức   | POST                                                                                                           |
| Authorization | Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=                                                                         |

## 3\.2. Header

| Tên trường    | Kiểu   | Bắt buộc | Mô tả                                      |
|---------------|--------|----------|--------------------------------------------|
| Authorization | string | Có       | Giá trị: QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=" |

## 3\.3. Query Parameter

| Tên trường     | Kiểu   | Bắt buộc | Mô tả                                     |
|----------------|--------|----------|-------------------------------------------|
| refresh\_token | string | Có       | RefreshToken lấy từ API Get Token (API 1) |

## 3\.4. Ví dụ Request

curl --location --request POST'https://api-tbltkbtt.bocongan.gov.vn/authorization-service/oauth/refresh-token ?refresh\_token=43d208e7-xxxx-47e6-be44-9714651ae190'\\ --header'Authorization: Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA='

## 3\.5. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": {

"AccessToken":"87c19dcf-xxxx-4c46-b1b7-288feb8cb9a2",

"RefreshToken":"74d3214e-xxxx-49d2-88b3-4cfb698fe463",

"TokenType":"bearer",

"Exp": 1775631277,

"Authorities": \["kbtt:create-3th","CLIENT\_API\_CSLT"\],

"ClientId": 7,"LoaiTK":"CSLT","CsltId":"1000227",

"CsltKhuVuc": 86,"CsltDonVi": 1332,

"MaTTCuaCslt":"101","MaPxCuaCslt":"101900256",

"IsCsltChinh": true

} }

## 3\.6. Mô tả trường data

| Trường       | Kiểu Mô     | tả                                                |
|--------------|-------------|---------------------------------------------------|
| AccessToken  | string      | AccessToken mới để thay thế token cũ              |
| TokenType    | string Loại | token, luôn là                                    |
| Exp          | int64 Thời  | điểm hết hạn AccessToken (Unix timestamp)         |
| RefreshToken | string      | RefreshToken mới (dùng cho lần refresh tiếp theo) |

| Trường      | Kiểu       | Mô tả                    |
|-------------|------------|--------------------------|
| Authorities | string\[\] | Danh sách quyền được cấp |

​

# 4\. API 3 – Xóa phiên đăng nhập (Revoke Token)

Gọi API này để vô hiệu hóa AccessToken khi đăng xuất hoặc không còn cần phiên làm việc.

## 4\.1. Thông tin endpoint

| URL                       | ken= {AccessToken} | https://api-tbltkbtt.bocongan.gov.vn/authorization-service/oauth/revoke?access\_to |
|---------------------------|--------------------|------------------------------------------------------------------------------------|
| Phương thức               | DELETE             |                                                                                    |
| Authorization 4.2. Header | Basic              | QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=                                                   |
| Tên trường                | Kiểu Bắt buộc      | Mô tả                                                                              |
| Authorization             | string Có          | Giá trị: QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA="                                         |

## 4\.3. Query Parameter

| Tên trường    | Kiểu   | Bắt buộc | Mô tả               |
|---------------|--------|----------|---------------------|
| access\_token | string | Có       | AccessToken cần xóa |

## 4\.4. Ví dụ Request

curl --location --request DELETE'https://api-tbltkbtt.bocongan.gov.vn/authorization-service/oauth/revoke ?access\_token=cd7869c5-xxxx-46f7-ac75-10992bb7915e'\\ --header'Authorization: Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA='

## 4\.5. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": null

}

​

# 5\. API 4 – Khai báo tạm trú cho người nước ngoài

⚠ Bắt buộc phải có AccessToken hợp lệ từ API 1. Token được truyền qua Authorization Bearer header.

## 5\.1. Thông tin endpoint

| URL          | https://api-tbltkbtt.bocongan.gov.vn/client-service/kbtt/kbtt-3th |
|--------------|-------------------------------------------------------------------|
| Phương thức  | POST                                                              |
| Content-Type | application/json                                                  |
| Xác thực     | Authorization Bearer (xem mục 5.2)                                |

## 5\.2. Header

| Tên trường    | Kiểu   | Bắt buộc | Mô tả                         |
|---------------|--------|----------|-------------------------------|
| Content-Type  | string | Có       | application/json              |
| Authorization | string | Có       | Bearer {AccessToken} – ví dụ: |

## 5\.3. Body – mảng JSON khai báo

| Tên trường           | Kiểu   | Bắt buộc | Mô tả                                     |                                             |
|----------------------|--------|----------|-------------------------------------------|---------------------------------------------|
| hoTen                | string | Có       | Họ và tên đầy đủ của                      | khách                                       |
| quocTich             | string | Có       | Mã quốc tịch (lấy từ RUS                  | API Danh mục quốc tịch). Ví dụ:             |
| soHoChieu            | string | Có       | Số hộ chiếu / giấy tờ                     | tùy thân Nữ                                 |
| gioiTinh             | string | Có       | Nam, Giới tính:                           |                                             |
| loaiNgayThangNamSinh | string | Có       | Định dạng ngày sinh: Định dạng ngày sinh: | đầy đủ ngày/tháng/năm đầy đủ năm (ví dụ năm |

**2000 -\> gửi về ngayThangNamSinhStr =**

“2000-01-01”)

| ngayThangNamSinhStr                       | string      | Có Ngày               | sinh – định dạng: YYYY-MM-DD                |
|-------------------------------------------|-------------|-----------------------|---------------------------------------------|
| ngayDenCsltStr                            | string      | Có Ngày giờ           | đến CSLT – YYYY-MM-DD HH:mm:ss              |
| ngayDiDuKienStr                           | string      | Có Ngày giờ           | đi dự kiến – YYYY-MM-DD HH:mm:ss            |
| soPhong                                   | string      | Không(                |                                             |
| anhHoChieuB64                             | string      | Không Ảnh hộ minh tốt | chiếu Base64 (JPEG/PNG). Nên gửi để xác hơn |
| thoiHanTamTruStr ⚠ Lưu ý: Cslt thuộc loại | string hình | Có Thời hạn           | tạm trú – YYYY-MM-DD HH:mm:ss               |

‘Chung cư’thì soPhong là bắt buộc.

## 5\.4. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/client-service/kbtt/kbtt-3th'\\

\--header'Content-Type: application/json'\\

\--header'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'\\

\--data'\[

{"hoTen":"Nguyen Van A",

"quocTich":"RUS","soHoChieu":"B12345678",

"gioiTinh":"M","loaiNgayThangNamSinh":"D","ngayThangNamSinhStr":"1990-05-15","ngayDenCsltStr":"2026-04-07 14:00:00","ngayDiDuKienStr":"2026-04-10 12:00:00","soPhong":"101","anhHoChieuB64":"/9j/4AAQ...","thoiHanTamTruStr":"2026-07-30 23:59:59"

}

\]'

## 5\.5. Response

## Thành công (200)

{ "code": "200","message":"Thành công","data": null }

## Lỗi nghiệp vụ (400) – ví dụ

{ "code": "400",

"message":"Bản khai báo 1: Ngày đi dự kiến phải lớn hoặc bằng ngày hôm qua,

B ản khai báo 1: Số hộ chiếu đang tạm trú tại CSLT và chưa checkout","data": null }

## 5\.6. Các lỗi nghiệp vụ thường gặp

| Thông báo lỗi                                      | Nguyên nhân & Cách xử lý                                         |
|----------------------------------------------------|------------------------------------------------------------------|
| Ngày đi dự kiến phải lớn hoặc bằng ngày hôm qua    | ngayDiDuKienStr là ngày quá khứ. Điều chỉnh lại.                 |
| Ngày đến Cslt phải là ngày hiện tại hoặc hôm qua   | ngayDenCsltStr không hợp lệ. Chỉ chấp nhận hôm nay hoặc hôm qua. |
| Số hộ chiếu đang tạm trú tại CSLT và chưa checkout | Khách chưa checkout. Cần xử lý checkout trước khi khai báo mới.  |
| Đã tồn tại khai báo trùng thời gian tại CSLT       | Trùng khoảng thời gian khai báo cho cùng số hộ chiếu.            |
| Ngày đi dự kiến phải lớn hoặc bằng ngày đến Cslt   | Điều chỉnh ngayDiDuKienStr lớn hơn ngayDenCsltStr                |
| Thời hạn tạm trú phải lớn hoặc bằng hôm nay ​      | Điều chỉnh thoiHanTamTruStr                                      |

# 6\. API 5 – Khai báo lưu trú cho người Việt Nam

## 6\.1. Thông tin endpoint

| URL          | https://api-tbltkbtt.bocongan.gov.vn/client-service/kbtt-vn/kbtt-3th |
|--------------|----------------------------------------------------------------------|
| Phương thức  | POST                                                                 |
| Content-Type | application/json                                                     |
| Xác thực     | Authorization Bearer (xem mục 5.2)                                   |

## 6\.2. Header

| Tên trường    | Kiểu   | Bắt buộc | Mô tả                         |
|---------------|--------|----------|-------------------------------|
| Content-Type  | string | Có       | application/json              |
| Authorization | string | Có       | Bearer {AccessToken} – ví dụ: |

## 6\.3. Body – mảng JSON khai báo

| Tên trường          | Kiểu   | Bắt buộc Mô tả          |                                                      |
|---------------------|--------|-------------------------|------------------------------------------------------|
| hoTen               | string | Có Họ và                | tên đầy đủ của khách Nữ                              |
| gioiTinh            | string | Có Giới tính:           | Nam,                                                 |
| soDienThoai         | string | Không Số điện           | thoại của khách                                      |
| ngayThangNamSinhStr | string | Có Ngày                 | sinh – định dạng: YYYY-MM-DD                         |
| ghiChu              | string | Không Ghi chú           |                                                      |
| noiCuTru            | int64  | Không Giá trị           | lấy tại danh mục Nơi cư trú (API 9)                  |
| maTT                | string | Không Mã tỉnh           | thành lấy tại danh mục Tỉnh thành (API 7)            |
| maPX                | string | Không Mã phường         | xã lấy tại danh mục Phường Xã (API 8)                |
| diaChi              | string | Không Địa chỉ           | chi tiết.                                            |
| ngayDenCsltStr      | string | Có Ngày giờ             | đến CSLT – YYYY-MM-DD HH:mm:ss                       |
| ngayDiDuKienStr     | string | Có Ngày giờ             | đi dự kiến – YYYY-MM-DD HH:mm:ss                     |
| soPhong             | string | Không(                  |                                                      |
| lyDoCuTru           | int64  | Có Lý do                | cư trú lấy tại danh mục lý do cư trú                 |
| lyDoChiTiet         | string | Không Lý do             | cư trú chi tiết chỉ có giá trị khi lyDoCuTru = 20    |
| loaiGiayTo          | int64  | Có Loại giấy            | tờ lấy tại danh mục loại giấy tờ (API 10)            |
| soGiayTo            | string | Có Số giấy              | tờ                                                   |
| anhTruocB64         | string | Không Ảnh giấy xác minh | tờ mặt trước Base64 (JPEG/PNG). Nên gửi để tốt hơn ​ |

(Với loaiGiayTo = 4 - Hộ chiếu . Nếu có ảnh đưa vào trường"anhTruocB64")

anhSauB64 string Không Ảnh giấy tờ mặt sau Base64 (JPEG/PNG). Nên gửi để xác minh tốt hơn

⚠ Lưu ý: Cslt thuộc loại hình‘Khách sạn, nhà trọ’,‘Khu công nghiệp, chế xuất’,‘Chung cư, cơ sở y tế, kí túc xá’,‘Chung cư’thì soPhong là bắt buộc.

(\* ) Lưu ý: validate số giấy tờ: -​Th ẻ CCCD/Thẻ Căn Cước phải gồm đúng 12 chữ số. -​ CMND phải gồm 9 hoặc 12 chữ số. -​ Giấy phép lái xe chỉ được chứa chữ và số, tối đa 20 ký tự. -​H ộ chiếu chỉ được chứa chữ cái và số, tối đa 10 ký tự. -​Th ẻ BHYT chỉ được chứa chữ và số, tối đa 20 ký tự. -​ Số giấy tờ không được có ký tự đặc biệt hoặc khoảng trắng -​

## 6\.4. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/client-service/kbtt-vn/kbtt-3th'\\

\--header'Content-Type: application/json'\\

\--header'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'\\

\--data'\[

{

   "hoTen":"NGƯỜI VIỆT 1",

   "gioiTinh":"M",

"

   "soDienThoai":01235142",

   "ngayThangNamSinhStr":"2006-01-02",

   "ghiChu":"",

   "noiCuTru": 1,

   "maTT":"101",

   "maPX":"101900319",

   "diaChi":"121212",

   "ngayDenCsltStr":"2026-04-08 00:00:00",

   "ngayDiDuKienStr":"2026-04-08 23:59:59",

   "soPhong":"1123",

   "lyDoCuTru": 1,

   "lyDoChiTiet":"",

   "loaiGiayTo": 1,

   "soGiayTo":"15247854",

"anhTruocB64":"/9j/4AAQ...",""anhSauB64":/9j/4AAQ..."

}

\]'

## 6\.5. Response

## Thành công (200)

{ "code": "200","message":"Thành công","data": null }

## Lỗi nghiệp vụ (400) – ví dụ

{ "code": "400",

"message":"Bản khai báo 1: Ngày đi dự kiến phải lớn hoặc bằng ngày hôm qua,

B ản khai báo 1: Số hộ chiếu đang tạm trú tại CSLT và chưa checkout","data": null }

## 6\.6. Các lỗi nghiệp vụ thường gặp

| Thông báo lỗi                                      | Nguyên nhân & Cách xử lý                                         |
|----------------------------------------------------|------------------------------------------------------------------|
| Ngày đi dự kiến phải lớn hoặc bằng ngày hôm qua    | ngayDiDuKienStr là ngày quá khứ. Điều chỉnh lại.                 |
| Ngày đến Cslt phải là ngày hiện tại hoặc hôm qua   | ngayDenCsltStr không hợp lệ. Chỉ chấp nhận hôm nay hoặc hôm qua. |
| Số hộ chiếu đang tạm trú tại CSLT và chưa checkout | Khách chưa checkout. Cần xử lý checkout trước khi khai báo mới.  |
| Đã tồn tại khai báo trùng thời gian tại CSLT       | Trùng khoảng thời gian khai báo cho cùng số hộ chiếu.            |
| Ngày đi dự kiến phải lớn hoặc bằng ngày đến Cslt   | Điều chỉnh ngayDiDuKienStr lớn hơn ngayDenCsltStr                |

# 7\. API 6 – Danh mục Quốc tịch​

API công khai, không cần token xác thực. Dùng để lấy danh sách quốc tịch và điền vào trường quocTich khi khai báo.

## 7\.1. Thông tin endpoint

| URL         | https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/dm- qt/3th/get-all |
|-------------|----------------------------------------------------------------------------|
| Phương thức | GET                                                                        |
| Xác thực    | Không yêu cầu                                                              |

## 7\.2. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/dm- qt/3th /get-all'

## 7\.3. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": \[

{

"VN","maQT":

"tenQT":"Việt Nam",

"tenQTEn":"VIETNAM",

}, {"maQT":"D","tenQT":"Đức","tenQTEn":"GERMANY" }

...

\]

}

## 7\.4. Mô tả trường data

| Trường  | Kiểu   | Mô tả                                                         |
|---------|--------|---------------------------------------------------------------|
| maQT    | string | Mã quốc tịch – dùng điền vào trường quocTich của API Khai báo |
| tenQT   | string | Tên quốc tịch tiếng Việt                                      |
| tenQTEn | string | Tên quốc tịch tiếng Anh                                       |

​

# 8\. API 7 – Danh mục Tỉnh/Thành phố

API công khai, không cần token. Dùng để lấy danh sách tỉnh/thành phố (cần cho việc tra cứu phường/xã ở API 7).

## 8\.1. Thông tin endpoint

| URL         | https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/dm-tinh-tp/get-all |
|-------------|----------------------------------------------------------------------------|
| Phương thức | GET                                                                        |
| Xác thực    | Không yêu cầu                                                              |

## 8\.2. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/dm-tinh-tp/get-all'

## 8\.3. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": \[

{

"maTT":"805",

"tenTT":"An Giang",

"tenTTEn":"AN GIANG"

}, { "maTT": "201","tenTT":"Hà Nội","tenTTEn":"HA NOI"},

...

\]

}

## 8\.4. Mô tả trường data

| Trường  | Kiểu   | Mô tả                                                                |
|---------|--------|----------------------------------------------------------------------|
| maTT    | string | Mã tỉnh/thành phố – dùng làm tham số trucThuocTinh của API Phường/Xã |
| tenTT   | string | Tên tỉnh/thành phố tiếng Việt                                        |
| tenTTEn | string | Tên tỉnh/thành phố tiếng Anh                                         |
| maTTChu | string | Mã viết tắt (ví dụ: HN, HCM, AG)                                     |

​

# 9\. API 8 – Danh mục Phường/Xã theo Tỉnh/Thành

API công khai, không cần token. Dùng để lấy danh sách phường/xã theo mã tỉnh (maTT lấy từ API 6).

## 9\.1. Thông tin endpoint

| URL         | https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/dm- uocTinh= {maTT} | phuong |
|-------------|-----------------------------------------------------------------------------|--------|
| Phương thức | GET                                                                         |        |
| Xác thực    | Không yêu cầu                                                               |        |

## 9\.2. Query Parameter

| Tên trường    | Kiểu   | Bắt buộc | Mô tả                                                            |
|---------------|--------|----------|------------------------------------------------------------------|
| trucThuocTinh | string | Có       | Mã tỉnh/thành phố (lấy từ API Danh mục Tỉnh/Thành – trường maTT) |

## 9\.3. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/dm- phuong-xa?trucThuocTinh=223'

## 9\.4. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": \[

{

"223907210","maPhuongXa":"tenPhuongXa":"Phường Bắc Giang","tenPhuongXaEn":"BAC GIANG WARD","trucThuocTinh":"223"

},

...

\]

}

## 9\.5. Mô tả trường data

| Trường        | Kiểu   | Mô tả                        |
|---------------|--------|------------------------------|
| maPhuongXa    | string | Mã phường/xã                 |
| tenPhuongXa   | string | Tên phường/xã tiếng Việt     |
| tenPhuongXaEn | string | Tên phường/xã tiếng Anh      |
| trucThuocTinh | string | Mã tỉnh/thành phố trực thuộc |

# 10\. API 9 – Danh mục lý do cư trú

API công khai, không cần token. Dùng để lấy danh sách lý do cư trú.

## 10\.1. Thông tin endpoint

| URL         | https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/ly |
|-------------|------------------------------------------------------------|
| Phương thức | GET                                                        |
| Xác thực    | Không yêu cầu                                              |

## 10\.2. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/ly-do-cu-tru/get-all'

## 10\.3. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": \[

{

"id": 1,

"name":"Du lịch"

},

...

\]

}

## 10\.4. Mô tả trường data

| Trường | Kiểu   | Mô tả            |
|--------|--------|------------------|
| Id     | Int64  | Số id            |
| Name   | string | Tên lý do cư trú |

# ​11. API 10 – Danh mục loại giấy tờ

API công khai, không cần token. Dùng để lấy danh sách loại giấy tờ.

## 11\.1. Thông tin endpoint

| URL         | https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/loai- giay |
|-------------|--------------------------------------------------------------------|
| Phương thức | GET                                                                |
| Xác thực    | Không yêu cầu                                                      |

## 11\.2. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/loai- giay-to/get-all'

## 11\.3. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": \[

{

"id": 1,

"name":"Thẻ CCCD"

},

...

\]

}

## 11\.4. Mô tả trường data

| Trường | Kiểu   | Mô tả            |
|--------|--------|------------------|
| Id     | Int64  | Số id            |
| Name   | string | Tên loại giấy tờ |

# ​

# 12\. API 11 – Danh mục nơi cư trú

API công khai, không cần token. Dùng để lấy danh sách nơi cư trú

## 11s.1. Thông tin endpoint

| URL         | https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/noi-cu-tru/get-all |
|-------------|----------------------------------------------------------------------------|
| Phương thức | GET                                                                        |
| Xác thực    | Không yêu cầu                                                              |

## 11\.2. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/cms-backend/public/noi-cu-tru/get-all'

## 11\.3. Response thành công (200)

{"code":"200",

"message":"Thành công",

"data": \[

{

"id": 1,

"name":"Thường trú"

},

...

\]

}

## 11\.4. Mô tả trường data

**Trường Kiểu Mô tả**

Id Int64 Số id

Name string Tên nơi cư trú

# 13\. Luồng tích hợp khuyến nghị

## 13\.1. Sơ đồ tổng quan

──────────────────────────────────────────────────────

┌│ LUỒNG SỬ DỤNG API KBTT │ └──────────────────────────────────────────────────────┘

\[Khởi động ứng dụng\] │ ▼

──────────────────────────────────

┌│ Tải danh mục (1 lần, cache) │ │ • API 6: Quốc tịch │ │ • API 7: Tỉnh/Thành │ │ • API 8: Phường/Xã (theo tỉnh)│ │ • API 9: Lý do cư trú│ │ • API 10: Loại giấy tờ│ │ • API 11: Nơi cư trú│ └─────────────────

│

─────────────────

┌│ API 1: Get Token │ │ → Lưu AccessToken + Exp │ └─────────────────

│ \[Mỗi lần khai báo\] │

─────────────────

┌│ Kiểm tra AccessToken (Exp) │ │ Nếu hết hạn → API 2: Refresh │ └─────────────────

│

─────────────────

┌│ API 4: Khai báo tạm trú │

┐

┐

────────────────┘ ┬

▼──────────────── ┐

────────────────┘ ┬

▼──────────────── ┐

────────────────┘ ┬

▼──────────────── ┐

│ Authorization Bearer │ └───────────────── ────────────────┘ ┬ │

───────────────── ▼──────────────── ┐ ┌│ Kết thúc: API 3: Revoke Token │ └──────────────────────────────────┘

## 13\.2. Lưu ý quan trọng

| 🔒 Không nhúng manager. | username/password trực tiếp vào source code. Sử dụng biến môi trường hoặc secret |
|-------------------------|----------------------------------------------------------------------------------|
| ⚠️ Basic Auth chỉ là    | Base64, không phải mã hóa bảo mật – cần bảo vệ credentials riêng biệt.           |
| ⏱️ Kiểm tra trường Exp  | trước mỗi lần gọi API Khai báo. Gia hạn bằng Refresh Token khi còn \< 60 giây.   |
| 🔄 Cache token trong bộ | nhớ ứng dụng, chỉ gọi Get Token khi thật sự cần (lần đầu hoặc Refresh hết hạn).  |
| 🍪 API Khai báo dùng    | Authorization Bearer – bắt buộc.                                                 |
| 📋 API Danh mục (6, 7,  | 8, 9, 10, 11) nên được cache khi khởi động, không cần gọi lại thường xuyên.      |
| ️ Luôn gọi Revoke Token | khi kết thúc phiên để giải phóng tài nguyên và bảo mật.                          |

14\. API 12 – Đổi ngày đi của khách Việt Nam đang tạm trú ⚠ Bắt buộc phải có AccessToken hợp lệ từ API 1. Token được truyền qua Authorization Bearer header.

## 14\.1. Thông tin endpoint

| URL          | https://api-tbltkbtt.bocongan.gov.vn/client-service/kbtt-vn/kbtt-3th/doi-ngay phong. |
|--------------|--------------------------------------------------------------------------------------|
| Phương thức  | POST                                                                                 |
| Content-Type | application/json                                                                     |
| Xác thực     | Authorization Bearer (xem mục 5.2)                                                   |

## 14\.2. Header

| Tên trường    | Kiểu   | Bắt buộc | Mô tả                         |
|---------------|--------|----------|-------------------------------|
| Content-Type  | string | Có       | application/json              |
| Authorization | string | Có       | Bearer {AccessToken} – ví dụ: |

## 14\.3. Body – mảng JSON khai báo

**Tên trường Kiểu Bắt buộc Mô tả**

loai string Có Gồm 2 giá trị: -​T S: Trả Sớm.

\-​ GH: Gia hạn thời gian tạm trú

**soGiayTo string Có Số Giấy tờ**

loaiGiayTo int Có Loại giấy tờ gồm các giá trị: -​1 : Thẻ CCCD -​2 : Thẻ CMND

\-​ 3: Giấy phép lái xe -​4 : Hộ chiếu -​ 5: Giấy khai sinh -​ 6: Thẻ BHYT

\-​ 7: Thông báo số định danh cá nhân -​ 8: Thẻ Căn Cước

**thoiGianStr string Không(\*) Thời hạn tạm trú – YYYY-MM-DD HH:mm:ss.**

​Với loại = GH thì bắt buộc

## 14\.4. Ví dụ Request

curl --location'https://api-tbltkbtt.bocongan.gov.vn/client-service/kbtt/kbtt-3th/doi-ngay-tra- phong'\\ --header'Content-Type: application/json'\\

\--header'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'\\

\--data'\[

{"loai":"TS",

"soGiayTo":"034112323232","loaiGiayTo": 1 }, {"loai":"GH","soGiayTo":"152069871","loaiGiayTo": 2,"thoiGianStr":"2026-04-07 14:00:00" }

\]'

## 14\.5. Response

## Thành công (200)

{ "code": "200","message":"Thành công","data": null }

## Lỗi nghiệp vụ (400) – ví dụ

{ "code": "400",

"message":"Bản ghi 1: Loại phải là GH hoặc TS,

B ản ghi 1: Thẻ CCCD phải gồm đúng 12 chữ số","data": null }

## 14\.6. Các lỗi nghiệp vụ thường gặp

| Thông báo lỗi                                                                           | Nguyên nhân & Cách xử lý                                                                                   |
|-----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Loại giấy tờ phải có giá trị từ 1 đến 8                                                 | loaiGiayTo nằm ngoài khoảng \[1,8\]. Điều chỉnh lại.                                                       |
| Loại phải là GH hoặc TS                                                                 | loai không hợp lệ. Chỉ chấp nhận TS hoặc GH.                                                               |
| Thẻ CCCD phải gồm đúng 12 chữ số Số Giấy tờ xxx với loại giấy tờ là Thẻ CCCD đang không | soGiayTo không hợp lệ. Cần xem validate giấy tờ Kiểm tra với (soGiayTo, loaiGiayTo) đang không tạm trú tại |

tồn tại trong hệ thống Cslt. Cần kiểm tra lại trên web của hệ thống với khách đang tạm trú. Lý do có thể là đã bị checkout hoặc khi tạo mới với api bị lỗi.

| Bị trùng giấy tờ với bản ghi 1                                                            | Body request có tồn tại 2 bản ghi cùng soGiayTo.​ Kiểm tra lại body request |
|-------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Thời hạn tạm trú phải lớn ngày đi hiện tại Ngày gia hạn không được vượt quá 30 ngày kể từ | Điều chỉnh thoiGianStr Điều chỉnh thoiGianStr ngày đến                      |

CSLT

Danh sách đổi ngày trả phòng không được để trống

(\* ) Lưu ý: validate số giấy tờ: -​Th ẻ CCCD/Thẻ Căn Cước phải gồm đúng 12 chữ số. -​ CMND phải gồm 9 hoặc 12 chữ số. -​ Giấy phép lái xe chỉ được chứa chữ và số, tối đa 20 ký tự. -​H ộ chiếu chỉ được chứa chữ cái và số, tối đa 10 ký tự. -​Th ẻ BHYT chỉ được chứa chữ và số, tối đa 20 ký tự.