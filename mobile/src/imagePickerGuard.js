// سازگاری با ارجاع‌های قدیمی.
// در نسخه‌های قبلی توابع expo-image-picker در زمان شروع برنامه monkey-patch می‌شدند.
// این کار روی بعضی نسخه‌های Hermes و Android 9/10 می‌توانست باعث کرش شروع شود.
// اکنون همهٔ فراخوانی‌ها باید از cameraLock.js انجام شوند و این تابع عمداً no-op است.
export function installImagePickerLockGuard() {
  return false;
}
