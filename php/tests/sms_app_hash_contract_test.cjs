const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '../lib/routes.php'), 'utf8');
const match = routes.match(/const KHATYAR_MYKET_SMS_APP_HASH = '([A-Za-z0-9+/]{11})';/);
assert.ok(match, 'Signed release app hash must be an eleven-character identifier');
assert.equal(match[1], 'ccku0ertOIb', 'Hash must match the verified Myket signing certificate');
assert.match(routes, /_req_setting\('android_sms_app_hash', KHATYAR_MYKET_SMS_APP_HASH\)/);
assert.match(routes, /\$text \.= "\\n\\n"\.\$appHash/);
assert.match(routes, /\$out\['android_sms_app_hash'\] = KHATYAR_MYKET_SMS_APP_HASH/);
assert.match(routes, /'sms_auto_mode'=>_android_sms_hash\(\) !== '' \? 'retriever' : 'consent'/);
console.log('PASS signed Myket OTP app-hash default, SMS suffix and settings response');
