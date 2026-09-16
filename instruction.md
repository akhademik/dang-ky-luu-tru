trong nội dung 'TRA CỨU DANH MỤC' vẫn còn các nội dung mà tôi không dùng hãy loại bỏ nó:

- khi khách có quốc tịch là việt nam thì trên sheet, quốc tịch là VNM, thì hãy ghép các địa chỉ trên sheet lại theo dạng ""diaChi": "Tổ 16, Thịnh Liệt, Hoàng Mai, Hà Nội"," để bỏ vào api khi đăng ký, khi pull du lieu ve hay hien thi cac truong nhap lieu BAT BUOC (REQUIRED) TREN giao dien frontend, ko sua, chỉ khi nào click edit thì mói cho phép sửa thôi, và cho tickbock 1 hoac all de push dang ky cho khach nhu api ben duoi

2. API Demo có cho đăng ký thử không?HOÀN TOÀN CÓ THỂ ĐĂNG KÝ THỬ. Môi trường Demo tại [https://api-kbtt.ai-vlab.com](https://api-kbtt.ai-vlab.com) mở đầy đủ cả 2 endpoint tiếp nhận khai báo:API 4: Khai báo tạm trú cho người nước ngoài (/client-service/kbtt/kbtt-3th) API 5: Khai báo lưu trú cho người Việt Nam (/client-service/kbtt-vn/kbtt-3th) 3. Làm sao để push lên đăng ký thử? (Quy trình 2 bước chi tiết)Để push dữ liệu lên server Demo thành công, bạn phải tuân thủ luồng xác thực OAuth 2.0 gồm 2 bước: Bước 1: Lấy AccessToken từ API Demo (API 1)Gọi request lấy Token bằng tài khoản demo được cấp sẵn trong tài liệu (demo*tich_hop / Demo@#$12345): Bashcurl --location 'https://api-kbtt.ai-vlab.com/authorization-service/oauth/token' \
    --header 'Authorization: Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ' \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'username=demo_tich_hop' \
    --data-urlencode 'password=Demo@#$12345' \
    --data-urlencode 'grant-type=api_cslt'
   Kết quả trả về sẽ có chuỗi AccessToken trong trường data.AccessToken. Bước 2: Push dữ liệu đăng kýTrường hợp A: Khách Nước Ngoài (Gọi API 4)Endpoint: [https://api-kbtt.ai-vlab.com/client-service/kbtt/kbtt-3th](https://api-kbtt.ai-vlab.com/client-service/kbtt/kbtt-3th) Header: Authorization: Bearer <AccessToken*ở*Bước_1> Lưu ý nghiệp vụ bắt buộc:ngayDenCsltStr phải là ngày hôm nay hoặc hôm qua. thoiHanTamTruStr phải lớn hơn hoặc bằng ngày hiện tại. Bashcurl --location 'https://api-kbtt.ai-vlab.com/client-service/kbtt/kbtt-3th' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer <AccessToken_cua_ban>' \
    --data '[
   {
   "hoTen": "GRACHEV NIKITA",
   "quocTich": "RUS",
   "soHoChieu": "552165656",
   "gioiTinh": "M",
   "loaiNgayThangNamSinh": "D",
   "ngayThangNamSinhStr": "1995-11-25",
   "ngayDenCsltStr": "2026-09-16 12:00:00",
   "ngayDiDuKienStr": "2026-09-19 12:00:00",
   "soPhong": "P.09",
   "anhHoChieuB64": "",
   "thoiHanTamTruStr": "2026-12-31 23:59:59"
   }
   ]'
   Trường hợp B: Khách Việt Nam (Gọi API 5)Endpoint: [https://api-kbtt.ai-vlab.com/client-service/kbtt-vn/kbtt-3th](https://api-kbtt.ai-vlab.com/client-service/kbtt-vn/kbtt-3th) Header: Authorization: Bearer <AccessToken*ở_Bước_1> Bashcurl --location 'https://api-kbtt.ai-vlab.com/client-service/kbtt-vn/kbtt-3th' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer <AccessToken_cua_ban>' \
    --data '[
   {
   "hoTen": "BUI TAN DUNG",
   "gioiTinh": "M",
   "soDienThoai": "0987654321",
   "ngayThangNamSinhStr": "2001-10-16",
   "noiCuTru": 1,
   "maTT": "",
   "maPX": "",
   "diaChi": "Tổ Dân Phố 5, Krông Năng, Krông Năng, Đắk Lắk",
   "ngayDenCsltStr": "2026-09-16 12:00:00",
   "ngayDiDuKienStr": "2026-09-18 12:00:00",
   "soPhong": "P.06",
   "lyDoCuTru": 1,
   "loaiGiayTo": 1,
   "soGiayTo": "066201008768",
   "anhTruocB64": "",
   "anhSauB64": ""
   }
   ]'
   Kết quả nhận được:Nếu thành công: Server trả về HTTP 200 { "code": "200", "message": "Thành công", "data": null }. Nếu dữ liệu sai (ví dụ ngày đến là quá khứ nhiều ngày): Server trả về HTTP 400 kèm câu thông báo lỗi chi tiết để bạn chỉnh sửa.
