// ====== Обновление дашборда ======
function updateDashboardStats() {
    const rates = JSON.parse(localStorage.getItem('pp_currency_rates') || '{"CNY":12.5,"KZT":0.024,"EUR":12000}');
    const clients = Storage.getClients();
    const products = Storage.getProducts();
    const orders = Storage.getOrders();
    const invoices = Storage.getInvoices();
    const payments = Storage.getPayments();
    const recons = Storage.getReconciliations();
    const userName = localStorage.getItem('pp_user_name') || 'Пользователь';

    document.getElementById('rate-cny').textContent = rates.CNY;
    document.getElementById('rate-kzt').textContent = rates.KZT;
    document.getElementById('rate-eur').textContent = rates.EUR;
    document.getElementById('current-user-name').textContent = userName;
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-invoices').textContent = invoices.length;
    document.getElementById('stat-reconciliations').textContent = recons.length;
    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-products').textContent = products.length;

    const totalReal = invoices.reduce((sum, inv) =>
        sum + (Array.isArray(inv.items) ? inv.items.reduce((s, i) => s + (i.cost || 0), 0) : 0), 0);
    const totalPay = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalDebt = totalReal - totalPay;

    document.getElementById('total-realization').textContent = formatCurrency(totalReal);
    document.getElementById('total-payments').textContent = formatCurrency(totalPay);
    document.getElementById('total-debt').textContent = formatCurrency(totalDebt);

    const recentOrders = orders.slice(-5).reverse();
    document.getElementById('recent-orders-body').innerHTML = recentOrders.map(o => {
        const client = clients.find(c => c.id === o.clientId);
        const total = (Array.isArray(o.items) ? o.items.reduce((s, i) => s + (i.cost || 0), 0) : 0);
        return `<tr data-order-id="${escapeHtml(o.id)}" data-action="select-order" style="cursor:pointer;">
            <td><strong>${escapeHtml(o.number)}</strong></td>
            <td>${formatDate(o.date)}</td>
            <td>${escapeHtml(client?.name || '')}</td>
            <td>${formatCurrency(total)}</td>
            <td><button class="btn btn-sm btn-success" data-action="generate-order-pdf" data-id="${escapeHtml(o.id)}">📄</button></td>
            <td><button class="btn btn-sm btn-danger" data-action="delete-order" data-id="${escapeHtml(o.id)}">🗑️</button></td>
            <td><button class="btn btn-sm btn-secondary" data-action="show-order-detail" data-id="${escapeHtml(o.id)}">📋</button></td>
        </tr>`;
    }).join('');

    const recentInvoices = invoices.slice(-5).reverse();
    document.getElementById('recent-invoices-body').innerHTML = recentInvoices.map(inv => {
        const client = clients.find(c => c.id === inv.clientId);
        const total = (Array.isArray(inv.items) ? inv.items.reduce((s, i) => s + (i.cost || 0), 0) : 0);
        return `<tr data-invoice-id="${escapeHtml(inv.id)}" data-action="select-invoice" style="cursor:pointer;">
            <td><strong>${escapeHtml(inv.number)}</strong></td>
            <td>${formatDate(inv.date)}</td>
            <td>${escapeHtml(client?.name || '')}</td>
            <td>${formatCurrency(total)}</td>
            <td><button class="btn btn-sm btn-success" data-action="generate-invoice-pdf" data-id="${escapeHtml(inv.id)}">📄</button></td>
            <td><button class="btn btn-sm btn-danger" data-action="delete-invoice" data-id="${escapeHtml(inv.id)}">🗑️</button></td>
            <td><button class="btn btn-sm btn-secondary" data-action="show-invoice-detail" data-id="${escapeHtml(inv.id)}">📋</button></td>
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

function showOrderDetail(orderId) {
    const order = Storage.getOrder(orderId);
    if (!order) return;
    const client = Storage.getClient(order.clientId);
    const total = (Array.isArray(order.items) ? order.items.reduce((s, i) => s + (i.cost || 0), 0) : 0);
    let html = `<div class="detail-section"><h3>Заказ №${escapeHtml(order.number)}</h3>`;
    html += `<p><strong>Дата:</strong> ${formatDate(order.date)} | <strong>Завершение:</strong> ${formatDate(order.completionDate)}</p>`;
    html += `<p><strong>Клиент:</strong> ${escapeHtml(client?.name || '')} (${escapeHtml(client?.contact || '')})</p>`;
    html += `<h4>Позиции (${(order.items || []).length})</h4>`;
    html += `<table class="items-table"><thead><tr><th>Наименование</th><th>Кол-во произв</th><th>Цена</th><th>Стоимость</th><th>Заказано</th></tr></thead><tbody>`;
    (order.items || []).forEach(item => {
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
    const total = (Array.isArray(invoice.items) ? invoice.items.reduce((s, i) => s + (i.cost || 0), 0) : 0);
    let html = `<div class="detail-section"><h3>Накладная №${escapeHtml(invoice.number)}</h3>`;
    html += `<p><strong>Дата отгрузки:</strong> ${formatDate(invoice.date)}</p>`;
    html += `<p><strong>Клиент:</strong> ${escapeHtml(client?.name || '')}</p>`;
    html += `<h4>Позиции (${(invoice.items || []).length})</h4>`;
    html += `<table class="items-table"><thead><tr><th>Артикул</th><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Стоимость</th></tr></thead><tbody>`;
    (invoice.items || []).forEach(item => {
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

    const startingBalance = 0;
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

    const recons = Storage.getReconciliations();
    recons.push(recon);
    localStorage.setItem('pp_reconciliations', JSON.stringify(recons));

    generateReconciliationPDF(recon.id);

    setTimeout(() => {
        const updatedRecons = Storage.getReconciliations().filter(r => r.id !== recon.id);
        localStorage.setItem('pp_reconciliations', JSON.stringify(updatedRecons));
    }, 1500);
}

function showHelp() { document.getElementById('help-modal').classList.add('show'); }
function closeHelp() { document.getElementById('help-modal').classList.remove('show'); }

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
function validateImportData(data) {
    const errors = [];
    if (!data || typeof data !== 'object') {
        errors.push('Данные должны быть объектом JSON');
    }
    if (data.clients && !Array.isArray(data.clients)) {
        errors.push('clients должен быть массивом');
    }
    if (data.products && !Array.isArray(data.products)) {
        errors.push('products должен быть массивом');
    }
    if (data.orders && !Array.isArray(data.orders)) {
        errors.push('orders должен быть массивом');
    }
    if (data.invoices && !Array.isArray(data.invoices)) {
        errors.push('invoices должен быть массивом');
    }
    if (data.payments && !Array.isArray(data.payments)) {
        errors.push('payments должен быть массивом');
    }
    if (data.reconciliations && !Array.isArray(data.reconciliations)) {
        errors.push('reconciliations должен быть массивом');
    }
    return errors;
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Файл слишком большой (макс. 10MB)');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            const validationErrors = validateImportData(data);
            if (validationErrors.length > 0) {
                alert('Ошибка структуры файла:\n' + validationErrors.join('\n'));
                return;
            }
            
            if (data.clients) localStorage.setItem('pp_clients', JSON.stringify(data.clients));
            if (data.products) localStorage.setItem('pp_products', JSON.stringify(data.products));
            if (data.orders) localStorage.setItem('pp_orders', JSON.stringify(data.orders));
            if (data.invoices) localStorage.setItem('pp_invoices', JSON.stringify(data.invoices));
            if (data.payments) localStorage.setItem('pp_payments', JSON.stringify(data.payments));
            if (data.reconciliations) localStorage.setItem('pp_reconciliations', JSON.stringify(data.reconciliations));
            alert('✅ Данные импортированы успешно!');
            updateDashboardStats();
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert('❌ Ошибка: Некорректный JSON формат');
            } else {
                alert('❌ Ошибка чтения файла: ' + err.message);
            }
        }
    };
    reader.readAsText(file);
}

async function syncWithServer() {
    await Storage.init();
    updateDashboardStats();
    alert('✅ Данные синхронизированы с сервером');
}

function autoBackup() {
    const lastBackup = localStorage.getItem('pp_last_backup_date');
    const today = new Date().toISOString().split('T')[0];
    if (lastBackup !== today) {
        const data = {
            clients: Storage.getClients(), products: Storage.getProducts(), orders: Storage.getOrders(),
            invoices: Storage.getInvoices(), payments: Storage.getPayments(), reconciliations: Storage.getReconciliations(),
            production: Storage.getProductionOrders ? Storage.getProductionOrders() : [], trash: Storage.getTrash()
        };
        localStorage.setItem('pp_backup_' + today, JSON.stringify(data));
        localStorage.setItem('pp_last_backup_date', today);
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('pp_backup_'));
        if (allKeys.length > 7) { allKeys.sort(); localStorage.removeItem(allKeys[0]); }
        console.log('Резервная копия создана: ' + today);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await Storage.init();
    updateDashboardStats();
    
    // Event delegation for table actions
    document.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        if (action === 'show-order-detail' && id) {
            e.stopPropagation();
            showOrderDetail(id);
        } else if (action === 'show-invoice-detail' && id) {
            e.stopPropagation();
            showInvoiceDetail(id);
        } else if (action === 'generate-order-pdf' && id) {
            e.stopPropagation();
            generateOrderPDF(id);
        } else if (action === 'generate-invoice-pdf' && id) {
            e.stopPropagation();
            generateInvoicePDF(id);
        } else if (action === 'delete-order' && id) {
            e.stopPropagation();
            deleteOrderAndRefresh(id);
        } else if (action === 'delete-invoice' && id) {
            e.stopPropagation();
            deleteInvoiceAndRefresh(id);
        } else if (action === 'select-order') {
            const tr = e.target.closest('tr[data-order-id]');
            if (tr) showOrderDetail(tr.dataset.orderId);
        } else if (action === 'select-invoice') {
            const tr = e.target.closest('tr[data-invoice-id]');
            if (tr) showInvoiceDetail(tr.dataset.invoiceId);
        }
    });
    
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    });

    const burgerBtn = document.getElementById('burgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (burgerBtn && sidebar && overlay) {
        burgerBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
            burgerBtn.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            burgerBtn.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    }

    autoBackup();
});