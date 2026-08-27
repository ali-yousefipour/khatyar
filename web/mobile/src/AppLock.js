import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Alert, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { C as CC, FONT } from './theme';
import { faNum } from './num';

const CFG_KEY = 'app_lock_cfg';        // {enabled, type:'pin'|'pattern', timeoutMin}
const SECRET_KEY = 'app_lock_secret';  // در SecureStore

// خواندن تنظیمات قفل
export async function getLockConfig() {
  try {
    const raw = await AsyncStorage.getItem(CFG_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, type: 'pin', timeoutMin: 1, useBiometric: true };
  } catch { return { enabled: false, type: 'pin', timeoutMin: 1, useBiometric: true }; }
}
export async function setLockConfig(cfg) { await AsyncStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
export async function setLockSecret(val) { await SecureStore.setItemAsync(SECRET_KEY, String(val)); }
export async function getLockSecret() { try { return await SecureStore.getItemAsync(SECRET_KEY); } catch { return null; } }
export async function clearLockSecret() { try { await SecureStore.deleteItemAsync(SECRET_KEY); } catch {} }

// ===== صفحهٔ قفل =====
export default function AppLock({ children }) {
  const [cfg, setCfg] = useState(null);
  const [locked, setLocked] = useState(false);
  const bgAt = useRef(null);

  const loadCfg = useCallback(async () => {
    const c = await getLockConfig();
    setCfg(c);
    if (c.enabled) setLocked(true); // در شروع برنامه قفل باشد
  }, []);

  useEffect(() => { loadCfg(); }, [loadCfg]);

  // قفل خودکار بعد از مدت بی‌فعالیتی هنگام بازگشت از پس‌زمینه واقعی
  useEffect(() => {
    let lastState = AppState.currentState;
    const sub = AppState.addEventListener('change', async (st) => {
      const c = await getLockConfig();
      if (!c.enabled) { lastState = st; return; }
      // اگر در حال احراز هویت بیومتریک یا استفاده از دوربین هستیم، قفل را نادیده بگیر
      if (global.__APPLOCK_SUPPRESS__) { lastState = st; return; }
      // فقط «background» واقعی را در نظر بگیر، نه «inactive» (که هنگام باز شدن دوربین/دیالوگ رخ می‌دهد)
      if (st === 'background') {
        bgAt.current = Date.now();
      } else if (st === 'active' && lastState === 'background') {
        if (bgAt.current) {
          const mins = (Date.now() - bgAt.current) / 60000;
          // حداقل آستانه: حتی اگر timeoutMin صفر باشد، فقط وقتی واقعاً به پس‌زمینه رفته قفل کن
          if (mins >= (c.timeoutMin || 0)) setLocked(true);
          bgAt.current = null;
        }
      }
      lastState = st;
    });
    return () => sub.remove();
  }, []);

  if (!cfg || !cfg.enabled || !locked) return <>{children}</>;

  return <LockScreen cfg={cfg} onUnlock={() => setLocked(false)} />;
}

function LockScreen({ cfg, onUnlock }) {
  const [pin, setPin] = useState('');
  const [pattern, setPattern] = useState([]);
  const [err, setErr] = useState('');

  // تلاش با اثر انگشت در شروع
  useEffect(() => {
    if (cfg.useBiometric) tryBiometric();
  }, []);

  async function tryBiometric() {
    try {
      global.__APPLOCK_SUPPRESS__ = true;
      const LocalAuth = require('expo-local-authentication');
      const has = await LocalAuth.hasHardwareAsync();
      const enrolled = await LocalAuth.isEnrolledAsync();
      if (has && enrolled) {
        const r = await LocalAuth.authenticateAsync({
          promptMessage: 'برای باز کردن برنامه احراز هویت کنید',
          cancelLabel: 'استفاده از رمز',
          disableDeviceFallback: false,
        });
        if (r.success) onUnlock();
      }
    } catch (e) {}
    finally { setTimeout(() => { global.__APPLOCK_SUPPRESS__ = false; }, 800); }
  }

  async function checkSecret(val) {
    const secret = await getLockSecret();
    if (secret && String(val) === String(secret)) { onUnlock(); return true; }
    setErr('رمز اشتباه است'); Vibration.vibrate(200);
    return false;
  }

  const onPin = async (d) => {
    setErr('');
    if (d === 'del') { setPin((p) => p.slice(0, -1)); return; }
    const np = (pin + d).slice(0, 8);
    setPin(np);
    if (np.length >= 4) {
      // اگر طول رمز ذخیره‌شده برابر بود، بررسی کن
      const secret = await getLockSecret();
      if (secret && np.length === secret.length) {
        const ok = await checkSecret(np);
        if (!ok) setPin('');
      }
    }
  };

  if (cfg.type === 'pattern') {
    return <PatternLock onComplete={async (p) => { const ok = await checkSecret(p.join('')); if (!ok) setPattern([]); }}
      err={err} onBiometric={cfg.useBiometric ? tryBiometric : null} />;
  }

  // PIN UI
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];
  return (
    <View style={s.wrap}>
      <Text style={s.lockIcon}>🔒</Text>
      <Text style={s.title}>برنامه قفل است</Text>
      <Text style={s.sub}>رمز عددی خود را وارد کنید</Text>
      <View style={s.dots}>
        {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, Math.max(4, pin.length)).map((i) => (
          <View key={i} style={[s.dot, i < pin.length && s.dotOn]} />
        ))}
      </View>
      {!!err && <Text style={s.err}>{err}</Text>}
      <View style={s.pad}>
        {keys.map((k) => (
          <TouchableOpacity key={k} style={s.key}
            onPress={() => { if (k === 'bio') tryBiometric(); else onPin(k); }}>
            <Text style={s.keyTxt}>{k === 'del' ? '⌫' : k === 'bio' ? '👆' : faNum(k)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// قفل پترن سادهٔ ۳×۳
function PatternLock({ onComplete, err, onBiometric }) {
  const [sel, setSel] = useState([]);
  const toggle = (n) => {
    setSel((cur) => cur.includes(n) ? cur : [...cur, n]);
  };
  const done = () => { if (sel.length >= 4) { onComplete(sel); setSel([]); } else { Alert.alert('الگو', 'حداقل ۴ نقطه را انتخاب کنید.'); } };
  return (
    <View style={s.wrap}>
      <Text style={s.lockIcon}>🔒</Text>
      <Text style={s.title}>برنامه قفل است</Text>
      <Text style={s.sub}>الگوی خود را وارد کنید</Text>
      {!!err && <Text style={s.err}>{err}</Text>}
      <View style={s.grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity key={n} style={[s.gnode, sel.includes(n) && s.gnodeOn]} onPress={() => toggle(n)}>
            {sel.includes(n) && <Text style={s.gnum}>{faNum(sel.indexOf(n) + 1)}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 18 }}>
        <TouchableOpacity style={s.btn} onPress={done}><Text style={s.btnTxt}>تأیید</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnG]} onPress={() => setSel([])}><Text style={s.btnTxt}>پاک کردن</Text></TouchableOpacity>
        {onBiometric && <TouchableOpacity style={[s.btn, s.btnG]} onPress={onBiometric}><Text style={s.btnTxt}>👆 اثر انگشت</Text></TouchableOpacity>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0e141f', alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon: { fontSize: 48, marginBottom: 10 },
  title: { fontFamily: FONT.bold, color: '#fff', fontSize: 20 },
  sub: { fontFamily: FONT.regular, color: '#9fb0c8', fontSize: 13, marginTop: 8, marginBottom: 20 },
  dots: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#3a4a63' },
  dotOn: { backgroundColor: CC.brand, borderColor: CC.brand },
  err: { color: '#f87171', fontFamily: FONT.regular, fontSize: 13, marginVertical: 8 },
  pad: { width: 280, flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 16 },
  key: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#1a2433', alignItems: 'center', justifyContent: 'center' },
  keyTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 24 },
  grid: { width: 240, flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginTop: 10 },
  gnode: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#3a4a63', alignItems: 'center', justifyContent: 'center' },
  gnodeOn: { backgroundColor: CC.brand, borderColor: CC.brand },
  gnum: { color: '#fff', fontFamily: FONT.bold, fontSize: 18 },
  btn: { backgroundColor: CC.brand, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20 },
  btnG: { backgroundColor: '#2a3647' },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
});
