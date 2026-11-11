import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, FONT } from '../theme';
import UpdateScreen from './UpdateScreen';
import { checkVersion } from '../update';

const ITEMS = [
  ['map-settings', 'تنظیمات نقشه و دانلود آفلاین', 'map-outline', 'MapSettings', 'مدیریت تنظیمات نقشه و داده‌های آفلاین'],
  ['expiry-settings', 'اعلان‌های پایان اعتبار', 'bell-outline', 'ExpiryNotificationSettings', 'تنظیم اعلان‌های مربوط به اعتبار'],
  ['field-alerts', 'هشدارهای میدانی', 'alert-circle-outline', 'FieldAlertSettings', 'تنظیم هشدارهای میدانی'],
  ['app-lock', 'قفل برنامه', 'lock-outline', 'AppLockSettings', 'مدیریت قفل و امنیت ورود به برنامه'],
  ['crash-reports', 'گزارش خطاهای برنامه', 'bug-outline', 'CrashReports', 'مشاهده و مدیریت گزارش خطاهای برنامه'],
  ['import-times', 'آخرین زمان‌های به‌روزرسانی', 'clock-outline', 'ImportTimes', 'مشاهده آخرین زمان دریافت و به‌روزرسانی اطلاعات'],
  ['check-update', 'بررسی به‌روزرسانی برنامه', 'update', null, 'بررسی وجود نسخه جدید برنامه'],
  ['privacy-policy', 'سیاست حریم خصوصی', 'shield-lock-outline', 'PrivacyPolicy', 'اطلاعات مربوط به جمع‌آوری، استفاده و حفاظت از داده‌ها'],
  ['about-app', 'درباره برنامه', 'information-outline', 'AboutApp', 'اطلاعات رسمی خطیار، نسخه، تولیدکننده و راه‌های ارتباطی'],
];
const SETTINGS_GROUPS = [
  { title: 'نمایش و موقعیت‌یابی', subtitle: 'نقشه و اطلاعات موردنیاز برای کار در مسیر', keys: ['map-settings', 'import-times'] },
  { title: 'اعلان‌ها و هشدارها', subtitle: 'مدیریت هشدارهای عملیاتی و یادآوری‌ها', keys: ['field-alerts', 'expiry-settings'] },
  { title: 'امنیت و نگهداری', subtitle: 'حفاظت از برنامه، بررسی نسخه و گزارش مشکلات', keys: ['app-lock', 'check-update', 'crash-reports'] },
  { title: 'درباره خطیار', subtitle: 'حریم خصوصی و اطلاعات سازنده', keys: ['privacy-policy', 'about-app'] },
];

export default function SettingsScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const openItem = async (route) => {
    if (route) { navigation.navigate(route); return; }
    if (checking) return;
    setChecking(true);
    try {
      const info = await checkVersion();
      if (info.failed) throw new Error('اطلاعات نسخه از سرور دریافت نشد.');
      if (info.required || info.hasUpdate) setAvailableUpdate(info);
      else Alert.alert('بررسی به‌روزرسانی', `نسخه ${info.current} آخرین نسخه نصب‌شده است.`);
    }
    catch (_) { Alert.alert('خطا', 'بررسی به‌روزرسانی انجام نشد. اتصال اینترنت را بررسی کنید.'); }
    finally { setChecking(false); }
  };
  return (
    <><ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Text style={s.brand}>خطیار</Text>
        <Text style={s.title}>تنظیمات</Text>
        <Text style={s.sub}>تنظیمات کاربردی، هشدارها و نگهداری برنامه در یک نگاه</Text>
      </View>
      {SETTINGS_GROUPS.map(group => (
        <View key={group.title} style={s.section}>
          <Text style={s.sectionTitle}>{group.title}</Text>
          <Text style={s.sectionSubtitle}>{group.subtitle}</Text>
          {group.keys.map(key => {
            const item = ITEMS.find(entry => entry[0] === key);
            if (!item) return null;
            const [, title, icon, route, description] = item;
            return <Item key={key} title={title} icon={icon} description={key === 'check-update' && checking ? 'در حال بررسی نسخهٔ جدید…' : description} disabled={key === 'check-update' && checking} onPress={() => openItem(route)} />;
          })}
        </View>
      ))}
    </ScrollView>
    <Modal visible={!!availableUpdate} animationType="slide" onRequestClose={() => { if (!availableUpdate?.required) setAvailableUpdate(null); }}>
      <View style={{flex:1}}>
        {!availableUpdate?.required && <TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن به‌روزرسانی" onPress={() => setAvailableUpdate(null)} style={{alignSelf:'flex-end',padding:16,minWidth:48,minHeight:48}}><MaterialCommunityIcons name="close" size={25} color={C.ink}/></TouchableOpacity>}
        {!!availableUpdate && <UpdateScreen info={availableUpdate} onRecheck={async()=>{const info=await checkVersion();if(!info.failed && !info.required && !info.hasUpdate)setAvailableUpdate(null);else if(!info.failed)setAvailableUpdate(info);}}/>}
      </View>
    </Modal></>
  );
}
function Item({ title, icon, description, onPress, disabled = false }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} disabled={disabled} style={[s.card, disabled && { opacity: 0.6 }]} activeOpacity={0.82} onPress={onPress}>
      <View style={s.icon}><MaterialCommunityIcons name={icon} size={23} color={C.brand} accessible={false} /></View>
      <View style={s.textWrap}>
        <Text style={s.itemTitle}>{title}</Text>
        <Text style={s.description}>{description}</Text>
      </View>
      <Text style={s.arrow}>‹</Text>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  content: { padding: 14, paddingBottom: 40 },
  hero: { backgroundColor: C.brand, borderRadius: 20, padding: 20, marginBottom: 12 },
  brand: { color: '#fff', fontFamily: FONT.bold, fontSize: 24, textAlign: 'right' },
  title: { color: '#fff', fontFamily: FONT.bold, fontSize: 18, textAlign: 'right', marginTop: 8 },
  sub: { color: '#d7eee8', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', marginTop: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { color: C.brand, fontFamily: FONT.bold, fontSize: 16, textAlign: 'right', paddingHorizontal: 4 },
  sectionSubtitle: { color: C.muted || '#536575', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', marginTop: 3, marginBottom: 10, paddingHorizontal: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, minHeight: 76, marginBottom: 8, flexDirection: 'row-reverse', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  iconText: { fontSize: 19 },
  textWrap: { flex: 1, minWidth: 0 },
  itemTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right' },
  description: { color: '#667085', fontFamily: FONT.regular, fontSize: 11.5, lineHeight: 19, textAlign: 'right', marginTop: 4 },
  arrow: { color: C.brand, fontSize: 27, marginRight: 6 },
});
