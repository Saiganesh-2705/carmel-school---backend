// Uploads the website's own pictures (client/public/images) to Cloudinary, folder "carmel/site".
// Run once from the server folder, giving the path of the images folder:
//   node scripts/upload-site-images.js "C:\Users\saig6\OneDrive\Desktop\projects\sms\client\public\images"
// Safe to run again: pictures with the same name are replaced.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloud = require('../services/cloud');

(async () => {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir)) { console.log('Give the path to client/public/images, for example:\n  node scripts/upload-site-images.js "C:\\path\\to\\client\\public\\images"'); process.exit(1); }
  if (!cloud.enabled()) { console.log('Cloudinary is not set up in server/.env (run npm run check:cloud).'); process.exit(1); }
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  let ok = 0; const failed = [];
  for (const f of files) {
    const id = f.replace(/\.[^.]+$/, '');
    try { await cloud.uploadWithName(fs.readFileSync(path.join(dir, f)), 'site', id); ok++; console.log(`uploaded ${f}`); }
    catch (e) { failed.push(f); console.log(`FAILED ${f}: ${(e && (e.message || (e.error && e.error.message))) || e}`); }
  }
  console.log(`\nDone: ${ok} of ${files.length} uploaded.${failed.length ? ` Failed: ${failed.join(', ')}` : ''}`);
  if (!failed.length) console.log(`\nNext: in Vercel add  VITE_CLOUDINARY_CLOUD_NAME=${process.env.CLOUDINARY_CLOUD_NAME || '<your cloud name>'}  and redeploy the website.`);
  process.exit(failed.length ? 1 : 0);
})();
