import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { faNum } from '../num';
import { tehranTimeToEpochMs } from '../jdate';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, PanResponder, Animated, TextInput, Modal, Platform, PermissionsAndroid, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import { getAccuratePosition, getGsmPosition } from '../location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { request, postOrQueue, cachedValue, flushQueuedRequests, hasPendingAttendanceCheckout, invalidateCachedValue } from '../api';
import { getAppConfig } from '../appconfig';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import WifiManager from 'react-native-wifi-reborn';
import { isTileCached, loadLocalTilesAround } from '../mapCache';

// فاصلهٔ هاورساین به متر
const WIFI_BSSID_CACHE_KEY = 'wifi_authorized_bssids_v1';
function normalizeBssid(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}|(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}|\b[0-9a-f]{12}\b/i);
  return match ? match[0].replace(/[^0-9a-f]/gi, '').toLowerCase() : '';
}
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
  // جلوگیری از race بین loadهای پس‌زمینه و ورود/خروج جدید؛ پاسخ یک load قدیمی
  // نباید وضعیت جلسهٔ جدید را دوباره null یا به جلسهٔ قبلی برگرداند.
  const attendanceStateEpochRef = useRef(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [proofVal, setProofVal] = useState('');
  const [wifiScanStatus, setWifiScanStatus] = useState('');
  const [wifiMatch, setWifiMatch] = useState(null);
  const [exitReminder, setExitReminder] = useState(false);
  const exitReminderIdRef = useRef(null);
  const exitReminderAlertRef = useRef(false);
  const [perm, requestPerm] = useCameraPermissions();
  const timerRef = useRef(null);
  const timerSyncRef = useRef(null);
  const surplusAlertShownRef = useRef(false);
  const PRESENCE_RANDOM_CACHE_KEY = 'presence_random_schedule_v1';
  const LOCAL_OPEN_KEY = 'attendance_local_open_v1';
  const LOCAL_WORKED_KEY = 'attendance_local_worked_v1';
  const REMEMBER_SOUND = 'remember.mp3';
  const REMEMBER_CHANNEL_ID = 'attendance_8h_reminder_v1';
  const persistLocalOpen = async (value) => { try { if (value) await AsyncStorage.setItem(LOCAL_OPEN_KEY, JSON.stringify(value)); else await AsyncStorage.removeItem(LOCAL_OPEN_KEY); } catch {} };
  const readLocalOpen = async () => { try { const raw = await AsyncStorage.getItem(LOCAL_OPEN_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const readLocalWorked = async () => { try { const raw = await AsyncStorage.getItem(LOCAL_WORKED_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const persistLocalWorked = async (value) => { try { if (value) await AsyncStorage.setItem(LOCAL_WORKED_KEY, JSON.stringify(value)); else await AsyncStorage.removeItem(LOCAL_WORKED_KEY); } catch {} };

  const cacheAuthorizedWifi = async (config) => {
    try {
      const entries = (config?.lines || []).flatMap((l) => (l.idents || [])
        .filter((ident) => String(ident.kind || '').trim().toLowerCase() === 'wifi' && normalizeBssid(ident.value) && (!Array.isArray(l.checkin_methods) || !l.checkin_methods.length || l.checkin_methods.some((m) => String(m || '').trim().toLowerCase() === 'wifi')))
        .map((ident) => ({ line_id: Number(l.id), line_code: String(l.code || l.id), bssid: normalizeBssid(ident.value), label: String(ident.label || '') })));
      await AsyncStorage.setItem(WIFI_BSSID_CACHE_KEY, JSON.stringify({ entries, cached_at: Date.now() }));
    } catch {}
  };
  const getAuthorizedWifi = async () => {
    let config = null;
    let freshConfigLoaded = false;
    try {
      config = await request('/my/checkin-config', { noStore: true, timeoutMs: 10000 });
      freshConfigLoaded = true;
      if (config && typeof config === 'object') await cacheAuthorizedWifi(config);
    } catch {
      config = cfg;
      if (!config?.lines?.length) { try { config = await cachedValue('/my/checkin-config'); } catch {} }
    }
    if (Array.isArray(config?.lines)) {
      const entries = config.lines.flatMap((l) => (l.idents || [])
        .filter((ident) => String(ident.kind || '').trim().toLowerCase() === 'wifi' && normalizeBssid(ident.value) && (!Array.isArray(l.checkin_methods) || !l.checkin_methods.length || l.checkin_methods.some((m) => String(m || '').trim().toLowerCase() === 'wifi')))
        .map((ident) => ({ line: l, line_id: Number(l.id), line_code: String(l.code || l.id), bssid: normalizeBssid(ident.value), label: String(ident.label || '') })));
      if (entries.length) return entries;
      if (freshConfigLoaded) return [];
    }
    try {
      const raw = await AsyncStorage.getItem(WIFI_BSSID_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed?.entries || []).map((e) => ({ ...e, line: (config?.lines || []).find((l) => Number(l.id) === Number(e.line_id)) || { id: Number(e.line_id), code: e.line_code } }));
    } catch { return []; }
  };
  const ensureWifiScanPermissions = async () => {
    const granted = PermissionsAndroid.RESULTS.GRANTED;
    const fineLocation = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION || 'android.permission.ACCESS_FINE_LOCATION';
    const coarseLocation = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION || 'android.permission.ACCESS_COARSE_LOCATION';
    const nearbyWifi = 'android.permission.NEARBY_WIFI_DEVICES';

    // Wi-Fi scan results require fine location permission even though this
    // attendance method uses the BSSID only and does not use GPS coordinates.
    let fineGranted = await PermissionsAndroid.check(fineLocation);
    if (!fineGranted) {
      const result = await PermissionsAndroid.requestMultiple([coarseLocation, fineLocation]);
      fineGranted = result[fineLocation] === granted || await PermissionsAndroid.check(fineLocation);
      if (!fineGranted) {
        const permanentlyDenied = result[fineLocation] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
          || result[coarseLocation] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        const error = new Error(permanentlyDenied
          ? 'مجوز لازم برای اسکن شبکه‌های Wi-Fi داده نشده است. از تنظیمات برنامه، دسترسی موقعیت مکانی را فعال کنید.'
          : 'برای اسکن شبکه‌های اطراف، دسترسی موقعیت مکانی دقیق را در درخواست اندروید تأیید کنید.');
        if (permanentlyDenied) error.wifiSettingsAction = 'app';
        throw error;
      }
    }

    // Android 13+ has an additional runtime permission for nearby Wi-Fi devices.
    if (Number(Platform.Version) >= 33) {
      const nearbyGranted = await PermissionsAndroid.check(nearbyWifi);
      if (!nearbyGranted) {
        const result = await PermissionsAndroid.request(nearbyWifi, {
          title: 'اجازه اسکن شبکه‌های Wi-Fi اطراف',
          message: 'برای شناسایی BSSID خط مجاز و ثبت حضور با Wi-Fi، اجازه دسترسی به دستگاه‌های Wi-Fi نزدیک را بدهید. برنامه از مختصات GPS برای این روش استفاده نمی‌کند.',
          buttonPositive: 'اجازه دادن',
          buttonNegative: 'انصراف',
        });
        if (result !== granted) {
          const permanentlyDenied = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
          const error = new Error(permanentlyDenied
            ? 'مجوز اسکن Wi-Fi اطراف غیرفعال است. از تنظیمات برنامه، دسترسی دستگاه‌های نزدیک را فعال کنید.'
            : 'برای ثبت حضور با Wi-Fi، اجازه دسترسی به دستگاه‌های Wi-Fi نزدیک را تأیید کنید.');
          if (permanentlyDenied) error.wifiSettingsAction = 'app';
          throw error;
        }
      }
    }
  };

  const showWifiPrerequisiteAlert = (error) => {
    const action = error?.wifiSettingsAction;
    if (!action) return false;
    const title = action === 'app'
      ? 'اجازه دسترسی لازم است'
      : action === IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
        ? 'موقعیت مکانی خاموش است'
        : 'Wi-Fi خاموش است';
    const buttonLabel = action === 'app'
      ? 'تنظیمات برنامه'
      : action === IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
        ? 'روشن کردن موقعیت مکانی'
        : 'روشن کردن Wi-Fi';
    Alert.alert(title, error.message, [
      { text: 'انصراف', style: 'cancel' },
      {
        text: buttonLabel,
        onPress: async () => {
          try {
            if (action === 'app') await Linking.openSettings();
            else await IntentLauncher.startActivityAsync(action);
          } catch {
            Alert.alert('تنظیمات دستگاه', 'تنظیمات مربوطه را باز کنید، دسترسی یا Wi-Fi را فعال کنید و دوباره گزینه Wi-Fi را بزنید.');
            return;
          }
          // The settings activity returns to this screen. Re-check permissions and
          // radio state, then continue scanning if the user enabled the requirement.
          try { await scanNearbyWifi({ quiet: false }); } catch {}
        },
      },
    ]);
    return true;
  };

  const scanNearbyWifi = async ({ quiet = false } = {}) => {
    setWifiScanStatus('در حال بررسی مجوزها و اسکن شبکه‌های اطراف…');
    try {
      if (Platform.OS !== 'android') throw new Error('اسکن شبکه‌های اطراف برای ثبت حضور در حال حاضر فقط در نسخه اندروید پشتیبانی می‌شود.');
      await ensureWifiScanPermissions();
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        const error = new Error('برای اسکن شبکه‌های اطراف، سرویس موقعیت مکانی اندروید را روشن کنید. برای این روش نیازی به ثبت مختصات GPS نیست.');
        error.wifiSettingsAction = IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS;
        throw error;
      }
      const wifiEnabled = await WifiManager.isEnabled();
      if (!wifiEnabled) {
        const error = new Error('Wi-Fi گوشی خاموش است. تنظیمات Wi-Fi را باز کنید و Wi-Fi را روشن کنید؛ اتصال به شبکه لازم نیست.');
        error.wifiSettingsAction = IntentLauncher.ActivityAction.WIFI_SETTINGS;
        throw error;
      }
      let networks = [];
      // react-native-wifi-reborn may resolve a status string instead of rejecting
      // when Android declines/throttles a fresh scan. Only arrays are scan results.
      try {
        const freshNetworks = await WifiManager.reScanAndLoadWifiList();
        if (Array.isArray(freshNetworks)) networks = freshNetworks;
      } catch {}
      // If a fresh scan was rejected or returned no rows, fall back to the most
      // recent platform scan cache instead of interpreting the status string as
      // an empty scan. Android can throttle repeated scans in a short window.
      if (!Array.isArray(networks) || networks.length === 0) {
        try {
          const cachedNetworks = await WifiManager.loadWifiList();
          if (Array.isArray(cachedNetworks) && cachedNetworks.length > 0) networks = cachedNetworks;
        } catch {}
      }
      if (!Array.isArray(networks)) networks = [];
      const authorized = await getAuthorizedWifi();
      if (!authorized.length) throw new Error('شناسه‌های Wi-Fi خطوط مجاز در حافظه موجود نیست. برنامه را یک‌بار با اینترنت باز کنید تا فهرست دریافت شود.');
      const found = [];
      for (const network of (Array.isArray(networks) ? networks : [])) {
        const bssid = normalizeBssid(network?.BSSID || network?.bssid);
        if (!bssid || bssid === '020000000000' || bssid === '000000000000') continue;
        const allowed = authorized.find((item) => item.bssid === bssid);
        if (allowed) found.push({ ...allowed, bssid, ssid: String(network?.SSID || ''), level: Number(network?.level || -100) });
      }
      // اگر اسکن فهرست اطراف به‌دلیل محدودیت Android خالی/قدیمی بود، BSSID شبکهٔ متصل را هم بررسی کن.
      // این مسیر فقط یک منبع کمکی است؛ ثبت همچنان باید با شناسهٔ مجاز تطبیق داشته باشد.
      if (!found.length) {
        try {
          const connectedBssid = normalizeBssid(await WifiManager.getBSSID());
          if (connectedBssid && connectedBssid !== '020000000000' && connectedBssid !== '000000000000') {
            const allowed = authorized.find((item) => item.bssid === connectedBssid);
            if (allowed) {
              let connectedSsid = '';
              try { connectedSsid = String(await WifiManager.getSSID() || ''); } catch {}
              found.push({ ...allowed, bssid: connectedBssid, ssid: connectedSsid, level: -1 });
            }
          }
        } catch {}
      }
      found.sort((a, b) => b.level - a.level);
      if (!found.length) {
        const scannedCount = Array.isArray(networks) ? networks.length : 0;
        throw new Error(scannedCount
          ? `شبکه‌های اطراف اسکن شدند، اما BSSID آن‌ها با شناسه‌های مجاز خطوط شما تطبیق ندارد (شبکه‌های دیده‌شده: ${scannedCount}، شناسه‌های مجاز: ${authorized.length}). BSSID ثبت‌شده در تنظیمات خط را با BSSID واقعی روتر بررسی کنید.`
          : `اندروید فهرست شبکه‌های Wi-Fi را برنگرداند (شناسه‌های مجاز: ${authorized.length}). موقعیت مکانی و مجوزهای Wi-Fi نزدیک را روشن کنید، چند ثانیه صبر کنید و دوباره اسکن کنید.`);
      }
      const match = found[0];
      setWifiMatch(match);
      if (match.line?.id) setLineId(Number(match.line.id));
      setWifiScanStatus('شبکه مجاز شناسایی شد' + (match.ssid ? ': ' + match.ssid : ''));
      return match;
    } catch (e) {
      setWifiMatch(null);
      setWifiScanStatus(e?.message || 'اسکن شبکه‌های Wi-Fi ناموفق بود.');
      if (e?.wifiSettingsAction) {
        if (!quiet) showWifiPrerequisiteAlert(e);
      } else if (!quiet) {
        Alert.alert('اسکن Wi-Fi', e?.message || 'اسکن شبکه‌های Wi-Fi ناموفق بود.');
      }
      throw e;
    }
  };

  const load = async () => {
    const loadEpoch = attendanceStateEpochRef.current;
    setLoadError(null);
    // اول کش محلی را بخوان؛ ثبت حضور باید حتی بدون اینترنت بتواند از آخرین
    // اطلاعات خطوط مجاز و جلسهٔ باز استفاده کند. سپس نسخهٔ تازه را در پس‌زمینه بگیر.
    try {
      const cachedCfg = await cachedValue('/my/checkin-config');
      if (cachedCfg && typeof cachedCfg === 'object' && loadEpoch === attendanceStateEpochRef.current) {
        setCfg(cachedCfg);
        await cacheAuthorizedWifi(cachedCfg);
        const localOpen = await readLocalOpen();
        if (loadEpoch === attendanceStateEpochRef.current) setOpen(localOpen || null);
      }
    } catch {}
    const [cfgResult, timerResult] = await Promise.allSettled([
      request('/my/checkin-config', { noStore: true, timeoutMs: 8000 }),
      request('/my/work-timer', { noStore: true, timeoutMs: 8000 }),
    ]);
    if (loadEpoch !== attendanceStateEpochRef.current) return;
    if (timerResult && timerResult.status === 'fulfilled') {
      setTimerInfo(timerResult.value);
      try {
        const localOpen = await readLocalOpen();
        const workedSec = Math.max(0, Number(timerResult.value?.elapsed_sec || 0));
        const completedSec = Math.max(0, Number(timerResult.value?.completed_sec || 0));
        const gdate = String(
          timerResult.value?.open?.check_in ||
          localOpen?.check_in ||
          new Date().toISOString()
        ).slice(0,10);
        if (workedSec > 0) {
          await persistLocalWorked({
            gdate,
            worked_sec: workedSec,
            expected_min: Math.max(0, Number(timerResult.value?.expected_min || 453)),
            ot_cap_min: Math.max(0, Number(timerResult.value?.ot_cap_min || 27)),
            completed_sec: completedSec,
          });
        }
      } catch {}
    }
    if (cfgResult.status === 'fulfilled') {
      if (loadEpoch !== attendanceStateEpochRef.current) return;
      const fresh = cfgResult.value;
      setCfg(fresh);
      await cacheAuthorizedWifi(fresh);
      if (loadEpoch !== attendanceStateEpochRef.current) return;
      // وقتی API آنلاین با موفقیت پاسخ داده، وضعیت جلسهٔ سرور مرجع قطعی است.
      // نباید جلسهٔ قدیمیِ کش‌شده بعد از Auto-close دوباره به‌عنوان جلسهٔ باز نمایش داده شود.
      const serverOpen = fresh.open || null;
      if (serverOpen) {
        await persistLocalOpen(serverOpen);
        setOpen(serverOpen);
      } else {
        await persistLocalOpen(null);
        setOpen(null);
      }
    } else if (!cfg) {
      setLoadError(cfgResult.reason?.message || 'اطلاعات خطوط مجاز در دسترس نیست. ابتدا برنامه را یک‌بار با اتصال اینترنت باز کنید.');
    }

    // اگر تایمر آنلاین در دسترس نبود، جلسه و مجموع کارکرد محلی باید مبنای
    // ادامهٔ تایمر باشند؛ وگرنه پس از باز و بسته کردن اپ در حالت آفلاین،
    // جلسهٔ قبلی در نمایش تایمر از دست می‌رفت.
    if (timerResult.status !== 'fulfilled') {
      try {
        const localOpen = await readLocalOpen();
        const localWorked = await readLocalWorked();
        if (localOpen?.check_in) {
          const sessionDate = String(localOpen.check_in).slice(0,10);
          const workedDate = String(localWorked?.gdate || '');
          const completedSec = workedDate === sessionDate
            ? Math.max(0, Number(localWorked?.completed_sec || 0))
            : 0;
          const start = tehranTimeToEpochMs(localOpen.check_in);
          const liveElapsed = start != null
            ? Math.max(0, Math.floor((Date.now() - start) / 1000))
            : 0;
          setTimerInfo({
            expected_min: Math.max(0, Number(localWorked?.expected_min || 453)),
            ot_cap_min: Math.max(0, Number(localWorked?.ot_cap_min || 27)),
            elapsed_sec: completedSec + liveElapsed,
            completed_sec: completedSec,
            open: localOpen,
            next_sync_sec: 60,
          });
        }
      } catch {}
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
  useEffect(() => {
    load();
    let alive = true;
    let netSub = null;
    try { netSub = NetInfo.addEventListener(async state => { if (alive && state?.isInternetReachable === true) { try { await flushQueuedRequests({force:true}); } catch {} await load(); } }); } catch {}
    AsyncStorage.getItem('attendance_exit_reminder_8h').then(v => setExitReminder(v === '1')).catch(() => {});
    getAppConfig().then((c) => c && setAppCfg(c)).catch(() => {});
    return () => {
      alive = false; try { netSub?.(); } catch {};
      if (exitReminderIdRef.current) Notifications.cancelScheduledNotificationAsync(exitReminderIdRef.current).catch(() => {});
    };
  }, []);
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

  const cancelExitReminder = async () => {
    if (exitReminderIdRef.current) {
      try { await Notifications.cancelScheduledNotificationAsync(exitReminderIdRef.current); } catch {}
      exitReminderIdRef.current = null;
    }
  };

  const scheduleExitReminder = async (checkInValue, completedSec = 0) => {
    await cancelExitReminder();
    if (!exitReminder || !checkInValue) return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(REMEMBER_CHANNEL_ID, {
          name: 'یادآور ثبت خروج',
          importance: Notifications.AndroidImportance.HIGH,
          sound: REMEMBER_SOUND,
          vibrationPattern: [0, 500, 250, 700],
        });
      }
      const start = tehranTimeToEpochMs(checkInValue);
      if (start == null) return;
      const completed = Math.max(0, Number(completedSec) || 0);
      const openElapsedSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const remainingSec = Math.max(0, 8 * 60 * 60 - completed - openElapsedSec);
      const fireAt = new Date(Date.now() + remainingSec * 1000);
      if (remainingSec <= 0 || fireAt.getTime() <= Date.now()) return;
      exitReminderIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'ساعت کارکرد شما به هشت ساعت رسیده است',
          body: '( در صورت اتمام شیفت کاری، ثبت خروج خود را فراموش نکنید)',
          sound: REMEMBER_SOUND,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'attendance_exit_reminder_8h' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          ...(Platform.OS === 'android' ? { channelId: REMEMBER_CHANNEL_ID } : {}),
        },
      });
    } catch {}
  };

  const setExitReminderEnabled = async (value) => {
    const next = !!value;
    setExitReminder(next);
    await AsyncStorage.setItem('attendance_exit_reminder_8h', next ? '1' : '0');
    if (!next) {
      exitReminderAlertRef.current = false;
      await cancelExitReminder();
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setExitReminder(false);
        await AsyncStorage.setItem('attendance_exit_reminder_8h', '0');
        Alert.alert('مجوز اعلان', 'برای فعال‌سازی یاداور ثبت خروج، اجازه ارسال اعلان را فعال کنید.');
        return;
      }
      if (open?.check_in) {
        const completedSec = Number(timerInfo?.completed_sec || 0);
        if (Number(timerInfo?.elapsed_sec || 0) >= 8 * 60 * 60) {
          exitReminderAlertRef.current = false;
          Alert.alert('ساعت کارکرد شما به هشت ساعت رسیده است', '( در صورت اتمام شیفت کاری، ثبت خروج خود را فراموش نکنید)');
        } else {
          await scheduleExitReminder(open.check_in, completedSec);
        }
      }
    } catch {}
  };

  // تایمر حضور: مجموع تمام بازه‌های حضور امروز + بازهٔ باز فعلی.
  // خروج زودهنگام تایمر را صفر نمی‌کند؛ ورود بعدی ادامهٔ مجموع قبلی است.
  useEffect(() => {
    if (open && open.check_in) {
      const start = tehranTimeToEpochMs(open.check_in);
      if (start == null) { setElapsed(Number(timerInfo?.elapsed_sec || 0)); return; }
      const completedSec = Math.max(0, Number(timerInfo?.completed_sec || 0));
      const tick = () => setElapsed(Math.max(0, completedSec + Math.floor((Date.now() - start) / 1000)));
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => clearInterval(timerRef.current);
    } else {
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open, timerInfo?.completed_sec]);


  useEffect(() => {
    if (open?.check_in && exitReminder) {
      scheduleExitReminder(open.check_in, Number(timerInfo?.completed_sec || 0));
    } else cancelExitReminder();
  }, [open?.id, open?.check_in, exitReminder, timerInfo?.completed_sec]);

  // هشدار داخل برنامه نیز دقیقاً در رسیدن تایمر به ۸ ساعت نمایش داده می‌شود.
  useEffect(() => {
    if (!open || !exitReminder) {
      exitReminderAlertRef.current = false;
      return;
    }
    if (elapsed >= 8 * 3600 && !exitReminderAlertRef.current) {
      exitReminderAlertRef.current = true;
      Alert.alert('ساعت کارکرد شما به هشت ساعت رسیده است', '( در صورت اتمام شیفت کاری، ثبت خروج خود را فراموش نکنید)');

    }
  }, [elapsed, open?.id, exitReminder]);

  // همگام‌سازی دوره‌ای تایمر با سرور؛ محاسبهٔ لحظه‌ای روی گوشی انجام می‌شود اما مرجع زمان سرور است.
  useEffect(() => {
    if (timerSyncRef.current) clearInterval(timerSyncRef.current);
    if (!open) { surplusAlertShownRef.current = false; return; }
    const syncTimer = async () => {
      try {
        const r = await request('/my/work-timer');
        if (r) {
          setTimerInfo(r);
          if (r.auto_closed) {
            await persistLocalOpen(null);
            setOpen(null);
            setElapsed(0);
            surplusAlertShownRef.current = false;
            Alert.alert('ثبت حضور بسته شد', 'برای این حضور بیش از ۱۴ ساعت خروج ثبت نشده بود؛ جلسه کاری به‌صورت خودکار بسته شد و اکنون امکان ثبت حضور جدید دارید.');
          }
        }
      } catch {}
    };
    timerSyncRef.current = setInterval(syncTimer, Math.max(30, +(timerInfo?.next_sync_sec || 60)) * 1000);
    return () => { if (timerSyncRef.current) clearInterval(timerSyncRef.current); };
  }, [open?.id, timerInfo?.next_sync_sec]);

  const line = cfg?.lines?.find((l) => l.id === lineId);
  // اگر روش فعلی برای خط انتخابی مجاز نباشد، به اولین روش مجاز سوییچ کن
  useEffect(() => {
    if (!line) return;
    const configured = Array.isArray(line.checkin_methods) ? line.checkin_methods : [];
    const allowed = configured.filter((k) => !['qr', 'nfc', 'rfid', 'bt', 'bluetooth'].includes(String(k).toLowerCase()));
    if (['qr', 'nfc', 'rfid', 'bt', 'bluetooth'].includes(String(method).toLowerCase())) setMethod(allowed[0] || 'gps');
    else if (allowed.length && !allowed.includes(method)) setMethod(allowed[0] || 'gps');
  }, [lineId]);
  // فاصلهٔ این بخش فقط وضعیت جغرافیایی محدوده را نشان می‌دهد؛ منع مجوز ثبت حضور در محدودهٔ خط، جداگانه از پاسخ ثبت حضور اعلام می‌شود.
  // نزدیک‌ترین فاصله تا محدودهٔ خط انتخاب‌شده
  const toleranceM = appCfg?.checkin_error_radius_m || 0;
  let distance = null;
  const distanceFences = open ? (cfg?.lines || []).flatMap((l) => l.geofences || []) : (line?.geofences || []);
  if (pos && distanceFences.length) distance = Math.min(...distanceFences.map((g) => distanceToFence(pos.lat, pos.lng, g)));
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
    if (!open || !timerInfo) return null;
    const unassigned = timerInfo.phase === 'unassigned';
    const expected = unassigned ? 0 : Math.max(0, +(timerInfo.expected_min ?? 0));
    const cap = unassigned ? 0 : Math.max(0, +(timerInfo.ot_cap_min ?? 0));
    const elapsedMin = Math.max(0, Math.floor(elapsed / 60));
    const remaining = Math.max(0, expected - elapsedMin);
    const overtime = unassigned ? 0 : Math.max(0, Math.min(Math.max(0, elapsedMin - expected), cap));
    const surplus = unassigned ? 0 : Math.max(0, elapsedMin - expected - cap);
    const phase = unassigned ? 'unassigned' : remaining > 0 ? 'duty' : (overtime < cap ? 'overtime' : 'surplus');
    return { expected, cap, elapsedMin, remaining, overtime, surplus, phase };
  })();
  useEffect(() => {
    if (liveTimer?.phase === 'surplus' && !surplusAlertShownRef.current) {
      surplusAlertShownRef.current = true;
      Alert.alert('سقف اضافه‌کار', 'سقف اضافه‌کار روزانه شما پر شده است؛ لطفاً ثبت خروج را انجام دهید.');
    }
    if (liveTimer?.phase !== 'surplus') surplusAlertShownRef.current = false;
  }, [liveTimer?.phase]);

  // اعتبارسنجی محلی محدوده؛ در حالت آفلاین نباید برای تصمیم ورود/خروج به سرور وابسته باشیم.
  const getLocalAuthorizedLine = (latitude, longitude) => {
    if (latitude == null || longitude == null || !cfg?.lines?.length) return null;
    const tolerance = Number(appCfg?.checkin_error_radius_m || 0);
    let best = null;
    for (const l of cfg.lines) {
      const fences = Array.isArray(l.geofences) ? l.geofences : [];
      for (const g of fences) {
        const d = distanceToFence(latitude, longitude, g);
        if (!isFinite(d)) continue;
        if (!best || d < best.distance) best = { line: l, distance: d };
      }
    }
    return best && best.distance <= tolerance ? best : null;
  };

  const getPositionForAttendance = async () => {
    if (pos?.lat != null && pos?.lng != null) return pos;
    try {
      const p = await getAccuratePosition({ samples: 2, timeoutMs: 5000, desiredAccuracy: 20, maxAccuracy: 100 });
      if (p?.coords) {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, ts: p.timestamp, viaGsm: false };
        setPos(next);
        return next;
      }
    } catch {}
    return null;
  };

  async function doCheckin(proof) {
    // هر ورود جدید نسل وضعیت را عوض می‌کند تا load قبلی نتواند جلسهٔ جدید را overwrite کند.
    attendanceStateEpochRef.current += 1;
    setBusy(true);
    try {
      // قبل از ورود جدید، صف خروج آفلاین را تخلیه و وضعیت جلسه را از سرور تازه می‌کنیم.
      // اگر خروج روی گوشی ثبت شده ولی هنوز همگام نشده باشد، ورود جدید نباید قبل از
      // ارسال خروج به سرور اجرا شود.
      try { await flushQueuedRequests({force:true}); } catch {}
      try {
        if (await hasPendingAttendanceCheckout()) {
          throw new Error('خروج قبلی هنوز با سرور همگام نشده است؛ لطفاً اتصال اینترنت را بررسی کنید و چند ثانیه بعد دوباره تلاش کنید.');
        }
        const freshCfg = await request('/my/checkin-config', { noStore: true, timeoutMs: 8000 });
        if (freshCfg && Object.prototype.hasOwnProperty.call(freshCfg, 'open')) {
          const serverOpen = freshCfg.open || null;
          if (serverOpen) {
            await persistLocalOpen(serverOpen);
            setOpen(serverOpen);
            throw new Error('جلسهٔ ورودِ باز برای شما وجود دارد؛ ابتدا خروج همان جلسه را ثبت کنید.');
          }
          await persistLocalOpen(null);
          setOpen(null);
        }
      } catch (e) {
        if (String(e?.message || '').includes('جلسهٔ ورودِ باز') || String(e?.message || '').includes('خروج قبلی هنوز')) throw e;
      }
      if (appCfg?.gps_work_required) {
        let gpsEnabled = true;
        try { gpsEnabled = await Location.hasServicesEnabledAsync(); } catch {}
        if (!gpsEnabled) throw new Error('برای ثبت حضور، GPS باید روشن باشد.');
      }
      let localLine = null;
      let body = null;
      if (method === 'wifi') {
        // Wi-Fi attendance uses nearby scan results and cached assigned BSSIDs, not GPS/geofences.
        const match = await scanNearbyWifi({ quiet: true });
        if (!match?.line_id) throw new Error('خط متناظر با شبکه Wi-Fi مجاز مشخص نشد.');
        localLine = { line: match.line };
        body = { method, line_id: Number(match.line_id), proof: match.bssid };
      } else {
        const current = await getPositionForAttendance();
        if (current?.lat == null || current?.lng == null) throw new Error('موقعیت دستگاه در دسترس نیست؛ برای این روش ثبت حضور GPS را روشن کنید.');
        localLine = getLocalAuthorizedLine(current.lat, current.lng);
        if (!localLine) throw new Error('شما در محدوده هیچ‌یک از خطوط مجاز خود قرار ندارید؛ ثبت حضور انجام نشد.');
        body = { method, lat: current.lat, lng: current.lng, accuracy: current.acc || undefined, line_id: Number(localLine.line.id) };
        if (method !== 'gps') body.proof = proof != null ? proof : proofVal;
      }
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
      if (r.queued) {
        const localWorked = await readLocalWorked();
        const todayKey = String(body.client_time || '').slice(0,10);
        const completedSec = localWorked?.gdate === todayKey
          ? Math.max(0, Number(localWorked?.worked_sec || 0))
          : 0;
        const localOpen = { id: `local_${Date.now()}`, line_id: Number(localLine.line.id), check_in: body.client_time, check_out: null, method };
        // A load started while the check-in request was in flight must not replace
        // this newly-created local session with its older server snapshot.
        attendanceStateEpochRef.current += 1;
        setOpen(localOpen);
        await persistLocalOpen(localOpen);
        setTimerInfo({ completed_sec: completedSec, elapsed_sec: completedSec });
        setElapsed(completedSec);
        await scheduleExitReminder(localOpen.check_in, completedSec);
      } else {
        const confirmedOpen = r.open || { id: r.id, line_id: Number(r.line_id || localLine.line.id), check_in: r.check_in || body.client_time, check_out: null, method };
        // Update the UI as soon as check-in is accepted; do not wait for work-timer.
        // This also invalidates any load whose response was captured before the write.
        attendanceStateEpochRef.current += 1;
        await invalidateCachedValue('/my/checkin-config');
        setOpen(confirmedOpen);
        await persistLocalOpen(confirmedOpen);
        try{
          const schedule=Array.isArray(r.presence_random_schedule)?r.presence_random_schedule:[];
          if(schedule.length) await AsyncStorage.setItem(PRESENCE_RANDOM_CACHE_KEY,JSON.stringify({attendance_id:Number(r.id||0),items:schedule,cached_at:Date.now()}));
          else await AsyncStorage.removeItem(PRESENCE_RANDOM_CACHE_KEY);
        }catch{}
      }
      if (appCfg?.gps_work_required) {
        Alert.alert(
          'الزام GPS و شیفت کاری',
          'حضور شما ملزم به روشن بودن GPS و شیفت کاری میباشد و نرم افزار هر سی دقیقه یکبار وضعیت GPS شما را بررسی مینماید و در صورتی که GPS شما خاموش باشد زمان کارکرد برای شما محاسبه نمیشود.'
        );
      } else {
        Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'ورود ذخیره شد و بعد از اتصال ارسال می‌شود.' : 'ورود شما ثبت شد.');
      }
      setProofVal('');
      if (!r.queued) {
        // پس از ورود مجدد، تایمر نباید از صفر یا از موظفی کامل روز شروع شود.
        // work-timer مجموع تمام جلسات بسته‌شده امروز + جلسه باز فعلی را برمی‌گرداند.
        // پاسخ آن را بلافاصله مرجع تایمر قرار می‌دهیم تا کش/جلسه جدید مقدار قبلی را
        // از بین نبرد.
        try {
          const wt = await request('/my/work-timer', { noStore: true, timeoutMs: 8000 });
          if (wt) {
            setTimerInfo(wt);
            const previousCompleted = Math.max(0, Number(wt.completed_sec || 0));
            const currentOpen = r.open || wt.open || {
              id: r.id,
              line_id: Number(r.line_id || localLine.line.id),
              check_in: r.check_in || body.client_time,
              check_out: null,
              method
            };
            await persistLocalOpen(currentOpen);
            setOpen(currentOpen);
            const currentStart = tehranTimeToEpochMs(currentOpen.check_in);
            const live = currentStart != null
              ? Math.max(0, Math.floor((Date.now() - currentStart) / 1000))
              : Math.max(0, Number(wt.open_elapsed_sec || 0));
            setElapsed(previousCompleted + live);
            await persistLocalWorked({
              gdate: String(currentOpen.check_in || body.client_time || '').slice(0,10),
              worked_sec: Math.max(0, Number(wt.elapsed_sec || 0)),
              expected_min: Math.max(0, Number(wt.expected_min || 453)),
              ot_cap_min: Math.max(0, Number(wt.ot_cap_min || 27)),
              completed_sec: previousCompleted
            });
          }
        } catch {
          await load();
        }
      }
    } catch (e) {
      if (e?.wifiSettingsAction) showWifiPrerequisiteAlert(e);
      else Alert.alert('خطا', e.message || 'ثبت ورود ناموفق');
    }
    finally { setBusy(false); }
  }
  async function doCheckout() {
    // خروج جاری نیز باید هر load قدیمی را بی‌اعتبار کند؛ مخصوصاً loadای که
    // بعد از خروج قبلی در پس‌زمینه باقی مانده و ممکن است open=null را دیر برگرداند.
    attendanceStateEpochRef.current += 1;
    setBusy(true);
    try {
      // موقعیت نمایش‌داده‌شده روی نقشه قبلاً توسط load() به‌روز شده است.
      // منتظر ماندن برای ۵ نمونه GPS و timeout دوازده‌ثانیه‌ای هنگام خروج باعث تأخیر محسوس می‌شد.
      // ابتدا همان موقعیت معتبر فعلی را ارسال می‌کنیم؛ فقط اگر موقعیت نداریم یک GPS کوتاه می‌گیریم.
      const current = await getPositionForAttendance();
      if (!current?.lat || !current?.lng) throw new Error('موقعیت دستگاه در دسترس نیست؛ برای ثبت خروج GPS را روشن کنید.');
      const localLine = getLocalAuthorizedLine(current.lat, current.lng);
      let checkoutOnline = true;
      try {
        const net = await NetInfo.fetch();
        checkoutOnline = net?.isInternetReachable === true;
      } catch {}
      // در حالت آفلاین خروج را به‌خاطر عدم دسترسی لحظه‌ای به سرور یا
      // تغییر محدوده متوقف نکن؛ جلسهٔ باز از قبل روی گوشی معتبر است.
      // پس از اتصال، سرور موقعیت و جلسهٔ باز را دوباره اعتبارسنجی می‌کند.
      if (checkoutOnline && !localLine) {
        throw new Error('شما در محدوده هیچ‌یک از خطوط مجاز خود قرار ندارید؛ ثبت خروج انجام نشد.');
      }
      const lat = current.lat, lng = current.lng, accuracy = current.acc;
      const checkoutLineId = localLine?.line?.id || Number(open?.line_id || 0) || undefined;
      const checkoutClientTime = new Date().toISOString();
      const r = await postOrQueue('/my/checkout', {
        lat, lng, accuracy,
        client_time: checkoutClientTime,
        ...(checkoutLineId ? { local_line_id: checkoutLineId } : {}),
        client_uuid: 'checkout_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)
      }, 'checkout');

      // اگر سرور هنگام درخواست خروج، جلسهٔ قدیمی را به‌دلیل عبور از ۱۴ ساعت
      // خودکار بسته باشد، این یک موفقیت است و نباید به خطای «جلسه باز وجود ندارد»
      // تبدیل شود. همچنین زمان را با checkoutClientTime دوباره محاسبه نمی‌کنیم تا
      // کارکرد محلی از سقف ۱۴ ساعت عبور نکند.
      if (r?.auto_closed) {
        attendanceStateEpochRef.current += 1;
        setOpen(null);
        await persistLocalOpen(null);
        try { await AsyncStorage.removeItem(PRESENCE_RANDOM_CACHE_KEY); } catch {}
        setElapsed(0);
        setTimerInfo(null);
        Alert.alert('ثبت حضور بسته شد', 'این جلسه به‌دلیل عبور از ۱۴ ساعت به‌صورت خودکار بسته شد. اکنون می‌توانید حضور جدید ثبت کنید.');
        load().catch(() => {});
        return;
      }

      // برای خروج آفلاین، زمان این بازه را به مجموع کارکرد روز اضافه کن تا
      // ورود بعدی حتی بدون اینترنت نیز تایمر را از زمان قبلی ادامه دهد.
      try {
        const previous = await readLocalWorked();
        const sessionDateKey = String(open?.check_in || '').slice(0,10);
        const previousCompletedSec = previous?.gdate === sessionDateKey
          ? Math.max(0, Number(previous?.completed_sec || 0))
          : 0;
        // برای خروج آفلاین فقط زمانِ جلسات بستهٔ قبلی پایه است؛
        // worked_sec شامل زمان جلسهٔ باز فعلی نیز هست و نباید دوباره به آن
        // اضافه شود.
        const baseSec = Math.max(
          0,
          Number(timerInfo?.completed_sec || 0),
          previousCompletedSec
        );
        const start = tehranTimeToEpochMs(open?.check_in);
        const end = tehranTimeToEpochMs(checkoutClientTime);
        const sessionSec = start != null && end != null ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
        const workedSec = Math.max(0, baseSec + sessionSec);
        if (workedSec > 0) {
          await persistLocalWorked({
            gdate: String(open?.check_in || '').slice(0,10) || new Date().toISOString().slice(0,10),
            worked_sec: workedSec,
            expected_min: Math.max(0, Number(timerInfo?.expected_min || 453)),
            ot_cap_min: Math.max(0, Number(timerInfo?.ot_cap_min || 27)),
            completed_sec: workedSec,
          });
        }
      } catch {}
      const lineText = r?.checkout_line_code ? ` در خط ${faNum(String(r.checkout_line_code))}` : '';
      Alert.alert(
        r.queued ? 'آفلاین' : 'ثبت شد',
        r.queued
          ? 'خروج ذخیره شد و بعد از اتصال، موقعیت شما در تمام خطوط مجاز بررسی و ثبت می‌شود.'
          : `خروج شما${lineText} ثبت شد.`
      );
      // پاسخ موفق سرور کافی است؛ صفحه را بلافاصله از حالت «حضور باز» خارج کن.
      // بارگذاری مجدد وضعیت/موقعیت در پس‌زمینه انجام می‌شود تا دکمه خروج معطل GPS نشود.
      attendanceStateEpochRef.current += 1;
      await invalidateCachedValue('/my/checkin-config');
      setOpen(null);
      await persistLocalOpen(null);
      try { await AsyncStorage.removeItem(PRESENCE_RANDOM_CACHE_KEY); } catch {}
      setElapsed(0);
      if (!r.queued) {
        // پاسخ آنلاین و سپس load() مرجع نهایی سرور برای مجموع کارکرد روز است.
      }
      setTimerInfo(null);
      load().catch(() => {});
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت خروج ناموفق'); }
    finally { setBusy(false); }
  }

  // خواندن خودکار BSSID شبکهٔ WiFi متصل (نیازمند مجوز موقعیت و روشن‌بودن GPS در اندروید)
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
    if (method === 'wifi') { doCheckin(); return; }
    if (method === 'gps') {
      // تصمیم نهایی با سرور است. سرور همهٔ خطوط تعریف‌شده برای کاربر را بررسی می‌کند و اگر کاربر داخل هرکدام باشد همان خط را ثبت می‌کند.
      doCheckin();
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

  // هنگام حضور باز، نقشه محدوده تمام خطوط مجاز را نشان می‌دهد؛ بنابراین خروج در خطی غیر از خط ورود نیز قابل مشاهده و کنترل است.
  const mapLine = open
    ? { geofences: (cfg?.lines || []).flatMap((l) => l.geofences || []) }
    : line;
  const mapHtml = buildMapHtml(mapLine, pos, appCfg, mapRuntime);

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {loadError && cfg && <View style={{ backgroundColor: '#fff4d7', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#8a6100', fontFamily: FONT.regular, fontSize: 12, flex: 1 }}>آخرین تازه‌سازی وضعیت ناموفق بود؛ اطلاعات نمایش‌داده‌شده ممکن است قدیمی باشد.</Text>
        <TouchableOpacity onPress={() => load()} style={{ marginRight: 8 }}><Text style={{ color: C.brand, fontFamily: FONT.bold, fontSize: 12 }}>تلاش مجدد</Text></TouchableOpacity>
      </View>}
      {/* خط به‌صورت خودکار از روی موقعیت کاربر تشخیص داده می‌شود؛ انتخاب دستی حذف شده است. */}
      <Text style={s.label}>{open ? 'خطوط مجاز برای ثبت خروج' : 'خط تشخیص‌داده‌شده'}</Text>
      <View style={s.autoLineBox}>
        <Text style={s.autoLineTitle}>
          {open
            ? `خط ورود: ${open?.line_id ? faNum(String(cfg?.lines?.find((l) => Number(l.id) === Number(open.line_id))?.code || open.line_id)) : 'نامشخص'}`
            : (line ? `خط ${faNum(line.code || line.id)}` : 'در حال تشخیص خودکار خط')}
        </Text>
        <Text style={s.autoHint}>
          {open
            ? 'برای خروج، لازم نیست در همان خطی باشید که ورود را ثبت کرده‌اید. کافی است اکنون داخل محدودهٔ یکی از خطوط مجاز شما باشید؛ سامانه خط واقعی محل خروج را تشخیص می‌دهد و همان را ثبت می‌کند.'
            : 'برای ثبت حضور نیازی به انتخاب خط نیست. اگر داخل محدودهٔ هرکدام از خطوط تعریف‌شده برای شما باشید، سرور همان خط را به‌صورت خودکار ثبت می‌کند.'}
        </Text>
      </View>

      {/* نقشه */}
      <TouchableOpacity style={s.refreshPosBtn} onPress={refreshMyLocation} disabled={refreshingPos}>
        <Text style={s.refreshPosTxt}>{refreshingPos ? 'در حال یافتن موقعیت…' : 'بروزرسانی موقعیت من'}</Text>
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
        {distance == null ? <Text style={s.muted}>{open ? 'هیچ محدوده‌ای برای خطوط مجاز تعریف نشده یا موقعیت در دسترس نیست.' : 'محدوده‌ای برای این خط تعریف نشده یا موقعیت در دسترس نیست.'}</Text> :
          inArea ? <Text style={[s.distTxt, { color: C.ok }]}>✓ {open ? 'شما داخل محدودهٔ یکی از خطوط مجاز برای خروج هستید' : 'شما داخل محدودهٔ ایستگاه هستید'}</Text> :
            <Text style={s.distTxt}>فاصله تا نزدیک‌ترین محدوده: <Text style={{ color: C.danger, fontFamily: FONT.bold }}>{faNum(Math.round(distance))} متر</Text></Text>}
      </View>

      {/* تایمر حضور */}
      {open && (
        <View style={s.timerBox}>
          <Text style={s.timerLabel}>مدت حضور شما</Text>
          <Text style={s.timer}>{fmtTime(elapsed)}</Text>
          {liveTimer ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[s.timerSub, { color: liveTimer.phase === 'duty' ? C.danger : (liveTimer.phase === 'overtime' ? '#b7791f' : C.danger) }]}> 
                {liveTimer.phase === 'unassigned'
                  ? 'برای شما شیفت فعالی تخصیص داده نشده است؛ فقط مدت حضور نمایش داده می‌شود.'
                  : liveTimer.phase === 'duty'
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

      {/* یاداور ثبت خروج */}
      <TouchableOpacity style={s.reminderCard} activeOpacity={0.82} onPress={() => setExitReminderEnabled(!exitReminder)}>
        <View style={s.reminderTextWrap}>
          <Text style={s.reminderTitle}>یاداور ثبت خروج</Text>
          <Text style={s.reminderHint}>با فعال بودن این گزینه، پس از رسیدن کارکرد به ۸ ساعت هشدار و اعلان دریافت می‌کنید.</Text>
        </View>
        <View style={[s.reminderCheckbox, exitReminder && s.reminderCheckboxOn]}>
          {exitReminder ? <Text style={s.reminderCheck}>✓</Text> : null}
        </View>
      </TouchableOpacity>

      {/* روش ثبت حضور */}
      {!open && (
        <>
          <Text style={s.label}>روش ثبت حضور</Text>
          <View style={s.methodRow}>
            {[['gps', 'موقعیت (GPS)'], ['wifi', 'WiFi']]
              .filter(([k]) => {
                if (k === 'wifi') return (cfg?.lines || []).some((l) => {
                  const allowed = Array.isArray(l.checkin_methods) ? l.checkin_methods.filter((x) => !['qr', 'nfc', 'rfid', 'bt', 'bluetooth'].includes(String(x).toLowerCase())) : [];
                  return ((!allowed.length || allowed.includes('wifi')) && (l.idents || []).some((ident) => String(ident.kind || '').toLowerCase() === 'wifi' && normalizeBssid(ident.value)));
                });
                const allowed = Array.isArray(line?.checkin_methods) ? line.checkin_methods.filter((x) => !['qr', 'nfc', 'rfid', 'bt', 'bluetooth'].includes(String(x).toLowerCase())) : [];
                return !line || !allowed.length || allowed.includes(k);
              })
              .map(([k, t]) => (
              <TouchableOpacity key={k} style={[s.mChip, method === k && s.mChipOn]} onPress={() => { setMethod(k); if (k === 'wifi') scanNearbyWifi().catch(() => {}); }}>
                <Text style={[s.mChipTxt, method === k && s.mChipTxtOn]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {method === 'wifi' && (
            <>
              <TouchableOpacity style={s.readBtn} onPress={() => scanNearbyWifi().catch(() => {})}><Text style={s.readBtnTxt}>📶 اسکن شبکه‌های Wi-Fi اطراف</Text></TouchableOpacity>
              {!!wifiScanStatus && <Text style={[s.hint, wifiMatch ? { color: C.ok } : null]}>{wifiScanStatus}</Text>}
              {wifiMatch ? <Text style={s.hint}>خط شناسایی‌شده: {faNum(String(wifiMatch.line?.code || wifiMatch.line_id))} · قدرت سیگنال: {faNum(String(wifiMatch.level))} dBm</Text> : null}
              <Text style={s.hint}>نیازی به اتصال به Wi-Fi یا حضور در محدوده GPS خط نیست. برنامه BSSIDهای مجاز را خودکار اسکن و تطبیق می‌دهد. اندروید برای اسکن ممکن است روشن بودن سرویس موقعیت مکانی را الزامی کند، اما مختصات GPS برای ثبت استفاده نمی‌شود.</Text>
            </>
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
  const navigation=useNavigation();
  const [date,setDate]=useState(null);
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(true);
  const [err,setErr]=useState('');
  const requestSeq=useRef(0);
  const load=async(d=date)=>{
    const seq=++requestSeq.current;
    setBusy(true);setErr('');
    try{
      const q=d?'?date='+encodeURIComponent(d):'';
      const result=await request('/my/daily-performance'+q,{noStore:true,timeoutMs:12000});
      if(seq===requestSeq.current)setData(result||null);
    }catch(e){
      if(seq===requestSeq.current){
        setErr(e.message||'دریافت عملکرد روزانه ناموفق بود.');
        if(d && data?.date!==d)setData(null);
      }
    }finally{
      if(seq===requestSeq.current)setBusy(false);
    }
  };
  useEffect(()=>{load()},[date]);
  const shiftDate=(delta)=>{
    const baseDate=data?.date||date;
    if(!baseDate||busy)return;
    const [y,m,d]=baseDate.split('-').map(Number);
    const g=jalali_to_gregorian_client(y,m,d);
    const t=new Date(Date.UTC(g[0],g[1]-1,g[2]+delta,12,0,0));
    const j=gregorian_to_jalali_client(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate());
    setDate(j[0]+'-'+String(j[1]).padStart(2,'0')+'-'+String(j[2]).padStart(2,'0'));
  };
  if(busy&&!data)return <View style={s.center}><ActivityIndicator size={80} message="در حال دریافت عملکرد…"/></View>;
  if(!busy&&(!data||!data.data)){
    return <ScrollView contentContainerStyle={{padding:14,paddingBottom:32}}>
      <View style={s.perfNav}>
        <TouchableOpacity style={s.perfNavBtn} onPress={()=>shiftDate(1)} disabled={busy}><Text style={s.perfNavTxt}>روز بعد ›</Text></TouchableOpacity>
        <Text style={s.perfDate}>{data?.weekday||''} {(data?.date||date)?('('+(data?.date||date)+')'):''}</Text>
        <TouchableOpacity style={s.perfNavBtn} onPress={()=>shiftDate(-1)} disabled={busy}><Text style={s.perfNavTxt}>‹ روز قبل</Text></TouchableOpacity>
      </View>
      <View style={[s.perfCardWide,{marginTop:12,alignItems:'center'}]}>
        <Text style={s.perfTitleEmpty}>عملکرد روزانه در دسترس نیست</Text>
        <Text style={s.perfHint}>{data?.message||err||'برای این تاریخ، اطلاعات کارکرد برنگشت.'}</Text>
        <TouchableOpacity style={s.readBtn} onPress={()=>load(date)} disabled={busy}><Text style={s.readBtnTxt}>{busy?'در حال دریافت…':'تلاش مجدد'}</Text></TouchableOpacity>
      </View>
    </ScrollView>;
  }
  const w=data?.data||{};
  const shortage=Math.max(0,Number(w.shortage||0));
  const absent=Math.max(0,Number(w.absent_min||0));
  const hasAttendanceDeficit=shortage>0||absent>0;
  const hasGpsInvalidMinutes=w.gps_invalid_min!==undefined && w.gps_invalid_min!==null && Number.isFinite(Number(w.gps_invalid_min));
  const cards=[['کارکرد',w.worked],['حضور در شیفت',w.in_shift],['موظفی',w.expected],['اضافه‌کار',w.overtime],['کسری کار',w.shortage],['شب‌کاری',w.night],['کسر کار خاموشی GPS/توقف برنامه',hasGpsInvalidMinutes?Number(w.gps_invalid_min):null]];
  const openRequest=(type)=>{if(!data?.date)return;navigation.navigate('Requests',{initialType:type,initialDate:data.date,returnToDailyPerformance:true});};
  return <ScrollView persistentScrollbar={true} contentContainerStyle={{padding:14,paddingBottom:32}}>
    {err?<Text style={s.warnText}>{err}</Text>:null}
    <View style={s.perfNav}>
      <TouchableOpacity style={s.perfNavBtn} onPress={()=>shiftDate(1)} disabled={busy}><Text style={[s.perfNavTxt,busy&&{opacity:.5}]}>روز بعد ›</Text></TouchableOpacity>
      <Text style={s.perfDate}>{data?.weekday||''} {'('}{data?.date||''}{')'}</Text>
      <TouchableOpacity style={s.perfNavBtn} onPress={()=>shiftDate(-1)} disabled={busy}><Text style={[s.perfNavTxt,busy&&{opacity:.5}]}>‹ روز قبل</Text></TouchableOpacity>
    </View>
    <View style={s.perfHero}><Text style={s.perfTitle}>عملکرد روزانه</Text><Text style={s.perfShift}>{data?.shift_title||'شیفت کاری'}</Text></View>
    <View style={s.perfGrid}>{cards.map(([l,v])=><View key={l} style={s.perfCard}><Text style={s.perfValue}>{l==='کسر کار خاموشی GPS/توقف برنامه'&&!hasGpsInvalidMinutes?'—':fmtMinFa(v)}</Text><Text style={s.perfLabel}>{l}</Text></View>)}</View>
    {!hasGpsInvalidMinutes ? <Text style={[s.perfHint,{color:C.danger}]}>سرور مقدار کسرکار GPS/توقف برنامه را برای این روز برنگرداند؛ عدد «—» به معنی صفر بودن کسرکار نیست. تنظیم کارکرد GPS و پاسخ API باید بررسی شود.</Text> : <Text style={s.perfHint}>{w.gps_work_required ? 'فقط رویداد صریح خاموشی GPS کسر کار ایجاد می‌کند؛ رفتن برنامه به پس‌زمینه یا نرسیدن checkpoint به‌تنهایی کسر نمی‌شود.' : 'محاسبهٔ کسر کار GPS/توقف برنامه در تنظیمات کارکرد GPS فعال نیست؛ برای اعمال آن، تنظیم مربوطه در بک‌اند باید فعال باشد.'}</Text>}
    <View style={s.perfCardWide}>
      <Text style={s.perfLabel}>وضعیت این روز</Text>
      <Text style={s.perfStatus}>{data?.holiday?'تعطیل: '+(data.holiday_title||'رسمی'):(w.is_off?'روز بدون شیفت':(w.worked>0?'حضور ثبت شده':'هنوز حضوری ثبت نشده'))}</Text>
      {w.late_in>0?<Text style={s.perfHint}>تأخیر ورود: {faNum(w.late_in)} دقیقه</Text>:null}
      {w.early_out>0?<Text style={s.perfHint}>تعجیل خروج: {faNum(w.early_out)} دقیقه</Text>:null}
      {absent>0?<Text style={[s.perfHint,{color:C.danger,fontFamily:FONT.bold}]}>غیبت: {fmtMinFa(absent)}</Text>:null}
      {shortage>0?<Text style={[s.perfHint,{color:'#b7791f',fontFamily:FONT.bold}]}>کسری کار: {fmtMinFa(shortage)}</Text>:null}
    </View>
    {hasAttendanceDeficit&&<View style={s.perfActions}><Text style={s.perfActionTitle}>اقدام برای اصلاح وضعیت این روز</Text><Text style={s.perfActionHint}>در صورت وجود غیبت یا کسری کار، می‌توانید درخواست مرتبط را برای همین تاریخ ثبت کنید.</Text><View style={s.perfActionRow}><TouchableOpacity style={s.perfActionLeave} onPress={()=>openRequest('annual')}><Text style={s.perfActionIcon}>🗓️</Text><Text style={s.perfActionLeaveTxt}>درخواست مرخصی</Text></TouchableOpacity><TouchableOpacity style={s.perfActionManual} onPress={()=>openRequest('manual')}><Text style={s.perfActionIcon}>🕒</Text><Text style={s.perfActionManualTxt}>ثبت تردد دستی</Text></TouchableOpacity></View></View>}
    {busy&&data?<ActivityIndicator size={42} message="در حال بروزرسانی…"/>:null}
    <TouchableOpacity style={[s.readBtn,{marginTop:12}]} onPress={()=>load(date)} disabled={busy}><Text style={s.readBtnTxt}>{busy?'در حال بروزرسانی…':'بروزرسانی عملکرد'}</Text></TouchableOpacity>
  </ScrollView>;
}
function jalali_to_gregorian_client(j,m,d){
  let jy=Number(j)+1595;
  let days=-355668+365*jy+Math.floor(jy/33)*8+Math.floor((jy%33+3)/4)+Number(d)+(m<7?(m-1)*31:(m-7)*30+186);
  let gy=400*Math.floor(days/146097); days%=146097;
  if(days>36524){gy+=100*Math.floor((days-1)/36524);days=(days-1)%36524;if(days>=365)days++;}
  gy+=4*Math.floor(days/1461);days%=1461;
  if(days>365){gy+=Math.floor((days-1)/365);days=(days-1)%365;}
  const gd=days+1;const sal=[31,(gy%4===0&&(gy%100!==0||gy%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];let gm=0,dd=gd;
  while(gm<12&&dd>sal[gm]){dd-=sal[gm];gm++;}
  return [gy,gm+1,dd];
}
function gregorian_to_jalali_client(gy,gm,gd){
  gy=Number(gy);gm=Number(gm);gd=Number(gd);
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  const leap=(gy%4===0&&gy%100!==0)||gy%400===0;
  const gy2=gy-1600;
  let gDayNo=365*gy2+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400);
  gDayNo+=gdm[gm-1];
  if(gm>2&&leap)gDayNo++;
  gDayNo+=gd-1;
  let jDayNo=gDayNo-79;
  const jNp=Math.floor(jDayNo/12053);
  jDayNo%=12053;
  let jy=979+33*jNp+4*Math.floor(jDayNo/1461);
  jDayNo%=1461;
  if(jDayNo>=366){jy+=Math.floor((jDayNo-1)/365);jDayNo=(jDayNo-1)%365;}
  const monthDays=[31,31,31,31,31,31,30,30,30,30,30,29];
  let jm=0;
  while(jm<11&&jDayNo>=monthDays[jm]){jDayNo-=monthDays[jm];jm++;}
  return [jy,jm+1,jDayNo+1];
}
function CheckInShiftTab(){
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(true);
  const [err,setErr]=useState('');
  const requestSeq=useRef(0);
  const loadSchedule=async()=>{
    const seq=++requestSeq.current;
    setBusy(true);setErr('');
    try{
      const cacheKey='/my/shift-schedule?scope=current-month';
      const cached=await cachedValue(cacheKey);
      if(seq===requestSeq.current&&cached&&Array.isArray(cached.days))setData(cached);
      const fresh=await request(cacheKey,{timeoutMs:12000,noStore:true});
      if(seq===requestSeq.current)setData(fresh||{shift:null,days:[],message:'پاسخ برنامه شیفت خالی است.'});
    }catch(e){
      if(seq===requestSeq.current)setErr(e.message||'دریافت برنامه شیفت ناموفق بود.');
    }finally{
      if(seq===requestSeq.current)setBusy(false);
    }
  };
  useEffect(()=>{loadSchedule();return()=>{requestSeq.current++}},[]);
  if(busy&&!data)return <View style={s.center}><ActivityIndicator size={80} message="در حال دریافت شیفت کاری…"/></View>;
  const days=Array.isArray(data?.days)?data.days:[];
  const shiftMissing=!data?.shift||days.length===0;
  return <ScrollView persistentScrollbar={true} contentContainerStyle={{padding:14,paddingBottom:32}}>
    {err?<Text style={s.warnText}>{err}</Text>:null}
    <View style={s.shiftHero}>
      <Text style={s.shiftHeroTitle}>شیفت کاری</Text>
      <Text style={s.shiftHeroSub}>برنامهٔ کامل ماه جاری شمسی</Text>
    </View>
    {shiftMissing?<View style={[s.perfCardWide,{marginTop:4,alignItems:'center'}]}>
      <Text style={s.perfTitleEmpty}>برنامه شیفت نمایش داده نمی‌شود</Text>
      <Text style={s.perfHint}>{data?.message||err||'برای این کاربر شیفت فعالی پیدا نشد یا برنامه‌ای برای نمایش برنگشته است.'}</Text>
    </View>:days.map(d=><View key={d.date} style={s.shiftCard}>
      <View style={[s.shiftAccent,d.is_today&&{backgroundColor:C.brand}]}/>
      <View style={{flex:1}}>
        <Text style={s.shiftDate}>{d.weekday} <Text style={s.shiftDateLight}>({d.date})</Text>{d.is_today?<Text style={{fontFamily:FONT.bold,color:C.brand,fontSize:11}}>  • امروز</Text>:null}</Text>
        <Text style={s.shiftMeta}>{d.is_holiday?('تعطیل: '+(d.holiday_title||'')):d.is_off?(d.is_no_shift?'بدون شیفت فعال':'روز استراحت/بدون موظفی'):(d.shift_title||'شیفت کاری')}</Text>
      </View>
      <Text style={s.shiftMinutes}>{d.is_off?'—':(faNum(d.minutes)+' دقیقه')}</Text>
    </View>)}
    {busy&&data?<ActivityIndicator size={42} message="در حال بروزرسانی…"/>:null}
    <TouchableOpacity style={[s.readBtn,{marginTop:12}]} onPress={loadSchedule} disabled={busy}><Text style={s.readBtnTxt}>{busy?'در حال بروزرسانی…':'بروزرسانی شیفت کاری'}</Text></TouchableOpacity>
  </ScrollView>;
}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },  checkTabs: { flexDirection:'row-reverse', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:C.line, paddingHorizontal:12, paddingTop:12, paddingBottom:10, gap:8 },
  checkTab: { flex:1, minHeight:48, borderRadius:15, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.line, backgroundColor:'#fff' },
  checkTabOn: { backgroundColor:C.brand, borderColor:C.brand }, checkTabTxt:{fontFamily:FONT.bold,fontSize:12,color:C.ink}, checkTabTxtOn:{color:'#fff'},
  perfNav:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff',borderRadius:17,padding:11,borderWidth:1,borderColor:C.line},
  perfNavBtn:{paddingVertical:9,paddingHorizontal:10},perfNavTxt:{fontFamily:FONT.bold,fontSize:12,color:C.brand},perfDate:{fontFamily:FONT.bold,fontSize:13,color:C.ink},perfActions:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:14,marginTop:10},perfActionTitle:{fontFamily:FONT.bold,fontSize:13,color:C.ink,textAlign:'right'},perfActionHint:{fontFamily:FONT.regular,fontSize:11,color:C.muted,textAlign:'right',marginTop:5,lineHeight:18},perfActionRow:{flexDirection:'row-reverse',gap:8,marginTop:10},perfActionLeave:{flex:1,backgroundColor:'#e7f3ee',borderWidth:1,borderColor:C.brand,borderRadius:12,paddingVertical:12,alignItems:'center'},perfActionManual:{flex:1,backgroundColor:'#eef4ff',borderWidth:1,borderColor:'#3b5bd6',borderRadius:12,paddingVertical:12,alignItems:'center'},perfActionIcon:{fontSize:17},perfActionLeaveTxt:{fontFamily:FONT.bold,fontSize:12,color:C.brand,marginTop:4},perfActionManualTxt:{fontFamily:FONT.bold,fontSize:12,color:'#3b5bd6',marginTop:4},
  perfTitleEmpty:{fontFamily:FONT.bold,fontSize:15,color:C.ink,textAlign:'center'},
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
  mapBox: { height: 310, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.line, marginBottom: 14, backgroundColor: '#eaf1ef', elevation: 2 },
  refreshPosBtn: { backgroundColor: '#e7f3ee', borderWidth: 1, borderColor: C.brand, borderRadius: 15, paddingVertical: 13, alignItems: 'center', marginBottom: 8 },
  refreshPosTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 13 },
  distRow: { padding: 15, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, marginBottom: 14 },
  distTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 14, textAlign: 'center' },
  timerBox: { alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: '#e7f3ee', marginBottom: 14 },
  reminderCard: { flexDirection:'row-reverse', alignItems:'center', backgroundColor:'#fff', borderWidth:1, borderColor:C.line, borderRadius:14, padding:14, marginBottom:12 },
  reminderTextWrap: { flex:1, minWidth:0 },
  reminderTitle: { fontFamily:FONT.bold, color:C.ink, fontSize:14, textAlign:'right' },
  reminderHint: { fontFamily:FONT.regular, color:C.muted, fontSize:11, lineHeight:19, textAlign:'right', marginTop:4 },
  reminderCheckbox: { width:28, height:28, borderRadius:8, borderWidth:2, borderColor:'#cfd8e3', backgroundColor:'#f8fafc', alignItems:'center', justifyContent:'center', marginRight:12 },
  reminderCheckboxOn: { backgroundColor:C.brand, borderColor:C.brand },
  reminderCheck: { color:'#fff', fontFamily:FONT.bold, fontSize:16 },
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
  track: { height: 72, borderRadius: 36, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 18, marginBottom: 8, overflow: 'hidden', shadowColor: '#17352f', shadowOpacity: 0.10, shadowRadius: 10, elevation: 2 },
  trackTxt: { fontFamily: FONT.bold, fontSize: 15 },
  thumb: { position: 'absolute', right: 4, width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  thumbTxt: { color: '#fff', fontSize: 24, fontWeight: '700' },
});


function CheckInScreen(){
  const [tab,setTab]=useState('checkin');
  return <View style={{flex:1,backgroundColor:C.paper}}><View style={s.checkTabs}>{[['checkin','ثبت حضور'],['performance','کارکرد روزانه'],['shift','شیفت کاری']].map(([k,l])=><TouchableOpacity key={k} style={[s.checkTab,tab===k&&s.checkTabOn]} onPress={()=>setTab(k)}><Text style={[s.checkTabTxt,tab===k&&s.checkTabTxtOn]}>{l}</Text></TouchableOpacity>)}</View>{tab==='checkin'?<CheckInCore/>:tab==='performance'?<CheckInPerformanceTab/>:<CheckInShiftTab/>}</View>;
}

export default CheckInScreen;
