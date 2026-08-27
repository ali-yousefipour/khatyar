import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const LOCK_PATH = path.join(ROOT, '.installed');
const SCHEMA = path.resolve(ROOT, '../db/schema.sql');
const PERSONNEL = path.join(ROOT, 'seed/personnel.json');

export const isInstalled = () => fs.existsSync(LOCK_PATH);

export const installRouter = Router();

// اگر قبلاً نصب شده، نصاب قفل است
installRouter.use((req, res, next) => {
  if (isInstalled() && req.path !== '/status')
    return res.status(403).json({ error: 'سامانه قبلاً نصب شده است. برای نصب مجدد فایل .installed را حذف کنید.' });
  next();
});

installRouter.get('/status', (_req, res) => res.json({ installed: isInstalled() }));

installRouter.get('/requirements', (_req, res) => {
  const major = Number(process.versions.node.split('.')[0]);
  res.json({ items: [
    { label: 'نسخهٔ Node.js', ok: major >= 18, detail: `v${process.versions.node}` },
    { label: 'قابلیت نوشتن فایل تنظیمات', ok: canWrite(ROOT), detail: canWrite(ROOT) ? 'مجاز' : 'غیرمجاز' },
    { label: 'فایل ساختار دیتابیس', ok: fs.existsSync(SCHEMA), detail: fs.existsSync(SCHEMA) ? 'موجود' : 'یافت نشد' },
    { label: 'فایل لیست پرسنل', ok: fs.existsSync(PERSONNEL), detail: fs.existsSync(PERSONNEL) ? 'موجود' : 'یافت نشد' },
  ] });
});

const connString = (db) =>
  `postgres://${encodeURIComponent(db.user)}:${encodeURIComponent(db.pass)}@${db.host}:${db.port}/${db.name}`;

installRouter.post('/test-db', async (req, res) => {
  const client = new pg.Client({ connectionString: connString(req.body) });
  try {
    await client.connect();
    await client.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  } finally { await client.end().catch(() => {}); }
});

installRouter.post('/run', async (req, res) => {
  const { db, admin, jwt } = req.body || {};
  if (!admin?.un || !admin?.pw)
    return res.status(400).json({ error: 'نام کاربری و رمز مدیرکل لازم است' });
  const url = connString(db);
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    // ۱) ساخت جداول
    await client.query(fs.readFileSync(SCHEMA, 'utf8'));
    // ۲) نقش‌ها
    const roles = [
      ['مدیر کل', 1, true], ['معاونت نظارت و بازرسی', 2, true], ['رییس اداره بازرسی', 3, true],
      ['سربازرس ارشد', 4, false], ['نیروی اداری ارشد', 4, false], ['مسئول پروژه', 4, false],
      ['سربازرس', 5, false], ['نیروی اداری', 5, false], ['بازرس', 6, false],
      ['نماینده اجرایی', 6, false], ['اپراتور', 7, false], ['ناظر خط مبادی', 7, false],
      ['ناظر خط ثامن', 7, false], ['ناظر خط', 7, false], ['نظارت تصویری', 7, false],
    ];
    for (const [t, l, a] of roles)
      await client.query(`INSERT INTO roles(title,level,is_admin) VALUES ($1,$2,$3)
        ON CONFLICT (title) DO UPDATE SET level=$2,is_admin=$3`, [t, l, a]);
    // ۳) حساب مدیرکل
    const adminRole = (await client.query(`SELECT id FROM roles WHERE title='مدیر کل'`)).rows[0].id;
    const adminHash = await bcrypt.hash(admin.pw, 10);
    await client.query(`INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw)
      VALUES ($1,$2,$3,$4,$5,FALSE)
      ON CONFLICT (username) DO UPDATE SET password_hash=$4, role_id=$5`,
      [admin.un, admin.fn || 'مدیر', admin.ln || 'کل', adminHash, adminRole]);
    // ۴) حساب‌های پرسنل (رمز 123456)
    if (fs.existsSync(PERSONNEL)) {
      const people = JSON.parse(fs.readFileSync(PERSONNEL, 'utf8'));
      const h = await bcrypt.hash('123456', 10);
      for (const p of people) {
        const r = await client.query(`SELECT id FROM roles WHERE title=$1`, [p.role_title]);
        const rid = r.rows[0]?.id ?? (await client.query(`SELECT id FROM roles WHERE level=7 LIMIT 1`)).rows[0].id;
        await client.query(`INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw)
          VALUES ($1,$2,$3,$4,$5,TRUE) ON CONFLICT (username) DO NOTHING`,
          [p.national_id, p.first_name, p.last_name, h, rid]);
      }
    }
    // ۵) نوشتن فایل تنظیمات
    const secret = jwt || crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(ENV_PATH,
      `DATABASE_URL=${url}\nJWT_SECRET=${secret}\nJWT_ACCESS_TTL=15m\nJWT_REFRESH_TTL=30d\nPORT=4000\n`);
    // ۶) قفل نصاب
    fs.writeFileSync(LOCK_PATH, new Date().toISOString());
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally { await client.end().catch(() => {}); }
});

function canWrite(dir) { try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; } }
