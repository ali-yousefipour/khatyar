const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const native = read('plugins/sms-otp-native/KhatyarSmsOtpModule.java');
const plugin = read('plugins/withSmsOtp.js');
const screen = read('src/screens/LoginScreen.js');
const server = read('../php/lib/routes.php');
const sms = read('../php/lib/Sms.php');

assert.match(native, /startSmsRetriever\(\)/);
assert.match(native, /startSmsUserConsent\(null\)/);
assert.match(native, /SmsRetriever\.SEND_PERMISSION/);
assert.match(native, /LOGIN_CODE\.matcher\(message\)/);
assert.doesNotMatch(plugin + native, /android\.permission\.(READ_SMS|RECEIVE_SMS)/);
assert.match(plugin, /play-services-auth-api-phone:18\.2\.0/);
assert.match(screen, /loginMethod === 'sms_otp' \? <View style=\{s\.smsWaitCard\}>/);
assert.match(screen, /DeviceEventEmitter\.addListener\('KhatyarSmsOtpCode'/);
assert.match(screen, /smsStatus === 'timeout' \? 'consent'/);
assert.match(screen, /manualSmsEntry/);
assert.match(screen, /کد را دستی وارد می‌کنم/);
assert.match(screen, /autoComplete="sms-otp"/);
assert.match(server, /_otp_device_binding/);
assert.match(server, /_android_sms_hash/);
assert.match(sms, /\[OTP REDACTED\]/);
console.log('PASS SMS OTP native Retriever/Consent, accessible manual fallback, device binding, and OTP redaction');
