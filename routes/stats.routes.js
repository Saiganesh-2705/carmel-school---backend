const router = require('express').Router();
const { overview } = require('../controllers/stats.controller');
const { protect, authorize } = require('../middleware/auth');
router.get('/overview', protect, authorize('admin'), overview);
module.exports = router;
