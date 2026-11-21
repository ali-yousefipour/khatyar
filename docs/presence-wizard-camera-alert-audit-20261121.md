# ممیزی اصلاح چرخه صحت‌سنجی حضور — ۱۴۰۵/۰۸/۳۰

## حدود تغییر
Android/Expo: `PresenceGate`، `PresenceCheckWizard`، دو Capture، `cameraSession`، `presenceAlarm`، کانال اعلان‌ها، Native MediaPlayer service و آزمون‌های CI. سیاست ۳+۳ صحت‌سنجی تصادفی و صف ارسال موجود تغییر نکرد.

## علت‌های ریشه‌ای کشف‌شده
1. توقف هشدار بر مبنای «Route انتخاب شد» یا فشار دکمه آغاز سلفی، نه آماده‌بودن صفحه برای تعامل.
2. محاسبه مجدد مهلت از زمان اولین Navigation و تأخیر تا ۵۹ ثانیه در مهلت شیفت ثابت؛ همچنین تاریخ دریافت اعلان زمان‌بندی‌شده می‌توانست مهلت اصلی آن را افزایش دهد.
3. ویزارد مستقیماً از Android camera Intent استفاده می‌کرد؛ خطای مجوز/بازگشت و AppState مانع نمایش داخلی باثبات می‌شد. مسیر قدیمی تعویض دوربین به تأخیر ثابت متکی بود.
4. انتظار مداوم camera session حتی بعد از گرفتن لنز، و تلاش مجدد ناکافی برای CameraView سلفی.
5. وجود کانال اعلان `bypassDnd:true` و پخش صدای اضافی از Notify در کنار MediaPlayer مرکزی. هشدار بومی در بعضی مسیرها مهلت نهایی نداشت.

## قرارداد اجرا
- چالش در زمان فعال‌شدن `dueRef` وارد حالت هشدار می‌شود، حتی اگر Navigation آماده نباشد. `startPresenceAlarm(deadlineMs)` فقط یک نمونه Native/JS ایجاد می‌کند.
- ویزارد تنها پس از `focus + onLayout` رویداد `ready` می‌فرستد؛ در این لحظه صوت، ویبره و اعلان فعال پاک‌سازی می‌شود. `hidden` در حالت فعال، هشدار را دوباره آغاز می‌کند.
- پایان موفق/انقضا، `completed/expired` و آزادسازی منابع را ایجاد می‌کند. درخواست‌ها با `requestId` تفکیک می‌شوند؛ درخواست‌های تکراری و پیش‌نمایش دوربین هم‌زمان حذف می‌شوند.
- مهلت از زمان درخواست یا زمان زمان‌بندی ثابت محاسبه می‌شود؛ در یک اجرای JS، `performance.now()` مانع افزایش مهلت با عقب‌کشیدن ساعت گوشی است. بعد از reboot یا در ارسال آفلاین، **سرور باید اعتبار مهلت را با مرجع خود بررسی کند**.
- دوربین سلفی و خودرو در این ویزارد در حالت `CameraView` شروع می‌شوند و مجوز دوربین خودکار درخواست می‌شود. شکست Mount یا نرسیدن readiness دو تلاش کنترل‌شده دارد؛ در صورت مشکل مسیر Android camera-only برای کاربر قابل انتخاب است. صف آفلاین، پیش‌نمایش و مکان‌یابی موجود حفظ می‌شوند.
- Native FGS با AudioAttributes سازگار با Notification/DND و deadline قطعی اجرا می‌شود؛ روی Androidهایی که شروع FGS از پس‌زمینه مجاز نیست، مسیر fallback اعلان سیستم باقی است. هیچ قابلیت تغییر صدای گوشی یا دورزدن DND اضافه نشده است.
- کانال تازه `presence_alarm_v2` برای جلوگیری از ادامه تنظیم immutable قدیمی `bypassDnd` تعریف شده و اعلان‌های برنامه‌ریزی‌شده قدیمی در اولین بازسازی برنامه به نسخه جدید انتقال می‌یابند.

## آزمون‌ها
- `mobile/scripts/test-presence-alarm.cjs`: پخش فوری/حلقه‌ای، انقضا، race متوقف‌سازی و native/JS fallback.
- `mobile/scripts/test-presence-camera.js`: انحصار مالکیت لنز، AppState، retry، کیفیت عکس و آزادسازی منابع.
- `mobile/scripts/test-presence-system-camera.cjs`: CameraView اول، fallback Intent و حفظ watermark.
- `mobile/scripts/test-presence-response-flow.cjs`: مهلت غیرقابل‌تمدید، پیوستگی local/offline.
- `mobile/scripts/test-presence-local-scheduling.cjs`: سیاست ۳+۳، اعلان‌های محلی و انتقال کانال.
- `mobile/scripts/test-presence-wizard-lifecycle.cjs`: handoff ویزارد به هشدار، DND، Native expiry.
- `mobile/scripts/test-presence-monotonic-clock.cjs`: عقب‌بردن ساعت گوشی در همان اجرای برنامه.
- `project-integrity` و `Mobile regression isolation` هردو تست‌ها را اجرا می‌کنند؛ `Mobile Reliability QA` بسته Metro/Expo Android را صادر می‌کند.

## شرایطی که نیازمند QA واقعی دستگاه هستند
- Android 10/12/14/15/16 با دوربین جلو/عقب، اولین مجوز، برگشت از Lock/Background و CameraX black preview.
- دوام پخش Native FGS/اعلان در قفل صفحه و DND با محدودیت سازنده گوشی؛ سیستم‌عامل می‌تواند شروع Foreground Service را رد کند.
- پاسخ در شرایط سرعت پایین و صف آفلاین، خطای API 401/422/500 و رد شدن اسناد خارج از مهلت از سمت سرور.
- خروجی APK دیباگ مستقل از نسخه منتشرشده است. تا build و نصب واقعی امضا‌شده یا دیباگ روی دستگاه موفق نشود، تمام معیارهای پذیرش عملیاتی تأیید نشده‌اند.
