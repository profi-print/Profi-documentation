const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  quantityProduced: Number,
  price: Number,
  cost: Number,
  quantityOrdered: Number
}, { _id: false });
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String,
  date: String,
  completionDate: String,
  clientId: String,
  items: [orderItemSchema]
});
module.exports = mongoose.model('Order', orderSchema);