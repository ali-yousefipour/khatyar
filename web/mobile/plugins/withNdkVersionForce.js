const { withAppBuildGradle, withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');

// نسخهٔ NDK تثبیت‌شده برای این پروژه — دقیقاً همان نسخه‌ای که روی سیستم شما
// نصب است (C:\Users\Administrator\AppData\Local\Android\Sdk\ndk\27.3.13750724).
// این مقدار در یک نقطه تعریف شده تا اگر بعداً NDK دیگری نصب کردید، فقط همین‌جا
// (یا ANDROID_NDK_VERSION در .env) را عوض کنید، نه چند جای پراکنده.
const NDK_VERSION = '27.3.13750724';
const OLD_VERSIONS = ['27.1.12297006', '27.0.12077973'];

// این افزونه، برخلاف تنظیم ndkVersion در expo-build-properties (که ممکن است
// در صورت استفادهٔ مستقیم از پوشهٔ android/ باقی‌مانده از یک prebuild قدیمی،
// اعمال نشده به نظر برسد)، مستقیماً و صریح داخل خودِ فایل‌های build.gradle
// تولیدشده می‌نویسد — به‌عنوان یک لایهٔ اطمینان اضافه، نه جایگزین.
module.exports = function withNdkVersionForce(config) {
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;

    // هر نسخهٔ قدیمی احتمالی را حذف/جایگزین کن (چه در ndkVersion "..."، چه در کامنت‌ها)
    for (const old of OLD_VERSIONS) {
      src = src.split(old).join(NDK_VERSION);
    }

    const ndkLineRe = /ndkVersion\s+["'][^"']*["']/;
    if (ndkLineRe.test(src)) {
      src = src.replace(ndkLineRe, `ndkVersion "${NDK_VERSION}"`);
    } else {
      // اگر expo-build-properties به هر دلیلی این خط را ننوشته باشد، خودمان
      // مستقیم داخل بلاک android { اضافه می‌کنیم.
      const androidBlockRe = /android\s*\{/;
      if (!androidBlockRe.test(src)) {
        throw new Error('[withNdkVersionForce] بلاک "android {" در app/build.gradle پیدا نشد؛ ساختار فایل تغییر کرده است.');
      }
      src = src.replace(androidBlockRe, (m) => `${m}\n    ndkVersion "${NDK_VERSION}"`);
    }

    if (!src.includes(`ndkVersion "${NDK_VERSION}"`)) {
      throw new Error(`[withNdkVersionForce] اعمال نسخهٔ NDK (${NDK_VERSION}) در app/build.gradle ناموفق بود.`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });

  // اگر رد پایی از نسخه‌های قدیمی در build.gradle سطح پروژه هم باشد (مثلاً در
  // کامنت‌ها)، همان‌جا هم پاک می‌شود تا هیچ اثری از نسخه‌های نادرست نماند.
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;
    for (const old of OLD_VERSIONS) src = src.split(old).join(NDK_VERSION);
    cfg.modResults.contents = src;
    return cfg;
  });

  // یک خط مستند/قابل‌بررسی هم در gradle.properties می‌گذاریم (Gradle به‌خودی‌خود
  // این را نمی‌خواند، اما برای هماهنگی بصری و ابزارهای بررسی نسخه مفید است).
  config = withGradleProperties(config, (cfg) => {
    const KEY = 'KHATYAR_NDK_VERSION_PINNED';
    const withoutOld = cfg.modResults.filter((it) => !(it.type === 'property' && OLD_VERSIONS.includes(it.value)));
    cfg.modResults = withoutOld;
    const existing = cfg.modResults.find((it) => it.type === 'property' && it.key === KEY);
    if (existing) existing.value = NDK_VERSION;
    else cfg.modResults.push({ type: 'property', key: KEY, value: NDK_VERSION });
    return cfg;
  });

  return config;
};

module.exports.NDK_VERSION = NDK_VERSION;
