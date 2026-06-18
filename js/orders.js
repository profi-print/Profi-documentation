// Снимаем readonly с номера заказа
document.addEventListener('DOMContentLoaded', function() {
    const field = document.getElementById('order-number');
    if (field) field.removeAttribute('readonly');
});

function loadClientsToSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите клиента —</option>';
    Storage.getClients().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

function loadProductsToSelect(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">— Продукт —</option>';
    Storage.getProducts().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.sku} - ${p.name}`;
        opt.dataset.price = p.price;
        opt.dataset.produced = p.produced || 0;
        opt.dataset.ordered = p.ordered || 0;
        selectElement.appendChild(opt);
    });
}

function calculateOrderTotal() {
    let total = 0;
    document.querySelectorAll('#order-items-body tr').forEach(row => {
        const costCell = row.querySelector('.item-cost');
        const cost = parseFloat(costCell?.textContent) || 0;
        total += cost;
    });
    document.getElementById('order-total-amount').textContent = formatCurrency(total);
}

function addOrderItem() {
    const tbody = document.getElementById('order-items-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="item-sku" placeholder="Артикул"></td>
        <td>
            <select class="product-select" onchange="onProductChange(this)">
                <option value="">— Продукт —</option>
            </select>
        </td>
        <td><input type="number" class="item-qty-prod" value="0" min="0" onchange="updateItemCost(this)"></td>
        <td><input type="number" class="item-price" value="0" min="0" onchange="updateItemCost(this)"></td>
        <td><span class="item-cost">0</span></td>
        <td><input type="number" class="item-qty-ordered" value="0" min="0"></td>
        <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); calculateOrderTotal();">X</button></td>
    `;
    tbody.appendChild(row);
    loadProductsToSelect(row.querySelector('.product-select'));
}

function onProductChange(selectEl) {
    const row = selectEl.closest('tr');
    const priceInput = row.querySelector('.item-price');
    const qtyProdInput = row.querySelector('.item-qty-prod');
    const qtyOrderedInput = row.querySelector('.item-qty-ordered');
    const skuInput = row.querySelector('.item-sku');
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (selectedOption && selectedOption.dataset.price) {
        priceInput.value = selectedOption.dataset.price;
        const productId = selectedOption.value;
        if (productId) {
            const product = Storage.getProduct(productId);
            if (product) {
                skuInput.value = product.sku;
                qtyProdInput.value = product.produced || 0;
                qtyOrderedInput.value = product.ordered || 0;
            }
        }
    }
    updateItemCost(priceInput);
}

function updateItemCost(inputEl) {
    const row = inputEl.closest('tr');
    const qty = parseFloat(row.querySelector('.item-qty-prod').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const cost = qty * price;
    row.querySelector('.item-cost').textContent = cost;
    calculateOrderTotal();
}

function collectOrderData() {
    const id = document.getElementById('order-id').value;
    const number = document.getElementById('order-number').value.trim();
    const dateField = document.getElementById('order-date');
    const completionField = document.getElementById('order-completion-date');
    const date = dateField.getISODate ? dateField.getISODate() : dateField.value;
    const completionDate = completionField.getISODate ? completionField.getISODate() : completionField.value;
    const clientId = document.getElementById('order-client').value;
    const items = [];
    document.querySelectorAll('#order-items-body tr').forEach(row => {
        const select = row.querySelector('.product-select');
        const productId = select.value;
        const productName = select.options[select.selectedIndex]?.text || '';
        // Из текста опции извлекаем только наименование (после " - ")
        let displayName = productName;
        if (productName.includes(' - ')) {
            displayName = productName.substring(productName.indexOf(' - ') + 3);
        }
        const quantityProduced = parseFloat(row.querySelector('.item-qty-prod').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const cost = parseFloat(row.querySelector('.item-cost').textContent) || 0;
        const quantityOrdered = parseFloat(row.querySelector('.item-qty-ordered').value) || 0;
        const sku = row.querySelector('.item-sku')?.value || '';
        if (productId || displayName) {
            items.push({ productId, sku, name: displayName, quantityProduced, price, cost, quantityOrdered });
        }
    });
    return { id: id || generateId(), number, date, completionDate, clientId, items };
}

function saveOrder() {
    const order = collectOrderData();
    if (!order.number) { alert('Введите номер заказа'); return; }
    if (!order.clientId) { alert('Выберите клиента'); return; }
    if (order.items.length === 0) { alert('Добавьте хотя бы одну позицию'); return; }
    Storage.saveOrder(order);
    closeModal();
    renderOrders();
}

function closeModal() {
    document.getElementById('order-modal').classList.remove('show');
}

function showNewOrderForm() {
    document.getElementById('modal-title').textContent = 'Новый заказ на производство';
    document.getElementById('order-form').reset();
    document.getElementById('order-id').value = '';
    document.getElementById('order-number').value = '';
    loadClientsToSelect('order-client');
    document.getElementById('order-items-body').innerHTML = '';
    document.getElementById('order-total-amount').textContent = '0 UZS';
    const dateField = document.getElementById('order-date');
    const completionField = document.getElementById('order-completion-date');
    if (dateField.setISODate) dateField.setISODate(getCurrentDate());
    else dateField.value = getCurrentDate();
    if (completionField.setISODate) completionField.setISODate(addDays(getCurrentDate(), 30));
    else completionField.value = addDays(getCurrentDate(), 30);
    document.getElementById('order-modal').classList.add('show');
}

function editOrder(id) {
    const order = Storage.getOrder(id);
    if (!order) return;
    document.getElementById('modal-title').textContent = 'Редактировать заказ';
    document.getElementById('order-id').value = order.id;
    document.getElementById('order-number').value = order.number;
    loadClientsToSelect('order-client');
    document.getElementById('order-client').value = order.clientId;
    const dateField = document.getElementById('order-date');
    const completionField = document.getElementById('order-completion-date');
    if (dateField.setISODate) dateField.setISODate(order.date);
    else dateField.value = order.date;
    if (completionField.setISODate) completionField.setISODate(order.completionDate);
    else completionField.value = order.completionDate;

    const tbody = document.getElementById('order-items-body');
    tbody.innerHTML = '';
    order.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="item-sku" value="${escapeHtml(item.sku || '')}"></td>
            <td>
                <select class="product-select" onchange="onProductChange(this)">
                    <option value="${item.productId}">${escapeHtml(item.name)}</option>
                </select>
            </td>
            <td><input type="number" class="item-qty-prod" value="${item.quantityProduced}" min="0" onchange="updateItemCost(this)"></td>
            <td><input type="number" class="item-price" value="${item.price}" min="0" onchange="updateItemCost(this)"></td>
            <td><span class="item-cost">${item.cost}</span></td>
            <td><input type="number" class="item-qty-ordered" value="${item.quantityOrdered}" min="0"></td>
            <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); calculateOrderTotal();">X</button></td>
        `;
        tbody.appendChild(row);
        const selectEl = row.querySelector('.product-select');
        loadProductsToSelect(selectEl);
        // Устанавливаем выбранный продукт, если он существует в справочнике
        if (item.productId) {
            const product = Storage.getProduct(item.productId);
            if (product) {
                selectEl.value = item.productId;
                // Заполняем артикул, если его нет
                if (!item.sku) {
                    row.querySelector('.item-sku').value = product.sku;
                }
            }
        }
    });
    calculateOrderTotal();
    document.getElementById('order-modal').classList.add('show');
}

function deleteOrder(id) {
    if (confirm('Переместить заказ в корзину?')) {
        Storage.deleteOrder(id);
        renderOrders();
    }
}

function renderOrders() {
    const orders = Storage.getOrders();
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = orders.map(o => {
        const client = Storage.getClient(o.clientId);
        const total = o.items.reduce((s, i) => s + (i.cost || 0), 0);
        return `<tr onclick="showOrderDetail('${o.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(o.number)}</strong></td>
            <td>${formatDate(o.date)}</td>
            <td>${formatDate(o.completionDate)}</td>
            <td>${escapeHtml(client ? client.name : '')}</td>
            <td>${formatCurrency(total)}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); generateOrderPDF('${o.id}')">📄</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editOrder('${o.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteOrder('${o.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function showOrderDetail(orderId) {
    const order = Storage.getOrder(orderId);
    if (!order) return;
    const client = Storage.getClient(order.clientId);
    const total = order.items.reduce((s, i) => s + (i.cost || 0), 0);
    let html = `<div class="detail-section"><h3>Заказ №${escapeHtml(order.number)}</h3>`;
    html += `<p><strong>Дата:</strong> ${formatDate(order.date)} | <strong>Завершение:</strong> ${formatDate(order.completionDate)}</p>`;
    html += `<p><strong>Клиент:</strong> ${escapeHtml(client?.name || '')} (${escapeHtml(client?.contact || '')})</p>`;
    html += `<h4>Позиции (${order.items.length})</h4>`;
    html += `<table class="items-table"><thead><tr><th>Артикул</th><th>Наименование</th><th>Кол-во произв</th><th>Цена</th><th>Стоимость</th><th>Заказано</th></tr></thead><tbody>`;
    order.items.forEach(item => {
        // Отображаем артикул без наименования (если он содержит разделитель, берём только первую часть)
        let displaySku = item.sku || '';
        if (displaySku.includes(' - ')) {
            displaySku = displaySku.substring(0, displaySku.indexOf(' - '));
        }
        html += `<tr>
            <td>${escapeHtml(displaySku)}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.quantityProduced}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.cost)}</td>
            <td>${item.quantityOrdered}</td>
        </tr>`;
    });
    html += `</tbody></table><p><strong>Итого:</strong> ${formatCurrency(total)}</p></div>`;
    document.getElementById('detail-title').textContent = `Заказ №${order.number}`;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', async () => {
    await Storage.init();
    initDateFields();
    renderOrders();
    document.getElementById('order-modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('detail-modal').addEventListener('click', function(e) {
        if (e.target === this) closeDetailModal();
    });
});