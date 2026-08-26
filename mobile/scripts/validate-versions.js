'use strict';

const expected = {
  expo: /^57\./,
  'react-native': /^0\.86\./,
  'react-native-reanimated': /^4\.5\./,
  'react-native-worklets': /^0\.10\./,
};

let failed = false;
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
