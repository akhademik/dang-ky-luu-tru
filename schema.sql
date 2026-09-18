CREATE TABLE IF NOT EXISTS guests (
	id TEXT PRIMARY KEY,
	loai_giay_to TEXT NOT NULL DEFAULT 'CCCD',
	so_giay_to TEXT NOT NULL,
	ho_ten TEXT NOT NULL,
	ngay_sinh TEXT,
	gioi_tinh TEXT,
	quoc_tich TEXT NOT NULL DEFAULT 'VNM',
	dia_chi_chi_tiet TEXT,
	phuong_xa TEXT,
	quan_huyen TEXT,
	tinh_thanh TEXT,
	created_at TEXT DEFAULT (datetime('now', '+7 hours')),
	updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_so_giay_to ON guests (so_giay_to, quoc_tich);
CREATE INDEX IF NOT EXISTS idx_guests_ho_ten ON guests (ho_ten);

CREATE TABLE IF NOT EXISTS stays (
	id TEXT PRIMARY KEY,
	guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
	so_phong TEXT NOT NULL,
	ngay_den TEXT NOT NULL,
	ngay_di_du_kien TEXT,
	ngay_di_thuc_te TEXT,
	thoi_han_thi_thuc TEXT,
	ly_do_luu_tru INTEGER DEFAULT 1,
	status TEXT NOT NULL DEFAULT 'READY_TO_SYNC',
	ma_ho_so_kbtt TEXT,
	ghi_chu TEXT,
	source_sheet_tab TEXT,
	source_sheet_row INTEGER,
	created_at TEXT DEFAULT (datetime('now', '+7 hours')),
	updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_stays_guest_id ON stays (guest_id);
CREATE INDEX IF NOT EXISTS idx_stays_so_phong ON stays (so_phong);
CREATE INDEX IF NOT EXISTS idx_stays_status ON stays (status);
CREATE INDEX IF NOT EXISTS idx_stays_status_ngay_di ON stays (status, ngay_di_du_kien);
CREATE INDEX IF NOT EXISTS idx_stays_ngay_den ON stays (ngay_den);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stays_active_guest ON stays (guest_id) WHERE status != 'CHECKED_OUT';

CREATE TABLE IF NOT EXISTS kbtt_logs (
	id TEXT PRIMARY KEY,
	stay_id TEXT REFERENCES stays(id) ON DELETE SET NULL,
	api_endpoint TEXT NOT NULL,
	guest_name TEXT,
	so_giay_to TEXT,
	so_phong TEXT,
	request_payload TEXT,
	response_payload TEXT,
	http_status INTEGER,
	code TEXT,
	is_success INTEGER NOT NULL DEFAULT 0,
	error_message TEXT,
	created_at TEXT DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_kbtt_logs_stay_id ON kbtt_logs (stay_id);
CREATE INDEX IF NOT EXISTS idx_kbtt_logs_created_at ON kbtt_logs (created_at);
