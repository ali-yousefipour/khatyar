import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { runtimeSecurityCheck } from './device';
import { useAuth } from './auth';
import { getAppConfig } from './appconfig';
import { C, FONT } from './theme';

// بررسی مداوم (نه فقط هنگام لاگین): اگر موارد امنیتیِ فعال‌شده توسط مدیر
// در حین کار با برنامه روشن شوند، برنامه مسدود می‌شود تا کاربر آن‌ها را خاموش کند.
// کدام موارد بررسی شوند، از تنظیمات سرور خوانده می‌شود (block_vpn / block_dev_options / block_mock_location).
// کاربرانِ «معاف امنیتی» از این بررسی مستثنا هستند.
export default function SecurityGuard({ children }) {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [sig, setSig] = useState(null);
  // پیش‌فرض: تا وقتی تنظیمات سرور لود نشده، هیچ‌چیز را بلاک نکن (جلوگیری از بلاک اشتباه)
  const [policy, setPolicy] = useState({ vpn: false, dev: false, mock: false, loaded: false, intervalMs: 60000 });
  const timer = useRef(null);
  const exempt = !!(user && user.security_exempt);

  // خواندن تنظیمات امنیتی از سرور
  useEffect(() => {
    let alive = true;
    getAppConfig().then((c) => {
      if (!alive || !c) return;
      setPolicy({
        vpn: c.block_vpn !== false ? !!c.block_vpn : false,
        dev: !!c.block_dev_options,
        mock: !!c.block_mock_location,
        loaded: true,
        intervalMs: Math.max(15000,Number(c.vpn_check_seconds||60)*1000),
      });
    }).catch(() => { if (alive) setPolicy((p) => ({ ...p, loaded: true })); });
    return () => { alive = false; };
  }, [user?.id]);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || exempt) { setBlocked(false); return; }
    // تا وقتی تنظیمات سرور لود نشده، بررسی نکن (از بلاک اشتباه جلوگیری می‌کند)
    if (!policy.loaded) { setBlocked(false); return; }
    try {
      const s = await runtimeSecurityCheck();
      setSig(s);
      const rs = [];
      if (policy.dev && s.dev_options_on) rs.push({ k: 'dev', t: 'حالت توسعه‌دهنده (Developer Options) فعال است.' });
      if (policy.mock && s.mock_location) rs.push({ k: 'mock', t: 'موقعیت جعلی (Mock Location) فعال است.' });
      if (policy.vpn && s.vpn_on) rs.push({ k: 'vpn', t: 'فیلترشکن (VPN) روشن است. برای استفاده از برنامه آن را خاموش کنید.' + (s.vpn_country ? ` (کشور IP: ${s.vpn_country})` : '') });
      setReasons(rs);
      setBlocked(rs.length > 0);
    } catch (e) { /* در صورت خطا، مسدود نمی‌کنیم تا برنامه قفل نشود */ }
  }, [exempt, policy]);

  useEffect(() => {
    if (exempt) { setBlocked(false); return; }
    check();
    timer.current = setInterval(check, policy.intervalMs || 60000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { if (timer.current) clearInterval(timer.current); sub.remove(); };
  }, [check, exempt]);

  // باز کردن تنظیمات مناسب بسته به نوع مشکل
  async function openDevSettings() {
    try { await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DEVELOPMENT_SETTINGS'); }
    catch (e) { try { await IntentLauncher.startActivityAsync('android.settings.SETTINGS'); } catch (e2) {} }
    setTimeout(check, 1200);
  }
  async function openVpnSettings() {
    try { await IntentLauncher.startActivityAsync('android.net.vpn.SETTINGS'); }
    catch (e) {
      try { await IntentLauncher.startActivityAsync('android.settings.WIRELESS_SETTINGS'); }
      catch (e2) { try { await IntentLauncher.startActivityAsync('android.settings.SETTINGS'); } catch (e3) {} }
    }
    setTimeout(check, 1200);
  }

  if (!blocked) return children;

  // تعیین اینکه کدام دکمه‌ها نمایش داده شوند
  const hasVpn = reasons.some((r) => r.k === 'vpn');
  const hasDev = reasons.some((r) => r.k === 'dev' || r.k === 'mock');

  return (
    <View style={s.wrap}>
      <Text style={s.icon}>🚫</Text>
      <Text style={s.title}>ادامهٔ کار مجاز نیست</Text>
      {reasons.map((r, i) => <Text key={i} style={s.reason}>• {r.t}</Text>)}
      <Text style={s.body}>برای استفاده از برنامه باید این موارد خاموش باشند. پس از خاموش‌کردن، «بررسی مجدد» را بزنید.</Text>
      {hasVpn && (
        <TouchableOpacity style={s.btn} onPress={openVpnSettings}>
          <Text style={s.btnTxt}>باز کردن تنظیمات VPN</Text>
        </TouchableOpacity>
      )}
      {hasDev && (
        <TouchableOpacity style={[s.btn, hasVpn && { backgroundColor: '#475569', marginTop: 10 }]} onPress={openDevSettings}>
          <Text style={s.btnTxt}>باز کردن تنظیمات حالت توسعه‌دهنده</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={s.recheck} onPress={check}>
        <Text style={s.recheckTxt}>بررسی مجدد</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { fontSize: 54, marginBottom: 8 },
  title: { fontFamily: FONT.bold, color: '#e3403e', fontSize: 19, textAlign: 'center', marginBottom: 14 },
  reason: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  body: { fontFamily: FONT.regular, color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 24, marginTop: 8, marginBottom: 8 },
  btn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, marginTop: 14, width: '100%', alignItems: 'center' },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  recheck: { marginTop: 16, padding: 8 },
  recheckTxt: { color: C.muted, fontFamily: FONT.bold, fontSize: 14 },
});
