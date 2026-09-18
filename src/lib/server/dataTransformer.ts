import type {
	CompletenessResult,
	RawOcrRow,
	TransformedRowResult,
} from "../types/index.js";
import { type CatalogManager, catalogManager } from "./catalogManager.js";

export type { CompletenessResult, RawOcrRow, TransformedRowResult };

export class DataTransformer {
	private catalogManager: CatalogManager;

	public constructor(catalog: CatalogManager = catalogManager) {
		this.catalogManager = catalog;
	}

	public cleanRoomNumber(roomRaw: unknown): string {
		return DataTransformer.cleanRoomNumber(roomRaw);
	}

	public static cleanRoomNumber(roomRaw: unknown): string {
		const raw = String(roomRaw ?? "").trim();
		if (!raw) return "";
		const matches = raw.match(/\d+/g);
		if (!matches || matches.length === 0) return "";
		for (const m of matches) {
			const num = parseInt(m, 10);
			if (num >= 1 && num <= 9) {
				return String(num);
			}
		}
		return "";
	}

	public formatDateOnly(dateRaw: unknown): string {
		return DataTransformer.formatDateOnly(dateRaw);
	}

	public static parseDateTime(dateRaw: unknown): {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
		date: Date;
	} | null {
		if (!dateRaw) return null;
		const str = String(dateRaw).trim();
		if (!str) return null;

		// Handle UTC ISO strings with Z or explicit offset -> convert to GMT+7 (Asia/Ho_Chi_Minh)
		if (str.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(str)) {
			const parsedUtc = new Date(str);
			if (!Number.isNaN(parsedUtc.getTime())) {
				const vnMillis = parsedUtc.getTime() + 7 * 3600 * 1000;
				const vnDate = new Date(vnMillis);
				return {
					year: vnDate.getUTCFullYear(),
					month: vnDate.getUTCMonth() + 1,
					day: vnDate.getUTCDate(),
					hour: vnDate.getUTCHours(),
					minute: vnDate.getUTCMinutes(),
					second: vnDate.getUTCSeconds(),
					date: vnDate,
				};
			}
		}

		// Try DD/MM/YYYY or DD-MM-YYYY with optional time
		const dmyMatch = str.match(
			/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
		);
		if (dmyMatch) {
			const day = parseInt(dmyMatch[1], 10);
			const month = parseInt(dmyMatch[2], 10);
			const year = parseInt(dmyMatch[3], 10);
			const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
			const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
			const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
			const date = new Date(year, month - 1, day, hour, minute, second);
			if (
				!Number.isNaN(date.getTime()) &&
				date.getFullYear() === year &&
				date.getMonth() === month - 1 &&
				date.getDate() === day
			) {
				return { year, month, day, hour, minute, second, date };
			}
		}

		// Try YYYY-MM-DD or YYYY/MM/DD with optional time
		const ymdMatch = str.match(
			/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
		);
		if (ymdMatch) {
			const year = parseInt(ymdMatch[1], 10);
			const month = parseInt(ymdMatch[2], 10);
			const day = parseInt(ymdMatch[3], 10);
			const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
			const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
			const second = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
			const date = new Date(year, month - 1, day, hour, minute, second);
			if (
				!Number.isNaN(date.getTime()) &&
				date.getFullYear() === year &&
				date.getMonth() === month - 1 &&
				date.getDate() === day
			) {
				return { year, month, day, hour, minute, second, date };
			}
		}

		// Fallback standard Date
		const fallback = new Date(str.includes("T") ? str : str.replace(" ", "T"));
		if (!Number.isNaN(fallback.getTime())) {
			return {
				year: fallback.getFullYear(),
				month: fallback.getMonth() + 1,
				day: fallback.getDate(),
				hour: fallback.getHours(),
				minute: fallback.getMinutes(),
				second: fallback.getSeconds(),
				date: fallback,
			};
		}

		return null;
	}

	public static formatDateOnly(dateRaw: unknown): string {
		if (!dateRaw) return "";
		const parsed = DataTransformer.parseDateTime(dateRaw);
		if (parsed) {
			const y = parsed.year;
			const m = String(parsed.month).padStart(2, "0");
			const d = String(parsed.day).padStart(2, "0");
			return `${y}-${m}-${d}`;
		}
		const str = String(dateRaw).trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
			const parts = str.split("-").map((n) => parseInt(n, 10));
			if (
				parts[0] >= 1900 &&
				parts[0] <= 2100 &&
				parts[1] >= 1 &&
				parts[1] <= 12 &&
				parts[2] >= 1 &&
				parts[2] <= 31
			) {
				return str;
			}
		}
		return "";
	}

	public normalizeGender(genderRaw: unknown): "M" | "F" {
		return DataTransformer.mapGender(genderRaw);
	}

	public static mapGender(genderRaw: unknown): "M" | "F" {
		if (!genderRaw) return "M";
		const str = String(genderRaw).trim().toLowerCase();
		if (["f", "female", "nữ", "nu", "gái", "w"].includes(str)) return "F";
		return "M";
	}

	public cleanDocNumber(docRaw: unknown): string {
		return DataTransformer.cleanDocNumber(docRaw);
	}

	public static cleanDocNumber(docRaw: unknown): string {
		if (!docRaw) return "";
		return String(docRaw)
			.replace(/[^a-zA-Z0-9]/g, "")
			.trim();
	}

	public static getVnNow(date = new Date()): {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
		dateStr: string;
		timeStr: string;
		fullStr: string;
	} {
		const vnMillis = date.getTime() + 7 * 3600 * 1000;
		const vnDate = new Date(vnMillis);
		const year = vnDate.getUTCFullYear();
		const month = vnDate.getUTCMonth() + 1;
		const day = vnDate.getUTCDate();
		const hour = vnDate.getUTCHours();
		const minute = vnDate.getUTCMinutes();
		const second = vnDate.getUTCSeconds();

		const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
		const fullStr = `${dateStr} ${timeStr}`;

		return {
			year,
			month,
			day,
			hour,
			minute,
			second,
			dateStr,
			timeStr,
			fullStr,
		};
	}

	public static isArrivalDateValid(
		dateStr: unknown,
		now = new Date(),
	): {
		valid: boolean;
		error?: string;
	} {
		if (!dateStr) return { valid: false, error: "Thiếu ngày đến" };
		const parsed = DataTransformer.parseDateTime(dateStr);
		if (!parsed) {
			return { valid: false, error: "Định dạng ngày đến không hợp lệ" };
		}

		const vnNow = DataTransformer.getVnNow(now);
		const arrivalDay = new Date(
			Date.UTC(parsed.year, parsed.month - 1, parsed.day),
		);
		const currentDay = new Date(
			Date.UTC(vnNow.year, vnNow.month - 1, vnNow.day),
		);
		const yesterday = new Date(
			Date.UTC(vnNow.year, vnNow.month - 1, vnNow.day - 1),
		);

		if (
			arrivalDay.getTime() === currentDay.getTime() ||
			arrivalDay.getTime() === yesterday.getTime()
		) {
			return { valid: true };
		}
		if (arrivalDay.getTime() < yesterday.getTime()) {
			return { valid: false, error: "Ngày đến ở quá khứ (> 1 ngày trước)" };
		}
		if (arrivalDay.getTime() > currentDay.getTime()) {
			return { valid: false, error: "Ngày đến ở tương lai" };
		}
		return { valid: true };
	}

	public static isGuestVN(row: RawOcrRow): boolean {
		const qt = String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "")
			.trim()
			.toLowerCase();
		const docType = String(
			row.loaiGiayTo || row["Loại giấy tờ"] || row["Tên giấy tờ"] || "",
		).toLowerCase();
		const docNum = String(
			row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"] || "",
		).replace(/\D/g, "");

		if (
			docType.includes("cccd") ||
			docType.includes("cmnd") ||
			docType.includes("căn cước")
		)
			return true;
		if (
			["vn", "vnm", "viet nam", "vietnam", "vvv", "vv", "v", "viet"].includes(
				qt,
			)
		)
			return true;
		if (
			qt &&
			!["vn", "vnm", "viet nam", "vietnam", "vvv", "vv", "v", "viet"].includes(
				qt,
			)
		)
			return false;
		if (docNum.length === 12 || docNum.length === 9) return true;
		return false;
	}

	public async checkRowCompleteness(
		row: RawOcrRow,
	): Promise<CompletenessResult> {
		return DataTransformer.checkCompleteness(row);
	}

	public static checkCompleteness(row: RawOcrRow): CompletenessResult {
		const isVN = DataTransformer.isGuestVN(row);
		const missing: string[] = [];
		const status: Record<
			string,
			{ valid: boolean; value: unknown; error?: string }
		> = {};

		const hoTen = String(row.hoTen || row["Họ tên"] || "").trim();
		status.hoTen = { valid: Boolean(hoTen), value: hoTen };
		if (!hoTen) missing.push("Họ tên");

		const ngaySinh = String(
			row.ngaySinh || row["D.O.B"] || row["Ngày sinh"] || "",
		).trim();
		const formattedDob = DataTransformer.formatDateOnly(ngaySinh);
		const dobValid = Boolean(
			formattedDob && /^\d{4}-\d{2}-\d{2}$/.test(formattedDob),
		);
		status.ngaySinh = {
			valid: dobValid,
			value: ngaySinh,
			error: !dobValid
				? `Ngày sinh không hợp lệ: "${ngaySinh}" (Cần định dạng DD/MM/YYYY, ví dụ: 24/09/1993)`
				: undefined,
		};
		if (!dobValid) missing.push(`Ngày sinh (${ngaySinh || "trống"})`);

		const cleanedRoom = DataTransformer.cleanRoomNumber(
			row.soPhong || row["Số phòng"],
		);
		const roomValid = Boolean(cleanedRoom);
		status.soPhong = {
			valid: roomValid,
			value: cleanedRoom,
			error: !roomValid ? "Số phòng không hợp lệ (Phải từ 1 đến 9)" : undefined,
		};
		if (!roomValid) missing.push("Số phòng (1-9)");

		const ngayDenRaw = row.ngayDen || row["(từ ngày)"] || row["Ngày đến"];
		const arrivalCheck = DataTransformer.isArrivalDateValid(ngayDenRaw);
		status.ngayDen = {
			valid: arrivalCheck.valid,
			value: ngayDenRaw,
			error: arrivalCheck.error,
		};
		if (!arrivalCheck.valid) missing.push(`Ngày đến (${arrivalCheck.error})`);

		const docTypeName = String(
			row.loaiGiayTo || row["Loại giấy tờ"] || (isVN ? "CCCD" : "Hộ chiếu"),
		).toLowerCase();
		const docNumRaw = String(
			row.soGiayTo ||
				row["Số giấy tờ"] ||
				row.soHoChieu ||
				row["Số CCCD"] ||
				row["Số hộ chiếu"] ||
				"",
		).trim();

		// Kiểm tra mã quốc tịch chuẩn Alpha-3 hoặc ngoại lệ D (Đức - Germany)
		const rawQt = String(
			row.quocTich ||
				row["Quốc tịch"] ||
				row["Quốc gia"] ||
				(isVN ? "VNM" : ""),
		).trim();
		const mappedQt = DataTransformer.mapQuocTich(rawQt);
		const isQtValid = Boolean(
			mappedQt &&
				(mappedQt === "D" ||
					(mappedQt.length === 3 && /^[A-Z]{3}$/.test(mappedQt))) &&
				(mappedQt === "VNM" ||
					mappedQt === "D" ||
					catalogManager.isValidQuocTichCode(mappedQt)),
		);
		status.quocTich = {
			valid: isQtValid,
			value: rawQt,
			error: !isQtValid
				? `Mã quốc tịch Alpha-3 không hợp lệ: "${rawQt}"`
				: undefined,
		};
		if (!isQtValid) missing.push("Mã quốc tịch Alpha-3 chuẩn");

		if (isVN) {
			if (docTypeName.includes("cccd") || docTypeName.includes("căn cước")) {
				const digits = docNumRaw.replace(/\D/g, "");
				const valid = digits.length === 12;
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Số CCCD phải đủ 12 số" : undefined,
				};
				if (!valid) missing.push("Số CCCD (12 chữ số)");
			} else if (docTypeName.includes("cmnd")) {
				const digits = docNumRaw.replace(/\D/g, "");
				const valid = digits.length === 9 || digits.length === 12;
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Số CMND phải 9 hoặc 12 số" : undefined,
				};
				if (!valid) missing.push("Số CMND (9 hoặc 12 số)");
			} else {
				const valid = Boolean(docNumRaw);
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Thiếu số giấy tờ" : undefined,
				};
				if (!valid) missing.push("Số giấy tờ");
			}
		} else {
			const cleanPassport = DataTransformer.cleanDocNumber(docNumRaw);
			const isPassportValid =
				cleanPassport.length >= 6 && cleanPassport.length <= 12;
			status.soHoChieu = {
				valid: isPassportValid,
				value: docNumRaw,
				error: !isPassportValid
					? "Số hộ chiếu phải từ 6 đến 12 ký tự"
					: undefined,
			};
			if (!isPassportValid) missing.push("Số hộ chiếu (6-12 ký tự)");

			const rawVisa = String(
				row.thoi_han_thi_thuc ||
					row.thoiHanTamTru ||
					row.thoiHanTamTruStr ||
					row["Thời hạn tạm trú"] ||
					row["Thời hạn thị thực"] ||
					"",
			).trim();
			const parsedVisa = rawVisa
				? DataTransformer.parseDateTime(rawVisa)
				: null;
			const isVisaValid = Boolean(parsedVisa);
			status.thoiHanThiThuc = {
				valid: isVisaValid,
				value: rawVisa,
				error: !rawVisa
					? "Thiếu thời hạn thị thực (bắt buộc đối với khách quốc tế)"
					: !isVisaValid
						? "Thời hạn thị thực không hợp lệ (DD/MM/YYYY)"
						: undefined,
			};
			if (!isVisaValid) missing.push("Thời hạn thị thực");
		}

		const isComplete = missing.length === 0;
		return { isComplete, missingFields: missing, fieldStatus: status };
	}

	public async transformRow(row: RawOcrRow): Promise<TransformedRowResult> {
		const completeness = DataTransformer.checkCompleteness(row);
		const isVN = DataTransformer.isGuestVN(row);
		const branch = isVN ? "VN" : "FOREIGN";

		let validationError: string | undefined;
		if (!completeness.isComplete) {
			validationError = `Dữ liệu chưa hoàn thiện: ${completeness.missingFields.join(", ")}`;
		}

		const payload = isVN
			? DataTransformer.transformToPayloadVn(row)
			: DataTransformer.transformToPayloadForeign(row);

		return {
			branch,
			payload,
			completeness,
			validationError,
			originalRow: row,
		};
	}

	public async transformBatch(rows: RawOcrRow[]) {
		const vnPayloads: Array<{ originalIndex: number; payload: unknown }> = [];
		const foreignPayloads: Array<{ originalIndex: number; payload: unknown }> =
			[];
		const completenessList: Array<{
			index: number;
			completeness: CompletenessResult;
		}> = [];

		rows.forEach((row, idx) => {
			const completeness = DataTransformer.checkCompleteness(row);
			completenessList.push({ index: idx, completeness });

			if (DataTransformer.isGuestVN(row)) {
				vnPayloads.push({
					originalIndex: idx,
					payload: DataTransformer.transformToPayloadVn(row),
				});
			} else {
				foreignPayloads.push({
					originalIndex: idx,
					payload: DataTransformer.transformToPayloadForeign(row),
				});
			}
		});

		return {
			success: true,
			totalRows: rows.length,
			vnPayloads,
			foreignPayloads,
			completenessList,
		};
	}

	public static transformToPayloadVn(row: RawOcrRow): Record<string, unknown> {
		const rawAddress = String(
			row.diaChi || row["Địa chỉ"] || row["Địa chỉ chi tiết"] || "",
		).trim();
		const tinhRaw = String(
			row.tinhTp || row.Tỉnh || row["Tỉnh/TP"] || "",
		).trim();
		const phuongXaRaw = String(row.phuongXa || row["Phường/Xã"] || "").trim();
		const quanHuyenRaw = String(
			row.quanHuyen || row["Quận/Huyện"] || "",
		).trim();

		let fullAddress = "";
		const loaiGiayToName = String(
			row.loaiGiayTo || row["Loại giấy tờ"] || "",
		).toLowerCase();
		if (
			!loaiGiayToName.includes("hộ chiếu") &&
			!loaiGiayToName.includes("passport")
		) {
			const addressParts = [
				rawAddress,
				phuongXaRaw,
				quanHuyenRaw,
				tinhRaw,
			].filter(Boolean);
			fullAddress =
				addressParts.length > 0 ? addressParts.join(", ") : rawAddress;
		}

		const cleanedRoom = DataTransformer.cleanRoomNumber(
			row.soPhong || row["Số phòng"],
		);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";

		return {
			hoTen: String(row.hoTen || row["Họ tên"] || "")
				.trim()
				.toUpperCase(),
			gioiTinh: DataTransformer.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: String(
				row.soDienThoai || row["Số điện thoại"] || "",
			).replace(/[^\d+]/g, ""),
			ngayThangNamSinhStr: DataTransformer.formatDateOnly(
				row.ngaySinh || row["D.O.B"] || row["Ngày sinh"],
			),
			noiCuTru: 1,
			maTT: "",
			maPX: "",
			diaChi: fullAddress,
			ngayDenCsltStr: DataTransformer.formatDateTime(
				row.ngayDen || row["(từ ngày)"] || row["Ngày đến"],
				"14:00:00",
			),
			ngayDiDuKienStr: DataTransformer.formatDateTime(
				row.ngayDi || row["(đến ngày)"] || row["Ngày đi"],
				"12:00:00",
			),
			soPhong: roomFormatted,
			lyDoCuTru: 1,
			lyDoChiTiet: "",
			loaiGiayTo: DataTransformer.mapLoaiGiayTo(
				row.loaiGiayTo || row["Loại giấy tờ"] || "CCCD",
			),
			soGiayTo: DataTransformer.cleanDocNumber(
				row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"],
			),
			anhTruocB64: "",
			anhSauB64: "",
			ghiChu: "",
		};
	}

	public static transformToPayloadForeign(
		row: RawOcrRow,
	): Record<string, unknown> {
		const cleanedRoom = DataTransformer.cleanRoomNumber(
			row.soPhong || row["Số phòng"],
		);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";

		const departureRaw =
			row.ngayDi || row["(đến ngày)"] || row.ngay_di_du_kien || row["Ngày đi"];

		const visaRaw =
			row.thoi_han_thi_thuc ||
			row.thoiHanTamTru ||
			row.thoiHanTamTruStr ||
			row["Thời hạn tạm trú"] ||
			row["Thời hạn thị thực"] ||
			"";

		return {
			hoTen: String(row.hoTen || row["Họ tên"] || "")
				.trim()
				.toUpperCase(),
			gioiTinh: DataTransformer.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: "",
			ngayThangNamSinhStr: DataTransformer.formatDateOnly(
				row.ngaySinh || row["D.O.B"] || row["Ngày sinh"],
			),
			loaiNgayThangNamSinh: "D",
			quocTich: DataTransformer.mapQuocTich(
				row.quocTich || row["Quốc tịch"] || row["Quốc gia"],
			),
			maQuocTich: DataTransformer.mapQuocTich(
				row.quocTich || row["Quốc tịch"] || row["Quốc gia"],
			),
			ngayDenCsltStr: DataTransformer.formatDateTime(
				row.ngayDen || row["(từ ngày)"] || row["Ngày đến"],
				"14:00:00",
			),
			ngayDiDuKienStr: DataTransformer.formatDateTime(departureRaw, "12:00:00"),
			soPhong: roomFormatted,
			thoiHanTamTruStr: visaRaw
				? DataTransformer.formatDateTime(visaRaw, "23:59:59")
				: "",
			loaiGiayTo: 4,
			soHoChieu: DataTransformer.cleanDocNumber(
				row.soHoChieu ||
					row.soGiayTo ||
					row["Số hộ chiếu"] ||
					row["Số giấy tờ"],
			),
			anhHoChieuB64: "",
			ghiChu: "",
		};
	}

	public static formatDateTime(
		dateRaw: unknown,
		defaultTime = "12:00:00",
	): string {
		if (!dateRaw) return "";
		const str = String(dateRaw).trim();
		if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) return str;

		const parsed = DataTransformer.parseDateTime(dateRaw);
		if (parsed) {
			const y = parsed.year;
			const m = String(parsed.month).padStart(2, "0");
			const d = String(parsed.day).padStart(2, "0");
			const hasTime = str.includes(":");
			if (hasTime) {
				const hh = String(parsed.hour).padStart(2, "0");
				const mm = String(parsed.minute).padStart(2, "0");
				const ss = String(parsed.second).padStart(2, "0");
				return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
			}
			return `${y}-${m}-${d} ${defaultTime}`;
		}
		return str;
	}

	public static mapLoaiGiayTo(val: unknown): number {
		return catalogManager.findLoaiGiayTo(String(val || ""));
	}

	public static mapQuocTich(val: unknown): string {
		if (!val) return "VNM";
		const clean = String(val).trim().toUpperCase();
		if (clean === "VNM" || clean === "VN" || clean === "VIETNAM") return "VNM";
		if (clean === "D" || clean === "DEU") return "D";

		const mapped = catalogManager.findQuocTich(clean);
		if (mapped) return mapped;
		if (
			(clean.length === 3 || clean === "D") &&
			catalogManager.isValidQuocTichCode(clean)
		) {
			return clean;
		}
		return clean;
	}

	public static resolveCheckInCheckOut(
		ngayDenRaw?: unknown,
		ngayDiRaw?: unknown,
		now = new Date(),
	): { ngayDen: string; ngayDi: string } {
		const vnNow = DataTransformer.getVnNow(now);

		let ngayDen: string;
		let checkInYear: number;
		let checkInMonth: number;
		let checkInDay: number;

		if (ngayDenRaw) {
			const parsed = DataTransformer.parseDateTime(ngayDenRaw);
			if (parsed) {
				const y = parsed.year;
				const m = String(parsed.month).padStart(2, "0");
				const d = String(parsed.day).padStart(2, "0");
				const rawStr = String(ngayDenRaw).trim();
				const hasTime = rawStr.includes(":");
				if (hasTime) {
					const hh = String(parsed.hour).padStart(2, "0");
					const mm = String(parsed.minute).padStart(2, "0");
					const ss = String(parsed.second).padStart(2, "0");
					ngayDen = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
				} else {
					ngayDen = `${y}-${m}-${d} ${vnNow.timeStr}`;
				}
				checkInYear = parsed.year;
				checkInMonth = parsed.month;
				checkInDay = parsed.day;
			} else {
				ngayDen = vnNow.fullStr;
				checkInYear = vnNow.year;
				checkInMonth = vnNow.month;
				checkInDay = vnNow.day;
			}
		} else {
			ngayDen = vnNow.fullStr;
			checkInYear = vnNow.year;
			checkInMonth = vnNow.month;
			checkInDay = vnNow.day;
		}

		let ngayDi: string;
		if (ngayDiRaw) {
			const parsedDi = DataTransformer.parseDateTime(ngayDiRaw);
			if (parsedDi) {
				const y = parsedDi.year;
				const m = String(parsedDi.month).padStart(2, "0");
				const d = String(parsedDi.day).padStart(2, "0");
				const rawStr = String(ngayDiRaw).trim();
				const hasCustomExplicitTime =
					rawStr.includes(":") &&
					!rawStr.includes("05:00:00") &&
					!rawStr.includes("00:00:00") &&
					!(parsedDi.hour === 5 && parsedDi.minute === 0) &&
					!(parsedDi.hour === 0 && parsedDi.minute === 0);
				if (hasCustomExplicitTime) {
					const hh = String(parsedDi.hour).padStart(2, "0");
					const mm = String(parsedDi.minute).padStart(2, "0");
					const ss = String(parsedDi.second).padStart(2, "0");
					ngayDi = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
				} else {
					ngayDi = `${y}-${m}-${d} 12:00:00`;
				}
			} else {
				const nextDay = new Date(
					Date.UTC(checkInYear, checkInMonth - 1, checkInDay + 1),
				);
				const y = nextDay.getUTCFullYear();
				const m = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
				const d = String(nextDay.getUTCDate()).padStart(2, "0");
				ngayDi = `${y}-${m}-${d} 12:00:00`;
			}
		} else {
			const nextDay = new Date(
				Date.UTC(checkInYear, checkInMonth - 1, checkInDay + 1),
			);
			const y = nextDay.getUTCFullYear();
			const m = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
			const d = String(nextDay.getUTCDate()).padStart(2, "0");
			ngayDi = `${y}-${m}-${d} 12:00:00`;
		}

		return { ngayDen, ngayDi };
	}

	public formatDateTime(dateRaw: unknown, defaultTime = "12:00:00"): string {
		return DataTransformer.formatDateTime(dateRaw, defaultTime);
	}
}
