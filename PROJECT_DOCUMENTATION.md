# مستند مرجع یکپارچه سامانه خطیار

> **مرجع اصلی مستندات پروژه**
>
> این فایل مرجع واحد وضعیت فعلی، معماری، امکانات، نسخه‌ها، الزامات اجرا و کارهای باقی‌مانده سامانه خطیار است. فایل‌های قدیمی `PROJECT_STATUS_*`، `V*_*` و یادداشت‌های Build در ریشه و `mobile/` صرفاً سابقه تغییرات هستند و نباید برای تصمیم‌گیری درباره وضعیت فعلی پروژه بر این سند مقدم شوند.

## 1. هویت و معماری فعلی

سامانه «خطیار» سامانه مدیریت و کنترل خطوط تاکسیرانی است و سه سطح اصلی دارد:

- **Android / Mobile:** React Native + Expo، واقع در `mobile/`
- **Web App / PWA:** وب‌اپ موبایلی واقع در `php/app/app.html` و در دسترس از `/app`
- **Site / Admin:** پنل مدیریتی PHP واقع در `php/app/panel.html`
- **Backend عملیاتی فعلی:** PHP + MySQL/MariaDB در `php/`

> مستندات قدیمی که معماری را صرفاً Node.js + PostgreSQL معرفی می‌کنند مربوط به مراحل اولیه پروژه هستند. برای استقرار فعلی روی `app.yousefipour.ir`، مرجع عملیاتی PHP + MySQL/MariaDB است.

### مسیرهای عملیاتی

- `https://app.yousefipour.ir/` — پنل اصلی
- `https://app.yousefipour.ir/app` — وب‌اپ
- `https://app.yousefipour.ir/api/...` — API
- `https://app.yousefipour.ir/health` — Health Check

Document Root هاست باید روی `php/app` باشد.

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

- داشبورد نقش‌محور
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

این قابلیت در Android، Web App و Site/Admin پیاده‌سازی شده است.

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

Migration مرجع:
`php/migrations/2026_08_26_line_location.sql`

API مستقل:

- `/line-location-api.php?op=permission`
- `/line-location-api.php?op=lines`
- `/line-location-api.php?op=capture`
- `/line-location-api.php?op=history&line_id=...`
- `/line-location-api.php?op=roles`
- `/line-location-api.php?op=save-role`

تمام APIهای این قابلیت JWT فعلی سامانه را بررسی می‌کنند.

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

### کاربران، نقش‌ها و سازمان

- مدیریت کاربران
- نقش و سطح دسترسی
- فعال/غیرفعال‌سازی
- مدیریت نشست و دستگاه
- تخصیص خطوط
- چارت سازمانی
- داشبورد نقش‌محور
- محدودسازی عملیات بر اساس role/level

### رانندگان و خودروها

- جستجو و مدیریت راننده
- جستجوی پلاک
- اطلاعات خودرو
- وضعیت مجوزها و انقضاها
- ورود داده‌های Excel
- نمایش وضعیت‌های هشدار

### بدهی و فیش حقوقی

- مدیریت بدهی
- نمایش سوابق
- لینک پرداخت در سناریوهای فعال
- فیش‌های حقوقی و گزارش ماهانه
- خروجی و چاپ در قسمت‌های مجاز

### تذکر، چک‌لیست و فرم‌ها

- ثبت و مدیریت تذکر
- چک‌لیست‌های عملیاتی
- فرم‌ساز و فیلدهای سفارشی
- گردش گزارش و ارجاع/نظر/پاسخ
- پیوست و رسانه در ماژول‌های پشتیبانی‌شده

### گزارش‌ها و داشبورد مدیریتی

- گزارش حضور
- گزارش عملکرد
- پوشش خطوط
- گزارش بازدید
- گزارش‌های مدیریتی نیروها
- نمودارهای داشبورد
- Excel و چاپ/PDF در بخش‌های فعال
- لاگ‌های عملیاتی و Audit

### پیام‌رسانی

- اعلان داخلی
- Push Notification
- SMS در صورت فعال بودن سرویس
- Bale و Messenger Bot در صورت فعال بودن تنظیمات
- مرکز پیام و تاریخچه ارسال

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

## 5. ساخت Android

نسخه‌های موجود پروژه شامل Expo SDK 57 و ابزارهای بومی متناظر هستند. نسخه‌های Gradle، React Native، Expo، NDK و پلاگین‌ها نباید بدون بررسی سازگاری تغییر کنند.

ساخت Myket با اسکریپت موجود:

```powershell
cd mobile
powershell -ExecutionPolicy Bypass -File .\build-myket-release.ps1
```

قبل از Build باید:

- Node.js سازگار نصب باشد.
- Java/JDK سازگار پروژه استفاده شود.
- وابستگی‌ها با lockfile نصب شوند.
- `expo-doctor` و اسکریپت‌های validation اجرا شوند.
- Mirror/Maven مورد نیاز Myket در دسترس باشد.

فایل‌های متعدد Build Fix در `mobile/` سابقه مشکلات Gradle/Maven/Java/PowerShell هستند و وضعیت نهایی باید با Build واقعی تأیید شود.

## 6. سازگاری Android قدیمی

برای Android 8/9/10، مسیرهای حساس شامل Image Picker، Location، Startup، Permission و Native Module باید با Guardهای موجود اجرا شوند. هر اصلاح جدید نباید مسیر اصلی Androidهای جدید را خراب کند.

## 7. Web App

وب‌اپ در `php/app/app.html` قرار دارد و باید از نظر امکانات و ظاهر تا حد ممکن با Android یکسان باشد.

اصول فعلی:

- RTL
- فارسی و اعداد فارسی در UIهای لازم
- Responsive و Mobile-first
- منوی کناری برای امکانات
- داشبورد فقط برای خلاصه وضعیت و KPI، نه محل اصلی همه امکانات
- دسترسی نقش‌محور
- استفاده از API واقعی به جای Mock در محیط عملیاتی
- پشتیبانی از GPS/Camera در مرورگرهای سازگار با Permissionهای مرورگر

## 8. PHP/MySQL/MariaDB

- API اصلی در `php/lib/routes.php`
- Bootstrap API در `php/app/index.php`
- اتصال DB در `php/lib/Db.php`
- JWT در `php/lib/Jwt.php`
- HTTP helper در `php/lib/Http.php`
- Media در `php/lib/Media.php`
- Push/SMS/Bale/Messenger در کتابخانه‌های مربوطه

تمام Migrationهای جدید باید:

- با MySQL/MariaDB سازگار باشند.
- idempotent باشند.
- قابل اجرای مجدد باشند.
- از `JSONB`، `::jsonb` و `TIMESTAMPTZ` استفاده نکنند.
- نام واقعی جداول و نوع کلیدها را با DB واقعی تطبیق دهند.

## 9. وضعیت API ورود

Endpoint فعلی:
`POST /api/session/start`

ورودی فرم:
`username`, `password`, `device_id`, `device_type`, `device_model`, `vpn_on`, `dev_options_on`, `mock_location`, `gps_on`

ورود صحیح باید پاسخ JSON معتبر شامل access/refresh و اطلاعات کاربر تولید کند. اگر پاسخ شامل HTML، CSS یا صفحه GitHub شد، باید ابتدا routing، Rewrite، URL و Content-Type بررسی شود.

## 10. وضعیت مستندات و قانون مرجع

### اسناد تاریخی

فایل‌های زیر و هم‌خانواده‌های آن‌ها سابقه توسعه هستند:

- `PROJECT_STATUS_V*.md`
- `V*_*.md`
- `BUILD-FIX-*.txt`
- `mobile/*FIX*.txt`
- `mobile/*REPORT*.txt`
- `mobile/*README*.txt`

این فایل‌ها باید به‌عنوان تاریخچه در نظر گرفته شوند، نه منبع تصمیم‌گیری مستقل.

### ترتیب اعتبار

1. کد موجود روی `main`
2. Migrationهای موجود و ساختار واقعی DB
3. `PROJECT_DOCUMENTATION.md` به‌عنوان سند مرجع
4. READMEهای مسیرها
5. گزارش‌های نسخه‌ای و یادداشت‌های قدیمی

## 11. کارهای باقی‌مانده/نیازمند تأیید عملیاتی

### اولویت بسیار بالا

- Build واقعی APK و تست نصب روی Android 9 و Android 10
- تست Login واقعی و تأیید پاسخ JSON در production
- تست `/health` و APIهای اصلی
- بررسی Document Root هاست روی `php/app`
- اجرای Migration خط/ایستگاه روی DB واقعی و کنترل idempotency
- تست ثبت موقعیت خط، دوربین و ذخیره دو تصویر در Android و Web

### اولویت بالا

- تطبیق کامل منوها و امکانات Android و Web App
- تست نقش‌ها برای `can_capture/can_view/can_manage`
- تست برنامه بازدید، محدوده GPS و پوشش خطوط
- تست Push/SMS/Bale در محیط واقعی
- تست آفلاین و جلوگیری از ثبت صوری عملیات حساس
- تست Android 8/9/10 و دستگاه‌های واقعی

### اولویت متوسط

- حذف یا انتقال مستندات قدیمی پس از تأیید نهایی
- یکسان‌سازی نام‌گذاری نسخه‌ها و Build notes
- تکمیل مستندات API و Deployment
- به‌روزرسانی Screenshotها و راهنمای کاربری

## 12. اصل مهم توسعه بعدی

هر قابلیت جدید باید در صورت مرتبط بودن در سه لایه بررسی شود:

**Android → Web App → Site/Admin**

و برای هر قابلیت باید این موارد مشخص باشند:

- UI
- Permission
- API
- Database/Migration
- Offline behavior
- Security/RBAC
- Logging/Audit
- Error handling
- Android compatibility
- Web browser compatibility

هر تغییر دیتابیس باید MySQL/MariaDB-safe و idempotent باشد و هیچ تغییر نسخه‌ای بدون دلیل فنی نباید وابستگی‌های Expo/React Native/Gradle را جابه‌جا کند.
