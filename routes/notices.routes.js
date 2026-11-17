const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/notices.controller');
const { validate } = require('../middleware/error');
const { protect, authorize } = require('../middleware/auth');
const { uploadNoticeImage } = require('../middleware/upload');

const rules = (req) => [
  body('title')[req ? 'trim' : 'optional']().isLength({ min: 3, max: 150 }).withMessage('Title must be 3–150 characters'),
  body('body')[req ? 'trim' : 'optional']().isLength({ min: 3, max: 3000 }).withMessage('Write the notice (3–3000 characters)'),
  body('article').optional({ checkFalsy: true }).isLength({ max: 10000 }).withMessage('Article can be up to 10000 characters'),
  body('category').optional().isIn(['general', 'admission', 'event', 'holiday', 'achievement']),
  body('audience').optional().isIn(['public', 'portal', 'both']),
  body('pinned').optional().isBoolean().toBoolean(),
  body('isPublished').optional().isBoolean().toBoolean(),
];
router.get('/public', c.publicList); // school website, no login
router.get('/public/:id', c.publicOne);
router.get('/:id/image', c.image); // cover image (ids are unguessable)
router.use(protect);
router.get('/', c.list);
router.post('/', authorize('admin'), uploadNoticeImage, rules(true), validate, c.create);
router.put('/:id', authorize('admin'), uploadNoticeImage, rules(false), validate, c.update);
router.delete('/:id', authorize('admin'), c.remove);
module.exports = router;
