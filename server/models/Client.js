const mongoose = require('mongoose');
const clientSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  contact: String,
  phone: String,
  address: String
});
module.exports = mongoose.model('Client', clientSchema);