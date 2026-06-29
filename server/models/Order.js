const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  productId: String, sku: String, name: String, characteristic: String,
  quantity: Number, unit: String, price: Number, ndsRate: { type: Number, default: 0 },
  ndsAmount: Number, total: Number, specification: String,
  cancelled: { type: Boolean, default: false }, cancelReason: String
}, { _id: false });
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String, date: String, completionDate: String, shipmentDate: String, clientId: String,
  status: { type: String, enum: ['В работе', 'Проведён', 'Завершён'], default: 'В работе' },
  operation: { type: String, default: 'Заказ на продажу' },
  contract: { type: String, default: 'Основной договор' },
  manufacturer: { type: String, default: 'Производство' },
  responsible: { type: String, default: 'Не назначен' },
  startDate: String, finishDate: String, comment: String,
  manualDiscountPercent: { type: Number, default: 0 }, manualDiscountAmount: Number,
  items: [orderItemSchema],
  conducted: { type: Boolean, default: false }, postedAt: Date, closedAt: Date,
  events: { type: Array, default: [] }, files: { type: Array, default: [] }
});
module.exports = mongoose.model('Order', orderSchema);