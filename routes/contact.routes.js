const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const c = require('../controllers/contact.controller');
const { validate } = require('../middleware/error');
const { protect, authorize } = require('../middleware/auth');
const { NORMALIZE } = require('../validators/auth.validators');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, message: { success: false, message: 'Too many messages. Please try again later' } });
router.post('/', limiter, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter your name'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Enter a valid email').normalizeEmail(NORMALIZE),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Enter a valid phone number'),
  body('subject').optional().isIn(['admission', 'general', 'other']),
  body('message').trim().isLength({ min: 5, max: 2000 }).withMessage('Write a short message (5–2000 characters)'),
], validate, c.create);
router.get('/', protect, authorize('admin'), c.list);
router.patch('/:id/status', protect, authorize('admin'), body('status').isIn(['new', 'read', 'replied']), validate, c.setStatus);
router.delete('/:id', protect, authorize('admin'), c.remove);
module.exports = router;
