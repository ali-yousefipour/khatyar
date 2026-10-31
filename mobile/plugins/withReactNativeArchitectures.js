const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

// New APK releases target 64-bit Android devices only. Keep both the RN
// compilation target AND Gradle NDK ABI filter in sync: the latter prevents
// prebuilt third-party 32-bit .so files from sneaking into the final APK.
const TARGET_ARCHITECTURES = 'arm64-v8a';

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
    const marker = '// KHATYAR_ARM64_ONLY';
    if (cfg.modResults.contents.includes(marker)) return cfg;
    const updated = cfg.modResults.contents.replace(/defaultConfig\s*\{/, match => `${match}\n        ${marker}\n        ndk { abiFilters 'arm64-v8a' }`);
    if (updated === cfg.modResults.contents) throw new Error('Android defaultConfig block not found; cannot enforce arm64-only APK.');
    cfg.modResults.contents = updated;
    return cfg;
  });
};
