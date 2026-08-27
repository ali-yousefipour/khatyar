/**
 * نگهبان GPS — هر یک دقیقه بررسی می‌کند که سرویس موقعیت‌یابی (GPS) روشن است.
 * اگر کاربر GPS را خاموش کند، یک صفحهٔ هشدار تمام‌صفحه نمایش داده می‌شود
 * و تا روشن‌شدن مجدد GPS، امکان فعالیت گرفته می‌شود.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { C, FONT } from './theme';
import { useAuth } from './auth';
import { getAppConfig } from './appconfig';
import { postOrQueue } from './api';


export default function GpsGuard({ children }) {
  const { user } = useAuth();
  const exempt = Number(user?.security_exempt || 0) === 1 || user?.security_exempt === true;
  const [gpsOff, setGpsOff] = useState(false);
  const [checking, setChecking] = useState(false);
  const [intervalMs,setIntervalMs]=useState(60000);

  const check = useCallback(async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      const off=!enabled; setGpsOff(off); if(off) postOrQueue('/activity/telemetry',{kind:'gps_off',at:new Date().toISOString()}).catch(()=>{});
    } catch {
      // در صورت خطا، سخت‌گیری نمی‌کنیم
      setGpsOff(false);
    }
  }, []);

  useEffect(()=>{getAppConfig(true).then(c=>setIntervalMs(Math.max(15000,Number(c?.gps_check_seconds||60)*1000))).catch(()=>{});},[user?.id]);

  useEffect(() => {
    if (exempt) { setGpsOff(false); return undefined; }
    check();
    const iv = setInterval(check, intervalMs);
    // هنگام بازگشت به اپ هم فوری چک کن
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [check, exempt, intervalMs]);

  const recheck = async () => {
    setChecking(true);
    await check();
    setChecking(false);
  };

  if (exempt || !gpsOff) return children ? <>{children}</> : null;

  // باز کردن مستقیم صفحهٔ تنظیمات موقعیت‌یابی دستگاه (نه تنظیمات اپ)
  const openLocationSettings = async () => {
    try { await IntentLauncher.startActivityAsync('android.settings.LOCATION_SOURCE_SETTINGS'); }
    catch (e) { try { await Linking.openSettings(); } catch (e2) {} }
  };

  return (
    <View style={s.overlay}>
      <Text style={s.icon}>📍</Text>
      <Text style={s.title}>سرویس موقعیت‌یابی خاموش است</Text>
      <Text style={s.sub}>
        برای ادامهٔ فعالیت، لازم است GPS دستگاه روشن باشد. لطفاً موقعیت‌یابی (Location) را از تنظیمات سریع یا تنظیمات دستگاه روشن کنید.
      </Text>
      <TouchableOpacity style={s.btn} onPress={openLocationSettings}>
        <Text style={s.btnTxt}>روشن کردن موقعیت‌یابی (GPS)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.btn, s.btn2]} onPress={recheck} disabled={checking}>
        <Text style={s.btnTxt}>{checking ? 'در حال بررسی…' : '🔄 بررسی مجدد'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0e141f', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 9999 },
  icon: { fontSize: 56, marginBottom: 14 },
  title: { fontFamily: FONT.bold, color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 10 },
  sub: { fontFamily: FONT.regular, color: '#9aa6bd', fontSize: 14, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  btn: { backgroundColor: '#0d7a5f', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 36, width: '100%', alignItems: 'center', marginBottom: 12 },
  btn2: { backgroundColor: '#2a3445' },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 15 },
});
