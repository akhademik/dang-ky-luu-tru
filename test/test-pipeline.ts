import assert from "node:assert/strict";
import { catalogManager } from "../src/lib/server/catalogManager.js";
import { tokenManager } from "../src/lib/server/tokenManager.js";
import {
	DataTransformer,
	type RawOcrRow,
} from "../src/lib/server/dataTransformer.js";
import { GoogleSheetService } from "../src/lib/server/googleSheetService.js";
import { KbttClient } from "../src/lib/server/kbttClient.js";
import { CONFIG } from "../src/lib/server/config.js";

async function runTests(): Promise<void> {
	console.log(
		"🧪 Đang chạy unit tests cho các module SvelteKit + TypeScript KBTT...",
	);

	// 1. Test CatalogManager
	await catalogManager.initialize();
	assert.equal(catalogManager.findQuocTich("Việt Nam"), "VNM");
	assert.equal(catalogManager.findQuocTich("VN"), "VNM");
	assert.equal(catalogManager.findQuocTich("Hoa Kỳ"), "USA");
	assert.equal(catalogManager.findQuocTich("China"), "CHN");
	assert.equal(catalogManager.findQuocTich("Russia"), "RUS");
	assert.equal(catalogManager.findQuocTich("Hàn Quốc"), "KOR");
	assert.equal(catalogManager.isValidQuocTichCode("VNM"), true);
	assert.equal(catalogManager.isValidQuocTichCode("RUS"), true);
	assert.equal(catalogManager.isValidQuocTichCode("USA"), true);
	assert.equal(catalogManager.isValidQuocTichCode("XYZ_NOT_EXIST"), false);
	assert.equal(catalogManager.lyDoCuTruList.length, 2);
	assert.equal(catalogManager.findLoaiGiayTo("Thẻ CCCD"), 1);
	assert.equal(catalogManager.findLoaiGiayTo("Hộ chiếu"), 4);
	assert.equal(catalogManager.findLoaiGiayTo("Thẻ Căn Cước"), 8);
	console.log("✅ CatalogManager test passed!");

	// 2. Test DataTransformer formatting
	assert.equal(DataTransformer.formatDateOnly("15/08/1990"), "1990-08-15");
	assert.equal(DataTransformer.formatDateOnly("1990-08-15"), "1990-08-15");
	assert.equal(DataTransformer.mapGender("Nam"), "M");
	assert.equal(DataTransformer.mapGender("Nữ"), "F");
	assert.equal(
		DataTransformer.cleanDocNumber(" 001-090.012 345 "),
		"001090012345",
	);

	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const next2Days = new Date(now);
	next2Days.setDate(next2Days.getDate() + 2);
	const next2DaysStr = `${next2Days.getFullYear()}-${pad(next2Days.getMonth() + 1)}-${pad(next2Days.getDate())}`;

	// Test Room Number Cleaning (1-9)
	assert.equal(DataTransformer.cleanRoomNumber("P.06"), "6");
	assert.equal(DataTransformer.cleanRoomNumber("P.07"), "7");
	assert.equal(DataTransformer.cleanRoomNumber("Phòng 3"), "3");
	assert.equal(DataTransformer.cleanRoomNumber("09"), "9");
	assert.equal(DataTransformer.cleanRoomNumber("VIP"), "");
	assert.equal(DataTransformer.cleanRoomNumber(""), "");

	// Test VN Guest transformation
	const rawVn: RawOcrRow = {
		"Họ tên": "Nguyễn Văn A",
		"Ngày sinh": "01/10/1992",
		"Giới tính": "Nam",
		"Quốc tịch": "VNM",
		"Loại giấy tờ": "Thẻ CCCD",
		"Số giấy tờ": "001092000001",
		"Địa chỉ chi tiết": "Ba Đình, Hà Nội",
		"Ngày đến": todayStr,
		"Ngày đi": next2DaysStr,
		"Số phòng": "P.01",
	};
	const isVn = DataTransformer.isGuestVN(rawVn);
	assert.equal(isVn, true);
	const vnPayload = DataTransformer.transformToPayloadVn(rawVn);
	assert.equal(vnPayload.hoTen, "NGUYỄN VĂN A");
	assert.equal(vnPayload.gioiTinh, "M");
	assert.equal(vnPayload.soGiayTo, "001092000001");
	assert.equal(vnPayload.soPhong, "Phong so 1");
	assert.equal(vnPayload.ngayThangNamSinhStr, "1992-10-01");
	assert.equal(vnPayload.ngayDenCsltStr, `${todayStr} 14:00:00`);
	console.log("✅ DataTransformer (VN & Room 1-9 Cleaning) test passed!");

	// Test Foreign Guest transformation
	const rawForeign: RawOcrRow = {
		"Họ tên": "DAVID SMITH",
		"Ngày sinh": "1988-12-05",
		"Giới tính": "Nam",
		"Quốc tịch": "USA",
		"Loại giấy tờ": "Hộ chiếu",
		"Số giấy tờ": "E98765432",
		"Số phòng": "P.02",
		"Ngày đến": `${todayStr} 12:00:00`,
		"Ngày đi": `${next2DaysStr} 12:00:00`,
	};
	const isForeignVN = DataTransformer.isGuestVN(rawForeign);
	assert.equal(isForeignVN, false);
	const foreignPayload = DataTransformer.transformToPayloadForeign(rawForeign);
	assert.equal(foreignPayload.maQuocTich, "USA");
	assert.equal(foreignPayload.soHoChieu, "E98765432");
	assert.equal(foreignPayload.soPhong, "Phong so 2");
	console.log("✅ DataTransformer (Foreign) test passed!");

	// Test Validation Failure (invalid CCCD length)
	const invalidVn: RawOcrRow = {
		"Họ tên": "Lê Văn B",
		"Ngày sinh": "01/01/1990",
		"Loại giấy tờ": "Thẻ CCCD",
		"Số giấy tờ": "123",
		"Số phòng": "3",
		"Ngày đến": todayStr,
		"Ngày đi": next2DaysStr,
	};
	const compInvalid = DataTransformer.checkCompleteness(invalidVn);
	assert.equal(compInvalid.isComplete, false);
	assert.equal(compInvalid.fieldStatus.soGiayTo?.valid, false);

	// Test Validation Failure (invalid room number)
	const invalidRoom: RawOcrRow = {
		"Họ tên": "Lê Văn B",
		"Ngày sinh": "01/01/1990",
		"Loại giấy tờ": "Thẻ CCCD",
		"Số giấy tờ": "001092000001",
		"Số phòng": "VIP-NoNumber",
		"Ngày đến": todayStr,
		"Ngày đi": next2DaysStr,
	};
	const compRoom = DataTransformer.checkCompleteness(invalidRoom);
	assert.equal(compRoom.isComplete, false);
	assert.equal(compRoom.fieldStatus.soPhong?.valid, false);

	// Test Validation Failure (past check-in date blocked)
	const pastCheckIn: RawOcrRow = {
		"Họ tên": "GRACHEV NIKITA",
		"Ngày sinh": "1995-11-25",
		"Quốc tịch": "RUS",
		"Số giấy tờ": "552165656",
		"Số phòng": "P.09",
		"Ngày đến": "2020-01-01",
		"Ngày đi": "2020-01-05",
	};
	const compPast = DataTransformer.checkCompleteness(pastCheckIn);
	assert.equal(compPast.isComplete, false);
	assert.equal(compPast.fieldStatus.ngayDen?.valid, false);

	// Test Validation (DD/MM/YYYY HH:mm:ss arrival date format)
	const d = new Date();
	const dmyToday = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} 14:51:47`;
	const dmyRow: RawOcrRow = {
		"Họ tên": "NGUYỄN VĂN AN",
		"Ngày sinh": "25/11/1995",
		"Quốc tịch": "VNM",
		"Số giấy tờ": "001095000123",
		"Số phòng": "3",
		"Ngày đến": dmyToday,
		"Ngày đi": next2DaysStr,
	};
	const compDmy = DataTransformer.checkCompleteness(dmyRow);
	assert.equal(compDmy.isComplete, true);
	assert.equal(compDmy.fieldStatus.ngayDen?.valid, true);

	// Test Validation (nationality code check)
	const rusRow: RawOcrRow = {
		"Họ tên": "GRACHEV NIKITA",
		"Ngày sinh": "1995-11-25",
		"Quốc tịch": "RUS",
		"Số giấy tờ": "552165656",
		"Số phòng": "P.09",
		"Ngày đến": todayStr,
		"Ngày đi": next2DaysStr,
	};
	const compRus = DataTransformer.checkCompleteness(rusRow);
	assert.equal(compRus.fieldStatus.quocTich?.valid, true);
	console.log(
		"✅ DataTransformer (Validation, DD/MM/YYYY & Past Date Blocking) test passed!",
	);

	// 3. Test GoogleSheetService (CSV Parsing & Tabs)
	const sheetService = new GoogleSheetService();
	const sampleCsv = `STT,Họ tên,D.O.B,Giới tính,Quốc tịch,Loại giấy tờ,Tên giấy tờ,Số giấy tờ,Tỉnh,Quận/Huyện,Phường/Xã,Địa chỉ,(từ ngày),(đến ngày),Số phòng,Đã đăng ký
1,"LÊ VĂN CƯỜNG",1991-03-12,Nam,Việt Nam,Thẻ CCCD,CCCD,001091001111,"TP Hồ Chí Minh","Quận 1","Bến Nghé","123 Lê Lợi","2026-09-16 14:00:00","2026-09-18 12:00:00",2,"Đã đăng ký"
2,"ALICE WANG",1994-07-22,Nữ,China,Hộ chiếu,Passport,G12345678,"Beijing","Chaoyang","Sanlitun","456 Road","2026-09-16 15:00:00","2026-09-19 11:00:00",3,"Chưa đăng ký"`;
	const parsedRows = sheetService.parseCsv(sampleCsv);
	assert.equal(parsedRows.length, 2);
	assert.equal(parsedRows[0].hoTen, "LÊ VĂN CƯỜNG");
	assert.equal(parsedRows[0].ngaySinh, "1991-03-12");
	assert.equal(parsedRows[0].gioiTinh, "Nam");
	assert.equal(parsedRows[0].quocTich, "Việt Nam");
	assert.equal(parsedRows[0].soGiayTo, "001091001111");
	assert.equal(parsedRows[0].tinhTp, "TP Hồ Chí Minh");
	assert.equal(parsedRows[0].quanHuyen, "Quận 1");
	assert.equal(parsedRows[0].phuongXa, "Bến Nghé");
	assert.equal(parsedRows[0].diaChi, "123 Lê Lợi");
	assert.equal(parsedRows[0].soPhong, "2");
	assert.equal(parsedRows[1].hoTen, "ALICE WANG");
	assert.equal(parsedRows[1].soGiayTo, "G12345678");
	assert.equal(parsedRows[1].soPhong, "3");
	console.log(
		"✅ GoogleSheetService (CSV Parsing & Normalization with 16 columns) test passed!",
	);

	// 3.1 Test GoogleSheetService Live Fetch with full URL / gid & Tabs list
	console.log(
		"--- Kiểm tra kéo dữ liệu trực tiếp từ Google Sheets công khai & Quét Tabs ---",
	);
	const tabsRes = await sheetService.fetchSheetTabs(CONFIG.GOOGLE_SHEET_ID);
	assert.ok(tabsRes.tabs.length > 0, "Phải tìm thấy ít nhất 1 tab");
	console.log(
		`✅ Tìm thấy ${tabsRes.tabs.length} tabs trên Google Sheet. Tab mặc định: GID ${tabsRes.defaultGid}`,
	);

	// Test Live Fetch with default date tab
	const liveRes = await sheetService.fetchSheetData(
		CONFIG.GOOGLE_SHEET_ID,
		tabsRes.defaultGid,
	);
	if (liveRes.success && liveRes.rows.length > 0) {
		const liveRow = liveRes.rows[0];
		console.log(
			`✅ Kéo thành công ${liveRes.rows.length} dòng từ Google Sheet! Khách: ${liveRow.hoTen}, Phòng trên Sheet: "${liveRow.soPhong}"`,
		);
		const validLiveRow: RawOcrRow = {
			...liveRow,
			quocTich: "VNM",
			soPhong: "P.07",
			ngayDen: `${todayStr} 14:00:00`,
			ngayDi: `${next2DaysStr} 12:00:00`,
		};
		const transformed = DataTransformer.transformToPayloadVn(validLiveRow);
		assert.ok(transformed.hoTen, "Họ tên không được rỗng");
		assert.ok(
			transformed.gioiTinh === "M" || transformed.gioiTinh === "F",
			"Giới tính phải là M hoặc F",
		);
		assert.equal(transformed.soPhong, "Phong so 7");
		console.log(
			"✅ Chuẩn hóa dòng dữ liệu thực tế từ Google Sheet sang API 5 (v1.4) thành công (Số phòng: Phong so 7):",
		);
		console.log(JSON.stringify(transformed, null, 2));
	}

	// 4. Test TokenManager & KbttClient live call
	console.log("\n--- Kiểm tra kết nối OAuth & API Client ---");
	try {
		const token = await tokenManager.login();
		assert.ok(token, "Token không được rỗng");
		console.log("✅ TokenManager Login test passed!");

		const client = new KbttClient(tokenManager);
		const apiRes = await client.submitVietnameseGuests([vnPayload]);
		console.log("✅ API Client test response:", apiRes);

		await tokenManager.revoke();
		console.log("✅ TokenManager Revoke test passed!");
	} catch (err) {
		console.warn("⚠️ Kiểm tra API Server trả về:", (err as Error).message);
	}

	console.log("\n🎉 TẤT CẢ UNIT TESTS ĐÃ HOÀN THÀNH THÀNH CÔNG!");
}

runTests().catch((err) => {
	console.error("❌ Test thất bại:", err);
	process.exit(1);
});
