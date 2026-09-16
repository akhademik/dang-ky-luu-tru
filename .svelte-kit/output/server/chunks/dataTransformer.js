import { t as catalogManager } from "./catalogManager.js";
//#region src/lib/server/dataTransformer.ts
var DataTransformer = class {
	static cleanRoomNumber(roomRaw) {
		const raw = String(roomRaw ?? "").trim();
		if (!raw) return "";
		const match = raw.match(/[1-9]/);
		return match ? match[0] : "";
	}
	static isGuestVN(row) {
		const qt = String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "").trim().toLowerCase();
		const docType = String(row.loaiGiayTo || row["Loại giấy tờ"] || row["Tên giấy tờ"] || "").toLowerCase();
		const docNum = String(row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"] || "").replace(/\D/g, "");
		if (docType.includes("cccd") || docType.includes("cmnd") || docType.includes("căn cước")) return true;
		if ([
			"vn",
			"vnm",
			"viet nam",
			"vietnam",
			"vvv",
			"vv",
			"v",
			"viet"
		].includes(qt)) return true;
		if (qt && ![
			"vn",
			"vnm",
			"viet nam",
			"vietnam",
			"vvv",
			"vv",
			"v",
			"viet"
		].includes(qt)) return false;
		if (docNum.length === 12 || docNum.length === 9) return true;
		return false;
	}
	static isArrivalDateValid(dateStr) {
		if (!dateStr) return {
			valid: false,
			error: "Thiếu ngày đến"
		};
		const str = String(dateStr).trim();
		const parsed = new Date(str.replace(" ", "T"));
		if (isNaN(parsed.getTime())) {
			if (!str.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)) return {
				valid: false,
				error: "Định dạng ngày đến không hợp lệ"
			};
		}
		const arrivalDate = new Date(str.includes("T") ? str : str.replace(" ", "T"));
		const arrivalDay = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());
		const today = /* @__PURE__ */ new Date();
		const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const yesterday = new Date(currentDay);
		yesterday.setDate(yesterday.getDate() - 1);
		if (arrivalDay.getTime() === currentDay.getTime() || arrivalDay.getTime() === yesterday.getTime()) return { valid: true };
		if (arrivalDay.getTime() < yesterday.getTime()) return {
			valid: false,
			error: "Ngày đến ở quá khứ (> 1 ngày trước)"
		};
		if (arrivalDay.getTime() > currentDay.getTime()) return {
			valid: false,
			error: "Ngày đến ở tương lai"
		};
		return { valid: true };
	}
	static checkCompleteness(row) {
		const isVN = this.isGuestVN(row);
		const missing = [];
		const status = {};
		const hoTen = String(row.hoTen || row["Họ tên"] || "").trim();
		status.hoTen = {
			valid: Boolean(hoTen),
			value: hoTen
		};
		if (!hoTen) missing.push("Họ tên");
		const ngaySinh = String(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"] || "").trim();
		const dobValid = Boolean(ngaySinh && this.formatDateOnly(ngaySinh));
		status.ngaySinh = {
			valid: dobValid,
			value: ngaySinh
		};
		if (!dobValid) missing.push("Ngày sinh");
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomValid = Boolean(cleanedRoom);
		status.soPhong = {
			valid: roomValid,
			value: cleanedRoom,
			error: !roomValid ? "Số phòng không hợp lệ (Phải từ 1 đến 9)" : void 0
		};
		if (!roomValid) missing.push("Số phòng (1-9)");
		const ngayDenRaw = row.ngayDen || row["(từ ngày)"] || row["Ngày đến"];
		const arrivalCheck = this.isArrivalDateValid(ngayDenRaw);
		status.ngayDen = {
			valid: arrivalCheck.valid,
			value: ngayDenRaw,
			error: arrivalCheck.error
		};
		if (!arrivalCheck.valid) missing.push(`Ngày đến (${arrivalCheck.error})`);
		const ngayDiRaw = row.ngayDi || row["(đến ngày)"] || row["Ngày đi"];
		status.ngayDi = {
			valid: Boolean(ngayDiRaw),
			value: ngayDiRaw
		};
		const docTypeName = String(row.loaiGiayTo || row["Loại giấy tờ"] || (isVN ? "Thẻ CCCD" : "Hộ chiếu")).toLowerCase();
		const docNumRaw = String(row.soGiayTo || row["Số giấy tờ"] || row.soHoChieu || row["Số CCCD"] || row["Số hộ chiếu"] || "").trim();
		if (isVN) {
			if (docTypeName.includes("cccd") || docTypeName.includes("căn cước")) {
				const valid = docNumRaw.replace(/\D/g, "").length === 12;
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Số CCCD phải đủ 12 số" : void 0
				};
				if (!valid) missing.push("Số CCCD (12 chữ số)");
			} else if (docTypeName.includes("cmnd")) {
				const digits = docNumRaw.replace(/\D/g, "");
				const valid = digits.length === 9 || digits.length === 12;
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Số CMND phải 9 hoặc 12 số" : void 0
				};
				if (!valid) missing.push("Số CMND (9 hoặc 12 số)");
			} else {
				const valid = Boolean(docNumRaw);
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Thiếu số giấy tờ" : void 0
				};
				if (!valid) missing.push("Số giấy tờ");
			}
		} else {
			const rawQt = String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "").trim();
			const mappedQt = this.mapQuocTich(rawQt);
			const isQtValid = Boolean(mappedQt && catalogManager.isValidQuocTichCode(mappedQt));
			status.quocTich = {
				valid: isQtValid,
				value: rawQt,
				error: !isQtValid ? `Mã quốc tịch không hợp lệ: "${rawQt}"` : void 0
			};
			if (!isQtValid) missing.push("Mã quốc tịch chuẩn");
			const isPassportValid = docNumRaw.length >= 6 && docNumRaw.length <= 12;
			status.soHoChieu = {
				valid: isPassportValid,
				value: docNumRaw,
				error: !isPassportValid ? "Số hộ chiếu phải từ 6 đến 12 ký tự" : void 0
			};
			if (!isPassportValid) missing.push("Số hộ chiếu (6-12 ký tự)");
		}
		return {
			isComplete: missing.length === 0,
			missingFields: missing,
			fieldStatus: status
		};
	}
	static transformToPayloadVn(row) {
		const rawAddress = String(row.diaChi || row["Địa chỉ"] || row["Địa chỉ chi tiết"] || row.address || "").trim();
		const tinhRaw = String(row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || row.province || "").trim();
		const phuongXaRaw = String(row.phuongXa || row["Phường/Xã"] || row.ward || "").trim();
		const quanHuyenRaw = String(row.quanHuyen || row["Quận/Huyện"] || row.district || "").trim();
		let fullAddress = "";
		const loaiGiayToName = String(row.loaiGiayTo || row["Loại giấy tờ"] || "").toLowerCase();
		if (!loaiGiayToName.includes("hộ chiếu") && !loaiGiayToName.includes("passport")) {
			const addressParts = [
				rawAddress,
				phuongXaRaw,
				quanHuyenRaw,
				tinhRaw
			].filter(Boolean);
			fullAddress = addressParts.length > 0 ? addressParts.join(", ") : rawAddress;
		}
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";
		return {
			hoTen: this.cleanName(row.hoTen || row["Họ tên"]),
			gioiTinh: this.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: this.cleanPhone(row.soDienThoai || row["Số điện thoại"]),
			ngayThangNamSinhStr: this.formatDateOnly(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"]),
			noiCuTru: this.mapNoiCuTru(row.noiCuTru || row["Nơi cư trú"]),
			maTT: "",
			maPX: "",
			diaChi: fullAddress,
			ngayDenCsltStr: this.formatDateTime(row.ngayDen || row["(từ ngày)"] || row["Ngày đến"], "14:00:00"),
			ngayDiDuKienStr: this.formatDateTime(row.ngayDi || row["(đến ngày)"] || row["Ngày đi"], "12:00:00"),
			soPhong: roomFormatted,
			lyDoCuTru: this.mapLyDoCuTru(row.lyDo || row["Lý do"]),
			lyDoChiTiet: String(row.lyDoChiTiet || row["Lý do chi tiết"] || ""),
			loaiGiayTo: this.mapLoaiGiayTo(row.loaiGiayTo || row["Loại giấy tờ"] || "Thẻ CCCD"),
			soGiayTo: this.cleanDocNumber(row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"]),
			anhTruocB64: String(row.anhTruocB64 || row["Ảnh mặt trước"] || ""),
			anhSauB64: String(row.anhSauB64 || row["Ảnh mặt sau"] || ""),
			ghiChu: String(row.ghiChu || row["Ghi chú"] || "")
		};
	}
	static transformToPayloadForeign(row) {
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";
		return {
			hoTen: this.cleanName(row.hoTen || row["Họ tên"]),
			gioiTinh: this.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: this.cleanPhone(row.soDienThoai || row["Số điện thoại"]),
			ngayThangNamSinhStr: this.formatDateOnly(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"]),
			maQuocTich: this.mapQuocTich(row.quocTich || row["Quốc tịch"] || row["Quốc gia"]),
			ngayDenCsltStr: this.formatDateTime(row.ngayDen || row["(từ ngày)"] || row["Ngày đến"], "14:00:00"),
			ngayDiDuKienStr: this.formatDateTime(row.ngayDi || row["(đến ngày)"] || row["Ngày đi"], "12:00:00"),
			soPhong: roomFormatted,
			thoiHanTamTruStr: this.formatDateTime(row.thoiHanTamTru || row.thoiHanTamTruStr || row["Thời hạn tạm trú"], "23:59:59"),
			loaiGiayTo: 4,
			soHoChieu: this.cleanPassportNumber(row.soHoChieu || row.soGiayTo || row["Số hộ chiếu"] || row["Số giấy tờ"]),
			anhHoChieuB64: String(row.anhHoChieuB64 || row["Ảnh hộ chiếu"] || ""),
			ghiChu: String(row.ghiChu || row["Ghi chú"] || "")
		};
	}
	static cleanName(nameRaw) {
		if (!nameRaw) return "";
		return String(nameRaw).trim().toUpperCase().replace(/\s+/g, " ");
	}
	static mapGender(genderRaw) {
		if (!genderRaw) return "M";
		const str = String(genderRaw).trim().toLowerCase();
		if ([
			"f",
			"female",
			"nữ",
			"nu",
			"gái",
			"w"
		].includes(str)) return "F";
		return "M";
	}
	static cleanPhone(phoneRaw) {
		if (!phoneRaw) return "";
		return String(phoneRaw).replace(/[^\d+]/g, "").trim();
	}
	static cleanDocNumber(docRaw) {
		if (!docRaw) return "";
		return String(docRaw).replace(/\s+/g, "").trim();
	}
	static cleanPassportNumber(docRaw) {
		if (!docRaw) return "";
		return String(docRaw).replace(/[^a-zA-Z0-9]/g, "").trim().toUpperCase();
	}
	static formatDateOnly(dateRaw) {
		if (!dateRaw) return "";
		const str = String(dateRaw).trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
		const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
		if (dmy) {
			const [, d, m, y] = dmy;
			return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
		}
		const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
		if (ymd) {
			const [, y, m, d] = ymd;
			return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
		}
		return str;
	}
	static formatDateTime(dateRaw, defaultTime = "12:00:00") {
		if (!dateRaw) return "";
		const str = String(dateRaw).trim();
		if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) return str;
		const dateOnly = this.formatDateOnly(str);
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return `${dateOnly} ${defaultTime}`;
		return str;
	}
	static mapNoiCuTru(val) {
		if (!val) return 1;
		const str = String(val).toLowerCase();
		if (str.includes("tạm") || str === "2") return 2;
		return 1;
	}
	static mapLyDoCuTru(val) {
		if (!val) return 1;
		const str = String(val).toLowerCase();
		if (str.includes("khác") || str === "20") return 20;
		return 1;
	}
	static mapLoaiGiayTo(val) {
		if (!val) return 1;
		const str = String(val).toLowerCase();
		if (str.includes("căn cước") && !str.includes("thẻ cccd")) return 8;
		if (str.includes("cccd") || str === "1") return 1;
		if (str.includes("cmnd") || str === "2") return 2;
		if (str.includes("lái xe") || str.includes("gplx") || str === "3") return 3;
		if (str.includes("hộ chiếu") || str.includes("passport") || str === "4") return 4;
		return 1;
	}
	static mapQuocTich(val) {
		if (!val) return "VNM";
		const clean = String(val).trim().toUpperCase();
		if (clean.length === 3) return clean;
		return catalogManager.findQuocTich(clean)?.maQT || clean;
	}
};
//#endregion
export { DataTransformer as t };
