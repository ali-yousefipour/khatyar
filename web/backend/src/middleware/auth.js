import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { q } from '../db.js';

// تایید توکن دسترسی و بارگذاری کاربر
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده است' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await q(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.role_id,
              r.title AS role_title, r.level, r.is_admin, u.is_active
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'کاربر نامعتبر' });
    req.user = user;
    req.deviceId = payload.device_id;
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
