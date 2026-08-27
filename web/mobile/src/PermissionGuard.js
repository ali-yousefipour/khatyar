import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, AppState, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { C, FONT } from './theme';
import { useAuth } from './auth';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const BATTERY_KEY = 'battery_opt_confirmed_v1';
const AUTOSTART_KEY = 'autostart_confirmed_v1';

// باز کردن صفحهٔ «اجرای خودکار / Autostart» سازندهٔ گوشی (شیائومی، هواوی، اوپو، ویوو و…)
async function openAutostartSettings() {
  const IntentLauncher = require('expo-intent-launcher');
  // لیست intentهای رایج سازندگان برای صفحهٔ Autostart
  const candidates = [
    { p: 'com.miui.securitycenter', c: 'com.miui.permcenter.autostart.AutoStartManagementActivity' }, // شیائومی
    { p: 'com.huawei.systemmanager', c: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity' }, // هواوی
    { p: 'com.huawei.systemmanager', c: 'com.huawei.systemmanager.optimize.process.ProtectActivity' }, // هواوی قدیمی
    { p: 'com.coloros.safecenter', c: 'com.coloros.safecenter.permission.startup.StartupAppListActivity' }, // اوپو
    { p: 'com.coloros.safecenter', c: 'com.coloros.safecenter.startupapp.StartupAppListActivity' }, // اوپو
    { p: 'com.vivo.permissionmanager', c: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity' }, // ویوو
    { p: 'com.iqoo.secure', c: 'com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity' }, // ویوو/iQOO
    { p: 'com.letv.android.letvsafe', c: 'com.letv.android.letvsafe.AutobootManageActivity' }, // letv
    { p: 'com.samsung.android.lool', c: 'com.samsung.android.sm.ui.battery.BatteryActivity' }, // سامسونگ
  ];
  for (const cand of candidates) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        packageName: cand.p, className: cand.c,
      });
      return true;
    } catch (e) { /* سازندهٔ بعدی */ }
  }
  // اگر هیچ‌کدام نبود، تنظیمات اپ را باز کن
  try { const { Linking } = require('react-native'); await Linking.openSettings(); } catch (e) {}
  return false;
}

async function checkPermissions(skipLocation = false) {
  const issues = [];
  if (!skipLocation) try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted')
      issues.push({ key: 'location', title: 'موقعیت‌یابی (GPS)', action: () => Location.requestForegroundPermissionsAsync() });
  } catch {}
  try {
    const cam = require('expo-camera');
    const p = await cam.getCameraPermissionsAsync();
    if (!p.granted)
      issues.push({ key: 'camera', title: 'دوربین', action: () => cam.requestCameraPermissionsAsync() });
  } catch {}
  try {
    const n = await Notifications.getPermissionsAsync();
    if (n.status !== 'granted')
      issues.push({ key: 'notifications', title: 'اعلان‌ها', action: () => Notifications.requestPermissionsAsync() });
  } catch {}
  // بررسی اجرای خودکار (Autostart) — چون قابل‌خواندن نیست، با تأیید کاربر مدیریت می‌شود
  try {
    const auto = await AsyncStorage.getItem(AUTOSTART_KEY);
    if (auto !== '1')
      issues.push({ key: 'autostart', title: 'اجازهٔ شروع خودکار برنامه (Autostart)',
        action: async () => { await openAutostartSettings(); await AsyncStorage.setItem(AUTOSTART_KEY, '1'); } });
  } catch {}
  return issues;
}

export default function PermissionGuard({ children }) {
  const { user } = useAuth();
  const exempt = Number(user?.security_exempt || 0) === 1 || user?.security_exempt === true;
  const [issues, setIssues] = useState([]);
  const [batteryConfirmed, setBatteryConfirmed] = useState(true); // پیش‌فرض true تا load بشود
  const [ready, setReady] = useState(false);

  const runCheck = useCallback(async () => {
    const found = await checkPermissions(exempt);
    setIssues(found);
    // بررسی آیا کاربر قبلاً تأیید کرده
    const stored = await AsyncStorage.getItem(BATTERY_KEY).catch(() => null);
    setBatteryConfirmed(!!stored);
    setReady(true);
  }, [exempt]);

  useEffect(() => {
    runCheck();
    const iv = setInterval(runCheck, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') runCheck(); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [runCheck]);

  const confirmBattery = async () => {
    await AsyncStorage.setItem(BATTERY_KEY, '1').catch(() => {});
    setBatteryConfirmed(true);
  };

  if (!ready) return null;

  // مرحلهٔ ۱: دسترسی‌ها
  if (issues.length > 0) {
    return (
      <View style={s.overlay}>
        <ScrollView contentContainerStyle={s.box}>
          <Text style={s.icon}>⚠</Text>
          <Text style={s.title}>دسترسی‌های لازم فعال نیستند</Text>
          {issues.map((it) => (
            <View key={it.key} style={s.row}>
              <Text style={s.rowTxt}>{it.title}</Text>
              <TouchableOpacity style={s.btn} onPress={async () => { try { await it.action(); } catch {} runCheck(); }}>
                <Text style={s.btnTxt}>فعال‌سازی</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={s.recheck} onPress={runCheck}>
            <Text style={s.recheckTxt}>🔄 بررسی مجدد</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // مرحلهٔ ۲: battery optimizer — فقط یک‌بار پرسیده می‌شود و ذخیره می‌شود
  if (!batteryConfirmed) {
    return (
      <View style={s.overlay}>
        <ScrollView contentContainerStyle={s.box}>
          <Text style={s.icon}>🔋</Text>
          <Text style={s.title}>تنظیم بهینه‌سازی باتری</Text>
          <Text style={s.sub}>برای عملکرد صحیح در پس‌زمینه، این برنامه باید از محدودیت باتری معاف باشد.</Text>
          <View style={s.card}>
            <Text style={s.cardTxt}>مسیر: تنظیمات ← برنامه‌ها ← این برنامه ← باتری ← بدون محدودیت</Text>
          </View>
          <TouchableOpacity style={s.btn2} onPress={() => Linking.openSettings()}>
            <Text style={s.btnTxt}>رفتن به تنظیمات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn2, { backgroundColor: '#0d7a5f', marginTop: 10 }]} onPress={confirmBattery}>
            <Text style={s.btnTxt}>تأیید می‌کنم و ادامه می‌دهم</Text>
          </TouchableOpacity>
          <Text style={{ color: '#666', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
            این پیام دیگر تکرار نخواهد شد.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0e141f' },
  box: { padding: 22, paddingTop: 56, alignItems: 'center' },
  icon: { fontSize: 50, marginBottom: 10 },
  title: { fontFamily: FONT.bold, color: '#fff', fontSize: 17, textAlign: 'center', marginBottom: 6 },
  sub: { fontFamily: FONT.regular, color: '#8b97ad', fontSize: 13, textAlign: 'center', marginBottom: 18 },
  row: { backgroundColor: '#18202e', borderRadius: 14, padding: 15, width: '100%', marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  rowTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
  card: { backgroundColor: '#18202e', borderRadius: 12, padding: 14, width: '100%', marginBottom: 16 },
  cardTxt: { fontFamily: FONT.regular, color: '#c8d0df', fontSize: 13, textAlign: 'right', lineHeight: 22 },
  btn: { backgroundColor: '#0d7a5f', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 16 },
  btn2: { backgroundColor: '#2a3445', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 24, width: '100%', alignItems: 'center' },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 13 },
  recheck: { marginTop: 14, backgroundColor: '#2a3445', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 28 },
  recheckTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
});
