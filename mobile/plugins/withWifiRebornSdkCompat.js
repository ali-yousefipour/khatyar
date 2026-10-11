const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// react-native-wifi-reborn 4.13.6 may use either a numeric compile SDK
// fallback or inherit compileSdkVersion from the root Android project.
// Keep numeric fallbacks aligned with Expo SDK 57's API 36 baseline without
// rejecting valid declarations delegated to the root project.
module.exports = function withWifiRebornSdkCompat(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const gradleFile = path.join(
      cfg.modRequest.projectRoot,
      'node_modules',
      'react-native-wifi-reborn',
      'android',
      'build.gradle'
    );

    if (!fs.existsSync(gradleFile)) {
      throw new Error('[withWifiRebornSdkCompat] react-native-wifi-reborn/android/build.gradle was not found.');
    }

    const original = fs.readFileSync(gradleFile, 'utf8');
    const patterns = [
      /(safeExtGet\(\s*['"]?compileSdkVersion['"]?\s*,\s*)\d+(\s*\))/g,
      /(\bcompileSdkVersion\s*=\s*)\d+\b/g,
      /(\bcompileSdkVersion\s+)\d+\b/g
    ];

    let updated = original;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, (match, prefix, suffix = '') => prefix + '36' + suffix);
    }

    // Fail closed only when a numeric fallback/declaration was recognized but
    // still remains below API 36; root-project expressions are valid as-is.
    const legacyNumericSdk =
      /safeExtGet\(\s*['"]?compileSdkVersion['"]?\s*,\s*(?:[0-9]|[12]\d|3[0-5])\s*\)/.test(updated) ||
      /\bcompileSdkVersion(?:\s*=)?\s+(?:[0-9]|[12]\d|3[0-5])\b/.test(updated);

    if (legacyNumericSdk) {
      throw new Error('[withWifiRebornSdkCompat] A numeric compileSdkVersion below API 36 remains after compatibility patching.');
    }

    if (!/\bcompileSdkVersion\b/.test(updated)) {
      throw new Error('[withWifiRebornSdkCompat] No compileSdkVersion declaration/reference was found; refusing an unverified build.');
    }

    if (updated !== original) {
      fs.writeFileSync(gradleFile, updated, 'utf8');
      console.log('[withWifiRebornSdkCompat] react-native-wifi-reborn numeric compile SDK fallback pinned to API 36.');
    } else {
      console.log('[withWifiRebornSdkCompat] compileSdkVersion is already API 36 or inherited from the root Android project; no patch needed.');
    }

    return cfg;
  }]);
};
