const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

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

  // Pin the root Android SDK property as well as app/build.gradle. Native library
  // projects such as react-native-worklets resolve NDK from the root project,
  // not from the app module's android.ndkVersion.
  config = withGradleProperties(config, (cfg) => {
    const key = 'android.ndkVersion';
    const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) {
      existing.value = REQUIRED_NDK_VERSION;
    } else {
      cfg.modResults.push({ type: 'property', key, value: REQUIRED_NDK_VERSION });
    }
    return cfg;
  });

  // Expo's Gradle publication hook can run before AGP has registered the
  // release SoftwareComponent. APK assembly does not need Maven publication;
  // skip only that optional hook when the component is unavailable.
  config = withDangerousMod(config, ['android', async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const candidates = [
      path.join(projectRoot, 'node_modules', 'expo-modules-core', 'expo-module-gradle-plugin', 'src', 'main', 'kotlin', 'expo', 'modules', 'plugin', 'ProjectConfiguration.kt'),
      path.join(projectRoot, 'node_modules', 'expo-modules-core', 'expo-module-gradle-plugin', 'src', 'main', 'kotlin', 'expo', 'modules', 'plugin', 'android', 'ProjectConfiguration.kt')
    ];
    const sourcePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!sourcePath) {
      console.log('[withWifiRebornSdkCompat] Expo publication source not present; no publication patch required.');
      return cfg;
    }

    const source = fs.readFileSync(sourcePath, 'utf8');
    if (source.includes('components.matching { it.name == "release" }')) {
      console.log('[withWifiRebornSdkCompat] Expo publication hook already waits for the release component.');
      return cfg;
    }

    const anchor = /afterEvaluate\s*\{\s*(?=val publicationInfo\s*=\s*PublicationInfo\(this\))/;
    if (!anchor.test(source)) {
      throw new Error('[withWifiRebornSdkCompat] Expo Gradle publication source has an unknown layout; refusing an unverified patch.');
    }
    const guard = 'afterEvaluate {\n' +
      '    if (components.findByName("release") == null) {\n' +
      '      logger.warn("Skipping optional Expo Maven publication for ${project.path}: release SoftwareComponent is unavailable during configuration.")\n' +
      '      return@afterEvaluate\n' +
      '    }\n' +
      '    ';
    const patched = source.replace(anchor, guard);
    if (patched === source || !patched.includes('release SoftwareComponent is unavailable')) {
      throw new Error('[withWifiRebornSdkCompat] Failed to apply the guarded Expo publication patch.');
    }
    fs.writeFileSync(sourcePath, patched, 'utf8');
    console.log('[withWifiRebornSdkCompat] Expo Maven publication now skips safely when the release component is unavailable.');
    return cfg;
  }]);
  // Keep the app module pinned too; this is useful for app-owned native CMake
  // targets, while the root property above covers dependency projects.
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
