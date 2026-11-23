const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true, maxlength: 20 },
  subject: { type: String, enum: ['admission', 'general', 'other'], default: 'general' },
  message: { type: String, trim: true, maxlength: 2000, default: '' },
  // Admission enquiry details
  childName: { type: String, trim: true, maxlength: 100 },
  classApplying: { type: String, trim: true, maxlength: 40 },
  childAge: { type: Number, min: 1, max: 20 },
  academicYear: { type: String, trim: true, maxlength: 20 },
  previousSchool: { type: String, trim: true, maxlength: 120 },
  relation: { type: String, enum: ['Mother', 'Father', 'Guardian'] },
  visitTime: { type: String, enum: ['morning', 'afternoon', 'any', 'none'] },
  replyVia: { type: String, enum: ['call', 'whatsapp', 'email'] },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new', index: true },
}, { timestamps: true });
module.exports = mongoose.model('ContactMessage', schema);
