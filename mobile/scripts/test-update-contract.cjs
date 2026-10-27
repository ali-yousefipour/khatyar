'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const updateSource = fs.readFileSync(path.join(root, 'src/update.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/export (async function|function)/g, '$1');
const nativeSource = fs.readFileSync(path.join(root, 'plugins/khatyar-updater-native/KhatyarUpdaterModule.java'), 'utf8');
const screenSource = fs.readFileSync(path.join(root, 'src/screens/UpdateScreen.js'), 'utf8');
const manualSource = fs.readFileSync(path.join(root, 'src/updater.js'), 'utf8');
const phpSource = fs.readFileSync(path.join(root, '../php/app/api/version.php'), 'utf8');

let payload = {};
let requestError = null;
const context = vm.createContext({
  Application: { nativeApplicationVersion: '1.5.14' },
  URL,
  request: async () => { if (requestError) throw requestError; return payload; },
});
vm.runInContext(updateSource + '\nthis.api = { validateUpdateUrl, currentVersion, checkVersion };', context);
const { validateUpdateUrl, checkVersion } = context.api;
const sha = 'a'.repeat(64);

assert.equal(validateUpdateUrl('https://app.yousefipour.ir/release/line-app.apk'), true);
assert.equal(validateUpdateUrl('https://github.com/ali-yousefipour/khatyar/releases/latest/download/khatyar.apk'), true);
assert.equal(validateUpdateUrl('https://github.com/ali-yousefipour/khatyar/releases/download/v1.5.15/khatyar-1.5.15.apk'), true);
assert.equal(validateUpdateUrl('https://cdn.example.org/khatyar.apk'), false);
assert.equal(validateUpdateUrl('https://cdn.example.org/khatyar.apk', sha), true);
assert.equal(validateUpdateUrl('http://app.yousefipour.ir/update.apk', sha), false);
assert.equal(validateUpdateUrl('https://evil.org@bad.example.org/update.apk'), false);

(async () => {
  payload = { latest_version: '1.5.15', min_version: '1.5.14',
    apk_url: 'https://app.yousefipour.ir/releases/new.apk', notes: 'تغییرات جدید' };
  let x = await checkVersion();
  assert.equal(x.hasUpdate, true);
  assert.equal(x.required, false);
  assert.equal(x.url, payload.apk_url);
  assert.equal(x.notes, payload.notes);
  payload.min_version = '1.5.15';
  x = await checkVersion();
  assert.equal(x.required, true);
  payload.apk_url = 'https://cdn.example.org/latest.apk';
  x = await checkVersion();
  assert.equal(x.url, '');
  assert.equal(x.invalidUrl, true);
  payload.apk_sha256 = sha;
  x = await checkVersion();
  assert.equal(x.url, payload.apk_url);
  requestError = new Error('offline');
  x = await checkVersion();
  assert.equal(x.failed, true);

  assert.match(nativeSource, /TRUSTED_GITHUB_RELEASE_HOST/);
  assert.match(nativeSource, /TRUSTED_GITHUB_ASSET_HOST/);
  assert.match(nativeSource, /validateUpdateUrl\(finalUrl, !expected\.isEmpty\(\)\)/);
  assert.match(nativeSource, /if\(hasPinnedHash\) return/);
  assert.match(nativeSource, /validateDownloadedApk\(part, name\)/, 'APK identity must be checked before installer');
  assert.match(nativeSource, /pkg\.versionName/, 'embedded APK version must match panel release');
  assert.match(nativeSource, /pkg\.packageName/, 'embedded APK package identity must match installed app');
  assert.match(screenSource, /downloadAndInstallUpdate\(info\)/);
  assert.match(screenSource, /info\?\.notes/);
  assert.match(manualSource, /checkVersion\(\)/);
  assert.match(manualSource, /downloadAndInstallUpdate\(info\)/);
  assert.doesNotMatch(phpSource, /version_compare\(\$latest, '1\.5\.10'/);
  assert.doesNotMatch(phpSource, /strpos\(\$url, 'khatyar-1\.5\.7\.apk'/);
  console.log('PASS APK update contract: panel version/minimum, HTTPS link, GitHub CDN, SHA-256, notes, offline errors');
})().catch(error => { console.error(error); process.exitCode = 1; });
