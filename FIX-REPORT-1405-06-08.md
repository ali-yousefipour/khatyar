# گزارش اصلاحات اپلیکیشن خطیار — ۱۴۰۵/۰۶/۰۸

## ریشه‌یابی نهایی
بررسی کامل repository نشان داد مشکل اصلی فقط در کد React Native نبود. اپلیکیشن به APIهای PHP واقعی در `php/app/` متصل است و چند عدم‌هماهنگی در مسیر API، مجوزها و آماده‌سازی دیتابیس باعث می‌شد قابلیت‌های «بی‌سیم» و «ثبت/مشاهده ایستگاه‌ها» در production قابل استفاده نباشند.

### ۱) بی‌سیم (Radio)
- `mobile/src/radio/RadioContext.js` اکنون خطاهای load/poll/presence/play/send/start/stop را با `captureCrash` ثبت می‌کند و خطای قابل نمایش در state نگه می‌دارد.
- `mobile/src/screens/RadioScreen.js` خطای runtime بی‌سیم را نیز نمایش می‌دهد و شروع صحبت بدون کانال همچنان غیرفعال است.
- `mobile/src/screens/DashboardScreen.js`: آیتم `Radio` دیگر کورکورانه `always:true` نیست.
- ریشه‌یابی backend: فایل واقعی `php/app/radio-api-v2.php` وجود دارد، اما جداول رادیو به migrationهای جدا وابسته بودند و deployment فعلی فقط با FTP انجام می‌شود. برای جلوگیری از خراب ماندن production در صورت اجرا نشدن migration، `php/app/radio-api-v2-entry.php` اضافه شد و قبل از اجرای API، جداول/ستون‌های ضروری رادیو را به‌صورت idempotent آماده و کانال‌های پایه را seed می‌کند.
- `php/app/api/unified-role-app-items.php`: کلید `Radio` به فهرست مجوزهای رسمی اضافه شد و migration داخلی مجوزها از نسخه ۱ به نسخه ۲ ارتقا یافت تا برای roleهای موجود نیز `Radio` به‌صورت خودکار اضافه شود.
- مسیرهای `/api/radio-api.php` و `/api/radio-api-v2.php` در `.htaccess` اکنون به bootstrap ایمن متصل هستند.

### ۲) ثبت موقعیت و تصویر خطوط
- route فعال همچنان `StationCapture` و پیاده‌سازی canonical همان V5 است.
- `mobile/src/screens/StationCaptureV5Screen.js` برای حالت ویرایش، مجوز `MyStations` را نیز می‌پذیرد و فیلد جستجوی خطوط/آدرس RTL است.
- ریشه‌یابی backend: فایل واقعی `php/app/station-wizard-api.php` در repository وجود دارد، اما اپ به `/api/station-wizard-api.php` درخواست می‌فرستاد و `.htaccess` برای این مسیر rewrite نداشت؛ در نتیجه درخواست به front controller می‌رسید و endpoint مورد انتظار اجرا نمی‌شد. این مسیر اکنون صریحاً rewrite می‌شود.
- برای جلوگیری از شکست API روی نصب‌های قدیمی، `php/app/station-wizard-api-entry.php` اضافه شد تا جدول `station_sign_types` و انواع پایه تابلوها را قبل از اجرای wizard آماده کند.
- migration مستقل `php/migrations/2026_08_30_radio_station_repair.sql` نیز برای نصب/ارتقای کنترل‌شده اضافه شد.

### ۳) ایستگاه‌های ثبت‌شده من
- `mobile/src/screens/MyStationsScreen.js` همچنان با `stationId` به `StationCapture` منتقل می‌کند.
- V5 در حالت ویرایش، نقش دارای فقط `MyStations` را می‌پذیرد.
- API واقعی `op=mine` اکنون از طریق rewrite صحیح قابل دسترسی است و داده‌ها از `line_station_locations` برمی‌گردند.
- `station-image.php` نیز برای نمایش تصاویر با Bearer Token و کنترل دسترسی مالک/خط استفاده می‌شود.

### ۴) مجوزها و RTL
- `php/app/api/unified-role-app-items.php` اکنون `Radio`, `LineLocation`, `StationCapture`, `MyStations` را در source of truth دارد و roleهای قبلی نیز خودکار همگام می‌شوند.
- `mobile/App.js` در وضعیت فعلی repository از `I18nManager.allowRTL(true)` و `forceRTL(true)` استفاده می‌کند؛ بنابراین این قسمت دستکاری نشد.
- فیلدهای کلیدی station wizard دارای `textAlign:'right'` و `writingDirection:'rtl'` هستند.

## فایل‌های کلیدی تغییر یافته
- `mobile/src/radio/RadioContext.js`
- `mobile/src/screens/RadioScreen.js`
- `mobile/src/screens/DashboardScreen.js`
- `mobile/src/screens/StationCaptureV5Screen.js`
- `php/app/api/unified-role-app-items.php`
- `php/app/.htaccess`
- `php/app/radio-api-v2-entry.php`
- `php/app/station-wizard-api-entry.php`
- `php/migrations/2026_08_30_radio_station_repair.sql`
- `FIX-REPORT-1405-06-08.md`
- نسخه‌های قدیمی station wizard قبلاً از repository حذف شده‌اند: `LineLocationCapture.js`, `StationCaptureScreenV2.js`, `StationCaptureV4Screen.js`.

## backend واقعی
repository شامل دو backend متفاوت است:
1. `backend/`: Node/Express/PostgreSQL.
2. `php/`: backend واقعی مورد استفاده توسط mobile با MySQL/MariaDB.

اپ موبایل با توجه به `mobile/src/config.js` به‌صورت پیش‌فرض به `https://app.yousefipour.ir/api` متصل می‌شود؛ بنابراین برای این سه قابلیت، PHP backend تعیین‌کننده است. `mobile/src/config.js` و `php/.github/workflows/deploy-php.yml` این معماری را تأیید می‌کنند.

## migration و production
Workflow فعلی PHP فقط فایل‌های `php/` را با FTP deploy می‌کند و migrationهای SQL را به‌صورت خودکار اجرا نمی‌کند. به همین دلیل برای radio و station bootstrap خودترمیمی اضافه شده است تا endpointهای موبایل در اولین درخواست بتوانند schema ضروری را آماده کنند؛ migration SQL نیز برای اجرای رسمی/کنترل‌شده موجود است.

## تست و محدودیت
- repository و قرارداد API به‌صورت مستقیم بررسی شدند و ریشه‌های اصلی بر اساس فایل‌های واقعی پیدا شد.
- GitHub Actions/FTP deployment از داخل این گفتگو قابل اجرای واقعی نیست و دسترسی شبکه container نیز به GitHub برقرار نبود؛ بنابراین نمی‌توانم ادعا کنم APK/AAB یا محیط production نهایی را اینجا اجرا کرده‌ام.
- پس از `git pull origin main`، build موبایل را روی سیستم Windows پروژه اجرا کنید و نتیجه endpointها را روی دستگاه واقعی بررسی کنید.
