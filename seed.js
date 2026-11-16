require('dotenv').config();
const mongoose = require('mongoose');
const { seedDemo, PASSWORD } = require('./utils/seedData');

(async () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    console.error('Refusing to create demo accounts in production. Set ALLOW_SEED=true only if you really mean it.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await seedDemo({ resetPasswords: true });
  console.log(`Seeded. Demo accounts (…@school.test) now use password: ${PASSWORD}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
