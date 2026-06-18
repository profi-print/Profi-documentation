// Снимаем readonly с номера накладной
document.addEventListener('DOMContentLoaded', function() {
    const field = document.getElementById('invoice-number');
    if (field) field.removeAttribute('readonly');
});

function loadInvoiceProductsToSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">— Продукт —</option>';
    Storage.getProducts().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.sku} - ${p.name}`;
        opt.dataset.price = p.price;
        opt.dataset.quantity = p.quantity || 0;
        selectEl.appendChild(opt);
    });
}

function loadInvoicesClients() {
    const select = document.getElementById('invoice-client');
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите клиента —</option>';
    Storage.getClients().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

function loadOrdersForInvoiceSelect() {
    const select = document.getElementById('invoice-from-order');
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите заказ —</option>';
    Storage.getOrders().forEach(o => {
        const client = Storage.getClient(o.clientId);
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = `${o.number} (${client ? client.name : ''})`;
        select.appendChild(opt);
    });
}

function loadFromOrder() {
    const orderId = document.getElementById('invoice-from-order').value;
    if (!orderId) return;
    const order = Storage.getOrder(orderId);
    if (!order) return;
    document.getElementById('invoice-client').value = order.clientId;
    const tbody = document.getElementById('invoice-items-body');
    tbody.innerHTML = '';
    order.items.forEach(item => {
        addInvoiceItemRow(item.productId, item.name, item.quantityProduced, item.price);
    });
    calculateInvoiceTotal();
}

function addInvoiceItemRow(productId = '', name = '', quantity = 0, price = 0) {
    const tbody = document.getElementById('invoice-items-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="item-sku" value="" placeholder="Артикул"></td>
        <td>
            <select class="product-select-inv" onchange="onInvoiceProductChange(this)">
                <option value="">— Продукт —</option>
            </select>
        </td>
        <td><input type="number" class="item-qty" value="${quantity}" min="0" onchange="updateInvoiceItemCost(this)"></td>
        <td><input type="number" class="item-price" value="${price}" min="0" onchange="updateInvoiceItemCost(this)"></td>
        <td><span class="item-cost">${(quantity * price)}</span></td>
        <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); calculateInvoiceTotal();">X</button></td>
    `;
    tbody.appendChild(row);
    const selectEl = row.querySelector('.product-select-inv');
    loadInvoiceProductsToSelect(selectEl);
    if (productId) {
        selectEl.value = productId;
        const product = Storage.getProduct(productId);
        if (product) {
            row.querySelector('.item-sku').value = product.sku;
            // Подставляем количество из карточки продукта
            row.querySelector('.item-qty').value = product.quantity || 0;
        }
    }
}

function addInvoiceItem() {
    addInvoiceItemRow();
}

function onInvoiceProductChange(selectEl) {
    const row = selectEl.closest('tr');
    const priceInput = row.querySelector('.item-price');
    const qtyInput = row.querySelector('.item-qty');
    const skuInput = row.querySelector('.item-sku');
    const option = selectEl.options[selectEl.selectedIndex];
    if (option && option.dataset.price) {
        priceInput.value = option.dataset.price;
        // Заполняем количество из dataset
        qtyInput.value = option.dataset.quantity || 0;
    }
    const productId = selectEl.value;
    if (productId) {
        const product = Storage.getProduct(productId);
        if (product) {
            skuInput.value = product.sku;
            // Наименование подставляется автоматически текстом опции, но мы его не трогаем (оно уже чистое)
        }
    }
    updateInvoiceItemCost(priceInput);
}

function updateInvoiceItemCost(inputEl) {
    const row = inputEl.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    row.querySelector('.item-cost').textContent = qty * price;
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    let total = 0;
    document.querySelectorAll('#invoice-items-body tr').forEach(row => {
        total += parseFloat(row.querySelector('.item-cost').textContent) || 0;
    });
    const totalBlock = document.getElementById('invoice-total-amount');
    const rowsCount = document.querySelectorAll('#invoice-items-body tr').length;
    if (rowsCount < 2 && total === 0) {
        totalBlock.parentElement.style.display = 'none';
    } else {
        totalBlock.parentElement.style.display = '';
        totalBlock.textContent = formatCurrency(total);
    }
}

function collectInvoiceData() {
    const id = document.getElementById('invoice-id').value;
    const number = document.getElementById('invoice-number').value.trim();
    const dateField = document.getElementById('invoice-date');
    const date = dateField.getISODate ? dateField.getISODate() : dateField.value;
    const clientId = document.getElementById('invoice-client').value;
    const items = [];
    document.querySelectorAll('#invoice-items-body tr').forEach(row => {
        const select = row.querySelector('.product-select-inv');
        const productId = select.value;
        // Извлекаем чистое наименование из текста опции (после " - ")
        let rawName = select.options[select.selectedIndex]?.text || '';
        let displayName = rawName;
        if (rawName.includes(' - ')) {
            displayName = rawName.substring(rawName.indexOf(' - ') + 3);
        }
        const sku = row.querySelector('.item-sku')?.value || '';
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const cost = parseFloat(row.querySelector('.item-cost').textContent) || 0;
        if (productId || displayName) {
            items.push({ productId, sku, name: displayName, quantity, price, cost });
        }
    });
    return { id: id || generateId(), number, date, clientId, items };
}

function saveInvoice() {
    const invoice = collectInvoiceData();
    if (!invoice.number) { alert('Введите номер накладной'); return; }
    if (!invoice.clientId) { alert('Выберите клиента'); return; }
    if (invoice.items.length === 0) { alert('Добавьте позиции'); return; }
    Storage.saveInvoice(invoice);
    closeInvoiceModal();
    renderInvoices();
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal').classList.remove('show');
}

function showNewInvoiceForm() {
    document.getElementById('invoice-modal-title').textContent = 'Новая накладная';
    document.getElementById('invoice-form').reset();
    document.getElementById('invoice-id').value = '';
    document.getElementById('invoice-number').value = '';
    loadInvoicesClients();
    loadOrdersForInvoiceSelect();
    document.getElementById('invoice-items-body').innerHTML = '';
    const totalBlock = document.getElementById('invoice-total-amount');
    totalBlock.parentElement.style.display = '';
    totalBlock.textContent = '0 UZS';
    const dateField = document.getElementById('invoice-date');
    if (dateField.setISODate) dateField.setISODate(getCurrentDate());
    else dateField.value = getCurrentDate();
    document.getElementById('invoice-modal').classList.add('show');
}

function editInvoice(id) {
    const invoice = Storage.getInvoice(id);
    if (!invoice) return;
    document.getElementById('invoice-modal-title').textContent = 'Редактировать накладную';
    document.getElementById('invoice-id').value = invoice.id;
    document.getElementById('invoice-number').value = invoice.number;
    loadInvoicesClients();
    loadOrdersForInvoiceSelect();
    document.getElementById('invoice-client').value = invoice.clientId;
    const dateField = document.getElementById('invoice-date');
    if (dateField.setISODate) dateField.setISODate(invoice.date);
    else dateField.value = invoice.date;
    const tbody = document.getElementById('invoice-items-body');
    tbody.innerHTML = '';
    invoice.items.forEach(item => {
        addInvoiceItemRow(item.productId, item.name, item.quantity, item.price);
    });
    calculateInvoiceTotal();
    document.getElementById('invoice-modal').classList.add('show');
}

function deleteInvoice(id) {
    if (confirm('Переместить накладную в корзину?')) {
        Storage.deleteInvoice(id);
        renderInvoices();
    }
}

function renderInvoices() {
    const invoices = Storage.getInvoices();
    const tbody = document.getElementById('invoices-table-body');
    tbody.innerHTML = invoices.map(inv => {
        const client = Storage.getClient(inv.clientId);
        const total = inv.items.reduce((s, i) => s + (i.cost || 0), 0);
        return `<tr onclick="showInvoiceDetail('${inv.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(inv.number)}</strong></td>
            <td>${formatDate(inv.date)}</td>
            <td>${escapeHtml(client ? client.name : '')}</td>
            <td>${formatCurrency(total)}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); generateInvoicePDF('${inv.id}')">📄</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editInvoice('${inv.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteInvoice('${inv.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function showInvoiceDetail(invoiceId) {
    const invoice = Storage.getInvoice(invoiceId);
    if (!invoice) return;
    const client = Storage.getClient(invoice.clientId);
    const total = invoice.items.reduce((s, i) => s + (i.cost || 0), 0);
    let html = `<div class="detail-section"><h3>Накладная №${escapeHtml(invoice.number)}</h3>`;
    html += `<p><strong>Дата отгрузки:</strong> ${formatDate(invoice.date)}</p>`;
    html += `<p><strong>Клиент:</strong> ${escapeHtml(client?.name || '')}</p>`;
    html += `<h4>Позиции (${invoice.items.length})</h4>`;
    html += `<table class="items-table"><thead><tr><th>Артикул</th><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Стоимость</th></tr></thead><tbody>`;
    invoice.items.forEach(item => {
        html += `<tr><td>${escapeHtml(item.sku || '')}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.cost)}</td></tr>`;
    });
    html += `</tbody></table><p><strong>Итого:</strong> ${formatCurrency(total)}</p></div>`;
    document.getElementById('detail-title').textContent = `Накладная №${invoice.number}`;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', async () => {
    await Storage.init();
    initDateFields();
    renderInvoices();
    document.getElementById('invoice-modal').addEventListener('click', function(e) {
        if (e.target === this) closeInvoiceModal();
    });
    document.getElementById('detail-modal').addEventListener('click', function(e) {
        if (e.target === this) closeDetailModal();
    });
});