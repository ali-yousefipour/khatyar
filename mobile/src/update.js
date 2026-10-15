import * as Application from 'expo-application';
import { request } from './api';

const TRUSTED_UPDATE_HOST = 'app.yousefipour.ir';
const TRUSTED_GITHUB_RELEASE_HOST = 'github.com';
const TRUSTED_GITHUB_RAW_HOST = 'raw.githubusercontent.com';
const TRUSTED_GITHUB_RAW_PREFIXES = [
  '/ali-yousefipour/khatyar/main/mobile/release/',
  '/ali-yousefipour/khatyar-releases/main/',
];

function validateUpdateUrl(value) {
  try {
    const u = new URL(String(value));
    const host = u.hostname.toLowerCase();
    const portOk = !u.port || u.port === '443';
    if (u.protocol !== 'https:' || !portOk) return false;
    if (host === TRUSTED_UPDATE_HOST) return true;
    if (host === TRUSTED_GITHUB_RELEASE_HOST) {
      return /^\/ali-yousefipour\/khatyar\/releases\/(?:latest\/download|download\/v\d+\.\d+\.\d+)\/khatyar\.apk$/.test(u.pathname);
    }
    if (host !== TRUSTED_GITHUB_RAW_HOST) return false;
    return TRUSTED_GITHUB_RAW_PREFIXES.some(prefix =>
      u.pathname.startsWith(prefix) &&
      /^khatyar-[0-9]+\.[0-9]+\.[0-9]+\.apk$/.test(u.pathname.slice(prefix.length))
    );
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
    // Only the backend-configured minimum version may block use. A newer latest_version is optional.
    const required = cmp(current, min) < 0;
    // A bad/missing optional APK link must never turn an optional update into a forced one.
    return { required, hasUpdate, latest, min, url: validUrl ? url : '', apkSha256: validUrl ? apkSha256 : '', current };
  } catch (e) {
    return { required: false, hasUpdate: false, latest: current, url: '', apkSha256: '', current };
  }
}
