# انتشار APK خطیار و لینک دانلود ثابت

## نسخه 1.5.3

برای فایل APK، نام Asset همیشه باید:

`khatyar.apk`

باشد.

### لینک ثابت برای استفاده در سایت و برنامه

`https://github.com/ali-yousefipour/khatyar/releases/latest/download/khatyar.apk`

این لینک به آخرین Release غیر Draft و غیر Prerelease اشاره می‌کند؛ بنابراین در نسخه‌های بعدی لازم نیست لینک داخل برنامه یا سایت تغییر کند.

### لینک نسخه مشخص

برای نسخه 1.5.3:

`https://github.com/ali-yousefipour/khatyar/releases/download/v1.5.3/khatyar.apk`

### انتشار

Workflow زیر برای انتشار خودکار آماده شده است:

`.github/workflows/publish-android-release.yml`

از GitHub Actions می‌توان آن را به‌صورت دستی اجرا کرد و نسخه را وارد کرد. Workflow:

1. وابستگی‌های موبایل را با `npm ci` نصب می‌کند.
2. پروژه Android را با Expo Prebuild بازسازی می‌کند.
3. APK Release را با Gradle می‌سازد.
4. فایل را با نام ثابت `khatyar.apk` آماده می‌کند.
5. SHA-256 فایل را در `khatyar.apk.sha256` منتشر می‌کند.
6. Release با Tag به شکل `v1.5.3` ایجاد یا در صورت وجود به‌روزرسانی می‌شود.
7. لینک ثابت Latest برای استفاده عمومی حفظ می‌شود.

### API

مسیر عمومی `/api/app/version` نیز در صورت تنظیم نبودن `app_apk_url`، به‌صورت خودکار از لینک ثابت Latest استفاده می‌کند.

همچنین `/api/health` اطلاعات `download_url`، `release_url` و نام Asset را در اطلاعات Release نسخه 1.5.3 برمی‌گرداند.

> نکته: ایجاد واقعی Release و قرار گرفتن APK در آن نیازمند اجرای Workflow و ساخت موفق APK است. تا قبل از آن، لینک ثابت از نظر ساختار آماده است ولی فایل APK روی Release وجود ندارد.
