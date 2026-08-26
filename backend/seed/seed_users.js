import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { pool, q } from '../src/db.js';

const people = JSON.parse(
  fs.readFileSync(new URL('./personnel.json', import.meta.url), 'utf8')
);

// نقش‌های پایه + سطح دسترسی + سمت‌های مدیریتی قابل تعریف
const roles = [
  ['مدیر کل', 1, true],
  ['معاونت نظارت و بازرسی', 2, true],
  ['رییس اداره بازرسی', 3, true],
  ['سربازرس ارشد', 4, false],
  ['نیروی اداری ارشد', 4, false],
  ['مسئول پروژه', 4, false],
  ['سربازرس', 5, false],
  ['نیروی اداری', 5, false],
  ['بازرس', 6, false],
  ['نماینده اجرایی', 6, false],
  ['اپراتور', 7, false],
  ['ناظر خط مبادی', 7, false],
  ['ناظر خط ثامن', 7, false],
  ['ناظر خط', 7, false],
  ['نظارت تصویری', 7, false],
];

async function main() {
  for (const [title, level, isAdmin] of roles) {
    await q(
      `INSERT INTO roles(title, level, is_admin) VALUES ($1,$2,$3)
       ON CONFLICT (title) DO UPDATE SET level=$2, is_admin=$3`,
      [title, level, isAdmin]
    );
  }

  const hash = await bcrypt.hash('123456', 10); // رمز اولیه همه
  let created = 0;
  for (const p of people) {
    const r = await q(`SELECT id FROM roles WHERE title=$1`, [p.role_title]);
    const roleId = r.rows[0]?.id
      ?? (await q(`SELECT id FROM roles WHERE level=7 LIMIT 1`)).rows[0].id;
    await q(
      `INSERT INTO users(username, first_name, last_name, password_hash, role_id, must_change_pw)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       ON CONFLICT (username) DO UPDATE
         SET first_name=$2, last_name=$3, role_id=$5`,
      [p.national_id, p.first_name, p.last_name, hash, roleId]
    );
    created++;
  }
  console.log(`${created} حساب کاربری ساخته شد (نام کاربری = کد ملی، رمز = 123456).`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
