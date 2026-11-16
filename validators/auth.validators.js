const { body } = require('express-validator');
const { ROLES } = require('../utils/roles');

// IMPORTANT: the default normalizeEmail() rewrites Gmail addresses (removes dots and +tags),
// so "a.b@gmail.com" was saved as "ab@gmail.com" and could never log in again.
// We only lower-case, everywhere, so what you save is what you log in with.
const NORMALIZE = {
  all_lowercase: true, gmail_remove_dots: false, gmail_remove_subaddress: false, gmail_convert_googlemaildotcom: false,
  outlookdotcom_remove_subaddress: false, yahoo_remove_subaddress: false, icloud_remove_subaddress: false,
};
const email = (f = 'email') => body(f).isString().trim().isEmail().withMessage('Enter a valid email').normalizeEmail(NORMALIZE);
const pw = (f) => body(f).isString().isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters')
  .matches(/[A-Za-z]/).withMessage('Password needs a letter').matches(/\d/).withMessage('Password needs a number');

exports.NORMALIZE = NORMALIZE;
exports.login = [body('email').isString().trim().notEmpty().withMessage('Enter your email').customSanitizer((v) => String(v).toLowerCase()),
  body('password').isString().notEmpty().withMessage('Enter your password'), body('remember').optional().toBoolean()];
exports.forgot = [email()];
exports.reset = [pw('password')];
exports.change = [body('currentPassword').notEmpty(), pw('newPassword')];
exports.profile = [body('name').optional().trim().isLength({ min: 2, max: 100 }), body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 })];
exports.createUser = [body('name').trim().isLength({ min: 2, max: 100 }), email(), pw('password'), body('role').optional().isIn(ROLES), body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 })];
exports.updateUser = [body('name').optional().trim().isLength({ min: 2, max: 100 }), body('role').optional().isIn(ROLES), body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 })];
exports.resetUserPassword = [pw('password')];
