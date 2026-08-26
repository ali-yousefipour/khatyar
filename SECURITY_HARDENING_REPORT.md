# گزارش بهبود امنیتی انجام‌شده

## موارد اصلاح‌شده
- محدودسازی CORS در Node: در صورت تعریف‌نشدن `CORS_ORIGINS` دیگر همه Originها مجاز نیستند.
- افزودن error handler سراسری در Node برای جلوگیری از افشای stack trace و مدیریت خطای CORS/حجم زیاد.
- محدودسازی حجم JSON در PHP و Node.
- اعتبارسنجی JSON نامعتبر در PHP با پاسخ 400.
- سخت‌گیری JWT در PHP با بررسی `alg=HS256` و `typ=JWT`.
- محدودسازی استفاده از token در QueryString فقط به مسیرهای دانلود/مدیا ضروری.
- افزودن HSTS، Cross-Origin-Resource-Policy و تقویت هدرهای امنیتی.
- سخت‌سازی آپلود/ذخیره تصویر: محدودیت 5MB، تشخیص نوع واقعی تصویر، جلوگیری از فایل غیرتصویری و path traversal.
- غیرفعال‌سازی اسکریپت‌های نصب/نگهداری پس از نصب مگر با `ALLOW_MAINTENANCE=1`.
- تقویت `.htaccess`: غیرفعال‌سازی directory listing، جلوگیری از دسترسی به فایل‌های حساس و هدرهای امنیتی.

## پیشنهادهای عملیاتی پس از نصب
- مقدارهای `JWT_SECRET`، `CORS_ORIGINS` و `PUBLIC_URL` را در محیط production تنظیم کنید.
- پس از نصب، فایل‌های `install.php`، `setup-libs.php`، `migrate_images.php` و `fix_attendance_2026.php` را از هاست حذف یا خارج از public نگهداری کنید.
- دسترسی پوشه uploads فقط برای وب‌سرور writable باشد و اجرای PHP در آن ممنوع بماند.
- برای پنل، در نسخه بعدی توکن از localStorage به cookie امن HttpOnly منتقل شود.
