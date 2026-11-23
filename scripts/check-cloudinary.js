// Run:  npm run check:cloud   (inside the server folder)
// Tells you whether the Cloudinary settings in server/.env work.
require('dotenv').config();
const cloud = require('../services/cloud');

(async () => {
  if (!cloud.configured()) { console.log('Cloudinary is NOT set up. Add CLOUDINARY_URL (or the three CLOUDINARY_* values) to server/.env.'); process.exit(1); }
  if (!cloud.enabled()) { console.log('Keys found, but the "cloudinary" package is missing. Run: npm install'); process.exit(1); }
  try { await cloud.ping(); console.log('OK: connected to Cloudinary. Photo uploads will go there.'); }
  catch (e) { console.log('FAILED: Cloudinary refused the keys.', (e && (e.message || (e.error && e.error.message))) || ''); process.exit(1); }
})();
