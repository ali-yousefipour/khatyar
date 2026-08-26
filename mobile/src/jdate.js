// تبدیل تاریخ میلادی به شمسی به‌صورت خالص (بدون اتکا به Intl که روی Hermes ناقص است)
// زمان‌های سرور به‌صورت ساعت تهران ذخیره و ارسال می‌شوند، پس اجزای تاریخ همان‌گونه استفاده می‌شوند.

function g2j(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
           + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053;
  jy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let jm, jd;
  if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
  else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
  return [jy, jm, jd];
}

const FA = '۰۱۲۳۴۵۶۷۸۹';
const faDigits = (s) => String(s).replace(/[0-9]/g, (d) => FA[+d]);
const p2 = (n) => String(n).padStart(2, '0');

// اجزای زمان تهران بدون اتکا به Intl/تقویم فارسی Hermes.
// ایران از سال ۱۴۰۱ تغییر ساعت فصلی ندارد؛ بنابراین UTC+03:30 ثابت است.
export function tehranGregorianParts(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(d.getTime() + 210 * 60 * 1000);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    second: t.getUTCSeconds(),
  };
}

// خروجی: تایم‌استمپ مطلق (میلی‌ثانیه از epoch) از یک رشتهٔ زمانِ سرور.
// نکتهٔ مهم: اگر رشته بدون Z/آفست باشد (مثل "2026-08-19 14:30:00")، این زمان «ساعت تهران»
// در نظر گرفته می‌شود، نه ساعت محلی گوشی — چون سرور همیشه با ساعت تهران زمان می‌فرستد.
// استفادهٔ مستقیم از `new Date(str.replace(' ','T'))` در این حالت یک باگ رایج جاوااسکریپت
// است: چنین رشته‌ای را به‌عنوان «ساعت محلی دستگاه» تفسیر می‌کند، نه ساعت تهران؛ روی گوشی‌ای
// که منطقهٔ زمانی‌اش تهران نباشد (یا اشتباه تنظیم شده باشد)، محاسبهٔ «مدت‌زمان سپری‌شده»
// کاملاً غلط می‌شود. این تابع اجزای تاریخ/ساعت را مستقیماً از رشته می‌خواند و با کم‌کردن
// آفست تهران (+۰۳:۳۰) از UTC معادل، تایم‌استمپ مطلقِ درست را می‌سازد — مستقل از تنظیم
// منطقهٔ زمانی گوشی.
export function tehranTimeToEpochMs(value) {
  if (!value) return null;
  const text = String(value).trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  if (hasZone) {
    const ms = new Date(text).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!m) {
    const ms = new Date(text.replace(' ', 'T')).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  const [, Y, M, D, h, mi, s] = m;
  const utcMs = Date.UTC(+Y, +M - 1, +D, +(h || 0), +(mi || 0), +(s || 0));
  return utcMs - 210 * 60 * 1000; // آفست تهران: +۰۳:۳۰
}

// تاریخ/ساعت ورودی سرور را به شمسی تهران تبدیل می‌کند.
// زمان‌های بدون Z یا offset همان ساعت تهران در نظر گرفته می‌شوند.
export function fjTehran(value, separator = ' · ') {
  if (!value) return '';
  const raw = typeof value === 'object'
    ? (value.iso || value.at || value.value || value.date || '')
    : String(value);
  if (!raw) return '';
  const text = String(raw).trim();
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  let Y, M, D, h, mi;
  if (m && !hasZone) {
    Y = +m[1]; M = +m[2]; D = +m[3]; h = +(m[4] || 0); mi = +(m[5] || 0);
  } else {
    const parts = tehranGregorianParts(new Date(text.replace(' ', 'T')));
    if (!parts) return faDigits(text);
    ({ year: Y, month: M, day: D, hour: h, minute: mi } = parts);
  }
  const [jy, jm, jd] = g2j(Y, M, D);
  return faDigits(`${jy}/${p2(jm)}/${p2(jd)}${separator}${p2(h)}:${p2(mi)}`);
}

// خروجی: تاریخ و ساعت شمسی با ارقام فارسی (مثل ۱۴۰۵/۰۳/۲۱ ۱۰:۳۰)
export function fj(s) {
  if (!s) return '';
  const m = String(s).match(/(\d{4})\D(\d{1,2})\D(\d{1,2})(?:[ T](\d{1,2})\D(\d{1,2}))?/);
  if (!m) return String(s);
  const [, Y, M, D, h, mi] = m;
  const [jy, jm, jd] = g2j(+Y, +M, +D);
  let out = `${jy}/${p2(jm)}/${p2(jd)}`;
  if (h !== undefined) out += ` ${p2(h)}:${p2(mi)}`;
  return faDigits(out);
}

// فقط تاریخ (بدون ساعت)
export function fjDate(s) {
  if (!s) return '';
  const m = String(s).match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (!m) return String(s);
  const [, Y, M, D] = m;
  const [jy, jm, jd] = g2j(+Y, +M, +D);
  return faDigits(`${jy}/${p2(jm)}/${p2(jd)}`);
}

// از یک شیء Date، تاریخ شمسی + ساعت تهران را برمی‌گرداند (برای درج روی عکس)
export function fjDateTime(dateObj) {
  const parts = tehranGregorianParts(dateObj || new Date());
  if (!parts) return '';
  const [jy, jm, jd] = g2j(parts.year, parts.month, parts.day);
  return faDigits(`${jy}/${p2(jm)}/${p2(jd)} - ساعت ${p2(parts.hour)}:${p2(parts.minute)}`);
}

// تاریخ امروز به‌صورت جلالی YYYY/MM/DD (ارقام لاتین برای ارسال به سرور تبدیل می‌شود)
export function todayJalali() {
  const d = new Date();
  const [jy, jm, jd] = g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}/${p2(jm)}/${p2(jd)}`;
}

// روز هفته + تاریخ امروز شمسی با ارقام فارسی (برای داشبورد)
const WEEK = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export function todayFaLong() {
  const d = new Date();
  const [jy, jm, jd] = g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const wd = WEEK[d.getDay()]; // getDay: 0=Sunday..6=Saturday → WEEK مطابق همان
  return `${wd} ${faDigits(jd)} ${JMONTHS[jm - 1]} ${faDigits(jy)}`;
}

// --- توابع کمکی برای فیلتر و شمارش بر اساس تاریخ شمسی ---
export { g2j };
export function jParts(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (!m) return null;
  return g2j(+m[1], +m[2], +m[3]);
}
export function jToday() {
  const d = new Date();
  return g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
export function inCurrentJMonth(s) {
  const p = jParts(s); if (!p) return false;
  const t = jToday();
  return p[0] === t[0] && p[1] === t[1];
}
export function inCurrentJYear(s) {
  const p = jParts(s); if (!p) return false;
  const t = jToday();
  return p[0] === t[0];
}
export function inJRange(s, fromJ, toJ) {
  const p = jParts(s); if (!p) return false;
  const key = p[0] * 10000 + p[1] * 100 + p[2];
  if (fromJ) { const fk = fromJ[0] * 10000 + fromJ[1] * 100 + fromJ[2]; if (key < fk) return false; }
  if (toJ) { const tk = toJ[0] * 10000 + toJ[1] * 100 + toJ[2]; if (key > tk) return false; }
  return true;
}
