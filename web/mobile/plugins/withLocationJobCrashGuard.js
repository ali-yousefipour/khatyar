const { withMainApplication } = require('expo/config-plugins');

// چرا این پلاگین لازم شد:
// با گرفتن لاگ کرش واقعی از یک گوشی قدیمی (اندروید ۷ سامسونگ)، این خطا پیدا شد:
//   java.lang.IllegalArgumentException: You're trying to build a job with no constraints, this is not allowed.
//     at android.app.job.JobInfo$Builder.build
//     at expo.modules.taskManager.TaskManagerUtils.createJobInfo
//     at expo.modules.location.taskConsumers.LocationTaskConsumer.reportLocationsImmediately
// این یک باگ شناخته‌شده در کتابخانهٔ expo-location/expo-task-manager (کد کامپایل‌شدهٔ
// شخص ثالث) است که روی برخی گوشی‌ها/نسخه‌های اندروید (به‌خصوص سامسونگ‌های قدیمی‌تر با
// محدودیت سخت‌گیرانه‌تر JobScheduler) رخ می‌دهد. چون این کد داخل یک AAR کامپایل‌شده است،
// نمی‌توان مستقیماً و بدون فورک‌کردن کتابخانه آن را پچ کرد. تنظیمات سمت اپ (حذف
// deferredUpdatesInterval در location.js) این مسیر را برای حالت عادی برطرف می‌کند؛ این
// پلاگین هم به‌عنوان لایهٔ ایمنیِ دوم عمل می‌کند: فقط همین یک خطای مشخصِ شناخته‌شده و
// بی‌خطر (نبود گزارش موقعیت پس‌زمینه، نه خرابی داده) را می‌گیرد و برنامه را زنده نگه
// می‌دارد؛ هر کرش دیگری کاملاً طبق روال عادی رخ می‌دهد و گزارش می‌شود (این یک catch-all
// عمومی نیست تا کرش‌های واقعی و مهم پنهان نشوند).
module.exports = function withLocationJobCrashGuard(config) {
  return withMainApplication(config, (cfg) => {
    const lang = cfg.modResults.language;
    if (lang !== 'kt' && lang !== 'java') return cfg;
    let src = cfg.modResults.contents;
    if (src.includes('__taxi_location_job_crash_guard__')) return cfg; // قبلاً اضافه شده

    if (lang === 'kt') {
      const guard = `
    // __taxi_location_job_crash_guard__
    val __previousUncaughtHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      val isKnownLocationJobBug = throwable is IllegalArgumentException &&
        (throwable.message?.contains("no constraints") == true) &&
        throwable.stackTrace.any { it.className.contains("expo.modules.taskManager") || it.className.contains("expo.modules.location") }
      if (isKnownLocationJobBug) {
        android.util.Log.e("TaxiApp", "Ignored known expo-location background job scheduling bug (device JobScheduler restriction).", throwable)
      } else {
        __previousUncaughtHandler?.uncaughtException(thread, throwable)
      }
    }
`;
      if (src.includes('override fun onCreate()')) {
        src = src.replace(
          /override fun onCreate\(\)\s*\{/,
          (m) => `${m}\n${guard}`
        );
      }
    } else {
      const guard = `
    // __taxi_location_job_crash_guard__
    final Thread.UncaughtExceptionHandler __previousUncaughtHandler = Thread.getDefaultUncaughtExceptionHandler();
    Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
      @Override
      public void uncaughtException(Thread thread, Throwable throwable) {
        boolean isKnownLocationJobBug = false;
        if (throwable instanceof IllegalArgumentException && throwable.getMessage() != null && throwable.getMessage().contains("no constraints")) {
          for (StackTraceElement el : throwable.getStackTrace()) {
            if (el.getClassName().contains("expo.modules.taskManager") || el.getClassName().contains("expo.modules.location")) {
              isKnownLocationJobBug = true;
              break;
            }
          }
        }
        if (isKnownLocationJobBug) {
          android.util.Log.e("TaxiApp", "Ignored known expo-location background job scheduling bug (device JobScheduler restriction).", throwable);
        } else if (__previousUncaughtHandler != null) {
          __previousUncaughtHandler.uncaughtException(thread, throwable);
        }
      }
    });
`;
      if (src.includes('public void onCreate()')) {
        src = src.replace(
          /public void onCreate\(\)\s*\{/,
          (m) => `${m}\n${guard}`
        );
      }
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
