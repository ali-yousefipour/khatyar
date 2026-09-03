import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { q } from '../db.js';

// تایید توکن دسترسی، کاربر فعال و اتصال توکن به دستگاه ثبت‌شده
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده است' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const deviceId = typeof payload.device_id === 'string' ? payload.device_id.trim() : '';
    if (!deviceId) return res.status(401).json({ error: 'توکن فاقد شناسه دستگاه است' });

    const { rows } = await q(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.role_id,
              r.title AS role_title, r.level, r.is_admin, u.is_active,
              d.device_id AS bound_device_id, d.revoked_at AS device_revoked_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN user_devices d ON d.user_id = u.id
       WHERE u.id = $1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'کاربر نامعتبر' });

    // Access Token نیز مانند Refresh Token باید به همان دستگاهی که حساب به آن
    // متصل شده است وابسته باشد؛ در غیر این صورت توکن سرقت‌شده قابل استفاده است.
    if (!user.bound_device_id || user.device_revoked_at || user.bound_device_id !== deviceId) {
      await q(`INSERT INTO activity_logs(user_id,event,meta) VALUES ($1,$2,$3)`, [
        user.id,
        'access_token_device_mismatch',
        JSON.stringify({ tried_device_id: deviceId }),
      ]).catch(() => {});
      return res.status(401).json({ error: 'دستگاه این توکن مجاز نیست' });
    }

    req.user = user;
    req.deviceId = deviceId;
    next();
  } catch {
    return res.status(401).json({ error: 'توکن منقضی یا نامعتبر است' });
  }
}

// عبور فقط اگر سطح کاربر <= maxLevel باشد (عدد کوچک‌تر = اختیار بالاتر)
export const requireLevel = (maxLevel) => (req, res, next) => {
  if (req.user.level > maxLevel)
    return res.status(403).json({ error: 'سطح دسترسی کافی نیست' });
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin && req.user.level > 3)
    return res.status(403).json({ error: 'فقط مدیرکل/رییس اداره بازرسی' });
  next();
};
