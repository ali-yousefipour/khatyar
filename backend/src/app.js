import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';
import { adminRouter } from './routes/admin.js';
import { reportsRouter } from './routes/reports.js';
import { settingsRouter } from './routes/settings.js';
import { missionRouter } from './routes/missions.js';
import { operationsRouter } from './routes/operations.js';
import { installRouter, isInstalled } from '../install/install.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false, // پنل فعلی اسکریپت‌های inline دارد؛ سایر هدرهای Helmet فعال می‌مانند.
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.PUBLIC_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // native apps / same-origin tools
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS origin is not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb', strict: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression({ threshold: 1024 }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// ---- نصاب وب ----
app.use('/install', installRouter);
app.get('/install', (_req, res) =>
  res.sendFile(path.resolve(__dirname, '../install/installer.html')));

// اگر هنوز نصب نشده، همه را به نصاب هدایت کن
app.use((req, res, next) => {
  if (!isInstalled() && !req.path.startsWith('/install') && req.path !== '/health' && req.path !== '/api/health')
    return res.redirect('/install');
  next();
});

app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30 }), authRouter);
app.use('/api', apiRouter);
app.use('/api', missionRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', settingsRouter);

app.get(['/health','/api/health'], (_req, res) => res.json({ ok: true, installed: isInstalled() }));

// ---- پنل وب (فایل استاتیک) ----
app.use(express.static(path.resolve(__dirname, '../public'), {
  etag: true,
  lastModified: true,
  maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0,
  setHeaders(res, filePath) {
    if (/\.html$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    else if (/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  }
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'مسیر یافت نشد' }));
app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err && err.message ? err.message : err);
  if (err && err.message === 'CORS origin is not allowed') return res.status(403).json({ error: 'مبدأ درخواست مجاز نیست' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'حجم درخواست بیش از حد مجاز است' });
  return res.status(500).json({ error: 'خطای داخلی سرور' });
});
