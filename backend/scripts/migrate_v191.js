import fs from 'node:fs';
import { pool } from '../src/db.js';
const sql = fs.readFileSync(new URL('../../db/upgrade_v191_mission_engine.sql', import.meta.url), 'utf8');
try {
  await pool.query(sql);
  console.log('ارتقای v191 موتور مأموریت با موفقیت اجرا شد.');
} finally {
  await pool.end();
}
