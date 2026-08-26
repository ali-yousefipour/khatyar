const { withGradleProperties } = require('@expo/config-plugins');

// فقط معماری‌هایی که واقعاً در APKها منتشر می‌شوند را کامپایل کن. x86/x86_64
// فقط برای شبیه‌ساز هستند و در withAbiSplits.js اصلاً شامل خروجی نیستند، پس
// کامپایل کردن‌شان فقط فشار حافظه/زمان بیلد را (تقریباً دوبرابر) هدر می‌دهد —
// همان چیزی که باعث می‌شد clang++.exe روی ویندوز بدون پیام خطا kill شود.
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
  return withGradleProperties(config, (cfg) => {
    const key = 'org.gradle.workers.max';
    const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
    if (!existing) {
      cfg.modResults.push({ type: 'property', key, value: '2' });
    }
    return cfg;
  });
};
