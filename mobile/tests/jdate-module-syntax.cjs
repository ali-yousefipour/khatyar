// Regression guard for Metro failure: duplicate named exports in src/jdate.js.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const file = path.resolve(__dirname, '../src/jdate.js');
const source = fs.readFileSync(file, 'utf8');
const check = spawnSync(process.execPath, ['--input-type=module', '--check'], {
  input: source, encoding: 'utf8'
});
if (check.status !== 0) {
  console.error(check.stderr || check.stdout || 'Jalali module parse failed');
  process.exit(1);
}
if (!/export\\s+function\\s+g2j\\s*\\(/.test(source)) {
  throw new Error('g2j should be exported exactly once as a named function');
}
console.log('PASS: Jalali module parses as ESM with a unique g2j export.');
