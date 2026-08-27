import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

// ---------- تنظیمات سامانه ----------
settingsRouter.get('/settings', async (_req, res) => {
  const { rows } = await q(`SELECT key, value FROM app_settings`);
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});
settingsRouter.put('/settings', requireAdmin, async (req, res) => {
  const entries = Object.entries(req.body || {});
  for (const [k, v] of entries)
    await q(`INSERT INTO app_settings(key,value,updated_at) VALUES ($1,$2,now())
             ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
      [k, JSON.stringify(v)]);
  res.json({ ok: true, updated: entries.length });
});

// ---------- تغییر رمز (و رفع الزام تغییر رمز اولیه) ----------
settingsRouter.post('/change-password', async (req, res) => {
  const s = z.object({ current: z.string(), next: z.string().min(6) });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر' });
  const u = await q(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  if (!(await bcrypt.compare(p.data.current, u.rows[0].password_hash)))
    return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  const hash = await bcrypt.hash(p.data.next, 10);
  await q(`UPDATE users SET password_hash=$1, must_change_pw=FALSE WHERE id=$2`, [hash, req.user.id]);
  res.json({ ok: true });
});

// ---------- فرم‌های سفارشی مدیرکل ----------
settingsRouter.get('/forms', async (_req, res) =>
  res.json((await q(`SELECT id,title,schema,is_active FROM custom_forms WHERE is_active ORDER BY id`)).rows));
settingsRouter.post('/forms', requireAdmin, async (req, res) => {
  const s = z.object({ title: z.string(), schema: z.array(z.object({
    key: z.string(), label: z.string(), type: z.enum(['text', 'number', 'select', 'checkbox']),
    options: z.array(z.string()).optional(),
  })) });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ساختار فرم نامعتبر' });
  const { rows } = await q(`INSERT INTO custom_forms(title,schema) VALUES ($1,$2) RETURNING id`,
    [p.data.title, JSON.stringify(p.data.schema)]);
  res.status(201).json(rows[0]);
});

// ---------- قالب چاپ گزارش‌ها ----------
settingsRouter.get('/print-templates', async (_req, res) =>
  res.json((await q(`SELECT id,name,html FROM print_templates ORDER BY id`)).rows));
settingsRouter.put('/print-templates', requireAdmin, async (req, res) => {
  const { name, html } = req.body;
  const { rows } = await q(
    `INSERT INTO print_templates(name,html) VALUES ($1,$2) RETURNING id`, [name, html]);
  res.status(201).json(rows[0]);
});


// تکمیل فرم سفارشی توسط نیرو
settingsRouter.post('/form-submit', async (req, res) => {
  const s = z.object({ form_id: z.number(), driver_id: z.number().optional(), answers: z.record(z.any()) });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const { rows } = await q(
    `INSERT INTO form_submissions(form_id,user_id,driver_id,answers)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [p.data.form_id, req.user.id, p.data.driver_id ?? null, JSON.stringify(p.data.answers)]);
  res.status(201).json(rows[0]);
});

// ---------- جمع‌بندی حضور (روزانه / ماهانه) ----------
settingsRouter.get('/attendance-summary/:driverId', async (req, res) => {
  const daily = await q(
    `SELECT created_at::date d, count(*)::int n FROM attendances
     WHERE driver_id=$1 AND created_at > now()-interval '30 days'
     GROUP BY 1 ORDER BY 1 DESC`, [req.params.driverId]);
  const monthly = await q(
    `SELECT to_char(created_at,'YYYY-MM') m, count(*)::int n FROM attendances
     WHERE driver_id=$1 GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, [req.params.driverId]);
  res.json({ daily: daily.rows, monthly: monthly.rows });
});
