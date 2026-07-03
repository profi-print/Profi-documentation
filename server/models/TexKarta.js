const mongoose = require('mongoose');

const texKartaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  techcard_no: String,
  orderRefId: String,
  pdfData: String,
  pdfSource: String,
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TexKarta', texKartaSchema);
