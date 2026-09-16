Tôi đã xây dựng xong các module core backend/pipeline (config.js, catalogManager.js, tokenManager.js, dataTransformer.js, kbttClient.js, syncPipeline.js) cho hệ thống tích hợp API Khai báo tạm trú & Thông báo lưu trú KBTT v1.4.

BÂY GIỜ HÃY THỰC HIỆN TIẾP:
Xây dựng một giao diện web điều khiển kiểm thử (Test Cockpit UI) bằng Vanilla HTML/CSS/JavaScript (có thể đóng gói thành 1 file index.html hoặc tách file rõ ràng theo ESM) để kết nối trực tiếp với các module hiện có.

---

### CÁC KHỐI CHỨC NĂNG BẮT BUỘC TRÊN GIAO DIỆN:

1. KHỐI QUẢN LÝ TOKEN (OAuth 2.0 Status Bar):
   - Hiển thị Base URL hiện tại (Demo: https://api-kbtt.ai-vlab.com).
   - Hiển thị trạng thái Token: Đang hoạt động / Chưa đăng nhập. Nếu có token, hiển thị số giây còn lại trước khi hết hạn (cập nhật mỗi giây).
   - Nút hành động:
     - [Đăng nhập lấy Token] (gọi API 1)
     - [Làm mới Token] (gọi API 2)
     - [Thu hồi Token] (gọi API 3)

2. KHỐI NẠP DỮ LIỆU TỪ GOOGLE SHEETS / MOCK DATA:
   - Cho phép nạp 6 dòng dữ liệu mẫu (5 khách Việt Nam dùng CCCD + 1 khách Nga dùng Hộ chiếu theo đúng format bảng tính).
   - Hoặc cung cấp ô nhập Webhook / URL JSON Google Sheet để fetch dữ liệu thực.
   - Nút [Nạp lại dữ liệu].

3. BẢNG DỮ LIỆU ĐIỀU KHIỂN (Interactive Data Table):
   - Hiển thị các cột: Chọn (Checkbox), STT, Họ tên, Quốc tịch, Loại giấy tờ, Số giấy tờ, Phòng, Thời gian lưu trú, Phân luồng API, Trạng thái.
   - Phân loại trực quan (Badges):
     - Hiển thị Badge "VN (API 5)" nếu là công dân Việt Nam.
     - Hiển thị Badge "NNN (API 4)" nếu là khách nước ngoài.
   - Cột Trạng thái: Có icon/màu sắc (Chưa gửi, Hợp lệ, Lỗi định dạng, Đã gửi thành công, Thất bại).
   - Thao tác trên từng dòng:
     - Nút [Xem JSON]: Mở modal hiển thị payload đã được Module 2 chuẩn hóa (định dạng ngày YYYY-MM-DD, mã tỉnh/xã, Base64 ảnh giả lập).
     - Nút [Gửi lẻ dòng này]: Thực hiện gửi riêng dòng được chọn lên API KBTT.

4. KHỐI ĐỒNG BỘ HÀNG LOẠT (Batch Sync Action):
   - Nút [Kiểm tra & Chuẩn hóa toàn bộ]: Chạy validator toàn bộ bảng, thông báo lỗi nếu có dòng sai định dạng (CCCD không đủ 12 số, sai ngày đến/đi...).
   - Nút [Gửi toàn bộ dòng hợp lệ]: Tự động nhóm khách VN để gửi API 5 và nhóm khách NNN để gửi API 4; cập nhật thanh tiến độ (Progress bar).

5. KHỐI CONSOLE LOG & INSPECTOR:
   - Cửa sổ log theo phong cách terminal/dark-theme ở phía dưới màn hình.
   - In chi tiết log từng bước:
     - Thời gian
     - Endpoint vừa gọi (POST /client-service/kbtt-vn/kbtt-3th hoặc /client-service/kbtt/kbtt-3th)
     - Mã phản hồi HTTP & Response JSON nhận về (code: 200 / code: 400 kèm message lỗi).
   - Nút [Xóa Log].

---

### YÊU CẦU KỸ THUẬT VÀ PHONG CÁCH VIẾT CODE:

1. Giao diện sạch sẽ, hiện đại (dùng CSS Flexbox/Grid, màu sắc tương phản rõ ràng, responsive).
2. Không sử dụng framework nặng; ưu tiên Vanilla JS module hoặc kết nối thẳng với các file module JS đã tạo.
3. Tuân thủ tiêu chuẩn code sạch (Clean Code), xử lý lỗi mạng bằng try/catch đầy đủ và hiển thị thông báo rõ ràng cho người dùng.
4. Đảm bảo toàn bộ logic mapping danh mục và validation từ dataTransformer.js được tận dụng tối đa.

Hãy viết mã nguồn đầy đủ kèm hướng dẫn chạy thử nghiệm!
