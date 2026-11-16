const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ROLES } = require('../utils/roles');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ROLES, required: true, index: true },
  phone: { type: String, trim: true },
  photo: { type: String },
  isActive: { type: Boolean, default: true },
  passwordChangedAt: Date,
  lastLoginAt: Date,
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});
userSchema.methods.matchPassword = function (plain) { return bcrypt.compare(plain, this.password); };
userSchema.methods.createResetToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
  return raw;
};
userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.password; delete o.resetPasswordToken; delete o.resetPasswordExpires; delete o.__v;
  return o;
};
module.exports = mongoose.model('User', userSchema);
