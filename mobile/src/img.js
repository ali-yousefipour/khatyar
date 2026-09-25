import * as ImageManipulator from 'expo-image-manipulator';

// تنظیمات تصویر از app-config سایت؛ هیچ تنظیم مستقلی برای سرویس مدارس وجود ندارد.
let IMG_CFG = { quality: 45, maxWidth: 1024, maxHeight: 1920, maxBytes: 0 };

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
  if (cfg.image_max_height != null) {
    const h = Number(cfg.image_max_height);
    if (!isNaN(h) && h >= 240 && h <= 4096) IMG_CFG.maxHeight = h;
  }
  const rawBytes = cfg.image_max_bytes ?? cfg.image_max_size ?? cfg.max_image_bytes ?? cfg.max_image_size ?? cfg.image_max_kb;
  if (rawBytes != null) {
    let b = Number(rawBytes);
    if (b > 0 && b < 10000) b *= 1024;
    if (!isNaN(b) && b >= 64 * 1024) IMG_CFG.maxBytes = b;
  }
}
export function getImageConfig() { return { ...IMG_CFG }; }

function resolveQuality(override) {
  if (override != null) return override > 1 ? override / 100 : override;
  return IMG_CFG.quality / 100;
}
function resolveWidth(override) {
  return override != null ? Number(override) : IMG_CFG.maxWidth;
}
function resolveHeight(override) {
  return override != null ? Number(override) : IMG_CFG.maxHeight;
}

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
  } catch (_) {
    try {
      return await attempt(Math.min(resolveWidth(maxW), 800), Math.min(resolveQuality(quality), 0.5));
    } catch (_) {
      return null;
    }
  }
}

// تنها نقطه فشرده‌سازی موبایل. ImagePicker نباید قبل از این تابع JPEG را دوباره encode کند.
// اگر maxW/maxH/source dimensions داده شوند، هر دو سقف ابعاد سایت رعایت می‌شوند.
export async function compressToFile(uri, { maxW, maxH, quality, maxBytes, sourceWidth, sourceHeight } = {}) {
  const targetBytes = Number(maxBytes || IMG_CFG.maxBytes || 0);
  const configuredW = Number(resolveWidth(maxW));
  const configuredH = Number(resolveHeight(maxH));
  let w = configuredW;

  const sw = Number(sourceWidth || 0);
  const sh = Number(sourceHeight || 0);
  if (sw > 0 && sh > 0) {
    const scale = Math.min(1, configuredW / sw, configuredH / sh);
    w = Math.max(240, Math.round(sw * scale));
  }

  let q = Number(resolveQuality(quality));
  const attempts = [];
  for (let i = 0; i < 7; i++) {
    try {
      const res = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: Math.max(240, Math.round(w)) } }],
        {
          compress: Math.max(0.1, Math.min(1, q)),
          format: ImageManipulator.SaveFormat.JPEG
        }
      );
      if (!targetBytes) return res.uri;

      try {
        const info = await (await import('expo-file-system/legacy')).getInfoAsync(res.uri);
        const bytes = Number(info?.size || 0);
        if (!bytes || bytes <= targetBytes) return res.uri;
        attempts.push(res.uri);
      } catch (_) {
        return res.uri;
      }

      q = Math.max(0.1, q * 0.78);
      w = Math.max(240, Math.round(w * 0.88));
    } catch (_) {
      q = Math.max(0.1, q * 0.78);
      w = Math.max(240, Math.round(w * 0.82));
    }
  }

  // در نبود تنظیم maxBytes، یا وقتی encoder نتوانست به سقف برسد، آخرین خروجی
  // پردازش‌شده را برمی‌گردانیم؛ هرگز به تصویر خام دوربین برنمی‌گردیم.
  return attempts[attempts.length - 1] || uri;
}
