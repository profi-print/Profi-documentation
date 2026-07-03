const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sku: String,
  name: String,
  price: Number,
  unit: { type: String, default: 'шт' },
  quantity: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  produced: { type: Number, default: 0 },
  ordered: { type: Number, default: 0 }
});
module.exports = mongoose.model('Product', productSchema);