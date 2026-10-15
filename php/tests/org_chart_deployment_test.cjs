const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/deploy-php.yml'), 'utf8');
const lines = workflow.split(/\r?\n/);
const protectedChecks = lines.filter(line => line.includes('if [ "${rel}" = "lib/Http.php" ]'));
assert.equal(protectedChecks.length, 2);
for (const check of protectedChecks) assert.ok(check.includes('"lib/OrgChart.php"'));
const installerCheck = lines.find(line => line.includes('if [ -f deploy-payload/lib/Http.php ]'));
assert.ok(installerCheck.includes('[ -f deploy-payload/lib/OrgChart.php ]'));
const staging = lines.find(line => line.includes('for name in Http.php'));
assert.ok(staging.includes('OrgChart.php'));
const dependency = workflow.indexOf("'OrgChart.php' => 'OrgChart.php'");
const routes = workflow.indexOf("'routes.php' => 'routes.php'");
assert.ok(dependency > 0 && dependency < routes);
assert.ok(workflow.includes('hash_equals(\\$token'));
assert.ok(workflow.includes('hash_equals(\\$srcSha, \\$dstSha)'));
console.log('PASS OrgChart deployment: protected FTP paths, staged PHP installer, dependency before routes, token check and checksum verification');
