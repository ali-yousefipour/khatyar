const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const requiredPlugins = ['expo-audio', 'expo-splash-screen'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let lock;
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
} catch (error) {
  fail(`LOCK_REPAIR_REQUIRED: package-lock.json is missing or invalid: ${error.message}`);
}

const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const rootLock = lock.packages && lock.packages[''] ? lock.packages[''] : {};
const rootDeclared = { ...(rootLock.dependencies || {}), ...(rootLock.devDependencies || {}) };
const problems = [];

for (const name of requiredPlugins) {
  if (!declared[name]) problems.push(`${name} is not declared in package.json`);
  if (!rootDeclared[name]) problems.push(`${name} is missing from the lock root`);
  if (!lock.packages || !lock.packages[`node_modules/${name}`]) {
    problems.push(`${name} has no resolved package entry in package-lock.json`);
  }
}

if (problems.length) {
  console.error('LOCK_REPAIR_REQUIRED');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(2);
}

console.log('package-lock.json contains complete entries for required Expo plugins.');
