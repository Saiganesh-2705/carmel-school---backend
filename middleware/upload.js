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

// Notice photos: up to 10 per upload, 3 MB each, kept in memory and then saved inside the database.
exports.uploadNoticeImages = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: 3 * 1024 * 1024, files: 10 } }).array('images', 10);

// Album photos: up to 25 per request (the website sends big albums in several requests), 8 MB each.
// The website shrinks every photo before sending, so real uploads are far smaller.
exports.uploadAlbumImages = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: 8 * 1024 * 1024, files: 25 } }).array('images', 25);
