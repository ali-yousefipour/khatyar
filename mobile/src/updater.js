import { Alert, DeviceEventEmitter, NativeModules } from 'react-native';
import { currentVersion, checkVersion, validateUpdateUrl } from './update';

const { KhatyarUpdater } = NativeModules;

function normalizeSha256(value) {
  const sha = String(value || '').trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(sha) ? sha : '';
}

export { currentVersion };

export async function downloadAndInstallUpdate(info) {
  if (!info?.url) throw new Error('آدرس فایل به‌روزرسانی در سرور تنظیم نشده است.');
  const expectedSha256 = normalizeSha256(info.apkSha256 || info.apk_sha256 || info.sha256);
  if (!validateUpdateUrl(info.url, expectedSha256)) {
    throw new Error('لینک دانلود APK معتبر نیست؛ لینک باید HTTPS باشد و میزبان‌های غیررسمی نیاز به SHA-256 دارند.');
  }
  if (!KhatyarUpdater?.downloadApk) throw new Error('ماژول دانلود و نصب درون‌برنامه‌ای در این نسخه موجود نیست.');
  const fileName = `KhatYar-v${String(info.latest || 'update').replace(/[^0-9A-Za-z._-]/g, '_')}.apk`;
  return KhatyarUpdater.downloadApk(info.url, fileName, expectedSha256);
}

export function subscribeUpdaterEvents(handlers = {}) {
  const names = [
    ['khatyarUpdaterProgress', handlers.onProgress],
    ['khatyarUpdaterComplete', handlers.onComplete],
    ['khatyarUpdaterInstallStarted', handlers.onInstallStarted],
    ['khatyarUpdaterInstallPermission', handlers.onInstallPermission],
    ['khatyarUpdaterInstallError', handlers.onInstallError],
    ['khatyarUpdaterError', handlers.onError],
  ];
  const subs = names.filter(([, fn]) => typeof fn === 'function').map(([name, fn]) => DeviceEventEmitter.addListener(name, fn));
  return () => subs.forEach((s) => { try { s.remove(); } catch (_) {} });
}

export async function checkForUpdate(userInitiated = false) {
  const info = await checkVersion();
  if (!info.hasUpdate && !info.required) {
    if (userInitiated) Alert.alert('بررسی به‌روزرسانی', `نسخه ${info.current} آخرین نسخه نصب‌شده است.`);
    return info;
  }
  if (!userInitiated) return info; // Forced updates are rendered by App's UpdateScreen.
  const message = `نسخه فعلی: ${info.current}\nآخرین نسخه: ${info.latest}` +
    (info.required ? '\nاین به‌روزرسانی اجباری است.' : '') +
    (info.notes ? `\n\nتغییرات نسخه:\n${info.notes}` : '');
  if (!info.url) {
    Alert.alert('به‌روزرسانی', message + '\n\nلینک APK در تنظیمات سرور وجود ندارد یا معتبر نیست.');
    return info;
  }
  Alert.alert('نسخه جدید خطیار', message, [
    { text: 'بعداً', style: 'cancel' },
    { text: 'دانلود و نصب', onPress: () => downloadAndInstallUpdate(info).catch(error =>
      Alert.alert('خطای دانلود', error?.message || 'دریافت فایل APK انجام نشد.')) },
  ]);
  return info;
}
