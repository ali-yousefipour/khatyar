const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const screen = fs.readFileSync(path.resolve(__dirname, '../src/screens/DashboardScreen.js'), 'utf8');

assert.match(screen, /const \[allowed, setAllowed\] = useState\(\[\]\)/, 'Permissions must fail closed before loading');
assert.match(screen, /request\('\/my\/app-items', \{ noStore: true, forceNetwork: true/, 'Dashboard must fetch fresh role permissions');
assert.match(screen, /setAllowed\(Array\.isArray\(r\?\.items\) \? r\.items : \[\]\)/, 'Unconfigured roles must not show all cards');
assert.doesNotMatch(screen, /if \(allowed === null\) return true/, 'Missing permissions cannot allow every item');
assert.doesNotMatch(screen, /if \(m\.r === 'Complaints'\) return true/, 'Individual cards cannot bypass role permission');
assert.match(screen, /if \(!permitted\) return false/, 'Every dashboard card requires role permission');
assert.match(screen, /filter\(\(route\) => allowed\.includes\(route\)\)/, 'Order modal must hide forbidden cards');
for (const name of ['Radio', 'Notifications', 'InboxReports', 'Messages']) {
  assert.ok(screen.includes(`allowed.includes('${name}')`), `Header button ${name} must be permission scoped`);
}
console.log('PASS dashboard role visibility: cards, header and reorder list fail closed');
