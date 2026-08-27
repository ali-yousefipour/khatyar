# Project Status — v1.0.16

## نسخه

- App: `1.0.16`
- Site: `104`
- Android versionCode: `10016`

## وضعیت این نسخه

داشبورد سلامت سامانه تکمیل شد و اکنون مدیر می‌تواند وضعیت فنی سامانه را از پنل مشاهده و چک سلامت را دستی یا از طریق کرون اجرا کند.

## بخش‌های پایش‌شده

- دیتابیس
- فضای ذخیره‌سازی و آپلود
- افزونه‌های PHP
- فضای دیسک
- صف پیام‌ها و Dead-letter
- همگام‌سازی آفلاین
- خطاهای اپ موبایل
- رد حضور و خطاهای GPS
- OCR و آموزش مدل پلاک
- ربات‌های پیام‌رسان بله، تلگرام و ایتا
- کرون‌جاب‌ها
- تاریخچه چک‌ها و رخدادهای سلامت

## مسیرهای جدید

- `GET /api/admin/system-health-dashboard`
- `POST /api/admin/system-health-dashboard/run`
- `GET /api/admin/system-health-incidents`
- `POST /api/admin/system-health-incidents/{id}/resolve`
- `GET /api/cron/system-health-probe?key=CRON_KEY`
- `POST /api/cron/system-health-probe`
- `GET /api/admin/phase7-part13/status`
- `GET /api/project-version-v7p13`

## باقی‌مانده

- تنظیم آستانه‌های هشدار روی سرور نهایی بعد از تست میدانی.
- اتصال مانیتور بیرونی Uptime روی دامنه نهایی.
- حذف کامل Babel مرورگر برای نسخه Production نهایی.
