document.addEventListener('DOMContentLoaded', function() {
    const field = document.getElementById('reconciliation-number');
    if (field) field.removeAttribute('readonly');
});

function loadReconClients() {
    const select = document.getElementById('reconciliation-client');
    if (!select) return;
    select.innerHTML = '<option value="">— Выберите клиента —</option>';
    Storage.getClients().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

// Вспомогательные функции
function formatNumberOrDash(num) {
    const n = parseFloat(num) || 0;
    if (n === 0) return '';
    return n.toLocaleString('ru-RU');
}

function getInputValue(input) {
    if (!input) return 0;
    const raw = input.value.trim();
    if (raw === '' || raw === '-') return 0;
    return parseFloat(raw.replace(/[^0-9.-]/g, '')) || 0;
}

function setInputValue(input, value) {
    if (!input) return;
    input.value = value === 0 ? '' : value;
}

// Добавить пустую строку
function addReconRow() {
    const tbody = document.getElementById('reconciliation-items-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="recon-input" placeholder="Наименование" style="text-align:left;"></td>
        <td><input type="text" class="recon-input" placeholder="" data-field="startingBalance" oninput="updateRowCalc(this)"></td>
        <td><input type="text" class="recon-input" placeholder="" data-field="realization" oninput="updateRowCalc(this)"></td>
        <td><input type="text" class="recon-input" placeholder="" data-field="payment" oninput="updateRowCalc(this)"></td>
        <td><input type="text" class="recon-input" placeholder="" data-field="endingBalance" readonly></td>
    `;
    tbody.appendChild(row);

    // Стилизация
    row.querySelectorAll('.recon-input').forEach(inp => {
        inp.style.border = 'none';
        inp.style.background = 'transparent';
        inp.style.width = '100%';
        inp.style.textAlign = 'right';
        inp.style.fontSize = '12px';
        inp.style.padding = '5px';
        if (inp.placeholder === 'Наименование') {
            inp.style.textAlign = 'left';
            inp.style.fontWeight = 'normal';
        }
    });

    // Убедимся, что есть итоговая строка
    ensureTotalRow(tbody);
    updateTotalRow();
}

// Пересчёт конечного остатка в строке (защита от NaN)
function updateRowCalc(input) {
    const row = input.closest('tr');
    if (!row) return;
    const start = getInputValue(row.querySelector('[data-field="startingBalance"]'));
    const real = getInputValue(row.querySelector('[data-field="realization"]'));
    const pay = getInputValue(row.querySelector('[data-field="payment"]'));
    const ending = start + real - pay;
    if (!isFinite(ending)) {
        console.warn('Invalid calculation in reconciliation row');
        return;
    }
    const endingInput = row.querySelector('[data-field="endingBalance"]');
    setInputValue(endingInput, ending);
    updateTotalRow();
}

// Итоговая строка
function ensureTotalRow(tbody) {
    let totalRow = document.getElementById('recon-total-row');
    if (!totalRow) {
        totalRow = document.createElement('tr');
        totalRow.id = 'recon-total-row';
        totalRow.style.background = 'rgba(0, 48, 135, 0.08)';
        totalRow.innerHTML = `
            <td style="font-weight:bold; text-align:right; padding:6px;">ИТОГО</td>
            <td><input type="text" class="recon-input" id="total-starting" readonly style="font-weight:bold;"></td>
            <td><input type="text" class="recon-input" id="total-realization" readonly style="font-weight:bold;"></td>
            <td><input type="text" class="recon-input" id="total-payment" readonly style="font-weight:bold;"></td>
            <td><input type="text" class="recon-input" id="total-ending" readonly style="font-weight:bold;"></td>
        `;
        tbody.parentNode.insertBefore(totalRow, tbody.nextSibling);
        document.querySelectorAll('#recon-total-row .recon-input').forEach(inp => {
            inp.style.border = 'none';
            inp.style.background = 'transparent';
            inp.style.width = '100%';
            inp.style.textAlign = 'right';
            inp.style.fontSize = '12px';
            inp.style.padding = '5px';
        });
    }
    return totalRow;
}

function updateTotalRow() {
    const tbody = document.getElementById('reconciliation-items-body');
    if (!tbody) return;
    let sumStart = 0, sumReal = 0, sumPay = 0, sumEnd = 0;
    try {
        tbody.querySelectorAll('tr').forEach(row => {
            const start = getInputValue(row.querySelector('[data-field="startingBalance"]'));
            const real = getInputValue(row.querySelector('[data-field="realization"]'));
            const pay = getInputValue(row.querySelector('[data-field="payment"]'));
            const end = getInputValue(row.querySelector('[data-field="endingBalance"]'));
            if (isFinite(start)) sumStart += start;
            if (isFinite(real)) sumReal += real;
            if (isFinite(pay)) sumPay += pay;
            if (isFinite(end)) sumEnd += end;
        });
    } catch (err) {
        console.warn('Error calculating reconciliation totals:', err);
    }
    setInputValue(document.getElementById('total-starting'), sumStart);
    setInputValue(document.getElementById('total-realization'), sumReal);
    setInputValue(document.getElementById('total-payment'), sumPay);
    setInputValue(document.getElementById('total-ending'), sumEnd);
}

// Сохранение
function validateReconciliation(recon) {
    const errors = [];
    if (!recon.number?.trim()) {
        errors.push('Номер акта обязателен');
    }
    if (!recon.clientId) {
        errors.push('Необходимо выбрать контрагента');
    }
    if (!Array.isArray(recon.items) || recon.items.length === 0) {
        errors.push('Добавьте минимум одну строку');
    } else {
        recon.items.forEach((item, i) => {
            if (!Number.isFinite(item.startingBalance) || item.startingBalance < 0) {
                errors.push(`Строка ${i+1}: начальный остаток некорректен`);
            }
            if (!Number.isFinite(item.realization) || item.realization < 0) {
                errors.push(`Строка ${i+1}: реализация не может быть отрицательной`);
            }
            if (!Number.isFinite(item.payment) || item.payment < 0) {
                errors.push(`Строка ${i+1}: платёж не может быть отрицательным`);
            }
            if (!Number.isFinite(item.endingBalance) || item.endingBalance < 0) {
                errors.push(`Строка ${i+1}: конечный остаток некорректен`);
            }
        });
    }
    return errors;
}

function saveReconciliation() {
    const number = document.getElementById('reconciliation-number').value.trim();
    if (!number) { alert('❌ Введите номер акта'); return; }

    const tbody = document.getElementById('reconciliation-items-body');
    if (!tbody || tbody.children.length === 0) {
        alert('❌ Добавьте хотя бы одну строку.');
        return;
    }

    const reconId = document.getElementById('reconciliation-id').value;
    const dateField = document.getElementById('reconciliation-date');
    const date = dateField.getISODate ? dateField.getISODate() : dateField.value;
    const clientId = document.getElementById('reconciliation-client').value;
    const periodFromField = document.getElementById('reconciliation-period-from');
    const periodToField = document.getElementById('reconciliation-period-to');
    const periodFrom = periodFromField.getISODate ? periodFromField.getISODate() : periodFromField.value;
    const periodTo = periodToField.getISODate ? periodToField.getISODate() : periodToField.value;

    const items = [];
    document.querySelectorAll('#reconciliation-items-body tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length === 5) {
            const docName = inputs[0].value.trim();
            const start = getInputValue(inputs[1]);
            const real = getInputValue(inputs[2]);
            const pay = getInputValue(inputs[3]);
            const end = getInputValue(inputs[4]);
            if (docName !== '' || start !== 0 || real !== 0 || pay !== 0) {
                items.push({
                    document: docName,
                    startingBalance: start,
                    realization: real,
                    payment: pay,
                    endingBalance: end,
                    date: ''
                });
            }
        }
    });

    if (items.length === 0) {
        alert('❌ Введите данные хотя бы в одну строку.');
        return;
    }

    const recon = {
        id: reconId || generateId(),
        number,
        date,
        clientId,
        periodFrom,
        periodTo,
        items
    };
    
    const validationErrors = validateReconciliation(recon);
    if (validationErrors.length > 0) {
        alert('❌ Ошибки при сохранении:\n' + validationErrors.join('\n'));
        return;
    }
    
    Storage.saveReconciliation(recon);
    closeReconciliationModal();
    renderReconciliations();
    alert('✅ Акт сверки сохранён');
}

function closeReconciliationModal() {
    document.getElementById('reconciliation-modal').classList.remove('show');
}

function showReconciliationForm() {
    document.getElementById('reconciliation-modal-title').textContent = 'Новый акт сверки';
    document.getElementById('reconciliation-id').value = '';
    document.getElementById('reconciliation-number').value = '';
    loadReconClients();
    document.getElementById('reconciliation-items-body').innerHTML = '';
    const oldTotal = document.getElementById('recon-total-row');
    if (oldTotal) oldTotal.remove();
    document.getElementById('reconciliation-final-balance').textContent = '0 UZS';
    const dateField = document.getElementById('reconciliation-date');
    if (dateField.setISODate) dateField.setISODate(getCurrentDate());
    else dateField.value = getCurrentDate();
    const periodFrom = document.getElementById('reconciliation-period-from');
    const periodTo = document.getElementById('reconciliation-period-to');
    if (periodFrom.setISODate) periodFrom.setISODate('');
    else periodFrom.value = '';
    if (periodTo.setISODate) periodTo.setISODate('');
    else periodTo.value = '';
    document.getElementById('reconciliation-modal').classList.add('show');
}

// Редактирование существующего акта
function editReconciliation(id) {
    const recon = Storage.getReconciliation(id);
    if (!recon) return;
    document.getElementById('reconciliation-modal-title').textContent = 'Редактировать акт сверки';
    document.getElementById('reconciliation-id').value = recon.id;
    document.getElementById('reconciliation-number').value = recon.number;
    loadReconClients();
    document.getElementById('reconciliation-client').value = recon.clientId;

    const dateField = document.getElementById('reconciliation-date');
    if (dateField.setISODate) dateField.setISODate(recon.date);
    else dateField.value = recon.date;

    const periodFrom = document.getElementById('reconciliation-period-from');
    const periodTo = document.getElementById('reconciliation-period-to');
    if (periodFrom.setISODate) periodFrom.setISODate(recon.periodFrom);
    else periodFrom.value = recon.periodFrom;
    if (periodTo.setISODate) periodTo.setISODate(recon.periodTo);
    else periodTo.value = recon.periodTo;

    const tbody = document.getElementById('reconciliation-items-body');
    tbody.innerHTML = '';
    recon.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="recon-input" value="${escapeHtml(item.document || '')}" style="text-align:left;"></td>
            <td><input type="text" class="recon-input" value="${item.startingBalance === 0 ? '' : item.startingBalance}" data-field="startingBalance" oninput="updateRowCalc(this)"></td>
            <td><input type="text" class="recon-input" value="${item.realization === 0 ? '' : item.realization}" data-field="realization" oninput="updateRowCalc(this)"></td>
            <td><input type="text" class="recon-input" value="${item.payment === 0 ? '' : item.payment}" data-field="payment" oninput="updateRowCalc(this)"></td>
            <td><input type="text" class="recon-input" value="${item.endingBalance === 0 ? '' : item.endingBalance}" data-field="endingBalance" readonly></td>
        `;
        tbody.appendChild(row);
        row.querySelectorAll('.recon-input').forEach(inp => {
            inp.style.border = 'none';
            inp.style.background = 'transparent';
            inp.style.width = '100%';
            inp.style.textAlign = 'right';
            inp.style.fontSize = '12px';
            inp.style.padding = '5px';
            if (inp.style.textAlign === 'left') inp.style.fontWeight = 'normal';
        });
    });

    const oldTotal = document.getElementById('recon-total-row');
    if (oldTotal) oldTotal.remove();
    ensureTotalRow(tbody);
    updateTotalRow();

    const finalBal = recon.items.length ? recon.items[recon.items.length-1].endingBalance : 0;
    document.getElementById('reconciliation-final-balance').textContent = formatCurrency(finalBal);
    document.getElementById('reconciliation-modal').classList.add('show');
}

// Удаление акта
function deleteReconciliation(id) {
    if (confirm('Переместить акт сверки в корзину?')) {
        Storage.deleteReconciliation(id);
        renderReconciliations();
    }
}

// Отрисовка списка актов
function renderReconciliations() {
    const recons = Storage.getReconciliations();
    const tbody = document.getElementById('reconciliations-table-body');
    tbody.innerHTML = recons.map(r => {
        const client = Storage.getClient(r.clientId);
        const finalBalance = r.items.length ? r.items[r.items.length-1].endingBalance : 0;
        return `<tr onclick="showReconciliationDetail('${r.id}')" style="cursor:pointer;">
            <td><strong>${escapeHtml(r.number)}</strong></td>
            <td>${formatDate(r.date)}</td>
            <td>${escapeHtml(client ? client.name : '')}</td>
            <td>${formatDate(r.periodFrom)} — ${formatDate(r.periodTo)}</td>
            <td>${formatCurrency(finalBalance)}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); generateReconciliationPDF('${r.id}')">📄</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editReconciliation('${r.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteReconciliation('${r.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

// Детальный просмотр (только чтение, без редактирования)
function showReconciliationDetail(reconId) {
    const recon = Storage.getReconciliation(reconId);
    if (!recon) return;
    const client = Storage.getClient(recon.clientId);
    const finalBalance = recon.items.length ? recon.items[recon.items.length-1].endingBalance : 0;

    let html = `<div class="detail-section">`;
    html += `<h3>Акт сверки №${escapeHtml(recon.number)}</h3>`;
    html += `<p><strong>Клиент:</strong> ${escapeHtml(client?.name || '')}</p>`;
    html += `<p><strong>Период:</strong> ${formatDate(recon.periodFrom)} — ${formatDate(recon.periodTo)}</p>`;
    html += `<h4>Движение по счёту</h4>`;
    html += `<table class="items-table"><thead><tr>
                <th>Наименование</th><th>Начальный остаток</th><th>Реализация</th><th>Оплата</th><th>Конечный остаток</th>
            </tr></thead><tbody>`;

    recon.items.forEach(item => {
        html += `<tr>
            <td>${escapeHtml(item.document || '')}</td>
            <td>${item.startingBalance === 0 ? '' : formatNumberOrDash(item.startingBalance)}</td>
            <td>${item.realization === 0 ? '' : formatNumberOrDash(item.realization)}</td>
            <td>${item.payment === 0 ? '' : formatNumberOrDash(item.payment)}</td>
            <td>${item.endingBalance === 0 ? '' : formatNumberOrDash(item.endingBalance)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    html += `<p style="font-weight:bold; margin-top:10px;">Конечный остаток: ${finalBalance === 0 ? '-' : formatNumberOrDash(finalBalance)}</p>`;
    html += `</div>`;

    document.getElementById('detail-title').textContent = `Акт сверки №${recon.number}`;
    document.getElementById('detail-body').innerHTML = html;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('show');
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await Storage.init();
    initDateFields();
    renderReconciliations();
    document.getElementById('reconciliation-modal').addEventListener('click', function(e) {
        if (e.target === this) closeReconciliationModal();
    });
    const detailModal = document.getElementById('detail-modal');
    if (detailModal) {
        detailModal.addEventListener('click', function(e) {
            if (e.target === this) closeDetailModal();
        });
    }
});