import { Router } from 'express';
import { z } from 'zod';
import { q } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { notifyUsers } from '../push.js';

export const apiRouter = Router();
apiRouter.use(authenticate);

// ---------- جستجوی تاکسی و تاکسیران (با کد ملی یا پلاک) ----------
apiRouter.get('/search', async (req, res) => {
  const { national_id, plate } = req.query;
  if (national_id) {
    const d = await q(`SELECT * FROM drivers WHERE national_id=$1`, [national_id]);
    if (!d.rows[0]) return res.status(404).json({ error: 'راننده یافت نشد' });
    const driver = d.rows[0];
    const warnings = [];
    if (driver.taxi_lic_status && driver.taxi_lic_status !== 'فعال')
      warnings.push('پروانه تاکسیرانی نامعتبر است');
    if (driver.op_lic_status && driver.op_lic_status !== 'فعال')
      warnings.push('پروانه بهره‌برداری نامعتبر است');
    // هشدار به اپراتور (جستجوکننده) و نیروهای همان خط برای ثبت تذکر
    if (warnings.length) await warnExpiredLicense(driver, req.user.id);
    return res.json({ type: 'driver', driver, warnings });
  }
  if (plate) {
    const v = await q(`SELECT * FROM vehicles WHERE plate=$1`, [plate]);
    if (!v.rows[0]) return res.status(404).json({ error: 'خودرو یافت نشد' });
    const drivers = await q(
      `SELECT d.*, vd.role, vd.shift FROM vehicle_drivers vd
       JOIN drivers d ON d.id=vd.driver_id WHERE vd.vehicle_id=$1
       ORDER BY (vd.role='beneficiary') DESC`, [v.rows[0].id]);
    return res.json({ type: 'vehicle', vehicle: v.rows[0], drivers: drivers.rows });
  }
  res.status(400).json({ error: 'national_id یا plate لازم است' });
});

// ---------- ثبت حضور راننده (هر ۵ دقیقه یک‌بار) ----------
apiRouter.post('/attendance', async (req, res) => {
  const schema = z.object({
    driver_id: z.number(), line_id: z.number().optional(),
    lat: z.number().optional(), lng: z.number().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const last = await q(
    `SELECT created_at FROM attendances
     WHERE driver_id=$1 ORDER BY created_at DESC LIMIT 1`, [p.data.driver_id]);
  if (last.rows[0]) {
    const diff = (Date.now() - new Date(last.rows[0].created_at).getTime()) / 60000;
    if (diff < 5)
      return res.status(429).json({ error: `ثبت مجدد حضور ${Math.ceil(5 - diff)} دقیقه دیگر` });
  }
  const { rows } = await q(
    `INSERT INTO attendances(driver_id,user_id,line_id,lat,lng)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [p.data.driver_id, req.user.id, p.data.line_id ?? null, p.data.lat ?? null, p.data.lng ?? null]);
  res.status(201).json(rows[0]);
});

// گزارش حضور یک راننده (روزانه/ماهانه)
apiRouter.get('/attendance/:driverId', async (req, res) => {
  const { rows } = await q(
    `SELECT created_at FROM attendances WHERE driver_id=$1
     ORDER BY created_at DESC LIMIT 200`, [req.params.driverId]);
  res.json(rows);
});

// ---------- بدهی / فیش‌ها + لینک درگاه شهرداری ----------
apiRouter.get('/debt/:nationalId', async (req, res) => {
  const { rows } = await q(
    `SELECT id, bill_id, pay_id, status, amount, phone, plate, pay_date
     FROM bills WHERE national_id=$1 ORDER BY status, pay_date DESC`,
    [req.params.nationalId]);
  const unpaid = rows.filter(r => r.status !== 'پرداخت شده');
  const total = unpaid.reduce((s, r) => s + Number(r.amount || 0), 0);
  const bills = rows.map(r => ({
    ...r,
    pay_url: r.status !== 'پرداخت شده'
      ? `https://epay.mashhad.ir/CityUsers/OnLineBillPay.aspx?BillId=${r.bill_id}&PayId=${r.pay_id}&Cell=${r.phone}`
      : null,
  }));
  res.json({ unpaid_count: unpaid.length, total_unpaid: total, bills });
});

// ---------- تذکرات ----------
apiRouter.get('/notice-reasons', async (_req, res) => {
  const { rows } = await q(`SELECT id,title FROM notice_reasons WHERE is_active ORDER BY id`);
  res.json(rows);
});
apiRouter.post('/notices', async (req, res) => {
  const schema = z.object({
    driver_id: z.number(), reason_id: z.number().optional(),
    priority: z.enum(['low', 'medium', 'high']), body: z.string().optional(),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const { rows } = await q(
    `INSERT INTO notices(driver_id,user_id,reason_id,priority,body)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [p.data.driver_id, req.user.id, p.data.reason_id ?? null, p.data.priority, p.data.body ?? null]);
  res.status(201).json(rows[0]);
});
apiRouter.get('/notices/:driverId', async (req, res) => {
  const { rows } = await q(
    `SELECT n.*, nr.title AS reason FROM notices n
     LEFT JOIN notice_reasons nr ON nr.id=n.reason_id
     WHERE n.driver_id=$1 ORDER BY n.created_at DESC`, [req.params.driverId]);
  res.json(rows);
});

// ---------- چک‌لیست ----------
apiRouter.get('/checklist/template', async (_req, res) => {
  const t = await q(`SELECT id,title FROM checklist_templates WHERE is_active LIMIT 1`);
  if (!t.rows[0]) return res.json(null);
  const items = await q(
    `SELECT id,label FROM checklist_items WHERE template_id=$1 ORDER BY sort_order`, [t.rows[0].id]);
  res.json({ ...t.rows[0], items: items.rows });
});
apiRouter.post('/checklist', async (req, res) => {
  const schema = z.object({
    template_id: z.number(), driver_id: z.number().optional(),
    vehicle_id: z.number().optional(), answers: z.record(z.string()),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const { rows } = await q(
    `INSERT INTO checklist_submissions(template_id,driver_id,vehicle_id,user_id,answers)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [p.data.template_id, p.data.driver_id ?? null, p.data.vehicle_id ?? null,
     req.user.id, JSON.stringify(p.data.answers)]);
  res.status(201).json(rows[0]);
});

// ---------- موقعیت مکانی (پشتیبانی آفلاین: ارسال دسته‌ای) ----------
apiRouter.post('/locations', async (req, res) => {
  const schema = z.object({
    pings: z.array(z.object({
      lat: z.number(), lng: z.number(), captured_at: z.string(),
    })).max(500),
  });
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  for (const ping of p.data.pings)
    await q(`INSERT INTO location_pings(user_id,lat,lng,captured_at) VALUES ($1,$2,$3,$4)`,
      [req.user.id, ping.lat, ping.lng, ping.captured_at]);
  res.json({ saved: p.data.pings.length });
});

// آخرین موقعیت همه کاربران (نقشه زنده — فقط مدیرکل/رییس اداره)
apiRouter.get('/locations/live', requireAdmin, async (_req, res) => {
  const { rows } = await q(
    `SELECT DISTINCT ON (lp.user_id) lp.user_id, u.first_name, u.last_name,
            lp.lat, lp.lng, lp.captured_at
     FROM location_pings lp JOIN users u ON u.id=lp.user_id
     ORDER BY lp.user_id, lp.captured_at DESC`);
  res.json(rows);
});

// ---------- مدیریت: حذف دستگاه کاربر (اجازه تعویض موبایل) ----------
apiRouter.post('/admin/users/:id/revoke-device', requireAdmin, async (req, res) => {
  await q(`UPDATE user_devices SET revoked_at=now() WHERE user_id=$1`, [req.params.id]);
  await q(`INSERT INTO activity_logs(user_id,event,meta) VALUES ($1,'device_revoked',$2)`,
    [req.params.id, JSON.stringify({ by: req.user.id })]);
  res.json({ ok: true });
});

// ---------- حضور مسئولین در خط ----------
// فهرست مسئولین قابل ثبت (سطح ۶ و بالاتر: بازرس، سربازرس، نیروی اداری، رییس اداره، معاونت ...)
apiRouter.get('/officials', async (_req, res) => {
  const { rows } = await q(
    `SELECT u.id, u.first_name, u.last_name, r.title role_title, r.level
     FROM users u JOIN roles r ON r.id=u.role_id
     WHERE r.level <= 6 AND u.is_active ORDER BY r.level, u.last_name`);
  res.json(rows);
});

// ثبت حضور یک مسئول در خط
apiRouter.post('/official-visits', async (req, res) => {
  const s = z.object({
    official_id: z.number(), line_id: z.number().optional(),
    note: z.string().optional(), lat: z.number().optional(), lng: z.number().optional(),
  });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const { rows } = await q(
    `INSERT INTO official_visits(official_id,recorded_by,line_id,note,lat,lng)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
    [p.data.official_id, req.user.id, p.data.line_id ?? null, p.data.note ?? null,
     p.data.lat ?? null, p.data.lng ?? null]);
  res.status(201).json(rows[0]);
});

// خلاصهٔ حضور مسئولین (۳۰ روز اخیر) — برای نمودار در اپ
apiRouter.get('/official-visits/summary', async (_req, res) => {
  const { rows } = await q(
    `SELECT (u.first_name||' '||u.last_name) name, count(*)::int n
     FROM official_visits ov JOIN users u ON u.id=ov.official_id
     WHERE ov.created_at > now() - interval '30 days'
     GROUP BY 1 ORDER BY n DESC LIMIT 15`);
  res.json(rows);
});

// آخرین ثبت‌های همین کاربر
apiRouter.get('/my/official-visits', async (req, res) => {
  const { rows } = await q(
    `SELECT ov.id, ov.created_at, ov.note, (u.first_name||' '||u.last_name) official, l.code line
     FROM official_visits ov JOIN users u ON u.id=ov.official_id
     LEFT JOIN lines l ON l.id=ov.line_id
     WHERE ov.recorded_by=$1 ORDER BY ov.created_at DESC LIMIT 50`, [req.user.id]);
  res.json(rows);
});

// ---------- محدودهٔ خطوط (ایستگاه‌ها) ----------
apiRouter.get('/geofences', async (_req, res) => {
  const { rows } = await q(`SELECT g.*, l.code AS line_code FROM geofences g LEFT JOIN lines l ON l.id=g.line_id ORDER BY g.id`);
  res.json(rows);
});

// ---------- پیام‌های من + علامت خواندن ----------
apiRouter.get('/my/messages', async (req, res) => {
  const { rows } = await q(
    `SELECT m.id, m.title, m.body, m.created_at, mr.read_at, (s.first_name||' '||s.last_name) AS sender
     FROM message_recipients mr JOIN messages m ON m.id=mr.message_id JOIN users s ON s.id=m.sender_id
     WHERE mr.user_id=$1 ORDER BY m.created_at DESC LIMIT 100`, [req.user.id]);
  res.json(rows);
});
apiRouter.post('/my/messages/:id/read', async (req, res) => {
  await q(`UPDATE message_recipients SET read_at=now() WHERE message_id=$1 AND user_id=$2 AND read_at IS NULL`,
    [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ---------- ثبت توکن Push دستگاه ----------
apiRouter.post('/devices/push-token', async (req, res) => {
  const s = z.object({ token: z.string(), platform: z.string().optional() });
  const p = s.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  await q(`INSERT INTO push_tokens(user_id,token,platform,updated_at)
           VALUES ($1,$2,$3,now())
           ON CONFLICT (user_id,token) DO UPDATE SET updated_at=now()`,
    [req.user.id, p.data.token, p.data.platform ?? null]);
  res.json({ ok: true });
});

// ---------- نوتیفیکیشن‌های کاربر ----------
apiRouter.get('/my/notifications', async (req, res) => {
  const { rows } = await q(
    `SELECT id,title,body,data,is_read,created_at FROM notifications
     WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  const unread = rows.filter(r => !r.is_read).length;
  res.json({ unread, items: rows });
});
apiRouter.post('/my/notifications/read', async (req, res) => {
  await q(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, [req.user.id]);
  res.json({ ok: true });
});

// ---------- آمار داشبورد کاربر (مخصوص اپ موبایل) ----------
apiRouter.get('/my/dashboard', async (req, res) => {
  const [today, checklists, notices, reports, unread] = await Promise.all([
    q(`SELECT count(*)::int n FROM attendances WHERE user_id=$1 AND created_at::date=now()::date`, [req.user.id]),
    q(`SELECT count(*)::int n FROM checklist_submissions WHERE user_id=$1
        AND date_trunc('month',created_at)=date_trunc('month',now())`, [req.user.id]),
    q(`SELECT count(*)::int n FROM notices WHERE user_id=$1 AND created_at::date=now()::date`, [req.user.id]),
    q(`SELECT count(*)::int n FROM reports WHERE sender_id=$1`, [req.user.id]),
    q(`SELECT count(*)::int n FROM notifications WHERE user_id=$1 AND NOT is_read`, [req.user.id]),
  ]);
  res.json({
    today: today.rows[0].n, checklists: checklists.rows[0].n,
    notices: notices.rows[0].n, reports: reports.rows[0].n, unread: unread.rows[0].n,
  });
});

// هشدار انقضای پروانه: اپراتور جستجوکننده + نیروهای همان خط
async function warnExpiredLicense(driver, operatorId) {
  // یافتن خط راننده و نیروهای مجاز آن خط
  const recipients = new Set([operatorId]);
  const ln = await q(
    `SELECT l.id FROM vehicle_drivers vd
       JOIN vehicles v ON v.id=vd.vehicle_id
       JOIN lines l ON l.id=v.line_id
     WHERE vd.driver_id=$1 LIMIT 1`, [driver.id]);
  const lineId = ln.rows[0]?.id;
  if (lineId) {
    const forces = await q(`SELECT user_id FROM user_lines WHERE line_id=$1`, [lineId]);
    forces.rows.forEach(r => recipients.add(r.user_id));
  }
  const name = `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim();
  await notifyUsers([...recipients], 'هشدار انقضای پروانه',
    `پروانهٔ راننده ${name} (کد ملی ${driver.national_id}) نامعتبر است. لطفاً تذکر ثبت شود.`,
    { type: 'license_expiry', driver_id: driver.id, national_id: driver.national_id });
}

// ---------- گزارش خطاهای اپلیکیشن ----------
apiRouter.post('/crash-reports', async (req, res) => {
  const schema = z.object({
    id: z.string().min(6).max(80), created_at: z.string().optional(), type: z.string().max(80).optional(),
    fatal: z.boolean().optional(), message: z.string().max(20000).optional(), name: z.string().max(200).optional(),
    stack: z.string().max(200000).optional(), component_stack: z.string().max(100000).optional(), route: z.string().max(200).optional(),
    last_api: z.any().optional(), app_version: z.string().max(50).nullable().optional(), build_version: z.string().max(50).nullable().optional(),
    android_version: z.string().max(50).optional(), platform: z.string().max(30).optional(), device_name: z.string().max(200).nullable().optional(),
    device_model: z.string().max(200).nullable().optional(), manufacturer: z.string().max(200).nullable().optional()
  }).passthrough();
  const p = schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'گزارش خطا نامعتبر است' });
  const d = p.data;
  const { rows } = await q(`INSERT INTO mobile_crash_reports
    (crash_id,user_id,created_at_client,type,fatal,message,error_name,stack,component_stack,route,last_api,app_version,build_version,android_version,platform,device_name,device_model,manufacturer,raw)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    ON CONFLICT(crash_id) DO UPDATE SET received_at=now() RETURNING crash_id, received_at`,
    [d.id,req.user.id,d.created_at||null,d.type||null,!!d.fatal,d.message||null,d.name||null,d.stack||null,d.component_stack||null,d.route||null,
     d.last_api?JSON.stringify(d.last_api):null,d.app_version||null,d.build_version||null,d.android_version||null,d.platform||null,d.device_name||null,d.device_model||null,d.manufacturer||null,JSON.stringify(d)]);
  res.status(201).json({ ok:true, ...rows[0] });
});
