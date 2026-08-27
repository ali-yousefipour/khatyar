// بررسی دوره‌ای انقضای پروانه‌ها و ارسال هشدار. اجرا با cron:
//   0 7 * * *  node scripts/check_expiries.js 30
// آرگومان: تعداد روز آستانهٔ هشدار (پیش‌فرض ۳۰)
import { pool, q } from '../src/db.js';
import { notifyUsers } from '../src/push.js';

const THRESHOLD = Number(process.argv[2] || 30);

// --- تبدیل تاریخ جلالی به میلادی (الگوریتم jalaali) ---
function jalaaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd
    + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097); days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0, gd = days + 1;
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return new Date(gy, gm - 1, gd);
}

function parseJalali(str) {
  if (!str) return null;
  const m = String(str).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  return jalaaliToGregorian(+m[1], +m[2], +m[3]);
}

function daysUntil(jalaliStr) {
  const g = parseJalali(jalaliStr);
  if (!g) return null;
  return Math.ceil((g - new Date()) / 86400000);
}

async function main() {
  const { rows } = await q(`SELECT id, national_id, first_name, last_name,
    taxi_lic_expire, op_lic_expire FROM drivers
    WHERE taxi_lic_status='فعال' OR op_lic_status='فعال'`);
  let sent = 0;
  for (const d of rows) {
    const t = daysUntil(d.taxi_lic_expire), o = daysUntil(d.op_lic_expire);
    const which = [];
    if (t !== null && t <= THRESHOLD) which.push(`تاکسیرانی (${t} روز)`);
    if (o !== null && o <= THRESHOLD) which.push(`بهره‌برداری (${o} روز)`);
    if (!which.length) continue;

    // نیروهای مجاز خط راننده
    const recipients = new Set();
    const ln = await q(`SELECT l.id FROM vehicle_drivers vd
      JOIN vehicles v ON v.id=vd.vehicle_id JOIN lines l ON l.id=v.line_id
      WHERE vd.driver_id=$1 LIMIT 1`, [d.id]);
    if (ln.rows[0]) {
      const f = await q(`SELECT user_id FROM user_lines WHERE line_id=$1`, [ln.rows[0].id]);
      f.rows.forEach(r => recipients.add(r.user_id));
    }
    if (!recipients.size) continue;
    await notifyUsers([...recipients], 'هشدار نزدیک‌شدن انقضای پروانه',
      `پروانهٔ ${which.join(' و ')} راننده ${d.first_name} ${d.last_name} (${d.national_id}) رو به انقضاست.`,
      { type: 'license_expiry_soon', driver_id: d.id });
    sent++;
  }
  console.log(`${sent} هشدار انقضا ارسال شد.`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
