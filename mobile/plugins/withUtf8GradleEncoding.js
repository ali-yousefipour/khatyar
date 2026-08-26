const { withGradleProperties } = require('expo/config-plugins');

// علت اصلی خرابی متن فارسی (مثلاً نام برنامه) در فایل‌های تولیدشدهٔ Gradle
// روی ویندوز: جاوا ۱۷ (بر خلاف جاوا ۱۸ به بعد که طبق JEP 400 پیش‌فرض را
// UTF-8 کرد) هنوز از codepage پیش‌فرض ویندوز برای خواندن/نوشتن فایل‌های متنی
// استفاده می‌کند. اگر این codepage با UTF-8 یکی نباشد (حالت رایج در ویندوز)،
// هر متن فارسی که Gradle/JVM در طول build بخواند یا بنویسد (از جمله
// settings.gradle، build.gradle، یا منابع دیگر) می‌تواند به‌صورت بایت‌های
// نامفهوم خراب شود — دقیقاً همان چیزی که در rootProject.name دیده شد و
// می‌تواند باعث خطای parse در Gradle و شکست کامل build شود.
// این افزونه با افزودن -Dfile.encoding=UTF-8 (و sun.jnu.encoding برای
// مسیرهای فایل) به org.gradle.jvmargs، این مشکل را در ریشه (نه فقط برای
// یک خط خاص) برطرف می‌کند.
module.exports = function withUtf8GradleEncoding(config) {
  return withGradleProperties(config, (cfg) => {
    const KEY = 'org.gradle.jvmargs';
    const EXTRA = '-Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8';
    const existing = cfg.modResults.find((it) => it.type === 'property' && it.key === KEY);
    if (existing) {
      if (!existing.value.includes('file.encoding=UTF-8')) {
        existing.value = `${existing.value} ${EXTRA}`.trim();
      }
    } else {
      cfg.modResults.push({ type: 'property', key: KEY, value: `-Xmx2048m -XX:MaxMetaspaceSize=512m ${EXTRA}` });
    }
    return cfg;
  });
};
