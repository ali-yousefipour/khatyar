# مستند مرجع یکپارچه سامانه خطیار

> مرجع اصلی و زنده مستندات پروژه. آخرین بروزرسانی این سند: نسخه 1.3.69 در 2026-08-26.

## وضعیت معماری
- Android: React Native + Expo در `mobile/`.
- Web App/PWA: `php/app/app.html` و `/app`.
- Site/Admin: `php/app/panel.html`.
- Backend: PHP/MySQL/MariaDB و API گزارشات Node در `backend/`.

## ثبت موقعیت و تصویر خطوط
- Android، Web App و Admin مسیر واحد ثبت موقعیت را با Permissionهای `can_capture/can_view/can_manage` استفاده می‌کنند.
- GPS با High Accuracy دریافت می‌شود و Backend دقت بیش از ۲۰ متر را رد می‌کند.
- تصویر محل و تابلو فقط از جریان دوربین ثبت می‌شوند و JPEG فشرده می‌شوند.
- تاریخچه در `line_station_locations` نگهداری و آخرین موقعیت/تصاویر در `lines` بروزرسانی می‌شود.
- Migration `php/migrations/2026_08_26_line_location.sql` برای MySQL/MariaDB و اجرای مجدد مقاوم شده و `station_name` را نیز تضمین می‌کند.

## خروجی Excel خطوط
`line-location-export.php` خروجی واقعی `.xlsx` با ZipArchive تولید می‌کند و به PhpSpreadsheet وابسته نیست. خروجی شامل اطلاعات خط، مبدأ/مقصد، وضعیت، ایستگاه، Latitude/Longitude، دقت GPS، تاریخ، ثبت‌کننده، لینک نقشه و تصاویر محل/تابلو است. دسترسی بر اساس خطوط مجاز کاربر کنترل می‌شود و دکمه خروجی به UI پنل متصل شده است.

## گردش گزارشات و PDF
- Android: پیش‌فرض جدیدترین، انتخاب جدیدترین/قدیمی‌ترین و خروجی PDF با `expo-print` و `expo-sharing`.
- Backend: `GET /reports/print-data` با Sort صریح `asc/desc` و قالب تنظیم‌شده مدیر.
- Web: `php/app/report-history-pdf.js` برای خروجی PDF؛ workflow تزریق آن به `app.html` را انجام می‌دهد و چاپ مرورگر fallback است.

## ارسال گزارش به ربات‌ها
`php/app/api/report-bot-notify.php` نام فرستنده، موضوع، متن و حداکثر پنج پیوست تصویر/PDF را دریافت می‌کند، فایل‌ها را با کنترل MIME/حجم ذخیره می‌کند و برای chat متصل کاربر در Bale/Telegram/Eitaa با `sendPhoto`/`sendDocument` می‌فرستد. اتصال خودکار این endpoint به همه مسیرهای ارسال گزارش و تست واقعی Production هنوز نیازمند End-to-End است.

## Version 1.3.69
- اتصال Excel خطوط به Admin.
- Sort گردش گزارشات.
- PDF Android/Web.
- endpoint ارسال گزارش و پیوست‌ها به ربات‌ها.
- نسخه Android و Web/Admin badge برابر 1.3.69.
- Expo/React Native/Gradle/NDK تغییر داده نشده‌اند.

## تست‌های باقی‌مانده
Build و نصب واقعی Android، تست GPS/Camera روی دستگاه، اجرای Migration روی MySQL/MariaDB واقعی، تست Production، Login چندنقشی و ارسال واقعی فایل به ربات‌ها باید در محیط واقعی انجام شوند. این موارد عمداً به‌عنوان تست کدنویسی‌شده علامت نخورده‌اند.
