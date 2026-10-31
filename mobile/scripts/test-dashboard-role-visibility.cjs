const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/DashboardScreen.js'), 'utf8');

assert.match(screen, /const \[allowed, setAllowed\] = useState\(\[\]\)/, 'Permissions must fail closed before loading');
assert.match(screen, /readAppItems\(user\?\.id\)/, 'Dashboard must read cached role permissions for offline startup');
assert.match(screen, /refreshAppItems\(user\?\.id\)/, 'Dashboard must refresh role permissions when connected');
assert.match(screen, /if \(cached !== null\) \{ setAllowed\(cached\)/, 'Cached permissions must be applied without granting extra cards');
assert.match(screen, /if\(active\)\{setAllowed\(fresh\)/, 'Fresh permissions must replace cached access');
assert.doesNotMatch(screen, /if \(allowed === null\) return true/, 'Missing permissions cannot allow every item');
assert.doesNotMatch(screen, /if \(m\.r === 'Complaints'\) return true/, 'Individual cards cannot bypass role permission');
assert.match(screen, /if \(!permitted\) return false/, 'Every dashboard card requires role permission');
assert.match(screen, /filter\(\(route\) => allowed\.includes\(route\)\)/, 'Order modal must hide forbidden cards');
for (const name of ['Radio', 'Notifications', 'InboxReports', 'Messages']) {
  assert.ok(screen.includes(`allowed.includes('${name}')`), `Header button ${name} must be permission scoped`);
}
console.log('PASS dashboard role visibility: cards, header and reorder list fail closed');
