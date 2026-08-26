# تغییرات جاری — 2026-08-26

## نسخه 1.3.68 — تکمیل مرحله کدنویسی یکپارچه‌سازی خطوط و ایستگاه
- دکمه‌های مستقل «ثبت موقعیت و تصویر خطوط» و «مجوز سمت‌ها» از shell پنل ادمین حذف شدند؛ قبل از ورود دیگر نمایش داده نمی‌شوند.
- قابلیت ثبت موقعیت در پنل فقط پس از ورود و با کنترل Permission فعال می‌شود.
- یکپارچه‌سازی با بخش «خطوط تاکسیرانی»: برای رکورد هر خط، آخرین موقعیت، دقت GPS، تصاویر محل/تابلو و تاریخچه قابل مشاهده است.
- لایهٔ `line-location-admin-bridge.js` برای اتصال قابلیت ایستگاه به پنل موجود اضافه شد.
- `line-location-admin-module.js` برای مدیریت native مجوزهای `can_capture`، `can_view` و `can_manage` در بخش تنظیمات پنل اضافه شد.
- Permissionهای `can_capture`، `can_view` و `can_manage` همچنان از API مرکزی ثبت موقعیت استفاده می‌کنند.
- Web App و Android مسیر واحد «ثبت موقعیت و تصویر خطوط» را حفظ می‌کنند.
- نسخهٔ واحد سایت، Web App و Android برابر `1.3.68` باقی نگه داشته شد و نسخه‌های Expo/React Native/Gradle/NDK تغییر نکردند.
- `version-badge.js` برای نمایش نسخهٔ فعلی در Web App و پنل فعال است.
- `Permissions-Policy` وب از `camera=()` به `camera=(self)` اصلاح شده است.
- Migration `2026_08_26_line_location.sql` برای MySQL/MariaDB قدیمی‌تر بازنویسی شد و ستون `station_name` جدول `lines` نیز تضمین می‌شود.
- حداقل دقت ثبت ایستگاه در Backend روی حداکثر ۲۰ متر enforce می‌شود.
- خروجی Excel خطوط به UI پنل متصل است.

## وضعیت تست کدنویسی
- بررسی ساختار Android/Web/Admin و API انجام شد.
- syntax ماژول JavaScript جدید با Node.js بررسی شد.
- اجرای واقعی Migration روی یک MySQL/MariaDB در این محیط ممکن نبود چون سرویس DB در محیط اجرا در دسترس نیست.
- تست واقعی Android 9/10، دوربین، GPS، Background Location، Login چندنقشی و End-to-End Production هنوز وابسته به دستگاه/سرور واقعی است و عمداً انجام‌شده اعلام نشده است.

## اسناد مرجع
- `PROJECT_DOCUMENTATION.md`
- `PROJECT_REMAINING_WORK.md`
- `CHANGELOG.md` (سوابق تاریخی)
