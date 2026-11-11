const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.resolve(__dirname, '../App.js'), 'utf8');
const dashboard = fs.readFileSync(path.resolve(__dirname, '../src/screens/DashboardScreen.js'), 'utf8');

assert.match(app, /const restrictedScreenCache = new Map\(\)/, 'route wrappers must have stable identities');
assert.match(app, /existing\?\.source === ScreenComponent\) return existing\.wrapper/, 'reuse existing route wrapper');
assert.match(app, /component=\{getRestrictedScreenComponent\(name, component\)\}/, 'navigator must use stable wrappers');
assert.doesNotMatch(app, /component=\{\(props\) => <RestrictedScreen/, 'inline navigator wrappers cause screen remounts');

assert.match(dashboard, /let welcomedUserId = null/, 'welcome must persist across dashboard remounts');
assert.match(dashboard, /welcomedUserId === String\(user\.id\)/, 'repeat greeting is blocked for the same user');
assert.match(dashboard, /welcomedUserId = String\(user\.id\);[\s\S]*?welcomePlayer\.play\(\)/, 'mark the greeting before playback');
console.log('PASS dashboard remount and welcome lifecycle guards');
