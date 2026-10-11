const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// react-native-wifi-reborn 4.13.6 falls back to API 31 when the root
// Gradle project does not expose compileSdkVersion through ext. That fallback
// makes Gradle require platforms;android-31 even when the project uses a fixed
// SDK. Pin this module to the repository's agreed Android API 34 toolchain.
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
      /(safeExtGet\(['"]compileSdkVersion['"],\s*)31(\s*\))/g,
      /(compileSdkVersion\s*=\s*)31\b/g,
      /(compileSdkVersion\s+)31\b/g
    ];
    let updated = original;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, (match, prefix, suffix = '') => prefix + '34' + suffix);
    }

    if (/safeExtGet\(['"]compileSdkVersion['"],\s*31\s*\)/.test(updated) ||
        /compileSdkVersion(?:\s*=)?\s+31\b/.test(updated)) {
      throw new Error('[withWifiRebornSdkCompat] Unable to replace the legacy API 31 fallback.');
    }

    if (updated !== original) {
      fs.writeFileSync(gradleFile, updated, 'utf8');
      console.log('[withWifiRebornSdkCompat] react-native-wifi-reborn compile SDK fallback pinned to API 34.');
    } else if (!/compileSdkVersion[^\n]*34/.test(updated)) {
      throw new Error('[withWifiRebornSdkCompat] Expected compileSdkVersion declaration was not recognized; refusing an unverified build.');
    }

    return cfg;
  }]);
};
