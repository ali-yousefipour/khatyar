import { Router } from 'express';
import { z } from 'zod';
import { q } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

// ارسال گزارش (سلسله‌مراتبی یا مستقیم به یک شخص)
reportsRouter.post('/', async (req, res) => {
  const s = z.object({
    subject: z.string().min(1), body: z.string().min(1),
    to_user_id: z.number().optional(), // null = ارسال به مدیر بالادست
  });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const r = await q(
    `INSERT INTO reports(sender_id,subject,body) VALUES ($1,$2,$3) RETURNING id, created_at`,
    [req.user.id, p.data.subject, p.data.body]);
  let target = p.data.to_user_id ?? null;
  if (!target) {
    const m = await q(`SELECT manager_id FROM users WHERE id=$1`, [req.user.id]);
    target = m.rows[0]?.manager_id ?? null;
  }
  await q(`INSERT INTO report_routes(report_id,to_user_id,action,actor_id)
           VALUES ($1,$2,'forward',$3)`, [r.rows[0].id, target, req.user.id]);
  res.status(201).json(r.rows[0]);
});

// لیست گزارش‌ها با فیلتر (شخص/زمان/موضوع) — مدیرکل و رییس اداره
reportsRouter.get('/', async (req, res) => {
  const { sender, from, to, subject } = req.query;
  const conds = [], params = [];
  if (sender) { params.push(`%${sender}%`); conds.push(`(u.first_name||' '||u.last_name) ILIKE $${params.length}`); }
  if (subject) { params.push(`%${subject}%`); conds.push(`r.subject ILIKE $${params.length}`); }
  if (from) { params.push(from); conds.push(`r.created_at >= $${params.length}`); }
  if (to) { params.push(to); conds.push(`r.created_at <= $${params.length}`); }
  // نیروهای پایین فقط گزارش‌های خودشان را می‌بینند
  if (req.user.level > 3) { params.push(req.user.id); conds.push(`r.sender_id = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await q(
    `SELECT r.*, u.first_name, u.last_name FROM reports r
     JOIN users u ON u.id=r.sender_id ${where}
     ORDER BY r.created_at DESC LIMIT 200`, params);
  res.json(rows);
});

// یک گزارش با کل گردش کار
reportsRouter.get('/:id', async (req, res) => {
  const r = await q(
    `SELECT r.*, u.first_name, u.last_name FROM reports r
     JOIN users u ON u.id=r.sender_id WHERE r.id=$1`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'یافت نشد' });
  const trail = await q(
    `SELECT rr.*, a.first_name a_first, a.last_name a_last
     FROM report_routes rr JOIN users a ON a.id=rr.actor_id
     WHERE rr.report_id=$1 ORDER BY rr.created_at`, [req.params.id]);
  res.json({ ...r.rows[0], trail: trail.rows });
});

// ارجاع / درج نظر / پاسخ (سطوح بالاتر)
reportsRouter.post('/:id/action', async (req, res) => {
  const s = z.object({
    action: z.enum(['forward', 'comment', 'reply']),
    to_user_id: z.number().optional(), note: z.string().optional(),
  });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  await q(`INSERT INTO report_routes(report_id,to_user_id,action,note,actor_id)
           VALUES ($1,$2,$3,$4,$5)`,
    [req.params.id, p.data.to_user_id ?? null, p.data.action, p.data.note ?? null, req.user.id]);
  const status = p.data.action === 'reply' ? 'answered'
    : p.data.action === 'forward' ? 'forwarded' : 'seen';
  await q(`UPDATE reports SET status=$1 WHERE id=$2`, [status, req.params.id]);
  res.json({ ok: true });
});

// خروجی PDF/چاپ (قالب توسط مدیرکل قابل تنظیم)
reportsRouter.get('/:id/print', requireAdmin, async (req, res) => {
  const r = await q(`SELECT * FROM reports WHERE id=$1`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'یافت نشد' });
  const tpl = await q(`SELECT html FROM print_templates ORDER BY id LIMIT 1`);
  res.json({ report: r.rows[0], template: tpl.rows[0]?.html ?? null });
});
