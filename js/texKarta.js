/* ============================================
   ProfitPrint – Логика страницы Техкарта
   ============================================ */

// ---------- ТЕМА ----------
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');

function setTheme(mode) {
  body.className = mode;
  localStorage.setItem('theme', mode);
  if (themeIcon) themeIcon.textContent = mode === 'dark' ? '☀️' : '🌙';
  if (themeLabel) themeLabel.textContent = mode === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  setTheme(saved);
})();
themeToggle.addEventListener('click', () => {
  const next = body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(next);
});

// ---------- БИБЛИОТЕКИ ----------
const { jsPDF } = window.jspdf;
let currentOrder = null;

function getOrders() {
  return JSON.parse(localStorage.getItem('print_orders') || '[]');
}
function getOrderById(id) {
  return getOrders().find(o => o.id == id);
}
function updateOrder(order) {
  let orders = getOrders();
  const idx = orders.findIndex(o => o.id == order.id);
  if (idx !== -1) orders[idx] = order;
  else orders.push(order);
  localStorage.setItem('print_orders', JSON.stringify(orders));
  // Sync to server (best-effort)
  (async () => {
    try {
      await fetch(`/api/otpcex/${encodeURIComponent(String(order.id))}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
      // also save texkarta record if PDF present
      if (order.pdfData) {
        await fetch('/api/texkartas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: String(order.id), techcard_no: order.techcard_no, pdfData: order.pdfData, pdfSource: order.pdfSource || 'local', metadata: { orderId: order.id } }) });
      }
    } catch (e) { console.warn('Sync failed', e); }
  })();
}

// ---------- ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ (УСЛУГИ) ----------
function renderAdditionalInfo() {
  const container = document.getElementById('additionalInfo');
  if (!container) return;
  if (!currentOrder || !currentOrder.services || currentOrder.services.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">Нет выбранных услуг.</p>';
    return;
  }

  const labelMap = {
    vd_lak: 'ВД лак',
    lamination: 'Ламинация',
    cutting: 'Резка',
    embossing: 'Тиснение',
    gluing: 'Склейка',
    uv_lak: 'УФ лак',
    die_cut: 'Высечка'
  };

  let html = '';
  const cuttingServices = currentOrder.services.filter(s => s.name === 'cutting');
  if (cuttingServices.length > 0) {
    html += '<h3>Резка</h3><table class="services-detail-table"><thead><tr><th>Вариант</th><th>Длина</th><th>Ширина</th></tr></thead><tbody>';
    cuttingServices.forEach(s => {
      if (s.details) {
        s.details.forEach(d => {
          html += `<tr><td>${d.type}</td><td>${d.length || 0}</td><td>${d.width || 0}</td></tr>`;
        });
      } else {
        html += `<tr><td>${s.type}</td><td>${s.length || 0}</td><td>${s.width || 0}</td></tr>`;
      }
    });
    html += '</tbody></table>';
  }

  const otherServices = currentOrder.services.filter(s => s.name !== 'cutting');
  if (otherServices.length > 0) {
    if (html) html += '<br>';
    html += '<h3>Другие услуги</h3><table class="services-detail-table"><thead><tr><th>Услуга</th><th>Тип</th></tr></thead><tbody>';
    otherServices.forEach(s => {
      const name = labelMap[s.name] || s.name;
      html += `<tr><td>${name}</td><td>${s.type}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  container.innerHTML = html || '<p style="color: var(--text-secondary);">Нет выбранных услуг.</p>';
}

document.getElementById('toggleInfoBtn').addEventListener('click', function () {
  const infoDiv = document.getElementById('additionalInfo');
  infoDiv.classList.toggle('open');
  this.textContent = infoDiv.classList.contains('open') ? '🔽 Скрыть доп. информацию' : '📋 Дополнительная информация';
});

// ---------- ЗАГРУЗКА PDF (ЛОКАЛЬНО) ----------
document.getElementById('uploadLocalPdfBtn').addEventListener('click', () => document.getElementById('localPdfInput').click());
document.getElementById('localPdfInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file || file.type !== 'application/pdf') { alert('Только PDF!'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    if (!currentOrder) return;
    currentOrder.pdfData = ev.target.result;
    currentOrder.pdfSource = 'local';
    updateOrder(currentOrder);
    updateViewPdfButton();
    alert('PDF загружен.');
  };
  reader.readAsDataURL(file);
});

// ---------- ПРОСМОТР PDF ----------
function updateViewPdfButton() {
  const btn = document.getElementById('viewOfficePdfBtn');
  if (!btn) return;
  if (currentOrder && currentOrder.pdfData) {
    btn.style.display = 'inline-flex';
    btn.textContent = currentOrder.pdfSource === 'office' ? '👁️ Посмотреть PDF (офис)' : '👁️ Посмотреть PDF (локально)';
  } else btn.style.display = 'none';
}
document.getElementById('viewOfficePdfBtn').addEventListener('click', () => {
  if (!currentOrder || !currentOrder.pdfData) return;
  const byteStr = atob(currentOrder.pdfData.split(',')[1]);
  const arr = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
  window.open(URL.createObjectURL(new Blob([arr], { type: 'application/pdf' })), '_blank');
});

// ========== СКАЧАТЬ PDF ТЕХКАРТЫ (КАРТИНКОЙ) ==========
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
  const element = document.getElementById('content');
  const actionBar = document.getElementById('actionBar');
  const toggleInfoBtn = document.getElementById('toggleInfoBtn');
  const additionalInfo = document.getElementById('additionalInfo');

  // Скрываем кнопки и раскрываем доп. информацию, если она была скрыта
  if (actionBar) actionBar.style.display = 'none';
  if (toggleInfoBtn) toggleInfoBtn.style.display = 'none';
  const wasInfoOpen = additionalInfo.classList.contains('open');
  additionalInfo.classList.add('open');   // показываем услуги на скриншоте

  // Убираем тёмную тему на время скриншота (чтобы PDF был светлым)
  const currentTheme = body.className;
  if (currentTheme === 'dark') {
    body.className = 'light';
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Техкарта_${currentOrder?.techcard_no || 'order'}.pdf`);
  } finally {
    // Возвращаем исходное состояние интерфейса
    if (actionBar) actionBar.style.display = '';
    if (toggleInfoBtn) toggleInfoBtn.style.display = '';
    if (!wasInfoOpen) additionalInfo.classList.remove('open');
    body.className = currentTheme;
  }
});

// ---------- ОТОБРАЖЕНИЕ СПИСКА ЗАКАЗОВ ----------
function renderOrderList() {
  const orders = getOrders();
  const container = document.getElementById('content');
  if (orders.length === 0) {
    container.innerHTML = '<p>Нет созданных заказов.</p>';
    document.getElementById('actionBar').style.display = 'none';
    return;
  }
  let html = `
    <table class="data-table">
      <thead><tr><th>Техкарта №</th><th>Заказчик</th><th>Продукция</th><th>Менеджер</th><th>Дата</th></tr></thead>
      <tbody>`;
  orders.forEach(order => {
    html += `<tr style="cursor:pointer;" onclick="window.location.href='texKarta.html?id=${order.id}'">
      <td>${order.techcard_no}</td><td>${order.customer}</td><td>${order.product_name}</td>
      <td>${order.manager}</td><td>${new Date(order.id).toLocaleString('ru-RU')}</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  document.getElementById('actionBar').style.display = 'none';
  document.getElementById('additionalInfo').classList.remove('open');
}

// ---------- КОНКРЕТНАЯ ТЕХКАРТА ----------
function renderTechCard(order) {
  currentOrder = order;
  const contentDiv = document.getElementById('content');
  if (!order) {
    contentDiv.innerHTML = '<p style="color:var(--accent-red);">Заказ не найден.</p>';
    document.getElementById('actionBar').style.display = 'none';
    return;
  }
  document.getElementById('actionBar').style.display = 'flex';

  const serviceMap = {};
  order.services.forEach(s => { if (s.name !== 'cutting') serviceMap[s.name] = s.type; });
  const totalSheets = order.order_qty + order.stripes + order.make_ready;

  let html = `
    <div class="info-grid">
      <div><div class="info-label">Техкарта №</div><div class="info-value">${order.techcard_no}</div></div>
      <div><div class="info-label">Менеджер</div><div class="info-value">${order.manager}</div></div>
      <div><div class="info-label">Заказчик</div><div class="info-value">${order.customer}</div></div>
      <div><div class="info-label">Продукция</div><div class="info-value">${order.product_name}</div></div>
      <div><div class="info-label">Кол-во заказ</div><div class="info-value">${order.order_qty}</div></div>
      <div><div class="info-label">Цвет</div><div class="info-value">${order.color}</div></div>
    </div>`;
  if (order.description) html += `<p style="margin-bottom:16px;"><span class="info-label">Описание</span><br>${order.description}</p>`;

  if (order.media_type === 'roll') {
    html += `
      <table class="data-table">
        <thead><tr><th>Материал</th><th>Формат рулона</th><th>Размер листа (Д)</th><th>Размер листа (Ш)</th><th>гр/м²</th><th>Тираж листов</th></tr></thead>
        <tbody><tr>
          <td>${order.paper_type}</td><td>${order.roll_format || ''}</td><td>${order.size_length}</td><td>${order.size_width}</td><td>${order.gsm}</td><td><strong>${totalSheets}</strong></td>
        </tr></tbody>
      </table>`;
  } else {
    const vdLak = serviceMap['vd_lak'] || '';
    html += `
      <table class="data-table">
        <thead><tr>
          <th>Материал</th><th>Размер листа (Д)</th><th>Размер листа (Ш)</th><th>гр/м²</th><th>Приладка</th><th>Тираж</th>
          ${vdLak ? '<th>ВД лак</th>' : ''}
          <th>Брак</th><th>Факт печат</th>
        </tr></thead>
        <tbody><tr>
          <td>${order.paper_type}</td><td>${order.size_length}</td><td>${order.size_width}</td><td>${order.gsm}</td><td>${order.make_ready}</td><td><strong>${totalSheets}</strong></td>
          ${vdLak ? `<td>${vdLak}</td>` : ''}
          <td></td><td></td>
        </tr></tbody>
      </table>`;
  }
  contentDiv.innerHTML = html;
  renderAdditionalInfo();
  updateViewPdfButton();
  document.getElementById('additionalInfo').classList.remove('open');
  document.getElementById('toggleInfoBtn').textContent = '📋 Дополнительная информация';
}

// ---------- ЗАГРУЗКА ----------
window.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) {
    (async () => {
      let order = null;
      try {
        const resp = await fetch(`/api/otpcex/${encodeURIComponent(String(id))}`);
        if (resp.ok) order = await resp.json();
      } catch (e) { /* ignore */ }
      if (!order) order = getOrderById(id);
      renderTechCard(order);
    })();
  } else {
    renderOrderList();
  }
});