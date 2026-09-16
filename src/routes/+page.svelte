<script lang="ts">
  import { onMount } from 'svelte';

  interface CatalogItem {
    id?: number | string;
    name?: string;
    tenTT?: string;
    maTT?: string | number;
    tenTTEn?: string;
    maTTChu?: string;
    tenQT?: string;
    maQT?: string;
    tenQTEn?: string;
  }

  interface TabItem {
    gid: string;
    name: string;
    isDefault?: boolean;
    isDateTab?: boolean;
  }

  interface RowData {
    hoTen?: string;
    gioiTinh?: string;
    ngaySinh?: string;
    quocTich?: string;
    loaiGiayTo?: string;
    soGiayTo?: string;
    soHoChieu?: string;
    soPhong?: string;
    diaChi?: string;
    tinhTp?: string;
    phuongXa?: string;
    quanHuyen?: string;
    ngayDen?: string;
    ngayDi?: string;
    thoiHanTamTru?: string;
    [key: string]: unknown;
  }

  interface ValidationState {
    isComplete: boolean;
    missingFields: string[];
    fieldStatus: Record<string, { valid: boolean; value: unknown; error?: string }>;
  }

  interface SyncResult {
    branch?: string;
    status: string;
    message: string;
    payload?: unknown;
    row?: RowData;
  }

  // App State
  let activeTab = $state<'dataTab' | 'syncTab' | 'catalogTab'>('dataTab');
  let selectedGid = $state('0');
  let availableTabs = $state<TabItem[]>([]);
  let currentSourceLabel = $state('Đang tải dữ liệu từ Google Sheets...');
  let tabFetchStatus = $state('');
  let isLoadingSheet = $state(false);

  // Rows & Selection
  let currentRows = $state<RowData[]>([]);
  let selectedIndices = $state<Set<number>>(new Set());
  let editingIndices = $state<Set<number>>(new Set());
  let validationStates = $state<ValidationState[]>([]);

  // Payloads Preview
  let vnPayloads = $state<unknown[]>([]);
  let foreignPayloads = $state<unknown[]>([]);

  // Sync Results
  let syncResults = $state<SyncResult[]>([]);
  let isSyncing = $state(false);
  let syncActionTitle = $state('');

  // Token status
  let tokenStatus = $state<{ hasToken: boolean; expiresInSeconds: number }>({ hasToken: false, expiresInSeconds: 0 });

  // Catalogs
  let catalogs = $state<{
    tinhTp: CatalogItem[];
    quocTich: CatalogItem[];
    loaiGiayTo: CatalogItem[];
    lyDoCuTru: CatalogItem[];
  }>({
    tinhTp: [],
    quocTich: [],
    loaiGiayTo: [],
    lyDoCuTru: [],
  });
  let filterTinh = $state('');
  let filterQuocTich = $state('');

  // Toast
  let toastVisible = $state(false);
  let toastCode = $state('');
  let toastMsg = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Edit Modal State
  let modalOpen = $state(false);
  let modalIndex = $state<number | null>(null);
  let modalForm = $state({
    hoTen: '',
    gioiTinh: 'Nam',
    ngaySinh: '',
    quocTich: 'VNM',
    soPhong: '1',
    loaiGiayTo: 'Thẻ CCCD',
    soGiayTo: '',
    ngayDen: '',
    ngayDi: '',
    thoiHanTamTru: '',
    diaChiFull: '',
  });

  function showToast(code: string, msg: string) {
    toastCode = code;
    toastMsg = msg;
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
    }, 2500);
  }

  function cleanRoomNumber(rawRoom: unknown): string {
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

  function isGuestVN(row: RowData): boolean {
    const qt = String(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || '').trim().toLowerCase();
    const docType = String(row.loaiGiayTo || row['Loại giấy tờ'] || row['Tên giấy tờ'] || '').toLowerCase();
    const docNum = String(row.soGiayTo || row['Số giấy tờ'] || row['Số CCCD'] || '').replace(/\D/g, '');

    if (docType.includes('cccd') || docType.includes('cmnd') || docType.includes('căn cước')) return true;
    if (['vn', 'vnm', 'viet nam', 'vietnam', 'vvv', 'vv', 'v', 'viet'].includes(qt)) return true;
    if (qt && !['vn', 'vnm', 'viet nam', 'vietnam', 'vvv', 'vv', 'v', 'viet'].includes(qt)) return false;
    if (docNum.length === 12 || docNum.length === 9) return true;
    return false;
  }

  function getCombinedAddress(row: RowData): string {
    const loaiGiayToName = String(row.loaiGiayTo || row['Loại giấy tờ'] || '').toLowerCase();
    if (loaiGiayToName.includes('hộ chiếu') || loaiGiayToName.includes('passport')) {
      return '';
    }
    const rawAddress = String(row.diaChi || row['Địa chỉ'] || row['Địa chỉ chi tiết'] || '').trim();
    const tinhRaw = String(row.tinhTp || row['Tỉnh'] || row['Tỉnh/TP'] || '').trim();
    const phuongXaRaw = String(row.phuongXa || row['Phường/Xã'] || '').trim();
    const quanHuyenRaw = String(row.quanHuyen || row['Quận/Huyện'] || '').trim();

    const parts = [rawAddress, phuongXaRaw, quanHuyenRaw, tinhRaw].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  }

  function getDisplayAddress(row: RowData): { shortText: string; fullText: string } {
    const isVN = isGuestVN(row);
    if (!isVN) {
      const val = String(row.thoiHanTamTru || row['Thời hạn tạm trú'] || '-');
      return { shortText: val, fullText: `Thời hạn tạm trú: ${val}` };
    }
    const loaiGiayToName = String(row.loaiGiayTo || row['Loại giấy tờ'] || '').toLowerCase();
    if (loaiGiayToName.includes('hộ chiếu') || loaiGiayToName.includes('passport')) {
      return { shortText: '-', fullText: 'Khách hộ chiếu: địa chỉ để trống' };
    }
    const fullAddr = getCombinedAddress(row);
    if (!fullAddr) {
      return { shortText: '-', fullText: 'Chưa có địa chỉ' };
    }
    const tinhRaw = String(row.tinhTp || row['Tỉnh'] || row['Tỉnh/TP'] || '').trim();
    if (tinhRaw) {
      return { shortText: tinhRaw, fullText: fullAddr };
    }
    const parts = fullAddr.split(',').map(p => p.trim()).filter(Boolean);
    return { shortText: parts[parts.length - 1] || fullAddr, fullText: fullAddr };
  }

  function normalizeStr(str: unknown): string {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function fetchSheetTabsList() {
    tabFetchStatus = 'Đang quét tabs...';
    try {
      const res = await fetch('/api/sheets/tabs');
      const data = await res.json();
      if (data.success && data.tabs && data.tabs.length > 0) {
        availableTabs = data.tabs;
        tabFetchStatus = `Tìm thấy ${availableTabs.length} tabs`;

        let defaultGid = data.defaultGid;
        const foundDef = availableTabs.find(t => t.isDefault);
        if (foundDef) defaultGid = foundDef.gid;
        else defaultGid = availableTabs[0].gid;

        selectedGid = defaultGid;
        await pullDataFromGoogleSheet(defaultGid);
      } else {
        availableTabs = [{ name: 'Tab Mặc định', gid: '0', isDefault: true }];
        selectedGid = '0';
        tabFetchStatus = 'Tab mặc định';
        await pullDataFromGoogleSheet('0');
      }
    } catch (err) {
      console.warn('Lỗi khi lấy tabs:', err);
      tabFetchStatus = 'Lỗi nạp tabs';
    }
  }

  async function pullDataFromGoogleSheet(forcedGid: string | null = null) {
    const gid = forcedGid !== null ? forcedGid : selectedGid;
    isLoadingSheet = true;
    currentSourceLabel = 'Đang kéo dữ liệu từ Google Sheets...';

    try {
      const res = await fetch('/api/sheets/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gid }),
      });
      const data = await res.json();
      if (data.success && data.rows && data.rows.length > 0) {
        currentRows = data.rows.map((row: RowData) => {
          const rawRoom = row.soPhong || row['Số phòng'] || row.room || '';
          const cleaned = cleanRoomNumber(rawRoom);
          if (cleaned) {
            row.soPhong = cleaned;
            row['Số phòng'] = cleaned;
          }
          return row;
        });
        selectedIndices = new Set();
        editingIndices = new Set();

        const currentTab = availableTabs.find(t => String(t.gid) === String(gid));
        const tabName = currentTab ? currentTab.name : `GID ${gid}`;
        currentSourceLabel = `Tab: "${tabName}" (${currentRows.length} dòng dữ liệu)`;
        await updatePayloadPreview();
        showToast('NẠP', `Đã tải ${currentRows.length} dòng từ Google Sheet!`);
      } else {
        currentSourceLabel = 'Tab đã chọn không có dữ liệu phù hợp';
        currentRows = [];
        await updatePayloadPreview();
      }
    } catch (err) {
      currentSourceLabel = `Lỗi kéo dữ liệu: ${(err as Error).message}`;
    } finally {
      isLoadingSheet = false;
    }
  }

  function handleTabChange() {
    pullDataFromGoogleSheet(selectedGid);
  }

  async function updatePayloadPreview() {
    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: currentRows }),
      });
      const data = await res.json();
      vnPayloads = (data.vnPayloads || []).map((item: { payload: unknown }) => item.payload);
      foreignPayloads = (data.foreignPayloads || []).map((item: { payload: unknown }) => item.payload);
      validationStates = (data.completenessList || []).map((item: { completeness: ValidationState }) => item.completeness);
    } catch (err) {
      console.error('Lỗi phân tích payloads:', err);
    }
  }

  function toggleRowSelect(idx: number, checked: boolean) {
    const next = new Set(selectedIndices);
    if (checked) next.add(idx);
    else next.delete(idx);
    selectedIndices = next;
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      selectedIndices = new Set(currentRows.map((_, i) => i));
    } else {
      selectedIndices = new Set();
    }
  }

  function parseAndApplyAddress(row: RowData, fullAddress: string) {
    const cleanAddr = (fullAddress || '').trim();
    row.diaChi = cleanAddr;
    row['Địa chỉ'] = cleanAddr;
    row['Địa chỉ chi tiết'] = cleanAddr;

    if (cleanAddr.includes(',')) {
      const parts: string[] = cleanAddr.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        const detail = parts.slice(0, parts.length - 3).join(', ');
        row['Địa chỉ chi tiết'] = detail;
        row.diaChi = detail;
        row['Phường/Xã'] = parts[parts.length - 3];
        row.phuongXa = parts[parts.length - 3];
        row['Quận/Huyện'] = parts[parts.length - 2];
        row.quanHuyen = parts[parts.length - 2];
        row['Tỉnh/TP'] = parts[parts.length - 1];
        row.tinhTp = parts[parts.length - 1];
        row['Tỉnh'] = parts[parts.length - 1];
      } else if (parts.length === 3) {
        row['Địa chỉ chi tiết'] = parts[0];
        row.diaChi = parts[0];
        row['Quận/Huyện'] = parts[1];
        row.quanHuyen = parts[1];
        row['Tỉnh/TP'] = parts[2];
        row.tinhTp = parts[2];
        row['Tỉnh'] = parts[2];
      } else if (parts.length === 2) {
        row['Địa chỉ chi tiết'] = parts[0];
        row.diaChi = parts[0];
        row['Tỉnh/TP'] = parts[1];
        row.tinhTp = parts[1];
        row['Tỉnh'] = parts[1];
      }
    }
  }

  function updateCell(idx: number, field: string, value: string) {
    if (!currentRows[idx]) return;
    currentRows[idx][field] = value;
    if (field === 'soPhong') {
      currentRows[idx]['Số phòng'] = value;
    } else if (field === 'hoTen') {
      currentRows[idx]['Họ tên'] = value;
    } else if (field === 'ngaySinh') {
      currentRows[idx]['Ngày sinh'] = value;
      currentRows[idx]['D.O.B'] = value;
    } else if (field === 'gioiTinh') {
      currentRows[idx]['Giới tính'] = value;
    } else if (field === 'quocTich') {
      currentRows[idx]['Quốc tịch'] = value;
      currentRows[idx]['Quốc gia'] = value;
    } else if (field === 'loaiGiayTo') {
      currentRows[idx]['Loại giấy tờ'] = value;
    } else if (field === 'soGiayTo') {
      currentRows[idx]['Số giấy tờ'] = value;
      currentRows[idx]['Số CCCD'] = value;
      currentRows[idx]['Số hộ chiếu'] = value;
      currentRows[idx].soHoChieu = value;
    } else if (field === 'ngayDen') {
      currentRows[idx]['Ngày đến'] = value;
      currentRows[idx]['(từ ngày)'] = value;
    } else if (field === 'ngayDi') {
      currentRows[idx]['Ngày đi'] = value;
      currentRows[idx]['(đến ngày)'] = value;
    } else if (field === 'diaChi') {
      parseAndApplyAddress(currentRows[idx], value);
    }
    updatePayloadPreview();
  }

  function toggleEditInline(idx: number) {
    const next = new Set(editingIndices);
    if (next.has(idx)) {
      next.delete(idx);
      editingIndices = next;
      syncRowToGoogleSheet(idx);
    } else {
      next.add(idx);
      editingIndices = next;
    }
  }

  function openEditModal(idx: number) {
    const row = currentRows[idx];
    if (!row) return;
    modalIndex = idx;
    modalForm = {
      hoTen: String(row.hoTen || row['Họ tên'] || ''),
      gioiTinh: (row.gioiTinh === 'Nữ' || row['Giới tính'] === 'Nữ' || row.gioiTinh === 'F' || row['Giới tính'] === 'F') ? 'Nữ' : 'Nam',
      ngaySinh: String(row.ngaySinh || row['Ngày sinh'] || row['D.O.B'] || ''),
      quocTich: String(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase(),
      soPhong: cleanRoomNumber(row.soPhong || row['Số phòng']) || '1',
      loaiGiayTo: String(row.loaiGiayTo || row['Loại giấy tờ'] || 'Thẻ CCCD'),
      soGiayTo: String(row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu'] || ''),
      ngayDen: String(row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || ''),
      ngayDi: String(row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || ''),
      thoiHanTamTru: String(row.thoiHanTamTru || row['Thời hạn tạm trú'] || ''),
      diaChiFull: getCombinedAddress(row),
    };
    modalOpen = true;
  }

  function closeEditModal() {
    modalOpen = false;
    modalIndex = null;
  }

  function saveModal() {
    if (modalIndex === null || !currentRows[modalIndex]) return;
    const row = currentRows[modalIndex];
    row.hoTen = modalForm.hoTen.trim();
    row['Họ tên'] = row.hoTen;
    row.gioiTinh = modalForm.gioiTinh;
    row['Giới tính'] = row.gioiTinh;
    row.ngaySinh = modalForm.ngaySinh.trim();
    row['Ngày sinh'] = row.ngaySinh;
    row['D.O.B'] = row.ngaySinh;
    row.quocTich = modalForm.quocTich.trim().toUpperCase();
    row['Quốc tịch'] = row.quocTich;
    row.soPhong = modalForm.soPhong;
    row['Số phòng'] = row.soPhong;
    row.loaiGiayTo = modalForm.loaiGiayTo;
    row['Loại giấy tờ'] = row.loaiGiayTo;
    row.soGiayTo = modalForm.soGiayTo.trim();
    row['Số giấy tờ'] = row.soGiayTo;
    row['Số CCCD'] = row.soGiayTo;
    row.soHoChieu = row.soGiayTo;
    row.ngayDen = modalForm.ngayDen.trim();
    row['Ngày đến'] = row.ngayDen;
    row.ngayDi = modalForm.ngayDi.trim();
    row['Ngày đi'] = row.ngayDi;
    if (modalForm.thoiHanTamTru) {
      row.thoiHanTamTru = modalForm.thoiHanTamTru.trim();
      row['Thời hạn tạm trú'] = row.thoiHanTamTru;
    }
    parseAndApplyAddress(row, modalForm.diaChiFull);

    const savedIdx = modalIndex;
    closeEditModal();
    updatePayloadPreview();
    syncRowToGoogleSheet(savedIdx);
  }

  async function syncRowToGoogleSheet(idx: number) {
    showToast('LƯU', `Đang lưu dòng ${idx + 1} lên Google Sheet...`);
    const selectedTab = availableTabs.find(t => String(t.gid) === String(selectedGid));
    const sheetName = selectedTab ? selectedTab.name : '';

    try {
      const res = await fetch('/api/sheets/update-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex: idx,
          row: currentRows[idx],
          gid: selectedGid,
          sheetName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('OK', `Đã cập nhật dòng ${idx + 1} lên Google Sheet!`);
      } else if (data.notConfigured) {
        showToast('LƯU', `Đã lưu dòng ${idx + 1} vào bộ nhớ.`);
      } else {
        showToast('CẢNH BÁO', `Lỗi cập nhật Sheet: ${data.message}`);
      }
    } catch (err) {
      showToast('LỖI', `Lỗi mạng khi lưu Sheet: ${(err as Error).message}`);
    }
  }

  function removeRow(idx: number) {
    currentRows = currentRows.filter((_, i) => i !== idx);
    const nextSel = new Set<number>();
    selectedIndices.forEach(i => {
      if (i < idx) nextSel.add(i);
      else if (i > idx) nextSel.add(i - 1);
    });
    selectedIndices = nextSel;
    updatePayloadPreview();
  }

  function addNewRow() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const next2Days = new Date(now);
    next2Days.setDate(next2Days.getDate() + 2);
    const next2DaysStr = `${next2Days.getFullYear()}-${pad(next2Days.getMonth() + 1)}-${pad(next2Days.getDate())}`;

    currentRows = [
      ...currentRows,
      {
        hoTen: 'NGUYỄN VĂN MỚI',
        ngaySinh: '1995-01-01',
        gioiTinh: 'Nam',
        quocTich: 'VNM',
        loaiGiayTo: 'Thẻ CCCD',
        soGiayTo: '001095000999',
        soPhong: '1',
        diaChi: 'Hà Nội',
        ngayDen: `${todayStr} 14:00:00`,
        ngayDi: `${next2DaysStr} 12:00:00`,
      },
    ];
    updatePayloadPreview();
  }

  function loadSampleData() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const next2Days = new Date(now);
    next2Days.setDate(next2Days.getDate() + 2);
    const next2DaysStr = `${next2Days.getFullYear()}-${pad(next2Days.getMonth() + 1)}-${pad(next2Days.getDate())}`;

    currentRows = [
      {
        'Họ tên': 'BUI TAN DUNG',
        'Giới tính': 'M',
        'Số điện thoại': '0987654321',
        'Ngày sinh': '2001-10-16',
        'Nơi cư trú': 'Thường trú',
        'Tỉnh/TP': 'Đắk Lắk',
        'Quận/Huyện': 'Krông Năng',
        'Phường/Xã': 'Krông Năng',
        'Địa chỉ chi tiết': 'Tổ Dân Phố 5',
        'Ngày đến': `${todayStr} 12:00:00`,
        'Ngày đi': `${next2DaysStr} 12:00:00`,
        'Số phòng': '6',
        'Lý do': 'Du lịch',
        'Loại giấy tờ': 'Thẻ CCCD',
        'Số giấy tờ': '066201008768',
      },
      {
        'Họ tên': 'GRACHEV NIKITA',
        'Quốc tịch': 'RUS',
        'Số giấy tờ': '552165656',
        'Giới tính': 'Nam',
        'Ngày sinh': '1995-11-25',
        'Ngày đến': `${todayStr} 12:00:00`,
        'Ngày đi': `${next2DaysStr} 12:00:00`,
        'Thời hạn tạm trú': '2026-12-31 23:59:59',
        'Số phòng': '9',
        'Loại giấy tờ': 'Hộ chiếu',
      },
    ];
    selectedIndices = new Set();
    editingIndices = new Set();
    currentSourceLabel = 'Đang hiển thị dữ liệu mẫu chuẩn v1.4';
    updatePayloadPreview();
  }

  async function executeSyncBatch(rows: RowData[], title: string) {
    activeTab = 'syncTab';
    isSyncing = true;
    syncActionTitle = title;
    syncResults = [];

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      syncResults = data.results || [];
      await checkToken();
    } catch (err) {
      syncResults = [{
        status: 'Thất bại',
        message: `Lỗi thực thi: ${(err as Error).message}`,
      }];
    } finally {
      isSyncing = false;
    }
  }

  async function pushSelectedRows() {
    if (selectedIndices.size === 0) {
      alert('Vui lòng tích chọn ít nhất 1 dòng để đăng ký');
      return;
    }
    const rows = Array.from(selectedIndices).map(i => currentRows[i]).filter(Boolean);
    await executeSyncBatch(rows, `Đăng ký ${rows.length} khách đã chọn`);
  }

  async function pushSingleRow(idx: number) {
    if (!currentRows[idx]) return;
    await executeSyncBatch([currentRows[idx]], `Đăng ký khách: ${currentRows[idx].hoTen || currentRows[idx]['Họ tên']}`);
  }

  async function syncAllRows() {
    if (currentRows.length === 0) {
      alert('Bảng dữ liệu đang trống!');
      return;
    }
    await executeSyncBatch(currentRows, `Đăng ký toàn bộ ${currentRows.length} khách`);
  }

  async function checkToken() {
    try {
      const res = await fetch('/api/token');
      const data = await res.json();
      tokenStatus = {
        hasToken: Boolean(data.hasToken),
        expiresInSeconds: data.expiresInSeconds || 0,
      };
    } catch {}
  }

  async function handleManualLogin() {
    try {
      const res = await fetch('/api/token', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('OK', 'Đăng nhập lấy Token thành công!');
      } else {
        alert(`Đăng nhập thất bại: ${data.error}`);
      }
      await checkToken();
    } catch (err) {
      alert(`Lỗi kết nối: ${(err as Error).message}`);
    }
  }

  async function loadCatalogs() {
    try {
      const res = await fetch('/api/catalogs');
      const data = await res.json();
      if (data.catalogs) {
        catalogs = data.catalogs;
      }
    } catch (err) {
      console.error('Lỗi nạp danh mục:', err);
    }
  }

  function copyCode(code: string | undefined, name: string | undefined) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    showToast(code, name || '');
  }

  let filteredTinhList = $derived(
    catalogs.tinhTp.filter(t => {
      const q = normalizeStr(filterTinh);
      if (!q) return true;
      const ten = normalizeStr(t.tenTT);
      const ma = String(t.maTT || '');
      const maChu = normalizeStr(t.maTTChu || '');
      return ten.includes(q) || ma.includes(q) || maChu.includes(q);
    })
  );

  let filteredQuocTichList = $derived(
    catalogs.quocTich.filter(q => {
      const query = normalizeStr(filterQuocTich);
      if (!query) return true;
      const ten = normalizeStr(q.tenQT);
      const ma = normalizeStr(q.maQT);
      const tenEn = normalizeStr(q.tenQTEn || '');
      return ten.includes(query) || ma.includes(query) || tenEn.includes(query);
    })
  );

  onMount(() => {
    loadCatalogs();
    checkToken();
    fetchSheetTabsList();
  });
</script>

<svelte:head>
  <title>KBTT - Hệ Thống Đồng Bộ Tự Động Khai Báo Tạm Trú & Lưu Trú (v1.4)</title>
</svelte:head>

<!-- Header -->
<header class="bg-slate-800 text-white shadow-sm sticky top-0 z-50 border-b border-slate-700/80">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-xl bg-indigo-600/90 flex items-center justify-center shadow-sm">
        <i class="fa-solid fa-hotel text-xl text-white"></i>
      </div>
      <div>
        <h1 class="text-base font-bold tracking-tight flex items-center gap-2 text-slate-100">
          Hệ Thống Tích Hợp KBTT v1.4
          <span class="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span> Live Sync
          </span>
        </h1>
        <p class="text-xs text-slate-400">Đồng bộ tự động OCR từ Google Sheets lên api-kbtt.ai-vlab.com</p>
      </div>
    </div>

    <!-- Auth & System Badges -->
    <div class="flex items-center space-x-3 text-xs">
      <div class="bg-slate-900/60 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-slate-300">Danh mục: <strong class="text-white">{catalogs.quocTich.length > 0 ? 'Đã nạp' : 'Đang nạp...'}</strong></span>
      </div>

      <div class="bg-slate-900/60 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span class={`w-2 h-2 rounded-full ${tokenStatus.hasToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
        <span class="text-slate-300">Token:</span>
        <span class="font-mono font-bold text-slate-100">{tokenStatus.hasToken ? `Hợp lệ (${tokenStatus.expiresInSeconds}s)` : 'Chưa nạp'}</span>
      </div>

      <button onclick={handleManualLogin} class="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium transition shadow-sm flex items-center gap-1.5">
        <i class="fa-solid fa-key"></i> Đăng nhập / Refresh
      </button>
    </div>
  </div>
</header>

<!-- Main Content Area -->
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
  <!-- Navigation Tabs -->
  <div class="flex border-b border-slate-300 gap-2 overflow-x-auto text-sm font-medium">
    <button onclick={() => activeTab = 'dataTab'} class={`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 ${activeTab === 'dataTab' ? 'border-indigo-600 text-indigo-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <i class="fa-solid fa-table-list"></i> Dữ Liệu Google Sheets / OCR
    </button>
    <button onclick={() => activeTab = 'syncTab'} class={`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 ${activeTab === 'syncTab' ? 'border-indigo-600 text-indigo-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <i class="fa-solid fa-cloud-arrow-up"></i> Thực Thi Đồng Bộ & Log Phản Hồi
    </button>
    <button onclick={() => activeTab = 'catalogTab'} class={`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 ${activeTab === 'catalogTab' ? 'border-indigo-600 text-indigo-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <i class="fa-solid fa-book-bookmark"></i> Tra Cứu Danh Mục Rút Gọn
    </button>
  </div>

  <!-- TAB 1: Google Sheets / OCR Data Table -->
  {#if activeTab === 'dataTab'}
    <section class="space-y-4">
      <!-- Google Sheets Connection Panel with Date Tab Selection (Sheet ID Hidden) -->
      <div class="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white text-lg">
              <i class="fa-solid fa-file-excel"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-100">Google Sheets Tích Hợp & Lựa Chọn Ngày</h3>
              <p class="text-xs text-slate-300">Kéo dữ liệu tự động theo từng Tab ngày (Mặc định tab ngày gần hiện tại nhất)</p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-300 font-mono">{tabFetchStatus}</span>
            <button onclick={fetchSheetTabsList} class="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600 transition shadow-sm flex items-center gap-1.5 text-slate-200" title="Làm mới danh sách Tab ngày">
              <i class={`fa-solid fa-arrows-rotate ${isLoadingSheet ? 'fa-spin' : ''}`}></i> Nạp lại Tabs
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <!-- Tab Selection Dropdown -->
          <div class="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-700">
            <label for="tabSelectInput" class="text-xs font-semibold text-slate-300 whitespace-nowrap pl-1.5"><i class="fa-regular fa-calendar-days mr-1"></i> Chọn Tab Ngày:</label>
            <select id="tabSelectInput" bind:value={selectedGid} onchange={handleTabChange} class="text-xs text-slate-800 bg-[#f1f5f9] border border-slate-400 rounded-md px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold">
              {#each availableTabs as t}
                <option value={t.gid}>{t.name} {t.isDefault ? '⭐ (Gần nhất)' : ''}</option>
              {/each}
            </select>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2">
            <button onclick={() => pullDataFromGoogleSheet()} disabled={isLoadingSheet} class="px-4 py-2 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50" title="Lấy dữ liệu từ Google Sheets về bảng">
              <i class="fa-solid fa-cloud-arrow-down"></i> Lấy thông tin từ sheet
            </button>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-slate-800">Danh sách bản ghi OCR cần đồng bộ</h2>
          <p class="text-xs text-slate-500">{currentSourceLabel}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick={loadSampleData} class="px-3 py-1.5 text-xs bg-slate-200/90 hover:bg-slate-300 text-slate-700 rounded-lg border border-slate-300 font-medium transition flex items-center gap-1.5">
            <i class="fa-solid fa-rotate-left"></i> Dữ liệu mẫu
          </button>
          <button onclick={addNewRow} class="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-medium transition flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-plus"></i> Thêm dòng
          </button>
          <button onclick={pushSelectedRows} class="px-3.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-paper-plane"></i> Push đăng ký đã chọn (<span class="font-mono">{selectedIndices.size > 0 ? selectedIndices.size : 'Tất cả'}</span>)
          </button>
          <button onclick={syncAllRows} class="px-4 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-bolt"></i> Push tất cả
          </button>
        </div>
      </div>

      <!-- Table with Read-only / Edit Mode & Checkbox Selection -->
      <div class="bg-slate-100/90 rounded-xl border border-slate-300/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto max-h-[520px]">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-300/80 text-slate-800 uppercase font-bold text-[11px] sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th class="p-3 w-8 text-center">
                  <input type="checkbox" checked={currentRows.length > 0 && selectedIndices.size === currentRows.length} onchange={(e) => toggleSelectAll((e.target as HTMLInputElement).checked)} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                </th>
                <th class="p-3 w-8 text-center">#</th>
                <th class="p-3">Họ tên</th>
                <th class="p-3">Ngày sinh</th>
                <th class="p-3">Giới tính</th>
                <th class="p-3">Quốc tịch</th>
                <th class="p-3">Loại giấy tờ</th>
                <th class="p-3">Số giấy tờ</th>
                <th class="p-3">Phòng</th>
                <th class="p-3">Ngày đến / đi</th>
                <th class="p-3">Địa chỉ</th>
                <th class="p-3 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/90 bg-[#f8fafc]">
              {#each currentRows as row, idx}
                {@const valState = validationStates[idx] || { isComplete: true, missingFields: [], fieldStatus: {} }}
                {@const isComplete = valState.isComplete}
                {@const fStatus = valState.fieldStatus || {}}
                {@const isEditing = editingIndices.has(idx)}
                {@const isChecked = selectedIndices.has(idx)}
                {@const addrInfo = getDisplayAddress(row)}

                <tr ondblclick={() => openEditModal(idx)} class={`hover:bg-slate-100/80 transition ${!isComplete ? 'bg-rose-50/30' : ''} ${isChecked ? 'bg-indigo-50/30' : ''}`}>
                  <td class="p-3 text-center">
                    <input type="checkbox" checked={isChecked} onchange={(e) => toggleRowSelect(idx, (e.target as HTMLInputElement).checked)} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                  </td>

                  <td class="p-3 text-center font-mono text-slate-400">{idx + 1}</td>

                  <!-- Họ tên -->
                  <td class="p-3 font-medium text-slate-900">
                    {#if isEditing}
                      <input type="text" value={row.hoTen || row['Họ tên'] || ''} onchange={(e) => updateCell(idx, 'hoTen', (e.target as HTMLInputElement).value)} class="w-full rounded px-2 py-1 outline-none uppercase font-bold text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                    {:else if fStatus.hoTen?.valid ?? (row.hoTen || row['Họ tên'])}
                      <button type="button" class="uppercase font-bold text-slate-800 cursor-pointer hover:text-indigo-600 transition text-left" onclick={() => openEditModal(idx)}>{row.hoTen || row['Họ tên']}</button>
                    {:else}
                      <button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-semibold px-2 py-0.5 rounded text-xs cursor-pointer" onclick={() => openEditModal(idx)}>Thiếu họ tên *</button>
                    {/if}
                  </td>

                  <!-- Ngày sinh -->
                  <td class="p-3 font-mono">
                    {#if isEditing}
                      <input type="text" value={row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''} onchange={(e) => updateCell(idx, 'ngaySinh', (e.target as HTMLInputElement).value)} placeholder="YYYY-MM-DD" class="w-24 rounded px-2 py-1 outline-none text-xs font-mono transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                    {:else if fStatus.ngaySinh?.valid ?? (row.ngaySinh || row['D.O.B'] || row['Ngày sinh'])}
                      <button type="button" class="cursor-pointer hover:text-indigo-600 transition" onclick={() => openEditModal(idx)}>{row.ngaySinh || row['D.O.B'] || row['Ngày sinh']}</button>
                    {:else}
                      <button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-2 py-0.5 rounded text-xs cursor-pointer" onclick={() => openEditModal(idx)}>Thiếu ngày sinh *</button>
                    {/if}
                  </td>

                  <!-- Giới tính -->
                  <td class="p-3">
                    {#if isEditing}
                      <select onchange={(e) => updateCell(idx, 'gioiTinh', (e.target as HTMLSelectElement).value)} class="bg-emerald-50/50 border border-emerald-400 rounded px-2 py-1 outline-none text-xs font-medium transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="Nam" selected={(row.gioiTinh || row['Giới tính']) === 'Nam' || (row.gioiTinh || row['Giới tính']) === 'M'}>Nam</option>
                        <option value="Nữ" selected={(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F'}>Nữ</option>
                      </select>
                    {:else}
                      <span class="px-2 py-0.5 rounded bg-slate-200/80 font-semibold text-slate-700 text-xs">{(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'Nữ' : 'Nam'}</span>
                    {/if}
                  </td>

                  <!-- Quốc tịch -->
                  <td class="p-3">
                    {#if isEditing}
                      <input type="text" value={row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM'} onchange={(e) => updateCell(idx, 'quocTich', (e.target as HTMLInputElement).value)} class="w-20 rounded px-1.5 py-1 outline-none uppercase font-bold text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                    {:else if fStatus.quocTich?.valid ?? true}
                      <span class="font-bold text-slate-700 text-xs">{String(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase()}</span>
                    {:else}
                      <span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-bold px-1.5 py-0.5 rounded text-xs cursor-help" title={fStatus.quocTich?.error}>{String(row.quocTich || 'LỖI').toUpperCase()} <i class="fa-solid fa-circle-exclamation"></i></span>
                    {/if}
                  </td>

                  <!-- Loại giấy tờ -->
                  <td class="p-3">
                    {#if isEditing}
                      <select onchange={(e) => updateCell(idx, 'loaiGiayTo', (e.target as HTMLSelectElement).value)} class="bg-emerald-50/50 border border-emerald-400 rounded px-1.5 py-1 outline-none text-xs max-w-[130px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="Thẻ CCCD" selected={row.loaiGiayTo === 'Thẻ CCCD' || row['Loại giấy tờ'] === 'Thẻ CCCD'}>Thẻ CCCD (1)</option>
                        <option value="Thẻ CMND" selected={row.loaiGiayTo === 'Thẻ CMND' || row['Loại giấy tờ'] === 'Thẻ CMND'}>Thẻ CMND (2)</option>
                        <option value="Giấy phép lái xe" selected={row.loaiGiayTo === 'Giấy phép lái xe' || row['Loại giấy tờ'] === 'Giấy phép lái xe'}>GPLX (3)</option>
                        <option value="Hộ chiếu" selected={row.loaiGiayTo === 'Hộ chiếu' || row['Loại giấy tờ'] === 'Hộ chiếu'}>Hộ chiếu (4)</option>
                        <option value="Thẻ Căn Cước" selected={row.loaiGiayTo === 'Thẻ Căn Cước' || row['Loại giấy tờ'] === 'Thẻ Căn Cước'}>Thẻ Căn Cước (8)</option>
                      </select>
                    {:else}
                      <span class="text-slate-700 text-xs">{row.loaiGiayTo || row['Loại giấy tờ'] || 'Thẻ CCCD (1)'}</span>
                    {/if}
                  </td>

                  <!-- Số giấy tờ -->
                  <td class="p-3 font-mono font-bold text-indigo-700">
                    {#if isEditing}
                      <input type="text" value={row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu'] || ''} onchange={(e) => updateCell(idx, 'soGiayTo', (e.target as HTMLInputElement).value)} placeholder="Số giấy tờ" class="w-28 rounded px-2 py-1 outline-none font-bold font-mono text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-indigo-700">
                    {:else if fStatus.soGiayTo?.valid ?? (fStatus.soHoChieu?.valid ?? true)}
                      <button type="button" class="cursor-pointer hover:underline font-mono font-bold text-indigo-700" onclick={() => openEditModal(idx)}>{row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu']}</button>
                    {:else}
                      <button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-mono font-bold px-2 py-0.5 rounded text-xs cursor-pointer" onclick={() => openEditModal(idx)} title={fStatus.soGiayTo?.error || fStatus.soHoChieu?.error}>{row.soGiayTo || row['Số giấy tờ'] || 'Thiếu số *'}</button>
                    {/if}
                  </td>

                  <!-- Số phòng -->
                  <td class="p-3 text-center">
                    {#if isEditing}
                      <select onchange={(e) => updateCell(idx, 'soPhong', (e.target as HTMLSelectElement).value)} class="rounded px-2 py-1 outline-none text-xs font-semibold transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800 text-center">
                        <option value="">--</option>
                        {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                          <option value={num} selected={cleanRoomNumber(row.soPhong || row['Số phòng']) === String(num)}>{num}</option>
                        {/each}
                      </select>
                    {:else if fStatus.soPhong?.valid ?? (row.soPhong || row['Số phòng'])}
                      <span class="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded text-xs">{cleanRoomNumber(row.soPhong || row['Số phòng'])}</span>
                    {:else}
                      <span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded text-xs cursor-help" title="Thiếu hoặc sai số phòng">Thiếu</span>
                    {/if}
                  </td>

                  <!-- Ngày đến / đi -->
                  <td class="p-3 text-[11px] text-slate-500">
                    {#if isEditing}
                      <div class="space-y-1">
                        <input type="text" value={row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || ''} onchange={(e) => updateCell(idx, 'ngayDen', (e.target as HTMLInputElement).value)} placeholder="Đến (hôm nay/qua)" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                        <input type="text" value={row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || ''} onchange={(e) => updateCell(idx, 'ngayDi', (e.target as HTMLInputElement).value)} placeholder="Đi" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                      </div>
                    {:else}
                      <button type="button" class="space-y-0.5 cursor-pointer text-left" onclick={() => openEditModal(idx)} title="Bấm để chỉnh sửa">
                        {#if fStatus.ngayDen?.valid ?? true}
                          <div>Đến: <strong>{row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || 'N/A'}</strong></div>
                        {:else}
                          <div class="bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 rounded cursor-help font-semibold text-[10px]" title={fStatus.ngayDen?.error}>Đến: {row.ngayDen || 'Thiếu'} <i class="fa-solid fa-triangle-exclamation"></i></div>
                        {/if}
                        <div>Đi: <strong>{row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || 'N/A'}</strong></div>
                      </button>
                    {/if}
                  </td>

                  <!-- Địa chỉ -->
                  <td class="p-3 text-slate-700 text-[11px] max-w-[150px]">
                    {#if isEditing}
                      <input type="text" value={getCombinedAddress(row) || row.diaChi || row['Địa chỉ'] || ''} onchange={(e) => updateCell(idx, 'diaChi', (e.target as HTMLInputElement).value)} placeholder="Chi tiết, Xã, Huyện, Tỉnh" class="w-32 rounded px-1.5 py-0.5 outline-none text-[11px] bg-emerald-50/50 border border-emerald-400 text-slate-800 transition-all duration-150 focus:scale-110 focus:shadow-xl focus:ring-2 focus:ring-indigo-500">
                    {:else}
                      <button type="button" onclick={() => openEditModal(idx)} class="cursor-pointer hover:text-indigo-600 transition underline decoration-dotted decoration-slate-400 font-medium truncate inline-block max-w-[130px] text-left" title={`Bấm để chỉnh sửa: ${addrInfo.fullText}`}>
                        {addrInfo.shortText}
                      </button>
                    {/if}
                  </td>

                  <!-- Thao tác -->
                  <td class="p-3 text-center whitespace-nowrap">
                    <div class="inline-flex items-center gap-1">
                      <button onclick={() => openEditModal(idx)} class="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-100 transition" title="Bung Modal Chỉnh sửa chi tiết">
                        <i class="fa-solid fa-up-right-from-square"></i>
                      </button>
                      <button onclick={() => toggleEditInline(idx)} class={`p-1.5 rounded transition ${isEditing ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'}`} title={isEditing ? 'Lưu nhanh' : 'Sửa nhanh'}>
                        <i class={`fa-solid ${isEditing ? 'fa-floppy-disk' : 'fa-pen'}`}></i>
                      </button>
                      <button onclick={() => pushSingleRow(idx)} class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Đăng ký riêng dòng này">
                        <i class="fa-solid fa-paper-plane"></i>
                      </button>
                      <button onclick={() => removeRow(idx)} class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition" title="Xóa dòng">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  {/if}

  <!-- TAB 2: Execution & Logs -->
  {#if activeTab === 'syncTab'}
    <section class="space-y-4">
      <div class="bg-slate-100/90 p-5 rounded-xl border border-slate-300/80 shadow-sm">
        <h3 class="text-base font-semibold text-slate-800 mb-3">Kết quả thực thi và Nhật ký ghi nhận</h3>
        {#if isSyncing}
          <div class="text-center py-6 text-indigo-600 font-medium animate-pulse text-xs">
            <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Đang thực thi: {syncActionTitle} lên hệ thống KBTT...</p>
          </div>
        {:else if syncResults.length === 0}
          <div class="text-center py-8 text-slate-400 text-xs">
            <i class="fa-solid fa-inbox text-3xl mb-2"></i>
            <p>Chưa có lượt chạy đồng bộ nào. Nhấn "Push đăng ký đã chọn" hoặc "Push tất cả" để bắt đầu.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each syncResults as r, idx}
              {@const isSuccess = r.status === 'Thành công'}
              <div class={`p-4 rounded-xl border ${isSuccess ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'} transition`}>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isSuccess ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      {idx + 1}
                    </span>
                    <strong class="text-sm font-semibold text-slate-800">{r.row ? (r.row.hoTen || r.row['Họ tên']) : `Dòng ${idx + 1}`}</strong>
                    <span class={`text-xs px-2 py-0.5 rounded-full font-medium ${r.branch === 'VN' ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-100 text-cyan-800'}`}>
                      {r.branch === 'VN' ? 'Khách Việt Nam (API 5)' : 'Khách Nước ngoài (API 4)'}
                    </span>
                  </div>
                  <span class={`text-xs px-2.5 py-1 rounded-md font-semibold ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {r.status}
                  </span>
                </div>
                <p class="text-xs text-slate-600 mb-2"><strong>Phản hồi:</strong> {r.message}</p>
                {#if r.payload}
                  <details class="text-[11px]">
                    <summary class="cursor-pointer text-indigo-600 hover:underline font-medium">Xem Request Payload gửi đi</summary>
                    <pre class="bg-slate-900 text-slate-200 p-2.5 rounded mt-1.5 overflow-x-auto">{JSON.stringify(r.payload, null, 2)}</pre>
                  </details>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- TAB 3: Catalog Browser -->
  {#if activeTab === 'catalogTab'}
    <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Tỉnh / TP -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Tỉnh / TP (API 7)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.tinhTp.length}</span>
        </h4>
        <input type="text" bind:value={filterTinh} placeholder="Tìm tỉnh (vd: ha noi, hn, 101)..." class="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 mb-2 focus:ring-1 focus:ring-indigo-500 outline-none">
        <ul class="text-xs space-y-1 overflow-y-auto max-h-72 divide-y divide-slate-200">
          {#each filteredTinhList as t}
            <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
              <span class="font-semibold text-slate-800">{t.tenTT}</span>
              <span class="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">{t.maTT} ({t.maTTChu || ''})</span>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Quốc Tịch -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Quốc Tịch (API 6)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.quocTich.length} quốc gia</span>
        </h4>
        <input type="text" bind:value={filterQuocTich} placeholder="Tìm quốc gia (vd: viet nam, rus)..." class="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 mb-2 focus:ring-1 focus:ring-indigo-500 outline-none">
        <ul class="text-xs space-y-1 overflow-y-auto max-h-72 divide-y divide-slate-200">
          {#each filteredQuocTichList as q}
            <li class="border-b border-slate-100 last:border-0">
              <button type="button" onclick={() => copyCode(q.maQT, q.tenQT)} class="w-full text-left py-1.5 px-2 flex items-center justify-between hover:bg-indigo-50/80 cursor-pointer rounded transition group" title={`Bấm để copy mã: ${q.maQT}`}>
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-slate-800 group-hover:text-indigo-700 transition">{q.tenQT}</span>
                  {#if q.tenQTEn}
                    <span class="text-slate-400 font-normal text-[11px]">({q.tenQTEn})</span>
                  {/if}
                </div>
                <span class="font-mono text-indigo-600 font-bold bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded text-[11px] transition shadow-xs flex items-center gap-1">
                  <i class="fa-regular fa-copy text-[10px] opacity-70"></i> {q.maQT}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Loại Giấy Tờ -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Loại Giấy Tờ (API 10)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.loaiGiayTo.length} loại</span>
        </h4>
        <ul class="text-xs space-y-1.5 bg-slate-200/60 p-3 rounded-lg border border-slate-300">
          {#each catalogs.loaiGiayTo as lg}
            <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
              <span class="font-medium text-slate-800">{lg.name}</span>
              <span class="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Mã API: {lg.id}</span>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Lý Do Cư Trú -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Lý Do Cư Trú (API 9)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.lyDoCuTru.length} lý do</span>
        </h4>
        <ul class="text-xs space-y-1.5 bg-slate-200/60 p-3 rounded-lg border border-slate-300">
          {#each catalogs.lyDoCuTru as ld}
            <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
              <span class="font-medium text-slate-800">{ld.name}</span>
              <span class="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Mã API: {ld.id}</span>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}
</main>

<!-- Quick-Edit Modal -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
      <div class="bg-slate-800 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-pen-to-square text-indigo-400 text-base"></i>
          <h3 class="font-bold text-sm tracking-wide">Chỉnh sửa thông tin khách lưu trú #{modalIndex !== null ? modalIndex + 1 : ''}</h3>
        </div>
        <button onclick={closeEditModal} aria-label="Đóng cửa sổ chỉnh sửa" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Họ tên -->
          <div class="md:col-span-2">
            <label for="modalHoTen" class="block font-semibold text-slate-700 mb-1">Họ và tên <span class="text-rose-500">*</span></label>
            <input type="text" id="modalHoTen" bind:value={modalForm.hoTen} class="w-full px-3 py-2 text-sm uppercase font-bold border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="NGUYEN VAN A">
          </div>

          <!-- Giới tính -->
          <div>
            <label for="modalGioiTinh" class="block font-semibold text-slate-700 mb-1">Giới tính</label>
            <select id="modalGioiTinh" bind:value={modalForm.gioiTinh} class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition">
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>

          <!-- Ngày sinh -->
          <div>
            <label for="modalNgaySinh" class="block font-semibold text-slate-700 mb-1">Ngày sinh (YYYY-MM-DD) <span class="text-rose-500">*</span></label>
            <input type="text" id="modalNgaySinh" bind:value={modalForm.ngaySinh} class="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="1995-10-15">
          </div>

          <!-- Quốc tịch -->
          <div>
            <label for="modalQuocTich" class="block font-semibold text-slate-700 mb-1">Quốc tịch (Mã 3 ký tự) <span class="text-rose-500">*</span></label>
            <input type="text" id="modalQuocTich" bind:value={modalForm.quocTich} class="w-full px-3 py-2 text-sm uppercase font-bold border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="VNM, RUS, KOR...">
          </div>

          <!-- Số phòng -->
          <div>
            <label for="modalSoPhong" class="block font-semibold text-slate-700 mb-1">Số phòng <span class="text-rose-500">*</span></label>
            <select id="modalSoPhong" bind:value={modalForm.soPhong} class="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition">
              {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                <option value={String(num)}>Phòng {num}</option>
              {/each}
            </select>
          </div>

          <!-- Loại giấy tờ -->
          <div>
            <label for="modalLoaiGiayTo" class="block font-semibold text-slate-700 mb-1">Loại giấy tờ</label>
            <select id="modalLoaiGiayTo" bind:value={modalForm.loaiGiayTo} class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition">
              <option value="Thẻ CCCD">Thẻ CCCD (1)</option>
              <option value="Thẻ CMND">Thẻ CMND (2)</option>
              <option value="Giấy phép lái xe">GPLX (3)</option>
              <option value="Hộ chiếu">Hộ chiếu (4)</option>
              <option value="Thẻ Căn Cước">Thẻ Căn Cước (8)</option>
            </select>
          </div>

          <!-- Số giấy tờ -->
          <div class="md:col-span-2">
            <label for="modalSoGiayTo" class="block font-semibold text-slate-700 mb-1">Số giấy tờ <span class="text-rose-500">*</span></label>
            <input type="text" id="modalSoGiayTo" bind:value={modalForm.soGiayTo} class="w-full px-3 py-2 text-sm font-mono font-bold text-indigo-700 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="Số CCCD / Hộ chiếu">
          </div>

          <!-- Ngày đến -->
          <div>
            <label for="modalNgayDen" class="block font-semibold text-slate-700 mb-1">Ngày đến (YYYY-MM-DD HH:mm:ss)</label>
            <input type="text" id="modalNgayDen" bind:value={modalForm.ngayDen} class="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="2026-03-29 14:00:00">
          </div>

          <!-- Ngày đi -->
          <div>
            <label for="modalNgayDi" class="block font-semibold text-slate-700 mb-1">Ngày đi (YYYY-MM-DD HH:mm:ss)</label>
            <input type="text" id="modalNgayDi" bind:value={modalForm.ngayDi} class="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="2026-03-31 12:00:00">
          </div>

          <!-- Thời hạn tạm trú -->
          <div>
            <label for="modalThoiHanTamTru" class="block font-semibold text-slate-700 mb-1">Thời hạn tạm trú (Khách NN)</label>
            <input type="text" id="modalThoiHanTamTru" bind:value={modalForm.thoiHanTamTru} class="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="2026-12-31 23:59:59">
          </div>

          <!-- Toàn bộ Địa chỉ đầy đủ -->
          <div class="md:col-span-3">
            <label for="modalDiaChiFull" class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Địa chỉ đầy đủ (Cách nhau bởi dấu phẩy: [Chi tiết], [Phường/Xã], [Quận/Huyện], [Tỉnh/TP])</span>
              <span class="text-indigo-600 text-[11px] font-normal">Tự động phân tách và đồng bộ vào Sheet</span>
            </label>
            <textarea id="modalDiaChiFull" rows="2" bind:value={modalForm.diaChiFull} class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="Ví dụ: Tổ Dân Phố 5, Krông Năng, Krông Năng, Đắk Lắk"></textarea>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
        <button onclick={closeEditModal} class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-xs">
          Hủy bỏ
        </button>
        <button onclick={saveModal} class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow flex items-center gap-1.5">
          <i class="fa-solid fa-floppy-disk"></i> Lưu & Cập nhật Sheet
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification -->
{#if toastVisible}
  <div class="fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 z-50 transition-all duration-300">
    <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
    <span><strong>{toastCode}</strong>: {toastMsg}</span>
  </div>
{/if}

<!-- Footer -->
<footer class="bg-slate-800 text-slate-300 border-t border-slate-700 py-3 text-center text-xs mt-auto">
  Module kiểm thử tích hợp KBTT API v1.4 &copy; 2026. Chuẩn hóa kiến trúc SvelteKit & TypeScript.
</footer>
