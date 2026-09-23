import * as ImageManipulator from 'expo-image-manipulator';

// تنظیمات فشرده‌سازی که از سرور (app-config) خوانده می‌شود
// quality: درصد (۱۰..۱۰۰) — maxWidth: پیکسل
let IMG_CFG = { quality: 45, maxWidth: 1024, maxBytes: 0 };

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
  const rawBytes = cfg.image_max_bytes ?? cfg.image_max_size ?? cfg.max_image_bytes ?? cfg.max_image_size ?? cfg.image_max_kb;
  if (rawBytes != null) { let b=Number(rawBytes); if (b>0 && b<10000) b*=1024; if (!isNaN(b) && b>=64*1024) IMG_CFG.maxBytes=b; }
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
export async function compressToFile(uri, { maxW, quality, maxBytes } = {}) {
  const targetBytes = Number(maxBytes || IMG_CFG.maxBytes || 0);
  let w = Number(resolveWidth(maxW)), q = Number(resolveQuality(quality));
  const attempts = [];
  for (let i=0;i<5;i++) {
    try {
      const res = await ImageManipulator.manipulateAsync(uri,[{ resize:{ width:Math.max(240,Math.round(w)) } }],{compress:Math.max(.1,Math.min(1,q)),format:ImageManipulator.SaveFormat.JPEG});
      if (!targetBytes) return res.uri;
      try {
        const info = await (await import('expo-file-system/legacy')).getInfoAsync(res.uri);
        const bytes = Number(info?.size||0);
        if (!bytes || bytes<=targetBytes) return res.uri;
        attempts.push(res.uri);
      } catch (_) { return res.uri; }
      q=Math.max(.25,q*.75); w=Math.max(640,w*.85);
    } catch (_) {
      q=Math.max(.25,q*.75); w=Math.max(640,w*.75);
    }
  }
  return attempts[attempts.length-1] || uri;
}
