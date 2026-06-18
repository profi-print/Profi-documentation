function getDocumentHeader(title) {
    return `
    <div style="font-family: Arial, sans-serif; padding: 8px; border-bottom: 3px solid #003087;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 130px; vertical-align: middle;">
                    <div style="font-size: 30px; font-weight: 900; color: #e60000; line-height: 1;">PROFI</div>
                    <div style="font-size: 16px; font-weight: 700; color: #e60000; line-height: 1;">PRINT</div>
                </td>
                <td style="vertical-align: top; padding-left: 12px;">
                    <div style="font-size: 16px; font-weight: bold; color: #000;">"PROFITPRINT2024" MChJ</div>
                    <div style="font-size: 11px; color: #000;">Наманган шаҳар, Меҳнатобод МФЙ,</div>
                    <div style="font-size: 11px; color: #000;">Бохористон, 3 уй.</div>
                    <div style="font-size: 11px; color: #000;">(+998) (88) 050-70-05</div>
                    <div style="font-size: 11px; color: #000;">(+998) (90) 218-29-29</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 16px; font-weight: bold; color: #003087;">${title}</div>
                </td>
            </tr>
        </table>
    </div>`;
}

function formatNumber(num) {
    const n = parseFloat(num) || 0;
    if (n === 0) return '-';
    return n.toLocaleString('ru-RU');
}

function generatePDF(htmlContent, filename) {
    const preview = document.getElementById('pdf-preview');
    preview.innerHTML = htmlContent;
    preview.style.display = 'block';

    const opt = {
        margin: [8, 8, 8, 8],
        filename: filename + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(preview).save().then(() => {
        preview.style.display = 'none';
    });
}

// ====== ЗАКАЗ НА ПРОИЗВОДСТВО ======
function generateOrderPDF(orderIdParam) {
    let orderId = orderIdParam;
    if (!orderId) {
        orderId = document.getElementById('order-id')?.value;
    }
    if (!orderId) return alert('Не найден ID заказа');

    const order = Storage.getOrder(orderId);
    if (!order) return alert('Заказ не найден');

    const client = Storage.getClient(order.clientId);
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="border: 1px solid #999; padding: 5px; font-size: 12px;">${escapeHtml(item.sku || '')}</td>
            <td style="border: 1px solid #999; padding: 5px; font-size: 12px;">${escapeHtml(item.name)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.quantityProduced}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${formatNumber(item.price)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${formatNumber(item.cost)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.quantityOrdered}</td>
        </tr>`).join('');

    const total = order.items.reduce((sum, item) => sum + item.cost, 0);

    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 13px;">
        ${getDocumentHeader('Заказ на производство')}
        <table style="width: 100%; margin-top: 12px; font-size: 13px;">
            <tr>
                <td style="width: 50%;"><strong>Номер заказа:</strong> №${escapeHtml(order.number)}</td>
                <td style="width: 50%;"><strong>Дата заказа:</strong> ${formatDate(order.date)}</td>
            </tr>
            <tr>
                <td><strong>Дата завершения заказа:</strong> ${formatDate(order.completionDate)}</td>
                <td><strong>Заказчик:</strong> ${escapeHtml(client?.contact || '')}<br>${escapeHtml(client?.name || '')}<br>${escapeHtml(client?.phone || '')}</td>
            </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Артикул</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Наименование</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Кол-во произв</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Цена</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Стоимость</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Количество заказано</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
                <tr>
                    <td colspan="5" style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold;">ИТОГО:</td>
                    <td style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold;">${formatNumber(total)}</td>
                </tr>
            </tfoot>
        </table>
    </div>`;
    generatePDF(html, `Заказ_${order.number}`);
}

// ====== НАКЛАДНАЯ ======
function generateInvoicePDF(invoiceIdParam) {
    let invoiceId = invoiceIdParam;
    if (!invoiceId) {
        invoiceId = document.getElementById('invoice-id')?.value;
    }
    if (!invoiceId) return alert('Не найден ID накладной');

    const invoice = Storage.getInvoice(invoiceId);
    if (!invoice) return alert('Накладная не найдена');

    const client = Storage.getClient(invoice.clientId);
    const itemsHtml = invoice.items.map(item => `
        <tr>
            <td style="border: 1px solid #999; padding: 5px; font-size: 12px;">${escapeHtml(item.sku || '')}</td>
            <td style="border: 1px solid #999; padding: 5px; font-size: 12px;">${escapeHtml(item.name)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.quantity}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${formatNumber(item.price)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${formatNumber(item.cost)}</td>
        </tr>`).join('');

    const total = invoice.items.reduce((sum, item) => sum + item.cost, 0);
    // Итого показываем только если позиций больше одной
    const tfootHtml = invoice.items.length > 1 ? `
        <tfoot>
            <tr>
                <td colspan="4" style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold;">ИТОГО:</td>
                <td style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold;">${formatNumber(total)}</td>
            </tr>
        </tfoot>` : '';

    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 13px;">
        ${getDocumentHeader('Накладной')}
        <table style="width: 100%; margin-top: 12px;">
            <tr>
                <td><strong>Номер Накладной:</strong> №${escapeHtml(invoice.number)}</td>
                <td><strong>Дата отгрузки:</strong> ${formatDate(invoice.date)}</td>
            </tr>
            <tr>
                <td colspan="2"><strong>Заказчик:</strong> ${escapeHtml(client?.contact || '')} ${escapeHtml(client?.name || '')} ${escapeHtml(client?.phone || '')}</td>
            </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Артикул</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Наименование</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Кол-во</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Цена</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Стоимость</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            ${tfootHtml}
        </table>
    </div>`;
    generatePDF(html, `Накладная_${invoice.number}`);
}

// ====== АКТ СВЕРКИ ======
function generateReconciliationPDF(reconIdParam) {
    let reconId = reconIdParam;
    if (!reconId) {
        reconId = document.getElementById('reconciliation-id')?.value;
    }
    if (!reconId) return alert('Не найден ID акта сверки');

    const recon = Storage.getReconciliation(reconId);
    if (!recon) return alert('Акт сверки не найден');

    const client = Storage.getClient(recon.clientId);
    const rowsHtml = recon.items.map(item => {
        const docName = item.document || '';
        const displayDate = (item.document !== 'Начальный остаток' && item.date) ? ' от ' + formatDate(item.date) : '';
        return `
        <tr>
            <td style="border: 1px solid #999; padding: 5px; font-size: 12px;">${escapeHtml(docName)}${displayDate}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.startingBalance === 0 ? '-' : formatNumber(item.startingBalance)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.realization === 0 ? '-' : formatNumber(item.realization)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.payment === 0 ? '-' : formatNumber(item.payment)}</td>
            <td style="border: 1px solid #999; padding: 5px; text-align: right; font-size: 12px;">${item.endingBalance === 0 ? '-' : formatNumber(item.endingBalance)}</td>
        </tr>`;
    }).join('');

    const finalBalance = recon.items.length ? recon.items[recon.items.length-1].endingBalance : 0;

    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 13px;">
        ${getDocumentHeader('Акт сверка')}
        <table style="width: 100%; margin-top: 12px;">
            <tr>
                <td><strong>Заказчик:</strong> ${escapeHtml(client?.contact || '')} ${escapeHtml(client?.name || '')}<br>${escapeHtml(client?.address || '')}<br>${escapeHtml(client?.phone || '')}</td>
                <td style="text-align: right;"><strong>Период:</strong> ${formatDate(recon.periodFrom)} — ${formatDate(recon.periodTo)}</td>
            </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Наименование</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Начальный остаток</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Реализация</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Оплата</th>
                    <th style="border: 1px solid #999; padding: 6px; color: #003087; font-weight: bold; text-align: center; font-size: 12px;">Конечный остаток</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
                <tr>
                    <td colspan="4" style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold;">КОНЕЧНЫЙ ОСТАТОК:</td>
                    <td style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold;">${finalBalance === 0 ? '-' : formatNumber(finalBalance)}</td>
                </tr>
            </tfoot>
        </table>
    </div>`;
    generatePDF(html, `АктСверки_${recon.number}`);
}