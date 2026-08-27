import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { afterUiReady } from './androidCompat';
import * as SecureStore from 'expo-secure-store';
import { request, loginRequest, requestLoginOtp, verifyLoginOtp, setTokens, loadTokens, clearTokens } from './api';
import { getDeviceId, getDeviceModel, securitySignals, ensureGpsOn, isMockLocation } from './device';
import { startTracking, stopTracking } from './location';
import { startTelemetry, stopTelemetry, sendTelemetry } from './telemetry';
import { startVpnMonitor, stopVpnMonitor } from './vpnMonitor';
import { startHealthMonitor, stopHealthMonitor, flushHealthQueue } from './healthMonitor';
import { getAppConfig } from './appconfig';
import { startNotifyPolling, stopNotifyPolling } from './notify';
import { registerPush } from './push';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// شروع خودکار فعالیت پس‌زمینه: GPS، telemetry و رصد وضعیت دستگاه
let activityStartPromise = null;
async function beginActivityNow() {
  if (activityStartPromise) return activityStartPromise;
  activityStartPromise = (async () => {
  try { registerPush(); } catch (e) {}
  try { sendTelemetry('session_start'); } catch (e) {}
  let gpsCheckSeconds = 60, vpnCheckSeconds = 60, stationCheckSeconds = 60;
  try { const cfg = await getAppConfig(); if (cfg) { gpsCheckSeconds=cfg.gps_check_seconds||60; vpnCheckSeconds=cfg.vpn_check_seconds||60; stationCheckSeconds=cfg.station_check_seconds||60; } } catch (e) {}
  try { startTelemetry({ gpsCheckSeconds, vpnCheckSeconds, stationCheckSeconds }); } catch (e) {}
  try { startVpnMonitor({ intervalSeconds: vpnCheckSeconds }); } catch (e) {}
  try { startHealthMonitor({ intervalSeconds: 300 }); flushHealthQueue().catch(()=>{}); } catch (e) {}
  try { await startTracking(); } catch (e) {}
  try { startNotifyPolling(); } catch (e) {}
  })();
  try { return await activityStartPromise; } finally { activityStartPromise = null; }
}

function beginActivity() {
  // روی Android 8 تا 10 سرویس‌های Native پس از تکمیل اولین رندر آغاز می‌شوند تا فشار startup کم شود.
  return afterUiReady(() => beginActivityNow(), 1200);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ورود خودکار (مرا به خاطر بسپار)
  useEffect(() => {
    (async () => {
      try {
        // نشست دائمی است: تا وقتی کاربر خودش خروج نزده، با هر بار باز شدن برنامه وارد می‌ماند.
        const token = await loadTokens();
        if (token) {
          try {
            const me = await request('/auth/me');
            setUser(me.user);
            beginActivity();
          } catch { await clearTokens(); }
        }
      } catch (e) { /* نادیده */ }
      finally { setLoading(false); }
    })();
  }, []);

  // نگه‌داشتن نظرسنجی اعلان‌ها هنگام بازگشت اپ به پیش‌زمینه (سبک و بدون دخالت در ناوبری)
  // و توقف کامل آن هنگام رفتن به پس‌زمینه — قبلاً فقط شروع مدیریت می‌شد و توقف نداشت،
  // یعنی این تایمر هر ۳۰ ثانیه حتی وقتی برنامه در پس‌زمینه بود هم درخواست شبکه می‌فرستاد؛
  // روی گوشی‌های با CPU/RAM ضعیف این مصرف پیوستهٔ منابع می‌تواند به فشار حافظه دامن بزند.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { try { startNotifyPolling(); } catch (e) {} }
      else { try { stopNotifyPolling(); } catch (e) {} }
    });
    return () => sub.remove();
  }, []);

  async function login(username, password, remember) {
    // بررسی موقعیت جعلی/توسعه‌دهنده/VPN روی سرور انجام می‌شود تا «معافیت امنیتی» کاربر هم لحاظ شود
    const device_id = await getDeviceId();
    const sig = await securitySignals();
    // نکته دربارهٔ خطای «پاسخ سرور JSON نیست»: علت واقعی مسیر «login» در URL نبود، بلکه
    // Content-Type: application/json بود — یک فایروال امنیتی (WAF) روی هاست، درخواست‌های
    // POST با بدنهٔ JSON را مسدود می‌کند. این با تست curl مستقیم روی سرور واقعی تأیید شد:
    // همان درخواست دقیقاً با همین اطلاعات اما با بدنهٔ فرم معمولی (نه JSON) بدون مشکل موفق
    // شد. loginRequest دقیقاً همان قالب اثبات‌شده را می‌فرستد.
    const d = await loginRequest({ username, password, device_id, device_type: 'android', device_model: getDeviceModel(), ...sig });
    await setTokens(d.access, d.refresh);
    await SecureStore.setItemAsync('remember', '1');
    setUser(d.user);
    beginActivity();
    return d.user;
  }

  // ورود با کد یک‌بارمصرف پیامکی — مرحلهٔ ۱: درخواست ارسال کد
  async function loginOtpRequest(mobile) {
    await requestLoginOtp(mobile);
  }
  // ورود با کد یک‌بارمصرف پیامکی — مرحلهٔ ۲: تأیید کد و دریافت توکن
  async function loginOtpVerify(mobile, code) {
    const device_id = await getDeviceId();
    const d = await verifyLoginOtp({ mobile, code, device_id, device_type: 'android', device_model: getDeviceModel() });
    await setTokens(d.access, d.refresh);
    await SecureStore.setItemAsync('remember', '1');
    setUser(d.user);
    beginActivity();
    return d.user;
  }

  async function logout() {
    // ابتدا با سرور هماهنگ کن — اگر محدودیت یا منع خروج بود، خروج انجام نشود
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // خطای محدودیت/منع خروج → خروج را لغو کن و پیام را به بالادست بده
      const msg = (e && e.message) || 'خروج ممکن نیست';
      throw new Error(msg);
    }
    try { sendTelemetry('session_end'); stopTelemetry(); stopVpnMonitor(); stopHealthMonitor(); stopNotifyPolling(); } catch (e) {}
    try { await stopTracking(); } catch {}
    await clearTokens();
    await SecureStore.setItemAsync('remember', '0');
    setUser(null);
  }

  async function refreshUser() {
    try { const me = await request('/auth/me'); setUser(me.user); return me.user; } catch (e) { return null; }
  }

  return <AuthCtx.Provider value={{ user, loading, login, loginOtpRequest, loginOtpVerify, logout, refreshUser }}>{children}</AuthCtx.Provider>;
}
