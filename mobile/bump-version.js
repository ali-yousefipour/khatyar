#!/usr/bin/env node
/* اسکریپت افزایش نسخه برای بیلد محلی (سازگار با ABI splits)
 * نسخهٔ فعلی را از فایل .env می‌خواند، پیشنهادِ «یکی بیشتر» می‌دهد،
 * از شما تأیید/مقدار دلخواه می‌گیرد و در .env می‌نویسد.
 * سپس کافی است:  npx expo prebuild --clean  &&  (cd android && gradlew assembleRelease)
 *
 * نکته: پلاگین withAbiSplits برای هر معماری versionCode منحصربه‌فرد می‌سازد
 * (versionCode پایه × ۱۰ + کد معماری)، پس همین versionCode پایه کافی است.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV = path.join(__dirname, '.env');
const ENV_EXAMPLE = path.join(__dirname, '.env.example');

function readEnv() {
  let file = ENV;
  if (!fs.existsSync(ENV)) {
    if (fs.existsSync(ENV_EXAMPLE)) { fs.copyFileSync(ENV_EXAMPLE, ENV); console.log('ℹ فایل .env از روی .env.example ساخته شد.'); }
    else { fs.writeFileSync(ENV, ''); console.log('ℹ فایل .env خالی ساخته شد.'); }
  }
  const text = fs.readFileSync(ENV, 'utf8');
  const map = {};
  text.split(/\r?\n/).forEach((line) => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  });
  return { text, map };
}

function setEnvVar(text, key, value) {
  const re = new RegExp('^\\s*' + key + '\\s*=.*$', 'm');
  if (re.test(text)) return text.replace(re, key + '=' + value);
  return (text.endsWith('\n') || text === '' ? text : text + '\n') + key + '=' + value + '\n';
}

function bumpName(name) {
  // افزایش آخرین بخش نسخهٔ معنایی: 0.3.0 -> 0.3.1
  const parts = String(name || '0.0.0').split('.');
  while (parts.length < 3) parts.push('0');
  parts[parts.length - 1] = String((parseInt(parts[parts.length - 1], 10) || 0) + 1);
  return parts.join('.');
}

async function ask(rl, q, def) {
  return new Promise((res) => rl.question(q + (def !== undefined ? ` [${def}]` : '') + ': ', (a) => res((a || '').trim() || def)));
}

(async () => {
  const { text, map } = readEnv();
  let curCode = parseInt(map.ANDROID_VERSION_CODE || '0', 10) || 0;
  let curName = map.ANDROID_VERSION_NAME || '0.3.0';

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n──────── افزایش نسخهٔ برنامه ────────');
  console.log(`نسخهٔ فعلی → نام: ${curName}   کد: ${curCode}\n`);

  // پرسیدن نسخهٔ فعلی (در صورت اشتباه بودن مقدار .env، کاربر می‌تواند اصلاح کند)
  const confirmedCode = parseInt(await ask(rl, 'آخرین versionCode منتشرشده چند است؟', String(curCode)), 10) || curCode;
  const nextCode = confirmedCode + 1;

  const confirmedName = await ask(rl, 'آخرین versionName منتشرشده', curName);
  const suggestedName = bumpName(confirmedName);
  const nextName = await ask(rl, 'نام نسخهٔ جدید', suggestedName);

  let out = setEnvVar(text, 'ANDROID_VERSION_CODE', String(nextCode));
  out = setEnvVar(out, 'ANDROID_VERSION_NAME', nextName);
  fs.writeFileSync(ENV, out);

  // هماهنگ‌سازی package.json (اختیاری)
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = nextName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch (e) {}

  console.log('\n✅ نسخه به‌روزرسانی شد:');
  console.log(`   versionName: ${confirmedName} → ${nextName}`);
  console.log(`   versionCode: ${confirmedCode} → ${nextCode}`);
  console.log('\nاکنون برای ساخت APK کم‌حجم:');
  console.log('   npx expo prebuild --clean');
  console.log('   cd android && gradlew assembleRelease');
  console.log('   خروجی: android/app/build/outputs/apk/release/app-arm64-v8a-release.apk\n');
  rl.close();
})();
