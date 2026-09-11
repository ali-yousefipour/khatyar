/* خطیار: کنترل باز/بسته‌کردن منوی کشویی سفارشی (جایگزین Drawer.Navigator کتابخانه‌ای).
   دلیل وجود این فایل: پس از چند تلاش، مشخص شد ترکیب نسخهٔ فعلی @react-navigation/drawer با
   react-native-reanimated 4.x / حالت New Architecture این پروژه باعث می‌شود پنل کشویی همیشه در
   یک حالت نیمه‌باز/چسبیده به‌جای بسته یا کاملاً باز رندر شود — مستقل از تنظیمات RTL یا GestureHandlerRootView.
   برای رفع قطعی، به‌جای آن کامپوننت کتابخانه‌ای، از یک اورلی کاملاً سفارشی (در App.js) استفاده شده که
   وضعیت باز/بسته را مستقیماً و ساده با useState مدیریت می‌کند و هیچ وابستگی‌ای به منطق داخلی/انیمیشنِ
   آن کتابخانه ندارد. این فایل فقط پُلی است تا کدهایی که قبلاً navigation.dispatch(DrawerActions.openDrawer())
   صدا می‌زدند (مثل هدر سفارشی داشبورد)، بتوانند بدون نیاز به navigation prop، منو را باز کنند. */
let ref = null;
export function setDrawerControlRef(r) { ref = r; }
export function openDrawer() { try { ref && ref.open && ref.open(); } catch (e) {} }
export function closeDrawer() { try { ref && ref.close && ref.close(); } catch (e) {} }
