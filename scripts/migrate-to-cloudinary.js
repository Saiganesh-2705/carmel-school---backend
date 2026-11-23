// Moves photos that are still stored inside MongoDB (album photos, notice photos, old notice covers) to Cloudinary.
// Run once from the server folder:  npm run migrate:cloud
// It is safe to run again: photos that already have a Cloudinary address are skipped.
require('dotenv').config();
const mongoose = require('mongoose');
const cloud = require('../services/cloud');
const AlbumImage = require('../models/AlbumImage');
const NoticeImage = require('../models/NoticeImage');
const Notice = require('../models/Notice');

(async () => {
  if (!cloud.enabled()) { console.log('Cloudinary is not set up in server/.env (run npm run check:cloud).'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  let moved = 0; let failed = 0;

  for (const [Model, key, folder] of [[AlbumImage, 'album', (d) => String(d.album)], [NoticeImage, 'notice', (d) => `notices/${d.notice}`]]) {
    const rows = await Model.find({ url: { $exists: false } }).select('+data +contentType');
    for (const r of rows) {
      if (!r.data || !r.data.length) continue;
      try {
        const up = await cloud.upload(r.data, folder(r));
        await Model.updateOne({ _id: r._id }, { $set: { url: up.url, publicId: up.publicId }, $unset: { data: 1, contentType: 1 } });
        moved++; console.log(`moved ${key} photo ${r._id}`);
      } catch (e) { failed++; console.log(`FAILED ${key} photo ${r._id}: ${e.message || e}`); }
    }
  }

  // Older notices kept one cover image inside the notice itself: turn it into a normal notice photo.
  const covers = await Notice.find({ hasImage: true }).select('+image.data +image.contentType');
  for (const n of covers) {
    if (!n.image || !n.image.data || !n.image.data.length) continue;
    try {
      const up = await cloud.upload(n.image.data, `notices/${n._id}`);
      await NoticeImage.create({ notice: n._id, url: up.url, publicId: up.publicId, createdAt: new Date(0) });
      await Notice.collection.updateOne({ _id: n._id }, { $set: { hasImage: false }, $unset: { image: 1 } });
      moved++; console.log(`moved notice cover ${n._id}`);
    } catch (e) { failed++; console.log(`FAILED notice cover ${n._id}: ${e.message || e}`); }
  }

  console.log(`\nDone. Moved ${moved}, failed ${failed}.`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
