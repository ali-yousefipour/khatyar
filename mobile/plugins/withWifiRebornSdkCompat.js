const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// react-native-wifi-reborn 4.13.6 has a legacy API 31 fallback.
// Keep its fallback aligned with Expo SDK 57's compileSdk 36 baseline.
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
      /(safeExtGet\\(\\s*['"]?compileSdkVersion['"]?\\s*,\\s*)31(\\s*\\))/g,
      /(compileSdkVersion\\s*=\\s*)31\\b/g,
      /(compileSdkVersion\\s+)31\\b/g
    ];
    let updated = original;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, (match, prefix, suffix = '') => prefix + '36' + suffix);
    }

    if (/safeExtGet\\(\\s*['"]?compileSdkVersion['"]?\\s*,\\s*31\\s*\\)/.test(updated) ||
        /compileSdkVersion(?:\\s*=)?\\s+31\\b/.test(updated)) {
      throw new Error('[withWifiRebornSdkCompat] Unable to replace the legacy API 31 fallback.');
    }

    if (updated !== original) {
      fs.writeFileSync(gradleFile, updated, 'utf8');
      console.log('[withWifiRebornSdkCompat] react-native-wifi-reborn compile SDK fallback pinned to API 36.');
    } else if (!/compileSdkVersion[^\\n]*36/.test(updated)) {
      throw new Error('[withWifiRebornSdkCompat] Expected compileSdkVersion declaration was not recognized; refusing an unverified build.');
    }

    return cfg;
  }]);
};
