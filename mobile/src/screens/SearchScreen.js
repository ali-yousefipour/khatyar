import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { request } from '../api';
import { refreshSearchCache, offlineSearch } from '../linecache';
import { C, FONT } from '../theme';
const digitsOnly = (v='') => String(v).replace(/\D/g,'');
const buildTaxiPlate12 = (a,c) => { const x=digitsOnly(a).slice(0,2), y=digitsOnly(c).slice(0,3); return x.length===2&&y.length===3 ? `${x}ت${y}-12` : ''; };
import ActivityIndicator from '../components/PulseLoadingIndicator';

const faToEn = (s) => digitsOnly(s);
const normalizeDriver = (d) => {
  if (!d || typeof d !== 'object') return null;
  const national = d.national_id || d.national_code || d.nid || '';
  return { ...d, national_id: national ? String(national) : d.national_id };
};
const normalizeVehicle = (v) => (v && typeof v === 'object' ? v : {});
const normalizeArray = (v) => Array.isArray(v) ? v : [];
const normalizeSearchResponse = (res) => {
  if (!res || typeof res !== 'object') return null;
  if (res.type === 'driver' || res.type === 'vehicle') return res;
  if (res.driver) return { type: 'driver', driver: res.driver, vehicle: res.vehicle || {}, warnings: res.warnings || [], temp_lines: res.temp_lines || [] };
  if (res.vehicle) return { type: 'vehicle', vehicle: res.vehicle, drivers: res.drivers || [] };
  if (Array.isArray(res.candidates) && res.candidates.length) return { type: 'vehicle', vehicle: res.candidates[0], drivers: res.candidates[0].drivers || [] };
  if (Array.isArray(res.items) && res.items.length) {
    const x = res.items[0];
    if (x && (x.plate || x.vehicle_plate)) return { type: 'vehicle', vehicle: x, drivers: x.drivers || [] };
    return { type: 'driver', driver: x, vehicle: {}, warnings: [], temp_lines: [] };
  }
  return null;
};

export default function SearchScreen({ navigation, route }) {
  const [nid, setNid] = useState('');
  const [p1, setP1] = useState(''); const [p3, setP3] = useState(''); const p3ref = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { refreshSearchCache().catch(() => {}); }, []);


  async function doSearch(kind) {
    let qs = '';
    let term = '';
    if (kind === 'plate') {
      const a = faToEn(p1).slice(0, 2), c = faToEn(p3).slice(0, 3);
      const plate = buildTaxiPlate12(a, c);
      if (!plate) return Alert.alert('توجه', 'دو بخش عددی پلاک را درست وارد کنید.');
      qs = 'plate=' + encodeURIComponent(plate); term = plate;
    } else {
      const v = faToEn(nid).slice(0, 10);
      if (v.length !== 10) return Alert.alert('توجه', 'کد ملی ۱۰ رقمی را کامل وارد کنید.');
      qs = 'national_id=' + v; term = v;
    }
    setBusy(true);
    try {
      const raw = await request(`/search?${qs}`);
      const res = normalizeSearchResponse(raw);
      if (!res) throw new Error(raw?.error || 'نوع پاسخ جستجو نامعتبر است.');
      if (res.type === 'driver') {
        const d = normalizeDriver(res.driver);
        if (!d) throw new Error('اطلاعات راننده از سرور ناقص دریافت شد.');
        navigation.navigate('Driver', { driver: d, vehicle: normalizeVehicle(res.vehicle), warnings: normalizeArray(res.warnings), temp_lines: normalizeArray(res.temp_lines) });
      } else {
        navigation.navigate('Vehicle', { vehicle: normalizeVehicle(res.vehicle), drivers: normalizeArray(res.drivers) });
      }
      setNid(''); setP1(''); setP3('');
    } catch (e) {
      const found = await offlineSearch(term);
      if (found.length >= 1) {
        Alert.alert('حالت آفلاین', 'اطلاعات از کش امروز نمایش داده می‌شود و ممکن است کامل نباشد.');
        navigation.navigate('Driver', { driver: normalizeDriver(found[0]) || {}, vehicle: {}, warnings: [] });
      } else Alert.alert('یافت نشد', e.message + '\n(در کش آفلاین نیز یافت نشد)');
    } finally { setBusy(false); }
  }

  return (
    <View style={s.wrap}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>جستجوی تاکسیران</Text>
        <Text style={s.label}>کد ملی راننده</Text>
        <TextInput style={[s.input,s.nationalInput]} value={nid} onChangeText={(v)=>setNid(faToEn(v).slice(0,10))} keyboardType="number-pad" maxLength={10} placeholder="کد ملی ۱۰ رقمی" placeholderTextColor={C.muted} />
        <TouchableOpacity style={s.btn} onPress={() => doSearch('nid')} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>جستجوی کد ملی</Text>}
        </TouchableOpacity>
      </View>

      <View style={s.divider}><View style={s.divLine}/><Text style={s.divTxt}>یا</Text><View style={s.divLine}/></View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>جستجوی تاکسی</Text>
        <Text style={s.label}>شماره پلاک تاکسی</Text>
        <View style={s.plateWrap}>
          <View style={s.plateBody}>
            <TextInput style={s.plateInput} value={p1} onChangeText={(v) => { const d=faToEn(v).slice(0,2); setP1(d); if (d.length >= 2) p3ref.current && p3ref.current.focus(); }} keyboardType="number-pad" maxLength={2} placeholder="۱۲" placeholderTextColor="#b8a000" />
            <Text style={s.plateLetter}>ت</Text>
            <TextInput ref={p3ref} style={[s.plateInput, { width: 78 }]} value={p3} onChangeText={(v)=>setP3(faToEn(v).slice(0,3))} keyboardType="number-pad" maxLength={3} placeholder="۸۷۹" placeholderTextColor="#b8a000" />
            <View style={s.plateRegion}><Text style={s.plateRegionNum}>۱۲</Text><View style={s.plateRegionLine} /></View>
          </View>
          <View style={s.plateFlag}><Text style={s.plateFlagIR}>I.R.</Text><Text style={s.plateFlagIran}>ایران</Text></View>
        </View>
        <Text style={s.note}>حرف «ت» و کد منطقه «۱۲» ثابت هستند.</Text>
        <TouchableOpacity style={s.btn} onPress={() => doSearch('plate')} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>جستجوی پلاک</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, padding: 18 },
  sectionCard: { backgroundColor:'#fff', borderWidth:1, borderColor:C.line, borderRadius:16, padding:14 },
  sectionTitle: { fontFamily:FONT.bold, color:C.ink, fontSize:16, textAlign:'right', marginBottom:14 },
  divider: { flexDirection:'row', alignItems:'center', gap:10, marginVertical:14 },
  divLine:{ flex:1, height:1, backgroundColor:C.line }, divTxt:{ fontFamily:FONT.bold, color:C.muted },
  tab: { flex: 1, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center' },
  tabOn: { backgroundColor: C.brand, borderColor: C.brand },
  tabTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  tabTxtOn: { color: '#fff' },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 8, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  scan: { width: 52, borderRadius: 13, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  scanTxt: { color: '#fff', fontSize: 20 },
  plateRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  rowPlateActions: { alignItems: 'center', marginBottom: 10 },
  scanPlate: { backgroundColor: C.ink, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 22 },
  scanPlateTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  plateWrap: { flexDirection: 'row', direction:'ltr', alignItems: 'stretch', alignSelf: 'center', height: 76, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#1a1a1a', marginTop: 4 },
  plateBody: { flexDirection: 'row', direction:'ltr', alignItems: 'center', backgroundColor: '#f5c518', paddingHorizontal: 10, gap: 4 },
  plateInput: { width: 58, height: 60, textAlign: 'center', fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 30, padding: 0, writingDirection:'ltr' },
  plateLetter: { fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 26, marginHorizontal: 2 },
  plateRegion: { alignItems: 'center', justifyContent: 'center', marginRight: 4, borderLeftWidth: 1.5, borderLeftColor: '#1a1a1a', paddingLeft: 8, height: 50 },
  plateRegionNum: { fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 22 },
  plateRegionLine: { width: 28, height: 2, backgroundColor: '#1a1a1a', marginTop: 2 },
  plateFlag: { backgroundColor: '#0a3d91', width: 42, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  plateFlagIR: { color: '#fff', fontFamily: FONT.bold, fontSize: 11 },
  plateFlagIran: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, marginTop: 4 },
  pbox: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 10, width: 58, textAlign: 'center', fontFamily: FONT.bold, color: C.ink },
  pSelect: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingVertical: 10, width: 70, alignItems: 'center' },
  pSelectTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 15 },
  iran: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  note: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 12, fontFamily: FONT.regular },
  nationalInput:{minHeight:58,width:'100%',fontSize:19,letterSpacing:2,textAlign:'center',writingDirection:'ltr',paddingHorizontal:18},
});
