import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Vibration, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { C as CC, FONT } from './theme';
import { faNum } from './num';

const CFG_KEY = 'app_lock_cfg';
const SECRET_KEY = 'app_lock_secret';
const FAIL_KEY = 'app_lock_fail_state';
const DEFAULT_CFG = {
  enabled: false,
  type: 'pin', // pin4 | numeric | password | pattern
  timeoutMin: 1,
  useBiometric: true,
};

export async function getLockConfig() {
  try {
    const raw = await AsyncStorage.getItem(CFG_KEY);
    return raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG;
  } catch { return DEFAULT_CFG; }
}
export async function setLockConfig(cfg) { await AsyncStorage.setItem(CFG_KEY, JSON.stringify({ ...DEFAULT_CFG, ...cfg })); }
export async function setLockSecret(val) { await SecureStore.setItemAsync(SECRET_KEY, String(val), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); }
export async function getLockSecret() { try { return await SecureStore.getItemAsync(SECRET_KEY); } catch { return null; } }
export async function clearLockSecret() { try { await SecureStore.deleteItemAsync(SECRET_KEY); } catch {} }

async function getFailState() {
  try { return JSON.parse(await SecureStore.getItemAsync(FAIL_KEY) || '{}'); } catch { return {}; }
}
async function recordFailure() {
  const f = await getFailState();
  const count = Number(f.count || 0) + 1;
  const lockMs = count >= 8 ? 5 * 60e3 : count >= 5 ? 30 * 1000 : count >= 3 ? 5 * 1000 : 0;
  const state = { count, lockedUntil: lockMs ? Date.now() + lockMs : 0 };
  try { await SecureStore.setItemAsync(FAIL_KEY, JSON.stringify(state)); } catch {}
  return state;
}
async function clearFailures() { try { await SecureStore.deleteItemAsync(FAIL_KEY); } catch {} }

export default function AppLock({ children }) {
  const [cfg, setCfg] = useState(null);
  const [locked, setLocked] = useState(false);
  const bgAt = useRef(null);

  const loadCfg = useCallback(async () => {
    const c = await getLockConfig();
    setCfg(c);
    if (c.enabled) setLocked(true);
  }, []);
  useEffect(() => { loadCfg(); }, [loadCfg]);

  useEffect(() => {
    let lastState = AppState.currentState;
    const sub = AppState.addEventListener('change', async (st) => {
      const c = await getLockConfig();
      if (!c.enabled) { lastState = st; return; }
      if (global.__APPLOCK_SUPPRESS__) { lastState = st; return; }
      if (st === 'background') {
        bgAt.current = Date.now();
      } else if (st === 'active' && lastState === 'background') {
        const elapsedMin = bgAt.current ? (Date.now() - bgAt.current) / 60000 : 0;
        const timeout = Number(c.timeoutMin ?? 1);
        if (timeout === 0 || elapsedMin >= timeout) setLocked(true);
        bgAt.current = null;
      }
      lastState = st;
    });
    return () => sub.remove();
  }, []);

  const unlock = async () => { await clearFailures(); setLocked(false); };
  if (!cfg || !cfg.enabled || !locked) return <>{children}</>;
  return <LockScreen cfg={cfg} onUnlock={unlock} />;
}

function LockScreen({ cfg, onUnlock }) {
  const [value, setValue] = useState('');
  const [pattern, setPattern] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (cfg.useBiometric) tryBiometric(); }, []);

  const fail = async () => {
    const state = await recordFailure();
    setValue(''); setPattern([]);
    if (state.lockedUntil > Date.now()) setCooldown(Math.ceil((state.lockedUntil - Date.now()) / 1000));
    setErr(state.count >= 3 ? `تلاش ناموفق ${faNum(state.count)} بار؛ کمی بعد دوباره تلاش کنید.` : 'رمز واردشده صحیح نیست.');
    Vibration.vibrate([0, 80, 70, 80]);
  };
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(x => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function tryBiometric() {
    if (busy || cooldown) return;
    try {
      setBusy(true); global.__APPLOCK_SUPPRESS__ = true;
      const LocalAuth = require('expo-local-authentication');
      const has = await LocalAuth.hasHardwareAsync();
      const enrolled = await LocalAuth.isEnrolledAsync();
      if (!has || !enrolled) { setErr('احراز هویت بیومتریک روی این دستگاه فعال نیست.'); return; }
      const r = await LocalAuth.authenticateAsync({
        promptMessage: 'برای باز کردن خطیار احراز هویت کنید',
        cancelLabel: 'استفاده از رمز',
        disableDeviceFallback: false,
      });
      if (r.success) await onUnlock();
    } catch {} finally {
      setBusy(false); setTimeout(() => { global.__APPLOCK_SUPPRESS__ = false; }, 700);
    }
  }

  async function check(val) {
    if (busy || cooldown || !val) return;
    setBusy(true); setErr('');
    const secret = await getLockSecret();
    if (secret && String(val) === String(secret)) await onUnlock(); else await fail();
    setBusy(false);
  }

  const append = async (d) => {
    if (busy || cooldown) return;
    setErr('');
    if (d === 'del') { setValue(v => v.slice(0, -1)); return; }
    if (cfg.type === 'pin4') {
      const next = (value + d).slice(0, 4); setValue(next);
      if (next.length === 4) await check(next);
      return;
    }
    const next = (value + d).slice(0, 32); setValue(next);
  };

  if (cfg.type === 'pattern') {
    return <PatternLock cfg={cfg} selected={pattern} setSelected={setPattern} onComplete={async p => { setPattern(p); await check(p.join('-')); }} onBiometric={cfg.useBiometric ? tryBiometric : null} err={err} cooldown={cooldown} />;
  }

  const isPin = cfg.type === 'pin4' || cfg.type === 'numeric';
  const keys = ['1','2','3','4','5','6','7','8','9','bio','0','del'];
  return <View style={s.wrap}>
    <View style={s.badge}><Text style={s.badgeText}>🔒</Text></View>
    <Text style={s.title}>خطیار قفل است</Text>
    <Text style={s.sub}>{cfg.type === 'password' ? 'رمز عبور خود را وارد کنید' : cfg.type === 'numeric' ? 'رمز عددی خود را وارد کنید' : 'پین ۴ رقمی را وارد کنید'}</Text>
    {isPin ? <View style={s.dots}>{Array.from({ length: cfg.type === 'pin4' ? 4 : Math.max(4, value.length) }).map((_,i)=><View key={i} style={[s.dot,i<value.length&&s.dotOn]}/>)}</View> :
      <View style={s.passwordPreview}><Text style={s.passwordText}>{value ? '•'.repeat(value.length) : 'رمز عبور'}</Text></View>}
    {!!err && <Text style={s.err}>{err}</Text>}
    {!!cooldown && <Text style={s.cooldown}>لطفاً {faNum(cooldown)} ثانیه صبر کنید</Text>}
    {cfg.type === 'password' ? <PasswordPad value={value} onChange={setValue} onSubmit={() => check(value)} onBiometric={cfg.useBiometric ? tryBiometric : null} /> :
      <View style={s.pad}>{keys.map(k=><TouchableOpacity disabled={!!cooldown} key={k} style={s.key} onPress={()=>k==='bio'?tryBiometric():append(k)}><Text style={s.keyTxt}>{k==='del'?'⌫':k==='bio'?'♙':faNum(k)}</Text></TouchableOpacity>)}</View>}
  </View>;
}

function PasswordPad({ value, onChange, onSubmit, onBiometric }) {
  return <View style={s.passwordBox}>
    <View style={s.row}><TouchableOpacity style={s.smallBtn} onPress={()=>onChange('')}><Text style={s.smallTxt}>پاک کردن</Text></TouchableOpacity><TouchableOpacity style={s.smallBtn} onPress={onSubmit}><Text style={s.smallTxt}>ورود</Text></TouchableOpacity></View>
    <View style={s.keyboardHint}><Text style={s.hint}>رمز عبور را با صفحه‌کلید دستگاه وارد کنید</Text></View>
    {onBiometric && <TouchableOpacity style={s.bioBtn} onPress={onBiometric}><Text style={s.bioTxt}>اثر انگشت / تشخیص چهره</Text></TouchableOpacity>}
  </View>;
}

function PatternLock({ selected, setSelected, onComplete, onBiometric, err, cooldown }) {
  const gridRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const addPoint = (n) => setSelected(cur => cur.includes(n) ? cur : [...cur, n]);
  const pointFromTouch = (x,y) => {
    if (!layout) return null;
    const size = 210, cell = size/3;
    const col = Math.max(0, Math.min(2, Math.floor(x/cell)));
    const row = Math.max(0, Math.min(2, Math.floor(y/cell)));
    const cx = col*cell+cell/2, cy=row*cell+cell/2;
    if (Math.hypot(x-cx,y-cy) > 34) return null;
    return row*3+col+1;
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => { const n=pointFromTouch(e.nativeEvent.locationX,e.nativeEvent.locationY); if(n)addPoint(n); },
    onPanResponderMove: e => { const n=pointFromTouch(e.nativeEvent.locationX,e.nativeEvent.locationY); if(n)addPoint(n); },
    onPanResponderRelease: () => { if(selected.length>=4) onComplete(selected); else { Vibration.vibrate(80); setSelected([]); } },
  })).current;
  return <View style={s.wrap}>
    <View style={s.badge}><Text style={s.badgeText}>⌘</Text></View><Text style={s.title}>الگوی قفل را رسم کنید</Text><Text style={s.sub}>حداقل ۴ نقطه را با کشیدن انگشت به هم متصل کنید</Text>
    {!!err&&<Text style={s.err}>{err}</Text>}{!!cooldown&&<Text style={s.cooldown}>لطفاً {faNum(cooldown)} ثانیه صبر کنید</Text>}
    <View ref={gridRef} onLayout={e=>setLayout(e.nativeEvent.layout)} {...responder.panHandlers} style={s.pattern}>
      {selected.length>1 && selected.map((n,i)=>{if(i===0)return null;const a=selected[i-1]-1,b=n-1;const ax=(a%3)*70+35,ay=Math.floor(a/3)*70+35,bx=(b%3)*70+35,by=Math.floor(b/3)*70+35;const len=Math.hypot(bx-ax,by-ay),angle=Math.atan2(by-ay,bx-ax)*180/Math.PI;return <View key={`l${i}`} pointerEvents="none" style={[s.line,{left:ax,top:ay,width:len,transform:[{rotate:`${angle}deg`}]}]}/>;})}
      {Array.from({length:9}).map((_,i)=>{const n=i+1;return <View pointerEvents="none" key={n} style={[s.node,selected.includes(n)&&s.nodeOn]}><View style={s.nodeCore}/></View>;})}
    </View>
    <View style={s.row}><TouchableOpacity style={s.smallBtn} onPress={()=>setSelected([])}><Text style={s.smallTxt}>پاک کردن</Text></TouchableOpacity>{onBiometric&&<TouchableOpacity style={s.smallBtn} onPress={onBiometric}><Text style={s.smallTxt}>اثر انگشت</Text></TouchableOpacity>}</View>
  </View>;
}

const s=StyleSheet.create({
  wrap:{flex:1,backgroundColor:'#0b1220',alignItems:'center',justifyContent:'center',padding:24},badge:{width:72,height:72,borderRadius:24,backgroundColor:'#162238',alignItems:'center',justifyContent:'center',marginBottom:14},badgeText:{fontSize:34},title:{fontFamily:FONT.bold,color:'#fff',fontSize:21},sub:{fontFamily:FONT.regular,color:'#9fb0c8',fontSize:13,marginTop:8,marginBottom:18,textAlign:'center'},dots:{flexDirection:'row',gap:13,marginBottom:10},dot:{width:15,height:15,borderRadius:8,borderWidth:2,borderColor:'#506078'},dotOn:{backgroundColor:CC.brand,borderColor:CC.brand},passwordPreview:{width:280,borderRadius:14,backgroundColor:'#162238',padding:15,marginBottom:10},passwordText:{color:'#fff',fontSize:20,textAlign:'center',letterSpacing:4},err:{color:'#ff8080',fontFamily:FONT.regular,fontSize:13,textAlign:'center',marginVertical:8},cooldown:{color:'#ffd166',fontFamily:FONT.bold,fontSize:13,marginVertical:7},pad:{width:285,flexDirection:'row-reverse',flexWrap:'wrap',justifyContent:'center',gap:13,marginTop:12},key:{width:78,height:68,borderRadius:34,backgroundColor:'#18263b',alignItems:'center',justifyContent:'center'},keyTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:23},passwordBox:{width:300},row:{flexDirection:'row-reverse',gap:10,marginTop:14},smallBtn:{backgroundColor:'#263750',borderRadius:12,paddingVertical:12,paddingHorizontal:20,minWidth:90,alignItems:'center'},smallTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:13},keyboardHint:{padding:18,backgroundColor:'#162238',borderRadius:14,marginTop:12},hint:{color:'#aab8cc',fontFamily:FONT.regular,textAlign:'center',fontSize:12},bioBtn:{backgroundColor:CC.brand,borderRadius:12,padding:13,alignItems:'center',marginTop:12},bioTxt:{color:'#fff',fontFamily:FONT.bold},pattern:{width:210,height:210,position:'relative',marginVertical:18},node:{position:'absolute',width:48,height:48,borderRadius:24,borderWidth:2,borderColor:'#53647d',alignItems:'center',justifyContent:'center',left:0,top:0},nodeCore:{width:12,height:12,borderRadius:6,backgroundColor:'#8291a8'},nodeOn:{borderColor:CC.brand,backgroundColor:'#17365c'},line:{position:'absolute',height:4,backgroundColor:CC.brand,borderRadius:2,transformOrigin:'left center'},});

// Exported for settings screens that need the same validation semantics.
export const LOCK_TYPES = {
  pin4: { label: 'پین ۴ رقمی', min: 4, max: 4 },
  numeric: { label: 'رمز عددی', min: 5, max: 16 },
  password: { label: 'رمز عبور حروفی و عددی', min: 6, max: 32 },
  pattern: { label: 'الگوی حرکتی', min: 4, max: 9 },
};
export function validateLockSecret(type, value) {
  const t=LOCK_TYPES[type]; if(!t) return 'نوع قفل نامعتبر است.';
  if(type==='pattern') { const p=String(value).split('-').filter(Boolean); if(p.length<t.min) return 'الگو باید حداقل ۴ نقطه داشته باشد.'; if(new Set(p).size!==p.length) return 'نقاط الگو نباید تکراری باشند.'; return ''; }
  if(String(value).length<t.min||String(value).length>t.max) return `طول ${t.label} باید بین ${faNum(t.min)} تا ${faNum(t.max)} کاراکتر باشد.`;
  if(type==='pin4'&&!/^\d{4}$/.test(String(value))) return 'پین باید دقیقاً ۴ رقم باشد.';
  if(type==='numeric'&&!/^\d+$/.test(String(value))) return 'رمز عددی فقط شامل رقم باشد.';
  if(type==='password'&&!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/.test(String(value))) return 'رمز باید حداقل یک حرف انگلیسی و یک عدد داشته باشد.';
  if(/^(.)\1+$/.test(String(value))||['1234','12345','123456','12345678','0000','1111','111111'].includes(String(value))) return 'این رمز بیش از حد ساده است؛ رمز دیگری انتخاب کنید.';
  return '';
}
