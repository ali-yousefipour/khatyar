import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const sql=fs.readFileSync(path.resolve(here,'../../db/upgrade_v192_mission_execution.sql'),'utf8');
try{await pool.query(sql);console.log('v192 mission execution migration completed');}finally{await pool.end();}
