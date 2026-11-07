import { DashboardTool, DashboardMetric } from '../components/DashboardTiles';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openDrawer as khOpenDrawer } from '../drawerControl';
import { Alert, Animated, AppState, DeviceEventEmitter, Image, Linking, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from '../auth';
import { request, swr, imageSource, flushQueuedRequests } from '../api';
import { registerPush } from '../push';
import { faNum } from '../num';
import { C, FONT } from '../theme';
import { subscribeUnreadCounts, refreshUnreadCounts, unreadLabel } from '../unread';
import { todayFaLong } from '../jdate';
import { useRadio } from '../radio/RadioContext';
import { getLockConfig, lockAppNow } from '../AppLock';
import { readAppItems, refreshAppItems } from '../appItemPermissions';
import KhatyarBrandMark from '../components/KhatyarBrandMark';

function RadioHeaderToggle({ navigation }) {
  const { enabled, busy } = useRadio();
  return <DashboardQuickAction label="بی‌سیم" icon={enabled ? (busy ? 'radio-handheld' : 'access-point') : 'radio-handheld'} onPress={() => navigation.navigate('Radio')} />;
}

function DashboardQuickAction({ label, icon, onPress, badge, disabled }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!disabled}} onPress={onPress} disabled={disabled} activeOpacity={0.78} style={s.quickAction}>
    <View style={s.quickActionIcon}><MaterialCommunityIcons name={icon} size={23} color="#fff" />{badge ? <View style={s.quickBadge}><Text style={s.quickBadgeText}>{badge}</Text></View> : null}</View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={s.quickActionLabel}>{label}</Text>
  </TouchableOpacity>;
}

function weatherPresentation(code, isDay = true) {
  const c = Number(code);
  if (c === 0) return { icon: isDay ? 'weather-sunny' : 'weather-night', label: 'صاف' };
  if (c === 1) return { icon: isDay ? 'weather-partly-cloudy' : 'weather-night', label: 'عمدتاً صاف' };
  if (c === 2) return { icon: 'weather-partly-cloudy', label: 'کمی ابری' };
  if (c === 3) return { icon: 'weather-cloudy', label: 'ابری' };
  if (c === 45 || c === 48) return { icon: 'weather-fog', label: 'مه‌آلود' };
  if ([51, 53, 55, 56, 57].includes(c)) return { icon: 'weather-partly-rainy', label: 'نم‌نم باران' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return { icon: 'weather-rainy', label: 'بارانی' };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { icon: 'weather-snowy', label: 'برفی' };
  if ([95, 96, 99].includes(c)) return { icon: 'weather-lightning-rainy', label: 'رعدوبرق' };
  return { icon: 'thermometer', label: 'وضعیت هوا' };
}

function RankInsignia({ count = 0 }) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  if (!n) return null;
  return <View style={s.rankInsignia} accessibilityLabel={`${n} نوار درجه`}>
    {Array.from({ length: n }).map((_, i) => <View key={i} style={s.rankBar} />)}
  </View>;
}

const MENU_TABS = [['all', 'همه'], ['general', 'عمومی'], ['field', 'عملیات میدانی'], ['work', 'اداری'], ['messages', 'ارتباطات'], ['personal', 'شخصی']];
const MENU = [
  { t: 'ویرایش اطلاعات خودرو یا موتورسیکلت', r: 'PersonnelVehicleAsset', bg: '#e8f6f0' },
  { t: 'چک‌لیست خودرویی و موتوری', r: 'PersonnelVehicleChecklist', bg: '#eef2fb' },
  { t: 'خطوط مجاز شما', r: 'MyAllowedLines', bg: '#e7f3ee' },
  { t: 'بی‌سیم', r: 'Radio', bg: '#e8f6f0' }, { t: 'جستجوی تاکسی و تاکسیران', r: 'Search', bg: '#e8f3ff' }, { t: 'حاضرین در خط', r: 'PresentList', bg: '#e9f7f0' }, { t: 'ارسال گزارش', r: 'Reports', bg: '#fff3e6' }, { t: 'ثبت حضور من', r: 'CheckIn', bg: '#e7f3ee' }, { t: 'درخواست‌ها', r: 'Requests', bg: '#eef2fb' }, { t: 'تأیید درخواست‌ها', r: 'RequestInbox', bg: '#fff3e6' }, { t: 'کارکرد من', r: 'WorkSummary', bg: '#f0eefb' }, { t: 'فیش حقوقی', r: 'SalarySlips', bg: '#fff7e6' }, { t: 'ارسال برای شرکت', r: 'CompanyRequests', bg: '#e8f7f4' }, { t: 'اشتراک برنامه', r: 'Subscription', bg: '#fff4d6' }, { t: 'ارسال پیامک', r: 'Sms', bg: '#e7f3ee' }, { t: 'ارسال پیام در ربات‌ها', r: 'BotMessages', bg: '#eef7ff' }, { t: 'پیامک‌های ارسالی من', r: 'MySms', bg: '#eef4ff' }, { t: 'تکمیل فرم‌ها', r: 'Forms', bg: '#f0ecff' }, { t: 'فعالیت‌های فرهنگی', r: 'Cultural', bg: '#fdeef7', needs: 'cultural' }, { t: 'ثبت رفاهیات', r: 'Welfare', bg: '#fef3f8', needs: 'welfare' }, { t: 'حضور مسئولین در خط', r: 'OfficialPresence', bg: '#eafaf3' }, { t: 'اقلام تحویلی', r: 'Inventory', bg: '#f0ecff' }, { t: 'مأموریت روزانه من', r: 'MyDailyMission', bg: '#fff4d8' }, { t: 'برنامه بازدید و پوشش خط', r: 'LineVisitProgram', bg: '#e8f3ff' }, { t: 'ثبت موقعیت و تصویر خطوط', r: 'StationCapture', bg: '#e8f3ff' }, { t: 'ایستگاه‌های ثبت‌شده من', r: 'MyStations', bg: '#eafaf3' }, { t: 'داشبورد و امتیاز من', r: 'RoleDashboard', bg: '#eafaf3' }, { t: 'رتبه‌بندی و نشان‌ها', r: 'Leaderboard', bg: '#fff4d8' }, { t: 'پرکار/کم‌کار هر خط', r: 'ActivityReport', bg: '#eef4ff' }, { t: 'بیمه و معاینه خودروها', r: 'ExpInsurance', bg: '#e9f7f0' }, { t: 'افراد فاقد اعتبار', r: 'ExpTaxi', bg: '#fdeef0' }, { t: 'خودرو فاقد بهره‌برداری', r: 'ExpOplic', bg: '#fff7e0' }, { t: 'زیرمجموعهٔ من', r: 'TeamReport', bg: '#f0ecff' }, { t: 'رانندگان موقت خطوط ویژه', r: 'TempDrivers', bg: '#eef7ff', needs: 'temp' }, { t: 'اعلام قطع سیستم نوبت‌دهی', r: 'Outage', bg: '#fdeef0' }, { t: 'سرویس مدارس', r: 'SchoolService', bg: '#eaf4ff', needs: 'schoolservice' }, { t: 'شکایات تاکسیرانان', r: 'Complaints', bg: '#fff0f2' }
];
const MENU_ICONS = {
  "PersonnelVehicleAsset": "car-cog",
  "PersonnelVehicleChecklist": "clipboard-check-outline",
  "MyAllowedLines": "routes",
  "Radio": "radio-handheld",
  "Search": "magnify",
  "PresentList": "account-group-outline",
  "Reports": "file-send-outline",
  "CheckIn": "map-marker-check-outline",
  "Requests": "file-document-edit-outline",
  "RequestInbox": "check-decagram-outline",
  "WorkSummary": "chart-line",
  "SalarySlips": "receipt-text-outline",
  "CompanyRequests": "office-building-outline",
  "Subscription": "card-account-details-outline",
  "Sms": "message-processing-outline",
  "BotMessages": "robot-outline",
  "MySms": "message-check-outline",
  "Forms": "clipboard-text-outline",
  "Cultural": "palette-outline",
  "Welfare": "hand-heart-outline",
  "OfficialPresence": "account-check-outline",
  "Inventory": "package-variant-closed",
  "MyDailyMission": "clipboard-list-outline",
  "LineVisitProgram": "routes",
  "StationCapture": "map-marker-plus-outline",
  "MyStations": "map-marker-multiple-outline",
  "RoleDashboard": "view-dashboard-outline",
  "Leaderboard": "trophy-outline",
  "ActivityReport": "chart-bar",
  "ExpInsurance": "shield-car",
  "ExpTaxi": "account-alert-outline",
  "ExpOplic": "car-off",
  "TeamReport": "account-supervisor-outline",
  "TempDrivers": "car-clock",
  "Outage": "alert-circle-outline",
  "SchoolService": "school-outline",
  "Complaints": "comment-alert-outline"
};
const categoryOf = (r) => ['CheckIn', 'OfficialPresence', 'LineVisitProgram', 'StationCapture', 'MyStations', 'RoleDashboard', 'Leaderboard', 'PresentList', 'ActivityReport', 'ExpInsurance', 'ExpTaxi', 'ExpOplic'].includes(r) ? 'field' : ['Reports', 'Requests', 'RequestInbox', 'Forms', 'CompanyRequests', 'Outage'].includes(r) ? 'work' : ['Sms', 'BotMessages', 'MySms', 'Messages', 'Notifications'].includes(r) ? 'messages' : ['WorkSummary', 'SalarySlips', 'Subscription', 'Welfare', 'Cultural'].includes(r) ? 'personal' : 'general';
const CATEGORY_LABELS = {general:'عمومی',field:'میدانی',work:'اداری',messages:'ارتباطات',personal:'شخصی'};

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const welcomePlayer = useAudioPlayer(require('../../assets/sounds/welcome.mp3'));
  const { width, fontScale } = useWindowDimensions();
  const contentWidth = Math.min(width, 960);
  const cols = width < 380 || fontScale > 1.3 ? 1 : width >= 900 ? 3 : 2;
  const gridGap = 12;
  const gridCardWidth = (contentWidth - 32 - gridGap * (cols - 1)) / cols;
  const kpiCardWidth = fontScale > 1.5 ? '100%' : '50%';
  const [stats, setStats] = useState({ today: 0, checklists: 0, notices: 0, reports: 0, unread: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ messages: 0, reports: 0, total: 0 });
  const [myStats, setMyStats] = useState({ drivers: 0, vehicles: 0 });
  // Fail closed while loading permissions or when the server is unreachable.
  // A missing role-app-items configuration is not permission to show everything.
  const [allowed, setAllowed] = useState([]);
  const [permissionState, setPermissionState] = useState('loading');
  const [access, setAccess] = useState({ welfare: false, cultural: false, temp: false });
  const [schoolServiceAllowed, setSchoolServiceAllowed] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [myPhoto, setMyPhoto] = useState(user?.photo || null);
  const [orgContext, setOrgContext] = useState({ zoneName: '', chiefName: '' });
  const [weather, setWeather] = useState(null);
  const [menuTab, setMenuTab] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [syncDetail, setSyncDetail] = useState('');
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [pop, setPop] = useState(null);
  const [menuOrder, setMenuOrder] = useState([]);
  const [orderModal, setOrderModal] = useState(false);
  const [dragRoute, setDragRoute] = useState(null);
  const [dragDy, setDragDy] = useState(0);
  const menuOrderRef = useRef([]);
  const dragStartIndex = useRef(-1);
  const dragCurrentIndex = useRef(-1);
  const dragActiveRoute = useRef(null);
  const dragResponders = useRef(new Map());
  const orderSaveQueue = useRef(Promise.resolve());
  const orderKey = `dashboard-menu-order:${user?.id || 'me'}`;

  // صدای خوش‌آمد فقط یک‌بار در هر mount داشبورد پخش می‌شود؛ بنابراین با
  // برگشت‌های معمولی داخل همان صفحه دوباره تکرار نخواهد شد.
  useEffect(() => {
    try { welcomePlayer.play(); } catch (_) {}
  }, [welcomePlayer]);

  const rankCountFor = (role) => { if (!role) return 0; const r = String(role); if (r.includes('سربازرس')) return 4; if (r.includes('بازرس')) return 2; if (r.includes('ناظر خط') || r.includes('اپراتور') || r.includes('مسئول خط') || r.includes('سرپرست خط')) return 1; return 0; };
  const rankCount = user?.rank_stars !== null && user?.rank_stars !== undefined ? Math.max(0, Math.min(5, Number(user.rank_stars) || 0)) : rankCountFor(user?.role);

  useEffect(() => {
    const off = subscribeUnreadCounts(setUnreadCounts);
    refreshUnreadCounts();
    return off;
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const cacheKey = 'dashboard:weather:v1';
    // ابتدا کش محلی را نمایش بده؛ دریافت شبکه در پس‌زمینه انجام می‌شود.
    AsyncStorage.getItem(cacheKey).then((raw) => {
      if (!active || !raw) return;
      try { const cached = JSON.parse(raw)?.data; if (cached?.ok && Number.isFinite(Number(cached.temperature))) setWeather(cached); } catch (_) {}
    }).catch(() => {});
    const loadWeather = () => {
      request('/weather.php', { auth: false, noStore: true, timeoutMs: 10000, queueIfOffline: false })
        .then(async (data) => {
          if (!active || !data?.ok || !Number.isFinite(Number(data.temperature))) return;
          setWeather(data);
          await AsyncStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data })).catch(() => {});
        })
        .catch(() => {});
    };
    loadWeather();
    const timer = setInterval(loadWeather, 30 * 60 * 1000);
    const appStateSub = AppState.addEventListener('change', (state) => { if (state === 'active') loadWeather(); });
    return () => { active = false; clearInterval(timer); try { appStateSub.remove(); } catch (_) {} };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const profileCacheKey = 'dashboard:profile:v1:' + user.id;
    const applyProfile = (p) => {
      if (!active || !p || typeof p !== 'object') return;
      if (p.photo) setMyPhoto(p.photo);
      setOrgContext({ zoneName: String(p.zone_name || '').trim(), chiefName: String(p.zone_chief_inspector_name || '').trim() });
    };
    // اطلاعات منطقه و سربازرس از کش بلافاصله پس از بازشدن داشبورد خوانده می‌شود.
    AsyncStorage.getItem(profileCacheKey).then((raw) => {
      if (!active || !raw) return;
      try { applyProfile(JSON.parse(raw)?.data); } catch (_) {}
    }).catch(() => {});
    request('/me/full-profile', { noStore: true, timeoutMs: 10000 }).then(async (p) => {
      applyProfile(p);
      if (p && typeof p === 'object') await AsyncStorage.setItem(profileCacheKey, JSON.stringify({ savedAt: Date.now(), data: p })).catch(() => {});
    }).catch(() => {});
    const isAdmin = !!(user.is_admin || (user.level || 0) >= 3);
    request('/my/app-config').then((c) => setAccess({ welfare: isAdmin || !!c?.can_welfare, cultural: isAdmin || !!c?.can_cultural, temp: isAdmin || !!c?.can_manage_temp_drivers })).catch(() => setAccess({ welfare: isAdmin, cultural: isAdmin, temp: isAdmin }));
    return () => { active = false; };
  }, [user?.id, user?.photo]);

  useEffect(() => {
    if (!user) return;
    request('/school-service/access', { noStore: true }).then((r) => setSchoolServiceAllowed(r?.allowed === true)).catch(() => setSchoolServiceAllowed(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    request('/my/device-info', { method: 'POST', body: { device_model: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Device.deviceName || '', android_version: Platform.OS === 'android' ? `Android ${Device.osVersion || ''}` : Device.osVersion || '', app_version: require('expo-constants').default?.expoConfig?.version || '' } }).catch(() => {});
  }, [user?.id]);

  const load = () => {
    swr('/my/dashboard', setStats); swr('/my/stats', setMyStats);
  };

  useEffect(() => {
    let active = true;
    setAllowed([]);setPermissionState('loading');
    (async () => {
      const cached = await readAppItems(user?.id);
      if (!active) return;
      if (cached !== null) { setAllowed(cached);setPermissionState('ready'); }
      try { const fresh = await refreshAppItems(user?.id); if(active){setAllowed(fresh);setPermissionState('ready');} }
      catch (_) { if(active && cached === null) setPermissionState('error'); }
    })();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    const defaults = MENU.map((m) => m.r);
    AsyncStorage.getItem(orderKey).then((raw) => {
      if (!alive) return;
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        const saved = Array.isArray(parsed) ? parsed : [];
        const valid = saved.filter((r) => defaults.includes(r));
        const missing = defaults.filter((r) => !valid.includes(r));
        const normalized = [...valid, ...missing];
        menuOrderRef.current = normalized;
        setMenuOrder(normalized);
      } catch (_) { menuOrderRef.current = defaults; setMenuOrder(defaults); }
    }).catch(() => { if (alive) { menuOrderRef.current = defaults; setMenuOrder(defaults); } });
    return () => { alive = false; };
  }, [orderKey]);

  const persistMenuOrder = (next, save = true) => {
    const clean = Array.from(new Set(next)).filter((r) => MENU.some((m) => m.r === r));
    const missing = MENU.map((m) => m.r).filter((r) => !clean.includes(r));
    const normalized = [...clean, ...missing];
    menuOrderRef.current = normalized;
    setMenuOrder(normalized);
    if (!save) return Promise.resolve(normalized);
    orderSaveQueue.current = orderSaveQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(orderKey, JSON.stringify(normalized)))
      .catch(() => Alert.alert('خطای ذخیره ترتیب', 'ترتیب جدید روی این دستگاه ذخیره نشد. فضای ذخیره‌سازی را بررسی و دوباره تلاش کنید.'));
    return orderSaveQueue.current.then(() => normalized);
  };
  const resetMenuOrder = () => persistMenuOrder(MENU.map((m) => m.r));
  const sortMenuOrder = () => persistMenuOrder(MENU.slice().sort((a, b) => String(a.t).localeCompare(String(b.t), 'fa')).map((m) => m.r));
  const beginMenuDrag = (route) => {
    const list = menuOrderRef.current.length ? menuOrderRef.current : MENU.map((m) => m.r);
    const index = list.indexOf(route);
    if (index < 0) return;
    dragStartIndex.current = index;
    dragCurrentIndex.current = index;
    dragActiveRoute.current = route;
    setDragDy(0);
    setDragRoute(route);
  };
  const updateMenuDrag = (route, dy) => {
    if (dragActiveRoute.current !== route) return;
    const base = menuOrderRef.current.length ? menuOrderRef.current : MENU.map((m) => m.r);
    const list = [...base];
    let current = dragCurrentIndex.current;
    const threshold = 62;
    while (dy < (current - dragStartIndex.current) * threshold - threshold / 2 && current > 0) {
      [list[current], list[current - 1]] = [list[current - 1], list[current]];
      current -= 1;
    }
    while (dy > (current - dragStartIndex.current) * threshold + threshold / 2 && current < list.length - 1) {
      [list[current], list[current + 1]] = [list[current + 1], list[current]];
      current += 1;
    }
    dragCurrentIndex.current = current;
    if (list.join('|') !== base.join('|')) persistMenuOrder(list, false);
    setDragDy(dy);
  };
  const finishMenuDrag = () => {
    if (!dragActiveRoute.current) return;
    const finalOrder = menuOrderRef.current.length ? [...menuOrderRef.current] : MENU.map((m) => m.r);
    setDragRoute(null);
    dragActiveRoute.current = null;
    setDragDy(0);
    dragStartIndex.current = -1;
    dragCurrentIndex.current = -1;
    persistMenuOrder(finalOrder, true);
  };
  const cancelMenuDrag = () => {
    setDragRoute(null);
    dragActiveRoute.current = null;
    setDragDy(0);
    dragStartIndex.current = -1;
    dragCurrentIndex.current = -1;
  };
  const dragCallbacks = useRef({ beginMenuDrag, updateMenuDrag, finishMenuDrag, cancelMenuDrag });
  dragCallbacks.current = { beginMenuDrag, updateMenuDrag, finishMenuDrag, cancelMenuDrag };
  const dragResponder = (route) => {
    if (dragResponders.current.has(route)) return dragResponders.current.get(route);
    const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
    onPanResponderGrant: () => dragCallbacks.current.beginMenuDrag(route),
    onPanResponderMove: (_, g) => dragCallbacks.current.updateMenuDrag(route, g.dy),
    onPanResponderRelease: () => dragCallbacks.current.finishMenuDrag(),
    onPanResponderTerminate: () => dragCallbacks.current.cancelMenuDrag(),
    onPanResponderTerminationRequest: () => false,
  });
    dragResponders.current.set(route, responder);
    return responder;
  };
  const moveMenuItem = (route, direction) => {
    const list = menuOrder.length ? [...menuOrder] : MENU.map((m) => m.r);
    const permitted = list.filter((r) => allowed.includes(r));
    const position = permitted.indexOf(route);
    if (position < 0 || position + direction < 0 || position + direction >= permitted.length) return;
    const i = list.indexOf(route), j = list.indexOf(permitted[position + direction]);
    [list[i], list[j]] = [list[j], list[i]];
    persistMenuOrder(list);
  };
  const orderedMenu = (menuOrder.length ? menuOrder : MENU.map((m) => m.r)).map((r) => MENU.find((m) => m.r === r)).filter(Boolean);
  useEffect(() => { flushQueuedRequests().catch(() => {}); registerPush(); load(); const unsub = navigation.addListener('focus', load); return unsub; }, [navigation]);

  useEffect(() => {
    let active = true;
    const readLockState = () => getLockConfig().then((config) => { if (active) setAppLockEnabled(!!config.enabled); }).catch(() => {});
    readLockState();
    const configSub = DeviceEventEmitter.addListener('khatyar.appLock.configChanged', (config) => setAppLockEnabled(!!config?.enabled));
    const focusSub = navigation.addListener('focus', readLockState);
    return () => { active = false; configSub.remove(); focusSub(); };
  }, [navigation]);

  const manualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try { setSyncDetail('پاک‌سازی کش و آغاز همگام‌سازی…'); const keys = await AsyncStorage.getAllKeys(); const cacheKeys = keys.filter((k) => String(k).startsWith('cache:')); if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys); flushQueuedRequests({force:true}).catch(() => {}); load(); Alert.alert('بروزرسانی آغاز شد', 'دریافت اطلاعات جدید و ارسال موارد ذخیره‌شده در پس‌زمینه انجام می‌شود. وضعیت موارد ارسال‌نشده را در «صف ارسال» بررسی کنید.'); } catch (e) { Alert.alert('خطا', 'آغاز بروزرسانی ناموفق بود.'); } finally { setSyncDetail(''); setSyncing(false); }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, stats.unread, syncing, appLockEnabled, allowed, user?.can_send_sms]);

  const canShow = (m) => {
    if (m.r === 'Help') return false;
    const permitted = allowed.includes(m.r) || (m.r === 'StationCapture' && allowed.includes('LineLocation'));
    if (!permitted) return false;
    if (m.needs === 'schoolservice') return schoolServiceAllowed;
    return !m.needs || !!access[m.needs];
  };
  const visibleMenu = orderedMenu.filter((m) => (m.r !== 'Sms' && m.r !== 'MySms' && m.r !== 'BotMessages') || !!user?.can_send_sms || m.r === 'BotMessages').filter(canShow).filter((m) => menuTab === 'all' || categoryOf(m.r) === menuTab).filter((m) => { const q = String(menuSearch || '').trim().toLocaleLowerCase(); return !q || String(m.t || '').toLocaleLowerCase().includes(q); });
  const destinationFor = (route) => route === 'StationCapture' && !allowed.includes('StationCapture') && allowed.includes('LineLocation') ? 'LineLocation' : route;
  const KPIS = [['رانندگان خطوط شما', myStats.drivers, 'account-group-outline'], ['خودروهای خطوط شما', myStats.vehicles, 'car-multiple'], ['حضور امروز', stats.today, 'account-check-outline'], ['چک‌لیست این ماه', stats.checklists, 'clipboard-check-outline']];

  return <ScrollView keyboardShouldPersistTaps="handled" persistentScrollbar={true} style={s.page} contentContainerStyle={s.pageContent}><View style={s.rtlRoot}>{syncing && syncDetail ? <View style={s.syncBanner}><Text accessibilityLiveRegion="polite" style={s.syncText}>{syncDetail}</Text></View> : null}
  <View style={s.dashboardHero}>
    <View style={s.dashboardBrandRow}><TouchableOpacity accessibilityRole="button" accessibilityLabel="باز کردن منوی برنامه" onPress={khOpenDrawer} style={s.brandMenu}><MaterialCommunityIcons name="menu" size={27} color="#fff" /></TouchableOpacity><View style={s.brandCopy}><Text style={s.brandName}>خطیار</Text><Text style={s.brandSubtitle}>داشبورد مدیریتی</Text></View><KhatyarBrandMark size={42}/></View>
    <View style={s.quickActions}>
      {allowed.includes('InboxReports') && <DashboardQuickAction label="گزارشات" icon="message-text-outline" badge={unreadCounts.reports>0?unreadLabel(unreadCounts.reports):null} onPress={() => { navigation.navigate('InboxReports'); refreshUnreadCounts(); }} />}
      <DashboardQuickAction label="بروزرسانی کش" icon={syncing?'sync':'download-outline'} disabled={syncing} onPress={manualSync} />
      {allowed.includes('Notifications') && <DashboardQuickAction label="اعلان‌ها" icon="bell-outline" badge={stats.unread>0?(stats.unread>99?'۹۹+':faNum(stats.unread)):null} onPress={() => navigation.navigate('Notifications')} />}
      {allowed.includes('Radio') && <RadioHeaderToggle navigation={navigation} />}
      {appLockEnabled && <DashboardQuickAction label="قفل" icon="lock-outline" onPress={lockAppNow} />}
      {allowed.includes('Messages') && <DashboardQuickAction label="پیام‌ها" icon="message-text-outline" badge={unreadCounts.messages>0?unreadLabel(unreadCounts.messages):null} onPress={() => { navigation.navigate('Messages'); refreshUnreadCounts(); }} />}
    </View>
  </View><View style={s.top}>
  {myPhoto ? <Image accessible={false} source={imageSource(myPhoto)} style={s.avatar} /> : <View style={s.avatarPh}><Text style={s.avatarTxt}>{(user?.name || '؟')[0]}</Text></View>}
  <View style={s.topIdentity}>
    <View style={s.activePill}><View style={s.activeDot}/><Text style={s.activeTxt}>فعال</Text></View>
    <Text style={s.hi}>روز بخیر</Text>
    <View style={s.nameRow}>{rankCount > 0 ? <RankInsignia count={rankCount} /> : null}<Text accessibilityRole="header" style={s.nm}>{user?.name || '—'}</Text></View>
    {!!user?.role && <Text style={s.roleTxt}>{user.role}</Text>}
    {!!orgContext.zoneName && <Text style={s.orgTxt}>منطقه: {orgContext.zoneName}</Text>}
    {!!orgContext.chiefName && <Text style={s.orgTxt}>سربازرس: {orgContext.chiefName}</Text>}
  </View>
</View>
<View style={s.weatherStrip}>
  <View style={s.dateRow}><MaterialCommunityIcons name="calendar-outline" size={19} color={C.brand}/><Text style={s.todayTxt}>{todayFaLong()}</Text></View>
  <View style={s.weatherSummary}>{weather ? <><MaterialCommunityIcons name={weatherPresentation(weather.weather_code, Number(weather.is_day) !== 0).icon} size={22} color={C.brand} /><Text style={s.weatherLabel}>مشهد · {faNum(Math.round(Number(weather.temperature)))}° · {weatherPresentation(weather.weather_code, Number(weather.is_day) !== 0).label}</Text></> : <Text style={s.weatherLabel}>آب‌وهوا در دسترس نیست</Text>}</View>
  {!!weather && <TouchableOpacity accessibilityRole="link" accessibilityLabel="منبع آب‌وهوا، Open-Meteo" style={s.weatherLink} onPress={() => Linking.openURL('https://open-meteo.com/').catch(() => {})}><Text style={s.weatherSource}>Open-Meteo</Text></TouchableOpacity>}
</View><View style={s.kpis}>{KPIS.map(([label, value, icon]) => <DashboardMetric key={label} label={label} value={value} icon={icon} width={kpiCardWidth} />)}</View><View style={s.sectionHeader}><View><Text accessibilityRole="header" style={s.sectionTitle}>ابزارهای من</Text></View><View style={s.resultCount} accessibilityLiveRegion="polite"><Text style={s.resultCountText}>{faNum(visibleMenu.length)} آیتم</Text></View></View><View style={s.searchBox}><MaterialCommunityIcons name="magnify" size={25} color={C.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /><TextInput value={menuSearch} onChangeText={setMenuSearch} placeholder="جست‌وجوی امکانات و ابزارها" placeholderTextColor={C.slate} style={s.menuSearchInput} returnKeyType="search" accessibilityLabel="جست‌وجوی آیتم‌های داشبورد"/><TouchableOpacity style={s.clearSearch} onPress={() => setMenuSearch("")} disabled={!menuSearch} accessibilityRole="button" accessibilityLabel="پاک کردن جست‌وجو"><Text style={[s.clearSearchText, !menuSearch && s.clearSearchDisabled]}>×</Text></TouchableOpacity></View><View style={s.orderBar}><Text style={s.orderHint}>ترتیب آیتم‌ها برای حساب کاربری شما ذخیره می‌شود.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="تنظیم ترتیب نمایش آیتم‌ها" style={s.orderBtn} onPress={() => setOrderModal(true)}><Text style={s.orderBtnTxt}>تنظیم ترتیب</Text></TouchableOpacity></View><ScrollView persistentScrollbar={true} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.menuTabs}>{MENU_TABS.map(([k, l]) => <TouchableOpacity key={k} accessibilityRole="tab" accessibilityState={{selected:menuTab===k}} style={[s.menuTab, menuTab === k && s.menuTabOn]} onPress={() => setMenuTab(k)}><Text style={[s.menuTabTxt, menuTab === k && s.menuTabTxtOn]}>{l}</Text></TouchableOpacity>)}</ScrollView>{visibleMenu.length ? <View style={s.grid}>{visibleMenu.map((m) => <DashboardTool key={m.r} label={m.t} icon={MENU_ICONS[m.r] || 'view-grid-outline'} category={CATEGORY_LABELS[categoryOf(m.r)]} width={gridCardWidth} onPress={() => navigation.navigate(destinationFor(m.r))} />)}</View> : <View style={s.emptyMenu}><MaterialCommunityIcons name="view-grid-outline" size={36} color={C.brand} style={{marginBottom:10}} /><Text style={s.emptyMenuTitle}>{permissionState === "loading" ? "در حال دریافت دسترسی‌ها…" : permissionState === "error" ? "دسترسی‌ها دریافت نشد" : allowed.length === 0 ? "هیچ آیتمی برای سمت شما فعال نیست" : "موردی پیدا نشد"}</Text><Text style={s.emptyMenuText}>{permissionState === "error" ? "اتصال اینترنت را بررسی کنید و دوباره تلاش کنید." : permissionState === "loading" ? "آیتم‌ها پس از بررسی مجوز سمت شما نمایش داده می‌شوند." : allowed.length === 0 ? "مدیر سامانه می‌تواند آیتم‌های موردنیاز شما را در بخش «آیتم‌های اپ هر سمت» فعال کند." : "عبارت دیگری جست‌وجو کنید یا فیلتر را روی «همه» بگذارید."}</Text>{permissionState === "error" ? <TouchableOpacity style={s.emptyMenuAction} accessibilityRole="button" onPress={load}><Text style={s.emptyMenuActionText}>تلاش دوباره</Text></TouchableOpacity> : permissionState === "ready" && allowed.length > 0 ? <TouchableOpacity style={s.emptyMenuAction} accessibilityRole="button" onPress={() => { setMenuSearch(""); setMenuTab("all"); }}><Text style={s.emptyMenuActionText}>پاک‌کردن جست‌وجو و فیلتر</Text></TouchableOpacity> : null}</View>}<Modal visible={orderModal} transparent animationType="slide" onRequestClose={() => setOrderModal(false)}><View style={s.orderBg}><View style={s.orderCard}><View style={s.orderHead}><Text style={s.orderTitle}>مرتب‌سازی داشبورد</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن پنجره مرتب‌سازی" onPress={() => setOrderModal(false)}><Text style={s.orderClose}>✕</Text></TouchableOpacity></View><View style={s.orderActions}><TouchableOpacity accessibilityRole="button" style={s.orderAction} onPress={sortMenuOrder}><Text style={s.orderActionTxt}>مرتب‌سازی الفبایی</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={s.orderAction} onPress={resetMenuOrder}><Text style={s.orderActionTxt}>بازگردانی ترتیب پیش‌فرض</Text></TouchableOpacity></View><ScrollView style={s.orderList} contentContainerStyle={s.orderListContent} showsVerticalScrollIndicator={false} scrollEnabled={!dragRoute}>{(menuOrder.length ? menuOrder : MENU.map((m) => m.r)).filter((route) => allowed.includes(route)).map((route, i, arr) => { const m = MENU.find((x) => x.r === route); if (!m) return null; const dragging = dragRoute === route; const responder = dragResponder(route); return <Animated.View key={route} style={[s.orderRow, dragging && s.orderRowDragging, dragging && { borderColor: C.brand }]}><View style={s.orderIndex}><Text style={s.orderIndexTxt}>{faNum(i + 1)}</Text></View><View style={s.orderName}><Text style={s.orderNameTxt} numberOfLines={1}>{m.t}</Text></View><View style={s.dragHandle} {...responder.panHandlers} accessibilityRole="button" accessibilityLabel="جابجایی آیتم"><Text style={s.dragHandleDots}>☷</Text></View><TouchableOpacity style={s.moveBtn} disabled={i === 0} onPress={() => moveMenuItem(route, -1)} accessibilityLabel="انتقال به بالا"><Text style={[s.moveTxt, i === 0 && s.moveDisabled]}>▲</Text></TouchableOpacity><TouchableOpacity style={s.moveBtn} disabled={i === arr.length - 1} onPress={() => moveMenuItem(route, 1)} accessibilityLabel="انتقال به پایین"><Text style={[s.moveTxt, i === arr.length - 1 && s.moveDisabled]}>▼</Text></TouchableOpacity></Animated.View>; })}</ScrollView><View style={s.orderFooter}><Text style={s.orderFooterHint}>برای جابه‌جایی، دستگیره را بکشید یا از فلش‌ها استفاده کنید.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="ذخیره ترتیب و بستن پنجره" style={s.orderDone} onPress={async () => { await persistMenuOrder(menuOrderRef.current); setOrderModal(false); }}><MaterialCommunityIcons name="check-circle-outline" color="#fff" size={21}/><Text style={s.orderDoneTxt}>تأیید و ذخیره ترتیب</Text></TouchableOpacity></View></View></View></Modal><Modal visible={!!pop} transparent animationType="fade" onRequestClose={() => setPop(null)}><TouchableOpacity style={s.popBg} activeOpacity={1} onPress={() => setPop(null)}><View style={s.popCard}><TouchableOpacity style={s.popBtn} onPress={() => setPop(null)}><Text style={s.popBtnTxt}>بستن</Text></TouchableOpacity></View></TouchableOpacity></Modal></View></ScrollView>;
}

const s = StyleSheet.create({
  dashboardHero: { backgroundColor:'#075d4b', paddingTop:18, paddingHorizontal:14, paddingBottom:18, borderBottomLeftRadius:26, borderBottomRightRadius:26, borderBottomWidth:3, borderBottomColor:'#14a981', overflow:'hidden' },
  dashboardBrandRow: { flexDirection:'row-reverse', alignItems:'center', gap:13, paddingHorizontal:3, paddingBottom:17 },
  brandMenu: { width:48, height:48, borderRadius:15, backgroundColor:'rgba(255,255,255,0.13)', borderWidth:1, borderColor:'rgba(255,255,255,0.17)', alignItems:'center', justifyContent:'center' },
  brandCopy: { flex:1, alignItems:'flex-end' },
  brandName: { color:'#fff', fontFamily:FONT.bold, fontSize:26, textAlign:'right', lineHeight:36 },
  brandSubtitle: { color:'#c8eee2', fontFamily:FONT.regular, fontSize:12, textAlign:'right' },
  brandAccent: { width:34, height:3, borderRadius:5, backgroundColor:'#e3c56e', alignSelf:'flex-start', marginTop:8 },
  quickActions: { flexDirection:'row-reverse', justifyContent:'space-evenly', alignItems:'flex-start', gap:5 },
  quickAction: { flex:1, minWidth:0, minHeight:77, alignItems:'center', justifyContent:'flex-start', gap:5 },
  quickActionIcon: { height:49, width:'94%', maxWidth:64, borderRadius:15, alignItems:'center', justifyContent:'center', position:'relative', backgroundColor:'rgba(255,255,255,0.11)', borderColor:'rgba(127,231,200,0.34)', borderWidth:1 },
  quickActionLabel: { color:'#fff', fontFamily:FONT.bold, fontSize:10, lineHeight:17, textAlign:'center', writingDirection:'rtl', width:'100%' },
  quickBadge: { position:'absolute', top:-7, right:-5, minWidth:25, height:22, borderRadius:12, paddingHorizontal:4, backgroundColor:'#f05b38', borderWidth:2, borderColor:'#075d4b', alignItems:'center', justifyContent:'center' },
  quickBadgeText: { color:'#fff', fontSize:10, fontFamily:FONT.bold, lineHeight:15 },
  activePill: { flexDirection:'row-reverse', alignItems:'center', alignSelf:'flex-end', backgroundColor:'rgba(27,193,121,.21)', borderRadius:16, paddingHorizontal:10, paddingVertical:3, gap:5, marginBottom:5 },
  activeDot: { width:7, height:7, borderRadius:4, backgroundColor:'#45eb96' },
  activeTxt: { fontFamily:FONT.bold, fontSize:11, color:'#d8ffeb' },
  weatherStrip: { marginHorizontal: 16, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2, borderRadius: 14, backgroundColor: C.soft, flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', columnGap: 16 },
  dateRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 8 },
  weatherSummary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexShrink: 1, paddingVertical: 6 },
  weatherLink: { minHeight: 44, justifyContent: 'center' },
  page: { flex: 1, backgroundColor: '#edf8f5'},
  pageContent: { paddingBottom: 36},
  rtlRoot: { width: '100%', maxWidth: 960, alignSelf: 'center' },
  syncBanner: { backgroundColor: '#1b3a6b', padding: 10, alignItems: 'stretch' },
  syncText: { color: '#fff', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  headerBar: { height: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: 250 },
  headerActions: { height: 44, flexDirection: 'row-reverse', alignItems: 'center' },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerMenuButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,.12)' },
  bellWrap: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  unreadBadge: { position: 'absolute', top: -2, right: -3, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#e53935', borderWidth: 2, borderColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#fff', fontFamily: FONT.bold, fontSize: 8, lineHeight: 10, textAlign: 'center', writingDirection: 'rtl' },
  top: { marginHorizontal:16,marginTop:14,padding:18,paddingTop:19,paddingBottom:19,flexDirection:'row-reverse',alignItems:'center',gap:14,backgroundColor:'#08624e',borderRadius:22,borderWidth:1,borderColor:'#23ba94',elevation:5,shadowColor:'#075d4b',shadowOpacity:0.18,shadowRadius:14 },
  topIdentity: { flex: 1, minWidth: 0 },
  hi: { color:'#d9f4e9', fontFamily: FONT.regular, textAlign: 'right', fontSize: 14 },
  nameRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' },
  nm: { flex: 1, color:'#fff', fontFamily: FONT.bold, fontSize: 23, lineHeight: 34, textAlign: 'right' },
  rankInsignia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4, marginLeft: 8, height: 20 },
  rankBar: { width: 3, height: 17, borderRadius: 1.5, backgroundColor: '#ffd24a' },
  todayTxt: { color: C.ink, fontFamily: FONT.regular, fontSize: 13, textAlign: 'right', flexShrink: 1 },
  weatherIcon: { fontSize: 19 },
  weatherLabel: { color: C.slate, fontFamily: FONT.regular, fontSize: 13, textAlign: 'right', flexShrink: 1 },
  weatherSource: { color: C.brand, textDecorationLine: 'underline', fontFamily: FONT.regular, fontSize: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#e6fff5' },
  avatarPh: { width:72, height:72, borderRadius:36, backgroundColor:'#c9f4e5', alignItems:'center', justifyContent:'center' },
  avatarTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 27 },
  roleTxt: { color:'#99f1ce', fontFamily: FONT.bold, fontSize: 14, textAlign: 'right', marginTop: 2 },
  orgTxt: { color:'#e1f8f0', fontFamily: FONT.regular, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 3 },
  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginHorizontal: 16, marginTop: 14 },
  sectionHeader: { marginHorizontal: 16, marginTop: 24, marginBottom: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 21, textAlign: 'right' },
  resultCount: { backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  resultCountText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12, textAlign: 'center' },
  searchBox: { marginHorizontal: 16, marginBottom: 12, minHeight: 56, borderWidth: 1.5, borderColor: C.line, borderRadius: 18, backgroundColor: C.card, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', elevation:1 },
  menuSearchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 7, fontFamily: FONT.regular, fontSize: 13, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  clearSearch: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  clearSearchText: { color: C.muted, fontSize: 23, lineHeight: 27 },
  clearSearchDisabled: { opacity: 0.25 },
  menuTabs: { paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row-reverse' },
  menuTab: { minHeight: 48, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, marginLeft: 4, marginRight: 4 },
  menuTabOn: { backgroundColor: C.brand, borderColor: C.brand },
  menuTabTxt: { fontFamily: FONT.bold, color: C.slate, fontSize: 13, textAlign: 'center' },
  menuTabTxtOn: { color: '#fff' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'flex-start', columnGap: 12, rowGap: 12 },
  emptyMenu: { marginHorizontal: 14, marginTop: 6, padding: 22, minHeight: 210, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  emptyMenuTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 15, textAlign: 'center', writingDirection: 'rtl' },
  emptyMenuText: { color: C.muted, fontFamily: FONT.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', writingDirection: 'rtl', marginTop: 7 },
  emptyMenuAction: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: C.soft },
  emptyMenuActionText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12, textAlign: 'center', writingDirection: 'rtl' },
  orderListContent: { paddingBottom: 4 },
  orderRowDragging: { opacity: 0.92, elevation: 8, shadowOpacity: 0.18, shadowRadius: 8, zIndex: 10 },
  dragHandle: { width: 44, height: 48, borderRadius: 10, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  dragHandleDots: { color: C.brand, fontSize: 22, lineHeight: 24, textAlign: 'center' },
  orderBar: { marginHorizontal: 14, marginBottom: 8, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderHint: { flex: 1, color: C.slate, fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', lineHeight: 20 },
  orderBtn: { backgroundColor: C.brand, borderRadius: 12, minHeight:48,justifyContent:'center',paddingHorizontal: 14, paddingVertical: 9 },
  orderBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, textAlign: 'center' },
  orderBg: { flex: 1, backgroundColor: 'rgba(11,27,46,.58)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  orderCard: { width: '100%', maxWidth: 620, maxHeight: '88%', backgroundColor: C.paper, borderRadius: 23, padding: 17, overflow: 'hidden',borderWidth:1,borderColor:C.line,elevation:12,shadowColor:'#0A2530',shadowOpacity:0.18,shadowRadius:25 },
  orderHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  orderTitle: { flex: 1, color: C.ink, fontFamily: FONT.bold, fontSize: 17, textAlign: 'right', writingDirection: 'rtl' },
  orderClose: { color: C.muted, fontSize: 20, paddingHorizontal: 6 },
  orderActions: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8 },
  orderAction: { flex: 1, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 12,minHeight:48,justifyContent:'center',paddingVertical: 9, alignItems: 'center' },
  orderActionTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  orderList: { flexGrow: 0, maxHeight: 520 },
  orderFooter: { paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper },
  orderFooterHint: { textAlign: 'right', color: C.muted, fontFamily: FONT.regular, fontSize: 11, lineHeight: 20, marginBottom: 8 },
  orderDone: { minHeight: 52, borderRadius: 14, backgroundColor: C.brand, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 15 },
  orderDoneTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14, textAlign: 'center' },
  orderRow: { minHeight: 62, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 13, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 5 },
  orderIndex: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center', marginLeft: 7 },
  orderIndexTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 12 },
  orderName: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  orderNameTxt: { color: C.ink, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  moveBtn: { width: 42, height: 48, borderRadius: 9, backgroundColor: '#f5f7fa', alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  moveTxt: { color: C.brand, fontSize: 15, fontFamily: FONT.bold },
  moveDisabled: { opacity: 0.25 },
  popBg: { flex: 1, backgroundColor: 'rgba(11,27,46,.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 360 },
  popBtn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  popBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14, textAlign: 'center', writingDirection: 'rtl' },
});
