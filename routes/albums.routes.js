const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/albums.controller');
const { validate } = require('../middleware/error');
const { protect, authorize } = require('../middleware/auth');
const { uploadAlbumImages } = require('../middleware/upload');

const rules = (isNew) => [
  body('title')[isNew ? 'trim' : 'optional']().isLength({ min: 3, max: 120 }).withMessage('Title must be 3–120 characters'),
  body('description').optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage('Description can be up to 2000 characters'),
  body('category').optional().isIn(['celebration', 'festival', 'sports', 'cultural', 'academic', 'other']),
  body('eventDate').optional({ checkFalsy: true }).isISO8601().withMessage('Enter a valid date'),
  body('isPublished').optional().isBoolean().toBoolean(),
];
router.get('/public', c.publicList);          // school website, no login
router.get('/:id/images/:imgId', c.image);    // photo (ids are unguessable)
router.use(protect, authorize('admin'));
router.get('/', c.list);
router.post('/', uploadAlbumImages, rules(true), validate, c.create);
router.put('/:id', uploadAlbumImages, rules(false), validate, c.update);
router.delete('/:id', c.remove);
module.exports = router;
