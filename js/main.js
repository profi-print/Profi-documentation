// ====== Обновление дашборда ======
function updateDashboardStats() {
    const clients = Storage.getClients();
    const products = Storage.getProducts();
    const orders = Storage.getOrders();
    const invoices = Storage.getInvoices();
    const payments = Storage.getPayments();
    const recons = Storage.getReconciliations();

    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-invoices').textContent = invoices.length;
    document.getElementById('stat-reconciliations').textContent = recons.length;
    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-products').textContent = products.length;

    const totalReal = invoices.reduce((sum, inv) =>
        sum + inv.items.reduce((s, i) => s + (i.cost || 0), 0), 0);
    const totalPay = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalDebt = totalReal - totalPay;

    document.getElementById('total-realization').textContent = formatCurrency(totalReal);
    document.getElementById('total-payments').textContent = formatCurrency(totalPay);
    document.getElementById('total-debt').textContent = formatCurrency(totalDebt);

    // Последние заказы
    const recentOrders = orders.slice(-5).reverse();
    document.getElementById('recent-orders-body').innerHTML = recentOrders.map(o => {
        const client = clients.find(c => c.id === o.clientId);
        const total = o.items.reduce((s, i) => s + (i.cost || 0), 0);
        return `<tr onclick="showOrderDetail('${o.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(o.number)}</strong></td>
            <td>${formatDate(o.date)}</td>
            <td>${escapeHtml(client?.name || '')}</td>
            <td>${formatCurrency(total)}</td>
            <td><button class="btn btn-sm btn-success" onclick="event.stopPropagation(); generateOrderPDF('${o.id}')">📄</button></td>
            <td><button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteOrderAndRefresh('${o.id}')">🗑️</button></td>
            <td><button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); showOrderDetail('${o.id}')">📋</button></td>
        </tr>`;
    }).join('');

    // Последние накладные
    const recentInvoices = invoices.slice(-5).reverse();
    document.getElementById('recent-invoices-body').innerHTML = recentInvoices.map(inv => {
        const client = clients.find(c => c.id === inv.clientId);
        const total = inv.items.reduce((s, i) => s + (i.cost || 0), 0);
        return `<tr onclick="showInvoiceDetail('${inv.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(inv.number)}</strong></td>
            <td>${formatDate(inv.date)}</td>
            <td>${escapeHtml(client?.name || '')}</td>
            <td>${formatCurrency(total)}</td>
            <td><button class="btn btn-sm btn-success" onclick="event.stopPropagation(); generateInvoicePDF('${inv.id}')">📄</button></td>
            <td><button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteInvoiceAndRefresh('${inv.id}')">🗑️</button></td>
            <td><button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); showInvoiceDetail('${inv.id}')">📋</button></td>
        </tr>`;
    }).join('');
}

function deleteOrderAndRefresh(id) {
    if (confirm('Переместить заказ в корзину?')) {
        Storage.deleteOrder(id);
        updateDashboardStats();
        if (typeof renderOrders === 'function') renderOrders();
    }
}
function deleteInvoiceAndRefresh(id) {
    if (confirm('Переместить накладную в корзину?')) {
        Storage.deleteInvoice(id);
        updateDashboardStats();
        if (typeof renderInvoices === 'function') renderInvoices();
    }
}

// ====== Детализация документов ======
function showOrderDetail(orderId) {
    const order = Storage.getOrder(orderId);
    if (!order) return;
    const client = Storage.getClient(order.clientId);
    const total = order.items.reduce((s, i) => s + (i.cost || 0), 0);
    let html = `<div class="detail-section"><h3>Заказ №${escapeHtml(order.number)}</h3>`;
    html += `<p><strong>Дата:</strong> ${formatDate(order.date)} | <strong>Завершение:</strong> ${formatDate(order.completionDate)}</p>`;
    html += `<p><strong>Клиент:</strong> ${escapeHtml(client?.name || '')} (${escapeHtml(client?.contact || '')})</p>`;
    html += `<h4>Позиции (${order.items.length})</h4>`;
    html += `<table class="items-table"><thead><tr><th>Наименование</th><th>Кол-во произв</th><th>Цена</th><th>Стоимость</th><th>Заказано</th></tr></thead><tbody>`;
    order.items.forEach(item => {
        html += `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantityProduced}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.cost)}</td><td>${item.quantityOrdered}</td></tr>`;
    });
    html += `</tbody></table><p><strong>Итого:</strong> ${formatCurrency(total)}</p></div>`;
    document.getElementById('detail-title').textContent = `Заказ №${order.number}`;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
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
        html += `<tr><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.cost)}</td></tr>`;
    });
    html += `</tbody></table><p><strong>Итого:</strong> ${formatCurrency(total)}</p></div>`;
    document.getElementById('detail-title').textContent = `Накладная №${invoice.number}`;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('show');
}

// ====== Быстрые модалки ======
function openQuickClient() {
    document.getElementById('quick-client-form').reset();
    document.getElementById('quick-client-modal').classList.add('show');
}
function closeQuickClient() { document.getElementById('quick-client-modal').classList.remove('show'); }
function saveQuickClient() {
    const name = document.getElementById('quick-client-name').value.trim();
    if (!name) { alert('Введите название'); return; }
    Storage.saveClient({
        id: generateId(),
        name,
        contact: document.getElementById('quick-client-contact').value.trim(),
        phone: document.getElementById('quick-client-phone').value.trim(),
        address: document.getElementById('quick-client-address').value.trim()
    });
    closeQuickClient();
    updateDashboardStats();
}

function openQuickProduct() {
    document.getElementById('quick-product-form').reset();
    document.getElementById('quick-product-modal').classList.add('show');
}
function closeQuickProduct() { document.getElementById('quick-product-modal').classList.remove('show'); }
function saveQuickProduct() {
    const sku = document.getElementById('quick-product-sku').value.trim();
    const name = document.getElementById('quick-product-name').value.trim();
    if (!sku || !name) { alert('Введите артикул и наименование'); return; }
    Storage.saveProduct({
        id: generateId(),
        sku,
        name,
        price: parseFloat(document.getElementById('quick-product-price').value) || 0,
        unit: document.getElementById('quick-product-unit').value
    });
    closeQuickProduct();
    updateDashboardStats();
}

// ====== Детализация задолженности ======
function showDebtDetails() {
    const clients = Storage.getClients();
    const invoices = Storage.getInvoices();
    const payments = Storage.getPayments();
    const tbody = document.getElementById('debt-table-body');
    const rows = clients.map(client => {
        const real = invoices.filter(inv => inv.clientId === client.id)
            .reduce((sum, inv) => sum + inv.items.reduce((s, i) => s + (i.cost || 0), 0), 0);
        const pay = payments.filter(p => p.clientId === client.id).reduce((sum, p) => sum + p.amount, 0);
        return { id: client.id, name: client.name, real, pay, debt: real - pay };
    }).filter(r => r.debt > 0).sort((a, b) => b.debt - a.debt);

    tbody.innerHTML = rows.length ? rows.map(r => `
        <tr onclick="generateReconciliationForClient('${r.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${formatCurrency(r.real)}</td>
            <td>${formatCurrency(r.pay)}</td>
            <td style="color: #b91c1c; font-weight: 600;">${formatCurrency(r.debt)}</td>
        </tr>
    `).join('') : '<tr><td colspan="4">Нет задолженностей</td></tr>';
    document.getElementById('debt-modal').classList.add('show');
}
function closeDebtModal() { document.getElementById('debt-modal').classList.remove('show'); }

// Генерация акта сверки для клиента (по всем операциям) и вывод PDF
async function generateReconciliationForClient(clientId) {
    const client = Storage.getClient(clientId);
    if (!client) return alert('Клиент не найден');

    const invoices = Storage.getInvoices().filter(inv => inv.clientId === clientId).sort((a,b) => a.date.localeCompare(b.date));
    const payments = Storage.getPayments().filter(p => p.clientId === clientId).sort((a,b) => a.date.localeCompare(b.date));

    if (invoices.length === 0 && payments.length === 0) {
        alert('Нет операций для этого клиента');
        return;
    }

    let fromDate = '', toDate = getCurrentDate();
    const allDates = [];
    invoices.forEach(inv => allDates.push(inv.date));
    payments.forEach(p => allDates.push(p.date));
    if (allDates.length > 0) {
        allDates.sort();
        fromDate = allDates[0];
    }

    const operations = [];
    invoices.forEach(inv => {
        operations.push({
            date: inv.date,
            document: `Накладная №${inv.number}`,
            realization: inv.items.reduce((s, i) => s + i.cost, 0),
            payment: 0
        });
    });
    payments.forEach(p => {
        operations.push({
            date: p.date,
            document: `Платёж: ${p.description || ''}`,
            realization: 0,
            payment: p.amount
        });
    });
    operations.sort((a, b) => a.date.localeCompare(b.date));

    const startingBalance = 0; // считаем с нуля
    let runningBalance = startingBalance;
    const items = [{
        date: fromDate,
        document: 'Начальный остаток',
        startingBalance: startingBalance,
        realization: 0,
        payment: 0,
        endingBalance: startingBalance
    }];
    operations.forEach(op => {
        runningBalance += op.realization - op.payment;
        items.push({
            date: op.date,
            document: op.document,
            startingBalance: items[items.length-1].endingBalance,
            realization: op.realization,
            payment: op.payment,
            endingBalance: runningBalance
        });
    });

    const recon = {
        id: 'temp_' + Date.now(),
        number: 'Задолженность ' + client.name,
        date: getCurrentDate(),
        clientId: clientId,
        periodFrom: fromDate,
        periodTo: toDate,
        items: items
    };

    // Временно сохраняем в localStorage, чтобы сгенерировать PDF
    const recons = Storage.getReconciliations();
    recons.push(recon);
    localStorage.setItem('pp_reconciliations', JSON.stringify(recons));

    generateReconciliationPDF(recon.id);

    // Удаляем временный акт через 1 секунду
    setTimeout(() => {
        const updatedRecons = Storage.getReconciliations().filter(r => r.id !== recon.id);
        localStorage.setItem('pp_reconciliations', JSON.stringify(updatedRecons));
    }, 1500);
}

// ====== Справка ======
function showHelp() { document.getElementById('help-modal').classList.add('show'); }
function closeHelp() { document.getElementById('help-modal').classList.remove('show'); }

// ====== Экспорт / Импорт ======
function exportData() {
    const data = {
        clients: Storage.getClients(),
        products: Storage.getProducts(),
        orders: Storage.getOrders(),
        invoices: Storage.getInvoices(),
        payments: Storage.getPayments(),
        reconciliations: Storage.getReconciliations()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'profitprint_data.json';
    a.click();
}
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.clients) localStorage.setItem('pp_clients', JSON.stringify(data.clients));
            if (data.products) localStorage.setItem('pp_products', JSON.stringify(data.products));
            if (data.orders) localStorage.setItem('pp_orders', JSON.stringify(data.orders));
            if (data.invoices) localStorage.setItem('pp_invoices', JSON.stringify(data.invoices));
            if (data.payments) localStorage.setItem('pp_payments', JSON.stringify(data.payments));
            if (data.reconciliations) localStorage.setItem('pp_reconciliations', JSON.stringify(data.reconciliations));
            alert('Данные импортированы!');
            updateDashboardStats();
        } catch (err) {
            alert('Ошибка чтения файла');
        }
    };
    reader.readAsText(file);
}

// ====== Инициализация ======
document.addEventListener('DOMContentLoaded', async () => {
    await Storage.init();
    updateDashboardStats();
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    });
});