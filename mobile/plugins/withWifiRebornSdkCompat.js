const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');

const REQUIRED_NDK_VERSION = '27.3.13750724';

module.exports = function withWifiRebornSdkCompat(config) {
  config = withDangerousMod(config, ['android', async (cfg) => {
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
      console.log('[withWifiRebornSdkCompat] react-native-wifi-reborn compileSdkVersion is API 36 or inherited from the root project.');
    }

    return cfg;
  }]);

  // Set the NDK version on the app module itself. The root template in this
  // Expo/RN combination may not declare ndkVersion, so editing root build.gradle
  // is not reliable. Expo prebuild recreates app/build.gradle on every clean run.
  config = withAppBuildGradle(config, (cfg) => {
    const original = cfg.modResults.contents;
    const assignment = /\bndkVersion\s*(?:=\s*)?(?:rootProject\.ext\.ndkVersion|['"][^'"]+['"]|\d+\.\d+\.\d+)/;
    let updated;

    if (assignment.test(original)) {
      updated = original.replace(assignment, 'ndkVersion "' + REQUIRED_NDK_VERSION + '"');
    } else {
      const androidBlock = /\bandroid\s*\{/;
      if (!androidBlock.test(original)) {
        throw new Error('[withWifiRebornSdkCompat] app/build.gradle has no recognizable android block; cannot pin NDK safely.');
      }
      updated = original.replace(androidBlock, (match) => match + '\n    ndkVersion "' + REQUIRED_NDK_VERSION + '"');
    }

    if (!updated.includes(REQUIRED_NDK_VERSION)) {
      throw new Error('[withWifiRebornSdkCompat] Could not pin app NDK version to ' + REQUIRED_NDK_VERSION + '.');
    }
    if (updated !== original) {
      cfg.modResults.contents = updated;
      console.log('[withWifiRebornSdkCompat] App module NDK version pinned to ' + REQUIRED_NDK_VERSION + '.');
    } else {
      console.log('[withWifiRebornSdkCompat] App module NDK version already pinned to ' + REQUIRED_NDK_VERSION + '.');
    }
    return cfg;
  });

  return config;
};
