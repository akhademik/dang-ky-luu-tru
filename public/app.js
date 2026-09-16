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

function cleanRoomNumber(rawRoom) {
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
 * Lấy danh sách các Tab (Sheets) từ Google Sheets và tự động chọn tab ngày gần nhất
 */
async function fetchSheetTabsList() {
  const sheetIdInput = (document.getElementById('sheetIdInput') ? document.getElementById('sheetIdInput').value : '16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q').trim();
  const select = document.getElementById('sheetTabSelect');
  const statusLabel = document.getElementById('tabFetchStatus');

  if (!sheetIdInput) return;

  if (statusLabel) statusLabel.textContent = 'Đang quét tabs...';
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

      if (statusLabel) statusLabel.textContent = `Tìm thấy ${availableTabs.length} tabs`;

      if (defaultGid) {
        await pullDataFromGoogleSheet(defaultGid);
      }
    } else {
      select.innerHTML = '<option value="0">Tab Mặc định (GID 0)</option>';
      if (statusLabel) statusLabel.textContent = 'Tab mặc định';
    }
  } catch (err) {
    console.warn('Lỗi khi lấy tabs:', err);
    if (statusLabel) statusLabel.textContent = 'Không lấy được tabs';
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
  const sheetId = (document.getElementById('sheetIdInput') ? document.getElementById('sheetIdInput').value : '16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q').trim();
  const select = document.getElementById('sheetTabSelect');
  const gid = forcedGid !== null ? forcedGid : (select ? select.value : '0');

  const sourceLabel = document.getElementById('currentSourceLabel');
  if (sourceLabel) sourceLabel.textContent = 'Đang kéo dữ liệu từ Google Sheets...';

  try {
    const res = await fetch('/api/sheets/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, gid }),
    });
    const data = await res.json();

    if (data.success && data.rows && data.rows.length > 0) {
      currentRows = data.rows.map(row => {
        const rawRoom = row.soPhong || row['Số phòng'] || row.room || '';
        const cleaned = cleanRoomNumber(rawRoom);
        if (cleaned) {
          row.soPhong = cleaned;
          if (row['Số phòng']) row['Số phòng'] = cleaned;
        }
        return row;
      });
      selectedRowIndices = new Set(); // Mặc định select none (chỉ chọn khi click)
      editingRowIndices.clear();

      await updatePayloadPreview();
      renderTable();
      updateSelectedCountBadge();

      const selectedTab = availableTabs.find(t => t.gid === String(gid));
      const tabName = selectedTab ? selectedTab.name : `GID ${gid}`;
      if (sourceLabel) sourceLabel.textContent = `Nguồn: Google Sheets [${tabName}] - ${data.rows.length} bản ghi`;
    } else {
      if (sourceLabel) sourceLabel.textContent = `Cảnh báo: ${data.message || 'Không có dữ liệu trong tab này'}`;
      if (forcedGid === null) {
        alert(data.message || 'Không có dữ liệu trong tab');
      }
    }
  } catch (err) {
    if (sourceLabel) sourceLabel.textContent = `Lỗi kết nối: ${err.message}`;
  }
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
}

function isGuestVN(row) {
  const qt = (row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || '').trim().toLowerCase();
  const docType = (row.loaiGiayTo || row['Loại giấy tờ'] || row['Tên giấy tờ'] || '').toLowerCase();
  const docNum = String(row.soGiayTo || row['Số giấy tờ'] || row['Số CCCD'] || '').replace(/\D/g, '');

  if (docType.includes('cccd') || docType.includes('cmnd') || docType.includes('căn cước')) return true;
  if (['vn', 'vnm', 'viet nam', 'vietnam', 'vvv', 'vv', 'v', 'viet'].includes(qt)) return true;
  if (qt && !['vn', 'vnm', 'viet nam', 'vietnam', 'vvv', 'vv', 'v', 'viet'].includes(qt)) return false;
  if (docNum.length === 12 || docNum.length === 9) return true;
  return false;
}

function getCombinedAddress(row) {
  const loaiGiayToName = (row.loaiGiayTo || row['Loại giấy tờ'] || row['Tên giấy tờ'] || '').toLowerCase();
  // Khách đăng ký bằng Hộ chiếu / Passport thì để địa chỉ trống theo yêu cầu
  if (loaiGiayToName.includes('hộ chiếu') || loaiGiayToName.includes('passport')) {
    return '';
  }

  const rawAddress = (row.diaChi || row['Địa chỉ'] || row['Địa chỉ chi tiết'] || row.address || '').trim();
  const tinhRaw = (row.tinhTp || row['Tỉnh'] || row['Tỉnh/TP'] || row.province || '').trim();
  const phuongXaRaw = (row.phuongXa || row['Phường/Xã'] || row.ward || '').trim();
  const quanHuyenRaw = (row.quanHuyen || row['Quận/Huyện'] || row.district || '').trim();

  const parts = [rawAddress, phuongXaRaw, quanHuyenRaw, tinhRaw].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

function getDisplayAddress(row) {
  const isVN = isGuestVN(row);
  if (!isVN) {
    const val = row.thoiHanTamTru || row.thoiHanTamTruStr || row['Thời hạn tạm trú'] || '-';
    return { shortText: val, fullText: `Thời hạn tạm trú: ${val}` };
  }

  const loaiGiayToName = (row.loaiGiayTo || row['Loại giấy tờ'] || row['Tên giấy tờ'] || '').toLowerCase();
  if (loaiGiayToName.includes('hộ chiếu') || loaiGiayToName.includes('passport')) {
    return { shortText: '-', fullText: 'Khách hộ chiếu: địa chỉ để trống' };
  }

  const fullAddr = getCombinedAddress(row);
  if (!fullAddr) {
    return { shortText: '-', fullText: 'Chưa có địa chỉ' };
  }

  // Ưu tiên lấy trực tiếp tỉnh nếu có trường tỉnh riêng
  const tinhRaw = (row.tinhTp || row['Tỉnh'] || row['Tỉnh/TP'] || row.province || '').trim();
  if (tinhRaw) {
    return { shortText: tinhRaw, fullText: fullAddr };
  }

  // Nếu không có trường riêng, trích xuất phần tử cuối sau dấu phẩy của địa chỉ
  const parts = fullAddr.split(',').map(p => p.trim()).filter(Boolean);
  const shortText = parts.length > 0 ? parts[parts.length - 1] : fullAddr;
  return { shortText, fullText: fullAddr };
}

function renderTable() {
  const tbody = document.getElementById('dataTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allSelected = currentRows.length > 0 && selectedRowIndices.size === currentRows.length;
  const selectAllEl = document.getElementById('selectAllCheckbox');
  if (selectAllEl) selectAllEl.checked = allSelected;

  currentRows.forEach((row, idx) => {
    const valState = rowValidationStates[idx] || { isComplete: true, missingFields: [], fieldStatus: {} };
    const isComplete = valState.isComplete;
    const missing = valState.missingFields || [];
    const fStatus = valState.fieldStatus || {};
    const isEditing = editingRowIndices.has(idx);
    const isChecked = selectedRowIndices.has(idx);

    const isVN = (row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase() === 'VNM' || (row.quocTich || '').toLowerCase() === 'việt nam';
    const addrInfo = getDisplayAddress(row);

    // Field validity checks
    const isHoTenValid = fStatus.hoTen ? fStatus.hoTen.valid : !!(row.hoTen || row['Họ tên']);
    const isDobValid = fStatus.ngaySinh ? fStatus.ngaySinh.valid : !!(row.ngaySinh || row['Ngày sinh'] || row['D.O.B']);
    const isQuocTichValid = fStatus.quocTich ? fStatus.quocTich.valid : true;
    const quocTichError = fStatus.quocTich ? fStatus.quocTich.error : '';
    const isRoomValid = fStatus.soPhong ? fStatus.soPhong.valid : !!(row.soPhong || row['Số phòng']);
    const isDocValid = fStatus.soGiayTo ? fStatus.soGiayTo.valid : (fStatus.soHoChieu ? fStatus.soHoChieu.valid : true);
    const docError = fStatus.soGiayTo ? fStatus.soGiayTo.error : (fStatus.soHoChieu ? fStatus.soHoChieu.error : '');
    const isNgayDenValid = fStatus.ngayDen ? fStatus.ngayDen.valid : true;
    const ngayDenError = fStatus.ngayDen ? fStatus.ngayDen.error : '';
    const isNgayDiValid = fStatus.ngayDi ? fStatus.ngayDi.valid : true;

    const tr = document.createElement('tr');
    tr.className = `hover:bg-slate-100/80 transition ${!isComplete ? 'bg-rose-50/30' : ''} ${isChecked ? 'bg-indigo-50/30' : ''}`;
    tr.innerHTML = `
      <!-- Checkbox -->
      <td class="p-3 text-center">
        <input type="checkbox" onchange="toggleRowSelect(${idx}, this.checked)" ${isChecked ? 'checked' : ''} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer">
      </td>

      <td class="p-3 text-center font-mono text-slate-400">${idx + 1}</td>
      
      <!-- Họ tên (Required) -->
      <td class="p-3 font-medium text-slate-900">
        ${isEditing 
          ? `<input type="text" value="${row.hoTen || row['Họ tên'] || ''}" onchange="updateCell(${idx}, 'hoTen', this.value)" class="w-full rounded px-2 py-1 outline-none uppercase font-bold text-xs transition ${isHoTenValid ? 'bg-emerald-50/50 border border-emerald-400 text-slate-800 focus:ring-1 focus:ring-emerald-400' : 'bg-rose-50 border-2 border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-400'}">`
          : (isHoTenValid 
              ? `<span class="uppercase font-bold text-slate-800">${row.hoTen || row['Họ tên']}</span>`
              : `<span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-semibold px-2 py-0.5 rounded text-xs">Thiếu họ tên *</span>`
            )
        }
      </td>

      <!-- Ngày sinh (Required) -->
      <td class="p-3 font-mono">
        ${isEditing
          ? `<input type="text" value="${row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''}" onchange="updateCell(${idx}, 'ngaySinh', this.value)" placeholder="YYYY-MM-DD" class="w-24 rounded px-2 py-1 outline-none text-xs font-mono transition ${isDobValid ? 'bg-emerald-50/50 border border-emerald-400 text-slate-800 focus:ring-1 focus:ring-emerald-400' : 'bg-rose-50 border-2 border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-400'}">`
          : (isDobValid 
              ? `<span>${row.ngaySinh || row['D.O.B'] || row['Ngày sinh']}</span>`
              : `<span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-2 py-0.5 rounded text-xs">Thiếu ngày sinh *</span>`
            )
        }
      </td>

      <!-- Giới tính -->
      <td class="p-3">
        ${isEditing
          ? `<select onchange="updateCell(${idx}, 'gioiTinh', this.value)" class="bg-emerald-50/50 border border-emerald-400 rounded px-2 py-1 outline-none text-xs font-medium">
              <option value="Nam" ${(row.gioiTinh || row['Giới tính']) === 'Nam' || (row.gioiTinh || row['Giới tính']) === 'M' ? 'selected' : ''}>Nam</option>
              <option value="Nữ" ${(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'selected' : ''}>Nữ</option>
            </select>`
          : `<span class="px-2 py-0.5 rounded bg-slate-200/80 font-semibold text-slate-700 text-xs">${(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'Nữ' : 'Nam'}</span>`
        }
      </td>

      <!-- Quốc tịch -->
      <td class="p-3">
        ${isEditing
          ? `<input type="text" value="${row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM'}" onchange="updateCell(${idx}, 'quocTich', this.value)" class="w-20 rounded px-1.5 py-1 outline-none uppercase font-bold text-xs transition ${isQuocTichValid ? 'bg-emerald-50/50 border border-emerald-400 text-slate-800' : 'bg-rose-50 border-2 border-rose-400 text-rose-900'}" title="${isQuocTichValid ? 'Hợp lệ' : quocTichError}">`
          : (isQuocTichValid
              ? `<span class="font-bold text-slate-700 text-xs">${(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase()}</span>`
              : `<span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-bold px-1.5 py-0.5 rounded text-xs cursor-help" title="${quocTichError || 'Sai mã quốc tịch'}">${(row.quocTich || row['Quốc tịch'] || 'LỖI').toUpperCase()} <i class="fa-solid fa-circle-exclamation"></i></span>`
            )
        }
      </td>

      <!-- Loại giấy tờ -->
      <td class="p-3">
        ${isEditing
          ? `<select onchange="updateCell(${idx}, 'loaiGiayTo', this.value)" class="bg-emerald-50/50 border border-emerald-400 rounded px-1.5 py-1 outline-none text-xs max-w-[130px]">
              <option value="Thẻ CCCD" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Thẻ CCCD' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'CCCD' ? 'selected' : ''}>Thẻ CCCD (1)</option>
              <option value="Thẻ CMND" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Thẻ CMND' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'CMND' ? 'selected' : ''}>Thẻ CMND (2)</option>
              <option value="Giấy phép lái xe" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Giấy phép lái xe' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'GPLX' ? 'selected' : ''}>GPLX (3)</option>
              <option value="Hộ chiếu" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Hộ chiếu' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'Passport' ? 'selected' : ''}>Hộ chiếu (4)</option>
              <option value="Thẻ Căn Cước" ${(row.loaiGiayTo || row['Loại giấy tờ']) === 'Thẻ Căn Cước' || (row.loaiGiayTo || row['Loại giấy tờ']) === 'Căn cước' ? 'selected' : ''}>Thẻ Căn Cước (8)</option>
            </select>`
          : `<span class="text-slate-700 text-xs">${row.loaiGiayTo || row['Loại giấy tờ'] || 'Thẻ CCCD (1)'}</span>`
        }
      </td>

      <!-- Số giấy tờ -->
      <td class="p-3 font-mono font-bold text-indigo-700">
        ${isEditing
          ? `<input type="text" value="${row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu'] || ''}" onchange="updateCell(${idx}, 'soGiayTo', this.value)" placeholder="Số giấy tờ" class="w-28 rounded px-2 py-1 outline-none font-bold font-mono text-xs transition ${isDocValid ? 'bg-emerald-50/50 border border-emerald-400 text-indigo-700 focus:ring-1 focus:ring-emerald-400' : 'bg-rose-50 border-2 border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-400'}" title="${isDocValid ? 'Hợp lệ' : docError}">`
          : (isDocValid 
              ? `<span>${row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu']}</span>`
              : `<span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-mono font-bold px-2 py-0.5 rounded text-xs cursor-help" title="${docError || 'Sai số giấy tờ'}">${row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu'] || 'Thiếu số *'}</span>`
            )
        }
      </td>

      <!-- Phòng -->
      <td class="p-3 text-center">
        ${isEditing
          ? `<select onchange="updateCell(${idx}, 'soPhong', this.value)" class="rounded px-2 py-1 outline-none text-xs font-semibold transition text-center ${isRoomValid ? 'bg-emerald-50/50 border border-emerald-400 text-slate-800' : 'bg-rose-50 border-2 border-rose-400 text-rose-900'}">
              <option value="">--</option>
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                <option value="${num}" ${cleanRoomNumber(row.soPhong || row['Số phòng']) === String(num) ? 'selected' : ''}>${num}</option>
              `).join('')}
            </select>`
          : (isRoomValid 
              ? `<span class="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded text-xs">${cleanRoomNumber(row.soPhong || row['Số phòng'])}</span>`
              : `<span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded text-xs cursor-help" title="Thiếu hoặc sai số phòng">Thiếu</span>`
            )
        }
      </td>

      <!-- Ngày đến / đi (Required) -->
      <td class="p-3 text-[11px] text-slate-500">
        ${isEditing
          ? `<div class="space-y-1">
              <input type="text" value="${row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || ''}" onchange="updateCell(${idx}, 'ngayDen', this.value)" placeholder="Đến (hôm nay/qua)" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition ${isNgayDenValid ? 'bg-emerald-50/50 border border-emerald-400 text-slate-800 focus:ring-1 focus:ring-emerald-400' : 'bg-rose-50 border-2 border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-400'}" title="${isNgayDenValid ? 'Hợp lệ' : ngayDenError}">
              <input type="text" value="${row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || ''}" onchange="updateCell(${idx}, 'ngayDi', this.value)" placeholder="Đi" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition ${isNgayDiValid ? 'bg-emerald-50/50 border border-emerald-400 text-slate-800 focus:ring-1 focus:ring-emerald-400' : 'bg-rose-50 border-2 border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-400'}">
            </div>`
          : `<div class="space-y-0.5">
              ${isNgayDenValid 
                ? `<div>Đến: <strong>${row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || 'N/A'}</strong></div>`
                : `<div class="bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 rounded cursor-help font-semibold text-[10px]" title="${ngayDenError}">Đến: ${row.ngayDen || 'Thiếu'} <i class="fa-solid fa-triangle-exclamation"></i></div>`
              }
              <div>Đi: <strong>${row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || 'N/A'}</strong></div>
            </div>`
        }
      </td>

      <!-- Địa chỉ (Hiển thị Tỉnh gọn gàng, Hover hiển thị đầy đủ tooltip; Khi Edit hiển thị ô nhập) -->
      <td class="p-3 text-slate-700 text-[11px] max-w-[150px]">
        ${isEditing
          ? `<input type="text" value="${row.diaChi || row['Địa chỉ'] || row['Địa chỉ chi tiết'] || ''}" onchange="updateCell(${idx}, 'diaChi', this.value)" placeholder="Địa chỉ / Tỉnh" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] bg-emerald-50/50 border border-emerald-400 text-slate-800 focus:ring-1 focus:ring-emerald-400">`
          : `<span class="cursor-help hover:text-indigo-600 transition underline decoration-dotted decoration-slate-400 font-medium truncate inline-block max-w-[130px]" title="${addrInfo.fullText}">
              ${addrInfo.shortText}
            </span>`
        }
      </td>

      <!-- Thao tác: Edit/Save + Push + Delete -->
      <td class="p-3 text-center whitespace-nowrap">
        <div class="inline-flex items-center gap-1">
          ${isEditing 
            ? `<button onclick="toggleEditRow(${idx})" class="text-emerald-600 hover:text-emerald-800 p-1.5 rounded hover:bg-emerald-50 transition" title="Lưu chỉnh sửa & cập nhật Sheet">
                <i class="fa-solid fa-floppy-disk"></i>
               </button>`
            : `<button onclick="toggleEditRow(${idx})" class="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50 transition" title="Chỉnh sửa dòng">
                <i class="fa-solid fa-pen-to-square"></i>
               </button>`
          }
          <button onclick="pushSingleRow(${idx})" class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Đăng ký riêng dòng này">
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
  if (badge) {
    badge.textContent = selectedRowIndices.size > 0 ? selectedRowIndices.size : 'Tất cả';
  }
}

function toggleEditRow(idx) {
  if (editingRowIndices.has(idx)) {
    // 1. Phản hồi giao diện tức thì (0ms latency, không để người dùng phải chờ)
    editingRowIndices.delete(idx);
    renderTable();
    updatePayloadPreview();

    // 2. Hiển thị thông báo tức thì
    showCopyToast('LƯU', `Đang lưu dòng ${idx + 1} lên Google Sheet...`);

    // 3. Đồng bộ bất đồng bộ với Google Sheet Webhook trong nền
    const sheetId = (document.getElementById('sheetIdInput') ? document.getElementById('sheetIdInput').value : '16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q').trim();
    const select = document.getElementById('sheetTabSelect');
    const gid = select ? select.value : '0';
    const selectedTab = availableTabs.find(t => String(t.gid) === String(gid));
    const sheetName = selectedTab ? selectedTab.name : '';

    fetch('/api/sheets/update-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: idx, row: currentRows[idx], sheetId, gid, sheetName }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showCopyToast('OK', `Đã cập nhật dòng ${idx + 1} lên Google Sheet!`);
        } else if (data.notConfigured) {
          console.info('[GoogleSheetService]', data.message, data.guide);
          showCopyToast('LƯU', `Đã lưu dòng ${idx + 1} vào hệ thống.`);
        } else {
          console.warn('[GoogleSheetService]', data.message);
          showCopyToast('CẢNH BÁO', `Lỗi cập nhật Sheet: ${data.message}`);
        }
      })
      .catch(err => {
        console.warn('Lỗi ghi nhận dòng:', err);
        showCopyToast('LỖI', `Lỗi mạng khi cập nhật Sheet: ${err.message}`);
      });
  } else {
    editingRowIndices.add(idx);
    renderTable();
  }
}

function updateCell(idx, field, value) {
  if (currentRows[idx]) {
    currentRows[idx][field] = value;
    // Đồng bộ toàn bộ alias cột Google Sheet để đảm bảo ghi ngược lại chính xác
    if (field === 'soPhong') {
      currentRows[idx]['Số phòng'] = value;
      currentRows[idx]['soPhong'] = value;
    } else if (field === 'hoTen') {
      currentRows[idx]['Họ tên'] = value;
      currentRows[idx]['hoTen'] = value;
    } else if (field === 'ngaySinh') {
      currentRows[idx]['Ngày sinh'] = value;
      currentRows[idx]['D.O.B'] = value;
      currentRows[idx]['ngaySinh'] = value;
    } else if (field === 'gioiTinh') {
      currentRows[idx]['Giới tính'] = value;
      currentRows[idx]['gioiTinh'] = value;
    } else if (field === 'quocTich') {
      currentRows[idx]['Quốc tịch'] = value;
      currentRows[idx]['Quốc gia'] = value;
      currentRows[idx]['quocTich'] = value;
    } else if (field === 'loaiGiayTo') {
      currentRows[idx]['Loại giấy tờ'] = value;
      currentRows[idx]['loaiGiayTo'] = value;
    } else if (field === 'soGiayTo') {
      currentRows[idx]['Số giấy tờ'] = value;
      currentRows[idx]['Số CCCD'] = value;
      currentRows[idx]['Số hộ chiếu'] = value;
      currentRows[idx]['soGiayTo'] = value;
      currentRows[idx].soHoChieu = value;
    } else if (field === 'ngayDen') {
      currentRows[idx]['Ngày đến'] = value;
      currentRows[idx]['(từ ngày)'] = value;
      currentRows[idx]['ngayDen'] = value;
    } else if (field === 'ngayDi') {
      currentRows[idx]['Ngày đi'] = value;
      currentRows[idx]['(đến ngày)'] = value;
      currentRows[idx]['ngayDi'] = value;
    } else if (field === 'diaChi') {
      currentRows[idx]['Địa chỉ'] = value;
      currentRows[idx]['Địa chỉ chi tiết'] = value;
      currentRows[idx]['diaChi'] = value;
    }
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
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const next2Days = new Date(now);
  next2Days.setDate(next2Days.getDate() + 2);
  const next2DaysStr = `${next2Days.getFullYear()}-${pad(next2Days.getMonth() + 1)}-${pad(next2Days.getDate())}`;

  const newIdx = currentRows.length;
  currentRows.push({
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
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
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
      'Ảnh mặt trước': '',
      'Ảnh mặt sau': '',
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
      'Ảnh hộ chiếu': '',
    }
  ];
  selectedRowIndices = new Set(); // Mặc định select none
  editingRowIndices.clear();
  const sourceLabel = document.getElementById('currentSourceLabel');
  if (sourceLabel) sourceLabel.textContent = 'Đang hiển thị dữ liệu mẫu chuẩn v1.4';
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

    const vnJsonEl = document.getElementById('vnPayloadJson');
    if (vnJsonEl) vnJsonEl.textContent = JSON.stringify(vnPayloads, null, 2);
    const foreignJsonEl = document.getElementById('foreignPayloadJson');
    if (foreignJsonEl) foreignJsonEl.textContent = JSON.stringify(foreignPayloads, null, 2);

    const vnBadgeEl = document.getElementById('vnCountBadge');
    if (vnBadgeEl) vnBadgeEl.textContent = `${vnPayloads.length} bản ghi`;
    const foreignBadgeEl = document.getElementById('foreignCountBadge');
    if (foreignBadgeEl) foreignBadgeEl.textContent = `${foreignPayloads.length} bản ghi`;

    rowValidationStates = (data.completenessList || []).map(item => item.completeness);
  } catch (err) {
    console.error('Error previewing payloads:', err);
  }
}

async function handleRegisterClick() {
  if (currentRows.length === 0) {
    alert('Bảng dữ liệu đang trống!');
    return;
  }
  if (selectedRowIndices.size > 0) {
    const rowsToSubmit = Array.from(selectedRowIndices).map(i => currentRows[i]).filter(Boolean);
    await executeSyncBatch(rowsToSubmit, `Đăng ký ${rowsToSubmit.length} khách đã chọn`);
  } else {
    await executeSyncBatch(currentRows, `Đăng ký toàn bộ ${currentRows.length} khách`);
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

function normalizeStr(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCatalogs() {
  try {
    const res = await fetch('/api/catalogs');
    const data = await res.json();
    catalogData = data.catalogs || {};

    document.getElementById('catDot').className = 'w-2 h-2 rounded-full bg-emerald-400';
    document.getElementById('catCountText').textContent = 'Đã sẵn sàng';

    // Counts
    document.getElementById('tinhCount').textContent = `${data.tinhTpCount} tỉnh/tp`;
    document.getElementById('quocTichCount').textContent = `${data.quocTichCount} quốc gia`;

    renderCatalogList('tinh', catalogData.tinhTp || []);
    renderCatalogList('quocTich', catalogData.quocTich || []);

    const lgUl = document.getElementById('loaiGiayToList');
    lgUl.innerHTML = (catalogData.loaiGiayTo || []).map(lg => `
      <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
        <span class="font-medium text-slate-800">${lg.name}</span>
        <span class="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Mã API: ${lg.id}</span>
      </li>
    `).join('');

    const ldUl = document.getElementById('lyDoCuTruList');
    ldUl.innerHTML = (catalogData.lyDoCuTru || []).map(ld => `
      <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
        <span class="font-medium text-slate-800">${ld.name}</span>
        <span class="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Mã API: ${ld.id}</span>
      </li>
    `).join('');
  } catch (err) {
    document.getElementById('catDot').className = 'w-2 h-2 rounded-full bg-rose-400';
    document.getElementById('catCountText').textContent = 'Lỗi nạp';
  }
}

function renderCatalogList(type, list) {
  if (type === 'tinh') {
    const ul = document.getElementById('tinhList');
    if (!ul) return;
    ul.innerHTML = list.map(t => `
      <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
        <span class="font-semibold text-slate-800">${t.tenTT}</span>
        <span class="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">${t.maTT} (${t.maTTChu || ''})</span>
      </li>
    `).join('');
  } else if (type === 'quocTich') {
    const ul = document.getElementById('quocTichList');
    if (!ul) return;
    ul.innerHTML = list.map(q => `
      <li onclick="copyCountryCode('${q.maQT}', '${q.tenQT}')" class="py-1.5 px-2 flex items-center justify-between border-b border-slate-100 last:border-0 hover:bg-indigo-50/80 cursor-pointer rounded transition group" title="Bấm để copy mã: ${q.maQT}">
        <div class="flex items-center gap-1.5">
          <span class="font-semibold text-slate-800 group-hover:text-indigo-700 transition">${q.tenQT}</span>
          ${q.tenQTEn ? `<span class="text-slate-400 font-normal text-[11px]">(${q.tenQTEn})</span>` : ''}
        </div>
        <span class="font-mono text-indigo-600 font-bold bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded text-[11px] transition shadow-xs flex items-center gap-1">
          <i class="fa-regular fa-copy text-[10px] opacity-70"></i> ${q.maQT}
        </span>
      </li>
    `).join('');
  }
}

function copyCountryCode(code, countryName) {
  if (!code) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showCopyToast(code, countryName);
    }).catch(() => {
      fallbackCopyText(code, countryName);
    });
  } else {
    fallbackCopyText(code, countryName);
  }
}

function fallbackCopyText(text, countryName) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showCopyToast(text, countryName);
  } catch (err) {
    console.warn('Không thể copy:', err);
  }
  document.body.removeChild(textArea);
}

let toastTimeout = null;
function showCopyToast(code, countryName) {
  let toast = document.getElementById('copyToastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToastNotification';
    toast.className = 'fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 z-50 transition-all duration-300 transform translate-y-0 opacity-100';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span>Đã copy mã <strong>${code}</strong> (${countryName}) vào clipboard!</span>`;
  toast.classList.remove('hidden', 'opacity-0', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2200);
}

function filterCatalog(type) {
  if (type === 'tinh') {
    const rawQ = document.getElementById('filterTinh').value || '';
    const cleanQ = normalizeStr(rawQ);
    const tokens = cleanQ.split(' ').filter(Boolean);

    const filtered = (catalogData.tinhTp || []).filter(t => {
      const ten = normalizeStr(t.tenTT);
      const tenEn = normalizeStr(t.tenTTEn || '');
      const maChu = normalizeStr(t.maTTChu || '');
      const maTT = String(t.maTT || '');

      if (maTT.includes(cleanQ) || maChu.includes(cleanQ) || ten.includes(cleanQ) || tenEn.includes(cleanQ)) {
        return true;
      }
      return tokens.length > 0 && tokens.every(tok => ten.includes(tok) || tenEn.includes(tok) || maChu.includes(tok));
    });

    renderCatalogList('tinh', filtered);
  } else if (type === 'quocTich') {
    const rawQ = document.getElementById('filterQuocTich').value || '';
    const cleanQ = normalizeStr(rawQ);
    const tokens = cleanQ.split(' ').filter(Boolean);

    const filtered = (catalogData.quocTich || []).filter(q => {
      const ten = normalizeStr(q.tenQT);
      const tenEn = normalizeStr(q.tenQTEn || '');
      const ma = normalizeStr(q.maQT);

      if (ma.includes(cleanQ) || ten.includes(cleanQ) || tenEn.includes(cleanQ)) {
        return true;
      }
      return tokens.length > 0 && tokens.every(tok => ten.includes(tok) || tenEn.includes(tok) || ma.includes(tok));
    });

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
