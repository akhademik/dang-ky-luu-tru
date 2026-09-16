# 1. Danh mục Quốc tịch (API 6)

curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/dm-qt/3th/get-all" -o quoc_tich.json

# 2. Danh mục Tỉnh / Thành phố (API 7)

curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/dm-tinh-tp/get-all" -o tinh_tp.json

# 3. Danh mục Phường / Xã theo Tỉnh (API 8 - ví dụ Hà Nội maTT = 201)

curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/dm-phuong-xa?trucThuocTinh=201" -o phuong_xa_201.json

# 4. Danh mục Lý do cư trú (API 9)

curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/ly-do-cu-tru/get-all" -o ly_do_cu_tru.json

# 5. Danh mục Loại giấy tờ (API 10)

curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/loai-giay-to/get-all" -o loai_giay_to.json

# 6. Danh mục Nơi cư trú (API 11)

curl -s "https://api-kbtt.ai-vlab.com/cms-backend/public/noi-cu-tru/get-all" -o noi_cu_tru.json
