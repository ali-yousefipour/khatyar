const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../plugins/withKhatyarUpdater.js'), 'utf8');
const native = fs.readFileSync(path.join(__dirname, '../plugins/khatyar-updater-native/KhatyarUpdaterModule.java'), 'utf8');

assert.match(source, /<external-path name=\\?"downloads\\?" path=\\?"Download\/\\?"/);
assert.doesNotMatch(source, /<external-path name=\\?"external_storage\\?" path=\\?"\.\\?"/);
assert.match(source, /android:maxSdkVersion/);
assert.match(source, /'android:exported': 'false'/);
assert.match(native, /getExternalStoragePublicDirectory\(Environment\.DIRECTORY_DOWNLOADS\)/);
console.log('PASS updater FileProvider: Downloads-only path, non-exported provider, legacy-only storage permission');
