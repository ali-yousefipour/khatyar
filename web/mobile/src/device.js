import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// شناسهٔ پایدار دستگاه (برای اتصال تک‌دستگاهی)
export async function getDeviceId() {
  let id = await SecureStore.getItemAsync('device_id');
  if (!id) {
    try {
      id = (Platform.OS === 'android'
        ? Application.getAndroidId()
        : await Application.getIosIdForVendorAsync()) || null;
    } catch (e) { id = null; }
    if (!id) id = `dev-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await SecureStore.setItemAsync('device_id', id);
  }
  return id;
}

export function getDeviceModel() {
  // از expo-device استفاده می‌کنیم (بدون نیاز به ماژول بومی جداگانه)
  const brand = Device.brand || Device.manufacturer || '';
  const model = Device.modelName || '';
  return `${brand} ${model} ${Platform.OS} ${Platform.Version}`.replace(/\s+/g, ' ').trim();
}

// سیگنال‌های امنیتی که سرور برای اجازهٔ ورود بررسی می‌کند
export async function securitySignals() {
  let vpn_on = false, dev_options_on = false, mock_location = false;
  // تشخیص VPN از طریق نوع شبکهٔ expo-network (وقتی VPN فعال است نوع شبکه VPN گزارش می‌شود)
  try {
    const st = await Network.getNetworkStateAsync();
    if (st && st.type === Network.NetworkStateType.VPN) vpn_on = true;
  } catch (e) {}
  // حالت توسعه‌دهنده از ماژول بومی محلی (در صورت موجود بودن) خوانده می‌شود
  try {
    const SecurityCheck = require('../modules/security-check').default || require('../modules/security-check');
    if (SecurityCheck && typeof SecurityCheck.isDeveloperModeEnabled === 'function') {
      dev_options_on = !!(await SecurityCheck.isDeveloperModeEnabled());
    } else if (SecurityCheck && typeof SecurityCheck.isDeveloperModeEnabledSync === 'function') {
      dev_options_on = !!SecurityCheck.isDeveloperModeEnabledSync();
    }
  } catch (e) { dev_options_on = false; }
  let gpsEnabled = false, granted = false;
  try { gpsEnabled = await Location.hasServicesEnabledAsync(); } catch (e) {}
  try { const fg = await Location.getForegroundPermissionsAsync(); granted = !!fg.granted; } catch (e) {}
  // تشخیص ماک‌لوکیشن: اگر موقعیت فعلی جعلی باشد
  try {
    if (gpsEnabled && granted) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mock_location = !!(pos && (pos.mocked || (pos.coords && pos.coords.mocked)));
    }
  } catch (e) {}
  return { vpn_on, dev_options_on, mock_location, gps_on: gpsEnabled && granted, is_emulator: !Device.isDevice };
}

// آیا موقعیت فعلی جعلی (ماک) است؟ (برای مسدودسازی هنگام ورود)
export async function isMockLocation() {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    const fg = await Location.getForegroundPermissionsAsync();
    if (!enabled || !fg.granted) return false;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return !!(pos && (pos.mocked || (pos.coords && pos.coords.mocked)));
  } catch (e) { return false; }
}

// بررسی سبک VPN برای ارسال همراه هر موقعیت (تشخیص روشن‌شدن فیلترشکن پس از باز شدن برنامه)
// خروجی: { on: bool, country: string|null, reason: string }
// محتاطانه عمل می‌کند تا کاربر واقعی بدون VPN مسدود نشود (false positive کم).
export async function isVpnOn() {
  const r = await vpnStatus();
  return r.on;
}

let _vpnRuntimeState = { positive: 0, negative: 0, on: false };
export async function vpnStatus() {
  let transport = false, expoVpn = false, activeTunnels = [], network = null;
  try {
    const SecurityCheck = require('../modules/security-check').default || require('../modules/security-check');
    if (SecurityCheck && typeof SecurityCheck.getVpnNetworkInfoAsync === 'function') {
      network = await SecurityCheck.getVpnNetworkInfoAsync();
      transport = network?.transportVpn === true;
      activeTunnels = Array.isArray(network?.activeTunnelInterfaces) ? network.activeTunnelInterfaces : [];
    }
  } catch (e) {}
  try {
    const st = await Network.getNetworkStateAsync();
    expoVpn = st && st.type === Network.NetworkStateType.VPN;
  } catch (e) {}
  const count = [transport, expoVpn, activeTunnels.length > 0].filter(Boolean).length;
  const candidate = count >= 2;
  _vpnRuntimeState.positive = candidate ? Math.min(2, _vpnRuntimeState.positive + 1) : 0;
  _vpnRuntimeState.negative = !candidate ? Math.min(2, _vpnRuntimeState.negative + 1) : 0;
  if (_vpnRuntimeState.positive >= 2) _vpnRuntimeState.on = true;
  if (_vpnRuntimeState.negative >= 2) _vpnRuntimeState.on = false;
  const country = await getIpCountry().catch(() => null);
  return {
    on: _vpnRuntimeState.on,
    country,
    reason: _vpnRuntimeState.on ? 'confirmed_multi_signal' : (candidate ? 'awaiting_confirmation' : 'ok'),
    signalCount: count,
    confirmationCount: _vpnRuntimeState.on ? _vpnRuntimeState.positive : _vpnRuntimeState.negative,
    network,
  };
}

// تشخیص کشور IP عمومی کاربر (با کش کوتاه‌مدت). اگر غیر «IR» بود نشانهٔ فیلترشکن است.
let _ipCountryCache = { at: 0, country: null };
export async function getIpCountry() {
  const now = Date.now();
  // کش ۹۰ ثانیه‌ای تا فشار شبکه کم شود
  if (now - _ipCountryCache.at < 90000 && _ipCountryCache.country) return _ipCountryCache.country;
  // چند سرویس سبک برای تشخیص کشور (اولین پاسخ معتبر کافی است)
  const sources = [
    { url: 'https://ipapi.co/country/', parse: (t) => (t || '').trim().slice(0, 2).toUpperCase() },
    { url: 'https://ipwho.is/?fields=country_code', parse: (t) => { try { return (JSON.parse(t).country_code || '').toUpperCase(); } catch { return null; } } },
    { url: 'https://api.country.is/', parse: (t) => { try { return (JSON.parse(t).country || '').toUpperCase(); } catch { return null; } } },
  ];
  // برای کاهش false positive: حداقل دو منبع باید کشور یکسانِ غیرایران بدهند تا «غیرایران» قطعی شود.
  // اگر فقط یک منبع غیرایران گفت ولی منبع دیگر IR یا نامشخص بود، نتیجه را IR (امن) برمی‌گردانیم.
  const results = [];
  for (const src of sources) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(src.url, { signal: ctrl.signal });
      clearTimeout(tm);
      const txt = await res.text();
      const c = src.parse(txt);
      if (c && /^[A-Z]{2}$/.test(c)) results.push(c);
    } catch (e) { /* سرویس بعدی */ }
    if (results.length >= 2) break; // دو پاسخ کافی است
  }
  if (results.length === 0) return null; // هیچ سرویسی پاسخ نداد → نامشخص (VPN فرض نمی‌شود)
  if (results.includes('IR')) { _ipCountryCache = { at: now, country: 'IR' }; return 'IR'; }
  // اگر همهٔ پاسخ‌ها یکسان و غیرایران بودند → قطعی
  const allSame = results.every((c) => c === results[0]);
  if (allSame) { _ipCountryCache = { at: now, country: results[0] }; return results[0]; }
  // پاسخ‌های متناقض غیرایران → نامشخص، امن‌تر است IR فرض شود
  _ipCountryCache = { at: now, country: 'IR' };
  return 'IR';
}

// بررسی سبک برای پایش مداوم در حین کار (کم‌مصرف): از آخرین موقعیت معلوم استفاده می‌کند
export async function runtimeSecurityCheck() {
  let dev_options_on = false, mock_location = false;
  try {
    const SecurityCheck = require('../modules/security-check').default || require('../modules/security-check');
    if (SecurityCheck && typeof SecurityCheck.isDeveloperModeEnabledSync === 'function') {
      dev_options_on = !!SecurityCheck.isDeveloperModeEnabledSync();
    } else if (SecurityCheck && typeof SecurityCheck.isDeveloperModeEnabled === 'function') {
      dev_options_on = !!(await SecurityCheck.isDeveloperModeEnabled());
    }
  } catch (e) {}
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30000 });
    if (last) mock_location = !!(last.mocked || (last.coords && last.coords.mocked));
  } catch (e) {}
  let vpn_on = false, vpn_country = null, vpn_reason = null;
  try { const v = await vpnStatus(); vpn_on = v.on; vpn_country = v.country; vpn_reason = v.reason; } catch (e) {}
  return { dev_options_on, mock_location, vpn_on, vpn_country, vpn_reason };
}

export async function ensureGpsOn() {
  let enabled = false;
  try { enabled = await Location.hasServicesEnabledAsync(); } catch (e) {}
  if (!enabled) throw new Error('برای استفاده از برنامه باید GPS روشن باشد.');
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error('دسترسی به موقعیت لازم است.');
  return true;
}
