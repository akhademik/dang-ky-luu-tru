-- Migration: 0002_update_schema.sql
-- Description: Cập nhật schema: Thêm thoi_han_thi_thuc vào stays, loại bỏ so_dien_thoai và ly_do_chi_tiet

ALTER TABLE stays ADD COLUMN thoi_han_thi_thuc TEXT;
