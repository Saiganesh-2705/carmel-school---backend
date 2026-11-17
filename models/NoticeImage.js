const mongoose = require('mongoose');
// One photo of a notice (a notice can have up to 10, for example every picture from Blue Day or Children's Day).
// Photos live in MongoDB so they survive Render restarts. The bytes are never sent with lists.
const schema = new mongoose.Schema({
  notice: { type: mongoose.Schema.Types.ObjectId, ref: 'Notice', required: true, index: true },
  data: { type: Buffer, required: true, select: false },
  contentType: { type: String, required: true, select: false },
}, { timestamps: true });
module.exports = mongoose.model('NoticeImage', schema);
