const User = require('../models/User');
const ContactMessage = require('../models/ContactMessage');
const Album = require('../models/Album');
const asyncHandler = require('../utils/asyncHandler');

exports.overview = asyncHandler(async (req, res) => {
  const scope = {};
  const [byRole, total, active, newMessages, totalMessages, notices, recentMessages, recentLogins] = await Promise.all([
    User.aggregate([{ $match: scope }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments(scope), User.countDocuments({ ...scope, isActive: true }),
    ContactMessage.countDocuments({ status: 'new' }), ContactMessage.countDocuments(),
    Album.countDocuments({ isPublished: true }),
    ContactMessage.find().sort('-createdAt').limit(5),
    User.find({ ...scope, lastLoginAt: { $exists: true } }).sort('-lastLoginAt').limit(5).select('name role lastLoginAt'),
  ]);
  res.json({ success: true, data: { users: { total, active, disabled: total - active, byRole: Object.fromEntries(byRole.map((r) => [r._id, r.count])) }, messages: { total: totalMessages, new: newMessages }, albums: notices, notices, recentMessages, recentLogins } });
});
