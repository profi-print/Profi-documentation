const mongoose = require('mongoose');
const invoiceItemSchema = new mongoose.Schema({
  productId: String,
  sku: String,
  name: String,
  quantity: Number,
  price: Number,
  cost: Number
}, { _id: false });
const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String,
  date: String,
  clientId: String,
  items: [invoiceItemSchema]
});
module.exports = mongoose.model('Invoice', invoiceSchema);