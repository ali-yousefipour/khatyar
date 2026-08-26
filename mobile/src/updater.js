/**
 * سیستم آپدیت درون‌برنامه‌ای — سازگار با ایران (بدون expo-updates / EAS)
 *
 * چون سرویس EAS Update اکسپو از ایران در دسترس نیست و حتی نصب پکیج expo-updates
 * هم با خطای شبکه مواجه می‌شود، از روش ساده و مطمئن استفاده می‌کنیم:
 * اپ نسخهٔ فعلی را با نسخهٔ موجود روی سرور خودی مقایسه می‌کند و در صورت وجود
 * نسخهٔ جدید، لینک دانلود APK را به کاربر نشان می‌دهد تا نصب کند.
 *
 * این روش به هیچ سرویس خارجی (که در ایران بلاک باشد) وابسته نیست.
 */
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { request } from './api';

export function currentVersion() {
  return Constants.expoConfig?.version || '—';
}

/**
 * بررسی نسخهٔ جدید از سرور خودی.
 * @param {boolean} userInitiated - اگر کاربر دستی بزند، حتی نبودن آپدیت هم اعلام شود.
 */
export async function checkForUpdate(userInitiated = false) {
  try {
    const info = await request('/app/version', { auth: false, noStore: true });
    const latest = info?.latest_version || info?.app_version;
    const apkUrl = info?.apk_url;
    const cur = currentVersion();
    if (!latest) {
      if (userInitiated) Alert.alert('بروزرسانی', 'اطلاعات نسخه از سرور دریافت نشد.');
      return;
    }
    if (isNewer(latest, cur)) {
      Alert.alert(
        '🔄 نسخهٔ جدید موجود است',
        `نسخهٔ ${latest} منتشر شده (نسخهٔ فعلی شما: ${cur}).\nبرای دریافت، فایل نصب جدید را دانلود کنید.`,
        apkUrl
          ? [
              { text: 'بعداً', style: 'cancel' },
              { text: 'دانلود نسخهٔ جدید', onPress: () => Linking.openURL(apkUrl).catch(() => {}) },
            ]
          : [{ text: 'باشه' }]
      );
    } else if (userInitiated) {
      Alert.alert('بروزرسانی', 'شما از آخرین نسخه استفاده می‌کنید.');
    }
  } catch (e) {
    if (userInitiated) Alert.alert('خطا', 'بررسی بروزرسانی ناموفق بود.');
  }
}

// مقایسهٔ نسخه‌ها به‌صورت عددی (مثلاً 0.5.18 > 0.5.17)
function isNewer(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
