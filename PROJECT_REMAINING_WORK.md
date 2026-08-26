# خطیار — کارهای باقی‌مانده و در دست اقدام

> مرجع زنده برنامه توسعه پروژه. این فایل باید با هر تغییر واقعی بروزرسانی شود.
> آخرین بررسی: 2026-08-26 — مبنا `eb453cce38f1cd812d0727e860a4511287921cf3` — نسخه 1.3.69

## وضعیت‌ها
- 🔴 باقی‌مانده / نیازمند اقدام
- 🟡 در دست اقدام / نیازمند تست
- 🟢 انجام‌شده و قابل تأیید از کد
- ⚪ وابسته به محیط استقرار یا تست خارجی

## 1. Android / Mobile
- 🟡 تست واقعی Startup روی Android 9 و دستگاه‌های قدیمی.
- 🟡 تست Camera و Location روی Android 9، 10 و نسخه‌های جدید.
- 🟡 تست Background Location و Foreground Service در Build واقعی.
- 🟡 تست Permission Guard، GPS Guard، VPN/Developer Options و Battery Guard.
- 🟡 تست Login، Refresh Token، Device Binding و Logout.
- 🟡 تست Offline Queue و همگام‌سازی.
- 🟢 Screen و Navigation قابلیت «ثبت موقعیت و تصویر خطوط» وجود دارد.
- 🟢 ثبت ایستگاه از Camera UI و GPS با High Accuracy پیاده‌سازی شده است.
- 🟢 Preview تصاویر سلفی/عملیاتی با محدودیت ارتفاع و contain اصلاح شده است.
- 🟢 ترتیب MENU مرجع Android مشخص و به Web منتقل شده است.
- 🟢 گردش گزارشات بر اساس تاریخ مرتب می‌شود و انتخاب جدیدترین/قدیمی‌ترین دارد.
- 🟢 خروجی PDF گردش گزارشات با `expo-print` و `expo-sharing` اضافه شد و قالب مدیر را از API دریافت می‌کند.
- 🟢 نسخه Android به 1.3.69 افزایش یافت.
- ⚪ Build نهایی APK/AAB و نصب روی دستگاه واقعی.
- ⚪ تأیید انتشار Myket پس از تست نهایی.

## 2. Web App
- 🟢 `php/app/app.html` مرجع Web App است و مسیر `/app` استفاده می‌شود.
- 🟢 ورودی عمومی قبل از Login برای ثبت موقعیت/تصویر حذف شده است.
- 🟢 مسیر «ثبت موقعیت و تصویر خطوط» در ساختار امکانات Web App وجود دارد.
- 🟢 ظاهر کارت‌ها، فاصله‌ها، RTL و responsive behavior همسان‌سازی شده است.
- 🟢 دسترسی API ثبت موقعیت بر اساس Permission کنترل می‌شود.
- 🟢 نسخه Web App/Admin badge برابر 1.3.69 شد.
- 🟢 Camera flow وب فقط دوربین را فعال می‌کند و Gallery UI برای این جریان ارائه نمی‌شود.
- 🟢 runtime خروجی PDF گردش گزارشات به Web App اضافه و در workflow تزریق خودکار شد؛ در صورت نبود endpoint، چاپ مرورگر به‌عنوان fallback استفاده می‌شود.
- 🟡 تست GPS/Camera و PDF در Chrome Android و مرورگرهای واقعی Production.
- 🟡 حذف Mock/Placeholder باقی‌مانده در صفحات عملیاتی.
- 🟡 تست Offline/Online و پیام خطای API.
- 🟡 بررسی کامل هر Screen از نظر ترتیب دکمه‌ها/فرم‌ها/فیلترها در برابر Android.

## 3. ثبت موقعیت و تصویر خطوط
- 🟢 API ثبت، Permissionها و History ایجاد شده‌اند.
- 🟢 latitude/longitude/accuracy و دو تصویر در رکورد ذخیره می‌شوند.
- 🟢 دسترسی بر اساس `can_capture`، `can_view` و `can_manage` تعریف شده است.
- 🟢 محدودسازی خطوط قابل مشاهده بر اساس دسترسی کاربر پیاده شده است.
- 🟢 تصاویر به JPEG تبدیل و فشرده می‌شوند.
- 🟢 اطلاعات آخرین موقعیت و تاریخچه در Web موجود است.
- 🟢 اتصال اطلاعات ایستگاه به جدول `lines` و بروزرسانی آخرین مختصات/تصاویر انجام می‌شود.
- 🟢 در پنل اصلی برای هر خط امکان مشاهده موقعیت، دقت، تصاویر و تاریخچه اضافه شده است.
- 🟢 حداقل دقت GPS برابر ۲۰ متر در Backend enforce شده است.
- 🟢 Migration ستون `station_name` و سایر ستون‌های لازم `lines` را نیز تضمین می‌کند.
- 🟢 Migration جدید با INFORMATION_SCHEMA برای اجرای مجدد روی MySQL/MariaDB قدیمی‌تر مقاوم شده است.
- 🟢 خروجی Excel خطوط شامل اطلاعات خط، مختصات، دقت، تاریخ، ثبت‌کننده، لینک نقشه و تصاویر است.
- 🟢 خروجی Excel از ZipArchive استفاده می‌کند و به PhpSpreadsheet وابسته نیست.
- 🟢 خروجی Excel به UI پنل متصل شد.
- 🟡 تست End-to-End Android → API → MySQL/MariaDB → Lines.
- 🟡 تست دو تصویر دوربین واقعی و ذخیره مسیر فایل‌ها.
- 🟡 انتقال native کارت ایستگاه به جزئیات خود «خطوط تاکسیرانی».

## 4. گردش گزارشات / PDF / ربات‌ها
- 🟢 مرتب‌سازی پیش‌فرض گزارشات بر اساس جدیدترین تاریخ و انتخاب قدیمی‌ترین/جدیدترین در Android.
- 🟢 API گزارشات امکان Sort صریح `asc/desc` دارد.
- 🟢 endpoint `/reports/print-data` برای Web/Android و قالب تنظیم‌شده مدیر اضافه شد.
- 🟢 خروجی PDF Android با expo-print و expo-sharing اضافه شد.
- 🟢 runtime خروجی PDF Web App اضافه شد.
- 🟢 endpoint ارسال اطلاعات گزارش به ربات‌ها ایجاد شد و نام فرستنده، موضوع، متن و تا ۵ پیوست را پردازش می‌کند؛ پیوست‌ها روی سرور ذخیره و برای Bale/Telegram/Eitaa ارسال می‌شوند.
- 🟡 اتصال خودکار endpoint ربات‌ها به مسیر ارسال گزارش Web و Android و تست واقعی ارسال/فایل در هر سه پیام‌رسان.
- 🟡 تست قالب PDF تنظیم‌شده توسط مدیر با داده واقعی.

## 5. Backend / Database
- 🟢 Migration نهایی خط/ایستگاه بازبینی و idempotent شد.
- 🟢 ارجاع ستون `station_name` در Backend با Migration همسان شد.
- 🟢 API خروجی PDF گردش گزارشات اضافه شد.
- 🟢 Sort صریح گزارشات به Backend اضافه شد.
- 🟢 endpoint ربات گزارشات پاسخ JSON معتبر و خطاهای اعتبارسنجی مشخص دارد.
- 🟡 اجرای Migration روی DB تستی MySQL/MariaDB واقعی.
- 🟡 ممیزی همه endpointها برای Content-Type و JSON معتبر.
- 🟡 بررسی HTTP 500 باقی‌مانده در Production.
- 🟡 بررسی CORS، Cache و Security Headers در Production.
- 🟡 بررسی حجم و فشرده‌سازی تصاویر عملیاتی.
- 🟡 ممیزی کامل ارجاعات مسیر پس از تغییر `php/public` به `php/app`.

## 6. بازدید و پوشش خطوط
- 🟢 موتور و APIهای اصلی وجود دارند.
- 🟡 تست شروع/پایان بازدید با GPS و accuracy واقعی.
- 🟡 تست محدوده خط/ایستگاه.
- 🟡 تست Timeline و محاسبه پوشش.
- 🟡 تست اتصال حضور، چک‌لیست و تذکر به بازدید.
- 🟡 تست گزارش مدیریتی روزانه/بازه‌ای.

## 7. Site / Admin
- 🟢 دو دکمه مستقل ثبت موقعیت/مجوز از صفحه ورود حذف شدند.
- 🟢 قابلیت فقط پس از Login از طریق لایهٔ پنل قابل دسترسی است.
- 🟢 لایه `line-location-admin-bridge.js` به پنل اصلی متصل است.
- 🟢 در جدول خطوط، اطلاعات موقعیت و تاریخچه برای همان خط قابل مشاهده است.
- 🟢 Permissionهای ثبت/مشاهده/مدیریت به API مرکزی قابلیت متصل هستند.
- 🟢 ماژول `line-location-admin-module.js` برای نمایش و ویرایش Permissionها داخل بخش تنظیمات پنل اضافه شد.
- 🟢 خروجی Excel خطوط در UI پنل متصل شده است.
- 🟡 تست نقش‌های مختلف در محیط واقعی.
- 🟡 انتقال کامل جزئیات ایستگاه از overlay به جزئیات native خطوط، پس از مشخص شدن API/DOM رسمی پنل.

## 8. Versioning
- 🟢 نسخه مرجع این مرحله: `1.3.69`.
- 🟢 `mobile/package.json` = 1.3.69.
- 🟢 Web App/Admin badge = 1.3.69.
- 🟡 بررسی versionCode و نسخه Production پس از deploy.

## 9. Production
- ⚪ تست `https://app.yousefipour.ir/`، `/app` و APIها پس از آخرین تغییرات.
- ⚪ تست Login واقعی با چند نقش.
- ⚪ تست Token نامعتبر/منقضی.
- ⚪ تست HTTPS/Camera/Geolocation Permission در دامنه Production.
- ⚪ Backup قبل از Migration Production.
- ⚪ تست واقعی ارسال فایل به ربات‌های فعال.

## 10. فرآیند اجباری ثبت تغییرات
هر قابلیت جدید یا اصلاح باید، در صورت ارتباط، همزمان در موارد زیر ثبت شود:
1. Android
2. Web App
3. Site/Admin
4. Backend/API
5. Database/Migration
6. `PROJECT_DOCUMENTATION.md`
7. `PROJECT_REMAINING_WORK.md`
8. `CHANGELOG.md`

هیچ موردی بدون کد یا تست قابل تأیید نباید 🟢 اعلام شود.
