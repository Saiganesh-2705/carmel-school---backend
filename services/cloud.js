// Cloudinary storage for album photos. Used only when CLOUDINARY_URL (or the three CLOUDINARY_* values) is set;
// otherwise photos are kept in MongoDB. The "cloudinary" package is loaded lazily so the server still starts without it.
let cl = null; let tried = false;
const configured = () => !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
function client() {
  if (!configured()) return null;
  if (tried) return cl; tried = true;
  try {
    cl = require('cloudinary').v2;
    if (!process.env.CLOUDINARY_URL) cl.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    else cl.config({ secure: true });
  } catch (e) { console.error('Cloudinary is configured but the "cloudinary" package is missing. Run: npm install'); cl = null; }
  return cl;
}
exports.enabled = () => !!client();
exports.upload = (buffer, folder) => new Promise((resolve, reject) => {
  client().uploader.upload_stream({ folder: `carmel/${folder}`, resource_type: 'image', overwrite: false }, (err, r) => (err ? reject(err) : resolve({ url: r.secure_url, publicId: r.public_id }))).end(buffer);
});
exports.destroy = async (publicIds) => {
  const c = client(); const ids = publicIds.filter(Boolean); if (!c || !ids.length) return;
  for (let i = 0; i < ids.length; i += 100) { try { await c.api.delete_resources(ids.slice(i, i + 100)); } catch (e) { console.error('Cloudinary delete failed:', e.message); } }
};
