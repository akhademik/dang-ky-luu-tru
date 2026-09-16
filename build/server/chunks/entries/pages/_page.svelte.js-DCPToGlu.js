import { ag as head, af as escape_html, ah as attr_class, ai as ensure_array_like, aj as attr } from '../../chunks/server.js-D7F5Jtad.js';
import '../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let selectedGid = "0";
		let availableTabs = [];
		let currentSourceLabel = "Đang tải dữ liệu từ Google Sheets...";
		let tabFetchStatus = "";
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
		function cleanRoomNumber(rawRoom) {
			if (rawRoom === null || rawRoom === void 0) return "";
			const str = String(rawRoom).trim();
			if (!str) return "";
			const matches = str.match(/\d+/g);
			if (!matches || matches.length === 0) return "";
			for (const m of matches) {
				const num = parseInt(m, 10);
				if (num >= 1 && num <= 9) return String(num);
			}
			return "";
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
		async function pullDataFromGoogleSheet(forcedGid = null) {
			const gid = forcedGid !== null ? forcedGid : selectedGid;
			isLoadingSheet = true;
			currentSourceLabel = "Đang kéo dữ liệu từ Google Sheets...";
			try {
				const data = await (await fetch("/api/sheets/pull", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ gid })
				})).json();
				if (data.success && data.rows && data.rows.length > 0) {
					currentRows = data.rows.map((row) => {
						const cleaned = cleanRoomNumber(row.soPhong || row["Số phòng"] || row.room || "");
						if (cleaned) {
							row.soPhong = cleaned;
							row["Số phòng"] = cleaned;
						}
						return row;
					});
					selectedIndices = /* @__PURE__ */ new Set();
					editingIndices = /* @__PURE__ */ new Set();
					const currentTab = availableTabs.find((t) => String(t.gid) === String(gid));
					currentSourceLabel = `Tab: "${currentTab ? currentTab.name : `GID ${gid}`}" (${currentRows.length} dòng dữ liệu)`;
					await updatePayloadPreview();
					showToast("NẠP", `Đã tải ${currentRows.length} dòng từ Google Sheet!`);
				} else {
					currentSourceLabel = "Tab đã chọn không có dữ liệu phù hợp";
					currentRows = [];
					await updatePayloadPreview();
				}
			} catch (err) {
				currentSourceLabel = `Lỗi kéo dữ liệu: ${err.message}`;
			} finally {
				isLoadingSheet = false;
			}
		}
		function handleTabChange() {
			pullDataFromGoogleSheet(selectedGid);
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
				$$renderer.push(`<title>KBTT - Hệ Thống Đồng Bộ Tự Động Khai Báo Tạm Trú &amp; Lưu Trú (v1.4)</title>`);
			});
		});
		$$renderer.push(`<header class="bg-slate-800 text-white shadow-sm sticky top-0 z-50 border-b border-slate-700/80"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4"><div class="flex items-center space-x-3"><div class="w-10 h-10 rounded-xl bg-indigo-600/90 flex items-center justify-center shadow-sm"><i class="fa-solid fa-hotel text-xl text-white"></i></div> <div><h1 class="text-base font-bold tracking-tight flex items-center gap-2 text-slate-100">Hệ Thống Tích Hợp KBTT v1.4 <span class="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span> Live Sync</span></h1> <p class="text-xs text-slate-400">Đồng bộ tự động OCR từ Google Sheets lên api-kbtt.ai-vlab.com</p></div></div> <div class="flex items-center space-x-3 text-xs"><div class="bg-slate-900/60 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> <span class="text-slate-300">Danh mục: <strong class="text-white">${escape_html(catalogs.quocTich.length > 0 ? "Đã nạp" : "Đang nạp...")}</strong></span></div> <div class="bg-slate-900/60 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2"><span${attr_class(`w-2 h-2 rounded-full ${"bg-amber-400"}`)}></span> <span class="text-slate-300">Token:</span> <span class="font-mono font-bold text-slate-100">${escape_html("Chưa nạp")}</span></div> <button class="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium transition shadow-sm flex items-center gap-1.5"><i class="fa-solid fa-key"></i> Đăng nhập / Refresh</button></div></div></header> <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6"><div class="flex border-b border-slate-300 gap-2 overflow-x-auto text-sm font-medium"><button${attr_class(`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 border-indigo-600 text-indigo-800 font-bold`)}><i class="fa-solid fa-table-list"></i> Dữ Liệu Google Sheets / OCR</button> <button${attr_class(`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 border-transparent text-slate-500 hover:text-slate-700`)}><i class="fa-solid fa-cloud-arrow-up"></i> Thực Thi Đồng Bộ &amp; Log Phản Hồi</button> <button${attr_class(`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 border-transparent text-slate-500 hover:text-slate-700`)}><i class="fa-solid fa-book-bookmark"></i> Tra Cứu Danh Mục Rút Gọn</button></div> `);
		{
			$$renderer.push(`<!--[0--><section class="space-y-4"><div class="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 shadow-sm space-y-3"><div class="flex flex-wrap items-center justify-between gap-4"><div class="flex items-center gap-3"><div class="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white text-lg"><i class="fa-solid fa-file-excel"></i></div> <div><h3 class="text-sm font-bold text-slate-100">Google Sheets Tích Hợp &amp; Lựa Chọn Ngày</h3> <p class="text-xs text-slate-300">Kéo dữ liệu tự động theo từng Tab ngày (Mặc định tab ngày gần hiện tại nhất)</p></div></div> <div class="flex items-center gap-2 text-xs"><span class="text-emerald-300 font-mono">${escape_html(tabFetchStatus)}</span> <button class="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600 transition shadow-sm flex items-center gap-1.5 text-slate-200" title="Làm mới danh sách Tab ngày"><i${attr_class(`fa-solid fa-arrows-rotate ${isLoadingSheet ? "fa-spin" : ""}`)}></i> Nạp lại Tabs</button></div></div> <div class="flex flex-wrap items-center gap-3 pt-1"><div class="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-700"><label for="tabSelectInput" class="text-xs font-semibold text-slate-300 whitespace-nowrap pl-1.5"><i class="fa-regular fa-calendar-days mr-1"></i> Chọn Tab Ngày:</label> `);
			$$renderer.select({
				id: "tabSelectInput",
				value: selectedGid,
				onchange: handleTabChange,
				class: "text-xs text-slate-800 bg-[#f1f5f9] border border-slate-400 rounded-md px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold"
			}, ($$renderer) => {
				$$renderer.push(`<!--[-->`);
				const each_array = ensure_array_like(availableTabs);
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let t = each_array[$$index];
					$$renderer.option({ value: t.gid }, ($$renderer) => {
						$$renderer.push(`${escape_html(t.name)} ${escape_html(t.isDefault ? "⭐ (Gần nhất)" : "")}`);
					});
				}
				$$renderer.push(`<!--]-->`);
			});
			$$renderer.push(`</div> <div class="flex items-center gap-2"><button${attr("disabled", isLoadingSheet, true)} class="px-4 py-2 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50" title="Lấy dữ liệu từ Google Sheets về bảng"><i class="fa-solid fa-cloud-arrow-down"></i> Lấy thông tin từ sheet</button></div></div></div> <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-wrap items-center justify-between gap-4"><div><h2 class="text-sm font-bold text-slate-800">Danh sách bản ghi OCR cần đồng bộ</h2> <p class="text-xs text-slate-500">${escape_html(currentSourceLabel)}</p></div> <div class="flex flex-wrap items-center gap-2"><button class="px-3 py-1.5 text-xs bg-slate-200/90 hover:bg-slate-300 text-slate-700 rounded-lg border border-slate-300 font-medium transition flex items-center gap-1.5"><i class="fa-solid fa-rotate-left"></i> Dữ liệu mẫu</button> <button class="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm"><i class="fa-solid fa-plus"></i> Thêm dòng</button> <button class="px-3.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm"><i class="fa-solid fa-paper-plane"></i> Push đăng ký đã chọn (<span class="font-mono">${escape_html(selectedIndices.size > 0 ? selectedIndices.size : "Tất cả")}</span>)</button> <button class="px-4 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm"><i class="fa-solid fa-bolt"></i> Push tất cả</button></div></div> <div class="bg-slate-100/90 rounded-xl border border-slate-300/80 shadow-sm overflow-hidden"><div class="overflow-x-auto max-h-[520px]"><table class="w-full text-left text-xs text-slate-700"><thead class="bg-slate-300/80 text-slate-800 uppercase font-bold text-[11px] sticky top-0 z-10 border-b border-slate-300"><tr><th class="p-3 w-8 text-center"><input type="checkbox"${attr("checked", currentRows.length > 0 && selectedIndices.size === currentRows.length, true)} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"/></th><th class="p-3 w-8 text-center">#</th><th class="p-3">Họ tên</th><th class="p-3">Ngày sinh</th><th class="p-3">Giới tính</th><th class="p-3">Quốc tịch</th><th class="p-3">Loại giấy tờ</th><th class="p-3">Số giấy tờ</th><th class="p-3">Phòng</th><th class="p-3">Ngày đến / đi</th><th class="p-3">Địa chỉ</th><th class="p-3 w-28 text-center">Thao tác</th></tr></thead><tbody class="divide-y divide-slate-200/90 bg-[#f8fafc]"><!--[-->`);
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
		$$renderer.push(`<!--]--></main> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (toastVisible) $$renderer.push(`<!--[0--><div class="fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 z-50 transition-all duration-300"><i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span><strong>${escape_html(toastCode)}</strong>: ${escape_html(toastMsg)}</span></div>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <footer class="bg-slate-800 text-slate-300 border-t border-slate-700 py-3 text-center text-xs mt-auto">Module kiểm thử tích hợp KBTT API v1.4 © 2026. Chuẩn hóa kiến trúc SvelteKit &amp; TypeScript.</footer>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-DCPToGlu.js.map
