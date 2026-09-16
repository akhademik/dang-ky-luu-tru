import { CatalogManager, catalogManager } from "./catalogManager.js";

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
				!isNaN(date.getTime()) &&
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
				!isNaN(date.getTime()) &&
				date.getFullYear() === year &&
				date.getMonth() === month - 1 &&
				date.getDate() === day
			) {
				return { year, month, day, hour, minute, second, date };
			}
		}

		// Fallback standard Date
		const fallback = new Date(str.includes("T") ? str : str.replace(" ", "T"));
		if (!isNaN(fallback.getTime())) {
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
		const parsed = this.parseDateTime(dateRaw);
		if (parsed) {
			const y = parsed.year;
			const m = String(parsed.month).padStart(2, "0");
			const d = String(parsed.day).padStart(2, "0");
			return `${y}-${m}-${d}`;
		}
		return String(dateRaw).trim();
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

	public static isArrivalDateValid(dateStr: unknown): {
		valid: boolean;
		error?: string;
	} {
		if (!dateStr) return { valid: false, error: "Thiếu ngày đến" };
		const parsed = this.parseDateTime(dateStr);
		if (!parsed) {
			return { valid: false, error: "Định dạng ngày đến không hợp lệ" };
		}

		const arrivalDay = new Date(parsed.year, parsed.month - 1, parsed.day);
		const today = new Date();
		const currentDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);
		const yesterday = new Date(currentDay);
		yesterday.setDate(yesterday.getDate() - 1);

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
		const isVN = this.isGuestVN(row);
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
		const dobValid = Boolean(ngaySinh && this.formatDateOnly(ngaySinh));
		status.ngaySinh = { valid: dobValid, value: ngaySinh };
		if (!dobValid) missing.push("Ngày sinh");

		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomValid = Boolean(cleanedRoom);
		status.soPhong = {
			valid: roomValid,
			value: cleanedRoom,
			error: !roomValid ? "Số phòng không hợp lệ (Phải từ 1 đến 9)" : undefined,
		};
		if (!roomValid) missing.push("Số phòng (1-9)");

		const ngayDenRaw = row.ngayDen || row["(từ ngày)"] || row["Ngày đến"];
		const arrivalCheck = this.isArrivalDateValid(ngayDenRaw);
		status.ngayDen = {
			valid: arrivalCheck.valid,
			value: ngayDenRaw,
			error: arrivalCheck.error,
		};
		if (!arrivalCheck.valid) missing.push(`Ngày đến (${arrivalCheck.error})`);

		const docTypeName = String(
			row.loaiGiayTo || row["Loại giấy tờ"] || (isVN ? "Thẻ CCCD" : "Hộ chiếu"),
		).toLowerCase();
		const docNumRaw = String(
			row.soGiayTo ||
				row["Số giấy tờ"] ||
				row.soHoChieu ||
				row["Số CCCD"] ||
				row["Số hộ chiếu"] ||
				"",
		).trim();

		// Kiểm tra mã quốc tịch chuẩn Alpha-3 (3 chữ cái ISO, ví dụ VNM, USA, CHN, RUS)
		const rawQt = String(
			row.quocTich ||
				row["Quốc tịch"] ||
				row["Quốc gia"] ||
				(isVN ? "VNM" : ""),
		).trim();
		const mappedQt = this.mapQuocTich(rawQt);
		const isQtValid = Boolean(
			mappedQt &&
				mappedQt.length === 3 &&
				/^[A-Z]{3}$/.test(mappedQt) &&
				(mappedQt === "VNM" || catalogManager.isValidQuocTichCode(mappedQt)),
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
			const cleanPassport = this.cleanDocNumber(docNumRaw);
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
			row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || "",
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

		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";

		return {
			hoTen: String(row.hoTen || row["Họ tên"] || "")
				.trim()
				.toUpperCase(),
			gioiTinh: this.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: String(
				row.soDienThoai || row["Số điện thoại"] || "",
			).replace(/[^\d+]/g, ""),
			ngayThangNamSinhStr: this.formatDateOnly(
				row.ngaySinh || row["D.O.B"] || row["Ngày sinh"],
			),
			noiCuTru: 1,
			maTT: "",
			maPX: "",
			diaChi: fullAddress,
			ngayDenCsltStr: this.formatDateTime(
				row.ngayDen || row["(từ ngày)"] || row["Ngày đến"],
				"14:00:00",
			),
			ngayDiDuKienStr: this.formatDateTime(
				row.ngayDi || row["(đến ngày)"] || row["Ngày đi"],
				"12:00:00",
			),
			soPhong: roomFormatted,
			lyDoCuTru: 1,
			lyDoChiTiet: "",
			loaiGiayTo: this.mapLoaiGiayTo(
				row.loaiGiayTo || row["Loại giấy tờ"] || "Thẻ CCCD",
			),
			soGiayTo: this.cleanDocNumber(
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
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";

		return {
			hoTen: String(row.hoTen || row["Họ tên"] || "")
				.trim()
				.toUpperCase(),
			gioiTinh: this.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: String(
				row.soDienThoai || row["Số điện thoại"] || "",
			).replace(/[^\d+]/g, ""),
			ngayThangNamSinhStr: this.formatDateOnly(
				row.ngaySinh || row["D.O.B"] || row["Ngày sinh"],
			),
			loaiNgayThangNamSinh: "D",
			quocTich: this.mapQuocTich(
				row.quocTich || row["Quốc tịch"] || row["Quốc gia"],
			),
			maQuocTich: this.mapQuocTich(
				row.quocTich || row["Quốc tịch"] || row["Quốc gia"],
			),
			ngayDenCsltStr: this.formatDateTime(
				row.ngayDen || row["(từ ngày)"] || row["Ngày đến"],
				"14:00:00",
			),
			ngayDiDuKienStr: this.formatDateTime(
				row.ngayDi || row["(đến ngày)"] || row["Ngày đi"],
				"12:00:00",
			),
			soPhong: roomFormatted,
			thoiHanTamTruStr: this.formatDateTime(
				row.thoiHanTamTru || row.thoiHanTamTruStr || row["Thời hạn tạm trú"],
				"23:59:59",
			),
			loaiGiayTo: 4,
			soHoChieu: this.cleanDocNumber(
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

		const parsed = this.parseDateTime(dateRaw);
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
		const mapped = catalogManager.findQuocTich(clean);
		if (mapped) return mapped;
		if (clean.length === 3 && catalogManager.isValidQuocTichCode(clean))
			return clean;
		return clean;
	}
}
