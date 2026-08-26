import * as Application from 'expo-application';
import { request } from './api';

// نسخهٔ فعلی نصب‌شدهٔ اپ (از app.config.js → version)
export function currentVersion() {
  return Application.nativeApplicationVersion || '0.0.0';
}

// مقایسهٔ نسخه‌های نیم‌ه‌ای (مثل 1.2.0)
function cmp(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// بررسی نسخه با سرور. خروجی: { required, latest, url, current }
export async function checkVersion() {
  const current = currentVersion();
  try {
    const d = await request('/app/version', { auth: false, noStore: true });
    const latest = d.latest_version || current;
    const min = d.min_version || '0.0.0';
    const url = d.apk_url || '';
    // اگر نسخهٔ فعلی از حداقلِ مجاز پایین‌تر باشد، به‌روزرسانی اجباری است
    const required = cmp(current, min) < 0;
    const hasUpdate = cmp(latest, current) > 0;
    return { required, hasUpdate, latest, min, url, current };
  } catch (e) {
    // در صورت خطا/آفلاین، مانع ورود نمی‌شویم
    return { required: false, hasUpdate: false, latest: current, url: '', current };
  }
}
