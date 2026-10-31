const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const driver = fs.readFileSync(path.resolve(__dirname, '../src/screens/DriverScreen.js'), 'utf8');
const routes = fs.readFileSync(path.resolve(__dirname, '../../php/lib/routes.php'), 'utf8');
const panel = fs.readFileSync(path.resolve(__dirname, '../../php/tools/panel_source.jsx'), 'utf8');

for (const pattern of [
  /launchCamera\(/, /requestCameraPermissionsAsync/, /compressToDataUri\(/,
  /maxW: width, maxH: 640, quality/, /portraitConsent/, /تأیید و ثبت قطعی/,
  /queueIfOffline: false/, /action\.t === 'ثبت تذکر'/,
  /if \(!portrait \|\| portraitBusy \|\| portraitDraft\) return photoGate\(\)/,
  /onPress=\{\(\) => runDriverAction\(a\)\}/,
]) assert.match(driver, pattern);
assert.doesNotMatch(driver, /portraitRequired\s*&&/);
assert.doesNotMatch(driver, /launchLibrary\(/);
for (const pattern of [
  /CREATE TABLE IF NOT EXISTS driver_profile_photos/,
  /route\('POST','\/api\/driver-photos\/\{id\}'/,
  /route\('PUT','\/api\/admin\/drivers\/\{id\}\/photo'/,
  /if \(\$existing && !\$admin\) Http::error/,
  /strlen\(\$raw\)>120\*1024/,
  /_driver_photo_guard\(\$did\)/,
]) assert.match(routes, pattern);
assert.doesNotMatch(routes.match(/route\('POST', '\/api\/notices'[\s\S]*?route\('/)?.[0] || '', /_driver_photo_guard\(/);
assert.match(panel, /driver_profile_photo_required/);
assert.match(panel, /uploadPortrait\(full\.id/);
console.log('PASS taxi driver photo: camera only, local compression, explicit consent, immutable mobile upload, server-side photo gates and admin replacement');
