// تنظیمات build اپ. مقادیر پیش‌فرض از .env خوانده می‌شوند.
// قبل از ساخت APK، .env را از .env.example بسازید و آدرس سرور را وارد کنید.
try { require('dotenv').config(); } catch (e) {}

// بررسی نصب بودن expo-local-authentication (برای قفل با اثر انگشت).
// اگر نصب نباشد، plugin اضافه نمی‌شود تا prebuild خطا ندهد (قفل با رمز/پترن همچنان کار می‌کند).
let hasLocalAuth = false;
try { require.resolve('expo-local-authentication'); hasLocalAuth = true; } catch (e) { hasLocalAuth = false; }

module.exports = ({ config }) => ({
  ...config,
  name: process.env.APP_NAME || 'خطیار',
  slug: 'khatyar-mobile',
  version: process.env.ANDROID_VERSION_NAME || '1.3.65',
  orientation: 'portrait',
  newArchEnabled: true,
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  // نکته: کلید قدیمیِ top-level به نام splash از Expo SDK 52 به بعد نادیده گرفته می‌شود؛
  // بدون پلاگین رسمی expo-splash-screen، منبع بومیِ اسپلش هنگام prebuild به‌درستی ساخته
  // نمی‌شود و اندروید یک صفحهٔ پیش‌فرض/آیکون ساده (نه اسپلش برندشدهٔ ما) نشان می‌دهد؛ همین
  // چیزی است که به‌شکل «ابتدا لوگوی دیفالت اکسپو، سپس اسپلش خودِ برنامه» دیده می‌شد. با این
  // پلاگین، همان تصویر/رنگ قبلی به‌روش صحیح و مستند اعمال می‌شود.
  android: {
    package: process.env.ANDROID_PACKAGE || 'ir.mashhad.taxicontrol',
    versionCode: Number(process.env.ANDROID_VERSION_CODE || 10365),
    // با «resize»، سیستم‌عامل اندروید صفحه را هنگام باز شدن کیبورد جمع می‌کند (adjustResize)
    // تا تکست‌باکس‌ها زیر کیبورد پنهان نشوند؛ این تنظیم مکمل KeyboardAvoidingView در App.js است.
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0d7a5f',
    },
    permissions: [
      'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION',
      'CAMERA', 'INTERNET', 'ACCESS_NETWORK_STATE', 'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE',
      'WAKE_LOCK', 'REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    ],
  },
  plugins: [
    ['expo-splash-screen', {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0d7a5f',
      android: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0d7a5f',
      },
    }],
    ['expo-secure-store', { configureAndroidBackup: false }],
    ...(hasLocalAuth ? [['expo-local-authentication', { faceIDPermission: 'برای باز کردن برنامه از احراز هویت بیومتریک استفاده می‌شود.' }]] : []),
    ['expo-location', {
      isAndroidBackgroundLocationEnabled: true,
      locationAlwaysAndWhenInUsePermission: 'برای ثبت تردد، برنامه به موقعیت در پس‌زمینه نیاز دارد.',
      // پیکربندی سرویس foreground برای ردیابی موقعیت پس‌زمینه (لازم برای اندروید ۱۴+
      // و بهبود پایداری در برابر کشته‌شدن توسط مدیریت‌کنندهٔ باتری سیستم‌عامل).
      foregroundService: {
        notificationTitle: 'خطیار',
        notificationBody: 'نرم‌افزار خطیار فعال و به سرور متصل است',
        notificationColor: '#0d7a5f',
      },
    }],
    'expo-camera',
    ['expo-notifications', {
      icon: './assets/notification-icon.png',
      color: '#0d7a5f',
      sounds: [
        './assets/sounds/presence_validation_alert.mp3',
        './assets/sounds/notification_new.mp3',
        './assets/sounds/message_new.mp3',
        './assets/sounds/report_received.mp3',
        './assets/sounds/official_presence_registered.mp3',
        './assets/sounds/report_sent_success.mp3',
        './assets/sounds/presence_success.mp3',
        './assets/sounds/presence_selfie.mp3',
        './assets/sounds/presence_station_photo.mp3',
      ],
    }],
    ['expo-build-properties', {
      android: {
        // نکته سازگاری نسخهٔ اندروید: Expo SDK 57 / React Native 0.86 (که این پروژه از آن‌ها
        // استفاده می‌کند) رسماً از اندروید ۷ به بالا (API 24) پشتیبانی می‌کند. اندروید ۵ و ۶
        // (API 21-23) با این نسخه از React Native/معماری جدید و Reanimated 4 قابل‌پشتیبانی
        // نیستند — این یک محدودیت سطح فریم‌ورک است، نه یک باگ قابل رفع در همین پروژه؛ تنها
        // راه پشتیبانی از اندروید ۵/۶ برگرداندن کل پشته (React Native/Expo/Reanimated) به
        // نسخه‌های بسیار قدیمی‌تر است. minSdkVersion قبلاً ۲۶ (اندروید ۸) بود که یک نسخه
        // بالاتر از حداقل واقعیِ قابل‌پشتیبانی بود؛ به ۲۴ کاهش یافت تا اندروید ۷ هم پوشش داده شود.
        minSdkVersion: 24,
        compileSdkVersion: 36,
        targetSdkVersion: 36,
        buildToolsVersion: '36.0.0',
        // نکته: ProGuard/R8 غیرفعال است چون بدون keep-rule دقیق برای Reanimated/Worklets
        // و New Architecture (که هر دو شدیداً از reflection استفاده می‌کنند)، R8 کلاس‌های
        // لازم را حذف/تغییرنام می‌دهد و برنامه همان لحظهٔ باز شدن (قبل از نمایش اسپلش) کرش
        // می‌کند. اگر بعداً خواستید APK کوچک‌تر شود، این را همراه با قوانین withProguardKeep
        // (که در پلاگین‌ها اضافه شد) با احتیاط دوباره فعال و کامل تست کنید.
        enableProguardInReleaseBuilds: false,
        enableShrinkResourcesInReleaseBuilds: false,
        // استفاده از NDKِ نصب‌شده روی سیستم تا نیازی به دانلود از گوگل نباشد.
        // مقدار را با نسخهٔ واقعی موجود در پوشهٔ ...\Android\Sdk\ndk هماهنگ کنید (در .env).
        ndkVersion: process.env.ANDROID_NDK_VERSION || '27.3.13750724',
      },
    }],
    './plugins/withMyketMirror',
    './plugins/withUtf8GradleEncoding',
    './plugins/withReleaseHardening',
    './plugins/withLocationJobCrashGuard',
    './plugins/withProguardKeep',
    './plugins/withReactNativeArchitectures',
    './plugins/withAbiSplits',
  ],
  extra: {
    defaultApiBase: process.env.API_BASE || 'https://app.yousefipour.ir/api',
    enableBgTracking: (process.env.ENABLE_BG_TRACKING || 'true') === 'true',
    app_version: process.env.ANDROID_VERSION_NAME || '1.3.65',
    eas: { projectId: process.env.EAS_PROJECT_ID || '' },
  },
});
