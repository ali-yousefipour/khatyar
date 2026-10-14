# کاتالوگ مخزن خطیار

- مخزن: `ali-yousefipour/khatyar`، شاخهٔ `main`
- snapshot: `e9d59f7ade4da04d7c484aaf383c83f998448a8d`؛ در شروع `HEAD` و `origin/main` برابر بودند.
- مبنا: `git -c core.quotepath=false ls-files`؛ **2036 فایل tracked**.
- این کار فقط مستندسازی است؛ کد اجرایی، DB، نسخه و workflow انتشار تغییر نکرده‌اند.
- پنج مکمل، همهٔ مسیرهای snapshot را ثبت می‌کنند. شش سند جدید کاتالوگ پس از snapshot هستند و در عدد 2036 منظور نشده‌اند؛ خودشان نیز در CORE فهرست شده‌اند.

## شیوهٔ خواندن و اطمینان

مسیر و نوع فایل از Git قطعی است. مسئولیت فایل‌های محوری با شواهد کد مشخص شده؛ توضیح‌های عمومی بر اساس مسیر/پسوند استنباطی‌اند و «نیازمند بررسی» دارند. فایل‌های باینری با مسیر و نوع ثبت شده‌اند و محتوای آن‌ها dump نشده است.

- [Frontend و درخت موازی `web/`](file-catalog/FRONTEND.md) — 978 مسیر
- [اپ موبایل و Android](file-catalog/MOBILE.md) — 457 مسیر
- [PHP، پنل، API و DB](file-catalog/PHP.md) — 362 مسیر
- [Backend Node](file-catalog/BACKEND.md) — 131 مسیر
- [ریشه، مستندات، CI/CD و ابزارها](file-catalog/CORE.md) — 108 مسیر مبنا + 6 سند کاتالوگ

## نقشهٔ پوشه‌ها

| مسیر | هدف، نقاط ورود و مرز source/generated |
|---|---|
| `mobile/` | Expo/React Native، Android، plugins/scripts؛ package scripts در `mobile/package.json`. workflow release از lock و prebuild تمیز استفاده می‌کند. |
| `php/app/` | Web App، `panel.html`، PHP entry در `index.php` و assets مستقرشده؛ build script Document Root را `php/app` تعیین می‌کند، نه `php/public`. |
| `php/tools/` | منبع پنل و ابزار build: `panel_source.jsx` → `build_panel_bundle.sh` → `php/app/assets/panel.bundle.js`. |
| `php/lib/` | routeها، DB و منطق PHP مشترک؛ شامل `routes.php`, `ShiftCalc.php`, `Http.php`. |
| `php/db/`, `php/migrations/`, `db/` | SQL پایه و migrations؛ schema مخزن جای DB زنده نیست. |
| `backend/` | سرویس مستقل Express/Node؛ وابستگی `pg` نشان‌دهنده PostgreSQL در همین stack است. workflow انتشار آن در root مشاهده نشد. |
| `web/` | 978 فایل web/php/backend/mobile/assets در درخت موازی؛ workflow جاری root از `php/` و `mobile/` استفاده می‌کند، نه این درخت. فعال/قدیمی بودن کلی اثبات نشده است. |
| `.github/workflows/` | هفت workflow build/deploy/validation و عملیات دستی. |
| `docs/` | اسناد فنی و schema snapshot تاریخ‌دار؛ برخی با کد جاری اختلاف نسخه دارند. |
| `.idea/`, `deploy/`, `release/`, `windows-backup-app/`, `scripts/`, `shared/` | IDE، انتشار و ابزارهای کمکی؛ شرح هر فایل در CORE. |

## نقشهٔ قابلیت‌ها

| قابلیت | UI/source | Bundle/API | داده و منطق | مجوز و آزمون موجود |
|---|---|---|---|---|
| ورود، نشست، نقش | `php/app/index.php`, `php/tools/panel_source.jsx` | router PHP و API admin | `Http.php`, users/roles | JWT/session و ADMIN در router؛ CI بخشی از syntax را می‌سنجد. |
| داشبورد و آمار | کامپوننت‌های `panel_source.jsx` | `panel.bundle.js`, routes داشبورد | queryهای PHP و داده‌های دامنه | بعضی endpointها scope منطقه دارند؛ E2E پنل احراز نشد. |
| گزارش تردد | `AttendanceReport`, منوی `attreport` | bundle، `GET /api/admin/attendance-report` | helper-owned، `_attendance_report`, `ShiftCalc`; attendance/shift/request/GPS | ADMIN؛ workflow تست محاسبات ندارد. |
| تردد و شیفت | source پنل/موبایل | APIهای attendance | `staff_attendance`, `user_shifts`, `shifts`, `shift_days`; `ShiftCalc` | مستند سناریو در `docs/ATTENDANCE_WORK_CALCULATION.md`؛ CI مرزی گزارش احراز نشد. |
| فهرست پرسنل | انتخابگر `AttendanceReport`, `db.usersLite()` | `GET /api/admin/users-lite` | `users`, `roles` | ADMIN؛ فقط کاربران فعال. |
| گزارش و Excel | صفحات گزارش پنل | routeهای PHP | داده متناسب با گزارش | انتخاب ستون گزارش تردد روی جدول و Excel اثر دارد؛ E2E احراز نشد. |
| خطوط، مناطق، ایستگاه و نقشه | صفحات پنل/موبایل | PHP API و map assets | جداول دامنه؛ باید route و SQL هر قابلیت دیده شود | مجوز/scope به endpoint وابسته است. |
| درخواست/مرخصی/تعطیلات | پنل و holiday assets | PHP routes | `requests`, `holidays` | مرخصی تأییدشده در محاسبهٔ تردد مصرف می‌شود. |
| شکایت و خدمات مدرسه | کامپوننت و PHP/JSهای افزونه | routes/assets جدا | migrations مربوط | integrity syntax چند فایل PHP/JS را بررسی می‌کند. |
| پیامک، اعلان، بی‌سیم | پنل، Android و PHP | API/native bridges | SMS/activity و تنظیمات | برای فایل‌های مبهم مصرف دقیق در مکمل‌ها نامشخص است. |
| PWA/آفلاین | Web App و موبایل | service worker/APIهای موجود | cache و ذخیره محلی | sync runtime بررسی نشد. |
| Backend Node | `backend/src/server.js`, routers | Express و `backend/public` | PostgreSQL (`pg`) | `npm run test:smoke` تعریف شده؛ CI root برای backend دیده نشد. |
| انتشار وب | PHP source | bundle/CSS | build script | workflow deploy FTP و HTTP/API checks دارد. |
| انتشار Android | `mobile/` | APK artifact | Expo/Gradle | workflow release نسخه و artifact را verify می‌کند. |
| پشتیبان‌گیری | `windows-backup-app/`, `deploy/` | ابزارهای محلی | per-file در CORE | workflow عمومی مصرف‌کننده احراز نشد. |

فایل‌های موجود بدون منوی قابل مشاهده یا مصرف‌کننده قطعی، به‌خصوص `web/`، بعضی assetهای standalone و ابزارهای محلی، در inventory علامت خورده‌اند؛ وجود فایل به‌تنهایی فعال‌بودن قابلیت را اثبات نمی‌کند.

## ردیابی گزارش تردد: منو تا SQL و UI

1. **منو و کامپوننت:** `php/tools/panel_source.jsx`: کلید `attreport` در `MENU` حدود خط 5121؛ `VIEWS.attreport` متصل به `AttendanceReport` حدود 8687؛ تابع حدود 6062.
2. **انتخاب پرسنل:** `db.usersLite()` حدود خط 385 به `GET /api/admin/users-lite` می‌رود. `php/lib/routes.php` حدود 6128 از `users` و `roles` کاربران active را با شناسه، نام و نقش برمی‌گرداند. UI تابع `personQuery` دارد که نام و چند فیلد شناسه/تماس را نرمال می‌کند؛ اما endpoint فعلی فقط نام و نقش می‌دهد، پس جستجوی فیلدهای غایب از payload داده‌ای برای match ندارد. این شکاف مستند شد، نه تغییر.
3. **تاریخ شمسی:** `JDate` در source حدود خط 436 در حالت Jalali؛ adapter تاریخ‌های `from/to` می‌فرستد. تبدیل تقویم PHP با `jalali_to_gregorian` و `gregorian_to_jalali`؛ DB Gregorian و UI Jalali طبق `DATE_STORAGE_POLICY.md`. UI سایت زنده در این کار اجرا نشد.
4. **درخواست HTTP:** `db.attendanceReport(userId,from,to)` حدود خط 292 به `GET /api/admin/attendance-report?user_id=…&from=…&to=…` می‌زند. `.htaccess` rewrite مستقیم برای این مسیر ندارد؛ درخواست به `php/app/index.php` می‌رسد.
5. **مجوز و route انتخاب‌شده:** `php/app/index.php` حدود خط 52 پیش از load کردن routes، endpoint را ثبت و `api/admin-attendance-report-owned.php` را require می‌کند. loop ورودی session/JWT و سطح ADMIN را بررسی می‌کند. route هم‌نام در `php/lib/routes.php` حدود 3340 دیرتر ثبت می‌شود و با ترتیب فعلی handler انتخابی نیست.
6. **SQL و محاسبه:** `attendance_report_owned_by_entry_date()` helper پایه `_attendance_report()` از `routes.php` را صدا می‌زند؛ روزها و داده‌های گزارش را می‌سازد، سپس helper ردیف‌های `staff_attendance` را با Gregorian `check_in` متعلق به روز شمسی می‌خواند، punchها را فیلتر می‌کند و sessionها را normalize می‌کند.
7. **شیفت و محاسبه:** `ShiftCalc::normalizeSessionPair` و `ShiftCalc::dayWork` در `php/lib/ShiftCalc.php`. session شبانه متعلق به روز `check_in` است. خروجی روز شامل `worked`, `in_shift`, `expected`, `shortage`, `overtime`, `night`, `late_in`, `early_out`, `surplus` و مرخصی به قالب ساعت است؛ helper کسری را با موظفی/حضور/معافیت مرخصی بازمی‌سنجد.
8. **GPS:** helper از `_gps_work_invalid_intervals` و eventهای `user_activity` استفاده می‌کند؛ overlap را ادغام و `gps_inactive_minutes`, `gps_inactive_details` شامل زمان و دلیل/evidence می‌سازد. دلیل‌ها `gps_off`, `app_state_signal`, `missing_checkpoint`؛ نبود checkpoint به‌تنهایی بستن اجباری برنامه را ثابت نمی‌کند.
9. **جداول:** `staff_attendance`, `users`, `requests`, `user_shifts`, `shifts`, `shift_days`, `holidays`, `attendance_ot_adjustments`, `user_activity`. تعریف/migration در `php/db/upgrade_full_standalone.sql`, `php/migrations/` و snapshot `docs/database-schema-2026-09-16.md`. DB زنده query نشده.
10. **JSON و نمایش:** پاسخ پایه `{user,shift,from,to,days}`؛ هر روز `jdate`, `weekday`, holiday/Friday، `punches[]`، ساعت‌ها، مرخصی و GPS detail دارد. `AttendanceReport` آن را به جدول/modal و Excel می‌برد. انتخاب ستون در localStorage با کلید `khatyar.attendance.report.visible-columns.v1` ذخیره و برای جدول/Excel استفاده می‌شود.
11. **مرتب‌سازی/صفحه‌بندی/وضعیت:** کنترل تاریخ، پرسنل، ستون و حالت‌های loading/error/empty در source بررسی شدند؛ مرتب‌سازی یا صفحه‌بندی server-side در route گزارش دیده نشد. اجرای همهٔ تعامل‌ها روی production تأیید نشده است.
12. **فایل‌های وابسته به تغییر:** ظاهر: `panel_source.jsx` و CSS مربوط، build و diff bundle؛ رفتار: source، adapter، route و قرارداد/خطا؛ محاسبات: helper-owned، `_attendance_report`, `ShiftCalc`, schema/migration و داده‌های مرزی. CSS جای تست محاسبات را نمی‌گیرد.

`php/app/api/admin-attendance-report.php` پیاده‌سازی standalone دیگری است؛ پنل فعلی از آن استفاده نمی‌کند. route هم‌نام در `routes.php` نیز به‌دلیل تقدم route `index.php` canonical نیست. پیش از تغییر این مسیرهای مشابه، مصرف‌کننده‌های دیگر و `.htaccess` را بررسی کنید.

## زنجیرهٔ source، build و deploy

| دامنه | زنجیرهٔ واقعی مشاهده‌شده |
|---|---|
| پنل | `php/tools/panel_source.jsx` → `bash php/tools/build_panel_bundle.sh` با TypeScript 5.9.3 → `php/app/assets/panel.bundle.js` → بارگذاری در `php/app/panel.html`. `build-panel-bundle.yml` در صورت تغییر bundle آن را commit/push می‌کند. |
| PHP/site | فایل‌های `php/` → `deploy-php.yml` rebuild/syntax check و ساخت payload از diff → FTP root. مسیر Document Root پنل `php/app` است. تعدادی فایل `lib` از installer موقت کپی می‌شوند. بعد upload/delete و HTTP checks پنل/bundle و smoke API/login اجرا می‌شوند. |
| Android | `mobile/` + lock → `npm ci --legacy-peer-deps`, `npx expo-doctor`, `npx expo prebuild --platform android --clean --no-install`, Gradle build و verify APK → artifact و GitHub Release. |
| Backend | `backend/package.json` شامل start/dev/migrate/test:smoke؛ Dockerfile نیز موجود است. workflow deploy در root مشاهده نشد. |
| تقویم | workflowهای repair دستی؛ target/اثر هرکدام از YAML همان workflow است و خودکار اجرا نمی‌شوند. |

### تمام workflowهای tracked

| workflow | Trigger و کار | خروجی/خطر |
|---|---|---|
| `.github/workflows/build-panel-bundle.yml` | push main یا dispatch؛ Node 22، TS 5.9.3، build و syntax/marker check | در اختلاف bundle، commit/push خودکار؛ ممکن است هم‌زمان با deploy باشد. |
| `.github/workflows/deploy-php.yml` | push main یا dispatch؛ bundle build، PHP diff payload، FTP و حذف فایل remote | production deploy؛ checksum/HTTP checks و smoke API/login؛ concurrency از رقابت FTP جلوگیری می‌کند. |
| `.github/workflows/project-integrity.yml` | push main یا dispatch؛ PHP lint چند فایل و node syntax دو bundle | syntax-only، نه E2E یا تست محاسبهٔ گزارش. |
| `.github/workflows/publish-android-release.yml` | dispatch و push main/tag؛ dependency install، Expo Doctor/prebuild، Gradle، artifact و Release | شرط job: dispatch، tag یا commit prefix `ci(android-release):`. |
| `.github/workflows/validate-powershell-build-script.yml` | push/PR دارای path filter و dispatch | syntax PowerShell و checksum-selection برای script Windows. |
| `.github/workflows/calendar-classic-repair.yml` | dispatch دستی | workflow تاریخی repair؛ فایل می‌گوید نگهداری عادی از source پنل و build عادی است. |
| `.github/workflows/one-time-calendar-jdate-fix.yml` | dispatch دستی | migration تاریخی JDate؛ کامنت فایل می‌گوید قبلاً یکپارچه شده، خودکار اجرا نشود. |

## API و DB

PHP app از MySQL/MariaDB و wrapper `Db` استفاده می‌کند؛ Backend Node با `pg` stack جداگانهٔ PostgreSQL دارد. جدول زیر endpointهای مرتبط با گزارش را پوشش می‌دهد، نه تمام routeهای PHP/Node.

| endpoint | مالک و پارامتر | احراز/مصرف‌کننده | داده/پاسخ |
|---|---|---|---|
| `GET /api/admin/attendance-report` | `php/app/index.php`; `user_id`, `from`, `to` | session/JWT + ADMIN؛ adapter پنل | helper-owned، `_attendance_report`; `{user,shift,from,to,days}` و جداول بالا. |
| `GET /api/admin/users-lite` | `php/lib/routes.php`; بدون query | ADMIN؛ انتخابگر | `users`,`roles`; active users. |
| `POST /api/admin/attendance-surplus/convert` | `routes.php`; `user_id,jdate,minutes,reason` | ADMIN | upsert `attendance_ot_adjustments`. |
| `POST /api/admin/attendance-surplus/reset` | `routes.php`; `user_id,jdate` | ADMIN | delete از `attendance_ot_adjustments`. |
| `GET /api/admin/attendance-surplus/list` | `routes.php`; `user_id,from,to` | ADMIN | گزارش روزانه و ردیف‌های surplus. |
| `/api/admin/attendance-punch/{id}` | `routes.php` حدود 3373 به بعد؛ verb/body را مستقیم بررسی کنید | ADMIN | ویرایش punch؛ قرارداد هر verb از کد route استخراج شود. |

schema زنده از این بررسی قابل دسترسی نبود؛ SQL tracked و snapshot dated جای مشاهدهٔ production را نمی‌گیرد. برای سایر endpointها route، پارامتر، permission و مصرف‌کننده را از ثبت route و call site استخراج کنید؛ فهرست کامل routeها در این سند ادعاء نشده است.

## ابهام‌ها و ریسک‌ها

- `PROJECT_DOCUMENTATION.md` عنوان/تاریخ قدیمی 1.5.7/10-11 دارد، در حالی که source پنل/package جاری 1.5.8 است؛ `KHATYAR_CODE_MAP.md` نسخهٔ 1.3.75 دارد. اسناد تاریخی دست‌نخورده باقی ماندند.
- درخت `web/` دارای 978 فایل است، اما مصرف workflowهای جاری از `php/` و `mobile/` است؛ قدیمی‌بودن کل `web/` اثبات نشده.
- سه مسیر گزارش مشابه‌اند: route canonical در `index.php` + helper-owned، route legacy در `routes.php`، standalone `api/admin-attendance-report.php`. فقط canonical به URL فعلی پنل وصل است.
- فقط bundle پنل زنجیرهٔ تولید روشن دارد؛ برای سایر فایل‌های bundle/minified منبع تا احراز مصرف‌کننده نامشخص است.
- `php/آرشیو/README.md` در HEAD tracked ولی working tree آغازین آن را حذف‌شده نشان می‌داد؛ restore یا commit نمی‌شود.
- 7 فایل Android تغییرکرده و پوشه‌های `.android/`, `.build-temp/`, `.npm-cache/`, `android-sdk/`, `mobile/release/khatyar-1.5.7.apk`, `php/.npm-cache/` محلی/ignored/untracked خارج از 2036 فایل‌اند و خارج از این کار می‌مانند.
- DB/هاست زنده و UI مرورگر بررسی نشد؛ باینری‌ها فقط با path/type ثبت شده‌اند؛ فایل‌های بدون consumer روشن نیازمند بررسی‌اند.

## کنترل پوشش و آزمون سند

- شمارش snapshot: **2036**؛ web 978 + mobile 457 + php 362 + backend 131 + core 108 = **2036**.
- پنج جدول مکمل مسیرهای snapshot را دارند؛ شش سند جدید نیز جداگانه در CORE معرفی شده‌اند.
- مسیرهای گزارش با source، route، helper، schema/migration و workflow تطبیق داده شدند.
- تطبیق خودکار مسیرها انجام شد: هر 2036 مسیر tracked snapshot یک‌بار آمده و 6 سند جدید نیز خودشان فهرست شده‌اند؛ کنترل whitespace و لینک‌های Markdown نیز بدون خطا بود. build پنل، آزمون runtime و deploy عمداً اجرا نشدند چون تغییر مستنداتی است؛ نتیجهٔ آن‌ها تأیید نشده است.
