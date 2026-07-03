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
    if (!Number.isFinite(htmlContent?.length) && typeof htmlContent !== 'string') {
        console.error('Invalid HTML content');
        alert('❌ Ошибка: некорректное содержимое документа');
        return;
    }
    
    const preview = document.getElementById('pdf-preview');
    if (!preview) {
        console.error('PDF preview element not found');
        alert('❌ Ошибка: элемент предпросмотра не найден');
        return;
    }
    
    preview.innerHTML = htmlContent;
    preview.style.display = 'block';
    const opt = {
        margin: [8, 8, 8, 8],
        filename: filename + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        html2pdf().set(opt).from(preview).save().then(() => {
            preview.style.display = 'none';
            // Очистка памяти после использования
            preview.innerHTML = '';
        }).catch(err => {
            console.error('PDF generation error:', err);
            alert('❌ Ошибка при генерации PDF: ' + err.message);
            preview.style.display = 'none';
            preview.innerHTML = '';
        });
    } catch (err) {
        console.error('PDF error:', err);
        alert('❌ Ошибка при сохранении PDF: ' + err.message);
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

// ====== ЗАКАЗ НА ПРОИЗВОДСТВО ======
function generateOrderPDF(orderIdParam) {
    let orderId = orderIdParam;
    if (!orderId) { orderId = document.getElementById('order-id')?.value; }
    if (!orderId) return alert('Не найден ID заказа');
    const order = Storage.getOrder(orderId);
    if (!order) return alert('Заказ не найден');
    const client = Storage.getClient(order.clientId);

    // Функция суммы прописью (обработка до миллиардов)
    function numberToWordsRus(n) {
        const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        if (n === 0) return 'ноль';
        let w = '';
        if (n >= 1000000000) { w += numberToWordsRus(Math.floor(n/1000000000)) + ' миллиард '; n %= 1000000000; }
        if (n >= 1000000) { w += numberToWordsRus(Math.floor(n/1000000)) + ' миллион '; n %= 1000000; }
        if (n >= 1000) { w += numberToWordsRus(Math.floor(n/1000)) + ' тысяча '; n %= 1000; }
        if (n >= 100) { w += hundreds[Math.floor(n/100)] + ' '; n %= 100; }
        if (n >= 20) { w += tens[Math.floor(n/10)] + ' '; n %= 10; }
        if (n >= 10) { w += teens[n-10]; return w.trim(); }
        if (n > 0) { w += ones[n]; }
        return w.trim();
    }

    const total = (order.items || []).reduce((s, i) => s + (i.total || i.cost || 0), 0);
    const ndsTotal = (order.items || []).reduce((s, i) => s + (i.ndsAmount || 0), 0);
    const discountPercent = order.manualDiscountPercent || 0;
    const discountAmount = total * discountPercent / 100;
    const finalTotal = total + ndsTotal - discountAmount;

    const itemsHtml = order.items.map((item, i) => `
        <tr>
            <td style="border:1px solid #999; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #999; padding:5px;">${escapeHtml(item.name)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:center;">${escapeHtml(item.unit || '')}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">${formatNumber(item.price)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:center;">${item.quantity}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">${formatNumber(item.price * item.quantity)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">${formatNumber(item.ndsAmount || 0)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">${formatNumber(item.total || item.cost || 0)}</td>
        </tr>`).join('');

    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 13px; padding: 20px;">
        <h2 style="text-align:center;">Заказ покупателя № ${escapeHtml(order.number)} от «${new Date(order.date).getDate()}» ${new Date(order.date).toLocaleString('ru', {month:'long'})} ${new Date(order.date).getFullYear()} г.</h2>
        <table style="width:100%; margin-bottom:20px;">
            <tr><td><strong>Продавец:</strong> "PROFITPRINT2024" MChJ, ИНН 1234567890</td></tr>
            <tr><td><strong>Покупатель:</strong> ${escapeHtml(client?.name || '')}, ИНН ${escapeHtml(client?.inn || 'не указан')}</td></tr>
            <tr><td><strong>Адрес покупателя:</strong> ${escapeHtml(client?.address || '')}</td></tr>
            <tr><td><strong>Операция:</strong> ${escapeHtml(order.operation || 'Заказ на продажу')} | <strong>Отгрузка:</strong> ${formatDate(order.shipmentDate)}</td></tr>
        </table>
        <table style="width:100%; border-collapse:collapse;">
            <thead><tr>
                <th style="border:1px solid #999; padding:6px;">№</th>
                <th style="border:1px solid #999; padding:6px;">Товар</th>
                <th style="border:1px solid #999; padding:6px;">Ед.</th>
                <th style="border:1px solid #999; padding:6px;">Цена</th>
                <th style="border:1px solid #999; padding:6px;">Кол-во</th>
                <th style="border:1px solid #999; padding:6px;">Сумма</th>
                <th style="border:1px solid #999; padding:6px;">НДС</th>
                <th style="border:1px solid #999; padding:6px;">Всего</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <p style="margin-top:20px;">
            ${discountPercent ? `<b>Скидка:</b> ${discountPercent}% (${formatNumber(discountAmount)} ₽)<br>` : ''}
            <b>НДС:</b> ${formatNumber(ndsTotal)} ₽<br>
            <b>Итого:</b> ${formatNumber(finalTotal)} ₽
        </p>
        <p>Всего отпущено: ${order.items.length} наименований</p>
        <p>На сумму: ${numberToWordsRus(Math.floor(finalTotal))} руб. ${String(finalTotal % 1).substring(2,4)} коп.</p>
        ${order.comment ? `<p><b>Комментарий:</b> ${escapeHtml(order.comment)}</p>` : ''}
        <br/><br/>
        <table style="width:100%; margin-top:40px;">
            <tr><td>Отпуск разрешил</td><td>__________________</td><td>__________________</td><td>__________________</td></tr>
            <tr><td>Отпустил</td><td>__________________</td><td>__________________</td><td>__________________</td></tr>
            <tr><td>Получил</td><td>__________________</td><td>__________________</td><td>__________________</td></tr>
            <tr><td></td><td style="text-align:center;">(подпись)</td><td style="text-align:center;">(должность)</td><td style="text-align:center;">(Фамилия И. О.)</td></tr>
        </table>
    </div>`;
    generatePDF(html, `Заказ_${order.number}`);
}

// ====== НАКЛАДНАЯ ======
function generateInvoicePDF(invoiceIdParam) {
    let invoiceId = invoiceIdParam;
    if (!invoiceId) { invoiceId = document.getElementById('invoice-id')?.value; }
    if (!invoiceId) return alert('Не найден ID накладной');
    const invoice = Storage.getInvoice(invoiceId);
    if (!invoice) return alert('Накладная не найдена');

    // Функция суммы прописью (для примера – упрощённая, можно расширить)
    function numberToWords(n) {
        const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        if (n === 0) return 'ноль';
        let w = '';
        if (n >= 1000) { w += ones[Math.floor(n/1000)] + ' тысяча '; n %= 1000; }
        if (n >= 100) { w += hundreds[Math.floor(n/100)] + ' '; n %= 100; }
        if (n >= 20) { w += tens[Math.floor(n/10)] + ' '; n %= 10; }
        if (n >= 10) { w += teens[n-10]; return w.trim(); }
        if (n > 0) { w += ones[n]; }
        return w.trim();
    }

    const itemsHtml = invoice.items.map((item, i) => `
        <tr>
            <td style="border:1px solid #999; padding:5px; text-align:center;">${i+1}</td>
            <td style="border:1px solid #999; padding:5px;">${escapeHtml(item.name)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:center;">${escapeHtml(item.unit || '')}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">${formatNumber(item.price)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:center;">${item.quantity}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">${formatNumber(item.cost)}</td>
        </tr>`).join('');

    const total = invoice.items.reduce((sum, item) => sum + item.cost, 0);
    const ndsRate = invoice.ndsRate || 0;
    const ndsAmount = total * ndsRate / 100;

    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 13px; padding: 20px;">
        <h2 style="text-align:center;">Накладная № ${escapeHtml(invoice.number)} от «${new Date(invoice.date).getDate()}» ${new Date(invoice.date).toLocaleString('ru', {month:'long'})} ${new Date(invoice.date).getFullYear()} г.</h2>
        <table style="width:100%; margin-bottom:20px;">
            <tr><td><strong>Продавец:</strong> ${escapeHtml(invoice.sellerName || '')}, ИНН ${escapeHtml(invoice.sellerInn || '')}</td></tr>
            <tr><td><strong>Адрес продавца:</strong> ${escapeHtml(invoice.sellerAddress || '')}</td></tr>
            <tr><td><strong>Покупатель:</strong> ${escapeHtml(invoice.buyerName || '')}, ИНН ${escapeHtml(invoice.buyerInn || '')}</td></tr>
            <tr><td><strong>Адрес покупателя:</strong> ${escapeHtml(invoice.buyerAddress || '')}</td></tr>
            <tr><td><strong>Основание для отпуска:</strong> ${escapeHtml(invoice.basis || '')}</td></tr>
        </table>
        <table style="width:100%; border-collapse:collapse;">
            <thead><tr>
                <th style="border:1px solid #999; padding:6px;">№</th>
                <th style="border:1px solid #999; padding:6px;">Товар</th>
                <th style="border:1px solid #999; padding:6px;">Ед.</th>
                <th style="border:1px solid #999; padding:6px;">Цена</th>
                <th style="border:1px solid #999; padding:6px;">Кол-во</th>
                <th style="border:1px solid #999; padding:6px;">Сумма</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <p style="margin-top:20px;"><strong>В том числе НДС ${ndsRate}%:</strong> ${formatNumber(ndsAmount)} ₽</p>
        <p><strong>Итого:</strong> ${formatNumber(total)} ₽</p>
        <p>Всего отпущено: ${invoice.items.length} наименований</p>
        <p>На сумму: ${numberToWords(Math.floor(total))} руб. ${String(total % 1).substring(2,4)} коп.</p>
        <p>в том числе НДС ${ndsRate}% ${numberToWords(Math.floor(ndsAmount))} руб. ${String(ndsAmount % 1).substring(2,4)} коп.</p>
        <br/><br/>
        <table style="width:100%; margin-top:40px;">
            <tr>
                <td>Отпуск разрешил</td>
                <td>__________________</td>
                <td>__________________</td>
                <td>__________________</td>
            </tr>
            <tr>
                <td>Отпустил</td>
                <td>__________________</td>
                <td>__________________</td>
                <td>__________________</td>
            </tr>
            <tr>
                <td>Получил</td>
                <td>__________________</td>
                <td>__________________</td>
                <td>__________________</td>
            </tr>
            <tr>
                <td></td>
                <td style="text-align:center;">(подпись)</td>
                <td style="text-align:center;">(должность)</td>
                <td style="text-align:center;">(Фамилия И. О.)</td>
            </tr>
        </table>
    </div>`;
    generatePDF(html, `Накладная_${invoice.number}`);
}


// ====== АКТ СВЕРКИ ======
function generateReconciliationPDF(reconIdParam) {
    let reconId = reconIdParam;
    if (!reconId) { reconId = document.getElementById('reconciliation-id')?.value; }
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