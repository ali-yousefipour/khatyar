# ثبت موقعیت و تصویر خطوط

این قابلیت در سه سطح اضافه شده است:

- Android: دکمه «📍 ثبت موقعیت و تصویر خطوط» در داشبورد/کادر وضعیت دستگاه.
- Web App: آیتم «ثبت موقعیت و تصویر خطوط» در داشبورد وب و صفحه `/line-location.html`.
- Site/Admin: میانبرهای «ثبت موقعیت و تصویر خطوط» و «مجوز سمت‌ها» در پنل و صفحه `/line-location-admin.html`.

## جریان ثبت

1. کاربر دارای مجوز، شماره خط را جستجو و انتخاب می‌کند.
2. با GPS گوشی، latitude/longitude و accuracy ثبت می‌شود.
3. موقعیت روی نقشه نمایش داده می‌شود.
4. تصویر محل خط و تصویر تابلو ایستگاه با دوربین ثبت می‌شود.
5. رکورد در `line_station_locations` ذخیره می‌شود.
6. مختصات و آخرین تصاویر در جدول `lines` نیز بروزرسانی می‌شوند.

## دسترسی

جدول `line_location_permissions` دسترسی را بر اساس `role_id` نگه می‌دارد:

- `can_capture`: ثبت موقعیت و تصویر
- `can_view`: مشاهده اطلاعات و تاریخچه
- `can_manage`: مدیریت مجوز سمت‌ها

مدیر کل، رییس اداره بازرسی و نیروی اداری ارشد طبق منطق فعلی سامانه دسترسی کامل دارند.

## API مستقل

برای اینکه نیاز به تغییرات پرریسک در Router اصلی وجود نداشته باشد، این قابلیت از endpoint مستقل استفاده می‌کند:

`/line-location-api.php?op=permission`
`/line-location-api.php?op=lines`
`/line-location-api.php?op=capture`
`/line-location-api.php?op=history&line_id=...`
`/line-location-api.php?op=roles`
`/line-location-api.php?op=save-role`

تمام endpointها Bearer JWT فعلی سامانه را بررسی می‌کنند.

## دیتابیس

Migration idempotent در این مسیر قرار دارد:

`php/migrations/2026_08_26_line_location.sql`

برای سازگاری با MySQL/MariaDB از JSONB، PostgreSQL cast و TIMESTAMPTZ استفاده نشده است.
