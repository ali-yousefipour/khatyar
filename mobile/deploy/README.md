# استقرار عملیاتی (Production)

## ۱) متغیرهای محیطی
یک فایل `.env` کنار `deploy/` (یا متغیرهای سیستم) با مقادیر دیتابیس:
```
DB_USER=postgres
DB_PASS=یک‌رمز‌قوی
DB_NAME=taxi
```

## ۲) بالا آوردن سرویس‌ها
```
docker compose -f deploy/docker-compose.prod.yml up -d --build
```
شامل: PostgreSQL، وب‌سرویس (api)، Nginx (پراکسی HTTPS)، Certbot و سرویس پشتیبان‌گیری خودکار.

## ۳) صدور گواهی HTTPS (یک‌بار)
نام دامنه را در `deploy/nginx.conf` جایگزین کنید، سپس:
```
docker compose -f deploy/docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot -d taxi-control.mashhad.ir
docker compose -f deploy/docker-compose.prod.yml restart nginx
```
تمدید خودکار: `certbot renew` را با cron اجرا کنید.

## ۴) نصب اولیه
به `https://دامنه/install` بروید و نصاب وب را کامل کنید.

## پشتیبان‌گیری
سرویس `backup` هر شب یک فایل فشردهٔ دیتابیس در `deploy/backups/` می‌سازد و نسخه‌های قدیمی‌تر از ۱۴ روز را حذف می‌کند.
بازیابی نمونه:
```
gunzip -c deploy/backups/taxi_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f deploy/docker-compose.prod.yml exec -T db psql -U postgres taxi
```

## هشدار انقضای پروانه (cron روی هاست)
```
0 7 * * *  docker compose -f deploy/docker-compose.prod.yml exec -T api node scripts/check_expiries.js 30
```
