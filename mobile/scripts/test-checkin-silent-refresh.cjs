const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/CheckInScreen.js'), 'utf8');
const start = screen.indexOf('  const refreshMyLocation = async () => {');
const end = screen.indexOf('  const cancelExitReminder = async () => {', start);
assert.ok(start > 0 && end > start, 'Map refresh handler must exist');
const handler = screen.slice(start, end);

assert.match(handler, /Promise\.allSettled\(\[/, 'Independent cache refreshes must not block each other on failure');
assert.match(handler, /getForegroundPermissionsAsync\(\)/, 'Refresh must not prompt for GPS permission');
assert.match(handler, /getAccuratePosition\(/, 'Map GPS is refreshed');
assert.match(handler, /load\(\{ refreshLocation: false, refreshCache: true \}\)/, 'Presence and shift timer refresh from the server');
for (const name of ['getAppConfig(true)', 'refreshAccessCache()', 'refreshAllowedLines(user.id)', 'refreshAppItems(user.id)', 'loadSchoolServiceCache({ refresh: true })']) {
  assert.ok(handler.includes(name), `${name} is refreshed without user interaction`);
}
assert.match(handler, /request\('\/my\/shift-schedule\?scope=current-month', \{ forceNetwork: true/, 'Monthly shift cache is updated');
assert.doesNotMatch(handler, /Alert\.alert|multiRemove|clearAppConfigCache|removeItem\(/, 'No dialogs or destructive cache clearing');
console.log('PASS check-in silent refresh: map, shift, app data and offline-safe cache behavior');
