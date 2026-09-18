import type {
	D1DatabaseLike,
	IngestResult,
	IngestResultItem,
	RawOcrRow,
	StayDetail,
	StayStatus,
} from "../types/index.js";
import { CatalogManager } from "./catalogManager.js";
import { DataTransformer } from "./dataTransformer.js";
import {
	checkoutStay as dbCheckoutStay,
	extendStay as dbExtendStay,
	updateStay as dbUpdateStay,
	generateId,
	getStayById,
	getStays,
	logKbttAction,
	updateGuest,
	upsertGuest,
	upsertStay,
} from "./db.js";
import { KbttClient } from "./kbttClient.js";
import { tokenManager } from "./tokenManager.js";

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
				const ngayDiRaw =
					row.ngayDi || row["(đến ngày)"] || row.denNgay || row.ngayDiDuKienStr;
				const { ngayDen, ngayDi } = DataTransformer.resolveCheckInCheckOut(
					ngayDenRaw,
					ngayDiRaw,
				);

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

				const rawDetail = String(
					row.diaChi ||
						row["Địa chỉ"] ||
						row["Địa chỉ chi tiết"] ||
						row.address ||
						"",
				).trim();
				const rawPhuong = String(
					row.phuongXa || row["Phường/Xã"] || row.ward || "",
				).trim();
				const rawQuan = String(
					row.quanHuyen || row["Quận/Huyện"] || row.district || "",
				).trim();
				const rawTinh = String(
					row.tinh || row.Tỉnh || row.tinhTp || row.province || "",
				).trim();

				// Combine 4 parts into full address: [Địa chỉ chi tiết], [Phường/Xã], [Quận/Huyện], [Tỉnh/TP]
				let fullCombinedAddress = rawDetail;
				const addrParts = [rawDetail, rawPhuong, rawQuan, rawTinh].filter(
					Boolean,
				);
				if (addrParts.length > 1) {
					if (!rawDetail.includes(rawTinh) && !rawDetail.includes(rawQuan)) {
						fullCombinedAddress = addrParts.join(", ");
					}
				} else if (addrParts.length === 1) {
					fullCombinedAddress = addrParts[0];
				}

				const isForeign = quocTich !== "VNM";
				const loaiGtNum = isForeign
					? 4
					: this.catalog.findLoaiGiayTo(
							row.loaiGiayTo || row["Loại giấy tờ"] || 1,
						);
				const loaiGiayToStr =
					loaiGtNum === 4 || isForeign ? "HO_CHIEU" : "CCCD";

				// 1. Upsert guest record
				const guest = await upsertGuest(db, {
					ho_ten: hoTen,
					so_giay_to: soGiayTo,
					quoc_tich: quocTich,
					loai_giay_to: loaiGiayToStr,
					ngay_sinh: dob,
					gioi_tinh: gioiTinh,
					dia_chi_chi_tiet: fullCombinedAddress,
					phuong_xa: rawPhuong,
					quan_huyen: rawQuan,
					tinh_thanh:
						rawTinh || fullCombinedAddress.split(",").pop()?.trim() || "",
				});

				// 2. Google Sheets is strictly an OCR input source.
				// We ignore any 'daDangKy' / 'Đã đăng ký' text on the sheet.
				// Every new OCR guest entry pulled into the Database is set to READY_TO_SYNC.
				// The Database manages the registration lifecycle independently.
				const initialStatus: StayStatus = "READY_TO_SYNC";

				const rawVisa = String(
					row.thoi_han_thi_thuc ||
						row.thoiHanTamTru ||
						row["Thời hạn tạm trú"] ||
						row["Thời hạn thị thực"] ||
						"",
				).trim();
				const thoiHanThiThuc =
					quocTich !== "VNM" && rawVisa
						? DataTransformer.formatDateOnly(rawVisa) || rawVisa
						: "";

				// 3. Upsert stay record
				const stay = await upsertStay(db, guest.id, {
					so_phong: soPhongClean,
					ngay_den: ngayDen,
					ngay_di_du_kien: ngayDi,
					thoi_han_thi_thuc: thoiHanThiThuc,
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
			"Loại giấy tờ": this.catalog.findLoaiGiayTo(stay.loai_giay_to),
			"D.O.B": stay.ngay_sinh,
			"Giới tính": stay.gioi_tinh,
			"Địa chỉ": stay.dia_chi_chi_tiet,
			"Phường/Xã": stay.phuong_xa,
			"Quận/Huyện": stay.quan_huyen,
			Tỉnh: stay.tinh_thanh,
			"(từ ngày)": stay.ngay_den,
			"(đến ngày)": stay.ngay_di_du_kien,
			"Số phòng": stay.so_phong,
			thoi_han_thi_thuc: stay.thoi_han_thi_thuc,
			thoiHanTamTru: stay.thoi_han_thi_thuc,
			"Thời hạn thị thực": stay.thoi_han_thi_thuc,
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
		if (stay.status === "CHECKED_OUT") {
			return {
				success: false,
				message: "Không thể gia hạn cho khách đã trả phòng!",
			};
		}

		const quocTich = (stay.quoc_tich || "VNM").toUpperCase().trim();
		const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM"].includes(quocTich);

		// If stay was synced to BCA, report extension to BCA via API 12 for VN guests
		if ((stay.status === "SYNCED_KBTT" || stay.status === "EXTENDED") && isVN) {
			const loaiGiayTo = this.catalog.findLoaiGiayTo(stay.loai_giay_to);
			const soGiayTo =
				DataTransformer.cleanDocNumber(stay.so_giay_to) ||
				String(stay.so_giay_to || "").trim();
			const thoiGianStr = DataTransformer.formatDateTime(newNgayDi, "12:00:00");
			const bcaPayload = [
				{
					loai: "GH" as const,
					soGiayTo,
					loaiGiayTo,
					thoiGianStr,
				},
			];

			let bcaRes: import("./kbttClient.js").ApiResponse | null = null;
			try {
				bcaRes = await this.kbttClient.doiNgayTraPhong(bcaPayload);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				await logKbttAction(db, {
					stay_id: stayId,
					api_endpoint: "API_12_DOI_NGAY_TRA_PHONG",
					guest_name: stay.ho_ten,
					so_giay_to: stay.so_giay_to,
					so_phong: stay.so_phong,
					request_payload: JSON.stringify(bcaPayload),
					response_payload: JSON.stringify({ error: errMsg }),
					is_success: 0,
					error_message: errMsg,
				});
				return {
					success: false,
					message: `Lỗi kết nối BCA khi gia hạn: ${errMsg}`,
				};
			}

			await logKbttAction(db, {
				stay_id: stayId,
				api_endpoint: "API_12_DOI_NGAY_TRA_PHONG",
				guest_name: stay.ho_ten,
				so_giay_to: stay.so_giay_to,
				so_phong: stay.so_phong,
				request_payload: JSON.stringify(bcaPayload),
				response_payload: JSON.stringify(
					bcaRes.raw || { message: bcaRes.message, code: bcaRes.code },
				),
				http_status: typeof bcaRes.code === "number" ? bcaRes.code : 200,
				code: String(bcaRes.code),
				is_success: bcaRes.success ? 1 : 0,
				error_message: bcaRes.success ? undefined : bcaRes.message,
			});

			if (!bcaRes.success) {
				return {
					success: false,
					message: `BCA từ chối gia hạn: ${bcaRes.message}`,
				};
			}
		}

		const ok = await dbExtendStay(db, stayId, newNgayDi);
		if (ok) {
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
		if (stay.status === "CHECKED_OUT") {
			return {
				success: true,
				message: "Khách đã được trả phòng trước đó.",
			};
		}

		const quocTich = (stay.quoc_tich || "VNM").toUpperCase().trim();
		const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM"].includes(quocTich);

		// If stay was synced to BCA, report checkout to BCA via API 12 for VN guests
		if ((stay.status === "SYNCED_KBTT" || stay.status === "EXTENDED") && isVN) {
			const loaiGiayTo = this.catalog.findLoaiGiayTo(stay.loai_giay_to);
			const soGiayTo =
				DataTransformer.cleanDocNumber(stay.so_giay_to) ||
				String(stay.so_giay_to || "").trim();
			const vnNow = DataTransformer.getVnNow();
			const isoNowStr = vnNow.fullStr;
			const dmyNowStr = `${String(vnNow.day).padStart(2, "0")}/${String(vnNow.month).padStart(2, "0")}/${vnNow.year} ${vnNow.timeStr}`;

			// Candidate payloads to handle C06 validation variants (DD/MM/YYYY vs ISO vs without time vs loaiGiayTo 1 vs 8)
			const candidatePayloads: Array<
				{
					loai: "TS";
					soGiayTo: string;
					loaiGiayTo: number;
					thoiGianStr?: string;
				}[]
			> = [
				[{ loai: "TS", soGiayTo, loaiGiayTo, thoiGianStr: dmyNowStr }],
				[{ loai: "TS", soGiayTo, loaiGiayTo }],
				[{ loai: "TS", soGiayTo, loaiGiayTo, thoiGianStr: isoNowStr }],
			];
			if (loaiGiayTo === 1) {
				candidatePayloads.push(
					[{ loai: "TS", soGiayTo, loaiGiayTo: 8, thoiGianStr: dmyNowStr }],
					[{ loai: "TS", soGiayTo, loaiGiayTo: 8 }],
				);
			}

			let bcaRes: import("./kbttClient.js").ApiResponse | null = null;
			let lastSentPayload = candidatePayloads[0];

			for (const payload of candidatePayloads) {
				lastSentPayload = payload;
				try {
					bcaRes = await this.kbttClient.doiNgayTraPhong(payload);
					if (bcaRes.success) break;
				} catch (err: unknown) {
					const errMsg = err instanceof Error ? err.message : String(err);
					await logKbttAction(db, {
						stay_id: stayId,
						api_endpoint: "API_12_DOI_NGAY_TRA_PHONG",
						guest_name: stay.ho_ten,
						so_giay_to: stay.so_giay_to,
						so_phong: stay.so_phong,
						request_payload: JSON.stringify(payload),
						response_payload: JSON.stringify({ error: errMsg }),
						is_success: 0,
						error_message: errMsg,
					});
				}
			}

			if (bcaRes) {
				await logKbttAction(db, {
					stay_id: stayId,
					api_endpoint: "API_12_DOI_NGAY_TRA_PHONG",
					guest_name: stay.ho_ten,
					so_giay_to: stay.so_giay_to,
					so_phong: stay.so_phong,
					request_payload: JSON.stringify(lastSentPayload),
					response_payload: JSON.stringify(
						bcaRes.raw || { message: bcaRes.message, code: bcaRes.code },
					),
					http_status: typeof bcaRes.code === "number" ? bcaRes.code : 200,
					code: String(bcaRes.code),
					is_success: bcaRes.success ? 1 : 0,
					error_message: bcaRes.success ? undefined : bcaRes.message,
				});

				if (!bcaRes.success) {
					const lowerMsg = (bcaRes.message || "").toLowerCase();
					const isAlreadyOut =
						lowerMsg.includes("đã checkout") ||
						lowerMsg.includes("không tồn tại") ||
						lowerMsg.includes("đã trả phòng");
					if (!isAlreadyOut) {
						return {
							success: false,
							message: `BCA từ chối trả phòng: ${bcaRes.message}`,
						};
					}
				}
			}
		} else {
			// Local checkout log for un-synced or NNN
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
		}

		const ok = await dbCheckoutStay(db, stayId);
		if (ok) {
			return {
				success: true,
				message: `Checkout trả phòng ${stay.so_phong} thành công!`,
			};
		}
		return { success: false, message: "Không thể thực hiện trả phòng" };
	}

	public async updateStayStatus(
		db: D1DatabaseLike,
		stayId: string,
		newStatus: StayStatus,
	): Promise<{ success: boolean; message: string }> {
		const stay = await getStayById(db, stayId);
		if (!stay) {
			return {
				success: false,
				message: "Không tìm thấy khách để đổi trạng thái",
			};
		}
		const isCheckedOut = newStatus === "CHECKED_OUT";
		const nowStr = new Date(Date.now() + 7 * 3600 * 1000)
			.toISOString()
			.replace("T", " ")
			.substring(0, 19);

		const ok = await dbUpdateStay(db, stayId, {
			status: newStatus,
			ngay_di_thuc_te: isCheckedOut
				? stay.ngay_di_thuc_te || nowStr
				: undefined,
		});

		if (ok) {
			await logKbttAction(db, {
				stay_id: stayId,
				api_endpoint: "OVERWRITE_STATUS",
				guest_name: stay.ho_ten,
				so_giay_to: stay.so_giay_to,
				so_phong: stay.so_phong,
				request_payload: JSON.stringify({
					oldStatus: stay.status,
					newStatus,
				}),
				response_payload: JSON.stringify({
					success: true,
					status: newStatus,
				}),
				is_success: 1,
			});
			return {
				success: true,
				message: `Đã đổi trạng thái khách sang "${newStatus}" thành công!`,
			};
		}
		return { success: false, message: "Không thể cập nhật trạng thái" };
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
			so_phong?: string;
			ngay_den?: string;
			ngay_di_du_kien?: string;
			thoi_han_thi_thuc?: string;
			ly_do_luu_tru?: number;
			ghi_chu?: string;
			status?: StayStatus;
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
		});

		const currentQuocTich = (
			payload.quoc_tich ||
			stay.quoc_tich ||
			"VNM"
		).toUpperCase();
		const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM"].includes(
			currentQuocTich,
		);

		await dbUpdateStay(db, stayId, {
			so_phong: payload.so_phong
				? DataTransformer.cleanRoomNumber(payload.so_phong)
				: stay.so_phong,
			ngay_den: payload.ngay_den,
			ngay_di_du_kien: payload.ngay_di_du_kien,
			thoi_han_thi_thuc: isVN ? "" : payload.thoi_han_thi_thuc,
			ly_do_luu_tru: payload.ly_do_luu_tru,
			ghi_chu: payload.ghi_chu,
			status: payload.status,
		});

		return true;
	}

	public async reRegisterStay(
		db: D1DatabaseLike,
		stayId: string,
		options?: {
			so_phong?: string;
			ngay_den?: string;
			ngay_di_du_kien?: string;
			autoSendToKbtt?: boolean;
		},
	): Promise<{
		success: boolean;
		message: string;
		stayId?: string;
		stay?: StayDetail;
		isRegistered?: boolean;
		code?: string;
	}> {
		const existingStay = await getStayById(db, stayId);
		if (!existingStay) {
			return {
				success: false,
				message: "Không tìm thấy thông tin lượt lưu trú gốc",
			};
		}

		// Calculate GMT+7 dates
		const vnNow = DataTransformer.getVnNow();
		const nextDay = new Date(
			Date.UTC(vnNow.year, vnNow.month - 1, vnNow.day + 1),
		);
		const defaultNgayDi = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")} 12:00:00`;

		const newNgayDen = options?.ngay_den
			? DataTransformer.formatDateTime(options.ngay_den, vnNow.timeStr)
			: vnNow.fullStr;

		// Format departure date: default to 12:00:00 if no explicit time given
		let newNgayDi = defaultNgayDi;
		if (options?.ngay_di_du_kien) {
			const rawDi = String(options.ngay_di_du_kien).trim();
			const parsedDi = DataTransformer.parseDateTime(rawDi);
			if (parsedDi) {
				const m = String(parsedDi.month).padStart(2, "0");
				const d = String(parsedDi.day).padStart(2, "0");
				const hasExplicitTime =
					rawDi.includes(":") && (parsedDi.hour !== 0 || parsedDi.minute !== 0);
				const hh = hasExplicitTime
					? String(parsedDi.hour).padStart(2, "0")
					: "12";
				const mm = hasExplicitTime
					? String(parsedDi.minute).padStart(2, "0")
					: "00";
				const ss = hasExplicitTime
					? String(parsedDi.second).padStart(2, "0")
					: "00";
				newNgayDi = `${parsedDi.year}-${m}-${d} ${hh}:${mm}:${ss}`;
			}
		}

		const newSoPhong = options?.so_phong
			? DataTransformer.cleanRoomNumber(options.so_phong)
			: existingStay.so_phong;

		// If existing stay was active (not CHECKED_OUT), mark it CHECKED_OUT to archive it
		if (existingStay.status !== "CHECKED_OUT") {
			await dbCheckoutStay(db, stayId);
		}

		// Insert new stay with READY_TO_SYNC
		const newStayId = generateId();
		await db
			.prepare(
				`
				INSERT INTO stays (
					id, guest_id, so_phong, ngay_den, ngay_di_du_kien,
					thoi_han_thi_thuc, ly_do_luu_tru, status, ma_ho_so_kbtt, ghi_chu,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, 'READY_TO_SYNC', '', ?, ?, ?)
			`,
			)
			.bind(
				newStayId,
				existingStay.guest_id,
				newSoPhong,
				newNgayDen,
				newNgayDi,
				existingStay.thoi_han_thi_thuc || null,
				existingStay.ly_do_luu_tru || 1,
				existingStay.ghi_chu || "",
				vnNow.fullStr,
				vnNow.fullStr,
			)
			.run();

		await logKbttAction(db, {
			stay_id: newStayId,
			api_endpoint: "RE_REGISTER_STAY",
			guest_name: existingStay.ho_ten,
			so_giay_to: existingStay.so_giay_to,
			so_phong: newSoPhong,
			request_payload: JSON.stringify({
				originalStayId: stayId,
				newNgayDen,
				newNgayDi,
			}),
			response_payload: JSON.stringify({
				success: true,
				newStayId,
				status: "READY_TO_SYNC",
			}),
			is_success: 1,
		});

		// Auto-send to BCA KBTT API unless explicitly disabled
		const shouldAutoSend = options?.autoSendToKbtt !== false;
		if (shouldAutoSend) {
			const registerResult = await this.registerStayToKbtt(db, newStayId);
			const updatedStay = (await getStayById(db, newStayId)) || undefined;

			if (registerResult.success) {
				return {
					success: true,
					message: `✓ Đã khai báo thành công lên BCA cho khách ${existingStay.ho_ten} (Phòng ${newSoPhong})!`,
					stayId: newStayId,
					stay: updatedStay,
					isRegistered: true,
					code: registerResult.code,
				};
			}

			return {
				success: false,
				message: `Đã tạo lượt mới nhưng BCA từ chối: ${registerResult.message}`,
				stayId: newStayId,
				stay: updatedStay,
				isRegistered: false,
				code: registerResult.code,
			};
		}

		const createdStay = (await getStayById(db, newStayId)) || undefined;
		return {
			success: true,
			message: `Đã tạo lượt lưu trú mới cho khách ${existingStay.ho_ten}!`,
			stayId: newStayId,
			stay: createdStay,
			isRegistered: false,
		};
	}
}

export const stayService = new StayService();
