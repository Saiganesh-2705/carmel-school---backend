const Notice = require('../models/Notice');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const isAdmin = (u) => ['admin', 'super_admin'].includes(u.role);
const pick = (b) => { const o = {}; for (const k of ['title', 'body', 'article', 'category', 'audience', 'pinned', 'isPublished']) if (b[k] !== undefined) o[k] = b[k]; return o; };

const LIST_HIDE = '-author -image';
const withFlag = (d) => { const o = d.toObject ? d.toObject() : d; o.hasArticle = !!(o.article && o.article.length); return o; };
// Lists send a short preview of the article; the full text is fetched when a reader opens it.
const forList = (d) => { const o = withFlag(d); o.articleTruncated = o.article.length > 200; o.article = o.article.slice(0, 200); return o; };
const applyImage = (doc, req) => {
  if (req.file) { doc.image = { data: req.file.buffer, contentType: req.file.mimetype }; doc.hasImage = true; }
  else if (String(req.body.removeImage) === 'true') { doc.image = undefined; doc.hasImage = false; }
};

exports.publicList = asyncHandler(async (req, res) => {
  const rows = await Notice.find({ isPublished: true, audience: { $in: ['public', 'both'] } }).sort('-pinned -createdAt').limit(30).select(LIST_HIDE);
  res.json({ success: true, data: rows.map(forList) });
});
exports.publicOne = asyncHandler(async (req, res) => {
  const row = await Notice.findOne({ _id: req.params.id, isPublished: true, audience: { $in: ['public', 'both'] } }).select(LIST_HIDE);
  if (!row) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, data: withFlag(row) });
});
exports.image = asyncHandler(async (req, res) => {
  const row = await Notice.findById(req.params.id).select('+image.data +image.contentType hasImage');
  if (!row || !row.hasImage || !row.image?.data) throw new ApiError(404, 'No image');
  res.set({ 'Content-Type': row.image.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin' });
  res.send(row.image.data);
});
exports.list = asyncHandler(async (req, res) => {
  const filter = isAdmin(req.user) ? {} : { isPublished: true, audience: { $in: ['portal', 'both'] } };
  const rows = await Notice.find(filter).sort('-pinned -createdAt').limit(100).select('-image').populate('author', 'name');
  res.json({ success: true, data: rows.map(withFlag) });
});
exports.create = asyncHandler(async (req, res) => {
  const doc = new Notice({ ...pick(req.body), author: req.user._id });
  applyImage(doc, req); await doc.save();
  res.status(201).json({ success: true, data: withFlag(doc) });
});
exports.update = asyncHandler(async (req, res) => {
  const doc = await Notice.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Notice not found');
  doc.set(pick(req.body)); applyImage(doc, req); await doc.save();
  res.json({ success: true, data: withFlag(doc) });
});
exports.remove = asyncHandler(async (req, res) => {
  const data = await Notice.findByIdAndDelete(req.params.id);
  if (!data) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, message: 'Notice deleted' });
});
