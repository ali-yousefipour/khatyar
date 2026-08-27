# V215 — اصلاح سراسری نمایش تاریخ شمسی

- حذف وابستگی اپ به `Intl.DateTimeFormat(...).formatToParts()` برای استخراج سال/ماه/روز.
- رفع نمایش `undefined` در سال تاریخ «آخرین زمان‌های به‌روزرسانی» روی Android/Hermes.
- افزودن تبدیل خالص میلادی به شمسی و زمان تهران در `mobile/src/jdate.js`.
- اصلاح صفحه `ImportTimesScreen`، درخواست‌ها و `PresenceGate`.
- یکپارچه‌سازی تبدیل تاریخ در پنل سایت، نسخه وب و پنل Backend.
- پشتیبانی از زمان‌های دارای timezone و زمان‌های بدون timezone سرور.
- بدون تغییر SDK، Expo، React Native، Gradle، پلاگین‌ها یا package files.
