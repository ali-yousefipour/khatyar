const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gate = fs.readFileSync(path.join(__dirname, '../src/StartupGate.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
const syncStage = gate.slice(gate.indexOf("setPhase('در حال آماده‌سازی همگام‌سازی…')"), gate.indexOf('setProgress(90)'));

assert.ok(syncStage.includes('flushQueuedRequests().catch('), 'startup must start queued sync without blocking');
assert.doesNotMatch(syncStage, /await\s+flushQueuedRequests\s*\(/, 'offline queue must not block startup');
assert.match(gate, /setProgress\(100\);\s*setReady\(true\)/, 'startup must complete normally');
assert.match(app, /flushQueuedRequests\(\)\.catch\(/, 'background queue retry must stay enabled');
console.log('PASS startup gate: queue sync is non-blocking and background retry remains active');
