const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
});
const imageFilter = (req, file, cb) =>
  ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WebP images are allowed'));
exports.uploadPhoto = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } }).single('photo');

// Notice cover image: kept in memory, then saved inside the database (3 MB max).
exports.uploadNoticeImage = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: 3 * 1024 * 1024 } }).single('image');
