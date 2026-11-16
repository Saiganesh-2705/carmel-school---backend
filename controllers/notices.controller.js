const Notice = require('../models/Notice');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const isAdmin = (u) => ['admin', 'super_admin'].includes(u.role);
const pick = (b) => { const o = {}; for (const k of ['title', 'body', 'audience', 'pinned', 'isPublished']) if (b[k] !== undefined) o[k] = b[k]; return o; };

exports.publicList = asyncHandler(async (req, res) => {
  const data = await Notice.find({ isPublished: true, audience: { $in: ['public', 'both'] } }).sort('-pinned -createdAt').limit(30).select('-author');
  res.json({ success: true, data });
});
exports.list = asyncHandler(async (req, res) => {
  const filter = isAdmin(req.user) ? {} : { isPublished: true, audience: { $in: ['portal', 'both'] } };
  const data = await Notice.find(filter).sort('-pinned -createdAt').limit(100).populate('author', 'name');
  res.json({ success: true, data });
});
exports.create = asyncHandler(async (req, res) => {
  const data = await Notice.create({ ...pick(req.body), author: req.user._id });
  res.status(201).json({ success: true, data });
});
exports.update = asyncHandler(async (req, res) => {
  const data = await Notice.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  if (!data) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, data });
});
exports.remove = asyncHandler(async (req, res) => {
  const data = await Notice.findByIdAndDelete(req.params.id);
  if (!data) throw new ApiError(404, 'Notice not found');
  res.json({ success: true, message: 'Notice deleted' });
});
