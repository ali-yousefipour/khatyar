# نقشه کد و مسیرهای پروژه خطیار (KHATYAR_CODE_MAP)

> مرجع توسعه‌دهندگان برای یافتن Source، Bundle، API و Migration هر قابلیت. این فایل بر اساس ساختار و مستندات موجود در شاخه `main` تهیه شده و باید با هر Feature جدید به‌روزرسانی شود.
>
> **قاعده مهم:** قبل از ایجاد فایل/سیستم جدید، ابتدا این نقشه و Source موجود را بررسی کنید. Permissionهای سایت و آیتم‌های اپ دو سیستم متفاوت هستند و نباید با هم ادغام شوند.

## 1. نمای معماری

| لایه | مسیر/فایل مرجع | توضیح |
|---|---|---|
| Android | `mobile/` | React Native + Expo؛ بی‌سیم فقط این لایه را اجرا می‌کند. |
| Web App/PWA | `php/app/app.html` | نسخه وب قابلیت‌های اپ؛ آیتم‌ها بر اساس سمت کنترل می‌شوند. |
| Admin/Site | `php/app/panel.html` | پنل مدیریت و Sidebar سایت. |
| Admin Source | `php/tools/panel_source.jsx` | Source اصلی پنل؛ در صورت وجود تغییر UI/Permission ابتدا این فایل بررسی شود. |
| Admin Bundle | `php/app/assets/panel.bundle.js` | خروجی اجرایی Source پنل؛ مستقیماً ویرایش نشود مگر وقتی Source/Build در دسترس نباشد. |
| Backend PHP | `php/app/api/` | APIهای سامانه. |
| Backend Node | `backend/` | APIهای گزارشات/پردازش Node در صورت وجود. |
| Database | `php/migrations/` | Migrationهای MySQL/MariaDB. |

## 2. Admin / Sidebar / Permission

### فایل‌های اصلی

- `php/tools/panel_source.jsx` — Source اصلی React پنل، شامل UI تنظیمات سمت‌ها، منوی پنل و منطق Sidebar.
- `php/app/panel.html` — Host پنل؛ Bundleها و Guardهای JS را بارگذاری می‌کند.
- `php/app/assets/panel.bundle.js` — Bundle اجرایی پنل.
- `php/app/assets/panel-access-guard.js` — Guard فعلی دسترسی بخش‌های Sidebar؛ از `role_perms` استفاده می‌کند.
- `php/app/assets/version-badge.js` — نمایش نسخه پنل.
- `php/app/assets/panel.bundle.css` — CSS Bundle پنل.

### سطح دسترسی سمت‌ها به بخش‌های سایت

Source اصلی: `php/tools/panel_source.jsx`

سیستم داده: `role_perms`

Guard/هماهنگ‌کننده Sidebar: `php/app/assets/panel-access-guard.js`

کلیدهای بخش‌ها در Guard فعلی شامل موارد زیر است و `radio` نیز باید در همین مجموعه باشد:

`dashboard`, `reportscenter`, `health`, `map`, `present`, `presentchart`, `missiondashboard`, `citydashboard`, `missiontemplates`, `scoreengine`, `driverservicereport`, `officials`, `covertselfies`, `messages`, `messengercenter`, `companyrequests`, `salaryslips`, `users`, `zones`, `org`, `drivers`, `platetraining`, `lines`, `bills`, `config`, `forms`, `reports`, `report`, `perfreport`, `welfare`, `cultural`, `excel`, `logs`, `useract`, `commitments`, `tempdrivers`, `presence`, `attendance`, `shifts`, `attreport`, `workpolicy`, `requests`, `outages`, `customfields`, `inventory`, `sms`, `smslog`, `appitems`, `cronstatus`, `activesessions`, `settings`, `radio`.

**قاعده مورد توافق برای Permission سایت:** اگر برای یک سمت هیچ Permissionای تنظیم نشده باشد، هیچ آیتم Sidebar نباید نمایش داده شود. این قاعده باید در Source اصلی و Backend enforce شود؛ fallback به «همه مجاز» نباید دوباره اضافه شود.

### بی‌سیم در سایت

- Sidebar: کلید Permission = `radio`.
- مدیریت کانال‌ها: `php/app/radio-admin.html` و `php/app/radio-admin.js`.
- API مدیریت: `php/app/api/radio-admin-api.php`.
- API اصلی بی‌سیم: `php/app/api/radio-api-v2.php`.
- مسیرهای API بی‌سیم در `.htaccess` تعریف شده‌اند.
- **بی‌سیم یک Site Section است؛ نباید در لیست آیتم‌های قابل نمایش اپ (`role-app-items`) قرار بگیرد.**
- Web App قابلیت مکالمه/دریافت صوتی ندارد؛ Admin Web فقط مدیریت/نظارت کانال‌ها را انجام می‌دهد.

## 3. آیتم‌های قابل نمایش اپ بر اساس سمت

این سیستم با Permission بخش‌های سایت متفاوت است.

- UI/Source: `php/app/assets/role-app-items-unified.js`
- API: `php/app/api/unified-role-app-items.php`
- Host: `php/app/panel.html`

آیتم‌های شناخته‌شده فعلی شامل:

`Search`, `PresentList`, `Reports`, `CheckIn`, `Requests`, `RequestInbox`, `WorkSummary`, `CustomFields`, `Sms`, `BotMessages`, `TempDrivers`, `MySms`, `Forms`, `OfficialPresence`, `InboxReports`, `ActivityReport`, `ExpInsurance`, `ExpTaxi`, `ExpOplic`, `TeamReport`, `Outage`, `CompanyRequests`, `Cultural`, `Welfare`, `SalarySlips`, `Inventory`, `LineLocation`, `StationCapture`, `MyStations`, `LineVisitProgram`.

قابلیت‌های `LineLocation`, `StationCapture` و `MyStations` مربوط به اپ هستند و نباید با Permission سایت `radio` مخلوط شوند.

## 4. ثبت موقعیت خطوط و تصویر

طبق مستندات پروژه، Android، Web App و Admin از مسیر واحد ثبت موقعیت استفاده می‌کنند و Permissionهای `can_capture`, `can_view`, `can_manage` در Backend اعمال می‌شوند.

مسیرهای کلیدی شناخته‌شده:

- App/Admin UI: جستجو در Sourceهای `panel_source.jsx` و `app.html` برای Location/Station.
- App Item Permission: `php/app/assets/role-app-items-unified.js`.
- APIهای مرتبط: `php/app/api/`؛ برای یافتن endpoint دقیق، نام `LineLocation`, `StationCapture`, `MyStations`, `can_capture`, `can_view`, `can_manage` را جستجو کنید.
- DB: `line_station_locations` و فیلدهای آخرین موقعیت/تصویر در `lines` طبق `PROJECT_DOCUMENTATION.md`.
- Excel: `line-location-export.php`؛ خروجی XLSX با ZipArchive و بدون PhpSpreadsheet.

## 5. بی‌سیم — معماری کامل

### Android

- بی‌سیم فقط در Android فعال است.
- Global Radio Provider در Android برای دریافت پیام در تمام Screenها استفاده می‌شود.
- هنگام روشن بودن بی‌سیم، Poll/Presence انجام می‌شود؛ خاموش بودن دریافت صوتی را متوقف می‌کند.
- PTT تک‌گوینده است و chirp شروع/پایان دارد.

### Backend

`radio-api-v2.php` عضویت را در عملیات `channels/state/settings/presence/take/send/poll/audio` کنترل می‌کند.

### Admin

`radio-admin.html` + `radio-admin.js` + `radio-admin-api.php`.

### Database

- `radio_channels`
- `radio_channel_regions`
- `radio_channel_users`
- `radio_channel_roles`
- `radio_presence`
- `radio_logs`
- `radio_messages`
- `radio_user_settings`

Migrationها:

- `php/migrations/2026_08_27_radio.sql`
- `php/migrations/2026_08_27_radio_v2.sql`

## 6. Session / Authentication

برای Session/Role ابتدا API واقعی موجود در `php/app/api/` را بررسی کنید. از ایجاد endpoint فرضی مانند `/api/session/me` بدون وجود فایل متناظر خودداری کنید. خطای `404 api/session/me` در گزارش‌های قبلی نشان داد که تشخیص Role نباید به endpoint غیرموجود وابسته باشد.

Token فعلی در بخش‌های JS معمولاً از `localStorage.token` خوانده می‌شود و APIها با `Authorization: Bearer ...` فراخوانی می‌شوند؛ منبع واقعی هر API را قبل از تغییر بررسی کنید.

## 7. فایل‌های مهم Admin

- `php/app/panel.html` — صفحه Host پنل.
- `php/tools/panel_source.jsx` — Source اصلی پنل.
- `php/app/assets/panel.bundle.js` — Bundle.
- `php/app/assets/panel.bundle.css` — Style.
- `php/app/assets/panel-access-guard.js` — Permission/Sidebar guard.
- `php/app/assets/role-app-items-unified.js` — App Item Permission UI.
- `php/app/assets/version-badge.js` — Version badge.
- `php/app/assets/persian-date-picker.js` — تاریخ‌نگار فارسی.
- `php/app/assets/persian-date-fix.js` — اصلاحات تاریخ فارسی.

## 8. فایل‌های مهم Web App

- `php/app/app.html` — Host Web App/PWA.
- قابلیت‌ها و APIهای Web App را در `php/app/assets/` و `php/app/api/` جستجو کنید.
- قبل از افزودن قابلیت جدید، آیتم متناظر و API موجود را پیدا کنید تا مسیر موازی ساخته نشود.

## 9. API و Backend

ریشه اصلی API PHP:

`php/app/api/`

گروه‌های مهم شناخته‌شده:

- `admin/` — تنظیمات و مدیریت Admin.
- `unified-role-app-items.php` — Permission آیتم‌های اپ.
- `radio-api-v2.php` — API عملیاتی بی‌سیم.
- `radio-admin-api.php` — API مدیریت بی‌سیم.
- `session/` — در صورت وجود، APIهای Session واقعی؛ قبل از استفاده حتماً وجود فایل بررسی شود.

برای پیدا کردن endpoint یک Feature، ابتدا نام Feature را در کل `php/app/api/` جستجو کنید و سپس مصرف‌کننده JS/React آن را پیدا کنید.

## 10. Database / Migration

DB پروژه MySQL/MariaDB است. Migrationها باید:

- idempotent باشند.
- PostgreSQL-specific syntax نداشته باشند.
- در Production قابل اجرای مجدد باشند.

Migrationهای بی‌سیم در بخش 5 ذکر شده‌اند.

## 11. Versioning

آخرین نسخه مستندشده فعلی: **1.3.75**.

- Android versionName: `1.3.75`
- Android versionCode: `10375`
- Web/Admin: `1.3.75`
- پنل در `panel.html` از Asset query version استفاده می‌کند؛ هنگام تغییر Bundle، query string نیز باید هماهنگ شود تا Cache قدیمی استفاده نشود.

منبع مستند نسخه: `PROJECT_DOCUMENTATION.md` و `CHANGELOG_CURRENT.md`.

## 12. Build و Source → Bundle

قاعده پنل:

`php/tools/panel_source.jsx` → build/compile → `php/app/assets/panel.bundle.js`

اگر Build tool موجود در مخزن تغییر کرد، آن را در همین فایل ثبت کنید. تا حد امکان `panel.bundle.js` مستقیماً ویرایش نشود.

## 13. قواعد توسعه برای جلوگیری از تکرار خطاهای قبلی

1. قبل از ایجاد Permission جدید، `role_perms` و `RolePerms` موجود را بررسی کنید.
2. `Site Section Permission` و `App Item Permission` دو سیستم مستقل‌اند.
3. «بی‌سیم» برای Admin/Site یک Section با کلید `radio` است؛ آن را به App Itemها اضافه نکنید.
4. Sidebar باید از Permission همان Section استفاده کند.
5. مخفی کردن لینک در Frontend به‌تنهایی امنیت نیست؛ Backend نیز باید مجوز را بررسی کند.
6. برای سمت بدون Permission تنظیم‌شده، طبق تصمیم پروژه **هیچ بخش سایت مجاز نیست**؛ fallback «همه بخش‌ها» ممنوع است.
7. endpoint یا فایل فرضی ایجاد نکنید؛ ابتدا مسیر واقعی را در `php/app/api/` پیدا کنید.
8. Source را تغییر دهید و Bundle را از Source تولید کنید.
9. پس از تغییر Assetهای JS/CSS، Cache-busting version را افزایش دهید.
10. پس از تغییر Featureهای مهم، `PROJECT_DOCUMENTATION.md` و `CHANGELOG_CURRENT.md` را نیز به‌روزرسانی کنید.
11. Migrationهای DB باید MySQL/MariaDB-compatible و idempotent باشند.
12. Android/Web/Admin versionها باید در زمان Release هماهنگ افزایش یابند.

## 14. تست‌های اجباری Permission Sidebar

برای هر تغییر Permission این سناریوها باید تست شوند:

- سمت دارای `radio` → «بی‌سیم» در Sidebar دیده شود.
- سمت فاقد `radio` → «بی‌سیم» دیده نشود.
- سمت بدون هیچ رکورد Permission → هیچ آیتم Sidebar دیده نشود.
- تغییر Permission از Admin → پس از refresh، Sidebar مطابق تنظیم جدید شود.
- دستکاری DOM/URL → نباید دسترسی Backend را دور بزند.
- `radio` نباید در «آیتم‌های قابل نمایش اپ بر اساس سمت» ظاهر شود.

## 15. تاریخچه و وضعیت مستندات

`PROJECT_DOCUMENTATION.md` در 2026-08-27 نسخه 1.3.75 را مرجع زنده پروژه معرفی کرده است.

`CHANGELOG_CURRENT.md` نیز نسخه 1.3.75 را شامل بی‌سیم نهایی، مدیریت کانال، امنیت عضویت، ثبت موقعیت/تصویر و هماهنگی نسخه‌ها اعلام می‌کند.

این فایل (`KHATYAR_CODE_MAP.md`) مکمل آن دو فایل است و تمرکز آن روی **محل واقعی کدنویسی Featureها و مسیر Source → Bundle → API → DB** است.

## 16. روش به‌روزرسانی این فایل

هر Feature جدید باید حداقل این اطلاعات را به این فایل اضافه کند:

- نام Feature
- UI/Source path
- Bundle path در صورت وجود
- API endpoint و فایل Backend
- جدول/فیلد DB
- Permission key
- فایل Android در صورت وجود
- فایل Web App در صورت وجود
- فایل Admin در صورت وجود
- Migration
- تست‌های اصلی

**این فایل باید قبل از شروع توسعه Feature بعدی خوانده شود.**
