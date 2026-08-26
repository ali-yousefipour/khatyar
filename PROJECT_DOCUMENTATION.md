# مستند مرجع یکپارچه سامانه خطیار

> **مرجع اصلی و زنده مستندات پروژه**
>
> این فایل مرجع وضعیت فعلی، معماری، امکانات، نسخه‌ها، الزامات اجرا و تصمیم‌های فنی سامانه خطیار است. از این پس هر تغییر واقعی در Android، Web App، Site/Admin، Backend یا Database باید همزمان در این فایل ثبت و وضعیت آن بروزرسانی شود.
>
> کارهای باقی‌مانده و در دست اقدام در `PROJECT_REMAINING_WORK.md` نگهداری می‌شوند.

## 1. هویت و معماری فعلی

سامانه «خطیار» سامانه مدیریت و کنترل خطوط تاکسیرانی است و سه سطح اصلی دارد:

- **Android / Mobile:** React Native + Expo، واقع در `mobile/`
- **Web App / PWA:** وب‌اپ موبایلی واقع در `php/app/app.html` و در دسترس از `/app`
- **Site / Admin:** پنل مدیریتی PHP واقع در `php/app/panel.html`
- **Backend عملیاتی:** PHP + MySQL/MariaDB در `php/`

### مسیرهای عملیاتی

- `https://app.yousefipour.ir/` — پنل اصلی
- `https://app.yousefipour.ir/app` — وب‌اپ
- `https://app.yousefipour.ir/api/...` — API
- `https://app.yousefipour.ir/health` — Health Check

Document Root هاست باید با ساختار فعلی استقرار، روی `php/app` تنظیم باشد.

## 2. احراز هویت و امنیت

- ورود با نام کاربری و رمز عبور
- JWT Access/Refresh Token
- اتصال نشست به دستگاه
- `device_id` و `device_type`
- کنترل VPN، Developer Options، Mock Location و GPS در سمت Android و ارسال وضعیت به سرور
- کنترل سطح دسترسی مبتنی بر نقش و level
- نشست قابل ابطال
- حالت تعمیرات
- کنترل فعال/غیرفعال بودن کاربر
- Headerهای امنیتی HTTP و جلوگیری از Cache شدن API
- ثبت گزارش خطا و Crash Reporter در Android

## 3. امکانات اصلی Android و Web

### داشبورد و منو

- داشبورد نقش‌محور برای خلاصه وضعیت و KPI
- منوی کناری/Navigation مطابق نقش کاربر
- نمایش وضعیت دستگاه، GPS، VPN، باتری و اتصال
- اعلان‌ها، پیام‌ها و پیام‌های داخلی
- پشتیبانی از حالت آفلاین و صف عملیات قابل‌صف‌بندی فقط برای عملیات مجاز

### حضور و شیفت

- ثبت حضور رسمی
- کنترل بازه شیفت
- Self Check-in و کنترل موقعیت
- ثبت تصویر حضور
- آلارم/صدای هشدار برای اعتبارسنجی حضور در سناریوهای تعریف‌شده
- گزارش حضور و عملکرد
- پشتیبانی از شیفت‌های مختلف

### خطوط تاکسیرانی

- فهرست و جستجوی خطوط
- تخصیص خط به کاربر از طریق `user_lines`
- کنترل دسترسی کاربر به خطوط
- نمایش وضعیت خط و داده‌های عملیاتی
- اطلاعات ایستگاه/موقعیت خط

### ثبت موقعیت و تصویر خطوط

این قابلیت برای Android، Web App و Site/Admin در ساختار پروژه تعریف و پیاده‌سازی شده است.

جریان ثبت:

1. کاربر دارای مجوز، خط را جستجو و انتخاب می‌کند.
2. GPS گوشی latitude، longitude و accuracy را دریافت می‌کند.
3. موقعیت دقیق روی نقشه نمایش داده می‌شود.
4. تصویر محل خط و تصویر تابلو ایستگاه با دوربین ثبت می‌شود.
5. رکورد در `line_station_locations` ذخیره می‌شود.
6. مختصات و آخرین تصاویر در اطلاعات خط بروزرسانی می‌شوند.

مجوزها بر اساس نقش:

- `can_capture` — ثبت
- `can_view` — مشاهده و تاریخچه
- `can_manage` — مدیریت مجوزها

Migration مرجع: `php/migrations/2026_08_26_line_location.sql`

API مستقل:

- `/line-location-api.php?op=permission`
- `/line-location-api.php?op=lines`
- `/line-location-api.php?op=capture`
- `/line-location-api.php?op=history&line_id=...`
- `/line-location-api.php?op=roles`
- `/line-location-api.php?op=save-role`

### برنامه بازدید و پوشش خطوط

- برنامه روزانه بازدید
- شروع و پایان بازدید با GPS و کنترل accuracy
- کنترل قرار داشتن کاربر در محدوده خط/ایستگاه
- کنترل خطوط تخصیص‌یافته
- تشخیص/تنظیم حالت بازرس مقیم، گشت خودرویی، گشت موتوری، ناظر خط، سربازرس و نیروی اداری
- ثبت تصویر مستقیم دوربین
- فشرده‌سازی تصویر بر اساس تنظیمات سامانه
- ثبت Timeline کامل بازدید
- محاسبه پوشش و اعتبار بازدید
- اتصال حضور، چک‌لیست و تذکر به همان بازدید و خط
- امتیازدهی روزانه نیروهای زیرمجموعه
- گزارش مدیریتی روزانه و بازه‌ای

APIهای اصلی:

- `GET /api/my/visit-program`
- `GET /api/line-visits/line/{line_id}/snapshot`
- `POST /api/line-visits`
- `GET /api/my/line-visits`
- `GET /api/admin/line-visits`
- `POST /api/admin/inspector-mode/{user_id}`
- `POST /api/subordinate-daily-reviews`

## 4. امکانات Android اختصاصی

- کنترل Startup و Error Boundary
- App Lock
- Battery Guard / Battery Optimization
- GPS Guard
- Permission Guard
- Security Guard
- VPN Monitor
- Health Monitor
- Offline Banner و Offline Queue
- Crash Reporter
- Location tracking
- Periodic renewal
- Splash/Startup loading
- ثبت تصویر شخصی و تصاویر عملیاتی
- کنترل سازگاری Android قدیمی
- محافظت در برابر Crashهای مرتبط با Image Picker و Location Job

## 5. Web App

وب‌اپ در `php/app/app.html` قرار دارد و باید از نظر امکانات و ظاهر با Android همسان باشد.

اصول فعلی:

- RTL
- فارسی و اعداد فارسی در UIهای لازم
- Responsive و Mobile-first
- امکانات اصلی در Sidebar و نه در داشبورد
- داشبورد فقط برای خلاصه وضعیت و KPI
- دسترسی نقش‌محور
- استفاده از API واقعی به جای Mock در محیط عملیاتی
- پشتیبانی از GPS/Camera در مرورگرهای سازگار با Permissionهای مرورگر

## 6. Site / Admin

- مدیریت کاربران و نقش‌ها
- مدیریت دسترسی خطوط و Permissionها
- مدیریت ثبت موقعیت و تصویر خطوط
- مدیریت برنامه بازدید و پوشش خطوط
- گزارش‌های مدیریتی
- تنظیمات سامانه
- مدیریت داده‌ها و Migrationها

## 7. PHP / MySQL / MariaDB

- API اصلی در `php/lib/routes.php`
- Bootstrap API در `php/app/index.php`
- اتصال DB در `php/lib/Db.php`
- JWT در `php/lib/Jwt.php`
- HTTP helper در `php/lib/Http.php`
- Media در `php/lib/Media.php`

تمام Migrationهای جدید باید:

- با MySQL/MariaDB سازگار باشند.
- Idempotent باشند.
- قابل اجرای مجدد از طریق phpMyAdmin باشند.
- از `JSONB`، PostgreSQL cast، `TIMESTAMPTZ` و syntax اختصاصی PostgreSQL استفاده نکنند.
- قبل از تغییر جداول واقعی با ساختار موجود تطبیق داده شوند.

## 8. ساخت Android

نسخه‌های موجود پروژه شامل Expo SDK 57 و ابزارهای بومی متناظر هستند. نسخه‌های Gradle، React Native، Expo، NDK و پلاگین‌ها نباید بدون بررسی سازگاری تغییر کنند.

ساخت Myket با اسکریپت موجود:

```powershell
cd mobile
powershell -ExecutionPolicy Bypass -File .\build-myket-release.ps1
```

## 9. سوابق و مستندات

فایل‌های نسخه‌ای و Build Fix قدیمی سابقه توسعه هستند. برای وضعیت فعلی از `PROJECT_DOCUMENTATION.md` و `PROJECT_REMAINING_WORK.md` استفاده شود. `CHANGELOG.md` خلاصه تغییرات نسخه‌ای/تاریخی را نگهداری می‌کند.

## 10. سیاست ثبت تغییرات از این پس

هر تغییر جدید باید در همان Commit یا مجموعه Commit مرتبط، در صورت ارتباط این موارد را نیز بروزرسانی کند:

1. `PROJECT_DOCUMENTATION.md` — وضعیت واقعی و فعلی قابلیت.
2. `PROJECT_REMAINING_WORK.md` — انتقال مورد بین باقی‌مانده، در دست اقدام و انجام‌شده.
3. `CHANGELOG.md` — خلاصه تغییر مهم/نسخه‌ای.
4. مستند تخصصی همان قابلیت در صورت وجود.

**قانون مهم:** قابلیت یا اصلاحی که صرفاً در مستندات نوشته شده ولی در کد یا تست قابل تأیید نیست، نباید «انجام‌شده» علامت‌گذاری شود.

## 11. آخرین وضعیت

آخرین تغییر مستنداتی: 2026-08-26

- مرجع واحد مستندات ایجاد و تثبیت شد.
- فایل پیگیری کارهای باقی‌مانده ایجاد شد.
- سیاست بروزرسانی همزمان مستندات با تغییرات پروژه تثبیت شد.
- موارد فنی نیازمند تست نهایی در `PROJECT_REMAINING_WORK.md` ثبت شده‌اند.
