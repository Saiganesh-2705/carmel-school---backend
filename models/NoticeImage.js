const mongoose = require('mongoose');
// One photo of a notice (a notice can have up to 10, for example every picture from Blue Day or Children's Day).
// New photos live in Cloudinary (url + publicId). Older ones may still be in MongoDB until you run: npm run migrate:cloud
const schema = new mongoose.Schema({
  notice: { type: mongoose.Schema.Types.ObjectId, ref: 'Notice', required: true, index: true },
  data: { type: Buffer, select: false },            // only for older photos saved before Cloudinary
  contentType: { type: String, select: false },
  url: { type: String },                             // Cloudinary address
  publicId: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('NoticeImage', schema);
