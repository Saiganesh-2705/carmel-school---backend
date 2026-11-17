const Notice = require('../models/Notice');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const isAdmin = (u) => ['admin', 'super_admin'].includes(u.role);
const pick = (b) => { const o = {}; for (const k of ['title', 'body', 'article', 'category', 'audience', 'pinned', 'isPublished']) if (b[k] !== undefined) o[k] = b[k]; return o; };

const NoticeImage = require('../models/NoticeImage');
const MAX_PHOTOS = 10;
const LIST_HIDE = '-author -image';
const base = (d) => { const o = d.toObject ? d.toObject() : d; o.hasArticle = !!(o.article && o.article.length); return o; };
// Adds o.photos: a list of photo ids ('cover' is the older single image). Readers build the picture addresses from them.
async function withPhotos(objs) {
  const list = Array.isArray(objs) ? objs : [objs];
  const imgs = await NoticeImage.find({ notice: { $in: list.map((o) => o._id) } }).select('notice').sort('createdAt');
  const by = {}; imgs.forEach((i) => { (by[i.notice] = by[i.notice] || []).push(String(i._id)); });
  list.forEach((o) => { o.photos = [...(o.hasImage ? ['cover'] : []), ...(by[o._id] || [])]; o.hasImage = o.photos.length > 0; });
  return objs;
}
// Lists send a short preview of the article; the full text is fetched when a reader opens it.
const short = (o) => { o.articleTruncated = o.article.length > 200; o.article = o.article.slice(0, 200); return o; };
const parseIds = (v) => { try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a.map(String) : []; } catch { return []; } };

// Removes the photos the admin deleted, then saves newly uploaded ones (10 per notice at most).
async function applyPhotos(doc, req) {
  const remove = parseIds(req.body.removeImages);
  if (remove.includes('cover')) { doc.image = undefined; doc.hasImage = false; }
  const ids = remove.filter((x) => /^[a-f\d]{24}$/i.test(x));
  if (ids.length) await NoticeImage.deleteMany({ notice: doc._id, _id: { $in: ids } });
  const files = req.files || [];
  if (files.length) {
    const have = (doc.hasImage ? 1 : 0) + (await NoticeImage.countDocuments({ notice: doc._id }));
    if (have + files.length > MAX_PHOTOS) throw new ApiError(400, `A notice can have up to ${MAX_PHOTOS} photos`);
    await NoticeImage.insertMany(files.map((f) => ({ notice: doc._id, data: f.buffer, contentType: f.mimetype })));
  }
}

exports.publicList = asyncHandler(async (req, res) => {
  const rows = await Notice.find({ isPublished: true, audience: { $in: ['public', 'both'] } }).sort('-pinned -createdAt').limit(30).select(LIST_HIDE);
  res.json({ success: true, data: await withPhotos(rows.map((d) => short(base(d)))) });
});
exports.publicOne = asyncHandler(async (req, res) => {
  const row = await Notice.findOne({ _id: req.params.id, isPublished: true, audience: { $in: ['public', 'both'] } }).select(LIST_HIDE);
  if (!row) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, data: await withPhotos(base(row)) });
});
const sendImage = (res, buf, type) => { res.set({ 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin' }); res.send(buf); };
exports.image = asyncHandler(async (req, res) => {
  const row = await Notice.findById(req.params.id).select('+image.data +image.contentType hasImage');
  if (!row || !row.hasImage || !row.image?.data) throw new ApiError(404, 'No image');
  sendImage(res, row.image.data, row.image.contentType);
});
exports.imageById = asyncHandler(async (req, res) => {
  const img = await NoticeImage.findOne({ _id: req.params.imgId, notice: req.params.id }).select('+data +contentType');
  if (!img) throw new ApiError(404, 'No image');
  sendImage(res, img.data, img.contentType);
});
exports.list = asyncHandler(async (req, res) => {
  const filter = isAdmin(req.user) ? {} : { isPublished: true, audience: { $in: ['portal', 'both'] } };
  const rows = await Notice.find(filter).sort('-pinned -createdAt').limit(100).select('-image').populate('author', 'name');
  res.json({ success: true, data: await withPhotos(rows.map(base)) });
});
exports.create = asyncHandler(async (req, res) => {
  const doc = await Notice.create({ ...pick(req.body), author: req.user._id });
  try { await applyPhotos(doc, req); } catch (e) { await Notice.findByIdAndDelete(doc._id); throw e; }
  res.status(201).json({ success: true, data: await withPhotos(base(doc)) });
});
exports.update = asyncHandler(async (req, res) => {
  const doc = await Notice.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Notice not found');
  doc.set(pick(req.body)); await applyPhotos(doc, req); await doc.save();
  res.json({ success: true, data: await withPhotos(base(doc)) });
});
exports.remove = asyncHandler(async (req, res) => {
  const data = await Notice.findByIdAndDelete(req.params.id);
  if (!data) throw new ApiError(404, 'Notice not found');
  await NoticeImage.deleteMany({ notice: data._id });
  res.json({ success: true, message: 'Notice deleted' });
});
