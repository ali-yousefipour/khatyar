import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { C, FONT } from './theme';
import { useAuth } from './auth';
import { request } from './api';
import { subscribeUnreadCounts, refreshUnreadCounts, unreadLabel } from './unread';

const ITEMS = [
  ['Notifications', 'اعلان‌ها', '🔔'],
  ['Messages', 'پیام‌ها', '💬'],
  ['WorkSummary', 'کارکرد من', '📊'],
  ['SalarySlips', 'فیش‌های حقوقی من', '💵'],
  ['Profile', 'حساب کاربری', '👤'],
  ['Help', 'راهنمای برنامه، ورژن و اطلاعات سازنده', '❓'],
  ['ImportTimes', 'آخرین زمان‌های به‌روزرسانی', '🕒'],
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

export default function DrawerMenuScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [access, setAccess] = React.useState(null);
  const [unread, setUnread] = React.useState({ messages: 0, reports: 0 });

  React.useEffect(() => {
    const off = subscribeUnreadCounts(setUnread);
    refreshUnreadCounts();
    return off;
  }, [user?.id]);

  React.useEffect(() => {
    let active = true;
    request('/personnel-vehicle-assets.php?op=access', { noStore: true })
      .then((result) => { if (active) setAccess(result || null); })
      .catch(() => { if (active) setAccess(null); });
    return () => { active = false; };
  }, [user?.id, user?.role]);

  const roleVehicle = roleAllowsVehicle(user?.role || user?.role_title);
  const vehicleAllowed = access?.allowed === true || roleVehicle;
  const assetType = access?.asset_type || (normRole(user?.role || user?.role_title).includes('گشت موتوری') ? 'motorcycle' : 'car');

  const go = (screen) => {
    try { navigation?.navigate?.('Main', { screen }); } catch (_) {}
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { navigation?.dispatch?.(DrawerActions.closeDrawer()); } catch (_) {}
    }));
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
        <Text style={s.brand}>خطیار</Text>
        <Text style={s.title}>منوی برنامه</Text>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {items.map(([route, title, glyph]) => (
          <TouchableOpacity key={route} style={s.item} onPress={() => { go(route); if (route === 'Messages' || route === 'InboxReports' || route === 'Notifications') refreshUnreadCounts(); }} activeOpacity={0.82}>
            <View style={s.icon}><Text style={s.iconText}>{glyph}</Text>{(route === 'Messages' && unread.messages > 0) || (route === 'InboxReports' && unread.reports > 0) ? <View style={s.menuBadge}><Text style={s.menuBadgeText}>{unreadLabel(route === 'InboxReports' ? unread.reports : unread.messages)}</Text></View> : null}</View>
            <View style={s.itemTextWrap}><Text style={s.itemText}>{title}</Text></View>
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
  page: { flex: 1, backgroundColor: C.paper, direction: 'rtl' },
  header: { backgroundColor: C.brand, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 22, alignItems: 'flex-end' },
  brand: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 25, textAlign: 'right', writingDirection: 'rtl' },
  title: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 13, textAlign: 'right', writingDirection: 'rtl', marginTop: 5 },
  content: { padding: 12, paddingBottom: 30 },
  item: { minHeight: 54, width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, marginBottom: 9, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center' },
  icon: { width: 38, height: 38, position: 'relative', borderRadius: 11, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  menuBadge: { position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, backgroundColor: '#e53935', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { color: '#fff', fontFamily: FONT.bold, fontSize: 8, lineHeight: 10, textAlign: 'center', writingDirection: 'rtl' },
  iconText: { color: C.brand, fontSize: 18, fontFamily: FONT.bold, textAlign: 'center' },
  itemTextWrap: { flex: 1, minWidth: 0, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'center' },
  itemText: { width: '100%', color: C.ink, fontFamily: FONT.bold, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  logoutItem: { marginTop: 14, borderColor: '#e3403e' },
  logoutIcon: { backgroundColor: '#fde8e7' },
  logoutText: { color: '#e3403e' },
});