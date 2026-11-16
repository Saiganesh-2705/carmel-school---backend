require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in server/.env');
const isProd = process.env.NODE_ENV === 'production';
const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CLIENT_URL may hold several comma-separated origins. In development ANY localhost / 127.0.0.1 port is also accepted,
// so the site works whether Vite starts on 5173, 5174 or you open it via 127.0.0.1.
const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
const vercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
app.use(cors({
  origin: (origin, cb) => {
    // Allowed: no origin (mobile apps, curl), anything in CLIENT_URL, "*" in CLIENT_URL, your Vercel deployments, and localhost in development.
    // Login uses a Bearer token (not cookies), so accepting *.vercel.app is safe and stops CORS errors on preview/alias URLs.
    if (!origin || allowed.includes('*') || allowed.includes(origin) || vercelOrigin.test(origin) || (!isProd && localOrigin.test(origin))) return cb(null, true);
    console.warn(`CORS blocked origin ${origin}. Add it to CLIENT_URL in server/.env`);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
if (!isProd) app.use(morgan('dev'));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
// Only FAILED logins count towards the limit, so normal users are never locked out by their own successful sign-ins.
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many failed attempts. Try again in 15 minutes' } }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, message: { success: false, message: 'Too many requests. Try again later' } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/contact', require('./routes/contact.routes'));
app.use('/api/notices', require('./routes/notices.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
// Next modules mount here: students, teachers, parents, classes, ...

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDB()
  .then(async () => {
    await require('./utils/seedData').migrateToAdminOnly();
    // First run on an empty development database: create the demo accounts so you can log in immediately.
    if (!isProd) {
      const User = require('./models/User');
      if ((await User.countDocuments()) === 0) {
        await require('./utils/seedData').seedDemo();
        console.log('Empty database detected: demo accounts created (admin@school.test / Password123)');
      }
    }
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  })
  .catch((e) => { console.error(e.message); process.exit(1); });
