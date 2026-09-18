import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, FONT } from '../theme';

const ITEMS = [
  ['map-settings', 'تنظیمات نقشه و دانلود آفلاین', '🗺️', 'MapSettings', 'مدیریت تنظیمات نقشه و داده‌های آفلاین'],
  ['expiry-settings', 'اعلان‌های پایان اعتبار', '🔔', 'ExpiryNotificationSettings', 'تنظیم اعلان‌های مربوط به اعتبار'],
  ['field-alerts', 'هشدارهای میدانی', '⚠️', 'FieldAlertSettings', 'تنظیم هشدارهای میدانی'],
  ['app-lock', 'قفل برنامه', '🔐', 'AppLockSettings', 'مدیریت قفل و امنیت ورود به برنامه'],
  ['crash-reports', 'گزارش خطاهای برنامه', '🛠️', 'CrashReports', 'مشاهده و مدیریت گزارش خطاهای برنامه'],
  ['import-times', 'آخرین زمان‌های به‌روزرسانی', '🕒', 'ImportTimes', 'مشاهده آخرین زمان دریافت و به‌روزرسانی اطلاعات'],
  ['check-update', 'بررسی به‌روزرسانی برنامه', '🔄', null, 'بررسی وجود نسخه جدید برنامه'],
  ['privacy-policy', 'سیاست حریم خصوصی', '🔒', 'PrivacyPolicy', 'اطلاعات مربوط به جمع‌آوری، استفاده و حفاظت از داده‌ها'],
  ['about-app', 'درباره برنامه', 'ℹ️', 'AboutApp', 'اطلاعات رسمی خطیار، نسخه، تولیدکننده و راه‌های ارتباطی'],
];

export default function SettingsScreen({ navigation }) {
  const openItem = (route) => {
    if (route) navigation.navigate(route);
    else import('../updater').then((m) => m.checkForUpdate(true)).catch(() => {});
  };
  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Text style={s.brand}>خطیار</Text>
        <Text style={s.title}>تنظیمات</Text>
        <Text style={s.sub}>مدیریت حساب، تنظیمات برنامه و اطلاعات رسمی</Text>
      </View>
      <View style={s.section}>
        <Text style={s.sectionTitle}>حساب کاربری</Text>
        {ITEMS.slice(0, 5).map(([key, title, icon, route, description]) => (
          <Item key={key} title={title} icon={icon} description={description} onPress={() => openItem(route)} />
        ))}
      </View>
      <View style={s.section}>
        <Text style={s.sectionTitle}>تنظیمات برنامه</Text>
        {ITEMS.slice(5, 12).map(([key, title, icon, route, description]) => (
          <Item key={key} title={title} icon={icon} description={description} onPress={() => openItem(route)} />
        ))}
      </View>
      <View style={s.section}>
        <Text style={s.sectionTitle}>اطلاعات و حریم خصوصی</Text>
        {ITEMS.slice(7).map(([key, title, icon, route, description]) => (
          <Item key={key} title={title} icon={icon} description={description} onPress={() => openItem(route)} />
        ))}
      </View>
    </ScrollView>
  );
}
function Item({ title, icon, description, onPress }) {
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.82} onPress={onPress}>
      <View style={s.icon}><Text style={s.iconText}>{icon}</Text></View>
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
  section: { marginBottom: 14 },
  sectionTitle: { color: C.brand, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right', marginBottom: 8, paddingHorizontal: 4 },
  card: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 9, flexDirection: 'row-reverse', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  iconText: { fontSize: 19 },
  textWrap: { flex: 1, minWidth: 0 },
  itemTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right' },
  description: { color: '#667085', fontFamily: FONT.regular, fontSize: 11.5, lineHeight: 19, textAlign: 'right', marginTop: 4 },
  arrow: { color: C.brand, fontSize: 27, marginRight: 6 },
});