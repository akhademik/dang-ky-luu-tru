/**
 * Centralized GMT+7 Date & Time Service for Dang Ky Luu Tru
 * Enforces Asia/Ho_Chi_Minh (UTC+7) timezone across all business operations,
 * database records, OCR ingestion, and BCA C06 payload formatting.
 */

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Lấy đối tượng Date tương ứng với thời điểm hiện tại theo múi giờ GMT+7
 */
function getNowGmt7Date(): Date {
	return new Date(Date.now() + GMT7_OFFSET_MS);
}

/**
 * Lấy chuỗi thời gian hiện tại chuẩn ISO UTC representation của GMT+7
 */
function getNowGmt7IsoString(): string {
	return new Date(Date.now() + GMT7_OFFSET_MS).toISOString();
}

/**
 * Lấy ngày hiện tại theo chuẩn YYYY-MM-DD (GMT+7)
 */
export function getNowGmt7DateString(): string {
	return getNowGmt7IsoString().substring(0, 10);
}

/**
 * Lấy thời gian hiện tại theo chuẩn YYYY-MM-DD HH:mm:ss (GMT+7)
 */
export function getNowGmt7DateTimeString(): string {
	return getNowGmt7IsoString().replace("T", " ").substring(0, 19);
}

/**
 * Chuyển đổi Date / timestamp / string sang YYYY-MM-DD (GMT+7)
 */
export function formatDateToGmt7(val?: Date | string | number | null): string {
	if (!val) return getNowGmt7DateString();
	if (typeof val === "string") {
		const parsed = parseToGmt7DateString(val);
		if (parsed) return parsed;
	}
	const date = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(date.getTime())) return getNowGmt7DateString();
	const gmt7 = new Date(date.getTime() + GMT7_OFFSET_MS);
	return gmt7.toISOString().substring(0, 10);
}

/**
 * Chuyển đổi Date / timestamp / string sang YYYY-MM-DD HH:mm:ss (GMT+7)
 */
export function formatDateTimeToGmt7(
	val?: Date | string | number | null,
): string {
	if (!val) return getNowGmt7DateTimeString();
	if (typeof val === "string") {
		const parsed = parseToGmt7DateTimeString(val);
		if (parsed) return parsed;
	}
	const date = val instanceof Date ? val : new Date(val);
	if (Number.isNaN(date.getTime())) return getNowGmt7DateTimeString();
	const gmt7 = new Date(date.getTime() + GMT7_OFFSET_MS);
	return gmt7.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Phân tích các định dạng ngày linh hoạt (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM/YY) sang YYYY-MM-DD
 */
export function parseToGmt7DateString(val?: string | null): string | null {
	if (!val) return null;
	const str = String(val).trim();
	if (!str) return null;

	// 1. Chuẩn YYYY-MM-DD hoặc YYYY-MM-DD HH:mm:ss
	const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
	if (isoMatch) {
		const year = isoMatch[1];
		const month = isoMatch[2].padStart(2, "0");
		const day = isoMatch[3].padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	// 2. Chuẩn DD/MM/YYYY hoặc DD-MM-YYYY
	const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
	if (dmyMatch) {
		const day = dmyMatch[1].padStart(2, "0");
		const month = dmyMatch[2].padStart(2, "0");
		const year = dmyMatch[3];
		return `${year}-${month}-${day}`;
	}

	// 3. Chuẩn DD/MM/YY hoặc DD-MM-YY (ví dụ tab name 17-09-26 -> 2026-09-17)
	const dmyShortMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
	if (dmyShortMatch) {
		const day = dmyShortMatch[1].padStart(2, "0");
		const month = dmyShortMatch[2].padStart(2, "0");
		const shortYear = parseInt(dmyShortMatch[3], 10);
		const fullYear = shortYear >= 50 ? `19${shortYear}` : `20${shortYear}`;
		return `${fullYear}-${month}-${day}`;
	}

	return null;
}

/**
 * Phân tích các định dạng ngày giờ sang YYYY-MM-DD HH:mm:ss (GMT+7)
 */
export function parseToGmt7DateTimeString(val?: string | null): string | null {
	if (!val) return null;
	const str = String(val).trim();
	if (!str) return null;

	const datePart = parseToGmt7DateString(str);
	if (!datePart) return null;

	// Tìm phần giờ nếu có
	const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
	if (timeMatch) {
		const hours = timeMatch[1].padStart(2, "0");
		const minutes = timeMatch[2].padStart(2, "0");
		const seconds = (timeMatch[3] || "00").padStart(2, "0");
		return `${datePart} ${hours}:${minutes}:${seconds}`;
	}

	// Mặc định 12:00:00 cho giờ checkout / 14:00:00 cho giờ checkin nếu không có giờ
	return `${datePart} 12:00:00`;
}

/**
 * Kiểm tra xem thời điểm hiện tại trong ngày (GMT+7) đã qua 12:00:00 trưa hay chưa
 */
function isPastNoonGmt7(): boolean {
	const gmt7Date = getNowGmt7Date();
	const hours = gmt7Date.getUTCHours();
	return hours >= 12;
}

/**
 * Kiểm tra xem thời điểm hiện tại (GMT+7) đã chạm hoặc vượt qua 12:00:00 trưa của ngày đi dự kiến hay chưa
 * Quy tắc C06 BCA: Sau 12:00:00 ngày đi dự kiến, hệ thống BCA tự động checkout -> Không gửi API 12.
 */
export function isSameOrPastCheckoutTimeGmt7(
	ngayDiDuKienStr?: string | null,
): boolean {
	if (!ngayDiDuKienStr) return false;
	const datePart = parseToGmt7DateString(ngayDiDuKienStr);
	if (!datePart) return false;

	const checkoutDateTimeStr = `${datePart} 12:00:00`;
	const currentDateTimeStr = getNowGmt7DateTimeString();

	return currentDateTimeStr >= checkoutDateTimeStr;
}

/**
 * Kiểm tra định dạng ngày chuẩn YYYY-MM-DD
 */
export function isValidIsoDate(str?: string | null): boolean {
	if (!str) return false;
	return /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
}

/**
 * Kiểm tra định dạng ngày giờ chuẩn YYYY-MM-DD HH:mm:ss
 */
export function isValidIsoDateTime(str?: string | null): boolean {
	if (!str) return false;
	return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str.trim());
}
