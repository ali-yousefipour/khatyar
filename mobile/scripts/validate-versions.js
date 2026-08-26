'use strict';

const expected = {
  expo: /^57\./,
  'react-native': /^0\.86\./,
  'react-native-reanimated': /^4\.5\./,
  'react-native-worklets': /^0\.10\./,
};

let failed = false;

// Expo SDK 57 officially requires Node.js 22.13.x or newer. Fail here with a
// precise diagnostic instead of allowing Metro to fail later during release
// serialization with only "Android Bundling failed" visible in Gradle output.
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

process.exit(failed ? 1 : 0);
