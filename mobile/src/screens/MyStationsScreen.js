import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { request } from '../api';
import { C, FONT } from '../theme';
import HistoricalMediaImage from '../components/HistoricalMediaImage';

const fa = n => String(n ?? '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

export default function MyStationsScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState('');
  const generation = useRef(0);
  const { width } = useWindowDimensions();
  const normalizedQuery = query.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
  const filtered = data.filter(x => !normalizedQuery || [x.line_code, x.station_name, x.origin, x.destination, x.physical_address, x.street, x.station_code].some(v => String(v || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase().includes(normalizedQuery)));

  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const items = await request('/my/app-items', { noStore: true });
      if (current !== generation.current) return;
      const permItems = items?.items;
      const allowed = permItems == null || (Array.isArray(permItems) && ['MyStations', 'StationCapture', 'LineLocation'].some(k => permItems.includes(k)));
      if (!allowed) {
        setDenied(true);
        setData([]);
        setError('');
        return;
      }
      setDenied(false);
      const rows = await request('/station-wizard-api.php?op=mine', { noStore: true });
      if (!Array.isArray(rows)) throw new Error('پاسخ فهرست ایستگاه‌ها معتبر نیست.');
      if (current !== generation.current) return;
      setData(rows);
      setError('');
    } catch (e) {
      if (current === generation.current) {
        setData([]);
        setError(e?.message || 'دریافت ایستگاه‌ها ناموفق بود. اتصال اینترنت را بررسی کنید.');
      }
    }
    finally { if (current === generation.current) setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    return () => { generation.current += 1; };
  }, [load]));

  return (
    <ScrollView persistentScrollbar style={s.page} contentContainerStyle={[s.content, { paddingHorizontal: width >= 700 ? 32 : 16 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.brand]} />}>
      <View style={s.head}>
        <View style={s.headIcon}><MaterialCommunityIcons name="map-marker-check-outline" size={27} color="#f1d395" /></View>
        <Text style={s.title}>ایستگاه‌های ثبت‌شده من</Text>
        <Text style={s.headSub}>{loading ? 'در حال دریافت اطلاعات…' : `تعداد ایستگاه‌ها: ${fa(data.length)}`}</Text>
      </View>
      {!loading && !denied && !error && <View style={s.searchBox}>
        <MaterialCommunityIcons name="magnify" size={22} color={C.brand}/>
        <TextInput accessibilityLabel="جستجوی ایستگاه‌های ثبت‌شده" style={s.searchInput} value={query} onChangeText={setQuery} placeholder="جستجوی خط، ایستگاه یا آدرس…" placeholderTextColor={C.muted}/>
        {query ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="پاک‌کردن جستجو" onPress={()=>setQuery('')} style={s.clearSearch}><MaterialCommunityIcons name="close-circle-outline" size={21} color={C.muted}/></TouchableOpacity> : null}
      </View>}
      {!!error && <View style={s.errorBox}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity>
      </View>}
      {!loading && denied && <View style={s.empty}><MaterialCommunityIcons name="lock-outline" size={30} color={C.muted}/><Text style={s.emptyText}>دسترسی مشاهده ایستگاه‌های ثبت‌شده برای حساب شما فعال نیست.</Text></View>}
      {!loading && !error && !denied && data.length === 0 && <View style={s.empty}><MaterialCommunityIcons name="map-marker-off-outline" size={32} color={C.brand}/><Text style={s.emptyText}>هنوز ایستگاهی توسط شما ثبت نشده است.</Text><Text style={s.muted}>پس از ثبت موفق، اطلاعات ایستگاه در این قسمت نمایش داده می‌شود.</Text></View>}
      {!loading && !error && !denied && data.length > 0 && filtered.length === 0 && <View style={s.empty}><MaterialCommunityIcons name="magnify-close" size={30} color={C.brand}/><Text style={s.emptyText}>ایستگاهی با این عبارت یافت نشد.</Text></View>}
      {!loading && !error && !denied && filtered.map(x => <TouchableOpacity key={String(x.id)} accessibilityRole="button" accessibilityLabel={`مشاهده و ویرایش ایستگاه خط ${x.line_code || ''}`}
        style={s.card} onPress={() => navigation.navigate('StationCapture', { stationId: x.id })}>
        <View style={s.row}><View style={s.editChip}><MaterialCommunityIcons name="pencil-outline" size={18} color={C.brand}/><Text style={s.edit}>مشاهده و ویرایش</Text></View><View style={s.lineHead}><MaterialCommunityIcons name="map-marker-radius-outline" size={19} color={C.brand}/><Text style={s.line}>{x.line_code || 'خط بدون کد'}</Text></View></View>
        <Text style={s.muted}>{x.origin || ''}{x.destination ? ' تا ' + x.destination : ''}</Text>
        <Text style={s.text}>تابلوها: {fa(x.sign_count || 0)} عدد</Text>
        <Text style={s.text}>آدرس: {x.physical_address || '—'}</Text>
        <Text style={s.text}>ثبت: {x.captured_at_jalali || '—'}</Text>
        {x.location_photo_path ? <HistoricalMediaImage uri={x.location_photo_path} style={s.photo} accessibilityLabel="تصویر ایستگاه" /> : null}
      </TouchableOpacity>)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f8f6' }, content: { paddingTop: 16, paddingBottom: 44, alignSelf: 'center', width: '100%', maxWidth: 760 },
  head: { backgroundColor: '#075f51', borderRadius: 25, padding: 20, marginBottom: 15, elevation: 3 },headIcon:{alignSelf:'flex-end',marginBottom:8},
  title: { fontFamily: FONT.bold, color: '#fff', fontSize: 19, textAlign: 'right' },
  headSub: { fontFamily: FONT.regular, color: '#e0f2e9', fontSize: 13, textAlign: 'right', marginTop: 6 },
  searchBox:{flexDirection:'row-reverse',alignItems:'center',gap:9,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#dce9e3',paddingHorizontal:13,marginBottom:14,minHeight:52,elevation:1},
  searchInput:{flex:1,fontFamily:FONT.regular,color:C.ink,textAlign:'right',fontSize:13,paddingVertical:12},clearSearch:{minWidth:44,minHeight:48,alignItems:'center',justifyContent:'center'},
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 17, marginBottom: 11, borderWidth: 1, borderColor: '#dce9e3', minHeight: 96, elevation: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },lineHead:{flexDirection:'row-reverse',alignItems:'center',gap:5,flexShrink:1},
  line: { fontFamily: FONT.bold, color: C.ink, fontSize: 16, flexShrink: 1, textAlign: 'right' },
  editChip: { minHeight: 48, borderRadius: 14, backgroundColor: '#e6f5ed', paddingHorizontal: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  edit: { fontFamily: FONT.bold, color: C.brand, fontSize: 12 },
  text: { fontFamily: FONT.regular, color: C.ink, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 6 },
  photo: { width: '100%', height: 165, borderRadius: 12, marginTop: 12 },
  empty: { backgroundColor: '#fff', padding: 24, borderRadius: 18, alignItems: 'center', gap: 10 },
  emptyText: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, lineHeight: 23, textAlign: 'center' },
  errorBox: { padding: 14, backgroundColor: '#fff1f1', borderWidth: 1, borderColor: '#f3b8c0', borderRadius: 14, marginBottom: 12 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', textAlign: 'right', lineHeight: 22 },
  retry: { minHeight: 48, paddingHorizontal: 16, alignSelf: 'flex-end', justifyContent: 'center', marginTop: 8 },
  retryText: { color: C.brand, fontFamily: FONT.bold },
});
