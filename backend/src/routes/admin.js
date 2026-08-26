import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { q } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(authenticate);

const upload = multer({ dest: '/tmp/uploads' });

// ---------- محدودهٔ خطوط (ایستگاه‌ها) ----------
adminRouter.post('/geofences', requireAdmin, async (req, res) => {
  const b = req.body;
  const { rows } = await q(
    `INSERT INTO geofences(line_id,name,type,color,center_lat,center_lng,radius_m,polygon)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [b.line_id ?? null, b.name, b.type, b.color ?? '#0d7a5f',
     b.center_lat ?? null, b.center_lng ?? null, b.radius_m ?? null,
     b.polygon ? JSON.stringify(b.polygon) : null]);
  res.status(201).json(rows[0]);
});
adminRouter.put('/geofences/:id', requireAdmin, async (req, res) => {
  await q(`UPDATE geofences SET name=$1,color=$2,line_id=$3 WHERE id=$4`,
    [req.body.name, req.body.color ?? '#0d7a5f', req.body.line_id ?? null, req.params.id]);
  res.json({ ok: true });
});
adminRouter.delete('/geofences/:id', requireAdmin, async (req, res) => {
  await q(`DELETE FROM geofences WHERE id=$1`, [req.params.id]); res.json({ ok: true });
});

// ---------- پیام‌رسانی + رسید خواندن ----------
adminRouter.post('/messages', requireAdmin, async (req, res) => {
  const b = req.body;
  if (!b.body) return res.status(400).json({ error: 'متن پیام لازم است' });
  let ids = [];
  if (b.target_type === 'selected') ids = [...new Set((b.user_ids || []).map(Number))];
  else if (b.target_type === 'zone') ids = (await q(`SELECT id FROM users WHERE is_active AND zone_id=$1`, [b.zone_id])).rows.map(r => r.id);
  else ids = (await q(`SELECT id FROM users WHERE is_active AND id<>$1`, [req.user.id])).rows.map(r => r.id);
  if (!ids.length) return res.status(400).json({ error: 'گیرنده‌ای یافت نشد' });
  const { rows } = await q(`INSERT INTO messages(sender_id,title,body,target_type,zone_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [req.user.id, b.title ?? null, b.body, b.target_type ?? 'all', b.zone_id ?? null]);
  const mid = rows[0].id;
  for (const uid of ids) await q(`INSERT INTO message_recipients(message_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [mid, uid]);
  await notifyUsers(ids, b.title || 'پیام جدید', String(b.body).slice(0, 120), { type: 'message', message_id: mid });
  res.status(201).json({ id: mid, recipients: ids.length });
});
adminRouter.get('/messages', requireAdmin, async (_req, res) => {
  const { rows } = await q(
    `SELECT m.id, m.title, m.body, m.target_type, m.created_at, (s.first_name||' '||s.last_name) AS sender,
            count(mr.user_id)::int AS total, count(mr.read_at)::int AS read_count
     FROM messages m JOIN users s ON s.id=m.sender_id LEFT JOIN message_recipients mr ON mr.message_id=m.id
     GROUP BY m.id, s.first_name, s.last_name ORDER BY m.created_at DESC LIMIT 200`);
  res.json(rows);
});
adminRouter.get('/messages/:id/receipts', requireAdmin, async (req, res) => {
  const { rows } = await q(
    `SELECT u.id, (u.first_name||' '||u.last_name) AS name, r.title AS role, mr.read_at
     FROM message_recipients mr JOIN users u ON u.id=mr.user_id JOIN roles r ON r.id=u.role_id
     WHERE mr.message_id=$1 ORDER BY (mr.read_at IS NULL) DESC, mr.read_at DESC`, [req.params.id]);
  res.json(rows);
});

// ---------- گزارش حضور مسئولین در خط (رییس اداره/مدیرکل) ----------
adminRouter.get('/official-visits', requireAdmin, async (req, res) => {
  const { official, from, to } = req.query;
  const params = []; const conds = [];
  if (official) { params.push(official); conds.push(`ov.official_id=$${params.length}`); }
  if (from) { params.push(from); conds.push(`ov.created_at >= $${params.length}`); }
  if (to) { params.push(to); conds.push(`ov.created_at <= $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await q(
    `SELECT ov.id, ov.created_at, ov.note,
            (o.first_name||' '||o.last_name) official, ro.title official_role,
            (rb.first_name||' '||rb.last_name) recorded_by, l.code line
     FROM official_visits ov
     JOIN users o ON o.id=ov.official_id JOIN roles ro ON ro.id=o.role_id
     JOIN users rb ON rb.id=ov.recorded_by
     LEFT JOIN lines l ON l.id=ov.line_id
     ${where} ORDER BY ov.created_at DESC LIMIT 1000`, params);
  res.json(rows);
});

// داده نمودار: تعداد حضور هر مسئول
adminRouter.get('/official-visits/chart', requireAdmin, async (_req, res) => {
  const { rows } = await q(
    `SELECT (u.first_name||' '||u.last_name) name, count(*)::int n
     FROM official_visits ov JOIN users u ON u.id=ov.official_id
     GROUP BY 1 ORDER BY n DESC LIMIT 15`);
  res.json({ labels: rows.map(r => r.name), data: rows.map(r => r.n) });
});

// ---------- آمار داشبورد ----------
adminRouter.get('/stats', async (_req, res) => {
  const [drivers, lines, todayAtt, unpaid, notices] = await Promise.all([
    q(`SELECT count(*)::int n FROM drivers`),
    q(`SELECT count(*)::int n FROM lines WHERE status='فعال'`),
    q(`SELECT count(*)::int n FROM attendances WHERE created_at::date = now()::date`),
    q(`SELECT count(*)::int n FROM bills WHERE status <> 'پرداخت شده'`),
    q(`SELECT count(*)::int n FROM notices WHERE date_trunc('month',created_at)=date_trunc('month',now())`),
  ]);
  const week = await q(
    `SELECT to_char(created_at::date,'MM-DD') d, count(*)::int n FROM attendances
     WHERE created_at > now() - interval '7 days' GROUP BY 1 ORDER BY 1`);
  const byLine = await q(
    `SELECT l.code, count(*)::int n FROM attendances a JOIN lines l ON l.id=a.line_id
     WHERE a.created_at > now() - interval '30 days'
     GROUP BY l.code ORDER BY n DESC LIMIT 8`);
  res.json({
    drivers: drivers.rows[0].n, lines: lines.rows[0].n,
    today_attendance: todayAtt.rows[0].n, unpaid_bills: unpaid.rows[0].n,
    notices_month: notices.rows[0].n, week_attendance: week.rows,
    by_line: byLine.rows,
  });
});

// ---------- کاربران + چارت سازمانی ----------
adminRouter.get('/users', async (_req, res) => {
  const { rows } = await q(
    `SELECT u.id, u.username, u.first_name, u.last_name, u.role_id, r.title role_title,
            r.level, u.manager_id, u.zone_id, u.rank_stars, u.is_active
     FROM users u JOIN roles r ON r.id=u.role_id ORDER BY r.level, u.last_name`);
  res.json(rows);
});

// ذخیرهٔ چابه‌جایی چارت (drag & drop) — تعیین مدیر و منطقهٔ هر نیرو
adminRouter.put('/users/:id/org', requireAdmin, async (req, res) => {
  const s = z.object({ manager_id: z.number().nullable(), zone_id: z.number().nullable() });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  await q(`UPDATE users SET manager_id=$1, zone_id=$2 WHERE id=$3`,
    [p.data.manager_id, p.data.zone_id, req.params.id]);
  res.json({ ok: true });
});

// تخصیص خطوط به کاربر (نیروی اداری از وب انجام می‌دهد)
adminRouter.put('/users/:id/lines', async (req, res) => {
  const s = z.object({ line_ids: z.array(z.number()) });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  await q(`DELETE FROM user_lines WHERE user_id=$1`, [req.params.id]);
  for (const lid of p.data.line_ids)
    await q(`INSERT INTO user_lines(user_id,line_id) VALUES ($1,$2)
             ON CONFLICT DO NOTHING`, [req.params.id, lid]);
  res.json({ ok: true });
});

// ---------- لیست فیش‌ها (صفحه‌بندی/فیلتر) ----------
adminRouter.get('/bills', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const status = req.query.status || null;
  const search = req.query.q ? `%${req.query.q}%` : null;
  const { rows } = await q(
    `SELECT id, person_title, national_id, plate, amount, status
     FROM bills
     WHERE ($1::text IS NULL OR status=$1)
       AND ($2::text IS NULL OR national_id ILIKE $2 OR person_title ILIKE $2 OR plate ILIKE $2)
     ORDER BY id DESC LIMIT $3`, [status, search, limit]);
  res.json(rows);
});

// ---------- گزارش‌گیری تجمیعی (خروجی ستون/سطر برای Excel/PDF) ----------
adminRouter.get('/report', async (req, res) => {
  const { type, from, to, q: search } = req.query;
  const params = [];
  const range = (col) => {
    let s = '';
    if (from) { params.push(from); s += ` AND ${col} >= $${params.length}`; }
    if (to) { params.push(to); s += ` AND ${col} <= $${params.length}`; }
    return s;
  };
  try {
    if (type === 'attendance') {
      const sql = `SELECT a.created_at::date d, (dr.first_name||' '||dr.last_name) driver,
          l.code line, (u.first_name||' '||u.last_name) by_user
        FROM attendances a JOIN drivers dr ON dr.id=a.driver_id
        JOIN users u ON u.id=a.user_id LEFT JOIN lines l ON l.id=a.line_id
        WHERE 1=1 ${range('a.created_at')} ORDER BY a.created_at DESC LIMIT 5000`;
      const { rows } = await q(sql, params);
      return res.json({ cols: ['تاریخ', 'راننده', 'خط', 'ثبت‌کننده'],
        rows: rows.map(r => [String(r.d), r.driver, r.line || '', r.by_user]) });
    }
    if (type === 'notices') {
      const sql = `SELECT n.created_at::date d, (dr.first_name||' '||dr.last_name) driver,
          nr.title reason, n.priority, (u.first_name||' '||u.last_name) by_user
        FROM notices n JOIN drivers dr ON dr.id=n.driver_id
        JOIN users u ON u.id=n.user_id LEFT JOIN notice_reasons nr ON nr.id=n.reason_id
        WHERE 1=1 ${range('n.created_at')} ORDER BY n.created_at DESC LIMIT 5000`;
      const { rows } = await q(sql, params);
      const P = { low: 'کم', medium: 'متوسط', high: 'زیاد' };
      return res.json({ cols: ['تاریخ', 'راننده', 'موضوع', 'اولویت', 'ثبت‌کننده'],
        rows: rows.map(r => [String(r.d), r.driver, r.reason || '', P[r.priority] || r.priority, r.by_user]) });
    }
    if (type === 'checklists') {
      const sql = `SELECT c.created_at::date d, (dr.first_name||' '||dr.last_name) driver,
          (u.first_name||' '||u.last_name) by_user
        FROM checklist_submissions c LEFT JOIN drivers dr ON dr.id=c.driver_id
        JOIN users u ON u.id=c.user_id WHERE 1=1 ${range('c.created_at')}
        ORDER BY c.created_at DESC LIMIT 5000`;
      const { rows } = await q(sql, params);
      return res.json({ cols: ['تاریخ', 'راننده', 'ثبت‌کننده'],
        rows: rows.map(r => [String(r.d), r.driver || '', r.by_user]) });
    }
    if (type === 'bills') {
      const s = search ? `%${search}%` : null; params.push(s);
      const sql = `SELECT person_title, national_id, plate, amount, status FROM bills
        WHERE ($${params.length}::text IS NULL OR national_id ILIKE $${params.length})
        ORDER BY id DESC LIMIT 5000`;
      const { rows } = await q(sql, params);
      return res.json({ cols: ['شخص', 'کد ملی', 'پلاک', 'مبلغ(ریال)', 'وضعیت'],
        rows: rows.map(r => [r.person_title, r.national_id, r.plate, Number(r.amount || 0).toLocaleString('en-US'), r.status]) });
    }
    res.status(400).json({ error: 'نوع گزارش نامعتبر' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- مدیریت کاربران ----------
adminRouter.get('/roles', async (_req, res) =>
  res.json((await q(`SELECT id,title,level,is_admin FROM roles ORDER BY level`)).rows));

// ساخت کاربر جدید (نام کاربری = کد ملی، رمز اولیه دلخواه یا 123456)
adminRouter.post('/users', requireAdmin, async (req, res) => {
  const s = z.object({
    username: z.string().min(8), first_name: z.string(), last_name: z.string(),
    role_id: z.number(), zone_id: z.number().nullable().optional(),
    manager_id: z.number().nullable().optional(), phone: z.string().optional(), rank_stars: z.number().min(0).max(5).nullable().optional(),
    password: z.string().min(6).default('123456'),
  });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const exists = await q(`SELECT 1 FROM users WHERE username=$1`, [p.data.username]);
  if (exists.rows[0]) return res.status(409).json({ error: 'این کد ملی قبلاً ثبت شده است' });
  const hash = await bcrypt.hash(p.data.password, 10);
  const { rows } = await q(
    `INSERT INTO users(username,first_name,last_name,password_hash,role_id,zone_id,manager_id,phone,rank_stars,must_change_pw)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE) RETURNING id`,
    [p.data.username, p.data.first_name, p.data.last_name, hash, p.data.role_id,
     p.data.zone_id ?? null, p.data.manager_id ?? null, p.data.phone ?? null, p.data.rank_stars ?? null]);
  res.status(201).json(rows[0]);
});

// ویرایش کاربر (نقش، منطقه، سرپرست، فعال/غیرفعال)
adminRouter.put('/users/:id', requireAdmin, async (req, res) => {
  const s = z.object({
    first_name: z.string().optional(), last_name: z.string().optional(),
    role_id: z.number().optional(), zone_id: z.number().nullable().optional(),
    manager_id: z.number().nullable().optional(), is_active: z.boolean().optional(),
    phone: z.string().optional(), rank_stars: z.number().min(0).max(5).nullable().optional(),
  });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const sets = [], vals = []; let i = 1;
  for (const [k, v] of Object.entries(p.data)) { sets.push(`${k}=$${i++}`); vals.push(v); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await q(`UPDATE users SET ${sets.join(',')} WHERE id=$${i}`, vals);
  res.json({ ok: true });
});

// بازنشانی رمز به مقدار اولیه
adminRouter.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
  const hash = await bcrypt.hash(req.body.password || '123456', 10);
  await q(`UPDATE users SET password_hash=$1, must_change_pw=TRUE WHERE id=$2`, [hash, req.params.id]);
  res.json({ ok: true });
});

// خطوط مجاز فعلی کاربر
adminRouter.get('/users/:id/lines', async (req, res) => {
  const { rows } = await q(
    `SELECT l.id, l.code, l.origin, l.destination FROM user_lines ul
     JOIN lines l ON l.id=ul.line_id WHERE ul.user_id=$1`, [req.params.id]);
  res.json(rows);
});

// ---------- مناطق (منطقه‌بندی نیروها) ----------
adminRouter.get('/zones', async (_req, res) =>
  res.json((await q(`SELECT * FROM zones ORDER BY id`)).rows));
adminRouter.post('/zones', requireAdmin, async (req, res) => {
  const { name, parent_id } = req.body;
  const { rows } = await q(`INSERT INTO zones(name,parent_id) VALUES ($1,$2) RETURNING *`,
    [name, parent_id ?? null]);
  res.status(201).json(rows[0]);
});
adminRouter.put('/zones/:id', requireAdmin, async (req, res) => {
  await q(`UPDATE zones SET name=$1 WHERE id=$2`, [req.body.name, req.params.id]);
  res.json({ ok: true });
});
adminRouter.delete('/zones/:id', requireAdmin, async (req, res) => {
  await q(`UPDATE users SET zone_id=NULL WHERE zone_id=$1`, [req.params.id]);
  await q(`DELETE FROM zones WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

// ---------- لیست خطوط، رانندگان (صفحه‌بندی) ----------
adminRouter.get('/lines', async (_req, res) =>
  res.json((await q(`SELECT id,code,origin,destination,status FROM lines ORDER BY code`)).rows));

adminRouter.get('/drivers', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const search = req.query.q ? `%${req.query.q}%` : null;
  const { rows } = await q(
    `SELECT id,national_id,first_name,last_name,mobile,taxi_lic_status,op_lic_status
     FROM drivers
     WHERE ($1::text IS NULL OR national_id ILIKE $1 OR last_name ILIKE $1)
     ORDER BY id LIMIT $2 OFFSET $3`, [search, limit, offset]);
  res.json(rows);
});

// ---------- موضوعات تذکر / چک‌لیست (تعریف توسط مدیرکل) ----------
adminRouter.post('/notice-reasons', requireAdmin, async (req, res) => {
  const { rows } = await q(`INSERT INTO notice_reasons(title) VALUES ($1) RETURNING *`,
    [req.body.title]);
  res.status(201).json(rows[0]);
});
adminRouter.delete('/notice-reasons/:id', requireAdmin, async (req, res) => {
  await q(`UPDATE notice_reasons SET is_active=false WHERE id=$1`, [req.params.id]);
  res.json({ ok: true });
});

adminRouter.post('/checklist-templates', requireAdmin, async (req, res) => {
  const s = z.object({ title: z.string(), items: z.array(z.string()) });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const t = await q(`INSERT INTO checklist_templates(title) VALUES ($1) RETURNING id`, [p.data.title]);
  const tid = t.rows[0].id;
  let i = 0;
  for (const label of p.data.items)
    await q(`INSERT INTO checklist_items(template_id,label,sort_order) VALUES ($1,$2,$3)`,
      [tid, label, i++]);
  res.status(201).json({ id: tid });
});

// ---------- لاگ فعالیت‌ها ----------
adminRouter.get('/logs', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const { rows } = await q(
    `SELECT l.id, l.event, l.meta, l.created_at, u.first_name, u.last_name
     FROM activity_logs l LEFT JOIN users u ON u.id=l.user_id
     ORDER BY l.created_at DESC LIMIT $1`, [limit]);
  res.json(rows);
});

// رهگیری مسیر یک کاربر در طول روز
adminRouter.get('/track/:userId', requireAdmin, async (req, res) => {
  const day = req.query.date || new Date().toISOString().slice(0, 10);
  const { rows } = await q(
    `SELECT lat,lng,captured_at FROM location_pings
     WHERE user_id=$1 AND captured_at::date=$2 ORDER BY captured_at`,
    [req.params.userId, day]);
  res.json(rows);
});

// ---------- ورود اکسل از داخل پنل ----------
adminRouter.post('/import/:kind', requireAdmin, upload.single('file'), async (req, res) => {
  // فایل در req.file.path قرار می‌گیرد؛ اسکریپت scripts/import_excel.py روی آن اجرا می‌شود.
  res.json({
    ok: true,
    note: `python scripts/import_excel.py ${req.params.kind} ${req.file?.path}`,
  });
});
