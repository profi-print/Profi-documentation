const mongoose = require('mongoose');
const invoiceItemSchema = new mongoose.Schema({
  productId: String, sku: String, name: String, quantity: Number, price: Number, cost: Number, unit: String
}, { _id: false });
const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String, date: String, clientId: String,
  sellerName: String, sellerInn: String, sellerAddress: String,
  buyerName: String, buyerInn: String, buyerAddress: String,
  basis: String, ndsRate: { type: Number, default: 0 },
  items: [invoiceItemSchema],
  signatures: { type: Map, of: String, default: {} }
});
module.exports = mongoose.model('Invoice', invoiceSchema);