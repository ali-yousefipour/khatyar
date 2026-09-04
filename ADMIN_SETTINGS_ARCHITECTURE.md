# معماری تنظیمات سایت و دسترسی بخش‌های پنل — خطیار

این سند مرجع توسعه‌های بعدی پنل مدیریت است و باید هنگام افزودن هر تب تنظیمات، آیتم Sidebar یا Permission جدید بررسی شود.

## 1. صفحه اصلی پنل

- Host پنل: `php/app/panel.html`
- Source اصلی React پنل: `php/tools/panel_source.jsx`
- Bundle اجرایی: `php/app/assets/panel.bundle.js`
- CSS: `php/app/assets/panel.bundle.css`
- Guard دسترسی Sidebar: `php/app/assets/panel-access-guard.js`
- اسکریپت build: `php/tools/build_panel_bundle.sh`

قاعده Source → Bundle:

`php/tools/panel_source.jsx` → `php/tools/build_panel_bundle.sh` → `php/app/assets/panel.bundle.js`

تا حد امکان Bundle مستقیماً ویرایش نشود؛ تغییرات UI پنل باید در Source انجام و سپس Bundle بازسازی شود.

## 2. ساختار فعلی «تنظیمات سایت»

کامپوننت اصلی تنظیمات در `php/tools/panel_source.jsx` با نام `Settings` تعریف شده است.

State اصلی:

- `v`: تمام مقادیر تنظیمات دریافت‌شده از `db.settings()`
- `tab`: تب فعال تنظیمات، مقدار اولیه `general`
- `set(k,val)`: تغییر مقدار یک کلید در state
- `save()`: ارسال کل آبجکت تنظیمات با `db.saveSettings(v)`

تب‌های فعلی `Settings`:

1. `general` — عمومی و موقعیت
2. `subscription` — اشتراک
3. `monitoring` — پایش و هشدارها
4. `dashboard` — داشبورد و محاسبه عملکرد
5. `hr` — منابع انسانی
6. `fields` — فیلدهای پرسنل
7. `appitems` — آیتم‌های اپ هر سمت
8. `sms` — پیامک
9. `bale` — ربات‌ها
10. `security` — امنیت و نسخه اپ
11. `files` — پیوست‌ها و اعلان‌ها
12. `drivers` — بدهکاران
13. `print` — قالب چاپ
14. `access` — دسترسی‌ها
15. `backup` — پشتیبان‌گیری و پاکسازی

ساختار تب‌ها در آرایه `TABS` داخل `Settings` قرار دارد و UI آن با:

`<div className="tabbar">{TABS.map(...)}</div>`

رندر محتوای هر تب نیز در همان کامپوننت `Settings` انجام می‌شود؛ تب جدید باید در همین ساختار اضافه شود، نه با ایجاد صفحه HTML مستقل.

## 3. API تنظیمات

لایه API پنل در همان Source با `API_BASE='/api'` کار می‌کند.

متدهای مرتبط در شیء `db`:

- `db.settings()` → `GET /api/admin/settings`
- `db.saveSettings(v)` → ذخیره تنظیمات از طریق API مدیریت تنظیمات
- کش `/admin/settings` حدود ۶۰ ثانیه است و بعد از عملیات `SEND` با `_invalidateCache()` پاک می‌شود.

## 4. Permission بخش‌های Sidebar

سیستم Permission بخش‌های سایت با Permission آیتم‌های اپ متفاوت است.

فایل Guard:

`php/app/assets/panel-access-guard.js`

منبع Permission:

`GET /api/admin/settings` → کلید `role_perms`

ساختار مفهومی:

`role_perms[role_id] = ['dashboard','users','settings', ...]`

Guard شناسه سمت را از JWT یا localStorage استخراج می‌کند، `role_perms[role_id]` را می‌خواند و برای هر آیتم Sidebar با `data-view`/`data-key` یا تطبیق عنوان، کلید Permission را پیدا می‌کند.

نمایش آیتم بر اساس:

`allowed(k) => roleId != null && rolePerms.includes(k)`

و سپس `el.style.display` تنظیم می‌شود.

## 5. ارتباط Sidebar با محتوای هر بخش

هر بخش Sidebar یک کلید منطقی دارد. نمونه‌ها:

- `settings` → تنظیمات سایت → کامپوننت `Settings` در `panel_source.jsx`
- `radio` → بی‌سیم → در وضعیت فعلی لینک `radio-admin.html`
- `users` → کاربران → کامپوننت مربوطه در `panel_source.jsx`
- `appitems` → آیتم‌های اپ هر سمت → منطق `role-app-items-unified.js` و API متناظر

نکته مهم: عنوان قابل مشاهده Sidebar، کلید Permission و محل پیاده‌سازی UI سه مفهوم متفاوت‌اند و نباید با هم اشتباه شوند.

## 6. دو سیستم Permission مستقل

### Permission بخش‌های سایت

برای نمایش/عدم نمایش بخش‌های پنل:

- `role_perms`
- Guard: `panel-access-guard.js`
- نمونه کلید: `radio`, `settings`, `users`

### Permission آیتم‌های اپ

برای آیتم‌های داخل اپ:

- `php/app/assets/role-app-items-unified.js`
- API: `php/app/api/unified-role-app-items.php`

این دو سیستم نباید ادغام شوند. `radio` یک Site Section است و نباید به App Item Permission منتقل شود.

## 7. وضعیت فعلی بی‌سیم

فایل‌های فعلی:

- صفحه: `php/app/radio-admin.html`
- JavaScript: `php/app/radio-admin.js`
- API مدیریت: `php/app/radio-admin-api.php`
- API عملیاتی بی‌سیم: `php/app/api/radio-api-v2.php`
- Permission سایت: کلید `radio`

### وضعیت فعلی `radio-admin.html`

این صفحه سه تب دارد:

1. `live` — پخش زنده بی‌سیم
2. `archive` — آرشیو پیام‌ها
3. `settings` — مدیریت کانال و تنظیمات

در نتیجه، «تنظیمات بی‌سیم» فعلاً داخل صفحه مرکز بی‌سیم قرار دارد.

### وضعیت فعلی `radio-admin.js`

همه این منطق‌ها در یک فایل هستند:

- Live: `showTab`, `renderLive`, `startLive`, `stopLive`
- Archive: `loadArchive`
- Settings: `fillChannelSelects`, `renderRules`, `resetForm`, `edit`, `save`, `remove`, `members`, `logs`, `render`, `saveRetention`, `load`

### APIهای تنظیمات بی‌سیم

`radio-admin.js` از endpoint زیر استفاده می‌کند:

`/api/radio-admin-api.php`

عملیات مهم:

- `bootstrap` → کانال‌ها، کاربران، سمت‌ها، مناطق و retention
- `save` → ایجاد/ویرایش کانال
- `delete` → حذف کانال
- `members` → اعضای کانال
- `logs` → لاگ کانال
- `retention-set` → مدت نگهداری آرشیو

API مدیریت بی‌سیم برای عملیات مدیریتی دوباره Permission `radio` را کنترل می‌کند؛ بنابراین صرف مخفی‌کردن Sidebar کافی نیست.

## 8. دیتابیس وابسته به تنظیمات بی‌سیم

ساختار توسط `radio-admin-api.php` در صورت نیاز ایجاد/بررسی می‌شود و Migrationهای پروژه نیز در مستندات بی‌سیم ثبت شده‌اند.

جداول اصلی:

- `radio_channels`
- `radio_channel_regions`
- `radio_channel_users`
- `radio_channel_roles`
- `radio_presence`
- `radio_logs`
- `radio_messages`
- `radio_user_settings`
- `app_settings` برای `radio_archive_retention_days`

تنظیمات کانال شامل نوع کانال، حالت تطبیق شروط، حداکثر زمان صحبت، اولویت، فعال/غیرفعال و قواعد مناطق/کاربران/سمت‌ها است.

## 9. طرح انتقال تنظیمات بی‌سیم به Settings

هدف معماری جدید:

- `radio-admin.html` فقط «پخش زنده» و «آرشیو» را نگه دارد.
- تب `settings` از `radio-admin.html` حذف شود.
- منطق مدیریت کانال و retention از `radio-admin.js` خارج شود.
- یک کامپوننت تنظیمات بی‌سیم در همان `Settings` موجود در `php/tools/panel_source.jsx` اضافه شود.
- عنوان تب جدید: `تنظیمات بی‌سیم`
- کلید پیشنهادی تب: `radio`
- این تب باید از همان `db` و همان احراز هویت پنل استفاده کند و مستقیماً از API موجود `radio-admin-api.php` استفاده کند.
- هیچ API موازی برای مدیریت کانال ایجاد نشود.
- Permission سایت `radio` باید همچنان Permission دسترسی به مرکز بی‌سیم باقی بماند.

### اجزای تب جدید

تب `radio` باید امکانات فعلی تب تنظیمات بی‌سیم را حفظ کند:

- ایجاد کانال
- ویرایش کانال
- حذف کانال
- نوع کانال: منطقه‌ای، اعضای انتخابی، سمت‌محور، ترکیبی/سفارشی
- حالت `OR` / `AND`
- مناطق مجاز
- کاربران مجاز
- سمت‌های مجاز
- حداکثر زمان صحبت
- اولویت
- فعال/غیرفعال
- مشاهده اعضا
- مشاهده Log
- مدت نگهداری آرشیو
- فهرست کانال‌های تعریف‌شده و وضعیت آنلاین/گوینده

## 10. نکات مهم هنگام پیاده‌سازی

1. نسخه‌های Expo/React Native/Gradle و سایر dependencyها تغییر نکنند.
2. API موجود بی‌سیم بازاستفاده شود؛ endpoint جدید موازی ساخته نشود.
3. `role_perms` و App Item Permission با هم مخلوط نشوند.
4. `radio` به عنوان Site Section باقی بماند.
5. Bundle پنل پس از تغییر Source باید با `php/tools/build_panel_bundle.sh` بازسازی شود.
6. `panel.html` باید query version مربوط به Bundle جدید را داشته باشد تا Cache قدیمی استفاده نشود.
7. `radio-admin.html` پس از انتقال نباید UI مدیریت کانال یا retention داشته باشد.
8. پخش زنده و آرشیو باید بدون تغییر رفتاری باقی بمانند.
9. API و دیتابیس بی‌سیم نباید برای انتقال UI تغییر غیرضروری کنند.
10. Migrationهای DB باید MySQL/MariaDB و idempotent باقی بمانند.

## 11. مرجع فایل‌ها

| قابلیت | فایل |
|---|---|
| Host پنل | `php/app/panel.html` |
| Source پنل | `php/tools/panel_source.jsx` |
| Bundle پنل | `php/app/assets/panel.bundle.js` |
| دسترسی Sidebar | `php/app/assets/panel-access-guard.js` |
| تنظیمات سایت | `Settings` داخل `php/tools/panel_source.jsx` |
| صفحه بی‌سیم | `php/app/radio-admin.html` |
| منطق بی‌سیم | `php/app/radio-admin.js` |
| API مدیریت بی‌سیم | `php/app/radio-admin-api.php` |
| API عملیاتی | `php/app/api/radio-api-v2.php` |
| Build پنل | `php/tools/build_panel_bundle.sh` |

این سند مکمل `KHATYAR_CODE_MAP.md` است و در صورت تغییر معماری باید هر دو مرجع به‌روزرسانی شوند.
