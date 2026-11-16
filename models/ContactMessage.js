const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true, maxlength: 20 },
  subject: { type: String, enum: ['admission', 'general', 'other'], default: 'general' },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new', index: true },
}, { timestamps: true });
module.exports = mongoose.model('ContactMessage', schema);
