const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gate = fs.readFileSync(path.join(__dirname, '../src/StartupGate.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(__dirname, '../src/screens/DashboardScreen.js'), 'utf8');
const checkIn = fs.readFileSync(path.join(__dirname, '../src/screens/CheckInScreen.js'), 'utf8');
const syncStage = gate.slice(gate.indexOf("setPhase('در حال آماده‌سازی همگام‌سازی…')"), gate.indexOf('setProgress(90)'));

assert.ok(syncStage.includes('flushQueuedRequests().catch('), 'startup must start queued sync without blocking');
assert.doesNotMatch(syncStage, /await\s+flushQueuedRequests\s*\(/, 'offline queue must not block startup');
assert.match(gate, /setProgress\(100\);\s*setReady\(true\)/, 'startup must complete normally');
assert.match(app, /flushQueuedRequests\(\)\.catch\(/, 'background queue retry must stay enabled');
assert.doesNotMatch(dashboard, /await\s+flushQueuedRequests\s*\(/, 'dashboard refresh must not wait for queued uploads');
const networkListener = checkIn.slice(checkIn.indexOf('NetInfo.addEventListener('), checkIn.indexOf("AsyncStorage.getItem('attendance_exit_reminder_8h')"));
assert.doesNotMatch(networkListener, /await\s+flushQueuedRequests\s*\(/, 'attendance reconnect refresh must not wait for queued uploads');
console.log('PASS startup gate: queue sync is non-blocking and background retry remains active');
