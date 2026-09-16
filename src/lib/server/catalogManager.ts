import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';

export interface CatalogItem {
  id?: number | string;
  name?: string;
  tenTT?: string;
  maTT?: string | number;
  tenTTEn?: string;
  maTTChu?: string;
  tenQT?: string;
  maQT?: string;
  tenQTEn?: string;
  [key: string]: unknown;
}

export interface CatalogStore {
  quocTich: CatalogItem[];
  tinhTp: CatalogItem[];
  phuongXa: Record<string, CatalogItem[]>;
  lyDoCuTru: CatalogItem[];
  loaiGiayTo: CatalogItem[];
  noiCuTru: CatalogItem[];
}

export class CatalogManager {
  private static instance: CatalogManager;
  private catalogs: CatalogStore = {
    quocTich: [],
    tinhTp: [],
    phuongXa: {},
    lyDoCuTru: [],
    loaiGiayTo: [],
    noiCuTru: [],
  };
  private isLoaded = false;
  private standardQuocTichMap = new Map<string, { ten_quoc_gia: string; ten_tieng_anh: string }>();

  private constructor() {
    this.loadStandardQuocTich();
  }

  public static getInstance(): CatalogManager {
    if (!CatalogManager.instance) {
      CatalogManager.instance = new CatalogManager();
    }
    return CatalogManager.instance;
  }

  private loadStandardQuocTich(): void {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'quoc_tich.json'),
        path.resolve(process.cwd(), 'src/lib/server/quoc_tich.json'),
        path.resolve(process.cwd(), 'src/quoc_tich.json'),
      ];
      for (const jsonPath of candidates) {
        if (fs.existsSync(jsonPath)) {
          const raw = fs.readFileSync(jsonPath, 'utf8');
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach(item => {
              if (item.ma_alpha3) {
                this.standardQuocTichMap.set(String(item.ma_alpha3).trim().toUpperCase(), {
                  ten_quoc_gia: item.ten_quoc_gia,
                  ten_tieng_anh: item.ten_tieng_anh,
                });
              }
            });
            break;
          }
        }
      }
    } catch (err) {
      console.warn('[CatalogManager] Không thể nạp file quoc_tich.json cục bộ:', err);
    }
  }

  public async fetchPublicCatalog(endpoint: string): Promise<CatalogItem[]> {
    try {
      const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return (data.data || data || []) as CatalogItem[];
    } catch (error) {
      console.warn(`[CatalogManager] Không thể nạp danh mục từ ${endpoint}:`, (error as Error).message);
      return [];
    }
  }

  public async initialize(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const [qt, tinh, lyDo, loaiGt, noiCt] = await Promise.all([
        this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_QUOC_TICH),
        this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_TINH_TP),
        this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_LY_DO_CU_TRU),
        this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_LOAI_GIAY_TO),
        this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_NOI_CU_TRU),
      ]);

      this.catalogs.quocTich = qt.length > 0 ? qt : this.getFallbackQuocTich();
      this.catalogs.tinhTp = tinh.length > 0 ? tinh : this.getFallbackTinhTp();
      this.catalogs.lyDoCuTru = lyDo.length > 0 ? lyDo : this.getFallbackLyDoCuTru();
      this.catalogs.loaiGiayTo = loaiGt.length > 0 ? loaiGt : this.getFallbackLoaiGiayTo();
      this.catalogs.noiCuTru = noiCt.length > 0 ? noiCt : this.getFallbackNoiCuTru();

      this.isLoaded = true;
    } catch (err) {
      console.error('[CatalogManager] Lỗi khởi tạo danh mục:', err);
    }
  }

  public getQuocTichList(): CatalogItem[] {
    return this.catalogs.quocTich;
  }

  public getTinhTpList(): CatalogItem[] {
    return this.catalogs.tinhTp;
  }

  public getLyDoCuTruList(): CatalogItem[] {
    return this.catalogs.lyDoCuTru;
  }

  public getLoaiGiayToList(): CatalogItem[] {
    return this.catalogs.loaiGiayTo;
  }

  public getNoiCuTruList(): CatalogItem[] {
    return this.catalogs.noiCuTru;
  }

  public isValidQuocTichCode(code: string): boolean {
    if (!code) return false;
    const clean = String(code).trim().toUpperCase();
    if (this.standardQuocTichMap.size > 0 && this.standardQuocTichMap.has(clean)) {
      return true;
    }
    const foundInApi = this.catalogs.quocTich.some(item => {
      const ma = String(item.maQT || item.id || item.code || '').trim().toUpperCase();
      return ma === clean;
    });
    return foundInApi;
  }

  public findQuocTich(keyword: string): CatalogItem | null {
    if (!keyword) return null;
    const clean = String(keyword).trim().toUpperCase();
    return this.catalogs.quocTich.find(item => {
      const ma = String(item.maQT || item.id || item.code || '').toUpperCase();
      const ten = String(item.tenQT || item.name || '').toUpperCase();
      const tenEn = String(item.tenQTEn || '').toUpperCase();
      return ma === clean || ten.includes(clean) || tenEn.includes(clean);
    }) || null;
  }

  public findTinhTp(keyword: string): CatalogItem | null {
    if (!keyword) return null;
    const clean = String(keyword).trim().toLowerCase();
    return this.catalogs.tinhTp.find(item => {
      const ten = String(item.tenTT || item.name || '').toLowerCase();
      const ma = String(item.maTT || item.id || '').toLowerCase();
      return ten.includes(clean) || ma === clean;
    }) || null;
  }

  private getFallbackQuocTich(): CatalogItem[] {
    if (this.standardQuocTichMap.size > 0) {
      return Array.from(this.standardQuocTichMap.entries()).map(([ma, val]) => ({
        maQT: ma,
        tenQT: val.ten_quoc_gia,
        tenQTEn: val.ten_tieng_anh,
      }));
    }
    return [
      { maQT: 'VNM', tenQT: 'Việt Nam', tenQTEn: 'Vietnam' },
      { maQT: 'RUS', tenQT: 'Liên bang Nga', tenQTEn: 'Russian Federation' },
      { maQT: 'USA', tenQT: 'Hoa Kỳ', tenQTEn: 'United States' },
      { maQT: 'CHN', tenQT: 'Trung Quốc', tenQTEn: 'China' },
      { maQT: 'KOR', tenQT: 'Hàn Quốc', tenQTEn: 'Korea, Republic of' },
      { maQT: 'JPN', tenQT: 'Nhật Bản', tenQTEn: 'Japan' },
      { maQT: 'VAA', tenQT: 'Cơ quan ngoại giao VAA', tenQTEn: 'VAA Diplomatic' },
    ];
  }

  private getFallbackTinhTp(): CatalogItem[] {
    return [
      { maTT: 101, maTTChu: 'HN', tenTT: 'Hà Nội' },
      { maTT: 103, maTTChu: 'HP', tenTT: 'Hải Phòng' },
      { maTT: 201, maTTChu: 'DN', tenTT: 'Đà Nẵng' },
      { maTT: 701, maTTChu: 'HCM', tenTT: 'Hồ Chí Minh' },
      { maTT: 606, maTTChu: 'DL', tenTT: 'Đắk Lắk' },
    ];
  }

  private getFallbackLyDoCuTru(): CatalogItem[] {
    return [
      { id: 1, name: 'Du lịch' },
      { id: 20, name: 'Mục đích khác' },
    ];
  }

  private getFallbackLoaiGiayTo(): CatalogItem[] {
    return [
      { id: 1, name: 'Thẻ CCCD' },
      { id: 2, name: 'Thẻ CMND' },
      { id: 3, name: 'Giấy phép lái xe' },
      { id: 4, name: 'Hộ chiếu' },
      { id: 8, name: 'Thẻ Căn Cước' },
    ];
  }

  private getFallbackNoiCuTru(): CatalogItem[] {
    return [
      { id: 1, name: 'Thường trú' },
      { id: 2, name: 'Tạm trú' },
    ];
  }
}

export const catalogManager = CatalogManager.getInstance();
