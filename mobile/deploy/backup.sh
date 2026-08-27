#!/bin/sh
# پشتیبان‌گیری خودکار شبانه از دیتابیس + نگه‌داری ۱۴ روز اخیر
DB_HOST=db
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-taxi}
mkdir -p /backups
while true; do
  TS=$(date +%Y%m%d_%H%M%S)
  echo "[backup] شروع پشتیبان‌گیری $TS"
  pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "/backups/taxi_$TS.sql.gz" \
    && echo "[backup] ذخیره شد: taxi_$TS.sql.gz" \
    || echo "[backup] خطا در پشتیبان‌گیری"
  # حذف نسخه‌های قدیمی‌تر از ۱۴ روز
  find /backups -name 'taxi_*.sql.gz' -mtime +14 -delete
  sleep 86400    # هر ۲۴ ساعت
done
