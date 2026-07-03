// ============================================
// ProfitPrint – Orders Module
// ============================================

let selectedOrderId = null;
const orderPrefix = "НФНФ-";
let lastOrderNumber = 0;
let sortColumn = 'date';
let sortDirection = 'desc';
let orderEvents = [];
let orderFiles = [];

document.addEventListener('DOMContentLoaded', async function() {
    await Storage.init();
    initDateFields();
    loadResponsiblesFilter();
    renderOrders();
    
    // Event delegation for orders table
    document.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        const dropdownId = e.target.dataset.dropdownId;
        
        if (action === 'toggle-order-status' && id) {
            e.stopPropagation();
            toggleOrderStatus(id);
        } else if (action === 'generate-order-pdf' && id) {
            e.stopPropagation();
            generateOrderPDF(id);
        } else if (action === 'edit-order' && id) {
            e.stopPropagation();
            editOrder(id);
        } else if (action === 'delete-order' && id) {
            e.stopPropagation();
            deleteOrder(id);
        } else if (action === 'create-invoice-from-order' && id) {
            e.stopPropagation();
            createInvoiceFromOrder(id);
        } else if (action === 'show-invoice-placeholder') {
            e.stopPropagation();
            alert('Счёт — в разработке');
        } else if (action === 'toggle-dropdown' && dropdownId) {
            e.stopPropagation();
            toggleDropdown(dropdownId);
        } else if (action === 'select-order') {
            const tr = e.target.closest('tr[data-order-id]');
            if (tr && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                selectedOrderId = tr.dataset.orderId;
                renderOrders();
            }
        }
    });
    
    document.getElementById('order-modal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    document.getElementById('order-number')?.removeAttribute('readonly');
});

function loadResponsiblesFilter() {
    const select = document.getElementById('filter-responsible');
    if (!select) return;
    select.innerHTML = '<option value="">Все</option>';
    const clients = Storage.getClients();
    const unique = new Set();
    clients.forEach(c => { if (c.contact) unique.add(c.contact); });
    unique.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function loadClientsToSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите контрагента —</option>';
    Storage.getClients().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

function loadProductsToSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">— Продукт —</option>';
    Storage.getProducts().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.sku} - ${p.name}`;
        opt.dataset.price = p.price;
        opt.dataset.unit = p.unit || 'шт';
        opt.dataset.ndsRate = p.ndsRate || 0;
        selectEl.appendChild(opt);
    });
}

function loadResponsiblesForOrder() {
    const select = document.getElementById('order-responsible');
    if (!select) return;
    select.innerHTML = '<option value="">Не назначен</option>';
    Storage.getClients().forEach(c => {
        if (c.contact) {
            const opt = document.createElement('option');
            opt.value = c.contact;
            opt.textContent = c.contact;
            select.appendChild(opt);
        }
    });
}

function generateNextNumber() {
    const orders = Storage.getOrders();
    let maxNum = 0;
    let fallbackNum = 0;
    
    // Экранирование спецсимволов для безопасного regex
    const escapedPrefix = orderPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    orders.forEach(o => {
        if (!o.number) return;
        fallbackNum++;
        const match = o.number.match(new RegExp(`^${escapedPrefix}(\\d+)$`));
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
    });
    lastOrderNumber = maxNum > 0 ? maxNum + 1 : Math.max(fallbackNum + 1, 1);
    return orderPrefix + String(lastOrderNumber).padStart(6, '0');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(c => c.classList.remove('active'));
    const tab = document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`);
    if (tab) tab.classList.add('active');
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('active');
}

function setFormEditable(editable) {
    const elements = document.querySelectorAll('#order-form input, #order-form select, #order-form textarea');
    elements.forEach(el => {
        if (el.id === 'order-number') return;
        if (el.id === 'order-date') return;
        el.readOnly = !editable;
        el.disabled = !editable;
    });
    document.getElementById('btn-post-close').style.display = editable ? '' : 'none';
    document.getElementById('btn-conduct').style.display = editable ? '' : 'none';
}

function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) menu.classList.toggle('show');
}
function toggleBasedOnMenu() { toggleDropdown('basedOnDropdown'); }
window.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
});

function openFilterPanel() {
    document.getElementById('filter-panel').style.display = 'block';
    loadFilterOptions();
    loadColumnToggles();
}

function loadFilterOptions() {
    const manufacturers = new Set();
    Storage.getOrders().forEach(o => { if (o.manufacturer) manufacturers.add(o.manufacturer); });
    const manSelect = document.getElementById('filter-manufacturer');
    manSelect.innerHTML = '<option value="">Все</option>';
    manufacturers.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        manSelect.appendChild(opt);
    });

    const responsibles = new Set();
    Storage.getOrders().forEach(o => { if (o.responsible) responsibles.add(o.responsible); });
    const respSelect = document.getElementById('filter-responsible');
    respSelect.innerHTML = '<option value="">Все</option>';
    responsibles.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        respSelect.appendChild(opt);
    });

    const orgs = new Set();
    Storage.getClients().forEach(c => { if (c.name) orgs.add(c.name); });
    const orgSelect = document.getElementById('filter-organization');
    orgSelect.innerHTML = '<option value="">Все</option>';
    orgs.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        orgSelect.appendChild(opt);
    });
}

function applyFilters() { renderOrders(); }

const allColumns = [
    { key: 'status', label: 'Статус' },
    { key: 'date', label: 'Дата' },
    { key: 'number', label: 'Номер' },
    { key: 'state', label: 'Состояние' },
    { key: 'client', label: 'Покупатель' },
    { key: 'sum', label: 'Сумма' },
    { key: 'shipmentDate', label: 'Дата отгрузки' },
    { key: 'operation', label: 'Операция' },
    { key: 'actions', label: 'Действия' }
];

function loadColumnToggles() {
    const container = document.getElementById('column-toggles');
    if (!container) return;
    const visibleColumns = JSON.parse(localStorage.getItem('pp_visible_columns') || '["status","date","number","state","client","sum","shipmentDate","operation","actions"]');
    container.innerHTML = allColumns.map(col => `
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <input type="checkbox" ${visibleColumns.includes(col.key) ? 'checked' : ''} onchange="toggleColumn('${col.key}', this.checked)">
            ${col.label}
        </label>
    `).join('');
}

function toggleColumn(key, visible) {
    let visibleColumns = JSON.parse(localStorage.getItem('pp_visible_columns') || '["status","date","number","state","client","sum","shipmentDate","operation","actions"]');
    if (visible) {
        if (!visibleColumns.includes(key)) visibleColumns.push(key);
    } else {
        visibleColumns = visibleColumns.filter(c => c !== key);
    }
    localStorage.setItem('pp_visible_columns', JSON.stringify(visibleColumns));
    renderOrders();
}

function getVisibleColumns() {
    return JSON.parse(localStorage.getItem('pp_visible_columns') || '["status","date","number","state","client","sum","shipmentDate","operation","actions"]');
}

function exportToExcel() {
    const orders = Storage.getOrders();
    const visibleColumns = getVisibleColumns();
    const headers = allColumns.filter(c => visibleColumns.includes(c.key)).map(c => c.label);
    let csv = headers.join('\t') + '\n';
    orders.forEach(o => {
        const client = Storage.getClient(o.clientId);
        const total = (o.items || []).reduce((s, i) => s + (i.total || i.cost || 0), 0);
        const row = [];
        if (visibleColumns.includes('status')) row.push(o.status || 'В работе');
        if (visibleColumns.includes('date')) row.push(formatDate(o.date));
        if (visibleColumns.includes('number')) row.push(o.number);
        if (visibleColumns.includes('state')) row.push(o.status || 'В работе');
        if (visibleColumns.includes('client')) row.push(client?.name || '');
        if (visibleColumns.includes('sum')) row.push(formatCurrency(total));
        if (visibleColumns.includes('shipmentDate')) row.push(formatDate(o.shipmentDate));
        if (visibleColumns.includes('operation')) row.push(o.operation || 'Заказ на продажу');
        if (visibleColumns.includes('actions')) row.push('');
        csv += row.join('\t') + '\n';
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'orders_export.csv';
    a.click();
}

function renderOrders() {
    let orders = Storage.getOrders();
    const search = (document.getElementById('order-search')?.value || '').toLowerCase();
    const startDate = document.getElementById('filter-start')?.value;
    const endDate = document.getElementById('filter-end')?.value;
    const statusFilter = document.getElementById('order-status-filter')?.value;
    const operationFilter = document.getElementById('filter-operation')?.value;
    const responsibleFilter = document.getElementById('filter-responsible')?.value;
    const periodStart = document.getElementById('filter-period-start')?.value;
    const periodEnd = document.getElementById('filter-period-end')?.value;
    const manufacturerFilter = document.getElementById('filter-manufacturer')?.value;
    const organizationFilter = document.getElementById('filter-organization')?.value;

    if (search) {
        orders = orders.filter(o => {
            const client = Storage.getClient(o.clientId);
            return o.number?.toLowerCase().includes(search) || (client?.name || '').toLowerCase().includes(search);
        });
    }
    if (startDate) orders = orders.filter(o => o.date >= startDate);
    if (endDate) orders = orders.filter(o => o.date <= endDate);
    if (statusFilter) orders = orders.filter(o => o.status === statusFilter);
    if (operationFilter) orders = orders.filter(o => o.operation === operationFilter);
    if (responsibleFilter) orders = orders.filter(o => o.responsible === responsibleFilter);
    if (periodStart) orders = orders.filter(o => o.date >= periodStart);
    if (periodEnd) orders = orders.filter(o => o.date <= periodEnd);
    if (manufacturerFilter) orders = orders.filter(o => o.manufacturer === manufacturerFilter);
    if (organizationFilter) {
        orders = orders.filter(o => {
            const client = Storage.getClient(o.clientId);
            return client?.name === organizationFilter;
        });
    }

    orders.sort((a, b) => {
        let valA, valB;
        if (sortColumn === 'sum') {
            valA = (a.items || []).reduce((s, i) => s + (i.total || i.cost || 0), 0);
            valB = (b.items || []).reduce((s, i) => s + (i.total || i.cost || 0), 0);
        } else {
            valA = a[sortColumn] || '';
            valB = b[sortColumn] || '';
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const visibleColumns = getVisibleColumns();
    const thead = document.getElementById('orders-table-head');
    if (thead) {
        const headerMap = {
            status: 'Статус', date: 'Дата', number: 'Номер', state: 'Состояние',
            client: 'Покупатель', sum: 'Сумма', shipmentDate: 'Дата отгрузки',
            operation: 'Операция', actions: 'Действия'
        };
        thead.innerHTML = '<tr>' + visibleColumns.map(key => `<th>${headerMap[key]}</th>`).join('') + '</tr>';
    }

    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => {
        const client = Storage.getClient(o.clientId);
        const total = (o.items || []).reduce((s, i) => s + (i.total || i.cost || 0), 0);
        let statusClass = 'status-work';
        if (o.status === 'Проведён') statusClass = 'status-posted';
        else if (o.status === 'Завершён') statusClass = 'status-closed';
        const cells = [];
        if (visibleColumns.includes('status')) cells.push(`<td><span class="status-dot ${statusClass}" data-action="toggle-order-status" data-id="${escapeHtml(o.id)}"></span></td>`);
        if (visibleColumns.includes('date')) cells.push(`<td>${formatDate(o.date)}</td>`);
        if (visibleColumns.includes('number')) cells.push(`<td><strong>${escapeHtml(o.number)}</strong></td>`);
        if (visibleColumns.includes('state')) cells.push(`<td>${escapeHtml(o.status || 'В работе')}</td>`);
        if (visibleColumns.includes('client')) cells.push(`<td>${escapeHtml(client?.name || '')}</td>`);
        if (visibleColumns.includes('sum')) cells.push(`<td>${formatCurrency(total)}</td>`);
        if (visibleColumns.includes('shipmentDate')) cells.push(`<td>${formatDate(o.shipmentDate)}</td>`);
        if (visibleColumns.includes('operation')) cells.push(`<td>${escapeHtml(o.operation || 'Заказ на продажу')}</td>`);
        if (visibleColumns.includes('actions')) cells.push(`<td style="white-space:nowrap;">
            <div class="dropdown">
                <button class="btn btn-sm" data-action="toggle-dropdown" data-dropdown-id="rowBasedOn_${escapeHtml(o.id)}">📄▾</button>
                <div id="rowBasedOn_${escapeHtml(o.id)}" class="dropdown-menu" style="right:0; left:auto;">
                    <a data-action="create-invoice-from-order" data-id="${escapeHtml(o.id)}">📦 Накладная</a>
                    <a data-action="show-invoice-placeholder">🧾 Счёт</a>
                </div>
            </div>
            <button class="btn btn-sm" data-action="generate-order-pdf" data-id="${escapeHtml(o.id)}">📄</button>
            <button class="btn btn-sm" data-action="edit-order" data-id="${escapeHtml(o.id)}">✏️</button>
            <button class="btn btn-sm btn-danger" data-action="delete-order" data-id="${escapeHtml(o.id)}">🗑️</button>
        </td>`);
        return `<tr class="${selectedOrderId === o.id ? 'selected-row' : ''}" data-order-id="${escapeHtml(o.id)}" data-action="select-order">${cells.join('')}</tr>`;
    }).join('');
}


function selectOrder(id) { selectedOrderId = id; renderOrders(); }

function toggleOrderStatus(id) {
    const order = Storage.getOrder(id);
    if (!order) return;
    if (order.status === 'Проведён' || order.status === 'Завершён') {
        alert('Нельзя изменить статус проведённого или закрытого заказа.');
        return;
    }
    order.status = order.status === 'В работе' ? 'Проведён' : 'В работе';
    Storage.saveOrder(order);
    renderOrders();
}

function deleteOrder(id) {
    if (confirm('Переместить заказ в корзину?')) {
        Storage.deleteOrder(id);
        if (selectedOrderId === id) selectedOrderId = null;
        renderOrders();
    }
}

function deleteCurrentOrder() {
    const id = document.getElementById('order-id')?.value;
    if (id) {
        if (confirm('Удалить текущий заказ?')) {
            Storage.deleteOrder(id);
            closeModal();
            renderOrders();
        }
    } else alert('Заказ ещё не сохранён.');
}

function showOrderDetail(orderId) {
    const order = Storage.getOrder(orderId);
    if (!order) return;
    const client = Storage.getClient(order.clientId);
    const total = (order.items || []).reduce((s, i) => s + (i.total || i.cost || 0), 0);
    let html = `<div style="padding:20px;"><h3>Заказ №${escapeHtml(order.number)}</h3>`;
    html += `<p><b>Дата:</b> ${formatDate(order.date)} | <b>Старт:</b> ${formatDate(order.startDate)} | <b>Финиш:</b> ${formatDate(order.finishDate)}</p>`;
    html += `<p><b>Договор:</b> ${escapeHtml(order.contract || 'Основной договор')} | <b>Изготовитель:</b> ${escapeHtml(order.manufacturer || 'Производство')}</p>`;
    html += `<p><b>Ответственный:</b> ${escapeHtml(order.responsible || 'Не назначен')}</p>`;
    html += `<p><b>Покупатель:</b> ${escapeHtml(client?.name || '')} (${escapeHtml(client?.contact || '')})</p>`;
    html += `<p><b>Операция:</b> ${escapeHtml(order.operation || 'Заказ на продажу')} | <b>Статус:</b> ${escapeHtml(order.status || 'В работе')}</p>`;
    html += `<h4>Товары (${order.items?.length || 0})</h4>`;
    html += `<table style="width:100%;border-collapse:collapse;margin-top:10px;"><thead><tr style="background:#003087;color:#fff;"><th>№</th><th>Номенклатура</th><th>Характеристика</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th><th>НДС</th><th>Всего</th></tr></thead><tbody>`;
    (order.items || []).forEach((item, i) => {
        html += `<tr style="border-bottom:1px solid #e2e8f0;">
            <td>${i+1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.characteristic || '')}</td>
            <td>${item.quantity || 0}</td><td>${escapeHtml(item.unit || '')}</td><td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency((item.price || 0) * (item.quantity || 0))}</td><td>${formatCurrency(item.ndsAmount || 0)}</td>
            <td>${formatCurrency(item.total || item.cost || 0)}</td>
        </tr>`;
    });
    html += `</tbody></table><p style="margin-top:12px;"><strong>Итого:</strong> ${formatCurrency(total)}</p>`;
    if (order.comment) html += `<p><b>Комментарий:</b> ${escapeHtml(order.comment)}</p>`;
    html += `</div>`;
    document.getElementById('detail-title').textContent = `Заказ №${order.number}`;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() { document.getElementById('detail-modal')?.classList.remove('show'); }

function addOrderItem(productData = null) {
    const tbody = document.getElementById('order-items-body');
    if (!tbody) return;
    const row = document.createElement('tr');
    const idx = tbody.children.length + 1;
    const price = productData ? productData.price : 0;
    const ndsRate = productData ? (productData.ndsRate || 0) : 0;
    const quantity = productData ? (productData.quantity || 1) : 1;
    const unit = productData ? productData.unit || 'шт' : 'шт';
    const sum = price * quantity;
    const ndsAmount = sum * ndsRate / 100;
    const total = sum + ndsAmount;
    row.innerHTML = `
        <td>${idx}</td>
        <td><select class="product-select" onchange="onProductChange(this)">
            <option value="">— Продукт —</option>
        </select></td>
        <td><input type="text" class="item-char" placeholder="Хар-ка"></td>
        <td><input type="number" class="item-qty" value="${quantity}" min="0" onchange="recalcRow(this)"></td>
        <td><input type="text" class="item-unit" value="${unit}"></td>
        <td><input type="number" class="item-price" value="${price}" min="0" onchange="recalcRow(this)"></td>
        <td><span class="item-sum val">${formatCurrency(sum)}</span></td>
        <td><input type="number" class="item-nds-rate" value="${ndsRate}" min="0" max="100" onchange="recalcRow(this)"></td>
        <td><span class="item-nds-amount val">${formatCurrency(ndsAmount)}</span></td>
        <td><span class="item-total val">${formatCurrency(total)}</span></td>
        <td><input type="text" class="item-spec" placeholder="Спецификация"></td>
        <td><input type="checkbox" class="item-cancelled" onchange="recalcRow(this)"></td>
        <td><input type="text" class="item-cancel-reason" placeholder="Причина"></td>
    `;
    tbody.appendChild(row);
    loadProductsToSelect(row.querySelector('.product-select'));
    if (productData && productData.id) row.querySelector('.product-select').value = productData.id;
    recalcRow(row.querySelector('.item-qty'));
}

function onProductChange(selectEl) {
    const row = selectEl.closest('tr');
    const option = selectEl.options[selectEl.selectedIndex];
    if (option && option.dataset.price) {
        row.querySelector('.item-price').value = option.dataset.price;
        row.querySelector('.item-unit').value = option.dataset.unit || 'шт';
        row.querySelector('.item-nds-rate').value = option.dataset.ndsRate || 0;
    }
    recalcRow(row.querySelector('.item-price'));
}

function recalcRow(input) {
    const row = input.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    const ndsRate = parseFloat(row.querySelector('.item-nds-rate')?.value) || 0;
    const cancelled = row.querySelector('.item-cancelled')?.checked || false;
    if (cancelled) {
        row.querySelector('.item-sum').textContent = '0 UZS';
        row.querySelector('.item-nds-amount').textContent = '0 UZS';
        row.querySelector('.item-total').textContent = '0 UZS';
    } else {
        const sum = qty * price;
        const ndsAmount = sum * ndsRate / 100;
        const total = sum + ndsAmount;
        row.querySelector('.item-sum').textContent = formatCurrency(sum);
        row.querySelector('.item-nds-amount').textContent = formatCurrency(ndsAmount);
        row.querySelector('.item-total').textContent = formatCurrency(total);
    }
    recalculateTotals();
}

function recalculateTotals() {
    let totalSum = 0, totalNds = 0;
    document.querySelectorAll('#order-items-body tr').forEach(row => {
        const cancelled = row.querySelector('.item-cancelled')?.checked || false;
        if (!cancelled) {
            totalSum += parseFloat(row.querySelector('.item-sum')?.textContent.replace(/[^0-9.-]/g,'')) || 0;
            totalNds += parseFloat(row.querySelector('.item-nds-amount')?.textContent.replace(/[^0-9.-]/g,'')) || 0;
        }
    });
    const discountPercent = parseFloat(document.getElementById('order-manual-discount')?.value) || 0;
    const discountAmount = totalSum * discountPercent / 100;
    const finalTotal = totalSum + totalNds - discountAmount;
    document.getElementById('order-total-nds').textContent = formatCurrency(totalNds);
    document.getElementById('order-total-amount').textContent = formatCurrency(finalTotal);
}

function removeSelectedItems() {
    const checked = document.querySelectorAll('#order-items-body input.item-cancelled:checked');
    if (checked.length === 0) { alert('Отметьте строки (галочка "Отменен")'); return; }
    checked.forEach(cb => cb.closest('tr').remove());
    recalculateTotals();
    updateRowNumbers();
}

function updateRowNumbers() {
    document.querySelectorAll('#order-items-body tr').forEach((row, i) => { row.querySelector('td').textContent = i + 1; });
}

function collectOrderData() {
    const id = document.getElementById('order-id')?.value;
    const number = document.getElementById('order-number')?.value.trim();
    const date = document.getElementById('order-date')?.value;
    const clientId = document.getElementById('order-client')?.value;
    const operation = document.getElementById('order-operation')?.value;
    const status = document.getElementById('order-status')?.value;
    const shipmentDate = document.getElementById('order-shipment-date')?.value;
    const completionDate = document.getElementById('order-completion-date')?.value;
    const comment = document.getElementById('order-comment')?.value || '';
    const manualDiscountPercent = parseFloat(document.getElementById('order-manual-discount')?.value) || 0;
    const contract = document.getElementById('order-contract')?.value || 'Основной договор';
    const manufacturer = document.getElementById('order-manufacturer')?.value || 'Производство';
    const responsible = document.getElementById('order-responsible')?.value || 'Не назначен';
    const startDate = document.getElementById('order-start-date')?.value || getCurrentDate();
    const finishDate = document.getElementById('order-finish-date')?.value || addDays(getCurrentDate(), 30);
    const items = [];
    document.querySelectorAll('#order-items-body tr').forEach(row => {
        const select = row.querySelector('.product-select');
        const productId = select?.value;
        const rawName = select?.options[select.selectedIndex]?.text || '';
        let displayName = rawName;
        if (rawName.includes(' - ')) { displayName = rawName.substring(rawName.indexOf(' - ') + 3); }
        items.push({
            productId, sku: '', name: displayName,
            characteristic: row.querySelector('.item-char')?.value || '',
            quantity: parseFloat(row.querySelector('.item-qty')?.value) || 0,
            unit: row.querySelector('.item-unit')?.value || 'шт',
            price: parseFloat(row.querySelector('.item-price')?.value) || 0,
            ndsRate: parseFloat(row.querySelector('.item-nds-rate')?.value) || 0,
            ndsAmount: parseFloat(row.querySelector('.item-nds-amount')?.textContent.replace(/[^0-9.-]/g,'')) || 0,
            total: parseFloat(row.querySelector('.item-total')?.textContent.replace(/[^0-9.-]/g,'')) || 0,
            specification: row.querySelector('.item-spec')?.value || '',
            cancelled: row.querySelector('.item-cancelled')?.checked || false,
            cancelReason: row.querySelector('.item-cancel-reason')?.value || ''
        });
    });
    return {
        id: id || generateId(), number, date, completionDate: completionDate || addDays(getCurrentDate(), 30),
        shipmentDate, clientId, operation, status, comment, manualDiscountPercent,
        contract, manufacturer, responsible, startDate, finishDate, items,
        conducted: status === 'Проведён', events: orderEvents, files: orderFiles
    };
}

function validateOrder(order) {
    const errors = [];
    if (!order.number?.trim()) {
        errors.push('Номер заказа обязателен');
    }
    if (!order.clientId) {
        errors.push('Необходимо выбрать покупателя');
    }
    if (!Array.isArray(order.items) || order.items.length === 0) {
        errors.push('Добавьте минимум одну позицию');
    } else {
        order.items.forEach((item, i) => {
            if (!item.name?.trim()) {
                errors.push(`Позиция ${i+1}: введите наименование`);
            }
            if (item.quantity <= 0) {
                errors.push(`Позиция ${i+1}: количество должно быть > 0`);
            }
            if (item.price < 0) {
                errors.push(`Позиция ${i+1}: цена не может быть отрицательной`);
            }
            if (!Number.isFinite(item.total) || item.total < 0) {
                errors.push(`Позиция ${i+1}: ошибка в расчётах суммы`);
            }
        });
    }
    if (order.manualDiscountPercent < 0 || order.manualDiscountPercent > 100) {
        errors.push('Скидка должна быть от 0 до 100%');
    }
    return errors;
}

function saveOrder() {
    const order = collectOrderData();
    const validationErrors = validateOrder(order);
    
    if (validationErrors.length > 0) {
        alert('❌ Ошибки при сохранении:\n' + validationErrors.join('\n'));
        return;
    }
    Storage.saveOrder(order);
    closeModal();
    renderOrders();
    alert('✅ Заказ записан.');
}

function saveAndCloseOrder() {
    const order = collectOrderData();
    const validationErrors = validateOrder(order);
    
    if (validationErrors.length > 0) {
        alert('❌ Ошибки при сохранении:\n' + validationErrors.join('\n'));
        return;
    }
    order.status = 'Проведён';
    order.conducted = true;
    order.postedAt = new Date().toISOString();
    Storage.saveOrder(order);
    closeModal();
    renderOrders();
    alert('✅ Заказ проведён и закрыт.');
}

function conductOrder() {
    const order = collectOrderData();
    const validationErrors = validateOrder(order);
    
    if (validationErrors.length > 0) {
        alert('❌ Ошибки при сохранении:\n' + validationErrors.join('\n'));
        return;
    }
    order.status = 'Проведён';
    order.conducted = true;
    order.postedAt = new Date().toISOString();
    Storage.saveOrder(order);
    alert('Заказ проведён.');
}

function copyCurrentOrder() {
    const orderId = document.getElementById('order-id')?.value;
    if (!orderId) { alert('Сначала сохраните заказ'); return; }
    const original = Storage.getOrder(orderId);
    if (!original) return;
    const newOrder = { ...original, id: generateId(), number: generateNextNumber(), date: getCurrentDate(), conducted: false, status: 'В работе' };
    Storage.saveOrder(newOrder);
    alert('Заказ скопирован под номером ' + newOrder.number);
}

function createProductionOrder() {
    const orderId = document.getElementById('order-id')?.value;
    if (!orderId) { alert('Сначала сохраните заказ'); return; }
    if (typeof createProductionOrderFromSale === 'function') {
        createProductionOrderFromSale(orderId);
    } else {
        alert('Модуль производства не загружен');
    }
}

function showNewOrderForm() {
    document.getElementById('modal-title').textContent = 'Заказ покупателя (создание)';
    document.getElementById('order-form').reset();
    document.getElementById('order-id').value = '';
    document.getElementById('order-number').value = generateNextNumber();
    document.getElementById('order-status').value = 'В работе';
    document.getElementById('order-operation').value = 'Заказ на продажу';
    loadClientsToSelect('order-client');
    loadResponsiblesForOrder();
    document.getElementById('order-items-body').innerHTML = '';
    document.getElementById('order-comment').value = '';
    document.getElementById('order-manual-discount').value = 0;
    orderEvents = [];
    orderFiles = [];
    renderEvents();
    renderFiles();
    document.getElementById('report-block').innerHTML = '';
    const dateField = document.getElementById('order-date');
    dateField.value = new Date().toISOString().slice(0, 16);
    document.getElementById('order-start-date').value = getCurrentDate() + 'T00:00';
    document.getElementById('order-finish-date').value = addDays(getCurrentDate(), 30) + 'T23:59';
    const shipmentField = document.getElementById('order-shipment-date');
    if (shipmentField.setISODate) shipmentField.setISODate(getCurrentDate());
    else shipmentField.value = getCurrentDate();
    const completionField = document.getElementById('order-completion-date');
    if (completionField.setISODate) completionField.setISODate(addDays(getCurrentDate(), 30));
    else completionField.value = addDays(getCurrentDate(), 30);
    recalculateTotals();
    setFormEditable(true);
    switchTab('main');
    document.getElementById('order-modal').classList.add('show');
}

function editOrder(id) {
    const order = Storage.getOrder(id);
    if (!order) return;
    const isReadOnly = order.status === 'Проведён' || order.status === 'Завершён';
    document.getElementById('modal-title').textContent = isReadOnly ? 'Заказ покупателя (просмотр)' : 'Заказ покупателя (редактирование)';
    document.getElementById('order-id').value = order.id;
    document.getElementById('order-number').value = order.number;
    document.getElementById('order-status').value = order.status || 'В работе';
    document.getElementById('order-operation').value = order.operation || 'Заказ на продажу';
    loadClientsToSelect('order-client');
    document.getElementById('order-client').value = order.clientId;
    loadResponsiblesForOrder();
    document.getElementById('order-contract').value = order.contract || 'Основной договор';
    document.getElementById('order-manufacturer').value = order.manufacturer || 'Производство';
    document.getElementById('order-responsible').value = order.responsible || 'Не назначен';
    document.getElementById('order-comment').value = order.comment || '';
    document.getElementById('order-manual-discount').value = order.manualDiscountPercent || 0;
    orderEvents = order.events || [];
    orderFiles = order.files || [];
    renderEvents();
    renderFiles();
    const dateField = document.getElementById('order-date');
    dateField.value = order.date || '';
    document.getElementById('order-start-date').value = order.startDate || getCurrentDate() + 'T00:00';
    document.getElementById('order-finish-date').value = order.finishDate || addDays(getCurrentDate(), 30) + 'T23:59';
    const shipmentField = document.getElementById('order-shipment-date');
    if (shipmentField.setISODate) shipmentField.setISODate(order.shipmentDate || getCurrentDate());
    else shipmentField.value = order.shipmentDate || getCurrentDate();
    const completionField = document.getElementById('order-completion-date');
    const compDate = order.completionDate && !isNaN(new Date(order.completionDate)) ? order.completionDate : addDays(getCurrentDate(), 30);
    if (completionField.setISODate) completionField.setISODate(compDate);
    else completionField.value = compDate;

    const tbody = document.getElementById('order-items-body');
    tbody.innerHTML = '';
    (order.items || []).forEach(item => {
        addOrderItem({ id: item.productId, price: item.price, unit: item.unit || 'шт', ndsRate: item.ndsRate || 0, quantity: item.quantity || 0 });
        const row = tbody.lastElementChild;
        if (item.productId) row.querySelector('.product-select').value = item.productId;
        row.querySelector('.item-char').value = item.characteristic || '';
        row.querySelector('.item-qty').value = item.quantity || 0;
        row.querySelector('.item-unit').value = item.unit || 'шт';
        row.querySelector('.item-price').value = item.price;
        row.querySelector('.item-nds-rate').value = item.ndsRate || 0;
        row.querySelector('.item-spec').value = item.specification || '';
        row.querySelector('.item-cancelled').checked = item.cancelled || false;
        row.querySelector('.item-cancel-reason').value = item.cancelReason || '';
        recalcRow(row.querySelector('.item-qty'));
    });
    recalculateTotals();
    setFormEditable(!isReadOnly);
    switchTab('main');
    document.getElementById('order-modal').classList.add('show');
}

function closeModal() { document.getElementById('order-modal').classList.remove('show'); }

function createInvoiceFromCurrent() {
    const orderId = document.getElementById('order-id')?.value || selectedOrderId;
    if (!orderId) { alert('Сначала сохраните заказ или выберите его в списке.'); return; }
    window.location.href = `invoices.html?fromOrder=${orderId}`;
}

function createInvoiceFromOrder(orderId) {
    if (!orderId) return;
    window.location.href = `invoices.html?fromOrder=${orderId}`;
}

document.addEventListener('click', function(e) {
    const th = e.target.closest('th');
    if (!th || th.cellIndex === undefined) return;
    const columnMap = ['', 'date', 'number', 'status', '', 'sum', 'shipmentDate', 'operation'];
    const col = columnMap[th.cellIndex];
    if (col && col !== '') {
        if (sortColumn === col) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        else { sortColumn = col; sortDirection = 'asc'; }
        renderOrders();
    }
});

(function() {
    if (window.location.pathname.includes('invoices.html')) {
        const params = new URLSearchParams(window.location.search);
        const fromOrderId = params.get('fromOrder');
        if (fromOrderId) {
            Storage.init().then(() => {
                if (typeof showNewInvoiceForm === 'function') {
                    showNewInvoiceForm();
                    const select = document.getElementById('invoice-from-order');
                    if (select) { select.value = fromOrderId; if (typeof loadFromOrder === 'function') loadFromOrder(); }
                }
            });
        }
    }
})();

function addEvent() {
    const text = document.getElementById('new-event-text')?.value.trim();
    if (!text) return alert('Введите описание события');
    orderEvents.push({ date: new Date().toISOString(), author: 'Пользователь', description: text });
    document.getElementById('new-event-text').value = '';
    renderEvents();
}

function renderEvents() {
    const container = document.getElementById('events-list');
    if (!container) return;
    if (orderEvents.length === 0) { container.innerHTML = '<p>Событий пока нет.</p>'; return; }
    container.innerHTML = orderEvents.map((e, i) => `
        <div class="event-item">
            <div><strong>${formatDate(e.date)}</strong> — ${escapeHtml(e.author)}<p>${escapeHtml(e.description)}</p></div>
            <button class="btn btn-sm btn-danger" onclick="deleteEvent(${i})">✕</button>
        </div>
    `).join('');
}

function deleteEvent(index) { orderEvents.splice(index, 1); renderEvents(); }

function uploadFiles() {
    const input = document.getElementById('file-upload');
    if (!input?.files) return;
    for (const file of input.files) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            orderFiles.push({ name: file.name, size: file.size, type: file.type, data: ev.target.result, uploadedAt: new Date().toISOString() });
            renderFiles();
        };
        reader.readAsDataURL(file);
    }
    input.value = '';
}

function renderFiles() {
    const container = document.getElementById('files-list');
    if (!container) return;
    if (orderFiles.length === 0) { container.innerHTML = '<p>Файлов пока нет.</p>'; return; }
    container.innerHTML = orderFiles.map((f, i) => `
        <div class="file-item">
            <span>📎 ${escapeHtml(f.name)} (${(f.size / 1024).toFixed(1)} KB)</span>
            <div>
                <a href="${f.data}" download="${f.name}" class="btn btn-sm">⬇ Скачать</a>
                <button class="btn btn-sm btn-danger" onclick="deleteFile(${i})">✕</button>
            </div>
        </div>
    `).join('');
}

function deleteFile(index) { orderFiles.splice(index, 1); renderFiles(); }

function generateReport() {
    const order = collectOrderData();
    const total = order.items.reduce((s, i) => s + (i.total || 0), 0);
    const ndsTotal = order.items.reduce((s, i) => s + (i.ndsAmount || 0), 0);
    const discount = total * (order.manualDiscountPercent || 0) / 100;
    const finalTotal = total + ndsTotal - discount;
    const html = `
        <h3>Отчёт по заказу №${escapeHtml(order.number)}</h3>
        <p><b>Дата:</b> ${formatDate(order.date)} | <b>Покупатель:</b> ${escapeHtml(Storage.getClient(order.clientId)?.name || '')}</p>
        <p><b>Договор:</b> ${escapeHtml(order.contract || 'Основной договор')} | <b>Изготовитель:</b> ${escapeHtml(order.manufacturer || 'Производство')}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <thead><tr style="background:#003087;color:#fff;"><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>НДС</th><th>Всего</th></tr></thead>
            <tbody>
                ${order.items.map(i => `<tr style="border-bottom:1px solid #e2e8f0;"><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.price * i.quantity)}</td><td>${formatCurrency(i.ndsAmount)}</td><td>${formatCurrency(i.total)}</td></tr>`).join('')}
            </tbody>
        </table>
        <p style="margin-top:12px;"><b>Итого без скидки:</b> ${formatCurrency(total)} | <b>НДС:</b> ${formatCurrency(ndsTotal)} | <b>Скидка:</b> ${order.manualDiscountPercent}%</p>
        <p style="font-size:18px;font-weight:700;">Всего к оплате: ${formatCurrency(finalTotal)}</p>
        ${order.comment ? `<p><b>Комментарий:</b> ${escapeHtml(order.comment)}</p>` : ''}
    `;
    document.getElementById('report-block').innerHTML = html;
}

function showProductPicker() {
    const old = document.getElementById('product-picker-modal');
    if (old) old.remove();
    const products = Storage.getProducts();
    const html = `
    <div class="modal-overlay show" id="product-picker-modal" onclick="if(event.target===this) this.remove()">
        <div class="modal-content" style="max-width:700px;">
            <div class="modal-header"><h2>Подбор номенклатуры</h2><button class="modal-close" onclick="document.getElementById('product-picker-modal').remove()">&times;</button></div>
            <div class="modal-body" style="padding:16px;">
                <input type="text" id="picker-search" placeholder="🔍 Поиск..." oninput="filterPicker()" style="width:100%; margin-bottom:12px;">
                <div style="max-height:400px; overflow-y:auto;">
                    <table class="data-table">
                        <thead><tr><th>Выбрать</th><th>Артикул</th><th>Наименование</th><th>Цена</th><th>Ед.</th></tr></thead>
                        <tbody id="picker-tbody">
                            ${products.map(p => `<tr><td><input type="checkbox" class="picker-check" data-id="${p.id}" data-price="${p.price}" data-unit="${p.unit||'шт'}" data-nds="${p.ndsRate||0}"></td><td>${escapeHtml(p.sku)}</td><td>${escapeHtml(p.name)}</td><td>${formatCurrency(p.price)}</td><td>${escapeHtml(p.unit||'шт')}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
                <button class="btn btn-primary" style="margin-top:12px;" onclick="addPickedProducts()">Добавить выбранные</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function filterPicker() {
    const s = document.getElementById('picker-search')?.value.toLowerCase()||'';
    document.querySelectorAll('#picker-tbody tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(s)?'':'none');
}

function addPickedProducts() {
    const checks = document.querySelectorAll('.picker-check:checked');
    if (checks.length===0) { alert('Выберите товары'); return; }
    checks.forEach(cb => addOrderItem({ id:cb.dataset.id, price:parseFloat(cb.dataset.price)||0, unit:cb.dataset.unit, ndsRate:parseFloat(cb.dataset.nds)||0, quantity:1 }));
    document.getElementById('product-picker-modal')?.remove();
}