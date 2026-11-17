const mongoose = require('mongoose');
// A photo album for one celebration or event (Blue Day, Children's Day, Sports Day...). Shown on the Events and Gallery pages.
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  category: { type: String, enum: ['celebration', 'festival', 'sports', 'cultural', 'academic', 'other'], default: 'celebration', index: true },
  eventDate: { type: Date, default: Date.now, index: true },
  isPublished: { type: Boolean, default: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Album', schema);
