const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const isSuper = (u) => u.role === 'super_admin';
// Only a Super Admin may touch Super Admin accounts.
const assertCanManage = (actor, target) => { if (isSuper(target) && !isSuper(actor)) throw new ApiError(403, 'Only a Super Admin can manage Super Admin accounts'); };

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1), limit = Math.min(+req.query.limit || 10, 100);
  const filter = {};
  if (req.query.role) filter.role = String(req.query.role);
  if (req.query.search) {
    const s = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(s, 'i') }, { email: new RegExp(s, 'i') }];
  }
  if (!isSuper(req.user)) filter.role = filter.role && filter.role !== 'super_admin' ? filter.role : { $ne: 'super_admin' };
  const [data, total] = await Promise.all([
    User.find(filter).sort(String(req.query.sort || '-createdAt')).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
exports.create = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (role === 'super_admin' && !isSuper(req.user)) throw new ApiError(403, 'Only a Super Admin can create Super Admins');
  const user = await User.create({ name, email, password, role, phone });
  res.status(201).json({ success: true, user });
});
exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  assertCanManage(req.user, user);
  const { name, role, phone } = req.body;
  if (role && role !== user.role) {
    if (String(user._id) === String(req.user._id)) throw new ApiError(400, 'You cannot change your own role');
    if (role === 'super_admin' && !isSuper(req.user)) throw new ApiError(403, 'Only a Super Admin can create Super Admins');
    user.role = role;
  }
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  res.json({ success: true, user });
});
exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  assertCanManage(req.user, user);
  user.password = req.body.password; // hashed by the model; also signs the user out everywhere
  await user.save();
  res.json({ success: true, message: 'Password updated. The user must sign in again' });
});
exports.setActive = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot disable your own account');
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, 'User not found');
  assertCanManage(req.user, target);
  target.isActive = !!req.body.isActive;
  await target.save();
  res.json({ success: true, user: target });
});
exports.remove = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, 'User not found');
  assertCanManage(req.user, target);
  await target.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});
