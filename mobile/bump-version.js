#!/usr/bin/env node
/* افزایش نسخه برای Build محلی؛ package.json منبع اصلی نام نسخه است. */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = __dirname;
const ENV = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const PKG = path.join(ROOT, 'package.json');
const LOCK = path.join(ROOT, 'package-lock.json');

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function setEnvVar(text, key, value) {
  const re = new RegExp('^\\s*' + key + '=.*$', 'm');
  if (re.test(text)) return text.replace(re, key + '=' + value);
  return (text.endsWith('\n') || text === '' ? text : text + '\n') + key + '=' + value + '\n';
}

function bumpName(name) {
  const parts = String(name || '0.0.0').split('.');
  while (parts.length < 3) parts.push('0');
  parts[parts.length - 1] = String((parseInt(parts[parts.length - 1], 10) || 0) + 1);
  return parts.join('.');
}

function versionCode(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`Invalid semantic version: ${version}`);
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
}

function syncPackageLock(version) {
  if (!fs.existsSync(LOCK)) return;
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
    lock.version = version;
    if (lock.packages && lock.packages['']) lock.packages[''].version = version;
    fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  } catch (error) {
    console.warn(`WARNING: package-lock.json could not be synchronized: ${error.message}`);
  }
}

async function ask(rl, q, def) {
  return new Promise((resolve) => rl.question(q + (def !== undefined ? ` [${def}]` : '') + ': ', (a) => resolve((a || '').trim() || def)));
}

(async () => {
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const envText = fs.existsSync(ENV)
    ? fs.readFileSync(ENV, 'utf8')
    : (fs.existsSync(ENV_EXAMPLE) ? fs.readFileSync(ENV_EXAMPLE, 'utf8') : '');
  const env = parseEnv(envText);
  const currentName = pkg.version || env.ANDROID_VERSION_NAME || '0.0.0';
  const currentCode = Number(env.ANDROID_VERSION_CODE || versionCode(currentName));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n──────── افزایش نسخهٔ برنامه ────────');
  console.log(`نسخهٔ فعلی → نام: ${currentName}   کد: ${currentCode}\n`);

  const confirmedName = await ask(rl, 'آخرین versionName منتشرشده', currentName);
  const nextName = await ask(rl, 'نام نسخهٔ جدید', bumpName(confirmedName));
  const nextCode = versionCode(nextName);

  pkg.version = nextName;
  fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  syncPackageLock(nextName);

  let out = envText;
  out = setEnvVar(out, 'ANDROID_VERSION_CODE', String(nextCode));
  out = setEnvVar(out, 'ANDROID_VERSION_NAME', nextName);
  if (!fs.existsSync(ENV)) out = out || (fs.existsSync(ENV_EXAMPLE) ? fs.readFileSync(ENV_EXAMPLE, 'utf8') : '');
  fs.writeFileSync(ENV, out, 'utf8');

  rl.close();
  console.log('\nنسخه هماهنگ شد:');
  console.log(`  package.json      : ${nextName}`);
  console.log(`  ANDROID_VERSION_CODE: ${nextCode}`);
  console.log('  package-lock.json: synchronized when present');
})();
