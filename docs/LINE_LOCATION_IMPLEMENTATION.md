# ثبت موقعیت و تصویر خطوط

## وضعیت

پیاده‌سازی اصلی در Android و Web App انجام شده و آماده تست End-to-End است.

## Android

مسیر Native:

- `mobile/src/screens/LineLocationScreen.js`
- Route: `LineLocation`
- دسترسی سریع: داشبورد Android

قابلیت‌ها:

1. دریافت موقعیت با `expo-location` و Highest Accuracy.
2. نمایش latitude، longitude و accuracy.
3. نمایش موقعیت روی نقشه OpenStreetMap داخل WebView.
4. جستجو و انتخاب خط بر اساس شماره خط، مبدا و مقصد.
5. ثبت نام/عنوان ایستگاه.
6. گرفتن تصویر محل خط با دوربین.
7. گرفتن تصویر تابلو ایستگاه با دوربین.
8. ارسال هر دو تصویر به Backend به صورت Base64.
9. نمایش تاریخچه ثبت‌های همان خط.
10. مدیریت `can_capture`، `can_view` و `can_manage` برای کاربران مجاز.

## Web App

مسیر:

- `php/app/line-location.html`

Web parity در `php/app/app-parity.js` نیز آیتم «ثبت موقعیت و تصویر خطوط» را دارد.

## Backend

پیاده‌سازی اصلی:

- `php/app/line-location-api.php`
- ورودی سازگار Android: `php/app/api/line-location-api.php`

عملیات API:

- `permission`
- `lines`
- `roles`
- `save-role`
- `capture`
- `history`

## Database

در اولین استفاده، ساختارهای مورد نیاز به صورت سازگار با MySQL/MariaDB ایجاد می‌شوند:

- `line_location_permissions`
- `line_station_locations`

و در صورت نبودن ستون‌های جدید در `lines`، ستون‌های زیر اضافه می‌شوند:

- `latitude`
- `longitude`
- `location_accuracy_m`
- `location_photo_path`
- `station_sign_photo_path`
- `station_name`
- `location_updated_by`
- `location_updated_at`

آخرین ثبت ایستگاه، مختصات و تصاویر مرجع خط را بروزرسانی می‌کند و تمام ثبت‌های قبلی در `line_station_locations` باقی می‌مانند.

## کنترل دسترسی

- `can_capture`: ثبت موقعیت و تصویر
- `can_view`: مشاهده تاریخچه
- `can_manage`: مدیریت دسترسی سمت‌ها

مدیران/سمت‌های سطح مدیریتی تعیین‌شده، دسترسی کامل دارند و برای آن‌ها محدودیت `user_lines` اعمال نمی‌شود.

## موارد باقی‌مانده برای تأیید

- تست روی Android 9 واقعی.
- تست دوربین و GPS واقعی روی Android 9 و نسخه‌های جدید.
- تست ثبت با دو تصویر واقعی و حجم‌های مختلف.
- تست صحت رکوردهای DB و تصاویر پس از ثبت.
- تست محدودیت خطوط برای کاربر غیرمدیر.
- تست مدیریت مجوزها از Web و Android.
- تست Production روی `app.yousefipour.ir`.
