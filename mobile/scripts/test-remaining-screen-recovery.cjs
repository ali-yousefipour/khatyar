const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.resolve(__dirname, '../src/screens', name), 'utf8');

const gate = read('CompanyRequestsDriverGateScreen.js');
const request = read('CompanyRequestsScreen.js');
assert.doesNotMatch(gate, /global\.fetch\s*=/, 'Driver selection must not monkey-patch all network requests');
assert.match(gate, /selectedDriver=\{driver\}/, 'Selected driver must be passed directly');
assert.match(request, /driver_id:Number\(selectedDriver\.id\)/, 'Company request must include the chosen driver explicitly');

const checklist = read('ChecklistScreen.js');
assert.match(checklist, /const loadTemplate=/, 'Checklist must support retry');
assert.match(checklist, /loadError\?/, 'Checklist must distinguish a failed template fetch from loading');
assert.match(checklist, /catch\(e\)\{Alert\.alert\('خطای تصویر'/, 'Checklist photo compression must report errors');

const station = read('StationCaptureV5Screen.js');
assert.doesNotMatch(station, /permItems==null\?true/, 'Missing station permissions cannot be treated as all-access');
assert.match(station, /queueIfOffline:false/, 'Station permission must come from live server');
assert.match(station, /if\(loadError\)return/, 'Failed station setup needs a recoverable error screen');

const list = read('ListScreens.js');
assert.match(list, /function useRemoteRows\(path\)/, 'Historical lists need a common error/retry mechanism');
assert.equal((list.match(/onRetry=\{retry\}/g) || []).length, 5, 'All five history pages must expose retry');

for (const page of ['AppLockSettingsScreen.js', 'RoleDashboardScreen.js', 'ReportsScreen.js', 'CulturalScreen.js']) {
  assert.match(read(page), /تلاش دوباره/, `${page} needs a recoverable error state`);
}
assert.match(read('SetupScreen.js'), /AbortController/, 'Server setup must time out');
console.log('PASS remaining Android UI: driver binding, checklist, station access and error recovery');
