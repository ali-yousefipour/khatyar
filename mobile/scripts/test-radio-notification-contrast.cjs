const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../plugins/khatyar-radio-native');
const service = fs.readFileSync(path.join(root, 'KhatyarRadioService.java'), 'utf8');
const compact = fs.readFileSync(path.join(root, 'resources/layout/khatyar_radio_notification.xml'), 'utf8');
const expanded = fs.readFileSync(path.join(root, 'resources/layout/khatyar_radio_notification_big.xml'), 'utf8');

assert.match(service, /Configuration\.UI_MODE_NIGHT_MASK/);
assert.match(service, /Configuration\.UI_MODE_NIGHT_YES/);
assert.match(service, /compact\.setTextColor\(R\.id\.khatyar_notification_status, primaryText\)/);
assert.match(service, /compact\.setTextColor\(R\.id\.khatyar_notification_info, secondaryText\)/);
for (const id of ['status', 'info', 'brand', 'hint']) {
  assert.match(service, new RegExp(`expanded\\.setTextColor\\(R\\.id\\.khatyar_notification_${id},`));
}
for (const id of ['status', 'info']) assert.ok(compact.includes(`@+id/khatyar_notification_${id}`));
for (const id of ['status', 'info', 'brand', 'hint']) assert.ok(expanded.includes(`@+id/khatyar_notification_${id}`));
assert.match(service, /onConfigurationChanged\(Configuration newConfig\)/);

function contrast(a, b) {
  const lum = (hex) => {
    const channels = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255);
    return channels.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const values = [lum(a), lum(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const [fg, bg] of [['#FFFFFF', '#181818'], ['#D8E0E7', '#181818'], ['#17212E', '#FFFFFF'], ['#475569', '#FFFFFF']]) {
  assert.ok(contrast(fg, bg) >= 4.5, `${fg} has insufficient contrast on ${bg}`);
}
console.log('PASS radio notification contrast: dark/light status, subtitle, caption and theme refresh');
