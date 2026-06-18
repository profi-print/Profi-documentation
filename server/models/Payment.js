const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  clientId: String,
  date: String,
  amount: Number,
  description: String
});
module.exports = mongoose.model('Payment', paymentSchema);