import type { StayStatus } from "../types/index.js";
import { parseToGmt7DateString } from "./time.js";

/**
 * Ma trận kiểm soát chuyển đổi trạng thái hợp lệ của hồ sơ lưu trú
 */
const ALLOWED_STATUS_TRANSITIONS: Record<StayStatus, StayStatus[]> = {
	PENDING_VALIDATION: ["READY_TO_SYNC", "ERROR", "CANCELLED"],
	READY_TO_SYNC: [
		"SYNCED_KBTT",
		"CHECKED_IN",
		"EXTENDED",
		"CHECKED_OUT",
		"CANCELLED",
		"ERROR",
	],
	NOT_CHECKED_IN: [
		"SYNCED_KBTT",
		"CHECKED_IN",
		"EXTENDED",
		"CHECKED_OUT",
		"CANCELLED",
	],
	SYNCED_KBTT: ["EXTENDED", "CHECKED_OUT", "ERROR"],
	CHECKED_IN: ["EXTENDED", "CHECKED_OUT"],
	EXTENDED: ["EXTENDED", "CHECKED_OUT", "ERROR"],
	CHECKED_OUT: ["READY_TO_SYNC"], // Tái khai báo (re-register) tạo bản ghi lưu trú mới
	ERROR: ["READY_TO_SYNC", "CANCELLED"],
	CANCELLED: ["READY_TO_SYNC"],
};

/**
 * Kiểm tra xem việc chuyển đổi trạng thái có hợp lệ theo State Machine hay không
 */
export function isValidStayStatusTransition(
	currentStatus: StayStatus,
	targetStatus: StayStatus,
): boolean {
	if (currentStatus === targetStatus) return true;
	const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
	return allowed.includes(targetStatus);
}

/**
 * Ném lỗi nếu chuyển đổi trạng thái vi phạm quy chuẩn State Machine
 */
export function assertValidTransition(
	currentStatus: StayStatus,
	targetStatus: StayStatus,
): void {
	if (!isValidStayStatusTransition(currentStatus, targetStatus)) {
		throw new Error(
			`Chuyển đổi trạng thái không hợp lệ: Không thể chuyển từ '${currentStatus}' sang '${targetStatus}'.`,
		);
	}
}

/**
 * Kiểm tra tính hợp lệ của CCCD (12 số)
 */
export function isValidCccd(soGiayTo?: string | null): boolean {
	if (!soGiayTo) return false;
	const clean = soGiayTo.replace(/\s+/g, "");
	return /^\d{12}$/.test(clean);
}

/**
 * Kiểm tra tính hợp lệ của Hộ chiếu (Passport - chữ cái đầu + 6-8 chữ số)
 */
export function isValidPassport(soGiayTo?: string | null): boolean {
	if (!soGiayTo) return false;
	const clean = soGiayTo.replace(/\s+/g, "").toUpperCase();
	return /^[A-Z0-9]{6,12}$/.test(clean);
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * Validate input cho API Đăng ký lưu trú BCA (/api/stays/register)
 */
export function validateStayRegistrationInput(body: unknown): ValidationResult {
	const errors: string[] = [];
	if (!body || typeof body !== "object") {
		return { isValid: false, errors: ["Payload đăng ký không hợp lệ"] };
	}

	const data = body as Record<string, unknown>;
	const stays = Array.isArray(data.stays) ? data.stays : [data];

	if (stays.length === 0) {
		errors.push("Danh sách lượt lưu trú rỗng");
	}

	for (let i = 0; i < stays.length; i++) {
		const s = stays[i] as Record<string, unknown>;
		const prefix = `Lượt lưu trú #${i + 1}`;

		if (!s.ho_ten || !String(s.ho_ten).trim()) {
			errors.push(`${prefix}: Thiếu họ tên khách`);
		}
		if (!s.so_giay_to || !String(s.so_giay_to).trim()) {
			errors.push(`${prefix}: Thiếu số giấy tờ (CCCD / Hộ chiếu)`);
		}
		if (!s.so_phong || !String(s.so_phong).trim()) {
			errors.push(`${prefix}: Thiếu số phòng`);
		}
		if (!s.ngay_den || !String(s.ngay_den).trim()) {
			errors.push(`${prefix}: Thiếu ngày đến`);
		}
		if (!s.ngay_di_du_kien || !String(s.ngay_di_du_kien).trim()) {
			errors.push(`${prefix}: Thiếu ngày đi dự kiến`);
		}
	}

	return { isValid: errors.length === 0, errors };
}

/**
 * Validate input cho API Gia hạn lưu trú (/api/stays/extend)
 */
export function validateStayExtensionInput(body: unknown): ValidationResult {
	const errors: string[] = [];
	if (!body || typeof body !== "object") {
		return { isValid: false, errors: ["Payload gia hạn không hợp lệ"] };
	}

	const data = body as Record<string, unknown>;
	if (!data.id && !data.stayId) {
		errors.push("Thiếu mã ID hồ sơ lưu trú cần gia hạn");
	}
	if (!data.newNgayDi && !data.ngay_di_du_kien) {
		errors.push("Thiếu ngày đi dự kiến mới");
	} else {
		const newDate = String(data.newNgayDi || data.ngay_di_du_kien);
		if (!parseToGmt7DateString(newDate)) {
			errors.push("Định dạng ngày đi mới không hợp lệ");
		}
	}

	return { isValid: errors.length === 0, errors };
}

/**
 * Validate input cho API Trả phòng (/api/stays/checkout)
 */
export function validateStayCheckoutInput(body: unknown): ValidationResult {
	const errors: string[] = [];
	if (!body || typeof body !== "object") {
		return { isValid: false, errors: ["Payload checkout không hợp lệ"] };
	}

	const data = body as Record<string, unknown>;
	if (!data.id && !data.stayId) {
		errors.push("Thiếu mã ID hồ sơ lưu trú cần trả phòng");
	}

	return { isValid: errors.length === 0, errors };
}

/**
 * Validate input cho API Tái khai báo (/api/stays/re-register)
 */
export function validateStayReRegisterInput(body: unknown): ValidationResult {
	const errors: string[] = [];
	if (!body || typeof body !== "object") {
		return { isValid: false, errors: ["Payload tái khai báo không hợp lệ"] };
	}

	const data = body as Record<string, unknown>;
	if (!data.id && !data.stayId) {
		errors.push("Thiếu mã ID hồ sơ lưu trú cần tái khai báo");
	}

	return { isValid: errors.length === 0, errors };
}
