# مستند مرجع یکپارچه سامانه خطیار

> مرجع اصلی و زنده مستندات پروژه. بروزرسانی: نسخه 1.3.75 در 2026-08-27.

## وضعیت معماری
- Android: React Native + Expo در `mobile/`.
- Web App/PWA: `php/app/app.html` و `/app`.
- Site/Admin: `php/app/panel.html` و صفحه `php/app/radio-admin.html`.
- Backend: PHP/MySQL/MariaDB و APIهای گزارشات Node در `backend/`.

## بی‌سیم خطیار — طراحی نهایی
بی‌سیم فقط در Android فعال است؛ Web App قابلیت مکالمه/دریافت صوتی ندارد. Admin Web فقط تعریف و نظارت کانال‌ها را انجام می‌دهد.

### انواع کانال
1. `region`: عضویت بر اساس منطقه‌های تعریف‌شده سیستم.
2. `users`: اعضای انتخابی مدیر.
3. `roles`: سمت‌های انتخابی مدیر.
4. `custom`: ترکیب منطقه/کاربر/سمت با منطق `OR` یا `AND`.

Backend در `radio-api-v2.php` عضویت را در تمام عملیات `channels/state/settings/presence/take/send/poll/audio` کنترل می‌کند؛ بنابراین دستکاری Android نمی‌تواند کاربر را وارد کانال غیرمجاز کند. تغییر منطقه یا سمت کاربر نیز در هر درخواست دوباره ارزیابی می‌شود.

### PTT
- هر کانال در هر لحظه فقط یک گوینده دارد.
- `take` با تراکنش و `SELECT ... FOR UPDATE` قفل گوینده را می‌گیرد.
- حداکثر زمان صحبت از تنظیم کانال می‌آید و روی Backend نیز enforce می‌شود.
- پایان صحبت قفل را آزاد می‌کند و پیام کوتاه صوتی ذخیره می‌شود.
- Android هنگام روشن بودن بی‌سیم در تمام Screenهای ناوبری Poll/Presence انجام می‌دهد و پیام‌های جدید را با chirp شروع/پایان پخش می‌کند.
- خاموش بودن بی‌سیم دریافت صوتی را متوقف می‌کند.

### Admin
`radio-admin.html` و `radio-admin.js` امکان ایجاد/ویرایش/حذف/فعال‌سازی کانال، انتخاب منطقه/کاربر/سمت، انتخاب AND/OR، حداکثر زمان صحبت، اولویت، مشاهده اعضای فعلی، کاربران آنلاین، گوینده فعلی و Log ارتباطات را فراهم می‌کنند. دسترسی صفحه و API فقط برای مدیر مجاز است.

### Database
- `radio_channels`: تعریف کانال و وضعیت PTT.
- `radio_channel_regions/users/roles`: قوانین عضویت.
- `radio_presence`: حضور آنلاین کاربران.
- `radio_logs`: رخدادهای مدیریتی و ارتباطی.
- `radio_messages`: پیام‌های صوتی.
- `radio_user_settings`: روشن/خاموش بودن بی‌سیم و کانال انتخابی هر کاربر.
- Migration: `php/migrations/2026_08_27_radio.sql` و `php/migrations/2026_08_27_radio_v2.sql`؛ Migration v2 برای MySQL/MariaDB idempotent است.

## ثبت موقعیت و تصویر خطوط
Android، Web App و Admin مسیر واحد ثبت موقعیت را با Permissionهای `can_capture/can_view/can_manage` استفاده می‌کنند. GPS با High Accuracy دریافت می‌شود و Backend دقت بیش از ۲۰ متر را رد می‌کند. تاریخچه در `line_station_locations` نگهداری و آخرین موقعیت/تصاویر در `lines` بروزرسانی می‌شود.

## خروجی Excel خطوط
`line-location-export.php` خروجی واقعی `.xlsx` با ZipArchive تولید می‌کند و به PhpSpreadsheet وابسته نیست.

## گردش گزارشات و PDF
Android و Web خروجی PDF گردش گزارشات را دارند و Backend Sort صریح `asc/desc` و قالب تنظیم‌شده مدیر را ارائه می‌کند.

## Version 1.3.75
- طراحی نهایی و Backend-enforced برای بی‌سیم منطقه‌ای، اعضای انتخابی، سمت‌محور و ترکیبی.
- PTT تک‌گوینده با lease قابل تنظیم.
- Presence، اعضای فعلی، کاربران آنلاین و Log ارتباطات.
- صفحه مدیریت کانال‌های بی‌سیم در Admin.
- Android global radio provider و دریافت صوتی در همه Screenها.
- مسیر API امن v2 و جلوگیری از دسترسی مستقیم به فایل صوتی کانال غیرمجاز.
- نسخه Android/Web/Admin برابر `1.3.75` و Android versionCode برابر `10375`.
- Expo/React Native/Gradle/NDK تغییر داده نشده‌اند.

## تست‌های باقی‌مانده
Build و نصب واقعی Android، تست میکروفون/پخش روی دستگاه‌های واقعی، اجرای Migration روی MySQL/MariaDB Production، تست دو کاربر همزمان PTT، تست تغییر منطقه/سمت و تست Production باید در محیط واقعی انجام شوند.
