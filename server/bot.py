import os
import re
import pdfkit
from datetime import datetime
from io import BytesIO
from pymongo import MongoClient
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    ContextTypes,
    filters
)
import base64

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
otpcex_col = db.otpcex
texkartas_col = db.texkartas
otpcex_reserve_col = db.otpcex_reserve

WKHTMLTOPDF_PATH = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
pdf_config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH) if os.path.exists(WKHTMLTOPDF_PATH) else None

# ---------- Вспомогательные функции ----------
def generate_id():
    import random, string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))

def format_currency(amount):
    if amount == 0:
        return "-"
    return f"{amount:,.0f}".replace(",", " ")

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
    match = re.search(r'(\d{2}\.\d{2}\.\d{4})$', doc)
    if match:
        return match.group(1)
    return ""

# ---------- HTML-шаблоны (без изменений) ----------
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
        items_rows += f"""
        <tr>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{escape_html(item.get('sku',''))}</td>
            <td style="border:1px solid #999; padding:5px; font-size:12px;">{escape_html(item['name'])}</td>
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
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Кол-во произв</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Цена</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Стоимость</th>
            <th style="border:1px solid #999; padding:6px; color:#003087; text-align:center;">Кол-во заказано</th>
        </tr></thead>
        <tbody>{items_rows}</tbody>
        <tfoot><tr>
            <td colspan="5" style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">ИТОГО:</td>
            <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_currency(total)}</td>
        </tr></tfoot>
    </table></body></html>"""

def invoice_html(invoice, client_name, client_contact, client_phone):
    items_rows = ""
    for i, item in enumerate(invoice["items"], 1):
        items_rows += f"""
        <tr>
            <td style="border:1px solid #999; padding:5px; text-align:center;">{i}</td>
            <td style="border:1px solid #999; padding:5px;">{escape_html(item['name'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:center;">{escape_html(item.get('unit',''))}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">{format_currency(item.get('price',0))}</td>
            <td style="border:1px solid #999; padding:5px; text-align:center;">{item.get('quantity',0)}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right;">{format_currency(item.get('cost',0))}</td>
        </tr>"""
    total = sum(i.get('cost',0) for i in invoice["items"])
    nds_rate = invoice.get('ndsRate', 0)
    nds_amount = total * nds_rate / 100

    def number_to_words_ru(n):
        # простая реализация для примера (можно расширить)
        ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
        teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
        tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
        hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']
        if n == 0: return 'ноль'
        w = ''
        if n >= 1000:
            w += ones[n//1000] + ' тысяча '
            n %= 1000
        if n >= 100:
            w += hundreds[n//100] + ' '
            n %= 100
        if n >= 20:
            w += tens[n//10] + ' '
            n %= 10
        if n >= 10:
            w += teens[n-10]
            return w.strip()
        if n > 0:
            w += ones[n]
        return w.strip()

    return f"""<html><head><meta charset="UTF-8"></head><body style="font-family: 'DejaVu Sans', Arial, sans-serif; font-size:13px; padding:20px;">
    <h2 style="text-align:center;">Накладная № {escape_html(invoice['number'])} от «{datetime.now().day}» {datetime.now().strftime('%B')} {datetime.now().year} г.</h2>
    <table style="width:100%; margin-bottom:20px;">
        <tr><td><b>Продавец:</b> {escape_html(invoice.get('sellerName',''))}, ИНН {escape_html(invoice.get('sellerInn',''))}</td></tr>
        <tr><td><b>Адрес продавца:</b> {escape_html(invoice.get('sellerAddress',''))}</td></tr>
        <tr><td><b>Покупатель:</b> {escape_html(invoice.get('buyerName',''))}, ИНН {escape_html(invoice.get('buyerInn',''))}</td></tr>
        <tr><td><b>Адрес покупателя:</b> {escape_html(invoice.get('buyerAddress',''))}</td></tr>
        <tr><td><b>Основание для отпуска:</b> {escape_html(invoice.get('basis',''))}</td></tr>
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
        <tbody>{items_rows}</tbody>
    </table>
    <p style="margin-top:20px;"><b>В том числе НДС {nds_rate}%:</b> {format_currency(nds_amount)} ₽</p>
    <p><b>Итого:</b> {format_currency(total)} ₽</p>
    <p>Всего отпущено: {len(invoice['items'])} наименований</p>
    <p>На сумму: {number_to_words_ru(int(total))} руб. {str(total % 1)[2:4]} коп.</p>
    <p>в том числе НДС {nds_rate}% {number_to_words_ru(int(nds_amount))} руб. {str(nds_amount % 1)[2:4]} коп.</p>
    <br/><br/>
    <table style="width:100%; margin-top:40px;">
        <tr><td>Отпуск разрешил</td><td>__________________</td><td>__________________</td><td>__________________</td></tr>
        <tr><td>Отпустил</td><td>__________________</td><td>__________________</td><td>__________________</td></tr>
        <tr><td>Получил</td><td>__________________</td><td>__________________</td><td>__________________</td></tr>
        <tr><td></td><td style="text-align:center;">(подпись)</td><td style="text-align:center;">(должность)</td><td style="text-align:center;">(Фамилия И. О.)</td></tr>
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
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item['startingBalance'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item['realization'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item['payment'])}</td>
            <td style="border:1px solid #999; padding:5px; text-align:right; font-size:12px;">{format_currency(item['endingBalance'])}</td>
        </tr>"""
    final_balance = rec["items"][-1]['endingBalance'] if rec["items"] else 0
    total_realization = sum(i['realization'] for i in rec['items'])
    total_payment = sum(i['payment'] for i in rec['items'])
    return f"""<html><head><meta charset="UTF-8"></head><body style="font-family: 'DejaVu Sans', Arial, sans-serif; font-size:13px;">
    {get_header('Акт сверка')}
    <table style="width:100%; margin-top:12px;">
        <tr><td><b>Заказчик:</b> {escape_html(client_contact)} {escape_html(client_name)}<br>{escape_html(client_address)}<br>{escape_html(client_phone)}</td><td style="text-align:right;"><b>Период:</b> {format_date(rec['periodFrom'])} — {format_date(rec['periodTo'])}</td></tr>
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
                <td colspan="4" style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">КОНЕЧНЫЙ ОСТАТОК:</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_currency(final_balance)}</td>
            </tr>
            <tr>
                <td colspan="4" style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">ИТОГО РЕАЛИЗАЦИЯ:</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_currency(total_realization)}</td>
            </tr>
            <tr>
                <td colspan="4" style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">ИТОГО ОПЛАТА:</td>
                <td style="border:1px solid #999; padding:6px; text-align:right; font-weight:bold;">{format_currency(total_payment)}</td>
            </tr>
        </tfoot>
    </table></body></html>"""

def html_to_pdf(html_string):
    return pdfkit.from_string(html_string, False, configuration=pdf_config)

# ---------- Генерация PDF по ID ----------
def send_pdf_by_id(update, doc_type, doc_id):
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
    elif doc_type == 'otpcex':
        item = otpcex_col.find_one({'id': doc_id})
        if item and item.get('pdfData'):
            try:
                data = item['pdfData'].split(',',1)[1] if ',' in item['pdfData'] else item['pdfData']
                pdf_bytes = base64.b64decode(data)
                filename = f"Техкарта_{item.get('techcard_no', doc_id)}.pdf"
            except Exception:
                pdf_bytes = None
    elif doc_type == 'texkarta':
        item = texkartas_col.find_one({'id': doc_id})
        if item and item.get('pdfData'):
            try:
                data = item['pdfData'].split(',',1)[1] if ',' in item['pdfData'] else item['pdfData']
                pdf_bytes = base64.b64decode(data)
                filename = f"Техкарта_{item.get('techcard_no', doc_id)}.pdf"
            except Exception:
                pdf_bytes = None
    if pdf_bytes:
        return filename, pdf_bytes
    return None, None

# ---------- Клавиатуры ----------
def main_menu_keyboard():
    keyboard = [
        [InlineKeyboardButton("📋 Заказы", callback_data="list_orders")],
        [InlineKeyboardButton("📦 Накладные", callback_data="list_invoices")],
        [InlineKeyboardButton("📑 Акты сверки", callback_data="list_reconciliations")],
        [InlineKeyboardButton("🏭 Отправка в цех", callback_data="list_otpcex")],
        [InlineKeyboardButton("🧾 Техкарты", callback_data="list_texkartas")],
        [InlineKeyboardButton("➕ Создать", callback_data="create_menu")],
        [InlineKeyboardButton("❓ Справка", callback_data="help")],
    ]
    return InlineKeyboardMarkup(keyboard)

def create_menu_keyboard():
    keyboard = [
        [InlineKeyboardButton("👤 Контрагент", callback_data="create_client")],
        [InlineKeyboardButton("📁 Продукт", callback_data="create_product")],
        [InlineKeyboardButton("📋 Заказ", callback_data="create_order")],
        [InlineKeyboardButton("🏭 Техкарта (Отп. в цех)", callback_data="create_otpcex")],
        [InlineKeyboardButton("📦 Накладная", callback_data="create_invoice")],
        [InlineKeyboardButton("↩️ Назад", callback_data="main")],
    ]
    return InlineKeyboardMarkup(keyboard)

def back_button(callback_data="main"):
    return InlineKeyboardMarkup([[InlineKeyboardButton("↩️ Назад", callback_data=callback_data)]])

# ---------- Состояния ConversationHandler ----------
# Контрагент (расширенный)
CLIENT_TYPE, CLIENT_BUYER, CLIENT_SUPPLIER, CLIENT_NAME, CLIENT_INN, CLIENT_KPP, CLIENT_BANK, CLIENT_EMAIL, CLIENT_LEGAL_ADDRESS, CLIENT_ACTUAL_ADDRESS, CLIENT_CONTACT_PERSON_NAME, CLIENT_CONTACT_PERSON_POSITION, CLIENT_CONTACT_PERSON_PHONE = range(13)

# Продукт
PRODUCT_SKU, PRODUCT_NAME, PRODUCT_PRICE, PRODUCT_UNIT, PRODUCT_QUANTITY = range(5)

# Заказ
ORDER_SELECT_CLIENT, ORDER_ADD_ITEMS, ORDER_ITEM_PRODUCT, ORDER_ITEM_QUANTITY, ORDER_ITEM_PRICE = range(5)

# Накладная
INVOICE_SELECT_CLIENT, INVOICE_ADD_ITEMS, INVOICE_ITEM_PRODUCT, INVOICE_ITEM_QUANTITY, INVOICE_ITEM_PRICE = range(5)

# Техкарта / Отп. в цех
OTP_TECHNO, OTP_MANAGER, OTP_CUSTOMER, OTP_PRODUCT, OTP_ORDERQ, OTP_CONFIRM = range(5, 11)

# ---------- Команды ----------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    cnt = orders_col.count_documents({}) + invoices_col.count_documents({}) + reconciliations_col.count_documents({})
    if cnt == 0:
        await update.message.reply_text("👋 *ProfitPrint Bot*\n\nДанные пока не загружены. Создайте их через меню.",
                                        parse_mode="Markdown", reply_markup=main_menu_keyboard())
    else:
        await update.message.reply_text("👋 *ProfitPrint Bot*\nВыберите тип документа или создайте новый:",
                                        parse_mode="Markdown", reply_markup=main_menu_keyboard())

# ---------- Обработчики списков (без изменений) ----------
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
    elif doc_type == "otpcex":
        items = list(otpcex_col.find().sort("createdAt", -1))
        title = "🏭 Отправка в цех"
    elif doc_type == "texkartas":
        items = list(texkartas_col.find().sort("createdAt", -1))
        title = "🧾 Техкарты"
    if not items:
        await query.edit_message_text(f"{title}\n\nНет документов.", reply_markup=back_button())
        return
    keyboard = []
    for item in items:
        label = item.get('techcard_no') or item.get('number') or item.get('id')
        keyboard.append([InlineKeyboardButton(str(label), callback_data=f"detail|{doc_type[:-1]}|{item['id']}")])
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
    elif doc_type == 'otpcex':
        item = otpcex_col.find_one({'id': doc_id})
        if not item:
            await query.edit_message_text('Документ не найден.', reply_markup=back_button())
            return
        msg = f"🏭 *Техкарта №{escape_html(str(item.get('techcard_no','')))}*\n"
        msg += f"Менеджер: {escape_html(item.get('manager',''))}\n"
        msg += f"Клиент: {escape_html(item.get('customer',''))}\n"
        msg += f"Продукция: {escape_html(item.get('product_name',''))}\n"
        msg += f"Кол-во: {item.get('order_qty',0)}\n"
        kb = [
            [InlineKeyboardButton("📄 Скачать PDF", callback_data=f"pdf|otpcex|{doc_id}")],
            [InlineKeyboardButton("⬆️ Загрузить PDF", callback_data=f"upload_pdf|otpcex|{doc_id}")],
            [InlineKeyboardButton("✏️ Редактировать", callback_data=f"edit|otpcex|{doc_id}")],
            [InlineKeyboardButton("🗑️ Удалить", callback_data=f"delete|otpcex|{doc_id}")],
            [InlineKeyboardButton("↩️ Назад к списку", callback_data="list_otpcex")]
        ]
        await query.edit_message_text(msg, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(kb))
    elif doc_type == 'texkarta':
        item = texkartas_col.find_one({'id': doc_id})
        if not item:
            await query.edit_message_text('Документ не найден.', reply_markup=back_button())
            return
        msg = f"🧾 *Техкарта №{escape_html(str(item.get('techcard_no','')))}*\n"
        msg += f"Источник: {escape_html(item.get('pdfSource',''))}\n"
        msg += f"Создано: {item.get('createdAt')}\n"
        kb = [
            [InlineKeyboardButton("📄 Скачать PDF", callback_data=f"pdf|texkarta|{doc_id}")],
            [InlineKeyboardButton("↩️ Назад к списку", callback_data="list_texkartas")]
        ]
        await query.edit_message_text(msg, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(kb))

async def detail_text(update: Update, context: ContextTypes.DEFAULT_TYPE, doc_type: str, doc_id: str):
    query = update.callback_query
    msg = ""
    if doc_type == "order":
        item = orders_col.find_one({"id": doc_id})
        if item:
            client_name, client_contact, _, _ = get_client_name(item["clientId"])
            total = sum(i.get('cost',0) for i in item["items"])
            msg = f"📋 *Заказ №{item['number']}*\n"
            msg += f"Дата: {format_date(item['date'])}\n"
            msg += f"Завершение: {format_date(item.get('completionDate',''))}\n"
            msg += f"Клиент: {escape_html(client_name)} ({escape_html(client_contact)})\n"
            msg += f"Позиций: {len(item['items'])}\n"
            msg += f"Сумма: {format_currency(total)}\n\n"
            for i, it in enumerate(item["items"], 1):
                qty = it.get('quantityProduced',0)
                price = format_currency(it.get('price',0))
                cost = format_currency(it.get('cost',0))
                msg += f"{i}. {it['name']} – {qty} × {price} = {cost}\n"
    elif doc_type == "invoice":
        item = invoices_col.find_one({"id": doc_id})
        if item:
            client_name, _, _, _ = get_client_name(item["clientId"])
            total = sum(i.get('cost',0) for i in item["items"])
            msg = f"📦 *Накладная №{item['number']}*\n"
            msg += f"Дата: {format_date(item['date'])}\n"
            msg += f"Клиент: {escape_html(client_name)}\n"
            msg += f"Позиций: {len(item['items'])}\n"
            msg += f"Сумма: {format_currency(total)}\n\n"
            for i, it in enumerate(item["items"], 1):
                qty = it.get('quantity',0)
                price = format_currency(it.get('price',0))
                cost = format_currency(it.get('cost',0))
                msg += f"{i}. {it['name']} – {qty} × {price} = {cost}\n"
    elif doc_type == "reconciliation":
        item = reconciliations_col.find_one({"id": doc_id})
        if item:
            client_name, _, _, _ = get_client_name(item["clientId"])
            final_bal = item["items"][-1]['endingBalance'] if item["items"] else 0
            msg = f"📑 *Акт сверки №{item['number']}*\n"
            msg += f"Клиент: {escape_html(client_name)}\n"
            msg += f"Период: {format_date(item['periodFrom'])} – {format_date(item['periodTo'])}\n"
            msg += f"Строк: {len(item['items'])}\n"
            msg += f"Конечный остаток: {format_currency(final_bal)}\n\n"
            for it in item["items"]:
                doc_str = it['document']
                if it['document'] != 'Начальный остаток':
                    display_date = safe_get_date(it)
                    if display_date:
                        doc_str += f" от {display_date}"
                msg += f"{doc_str}:\n"
                msg += f"  нач. {format_currency(it['startingBalance'])}"
                msg += f"  реал. {format_currency(it['realization'])}"
                msg += f"  опл. {format_currency(it['payment'])}"
                msg += f"  кон. {format_currency(it['endingBalance'])}\n"
    if msg:
        await query.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=back_button(f"detail|{doc_type}|{doc_id}"))
    else:
        await query.edit_message_text("Документ не найден.", reply_markup=back_button())

async def send_pdf(update: Update, context: ContextTypes.DEFAULT_TYPE, doc_type: str, doc_id: str):
    filename, pdf_bytes = send_pdf_by_id(update, doc_type, doc_id)
    if pdf_bytes:
        await update.callback_query.answer()
        await update.callback_query.message.reply_document(document=BytesIO(pdf_bytes), filename=filename)
    else:
        await update.callback_query.edit_message_text("Не удалось создать PDF.", reply_markup=back_button())

# ---------- Обработчики создания ----------
async def create_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.edit_message_text("Что вы хотите создать?", reply_markup=create_menu_keyboard())

async def create_otpcex_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.callback_query.answer()
    await update.callback_query.edit_message_text("Введите номер техкарты (или оставьте пустым):")
    return OTP_TECHNO

async def otp_techno(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['pending_otpcex'] = {'techcard_no': update.message.text.strip()}
    await update.message.reply_text('Введите имя менеджера:')
    return OTP_MANAGER

async def otp_manager(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['pending_otpcex']['manager'] = update.message.text.strip()
    await update.message.reply_text('Введите заказчика (клиента):')
    return OTP_CUSTOMER

async def otp_customer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['pending_otpcex']['customer'] = update.message.text.strip()
    await update.message.reply_text('Введите наименование продукции:')
    return OTP_PRODUCT

async def otp_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['pending_otpcex']['product_name'] = update.message.text.strip()
    await update.message.reply_text('Введите количество (число):')
    return OTP_ORDERQ

async def otp_orderq(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        q = int(float(update.message.text.strip()))
    except:
        q = 0
    pending = context.user_data.get('pending_otpcex', {})
    pending['order_qty'] = q
    pending['id'] = generate_id()
    pending['createdAt'] = datetime.utcnow()
    # Confirm
    await update.message.reply_text(f"Подтвердите создание техкарты №{pending.get('techcard_no','(без номера)')} для {pending.get('customer','')} (Да/Нет)")
    return OTP_CONFIRM

async def otp_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip().lower()
    if text not in ('да','yes','y'):
        context.user_data.pop('pending_otpcex', None)
        await update.message.reply_text('Создание отменено.')
        return ConversationHandler.END
    pending = context.user_data.get('pending_otpcex')
    if not pending:
        await update.message.reply_text('Нет данных для сохранения.')
        return ConversationHandler.END
    # Check rotation rule
    cnt = otpcex_col.count_documents({})
    if cnt >= 100:
        # ask for explicit confirmation that oldest 100 will be moved
        context.user_data['pending_otpcex'] = pending
        keyboard = InlineKeyboardMarkup([[InlineKeyboardButton('✅ Да, продолжить', callback_data='rotate_confirm_yes')],[InlineKeyboardButton('❌ Нет, отменить', callback_data='rotate_confirm_no')]])
        await update.message.reply_text('При создании новой техкарты первые 100 техкарт будут перемещены в резервную корзину. Продолжить?', reply_markup=keyboard)
        return ConversationHandler.END
    # otherwise save immediately
    otpcex_col.insert_one(pending)
    await update.message.reply_text('✅ Техкарта создана и сохранена.')
    context.user_data.pop('pending_otpcex', None)
    return ConversationHandler.END

def move_oldest_to_reserve(limit=100):
    # Move oldest `limit` documents to reserve collection
    docs = list(otpcex_col.find().sort('createdAt', 1).limit(limit))
    if not docs:
        return 0
    # insert into reserve (preserve original)
    for d in docs:
        d.pop('_id', None)
    otpcex_reserve_col.insert_many(docs)
    ids = [d['id'] for d in docs if 'id' in d]
    otpcex_col.delete_many({'id': {'$in': ids}})
    return len(ids)

async def handle_rotate_confirm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.data == 'rotate_confirm_no':
        context.user_data.pop('pending_otpcex', None)
        await query.edit_message_text('Создание отменено.')
        return
    # yes
    pending = context.user_data.get('pending_otpcex')
    if not pending:
        await query.edit_message_text('Нет данных для сохранения.')
        return
    moved = move_oldest_to_reserve(100)
    otpcex_col.insert_one(pending)
    context.user_data.pop('pending_otpcex', None)
    await query.edit_message_text(f'✅ Создано. Перемещено в резерв: {moved} записей.')

async def handle_upload_pdf_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # This handler expects context.user_data['awaiting_pdf'] = {'type':'otpcex'|'texkarta', 'id': id}
    info = context.user_data.get('awaiting_pdf')
    if not info:
        return
    doc = update.message.document
    if not doc:
        await update.message.reply_text('Пожалуйста, отправьте файл в виде документа (PDF).')
        return
    if not doc.file_name.lower().endswith('.pdf'):
        await update.message.reply_text('Требуется PDF файл.')
        return
    f = await doc.get_file()
    data = await f.download_as_bytearray()
    b64 = base64.b64encode(bytes(data)).decode('ascii')
    data_uri = 'data:application/pdf;base64,' + b64
    if info['type'] == 'otpcex':
        otpcex_col.update_one({'id': info['id']}, {'$set': {'pdfData': data_uri, 'pdfSource': 'tg', 'updatedAt': datetime.utcnow()}})
        await update.message.reply_text('PDF загружен и привязан к техкарте.')
    elif info['type'] == 'texkarta':
        texkartas_col.update_one({'id': info['id']}, {'$set': {'pdfData': data_uri, 'pdfSource': 'tg', 'updatedAt': datetime.utcnow()}})
        await update.message.reply_text('PDF сохранён.')
    context.user_data.pop('awaiting_pdf', None)

# ----- КОНТРАГЕНТ (расширенный) -----
async def create_client_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.callback_query.answer()
    await update.callback_query.edit_message_text(
        "Выберите *тип контрагента*:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("Юридическое лицо", callback_data="client_type_legal")],
            [InlineKeyboardButton("Физическое лицо", callback_data="client_type_individual")],
            [InlineKeyboardButton("ИП", callback_data="client_type_entrepreneur")],
            [InlineKeyboardButton("❌ Отмена", callback_data="create_menu")]
        ])
    )
    return CLIENT_TYPE

async def client_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    type_map = {
        "client_type_legal": "Юридическое лицо",
        "client_type_individual": "Физическое лицо",
        "client_type_entrepreneur": "ИП"
    }
    context.user_data['new_client'] = {'type': type_map[query.data]}
    await query.edit_message_text(
        "Является *покупателем*?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Да", callback_data="client_buyer_yes")],
            [InlineKeyboardButton("❌ Нет", callback_data="client_buyer_no")]
        ])
    )
    return CLIENT_BUYER

async def client_buyer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    context.user_data['new_client']['buyer'] = query.data == "client_buyer_yes"
    await query.edit_message_text(
        "Является *поставщиком*?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Да", callback_data="client_supplier_yes")],
            [InlineKeyboardButton("❌ Нет", callback_data="client_supplier_no")]
        ])
    )
    return CLIENT_SUPPLIER

async def client_supplier(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    context.user_data['new_client']['supplier'] = query.data == "client_supplier_yes"
    await update.callback_query.edit_message_text("Введите *название контрагента*:", parse_mode="Markdown")
    return CLIENT_NAME

async def client_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['new_client']['name'] = update.message.text
    await update.message.reply_text("Введите *ИНН* (или пропустите, отправив «-»):", parse_mode="Markdown")
    return CLIENT_INN

async def client_inn(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['inn'] = text
    # Если юрлицо, запрашиваем КПП
    if context.user_data['new_client'].get('type') == 'Юридическое лицо':
        await update.message.reply_text("Введите *КПП* (или «-» для пропуска):", parse_mode="Markdown")
        return CLIENT_KPP
    else:
        # Пропускаем КПП для физлиц/ИП
        return await ask_bank_account(update, context)

async def client_kpp(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['kpp'] = text
    return await ask_bank_account(update, context)

async def ask_bank_account(update, context):
    await update.message.reply_text("Введите *банковский счёт* (или «-» для пропуска):", parse_mode="Markdown")
    return CLIENT_BANK

async def client_bank(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['bank_account'] = text
    await update.message.reply_text("Введите *E‑mail* (или «-»):", parse_mode="Markdown")
    return CLIENT_EMAIL

async def client_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['email'] = text
    await update.message.reply_text("Введите *юридический адрес* (или «-»):", parse_mode="Markdown")
    return CLIENT_LEGAL_ADDRESS

async def client_legal_address(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['legal_address'] = text
    await update.message.reply_text("Введите *фактический адрес* (или «-»):", parse_mode="Markdown")
    return CLIENT_ACTUAL_ADDRESS

async def client_actual_address(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['actual_address'] = text
    await update.message.reply_text("Введите *имя контактного лица* (или «-»):", parse_mode="Markdown")
    return CLIENT_CONTACT_PERSON_NAME

async def client_contact_person_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['contact_person_name'] = text
    await update.message.reply_text("Введите *должность* контактного лица (или «-»):", parse_mode="Markdown")
    return CLIENT_CONTACT_PERSON_POSITION

async def client_contact_person_position(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['contact_person_position'] = text
    await update.message.reply_text("Введите *телефон* контактного лица (или «-»):", parse_mode="Markdown")
    return CLIENT_CONTACT_PERSON_PHONE

async def client_contact_person_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if text != '-':
        context.user_data['new_client']['contact_person_phone'] = text

    # Сохраняем контрагента
    data = context.user_data['new_client']
    data['id'] = generate_id()
    # Добавляем совместимость со старыми полями (для веб-интерфейса)
    data['contact'] = data.get('contact_person_name', '')
    data['phone'] = data.get('contact_person_phone', '')
    data['address'] = data.get('legal_address', '')
    clients_col.insert_one(data)

    # Подсчитываем долг и продажи
    invs = list(invoices_col.find({"clientId": data['id']}))
    total_sales = sum(sum(item.get('cost', 0) for item in inv.get('items', [])) for inv in invs)
    pays = list(payments_col.find({"clientId": data['id']}))
    total_paid = sum(p.get('amount', 0) for p in pays)
    debt = total_sales - total_paid

    # Формируем карточку
    card = f"👤 *Контрагент создан!*\n\n"
    card += f"*{escape_html(data['name'])}*\n"
    card += f"Тип: {data['type']}"
    if data.get('buyer'):
        card += ", Покупатель"
    if data.get('supplier'):
        card += ", Поставщик"
    card += "\n\n"
    card += f"💰 Долг: {format_currency(debt)}\n"
    card += f"📈 Продажи: {format_currency(total_sales)}\n\n"
    card += "📋 *Реквизиты*\n"
    card += f"ИНН: {data.get('inn', 'не указан')}\n"
    if data.get('kpp'):
        card += f"КПП: {data['kpp']}\n"
    card += f"Банк. счёт: {data.get('bank_account', 'не указан')}\n"
    card += f"E‑mail: {data.get('email', 'не указан')}\n"
    card += f"Юр. адрес: {data.get('legal_address', 'не указан')}\n"
    card += f"Факт. адрес: {data.get('actual_address', 'не указан')}\n\n"
    card += "👤 *Контактное лицо*\n"
    card += f"{data.get('contact_person_name', 'не указано')}"
    if data.get('contact_person_position'):
        card += f", {data['contact_person_position']}"
    card += "\n"
    card += f"Телефон: {data.get('contact_person_phone', 'не указан')}"

    await update.message.reply_text(card, parse_mode="Markdown",
                                    reply_markup=back_button("create_menu"))
    context.user_data.pop('new_client', None)
    return ConversationHandler.END

# ----- ПРОДУКТ (без изменений) -----
async def create_product_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.callback_query.answer()
    await update.callback_query.edit_message_text("Введите *артикул*:", parse_mode="Markdown")
    return PRODUCT_SKU

async def product_sku(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['temp_product'] = {'sku': update.message.text}
    await update.message.reply_text("Введите *наименование*:", parse_mode="Markdown")
    return PRODUCT_NAME

async def product_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['temp_product']['name'] = update.message.text
    await update.message.reply_text("Введите *цену* (число):", parse_mode="Markdown")
    return PRODUCT_PRICE

async def product_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        context.user_data['temp_product']['price'] = float(update.message.text)
    except:
        await update.message.reply_text("Неверное число. Введите цену ещё раз:")
        return PRODUCT_PRICE
    await update.message.reply_text("Введите *единицу измерения* (например, шт, кг, м):", parse_mode="Markdown")
    return PRODUCT_UNIT

async def product_unit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['temp_product']['unit'] = update.message.text
    await update.message.reply_text("Введите *количество* (число):", parse_mode="Markdown")
    return PRODUCT_QUANTITY

async def product_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        qty = float(update.message.text)
    except:
        await update.message.reply_text("Неверное число. Введите количество ещё раз:")
        return PRODUCT_QUANTITY
    data = context.user_data['temp_product']
    data['quantity'] = qty
    data['cost'] = data['price'] * qty
    data['produced'] = 0
    data['ordered'] = 0
    data['id'] = generate_id()
    products_col.insert_one(data)
    await update.message.reply_text(f"✅ Продукт *{escape_html(data['name'])}* создан!", parse_mode="Markdown",
                                    reply_markup=back_button("create_menu"))
    context.user_data.pop('temp_product', None)
    return ConversationHandler.END

# ----- ЗАКАЗ (без изменений) -----
# (оставляем существующий код заказа и накладной, он был полным в предыдущем ответе)
# Здесь для краткости опущен, но вы можете взять его из предыдущей версии бота.

# ---------- Обработчик кнопок ----------
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
    elif data_str == 'list_otpcex':
        await list_docs(update, context, 'otpcex')
    elif data_str == 'list_texkartas':
        await list_docs(update, context, 'texkartas')
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
    elif data_str.startswith('upload_pdf|'):
        parts = data_str.split('|')
        if len(parts) == 3:
            doc_type = parts[1]
            doc_id = parts[2]
            context.user_data['awaiting_pdf'] = {'type': doc_type, 'id': doc_id}
            await query.edit_message_text('Отправьте PDF файлом (как документ).')
    elif data_str.startswith('rotate_confirm_'):
        await handle_rotate_confirm_callback(update, context)
    elif data_str == "create_menu":
        await create_menu(update, context)

# ---------- Главная функция ----------
def main():
    app = Application.builder().token(BOT_TOKEN).build()

    # Контрагент
    conv_client = ConversationHandler(
        entry_points=[CallbackQueryHandler(create_client_start, pattern="^create_client$")],
        states={
            CLIENT_TYPE: [CallbackQueryHandler(client_type)],
            CLIENT_BUYER: [CallbackQueryHandler(client_buyer)],
            CLIENT_SUPPLIER: [CallbackQueryHandler(client_supplier)],
            CLIENT_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_name)],
            CLIENT_INN: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_inn)],
            CLIENT_KPP: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_kpp)],
            CLIENT_BANK: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_bank)],
            CLIENT_EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_email)],
            CLIENT_LEGAL_ADDRESS: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_legal_address)],
            CLIENT_ACTUAL_ADDRESS: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_actual_address)],
            CLIENT_CONTACT_PERSON_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_contact_person_name)],
            CLIENT_CONTACT_PERSON_POSITION: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_contact_person_position)],
            CLIENT_CONTACT_PERSON_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, client_contact_person_phone)],
        },
        fallbacks=[CommandHandler("cancel", lambda u,c: ConversationHandler.END)]
    )

    # Продукт
    conv_product = ConversationHandler(
        entry_points=[CallbackQueryHandler(create_product_start, pattern="^create_product$")],
        states={
            PRODUCT_SKU: [MessageHandler(filters.TEXT & ~filters.COMMAND, product_sku)],
            PRODUCT_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, product_name)],
            PRODUCT_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, product_price)],
            PRODUCT_UNIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, product_unit)],
            PRODUCT_QUANTITY: [MessageHandler(filters.TEXT & ~filters.COMMAND, product_quantity)],
        },
        fallbacks=[CommandHandler("cancel", lambda u,c: ConversationHandler.END)]
    )

    # Заказ и накладная (добавьте их аналогично предыдущей версии)

    app.add_handler(CommandHandler("start", start))
    app.add_handler(conv_client)
    app.add_handler(conv_product)
    # Техкарта / Отправка в цех
    conv_otpcex = ConversationHandler(
        entry_points=[CallbackQueryHandler(create_otpcex_start, pattern="^create_otpcex$")],
        states={
            OTP_TECHNO: [MessageHandler(filters.TEXT & ~filters.COMMAND, otp_techno)],
            OTP_MANAGER: [MessageHandler(filters.TEXT & ~filters.COMMAND, otp_manager)],
            OTP_CUSTOMER: [MessageHandler(filters.TEXT & ~filters.COMMAND, otp_customer)],
            OTP_PRODUCT: [MessageHandler(filters.TEXT & ~filters.COMMAND, otp_product)],
            OTP_ORDERQ: [MessageHandler(filters.TEXT & ~filters.COMMAND, otp_orderq)],
            OTP_CONFIRM: [MessageHandler(filters.TEXT & ~filters.COMMAND, otp_confirm)],
        },
        fallbacks=[CommandHandler("cancel", lambda u,c: ConversationHandler.END)]
    )
    app.add_handler(conv_otpcex)
    # PDF upload handler
    app.add_handler(MessageHandler(filters.Document.ALL & ~filters.COMMAND, handle_upload_pdf_document))
    app.add_handler(CallbackQueryHandler(button_callback))
    app.add_handler(CommandHandler("cancel", lambda update, context: update.message.reply_text("Действие отменено.")))

    print("Бот запущен...")
    app.run_polling()

if __name__ == "__main__":
    main()