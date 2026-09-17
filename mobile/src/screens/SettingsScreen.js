import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, FONT } from '../theme';

export default function SettingsScreen({ navigation }) {
  const items = [
    ['سیاست حریم خصوصی', 'اطلاعات مربوط به جمع‌آوری، استفاده و حفاظت از داده‌ها', 'PrivacyPolicy'],
    ['درباره برنامه', 'اطلاعات رسمی خطیار، نسخه، تولیدکننده و راه‌های ارتباطی', 'AboutApp'],
  ];

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.brand}>خطیار</Text>
        <Text style={s.title}>تنظیمات</Text>
        <Text style={s.sub}>تنظیمات و اطلاعات رسمی برنامه</Text>
      </View>
      {items.map(([title, description, route]) => (
        <TouchableOpacity key={route} style={s.card} activeOpacity={0.82} onPress={() => navigation.navigate(route)}>
          <View style={s.icon}><Text style={s.iconText}>{route === 'PrivacyPolicy' ? '🔒' : 'ℹ️'}</Text></View>
          <View style={s.textWrap}>
            <Text style={s.itemTitle}>{title}</Text>
            <Text style={s.description}>{description}</Text>
          </View>
          <Text style={s.arrow}>‹</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  content: { padding: 14, paddingBottom: 40 },
  hero: { backgroundColor: C.brand, borderRadius: 20, padding: 20, marginBottom: 12 },
  brand: { color: '#fff', fontFamily: FONT.bold, fontSize: 24, textAlign: 'right' },
  title: { color: '#fff', fontFamily: FONT.bold, fontSize: 18, textAlign: 'right', marginTop: 8 },
  sub: { color: '#d7eee8', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#e4e9f2', padding: 14, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  iconText: { fontSize: 19 },
  textWrap: { flex: 1, minWidth: 0 },
  itemTitle: { color: C.brand, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right' },
  description: { color: '#667085', fontFamily: FONT.regular, fontSize: 11.5, lineHeight: 19, textAlign: 'right', marginTop: 4 },
  arrow: { color: C.brand, fontSize: 27, marginRight: 6 },
});