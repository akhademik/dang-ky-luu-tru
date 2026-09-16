/**
 * Module 2: Data Transformer & Validator
 * Chuẩn hóa dữ liệu dòng từ Google Sheets / OCR thành payload chuẩn API 4 hoặc API 5 (v1.4)
 */
export class DataTransformer {
  /**
   * @param {import('./catalogManager.js').CatalogManager} catalogManager
   */
  constructor(catalogManager) {
    this.catalog = catalogManager;
  }

  /**
   * Xác định dòng dữ liệu thuộc diện Khách Việt Nam hay Nước ngoài
   */
  isVietnamese(row) {
    const quocTichRaw = row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || row.nationality || '';
    const loaiGiayToRaw = row.loaiGiayTo || row['Loại giấy tờ'] || row['Tên giấy tờ'] || row.idType || '';

    // 1. Nếu loại giấy tờ là CCCD (1), CMND (2), Thẻ Căn Cước (8) -> chắc chắn là công dân Việt Nam
    const loaiGiayToId = this.catalog.findLoaiGiayTo(loaiGiayToRaw);
    if ([1, 2, 8].includes(loaiGiayToId)) return true;

    // 2. Nếu có trường quốc tịch, kiểm tra khớp
    if (quocTichRaw && String(quocTichRaw).trim()) {
      const matched = this.catalog.matchQuocTich(quocTichRaw);
      if (matched === 'VNM') return true;
      if (matched && matched !== 'VNM') return false;
      return false;
    }

    // 3. Nếu số giấy tờ là 12 chữ số (CCCD) hoặc 9 chữ số (CMND)
    const docNum = this.cleanDocNumber(row.soGiayTo || row['Số giấy tờ'] || row['Số CCCD'] || '');
    if (/^\d{12}$/.test(docNum) || /^\d{9}$/.test(docNum)) {
      return true;
    }

    return false;
  }

  /**
   * Chuẩn hóa ngày sinh thành YYYY-MM-DD (hoặc YYYY nếu chỉ có năm sinh)
   */
  formatDateOnly(dateStr) {
    if (!dateStr) return '';
    if (dateStr instanceof Date) {
      return dateStr.toISOString().split('T')[0];
    }
    const str = String(dateStr).trim();

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Match YYYY/MM/DD or YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Nếu chỉ có năm (ví dụ "1995")
    if (/^\d{4}$/.test(str)) {
      return str;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return str;
  }

  /**
   * Chuẩn hóa ngày giờ thành YYYY-MM-DD HH:mm:ss
   */
  formatDateTime(dateTimeStr, defaultTime = '12:00:00') {
    if (!dateTimeStr) return '';
    if (dateTimeStr instanceof Date) {
      const d = dateTimeStr;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    const str = String(dateTimeStr).trim();
    // Case có cả ngày và giờ (ví dụ 15/09/2026 16:53:29)
    const fullMatch = str.match(/^(\d{1,2}|\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2}|\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (fullMatch) {
      let year, month, day;
      if (fullMatch[1].length === 4) {
        year = fullMatch[1];
        month = fullMatch[2].padStart(2, '0');
        day = fullMatch[3].padStart(2, '0');
      } else {
        day = fullMatch[1].padStart(2, '0');
        month = fullMatch[2].padStart(2, '0');
        year = fullMatch[3].length === 2 ? `20${fullMatch[3]}` : fullMatch[3];
      }
      const hh = fullMatch[4].padStart(2, '0');
      const min = fullMatch[5].padStart(2, '0');
      const ss = (fullMatch[6] || '00').padStart(2, '0');
      return `${year}-${month}-${day} ${hh}:${min}:${ss}`;
    }

    // Chỉ có ngày -> gắn defaultTime
    const dateOnly = this.formatDateOnly(str);
    if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return `${dateOnly} ${defaultTime}`;
    }

    return str;
  }

  /**
   * Chuẩn hóa giới tính: "Nam"/"M" -> "M", "Nữ"/"F" -> "F"
   */
  normalizeGender(genderStr) {
    if (!genderStr) return 'M';
    const clean = String(genderStr).trim().toUpperCase();
    if (clean === 'F' || clean === 'NU' || clean === 'NỮ' || clean === 'FEMALE') {
      return 'F';
    }
    return 'M';
  }

  /**
   * Chuẩn hóa và làm sạch số giấy tờ
   */
  cleanDocNumber(docNumber) {
    if (!docNumber) return '';
    return String(docNumber).replace(/[^a-zA-Z0-9]/g, '').trim();
  }

  /**
   * Validate tính hợp lệ của số giấy tờ theo loại
   */
  validateDocNumber(docNumber, docTypeId) {
    const clean = this.cleanDocNumber(docNumber);
    if (!clean) {
      return { valid: false, error: 'Số giấy tờ không được để trống' };
    }

    // CCCD (id: 1) hoặc Căn Cước (id: 8) -> đúng 12 chữ số
    if (docTypeId === 1 || docTypeId === 8) {
      if (!/^\d{12}$/.test(clean)) {
        return { valid: false, error: `Số CCCD/Căn cước (${clean}) phải có đúng 12 chữ số` };
      }
    } else if (docTypeId === 2) {
      // CMND (id: 2) -> 9 hoặc 12 số
      if (!/^\d{9}$/.test(clean) && !/^\d{12}$/.test(clean)) {
        return { valid: false, error: `Số CMND (${clean}) phải có 9 hoặc 12 chữ số` };
      }
    } else if (docTypeId === 4) {
      // Hộ chiếu -> tối đa 10 ký tự chữ và số
      if (!/^[a-zA-Z0-9]{1,10}$/.test(clean)) {
        return { valid: false, error: `Số Hộ chiếu (${clean}) chỉ được chứa chữ/số và tối đa 10 ký tự` };
      }
    }

    return { valid: true, cleanNumber: clean };
  }

  /**
   * Strip và chuẩn hóa số phòng: chỉ lấy số cố định từ 1 - 9
   * Ví dụ: "P.06" -> "6", "P.07" -> "7", "Phòng 3" -> "3", "P01" -> "1"
   * Nếu không trích xuất được số từ 1 - 9 thì trả về '' (để flag thiếu số phòng)
   * @param {string|number} rawRoom
   * @returns {string}
   */
  cleanRoomNumber(rawRoom) {
    if (rawRoom === null || rawRoom === undefined) return '';
    const str = String(rawRoom).trim();
    if (!str) return '';

    const matches = str.match(/\d+/g);
    if (!matches || matches.length === 0) return '';

    for (const m of matches) {
      const num = parseInt(m, 10);
      if (num >= 1 && num <= 9) {
        return String(num);
      }
    }

    return '';
  }

  /**
   * Validate ngày đến cơ sở lưu trú: bắt buộc phải là ngày hiện tại hoặc hôm qua
   * @param {string} ngayDenStr - Chuỗi định dạng YYYY-MM-DD HH:mm:ss hoặc YYYY-MM-DD
   * @returns {{ valid: boolean, error?: string, checkInDate?: string }}
   */
  validateCheckInDate(ngayDenStr) {
    if (!ngayDenStr) {
      return { valid: false, error: 'Thiếu thông tin ngày đến cơ sở lưu trú' };
    }

    const match = String(ngayDenStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return { valid: false, error: 'Định dạng ngày đến không hợp lệ (cần dạng YYYY-MM-DD)' };
    }

    const checkInDate = `${match[1]}-${match[2]}-${match[3]}`;

    // Tính ngày hiện tại và hôm qua theo múi giờ địa phương
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    if (checkInDate !== todayStr && checkInDate !== yesterdayStr) {
      if (checkInDate < yesterdayStr) {
        return {
          valid: false,
          error: `Ngày đến (${checkInDate}) là ngày trong quá khứ. API chỉ chấp nhận ngày đến là hôm nay (${todayStr}) hoặc hôm qua (${yesterdayStr})`,
          checkInDate,
        };
      } else {
        return {
          valid: false,
          error: `Ngày đến (${checkInDate}) là ngày trong tương lai. API chỉ chấp nhận ngày đến là hôm nay (${todayStr}) hoặc hôm qua (${yesterdayStr})`,
          checkInDate,
        };
      }
    }

    return { valid: true, checkInDate };
  }

  /**
   * Chuyển đổi một dòng dữ liệu thô sang payload API
   * @param {Object} rawRow
   * @returns {Promise<{ branch: 'VN'|'FOREIGN', payload: Object, validationError?: string }>}
   */
  async transformRow(rawRow) {
    const hoTen = (rawRow.hoTen || rawRow['Họ tên'] || rawRow.fullName || '').trim();
    const gioiTinh = this.normalizeGender(rawRow.gioiTinh || rawRow['Giới tính'] || rawRow.gender);
    const rawRoom = rawRow.soPhong || rawRow['Số phòng'] || rawRow.room || '';
    const roomNum = this.cleanRoomNumber(rawRoom);
    const rawAddress = (rawRow.diaChi || rawRow['Địa chỉ'] || rawRow['Địa chỉ chi tiết'] || rawRow.address || '').trim();

    const ngaySinhStr = this.formatDateOnly(rawRow.ngaySinh || rawRow.ngayThangNamSinhStr || rawRow['Ngày sinh'] || rawRow['D.O.B'] || rawRow.dob || rawRow.birthDate);
    const ngayDenCsltStr = this.formatDateTime(rawRow.ngayDenCsltStr || rawRow.ngayDen || rawRow['(từ ngày)'] || rawRow['Ngày đến'] || rawRow.checkIn, '14:00:00');
    const ngayDiDuKienStr = this.formatDateTime(rawRow.ngayDiDuKienStr || rawRow.ngayDi || rawRow['(đến ngày)'] || rawRow['Ngày đi'] || rawRow.checkOut, '12:00:00');

    if (!hoTen) {
      return { validationError: 'Thiếu thông tin Họ tên khách' };
    }
    if (!ngaySinhStr) {
      return { validationError: 'Thiếu hoặc sai định dạng Ngày sinh' };
    }
    if (!roomNum) {
      return { validationError: `Số phòng không hợp lệ hoặc không tìm thấy số từ 1-9 (giá trị hiện tại: "${rawRoom || 'trống'}")` };
    }
    if (!ngayDenCsltStr || !ngayDiDuKienStr) {
      return { validationError: 'Thiếu thông tin Ngày đến hoặc Ngày đi dự kiến' };
    }

    const soPhong = `Phong so ${roomNum}`;

    // Chặn khai báo khách từ quá khứ / tương lai xa trước khi gửi API
    const checkInVal = this.validateCheckInDate(ngayDenCsltStr);
    if (!checkInVal.valid) {
      return { validationError: checkInVal.error };
    }

    const isVN = this.isVietnamese(rawRow);

    if (isVN) {
      // ----------------------------------------------------
      // NHÁNH A: KHÁCH VIỆT NAM (API 5)
      // ----------------------------------------------------
      const rawLoaiGiayTo = rawRow.loaiGiayTo || rawRow['Loại giấy tờ'] || rawRow['Tên giấy tờ'] || rawRow.idType;
      const loaiGiayToId = this.catalog.findLoaiGiayTo(rawLoaiGiayTo);
      const rawDocNum = rawRow.soGiayTo || rawRow['Số giấy tờ'] || rawRow['Số CCCD'] || rawRow.idNumber || '';
      const docVal = this.validateDocNumber(rawDocNum, loaiGiayToId);
      if (!docVal.valid) {
        return { validationError: docVal.error };
      }

      // Tra cứu địa giới hành chính (Nếu khách dùng Hộ chiếu / Passport thì địa chỉ để rỗng theo quy định)
      let maTT = '';
      let maPX = '';
      let diaChi = '';

      if (loaiGiayToId !== 4) {
        diaChi = rawAddress;
        const tinhRaw = rawRow.tinhTp || rawRow['Tỉnh'] || rawRow['Tỉnh/TP'] || rawRow.province || '';
        const phuongXaRaw = rawRow.phuongXa || rawRow['Phường/Xã'] || rawRow.ward || '';
        const quanHuyenRaw = rawRow.quanHuyen || rawRow['Quận/Huyện'] || rawRow.district || '';

        if (tinhRaw) {
          const foundMaTT = this.catalog.findTinhTp(tinhRaw);
          if (foundMaTT) {
            maTT = foundMaTT;
            if (phuongXaRaw) {
              const foundMaPX = await this.catalog.findPhuongXa(maTT, phuongXaRaw);
              if (foundMaPX) {
                maPX = foundMaPX;
              }
            }
          }
        }

        // Nếu không tra cứu được mã thì để "", dồn địa chỉ đầy đủ vào trường diaChi
        if (!maTT || !maPX) {
          maTT = '';
          maPX = '';
          const addressParts = [rawAddress, phuongXaRaw, quanHuyenRaw, tinhRaw].filter(Boolean);
          diaChi = addressParts.join(', ');
        } else {
          if (quanHuyenRaw && !diaChi.includes(quanHuyenRaw)) {
            diaChi = [diaChi, quanHuyenRaw].filter(Boolean).join(', ');
          }
        }
      }

      const noiCuTru = Number(
        typeof rawRow.noiCuTru === 'number'
          ? rawRow.noiCuTru
          : this.catalog.findNoiCuTru(rawRow.noiCuTru || rawRow['Nơi cư trú'] || rawRow['Loại cư trú'] || 'Thường trú') || 1
      );

      const lyDoCuTru = Number(
        typeof rawRow.lyDoCuTru === 'number'
          ? rawRow.lyDoCuTru
          : this.catalog.findLyDoCuTru(rawRow.lyDo || rawRow['Lý do'] || 'Du lịch') || 1
      );

      const payloadVN = {
        hoTen: hoTen.toUpperCase(),
        gioiTinh,
        soDienThoai: String(rawRow.soDienThoai || rawRow['SDT'] || rawRow['Số điện thoại'] || rawRow.phone || '').trim(),
        ngayThangNamSinhStr: ngaySinhStr,
        noiCuTru,
        maTT: String(maTT),
        maPX: String(maPX),
        diaChi,
        ngayDenCsltStr,
        ngayDiDuKienStr,
        soPhong,
        lyDoCuTru,
        lyDoChiTiet: String(rawRow.lyDoChiTiet || rawRow['Lý do chi tiết'] || '').trim(),
        loaiGiayTo: Number(loaiGiayToId || 1),
        soGiayTo: docVal.cleanNumber,
        anhTruocB64: rawRow.anhTruocB64 || rawRow['Ảnh mặt trước'] || '',
        anhSauB64: rawRow.anhSauB64 || rawRow['Ảnh mặt sau'] || '',
        ghiChu: String(rawRow.ghiChu || rawRow['Ghi chú'] || '').trim(),
      };

      return { branch: 'VN', payload: payloadVN };
    } else {
      // ----------------------------------------------------
      // NHÁNH B: KHÁCH NƯỚC NGOÀI (API 4)
      // ----------------------------------------------------
      const rawQuocTich = rawRow.quocTich || rawRow['Quốc tịch'] || rawRow['Quốc gia'] || rawRow.nationality || '';
      const qtVal = this.catalog.validateQuocTich(rawQuocTich);
      if (!qtVal.valid) {
        return { validationError: qtVal.error };
      }
      const quocTich = qtVal.maQT;
      const rawPassport = rawRow.soHoChieu || rawRow.soGiayTo || rawRow['Số giấy tờ'] || rawRow['Số hộ chiếu'] || rawRow.passportNumber || '';
      const docVal = this.validateDocNumber(rawPassport, 4);
      if (!docVal.valid) {
        return { validationError: docVal.error };
      }

      // loaiNgayThangNamSinh: "D" nếu có đầy đủ YYYY-MM-DD, "Y" nếu chỉ có năm
      const isYearOnly = /^\d{4}$/.test(ngaySinhStr);
      const loaiNgayThangNamSinh = isYearOnly ? 'Y' : 'D';

      // thoiHanTamTruStr: Bắt buộc >= ngày hiện tại
      let thoiHanTamTruStr = this.formatDateTime(
        rawRow.thoiHanTamTru || rawRow.thoiHanTamTruStr || rawRow['Thời hạn tạm trú'] || ngayDiDuKienStr,
        '23:59:59'
      );

      const payloadForeign = {
        hoTen: hoTen.toUpperCase(),
        quocTich,
        soHoChieu: docVal.cleanNumber,
        gioiTinh,
        loaiNgayThangNamSinh,
        ngayThangNamSinhStr: ngaySinhStr,
        ngayDenCsltStr,
        ngayDiDuKienStr,
        soPhong,
        thoiHanTamTruStr,
        anhHoChieuB64: rawRow.anhHoChieuB64 || rawRow.anhTruocB64 || rawRow['Ảnh hộ chiếu'] || '',
      };

      return { branch: 'FOREIGN', payload: payloadForeign };
    }
  }

  /**
   * Kiểm tra mức độ hoàn thiện các trường bắt buộc (Required Fields) của dòng
   */
  async checkRowCompleteness(rawRow) {
    const isVN = this.isVietnamese(rawRow);
    const branch = isVN ? 'VN' : 'FOREIGN';
    const missingFields = [];
    const fieldStatus = {};

    const hoTen = (rawRow.hoTen || rawRow['Họ tên'] || rawRow.fullName || '').trim();
    if (!hoTen) missingFields.push('Họ tên (hoTen)');
    fieldStatus.hoTen = { label: 'Họ tên', value: hoTen, required: true, valid: !!hoTen };

    const rawDob = rawRow.ngaySinh || rawRow['Ngày sinh'] || rawRow['D.O.B'] || rawRow.dob || '';
    const ngaySinhStr = this.formatDateOnly(rawDob);
    if (!ngaySinhStr) missingFields.push('Ngày sinh (ngayThangNamSinhStr)');
    fieldStatus.ngaySinh = { label: 'Ngày sinh', value: ngaySinhStr, required: true, valid: !!ngaySinhStr };

    const gioiTinh = this.normalizeGender(rawRow.gioiTinh || rawRow['Giới tính'] || rawRow.gender);
    fieldStatus.gioiTinh = { label: 'Giới tính', value: gioiTinh, required: true, valid: true };

    const rawRoom = rawRow.soPhong || rawRow['Số phòng'] || rawRow.room || '';
    const soPhong = this.cleanRoomNumber(rawRoom);
    if (!soPhong) missingFields.push('Số phòng (cần số 1-9)');
    fieldStatus.soPhong = {
      label: 'Số phòng',
      value: soPhong || rawRoom,
      required: true,
      valid: !!soPhong,
      error: !soPhong ? 'Số phòng phải là số từ 1 đến 9' : ''
    };

    const ngayDen = this.formatDateTime(rawRow.ngayDen || rawRow['(từ ngày)'] || rawRow['Ngày đến'] || rawRow.checkIn, '14:00:00');
    const checkInVal = this.validateCheckInDate(ngayDen);
    if (!checkInVal.valid) {
      missingFields.push(`Ngày đến hợp lệ (${checkInVal.error})`);
      fieldStatus.ngayDen = { label: 'Ngày đến', value: ngayDen, required: true, valid: false, error: checkInVal.error };
    } else {
      fieldStatus.ngayDen = { label: 'Ngày đến', value: ngayDen, required: true, valid: true };
    }

    const ngayDi = this.formatDateTime(rawRow.ngayDi || rawRow['(đến ngày)'] || rawRow['Ngày đi'] || rawRow.checkOut, '12:00:00');
    if (!ngayDi) missingFields.push('Ngày đi (ngayDiDuKienStr)');
    fieldStatus.ngayDi = { label: 'Ngày đi', value: ngayDi, required: true, valid: !!ngayDi };

    if (isVN) {
      const rawLoaiGiayTo = rawRow.loaiGiayTo || rawRow['Loại giấy tờ'] || rawRow['Tên giấy tờ'] || rawRow.idType;
      const loaiGiayToId = this.catalog.findLoaiGiayTo(rawLoaiGiayTo);
      const rawDocNum = rawRow.soGiayTo || rawRow['Số giấy tờ'] || rawRow['Số CCCD'] || rawRow.idNumber || '';
      const docVal = this.validateDocNumber(rawDocNum, loaiGiayToId);

      if (!docVal.valid) {
        missingFields.push(`Số giấy tờ hợp lệ (${docVal.error})`);
      }
      fieldStatus.soGiayTo = { label: 'Số giấy tờ (CCCD/CMND)', value: docVal.cleanNumber || rawDocNum, required: true, valid: docVal.valid, error: docVal.error };
      fieldStatus.loaiGiayTo = { label: 'Loại giấy tờ', value: loaiGiayToId, required: true, valid: true };
    } else {
      const rawQuocTich = rawRow.quocTich || rawRow['Quốc tịch'] || rawRow['Quốc gia'] || rawRow.nationality || '';
      const qtVal = this.catalog.validateQuocTich(rawQuocTich);
      if (!qtVal.valid) {
        missingFields.push(`Quốc tịch hợp lệ (${qtVal.error})`);
      }
      fieldStatus.quocTich = {
        label: 'Quốc tịch',
        value: qtVal.maQT || rawQuocTich,
        required: true,
        valid: qtVal.valid,
        error: qtVal.error
      };

      const rawPassport = rawRow.soHoChieu || rawRow.soGiayTo || rawRow['Số giấy tờ'] || rawRow['Số hộ chiếu'] || rawRow.passportNumber || '';
      const docVal = this.validateDocNumber(rawPassport, 4);
      if (!docVal.valid) {
        missingFields.push(`Số Hộ chiếu hợp lệ (${docVal.error})`);
      }
      fieldStatus.soHoChieu = { label: 'Số Hộ chiếu', value: docVal.cleanNumber || rawPassport, required: true, valid: docVal.valid, error: docVal.error };

      const thoiHanTamTru = this.formatDateTime(
        rawRow.thoiHanTamTru || rawRow.thoiHanTamTruStr || rawRow['Thời hạn tạm trú'] || ngayDi,
        '23:59:59'
      );
      if (!thoiHanTamTru) missingFields.push('Thời hạn tạm trú (thoiHanTamTruStr)');
      fieldStatus.thoiHanTamTru = { label: 'Thời hạn tạm trú', value: thoiHanTamTru, required: true, valid: !!thoiHanTamTru };
    }

    return {
      branch,
      isComplete: missingFields.length === 0,
      missingFields,
      fieldStatus,
    };
  }

  /**
   * Chuyển đổi và phân loại danh sách các dòng dữ liệu thành 2 nhóm payload
   */
  async transformBatch(rows) {
    const vnPayloads = [];
    const foreignPayloads = [];
    const logs = [];
    const completenessList = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const completeness = await this.checkRowCompleteness(row);
      completenessList.push({ rowIndex: index, completeness });

      const res = await this.transformRow(row);
      if (res.validationError) {
        logs.push({
          rowIndex: index,
          status: 'Lỗi chuẩn hóa',
          message: res.validationError,
          row,
          completeness,
        });
      } else if (res.branch === 'VN') {
        vnPayloads.push({ rowIndex: index, payload: res.payload, row, completeness });
      } else if (res.branch === 'FOREIGN') {
        foreignPayloads.push({ rowIndex: index, payload: res.payload, row, completeness });
      }
    }

    return { vnPayloads, foreignPayloads, logs, completenessList };
  }
}
