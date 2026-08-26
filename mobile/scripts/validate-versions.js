'use strict';

const fs = require('fs');
const path = require('path');

const expected = {
  expo: /^57\./,
  'react-native': /^0\.86\./,
  'react-native-reanimated': /^4\.5\./,
  'react-native-worklets': /^0\.10\./,
};

let failed = false;

// Expo SDK 57 officially requires Node.js 22.13.x or newer. Running Metro
// under an older Node version can fail during release serialization with a
// misleading "Android Bundling failed" message.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) {
  console.error(`Incompatible Node.js version: ${process.version}. Expo SDK 57 requires Node.js >= 22.13.x.`);
  failed = true;
} else {
  console.log(`node=${process.version}`);
}

for (const [name, pattern] of Object.entries(expected)) {
  try {
    const version = require(`${name}/package.json`).version;
    console.log(`${name}=${version}`);
    if (!pattern.test(version)) {
      console.error(`Incompatible ${name} version: ${version}`);
      failed = true;
    }
  } catch (error) {
    console.error(`Cannot resolve ${name}: ${error.message}`);
    failed = true;
  }
}

// Detect a stale lockfile before npm/Metro can consume it.
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf8'));
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
    console.error(`package-lock.json version mismatch: package.json=${pkg.version}, lockfile=${lock.version}/${lock.packages?.['']?.version}`);
    failed = true;
  }
} catch (error) {
  console.error(`Cannot validate package-lock.json: ${error.message}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
