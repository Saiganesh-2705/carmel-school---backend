const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  body: { type: String, required: true, trim: true, maxlength: 3000 },
  // public = school website, portal = signed-in users, both = everywhere
  audience: { type: String, enum: ['public', 'portal', 'both'], default: 'both', index: true },
  pinned: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Notice', schema);
