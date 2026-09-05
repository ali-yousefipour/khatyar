import React, { useEffect, useRef, useState } from 'react';
import { faNum } from '../num';
import { tehranTimeToEpochMs } from '../jdate';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, PanResponder, Animated, TextInput, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { getAccuratePosition, getGsmPosition } from '../location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { request, postOrQueue } from '../api';
import { getAppConfig } from '../appconfig';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { isTileCached, loadLocalTilesAround } from '../mapCache';

// فاصلهٔ هاورساین به متر
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1), dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function distToSegmentM(plat, plng, alat, alng, blat, blng) {
  const latRef = (alat + blat) / 2, mLat = 111320, mLng = 111320 * Math.cos(latRef * Math.PI / 180);
  const px = (plng - alng) * mLng, py = (plat - alat) * mLat;
  const bx = (blng - alng) * mLng, by = (blat - alat) * mLat;
  const len2 = bx * bx + by * by;
  if (len2 <= 1e-9) return Math.sqrt(px * px + py * py);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  const dx = px - t * bx, dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}
function distToPolygonEdges(lat, lng, poly) {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = distToSegmentM(lat, lng, poly[i][0], poly[i][1], poly[j][0], poly[j][1]);
    if (d < min) min = d;
  }
  return min;
}
// فاصله تا یک محدوده (دایره: تا لبه؛ چندضلعی: داخل=۰ وگرنه تا نزدیک‌ترین ضلع)
function parsePolygon(g) {
  let poly = g.polygon;
  if (!poly) return null;
  try { if (typeof poly === 'string') poly = JSON.parse(poly); } catch { return null; }
  return (Array.isArray(poly) && poly.length >= 3) ? poly : null;
}
function distanceToFence(lat, lng, g) {
  // ابتدا چندضلعی را امتحان کن (مستقل از مقدار فیلد type) چون مهم‌ترین حالت است
  const poly = parsePolygon(g);
  if (poly) {
    if (pointInPolygon(lat, lng, poly)) return 0;
    return distToPolygonEdges(lat, lng, poly);
  }
  // سپس دایره
  if (g.center_lat != null && g.center_lng != null && g.radius_m) {
    return Math.max(0, haversine(lat, lng, +g.center_lat, +g.center_lng) - (+g.radius_m || 0));
  }
  return Infinity;
}
function pointInPolygon(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
    const inter = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function CheckInCore() {
  const [cfg, setCfg] = useState(null);
  const [appCfg, setAppCfg] = useState({ map_provider: 'osm' });
  const [mapRuntime,setMapRuntime]=useState({mode:'smart',provider:'osm',offline:false,tiles:{}});
  const [pos, setPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lineId, setLineId] = useState(null);
  const [method, setMethod] = useState('gps');
  const [open, setOpen] = useState(null);          // جلسهٔ باز
  const [loadError, setLoadError] = useState(null);
  const [timerInfo, setTimerInfo] = useState(null);
  const [handover, setHandover] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [proofVal, setProofVal] = useState('');
  const [perm, requestPerm] = useCameraPermissions();
  const timerRef = useRef(null);
  const timerSyncRef = useRef(null);
  const surplusAlertShownRef = useRef(false);

  const load = async () => {
    setLoadError(null);
    // موازی: config + موقعیت را با هم بگیر تا صفحه سریع باز شود
    const [cfgResult, timerResult] = await Promise.allSettled([
      request('/my/checkin-config', { noStore: true }),
      request('/my/work-timer', { noStore: true }),
    ]);
    if (timerResult && timerResult.status === 'fulfilled') setTimerInfo(timerResult.value);
    if (cfgResult.status === 'fulfilled') {
      const c = cfgResult.value;
      setCfg(c);
      setOpen(c.open || null);
    } else {
      // مهم: در صورت خطای شبکه/سرور، وضعیت قبلی (ممکن است کهنه باشد) دست‌نخورده می‌ماند
      // و به‌جای نمایش نادرست «بدون جلسهٔ باز»، خطا به کاربر اعلام و امکان تلاش مجدد داده می‌شود.
      setLoadError(cfgResult.reason?.message || 'دریافت وضعیت ثبت حضور ناموفق بود. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
    }
    setLoading(false); // صفحه را فوری نشان بده
    // تعیین خودکار محدوده: ابتدا موقعیت تقریبی شبکه/GSM و سپس جایگزینی با GPS دقیق.
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const gsm = await getGsmPosition({ timeoutMs: 4500 });
        if (gsm?.coords) {
          setPos({ lat: gsm.coords.latitude, lng: gsm.coords.longitude, acc: gsm.coords.accuracy, ts: gsm.timestamp, viaGsm: true });
        }
        // GPS دقیق بعد از نمایش سریع محدوده، بدون نیاز به دکمهٔ کاربر دریافت و جایگزین می‌شود.
        const gps = await getAccuratePosition({ samples: 5, timeoutMs: 10000, desiredAccuracy: 12 });
        if (gps?.coords) {
          setPos({ lat: gps.coords.latitude, lng: gps.coords.longitude, acc: gps.coords.accuracy, ts: gps.timestamp, viaGsm: false });
        }
      }
    } catch {}
  };
  useEffect(() => { load(); getAppConfig().then((c) => c && setAppCfg(c)).catch(() => {}); }, []);
  useEffect(()=>{ let alive=true; (async()=>{ const mode=await AsyncStorage.getItem('map_offline_mode')||'smart'; const provider=await AsyncStorage.getItem('map_offline_provider')||'osm'; const net=await NetInfo.fetch(); const cached=await isTileCached(provider); const offline=mode==='offline'||(mode==='smart'&&!net.isConnected); let tiles={}; if(offline&&cached){ const c=pos||{lat:36.297,lng:59.606}; tiles=await loadLocalTilesAround(c.lat,c.lng,15,3); } if(alive)setMapRuntime({mode,provider,offline:offline&&cached,tiles}); })().catch(()=>{}); return()=>{alive=false}; },[pos?.lat,pos?.lng]);


  // تشخیص خودکار نزدیک‌ترین خط تعریف‌شده برای کاربر بر اساس موقعیت دقیق GPS؛ انتخاب دستی خط حذف شده است.
  useEffect(() => {
    if (!pos || !cfg?.lines?.length || open) return;
    let best = null;
    for (const l of cfg.lines) {
      const fences = l.geofences || [];
      if (!fences.length) continue;
      const ds = fences.map((g) => distanceToFence(pos.lat, pos.lng, g)).filter((x) => isFinite(x));
      if (!ds.length) continue;
      const d = Math.min(...ds);
      if (!best || d < best.d) best = { id: l.id, d };
    }
    if (best && best.id !== lineId) setLineId(best.id);
  }, [pos?.lat, pos?.lng, cfg?.lines?.length, open]);

  // بروزرسانی موقعیت من روی نقشه
  const [refreshingPos, setRefreshingPos] = useState(false);
  const refreshMyLocation = async () => {
    setRefreshingPos(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('دسترسی موقعیت', 'برای نمایش موقعیت، اجازهٔ دسترسی به موقعیت لازم است.'); return; }
      const gsm = await getGsmPosition({ timeoutMs: 4000 });
      if (gsm?.coords) setPos({ lat: gsm.coords.latitude, lng: gsm.coords.longitude, acc: gsm.coords.accuracy, ts: gsm.timestamp, viaGsm: true });
      const p = await getAccuratePosition({ samples: 5, timeoutMs: 10000, desiredAccuracy: 12 });
      if (p?.coords) setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, ts: p.timestamp, viaGsm: false });
      else if (!gsm?.coords) Alert.alert('موقعیت', 'دریافت موقعیت ناموفق بود. GPS را روشن کنید و دوباره تلاش کنید.');
    } catch (e) { Alert.alert('خطا', 'دریافت موقعیت ناموفق بود.'); }
    finally { setRefreshingPos(false); }
  };

  // تایمر حضور
  useEffect(() => {
    if (open && open.check_in) {
      // نکته: قبلاً از new Date(check_in.replace(' ','T')) استفاده می‌شد که رشتهٔ زمانِ
      // بدون‌منطقه‌زمانیِ سرور (ساعت تهران) را به‌اشتباه به‌عنوان «ساعت محلی گوشی» تفسیر
      // می‌کرد — اگر منطقهٔ زمانی گوشی با تهران یکی نبود، مدت‌زمان حضورِ نمایش‌داده‌شده
      // کاملاً غلط می‌شد. حالا از تابع مشترک و صحیح tehranTimeToEpochMs استفاده می‌شود.
      const start = tehranTimeToEpochMs(open.check_in);
      if (start == null) { setElapsed(0); return; }
      const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick(); timerRef.current = setInterval(tick, 1000);
      return () => clearInterval(timerRef.current);
    } else { setElapsed(0); if (timerRef.current) clearInterval(timerRef.current); }
  }, [open]);


  // همگام‌سازی دوره‌ای تایمر با سرور؛ محاسبهٔ لحظه‌ای روی گوشی انجام می‌شود اما مرجع زمان سرور است.
  useEffect(() => {
    if (timerSyncRef.current) clearInterval(timerSyncRef.current);
    if (!open) { surplusAlertShownRef.current = false; return; }
    const syncTimer = async () => {
      try {
        const r = await request('/my/work-timer');
        if (r) setTimerInfo(r);
      } catch {}
    };
    timerSyncRef.current = setInterval(syncTimer, Math.max(30, +(timerInfo?.next_sync_sec || 60)) * 1000);
    return () => { if (timerSyncRef.current) clearInterval(timerSyncRef.current); };
  }, [open?.id, timerInfo?.next_sync_sec]);

  const line = cfg?.lines?.find((l) => l.id === lineId);
  // اگر روش فعلی برای خط انتخابی مجاز نباشد، به اولین روش مجاز سوییچ کن
  useEffect(() => {
    if (!line) return;
    const allowed = (line.checkin_methods && Array.isArray(line.checkin_methods) && line.checkin_methods.length) ? line.checkin_methods : null;
    if (allowed && !allowed.includes(method)) setMethod(allowed[0]);
  }, [lineId]);
  // نزدیک‌ترین فاصله تا محدودهٔ خط انتخاب‌شده
  const toleranceM = appCfg?.checkin_error_radius_m || 0;
  let distance = null;
  if (pos && line && line.geofences?.length) {
    distance = Math.min(...line.geofences.map((g) => distanceToFence(pos.lat, pos.lng, g)));
  }
  const inArea = distance != null && distance <= toleranceM;

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return faNum(`${p(h)}:${p(m)}:${p(ss)}`);
  };

  const fmtHM = (minutes) => {
    const m = Math.max(0, Math.floor(+minutes || 0));
    return `${faNum(String(Math.floor(m / 60)).padStart(2, '0'))}:${faNum(String(m % 60).padStart(2, '0'))}`;
  };
  const liveTimer = (() => {
    if (!open) return null;
    const expected = +(timerInfo?.expected_min || 453);
    const cap = +(timerInfo?.ot_cap_min || 27);
    const elapsedMin = Math.floor(elapsed / 60);
    const remaining = Math.max(0, expected - elapsedMin);
    const overtime = Math.max(0, Math.min(Math.max(0, elapsedMin - expected), cap));
    const surplus = Math.max(0, elapsedMin - expected - cap);
    const phase = remaining > 0 ? 'duty' : (overtime < cap ? 'overtime' : 'surplus');
    return { expected, cap, elapsedMin, remaining, overtime, surplus, phase };
  })();
  useEffect(() => {
    if (liveTimer?.phase === 'surplus' && !surplusAlertShownRef.current) {
      surplusAlertShownRef.current = true;
      Alert.alert('سقف اضافه‌کار', 'سقف اضافه‌کار روزانه شما پر شده است؛ لطفاً ثبت خروج را انجام دهید.');
    }
    if (liveTimer?.phase !== 'surplus') surplusAlertShownRef.current = false;
  }, [liveTimer?.phase]);

  async function doCheckin(proof) {
    setBusy(true);
    try {
      let lat, lng;
      // ابتدا از همان موقعیتی که در نقشه نمایش داده شده استفاده کن (تا با بررسی محدوده تطابق داشته باشد)
      if (pos && pos.lat && pos.lng) { lat = pos.lat; lng = pos.lng; }
      else { try { const p = await getAccuratePosition({ samples: 4, timeoutMs: 10000, desiredAccuracy: 15 }); if (p) { lat = p.coords.latitude; lng = p.coords.longitude; } } catch {} }
      const body = { method, lat, lng, accuracy: pos?.acc || undefined };
      // خط به‌صورت دستی از اپ ارسال نمی‌شود؛ سرور باید حضور را در همهٔ خطوط تعریف‌شدهٔ کاربر بررسی و خط صحیح را خودش ثبت کند.
      if (method !== 'gps') body.proof = proof != null ? proof : proofVal;
      body.client_time = new Date().toISOString();
      body.client_uuid = 'checkin_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      let r;
      try {
        r = await postOrQueue('/my/checkin', body, 'checkin');
      } catch (firstError) {
        const msg=String(firstError?.message||'');
        if(method==='gps' && (msg.includes('محدوده') || msg.includes('موقعیت'))){
          const fresh=await getAccuratePosition({ samples: 6, timeoutMs: 15000, desiredAccuracy: 12 });
          if(fresh){
            body.lat=fresh.coords.latitude; body.lng=fresh.coords.longitude; body.accuracy=fresh.coords.accuracy;
            body.client_uuid='checkin_retry_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
            r=await postOrQueue('/my/checkin',body,'checkin');
          } else throw firstError;
        } else throw firstError;
      }
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'ورود ذخیره شد و بعد از اتصال ارسال می‌شود.' : 'ورود شما ثبت شد.');
      setProofVal('');
      await load();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ورود ناموفق'); }
    finally { setBusy(false); }
  }
  async function doCheckout() {
    setBusy(true);
    try {
      let lat, lng;
      try { const p = await getAccuratePosition({ samples: 3, timeoutMs: 9000, desiredAccuracy: 20 }); if (p) { lat = p.coords.latitude; lng = p.coords.longitude; } } catch {}
      const r = await postOrQueue('/my/checkout', { lat, lng, client_time: new Date().toISOString(), client_uuid: 'checkout_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) }, 'checkout');
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'خروج ذخیره شد و بعد از اتصال ارسال می‌شود.' : 'خروج شما ثبت شد.');
      await load();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت خروج ناموفق'); }
    finally { setBusy(false); }
  }

  // خواندن خودکار BSSID شبکهٔ WiFi متصل (نیازمند مجوز موقعیت و روشن‌بودن GPS در اندروید)
  const readWifi = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('مجوز لازم', 'برای خواندن مشخصات WiFi، دسترسی موقعیت لازم است.'); return; }
      const NetInfo = require('@react-native-community/netinfo').default;
      const st = await NetInfo.fetch();
      const bssid = st?.details?.bssid;
      if (bssid && bssid !== '02:00:00:00:00:00') { setProofVal(bssid); Alert.alert('شناسه خوانده شد', 'BSSID: ' + bssid + '\nاکنون اسلایدر را بکشید.'); }
      else Alert.alert('ناموفق', 'BSSID خوانده نشد. مطمئن شوید به WiFi متصل و موقعیت مکانی روشن است، یا مقدار را دستی وارد کنید.');
    } catch (e) { Alert.alert('خطا', 'خواندن WiFi ممکن نشد. مقدار را دستی وارد کنید.'); }
  };

  async function startHandover() {
    setBusy(true);
    try {
      const r = await request('/my/shift-handover/start', { method: 'POST', body: { ttl_min: 5 } });
      setHandover(r);
      Alert.alert('تحویل شیفت', 'کد تحویل شیفت ساخته شد. تحویل‌گیرنده باید این کد/QR را اسکن کند.');
    } catch (e) { Alert.alert('خطا', e.message || 'ساخت کد تحویل شیفت ناموفق بود'); }
    finally { setBusy(false); }
  }
  async function acceptHandover(token) {
    setBusy(true);
    try {
      let lat, lng;
      try { const p = await getAccuratePosition({ samples: 3, timeoutMs: 9000, desiredAccuracy: 20 }); if (p) { lat = p.coords.latitude; lng = p.coords.longitude; } } catch {}
      await request('/my/shift-handover/accept', { method: 'POST', body: { token, lat, lng } });
      Alert.alert('ثبت شد', 'تحویل شیفت انجام شد؛ برای نفر قبلی خروج و برای شما ورود ثبت شد.');
      setScanOpen(false); await load();
    } catch (e) { Alert.alert('خطا', e.message || 'تحویل شیفت ناموفق بود'); }
    finally { setBusy(false); }
  }

  // وقتی اسلایدر کامل کشیده شد
  const onSlideComplete = () => {
    if (open) { doCheckout(); return; }
    if (method === 'gps') {
      // تصمیم نهایی با سرور است. سرور همهٔ خطوط تعریف‌شده برای کاربر را بررسی می‌کند و اگر کاربر داخل هرکدام باشد همان خط را ثبت می‌کند.
      doCheckin();
    } else if (method === 'qr') {
      if (!perm?.granted) requestPerm().then((r) => { if (r.granted) setScanOpen(true); }); else setScanOpen(true);
    } else {
      if (!proofVal.trim()) { Alert.alert('توجه', 'مقدار شناسه را وارد کنید یا با دکمهٔ خواندن خودکار/اسکن دریافت کنید.'); return; }
      doCheckin(proofVal.trim());
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (loadError && !cfg) return <View style={s.center}>
    <Text style={{ color: '#b04a42', fontFamily: FONT.bold, textAlign: 'center', marginBottom: 14, paddingHorizontal: 20 }}>{loadError}</Text>
    <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 }}>
      <Text style={{ color: '#fff', fontFamily: FONT.bold }}>تلاش مجدد</Text>
    </TouchableOpacity>
  </View>;
  if (!cfg?.lines?.length) return <View style={s.center}><Text style={s.muted}>خط مجازی برای شما تعریف نشده است.</Text></View>;

  const mapHtml = buildMapHtml(line, pos, appCfg, mapRuntime);

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {loadError && cfg && <View style={{ backgroundColor: '#fff4d7', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#8a6100', fontFamily: FONT.regular, fontSize: 12, flex: 1 }}>آخرین تازه‌سازی وضعیت ناموفق بود؛ اطلاعات نمایش‌داده‌شده ممکن است قدیمی باشد.</Text>
        <TouchableOpacity onPress={() => load()} style={{ marginRight: 8 }}><Text style={{ color: C.brand, fontFamily: FONT.bold, fontSize: 12 }}>تلاش مجدد</Text></TouchableOpacity>
      </View>}
      {/* خط به‌صورت خودکار از روی موقعیت کاربر تشخیص داده می‌شود؛ انتخاب دستی حذف شده است. */}
      <Text style={s.label}>خط تشخیص‌داده‌شده</Text>
      <View style={s.autoLineBox}>
        <Text style={s.autoLineTitle}>
          {line ? `خط ${faNum(line.code || line.id)}` : 'در حال تشخیص خودکار خط'}
        </Text>
        <Text style={s.autoHint}>
          برای ثبت حضور نیازی به انتخاب خط نیست. اگر داخل محدودهٔ هرکدام از خطوط تعریف‌شده برای شما باشید، سرور همان خط را به‌صورت خودکار ثبت می‌کند.
        </Text>
      </View>

      {/* نقشه */}
      <TouchableOpacity style={s.refreshPosBtn} onPress={refreshMyLocation} disabled={refreshingPos}>
        <Text style={s.refreshPosTxt}>{refreshingPos ? 'در حال یافتن موقعیت…' : '📍 بروزرسانی موقعیت من'}</Text>
      </TouchableOpacity>
      <View style={s.mapBox}>
        <WebView originWhitelist={['*', 'file://']} source={{ html: mapHtml }}
          style={{ flex: 1 }} scrollEnabled={false}
          javaScriptEnabled domStorageEnabled mixedContentMode="always"
          setSupportMultipleWindows={false}
          allowFileAccess allowUniversalAccessFromFileURLs allowFileAccessFromFileURLs
          onError={() => {}} />
      </View>

      {/* فاصله */}
      <View style={s.distRow}>
        {distance == null ? <Text style={s.muted}>محدوده‌ای برای این خط تعریف نشده یا موقعیت در دسترس نیست.</Text> :
          inArea ? <Text style={[s.distTxt, { color: C.ok }]}>✓ شما داخل محدودهٔ ایستگاه هستید</Text> :
            <Text style={s.distTxt}>فاصله تا محدودهٔ خط: <Text style={{ color: C.danger, fontFamily: FONT.bold }}>{faNum(Math.round(distance))} متر</Text></Text>}
      </View>

      {/* تایمر حضور */}
      {open && (
        <View style={s.timerBox}>
          <Text style={s.timerLabel}>مدت حضور شما</Text>
          <Text style={s.timer}>{fmtTime(elapsed)}</Text>
          {liveTimer ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[s.timerSub, { color: liveTimer.phase === 'duty' ? C.danger : (liveTimer.phase === 'overtime' ? '#b7791f' : C.danger) }]}> 
                {liveTimer.phase === 'duty'
                  ? `باقی‌مانده موظفی: ${fmtHM(liveTimer.remaining)}`
                  : liveTimer.phase === 'overtime'
                    ? `اضافه‌کار مجاز: ${faNum(liveTimer.overtime)} دقیقه از ${faNum(liveTimer.cap)} دقیقه`
                    : `سقف اضافه‌کار پر شده؛ مازاد حضور: ${faNum(liveTimer.surplus)} دقیقه`}
              </Text>
              <Text style={s.timerHint}>مرجع محاسبه: سرور · همگام‌سازی دوره‌ای فعال است</Text>
              {liveTimer.phase === 'surplus' ? <Text style={s.warnText}>سقف اضافه‌کار روزانه شما پر شده است؛ لطفاً ثبت خروج را انجام دهید.</Text> : null}
            </View>
          ) : null}
        </View>
      )}

      {/* روش ثبت حضور */}
      {!open && (
        <>
          <Text style={s.label}>روش ثبت حضور</Text>
          <View style={s.methodRow}>
            {[['gps', 'موقعیت (GPS)'], ['qr', 'اسکن QR'], ['wifi', 'WiFi'], ['bt', 'بلوتوث']]
              .filter(([k]) => !line || !line.checkin_methods || !Array.isArray(line.checkin_methods) || line.checkin_methods.length === 0 || line.checkin_methods.includes(k))
              .map(([k, t]) => (
              <TouchableOpacity key={k} style={[s.mChip, method === k && s.mChipOn]} onPress={() => setMethod(k)}>
                <Text style={[s.mChipTxt, method === k && s.mChipTxtOn]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {(method === 'wifi' || method === 'bt') && (
            <TextInput style={s.input} value={proofVal} onChangeText={setProofVal} autoCapitalize="none"
              placeholder={method === 'wifi' ? 'BSSID وای‌فای (مثلاً a1:b2:c3:d4:e5:f6)' : 'MAC بلوتوث'} placeholderTextColor={C.muted} />
          )}
          {method === 'wifi' && (
            <TouchableOpacity style={s.readBtn} onPress={readWifi}><Text style={s.readBtnTxt}>📶 خواندن خودکار شبکهٔ متصل</Text></TouchableOpacity>
          )}
          {(method === 'wifi' || method === 'bt') && (
            <Text style={s.hint}>این مقدار باید با یکی از شناسه‌های تعریف‌شدهٔ خط در پنل مطابقت داشته باشد. برای WiFi باید به شبکهٔ همان ایستگاه متصل باشید و موقعیت مکانی روشن باشد. برای بلوتوث، MAC دستگاه ثابت ایستگاه را وارد کنید.</Text>
          )}
        </>
      )}

      {/* اسلایدر ورود/خروج */}
      <SlideButton mode={open ? 'out' : 'in'} disabled={busy} onComplete={onSlideComplete} />
      {open ? <TouchableOpacity style={s.handoverBtn} onPress={startHandover} disabled={busy}><Text style={s.handoverTxt}>🔁 تحویل شیفت با QR</Text></TouchableOpacity> : <TouchableOpacity style={s.readBtn} onPress={() => { if (!perm?.granted) requestPerm().then((r)=>{ if(r.granted) setScanOpen(true); }); else setScanOpen(true); }}><Text style={s.readBtnTxt}>📷 اسکن کد تحویل شیفت</Text></TouchableOpacity>}
      {handover ? <View style={s.qrBox}><Text style={s.qrTitle}>کد تحویل شیفت</Text>
        <WebView
          originWhitelist={['*']}
          scrollEnabled={false}
          style={{ width: 240, height: 240, alignSelf: 'center', backgroundColor: '#fff' }}
          source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:100%}img{width:220px;height:220px;image-rendering:pixelated}</style></head><body><img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=${encodeURIComponent(String(handover.qr || handover.token || ''))}"></body></html>` }}
        />
        <Text selectable style={s.qrCode}>{handover.qr || handover.token}</Text><Text style={s.hint}>اعتبار کد محدود است. تحویل‌گیرنده تصویر QR را اسکن کند.</Text></View> : null}

      {/* اسکنر QR */}
      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {perm?.granted ? (
            <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => { if (String(data||'').startsWith('SHIFT_HANDOVER:')) acceptHandover(data); else { setScanOpen(false); doCheckin(data); } }} />
          ) : <View style={s.center}><Text style={{ color: '#fff' }}>دسترسی دوربین لازم است</Text></View>}
          <TouchableOpacity style={s.scanClose} onPress={() => setScanOpen(false)}><Text style={s.scanCloseTxt}>بستن</Text></TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

function fmtMinFa(min){const n=Math.max(0,Number(min)||0),h=Math.floor(n/60),m=n%60;return `${faNum(h)}:${String(m).padStart(2,'0').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d])}`;}
function CheckInPerformanceTab(){
  const [date,setDate]=useState(null); const [data,setData]=useState(null); const [busy,setBusy]=useState(true); const [err,setErr]=useState('');
  const load=async(d=date)=>{setBusy(true);setErr('');try{const q=d?`?date=${encodeURIComponent(d)}`:'';setData(await request(`/my/daily-performance${q}`,{noStore:true}));}catch(e){setErr(e.message||'دریافت عملکرد روزانه ناموفق بود.');}finally{setBusy(false)}};
  useEffect(()=>{load()},[date]);
  const shiftDate=(delta)=>{if(!data?.date)return;const [y,m,d]=data.date.split('-').map(Number);const g=jalali_to_gregorian_client(y,m,d);const t=new Date(g[0],g[1]-1,g[2]);t.setDate(t.getDate()+delta);const j=gregorian_to_jalali_client(t.getFullYear(),t.getMonth()+1,t.getDate());setDate(`${j[0]}-${String(j[1]).padStart(2,'0')}-${String(j[2]).padStart(2,'0')}`)};
  if(busy&&!data)return <View style={s.center}><ActivityIndicator size={80} message="در حال دریافت عملکرد…"/></View>;
  const w=data?.data||{};const cards=[['کارکرد',w.worked],['حضور در شیفت',w.in_shift],['موظفی',w.expected],['اضافه‌کار',w.overtime],['کسری کار',w.shortage],['شب‌کاری',w.night]];
  return <View style={{padding:14}}>{err?<Text style={s.warnText}>{err}</Text>:null}<View style={s.perfNav}><TouchableOpacity style={s.perfNavBtn} onPress={()=>shiftDate(1)}><Text style={s.perfNavTxt}>روز بعد ›</Text></TouchableOpacity><Text style={s.perfDate}>{data?.weekday||''} {'('}{data?.date||''}{')'}</Text><TouchableOpacity style={s.perfNavBtn} onPress={()=>shiftDate(-1)}><Text style={s.perfNavTxt}>‹ روز قبل</Text></TouchableOpacity></View><View style={s.perfHero}><Text style={s.perfTitle}>عملکرد روزانه</Text><Text style={s.perfShift}>{data?.shift_title||'شیفت کاری'}</Text></View><View style={s.perfGrid}>{cards.map(([l,v])=><View key={l} style={s.perfCard}><Text style={s.perfValue}>{fmtMinFa(v)}</Text><Text style={s.perfLabel}>{l}</Text></View>)}</View><View style={s.perfCardWide}><Text style={s.perfLabel}>وضعیت امروز</Text><Text style={s.perfStatus}>{data?.holiday?`تعطیل: ${data.holiday_title||'رسمی'}`:(w.is_off?'روز بدون شیفت':(w.worked>0?'حضور ثبت شده':'هنوز حضوری ثبت نشده'))}</Text>{w.late_in>0?<Text style={s.perfHint}>تأخیر ورود: {faNum(w.late_in)} دقیقه</Text>:null}{w.early_out>0?<Text style={s.perfHint}>تعجیل خروج: {faNum(w.early_out)} دقیقه</Text>:null}</View></View>;
}
function jalali_to_gregorian_client(j,m,d){
  const gy=j>979?1600:621, jy=j>979?j-979:j-1, days=365*jy+Math.floor(jy/33)*8+Math.floor((jy%33+3)/4)+78+d-1+(m<7?(m-1)*31:(m-7)*30+186);let gy2=gy+400*Math.floor(days/146097);let r=days%146097;if(r>36524){gy2+=100*Math.floor(--r/36524);r%=36524;if(r>=365)r++}gy2+=4*Math.floor(r/1461);r%=1461;if(r>365){gy2+=Math.floor((r-1)/365);r=(r-1)%365}let gd=r+1,gm;const sal=[31,(gy2%4===0&&(gy2%100!==0||gy2%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];for(gm=0;gm<12&&gd>sal[gm];gm++)gd-=sal[gm];return[gy2,gm+1,gd];
}
function gregorian_to_jalali_client(gy,gm,gd){const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];let gy2=gy+100000,jy=979+33*Math.floor(gy2/33),r=gy2%33;let d=365*gy2+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)+gd+gdm[gm-1];if(gm>2&&((gy%4===0&&gy%100!==0)||gy%400===0))d++;d-=79;let y=979+33*Math.floor(d/12053);d%=12053;y+=4*Math.floor(d/1461);d%=1461;if(d>365){y+=Math.floor((d-1)/365);d=(d-1)%365}const m=d<186?1+Math.floor(d/31):7+Math.floor((d-186)/30),day=1+(d<186?d%31:(d-186)%30);return[y,m,day];}
function CheckInShiftTab(){
  const [data,setData]=useState(null); const [busy,setBusy]=useState(true);const [err,setErr]=useState('');
  useEffect(()=>{request('/my/shift-schedule',{noStore:true}).then(setData).catch(e=>setErr(e.message||'دریافت برنامه شیفت ناموفق بود.')).finally(()=>setBusy(false))},[]);
  if(busy)return <View style={s.center}><ActivityIndicator size={80} message="در حال دریافت شیفت کاری…"/></View>;
  return <ScrollView contentContainerStyle={{padding:14}}>{err?<Text style={s.warnText}>{err}</Text>:null}<View style={s.shiftHero}><Text style={s.shiftHeroTitle}>{data?.shift?.title||'شیفت کاری'}</Text><Text style={s.shiftHeroSub}>برنامهٔ ۱۴ روز آینده</Text></View>{(data?.days||[]).map(d=><View key={d.date} style={s.shiftCard}><View style={s.shiftAccent}/><View style={{flex:1}}><Text style={s.shiftDate}>{d.weekday} <Text style={s.shiftDateLight}>({d.date})</Text></Text><Text style={s.shiftMeta}>{d.is_off?'روز استراحت/بدون موظفی':d.is_holiday?`تعطیل: ${d.holiday_title||''}`:'شیفت کاری'}</Text></View><Text style={s.shiftMinutes}>{d.is_off?'—':`${faNum(d.minutes)} دقیقه`}</Text></View>)}</ScrollView>;
}
export default function CheckInScreen(){
  const [tab,setTab]=useState('checkin');
  return <View style={{flex:1,backgroundColor:C.paper}}><View style={s.checkTabs}>{[['checkin','ثبت حضور'],['performance','عملکرد روزانه'],['shift','شیفت کاری']].map(([k,l])=><TouchableOpacity key={k} style={[s.checkTab,tab===k&&s.checkTabOn]} onPress={()=>setTab(k)}><Text style={[s.checkTabTxt,tab===k&&s.checkTabTxtOn]}>{l}</Text></TouchableOpacity>)}</View>{tab==='checkin'?<CheckInCore/>:tab==='performance'?<CheckInPerformanceTab/>:<CheckInShiftTab/>}</View>;
}

// اسلایدر کشیدنی برای تأیید ورود/خروج (سازگار با چیدمان راست‌به‌چپ)
function SlideButton({ mode, onComplete, disabled }) {
  const x = useRef(new Animated.Value(0)).current;   // مقدار مثبت = میزان پیشروی
  const widthRef = useRef(0);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const THUMB = 58;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (disabledRef.current) return;
      const max = Math.max(0, widthRef.current - THUMB - 6);
      // در RTL کاربر به چپ می‌کشد (dx منفی) و در LTR به راست؛ هر دو را بپذیر
      const prog = Math.min(Math.max(0, Math.abs(g.dx)), max);
      x.setValue(prog);
    },
    onPanResponderRelease: (_, g) => {
      if (disabledRef.current) { Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(); return; }
      const max = Math.max(0, widthRef.current - THUMB - 6);
      const prog = Math.min(Math.abs(g.dx), max);
      if (prog >= max * 0.75) {
        Animated.timing(x, { toValue: max, duration: 120, useNativeDriver: false }).start(() => {
          onComplete && onComplete();
          setTimeout(() => Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: false }).start(), 400);
        });
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
      }
    },
  })).current;
  const isOut = mode === 'out';
  // در RTL، انگشتشمار از سمت راست به چپ حرکت می‌کند؛ تامبِ ابتدای ریل سمت راست است
  // و با پیشروی به چپ می‌رود، پس translateX منفی می‌شود.
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  return (
    <View style={[ss.track, { backgroundColor: isOut ? '#fdecef' : '#e7f3ee', borderColor: isOut ? C.danger : C.brand, opacity: disabled ? 0.6 : 1 }]}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}>
      <Text style={[ss.trackTxt, { color: isOut ? C.danger : C.brand }]}>{isOut ? '◀ برای خروج بکشید' : '◀ برای ورود بکشید'}</Text>
      <Animated.View style={[ss.thumb, { right: 3, transform: [{ translateX: tx }], backgroundColor: isOut ? C.danger : C.brand }]} {...pan.panHandlers}>
        <Text style={ss.thumbTxt}>{isOut ? '⏻' : '◀'}</Text>
      </Animated.View>
    </View>
  );
}

// ساخت HTML نقشهٔ Leaflet
function buildMapHtml(line, pos, appCfg, mapRuntime={}) {
  const provider = (appCfg && appCfg.map_provider) || 'osm';
  const neshanKey = (appCfg && appCfg.neshan_api_key) || '';
  const fences = (line?.geofences || []).map((g) => {
    if (g.type === 'circle' && g.center_lat != null) return { t: 'c', lat: +g.center_lat, lng: +g.center_lng, r: +g.radius_m || 150, c: g.color || '#0d7a5f' };
    if (g.type === 'polygon' && g.polygon) { let p = g.polygon; try { if (typeof p === 'string') p = JSON.parse(p); } catch { p = []; } return { t: 'p', poly: p, c: g.color || '#0d7a5f' }; }
    return null;
  }).filter(Boolean);
  const center = pos ? [pos.lat, pos.lng] : (fences[0] ? (fences[0].t === 'c' ? [fences[0].lat, fences[0].lng] : fences[0].poly[0]) : [36.297, 59.606]);
  let sources;
  if (provider === 'google') sources = ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'];
  else if (provider === 'google_sat') sources = ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'];
  else if (provider === 'neshan' && neshanKey) sources = ['https://api.neshan.org/v1.0/tile/standard-day/{z}/{x}/{y}?key=' + neshanKey];
  else if (provider === 'balad') sources = ['https://t0.maps.balad.ir/v4/standard/{z}/{x}/{y}.png'];
  else sources = ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://tile.openstreetmap.de/{z}/{x}/{y}.png', 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'];
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#app{width:100%;height:100%;overflow:hidden;background:#e8eef2;font-family:Tahoma,sans-serif}
#map-wrap{position:relative;width:100%;height:100%;overflow:hidden}
#osm{position:absolute;inset:0}
#osm img{position:absolute;image-rendering:pixelated}
#svg-overlay{position:absolute;inset:0;pointer-events:none}
#me{position:absolute;width:22px;height:22px;background:#1e63d6;border:3px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 5px rgba(30,99,214,.28);pointer-events:none;z-index:20}
#info{position:absolute;bottom:8px;right:8px;background:rgba(255,255,255,.9);border-radius:8px;padding:5px 10px;font-size:11px;color:#555;z-index:30;max-width:180px;text-align:right;direction:rtl}
#zoom-btns{position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:4px;z-index:30}
.zb{width:32px;height:32px;background:#fff;border:none;border-radius:8px;font-size:20px;line-height:32px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.18);cursor:pointer}
#err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#e8eef2;font-size:13px;color:#666;text-align:center;padding:20px;direction:rtl;z-index:5}
</style></head><body>
<div id="app">
  <div id="map-wrap">
    <div id="osm"></div>
    <svg id="svg-overlay" xmlns="http://www.w3.org/2000/svg"></svg>
    <div id="me" style="display:none"></div>
    <div id="info"></div>
    <div id="zoom-btns"><button class="zb" onclick="changeZoom(1)">+</button><button class="zb" onclick="changeZoom(-1)">−</button></div>
  </div>
</div>
<script>
var FENCES=${JSON.stringify(fences)};
var POS=${pos ? JSON.stringify({lat:pos.lat,lng:pos.lng,acc:pos.acc||20}) : 'null'};
var LOCAL_TILES=${JSON.stringify(mapRuntime.tiles||{})};
var OFFLINE_MODE=${mapRuntime.offline?'true':'false'};
var INIT_CENTER=${pos ? JSON.stringify([pos.lat,pos.lng]) : (fences[0] ? (fences[0].t==='c' ? JSON.stringify([fences[0].lat,fences[0].lng]) : JSON.stringify(fences[0].poly[0])) : '[36.297,59.606]')};

// --- تبدیل geo به pixel ---
var zoom=OFFLINE_MODE?15:16, cx=INIT_CENTER[1], cy=INIT_CENTER[0];
var W=window.innerWidth, H=window.innerHeight;

function lngToTileX(lng,z){ return (lng+180)/360*Math.pow(2,z); }
function latToTileY(lat,z){ var s=Math.sin(lat*Math.PI/180); return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*Math.pow(2,z); }

function geoToScreen(lat,lng){
  var tx=lngToTileX(lng,zoom), ty=latToTileY(lat,zoom);
  var ocx=lngToTileX(cx,zoom), ocy=latToTileY(cy,zoom);
  return { x:W/2+(tx-ocx)*256, y:H/2+(ty-ocy)*256 };
}

// --- رندر تایل‌های OSM ---
var tileEls={};
function renderTiles(){
  var dom=document.getElementById('osm');
  var used={};
  var tx0=lngToTileX(cx,zoom), ty0=latToTileY(cy,zoom);
  var cols=Math.ceil(W/256)+3, rows=Math.ceil(H/256)+3;
  for(var dx=-Math.floor(cols/2);dx<=Math.ceil(cols/2);dx++){
    for(var dy=-Math.floor(rows/2);dy<=Math.ceil(rows/2);dy++){
      var tx=Math.floor(tx0)+dx, ty=Math.floor(ty0)+dy;
      if(tx<0||ty<0||tx>=Math.pow(2,zoom)||ty>=Math.pow(2,zoom))continue;
      var key=zoom+'_'+tx+'_'+ty;
      used[key]=true;
      var sx=W/2+(tx-tx0)*256, sy=H/2+(ty-ty0)*256;
      var el=tileEls[key];
      if(!el){
        el=document.createElement('img');
        el.width=256; el.height=256;
        var local=LOCAL_TILES[key];
        var s=['a','b','c'][Math.abs(tx+ty)%3];
        el.src=local || (OFFLINE_MODE ? '' : 'https://'+s+'.tile.openstreetmap.org/'+zoom+'/'+tx+'/'+ty+'.png');
        el.onerror=function(){ this.style.background='#d4dde6'; this.onerror=null; };
        el.style.position='absolute'; el.crossOrigin='anonymous';
        dom.appendChild(el); tileEls[key]=el;
      }
      el.style.left=Math.round(sx)+'px'; el.style.top=Math.round(sy)+'px';
    }
  }
  // حذف تایل‌های بیرون از viewport
  Object.keys(tileEls).forEach(function(k){ if(!used[k]){ tileEls[k].remove(); delete tileEls[k]; } });
}

// --- رندر geofenceها روی SVG ---
function renderFences(){
  var svg=document.getElementById('svg-overlay');
  svg.innerHTML='';
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  FENCES.forEach(function(g){
    if(g.t==='c'){
      var p=geoToScreen(g.lat,g.lng);
      // تبدیل radius متر به pixel (تقریبی)
      var mpp=156543.03*Math.cos(g.lat*Math.PI/180)/Math.pow(2,zoom);
      var r=g.r/mpp;
      var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',p.x); c.setAttribute('cy',p.y); c.setAttribute('r',r);
      c.setAttribute('stroke',g.c); c.setAttribute('stroke-width','3');
      c.setAttribute('fill',g.c); c.setAttribute('fill-opacity','0.15');
      svg.appendChild(c);
    } else if(g.t==='p'&&g.poly&&g.poly.length){
      var pts=g.poly.map(function(pp){ var s=geoToScreen(pp[0],pp[1]); return s.x+','+s.y; }).join(' ');
      var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points',pts);
      poly.setAttribute('stroke',g.c); poly.setAttribute('stroke-width','3');
      poly.setAttribute('fill',g.c); poly.setAttribute('fill-opacity','0.15');
      svg.appendChild(poly);
    }
  });
}

// --- موقعیت کاربر ---
function renderMe(){
  var me=document.getElementById('me');
  if(!POS){me.style.display='none';return;}
  var p=geoToScreen(POS.lat,POS.lng);
  me.style.display='block';
  me.style.left=p.x+'px'; me.style.top=p.y+'px';
  var acc=POS.acc||20;
  var mpp=156543.03*Math.cos(POS.lat*Math.PI/180)/Math.pow(2,zoom);
  document.getElementById('info').textContent=(OFFLINE_MODE?'نقشه آفلاین • ':'')+'دقت: '+Math.round(acc)+' متر';
}

function render(){ renderTiles(); renderFences(); renderMe(); }

// --- تبدیل tile ↔ latLng ---
function tileXToLng(tx,z){ return tx/Math.pow(2,z)*360-180; }
function tileYToLat(ty,z){ var n=Math.PI-2*Math.PI*ty/Math.pow(2,z); return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))); }
// محدودهٔ مشهد (بیشتر از این pan نکن)
var BOUNDS={minLat:36.15,maxLat:36.45,minLng:59.40,maxLng:59.85};
function clampCenter(lat,lng){ return {lat:Math.max(BOUNDS.minLat,Math.min(BOUNDS.maxLat,lat)),lng:Math.max(BOUNDS.minLng,Math.min(BOUNDS.maxLng,lng))}; }
// --- pan با لمس (محاسبهٔ صحیح درجه/پیکسل از سیستم tile) ---
var touch0=null, startTx, startTy;
document.addEventListener('touchstart',function(e){ if(e.touches.length===1){
  touch0={x:e.touches[0].clientX,y:e.touches[0].clientY};
  startTx=lngToTileX(cx,zoom); startTy=latToTileY(cy,zoom);
} },{passive:true});
document.addEventListener('touchmove',function(e){ if(e.touches.length===1&&touch0){
  var dx=e.touches[0].clientX-touch0.x, dy=e.touches[0].clientY-touch0.y;
  // هر پیکسل = 1/256 واحد tile
  var newTx=startTx - dx/256, newTy=startTy - dy/256;
  var clamped=clampCenter(tileYToLat(newTy,zoom), tileXToLng(newTx,zoom));
  cy=clamped.lat; cx=clamped.lng; render();
} },{passive:true});

// --- zoom ---
function changeZoom(d){ zoom=Math.max(10,Math.min(19,zoom+d)); tileEls={}; document.getElementById('osm').innerHTML=''; render(); }

// اجرای اولیه — clamp مشهد
var initClamped=clampCenter(cy,cx); cy=initClamped.lat; cx=initClamped.lng;
render();
</script></body></html>`;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },  checkTabs: { flexDirection:'row-reverse', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.line, paddingHorizontal:10, paddingTop:8, paddingBottom:6, gap:6 },
  checkTab: { flex:1, minHeight:42, borderRadius:12, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.line, backgroundColor:'#fff' },
  checkTabOn: { backgroundColor:C.brand, borderColor:C.brand }, checkTabTxt:{fontFamily:FONT.bold,fontSize:12,color:C.ink}, checkTabTxtOn:{color:'#fff'},
  perfNav:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff',borderRadius:14,padding:8,borderWidth:1,borderColor:C.line},
  perfNavBtn:{paddingVertical:9,paddingHorizontal:10},perfNavTxt:{fontFamily:FONT.bold,fontSize:12,color:C.brand},perfDate:{fontFamily:FONT.bold,fontSize:13,color:C.ink},
  perfHero:{backgroundColor:C.brand,borderRadius:16,padding:16,marginTop:10},perfTitle:{fontFamily:FONT.bold,fontSize:19,color:'#fff',textAlign:'right'},perfShift:{fontFamily:FONT.regular,fontSize:12,color:'#dcefe9',marginTop:4,textAlign:'right'},
  perfGrid:{flexDirection:'row-reverse',flexWrap:'wrap',justifyContent:'space-between',marginTop:10},perfCard:{width:'48.5%',backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:13,marginBottom:9},perfValue:{fontFamily:FONT.bold,fontSize:20,color:C.brand,textAlign:'left'},perfLabel:{fontFamily:FONT.bold,fontSize:12,color:C.ink,textAlign:'right',marginTop:5},perfCardWide:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:14,marginTop:2},perfStatus:{fontFamily:FONT.bold,fontSize:14,color:C.brand,textAlign:'right',marginTop:6},perfHint:{fontFamily:FONT.regular,fontSize:11,color:C.muted,textAlign:'right',marginTop:4},
  shiftHero:{backgroundColor:C.brand,borderRadius:16,padding:16,marginBottom:10},shiftHeroTitle:{fontFamily:FONT.bold,fontSize:19,color:'#fff',textAlign:'right'},shiftHeroSub:{fontFamily:FONT.regular,fontSize:12,color:'#dcefe9',textAlign:'right',marginTop:4},
  shiftCard:{backgroundColor:'#fff',borderRadius:14,marginBottom:10,minHeight:90,borderWidth:1,borderColor:C.line,flexDirection:'row-reverse',alignItems:'center',padding:12,elevation:2,shadowColor:'#000',shadowOpacity:.08,shadowRadius:7,shadowOffset:{width:0,height:3}},shiftAccent:{width:9,height:'100%',minHeight:64,borderRadius:8,backgroundColor:'#b78be0',marginLeft:10},shiftDate:{fontFamily:FONT.bold,fontSize:15,color:C.ink,textAlign:'right'},shiftDateLight:{fontFamily:FONT.regular,fontSize:12,color:C.muted},shiftMeta:{fontFamily:FONT.regular,fontSize:11,color:C.muted,textAlign:'right',marginTop:6},shiftMinutes:{fontFamily:FONT.bold,fontSize:13,color:C.ink,minWidth:72,textAlign:'left'},

  label: { fontFamily: FONT.bold, fontSize: 14, color: C.ink, textAlign: 'right', marginTop: 8, marginBottom: 6 },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center' },
  hint: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
  autoLineBox: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, marginBottom: 10 },
  autoLineTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 6 },
  lineChip: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, marginLeft: 8 },
  lineChipOn: { backgroundColor: C.brand, borderColor: C.brand },
  lineChipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 13 },
  lineChipTxtOn: { color: '#fff', fontFamily: FONT.bold },
  mapBox: { height: 280, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line, marginBottom: 10 },
  refreshPosBtn: { backgroundColor: '#eef4ff', borderWidth: 1, borderColor: '#3b5bd6', borderRadius: 11, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  refreshPosTxt: { color: '#3b5bd6', fontFamily: FONT.bold, fontSize: 13 },
  distRow: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, marginBottom: 12 },
  distTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 14, textAlign: 'center' },
  timerBox: { alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: '#e7f3ee', marginBottom: 14 },
  timerLabel: { fontFamily: FONT.regular, color: C.brand2, fontSize: 13 },
  timerSub: { fontFamily: FONT.bold, fontSize: 13, textAlign: 'center' },
  timerHint: { fontFamily: FONT.regular, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 4 },
  warnText: { fontFamily: FONT.bold, color: C.danger, fontSize: 12, textAlign: 'center', marginTop: 4 },
  handoverBtn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  handoverTxt: { fontFamily: FONT.bold, color: '#b45309', fontSize: 14 },
  qrBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 10 },
  qrTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'center', marginBottom: 6 },
  qrCode: { fontFamily: FONT.bold, color: C.brand, textAlign: 'center', direction: 'ltr' },
  timer: { fontFamily: FONT.bold, color: C.brand, fontSize: 38, letterSpacing: 2, marginTop: 4 },
  methodRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  mChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  mChipOn: { backgroundColor: C.ink, borderColor: C.ink },
  mChipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5 },
  mChipTxtOn: { color: '#fff', fontFamily: FONT.bold },
  readBtn: { backgroundColor: '#eef4ff', borderWidth: 1, borderColor: '#3b5bd6', borderRadius: 11, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  readBtnTxt: { color: '#3b5bd6', fontFamily: FONT.bold, fontSize: 13 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, fontFamily: FONT.regular, fontSize: 14, textAlign: 'right', color: C.ink, marginTop: 4 },
  scanClose: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 24 },
  scanCloseTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
});

const ss = StyleSheet.create({
  track: { height: 64, borderRadius: 32, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 16, overflow: 'hidden' },
  trackTxt: { fontFamily: FONT.bold, fontSize: 15 },
  thumb: { position: 'absolute', right: 3, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  thumbTxt: { color: '#fff', fontSize: 24, fontWeight: '700' },
});
