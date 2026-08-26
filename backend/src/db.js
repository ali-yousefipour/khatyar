import pg from 'pg';
import { config } from './config.js';

// اگر DATABASE_URL تنظیم شده باشد از آن، در غیر این صورت از متغیرهای PGHOST/PGUSER/... استفاده می‌شود.
export const pool = config.databaseUrl
  ? new pg.Pool({ connectionString: config.databaseUrl })
  : new pg.Pool();

export const q = (text, params) => pool.query(text, params);
