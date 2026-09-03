import { Alert, DeviceEventEmitter, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { request } from './api';

const { KhatyarUpdater } = NativeModules;

export function currentVersion() {
  return Constants.expoConfig?.version || '0.0.0';
}

function isNewer(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

export async function downloadAndInstallUpdate(info) {
  if (!info?.url) throw new Error('آدرس فایل به‌روزرسانی در سرور تنظیم نشده است.');
  if (!KhatyarUpdater?.downloadApk) throw new Error('ماژول دانلود و نصب درون‌برنامه‌ای در این نسخه موجود نیست.');
  const fileName = `KhatYar-v${String(info.latest || 'update').replace(/[^0-9A-Za-z._-]/g, '_')}.apk`;
  return KhatyarUpdater.downloadApk(info.url, fileName);
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
  try {
    const info = await request('/app/version', { auth: false, noStore: true });
    const latest = info?.latest_version || info?.app_version || currentVersion();
    const apkUrl = info?.apk_url || '';
    const cur = currentVersion();
    if (!latest) {
      if (userInitiated) Alert.alert('بروزرسانی', 'اطلاعات نسخه از سرور دریافت نشد.');
      return null;
    }
    if (isNewer(latest, cur)) {
      return { latest, current: cur, url: apkUrl, required: false };
    }
    if (userInitiated) Alert.alert('بروزرسانی', 'شما از آخرین نسخه استفاده می‌کنید.');
    return { latest, current: cur, url: apkUrl, required: false };
  } catch (e) {
    if (userInitiated) Alert.alert('خطا', 'بررسی بروزرسانی ناموفق بود.');
    return null;
  }
}
