# مستند مرجع یکپارچه سامانه خطیار

> **مرجع اصلی و زنده مستندات پروژه**
>
> این فایل مرجع وضعیت فعلی، معماری، امکانات، نسخه‌ها، الزامات اجرا و تصمیم‌های فنی سامانه خطیار است. هر تغییر واقعی در Android، Web App، Site/Admin، Backend یا Database باید همزمان در این فایل ثبت شود.
>
> کارهای باقی‌مانده و در دست اقدام در `PROJECT_REMAINING_WORK.md` نگهداری می‌شوند.

## 1. معماری فعلی

- **Android / Mobile:** React Native + Expo، در `mobile/`
- **Web App / PWA:** `php/app/app.html` و مسیر عملیاتی `/app`
- **Site / Admin:** پنل مدیریتی PHP در `php/app/panel.html`
- **Backend:** PHP + MySQL/MariaDB در `php/`

مسیرهای عملیاتی: `https://app.yousefipour.ir/`، `https://app.yousefipour.ir/app` و `https://app.yousefipour.ir/api/...`.

## 2. احراز هویت و امنیت

ورود با نام کاربری/رمز، JWT Access/Refresh، Device Binding، کنترل VPN/Developer Options/Mock Location/GPS، سطح دسترسی نقش و level، نشست قابل ابطال، Maintenance Guard، Headerهای امنیتی و Crash Reporter در Android فعال هستند.

## 3. منوی مرجع Android و Web

ترتیب و عنوان امکانات Web App از این مرحله با `DashboardScreen.js` در Android همسان‌سازی شده است. لایه `php/app/web-android-parity-v2.js` اکنون نسخه 3 دارد و به‌صورت runtime:

- ترتیب کارت‌های امکانات را مطابق Android تنظیم می‌کند.
- دسته‌بندی‌های «همه، میدانی، عملیات، پیام‌ها، شخصی، سایر» را ارائه می‌کند.
- ظاهر کارت‌ها، فاصله‌ها، RTL، typography و responsive behavior را هماهنگ می‌کند.
- روی تمام صفحات احراز‌شده، کنترل عمومی نمایش/اندازه تصاویر و اجزای فرم را اعمال می‌کند.
- هیچ مجوز Backend ایجاد نمی‌کند و Permission همچنان توسط API تعیین می‌شود.

## 4. امکانات اصلی

### حضور و شیفت

ثبت حضور، کنترل موقعیت و شیفت، تصویر حضور، گزارش حضور، کنترل‌های GPS/Permission و سناریوهای اعتبارسنجی حضور.

### خطوط تاکسیرانی

فهرست و جستجوی خطوط، تخصیص خط از طریق `user_lines`، کنترل دسترسی و اطلاعات عملیاتی خط.

### ثبت موقعیت و تصویر خطوط

این قابلیت در Android، Web App و Site/Admin تعریف شده و ورودی آن فقط بعد از احراز هویت و مجوز قابل نمایش است.

جریان ثبت:
1. انتخاب خط مجاز.
2. دریافت GPS با High Accuracy و ثبت latitude/longitude/accuracy.
3. نمایش موقعیت و اطلاعات دقت.
4. ثبت تصویر محل و تصویر تابلو با دوربین؛ انتخاب از Gallery در این جریان مجاز نیست.
5. ذخیره رکورد تاریخچه در `line_station_locations`.
6. بروزرسانی آخرین مختصات و تصاویر خط.

مجوزها: `can_capture`، `can_view` و `can_manage`.

APIها:
- `/line-location-api.php?op=permission`
- `/line-location-api.php?op=lines`
- `/line-location-api.php?op=capture`
- `/line-location-api.php?op=history&line_id=...`
- `/line-location-api.php?op=roles`
- `/line-location-api.php?op=save-role`

حداقل دقت فعلی برای ثبت ایستگاه: **۲۰ متر**؛ این مقدار باید در Backend نیز enforce و با تنظیمات واقعی محیط تولید تطبیق داده شود.

### بازدید و پوشش خطوط

برنامه بازدید، شروع/پایان با GPS، محدوده خط/ایستگاه، Timeline، پوشش، اتصال حضور/چک‌لیست/تذکر و گزارش مدیریتی.

## 5. Android

Screenهای فعلی شامل Login، Dashboard، Search، Driver، Vehicle، Debt، Checklist، Notice، Reports، SMS/Bot، Requests، Work Summary، Salary Slips، Check-in، Forms، Cultural، Welfare، Temporary Drivers، Notifications، Field Alerts، گزارش‌ها، Profile/Settings، Company Requests، Line Visit، Line Location، Daily Mission، Role Dashboard، Leaderboard و سایر Screenهای ثبت‌شده در `mobile/src/screens/` هستند.

تصاویر عملیاتی در جریان‌های دوربین‌محور باید JPEG باشند و از تنظیمات فشرده‌سازی پروژه استفاده کنند. Preview تصاویر سلفی/ایستگاه باید `contain` و محدود به فضای قابل مشاهده باشد تا تصویر نصفه نمایش داده نشود.

## 6. Web App

اصول اجباری:
- RTL و Mobile-first
- داشبورد برای خلاصه وضعیت و KPI؛ امکانات عملیاتی در ساختار منو/دسته‌بندی
- ظاهر و ترتیب امکانات مطابق Android
- API واقعی به‌جای Mock در Production
- GPS/Camera فقط با Permission مرورگر
- تصاویر عملیاتی بدون مسیر انتخاب Gallery
- پاسخ API باید JSON معتبر باشد و خطای HTML/متن خام نباید به‌عنوان پاسخ موفق تلقی شود.

## 7. Site / Admin

مدیریت کاربران، نقش‌ها، Permissionها، خطوط، ثبت موقعیت/تصویر، بازدید خطوط، گزارش‌های مدیریتی و تنظیمات سامانه. دسترسی `can_capture/can_view/can_manage` باید از همین لایه قابل تعریف باشد.

## 8. PHP / MySQL / MariaDB

Migrationها باید MySQL/MariaDB-compatible، idempotent و قابل اجرای مجدد با phpMyAdmin باشند و از syntax PostgreSQL مانند JSONB، castهای PostgreSQL و TIMESTAMPTZ استفاده نکنند.

## 9. ساخت Android

نسخه‌های Expo/React Native/Gradle/NDK فعلی بدون تغییر خودسرانه حفظ می‌شوند. Build نهایی Myket پس از تست واقعی Android انجام می‌شود.

## 10. تغییرات 2026-08-26

- لایه Android/Web parity از نسخه 2 به نسخه 3 ارتقا یافت.
- ترتیب و دسته‌بندی امکانات Web بر اساس MENU واقعی Android یکسان شد.
- کارت «ثبت موقعیت و تصویر خطوط» در ساختار منوی یکسان قرار گرفت.
- دوربین‌محور بودن تصاویر عملیاتی و نبود Gallery UI حفظ شد.
- Preview تصاویر برای جلوگیری از clipping/half-rendering محدود و `contain` شد.
- مستندات با وضعیت واقعی کد همگام شد.

## 11. سیاست تغییرات

هر تغییر مرتبط باید در همان Commit یا مجموعه Commit مرتبط، در صورت نیاز، `PROJECT_DOCUMENTATION.md`، `PROJECT_REMAINING_WORK.md` و `CHANGELOG.md` را بروزرسانی کند. چیزی که صرفاً در مستندات نوشته شده ولی در کد یا تست تأیید نشده، «انجام‌شده» محسوب نمی‌شود.
