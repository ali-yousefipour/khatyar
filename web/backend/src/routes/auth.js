import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { q } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),          // کد ملی
  password: z.string().min(1),
  device_id: z.string().min(8),         // اثرانگشت سخت‌افزاری دستگاه
  device_model: z.string().optional(),
  // سیگنال‌های امنیتی که کلاینت موبایل ارسال می‌کند:
  vpn_on: z.boolean().optional(),
  dev_options_on: z.boolean().optional(),
  gps_on: z.boolean().optional(),
});

function issueTokens(user, deviceId) {
  const access = jwt.sign({ sub: user.id, device_id: deviceId }, config.jwtSecret, {
    expiresIn: config.accessTtl,
  });
  const refresh = jwt.sign({ sub: user.id, device_id: deviceId, t: 'r' }, config.jwtSecret, {
    expiresIn: config.refreshTtl,
  });
  return { access, refresh };
}

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'ورودی نامعتبر' });
  const { username, password, device_id, device_model, vpn_on, dev_options_on, gps_on } = parsed.data;

  // مسدودسازی در صورت VPN روشن / Developer Options فعال / GPS خاموش
  if (vpn_on || dev_options_on || gps_on === false) {
    await q(`INSERT INTO activity_logs(event, meta) VALUES ($1,$2)`, [
      'login_blocked_security',
      JSON.stringify({ username, vpn_on, dev_options_on, gps_on }),
    ]);
    const reason = vpn_on ? 'VPN روشن است'
      : dev_options_on ? 'حالت توسعه‌دهنده فعال است'
      : 'GPS خاموش است';
    return res.status(403).json({ error: `ورود مجاز نیست: ${reason}` });
  }

  const { rows } = await q(
    `SELECT u.*, r.level, r.is_admin FROM users u JOIN roles r ON r.id=u.role_id
     WHERE u.username=$1`, [username]);
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    await q(`INSERT INTO activity_logs(user_id,event,meta) VALUES ($1,$2,$3)`,
      [user?.id ?? null, 'login_failed', JSON.stringify({ username })]);
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
  }

  // ---- اتصال تک‌دستگاهی ----
  const dev = await q(
    `SELECT device_id, revoked_at FROM user_devices WHERE user_id=$1`, [user.id]);
  const bound = dev.rows[0];
  if (!bound || bound.revoked_at) {
    // اولین ورود یا پس از حذف توسط مدیرکل: ثبت دستگاه جدید
    await q(`INSERT INTO user_devices(user_id, device_id, device_model)
             VALUES ($1,$2,$3)
             ON CONFLICT (user_id) DO UPDATE
             SET device_id=$2, device_model=$3, bound_at=now(), revoked_at=NULL`,
      [user.id, device_id, device_model || null]);
  } else if (bound.device_id !== device_id) {
    await q(`INSERT INTO activity_logs(user_id,event,meta) VALUES ($1,$2,$3)`,
      [user.id, 'device_mismatch', JSON.stringify({ tried: device_id })]);
    return res.status(409).json({
      error: 'این حساب به دستگاه دیگری متصل است. برای تعویض، مدیرکل باید شناسه قبلی را حذف کند.',
    });
  }

  const tokens = issueTokens(user, device_id);
  await q(`INSERT INTO activity_logs(user_id,event) VALUES ($1,'login')`, [user.id]);
  res.json({
    ...tokens,
    user: {
      id: user.id, username: user.username,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role_title, level: user.level,
      rank_stars: user.rank_stars == null ? null : Number(user.rank_stars),
      must_change_pw: user.must_change_pw,
    },
  });
});

// تمدید توکن (پشتیبان «ورود خودکار / مرا به خاطر بسپار»)
authRouter.post('/refresh', async (req, res) => {
  const { refresh } = req.body || {};
  try {
    const p = jwt.verify(refresh, config.jwtSecret);
    if (p.t !== 'r') throw new Error();
    const dev = await q(`SELECT device_id, revoked_at FROM user_devices WHERE user_id=$1`, [p.sub]);
    if (!dev.rows[0] || dev.rows[0].revoked_at || dev.rows[0].device_id !== p.device_id)
      return res.status(401).json({ error: 'دستگاه دیگر مجاز نیست' });
    const { rows } = await q(`SELECT id FROM users WHERE id=$1 AND is_active`, [p.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'کاربر نامعتبر' });
    res.json(issueTokens({ id: p.sub }, p.device_id));
  } catch {
    res.status(401).json({ error: 'توکن تمدید نامعتبر است' });
  }
});

authRouter.post('/logout', authenticate, async (req, res) => {
  await q(`INSERT INTO activity_logs(user_id,event) VALUES ($1,'logout')`, [req.user.id]);
  res.json({ ok: true });
});

authRouter.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
