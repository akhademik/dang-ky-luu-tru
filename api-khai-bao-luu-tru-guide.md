# HƯỚNG DẪN TÍCH HỢP API KHAI BÁO TẠM TRÚ & THÔNG BÁO LƯU TRÚ (KBTT)
**Dành cho Cơ sở lưu trú (Bên thứ 3 - 3rd Party)**  
*Phiên bản: 1.4 | Tháng 08/2026*

---

## 1. TỔNG QUAN HỆ THỐNG

Tài liệu này mô tả chi tiết quy chuẩn kỹ thuật và danh sách các API thuộc **Hệ thống Khai báo tạm trú cho Người nước ngoài và Thông báo lưu trú cho Công dân Việt Nam (KBTT)** do Bộ Công an quản lý.

Hệ thống được thiết kế theo mô hình RESTful API, ứng dụng cơ chế xác thực **OAuth 2.0 (Bearer Token)** và cung cấp 12 API chính chia thành 4 nhóm nghiệp vụ:
1. **Nhóm Xác thực & Quản lý Token** (API 1, API 2, API 3)
2. **Nhóm Nghiệp vụ Khai báo & Cập nhật** (API 4, API 5, API 12)
3. **Nhóm Danh mục Công khai** (API 6, API 7, API 8, API 9, API 10, API 11)
4. **Quy trình Tích hợp Khuyên dùng & Lưu ý Bảo mật**

### 1.1. Thông tin Môi trường (Base URL)

| Môi trường | Base URL | Mô tả |
| :--- | :--- | :--- |
| **Production** | `https://api-tbltkbtt.bocongan.gov.vn` | Môi trường vận hành chính thức |
| **Demo / Sandbox** | `https://api-kbtt.ai-vlab.com` | Môi trường thử nghiệm tích hợp |

### 1.2. Tài khoản Thử nghiệm (Demo Account)

- **Username:** `demo_tich_hop`
- **Password:** `Demo@#$12345`
- **Basic Auth Credential (Cố định cho API Token):** `Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ` *(Base64 của `API_CSLT:i2nVxBdGFr7j13dOqI`)*

---

## 2. NHÓM API XÁC THỰC & QUẢN LÝ TOKEN

```
┌────────────────┐          POST /oauth/token           ┌────────────────┐
│                │ ───────────────────────────────────> │                │
│                │ <─────────────────────────────────── │                │
│  Client CSLT   │          Return AccessToken          │ Auth Server    │
│  (3rd Party)   │       POST /oauth/refresh-token      │ (OAuth 2.0)    │
│                │ ───────────────────────────────────> │                │
│                │          DELETE /oauth/revoke        │                │
│                │ ───────────────────────────────────> │                │
└────────────────┘                                      └────────────────┘
```

---

### 2.1. API 1 – Lấy Token (Get Token)

Lấy `AccessToken` ban đầu để truy cập các API nghiệp vụ.

* **URL:** `/authorization-service/oauth/token`
* **Phương thức:** `POST`
* **Content-Type:** `application/x-www-form-urlencoded`

#### Headers

| Tên trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | **Có** | Giá trị cố định: `Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ` |
| `Content-Type` | String | **Có** | `application/x-www-form-urlencoded` |

#### Form Parameters (Body)

| Tên trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `username` | String | **Có** | Tên đăng nhập tài khoản CSLT (ví dụ: `demo_tich_hop`) |
| `password` | String | **Có** | Mật khẩu tài khoản CSLT (ví dụ: `Demo@#$12345`) |
| `grant-type` | String | **Có** | Loại grant, giá trị cố định: `api_cslt` |

#### Request Mẫu (cURL)

```bash
curl --location 'https://api-kbtt.ai-vlab.com/authorization-service/oauth/token' \
  --header 'Authorization: Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'username=demo_tich_hop' \
  --data-urlencode 'password=Demo@#$12345' \
  --data-urlencode 'grant-type=api_cslt'
```

#### Response Thành công (HTTP 200)

```json
{
  "code": "200",
  "message": "Thành công",
  "data": {
    "AccessToken": "87c19dcf-xxxx-4c46-b1b7-288feb8cb9a2",
    "RefreshToken": "74d3214e-xxxx-49d2-88b3-4cfb698fe463",
    "TokenType": "bearer",
    "Exp": 1775631277,
    "Authorities": [
      "kbtt:create-3th",
      "CLIENT_API_CSLT"
    ],
    "ClientId": 7,
    "LoaiTK": "CSLT",
    "CsltId": "1000227",
    "CsltKhuVuc": 86,
    "CsltDonVi": 1332,
    "MaTTCuaCslt": "101",
    "MaPxCuaCslt": "101900256",
    "IsCsltChinh": true
  }
}
```

#### Chi tiết các trường dữ liệu `data`

| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `AccessToken` | String | Token truy cập (Bearer). Dùng gắn vào Header các API nghiệp vụ. |
| `RefreshToken` | String | Token dùng để làm mới khi `AccessToken` hết hạn. |
| `TokenType` | String | Loại token, luôn là `"bearer"`. |
| `Exp` | Int64 | Thời điểm hết hạn của AccessToken (Unix timestamp, tính bằng giây). |
| `Authorities` | Array[String] | Quyền được cấp. Bắt buộc chứa `"kbtt:create-3th"`. |
| `CsltId` | String | Mã định danh Cơ sở lưu trú trong hệ thống. |
| `MaTTCuaCslt` | String | Mã tỉnh/thành phố của Cơ sở lưu trú. |
| `MaPxCuaCslt` | String | Mã phường/xã của Cơ sở lưu trú. |
| `IsCsltChinh` | Boolean | `true` = Cơ sở chính; `false` = Chi nhánh. |

---

### 2.2. API 2 – Làm mới Token (Refresh Token)

Sử dụng khi `AccessToken` sắp hoặc đã hết hạn (dựa theo trường `Exp`). Tránh việc phải gửi lại username/password.

* **URL:** `/authorization-service/oauth/refresh-token?refresh_token={RefreshToken}`
* **Phương thức:** `POST`

#### Headers & Parameters

* **Header:** `Authorization: Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=`
* **Query Parameter:** `refresh_token` (String, Bắt buộc): Chuỗi `RefreshToken` nhận được từ API 1.

#### Request Mẫu (cURL)

```bash
curl --location --request POST 'https://api-kbtt.ai-vlab.com/authorization-service/oauth/refresh-token?refresh_token=43d208e7-xxxx-47e6-be44-9714651ae190' \
  --header 'Authorization: Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA='
```

#### Response Thành công (HTTP 200)

```json
{
  "code": "200",
  "message": "Thành công",
  "data": {
    "AccessToken": "99b12dcf-xxxx-4c46-b1b7-999feb8cb9b3",
    "RefreshToken": "12d3214e-xxxx-49d2-88b3-11fb698fe111",
    "TokenType": "bearer",
    "Exp": 1775634877,
    "Authorities": ["kbtt:create-3th", "CLIENT_API_CSLT"]
  }
}
```

---

### 2.3. API 3 – Xóa phiên đăng nhập (Revoke Token)

Vô hiệu hóa phiên làm việc khi người dùng đăng xuất hoặc ứng dụng ngừng hoạt động.

* **URL:** `/authorization-service/oauth/revoke?access_token={AccessToken}`
* **Phương thức:** `DELETE`

#### Headers & Parameters

* **Header:** `Authorization: Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=`
* **Query Parameter:** `access_token` (String, Bắt buộc): AccessToken cần thu hồi.

#### Request Mẫu (cURL)

```bash
curl --location --request DELETE 'https://api-kbtt.ai-vlab.com/authorization-service/oauth/revoke?access_token=87c19dcf-xxxx-4c46-b1b7-288feb8cb9a2' \
  --header 'Authorization: Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA='
```

#### Response Thành công (HTTP 200)

```json
{
  "code": "200",
  "message": "Thành công",
  "data": null
}
```

---

## 3. NHÓM API NGHIỆP VỤ KHAI BÁO & CẬP NHẬT

> ⚠️ **Yêu cầu bắt buộc:** Tất cả API nghiệp vụ phải truyền Header `Authorization: Bearer {AccessToken}` hợp lệ lấy từ API 1/API 2.  
> ⚠️ **Cấu trúc Body:** Payload gửi lên luôn luôn là một **Mảng JSON (JSON Array `[...]`)**, kể cả khi chỉ gửi 1 khách.

---

### 3.1. API 4 – Khai báo tạm trú cho Người Nước Ngoài (NNN)

* **URL:** `/client-service/kbtt/kbtt-3th`
* **Phương thức:** `POST`
* **Content-Type:** `application/json`
* **Xác thực:** `Authorization: Bearer {AccessToken}`

#### Mô tả cấu trúc JSON Payload (Danh sách Khách NNN)

| Tên trường | Kiểu | Bắt buộc | Quy chuẩn & Ràng buộc dữ liệu |
| :--- | :--- | :--- | :--- |
| `hoTen` | String | **Có** | Họ và tên đầy đủ của khách NNN. |
| `quocTich` | String | **Có** | Mã quốc tịch chuẩn 2-3 ký tự tra từ API 6 (ví dụ: `"RUS"`, `"USA"`, `"DEU"`). |
| `soHoChieu` | String | **Có** | Số hộ chiếu / Giấy tờ tùy thân. *Tối đa 10 ký tự chữ và số, không chứa ký tự đặc biệt/khoảng trắng.* |
| `gioiTinh` | String | **Có** | `"M"` = Nam, `"F"` = Nữ. |
| `loaiNgayThangNamSinh` | String | **Có** | `"D"` = Đầy đủ ngày/tháng/năm; `"Y"` = Chỉ có năm sinh (gửi ngày dạng `YYYY-01-01`). |
| `ngayThangNamSinhStr` | String | **Có** | Ngày sinh, định dạng `YYYY-MM-DD`. |
| `ngayDenCsltStr` | String | **Có** | Ngày giờ đến CSLT, định dạng `YYYY-MM-DD HH:mm:ss`. *Chỉ chấp nhận ngày hôm nay hoặc hôm qua.* |
| `ngayDiDuKienStr` | String | **Có** | Ngày giờ đi dự kiến, định dạng `YYYY-MM-DD HH:mm:ss`. *Phải >= ngayDenCsltStr.* |
| `soPhong` | String | **Bắt buộc*** | Số phòng lưu trú. *\(*) Bắt buộc với CSLT thuộc loại hình Khách sạn, Nhà trọ, Chung cư, Căn hộ, Cơ sở y tế, Ký túc xá.* |
| `anhHoChieuB64` | String | Không | Chuỗi Base64 ảnh hộ chiếu (JPEG/PNG). Không bắt buộc nhưng khuyến nghị gửi để xác minh tốt hơn. |
| `thoiHanTamTruStr` | String | **Có** | Thời hạn tạm trú (hạn Visa/Miễn thị thực), định dạng `YYYY-MM-DD HH:mm:ss`. *Phải >= ngày hiện tại.* |

#### Request Mẫu (cURL)

```bash
curl --location 'https://api-kbtt.ai-vlab.com/client-service/kbtt/kbtt-3th' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --data '[
    {
      "hoTen": "GRACHEV NIKITA",
      "quocTich": "RUS",
      "soHoChieu": "B12345678",
      "gioiTinh": "M",
      "loaiNgayThangNamSinh": "D",
      "ngayThangNamSinhStr": "1990-05-15",
      "ngayDenCsltStr": "2026-09-16 14:00:00",
      "ngayDiDuKienStr": "2026-09-20 12:00:00",
      "soPhong": "101",
      "anhHoChieuB64": "",
      "thoiHanTamTruStr": "2026-12-31 23:59:59"
    }
  ]'
```

---

### 3.2. API 5 – Khai báo lưu trú cho Công dân Việt Nam

* **URL:** `/client-service/kbtt-vn/kbtt-3th`
* **Phương thức:** `POST`
* **Content-Type:** `application/json`
* **Xác thực:** `Authorization: Bearer {AccessToken}`

#### Mô tả cấu trúc JSON Payload (Danh sách Khách VN)

| Tên trường | Kiểu | Bắt buộc | Quy chuẩn & Ràng buộc dữ liệu |
| :--- | :--- | :--- | :--- |
| `hoTen` | String | **Có** | Họ và tên đầy đủ. |
| `gioiTinh` | String | **Có** | `"M"` = Nam, `"F"` = Nữ. |
| `soDienThoai` | String | Không | Số điện thoại liên hệ. |
| `ngayThangNamSinhStr` | String | **Có** | Ngày sinh, định dạng `YYYY-MM-DD`. |
| `ghiChu` | String | Không | Ghi chú bổ sung. |
| `noiCuTru` | Int64 | Không | Mã nơi cư trú (lấy từ API 11: `1` = Thường trú, `2` = Tạm trú). |
| `maTT` | String | Không | Mã Tỉnh/Thành phố (lấy từ API 7). |
| `maPX` | String | Không | Mã Phường/Xã (lấy từ API 8). |
| `diaChi` | String | Không | Địa chỉ chi tiết. *Nếu maTT/maPX trống, nên điền đầy đủ chuỗi địa chỉ vào đây.* |
| `ngayDenCsltStr` | String | **Có** | Ngày giờ đến CSLT, định dạng `YYYY-MM-DD HH:mm:ss`. *Chỉ chấp nhận ngày hôm nay hoặc hôm qua.* |
| `ngayDiDuKienStr` | String | **Có** | Ngày giờ đi dự kiến, định dạng `YYYY-MM-DD HH:mm:ss`. *Phải >= ngayDenCsltStr.* |
| `soPhong` | String | **Bắt buộc*** | Số phòng lưu trú. *\(*) Bắt buộc với CSLT thuộc mô hình Khách sạn, Nhà trọ, Chung cư, Cơ sở y tế...* |
| `lyDoCuTru` | Int64 | **Có** | Mã lý do cư trú (lấy từ API 9: `1` = Du lịch, `2` = Lao động...). |
| `lyDoChiTiet` | String | Không | Chi tiết lý do (chỉ sử dụng khi `lyDoCuTru = 20`). |
| `loaiGiayTo` | Int64 | **Có** | Mã loại giấy tờ (lấy từ API 10: `1` = Thẻ CCCD, `8` = Thẻ Căn cước, `4` = Hộ chiếu...). |
| `soGiayTo` | String | **Có** | Số giấy tờ tùy thân. *Xem quy tắc validate bên dưới.* |
| `anhTruocB64` | String | Không | Chuỗi Base64 ảnh giấy tờ mặt trước. |
| `anhSauB64` | String | Không | Chuỗi Base64 ảnh giấy tờ mặt sau. |

#### Quy tắc Validation `soGiayTo` (Số Giấy Tờ)
- **Thẻ CCCD (loaiGiayTo = 1) / Thẻ Căn cước (loaiGiayTo = 8):** Bắt buộc đúng **12 chữ số**.
- **CMND (loaiGiayTo = 2):** Bắt buộc gồm **9 hoặc 12 chữ số**.
- **Giấy phép lái xe (loaiGiayTo = 3):** Tối đa 20 ký tự chữ và số.
- **Hộ chiếu (loaiGiayTo = 4):** Tối đa 10 ký tự chữ và số.
- **Thẻ BHYT (loaiGiayTo = 6):** Tối đa 20 ký tự chữ và số.
- *Tất cả số giấy tờ tuyệt đối không chứa ký tự đặc biệt hoặc khoảng trắng.*

#### Request Mẫu (cURL)

```bash
curl --location 'https://api-kbtt.ai-vlab.com/client-service/kbtt-vn/kbtt-3th' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --data '[
    {
      "hoTen": "NGUYEN VAN A",
      "gioiTinh": "M",
      "soDienThoai": "0987654321",
      "ngayThangNamSinhStr": "1995-10-20",
      "noiCuTru": 1,
      "maTT": "201",
      "maPX": "101900319",
      "diaChi": "123 Đường Lê Duẩn, Phường Cửa Nam, Hà Nội",
      "ngayDenCsltStr": "2026-09-16 14:00:00",
      "ngayDiDuKienStr": "2026-09-18 12:00:00",
      "soPhong": "102",
      "lyDoCuTru": 1,
      "lyDoChiTiet": "",
      "loaiGiayTo": 1,
      "soGiayTo": "001095012345",
      "anhTruocB64": "",
      "anhSauB64": ""
    }
  ]'
```

---

### 3.3. Bảng Tổng hợp Phản hồi & Lỗi Nghiệp vụ Thường gặp (API 4 & API 5)

#### Status Response

- **Thành công (HTTP 200):**
  ```json
  { "code": "200", "message": "Thành công", "data": null }
  ```
- **Lỗi Nghiệp vụ (HTTP 400):**
  ```json
  { "code": "400", "message": "Bản khai báo 1: Ngày đi dự kiến phải lớn hoặc bằng ngày hôm qua", "data": null }
  ```

#### Các lỗi nghiệp vụ phổ biến và cách khắc phục

| Thông báo lỗi trả về | Nguyên nhân & Hướng xử lý |
| :--- | :--- |
| `Ngày đi dự kiến phải lớn hoặc bằng ngày hôm qua` | `ngayDiDuKienStr` nằm trong quá khứ. Cần điều chỉnh lại thời gian. |
| `Ngày đến Cslt phải là ngày hiện tại hoặc hôm qua` | `ngayDenCsltStr` quá xa trong quá khứ hoặc tương lai. Chỉ chấp nhận Hôm nay/Hôm qua. |
| `Số hộ chiếu đang tạm trú tại CSLT và chưa checkout` | Khách đã được khai báo trước đó và chưa thực hiện trả phòng. Cần xử lý đổi ngày/checkout trước khi tạo mới. |
| `Đã tồn tại khai báo trùng thời gian tại CSLT` | Khoảng thời gian khai báo bị chồng lấp với một bản khai báo cũ của cùng số giấy tờ. |
| `Thẻ CCCD phải gồm đúng 12 chữ số` | Chuỗi `soGiayTo` sai độ dài (không đủ 12 số) hoặc chứa khoảng trắng/ký tự chữ. |
| `Thời hạn tạm trú phải lớn hoặc bằng hôm nay` | Đối với NNN: `thoiHanTamTruStr` phải lớn hơn hoặc bằng ngày thực hiện request. |

---

### 3.4. API 12 – Đổi ngày đi / Gia hạn cho Khách Việt Nam đang tạm trú

API dùng để cập nhật thời gian trả phòng cho khách Việt Nam đang lưu trú (Trả phòng sớm hoặc Gia hạn lưu trú).

* **URL:** `/client-service/kbtt-vn/kbtt-3th/doi-ngay-tra-phong`
* **Phương thức:** `POST`
* **Content-Type:** `application/json`
* **Xác thực:** `Authorization: Bearer {AccessToken}`

#### Dynamic Body Parameters (Mảng JSON)

| Tên trường | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `loai` | String | **Có** | `TS` = Trả Sớm; `GH` = Gia Hạn thời gian tạm trú. |
| `soGiayTo` | String | **Có** | Số giấy tờ đã đăng ký của khách. |
| `loaiGiayTo` | Int | **Có** | Mã loại giấy tờ (`1`: CCCD, `2`: CMND, `4`: Hộ chiếu...). |
| `thoiGianStr` | String | **Có*** | Thời hạn tạm trú mới (`YYYY-MM-DD HH:mm:ss`). *\(*) Bắt buộc đối với `loai = GH`.* |

#### Request Mẫu (cURL)

```bash
curl --location 'https://api-kbtt.ai-vlab.com/client-service/kbtt-vn/kbtt-3th/doi-ngay-tra-phong' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --data '[
    {
      "loai": "TS",
      "soGiayTo": "034112323232",
      "loaiGiayTo": 1
    },
    {
      "loai": "GH",
      "soGiayTo": "152069871",
      "loaiGiayTo": 2,
      "thoiGianStr": "2026-09-25 14:00:00"
    }
  ]'
```

---

## 4. NHÓM API DANH MỤC CÔNG KHAI (PUBLIC CATALAGS)

> 💡 **Đặc điểm chung:** Các API danh mục hoàn toàn công khai, **không yêu cầu AccessToken**.  
> 💡 **Khuyên dùng:** Nên tải và lưu cache cục bộ ở ứng dụng client khi khởi động để tối ưu hiệu năng.

---

### 4.1. API 6 – Danh mục Quốc tịch

* **URL:** `/cms-backend/public/dm-qt/3th/get-all` | **GET**
* **Mô tả:** Lấy danh sách mã quốc gia/quốc tịch dùng điền vào trường `quocTich` (API 4).

```bash
curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/dm-qt/3th/get-all"
```

#### Response JSON Mẫu

```json
{
  "code": "200",
  "message": "Thành công",
  "data": [
    { "maQT": "VN", "tenQT": "Việt Nam", "tenQTEn": "VIETNAM" },
    { "maQT": "RUS", "tenQT": "Liên Bang Nga", "tenQTEn": "RUSSIAN FEDERATION" },
    { "maQT": "D", "tenQT": "Đức", "tenQTEn": "GERMANY" }
  ]
}
```

---

### 4.2. API 7 – Danh mục Tỉnh / Thành phố

* **URL:** `/cms-backend/public/dm-tinh-tp/get-all` | **GET**
* **Mô tả:** Lấy danh sách Tỉnh/Thành phố. Giá trị `maTT` dùng để tra cứu Phường/Xã ở API 8 hoặc truyền vào `maTT` ở API 5.

```bash
curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/dm-tinh-tp/get-all"
```

#### Response JSON Mẫu

```json
{
  "code": "200",
  "message": "Thành công",
  "data": [
    { "maTT": "201", "tenTT": "Hà Nội", "tenTTEn": "HA NOI", "maTTChu": "HN" },
    { "maTT": "805", "tenTT": "An Giang", "tenTTEn": "AN GIANG", "maTTChu": "AG" }
  ]
}
```

---

### 4.3. API 8 – Danh mục Phường / Xã theo Tỉnh/Thành

* **URL:** `/cms-backend/public/dm-phuong-xa?trucThuocTinh={maTT}` | **GET**
* **Query Parameter:** `trucThuocTinh` (String, Bắt buộc): Mã tỉnh/thành phố lấy từ API 7 (ví dụ: `201` cho Hà Nội).

```bash
curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/dm-phuong-xa?trucThuocTinh=201"
```

#### Response JSON Mẫu

```json
{
  "code": "200",
  "message": "Thành công",
  "data": [
    {
      "maPhuongXa": "101900256",
      "tenPhuongXa": "Phường Tràng Tiền",
      "tenPhuongXaEn": "TRANG TIEN WARD",
      "trucThuocTinh": "201"
    }
  ]
}
```

---

### 4.4. API 9 – Danh mục Lý do cư trú

* **URL:** `/cms-backend/public/ly-do-cu-tru/get-all` | **GET**
* **Mô tả:** Lấy danh sách ID lý do cư trú dùng điền trường `lyDoCuTru` (API 5).

```bash
curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/ly-do-cu-tru/get-all"
```

#### Response JSON Mẫu

```json
{
  "code": "200",
  "message": "Thành công",
  "data": [
    { "id": 1, "name": "Du lịch" },
    { "id": 2, "name": "Lao động" },
    { "id": 20, "name": "Khác" }
  ]
}
```

---

### 4.5. API 10 – Danh mục Loại giấy tờ

* **URL:** `/cms-backend/public/loai-giay-to/get-all` | **GET**
* **Mô tả:** Mã định danh các loại giấy tờ tùy thân cho công dân Việt Nam.

| ID (`loaiGiayTo`) | Tên Loại giấy tờ |
| :---: | :--- |
| `1` | Thẻ CCCD |
| `2` | CMND |
| `3` | Giấy phép lái xe |
| `4` | Hộ chiếu |
| `5` | Giấy khai sinh |
| `6` | Thẻ BHYT |
| `7` | Thông báo số định danh cá nhân |
| `8` | Thẻ Căn cước *(Mẫu mới theo Luật Căn cước)* |

---

### 4.6. API 11 – Danh mục Nơi cư trú

* **URL:** `/cms-backend/public/noi-cu-tru/get-all` | **GET**
* **Mô tả:** Lấy danh sách hình thức cư trú điền trường `noiCuTru` (API 5).

```json
{
  "code": "200",
  "message": "Thành công",
  "data": [
    { "id": 1, "name": "Thường trú" },
    { "id": 2, "name": "Tạm trú" }
  ]
}
```

---

## 5. KIẾN TRÚC TÍCH HỢP KHUYÊN DÙNG & LƯU Ý KỸ THUẬT

### 5.1. Sơ đồ Luồng Thực thi Tích hợp (Workflow)

```
                     [ Khởi động Ứng dụng ]
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ Tải & Cache các Danh mục (Public)    │
            │ • API 6: Quốc tịch                   │
            │ • API 7: Tỉnh/Thành                  │
            │ • API 8: Phường/Xã (theo maTT)       │
            │ • API 9, 10, 11: Lý do, Giấy tờ...    │
            └──────────────────┬───────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ API 1: Get Token                     │
            │  → Lưu AccessToken + Exp + Refresh   │
            └──────────────────┬───────────────────┘
                               │
                      [ Khi có Khai báo ]
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ Kiểm tra Thời hạn Token (Exp)        │
            │  • Nếu Exp còn < 60s → Gọi API 2     │
            └──────────────────┬───────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          (Khách Việt Nam)            (Khách NNN)
                 │                           │
                 ▼                           ▼
      ┌────────────────────┐      ┌────────────────────┐
      │ API 5: kbtt-vn     │      │ API 4: kbtt-3th    │
      └──────────┬─────────┘      └──────────┬─────────┘
                 │                           │
                 └─────────────┬─────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ Kết thúc phiên / Đăng xuất           │
            │  → Gọi API 3: Revoke Token           │
            └──────────────────────────────────────┘
```

### 5.2. Các quy tắc "Vàng" khi lập trình phần mềm

1. 🔒 **Bảo mật Credentials:** Không lưu trực tiếp `username`/`password` trong mã nguồn frontend. Lưu giữ an toàn trong biến môi trường (`.env`) hoặc Secret Manager ở backend.
2. ⏱ **Quản lý Token tự động (Buffer Refresh):** Trước khi gọi API 4 hoặc API 5, hãy kiểm tra thời gian hết hạn (`Exp`). Nếu token sắp hết hạn (còn dưới 60 giây), tự động thực thi API 2 để lấy `AccessToken` mới.
3. 💾 **Tối ưu Cache:** Các API danh mục tĩnh (6, 7, 8, 9, 10, 11) gần như không thay đổi. Hãy tải 1 lần khi khởi động ứng dụng và cache lại trong RAM/Storage thay vì gọi lặp lại liên tục.
4. 🧹 **Giải phóng phiên làm việc:** Luôn tự động gọi API 3 (Revoke Token) khi đóng ứng dụng hoặc đăng xuất để đảm bảo an toàn thông tin.
5. 🔀 **Xử lý linh hoạt Địa giới hành chính:** Trường `maTT` và `maPX` trong API 5 không bắt buộc. Nếu dữ liệu OCR từ giấy tờ cũ không tra cứu được mã tương ứng trong danh mục API 8, bạn chỉ cần bỏ trống `maTT`/`maPX` và truyền toàn bộ chuỗi địa chỉ vào trường `diaChi`. API vẫn xử lý tiếp nhận thành công.
