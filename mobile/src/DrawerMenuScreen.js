import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { C, FONT } from './theme';
import { useAuth } from './auth';
import { request, flushQueuedRequests } from './api';
import { pending as pendingOfflineQueue } from './offline';
import { subscribeUnreadCounts, refreshUnreadCounts, unreadLabel } from './unread';

const ITEMS = [
  ['Notifications', 'اعلان‌ها', '🔔'],
  ['Messages', 'پیام‌ها', '💬'],
  ['WorkSummary', 'کارکرد من', '📊'],
  ['Profile', 'حساب کاربری', '👤'],
  ['Settings', 'تنظیمات', '⚙️'],
  ['Help', 'راهنمای برنامه، ورژن و اطلاعات سازنده', '❓'],
];

function normRole(value) {
  return String(value || '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function roleAllowsVehicle(role) {
  const r = normRole(role);
  return r.includes('گشت خودرویی') || r.includes('گشت موتوری') || r.includes('سربازرس');
}

function isUserQueueItem(item) {
  const p = String(item?.path || '').toLowerCase();
  const b = item?.body || item?.fields || {};
  if (/location|locations|background|gps|geolocation|tracking|position/.test(p)) return false;
  if (/activity\/telemetry/.test(p) && /gps|location|tracking|position/.test(String(b?.kind || '').toLowerCase())) return false;
  return /school-service|school.*inspection|inspection.*school|checkin|checkout|attendance|presence|checklist|report|notice|warning|tazkor|تذکر/.test(p);
}

export default function DrawerMenuScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [access, setAccess] = React.useState(null);
  const [schoolServiceAllowed, setSchoolServiceAllowed] = React.useState(false);
  const [unread, setUnread] = React.useState({ messages: 0, reports: 0 });
  const [queueCount, setQueueCount] = React.useState(0);

  React.useEffect(() => {
    const off = subscribeUnreadCounts(setUnread);
    refreshUnreadCounts();
    return off;
  }, [user?.id]);

  React.useEffect(() => {
    let active = true;
    Promise.allSettled([
      request('/personnel-vehicle-assets.php?op=access', { noStore: true }),
      request('/school-service/access', { noStore: true }).catch(() => request('/school-service/access')),
      
    ]).then(([vehicleResult, schoolResult]) => {
      if (!active) return;
      setAccess(vehicleResult.status === 'fulfilled' ? (vehicleResult.value || null) : null);
      setSchoolServiceAllowed(
        schoolResult.status === 'fulfilled' &&
        (schoolResult.value?.allowed === true || schoolResult.value?.can_view === true)
      );
    });
    return () => { active = false; };
  }, [user?.id, user?.role]);

  const roleVehicle = roleAllowsVehicle(user?.role || user?.role_title);
  const vehicleAllowed = access?.allowed === true || roleVehicle;
  const roleTitle = normRole(user?.role_title || user?.role);
  const assetType = access?.asset_type || (roleTitle.includes('گشت موتوری') ? 'motorcycle' : 'car');

  const go = (screen) => {
    try { navigation?.navigate?.('Main', { screen }); } catch (_) {}
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { navigation?.dispatch?.(DrawerActions.closeDrawer()); } catch (_) {}
    }));
  };

  const refreshQueueCount = React.useCallback(async () => {
    try {
      const q = await pendingOfflineQueue();
      setQueueCount(q.filter(isUserQueueItem).length);
    } catch (_) {
      setQueueCount(0);
    }
  }, []);

  React.useEffect(() => {
    refreshQueueCount();
    const timer = setInterval(refreshQueueCount, 4000);
    return () => clearInterval(timer);
  }, [refreshQueueCount]);

  const onQueue = async () => {
    await refreshQueueCount();
    try { navigation?.navigate?.('Main', { screen: 'SendQueue' }); } catch (_) {}
    requestAnimationFrame(() => requestAnimationFrame(() => { try { navigation?.dispatch?.(DrawerActions.closeDrawer()); } catch (_) {} }));
  };

  const onLogout = () => {
    Alert.alert('خروج از حساب', 'آیا مطمئن هستید می‌خواهید از حساب کاربری خارج شوید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
        try { navigation?.dispatch?.(DrawerActions.closeDrawer()); } catch (_) {}
        try { await logout(); } catch (e) { Alert.alert('خروج ممکن نیست', e.message || 'خطا'); }
      } },
    ]);
  };

  const items = [
    ...ITEMS,
    ...(schoolServiceAllowed ? [['SchoolService', 'سرویس مدارس', '🏫']] : []),
    ['SendQueue', 'صف ارسال' + (queueCount ? ` (${queueCount})` : ''), '📤'],
    ['InboxReports', 'گزارشات دریافتی', '📥'],
    ...(vehicleAllowed ? [[
      'PersonnelVehicleAsset',
      assetType === 'motorcycle' ? 'ویرایش اطلاعات موتورسیکلت' : 'ویرایش اطلاعات خودرو',
      assetType === 'motorcycle' ? '🏍️' : '🚗',
    ]] : []),
    ...(access?.checklist_allowed ? [['PersonnelVehicleChecklist', 'چک‌لیست خودرویی و موتوری', '☑️']] : []),
  ];

  return (
    <View style={s.page}>
      <View style={s.header}>
        <View style={s.brandRow}><View style={s.brandMark}><Text style={s.brandMarkText}>🚕</Text></View><View style={s.brandTextWrap}><Text style={s.brand}>خطیار</Text><Text style={s.title}>منوی برنامه</Text></View></View>
        <View style={s.profileRow}><View style={s.profileAvatar}><Text style={s.profileInitial}>{String(user?.name || "؟").trim().charAt(0) || "؟"}</Text></View><View style={s.profileTextWrap}><Text style={s.profileName} numberOfLines={1}>{user?.name || "کاربر خطیار"}</Text><Text style={s.profileRole} numberOfLines={1}>{user?.role_title || user?.role || "حساب کاربری"}</Text></View></View>
      </View>
      <ScrollView persistentScrollbar={true} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {items.map(([route, title, glyph]) => (
          <TouchableOpacity key={route} style={s.item} onPress={() => { if (route === 'SendQueue') return onQueue(); go(route); if (route === 'Messages' || route === 'InboxReports' || route === 'Notifications') refreshUnreadCounts(); }} activeOpacity={0.82} accessibilityRole="button">
            <View style={s.icon}><Text style={s.iconText}>{glyph}</Text>{(route === 'Messages' && unread.messages > 0) || (route === 'InboxReports' && unread.reports > 0) ? <View style={s.menuBadge}><Text style={s.menuBadgeText}>{unreadLabel(route === 'InboxReports' ? unread.reports : unread.messages)}</Text></View> : null}</View>
            <View style={s.itemTextWrap}><Text style={s.itemText}>{title}</Text></View><Text style={s.itemChevron}>‹</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.item, s.logoutItem]} onPress={onLogout} activeOpacity={0.82}>
          <View style={[s.icon, s.logoutIcon]}><Text style={s.iconText}>🚪</Text></View>
          <View style={s.itemTextWrap}><Text style={[s.itemText, s.logoutText]}>خروج از حساب</Text></View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper},
  header: { backgroundColor: C.brand2, paddingTop: 48, paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 24, shadowColor: '#062f26', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  brandRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center' },
  brandMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  brandMarkText: { fontSize: 23, textAlign: 'center', writingDirection: 'ltr' },
  brandTextWrap: { flex: 1, alignItems: 'flex-end' },
  brand: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 24, textAlign: 'right', writingDirection: 'rtl' },
  title: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  profileRow: { width: '100%', minHeight: 56, backgroundColor: 'rgba(255,255,255,.11)', borderRadius: 16, padding: 9, marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center' },
  profileAvatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.taxi, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  profileInitial: { color: C.brand2, fontFamily: FONT.bold, fontSize: 18, textAlign: 'center' },
  profileTextWrap: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  profileName: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  profileRole: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 10, textAlign: 'right', writingDirection: 'rtl', marginTop: 3 },
  content: { padding: 14, paddingBottom: 30 },
  item: { minHeight: 66, width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 18, marginBottom: 10, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', shadowColor: '#17352f', shadowOpacity: 0.035, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  icon: { width: 42, height: 42, position: 'relative', borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  menuBadge: { position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, backgroundColor: '#e53935', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { color: '#fff', fontFamily: FONT.bold, fontSize: 8, lineHeight: 10, textAlign: 'center', writingDirection: 'rtl' },
  iconText: { color: C.brand, fontSize: 18, fontFamily: FONT.bold, textAlign: 'center' },
  itemTextWrap: { flex: 1, minWidth: 0, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'center' },
  itemText: { width: '100%', color: C.ink, fontFamily: FONT.bold, fontSize: 14, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  itemChevron: { color: C.muted, fontFamily: FONT.bold, fontSize: 22, marginRight: 8 },
  logoutItem: { marginTop: 14, borderColor: '#e3403e' },
  logoutIcon: { backgroundColor: '#fde8e7' },
  logoutText: { color: '#e3403e' },
});