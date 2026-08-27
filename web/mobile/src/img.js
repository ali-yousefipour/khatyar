import * as ImageManipulator from 'expo-image-manipulator';

// تنظیمات فشرده‌سازی که از سرور (app-config) خوانده می‌شود
// quality: درصد (۱۰..۱۰۰) — maxWidth: پیکسل
let IMG_CFG = { quality: 45, maxWidth: 1024 };

// به‌روزرسانی تنظیمات از app-config (مقادیر سرور درصد هستند؛ به نسبت ۰..۱ تبدیل می‌شوند)
export function setImageConfig(cfg) {
  if (!cfg) return;
  if (cfg.image_quality != null) {
    const q = Number(cfg.image_quality);
    if (!isNaN(q) && q >= 10 && q <= 100) IMG_CFG.quality = q;
  }
  if (cfg.image_max_width != null) {
    const w = Number(cfg.image_max_width);
    if (!isNaN(w) && w >= 240 && w <= 4096) IMG_CFG.maxWidth = w;
  }
}
export function getImageConfig() { return { ...IMG_CFG }; }

// نسبت کیفیت ۰..۱ از درصد سرور (با امکان override موضعی)
function resolveQuality(override) {
  if (override != null) return override > 1 ? override / 100 : override;
  return IMG_CFG.quality / 100;
}
function resolveWidth(override) {
  return override != null ? override : IMG_CFG.maxWidth;
}

// فشرده‌سازی و کوچک‌کردن تصویر برای کاهش حجم بارگذاری
// خروجی: رشتهٔ data:image/jpeg;base64 با حجم بسیار کمتر
// اگر maxW/quality داده نشود، از تنظیمات سرور استفاده می‌شود
//
// نکتهٔ سازگاری: روی برخی گوشی‌ها (به‌خصوص مدل‌های جدید با دوربین بسیار پرمگاپیکسل،
// مثل بسیاری از گوشی‌های اندروید ۱۶) پردازش تصویر با ابعاد/تنظیمات پیش‌فرض ممکن است
// به دلیل فشار حافظه ناموفق شود. در این حالت به‌جای شکست کامل، یک تلاش دوم با ابعاد و
// کیفیت بسیار محافظه‌کارانه‌تر انجام می‌شود که احتمال موفقیتش بسیار بیشتر است.
export async function compressToDataUri(uri, { maxW, quality } = {}) {
  const attempt = async (w, q) => {
    const res = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: w } }],
      { compress: q, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return 'data:image/jpeg;base64,' + res.base64;
  };
  try {
    return await attempt(resolveWidth(maxW), resolveQuality(quality));
  } catch (e) {
    // تلاش دوم با ابعاد/کیفیت بسیار کمتر (محافظه‌کارانه) تا احتمال شکست به دلیل فشار حافظه کم شود
    try {
      const safeW = Math.min(resolveWidth(maxW), 800);
      const safeQ = Math.min(resolveQuality(quality), 0.5);
      return await attempt(safeW, safeQ);
    } catch (e2) {
      return null;
    }
  }
}

// فشرده‌سازی تصویر و بازگرداندن URI فایل فشرده‌شده (برای آپلود multipart)
export async function compressToFile(uri, { maxW, quality } = {}) {
  try {
    const res = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: resolveWidth(maxW) } }],
      { compress: resolveQuality(quality), format: ImageManipulator.SaveFormat.JPEG }
    );
    return res.uri;
  } catch (e) {
    return uri;
  }
}
