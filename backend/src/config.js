import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function persistentSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET;
  const dir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  const file = path.join(dir, '.jwt_secret');
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: persistentSecret(),
  accessTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  port: Number(process.env.PORT || 4000),
};
