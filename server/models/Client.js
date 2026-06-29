const mongoose = require('mongoose');
const clientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String, type: { type: String, default: 'Юридическое лицо' },
  buyer: { type: Boolean, default: true }, supplier: { type: Boolean, default: false },
  inn: String, kpp: String, bank_account: String, email: String,
  phone: String, legal_address: String, actual_address: String,
  contact_person_name: String, contact_person_position: String, contact_person_phone: String,
  contact: String, address: String
});
module.exports = mongoose.model('Client', clientSchema);