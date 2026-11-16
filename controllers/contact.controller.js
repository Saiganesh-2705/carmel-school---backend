const ContactMessage = require('../models/ContactMessage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  if (req.body.website) return res.status(201).json({ success: true }); // honeypot: bots fill this hidden field
  const { name, email, phone, subject, message } = req.body;
  if (!email && !phone) throw new ApiError(422, 'Please give an email or a phone number so we can reply');
  await ContactMessage.create({ name, email, phone, subject, message });
  res.status(201).json({ success: true, message: 'Thank you. We will get back to you soon.' });
});
exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1), limit = Math.min(+req.query.limit || 20, 100);
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  const [data, total] = await Promise.all([ContactMessage.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit), ContactMessage.countDocuments(filter)]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
exports.setStatus = asyncHandler(async (req, res) => {
  const m = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!m) throw new ApiError(404, 'Message not found');
  res.json({ success: true, data: m });
});
exports.remove = asyncHandler(async (req, res) => {
  const m = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!m) throw new ApiError(404, 'Message not found');
  res.json({ success: true, message: 'Message deleted' });
});
