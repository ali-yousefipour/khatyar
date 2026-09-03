const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceFiles = [
  path.join(root, 'App.js'),
  ...walk(path.join(root, 'src')),
].filter((file) => /\.(js|jsx|ts|tsx)$/.test(file));

const violations = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\bSafeAreaView\b/.test(text)) {
    violations.push(path.relative(root, file));
  }
}

const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const providerImports = (app.match(/\bSafeAreaProvider\b/g) || []).length;
if (providerImports < 1) {
  violations.push('App.js (SafeAreaProvider missing)');
}

if (violations.length) {
  console.error('[safe-area] validation failed. SafeAreaView must not be used in the mobile app because it previously caused the Android release crash.');
  for (const item of violations) console.error(` - ${item}`);
  process.exit(1);
}

console.log(`[safe-area] OK: ${sourceFiles.length} source files checked; SafeAreaView is absent and root SafeAreaProvider is present.`);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
