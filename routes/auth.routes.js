const router = require('express').Router();
const c = require('../controllers/auth.controller');
const v = require('../validators/auth.validators');
const { validate } = require('../middleware/error');
const { protect } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

router.post('/login', v.login, validate, c.login);
router.post('/forgot-password', v.forgot, validate, c.forgotPassword);
router.post('/reset-password/:token', v.reset, validate, c.resetPassword);
router.get('/me', protect, c.me);
router.put('/profile', protect, uploadPhoto, v.profile, validate, c.updateProfile);
router.put('/change-password', protect, v.change, validate, c.changePassword);
module.exports = router;
