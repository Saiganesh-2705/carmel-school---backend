const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const cloud = require('../services/cloud');
const asyncHandler = require('../utils/asyncHandler');

// "Remember me" unticked -> shorter session (12h) and the browser keeps the token only until the tab closes.
const sign = (user, remember = true) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: remember ? (process.env.JWT_EXPIRES_IN || '7d') : '12h' });
const send = (res, user, status = 200, remember = true) => res.status(status).json({ success: true, token: sign(user, remember), user });

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email).trim().toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw new ApiError(401, 'Incorrect email or password');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled. Please contact the school office');
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  send(res, user, 200, req.body.remember !== false);
});
exports.me = asyncHandler(async (req, res) => res.json({ success: true, user: req.user }));
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (req.file) {
    if (cloud.enabled()) {
      let up;
      try { up = await cloud.upload(req.file.buffer, 'profiles'); } catch (e) { throw new ApiError(502, 'Photo storage (Cloudinary) rejected the upload. Check the Cloudinary settings on the server.'); }
      const old = req.user.photoId;
      req.user.photo = up.url; req.user.photoId = up.publicId;
      if (old) await cloud.destroy([old]);
    } else {
      // Cloudinary is not set up: keep the old behaviour (local disk, lost when Render restarts).
      const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
      const ext = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
      const name = crypto.randomBytes(16).toString('hex') + ext;
      fs.writeFileSync(path.join(__dirname, '..', 'uploads', name), req.file.buffer);
      req.user.photo = `/uploads/${name}`;
    }
  }
  await req.user.save();
  res.json({ success: true, user: req.user });
});
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  send(res, user);
});
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email).trim().toLowerCase() });
  if (user) {
    const raw = user.createResetToken();
    await user.save({ validateBeforeSave: false });
    const link = `${process.env.CLIENT_URL.split(',')[0]}/reset-password/${raw}`;
    // Email delivery is not wired yet (needs a provider such as Resend/SendGrid). Link is logged in development only.
    if (process.env.NODE_ENV !== 'production') console.log(`Password reset link for ${user.email}: ${link}`);
  }
  res.json({ success: true, message: 'If that email is registered, a reset link has been sent' });
});
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpires: { $gt: Date.now() } }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');
  user.password = req.body.password;
  user.resetPasswordToken = undefined; user.resetPasswordExpires = undefined;
  await user.save();
  send(res, user);
});
