const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'android', 'ios', '.expo'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const pkg = JSON.parse(read('package.json'));
if (pkg.dependencies?.['react-native-nfc-manager']) failures.push('NFC dependency still exists.');
if (!pkg.devDependencies?.['@expo/config-plugins']) failures.push('@expo/config-plugins is missing.');
if (!String(pkg.dependencies?.expo || '').startsWith('~57.')) failures.push('Expo SDK is not pinned to 57.x.');

for (const file of walk(root)) {
  if (!/\.(js|jsx|ts|tsx|json|xml|gradle|properties)$/.test(file)) continue;
  if (path.resolve(file) === path.resolve(__filename)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/react-native-nfc-manager|NfcManager|android\.permission\.NFC/.test(text)) {
    failures.push(`NFC reference: ${path.relative(root, file)}`);
  }
  if (/text-recognition-chinese/.test(text)) {
    failures.push(`Chinese ML Kit dependency: ${path.relative(root, file)}`);
  }
}

const pluginFiles = ['plugins/withReleaseHardening.js','plugins/withAbiSplits.js'];
for (const rel of pluginFiles) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing plugin: ${rel}`);
}

if (failures.length) {
  console.error('PHASE 5 VALIDATION FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log('PHASE 5 VALIDATION PASSED');
if (warnings.length) warnings.forEach((w) => console.warn(`- ${w}`));
