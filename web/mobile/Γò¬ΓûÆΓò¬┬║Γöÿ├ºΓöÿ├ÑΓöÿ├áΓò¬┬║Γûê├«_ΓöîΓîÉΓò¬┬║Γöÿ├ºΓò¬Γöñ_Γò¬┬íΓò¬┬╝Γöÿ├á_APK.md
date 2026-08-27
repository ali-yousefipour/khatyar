# راهنمای کاهش حجم فایل APK

این تنظیمات در پروژه اعمال شده‌اند؛ کافی است یک‌بار دوباره prebuild و build کنید.

## چه چیزهایی اعمال شد؟

۱) **تفکیک معماری CPU (ABI splits)** — پلاگین `plugins/withAbiSplits.js`
به‌جای یک APK یونیورسال سنگین (شامل کتابخانه‌های همهٔ معماری‌ها)، برای هر معماری یک APK جدا ساخته می‌شود:
- `app-arm64-v8a-release.apk`  ← برای اکثر گوشی‌های امروزی (پیشنهادی)
- `app-armeabi-v7a-release.apk` ← گوشی‌های قدیمی‌تر
- `app-universal-release.apk`   ← همه‌کاره (سنگین‌تر)

به‌طور معمول حجم هر APIِ تک‌معماری حدود **۴۰ تا ۵۰ درصد** کوچک‌تر از یونیورسال است.

۲) **Proguard/R8 + فشرده‌سازی منابع** — در `app.config.js`
کدها و منابع بلااستفاده در نسخهٔ release حذف می‌شوند:
```
enableProguardInReleaseBuilds: true
enableShrinkResourcesInReleaseBuilds: true
```

۳) **Hermes** (موتور جاوااسکریپت سبک) در Expo SDK 51 به‌صورت پیش‌فرض فعال است و از JSC کوچک‌تر است.

## مراحل ساخت APK سبک

```bash
cd mobile
npm install
npx expo prebuild --clean
cd android
gradlew assembleRelease
```

خروجی‌ها در این مسیر ساخته می‌شوند:
```
mobile/android/app/build/outputs/apk/release/
```
فایل `app-arm64-v8a-release.apk` را برای انتشار/به‌روزرسانی توزیع کنید (سبک‌ترین گزینهٔ سازگار با اکثر دستگاه‌ها).

## نکات بیشتر برای کاهش حجم (اختیاری)

- **حذف معماری‌های اضافی**: اگر مطمئن هستید همهٔ کاربران گوشی arm64 دارند، در `plugins/withAbiSplits.js` فقط `"arm64-v8a"` را نگه دارید تا فقط یک APK کوچک ساخته شود.
- **بهینه‌سازی تصاویر assets**: تصاویر داخل `assets/` (icon، splash، …) را فشرده کنید (مثلاً با ابزارهای PNG optimizer).
- **حذف فونت‌های اضافه**: اگر چند وزن فونت Vazirmatn دارید و همه را استفاده نمی‌کنید، موارد بلااستفاده را حذف کنید.
- **بازبینی وابستگی‌ها**: پکیج‌هایی که دیگر استفاده نمی‌شوند را از `package.json` حذف کنید.
- **برای انتشار در گوگل‌پلی**: از خروجی `app-bundle` (.aab) استفاده کنید (در `eas.json` پروفایل production همین است) تا گوگل‌پلی خودش برای هر دستگاه نسخهٔ بهینه بسازد.

## نسخه‌دهی به‌روزرسانی‌ها
پلاگین `withAbiSplits` برای هر ABI یک `versionCode` منحصربه‌فرد می‌سازد (پایه×۱۰ + کد ABI). هنگام انتشار به‌روزرسانی، `ANDROID_VERSION_CODE` و `ANDROID_VERSION_NAME` را در فایل `.env` افزایش دهید.
