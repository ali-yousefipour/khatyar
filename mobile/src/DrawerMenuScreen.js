import React from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { C, FONT } from './theme';
import { useAuth } from './auth';
import { request, uploadFile, flushQueuedRequests, imageSource } from './api';
import { pending as pendingOfflineQueue } from './offline';
import { subscribeUnreadCounts, refreshUnreadCounts, unreadLabel } from './unread';
import { readAccessCache, refreshAccessCache, hasAppItem } from './accessCache';

const ITEMS = [
  ['Notifications', 'اعلان‌ها', 'bell-outline'],
  ['Messages', 'پیام‌ها', 'message-text-outline'],
  ['WorkSummary', 'کارکرد من', 'chart-timeline-variant'],
  ['Profile', 'حساب کاربری', 'account-circle-outline'],
  ['Settings', 'تنظیمات', 'cog-outline'],
  ['Help', 'راهنمای برنامه، ورژن و اطلاعات سازنده', 'help-circle-outline'],
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
  const { user, logout, refreshUser } = useAuth();
  const [photo, setPhoto] = React.useState(user?.photo || null);
  const [photoOpen, setPhotoOpen] = React.useState(false);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [access, setAccess] = React.useState(null);
  const [schoolServiceAllowed, setSchoolServiceAllowed] = React.useState(false);
  const [unread, setUnread] = React.useState({ messages: 0, reports: 0 });
  const [queueCount, setQueueCount] = React.useState(0);
  const [roleAppAccess, setRoleAppAccess] = React.useState(null);
  React.useEffect(() => { let active = true; readAccessCache().then(v => { if(active) setRoleAppAccess(v); }).catch(() => {}); refreshAccessCache().then(v => { if(active) setRoleAppAccess(v); }).catch(() => {}); return () => { active = false; }; }, [user?.id, user?.role_id]);

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

  React.useEffect(() => { setPhoto(user?.photo || null); }, [user?.photo]);

  const changePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('دسترسی به تصاویر', 'برای انتخاب عکس پروفایل، دسترسی به تصاویر را فعال کنید.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.86 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPhotoBusy(true);
      const uploaded = await uploadFile('/me/photo', {}, 'photo', asset.uri, asset.fileName || 'profile.jpg', asset.mimeType || 'image/jpeg', { queueIfOffline: false });
      if (!uploaded?.ok && !uploaded?.path) throw new Error('سرور عکس را ذخیره نکرد.');
      const profile = await request('/me/full-profile', { noStore: true });
      if (profile?.photo) setPhoto(profile.photo);
      await refreshUser?.();
      Alert.alert('عکس به‌روز شد', 'تصویر حساب کاربری با موفقیت تغییر کرد.');
    } catch (error) {
      Alert.alert('تغییر عکس ناموفق بود', error?.message || 'لطفاً دوباره تلاش کنید.');
    } finally { setPhotoBusy(false); }
  };

  const savePhoto = async () => {
    if (!photo || photoBusy) return;
    setPhotoBusy(true);
    try {
      const source = imageSource(photo);
      const uri = typeof source === 'object' ? source.uri : source;
      if (!uri) throw new Error('آدرس عکس در دسترس نیست.');
      let localUri = uri;
      if (/^https?:\/\//i.test(uri)) {
        const ext = /\.png(?:[?#]|$)/i.test(uri) ? 'png' : 'jpg';
        localUri = `${FileSystem.cacheDirectory}khatyar-profile-${Date.now()}.${ext}`;
        const headers = typeof source === 'object' ? source.headers : undefined;
        const result = await FileSystem.downloadAsync(uri, localUri, headers ? { headers } : undefined);
        localUri = result.uri;
      } else if (uri.startsWith('data:image/')) {
        const match = uri.match(/^data:image\/[^;]+;base64,(.+)$/i);
        if (!match) throw new Error('قالب عکس پشتیبانی نمی‌شود.');
        localUri = `${FileSystem.cacheDirectory}khatyar-profile-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(localUri, match[1], { encoding: FileSystem.EncodingType.Base64 });
      }
      if (Platform.OS === 'android') {
        const access = FileSystem.StorageAccessFramework;
        const permission = await access.requestDirectoryPermissionsAsync(access.getUriForDirectoryInRoot('Download'));
        if (!permission.granted) return;
        const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
        const savedUri = await access.createFileAsync(permission.directoryUri, `khatyar-profile-${Date.now()}.jpg`, 'image/jpeg');
        await FileSystem.writeAsStringAsync(savedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('ذخیره شد', 'عکس در پوشه‌ای که انتخاب کردید ذخیره شد.');
      } else {
        await Sharing.shareAsync(localUri, { mimeType: 'image/jpeg', dialogTitle: 'ذخیره یا اشتراک عکس کاربر' });
      }
    } catch (error) {
      Alert.alert('ذخیره عکس ناموفق بود', error?.message || 'دسترسی گالری را بررسی کنید.');
    } finally { setPhotoBusy(false); }
  };

  const items = [
    ...ITEMS,
    ...(schoolServiceAllowed ? [['SchoolService', 'سرویس مدارس', 'school-outline']] : []),
    ['SendQueue', 'صف ارسال' + (queueCount ? ` (${queueCount})` : ''), 'cloud-upload-outline'],
    ['InboxReports', 'گزارشات دریافتی', 'inbox-arrow-down-outline'],
    ...(vehicleAllowed ? [[
      'PersonnelVehicleAsset',
      assetType === 'motorcycle' ? 'ویرایش اطلاعات موتورسیکلت' : 'ویرایش اطلاعات خودرو',
      assetType === 'motorcycle' ? 'motorbike' : 'car-outline',
    ]] : []),
    ...(access?.checklist_allowed ? [['PersonnelVehicleChecklist', 'چک‌لیست خودرویی و موتوری', 'clipboard-check-outline']] : []),
  ].filter(([route]) => !roleAppAccess?.appItems || hasAppItem(roleAppAccess, route));

  return (
    <View style={s.page}>
      <View style={s.header}>
        <View style={s.brandRow}><View style={s.brandMark}><Image source={require('../assets/icon.png')} style={s.brandLogo} resizeMode="contain" /></View><View style={s.brandTextWrap}><Text style={s.brand}>خطیار</Text><Text style={s.title}>منوی برنامه</Text></View></View>
        <View style={s.profileRow}><TouchableOpacity onPress={() => setPhotoOpen(true)} activeOpacity={0.8} accessibilityRole="imagebutton" accessibilityLabel="نمایش تمام‌صفحه و مدیریت عکس کاربر"><View style={s.profileAvatar}>{photo ? <Image source={imageSource(photo)} style={s.profileImage} /> : <Text style={s.profileInitial}>{String(user?.name || "؟").trim().charAt(0) || "؟"}</Text>}</View></TouchableOpacity><View style={s.profileTextWrap}><Text style={s.profileName} numberOfLines={1}>{user?.name || "کاربر خطیار"}</Text><Text style={s.profileRole} numberOfLines={1}>{user?.role_title || user?.role || "حساب کاربری"}</Text></View></View>
      </View>
      <ScrollView persistentScrollbar={true} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {items.map(([route, title, glyph]) => (
          <TouchableOpacity key={route} style={s.item} onPress={() => { if (route === 'SendQueue') return onQueue(); go(route); if (route === 'Messages' || route === 'InboxReports' || route === 'Notifications') refreshUnreadCounts(); }} activeOpacity={0.82} accessibilityRole="button">
            <View style={s.icon}><MaterialCommunityIcons name={glyph} size={23} color={C.brand} />{(route === 'Messages' && unread.messages > 0) || (route === 'InboxReports' && unread.reports > 0) ? <View style={s.menuBadge}><Text style={s.menuBadgeText}>{unreadLabel(route === 'InboxReports' ? unread.reports : unread.messages)}</Text></View> : null}</View>
            <View style={s.itemTextWrap}><Text style={s.itemText}>{title}</Text></View><MaterialCommunityIcons name="chevron-left" size={22} color={C.muted} style={s.itemChevron} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.item, s.logoutItem]} onPress={onLogout} activeOpacity={0.82}>
          <View style={[s.icon, s.logoutIcon]}><MaterialCommunityIcons name="logout" size={23} color="#c03935" /></View>
          <View style={s.itemTextWrap}><Text style={[s.itemText, s.logoutText]}>خروج از حساب</Text></View>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <View style={s.photoModal}>
          <TouchableOpacity style={s.photoClose} onPress={() => setPhotoOpen(false)} accessibilityLabel="بستن تصویر"><Text style={s.photoCloseText}>×</Text></TouchableOpacity>
          {photo ? <Image source={imageSource(photo)} style={s.photoFull} resizeMode="contain" /> : <View style={s.photoEmpty}><Text style={s.photoInitial}>{String(user?.name || '؟').trim().charAt(0) || '؟'}</Text><Text style={s.photoEmptyText}>برای این حساب عکسی ثبت نشده است.</Text></View>}
          <View style={s.photoActions}>
            <TouchableOpacity style={s.photoAction} onPress={changePhoto} disabled={photoBusy}><Text style={s.photoActionText}>{photoBusy ? 'در حال انجام…' : 'تغییر عکس'}</Text></TouchableOpacity>
            {photo ? <TouchableOpacity style={s.photoAction} onPress={savePhoto} disabled={photoBusy}><Text style={s.photoActionText}>ذخیره در گالری</Text></TouchableOpacity> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper},
  header: { backgroundColor: C.brand2, paddingTop: 48, paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 24, shadowColor: '#062f26', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  brandRow: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center' },
  brandMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  brandLogo: { width: 36, height: 36, borderRadius: 10 },
  brandMarkText: { fontSize: 23, textAlign: 'center', writingDirection: 'ltr' },
  brandTextWrap: { flex: 1, alignItems: 'flex-end' },
  brand: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 24, textAlign: 'right', writingDirection: 'rtl' },
  title: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  profileRow: { width: '100%', minHeight: 56, backgroundColor: 'rgba(255,255,255,.11)', borderRadius: 16, padding: 9, marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center' },
  profileAvatar: { width: 46, height: 46, overflow: 'hidden', borderRadius: 23, backgroundColor: C.taxi, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,.65)' },
  profileImage: { width: '100%', height: '100%' },
  profileInitial: { color: C.brand2, fontFamily: FONT.bold, fontSize: 18, textAlign: 'center' },
  profileTextWrap: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  profileName: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  profileRole: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 10, textAlign: 'right', writingDirection: 'rtl', marginTop: 3 },
  content: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 32 },
  item: { minHeight: 64, width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, marginBottom: 8, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', shadowColor: '#17352f', shadowOpacity: 0.045, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  icon: { width: 44, height: 44, position: 'relative', borderRadius: 13, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  menuBadge: { position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, backgroundColor: '#e53935', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { color: '#fff', fontFamily: FONT.bold, fontSize: 8, lineHeight: 10, textAlign: 'center', writingDirection: 'rtl' },
  iconText: { color: C.brand, fontSize: 18, fontFamily: FONT.bold, textAlign: 'center' },
  itemTextWrap: { flex: 1, minWidth: 0, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'center' },
  itemText: { width: '100%', color: C.ink, fontFamily: FONT.bold, fontSize: 13, lineHeight: 21, textAlign: 'right', writingDirection: 'rtl' },
  itemChevron: { color: C.muted, fontFamily: FONT.bold, fontSize: 22, marginRight: 8 },
  logoutItem: { marginTop: 14, borderColor: '#e3403e' },
  logoutIcon: { backgroundColor: '#fde8e7' },
  logoutText: { color: '#e3403e' },
  photoModal: { flex: 1, backgroundColor: 'rgba(3,10,16,.96)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  photoClose: { position: 'absolute', top: 42, right: 22, zIndex: 2, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  photoCloseText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  photoFull: { width: '100%', height: '76%' },
  photoEmpty: { width: 220, height: 220, borderRadius: 110, backgroundColor: C.taxi, alignItems: 'center', justifyContent: 'center' },
  photoInitial: { color: C.brand2, fontFamily: FONT.bold, fontSize: 76 },
  photoEmptyText: { color: '#fff', fontFamily: FONT.regular, fontSize: 12, marginTop: 18 },
  photoActions: { width: '100%', flexDirection: 'row-reverse', justifyContent: 'center', gap: 12, marginTop: 24 },
  photoAction: { minWidth: 132, backgroundColor: C.brand, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  photoActionText: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
});
