const mongoose = require('mongoose');
// One photo of an album. Photos live in MongoDB so they survive Render restarts; the bytes are never sent with lists.
const schema = new mongoose.Schema({
  album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
  data: { type: Buffer, select: false },            // used when Cloudinary is not configured
  contentType: { type: String, select: false },
  url: { type: String },                             // Cloudinary address (when configured)
  publicId: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('AlbumImage', schema);
