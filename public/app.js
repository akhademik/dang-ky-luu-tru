let currentRows = [];
let catalogData = {};
let availableTabs = [];
let rowValidationStates = [];
let selectedRowIndices = new Set();
let editingRowIndices = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  setupHotReload();
  await loadCatalogs();
  await checkTokenStatus();
  await fetchSheetTabsList();
  if (currentRows.length === 0) {
    loadSampleData();
  }
});

/**
 * Cấu hình Live Hot-Reload qua Server-Sent Events (SSE)
 */
function setupHotReload() {
  if (window.EventSource) {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log('⚡ [Hot-Reload] Phát hiện thay đổi từ server, đang tự động làm mới...');
          updatePayloadPreview();
          checkTokenStatus();
        }
      } catch (err) {
        // ignore
      }
    };
  }
}

/**
 * Lấy danh sách các Tab (Sheets) từ Google Sheets và tự động chọn tab ngày gần nhất
 */
async function fetchSheetTabsList() {
  const sheetIdInput = (document.getElementById('sheetIdInput').value || '').trim();
  const select = document.getElementById('sheetTabSelect');
  const statusLabel = document.getElementById('tabFetchStatus');

  if (!sheetIdInput) return;

  statusLabel.textContent = 'Đang quét tabs...';
  try {
    const res = await fetch(`/api/sheets/tabs?sheetId=${encodeURIComponent(sheetIdInput)}`);
    const data = await res.json();

    if (data.success && data.tabs && data.tabs.length > 0) {
      availableTabs = data.tabs;
      select.innerHTML = '';

      let defaultGid = data.defaultGid;
      availableTabs.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.gid;
        opt.textContent = `${t.name} ${t.isDefault ? '⭐ (Gần nhất)' : ''}`;
        if (t.isDefault) {
          opt.selected = true;
          defaultGid = t.gid;
        }
        select.appendChild(opt);
      });

      statusLabel.textContent = `Tìm thấy ${availableTabs.length} tabs`;

      if (defaultGid) {
        await pullDataFromGoogleSheet(defaultGid);
      }
    } else {
      select.innerHTML = '<option value="0">Tab Mặc định (GID 0)</option>';
      statusLabel.textContent = 'Tab mặc định';
    }
  } catch (err) {
    console.warn('Lỗi khi lấy tabs:', err);
    statusLabel.textContent = 'Không lấy được tabs';
  }
}

function handleTabChange() {
  const select = document.getElementById('sheetTabSelect');
  const gid = select.value;
  if (gid !== undefined) {
    pullDataFromGoogleSheet(gid);
  }
}

async function pullDataFromGoogleSheet(forcedGid = null) {
  const sheetId = (document.getElementById('sheetIdInput').value || '').trim();
  const select = document.getElementById('sheetTabSelect');
  const gid = forcedGid !== null ? forcedGid : (select ? select.value : '0');

  if (!sheetId) {
    alert('Vui lòng nhập Google Sheet ID hoặc đường link');
    return;
  }

  const sourceLabel = document.getElementById('currentSourceLabel');
  sourceLabel.textContent = 'Đang kéo dữ liệu từ Google Sheets...';

  try {
    const res = await fetch('/api/sheets/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, gid }),
    });
    const data = await res.json();

    if (data.success && data.rows && data.rows.length > 0) {
      currentRows = data.rows;
      selectedRowIndices = new Set(currentRows.map((_, i) => i)); // Mặc định chọn tất cả
      editingRowIndices.clear();

      await updatePayloadPreview();
      renderTable();
      updateSelectedCountBadge();

      const selectedTab = availableTabs.find(t => t.gid === String(gid));
      const tabName = selectedTab ? selectedTab.name : `GID ${gid}`;
      sourceLabel.textContent = `Nguồn: Google Sheets [${tabName}] - ${data.rows.length} bản ghi`;
    } else {
      sourceLabel.textContent = `Cảnh báo: ${data.message || 'Không có dữ liệu trong tab này'}`;
      if (forcedGid === null) {
        alert(data.message || 'Không có dữ liệu trong tab');
      }
    }
  } catch (err) {
    sourceLabel.textContent = `Lỗi kết nối: ${err.message}`;
  }
}

async function pullAndSyncDirectly() {
  const select = document.getElementById('sheetTabSelect');
  const gid = select ? select.value : '0';
  await pullDataFromGoogleSheet(gid);
  await processAndSyncNow();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('border-indigo-600', 'text-indigo-600', 'font-semibold');
    btn.classList.add('border-transparent', 'text-slate-500');
  });

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.remove('hidden');

  const activeBtn = document.getElementById(`tab-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('border-indigo-600', 'text-indigo-600', 'font-semibold');
    activeBtn.classList.remove('border-transparent', 'text-slate-500');
  }

  if (tabId === 'transformTab') {
    updatePayloadPreview();
  }
}

function getCombinedAddress(row) {
  const rawAddress = (row.diaChi || row['Địa chỉ'] || row['Địa chỉ chi tiết'] || row.address || '').trim();
  const tinhRaw = row.tinhTp || row['Tỉnh'] || row['Tỉnh/TP'] || row.province || '';
  const phuongXaRaw = row.phuongXa || row['Phường/Xã'] || row.ward || '';
  const quanHuyenRaw = row.quanHuyen || row['Quận/Huyện'] || row.district || '';

  const parts = [rawAddress, phuongXaRaw, quanHuyenRaw, tinhRaw].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
}

function renderTable() {
  const tbody = document.getElementById('dataTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allSelected = currentRows.length > 0 && selectedRowIndices.size === currentRows.length;
  const selectAllEl = document.getElementById('selectAllCheckbox');
  if (selectAllEl) selectAllEl.checked = allSelected;

  currentRows.forEach((row, idx) => {
    const valState = rowValidationStates[idx] || { isComplete: true, missingFields: [] };
    const isComplete = valState.isComplete;
    const missing = valState.missingFields || [];
    const isEditing = editingRowIndices.has(idx);
    const isChecked = selectedRowIndices.has(idx);

    const isVN = (row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase() === 'VNM' || (row.quocTich || '').toLowerCase() === 'việt nam';
    const addressOrExpiry = isVN ? getCombinedAddress(row) : (row.thoiHanTamTru || row.thoiHanTamTruStr || row['Thời hạn tạm trú'] || 'Chưa đặt');

    const tr = document.createElement('tr');
    tr.className = `hover:bg-slate-50/90 transition ${!isComplete ? 'bg-rose-50/30' : ''} ${isChecked ? 'bg-indigo-50/20' : ''}`;
    tr.innerHTML = `
      <!-- Checkbox -->
      <td class="p-3 text-center">
        <input type="checkbox" onchange="toggleRowSelect(${idx}, this.checked)" ${isChecked ? 'checked' : ''} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
      </td>

      <td class="p-3 text-center font-mono text-slate-400">${idx + 1}</td>
      
      <!-- Họ tên (Required) -->
      <td class="p-3 font-medium text-slate-900">
        ${isEditing 
          ? `<input type="text" value="${row.hoTen || row['Họ tên'] || ''}" onchange="updateCell(${idx}, 'hoTen', this.value)" class="w-full bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none uppercase font-bold text-slate-800">`
          : `<span class="uppercase font-bold text-slate-800">${row.hoTen || row['Họ tên'] || '<em class="text-rose-500 font-normal">Thiếu họ tên *</em>'}</span>`
        }
      </td>

      <!-- Ngày sinh (Required) -->
      <td class="p-3 font-mono">
        ${isEditing
          ? `<input type="text" value="${row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''}" onchange="updateCell(${idx}, 'ngaySinh', this.value)" placeholder="YYYY-MM-DD" class="w-24 bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none">`
          : `<span>${row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || '<em class="text-rose-500">Thiếu *</em>'}</span>`
        }
      </td>

      <!-- Giới tính (Required) -->
      <td class="p-3">
        ${isEditing
          ? `<select onchange="updateCell(${idx}, 'gioiTinh', this.value)" class="bg-white border border-indigo-300 rounded px-1 py-0.5 outline-none text-xs">
              <option value="Nam" ${(row.gioiTinh || row['Giới tính']) === 'Nam' || (row.gioiTinh || row['Giới tính']) === 'M' ? 'selected' : ''}>Nam (M)</option>
              <option value="Nữ" ${(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'selected' : ''}>Nữ (F)</option>
            </select>`
          : `<span class="px-2 py-0.5 rounded bg-slate-100 font-semibold">${(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'Nữ (F)' : 'Nam (M)'}</span>`
        }
      </td>

      <!-- Quốc tịch (Required với NNN) -->
      <td class="p-3">
        ${isEditing
          ? `<input type="text" value="${row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM'}" onchange="updateCell(${idx}, 'quocTich', this.value)" class="w-20 bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none uppercase font-bold">`
          : `<span class="font-bold text-slate-700">${(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase()}</span>`
        }
      </td>

      <!-- Loại giấy tờ (Required) -->
      <td class="p-3">
        ${isEditing
          ? `<select onchange="updateCell(${idx}, 'loaiGiayTo', this.value)" class="bg-white border border-indigo-300 rounded px-1 py-0.5 outline-none text-xs max-w-[130px]">
              <option value="Thẻ CCCD" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Thẻ CCCD' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'CCCD' ? 'selected' : ''}>Thẻ CCCD (1)</option>
              <option value="Thẻ CMND" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Thẻ CMND' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'CMND' ? 'selected' : ''}>Thẻ CMND (2)</option>
              <option value="Giấy phép lái xe" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Giấy phép lái xe' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'GPLX' ? 'selected' : ''}>GPLX (3)</option>
              <option value="Hộ chiếu" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Hộ chiếu' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'Passport' ? 'selected' : ''}>Hộ chiếu (4)</option>
              <option value="Thẻ Căn Cước" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Thẻ Căn Cước' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'Căn cước' ? 'selected' : ''}>Thẻ Căn Cước (8)</option>
            </select>`
          : `<span class="text-slate-700">${row.loaiGiayTo || row['Loại giấy tờ'] || 'Thẻ CCCD (1)'}</span>`
        }
      </td>

      <!-- Số giấy tờ (Required) -->
      <td class="p-3 font-mono font-bold text-indigo-700">
        ${isEditing
          ? `<input type="text" value="${row.soGiayTo || row['Số giấy tờ'] || ''}" onchange="updateCell(${idx}, 'soGiayTo', this.value)" placeholder="12 số CCCD" class="w-28 bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none font-bold text-indigo-700">`
          : `<span>${row.soGiayTo || row['Số giấy tờ'] || '<em class="text-rose-500 font-normal">Thiếu *</em>'}</span>`
        }
      </td>

      <!-- Số phòng (Required) -->
      <td class="p-3">
        ${isEditing
          ? `<input type="text" value="${row.soPhong || row['Số phòng'] || ''}" onchange="updateCell(${idx}, 'soPhong', this.value)" placeholder="Phòng" class="w-14 bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none font-medium">`
          : `<span class="font-semibold text-slate-800">${row.soPhong || row['Số phòng'] || '<em class="text-rose-500 font-normal">Thiếu *</em>'}</span>`
        }
      </td>

      <!-- Ngày đến / đi (Required) -->
      <td class="p-3 text-[11px] text-slate-500">
        ${isEditing
          ? `<div class="space-y-1">
              <input type="text" value="${row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || ''}" onchange="updateCell(${idx}, 'ngayDen', this.value)" placeholder="Đến" class="w-28 bg-white border border-indigo-300 rounded px-1 py-0.2 outline-none text-[10px]">
              <input type="text" value="${row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || ''}" onchange="updateCell(${idx}, 'ngayDi', this.value)" placeholder="Đi" class="w-28 bg-white border border-indigo-300 rounded px-1 py-0.2 outline-none text-[10px]">
            </div>`
          : `<div>Đến: <strong>${row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || 'N/A'}</strong></div>
             <div>Đi: <strong>${row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || 'N/A'}</strong></div>`
        }
      </td>

      <!-- Địa chỉ ghép VN / Tạm trú NNN -->
      <td class="p-3 text-slate-600 truncate max-w-xs text-[11px]" title="${addressOrExpiry}">
        ${addressOrExpiry}
      </td>

      <!-- Kiểm tra Required -->
      <td class="p-3 text-center">
        ${isComplete 
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><i class="fa-solid fa-check"></i> Đủ chuẩn</span>` 
          : `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full cursor-help" title="Thiếu: ${missing.join(', ')}"><i class="fa-solid fa-triangle-exclamation"></i> Thiếu ${missing.length} trường</span>`
        }
      </td>

      <!-- Thao tác: Edit/Save + Push + Delete -->
      <td class="p-3 text-center whitespace-nowrap">
        <div class="inline-flex items-center gap-1">
          ${isEditing 
            ? `<button onclick="toggleEditRow(${idx})" class="text-emerald-600 hover:text-emerald-800 p-1.5 rounded hover:bg-emerald-50 transition" title="Lưu chỉnh sửa">
                <i class="fa-solid fa-floppy-disk"></i>
               </button>`
            : `<button onclick="toggleEditRow(${idx})" class="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50 transition" title="Chỉnh sửa dòng">
                <i class="fa-solid fa-pen-to-square"></i>
               </button>`
          }
          <button onclick="pushSingleRow(${idx})" class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Push đăng ký riêng dòng này">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
          <button onclick="removeRow(${idx})" class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition" title="Xóa dòng">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleSelectAll(checked) {
  if (checked) {
    selectedRowIndices = new Set(currentRows.map((_, i) => i));
  } else {
    selectedRowIndices.clear();
  }
  renderTable();
  updateSelectedCountBadge();
}

function toggleRowSelect(idx, checked) {
  if (checked) {
    selectedRowIndices.add(idx);
  } else {
    selectedRowIndices.delete(idx);
  }
  renderTable();
  updateSelectedCountBadge();
}

function updateSelectedCountBadge() {
  const badge = document.getElementById('selectedCountBadge');
  if (badge) badge.textContent = selectedRowIndices.size;
}

function toggleEditRow(idx) {
  if (editingRowIndices.has(idx)) {
    editingRowIndices.delete(idx);
    updatePayloadPreview().then(() => renderTable());
  } else {
    editingRowIndices.add(idx);
    renderTable();
  }
}

function updateCell(idx, field, value) {
  if (currentRows[idx]) {
    currentRows[idx][field] = value;
    updatePayloadPreview();
  }
}

function removeRow(idx) {
  currentRows.splice(idx, 1);
  selectedRowIndices.delete(idx);
  editingRowIndices.delete(idx);
  updatePayloadPreview().then(() => {
    renderTable();
    updateSelectedCountBadge();
  });
}

function addNewRow() {
  const newIdx = currentRows.length;
  currentRows.push({
    hoTen: 'NGUYỄN VĂN MỚI',
    ngaySinh: '1995-01-01',
    gioiTinh: 'Nam',
    quocTich: 'VNM',
    loaiGiayTo: 'Thẻ CCCD',
    soGiayTo: '001095000999',
    soPhong: 'P.102',
    diaChi: 'Hà Nội',
    ngayDen: '2026-09-16 14:00:00',
    ngayDi: '2026-09-18 12:00:00',
    lyDo: 'Du lịch',
  });
  selectedRowIndices.add(newIdx);
  editingRowIndices.add(newIdx);
  updatePayloadPreview().then(() => {
    renderTable();
    updateSelectedCountBadge();
  });
}

function loadSampleData() {
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
      'Ngày đến': '2026-09-16 12:00:00',
      'Ngày đi': '2026-09-18 12:00:00',
      'Số phòng': 'P.06',
      'Lý do': 'Du lịch',
      'Loại giấy tờ': 'Thẻ CCCD',
      'Số giấy tờ': '066201008768',
      'Ảnh mặt trước': '',
      'Ảnh mặt sau': '',
    },
    {
      'Họ tên': 'GRACHEV NIKITA',
      'Quốc tịch': 'RUS',
      'Số giấy tờ': '552165656',
      'Giới tính': 'Nam',
      'Ngày sinh': '1995-11-25',
      'Ngày đến': '2026-09-16 12:00:00',
      'Ngày đi': '2026-09-19 12:00:00',
      'Thời hạn tạm trú': '2026-12-31 23:59:59',
      'Số phòng': 'P.09',
      'Loại giấy tờ': 'Hộ chiếu',
      'Ảnh hộ chiếu': '',
    }
  ];
  selectedRowIndices = new Set(currentRows.map((_, i) => i));
  editingRowIndices.clear();
  document.getElementById('currentSourceLabel').textContent = 'Đang hiển thị dữ liệu mẫu chuẩn v1.4';
  updatePayloadPreview().then(() => {
    renderTable();
    updateSelectedCountBadge();
  });
}

async function updatePayloadPreview() {
  try {
    const res = await fetch('/api/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: currentRows }),
    });
    const data = await res.json();

    const vnPayloads = (data.vnPayloads || []).map(item => item.payload);
    const foreignPayloads = (data.foreignPayloads || []).map(item => item.payload);

    document.getElementById('vnPayloadJson').textContent = JSON.stringify(vnPayloads, null, 2);
    document.getElementById('foreignPayloadJson').textContent = JSON.stringify(foreignPayloads, null, 2);

    document.getElementById('vnCountBadge').textContent = `${vnPayloads.length} bản ghi`;
    document.getElementById('foreignCountBadge').textContent = `${foreignPayloads.length} bản ghi`;

    rowValidationStates = (data.completenessList || []).map(item => item.completeness);
  } catch (err) {
    console.error('Error previewing payloads:', err);
  }
}

async function pushSelectedRows() {
  if (selectedRowIndices.size === 0) {
    alert('Vui lòng tích chọn ít nhất 1 dòng để đăng ký');
    return;
  }

  const rowsToSubmit = Array.from(selectedRowIndices).map(i => currentRows[i]).filter(Boolean);
  await executeSyncBatch(rowsToSubmit, `Đăng ký ${rowsToSubmit.length} khách đã chọn`);
}

async function pushSingleRow(idx) {
  if (!currentRows[idx]) return;
  await executeSyncBatch([currentRows[idx]], `Đăng ký khách: ${currentRows[idx].hoTen || currentRows[idx]['Họ tên']}`);
}

async function processAndSyncNow() {
  if (currentRows.length === 0) {
    alert('Bảng dữ liệu đang trống!');
    return;
  }
  await executeSyncBatch(currentRows, `Đăng ký toàn bộ ${currentRows.length} khách`);
}

async function executeSyncBatch(rows, actionTitle) {
  switchTab('syncTab');
  const resultsContainer = document.getElementById('syncResultsList');
  resultsContainer.innerHTML = `
    <div class="text-center py-6 text-indigo-600 font-medium animate-pulse text-xs">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
      <p>Đang thực thi: ${actionTitle} lên hệ thống KBTT...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    const results = data.results || [];

    resultsContainer.innerHTML = '';
    results.forEach((r, idx) => {
      const isSuccess = r.status === 'Thành công';
      const div = document.createElement('div');
      div.className = `p-4 rounded-xl border ${isSuccess ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'} transition`;
      div.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isSuccess ? 'bg-emerald-600' : 'bg-rose-600'}">
              ${idx + 1}
            </span>
            <strong class="text-sm font-semibold text-slate-800">${r.row ? (r.row.hoTen || r.row['Họ tên']) : `Dòng ${idx + 1}`}</strong>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium ${r.branch === 'VN' ? 'bg-indigo-100 text-indigo-800' : r.branch === 'FOREIGN' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-700'}">
              ${r.branch === 'VN' ? 'Khách Việt Nam (API 5)' : r.branch === 'FOREIGN' ? 'Khách Nước ngoài (API 4)' : 'Lỗi Tiền xử lý'}
            </span>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-md font-semibold ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
            ${r.status}
          </span>
        </div>
        <p class="text-xs text-slate-600 mb-2"><strong>Phản hồi / Ghi chú Sheets:</strong> ${r.message}</p>
        ${r.payload ? `
          <details class="text-[11px]">
            <summary class="cursor-pointer text-indigo-600 hover:underline font-medium">Xem Request Payload gửi đi (API ${r.branch === 'VN' ? '5' : '4'})</summary>
            <pre class="bg-slate-900 text-slate-200 p-2.5 rounded mt-1.5 overflow-x-auto">${JSON.stringify(r.payload, null, 2)}</pre>
          </details>
        ` : ''}
      `;
      resultsContainer.appendChild(div);
    });

    await checkTokenStatus();
  } catch (err) {
    resultsContainer.innerHTML = `<div class="p-4 bg-rose-100 text-rose-800 rounded-lg text-xs">Lỗi thực thi: ${err.message}</div>`;
  }
}

async function loadCatalogs() {
  try {
    const res = await fetch('/api/catalogs');
    const data = await res.json();
    catalogData = data.catalogs || {};

    document.getElementById('catDot').className = 'w-2 h-2 rounded-full bg-emerald-400';
    document.getElementById('catCountText').textContent = 'Đã sẵn sàng';

    document.getElementById('quocTichCount').textContent = `${data.quocTichCount} quốc gia`;
    renderCatalogList('quocTich', catalogData.quocTich || []);

    const lgUl = document.getElementById('loaiGiayToList');
    lgUl.innerHTML = (catalogData.loaiGiayTo || []).map(lg => `<li class="py-1"><span class="font-mono text-indigo-600 font-bold">${lg.name}</span></li>`).join('');

    const ldUl = document.getElementById('lyDoCuTruList');
    ldUl.innerHTML = (catalogData.lyDoCuTru || []).map(ld => `<li class="py-1"><span class="font-mono text-indigo-600 font-bold">${ld.name}</span></li>`).join('');
  } catch (err) {
    document.getElementById('catDot').className = 'w-2 h-2 rounded-full bg-rose-400';
    document.getElementById('catCountText').textContent = 'Lỗi nạp';
  }
}

function renderCatalogList(type, list) {
  if (type === 'quocTich') {
    const ul = document.getElementById('quocTichList');
    ul.innerHTML = list.map(q => `<li class="py-1"><span class="font-mono text-indigo-600 font-bold">${q.maQT}</span>: ${q.tenQT} (${q.tenQTEn || ''})</li>`).join('');
  }
}

function filterCatalog(type) {
  if (type === 'quocTich') {
    const q = (document.getElementById('filterQuocTich').value || '').toLowerCase();
    const filtered = (catalogData.quocTich || []).filter(item => item.tenQT.toLowerCase().includes(q) || (item.tenQTEn && item.tenQTEn.toLowerCase().includes(q)) || item.maQT.toLowerCase().includes(q));
    renderCatalogList('quocTich', filtered);
  }
}

async function checkTokenStatus() {
  try {
    const res = await fetch('/api/token/status');
    const data = await res.json();
    const tokenDot = document.getElementById('tokenDot');
    const tokenText = document.getElementById('tokenStateText');

    if (data.hasToken && data.expiresInSeconds > 0) {
      tokenDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      tokenText.textContent = `Hợp lệ (${data.expiresInSeconds}s)`;
    } else {
      tokenDot.className = 'w-2 h-2 rounded-full bg-amber-400';
      tokenText.textContent = 'Chưa nạp';
    }
  } catch (err) {
    // ignore
  }
}

async function handleManualLogin() {
  try {
    const res = await fetch('/api/token/login', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Đăng nhập lấy token thành công!');
    } else {
      alert(`Đăng nhập phản hồi: ${data.error || 'Thất bại'}`);
    }
    await checkTokenStatus();
  } catch (err) {
    alert(`Lỗi kết nối: ${err.message}`);
  }
}
