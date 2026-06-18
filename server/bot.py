import os
import pdfkit
from datetime import datetime
from io import BytesIO
from pymongo import MongoClient
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
MONGODB_URI = os.getenv("MONGODB_URI")

client = MongoClient(MONGODB_URI)
db = client['profitprint']
clients_col = db.clients
products_col = db.products
orders_col = db.orders
invoices_col = db.invoices
payments_col = db.payments
reconciliations_col = db.reconciliations

WKHTMLTOPDF_PATH = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
pdf_config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH) if os.path.exists(WKHTMLTOPDF_PATH) else None

def format_currency(amount):
    if amount == 0:
        return "-"
    return f"{amount:,.0f} UZS".replace(",", " ")

def format_or_dash(value):
    if value == 0:
        return "-"
    return format_currency(value)

def format_date(iso_str):
    if not iso_str:
        return ""
    try:
        d = datetime.strptime(iso_str, "%Y-%m-%d")
        return d.strftime("%d.%m.%Y")
    except:
        return ""

def escape_html(text):
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def get_client_name(cid):
    c = clients_col.find_one({"id": cid})
    if c:
        return c.get("name",""), c.get("contact",""), c.get("phone",""), c.get("address","")
    return "","","",""

def safe_get_date(item):
    if 'date' in item and item['date']:
        d = format_date(item['date'])
        if d:
            return d
    doc = item.get('document','')
    import re
    match = re.search(r'(\d{2}\.\d{2}\.\d{4})$', doc)
    if match:
        return match.group(1)
    return ""

def get_header(title):
    return f"""
    <div style="font-family: Arial, sans-serif; padding: 8px; border-bottom: 3px solid #003087;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 130px; vertical-align: middle;">
                    <div style="font-size: 30px; font-weight: 900; color: #e60000; line-height: 1;">PROFI</div>
                    <div style="font-size: 16px; font-weight: 700; color: #e60000;">PRINT</div>
                </td>
                <td style="vertical-align: top; padding-left: 12px;">
                    <div style="font-size: 16px; font-weight: bold; color: #000;">"PROFITPRINT2024" MChJ</div>
                    <div style="font-size: 11px; color: #000;">Наманган шаҳар, Меҳнатобод МФЙ,</div>
                    <div style="font-size: 11px; color: #000;">Бохористон, 3 уй.</div>
                    <div style="font-size: 11px; color: #000;">(+998) (88) 050-70-05</div>
                    <div style="font-size: 11px; color: #000;">(+998) (90) 218-29-29</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div style="font-size: 16px; font-weight: bold; color: #003087;">{title}</div>
                </td>
            </tr>
        </table>
    </div>"""

def order_html(order, client_name, client_contact, client_phone):
    items_rows = ""
    for item in order["items"]:
        unit = item.get('unit', 'шт')
        items_rows += f"""
        <tr>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{escape_html(item.get('sku',''))}</td>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{escape_html(item['name'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{escape_html(unit)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{item.get('quantityProduced',0)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item.get('price',0))}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item.get('cost',0))}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{item.get('quantityOrdered',0)}</td>
        </tr>"""
    total = sum(i.get('cost',0) for i in order["items"])
    return f"""<html><head><meta charset="UTF-8"></head><body style="font-family: 'DejaVu Sans', Arial, sans-serif; font-size:13px;">
    {get_header('Заказ на производство')}
    <table style="width:100%; margin-top:12px;">
        <tr><td><b>Номер заказа:</b> №{escape_html(order['number'])}</td><td><b>Дата заказа:</b> {format_date(order['date'])}</td></tr>
        <tr><td><b>Дата завершения:</b> {format_date(order.get('completionDate',''))}</td><td><b>Заказчик:</b> {escape_html(client_contact)}<br>{escape_html(client_name)}<br>{escape_html(client_phone)}</td></tr>
    </table>
    <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <thead><tr>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Артикул</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Наименование</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Ед.</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Кол-во произв</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Цена</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Стоимость</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Кол-во заказано</th>
        </tr></thead>
        <tbody>{items_rows}</tbody>
        <tfoot><tr>
            <td colspan="6" style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">ИТОГО:</td>
            <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_currency(total)}</td>
        </tr></tfoot>
    </table></body></html>"""

def invoice_html(invoice, client_name, client_contact, client_phone):
    items_rows = ""
    for item in invoice["items"]:
        unit = item.get('unit', 'шт')
        items_rows += f"""
        <tr>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{escape_html(item.get('sku',''))}</td>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{escape_html(item['name'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{escape_html(unit)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{item.get('quantity',0)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item.get('price',0))}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item.get('cost',0))}</td>
        </tr>"""
    total = sum(i.get('cost',0) for i in invoice["items"])
    return f"""<html><head><meta charset="UTF-8"></head><body style="font-family: 'DejaVu Sans', Arial, sans-serif; font-size:13px;">
    {get_header('Накладной')}
    <table style="width:100%; margin-top:12px;">
        <tr><td><b>Номер Накладной:</b> №{escape_html(invoice['number'])}</td><td><b>Дата отгрузки:</b> {format_date(invoice['date'])}</td></tr>
        <tr><td colspan="2"><b>Заказчик:</b> {escape_html(client_contact)} {escape_html(client_name)} {escape_html(client_phone)}</td></tr>
    </table>
    <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <thead><tr>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Артикул</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Наименование</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Ед.</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Кол-во</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Цена</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Стоимость</th>
        </tr></thead>
        <tbody>{items_rows}</tbody>
        <tfoot><tr>
            <td colspan="5" style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">ИТОГО:</td>
            <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_currency(total)}</td>
        </tr></tfoot>
    </table></body></html>"""

def reconciliation_html(rec, client_name, client_contact, client_phone, client_address):
    rows_html = ""
    for item in rec["items"]:
        display_date = safe_get_date(item)
        doc_display = escape_html(item['document'])
        if item['document'] != 'Начальный остаток' and display_date:
            doc_display += f" от {display_date}"
        rows_html += f"""
        <tr>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{doc_display}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_or_dash(item['startingBalance'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_or_dash(item['realization'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_or_dash(item['payment'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_or_dash(item['endingBalance'])}</td>
        </tr>"""
    
    # Итоговые значения
    if rec["items"]:
        last_item = rec["items"][-1]
        total_starting = rec["items"][0]['startingBalance']  # начальный остаток первой строки (ИТОГО начальный)
        total_realization = sum(i['realization'] for i in rec['items'])
        total_payment = sum(i['payment'] for i in rec['items'])
        total_ending = last_item['endingBalance']
    else:
        total_starting = total_realization = total_payment = total_ending = 0

    return f"""<html><head><meta charset="UTF-8"></head><body style="font-family: 'DejaVu Sans', Arial, sans-serif; font-size:13px;">
    {get_header('Акт сверка')}
    <table style="width:100%; margin-top:12px;">
        <tr>
            <td>
                <b>Заказчик:</b> {escape_html(client_contact)}<br>
                {escape_html(client_name)}<br>
                {escape_html(client_address)}<br>
                {escape_html(client_phone)}
            </td>
            <td style="text-align:right;">
                <b>Период:</b> {format_date(rec['periodFrom'])} — {format_date(rec['periodTo'])}
            </td>
        </tr>
    </table>
    <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <thead><tr>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Наименование</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Начальный остаток</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Реализация</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Оплата</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Конечный остаток</th>
        </tr></thead>
        <tbody>{rows_html}</tbody>
        <tfoot>
            <tr>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">ИТОГО</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_or_dash(total_starting)}</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_or_dash(total_realization)}</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_or_dash(total_payment)}</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_or_dash(total_ending)}</td>
            </tr>
        </tfoot>
    </table></body></html>"""

def html_to_pdf(html_string):
    return pdfkit.from_string(html_string, False, configuration=pdf_config)

def main_menu_keyboard():
    keyboard = [
        [InlineKeyboardButton("📋 Заказы", callback_data="list_orders")],
        [InlineKeyboardButton("📦 Накладные", callback_data="list_invoices")],
        [InlineKeyboardButton("📑 Акты сверки", callback_data="list_reconciliations")],
        [InlineKeyboardButton("❓ Справка", callback_data="help")],
    ]
    return InlineKeyboardMarkup(keyboard)

def back_button(callback_data="main"):
    return InlineKeyboardMarkup([[InlineKeyboardButton("↩️ Назад", callback_data=callback_data)]])

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    cnt = orders_col.count_documents({}) + invoices_col.count_documents({}) + reconciliations_col.count_documents({})
    if cnt == 0:
        await update.message.reply_text("👋 *ProfitPrint Bot*\n\nДанные пока не загружены.", parse_mode="Markdown", reply_markup=main_menu_keyboard())
    else:
        await update.message.reply_text("👋 *ProfitPrint Bot*\nВыберите тип документа:", parse_mode="Markdown", reply_markup=main_menu_keyboard())

async def list_docs(update: Update, context: ContextTypes.DEFAULT_TYPE, doc_type: str):
    query = update.callback_query
    items = []
    title = ""
    if doc_type == "orders":
        items = list(orders_col.find().sort("date", -1))
        title = "📋 Заказы"
    elif doc_type == "invoices":
        items = list(invoices_col.find().sort("date", -1))
        title = "📦 Накладные"
    elif doc_type == "reconciliations":
        items = list(reconciliations_col.find().sort("date", -1))
        title = "📑 Акты сверки"
    if not items:
        await query.edit_message_text(f"{title}\n\nНет документов.", reply_markup=back_button())
        return
    keyboard = []
    for item in items:
        keyboard.append([InlineKeyboardButton(item["number"], callback_data=f"detail|{doc_type[:-1]}|{item['id']}")])
    keyboard.append([InlineKeyboardButton("↩️ Назад", callback_data="main")])
    await query.edit_message_text(f"{title}\nВыберите номер:", reply_markup=InlineKeyboardMarkup(keyboard))

async def show_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, doc_type: str, doc_id: str):
    query = update.callback_query
    item = None
    if doc_type == "order":
        item = orders_col.find_one({"id": doc_id})
    elif doc_type == "invoice":
        item = invoices_col.find_one({"id": doc_id})
    elif doc_type == "reconciliation":
        item = reconciliations_col.find_one({"id": doc_id})
    if not item:
        await query.edit_message_text("Документ не найден.", reply_markup=back_button())
        return
    if doc_type == "order":
        client_name, client_contact, _, _ = get_client_name(item["clientId"])
        total = sum(i.get('cost',0) for i in item["items"])
        msg = f"📋 *Заказ №{item['number']}*\nДата: {format_date(item['date'])}\nЗавершение: {format_date(item.get('completionDate',''))}\nКлиент: {client_name} ({client_contact})\nПозиций: {len(item['items'])}\nСумма: {format_currency(total)}"
        keyboard = [
            [InlineKeyboardButton("📄 Скачать PDF", callback_data=f"pdf|order|{doc_id}")],
            [InlineKeyboardButton("📋 Подробнее", callback_data=f"detail_text|order|{doc_id}")],
            [InlineKeyboardButton("↩️ Назад к списку", callback_data="list_orders")],
        ]
    elif doc_type == "invoice":
        client_name, _, _, _ = get_client_name(item["clientId"])
        total = sum(i.get('cost',0) for i in item["items"])
        msg = f"📦 *Накладная №{item['number']}*\nДата: {format_date(item['date'])}\nКлиент: {client_name}\nПозиций: {len(item['items'])}\nСумма: {format_currency(total)}"
        keyboard = [
            [InlineKeyboardButton("📄 Скачать PDF", callback_data=f"pdf|invoice|{doc_id}")],
            [InlineKeyboardButton("📋 Подробнее", callback_data=f"detail_text|invoice|{doc_id}")],
            [InlineKeyboardButton("↩️ Назад к списку", callback_data="list_invoices")],
        ]
    elif doc_type == "reconciliation":
        client_name, _, _, _ = get_client_name(item["clientId"])
        final_bal = item["items"][-1]['endingBalance'] if item["items"] else 0
        msg = f"📑 *Акт сверки №{item['number']}*\nКлиент: {client_name}\nПериод: {format_date(item['periodFrom'])} – {format_date(item['periodTo'])}\nКонечный остаток: {format_currency(final_bal)}"
        keyboard = [
            [InlineKeyboardButton("📄 Скачать PDF", callback_data=f"pdf|reconciliation|{doc_id}")],
            [InlineKeyboardButton("📋 Подробнее", callback_data=f"detail_text|reconciliation|{doc_id}")],
            [InlineKeyboardButton("↩️ Назад к списку", callback_data="list_reconciliations")],
        ]
    await query.edit_message_text(msg, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

async def detail_text(update: Update, context: ContextTypes.DEFAULT_TYPE, doc_type: str, doc_id: str):
    query = update.callback_query
    msg = ""
    if doc_type == "order":
        item = orders_col.find_one({"id": doc_id})
        if item:
            client_name, client_contact, _, _ = get_client_name(item["clientId"])
            total = sum(i.get('cost',0) for i in item["items"])
            msg = f"📋 *Заказ №{item['number']}*\nДата: {format_date(item['date'])}\nЗавершение: {format_date(item.get('completionDate',''))}\nКлиент: {client_name} ({client_contact})\n\n"
            for i, it in enumerate(item["items"], 1):
                msg += f"{i}. {it['name']} – {it.get('quantityProduced',0)} × {format_currency(it.get('price',0))} = {format_currency(it.get('cost',0))}\n"
            msg += f"\n*Сумма:* {format_currency(total)}"
    elif doc_type == "invoice":
        item = invoices_col.find_one({"id": doc_id})
        if item:
            client_name, _, _, _ = get_client_name(item["clientId"])
            total = sum(i.get('cost',0) for i in item["items"])
            msg = f"📦 *Накладная №{item['number']}*\nДата: {format_date(item['date'])}\nКлиент: {client_name}\n\n"
            for i, it in enumerate(item["items"], 1):
                msg += f"{i}. {it['name']} – {it.get('quantity',0)} × {format_currency(it.get('price',0))} = {format_currency(it.get('cost',0))}\n"
            msg += f"\n*Сумма:* {format_currency(total)}"
    elif doc_type == "reconciliation":
        item = reconciliations_col.find_one({"id": doc_id})
        if item:
            client_name, _, _, _ = get_client_name(item["clientId"])
            final_bal = item["items"][-1]['endingBalance'] if item["items"] else 0
            msg = f"📑 *Акт сверки №{item['number']}*\nКлиент: {client_name}\nПериод: {format_date(item['periodFrom'])} – {format_date(item['periodTo'])}\n\n"
            for it in item["items"]:
                display_date = safe_get_date(it)
                doc_str = it['document']
                if it['document'] != 'Начальный остаток' and display_date:
                    doc_str += f" от {display_date}"
                msg += f"{doc_str}: нач. {format_or_dash(it['startingBalance'])}, реал. {format_or_dash(it['realization'])}, опл. {format_or_dash(it['payment'])}, кон. {format_or_dash(it['endingBalance'])}\n"
            msg += f"\n*Конечный остаток:* {format_currency(final_bal)}"
    if msg:
        await query.edit_message_text(msg, parse_mode="Markdown", reply_markup=back_button(f"detail|{doc_type}|{doc_id}"))
    else:
        await query.edit_message_text("Документ не найден.", reply_markup=back_button())

async def send_pdf(update: Update, context: ContextTypes.DEFAULT_TYPE, doc_type: str, doc_id: str):
    query = update.callback_query
    pdf_bytes = None
    filename = "document.pdf"
    if doc_type == "order":
        item = orders_col.find_one({"id": doc_id})
        if item:
            client_name, client_contact, client_phone, _ = get_client_name(item["clientId"])
            html = order_html(item, client_name, client_contact, client_phone)
            pdf_bytes = html_to_pdf(html)
            filename = f"Заказ_{item['number']}.pdf"
    elif doc_type == "invoice":
        item = invoices_col.find_one({"id": doc_id})
        if item:
            client_name, client_contact, client_phone, _ = get_client_name(item["clientId"])
            html = invoice_html(item, client_name, client_contact, client_phone)
            pdf_bytes = html_to_pdf(html)
            filename = f"Накладная_{item['number']}.pdf"
    elif doc_type == "reconciliation":
        item = reconciliations_col.find_one({"id": doc_id})
        if item:
            client_name, client_contact, client_phone, client_address = get_client_name(item["clientId"])
            html = reconciliation_html(item, client_name, client_contact, client_phone, client_address)
            pdf_bytes = html_to_pdf(html)
            filename = f"АктСверки_{item['number']}.pdf"
    if pdf_bytes:
        await query.answer()
        await context.bot.send_document(chat_id=query.message.chat_id, document=BytesIO(pdf_bytes), filename=filename)
    else:
        await query.edit_message_text("Не удалось создать PDF.", reply_markup=back_button())

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data_str = query.data
    if data_str == "main":
        cnt = orders_col.count_documents({}) + invoices_col.count_documents({}) + reconciliations_col.count_documents({})
        msg = "👋 *ProfitPrint Bot*\nВыберите тип документа:" if cnt > 0 else "👋 *ProfitPrint Bot*\n\nДанные пока не загружены."
        await query.edit_message_text(msg, parse_mode="Markdown", reply_markup=main_menu_keyboard())
    elif data_str == "list_orders":
        await list_docs(update, context, "orders")
    elif data_str == "list_invoices":
        await list_docs(update, context, "invoices")
    elif data_str == "list_reconciliations":
        await list_docs(update, context, "reconciliations")
    elif data_str == "help":
        await query.edit_message_text("Команды бота:\n/start – главное меню\nИспользуйте кнопки для навигации.", reply_markup=back_button())
    elif data_str.startswith("detail|"):
        parts = data_str.split("|")
        if len(parts) == 3:
            doc_type = parts[1]
            doc_id = parts[2]
            await show_detail(update, context, doc_type, doc_id)
    elif data_str.startswith("detail_text|"):
        parts = data_str.split("|")
        if len(parts) == 3:
            doc_type = parts[1]
            doc_id = parts[2]
            await detail_text(update, context, doc_type, doc_id)
    elif data_str.startswith("pdf|"):
        parts = data_str.split("|")
        if len(parts) == 3:
            doc_type = parts[1]
            doc_id = parts[2]
            await send_pdf(update, context, doc_type, doc_id)

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_callback))
    print("Бот запущен...")
    app.run_polling()

if __name__ == "__main__":
    main()