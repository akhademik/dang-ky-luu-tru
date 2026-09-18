export interface Guest {
	id: string;
	loai_giay_to: string;
	so_giay_to: string;
	ho_ten: string;
	ngay_sinh?: string;
	gioi_tinh?: string;
	quoc_tich: string;
	dia_chi_chi_tiet?: string;
	phuong_xa?: string;
	quan_huyen?: string;
	tinh_thanh?: string;
	created_at?: string;
	updated_at?: string;
}

export type StayStatus =
	| "PENDING_VALIDATION"
	| "READY_TO_SYNC"
	| "NOT_CHECKED_IN"
	| "SYNCED_KBTT"
	| "CHECKED_IN"
	| "EXTENDED"
	| "CHECKED_OUT"
	| "ERROR"
	| "CANCELLED";

export interface Stay {
	id: string;
	guest_id: string;
	so_phong: string;
	ngay_den: string;
	ngay_di_du_kien?: string;
	ngay_di_thuc_te?: string;
	thoi_han_thi_thuc?: string;
	ly_do_luu_tru?: number;
	status: StayStatus;
	ma_ho_so_kbtt?: string;
	ghi_chu?: string;
	source_sheet_tab?: string;
	source_sheet_row?: number;
	created_at?: string;
	updated_at?: string;
}

export interface StayDetail extends Stay {
	loai_giay_to: string;
	so_giay_to: string;
	ho_ten: string;
	ngay_sinh?: string;
	gioi_tinh?: string;
	quoc_tich: string;
	dia_chi_chi_tiet?: string;
	phuong_xa?: string;
	quan_huyen?: string;
	tinh_thanh?: string;
	thoi_han_thi_thuc?: string;
}

export interface KbttLog {
	id: string;
	stay_id?: string;
	api_endpoint: string;
	guest_name?: string;
	so_giay_to?: string;
	so_phong?: string;
	request_payload?: string;
	response_payload?: string;
	http_status?: number;
	code?: string;
	is_success: number;
	error_message?: string;
	created_at?: string;
}

export interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatement;
	exec(query: string): Promise<unknown>;
}

export interface D1PreparedStatement {
	bind(...params: unknown[]): D1PreparedStatement;
	all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<{
		success: boolean;
		meta: { changes: number; last_row_id?: number };
	}>;
}

export interface RawOcrRow {
	[key: string]: string | number | undefined;
}

export interface CompletenessResult {
	isComplete: boolean;
	missingFields: string[];
	fieldStatus: Record<
		string,
		{ valid: boolean; value: unknown; error?: string }
	>;
}

export interface TransformedRowResult {
	branch: "VN" | "FOREIGN";
	payload: Record<string, unknown>;
	completeness: CompletenessResult;
	validationError?: string;
	originalRow: RawOcrRow;
}

export interface IngestResultItem {
	guestId: string;
	stayId: string;
	hoTen: string;
	soPhong: string;
	status: string;
	isNew: boolean;
}

export interface IngestResult {
	success: boolean;
	total: number;
	created: number;
	updated: number;
	items: IngestResultItem[];
	errors: string[];
}

export interface TabInfo {
	name: string;
	gid: string;
	dateStr?: string | null;
	isDateTab?: boolean;
	isDefault?: boolean;
}

export interface SyncResult {
	step: string;
	success: boolean;
	status: string;
	message: string;
	row?: RawOcrRow;
	branch?: "VN" | "FOREIGN";
	payload?: Record<string, unknown>;
	response?: unknown;
}
