const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: String,
  type: String,
  length: Number,
  width: Number,
  details: { type: Array, default: [] }
}, { _id: false });

const otpCexSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  techcard_no: String,
  manager: String,
  customer: String,
  product_name: String,
  description: String,
  print_type: String,
  media_type: String,
  paper_type: String,
  order_qty: { type: Number, default: 0 },
  make_ready: { type: Number, default: 0 },
  roll_format: Number,
  size_length: Number,
  size_width: Number,
  stripes: Number,
  gsm: Number,
  color: String,
  services: [serviceSchema],
  pdfData: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OtpCex', otpCexSchema);
