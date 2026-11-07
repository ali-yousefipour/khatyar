import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const roles = { line_supervisor: 'ناظر خط', motor_patrol: 'گشت موتوری', vehicle_patrol: 'بازرس گشت خودرویی', resident_inspector: 'بازرس مقیم', chief_inspector: 'سربازرس', administrative_visit: 'نیروی اداری' };
const percent = v => Math.max(0, Math.min(100, Math.round(Number(v || 0))));
const tint = v => v >= 90 ? '#087854' : v >= 50 ? '#b78320' : '#b44d42';

function Metric({ icon, value, label }) {
  return <View style={s.metric}><View style={s.metricIcon}><MaterialCommunityIcons name={icon} size={22} color="#075f51" /></View><Text style={s.metricNumber}>{faNum(Number(value || 0))}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}
function Person({ item }) {
  const achievement = percent(item.weighted_achievement);
  return <View style={s.person}>
    <View style={s.personTop}><View style={s.avatar}><MaterialCommunityIcons name="account-outline" color="#08705b" size={24} /></View><View style={{ flex: 1 }}><Text style={s.personName}>{item.name}</Text><Text style={s.personMeta}>{roles[item.role_key] || item.role_title || ''} · {faNum(item.visited_lines || 0)} از {faNum(item.assigned_lines || 0)} خط</Text></View><View style={[s.badge, { backgroundColor: achievement >= 90 ? '#e1f5ea' : achievement >= 50 ? '#fff2d5' : '#fee9e5' }]}><Text style={[s.badgeText, { color: tint(achievement) }]}>{faNum(achievement)}٪</Text></View></View>
    <View style={s.track}><View style={[s.fill, { width: `${achievement}%`, backgroundColor: tint(achievement) }]} /></View>
    <Text style={s.scoreMeta}>امتیاز امروز: {faNum(item.score_today || 0)}</Text>
  </View>;
}

export default function RoleDashboardScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    const responses = await Promise.allSettled([request('/operations/my-dashboard'), request('/my/role-dashboard')]);
    const result = responses.map(x => x.status === 'fulfilled' ? x.value : null).find(x => x && (x.me || x.role_key || x.subordinates));
    if (result) { setData(result); setError(''); } else setError(responses.find(x => x.status === 'rejected')?.reason?.message || 'دریافت داشبورد ناموفق بود');
  };
  useEffect(() => { load(); }, []);
  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };
  if (!data) return <View style={s.loading}>{error ? <><Text style={s.errorTitle}>دریافت داشبورد ناموفق بود</Text><Text style={s.errorMessage}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={load} style={s.retry}><Text style={s.retryText}>تلاش دوباره</Text></TouchableOpacity></> : <ActivityIndicator color={C.brand} />}</View>;

  const me = data.me || {};
  const achievement = percent(me.weighted_achievement);
  const subs = data.subordinates;
  return <ScrollView persistentScrollbar style={s.page} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
    <View style={s.hero}>
      <View style={s.heroTop}><MaterialCommunityIcons name="chart-box-outline" color="#f4d99c" size={26} /><View style={{ flex: 1 }}><Text style={s.heroTitle}>داشبورد و امتیاز من</Text><Text style={s.heroSub}>{roles[data.role_key] || data.role_title || 'عملکرد امروز'} · {me.name || ''}</Text></View></View>
      <View style={s.heroStats}><View style={s.achievementRing}><Text style={s.achievementValue}>{faNum(achievement)}٪</Text><Text style={s.achievementLabel}>تحقق مأموریت</Text></View><View style={s.goldCard}><MaterialCommunityIcons name="star-circle" size={30} color="#9e680d" /><Text style={s.goldCaption}>امتیاز امروز</Text><Text style={s.goldNumber}>{faNum(me.score_today || 0)}</Text></View></View>
      <View style={s.alertLine}><MaterialCommunityIcons name="bell-outline" size={17} color="#ffe4a6" /><Text style={s.alertText}>{faNum(data.unread_alerts || 0)} هشدار خوانده‌نشده</Text></View>
    </View>
    <View style={s.metrics}><Metric icon="map-marker-path" value={me.assigned_lines} label="خط تخصیصی" /><Metric icon="clipboard-check-outline" value={me.visited_lines} label="بازدید امروز" /><Metric icon="shield-check-outline" value={me.validated_lines} label="بازدید معتبر" /></View>
    {subs ? <View style={s.section}><View style={s.sectionHead}><MaterialCommunityIcons name="account-group-outline" size={23} color="#075f51" /><Text style={s.sectionTitle}>عملکرد نیروها</Text><View style={s.count}><Text style={s.countText}>{faNum(subs.total || 0)} نفر</Text></View></View>
      {subs.weak?.length > 0 ? <View style={s.warning}><MaterialCommunityIcons name="alert-circle-outline" size={19} color="#93600a" /><Text style={s.warningText}>{faNum(subs.weak.length)} نفر با تحقق مأموریت زیر ۵۰٪ نیاز به پیگیری دارند.</Text></View> : null}
      {(subs.all || []).map(item => <Person key={item.user_id} item={item} />)}
      {(!subs.all || !subs.all.length) ? <View style={s.empty}><Text style={s.emptyText}>هنوز زیرمجموعه‌ای برای این حساب تعریف نشده است.</Text></View> : null}
    </View> : null}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f8f6' }, content: { padding: 14, paddingBottom: 42 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.paper }, errorTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'center' }, errorMessage: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center', marginTop: 8 }, retry: { marginTop: 18, minHeight: 48, backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 24, justifyContent: 'center' }, retryText: { fontFamily: FONT.bold, color: '#fff' },
  hero: { backgroundColor: '#075f51', borderRadius: 25, padding: 18, elevation: 3 }, heroTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, heroTitle: { fontFamily: FONT.bold, color: '#fff', fontSize: 20, textAlign: 'right' }, heroSub: { fontFamily: FONT.regular, color: '#d4eee3', fontSize: 12, textAlign: 'right', marginTop: 4 }, heroStats: { flexDirection: 'row-reverse', justifyContent: 'space-around', gap: 18, alignItems: 'center', marginTop: 20 }, achievementRing: { width: 138, height: 138, borderRadius: 69, borderWidth: 10, borderColor: '#a3e8cd', borderTopColor: '#f3d18d', borderRightColor: '#f3d18d', justifyContent: 'center', alignItems: 'center' }, achievementValue: { fontFamily: FONT.bold, color: '#fff', fontSize: 28 }, achievementLabel: { fontFamily: FONT.regular, color: '#e0f7ed', fontSize: 12 }, goldCard: { flex: 1, maxWidth: 160, backgroundColor: '#ffe5a6', borderRadius: 20, padding: 13, minHeight: 132, justifyContent: 'center', alignItems: 'center' }, goldCaption: { fontFamily: FONT.bold, color: '#714813', marginTop: 4, fontSize: 12 }, goldNumber: { fontFamily: FONT.bold, color: '#5a3609', fontSize: 28 }, alertLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 17 }, alertText: { fontFamily: FONT.regular, color: '#fff4d8', fontSize: 12 },
  metrics: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 }, metric: { flex: 1, backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: '#e0eae5', paddingVertical: 13, alignItems: 'center', elevation: 1 }, metricIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#eaf7f1', alignItems: 'center', justifyContent: 'center' }, metricNumber: { fontFamily: FONT.bold, fontSize: 23, color: '#102d2a', marginTop: 7 }, metricLabel: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'center' },
  section: { marginTop: 20 }, sectionHead: { flexDirection: 'row-reverse', alignItems: 'center', padding: 11, backgroundColor: '#e2f3ec', borderRadius: 13, gap: 8, marginBottom: 11 }, sectionTitle: { flex: 1, fontFamily: FONT.bold, color: '#123e34', textAlign: 'right', fontSize: 16 }, count: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }, countText: { fontFamily: FONT.bold, color: C.brand, fontSize: 11 }, warning: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff0d0', padding: 12, borderRadius: 13, gap: 8, marginBottom: 11 }, warningText: { flex: 1, fontFamily: FONT.regular, color: '#86550e', textAlign: 'right', fontSize: 12 },
  person: { backgroundColor: '#fff', borderRadius: 17, padding: 13, borderColor: '#e2eae6', borderWidth: 1, marginBottom: 9, elevation: 1 }, personTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }, avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#e1f3eb', alignItems: 'center', justifyContent: 'center' }, personName: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', fontSize: 14 }, personMeta: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', fontSize: 11, marginTop: 3 }, badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }, badgeText: { fontFamily: FONT.bold, fontSize: 13 }, track: { backgroundColor: '#e4e9e7', borderRadius: 5, overflow: 'hidden', height: 7, marginTop: 12, alignItems: 'flex-end' }, fill: { height: '100%', borderRadius: 5 }, scoreMeta: { fontFamily: FONT.regular, color: C.muted, textAlign: 'left', fontSize: 11, marginTop: 7 }, empty: { backgroundColor: '#fff', borderRadius: 15, padding: 20 }, emptyText: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center' },
});
