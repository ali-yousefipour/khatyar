import * as Application from 'expo-application';
import { request } from './api';

const TRUSTED_UPDATE_HOST = 'app.yousefipour.ir';
const TRUSTED_GITHUB_RAW_HOST = 'raw.githubusercontent.com';
const TRUSTED_GITHUB_RAW_PREFIX = '/ali-yousefipour/khatyar/main/mobile/release/';

function validateUpdateUrl(value) {
  try {
    const u = new URL(String(value));
    const host = u.hostname.toLowerCase();
    const portOk = !u.port || u.port === '443';
    if (u.protocol !== 'https:' || !portOk) return false;
    if (host === TRUSTED_UPDATE_HOST) return true;
    return host === TRUSTED_GITHUB_RAW_HOST &&
      u.pathname.startsWith(TRUSTED_GITHUB_RAW_PREFIX) &&
      /^khatyar-[0-9]+\\.[0-9]+\\.[0-9]+\\.apk$/.test(u.pathname.slice(TRUSTED_GITHUB_RAW_PREFIX.length));
  } catch (_) {
    return false;
  }
}

export function currentVersion() {
  return Application.nativeApplicationVersion || '0.0.0';
}

function cmp(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export async function checkVersion() {
  const current = currentVersion();
  try {
    const d = await request('/app/version', { auth: false, noStore: true });
    const latest = d.latest_version || current;
    const min = d.min_version || '0.0.0';
    const url = d.apk_url || '';
    const apkSha256 = d.apk_sha256 || d.sha256 || '';
    const validUrl = !url || validateUpdateUrl(url);
    const hasUpdate = cmp(latest, current) > 0;
    // حداقل نسخه اجباری قبلی حفظ شده است؛ هر نسخه جدید نیز از همین صفحه درون‌برنامه‌ای دریافت می‌شود.
    const required = cmp(current, min) < 0 || hasUpdate;
    if (hasUpdate && !validUrl) return { required: true, hasUpdate: true, latest, min, url: '', apkSha256: '', current };
    return { required, hasUpdate, latest, min, url, apkSha256, current };
  } catch (e) {
    return { required: false, hasUpdate: false, latest: current, url: '', apkSha256: '', current };
  }
}
