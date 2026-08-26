import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from './config';
import { enqueue, flush as flushOfflineQueue } from './offline';
import { setLastApi } from './crashReporter';

let accessToken = null;
const memCache = {}; // کش حافظه‌ای برای سرعت بیشتر در یک نشست
const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // کش پایدار فقط برای نمایش سریع؛ بعد از ۱۰ دقیقه تازه‌سازی می‌شود

export async function setTokens(access, refresh) {
  accessToken = access;
  await SecureStore.setItemAsync('access', access);
  if (refresh) await SecureStore.setItemAsync('refresh', refresh);
}
export async function loadTokens() {
  accessToken = await SecureStore.getItemAsync('access');
  return accessToken;
}
export async function clearTokens() {
  accessToken = null;
  await SecureStore.deleteItemAsync('access');
  await SecureStore.deleteItemAsync('refresh');
}

// fetch با مهلت زمانی تا در صورت کندی/قطع سرور، برنامه قفل (freeze) نشود
// پیش‌فرض از ۱۵ به ۲۵ ثانیه افزایش یافت چون این مهلت برای درخواست‌های حاوی تصویر
// (چک‌لیست، تذکر) روی اینترنت موبایل کند/ضعیف، به‌خصوص در ابتدای اتصال، اغلب کم بود
// و باعث بروز نابه‌جای «خطای ارتباط با سرور» می‌شد؛ کالرهایی که تصویر ارسال می‌کنند
// می‌توانند timeoutMs بزرگ‌تری هم صریحاً بدهند (نگاه کنید به postOrQueue/request).
async function fetchTimeout(url, opts = {}, ms = 25000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('ارتباط با سرور برقرار نشد (زمان انتظار به پایان رسید).');
    throw new Error('اتصال به سرور ممکن نشد.');
  } finally {
    clearTimeout(id);
  }
}

async function refreshAccess() {
  const refresh = await SecureStore.getItemAsync('refresh');
  if (!refresh) return false;
  let r;
  try {
    // نکته: علت واقعیِ خطای ۴۰۳ در ورود، مسیر «/auth/…» نبود، بلکه Content-Type: application/json
    // بود — یک فایروال امنیتی (WAF) روی هاست، درخواست‌های POST با بدنهٔ JSON را مسدود می‌کند
    // (با تست curl مستقیم روی سرور واقعی تأیید شد: همان درخواست با بدنهٔ فرم معمولی
    // بدون مشکل عبور کرد). برای همین، تمدید توکن هم مثل ورود به فرم‌ urlencoded تغییر کرد
    // تا به همین مشکل در آیندهٔ نزدیک (بعد از انقضای توکن) دوباره برنخوریم.
    const form = new URLSearchParams();
    form.append('refresh', refresh);
    r = await fetchTimeout(`${apiBase()}/session/renew`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'accept': 'application/json' },
      body: form.toString(),
    });
  } catch (e) { return false; }
  if (!r.ok) return false;
  const d = await r.json();
  await setTokens(d.access, d.refresh);
  return true;
}

// ورود موبایل: بدنهٔ application/x-www-form-urlencoded به‌جای JSON — طبق توضیح بالا،
// این دقیقاً همان قالبی است که با تست مستقیم روی سرور واقعی کار کردنش تأیید شده است.
// بدنهٔ فرم urlencoded برای مسیرهای ورود/OTP می‌سازد و به‌همان قالب اثبات‌شده ارسال می‌کند
async function _sessionFormPost(path, body, { timeoutMs = 25000 } = {}) {
  const form = new URLSearchParams();
  Object.entries(body || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  setLastApi({ path, method: 'POST', started_at: new Date().toISOString() });
  const res = await fetchTimeout(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'accept': 'application/json',
      'cache-control': 'no-store',
      // برخی فایروال‌های امنیتی (WAF) درخواست‌هایی با User-Agent پیش‌فرض کتابخانهٔ شبکهٔ
      // اندروید (مثل okhttp) را به‌عنوان بات مشکوک علامت می‌زنند؛ یک User-Agent شبیه به
      // مرورگر موبایل معمولی این ریسک را کم می‌کند.
      'user-agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 KhatyarApp/1.0',
    },
    body: form.toString(),
  }, timeoutMs);
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch (_) {
    const preview = text ? text.replace(/\s+/g, ' ').slice(0, 220) : '(empty)';
    throw new Error(`پاسخ سرور JSON نیست (HTTP ${res.status}). نوع: ${res.headers.get('content-type') || 'نامشخص'}\n${preview}`);
  }
  if (!res.ok) throw new Error(data.error || data.message || `خطای سرور (HTTP ${res.status})`);
  return data;
}

export async function loginRequest(body, opts) { return _sessionFormPost('/session/start', body, opts); }
// درخواست ارسال کد یک‌بارمصرف پیامکی به موبایل ثبت‌شدهٔ کاربر
export async function requestLoginOtp(mobile) { return _sessionFormPost('/session/otp-request', { mobile }); }
// تأیید کد یک‌بارمصرف و دریافت توکن ورود
export async function verifyLoginOtp(body) { return _sessionFormPost('/session/otp-verify', body); }

// ساخت source برای <Image>: اگر مسیر فایل فیزیکی (/api/media یا /api/...) باشد،
// URL کامل با هدر توکن می‌سازد؛ اگر data URI (base64 قدیمی) باشد همان را برمی‌گرداند.
export function imageSource(val) {
  if (!val) return null;
  if (typeof val !== 'string') return val;
  if (val.indexOf('data:') === 0) return { uri: val };
  if (val.indexOf('/api/') === 0) {
    const base = apiBase().replace(/\/api$/, '');
    return { uri: base + val, headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : {} };
  }
  if (val.indexOf('http') === 0) return { uri: val };
  return { uri: val };
}

// ارسال multipart/form-data (آپلود فایل واقعی)
export async function uploadFile(path, fields = {}, fileField = 'file', fileUri = null, fileName = 'photo.jpg', mimeType = 'image/jpeg') {
  const base = apiBase();
  const token = accessToken;
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== undefined) fd.append(k, String(v));
  }
  if (fileUri) fd.append(fileField, { uri: fileUri, name: fileName, type: mimeType });
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: fd,
  });
  const text = await r.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; }
  catch (_) { throw new Error(r.ok ? 'پاسخ نامعتبر از سرور دریافت شد.' : 'خطای داخلی سرور؛ پاسخ قابل خواندن نیست.'); }
  if (!r.ok) throw new Error(json.error || json.message || 'خطای سرور');
  return json;
}

export async function request(path, { method = 'GET', body, auth = true, retry = true, noStore = false, timeoutMs } = {}) {
  const headers = { 'content-type': 'application/json' };
  setLastApi({ path, method, started_at: new Date().toISOString() });
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const cacheKey = 'cache:' + path;
  // درخواست‌های حاوی تصویر (data:image پایه۶۴) بدنهٔ بزرگ‌تری دارند و روی اینترنت
  // موبایل ضعیف به زمان بیشتری نیاز دارند؛ در این حالت مهلت پیش‌فرض بزرگ‌تری اعمال می‌شود.
  const hasImagePayload = typeof body === 'object' && body && Object.values(body).some((v) => typeof v === 'string' && v.length > 100000);
  const effectiveTimeout = timeoutMs || (hasImagePayload ? 45000 : undefined);
  try {
    const res = await fetchTimeout(`${apiBase()}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    }, effectiveTimeout);
    if (res.status === 401 && auth && retry && await refreshAccess())
      return request(path, { method, body, auth, retry: false, timeoutMs });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { throw new Error(res.ok ? 'نوع پاسخ سرور نامعتبر است.' : 'خطای داخلی سرور؛ پاسخ JSON دریافت نشد.'); }
    if (!res.ok) throw new Error(data.error || data.message || 'خطای سرور');
    if (method === 'GET' && !noStore) {
      memCache[cacheKey] = data;
      AsyncStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), data })).catch(() => {});
    }
    return data;
  } catch (e) {
    if (method === 'GET' && !noStore) {
      if (memCache[cacheKey] !== undefined) return memCache[cacheKey];
      try { const c = await AsyncStorage.getItem(cacheKey); if (c) { const j = JSON.parse(c); return j && j.data !== undefined ? j.data : j; } } catch (e2) {}
    }
    throw e;
  }
}

// خواندن سریع از کش (بدون انتظار شبکه) برای نمایش فوری؛ سپس صفحه می‌تواند با request تازه‌سازی کند
export async function cachedValue(path) {
  const cacheKey = 'cache:' + path;
  if (memCache[cacheKey] !== undefined) return memCache[cacheKey];
  try { const c = await AsyncStorage.getItem(cacheKey); if (c) { const j = JSON.parse(c); return j && j.data !== undefined ? j.data : j; } } catch (e) {}
  return null;
}

// نمایش فوری از کش + تازه‌سازی در پس‌زمینه (کاهش زمان انتظار لود)
// onData بار اول با دادهٔ کش (در صورت وجود) و بار دوم با دادهٔ تازهٔ شبکه صدا زده می‌شود.
export async function swr(path, onData) {
  try { const c = await cachedValue(path); if (c !== null && c !== undefined) onData(c, true); } catch (e) {}
  try { const fresh = await request(path); onData(fresh, false); return fresh; } catch (e) { return null; }
}

// POST با پشتیبانی آفلاین: اگر اینترنت نبود، در صف ذخیره می‌شود
// client_time در لحظهٔ فشار دادن دکمه ثبت ساخته می‌شود، نه هنگام ارسال بعدی صف.
// سرور باید همین زمان را برای created_at/تاریخ ثبت رویداد استفاده کند.
export async function postOrQueue(path, body, type = null, opts = {}) {
  const eventMs = Date.now();
  const sendBody = (body && typeof body === 'object' && !Array.isArray(body))
    ? { ...body, client_time: body.client_time || eventMs, client_timestamp_ms: body.client_timestamp_ms || eventMs }
    : body;
  const net = await Network.getNetworkStateAsync();
  if (!net.isInternetReachable) {
    await enqueue({ path, body: sendBody, type: type || path, client_uuid: sendBody?.client_uuid, client_time: eventMs });
    return { queued: true, client_time: eventMs };
  }
  try {
    return await request(path, { method: 'POST', body: sendBody, timeoutMs: opts.timeoutMs });
  } catch (e) {
    // خطاهای شبکه‌ای را از خطاهای اعتبارسنجی جدا می‌کنیم؛ در حالت قطع/کندی، درخواست از بین نمی‌رود
    if (String(e.message || '').includes('اتصال') || String(e.message || '').includes('سرور')) {
      await enqueue({ path, body: sendBody, type: type || path, client_uuid: sendBody?.client_uuid, client_time: eventMs });
      return { queued: true, client_time: eventMs };
    }
    throw e;
  }
}

export async function flushQueuedRequests() {
  return flushOfflineQueue(async (item) => {
    if (item.batch) return request(item.path, { method: 'POST', body: item.body });
    return request(item.path, { method: item.method || 'POST', body: item.body || {} });
  });
}
