const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;
    const signing = `\n// Myket release signing (values come from environment; no secret is committed)\ndef MYKET_STORE_FILE = System.getenv("MYKET_STORE_FILE")\ndef MYKET_STORE_PASSWORD = System.getenv("MYKET_STORE_PASSWORD")\ndef MYKET_KEY_ALIAS = System.getenv("MYKET_KEY_ALIAS")\ndef MYKET_KEY_PASSWORD = System.getenv("MYKET_KEY_PASSWORD")\n`;
    if (!src.includes('MYKET_STORE_FILE')) src = signing + src;

    // بعضی نسخه‌های Expo فاصله/انتهای خط را کمی متفاوت تولید می‌کنند؛ برای
    // جلوگیری از شکست بی‌صدا (که یعنی خروجی نهایی با کلید debug امضا می‌شود
    // بدون هیچ هشداری)، الگو با فاصله/CRLF اختیاری و به‌صورت چندخطی می‌گردد.
    const androidBlockRe = /android\s*\{/;
    const releaseBlockRe = /release\s*\{\s*\r?\n/;

    if (!androidBlockRe.test(src)) {
      throw new Error('[withReleaseSigning] بلاک "android {" در app/build.gradle پیدا نشد؛ ساختار فایل تغییر کرده و این افزونه باید به‌روزرسانی شود.');
    }
    if (!src.includes('signingConfigs {\n        myketRelease')) {
      src = src.replace(androidBlockRe, (m) => `${m}\n    signingConfigs {\n        myketRelease {\n            if (MYKET_STORE_FILE) {\n                storeFile file(MYKET_STORE_FILE)\n                storePassword MYKET_STORE_PASSWORD\n                keyAlias MYKET_KEY_ALIAS\n                keyPassword MYKET_KEY_PASSWORD\n            }\n        }\n    }`);
    }
    if (!releaseBlockRe.test(src)) {
      throw new Error('[withReleaseSigning] بلاک "release {" در app/build.gradle پیدا نشد؛ ساختار فایل تغییر کرده و این افزونه باید به‌روزرسانی شود. بدون این، خروجی نهایی با کلید debug امضا می‌شود که برای انتشار در مایکت قابل قبول نیست.');
    }
    if (!src.includes('if (MYKET_STORE_FILE) signingConfig signingConfigs.myketRelease')) {
      src = src.replace(releaseBlockRe, (m) => `${m}            if (MYKET_STORE_FILE) signingConfig signingConfigs.myketRelease\n`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
