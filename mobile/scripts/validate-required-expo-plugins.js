const path = require('path');
const root = path.resolve(__dirname, '..');
const required = ['expo', 'expo-audio', 'expo-splash-screen', '@expo/config-plugins'];
const failures = [];
for (const name of required) {
  try {
    const pkg = require.resolve(`${name}/package.json`, { paths: [root] });
    const version = require(pkg).version;
    console.log(`${name}@${version}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}
if (failures.length) {
  console.error('Required Expo modules are missing or incomplete:');
  failures.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}
