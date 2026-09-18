import { QUOC_TICH_DATA } from "../data/catalogs.js";
import type { StayStatus } from "../types/index.js";

export const ROOM_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const LOAI_GIAY_TO_OPTIONS = [
	{ id: "1", name: "1 - Thẻ CCCD (1)" },
	{ id: "2", name: "2 - Thẻ CMND (2)" },
	{ id: "3", name: "3 - Giấy phép lái xe (3)" },
	{ id: "4", name: "4 - Hộ chiếu / Passport (4)" },
	{ id: "8", name: "8 - Thẻ Căn Cước (8)" },
];

export const COUNTRY_OPTIONS = [...QUOC_TICH_DATA].map((c) => {
	const code = String(c.maQT || "")
		.trim()
		.toUpperCase();
	const rawName = String(c.tenQTEn || c.name || c.tenQT || "").trim();
	const name = code === "VNM" ? "Vietnam" : rawName;
	return {
		maQT: code,
		name,
		label: `${code} - ${name}`,
	};
});

const countryNameMap = new Map<string, string>();
for (const opt of COUNTRY_OPTIONS) {
	countryNameMap.set(opt.maQT, opt.name);
}

export function getCountryFullName(code?: string | null): string {
	if (!code) return "";
	const upper = code.trim().toUpperCase();
	if (upper === "USA" || upper === "MỸ" || upper === "HOA KỲ") {
		return "United States of America";
	}
	if (
		upper === "VNM" ||
		upper === "VN" ||
		upper === "VIỆT NAM" ||
		upper === "VIETNAM"
	) {
		return "Vietnam";
	}
	return countryNameMap.get(upper) || upper;
}

export function getFullAddress(
	stay:
		| {
				dia_chi_chi_tiet?: string;
				phuong_xa?: string;
				quan_huyen?: string;
				tinh_thanh?: string;
		  }
		| null
		| undefined,
): string {
	if (!stay) return "-";
	const parts = [
		stay.dia_chi_chi_tiet?.trim(),
		stay.phuong_xa?.trim(),
		stay.quan_huyen?.trim(),
		stay.tinh_thanh?.trim(),
	].filter(Boolean);
	return parts.length > 0 ? parts.join(", ") : "-";
}

export function getStayStatusBadgeClass(status?: string | null): {
	bg: string;
	text: string;
	label: string;
} {
	switch (status as StayStatus) {
		case "READY_TO_SYNC":
		case "NOT_CHECKED_IN":
			return {
				bg: "bg-amber-500/15 border-amber-500/30",
				text: "text-amber-400",
				label: "Chờ khai báo",
			};
		case "SYNCED_KBTT":
		case "CHECKED_IN":
			return {
				bg: "bg-emerald-500/15 border-emerald-500/30",
				text: "text-emerald-400",
				label: "Đã đăng ký",
			};
		case "EXTENDED":
			return {
				bg: "bg-indigo-500/15 border-indigo-500/30",
				text: "text-indigo-400",
				label: "Đã gia hạn",
			};
		case "CHECKED_OUT":
			return {
				bg: "bg-slate-700/50 border-slate-600/50",
				text: "text-slate-400",
				label: "Đã checkout",
			};
		case "ERROR":
			return {
				bg: "bg-rose-500/15 border-rose-500/30",
				text: "text-rose-400",
				label: "Lỗi",
			};
		default:
			return {
				bg: "bg-slate-800 border-slate-700",
				text: "text-slate-300",
				label: status || "N/A",
			};
	}
}
