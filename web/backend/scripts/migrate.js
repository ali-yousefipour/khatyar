import fs from 'node:fs';
import { pool } from '../src/db.js';
const sql = fs.readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('جداول ساخته شد.');
await pool.end();
