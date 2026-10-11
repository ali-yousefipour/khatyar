const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const REQUIRED_NDK_VERSION = '27.3.13750724';

// react-native-wifi-reborn 4.13.6 may use a numeric compile SDK fallback
// or inherit compileSdkVersion from the root Android project. Also align the
// generated root project's NDK fallback with the NDK installed by build-release.ps1.
module.exports = function withWifiRebornSdkCompat(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const gradleFile = path.join(
      projectRoot,
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

    // Expo prebuild regenerates android/ from scratch. Patch its root NDK
    // fallback explicitly because the installed SDK contains r27d (27.3),
    // while the React Native template may still request 27.0.12077973.
    const rootBuildFile = path.join(cfg.modRequest.platformProjectRoot, 'build.gradle');
    if (!fs.existsSync(rootBuildFile)) {
      throw new Error('[withWifiRebornSdkCompat] Generated android/build.gradle was not found.');
    }

    const rootOriginal = fs.readFileSync(rootBuildFile, 'utf8');
    const ndkFallbackPattern = /(\bndkVersion\s*=\s*[^\r\n]*?['"])(\d+\.\d+\.\d+)(['"])/g;
    const rootUpdated = rootOriginal.replace(ndkFallbackPattern, (match, prefix, version, suffix) => {
      // Only align an NDK version property/fallback; leave unrelated version strings untouched.
      return prefix + REQUIRED_NDK_VERSION + suffix;
    });

    if (!/\bndkVersion\s*=/.test(rootUpdated)) {
      throw new Error('[withWifiRebornSdkCompat] Generated root build.gradle has no recognizable ndkVersion assignment.');
    }
    if (!rootUpdated.includes(REQUIRED_NDK_VERSION)) {
      throw new Error('[withWifiRebornSdkCompat] Could not align generated root NDK version with installed NDK ' + REQUIRED_NDK_VERSION + '.');
    }
    if (rootUpdated !== rootOriginal) {
      fs.writeFileSync(rootBuildFile, rootUpdated, 'utf8');
      console.log('[withWifiRebornSdkCompat] Generated root NDK version aligned to ' + REQUIRED_NDK_VERSION + '.');
    } else {
      console.log('[withWifiRebornSdkCompat] Generated root NDK version already aligned to ' + REQUIRED_NDK_VERSION + '.');
    }

    return cfg;
  }]);
};
