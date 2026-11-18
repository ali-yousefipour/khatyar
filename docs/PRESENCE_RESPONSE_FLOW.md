# صحت‌سنجی حضور: هشدار، مهلت، صف و دوربین

اصلاح ۲۰۲۶/۱۱/۱۸؛ نسخهٔ محصول و قرارداد PHP ثبت تصویر تغییر نکرده‌اند.

## مسیر اجرا و تغییرات

- `mobile/src/PresenceGate.js`: بازیابی اعلان‌های دریافت‌شده/باقی‌مانده هنگام ورود عادی و لمس اعلان؛ ذخیرهٔ زمان اولین بازشدن ویزارد به‌ازای کاربر و request_id. مهلت کامل از همان شروع محاسبه می‌شود و بازکردن مجدد زمان را تمدید نمی‌کند.
- `mobile/src/PresenceCheckWizard.js`: توقف اعلان تکرارشونده در ورود، راه‌اندازی خودکار دوربین سیستمی برای هر مرحله، ذخیرهٔ وضعیت انجام‌شده همراه با metadata و نمایش مستقل «در صف ارسال».
- `mobile/src/presenceAlarm.js` و `mobile/plugins/withPresenceNotificationAlarm.js` و `mobile/app.config.js`: سرویس `PresenceAlarmService` با صدای حلقه‌ای و wake-lock برای صفحه خاموش؛ این سرویس از اعلان Android آغاز و با bridge موجود KhatyarRadio در ورود ویزارد متوقف می‌شود. بازکردن پنل اعلان صدا را قطع نمی‌کند. FLAG_INSISTENT فقط fallback در رد شروع سرویس توسط Android است؛ هنگام بازشدن ویزارد اعلان حضور dismiss می‌شود. plugin روی منبع Expo در prebuild تمیز اجرا می‌شود و فایل‌های محلی تولیدی Android بازنویسی نشده‌اند.
- `mobile/src/presencePresentation.js` و `mobile/src/screens/CheckInScreen.js`: ادغام وضعیت محلی با فهرست سرور برای درخواست عادی، تصادفی و فوری؛ دادهٔ صف از missed سرور اولویت می‌گیرد، درخواست انجام‌شدهٔ آفلاین بدون پاسخ سرور نیز نمایش داده می‌شود؛ بازگشت از ویزارد refresh دارد.
- `mobile/src/presenceLocalSchedule.js`: نگهداری metadata انجام محلی، اصلاح regex ساعت اعلان ثابت و بازسازی cache قدیمی همان روز؛ cache شامل نسخهٔ ساختاری، ساعت‌ها و مهلت است.
- `mobile/src/api.js`: تأیید ارسال مجدد، metadata ثبت محلی را حفظ می‌کند.
- `mobile/src/PersonalPhotoCapture.js` و `mobile/src/VehiclesPhotoCapture.js`: دوربین داخلی فعال نمی‌شود؛ عکس فقط از camera intent می‌آید و کنترل‌های برگشت به دوربین داخلی حذف شده‌اند. تأیید تصویر، فشرده‌سازی و مهر زمان/موقعیت حفظ می‌شوند.
- `mobile/src/screens/DriverScreen.js` و `mobile/src/screens/PersonnelVehicleAssetScreen.js`: عکس راننده و مدارک با دوربین سیستمی، سپس ابزار برش موجود.
- `mobile/src/CovertSelfie.js`: فرمان تصویر مدیر نیز دوربین سیستمی قابل مشاهده با امکان لغو باز می‌کند.
- QR ثبت حضور، اسکن زنده است و مسیر عکس‌برداری نیست؛ تغییر نکرده است. سایر عکس‌برداری‌ها از قبل cameraLock/ImagePicker استفاده می‌کنند.

## آزمون و محدودیت

آزمون‌های Node در `mobile/scripts/test-presence-response-flow.cjs`، `test-presence-local-scheduling.cjs`، `test-presence-system-camera.cjs`، `test-presence-camera.js`، `test-presence-alarm.cjs`، `test-selfie-delivery.cjs` و `test-field-presence-recovery.cjs` اجرا شوند. آزمون جدید به `.github/workflows/project-integrity.yml` اضافه شده است.

آزمون‌های مهلت شامل اعلان دیررس، اولین شروع، بازکردن مجدد و انقضای واقعی هستند؛ صف شامل درخواست فوری، alias زمان ثابت، نبود سرور و جداسازی حساب/روز است. تست plugin تغییر محدود به حضور، idempotency و شکست صریح در تغییر ساختار Expo را بررسی می‌کند.

Babel محلی فایل‌های تغییرکرده موفق بود. Metro محلی در نبود وابستگی موجود `@expo/vector-icons` متوقف شد؛ نتیجهٔ build تمیز CI، انتشار APK و نصب/آزمون روی گوشی مراحل مستقل‌اند. روشن/خاموش‌بودن صفحه، صدای واقعی، لغو/رد مجوز دوربین و بازگشت از برنامهٔ دوربین باید روی دستگاه هدف آزمایش شوند. اعمال بخش Native/JavaScript نیازمند نصب APK تازه است.
