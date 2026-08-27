// نصب غیرتعاملی برای هاست — مقادیر از .env خوانده می‌شوند.
// اجرا (یک‌بار):  node scripts/install_prod.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, q } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCK = path.join(ROOT, '.installed');
const SCHEMA = path.resolve(ROOT, '../db/schema.sql');
const PERSONNEL = path.join(ROOT, 'seed/personnel.json');

async function main() {
  if (fs.existsSync(LOCK)) { console.log('قبلاً نصب شده است (.installed موجود است). برای نصب مجدد آن را حذف کنید.'); process.exit(0); }

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  if (!adminUser || !adminPass) { console.error('ADMIN_USER و ADMIN_PASS را در .env تنظیم کنید.'); process.exit(1); }

  console.log('۱) ساخت جداول…');
  await q(fs.readFileSync(SCHEMA, 'utf8'));

  console.log('۲) نقش‌ها…');
  const roles = [
    ['مدیر کل',1,true],['معاونت نظارت و بازرسی',2,true],['رییس اداره بازرسی',3,true],
    ['سربازرس ارشد',4,false],['نیروی اداری ارشد',4,false],['مسئول پروژه',4,false],
    ['سربازرس',5,false],['نیروی اداری',5,false],['بازرس',6,false],['نماینده اجرایی',6,false],
    ['اپراتور',7,false],['ناظر خط مبادی',7,false],['ناظر خط ثامن',7,false],['ناظر خط',7,false],['نظارت تصویری',7,false],
  ];
  for (const [t,l,a] of roles)
    await q(`INSERT INTO roles(title,level,is_admin) VALUES ($1,$2,$3)
             ON CONFLICT (title) DO UPDATE SET level=$2,is_admin=$3`, [t,l,a]);

  console.log('۳) حساب مدیرکل…');
  const adminRole = (await q(`SELECT id FROM roles WHERE title='مدیر کل'`)).rows[0].id;
  await q(`INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw)
           VALUES ($1,$2,$3,$4,$5,TRUE)
           ON CONFLICT (username) DO UPDATE SET password_hash=$4, role_id=$5`,
    [adminUser, process.env.ADMIN_FIRST||'مدیر', process.env.ADMIN_LAST||'کل',
     await bcrypt.hash(adminPass,10), adminRole]);

  if (fs.existsSync(PERSONNEL)) {
    console.log('۴) حساب‌های پرسنل (رمز ۱۲۳۴۵۶)…');
    const people = JSON.parse(fs.readFileSync(PERSONNEL,'utf8'));
    const h = await bcrypt.hash('123456',10);
    for (const p of people) {
      const r = await q(`SELECT id FROM roles WHERE title=$1`, [p.role_title]);
      const rid = r.rows[0]?.id ?? adminRole;
      await q(`INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw)
               VALUES ($1,$2,$3,$4,$5,TRUE) ON CONFLICT (username) DO NOTHING`,
        [p.national_id,p.first_name,p.last_name,h,rid]);
    }
  }

  fs.writeFileSync(LOCK, new Date().toISOString());
  console.log('✓ نصب کامل شد. اکنون سرور را اجرا کنید: npm start');
  await pool.end();
}
main().catch(e => { console.error('خطا در نصب:', e.message); process.exit(1); });
