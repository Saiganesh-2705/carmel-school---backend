const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

exports.validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(422, 'Validation failed', details));
};
exports.notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line
  let status = err.status || 500, message = err.message, details = err.details;
  if (err.code === 11000) { status = 409; message = `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists`; }
  if (err.name === 'ValidationError') { status = 422; details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })); message = 'Validation failed'; }
  if (err.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  if (err.name === 'MulterError') status = 400;
  if (status === 500) { console.error(err); if (process.env.NODE_ENV === 'production') message = 'Something went wrong'; }
  res.status(status).json({ success: false, message, ...(details && { errors: details }) });
};
