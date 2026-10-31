const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

// Include both 32-bit and 64-bit ARM for older Android devices and newer phones.
// React Native compilation targets and Gradle NDK filters must stay in sync.
const TARGET_ARCHITECTURES = 'armeabi-v7a,arm64-v8a';

module.exports = function withReactNativeArchitectures(config) {
  config = withGradleProperties(config, (cfg) => {
    const key = 'reactNativeArchitectures';
    const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) {
      existing.value = TARGET_ARCHITECTURES;
    } else {
      cfg.modResults.push({ type: 'property', key, value: TARGET_ARCHITECTURES });
    }
    return cfg;
  });

  // لایهٔ ایمنی دوم: تعداد کارهای موازی گریدل را محدود کن. هر ماژول بومی
  // (expo-modules-core, reanimated, worklets, screens, ...) یک worker جداست؛
  // اجرای همزمان همهٔ آن‌ها روی ماشین‌های ویندوزی با RAM محدود می‌تواند حتی
  // با ۲ معماری هم فشار زیادی ایجاد کند. اگر ماشین شما قوی است (RAM/هستهٔ
  // زیاد) و بیلدها پایدارند، می‌توانید این عدد را در android/gradle.properties
  // خودتان بعداً افزایش دهید.
  config = withGradleProperties(config, (cfg) => {
    const key = 'org.gradle.workers.max';
    const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
    if (!existing) {
      cfg.modResults.push({ type: 'property', key, value: '2' });
    }
    return cfg;
  });
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    const marker = '// KHATYAR_ARM32_ARM64';
    if (cfg.modResults.contents.includes(marker)) return cfg;
    const updated = cfg.modResults.contents.replace(/defaultConfig\s*\{/, match => `${match}\n        ${marker}\n        ndk { abiFilters 'armeabi-v7a', 'arm64-v8a' }`);
    if (updated === cfg.modResults.contents) throw new Error('Android defaultConfig block not found; cannot enforce ARM32/ARM64 APK.');
    cfg.modResults.contents = updated;
    return cfg;
  });
};
