let currentTrashIndex = -1;

function renderTrash() {
    const trash = Storage.getTrash();
    const tbody = document.getElementById('trash-body');
    if (trash.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Корзина пуста</td></tr>';
        return;
    }

    const typeNames = {
        order: 'Заказ',
        invoice: 'Накладная',
        reconciliation: 'Акт сверки',
        payment: 'Платёж',
        client: 'Клиент',
        product: 'Продукт'
    };

    tbody.innerHTML = trash.map((entry, index) => {
        let identifier = '';
        if (entry.item.number) identifier = entry.item.number;
        else if (entry.item.name) identifier = entry.item.name;
        else if (entry.item.sku) identifier = entry.item.sku;
        else if (entry.item.id) identifier = entry.item.id;
        const date = new Date(entry.deletedAt).toLocaleString('ru-RU');
        return `
            <tr>
                <td>${typeNames[entry.type] || entry.type}</td>
                <td><strong>${escapeHtml(identifier)}</strong></td>
                <td>${date}</td>
                <td>
                    <button class="btn-details" onclick="openDetail(${index})" title="Подробнее">⋮</button>
                    <button class="btn-restore" onclick="restoreItem(${index})">↩️</button>
                    <button class="btn-permadelete" onclick="permanentlyDelete(${index})">❌</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openDetail(index) {
    const trash = Storage.getTrash();
    if (index < 0 || index >= trash.length) return;
    const entry = trash[index];
    currentTrashIndex = index;

    const typeNames = {
        order: 'Заказ на производство',
        invoice: 'Накладная',
        reconciliation: 'Акт сверки',
        payment: 'Платёж',
        client: 'Клиент',
        product: 'Продукт'
    };

    document.getElementById('detail-title').textContent = `Детали: ${typeNames[entry.type] || entry.type}`;
    const body = document.getElementById('detail-body');

    let html = `<div class="detail-section"><h3>Основная информация</h3><div class="detail-grid">`;
    html += `<div class="label">Тип</div><div>${typeNames[entry.type] || entry.type}</div>`;
    html += `<div class="label">Дата удаления</div><div>${new Date(entry.deletedAt).toLocaleString('ru-RU')}</div>`;

    const item = entry.item;
    for (const [key, value] of Object.entries(item)) {
        if (key === 'items') continue;
        if (typeof value === 'number' && key !== 'price') {
            html += `<div class="label">${getFieldLabel(key)}</div><div>${value}</div>`;
        } else if (key === 'price') {
            html += `<div class="label">${getFieldLabel(key)}</div><div>${formatCurrency(value)}</div>`;
        } else {
            html += `<div class="label">${getFieldLabel(key)}</div><div>${escapeHtml(String(value))}</div>`;
        }
    }
    html += `</div></div>`;

    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
        html += `<div class="detail-section"><h3>Позиции (${item.items.length})</h3>`;
        html += `<table class="items-table"><thead><tr>`;
        if (entry.type === 'order') {
            html += `<th>Наименование</th><th>Кол-во произв</th><th>Цена</th><th>Стоимость</th><th>Заказано</th>`;
        } else if (entry.type === 'invoice') {
            html += `<th>Артикул</th><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Стоимость</th>`;
        } else if (entry.type === 'reconciliation') {
            html += `<th>Наименование</th><th>Нач.остаток</th><th>Реализация</th><th>Оплата</th><th>Кон.остаток</th>`;
        } else {
            html += `<th>Описание</th><th>Сумма</th>`;
        }
        html += `</tr></thead><tbody>`;
        item.items.forEach(line => {
            html += '<tr>';
            if (entry.type === 'order') {
                html += `<td>${escapeHtml(line.name || '')}</td>`;
                html += `<td>${line.quantityProduced || 0}</td>`;
                html += `<td>${formatCurrency(line.price)}</td>`;
                html += `<td>${formatCurrency(line.cost)}</td>`;
                html += `<td>${line.quantityOrdered || 0}</td>`;
            } else if (entry.type === 'invoice') {
                html += `<td>${escapeHtml(line.sku || '')}</td>`;
                html += `<td>${escapeHtml(line.name || '')}</td>`;
                html += `<td>${line.quantity || 0}</td>`;
                html += `<td>${formatCurrency(line.price)}</td>`;
                html += `<td>${formatCurrency(line.cost)}</td>`;
            } else if (entry.type === 'reconciliation') {
                html += `<td>${escapeHtml(line.document || '')}</td>`;
                html += `<td>${formatCurrency(line.startingBalance)}</td>`;
                html += `<td>${formatCurrency(line.realization)}</td>`;
                html += `<td>${formatCurrency(line.payment)}</td>`;
                html += `<td>${formatCurrency(line.endingBalance)}</td>`;
            } else {
                html += `<td>${escapeHtml(line.description || '')}</td>`;
                html += `<td>${formatCurrency(line.amount || 0)}</td>`;
            }
            html += '</tr>';
        });
        html += `</tbody></table></div>`;
    }

    html += `<div class="detail-section"><h3>Полный JSON</h3><div class="json-block">${escapeHtml(JSON.stringify(item, null, 2))}</div></div>`;
    body.innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('show');
    currentTrashIndex = -1;
}

function getFieldLabel(key) {
    const labels = {
        number: 'Номер',
        date: 'Дата',
        completionDate: 'Дата завершения',
        periodFrom: 'Период с',
        periodTo: 'Период по',
        name: 'Наименование',
        sku: 'Артикул',
        price: 'Цена',
        quantity: 'Количество',
        amount: 'Сумма',
        description: 'Описание',
        contact: 'Контакт',
        phone: 'Телефон',
        address: 'Адрес',
        clientId: 'ID клиента',
        unit: 'Ед. изм.',
        id: 'ID'
    };
    return labels[key] || key;
}

function exportSingleItem() {
    if (currentTrashIndex < 0) return;
    const trash = Storage.getTrash();
    const entry = trash[currentTrashIndex];
    const blob = new Blob([JSON.stringify(entry.item, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${entry.type}_${entry.item.number || entry.item.name || entry.item.sku || entry.item.id}.json`;
    a.click();
}

function restoreFromDetail() {
    if (currentTrashIndex < 0) return;
    if (Storage.restoreFromTrash(currentTrashIndex)) {
        closeDetailModal();
        renderTrash();
        alert('Элемент восстановлен.');
    }
}

function exportAllTrash() {
    const trash = Storage.getTrash();
    if (trash.length === 0) {
        alert('Корзина пуста');
        return;
    }
    const blob = new Blob([JSON.stringify(trash, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trash_export.json';
    a.click();
}

function restoreItem(index) {
    if (Storage.restoreFromTrash(index)) {
        renderTrash();
    }
}

function permanentlyDelete(index) {
    if (confirm('Удалить без возможности восстановления?')) {
        Storage.permanentlyDeleteFromTrash(index);
        renderTrash();
    }
}

function clearTrash() {
    if (confirm('Очистить всю корзину? Восстановление будет невозможно.')) {
        Storage.clearTrash();
        renderTrash();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderTrash();
    document.getElementById('detail-modal').addEventListener('click', function(e) {
        if (e.target === this) closeDetailModal();
    });
});