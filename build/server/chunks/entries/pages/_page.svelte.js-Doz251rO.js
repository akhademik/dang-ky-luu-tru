import { ag as head, ah as attr_class, af as escape_html, ai as attr, aj as ensure_array_like } from '../../chunks/server.js-Co_lv80R.js';
import '../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let sheetId = "16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q";
		let selectedGid = "0";
		let availableTabs = [];
		let currentSourceLabel = "Chưa nạp dữ liệu";
		let isLoadingSheet = false;
		let currentRows = [];
		let selectedIndices = /* @__PURE__ */ new Set();
		let editingIndices = /* @__PURE__ */ new Set();
		let validationStates = [];
		let catalogs = {
			quocTich: []};
		let toastVisible = false;
		let toastCode = "";
		let toastMsg = "";
		let toastTimer = null;
		function showToast(code, msg) {
			toastCode = code;
			toastMsg = msg;
			toastVisible = true;
			if (toastTimer) clearTimeout(toastTimer);
			toastTimer = setTimeout(() => {
				toastVisible = false;
			}, 2500);
		}
		function cleanRoomNumber(roomRaw) {
			const raw = String(roomRaw ?? "").trim();
			if (!raw) return "";
			const match = raw.match(/[1-9]/);
			return match ? match[0] : "";
		}
		function isGuestVN(row) {
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
		function getCombinedAddress(row) {
			const loaiGiayToName = String(row.loaiGiayTo || row["Loại giấy tờ"] || "").toLowerCase();
			if (loaiGiayToName.includes("hộ chiếu") || loaiGiayToName.includes("passport")) return "";
			const rawAddress = String(row.diaChi || row["Địa chỉ"] || row["Địa chỉ chi tiết"] || "").trim();
			const tinhRaw = String(row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || "").trim();
			const parts = [
				rawAddress,
				String(row.phuongXa || row["Phường/Xã"] || "").trim(),
				String(row.quanHuyen || row["Quận/Huyện"] || "").trim(),
				tinhRaw
			].filter(Boolean);
			return parts.length > 0 ? parts.join(", ") : "";
		}
		function getDisplayAddress(row) {
			if (!isGuestVN(row)) {
				const val = String(row.thoiHanTamTru || row["Thời hạn tạm trú"] || "-");
				return {
					shortText: val,
					fullText: `Thời hạn tạm trú: ${val}`
				};
			}
			const loaiGiayToName = String(row.loaiGiayTo || row["Loại giấy tờ"] || "").toLowerCase();
			if (loaiGiayToName.includes("hộ chiếu") || loaiGiayToName.includes("passport")) return {
				shortText: "-",
				fullText: "Khách hộ chiếu: địa chỉ để trống"
			};
			const fullAddr = getCombinedAddress(row);
			if (!fullAddr) return {
				shortText: "-",
				fullText: "Chưa có địa chỉ"
			};
			const tinhRaw = String(row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || "").trim();
			if (tinhRaw) return {
				shortText: tinhRaw,
				fullText: fullAddr
			};
			const parts = fullAddr.split(",").map((p) => p.trim()).filter(Boolean);
			return {
				shortText: parts[parts.length - 1] || fullAddr,
				fullText: fullAddr
			};
		}
		async function fetchSheetData() {
			isLoadingSheet = true;
			try {
				const data = await (await fetch(`/api/sheets?sheetId=${encodeURIComponent(sheetId)}&gid=${encodeURIComponent(selectedGid)}`)).json();
				if (data.success) {
					currentRows = data.rows || [];
					selectedIndices = /* @__PURE__ */ new Set();
					editingIndices = /* @__PURE__ */ new Set();
					currentSourceLabel = `Tab: "${data.selectedTab?.name || "Tab hiện tại"}" (${currentRows.length} dòng)`;
					await updatePayloadPreview();
					showToast("NẠP", `Đã tải ${currentRows.length} dòng từ Google Sheet!`);
				} else alert(`Lỗi nạp dữ liệu: ${data.error}`);
			} catch (err) {
				alert(`Lỗi kết nối: ${err.message}`);
			} finally {
				isLoadingSheet = false;
			}
		}
		async function updatePayloadPreview() {
			try {
				const data = await (await fetch("/api/transform", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ rows: currentRows })
				})).json();
				(data.vnPayloads || []).map((item) => item.payload);
				(data.foreignPayloads || []).map((item) => item.payload);
				validationStates = (data.completenessList || []).map((item) => item.completeness);
			} catch (err) {
				console.error("Lỗi phân tích payloads:", err);
			}
		}
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>KBTT Hub v1.4 | Đồng Bộ Khai Báo Lưu Trú</title>`);
			});
		});
		$$renderer.push(`<header class="bg-slate-900 text-white border-b border-slate-700/80 sticky top-0 z-40 shadow-sm backdrop-blur-md"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"><div class="flex items-center gap-3"><div class="bg-indigo-600 p-2.5 rounded-xl shadow-inner flex items-center justify-center"><i class="fa-solid fa-hotel text-white text-base"></i></div> <div><h1 class="font-bold text-base tracking-tight flex items-center gap-2"><span>KBTT Hub</span> <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">API v1.4</span></h1> <p class="text-xs text-slate-400">Đồng bộ OCR Google Sheets &amp; Khai Báo CSDL Lưu Trú</p></div></div> <div class="flex items-center gap-3 text-xs"><div class="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg"><span${attr_class(`w-2 h-2 rounded-full ${"bg-amber-400"}`)}></span> <span class="text-slate-300">Token:</span> <span class="font-mono font-semibold text-slate-200">${escape_html("Chưa nạp")}</span> <button class="ml-1 text-indigo-400 hover:text-indigo-300 underline font-medium">Lấy lại</button></div> <div class="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> <span class="text-slate-300">Danh mục:</span> <span class="font-medium text-slate-200">${escape_html(catalogs.quocTich.length > 0 ? "Sẵn sàng" : "Đang tải...")}</span></div></div></div></header> <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full space-y-4"><section class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm space-y-3"><div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center"><div class="md:col-span-4 flex items-center gap-2"><label for="sheetIdInput" class="text-xs font-semibold text-slate-600 whitespace-nowrap">Sheet ID:</label> <input type="text" id="sheetIdInput"${attr("value", sheetId)} placeholder="Google Sheet ID" class="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"/></div> <div class="md:col-span-3 flex items-center gap-2"><label for="sheetTabSelect" class="text-xs font-semibold text-slate-600 whitespace-nowrap">Tab:</label> `);
		$$renderer.select({
			id: "sheetTabSelect",
			value: selectedGid,
			onchange: fetchSheetData,
			class: "w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition"
		}, ($$renderer) => {
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(availableTabs);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let tab = each_array[$$index];
				$$renderer.option({ value: tab.gid }, ($$renderer) => {
					$$renderer.push(`${escape_html(tab.name)}`);
				});
			}
			$$renderer.push(`<!--]-->`);
		});
		$$renderer.push(`</div> <div class="md:col-span-5 flex items-center justify-end gap-2 flex-wrap"><button${attr("disabled", isLoadingSheet, true)} class="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"><i${attr_class(`fa-solid fa-arrows-rotate ${isLoadingSheet ? "fa-spin" : ""}`)}></i> <span>Kéo Dữ Liệu Tab</span></button> <button class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition border border-slate-300">Dữ liệu mẫu</button> <button class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"><i class="fa-solid fa-plus"></i> Thêm Dòng</button> <button class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-1.5"><i class="fa-solid fa-cloud-arrow-up"></i> Đồng Bộ Tất Cả</button></div></div> <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80 text-slate-500"><span class="flex items-center gap-1.5 font-medium"><i class="fa-regular fa-folder-open text-slate-400"></i> <span>${escape_html(currentSourceLabel)}</span></span> <span class="text-slate-400">Hỗ trợ OCR 2 nhánh: API 5 (Việt Nam) &amp; API 4 (Nước ngoài)</span></div></section> <nav class="flex border-b border-slate-300 text-xs font-medium space-x-6"><button${attr_class(`pb-2.5 transition flex items-center gap-2 border-b-2 border-indigo-600 text-indigo-600 font-semibold`)}><i class="fa-solid fa-table-list"></i> <span>Bảng Dữ Liệu Khách Lưu Trú</span> <span class="bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full text-[11px]">${escape_html(currentRows.length)}</span></button> <button${attr_class(`pb-2.5 transition flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800`)}><i class="fa-solid fa-code"></i> <span>Xem JSON Payload API</span></button> <button${attr_class(`pb-2.5 transition flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800`)}><i class="fa-solid fa-clock-rotate-left"></i> <span>Nhật Ký &amp; Kết Quả Thực Thi</span></button> <button${attr_class(`pb-2.5 transition flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800`)}><i class="fa-solid fa-book-atlas"></i> <span>Tra Cứu Danh Mục Hệ Thống</span></button></nav> `);
		{
			$$renderer.push(`<!--[0--><section class="space-y-3"><div class="flex items-center justify-between bg-slate-200/60 px-4 py-2.5 rounded-lg border border-slate-300 text-xs"><div class="flex items-center gap-2"><span class="font-semibold text-slate-700">Đã chọn:</span> <span class="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">${escape_html(selectedIndices.size > 0 ? selectedIndices.size : "Tất cả")}</span> <span class="text-slate-500 ml-2">Nhấp đúp chuột vào dòng để mở Modal chỉnh sửa chi tiết</span></div> <button class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold transition shadow-xs flex items-center gap-1.5"><i class="fa-solid fa-paper-plane"></i> <span>Push Đăng Ký Đã Chọn</span></button></div> <div class="bg-slate-100/90 rounded-xl border border-slate-300/80 shadow-sm overflow-hidden"><div class="overflow-x-auto max-h-[520px]"><table class="w-full text-left text-xs text-slate-700"><thead class="bg-slate-300/80 text-slate-800 uppercase font-bold text-[11px] sticky top-0 z-10 border-b border-slate-300"><tr><th class="p-3 w-8 text-center"><input type="checkbox"${attr("checked", currentRows.length > 0 && selectedIndices.size === currentRows.length, true)} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"/></th><th class="p-3 w-8 text-center">#</th><th class="p-3">Họ tên</th><th class="p-3">Ngày sinh</th><th class="p-3">Giới tính</th><th class="p-3">Quốc tịch</th><th class="p-3">Loại giấy tờ</th><th class="p-3">Số giấy tờ</th><th class="p-3 text-center">Phòng</th><th class="p-3">Ngày đến / đi</th><th class="p-3">Địa chỉ</th><th class="p-3 w-28 text-center">Thao tác</th></tr></thead><tbody class="divide-y divide-slate-200/90 bg-[#f8fafc]"><!--[-->`);
			const each_array_1 = ensure_array_like(currentRows);
			for (let idx = 0, $$length = each_array_1.length; idx < $$length; idx++) {
				let row = each_array_1[idx];
				const valState = validationStates[idx] || {
					isComplete: true,
					fieldStatus: {}
				};
				const isComplete = valState.isComplete;
				const fStatus = valState.fieldStatus || {};
				const isEditing = editingIndices.has(idx);
				const isChecked = selectedIndices.has(idx);
				const addrInfo = getDisplayAddress(row);
				$$renderer.push(`<tr${attr_class(`hover:bg-slate-100/80 transition ${!isComplete ? "bg-rose-50/30" : ""} ${isChecked ? "bg-indigo-50/30" : ""}`)}><td class="p-3 text-center"><input type="checkbox"${attr("checked", isChecked, true)} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"/></td><td class="p-3 text-center font-mono text-slate-400">${escape_html(idx + 1)}</td><td class="p-3 font-medium text-slate-900">`);
				if (isEditing) $$renderer.push(`<!--[0--><input type="text"${attr("value", row.hoTen || row["Họ tên"] || "")} class="w-full rounded px-2 py-1 outline-none uppercase font-bold text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800"/>`);
				else if (fStatus.hoTen?.valid ?? (row.hoTen || row["Họ tên"])) $$renderer.push(`<!--[1--><button type="button" class="uppercase font-bold text-slate-800 cursor-pointer hover:text-indigo-600 transition text-left">${escape_html(row.hoTen || row["Họ tên"])}</button>`);
				else $$renderer.push(`<!--[-1--><button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-semibold px-2 py-0.5 rounded text-xs cursor-pointer">Thiếu họ tên *</button>`);
				$$renderer.push(`<!--]--></td><td class="p-3 font-mono">`);
				if (isEditing) $$renderer.push(`<!--[0--><input type="text"${attr("value", row.ngaySinh || row["D.O.B"] || row["Ngày sinh"] || "")} placeholder="YYYY-MM-DD" class="w-24 rounded px-2 py-1 outline-none text-xs font-mono transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800"/>`);
				else if (fStatus.ngaySinh?.valid ?? (row.ngaySinh || row["D.O.B"] || row["Ngày sinh"])) $$renderer.push(`<!--[1--><button type="button" class="cursor-pointer hover:text-indigo-600 transition">${escape_html(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"])}</button>`);
				else $$renderer.push(`<!--[-1--><button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-2 py-0.5 rounded text-xs cursor-pointer">Thiếu ngày sinh *</button>`);
				$$renderer.push(`<!--]--></td><td class="p-3">`);
				if (isEditing) {
					$$renderer.push(`<!--[0--><select class="bg-emerald-50/50 border border-emerald-400 rounded px-2 py-1 outline-none text-xs font-medium transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500">`);
					$$renderer.option({
						value: "Nam",
						selected: (row.gioiTinh || row["Giới tính"]) === "Nam" || (row.gioiTinh || row["Giới tính"]) === "M"
					}, ($$renderer) => {
						$$renderer.push(`Nam`);
					});
					$$renderer.option({
						value: "Nữ",
						selected: (row.gioiTinh || row["Giới tính"]) === "Nữ" || (row.gioiTinh || row["Giới tính"]) === "F"
					}, ($$renderer) => {
						$$renderer.push(`Nữ`);
					});
					$$renderer.push(`</select>`);
				} else $$renderer.push(`<!--[-1--><span class="px-2 py-0.5 rounded bg-slate-200/80 font-semibold text-slate-700 text-xs">${escape_html((row.gioiTinh || row["Giới tính"]) === "Nữ" || (row.gioiTinh || row["Giới tính"]) === "F" ? "Nữ" : "Nam")}</span>`);
				$$renderer.push(`<!--]--></td><td class="p-3">`);
				if (isEditing) $$renderer.push(`<!--[0--><input type="text"${attr("value", row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "VNM")} class="w-20 rounded px-1.5 py-1 outline-none uppercase font-bold text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800"/>`);
				else if (fStatus.quocTich?.valid ?? true) $$renderer.push(`<!--[1--><span class="font-bold text-slate-700 text-xs">${escape_html(String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "VNM").toUpperCase())}</span>`);
				else $$renderer.push(`<!--[-1--><span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-bold px-1.5 py-0.5 rounded text-xs cursor-help"${attr("title", fStatus.quocTich?.error)}>${escape_html(String(row.quocTich || "LỖI").toUpperCase())} <i class="fa-solid fa-circle-exclamation"></i></span>`);
				$$renderer.push(`<!--]--></td><td class="p-3">`);
				if (isEditing) {
					$$renderer.push(`<!--[0--><select class="bg-emerald-50/50 border border-emerald-400 rounded px-1.5 py-1 outline-none text-xs max-w-[130px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500">`);
					$$renderer.option({
						value: "Thẻ CCCD",
						selected: row.loaiGiayTo === "Thẻ CCCD" || row["Loại giấy tờ"] === "Thẻ CCCD"
					}, ($$renderer) => {
						$$renderer.push(`Thẻ CCCD (1)`);
					});
					$$renderer.option({
						value: "Thẻ CMND",
						selected: row.loaiGiayTo === "Thẻ CMND" || row["Loại giấy tờ"] === "Thẻ CMND"
					}, ($$renderer) => {
						$$renderer.push(`Thẻ CMND (2)`);
					});
					$$renderer.option({
						value: "Giấy phép lái xe",
						selected: row.loaiGiayTo === "Giấy phép lái xe" || row["Loại giấy tờ"] === "Giấy phép lái xe"
					}, ($$renderer) => {
						$$renderer.push(`GPLX (3)`);
					});
					$$renderer.option({
						value: "Hộ chiếu",
						selected: row.loaiGiayTo === "Hộ chiếu" || row["Loại giấy tờ"] === "Hộ chiếu"
					}, ($$renderer) => {
						$$renderer.push(`Hộ chiếu (4)`);
					});
					$$renderer.option({
						value: "Thẻ Căn Cước",
						selected: row.loaiGiayTo === "Thẻ Căn Cước" || row["Loại giấy tờ"] === "Thẻ Căn Cước"
					}, ($$renderer) => {
						$$renderer.push(`Thẻ Căn Cước (8)`);
					});
					$$renderer.push(`</select>`);
				} else $$renderer.push(`<!--[-1--><span class="text-slate-700 text-xs">${escape_html(row.loaiGiayTo || row["Loại giấy tờ"] || "Thẻ CCCD (1)")}</span>`);
				$$renderer.push(`<!--]--></td><td class="p-3 font-mono font-bold text-indigo-700">`);
				if (isEditing) $$renderer.push(`<!--[0--><input type="text"${attr("value", row.soGiayTo || row["Số giấy tờ"] || row.soHoChieu || row["Số hộ chiếu"] || "")} placeholder="Số giấy tờ" class="w-28 rounded px-2 py-1 outline-none font-bold font-mono text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-indigo-700"/>`);
				else if (fStatus.soGiayTo?.valid ?? fStatus.soHoChieu?.valid ?? true) $$renderer.push(`<!--[1--><button type="button" class="cursor-pointer hover:underline font-mono font-bold text-indigo-700">${escape_html(row.soGiayTo || row["Số giấy tờ"] || row.soHoChieu || row["Số hộ chiếu"])}</button>`);
				else $$renderer.push(`<!--[-1--><button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-mono font-bold px-2 py-0.5 rounded text-xs cursor-pointer"${attr("title", fStatus.soGiayTo?.error || fStatus.soHoChieu?.error)}>${escape_html(row.soGiayTo || row["Số giấy tờ"] || "Thiếu số *")}</button>`);
				$$renderer.push(`<!--]--></td><td class="p-3 text-center">`);
				if (isEditing) {
					$$renderer.push(`<!--[0--><select class="rounded px-2 py-1 outline-none text-xs font-semibold transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800 text-center">`);
					$$renderer.option({ value: "" }, ($$renderer) => {
						$$renderer.push(`--`);
					});
					$$renderer.push(`<!--[-->`);
					const each_array_2 = ensure_array_like([
						1,
						2,
						3,
						4,
						5,
						6,
						7,
						8,
						9
					]);
					for (let $$index_1 = 0, $$length = each_array_2.length; $$index_1 < $$length; $$index_1++) {
						let num = each_array_2[$$index_1];
						$$renderer.option({
							value: num,
							selected: cleanRoomNumber(row.soPhong || row["Số phòng"]) === String(num)
						}, ($$renderer) => {
							$$renderer.push(`${escape_html(num)}`);
						});
					}
					$$renderer.push(`<!--]--></select>`);
				} else if (fStatus.soPhong?.valid ?? (row.soPhong || row["Số phòng"])) $$renderer.push(`<!--[1--><span class="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded text-xs">${escape_html(cleanRoomNumber(row.soPhong || row["Số phòng"]))}</span>`);
				else $$renderer.push(`<!--[-1--><span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded text-xs cursor-help" title="Thiếu hoặc sai số phòng">Thiếu</span>`);
				$$renderer.push(`<!--]--></td><td class="p-3 text-[11px] text-slate-500">`);
				if (isEditing) $$renderer.push(`<!--[0--><div class="space-y-1"><input type="text"${attr("value", row.ngayDen || row["(từ ngày)"] || row["Ngày đến"] || "")} placeholder="Đến (hôm nay/qua)" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800"/> <input type="text"${attr("value", row.ngayDi || row["(đến ngày)"] || row["Ngày đi"] || "")} placeholder="Đi" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800"/></div>`);
				else {
					$$renderer.push(`<!--[-1--><button type="button" class="space-y-0.5 cursor-pointer text-left" title="Bấm để chỉnh sửa">`);
					if (fStatus.ngayDen?.valid ?? true) $$renderer.push(`<!--[0--><div>Đến: <strong>${escape_html(row.ngayDen || row["(từ ngày)"] || row["Ngày đến"] || "N/A")}</strong></div>`);
					else $$renderer.push(`<!--[-1--><div class="bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 rounded cursor-help font-semibold text-[10px]"${attr("title", fStatus.ngayDen?.error)}>Đến: ${escape_html(row.ngayDen || "Thiếu")} <i class="fa-solid fa-triangle-exclamation"></i></div>`);
					$$renderer.push(`<!--]--> <div>Đi: <strong>${escape_html(row.ngayDi || row["(đến ngày)"] || row["Ngày đi"] || "N/A")}</strong></div></button>`);
				}
				$$renderer.push(`<!--]--></td><td class="p-3 text-slate-700 text-[11px] max-w-[150px]">`);
				if (isEditing) $$renderer.push(`<!--[0--><input type="text"${attr("value", getCombinedAddress(row) || row.diaChi || row["Địa chỉ"] || "")} placeholder="Chi tiết, Xã, Huyện, Tỉnh" class="w-32 rounded px-1.5 py-0.5 outline-none text-[11px] bg-emerald-50/50 border border-emerald-400 text-slate-800 transition-all duration-150 focus:scale-110 focus:shadow-xl focus:ring-2 focus:ring-indigo-500"/>`);
				else $$renderer.push(`<!--[-1--><button type="button" class="cursor-pointer hover:text-indigo-600 transition underline decoration-dotted decoration-slate-400 font-medium truncate inline-block max-w-[130px] text-left"${attr("title", `Bấm để chỉnh sửa: ${addrInfo.fullText}`)}>${escape_html(addrInfo.shortText)}</button>`);
				$$renderer.push(`<!--]--></td><td class="p-3 text-center whitespace-nowrap"><div class="inline-flex items-center gap-1"><button class="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-100 transition" title="Bung Modal Chỉnh sửa chi tiết"><i class="fa-solid fa-up-right-from-square"></i></button> <button${attr_class(`p-1.5 rounded transition ${isEditing ? "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"}`)}${attr("title", isEditing ? "Lưu nhanh" : "Sửa nhanh")}><i${attr_class(`fa-solid ${isEditing ? "fa-floppy-disk" : "fa-pen"}`)}></i></button> <button class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Đăng ký riêng dòng này"><i class="fa-solid fa-paper-plane"></i></button> <button class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition" title="Xóa dòng"><i class="fa-solid fa-trash-can"></i></button></div></td></tr>`);
			}
			$$renderer.push(`<!--]--></tbody></table></div></div></section>`);
		}
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></main> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (toastVisible) $$renderer.push(`<!--[0--><div class="fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 z-50 transition-all duration-300"><i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span><strong>${escape_html(toastCode)}</strong>: ${escape_html(toastMsg)}</span></div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <footer class="bg-slate-800 text-slate-300 border-t border-slate-700 py-3 text-center text-xs mt-auto">Hệ thống Khai Báo Lưu Trú KBTT v1.4 © 2026. Kiến trúc SvelteKit 2 + Svelte 5 + TypeScript.</footer>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-Doz251rO.js.map
