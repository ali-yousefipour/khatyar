import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { openDrawer as khOpenDrawer } from '../drawerControl';
import { Alert, Animated, Image, Linking, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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

function RadioHeaderToggle({ navigation }) {
  const { enabled, busy } = useRadio();
  return <TouchableOpacity onPress={() => navigation.navigate('Radio')} style={s.headerIcon} hitSlop={6}><Text style={s.headerIconText}>{enabled ? (busy ? '📻' : '📡') : '📻̸'}</Text></TouchableOpacity>;
}

function weatherPresentation(code, isDay = true) {
  const c = Number(code);
  if (c === 0) return { icon: isDay ? '☀️' : '🌙', label: 'صاف' };
  if (c === 1) return { icon: isDay ? '🌤️' : '🌙', label: 'عمدتاً صاف' };
  if (c === 2) return { icon: '⛅', label: 'کمی ابری' };
  if (c === 3) return { icon: '☁️', label: 'ابری' };
  if (c === 45 || c === 48) return { icon: '🌫️', label: 'مه‌آلود' };
  if ([51, 53, 55, 56, 57].includes(c)) return { icon: '🌦️', label: 'نم‌نم باران' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return { icon: '🌧️', label: 'بارانی' };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { icon: '❄️', label: 'برفی' };
  if ([95, 96, 99].includes(c)) return { icon: '⛈️', label: 'رعدوبرق' };
  return { icon: '🌡️', label: 'وضعیت هوا' };
}

function RankInsignia({ count = 0 }) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  if (!n) return null;
  return <View style={s.rankInsignia} accessibilityLabel={`${n} نوار درجه`}>
    {Array.from({ length: n }).map((_, i) => <View key={i} style={s.rankBar} />)}
  </View>;
}

const MENU_TABS = [['all', 'همه'], ['general', 'عمومی'], ['field', 'عملیات میدانی'], ['work', 'اداری'], ['messages', 'ارتباطات'], ['personal', 'شخصی']];
const ICON3D = {
  search: require('../../assets/icons3d/search-taxi.png'), present: require('../../assets/icons3d/present-people.png'), sendReport: require('../../assets/icons3d/send-report-plane.png'), checkin: require('../../assets/icons3d/checkin-fingerprint.png'), requests: require('../../assets/icons3d/request-box.png'), approvals: require('../../assets/icons3d/approve-stamp.png'), performance: require('../../assets/icons3d/my-performance.png'), salary: require('../../assets/icons3d/salary-money.png'), company: require('../../assets/icons3d/company-send.png'), subscription: require('../../assets/icons3d/subscription-card.png'), sms: require('../../assets/icons3d/sms-bubble.png'), bot: require('../../assets/icons3d/bot-message.png'), sent: require('../../assets/icons3d/sent-folder.png'), forms: require('../../assets/icons3d/form-document.png'), cultural: require('../../assets/icons3d/cultural-lamp.png'), welfare: require('../../assets/icons3d/welfare-heart.png'), official: require('../../assets/icons3d/official-presence.png'), activity: require('../../assets/icons3d/activity-wave.png'), insurance: require('../../assets/icons3d/insurance-shield.png'), invalid: require('../../assets/icons3d/invalid-warning.png'), operation: require('../../assets/icons3d/operation-tools.png'), team: require('../../assets/icons3d/team-people.png'), temporary: require('../../assets/icons3d/temp-driver.png'), outage: require('../../assets/icons3d/outage-bolt.png'),
  mapPin: require('../../assets/icons3d/map-marker.png'), cityMap: require('../../assets/icons3d/city-map.png'), inventory: require('../../assets/icons3d/billing-receipt.png'), route: require('../../assets/icons3d/route-line.png'), coverage: require('../../assets/icons3d/route.png'), scoreGauge: require('../../assets/icons3d/performance-gauge.png'), badge: require('../../assets/icons3d/official-badge.png'), chart: require('../../assets/icons3d/combo-chart.png')
};
const MENU = [
  { glyph: '📻', t: 'بی‌سیم', r: 'Radio', bg: '#e8f6f0' }, { icon3d: ICON3D.search, t: 'جستجوی تاکسی و تاکسیران', r: 'Search', bg: '#e8f3ff' }, { icon3d: ICON3D.present, t: 'حاضرین در خط', r: 'PresentList', bg: '#e9f7f0' }, { icon3d: ICON3D.sendReport, t: 'ارسال گزارش', r: 'Reports', bg: '#fff3e6' }, { icon3d: ICON3D.checkin, t: 'ثبت حضور من', r: 'CheckIn', bg: '#e7f3ee' }, { icon3d: ICON3D.requests, t: 'درخواست‌ها', r: 'Requests', bg: '#eef2fb' }, { icon3d: ICON3D.approvals, t: 'تأیید درخواست‌ها', r: 'RequestInbox', bg: '#fff3e6' }, { icon3d: ICON3D.performance, t: 'کارکرد من', r: 'WorkSummary', bg: '#f0eefb' }, { icon3d: ICON3D.salary, t: 'فیش حقوقی', r: 'SalarySlips', bg: '#fff7e6' }, { icon3d: ICON3D.company, t: 'ارسال برای شرکت', r: 'CompanyRequests', bg: '#e8f7f4' }, { icon3d: ICON3D.subscription, t: 'اشتراک برنامه', r: 'Subscription', bg: '#fff4d6' }, { icon3d: ICON3D.sms, t: 'ارسال پیامک', r: 'Sms', bg: '#e7f3ee' }, { icon3d: ICON3D.bot, t: 'ارسال پیام در ربات‌ها', r: 'BotMessages', bg: '#eef7ff' }, { icon3d: ICON3D.sent, t: 'پیامک‌های ارسالی من', r: 'MySms', bg: '#eef4ff' }, { icon3d: ICON3D.forms, t: 'تکمیل فرم‌ها', r: 'Forms', bg: '#f0ecff' }, { icon3d: ICON3D.cultural, t: 'فعالیت‌های فرهنگی', r: 'Cultural', bg: '#fdeef7', needs: 'cultural' }, { icon3d: ICON3D.welfare, t: 'ثبت رفاهیات', r: 'Welfare', bg: '#fef3f8', needs: 'welfare' }, { icon3d: ICON3D.official, t: 'حضور مسئولین در خط', r: 'OfficialPresence', bg: '#eafaf3' }, { icon3d: ICON3D.inventory, t: 'اقلام تحویلی', r: 'Inventory', bg: '#f0ecff' }, { icon3d: ICON3D.route, t: 'مأموریت روزانه من', r: 'MyDailyMission', bg: '#fff4d8' }, { icon3d: ICON3D.coverage, t: 'برنامه بازدید و پوشش خط', r: 'LineVisitProgram', bg: '#e8f3ff' }, { icon3d: ICON3D.mapPin, t: 'ثبت موقعیت و تصویر خطوط', r: 'StationCapture', bg: '#e8f3ff' }, { icon3d: ICON3D.cityMap, t: 'ایستگاه‌های ثبت‌شده من', r: 'MyStations', bg: '#eafaf3' }, { icon3d: ICON3D.scoreGauge, t: 'داشبورد و امتیاز من', r: 'RoleDashboard', bg: '#eafaf3' }, { icon3d: ICON3D.badge, t: 'رتبه‌بندی و نشان‌ها', r: 'Leaderboard', bg: '#fff4d8' }, { icon3d: ICON3D.chart, t: 'پرکار/کم‌کار هر خط', r: 'ActivityReport', bg: '#eef4ff' }, { icon3d: ICON3D.insurance, t: 'بیمه و معاینه خودروها', r: 'ExpInsurance', bg: '#e9f7f0' }, { icon3d: ICON3D.invalid, t: 'افراد فاقد اعتبار', r: 'ExpTaxi', bg: '#fdeef0' }, { icon3d: ICON3D.operation, t: 'خودرو فاقد بهره‌برداری', r: 'ExpOplic', bg: '#fff7e0' }, { icon3d: ICON3D.team, t: 'زیرمجموعهٔ من', r: 'TeamReport', bg: '#f0ecff' }, { icon3d: ICON3D.temporary, t: 'رانندگان موقت خطوط ویژه', r: 'TempDrivers', bg: '#eef7ff', needs: 'temp' }, { icon3d: ICON3D.outage, t: 'اعلام قطع سیستم نوبت‌دهی', r: 'Outage', bg: '#fdeef0' }, { glyph: '🏫', t: 'سرویس مدارس', r: 'SchoolService', bg: '#eaf4ff', needs: 'schoolservice' }, { glyph: '📣', t: 'شکایات تاکسیرانان', r: 'Complaints', bg: '#fff0f2' }
];
const categoryOf = (r) => ['CheckIn', 'OfficialPresence', 'LineVisitProgram', 'StationCapture', 'MyStations', 'RoleDashboard', 'Leaderboard', 'PresentList', 'ActivityReport', 'ExpInsurance', 'ExpTaxi', 'ExpOplic'].includes(r) ? 'field' : ['Reports', 'Requests', 'RequestInbox', 'Forms', 'CompanyRequests', 'Outage'].includes(r) ? 'work' : ['Sms', 'BotMessages', 'MySms', 'Messages', 'Notifications'].includes(r) ? 'messages' : ['WorkSummary', 'SalarySlips', 'Subscription', 'Welfare', 'Cultural'].includes(r) ? 'personal' : 'general';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const welcomePlayer = useAudioPlayer(require('../../assets/sounds/welcome.mp3'));
  const { width } = useWindowDimensions();
  const cols = width >= 760 ? 4 : width >= 540 ? 3 : 2;
  const cardW = `${100 / cols - 3}%`;
  const [stats, setStats] = useState({ today: 0, checklists: 0, notices: 0, reports: 0, unread: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ messages: 0, reports: 0, total: 0 });
  const [myStats, setMyStats] = useState({ drivers: 0, vehicles: 0 });
  const [allowed, setAllowed] = useState(null);
  const [access, setAccess] = useState({ welfare: false, cultural: false, temp: false });
  const [schoolServiceAllowed, setSchoolServiceAllowed] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [myPhoto, setMyPhoto] = useState(user?.photo || null);
  const [orgContext, setOrgContext] = useState({ zoneName: '', chiefName: '' });
  const [weather, setWeather] = useState(null);
  const [menuTab, setMenuTab] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [syncDetail, setSyncDetail] = useState('');
  const [pop, setPop] = useState(null);
  const [menuOrder, setMenuOrder] = useState([]);
  const [orderModal, setOrderModal] = useState(false);
  const [dragRoute, setDragRoute] = useState(null);
  const [dragDy, setDragDy] = useState(0);
  const menuOrderRef = useRef([]);
  const dragStartIndex = useRef(-1);
  const dragCurrentIndex = useRef(-1);
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
    const loadWeather = () => {
      request('/weather.php', { auth: false, noStore: true, timeoutMs: 8000, queueIfOffline: false })
        .then((data) => {
          if (active && data?.ok && Number.isFinite(Number(data.temperature))) setWeather(data);
        })
        .catch(() => {});
    };
    loadWeather();
    const timer = setInterval(loadWeather, 30 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!user) return;
    request('/me/full-profile').then((p) => { if (p?.photo) setMyPhoto(p.photo); setOrgContext({ zoneName: String(p?.zone_name || '').trim(), chiefName: String(p?.zone_chief_inspector_name || '').trim() }); }).catch(() => {});
    const isAdmin = !!(user.is_admin || (user.level || 0) >= 3);
    request('/my/app-config').then((c) => setAccess({ welfare: isAdmin || !!c?.can_welfare, cultural: isAdmin || !!c?.can_cultural, temp: isAdmin || !!c?.can_manage_temp_drivers })).catch(() => setAccess({ welfare: isAdmin, cultural: isAdmin, temp: isAdmin }));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    request('/school-service/access', { noStore: true }).then((r) => setSchoolServiceAllowed(r?.allowed === true)).catch(() => setSchoolServiceAllowed(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    request('/my/device-info', { method: 'POST', body: { device_model: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Device.deviceName || '', android_version: Platform.OS === 'android' ? `Android ${Device.osVersion || ''}` : Device.osVersion || '', app_version: require('expo-constants').default?.expoConfig?.version || '' } }).catch(() => {});
  }, [user?.id]);

  const load = () => { swr('/my/dashboard', setStats); swr('/my/stats', setMyStats); swr('/my/app-items', (r) => setAllowed(Array.isArray(r?.items) ? r.items : null)); };

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
      .then(() => AsyncStorage.setItem(orderKey, JSON.stringify(normalized)).catch(() => {}));
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
    setDragDy(0);
    setDragRoute(route);
  };
  const updateMenuDrag = (route, dy) => {
    if (dragRoute !== route) return;
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
    if (!dragRoute) return;
    const finalOrder = menuOrderRef.current.length ? [...menuOrderRef.current] : MENU.map((m) => m.r);
    setDragRoute(null);
    setDragDy(0);
    dragStartIndex.current = -1;
    dragCurrentIndex.current = -1;
    persistMenuOrder(finalOrder, true);
  };
  const cancelMenuDrag = () => {
    setDragRoute(null);
    setDragDy(0);
    dragStartIndex.current = -1;
    dragCurrentIndex.current = -1;
  };
  const dragResponder = (route) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
    onPanResponderGrant: () => beginMenuDrag(route),
    onPanResponderMove: (_, g) => updateMenuDrag(route, g.dy),
    onPanResponderRelease: finishMenuDrag,
    onPanResponderTerminate: cancelMenuDrag,
    onPanResponderTerminationRequest: () => false,
  });
  const moveMenuItem = (route, direction) => {
    const list = menuOrder.length ? [...menuOrder] : MENU.map((m) => m.r);
    const i = list.indexOf(route), j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    persistMenuOrder(list);
  };
  const orderedMenu = (menuOrder.length ? menuOrder : MENU.map((m) => m.r)).map((r) => MENU.find((m) => m.r === r)).filter(Boolean);
  useEffect(() => { flushQueuedRequests(); registerPush(); load(); const unsub = navigation.addListener('focus', load); return unsub; }, [navigation]);

  const manualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try { setSyncDetail('پاک‌سازی کش و ارسال داده‌های آفلاین…'); const keys = await AsyncStorage.getAllKeys(); const cacheKeys = keys.filter((k) => String(k).startsWith('cache:')); if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys); const n = await flushQueuedRequests().catch(() => 0); load(); Alert.alert('بروزرسانی شد', n > 0 ? `${n} مورد آفلاین ارسال شد.` : 'کش و اطلاعات برنامه بروزرسانی شد.'); } catch (e) { Alert.alert('خطا', 'بروزرسانی کش و اطلاعات ناموفق بود.'); } finally { setSyncDetail(''); setSyncing(false); }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, headerBackVisible: false, headerLeft: () => <View style={s.headerBar}><View style={s.headerActions}><TouchableOpacity onPress={manualSync} disabled={syncing} style={s.headerIcon} hitSlop={8}><Text style={s.headerIconText}>{syncing ? '⏳' : '↻'}</Text></TouchableOpacity>{(allowed === null || allowed.includes('Radio')) && <RadioHeaderToggle navigation={navigation} />}<TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={s.headerIcon} hitSlop={8}><View style={s.bellWrap}><Text style={s.headerIconText}>🔔</Text>{stats.unread > 0 ? <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{stats.unread > 99 ? '+۹۹' : faNum(Number(stats.unread))}</Text></View> : null}</View></TouchableOpacity><TouchableOpacity onPress={() => { navigation.navigate('InboxReports'); refreshUnreadCounts(); }} style={s.headerIcon} hitSlop={8}><View style={s.bellWrap}><Text style={s.headerIconText}>📥</Text>{unreadCounts.reports > 0 ? <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{unreadLabel(unreadCounts.reports)}</Text></View> : null}</View></TouchableOpacity><TouchableOpacity onPress={() => { navigation.navigate('Messages'); refreshUnreadCounts(); }} style={s.headerIcon} hitSlop={8}><View style={s.bellWrap}><Text style={s.headerIconText}>💬</Text>{unreadCounts.messages > 0 ? <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{unreadLabel(unreadCounts.messages)}</Text></View> : null}</View></TouchableOpacity></View><TouchableOpacity onPress={() => khOpenDrawer()} style={s.headerMenuButton} hitSlop={8}><Text style={s.headerMenuText}>☰</Text></TouchableOpacity></View>, headerRight: undefined });
  }, [navigation, stats.unread, syncing]);

  const canShow = (m) => { if (m.r === 'Complaints') return true; if (m.r === 'Help') return false; if (m.needs === 'schoolservice') return schoolServiceAllowed; if (m.needs && !access[m.needs]) return false; if (allowed === null) return true; if (m.r === 'StationCapture' || m.r === 'MyStations') return ['StationCapture', 'MyStations', 'LineLocation'].some((k) => allowed.includes(k)); return allowed.includes(m.r); };
  const visibleMenu = orderedMenu.filter((m) => (m.r !== 'Sms' && m.r !== 'MySms' && m.r !== 'BotMessages') || !!user?.can_send_sms || m.r === 'BotMessages').filter(canShow).filter((m) => menuTab === 'all' || categoryOf(m.r) === menuTab).filter((m) => { const q = String(menuSearch || '').trim().toLocaleLowerCase(); return !q || String(m.t || '').toLocaleLowerCase().includes(q); });
  const KPIS = [['رانندگان خطوط شما', myStats.drivers], ['خودروهای خطوط شما', myStats.vehicles], ['حضور امروز', stats.today], ['چک‌لیست این ماه', stats.checklists]];

  return <ScrollView persistentScrollbar={true} style={s.page} contentContainerStyle={s.pageContent}><View style={s.rtlRoot}>{syncing && syncDetail ? <View style={s.syncBanner}><Text style={s.syncText}>{syncDetail}</Text></View> : null}<View style={s.top}><View style={s.topInfo}><View style={s.topSummaryRow}><View style={s.topIdentity}><Text style={s.hi}>روز بخیر،</Text><View style={s.nameRow}>{rankCount > 0 ? <RankInsignia count={rankCount} /> : null}<Text style={s.nm}>{user?.name || '—'}</Text></View>{user?.role ? <View style={s.roleChip}><Text style={s.roleTxt}>{user.role}</Text></View> : null}{orgContext.zoneName ? <Text style={s.orgTxt}>منطقه: {orgContext.zoneName}</Text> : null}{orgContext.chiefName ? <Text style={s.orgTxt}>سربازرس منطقه شما جناب آقای: {orgContext.chiefName}</Text> : null}</View><View style={s.weatherBox}><Text style={s.todayTxt} numberOfLines={2}>{todayFaLong()}</Text>{weather ? <><View style={s.weatherNow}><Text style={s.weatherIcon}>{weatherPresentation(weather.weather_code, Number(weather.is_day) !== 0).icon}</Text><Text style={s.weatherTemp}>{faNum(Math.round(Number(weather.temperature)))}°</Text></View><Text style={s.weatherLabel} numberOfLines={1}>{weatherPresentation(weather.weather_code, Number(weather.is_day) !== 0).label}</Text><Text style={s.weatherCity}>مشهد</Text><Text style={s.weatherSource} onPress={() => Linking.openURL('https://open-meteo.com/').catch(() => {})}>Open-Meteo</Text></> : <Text style={s.weatherUnavailable}>آب‌وهوا ناموجود</Text>}</View></View></View>{myPhoto ? <Image source={imageSource(myPhoto)} style={s.avatar} /> : <View style={s.avatarPh}><Text style={s.avatarTxt}>{(user?.name || '؟')[0]}</Text></View>}</View><View style={s.kpis}>{KPIS.map(([l, n], i) => <View style={[s.kpi, { width: cardW }]} key={i}><Text style={s.kpiN}>{faNum(Number(n))}</Text><Text style={s.kpiL}>{l}</Text></View>)}</View><Text style={s.sectionTitle}>دسترسی سریع</Text><TextInput value={menuSearch} onChangeText={setMenuSearch} placeholder="جستجو در آیتم‌های داشبورد" placeholderTextColor={C.muted} style={s.menuSearch} returnKeyType="search"/><View style={s.orderBar}><Text style={s.orderHint}>ترتیب آیتم‌ها برای حساب کاربری شما ذخیره می‌شود.</Text><TouchableOpacity style={s.orderBtn} onPress={() => setOrderModal(true)}><Text style={s.orderBtnTxt}>☷ تنظیم ترتیب</Text></TouchableOpacity></View><ScrollView persistentScrollbar={true} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.menuTabs}>{MENU_TABS.map(([k, l]) => <TouchableOpacity key={k} style={[s.menuTab, menuTab === k && s.menuTabOn]} onPress={() => setMenuTab(k)}><Text style={[s.menuTabTxt, menuTab === k && s.menuTabTxtOn]}>{l}</Text></TouchableOpacity>)}</ScrollView><View style={s.grid}>{visibleMenu.map((m) => <TouchableOpacity key={m.r} style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate(m.r)}><View style={[s.iconWrap, { backgroundColor: m.bg }]}>{m.glyph ? <Text style={s.glyph}>{m.glyph}</Text> : <Image source={m.icon3d} style={s.icon3d} resizeMode="contain" />}</View><View style={s.cardTxtWrap}><Text style={s.cardTxt} numberOfLines={2}>{m.t}</Text></View></TouchableOpacity>)}</View><Modal visible={orderModal} transparent animationType="slide" onRequestClose={() => setOrderModal(false)}><View style={s.orderBg}><View style={s.orderCard}><View style={s.orderHead}><Text style={s.orderTitle}>مرتب‌سازی داشبورد</Text><TouchableOpacity onPress={() => setOrderModal(false)}><Text style={s.orderClose}>✕</Text></TouchableOpacity></View><View style={s.orderActions}><TouchableOpacity style={s.orderAction} onPress={sortMenuOrder}><Text style={s.orderActionTxt}>مرتب‌سازی الفبایی</Text></TouchableOpacity><TouchableOpacity style={s.orderAction} onPress={resetMenuOrder}><Text style={s.orderActionTxt}>بازگردانی ترتیب پیش‌فرض</Text></TouchableOpacity></View><ScrollView style={s.orderList} contentContainerStyle={s.orderListContent} showsVerticalScrollIndicator={false}>{(menuOrder.length ? menuOrder : MENU.map((m) => m.r)).map((route, i, arr) => { const m = MENU.find((x) => x.r === route); if (!m) return null; const dragging = dragRoute === route; const responder = dragResponder(route); return <Animated.View key={route} style={[s.orderRow, dragging && s.orderRowDragging, dragging && { transform: [{ translateY: dragDy }] }]}><View style={s.orderIndex}><Text style={s.orderIndexTxt}>{faNum(i + 1)}</Text></View><View style={s.orderName}><Text style={s.orderNameTxt} numberOfLines={1}>{m.t}</Text></View><View style={s.dragHandle} {...responder.panHandlers} accessibilityRole="button" accessibilityLabel="جابجایی آیتم"><Text style={s.dragHandleDots}>☷</Text></View><TouchableOpacity style={s.moveBtn} disabled={i === 0} onPress={() => moveMenuItem(route, -1)} accessibilityLabel="انتقال به بالا"><Text style={[s.moveTxt, i === 0 && s.moveDisabled]}>▲</Text></TouchableOpacity><TouchableOpacity style={s.moveBtn} disabled={i === arr.length - 1} onPress={() => moveMenuItem(route, 1)} accessibilityLabel="انتقال به پایین"><Text style={[s.moveTxt, i === arr.length - 1 && s.moveDisabled]}>▼</Text></TouchableOpacity></Animated.View>; })}</ScrollView><TouchableOpacity style={s.orderDone} onPress={() => setOrderModal(false)}><Text style={s.orderDoneTxt}>ذخیره و بستن</Text></TouchableOpacity></View></View></Modal><Modal visible={!!pop} transparent animationType="fade" onRequestClose={() => setPop(null)}><TouchableOpacity style={s.popBg} activeOpacity={1} onPress={() => setPop(null)}><View style={s.popCard}><TouchableOpacity style={s.popBtn} onPress={() => setPop(null)}><Text style={s.popBtnTxt}>بستن</Text></TouchableOpacity></View></TouchableOpacity></Modal></View></ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper},
  pageContent: { paddingBottom: 24},
  rtlRoot: { width: '100%', alignSelf: 'stretch'},
  syncBanner: { backgroundColor: '#1b3a6b', padding: 10, alignItems: 'stretch' },
  syncText: { color: '#fff', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  headerBar: { height: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: 250 },
  headerActions: { height: 44, flexDirection: 'row-reverse', alignItems: 'center' },
  headerIcon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { color: '#fff', fontSize: 18, textAlign: 'center', writingDirection: 'ltr' },
  headerMenuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerMenuText: { color: '#fff', fontSize: 24, textAlign: 'center', writingDirection: 'ltr' },
  bellWrap: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  unreadBadge: { position: 'absolute', top: -2, right: -3, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#e53935', borderWidth: 2, borderColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: '#fff', fontFamily: FONT.bold, fontSize: 8, lineHeight: 10, textAlign: 'center', writingDirection: 'rtl' },
  top: { backgroundColor: C.brand, padding: 20, paddingTop: 28, paddingBottom: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, flexDirection: 'row-reverse', alignItems: 'center' },
  topInfo: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  topSummaryRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'flex-start' },
  topIdentity: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  hi: { width: '100%', color: '#fff', opacity: 0.85, fontFamily: FONT.regular, textAlign: 'right', writingDirection: 'rtl', fontSize: 13 },
  nameRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' },
  nm: { flex: 1, color: '#fff', fontFamily: FONT.bold, fontSize: 19, textAlign: 'right', writingDirection: 'rtl' },
  rankInsignia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4, marginLeft: 8, height: 20 },
  rankBar: { width: 3, height: 17, borderRadius: 1.5, backgroundColor: '#ffd24a' },
  todayTxt: { width: '100%', color: '#fff', opacity: 0.92, fontFamily: FONT.regular, fontSize: 10, lineHeight: 16, textAlign: 'center', writingDirection: 'rtl', marginBottom: 3 },
  weatherBox: { width: 104, flexShrink: 0, alignItems: 'center', justifyContent: 'flex-start', paddingRight: 7, marginRight: 7, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,.25)', minHeight: 90 },
  weatherNow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 },
  weatherIcon: { fontSize: 21 },
  weatherTemp: { color: '#fff', fontFamily: FONT.bold, fontSize: 21, writingDirection: 'rtl' },
  weatherLabel: { width: '100%', color: '#fff', fontFamily: FONT.regular, fontSize: 10, textAlign: 'center', writingDirection: 'rtl', marginTop: 1 },
  weatherCity: { color: '#fff', opacity: 0.9, fontFamily: FONT.regular, fontSize: 10, marginTop: 1 },
  weatherSource: { color: '#fff', opacity: 0.72, textDecorationLine: 'underline', fontFamily: FONT.regular, fontSize: 8, marginTop: 2 },
  weatherUnavailable: { color: '#fff', opacity: 0.75, fontFamily: FONT.regular, fontSize: 9, textAlign: 'center', writingDirection: 'rtl', marginTop: 6 },
  avatar: { width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: 'rgba(255,255,255,.6)', marginLeft: 12 },
  avatarPh: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  avatarTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 28, textAlign: 'center', writingDirection: 'rtl' },
  roleChip: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,255,255,.18)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10, marginTop: 8 },
  roleTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  orgTxt: { width: '100%', color: '#fff', fontFamily: FONT.regular, fontSize: 12, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 14, justifyContent: 'space-between' },
  kpi: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, minHeight: 78, justifyContent: 'center' },
  kpiN: { fontFamily: FONT.bold, fontSize: 22, color: C.brand, textAlign: 'right', writingDirection: 'rtl' },
  kpiL: { fontFamily: FONT.regular, fontSize: 12, color: C.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  sectionTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', writingDirection: 'rtl', marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  menuSearch: { marginHorizontal: 14, marginBottom: 10, minHeight: 46, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, fontFamily: FONT.regular, fontSize: 13, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  menuTabs: { paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row-reverse' },
  menuTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, marginLeft: 4, marginRight: 4 },
  menuTabOn: { backgroundColor: C.brand, borderColor: C.brand },
  menuTabTxt: { fontFamily: FONT.bold, color: C.muted, fontSize: 12, textAlign: 'center', writingDirection: 'rtl' },
  menuTabTxtOn: { color: '#fff' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 12, justifyContent: 'flex-start', gap: 10 },
  card: { width: '31%', backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'flex-start', marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon3d: { width: 26, height: 26 },
  glyph: { fontSize: 22, textAlign: 'center', writingDirection: 'ltr' },
  cardTxtWrap: { width: '100%', alignItems: 'center', justifyContent: 'flex-start', minHeight: 32 },
  cardTxt: { width: '100%', fontFamily: FONT.bold, color: C.ink, textAlign: 'center', writingDirection: 'rtl', fontSize: 11, lineHeight: 15 },
  orderListContent: { paddingBottom: 4 },
  orderRowDragging: { opacity: 0.92, elevation: 8, shadowOpacity: 0.18, shadowRadius: 8, zIndex: 10 },
  dragHandle: { width: 38, height: 42, borderRadius: 10, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  dragHandleDots: { color: C.brand, fontSize: 22, lineHeight: 24, textAlign: 'center' },
  orderBar: { marginHorizontal: 14, marginBottom: 8, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderHint: { flex: 1, color: C.muted, fontFamily: FONT.regular, fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  orderBtn: { backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  orderBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  orderBg: { flex: 1, backgroundColor: 'rgba(11,27,46,.58)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  orderCard: { width: '100%', maxWidth: 620, maxHeight: '88%', backgroundColor: C.paper, borderRadius: 22, padding: 14, overflow: 'hidden' },
  orderHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  orderTitle: { flex: 1, color: C.ink, fontFamily: FONT.bold, fontSize: 17, textAlign: 'right', writingDirection: 'rtl' },
  orderClose: { color: C.muted, fontSize: 20, paddingHorizontal: 6 },
  orderActions: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8 },
  orderAction: { flex: 1, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  orderActionTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  orderList: { flexGrow: 0, maxHeight: 520 },
  orderRow: { minHeight: 56, marginBottom: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 13, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 7 },
  orderIndex: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center', marginLeft: 7 },
  orderIndexTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 12 },
  orderName: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  orderNameTxt: { color: C.ink, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  moveBtn: { width: 34, height: 38, borderRadius: 9, backgroundColor: '#f5f7fa', alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  moveTxt: { color: C.brand, fontSize: 15, fontFamily: FONT.bold },
  moveDisabled: { opacity: 0.25 },
  popBg: { flex: 1, backgroundColor: 'rgba(11,27,46,.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 360 },
  popBtn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  popBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14, textAlign: 'center', writingDirection: 'rtl' },
});