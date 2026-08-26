# راهنمای پیاده‌سازی روی هاست — app.yousefipour.ir

این راهنما برای راه‌اندازی سامانه روی هاست شما با مشخصات زیر آماده شده است:

| مورد | مقدار |
|------|------|
| نام دیتابیس | `h301194_app` |
| کاربر دیتابیس | `h301194_app` |
| رمز دیتابیس | `@Li09158048604` |
| آدرس سایت | `https://app.yousefipour.ir` |

> 🔒 **امنیت:** پس از راه‌اندازی، رمز دیتابیس را از کنترل‌پنل تغییر دهید و فایل `.env` را هرگز در مخزن عمومی قرار ندهید.

---

## ⚠️ دو پیش‌نیاز که باید تأیید کنید
این سامانه با **Node.js + PostgreSQL** کار می‌کند. قبل از شروع، از پشتیبانی هاست بپرسید:
1. آیا هاست **اجرای اپلیکیشن Node.js** را پشتیبانی می‌کند؟ (در cPanel: بخش **Setup Node.js App**)
2. آیا می‌توانید یک دیتابیس **PostgreSQL** بسازید؟ (بخش **PostgreSQL Databases** در cPanel)

- اگر هر دو «بله» است → ادامهٔ همین راهنما (روش A).
- اگر هاست فقط **MySQL** دارد یا Node ندارد → بخش «حالت‌های جایگزین» پایین را ببینید.

---

## روش A) راه‌اندازی روی cPanel (Node.js + PostgreSQL)

### ۱) ساخت دیتابیس
در cPanel → **PostgreSQL Databases**:
- دیتابیس `h301194_app` و کاربر `h301194_app` را بسازید (اگر از قبل نیست) و کاربر را با همهٔ دسترسی‌ها به دیتابیس بیفزایید.

### ۲) آپلود فایل‌ها
کل پوشهٔ `backend/` و `db/` را در مسیر اپ (مثلاً `~/app`) آپلود کنید.

### ۳) تنظیمات
فایل `backend/.env.production` را به `backend/.env` تغییر نام دهید. مقادیر دیتابیس و دامنه از قبل پر شده‌اند.
> اگر هاست برای Postgres از هاست/سوکت دیگری استفاده می‌کند، `PGHOST`/`DATABASE_URL` را مطابق آن اصلاح کنید.

### ۴) ساخت اپ Node در cPanel
بخش **Setup Node.js App**:
- Application root: `app`
- Application URL: `app.yousefipour.ir`
- Application startup file: `backend/src/server.js`
- نسخهٔ Node: ۱۸ یا بالاتر
سپس روی **Run NPM Install** بزنید (یا در ترمینال: `cd ~/app/backend && npm install`).

### ۵) نصب اولیه (ساخت جداول و حساب‌ها)
در ترمینال cPanel:
```
cd ~/app/backend
node scripts/install_prod.js
```
این کار جداول را می‌سازد، حساب مدیرکل (از `.env`) و ۶۸ حساب پرسنل (رمز ۱۲۳۴۵۶) را ایجاد می‌کند.
> جایگزین: می‌توانید به‌جای این مرحله، پس از اجرای اپ به `https://app.yousefipour.ir/install` بروید و ویزارد وب را کامل کنید.

### ۶) اجرا و دامنه
- اپ را از **Setup Node.js App** ری‌استارت کنید (Passenger آن را روی دامنه سرو می‌کند).
- **HTTPS:** در cPanel → **SSL/TLS Status** گزینهٔ AutoSSL را برای `app.yousefipour.ir` فعال کنید.
- بررسی سلامت: `https://app.yousefipour.ir/health` باید `{"ok":true}` بدهد.
- پنل مدیریت: `https://app.yousefipour.ir/`
- مستندات API: `https://app.yousefipour.ir/docs.html`

### ۷) ورود اطلاعات اکسل
پس از نصب، از پنل → «ورود اطلاعات (اکسل)» یا در ترمینال:
```
cd ~/app/backend
DATABASE_URL="$(grep ^DATABASE_URL .env | cut -d= -f2-)" \
  python3 scripts/import_excel.py lines "/path/گزارش_اطلاعات_خط.xlsx"
```
(برای تست بدون فایل‌های بزرگ: `node scripts/seed_demo.js`)

### ۸) اپ موبایل
در `mobile/.env`:
```
API_BASE=https://app.yousefipour.ir/api
```
سپس `eas build -p android --profile preview`.

---

## حالت‌های جایگزین

### اگر هاست Node ندارد یا فقط MySQL است
- **گزینهٔ ۱ (توصیه‌شده):** یک **VPS** کوچک بگیرید و از `deploy/docker-compose.prod.yml` استفاده کنید (Node + PostgreSQL + Nginx + HTTPS + بکاپ، همه آماده). دامنهٔ `app.yousefipour.ir` را به IP سرور اشاره دهید.
- **گزینهٔ ۲:** اگر باید حتماً روی همین هاست با **MySQL** اجرا شود، بک‌اند باید از PostgreSQL به MySQL منتقل شود (تغییر درایور و کوئری‌ها). این کار شدنی است؛ در صورت نیاز انجامش می‌دهم.

### نکتهٔ DNS
برای `app.yousefipour.ir` یک رکورد A (به IP هاست/سرور) یا اگر ساب‌دامین cPanel است، آن را در **Subdomains** بسازید و به پوشهٔ اپ متصل کنید.

---

## ✅ نسخهٔ PHP + MySQL آماده شد (مخصوص همین هاست)
چون هاست شما PHP/MySQL است، نسخهٔ سازگار در پوشهٔ **`php/`** ساخته شد و **توصیه‌شده** همین است.
- راهنمای کامل: `php/README.md`
- خلاصه: دیتابیس `h301194_app` را بسازید → پوشهٔ `php/` را آپلود کنید → docroot ساب‌دامین را به `php/public` بدهید → به `https://app.yousefipour.ir/install.php` بروید → AutoSSL را روشن کنید.
- پنل: `/` — وب‌اپ موبایل بدون APK: **`/app`** — مستندات: `/docs.html`

نسخهٔ Node/Postgres (`backend/`) برای زمانی است که VPS داشته باشید؛ روی هاست اشتراکی از نسخهٔ PHP استفاده کنید.
