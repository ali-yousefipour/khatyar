// افزایش خودکار شمارهٔ نسخه — قبل از هر بار خروجی‌گرفتن اجرا کنید:
//   node scripts/bump-version.js
// نسخهٔ patch (مثل 0.3.0 → 0.3.1) و versionCode را در فایل .env افزایش می‌دهد.
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function getVal(key, def) {
  const m = env.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim() : def;
}
function setVal(key, val) {
  if (new RegExp('^' + key + '=', 'm').test(env)) {
    env = env.replace(new RegExp('^' + key + '=.*$', 'm'), key + '=' + val);
  } else {
    env = env.trimEnd() + '\n' + key + '=' + val + '\n';
  }
}

// نسخهٔ نام (semver): patch را یک واحد زیاد کن
let name = getVal('ANDROID_VERSION_NAME', '0.3.0');
let parts = name.split('.').map((n) => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);
parts[2] += 1;
const newName = parts.join('.');

// versionCode: یک واحد زیاد کن
let code = parseInt(getVal('ANDROID_VERSION_CODE', '1'), 10) || 1;
const newCode = code + 1;

setVal('ANDROID_VERSION_NAME', newName);
setVal('ANDROID_VERSION_CODE', String(newCode));
fs.writeFileSync(envPath, env);

console.log(`نسخه افزایش یافت: ${name} → ${newName}  (versionCode: ${code} → ${newCode})`);
console.log('حالا اجرا کنید: npx expo prebuild --platform android --clean && cd android && gradlew assembleRelease');
