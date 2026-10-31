import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { request } from '../api';
import { C as CC, FONT } from '../theme';
import { fjTehran } from '../jdate';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const ICONS = {
  oplic: require('../../assets/icons3d/commitment-sign.png'),
  vehicles: require('../../assets/icons3d/driver-id.png'),
  drivers: require('../../assets/icons3d/users-admin.png'),
  taxilic: require('../../assets/icons3d/official-badge.png'),
  bills: require('../../assets/icons3d/billing-receipt.png'),
};

export default function ImportTimesScreen() {
  const [rows, setRows] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const result = await request('/my/import-times', { noStore: true });
      if (!Array.isArray(result)) throw new Error('پاسخ زمان‌های به‌روزرسانی معتبر نیست.');
      setRows(result);
      setError('');
    } catch (e) { setError(e?.message || 'دریافت زمان‌های به‌روزرسانی ناموفق بود.'); }
  };
  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

  const fmt = (value) => fjTehran(value) || 'هنوز ثبت نشده';

  if (!rows && !error) return <View style={s.center}><ActivityIndicator color={CC.brand} /></View>;

  return (
    <ScrollView persistentScrollbar={true}       style={{ backgroundColor: CC.paper }}
      contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[CC.brand]} />}
    >
      <Text style={s.h}>آخرین زمان‌های به‌روزرسانی</Text>
      <Text style={s.sub}>زمانی که مدیر سامانه آخرین بار هر فهرست را از طریق فایل اکسل وارد کرده است.</Text>
      {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" style={s.retry} onPress={onRefresh}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}

      {(rows || []).map((r) => (
        <View key={r.key} style={s.card}>
          <Image source={ICONS[r.key] || ICONS.oplic} style={s.icon} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{r.title}</Text>
            <Text style={[s.time, !r.at && { color: CC.muted }]}>
              {r.at ? `آخرین به‌روزرسانی: ${fmt(r.at)}` : 'هنوز ثبت نشده'}
            </Text>
          </View>
        </View>
      ))}

      <Text style={s.note}>برای به‌روزرسانی این فهرست، صفحه را به پایین بکشید.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  errorBox: { padding: 14, borderWidth: 1, borderColor: '#f3b8c0', backgroundColor: '#fff1f1', borderRadius: 14, marginBottom: 12 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', textAlign: 'right', lineHeight: 22 },
  retry: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 14 },
  retryText: { fontFamily: FONT.bold, color: CC.brand },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontFamily: FONT.bold, fontSize: 19, color: CC.ink, textAlign: 'right', marginBottom: 6 },
  sub: { fontFamily: FONT.regular, fontSize: 12.5, color: CC.muted, textAlign: 'right', marginBottom: 20, lineHeight: 22 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: CC.card, borderRadius: 12, borderWidth: 1, borderColor: CC.line, padding: 14, marginBottom: 10 },
  icon: { width: 34, height: 34 },
  title: { fontFamily: FONT.bold, color: CC.ink, fontSize: 14.5, textAlign: 'right' },
  time: { fontFamily: FONT.regular, color: CC.brand, fontSize: 12.5, textAlign: 'right', marginTop: 5 },
  note: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11.5, textAlign: 'center', marginTop: 14 },
});
