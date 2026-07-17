const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: String,
  type: String,
  length: Number,
  width: Number,
  details: { type: Array, default: [] }
}, { _id: false });

/**
 * ВАЖНО: это расширенная версия схемы. Изменения относительно исходной:
 * - media_type → material_type (в форме otpCex.html поле называется
 *   именно material_type — исходная схема была рассинхронизирована с формой,
 *   поэтому это значение раньше молча терялось при сохранении).
 * - roll_format заменён на 4 отдельных поля (roll_width, flot_length,
 *   sheet_width, sheet_length), т.к. форма именно так их и собирает
 *   (разные поля для рулона и листового материала).
 * - добавлены print_sheets, weight_kg, divide_by_two, transfer_active,
 *   pdf_filename/pdf_originalname, screenshot_url (см. ниже) — все они
 *   уже есть в объекте заказа, который собирает otpCex.html, но раньше
 *   некуда было деваться на сервере.
 * - screenshot_base64 НЕ хранится в базе (это раздувало бы документы
 *   мегабайтами на каждый заказ) — вместо этого добавлено поле
 *   screenshot_url, куда пишется путь к файлу, загруженному через
 *   POST /api/upload/screenshot/:orderId (см. server/index.js).
 * - timeline / received_qty / receive_history / shipment_history / shipped_qty —
 *   поля для трекинга этапов производства и склада (то, что раньше жило
 *   только в localStorage.pp_orders и нигде не сохранялось на сервере).
 */
const otpCexSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  techcard_no: String,
  manager: String,
  customer: String,
  product_name: String,
  description: String,
  print_type: String,
  material_type: { type: String, default: 'roll' },
  paper_type: String,
  order_qty: { type: Number, default: 0 },
  make_ready: { type: Number, default: 0 },

  roll_width: Number,
  flot_length: Number,
  sheet_width: Number,
  sheet_length: Number,

  size_length: Number,
  size_width: Number,
  stripes: Number,
  gsm: Number,
  color: String,

  print_sheets: { type: Number, default: 0 },
  weight_kg: { type: Number, default: 0 },
  divide_by_two: { type: Boolean, default: false },
  transfer_active: { type: Boolean, default: false },

  services: [serviceSchema],

  pdf_filename: String,
  pdf_originalname: String,
  screenshot_url: String,

  // ===== Производство/склад (используется texKarta.html, statuses.html) =====
  timeline: { type: mongoose.Schema.Types.Mixed, default: {} },
  received_qty: { type: Number, default: 0 },
  receive_history: { type: [mongoose.Schema.Types.Mixed], default: [] },
  shipped_qty: { type: Number, default: 0 },
  shipment_history: { type: [mongoose.Schema.Types.Mixed], default: [] },
  role_notes: { type: mongoose.Schema.Types.Mixed, default: {} },

  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // strict:false — переходный период, чтобы случайно не потерять поле, которое ещё не описано явно

module.exports = mongoose.model('OtpCex', otpCexSchema);