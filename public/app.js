let currentRows = [];
let catalogData = {};
let availableTabs = [];

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
    eventSource.onerror = () => {
      // Reconnect automatically
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

      // Tự động kéo dữ liệu tab mặc định
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
      renderTable();
      updatePayloadPreview();

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

function renderTable() {
  const tbody = document.getElementById('dataTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  currentRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="p-3 text-center font-mono text-slate-400">${idx + 1}</td>
      <td class="p-3 font-medium text-slate-900">
        <input type="text" value="${row.hoTen || row['Họ tên'] || ''}" onchange="updateCell(${idx}, 'hoTen', this.value)" class="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none">
      </td>
      <td class="p-3 font-mono">
        <input type="text" value="${row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''}" onchange="updateCell(${idx}, 'ngaySinh', this.value)" class="w-24 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none">
      </td>
      <td class="p-3">
        <select onchange="updateCell(${idx}, 'gioiTinh', this.value)" class="bg-transparent border border-slate-200 rounded px-1 py-0.5 outline-none text-xs">
          <option value="Nam" ${(row.gioiTinh || row['Giới tính']) === 'Nam' || (row.gioiTinh || row['Giới tính']) === 'M' ? 'selected' : ''}>Nam</option>
          <option value="Nữ" ${(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'selected' : ''}>Nữ</option>
        </select>
      </td>
      <td class="p-3">
        <input type="text" value="${row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || ''}" onchange="updateCell(${idx}, 'quocTich', this.value)" class="w-24 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none">
      </td>
      <td class="p-3">
        <input type="text" value="${row.loaiGiayTo || row['Loại giấy tờ'] || row['Tên giấy tờ'] || ''}" onchange="updateCell(${idx}, 'loaiGiayTo', this.value)" class="w-24 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none">
      </td>
      <td class="p-3 font-mono">
        <input type="text" value="${row.soGiayTo || row['Số giấy tờ'] || ''}" onchange="updateCell(${idx}, 'soGiayTo', this.value)" class="w-28 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none font-bold text-indigo-700">
      </td>
      <td class="p-3">
        <input type="text" value="${row.soPhong || row['Số phòng'] || ''}" onchange="updateCell(${idx}, 'soPhong', this.value)" class="w-16 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none">
      </td>
      <td class="p-3 text-[11px] text-slate-500">
        <div>Đến: ${row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || 'N/A'}</div>
        <div>Đi: ${row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || 'N/A'}</div>
      </td>
      <td class="p-3 text-slate-500 truncate max-w-xs" title="${row.diaChi || row['Địa chỉ'] || ''}">
        ${row.diaChi || row['Địa chỉ'] || (row.tinhTp ? `${row.phuongXa || ''}, ${row.tinhTp}` : 'N/A')}
      </td>
      <td class="p-3 text-center">
        <button onclick="removeRow(${idx})" class="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition" title="Xóa dòng">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateCell(idx, field, value) {
  if (currentRows[idx]) {
    currentRows[idx][field] = value;
    updatePayloadPreview();
  }
}

function removeRow(idx) {
  currentRows.splice(idx, 1);
  renderTable();
  updatePayloadPreview();
}

function addNewRow() {
  currentRows.push({
    hoTen: 'NGUYỄN VĂN MỚI',
    ngaySinh: '1995-01-01',
    gioiTinh: 'Nam',
    quocTich: 'Việt Nam',
    loaiGiayTo: 'Thẻ CCCD',
    soGiayTo: '001095000999',
    soPhong: 'P.102',
    diaChi: 'Hà Nội',
    ngayDen: '2026-09-16 14:00:00',
    ngayDi: '2026-09-18 12:00:00',
  });
  renderTable();
  updatePayloadPreview();
}

function loadSampleData() {
  currentRows = [
    {
      'Họ tên': 'NGUYEN VAN A',
      'Giới tính': 'M',
      'Số điện thoại': '0987654321',
      'Ngày sinh': '1995-10-20',
      'Nơi cư trú': 'Thường trú',
      'Tỉnh/TP': 'Đắk Lắk',
      'Phường/Xã': 'Dliê Yang',
      'Địa chỉ chi tiết': 'Thôn 3, Dliê Yang, Ea H\'leo, Đắk Lắk',
      'Ngày đến': '2026-09-16 14:00:00',
      'Ngày đi': '2026-09-18 12:00:00',
      'Số phòng': 'P.102',
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
      'Ngày đến': '2026-09-16 14:00:00',
      'Ngày đi': '2026-09-20 12:00:00',
      'Thời hạn tạm trú': '2026-10-30 23:59:59',
      'Số phòng': 'P.09',
      'Loại giấy tờ': 'Hộ chiếu',
      'Ảnh hộ chiếu': '',
    }
  ];
  document.getElementById('currentSourceLabel').textContent = 'Đang hiển thị dữ liệu mẫu chuẩn v1.4';
  renderTable();
  updatePayloadPreview();
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
  } catch (err) {
    console.error('Error previewing payloads:', err);
  }
}

async function processAndSyncNow() {
  switchTab('syncTab');
  const resultsContainer = document.getElementById('syncResultsList');
  resultsContainer.innerHTML = `
    <div class="text-center py-6 text-indigo-600 font-medium animate-pulse text-xs">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
      <p>Đang thực thi chu trình đồng bộ lên hệ thống KBTT...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: currentRows }),
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

    document.getElementById('tinhCount').textContent = `${data.tinhTpCount} tỉnh/tp`;
    document.getElementById('quocTichCount').textContent = `${data.quocTichCount} quốc gia`;

    renderCatalogList('tinh', catalogData.tinhTp || []);
    renderCatalogList('quocTich', catalogData.quocTich || []);

    const lgUl = document.getElementById('loaiGiayToList');
    lgUl.innerHTML = (catalogData.loaiGiayTo || []).map(lg => `<li><span class="font-mono text-indigo-600 font-bold">${lg.id}</span> - ${lg.name}</li>`).join('');

    const ldUl = document.getElementById('lyDoCuTruList');
    ldUl.innerHTML = (catalogData.lyDoCuTru || []).map(ld => `<li><span class="font-mono text-indigo-600 font-bold">${ld.id}</span> - ${ld.name}</li>`).join('');
  } catch (err) {
    document.getElementById('catDot').className = 'w-2 h-2 rounded-full bg-rose-400';
    document.getElementById('catCountText').textContent = 'Lỗi nạp';
  }
}

function renderCatalogList(type, list) {
  if (type === 'tinh') {
    const ul = document.getElementById('tinhList');
    ul.innerHTML = list.map(t => `<li class="py-1"><span class="font-mono text-indigo-600 font-bold">${t.maTT}</span>: ${t.tenTT} (${t.maTTChu || ''})</li>`).join('');
  } else if (type === 'quocTich') {
    const ul = document.getElementById('quocTichList');
    ul.innerHTML = list.map(q => `<li class="py-1"><span class="font-mono text-indigo-600 font-bold">${q.maQT}</span>: ${q.tenQT} (${q.tenQTEn || ''})</li>`).join('');
  }
}

function filterCatalog(type) {
  if (type === 'tinh') {
    const q = (document.getElementById('filterTinh').value || '').toLowerCase();
    const filtered = (catalogData.tinhTp || []).filter(t => t.tenTT.toLowerCase().includes(q) || (t.maTTChu && t.maTTChu.toLowerCase().includes(q)) || t.maTT.includes(q));
    renderCatalogList('tinh', filtered);
  } else if (type === 'quocTich') {
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
