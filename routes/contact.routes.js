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
  body('phone').optional({ checkFalsy: true }).trim().custom((v) => /^(\+91)?[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, ''))).withMessage('Enter a valid 10-digit mobile number'),
  body('subject').optional().isIn(['admission', 'general', 'other']),
  body('message').optional({ checkFalsy: true }).trim().isLength({ min: 5, max: 2000 }).withMessage('Write a short message (5–2000 characters)'),
  body('childName').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 100 }).withMessage('Enter the child’s name'),
  body('classApplying').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  body('childAge').optional({ checkFalsy: true }).isInt({ min: 1, max: 20 }).withMessage('Enter a valid age').toInt(),
  body('academicYear').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('previousSchool').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body('relation').optional({ checkFalsy: true }).isIn(['Mother', 'Father', 'Guardian']),
  body('visitTime').optional({ checkFalsy: true }).isIn(['morning', 'afternoon', 'any', 'none']),
  body('replyVia').optional({ checkFalsy: true }).isIn(['call', 'whatsapp', 'email']),
], validate, c.create);
router.get('/', protect, authorize('admin'), c.list);
router.patch('/:id/status', protect, authorize('admin'), body('status').isIn(['new', 'read', 'replied']), validate, c.setStatus);
router.delete('/:id', protect, authorize('admin'), c.remove);
module.exports = router;
