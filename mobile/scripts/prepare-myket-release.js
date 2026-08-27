const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const required = ['API_BASE', 'ANDROID_PACKAGE', 'ANDROID_VERSION_CODE', 'ANDROID_VERSION_NAME'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error('Missing required environment variables: ' + missing.join(', '));
  process.exit(1);
}
if (!/^https:\/\//i.test(process.env.API_BASE)) {
  console.error('API_BASE must start with HTTPS.');
  process.exit(1);
}
const code = Number(process.env.ANDROID_VERSION_CODE);
if (!Number.isInteger(code) || code < 1) {
  console.error('ANDROID_VERSION_CODE is invalid.');
  process.exit(1);
}
console.log(`Release ${process.env.ANDROID_VERSION_NAME} (${code})`);
console.log(`Package: ${process.env.ANDROID_PACKAGE}`);
console.log(`API: ${process.env.API_BASE}`);
