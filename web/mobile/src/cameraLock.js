import * as ImagePicker from 'expo-image-picker';

// لایهٔ امن و مشترک دوربین/گالری.
// از تغییر مستقیم توابع expo-image-picker خودداری می‌کند؛ این موضوع برای Hermes و
// دستگاه‌های قدیمی‌تر (به‌ویژه Android 9/10) ضروری است.
let suppressDepth = 0;
let releaseTimer = null;

function beginSuppress() {
  suppressDepth += 1;
  global.__APPLOCK_SUPPRESS__ = true;
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
}

function endSuppress(delay = 1200) {
  suppressDepth = Math.max(0, suppressDepth - 1);
  if (suppressDepth > 0) return;
  releaseTimer = setTimeout(() => {
    if (suppressDepth === 0) global.__APPLOCK_SUPPRESS__ = false;
    releaseTimer = null;
  }, delay);
}

async function safeLaunch(method, options = {}) {
  beginSuppress();
  try {
    const fn = ImagePicker?.[method];
    if (typeof fn !== 'function') {
      throw new Error(`image_picker_method_unavailable:${method}`);
    }
    const result = await fn(options || {});
    // خروجی لغوشده را نیز همیشه با ساختار قابل پیش‌بینی برمی‌گردانیم.
    return result || { canceled: true, assets: null };
  } catch (error) {
    console.warn(`[cameraLock] ${method} failed`, error?.message || error);
    throw error;
  } finally {
    endSuppress();
  }
}

export function launchCamera(options = {}) {
  return safeLaunch('launchCameraAsync', options);
}

export function launchLibrary(options = {}) {
  return safeLaunch('launchImageLibraryAsync', options);
}

// برای Intentها و بخش‌های دیگری که موقتاً برنامه را inactive می‌کنند.
export function suppressLock(ms = 1500) {
  beginSuppress();
  setTimeout(() => endSuppress(0), Math.max(0, Number(ms) || 0));
}

export { ImagePicker };
