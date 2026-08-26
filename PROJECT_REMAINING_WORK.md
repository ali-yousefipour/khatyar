# خطیار — کارهای باقی‌مانده و در دست اقدام

> مرجع زنده برنامه توسعه پروژه. این فایل باید با هر تغییر واقعی بروزرسانی شود.
> آخرین به‌روزرسانی: 2026-08-26 — نسخه 1.3.68

## وضعیت‌ها
- 🔴 باقی‌مانده / نیازمند اقدام
- 🟡 در دست اقدام / نیازمند تست
- 🟢 انجام‌شده و قابل تأیید از کد
- ⚪ وابسته به محیط استقرار یا تست خارجی

## 1. Android / Mobile
- 🟡 تست واقعی Startup روی Android 9 و دستگاه‌های قدیمی.
- 🟡 تست Camera و Location روی Android 9، 10 و نسخه‌های جدید.
- 🟡 تست Background Location و Foreground Service در Build واقعی.
- 🟡 تست Permission Guard، GPS Guard، VPN/Developer Options و Battery Guard.
- 🟡 تست Login، Refresh Token، Device Binding و Logout.
- 🟡 تست Offline Queue و همگام‌سازی.
- 🟢 Screen و Navigation قابلیت «ثبت موقعیت و تصویر خطوط» وجود دارد.
- 🟢 ثبت ایستگاه از Camera UI و GPS با High Accuracy پیاده‌سازی شده است.
- 🟢 Preview تصاویر سلفی/عملیاتی با محدودیت ارتفاع و contain اصلاح شده است.
- 🟢 ترتیب MENU مرجع Android مشخص و به Web منتقل شده است.
- 🟢 نسخه Android به 1.3.68 و versionCode به 10368 افزایش یافت.
- ⚪ Build نهایی APK/AAB و نصب روی دستگاه واقعی.
- ⚪ تأیید انتشار Myket پس از تست نهایی.

## 2. Web App
- 🟢 `php/app/app.html` مرجع Web App است و مسیر `/app` استفاده می‌شود.
- 🟢 ورودی عمومی قبل از Login برای ثبت موقعیت/تصویر حذف شده است.
- 🟢 مسیر «ثبت موقعیت و تصویر خطوط» در ساختار امکانات Web App وجود دارد.
- 🟢 ظاهر کارت‌ها، فاصله‌ها، RTL و responsive behavior همسان‌سازی شده است.
- 🟢 دسترسی API ثبت موقعیت بر اساس Permission کنترل می‌شود.
- 🟢 نسخه Web App برابر 1.3.68 نمایش داده می‌شود.
- 🟡 انتقال نهایی اطلاعات ایستگاه به جزئیات native همان رکورد «خطوط تاکسیرانی» بدون overlay موازی.
- 🟡 تست GPS/Camera در Chrome Android و مرورگرهای واقعی Production.
- 🟡 حذف Mock/Placeholder باقی‌مانده در صفحات عملیاتی.
- 🟡 تست Offline/Online و پیام خطای API.
- 🟡 بررسی کامل هر Screen از نظر ترتیب دکمه‌ها/فرم‌ها/فیلترها در برابر Android.

## 3. ثبت موقعیت و تصویر خطوط
- 🟢 API ثبت، Permissionها و History ایجاد شده‌اند.
- 🟢 latitude/longitude/accuracy و دو تصویر در رکورد ذخیره می‌شوند.
- 🟢 دسترسی بر اساس `can_capture`، `can_view` و `can_manage` تعریف شده است.
- 🟢 محدودسازی خطوط قابل مشاهده بر اساس دسترسی کاربر پیاده شده است.
- 🟢 تصاویر به JPEG تبدیل و فشرده می‌شوند.
- 🟢 اطلاعات آخرین موقعیت و تاریخچه در Web موجود است.
- 🟢 اتصال اطلاعات ایستگاه به جدول `lines` و بروزرسانی آخرین مختصات/تصاویر انجام می‌شود.
- 🟢 در پنل اصلی برای هر خط امکان مشاهده موقعیت، دقت، تصاویر و تاریخچه اضافه شده است.
- 🟡 enforce نهایی حداقل دقت GPS در Backend و تطبیق با تنظیم Production.
- 🟡 تست End-to-End Android → API → MySQL/MariaDB → Lines.
- 🟡 تست دو تصویر دوربین واقعی و ذخیره مسیر فایل‌ها.
- 🟡 انتقال native کارت ایستگاه به جزئیات خود «خطوط تاکسیرانی».

## 4. Backend / Database
- 🟡 اجرای Migrationهای نهایی روی DB تستی MySQL/MariaDB.
- 🟡 بررسی idempotent بودن تمام Migrationهای جدید.
- 🟡 ممیزی همه endpointها برای Content-Type و JSON معتبر.
- 🟡 بررسی HTTP 500 باقی‌مانده.
- 🟡 بررسی CORS، Cache و Security Headers در Production.
- 🟡 بررسی حجم و فشرده‌سازی تصاویر عملیاتی.
- 🟡 ممیزی کامل ارجاعات مسیر پس از تغییر `php/public` به `php/app`.
- 🟡 اعمال نسخه 1.3.68 در Production و بررسی `/health`.

## 5. بازدید و پوشش خطوط
- 🟢 موتور و APIهای اصلی وجود دارند.
- 🟡 تست شروع/پایان بازدید با GPS و accuracy واقعی.
- 🟡 تست محدوده خط/ایستگاه.
- 🟡 تست Timeline و محاسبه پوشش.
- 🟡 تست اتصال حضور، چک‌لیست و تذکر به بازدید.
- 🟡 تست گزارش مدیریتی روزانه/بازه‌ای.

## 6. Site / Admin
- 🟢 دو دکمه مستقل ثبت موقعیت/مجوز از صفحه ورود حذف شدند.
- 🟢 قابلیت فقط پس از Login از طریق لایهٔ پنل قابل دسترسی است.
- 🟢 لایه `line-location-admin-bridge.js` به پنل اصلی متصل شد.
- 🟢 در جدول خطوط، اطلاعات موقعیت و تاریخچه برای همان خط قابل مشاهده است.
- 🟢 Permissionهای ثبت/مشاهده/مدیریت به API مرکزی قابلیت متصل هستند.
- 🟡 انتقال UI تنظیم Permission به صفحهٔ تنظیمات اصلی پنل بدون bridge.
- 🟡 ادغام کامل نمایش اطلاعات ایستگاه در جزئیات native «خطوط تاکسیرانی».
- 🟡 تست نقش‌های مختلف در محیط واقعی.

## 7. Versioning
- 🟢 نسخه مرجع این تغییر: `1.3.68`.
- 🟢 `mobile/package.json` = 1.3.68.
- 🟢 `mobile/app.config.js` = 1.3.68 / versionCode 10368.
- 🟢 Web App/Admin badge = 1.3.68.
- 🟡 `SITE_VERSION` و `APP_VERSION` داخل `php/lib/routes.php` باید هنگام deploy روی سرور نیز به 1.3.68 برسند.

## 8. Production
- 🟡 تست `https://app.yousefipour.ir/`، `/app` و APIها پس از آخرین تغییرات.
- 🟡 تست Login واقعی با چند نقش.
- 🟡 تست Token نامعتبر/منقضی.
- ⚪ تست HTTPS/Camera/Geolocation Permission در دامنه Production.
- ⚪ Backup قبل از Migration Production.

## 9. فرآیند اجباری ثبت تغییرات
هر قابلیت جدید یا اصلاح باید، در صورت ارتباط، همزمان در موارد زیر ثبت شود:
1. Android
2. Web App
3. Site/Admin
4. Backend/API
5. Database/Migration
6. `PROJECT_DOCUMENTATION.md`
7. `PROJECT_REMAINING_WORK.md`
8. `CHANGELOG.md`

هیچ موردی بدون کد یا تست قابل تأیید نباید 🟢 اعلام شود.
