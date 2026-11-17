const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  body: { type: String, required: true, trim: true, maxlength: 3000 },
  // Optional long-form article shown when a reader opens the notice
  article: { type: String, trim: true, maxlength: 10000, default: '' },
  category: { type: String, enum: ['general', 'admission', 'event', 'holiday', 'achievement'], default: 'general', index: true },
  // Cover image is kept inside MongoDB (not on the server disk) so it survives Render restarts. Never sent with lists.
  image: { data: { type: Buffer, select: false }, contentType: { type: String, select: false } },
  hasImage: { type: Boolean, default: false },
  // public = school website, portal = signed-in users, both = everywhere
  audience: { type: String, enum: ['public', 'portal', 'both'], default: 'both', index: true },
  pinned: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Notice', schema);
