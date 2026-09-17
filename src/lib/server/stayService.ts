import { CatalogManager } from "./catalogManager.js";
import { DataTransformer, type RawOcrRow } from "./dataTransformer.js";
import {
	type D1DatabaseLike,
	checkoutStay as dbCheckoutStay,
	extendStay as dbExtendStay,
	updateStay as dbUpdateStay,
	getStayById,
	getStays,
	logKbttAction,
	type StayStatus,
	updateGuest,
	upsertGuest,
	upsertStay,
} from "./db.js";
import { KbttClient } from "./kbttClient.js";
import { tokenManager } from "./tokenManager.js";

interface IngestResultItem {
	guestId: string;
	stayId: string;
	hoTen: string;
	soPhong: string;
	status: string;
	isNew: boolean;
}

interface IngestResult {
	success: boolean;
	total: number;
	created: number;
	updated: number;
	items: IngestResultItem[];
	errors: string[];
}

class StayService {
	private catalog: CatalogManager;
	private transformer: DataTransformer;
	private kbttClient: KbttClient;

	public constructor() {
		this.catalog = CatalogManager.getInstance();
		this.transformer = new DataTransformer(this.catalog);
		this.kbttClient = new KbttClient(tokenManager);
	}

	public async ingestOcrRows(
		db: D1DatabaseLike,
		rows: RawOcrRow[],
		tabName = "OCR",
	): Promise<IngestResult> {
		const result: IngestResult = {
			success: true,
			total: rows.length,
			created: 0,
			updated: 0,
			items: [],
			errors: [],
		};

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			try {
				const hoTen = String(
					row.hoTen || row["Họ tên"] || row.name || row.hoten || "",
				)
					.trim()
					.toUpperCase();
				if (!hoTen) continue;

				const soGiayToRaw = String(
					row.soGiayTo ||
						row["Số giấy tờ"] ||
						row.cmnd ||
						row.cccd ||
						row.passport ||
						"",
				).trim();
				const quocTichRaw = String(
					row.quocTich || row["Quốc tịch"] || row.nationality || "VNM",
				).trim();
				const quocTich = this.catalog.normalizeQuocTich(quocTichRaw);

				// Ensure CCCD leading zeros are preserved and clean format
				const soGiayTo = soGiayToRaw.replace(/\s+/g, "");
				if (
					!soGiayTo ||
					soGiayTo.length < 5 ||
					/^(hộchiếu|hochie|cccd|cmnd|passport)$/i.test(soGiayTo)
				) {
					continue;
				}

				// Format dates
				const dob = this.transformer.formatDateOnly(
					row.ngaySinh || row["D.O.B"] || row.dob || row.ngayThangNamSinhStr,
				);
				const ngayDenRaw =
					row.ngayDen || row["(từ ngày)"] || row.tuNgay || row.ngayDenCsltStr;
				const ngayDen = this.transformer.formatDateTime(ngayDenRaw);

				const ngayDiRaw =
					row.ngayDi || row["(đến ngày)"] || row.denNgay || row.ngayDiDuKienStr;
				const ngayDi = this.transformer.formatDateOnly(ngayDiRaw);

				const soPhongClean = DataTransformer.cleanRoomNumber(
					row.soPhong || row["Số phòng"] || row.room || "",
				);

				const gioiTinhRaw = String(
					row.gioiTinh || row["Giới tính"] || row.gender || "M",
				)
					.trim()
					.toUpperCase();
				const gioiTinh =
					gioiTinhRaw.startsWith("F") ||
					gioiTinhRaw === "NỮ" ||
					gioiTinhRaw === "NU"
						? "F"
						: "M";

				const diaChi = String(
					row.diaChi || row["Địa chỉ"] || row.address || "",
				).trim();
				const tinh = String(row.tinh || row.Tỉnh || row.province || "").trim();
				const quanHuyen = String(
					row.quanHuyen || row["Quận/Huyện"] || row.district || "",
				).trim();
				const phuongXa = String(
					row.phuongXa || row["Phường/Xã"] || row.ward || "",
				).trim();
				const loaiGtNum = this.catalog.findLoaiGiayTo(
					row.loaiGiayTo || row["Loại giấy tờ"] || 1,
				);
				const loaiGiayToStr = loaiGtNum === 4 ? "HO_CHIEU" : "CCCD";

				// 1. Upsert guest record
				const guest = await upsertGuest(db, {
					ho_ten: hoTen,
					so_giay_to: soGiayTo,
					quoc_tich: quocTich,
					loai_giay_to: loaiGiayToStr,
					ngay_sinh: dob,
					gioi_tinh: gioiTinh,
					dia_chi_chi_tiet: diaChi,
					phuong_xa: phuongXa,
					quan_huyen: quanHuyen,
					tinh_thanh: tinh,
				});

				// 2. Google Sheets is strictly an OCR input source.
				// We ignore any 'daDangKy' / 'Đã đăng ký' text on the sheet.
				// Every new OCR guest entry pulled into the Database is set to READY_TO_SYNC.
				// The Database manages the registration lifecycle independently.
				const initialStatus: StayStatus = "READY_TO_SYNC";

				// 3. Upsert stay record
				const stay = await upsertStay(db, guest.id, {
					so_phong: soPhongClean,
					ngay_den: ngayDen,
					ngay_di_du_kien: ngayDi,
					status: initialStatus,
					source_sheet_tab: tabName,
					source_sheet_row: i + 2,
				});

				const isNew = Boolean(stay.isNew);
				result.items.push({
					guestId: guest.id,
					stayId: stay.id,
					hoTen: guest.ho_ten,
					soPhong: stay.so_phong,
					status: stay.status,
					isNew,
				});
				if (isNew) {
					result.created++;
				} else {
					result.updated++;
				}
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				result.errors.push(`Row ${i + 1}: ${errMsg}`);
			}
		}

		return result;
	}

	public async registerStayToKbtt(
		db: D1DatabaseLike,
		stayId: string,
	): Promise<{
		success: boolean;
		code: string;
		message: string;
		stayId: string;
		raw?: unknown;
	}> {
		const stay = await getStayById(db, stayId);
		if (!stay) {
			return {
				success: false,
				code: "404",
				message: "Không tìm thấy lượt lưu trú trong cơ sở dữ liệu",
				stayId,
			};
		}

		// Convert stay + guest to RawOcrRow for transformer
		const mockRow: RawOcrRow = {
			"Họ tên": stay.ho_ten,
			"Số giấy tờ": stay.so_giay_to,
			"Quốc tịch": stay.quoc_tich,
			"Loại giấy tờ": stay.loai_giay_to === "HO_CHIEU" ? 4 : 1,
			"D.O.B": stay.ngay_sinh,
			"Giới tính": stay.gioi_tinh,
			"Địa chỉ": stay.dia_chi_chi_tiet,
			"Phường/Xã": stay.phuong_xa,
			"Quận/Huyện": stay.quan_huyen,
			Tỉnh: stay.tinh_thanh,
			"(từ ngày)": stay.ngay_den,
			"(đến ngày)": stay.ngay_di_du_kien,
			"Số phòng": stay.so_phong,
		};

		const transformed = await this.transformer.transformRow(mockRow);
		if (!transformed.completeness.isComplete) {
			const missing = transformed.completeness.missingFields.join(", ");
			return {
				success: false,
				code: "400",
				message: `Dữ liệu chưa hoàn thiện, thiếu: ${missing}`,
				stayId,
			};
		}

		const isForeign = transformed.branch === "FOREIGN";
		const apiEndpointName = isForeign ? "API_4_NN" : "API_5_VN";

		try {
			const response = isForeign
				? await this.kbttClient.sendForeign([transformed.payload])
				: await this.kbttClient.sendVietnam([transformed.payload]);

			// Log action to kbtt_logs audit table
			await logKbttAction(db, {
				stay_id: stay.id,
				api_endpoint: apiEndpointName,
				guest_name: stay.ho_ten,
				so_giay_to: stay.so_giay_to,
				so_phong: stay.so_phong,
				request_payload: JSON.stringify(transformed.payload),
				response_payload: JSON.stringify(response.raw || response),
				http_status: 200,
				code: String(response.code || "200"),
				is_success: response.success ? 1 : 0,
				error_message: response.success ? undefined : response.message,
			});

			if (response.success) {
				await dbUpdateStay(db, stay.id, {
					status: "SYNCED_KBTT",
					ma_ho_so_kbtt: String(response.code || "OK"),
				});
				return {
					success: true,
					code: String(response.code || "200"),
					message: response.message || "Khai báo lưu trú thành công!",
					stayId,
					raw: response.raw,
				};
			}

			return {
				success: false,
				code: String(response.code || "400"),
				message: response.message || "Lỗi khi gọi API KBTT",
				stayId,
				raw: response.raw,
			};
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : String(err);
			await logKbttAction(db, {
				stay_id: stay.id,
				api_endpoint: apiEndpointName,
				guest_name: stay.ho_ten,
				so_giay_to: stay.so_giay_to,
				so_phong: stay.so_phong,
				request_payload: JSON.stringify(transformed.payload),
				response_payload: JSON.stringify({ error: errMsg }),
				http_status: 500,
				code: "500",
				is_success: 0,
				error_message: errMsg,
			});

			return {
				success: false,
				code: "500",
				message: `Lỗi hệ thống khi gửi API KBTT: ${errMsg}`,
				stayId,
			};
		}
	}

	public async batchRegisterStays(
		db: D1DatabaseLike,
		stayIds?: string[],
	): Promise<{
		total: number;
		successCount: number;
		failureCount: number;
		results: Array<{
			stayId: string;
			success: boolean;
			message: string;
			hoTen?: string;
		}>;
	}> {
		let ids = stayIds;
		if (!ids || ids.length === 0) {
			const readyStays = await getStays(db, { status: "READY_TO_SYNC" });
			ids = readyStays.map((s) => s.id);
		}

		const results: Array<{
			stayId: string;
			success: boolean;
			message: string;
			hoTen?: string;
		}> = [];
		let successCount = 0;
		let failureCount = 0;

		for (const id of ids) {
			const stay = await getStayById(db, id);
			const res = await this.registerStayToKbtt(db, id);
			if (res.success) {
				successCount++;
			} else {
				failureCount++;
			}
			results.push({
				stayId: id,
				success: res.success,
				message: res.message,
				hoTen: stay?.ho_ten,
			});
		}

		return {
			total: ids.length,
			successCount,
			failureCount,
			results,
		};
	}

	public async extendStay(
		db: D1DatabaseLike,
		stayId: string,
		newNgayDi: string,
	): Promise<{ success: boolean; message: string }> {
		const stay = await getStayById(db, stayId);
		if (!stay) {
			return { success: false, message: "Không tìm thấy khách để gia hạn" };
		}

		const ok = await dbExtendStay(db, stayId, newNgayDi);
		if (ok) {
			await logKbttAction(db, {
				stay_id: stayId,
				api_endpoint: "EXTEND_STAY",
				guest_name: stay.ho_ten,
				so_giay_to: stay.so_giay_to,
				so_phong: stay.so_phong,
				request_payload: JSON.stringify({
					oldNgayDi: stay.ngay_di_du_kien,
					newNgayDi,
				}),
				response_payload: JSON.stringify({ success: true }),
				is_success: 1,
			});
			return {
				success: true,
				message: `Gia hạn lưu trú đến ngày ${newNgayDi} thành công!`,
			};
		}
		return { success: false, message: "Không thể cập nhật thời hạn lưu trú" };
	}

	public async checkoutStay(
		db: D1DatabaseLike,
		stayId: string,
	): Promise<{ success: boolean; message: string }> {
		const stay = await getStayById(db, stayId);
		if (!stay) {
			return { success: false, message: "Không tìm thấy khách để checkout" };
		}

		const ok = await dbCheckoutStay(db, stayId);
		if (ok) {
			await logKbttAction(db, {
				stay_id: stayId,
				api_endpoint: "CHECKOUT_STAY",
				guest_name: stay.ho_ten,
				so_giay_to: stay.so_giay_to,
				so_phong: stay.so_phong,
				request_payload: JSON.stringify({ stayId }),
				response_payload: JSON.stringify({
					success: true,
					status: "CHECKED_OUT",
				}),
				is_success: 1,
			});
			return {
				success: true,
				message: `Checkout trả phòng ${stay.so_phong} thành công!`,
			};
		}
		return { success: false, message: "Không thể thực hiện trả phòng" };
	}

	public async updateGuestAndStay(
		db: D1DatabaseLike,
		stayId: string,
		payload: {
			ho_ten?: string;
			so_giay_to?: string;
			quoc_tich?: string;
			loai_giay_to?: string;
			ngay_sinh?: string;
			gioi_tinh?: string;
			dia_chi_chi_tiet?: string;
			phuong_xa?: string;
			quan_huyen?: string;
			tinh_thanh?: string;
			so_dien_thoai?: string;
			so_phong?: string;
			ngay_den?: string;
			ngay_di_du_kien?: string;
			ly_do_luu_tru?: number;
			ghi_chu?: string;
		},
	): Promise<boolean> {
		const stay = await getStayById(db, stayId);
		if (!stay) return false;

		await updateGuest(db, stay.guest_id, {
			ho_ten: payload.ho_ten,
			so_giay_to: payload.so_giay_to,
			quoc_tich: payload.quoc_tich,
			loai_giay_to: payload.loai_giay_to,
			ngay_sinh: payload.ngay_sinh,
			gioi_tinh: payload.gioi_tinh,
			dia_chi_chi_tiet: payload.dia_chi_chi_tiet,
			phuong_xa: payload.phuong_xa,
			quan_huyen: payload.quan_huyen,
			tinh_thanh: payload.tinh_thanh,
			so_dien_thoai: payload.so_dien_thoai,
		});

		await dbUpdateStay(db, stayId, {
			so_phong: payload.so_phong
				? DataTransformer.cleanRoomNumber(payload.so_phong)
				: stay.so_phong,
			ngay_den: payload.ngay_den,
			ngay_di_du_kien: payload.ngay_di_du_kien,
			ly_do_luu_tru: payload.ly_do_luu_tru,
			ghi_chu: payload.ghi_chu,
		});

		return true;
	}
}

export const stayService = new StayService();
