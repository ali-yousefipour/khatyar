# گزارش اصلاحات اپلیکیشن خطیار — ۱۴۰۵/۰۶/۰۸

## وضعیت اجرای اصلاحات

### ۱) بی‌سیم (Radio)
- `mobile/src/radio/RadioContext.js` اصلاح شد.
- پاسخ کانال‌ها با چند ساختار رایج (`channels/items/data`) نرمال می‌شود و کانال انتخاب‌شده پایدارتر مدیریت می‌گردد.
- خطاهای مسیرهای load/poll/presence/play/send/start/stop دیگر بلعیده نمی‌شوند و از طریق `captureCrash` در گزارش خطا ثبت می‌شوند.
- برای پاسخ خالی کانال، پیام قابل تشخیص در state ثبت می‌شود.
- شروع صحبت بدون کانال، هم در state و هم با پیام روشن به کاربر متوقف می‌شود.
- `mobile/src/screens/DashboardScreen.js`: آیتم `Radio` دیگر `always:true` نیست و به `my/app-items` متکی است.

نکته: در مخزن فعلی backend، endpointهای PHP مانند `/radio-api-v2.php` وجود ندارند؛ backend موجود Node/Express است. بنابراین تخصیص کانال/سمت در سرویس PHP بیرونی باید جداگانه بررسی شود.

### ۲) ثبت موقعیت و تصویر خطوط
- `mobile/src/screens/StationCaptureV5Screen.js` اصلاح شد.
- دسترسی اکنون `StationCapture` یا `LineLocation` را می‌پذیرد؛ در حالت ویرایش، `MyStations` نیز پذیرفته می‌شود.
- ورودی‌های متن و جستجوی خطوط راست‌چین و دارای `writingDirection:'rtl'` شدند.
- نسخه‌های قدیمی و بلااستفاده حذف شدند:
  - `mobile/src/components/LineLocationCapture.js`
  - `mobile/src/screens/StationCaptureScreenV2.js`
  - `mobile/src/screens/StationCaptureV4Screen.js`
- route `LineLocation` در `App.js` فعلاً نگه داشته شد تا سازگاری با نام مجوز قبلی حفظ شود؛ خود صفحه فعال همچنان V5 است.

### ۳) ایستگاه‌های ثبت‌شده من
- `mobile/src/screens/MyStationsScreen.js` از قبل به `StationCapture` با `stationId` ناوبری می‌کرد.
- اصلاح اصلی در V5 اعمال شد تا کاربر دارای فقط `MyStations` بتواند ایستگاه خودش را برای ویرایش باز کند.
- برای ایجاد ایستگاه جدید، مجوزهای `StationCapture`/`LineLocation` همچنان لازم هستند.

### ۴) RTL و چیدمان
- `mobile/App.js` بررسی شد و برخلاف گزارش قدیمی، در نسخه فعلی `I18nManager.allowRTL(true)` و `forceRTL(true)` فعال هستند؛ بنابراین این خط حذف یا تغییر داده نشد.
- `mobile/src/components/FieldStatusBanner.js` اصلاح شد تا header و ردیف‌های وضعیت با `row-reverse` نمایش داده شوند.
- در V5 فیلدهای متنی کلیدی `writingDirection:'rtl'` دارند.

## backend
مخزن `backend/` فعلی PHP نیست؛ Node.js/Express/PostgreSQL است. سرویس‌های PHP مورد اشاره (`radio-api-v2.php` و `station-wizard-api.php`) در این repository پیدا نشدند. بنابراین موارد زیر هنوز نیازمند بررسی در سرویس بیرونی هستند:
- تخصیص و بازگرداندن کانال‌های بی‌سیم و مجوز `Radio`.
- endpointهای `station-wizard-api.php` شامل `permission`, `mine`, `detail`, `types`, `lines`, `nearest-lines`, `save`.
- صحت اینکه `my/app-items` برای نقش‌ها کلیدهای `Radio`, `StationCapture`, `LineLocation`, `MyStations` را برمی‌گرداند.

## build / lint
در `mobile/package.json` اسکریپت `lint` وجود ندارد. اسکریپت‌های موجود شامل `doctor`, `validate:phase5`, `validate:babel` و buildهای release هستند، اما GitHub connector امکان اجرای shell/Android build روی runner این گفتگو را نمی‌دهد. بنابراین build واقعی APK/AAB در این محیط اجرا نشد و این مورد باید در runner یا سیستم توسعه اجرا شود.

## commitهای این اصلاحات
- اصلاح ثبت خطا و پایش پایدار بی‌سیم
- اصلاح مجوز نمایش آیتم بی‌سیم
- اصلاح مجوز ثبت و ویرایش ایستگاه و RTL ورودی‌ها
- حذف نسخه‌های قدیمی و بلااستفاده ویزارد ایستگاه
- اصلاح راست‌چین بودن و چیدمان RTL در هشدارهای میدانی

## محدودیت و وضعیت نهایی
این گزارش بر اساس وضعیت واقعی مخزن فعلی تهیه شده است. بخشی از گزارش اولیه مربوط به ساختار قدیمی/نسخه دیگری از پروژه بود؛ مخصوصاً ادعای PHP بودن backend و `I18nManager.allowRTL(false)` در وضعیت فعلی repository صدق نمی‌کند.
