const mongoose = require('mongoose');
const reconItemSchema = new mongoose.Schema({
  date: String,
  document: String,
  startingBalance: Number,
  realization: Number,
  payment: Number,
  endingBalance: Number
}, { _id: false });
const reconciliationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String,
  date: String,
  clientId: String,
  periodFrom: String,
  periodTo: String,
  items: [reconItemSchema]
});
module.exports = mongoose.model('Reconciliation', reconciliationSchema);