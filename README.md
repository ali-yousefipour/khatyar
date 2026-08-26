# سامانه خطیار — مدیریت و کنترل خطوط تاکسیرانی

این مخزن نسخه عملیاتی سامانه خطیار را شامل می‌شود: اپلیکیشن Android، وب‌اپ/PWA و پنل Site/Admin با Backend PHP و MySQL/MariaDB.

## سند مرجع پروژه

**تنها مرجع یکپارچه وضعیت فعلی، امکانات، معماری، نسخه‌ها، الزامات Build/Deploy و کارهای باقی‌مانده:**

`PROJECT_DOCUMENTATION.md`

فایل‌های قدیمی `PROJECT_STATUS_*`، `V*_*` و یادداشت‌های Build تاریخچه توسعه هستند و در صورت تعارض، سند مرجع و کد فعلی پروژه اولویت دارند.

## اجزای اصلی

- `mobile/` — Android با React Native / Expo
- `php/app/` — Web App، پنل و API entry point
- `php/lib/` — کتابخانه‌های Backend و Router
- `php/db/` و `php/migrations/` — ساختار و ارتقای MySQL/MariaDB
- `docs/` — مستندات تخصصی قابلیت‌ها
- `release/myket/` — فایل‌های آماده انتشار Myket

## آدرس‌های عملیاتی

- سایت/پنل: `https://app.yousefipour.ir/`
- وب‌اپ: `https://app.yousefipour.ir/app`
- API: `https://app.yousefipour.ir/api/...`
- Health: `https://app.yousefipour.ir/health`

Document Root هاست باید روی `php/app` باشد.

## امکانات کلیدی

- ورود امن با JWT، Refresh Token و Device Binding
- کنترل نقش و سطح دسترسی
- حضور و شیفت
- GPS، کنترل موقعیت و پایش دستگاه
- مدیریت خطوط و تخصیص خط
- برنامه بازدید و پوشش خطوط
- ثبت موقعیت و تصویر خطوط و ایستگاه‌ها
- مدیریت رانندگان و خودروها
- تذکر، چک‌لیست و فرم‌ها
- گزارش‌ها، داشبورد و Audit
- پیام‌ها، Push، SMS و Messenger/Bale در صورت فعال بودن سرویس
- حالت آفلاین و همگام‌سازی برای عملیات مجاز
- Web App واکنش‌گرا و RTL با هدف همسانی با Android

## ثبت موقعیت و تصویر خطوط

قابلیت «ثبت موقعیت و تصویر خطوط» در Android، Web App و Site/Admin فعال است. کاربر دارای مجوز، خط را انتخاب می‌کند، GPS را دریافت می‌کند، موقعیت را روی نقشه می‌بیند و تصاویر محل خط و تابلو ایستگاه را ثبت می‌کند. جزئیات API، Permission و Migration در `docs/LINE_LOCATION_CAPTURE.md` و سند مرجع پروژه آمده است.

## Build Android

راهنمای اصلی Build و وضعیت سازگاری Android در `PROJECT_DOCUMENTATION.md` و `mobile/README.md` قرار دارد.

برای Myket، اسکریپت موجود در `mobile/build-myket-release.ps1` استفاده می‌شود.

## اصول توسعه

- Migrationها باید MySQL/MariaDB-safe و idempotent باشند.
- از syntax اختصاصی PostgreSQL مانند JSONB، `::jsonb` و TIMESTAMPTZ استفاده نشود.
- تغییر نسخه‌های Expo، React Native، Gradle، NDK یا پلاگین‌ها بدون ضرورت فنی انجام نشود.
- هر قابلیت مرتبط باید Android، Web App و Site/Admin را از نظر UI، Permission، API، DB، امنیت، خطا و Offline بررسی کند.

برای جزئیات کامل به `PROJECT_DOCUMENTATION.md` مراجعه کنید.

<!-- CI trigger: 2026-08-26 -->
