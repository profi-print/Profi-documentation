// ============================================
// ProfitPrint – Production Orders Module
// ============================================

let selectedProductionId = null;
let sortColumn = 'date';
let sortDirection = 'desc';

document.addEventListener('DOMContentLoaded', async function() {
    await Storage.init();
    initDateFields();
    loadManufacturers();
    loadResponsibles();
    loadProductsToProductionSelect();
    renderProductionOrders();
    const startField = document.getElementById('production-start-date');
    const finishField = document.getElementById('production-finish-date');
    if (startField) startField.value = getCurrentDate();
    if (finishField) finishField.value = addDays(getCurrentDate(), 30);
});

function loadProductsToProductionSelect() {
    const select = document.getElementById('production-nomenclature');
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите продукт —</option>';
    Storage.getProducts().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.sku} - ${p.name}`;
        select.appendChild(opt);
    });
}

function loadManufacturers() {
    const select = document.getElementById('filter-manufacturer');
    const formSelect = document.getElementById('production-manufacturer');
    if (!select && !formSelect) return;
    const unique = new Set();
    Storage.getProductionOrders().forEach(o => { if (o.manufacturer) unique.add(o.manufacturer); });
    if (unique.size === 0) unique.add('Производство');
    [select, formSelect].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        unique.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            sel.appendChild(opt);
        });
    });
}

function loadResponsibles() {
    const select = document.getElementById('filter-responsible');
    const formSelect = document.getElementById('production-responsible');
    if (!select && !formSelect) return;
    const unique = new Set();
    Storage.getProductionOrders().forEach(o => { if (o.responsible) unique.add(o.responsible); });
    Storage.getClients().forEach(c => { if (c.contact_person_name) unique.add(c.contact_person_name); });
    if (unique.size === 0) unique.add('Не назначен');
    [select, formSelect].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        unique.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            sel.appendChild(opt);
        });
    });
}

function renderProductionOrders() {
    let orders = Storage.getProductionOrders();
    const search = (document.getElementById('production-search')?.value || '').toLowerCase();
    const startDate = document.getElementById('filter-start')?.value;
    const endDate = document.getElementById('filter-end')?.value;
    const manufacturer = document.getElementById('filter-manufacturer')?.value;
    const status = document.getElementById('filter-status')?.value;
    const operation = document.getElementById('filter-operation')?.value;
    const responsible = document.getElementById('filter-responsible')?.value;

    if (search) {
        orders = orders.filter(o => 
            o.number?.toLowerCase().includes(search) || 
            o.nomenclature?.toLowerCase().includes(search)
        );
    }
    if (startDate) orders = orders.filter(o => o.date >= startDate);
    if (endDate) orders = orders.filter(o => o.date <= endDate);
    if (manufacturer) orders = orders.filter(o => o.manufacturer === manufacturer);
    if (status) orders = orders.filter(o => o.status === status);
    if (operation) orders = orders.filter(o => o.operation === operation);
    if (responsible) orders = orders.filter(o => o.responsible === responsible);

    orders.sort((a, b) => {
        let valA = a[sortColumn] || '';
        let valB = b[sortColumn] || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const tbody = document.getElementById('production-table-body');
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => {
        let statusClass = 'status-work';
        if (o.status === 'Завершен') statusClass = 'status-closed';
        return `<tr class="${selectedProductionId === o.id ? 'selected-row' : ''}" onclick="selectProductionOrder('${o.id}')" ondblclick="editProductionOrder('${o.id}')">
            <td><span class="status-dot ${statusClass}"></span></td>
            <td>${formatDate(o.date)}</td>
            <td><strong>${escapeHtml(o.number)}</strong></td>
            <td>${escapeHtml(o.status || 'В работе')}</td>
            <td>${escapeHtml(o.manufacturer || 'Производство')}</td>
            <td>${escapeHtml(o.nomenclature || '')}</td>
            <td>${formatDate(o.startDate)}</td>
            <td>${formatDate(o.finishDate)}</td>
            <td>${escapeHtml(o.operation || 'Сборка')}</td>
            <td>
                <button class="btn btn-sm" onclick="event.stopPropagation(); editProductionOrder('${o.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteProductionOrder('${o.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function selectProductionOrder(id) {
    selectedProductionId = id;
    renderProductionOrders();
}

function showNewProductionForm() {
    document.getElementById('production-form').reset();
    document.getElementById('production-start-date').value = getCurrentDate();
    document.getElementById('production-finish-date').value = addDays(getCurrentDate(), 30);
    document.getElementById('production-modal').classList.add('show');
}

function closeProductionModal() {
    document.getElementById('production-modal').classList.remove('show');
}

function saveProductionOrder() {
    const nomenclatureSelect = document.getElementById('production-nomenclature');
    const productId = nomenclatureSelect.value;
    const productName = nomenclatureSelect.options[nomenclatureSelect.selectedIndex]?.text || '';
    if (!productId) { alert('Выберите номенклатуру'); return; }
    const production = {
        id: generateId(),
        number: 'ПР-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*1000),
        date: getCurrentDate(),
        status: 'В работе',
        manufacturer: document.getElementById('production-manufacturer').value,
        nomenclature: productName,
        quantity: parseInt(document.getElementById('production-quantity').value) || 1,
        startDate: document.getElementById('production-start-date').value,
        finishDate: document.getElementById('production-finish-date').value,
        operation: document.getElementById('production-operation').value,
        responsible: document.getElementById('production-responsible').value || 'Не назначен',
        sourceOrderId: null
    };
    const productions = Storage.getProductionOrders();
    productions.push(production);
    localStorage.setItem('pp_production', JSON.stringify(productions));
    closeProductionModal();
    renderProductionOrders();
}

function createProductionOrderFromSale(orderId) {
    const saleOrder = Storage.getOrder(orderId);
    if (!saleOrder) return alert('Заказ покупателя не найден');
    const production = {
        id: generateId(),
        number: 'ПР-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*1000),
        date: getCurrentDate(),
        status: 'В работе',
        manufacturer: saleOrder.manufacturer || 'Производство',
        nomenclature: saleOrder.items?.map(i => i.name).join(', ') || '',
        quantity: saleOrder.items?.reduce((s,i) => s + (i.quantity || 0), 0),
        startDate: saleOrder.startDate || saleOrder.shipmentDate || getCurrentDate(),
        finishDate: saleOrder.finishDate || saleOrder.completionDate || addDays(getCurrentDate(), 30),
        operation: saleOrder.operation === 'Заказ на переработку' ? 'Переработка' : 'Сборка',
        responsible: saleOrder.responsible || 'Не назначен',
        sourceOrderId: saleOrder.id
    };
    const productions = Storage.getProductionOrders();
    productions.push(production);
    localStorage.setItem('pp_production', JSON.stringify(productions));
    if (typeof renderProductionOrders === 'function') renderProductionOrders();
    alert('Заказ на производство создан: ' + production.number);
}

function editProductionOrder(id) {
    const order = Storage.getProductionOrders().find(p => p.id === id);
    if (!order) return;
    const newStatus = prompt('Введите новый статус (В работе / Завершен):', order.status);
    if (newStatus) {
        order.status = newStatus;
        const productions = Storage.getProductionOrders();
        const index = productions.findIndex(p => p.id === id);
        if (index >= 0) productions[index] = order;
        localStorage.setItem('pp_production', JSON.stringify(productions));
        renderProductionOrders();
    }
}

function deleteProductionOrder(id) {
    if (confirm('Удалить заказ на производство?')) {
        let productions = Storage.getProductionOrders();
        productions = productions.filter(p => p.id !== id);
        localStorage.setItem('pp_production', JSON.stringify(productions));
        renderProductionOrders();
    }
}

if (!Storage.getProductionOrders) {
    Storage.getProductionOrders = function() {
        return JSON.parse(localStorage.getItem('pp_production') || '[]');
    };
}