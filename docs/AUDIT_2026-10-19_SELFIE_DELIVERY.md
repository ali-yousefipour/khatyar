# بررسی کامیت‌های ۱۸ و ۱۹ اکتبر ۲۰۲۶ و اصلاح دریافت سلفی

## محدوده و شواهد

- منطقه زمانی Asia/Tehran؛ بازه UTC از 2026-10-17T20:30:00Z تا 2026-10-19T20:30:00Z.
- ۱۲۴ کامیت مبنا، شامل تغییرات تا cad785851، بررسی شد؛ در آغاز ۱۱۸ کامیت بود؛ دو تغییر نقشه مدرسه، دو تغییر تقویم و دو تغییر فیلتر نمایشی تاریخ همکاری هنگام بررسی رسید و حفظ شد. صحت همهٔ تاریخ‌های تعطیلات با مرجع رسمی و اثر reconciliation روی DB تولید جداگانه تأیید نشده است.
- checkout اصلی روی 0f405ab79 دارای ۳۱ تغییر tracked از قبل بود. هیچ‌یک حذف یا در commit این اصلاح وارد نشد. بررسی و پیاده‌سازی در checkout مستقل .build-temp/audit-20261019 انجام شد که پیش از commit با origin/main یکسان بود.
- تغییرات مرتبط با UI اندروید، حقوق، تاریخ همکاری، چارت/زیرمنطقه، سرویس مدرسه و workflowها از diff تجمعی و تاریخچه بازبینی شدند. این بررسی، اثبات اجرای همه سناریوها روی گوشی یا بانک تولید نیست.

## نقص‌های تأییدشده و اصلاح

1. دریافت فرمان فوری سلفی در notify با listener تک‌مصرف اسکرین‌شات تداخل داشت؛ GET فرمان را قبل از عکس مصرف می‌کرد. اکنون CovertSelfie مستقیماً هر دو مسیر موجود را در foreground و بدون cache می‌خواند و polling فرمان را مصرف نمی‌کند.
2. درخواست سلفی به محض شروع دوربین fulfilled می‌شد، حتی اگر عکس/ارسال شکست می‌خورد. اکنون ثبت تصویر، acknowledgment و idempotency در یک transaction و با قفل ردیف درخواست انجام می‌شود؛ درخواست گروهی به ازای هر شخص مستقل است.
3. دوربین خارج viewport با ابعاد ۱×۱ بود و timeout بعد از شروع takePictureAsync عمل نمی‌کرد. پیش‌نمایش قابل‌مشاهده، اجازه دوربین و تأیید گرفتن/ارسال توسط کاربر، watchdog کامل، single completion و پاک‌سازی callback قدیمی جایگزین شد. گرفتن پنهانی یا در پس‌زمینه فعال نشده است.
4. پاسخ queued آفلاین به‌اشتباه موفقیت سرور تلقی می‌شد. ارسال درخواست سلفی و صدور یک‌باره فیش فقط با پاسخ قطعی سرور موفق هستند؛ شکست قابل مشاهده و قابل تلاش مجدد است.
5. گالری سلفی فیلتر نمایش فارسی را با تاریخ استاندارد مقایسه می‌کرد و خطای لیست را با «خالی» اشتباه می‌گرفت. مقایسه فقط روی تاریخ شمسی استاندارد، دکمه تازه‌سازی، خطای صریح و برچسب درخواست مدیر اضافه شد.
6. نسخه محصول قبلاً 1.5.12 شده بود اما lockfile هنوز 1.5.11 بود؛ همین علت واقعی شکست job اندروید 117786661884 بود. lockfile با نسخه موجود همسان شد؛ افزایش نسخه جدید انجام نشد.
7. دو کامیت آیکون، @expo/vector-icons را import کرده بودند اما وابستگی ثبت نشده بود. نسخه 15.0.2 مطابق bundledNativeModules متعلق به Expo 57.0.29 افزوده شد؛ lockfile بدون به‌روزرسانی نامرتبط وابستگی‌ها نگه داشته شد.
8. تست‌های حقوق موبایل و چارت با imports جدید و فیلد is_active واقعی همگام نبودند؛ mockها به قرارداد جاری تطبیق یافتند و کنترل حذف نیروهای غیرفعال حفظ شد.
9. تست integrity به آزمون‌های حذف‌شده از deploy وابسته بود. آزمون‌ها در workflow integrity اجرا می‌شوند و تست انتشار به checksum واقعی و قرارداد فعلی متصل شد، نه marker قدیمی.
10. تاریخ همکاری فقط در endpoint قدیمی محاسبه می‌شد. در مسیر فعال index → admin-attendance-report-owned، روز خارج از همکاری از کارکرد/موظفی/کسری/غیبت و GPS کنار گذاشته شد؛ مرزها inclusive، punches محفوظ و ماه‌های نهایی‌شده بدون تغییر هستند. تاریخ نامعتبر/مهاجرت ناقص پیش از تغییر پروفایل رد می‌شود.
11. در کامیت تازه ecf0d7e07 کامنت تک‌خطی داخل خط فشرده admin-holiday-seed.php ادامهٔ بدنه را کامنت و خطای Unclosed '{' تولید کرده بود. کامنت مخرب حذف و lint همان endpoint به CI افزوده شد؛ منطق تاریخ‌های تعطیل اینجا تغییر نکرد.
12. در دو کامیت آخر، EmploymentAttendance.php به bootstrap اضافه شده بود ولی در allowlist نصب فایل‌های محافظت‌شدهٔ هاست نبود. انتشار اول c1caeb1f5 واقعاً با FTP 550 و سپس ورود HTTP 500 شکست خورد. فایل به payload اجباری، staging، installer دارای token/checksum و verification محافظت‌شده افزوده شد؛ require آن فقط هنگام اجرای گزارش انجام می‌شود تا استقرار ناقص یک قابلیت، ورود و تمام APIها را از کار نیندازد. پوش اصلاح زیرساختی، ساخت APK را از ابتدا راه می‌اندازد؛ نتیجه نهایی جداگانه گزارش می‌شود.

## مسیر فعال و فایل‌ها

- پنل: php/tools/panel_source.jsx → php/app/assets/panel.bundle.js → php/app/panel.html؛ دو تب موجود از POST /api/admin/covert-selfie/command و POST /api/admin/covert-selfie-request استفاده می‌کنند؛ نمایش از GET /api/admin/covert-selfies و تصویر احراز هویت‌شده آن است.
- Android: mobile/App.js → DeferredRuntimeServices → mobile/src/CovertSelfie.js؛ polling موجود /my/covert-selfie-request و /my/selfie-commands؛ ارسال POST /my/covert-selfie از mobile/src/api.js.
- backend: php/lib/routes.php؛ جداول موجود covert_selfie_requests، covert_selfie_commands و covert_selfies؛ reasonهای sr:<id> و sc:<id> فقط برای correlation سمت سرور، بدون جدول یا endpoint جدید. مالکیت، انقضا، ذخیره فایل و transaction کنترل می‌شوند.
- تاریخ همکاری: php/app/index.php و php/app/api/admin-attendance-report-owned.php؛ مجوز route، نگهداری snapshot، تقویم و قرارداد نمایش زمان حفظ شده‌اند.
- تست‌ها: php/tests/selfie_delivery_test.php، php/tests/selfie_ui_test.cjs، php/tests/employment_period_test.php، mobile/scripts/test-selfie-delivery.cjs و به‌روزرسانی mockهای موجود.
- انتشار: .github/workflows/project-integrity.yml و publish-android-release.yml؛ شماره نسخه app.config/package ثابت 1.5.12 است.

## اعتبارسنجی محلی

- build واقعی پنل: از php، bash ./tools/build_panel_bundle.sh و node --check app/assets/panel.bundle.js؛ موفق، bundle از منبع بازسازی شد.
- npm ci --legacy-peer-deps --ignore-scripts با registry رسمی و lockfile اصلاح‌شده؛ موفق. گزینه legacy-peer-deps مطابق workflow رسمی مخزن است؛ نصب بدون آن به peer ناموجود js-polyfills@0.88.0 رجوع می‌کرد.
- npm run validate:babel؛ موفق. تبدیل Babel برای ۶۳ ورودی بررسی اولیه بدون خطا بود.
- npx expo export --platform android --output-dir ../android-export-audit --max-workers 2؛ موفق؛ ۱۷۳۱ ماژول و Hermes bundle حدود 5.7MB. خروجی build و node_modules وارد Git نمی‌شوند.
- ۴۰ نام semantic آیکون منو با glyphmap نسخه نصب‌شده تطبیق داده شد؛ نام نامعتبر صفر.
- ۲۵ برنامه آزمون PHP/Node در php/tests اجرا شدند و موفق بودند. آزمون XLSX ابتدا به علت فعال نبودن ZipArchive در PHP فرزند شکست خورد؛ با PHP_TEST_ARGS شامل extension_dir و mbstring/zip تکرار و موفق شد.
- تست‌های mobile/scripts برای حقوق، سلفی، work timer، radio-live و radio-sfx موفق؛ seniority_import_test.py شامل ۷ آزمون موفق.
- تست سلفی: ۱۱ سناریوی upload، شکست فایل/DB، rollback، cleanup، تکرار، مالکیت، انقضا، تفکیک گروه و عدم مصرف در polling؛ تست موبایل شکست دوربین/فشرده‌سازی/شبکه و پاسخ queued؛ تست گالری تاریخ، refresh و خطا.
- تست تاریخ همکاری: ماه شمسی، ورودی نامعتبر قبل از ذخیره، migration غایب، ابتدا/انتها inclusive، داده audit و عدم تغییر گزارش frozen.

## انتشار تاریخی، محدودیت و تأیید عملیاتی

در نمونه API گیت‌هاب پیش از اصلاح، ۴۴۹ run مربوط به بازه بررسی شد: Android یک failure و ۱۱۲ skipped؛ پنل ۱۰۷ success و ۵ failure؛ integrity صد success و ۱۲ failure؛ upload هاست ۴۸ success، ۹ failure و ۵۵ cancelled. بنابراین ادعای «تمام کامیت‌ها قبلاً درست منتشر شده‌اند» صحیح نیست. دو کامیت تازه بعد از این نمونه آماری رسیدند.

آخرین baseline اولیه: deploy موفق [39166128346](https://github.com/ali-yousefipour/khatyar/actions/runs/39166128346)، پنل موفق [39166128334](https://github.com/ali-yousefipour/khatyar/actions/runs/39166128334)، integrity ناموفق [39166128331](https://github.com/ali-yousefipour/khatyar/actions/runs/39166128331). شکست integrity با نبود دستور آزمون سنوات و شکست Android با lockfile ناهماهنگ تطبیق داده شد.

این سند پیش از push اصلاح نوشته شده است؛ وضعیت نهایی commit، workflow و هاست در پاسخ پایان کار گزارش می‌شود. موفقیت محلی معادل موفقیت CI، FTP یا تست واقعی دوربین نیست. تست سلفی روی گوشی واقعی و بانک تولید با حساب مجاز هنوز تأیید نشده است. درخواست قدیمی فوری که قبلاً delivered شده یا درخواست منقضی را خودکار احیا نمی‌کنیم؛ پس از نصب APK اصلاح‌شده، درخواست تازه ارسال شود. برنامه باید باز باشد و کاربر دوربین/ارسال را تأیید کند.

## فهرست commitهای بررسی‌شده

- `cad785851` fix(attendance): enforce employment window on primary admin report API for live and frozen data
- `0384e7f63` fix(attendance): apply inclusive employment dates to live and frozen report presentation without mutating history

- `ecf0d7e07` fix(calendar): reconcile obsolete official holiday rows and replace stale titles instead of concatenating
- `2f5e269dd` fix(calendar): correct 1405 nationwide official holiday dates; exclude Tehran-only closures

- `640972f68` fix(panel): refresh school inspection map asset after Mashhad default change
- `5ad24301d` fix(school-service): retain Mashhad as initial inspection map center instead of auto-fitting school markers
- `ab5e92c34` fix(panel): bust cache for verified employment date reload
- `771716504` build(panel): regenerate bundle
- `1d272cf8b` fix(users): reload employment dates from database and verify persistence after save
- `7126be856` fix(users): add authoritative employment-period read endpoint for reliable edit form reload
- `37d4d770b` fix(deploy): securely migrate and verify employment date columns on production database
- `93459237e` fix(deploy): force deploy, syntax-check and checksum-verify school service admin script
- `7325dd39a` fix(school-service): invalidate cached broken school-service admin script
- `5e1bbe6f5` fix(school-service): repair invalid double-escaped regex literals preventing entire admin module from loading
- `dae6b5d50` fix(panel): bust stale admin bundle cache after deployment repair
- `af0606a13` fix(deploy): remove brittle legacy assertions blocking production upload; retain build and syntax validation
- `900ad2ac6` fix(deploy): verify live bundle by exact payload checksum rather than obsolete version markers
- `ff7993d45` fix(deploy): rebuild after main reset and force reconcile production PHP and panel assets
- `8acb5ed7c` fix(users): include employment dates in nested user-list payloads and reject unsaved fields
- `d0266c672` build(panel): regenerate bundle
- `f5e276888` fix(org): initialize zone card renderer before hierarchical zone tree
- `21f5cf403` fix(org): hide inactive personnel and nest subzones under parent zones
- `5fb7e3e98` fix(api): support rows-based user listing when returning employment dates
- `c2ab66d6f` feat(api): persist and expose employment dates on authenticated admin user routes
- `3921790fc` build(panel): regenerate bundle
- `f00e89936` fix(users): store employment date calendar values in Jalali format
- `3fc2f5dff` fix(attendance): prevent SQL failure before employment-period migration
- `8a314f604` build(panel): regenerate bundle
- `0d4b0874f` db: add idempotent employee employment-period columns
- `d6eba2d00` feat(attendance): exclude out-of-contract days from recomputed attendance totals
- `c22d16901` feat(users): Jalali calendar employment start/end date controls and validation
- `6d854c342` chore(release): set KhatYar web and Android version 1.5.12
- `9affa9f52` chore(release): set KhatYar web and Android version 1.5.12
- `7793e3cb4` chore(release): set KhatYar web and Android version 1.5.12
- `ba0a2c782` chore(release): set KhatYar web and Android version 1.5.12
- `7401703e8` fix(web): invalidate school-service cache and remove stray script closing tag for 1.5.12
- `dd6a1490f` fix(school-service): avoid null DOM writes after async tab unmount
- `1f9887899` build(panel): regenerate bundle
- `620160f06` fix(admin): show read-only current seniority days from authoritative seniority records
- `831c0555a` feat(school-service): inspection advanced filters and image presence per row
- `615fbbd9f` build(panel): regenerate bundle
- `8ed21ae59` feat(school-service): redesigned Excel reporting filters with Jalali date range
- `df48e60ab` fix(payroll): use exact imported insurance and tax amounts without percentage estimates
- `55069bbb0` build(panel): regenerate bundle
- `18b507dde` feat(admin): seniority days input and organized payroll staff filters
- `72715fb6a` feat(admin): use imported payroll for employee pay fields and printed slips instead of calculation
- `dc0c2d561` feat(school-service): support Jalali date-range filters in Excel export
- `7341a13e0` feat(school-service): improve inspection modal and image fullscreen/download
- `dd115242e` fix(school-service): require vehicle photo for inspection create and preserve existing image on edit
- `ef59c4533` feat(payroll): use original website Access slip layout in issuance modal
- `6609e923e` feat(payroll): bundle original web print template with Android app
- `b505443d9` feat(payroll): render exact Access layout controls for mobile A5 slip
- `570f45758` fix(payroll): persist image before issuance claim and respect server issuance status
- `385839c8a` feat(payroll): expose durable issuance status to mobile
- `d885f8388` feat(mobile): one-time payroll slip preview and A5 PNG export
- `e8fc7548f` feat(payroll): atomic one-time monthly slip issuance endpoint
- `8eb7a0169` feat(mobile): compact responsive multi-column payroll details with larger type
- `7b6fa6072` fix(android): automatic camera recovery without manual restart control
- `c305e338e` fix(android): recover station presence camera preview when ready event stalls
- `8b60a70d6` style(android): modernize remaining interface - UpdateScreen.js
- `a9ce5e0a8` style(android): modernize remaining interface - StationCaptureV5Screen.js
- `c1d8db6d2` style(android): modernize remaining interface - StationCaptureV4Screen.js
- `17a81d9b9` style(android): modernize remaining interface - SetupScreen.js
- `e3e06c55c` style(android): modernize remaining interface - ScannerScreen.js
- `5d4b8c063` style(android): modernize remaining interface - RoleDashboardScreen.js
- `657b40e48` style(android): modernize remaining interface - PrivacyPolicyScreen.js
- `7f301ec9f` style(android): modernize remaining interface - LoginScreen.js
- `17c5536a6` style(android): refine remaining specialist screen - ImportTimesScreen.js
- `b865520e0` style(android): refine remaining specialist screen - HelpScreen.js
- `7db776440` style(android): refine remaining specialist screen - FieldAlertSettingsScreen.js
- `6554967b1` style(android): refine remaining specialist screen - ExpiryNotificationSettingsScreen.js
- `1de1c9011` style(android): refine remaining specialist screen - CustomFieldsScreen.js
- `3fe311d7d` style(android): refine remaining specialist screen - CrashReportsScreen.js
- `eb67426e0` style(android): refine remaining specialist screen - CompanyRequestsDriverGateScreen.js
- `30417947e` style(android): refine remaining specialist screen - ChecklistScreen.js
- `5a688065c` style(android): refine remaining specialist screen - AppLockSettingsScreen.js
- `f10acdc4d` style(android): refine remaining specialist screen - AboutAppScreen.js
- `d8573b8a7` style(android): modernize specialist interface - PersonnelVehicleAssetScreen.js
- `eaa125488` style(android): modernize specialist interface - MapSettingsScreen.js
- `402d0936c` style(android): modernize specialist interface - FieldAlertsScreen.js
- `0bd89b7f8` style(android): modernize specialist interface - TempDriversScreen.js
- `921f811f4` style(android): modernize specialist interface - SubscriptionScreen.js
- `ab9a74d21` style(android): modernize specialist interface - InventoryScreen.js
- `a8ff673b7` style(android): modernize specialist interface - DriverScreen.js
- `51f522c9d` style(android): refine specialist screen spacing and card surfaces - DebtScreen.js
- `77c5bb4e0` style(android): refine specialist screen spacing and card surfaces - CulturalScreen.js
- `c1342ffef` style(android): refine specialist screen spacing and card surfaces - CompanyRequestsScreen.js
- `d6b8a7ee6` style(android): refine specialist screen spacing and card surfaces - BotMessageScreen.js
- `ccf8adfd4` style(android): refine specialist screen spacing and card surfaces - MyStationsScreen.js
- `27326e787` style(android): refine specialist screen spacing and card surfaces - LineVisitProgramScreen.js
- `0429755da` style(android): refine specialist screen spacing and card surfaces - MyDailyMissionScreen.js
- `aa81e3ba7` style(android): refine list cards and action controls - SendQueueScreen.js
- `3c1b46d08` style(android): refine list cards and action controls - InboxScreen.js
- `22e4dd3e2` style(android): refine list cards and action controls - SettingsScreen.js
- `d0d93da4c` style(android): refine list cards and action controls - FormsScreen.js
- `e397bbc05` style(android): refine list cards and action controls - PresentListScreen.js
- `e12069b54` style(android): refine list cards and action controls - SearchScreen.js
- `e02dbf751` style(android): refine list cards and action controls - NotificationsScreen.js
- `d1fee70a5` style(android): refine list cards and action controls - MessagesScreen.js
- `062df1ff8` style(android): polish screen cards and touch targets - NoticeScreen.js
- `eaae00840` style(android): polish screen cards and touch targets - PersonnelVehicleChecklistScreen.js
- `80873b55a` style(android): polish screen cards and touch targets - ComplaintsScreen.js
- `bf257eaee` style(android): polish screen cards and touch targets - SmsScreen.js
- `e7650c4ca` style(android): polish screen cards and touch targets - OutageScreen.js
- `da19838ce` style(android): polish screen cards and touch targets - OfficialPresenceScreen.js
- `1ecf9265c` style(android): polish screen cards and touch targets - LeaderboardScreen.js
- `987032206` style(android): polish screen cards and touch targets - WelfareScreen.js
- `ae91797e3` style(android): polish screen cards and touch targets - RequestsScreen.js
- `a76d2871d` style(android): refresh cards and controls in OutageScreen.js
- `923a9a47c` style(android): refresh cards and controls in OfficialPresenceScreen.js
- `490c4ed88` style(android): refresh cards and controls in InboxScreen.js
- `0763d5f82` style(android): refresh cards and controls in SearchScreen.js
- `1bbc6a8c6` style(android): modernize check-in swipe control and map container
- `acd8157ce` style(android): polish attendance tabs and presence controls
- `7a36f7030` style(android): refine professional layouts for ReportsScreen.js
- `0c90f67c2` style(android): refine professional layouts for RequestScreens.js
- `1ec9840e8` style(android): refine professional layouts for SchoolServiceScreen.js
- `b428c47c8` style(android): refine professional layouts for RadioScreen.js
- `02817dd46` style(android): refresh shared record lists, filters and summary cards
- `d4ea0c364` style(android): replace dashboard 3D and emoji menu icons with semantic vectors
- `a736b60a1` style(mobile): modernize drawer menu with semantic vector icons and refined cards
- `c878a43ee` build(panel): regenerate bundle
- `b67e123e2` fix(permissions): align role app-item catalog with all mobile navigation routes
- `0f405ab79` docs(ai): establish shared development rules and dated handoff
