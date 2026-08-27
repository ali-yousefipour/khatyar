// نصب از خط فرمان (جایگزین نصاب وب):  node install/cli-install.js
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = (q, d) => rl.question(`${q}${d ? ` [${d}]` : ''}: `).then(a => a || d);

const host = await ask('هاست دیتابیس', 'localhost');
const port = await ask('پورت', '5432');
const name = await ask('نام دیتابیس', 'taxi');
const user = await ask('کاربر دیتابیس', 'postgres');
const pass = await ask('رمز دیتابیس', 'postgres');
const un = await ask('نام کاربری مدیرکل (کد ملی)');
const pw = await ask('رمز عبور مدیرکل');
rl.close();

const url = `postgres://${user}:${pass}@${host}:${port}/${name}`;
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(fs.readFileSync(path.resolve(ROOT, '../db/schema.sql'), 'utf8'));
const roles = [['مدیر کل',1,true],['معاونت نظارت و بازرسی',2,true],['رییس اداره بازرسی',3,true],
  ['سربازرس ارشد',4,false],['نیروی اداری ارشد',4,false],['سربازرس',5,false],['نیروی اداری',5,false],
  ['بازرس',6,false],['اپراتور',7,false],['ناظر خط مبادی',7,false],['ناظر خط ثامن',7,false]];
for (const [t,l,a] of roles)
  await client.query(`INSERT INTO roles(title,level,is_admin) VALUES ($1,$2,$3) ON CONFLICT (title) DO NOTHING`,[t,l,a]);
const aRole = (await client.query(`SELECT id FROM roles WHERE title='مدیر کل'`)).rows[0].id;
await client.query(`INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw)
  VALUES ($1,'مدیر','کل',$2,$3,FALSE) ON CONFLICT (username) DO UPDATE SET password_hash=$2`,
  [un, await bcrypt.hash(pw,10), aRole]);
const people = JSON.parse(fs.readFileSync(path.join(ROOT,'seed/personnel.json'),'utf8'));
const h = await bcrypt.hash('123456',10);
for (const p of people){
  const r = await client.query(`SELECT id FROM roles WHERE title=$1`,[p.role_title]);
  const rid = r.rows[0]?.id ?? aRole;
  await client.query(`INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw)
    VALUES ($1,$2,$3,$4,$5,TRUE) ON CONFLICT (username) DO NOTHING`,
    [p.national_id,p.first_name,p.last_name,h,rid]);
}
fs.writeFileSync(path.join(ROOT,'.env'),
  `DATABASE_URL=${url}\nJWT_SECRET=${crypto.randomBytes(32).toString('hex')}\nJWT_ACCESS_TTL=15m\nJWT_REFRESH_TTL=30d\nPORT=4000\n`);
fs.writeFileSync(path.join(ROOT,'.installed'), new Date().toISOString());
await client.end();
console.log('✓ نصب کامل شد. اکنون: npm start');
