const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/chat.controller');

// 15 questions a minute per visitor keeps the free Groq quota safe from abuse.
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many questions. Please wait a minute.' } });
router.post('/', limiter, c.chat);
module.exports = router;
