const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new ApiError(401, 'Session expired. Please sign in again'); }
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or disabled');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime())
    throw new ApiError(401, 'Password changed. Please sign in again');
  req.user = user;
  next();
});

// super_admin always passes
exports.authorize = (...roles) => (req, res, next) => {
  if (req.user.role === 'super_admin' || roles.includes(req.user.role)) return next();
  next(new ApiError(403, 'You do not have permission to do this'));
};
