const Album = require('../models/Album');
const AlbumImage = require('../models/AlbumImage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const cloud = require('../services/cloud');

const MAX_PHOTOS = 500;
const FIELDS = ['title', 'description', 'category', 'eventDate', 'isPublished'];
const pick = (b) => { const o = {}; for (const k of FIELDS) if (b[k] !== undefined && b[k] !== '') o[k] = b[k]; return o; };
const parseIds = (v) => { try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a.map(String) : []; } catch { return []; } };

// Adds o.photos (photo ids, oldest first). The first photo is the cover.
async function withPhotos(objs) {
  const list = Array.isArray(objs) ? objs : [objs];
  const imgs = await AlbumImage.find({ album: { $in: list.map((o) => o._id) } }).select('album url').sort('createdAt');
  const by = {}; const cdn = {};
  imgs.forEach((i) => { (by[i.album] = by[i.album] || []).push(String(i._id)); if (i.url) (cdn[i.album] = cdn[i.album] || {})[i._id] = i.url; });
  list.forEach((o) => { o.photos = by[o._id] || []; o.cdn = cdn[o._id] || {}; });
  return objs;
}
const plain = (d) => (d.toObject ? d.toObject() : d);

async function applyPhotos(album, req) {
  const ids = parseIds(req.body.removeImages).filter((x) => /^[a-f\d]{24}$/i.test(x));
  if (ids.length) {
    const gone = await AlbumImage.find({ album: album._id, _id: { $in: ids } }).select('publicId');
    await AlbumImage.deleteMany({ album: album._id, _id: { $in: ids } });
    await cloud.destroy(gone.map((g) => g.publicId));
  }
  const files = req.files || [];
  if (files.length) {
    const have = await AlbumImage.countDocuments({ album: album._id });
    if (have + files.length > MAX_PHOTOS) throw new ApiError(400, `An album can have up to ${MAX_PHOTOS} photos`);
    if (cloud.enabled()) {
      // Upload to Cloudinary a few at a time, keeping the order the admin chose.
      const out = new Array(files.length); let next = 0;
      const worker = async () => { while (next < files.length) { const n = next++; out[n] = await cloud.upload(files[n].buffer, String(album._id)); } };
      try { await Promise.all([worker(), worker(), worker(), worker()]); }
      catch (e) { await cloud.destroy(out.filter(Boolean).map((o) => o.publicId)); throw new ApiError(502, 'Photo storage (Cloudinary) rejected the upload. Check the Cloudinary settings on the server.'); }
      // Distinct, increasing timestamps keep the photos in the order they were chosen.
      const t0 = Date.now();
      await AlbumImage.insertMany(out.map((o, n) => ({ album: album._id, url: o.url, publicId: o.publicId, createdAt: new Date(t0 + n) })), { timestamps: false });
    } else {
      const t0 = Date.now();
      await AlbumImage.insertMany(files.map((f, n) => ({ album: album._id, data: f.buffer, contentType: f.mimetype, createdAt: new Date(t0 + n) })), { timestamps: false });
    }
  }
}

exports.publicList = asyncHandler(async (req, res) => {
  const rows = await Album.find({ isPublished: true }).sort('-eventDate -createdAt').limit(60).select('-author');
  const data = (await withPhotos(rows.map(plain))).filter((a) => a.photos.length > 0);
  res.json({ success: true, data });
});
exports.list = asyncHandler(async (req, res) => {
  const rows = await Album.find({}).sort('-eventDate -createdAt').limit(200).populate('author', 'name');
  res.json({ success: true, data: await withPhotos(rows.map(plain)) });
});
exports.image = asyncHandler(async (req, res) => {
  const img = await AlbumImage.findOne({ _id: req.params.imgId, album: req.params.id }).select('+data +contentType');
  if (!img) throw new ApiError(404, 'No image');
  if (img.url) return res.redirect(301, img.url);
  res.set({ 'Content-Type': img.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin' });
  res.send(img.data);
});
exports.create = asyncHandler(async (req, res) => {
  const doc = await Album.create({ ...pick(req.body), author: req.user._id });
  try { await applyPhotos(doc, req); } catch (e) { await Album.findByIdAndDelete(doc._id); throw e; }
  res.status(201).json({ success: true, data: await withPhotos(plain(doc)) });
});
exports.update = asyncHandler(async (req, res) => {
  const doc = await Album.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Album not found');
  doc.set(pick(req.body)); await applyPhotos(doc, req); await doc.save();
  res.json({ success: true, data: await withPhotos(plain(doc)) });
});
exports.remove = asyncHandler(async (req, res) => {
  const doc = await Album.findByIdAndDelete(req.params.id);
  if (!doc) throw new ApiError(404, 'Album not found');
  const all = await AlbumImage.find({ album: doc._id }).select('publicId');
  await AlbumImage.deleteMany({ album: doc._id });
  await cloud.destroy(all.map((g) => g.publicId));
  res.json({ success: true, message: 'Album deleted' });
});

// Where new photos are stored, and (for Cloudinary) whether the keys really work.
exports.storage = asyncHandler(async (req, res) => {
  if (!cloud.configured()) return res.json({ success: true, data: { provider: 'database', ok: true, message: 'Photos are saved in MongoDB. For hundreds of photos, switch on Cloudinary (see docs/CLOUDINARY-SETUP.md).' } });
  if (!cloud.enabled()) return res.json({ success: true, data: { provider: 'cloudinary', ok: false, message: 'Cloudinary keys are set, but the "cloudinary" package is not installed on the server. Run npm install in the server folder and restart.' } });
  try { await cloud.ping(); res.json({ success: true, data: { provider: 'cloudinary', ok: true, message: 'Connected to Cloudinary. Albums can hold up to 500 photos.' } }); }
  catch (e) { res.json({ success: true, data: { provider: 'cloudinary', ok: false, message: `Cloudinary refused the keys (${(e && (e.message || (e.error && e.error.message))) || 'unknown error'}). Check the cloud name, API key and API secret.` } }); }
});
