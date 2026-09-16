import { CONFIG } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Quản lý nạp và cache danh mục hệ thống KBTT
 */
export class CatalogManager {
  constructor(baseUrl = CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
    this.quocTichList = [];
    this.tinhTpList = [];
    this.phuongXaCache = new Map(); // maTT -> list of phuongXa
    this.lyDoCuTruList = [];
    this.loaiGiayToList = [];
    this.noiCuTruList = [];
    this.isInitialized = false;
  }

  /**
   * Khởi tạo cache toàn bộ danh mục từ API hoặc file nội bộ nếu offline
   */
  async initialize() {
    console.log('[CatalogManager] Đang nạp danh mục hệ thống...');
    await Promise.allSettled([
      this.loadQuocTich(),
      this.loadTinhTp(),
      this.loadLyDoCuTru(),
      this.loadLoaiGiayTo(),
      this.loadNoiCuTru(),
    ]);
    this.isInitialized = true;
    console.log('[CatalogManager] Nạp danh mục hoàn tất.');
  }

  async _fetchPublic(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn(`[CatalogManager] Không thể tải danh mục từ ${url}: ${err.message}. Đang thử fallback...`);
    }
    return null;
  }

  _readLocalFallback(filename) {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), 'data/catalogs', filename),
        path.resolve(process.cwd(), 'catalogs', filename),
        path.resolve(process.cwd(), filename),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const content = JSON.parse(fs.readFileSync(p, 'utf8'));
          return content.data || [];
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  async loadQuocTich() {
    const data = await this._fetchPublic(CONFIG.ENDPOINTS.DM_QUOC_TICH);
    this.quocTichList = data || this._readLocalFallback('quoc_tich.json');
  }

  async loadTinhTp() {
    const data = await this._fetchPublic(CONFIG.ENDPOINTS.DM_TINH_TP);
    this.tinhTpList = data || this._readLocalFallback('tinh_tp.json');
  }

  async loadLyDoCuTru() {
    const data = await this._fetchPublic(CONFIG.ENDPOINTS.DM_LY_DO_CU_TRU);
    this.lyDoCuTruList = data || this._readLocalFallback('ly_do_cu_tru.json');
  }

  async loadLoaiGiayTo() {
    const data = await this._fetchPublic(CONFIG.ENDPOINTS.DM_LOAI_GIAY_TO);
    this.loaiGiayToList = data || this._readLocalFallback('loai_giay_to.json');
  }

  async loadNoiCuTru() {
    const data = await this._fetchPublic(CONFIG.ENDPOINTS.DM_NOI_CU_TRU);
    this.noiCuTruList = data || this._readLocalFallback('noi_cu_tru.json');
  }

  /**
   * Lấy danh sách phường xã theo mã tỉnh
   * @param {string|number} maTT
   */
  async getPhuongXaByTinh(maTT) {
    if (!maTT) return [];
    const key = String(maTT).trim();
    if (this.phuongXaCache.has(key)) {
      return this.phuongXaCache.get(key);
    }

    const endpoint = `${CONFIG.ENDPOINTS.DM_PHUONG_XA}?trucThuocTinh=${encodeURIComponent(key)}`;
    const data = await this._fetchPublic(endpoint);
    const result = data || [];
    this.phuongXaCache.set(key, result);
    return result;
  }

  /**
   * Dò tìm maTT từ tên tỉnh/thành phố
   */
  findTinhTp(rawName) {
    if (!rawName || !this.tinhTpList.length) return null;
    const clean = this._normalizeText(rawName);
    
    // Tìm exact match hoặc includes
    let match = this.tinhTpList.find(t => {
      const ten = this._normalizeText(t.tenTT);
      const tenEn = this._normalizeText(t.tenTTEn || '');
      const maChu = this._normalizeText(t.maTTChu || '');
      return clean === ten || clean === tenEn || clean === maChu || clean.includes(ten) || ten.includes(clean);
    });

    return match ? match.maTT : null;
  }

  /**
   * Dò tìm maPX từ maTT và tên phường/xã
   */
  async findPhuongXa(maTT, rawPhuongXaName) {
    if (!maTT || !rawPhuongXaName) return null;
    const list = await this.getPhuongXaByTinh(maTT);
    if (!list || list.length === 0) return null;

    const clean = this._normalizeText(rawPhuongXaName);
    const match = list.find(px => {
      const ten = this._normalizeText(px.tenPX);
      return clean === ten || clean.includes(ten) || ten.includes(clean);
    });

    return match ? match.maPX : null;
  }

  /**
   * Dò tìm mã Quốc tịch (ISO 3 ký tự hoặc tên)
   */
  findQuocTich(input) {
    if (!input) return 'VNM';
    const clean = this._normalizeText(input);

    if (clean === 'vn' || clean === 'vnm' || clean === 'viet nam' || clean === 'vietnam') {
      return 'VNM';
    }

    const match = this.quocTichList.find(q => {
      const ma = this._normalizeText(q.maQT);
      const ten = this._normalizeText(q.tenQT);
      const tenEn = this._normalizeText(q.tenQTEn || '');
      return clean === ma || clean === ten || clean === tenEn || ten.includes(clean) || (tenEn && tenEn.includes(clean));
    });

    return match ? match.maQT : (input.length === 3 ? input.toUpperCase() : 'VNM');
  }

  /**
   * Dò tìm ID loại giấy tờ
   */
  findLoaiGiayTo(input) {
    if (!input) return 1; // Default Thẻ CCCD
    if (typeof input === 'number') return input;

    const clean = this._normalizeText(input);
    if (clean.includes('can cuoc') && !clean.includes('cong dan')) return 8; // Thẻ Căn Cước
    if (clean.includes('cccd') || clean.includes('cong dan')) return 1; // Thẻ CCCD
    if (clean.includes('cmnd') || clean.includes('chung minh')) return 2; // Thẻ CMND
    if (clean.includes('ho chieu') || clean.includes('passport')) return 4; // Hộ chiếu
    if (clean.includes('lai xe') || clean.includes('gplx')) return 3; // GPLX
    if (clean.includes('khai sinh')) return 5; // Giấy khai sinh
    if (clean.includes('bhyt')) return 6; // BHYT
    if (clean.includes('dinh danh')) return 7; // Thông báo định danh cá nhân

    const match = this.loaiGiayToList.find(lg => this._normalizeText(lg.name) === clean || this._normalizeText(lg.name).includes(clean));
    return match ? match.id : 1;
  }

  /**
   * Dò tìm ID lý do cư trú
   */
  findLyDoCuTru(input) {
    if (!input) return 1; // Default Du lịch
    if (typeof input === 'number') return input;

    const clean = this._normalizeText(input);
    const match = this.lyDoCuTruList.find(ld => {
      const ten = this._normalizeText(ld.name);
      return clean === ten || clean.includes(ten) || ten.includes(clean);
    });
    return match ? match.id : 1;
  }

  /**
   * Dò tìm ID nơi cư trú
   */
  findNoiCuTru(input) {
    if (!input) return 1; // Default Thường trú
    if (typeof input === 'number') return input;

    const clean = this._normalizeText(input);
    if (clean.includes('tam tru')) return 2;
    if (clean.includes('khac')) return 3;
    if (clean.includes('thuong tru')) return 1;

    const match = this.noiCuTruList.find(nc => this._normalizeText(nc.name) === clean);
    return match ? match.id : 1;
  }

  _normalizeText(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
