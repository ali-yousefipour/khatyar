import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Keyboard, useWindowDimensions } from 'react-native';
import { request } from '../api';
import { refreshSearchCache, offlineSearch } from '../linecache';
import { C, FONT } from '../theme';
import { enNum, faNum } from '../num';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const digitsOnly = (v='') => enNum(String(v)).replace(/[^0-9]/g,'');
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
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState('nid');
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
    Keyboard.dismiss();
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
    <ScrollView style={s.wrap} contentContainerStyle={[s.content,{paddingHorizontal:width<360?12:18}]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={s.hero}><View style={s.heroIcon}><MaterialCommunityIcons name="car-search" size={27} color={C.brand}/></View><View style={s.heroCopy}><Text style={s.heroTitle}>جستجوی تاکسی و تاکسیران</Text><Text style={s.heroSub}>جستجوی سریع اطلاعات بر اساس کد ملی یا پلاک</Text></View></View>
      <View style={s.tabs}>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='nid'}} style={[s.tab,mode==='nid'&&s.tabOn]} onPress={()=>{Keyboard.dismiss();setMode('nid')}}><MaterialCommunityIcons name="account-search-outline" size={21} color={mode==='nid'?'#fff':C.brand}/><Text style={[s.tabTxt,mode==='nid'&&s.tabTxtOn]}>کد ملی راننده</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='plate'}} style={[s.tab,mode==='plate'&&s.tabOn]} onPress={()=>{Keyboard.dismiss();setMode('plate')}}><MaterialCommunityIcons name="car-outline" size={21} color={mode==='plate'?'#fff':C.brand}/><Text style={[s.tabTxt,mode==='plate'&&s.tabTxtOn]}>پلاک تاکسی</Text></TouchableOpacity>
      </View>
      {mode==='nid'?<View style={s.sectionCard}>
        <View style={s.sectionHeading}><MaterialCommunityIcons name="card-account-details-outline" size={23} color={C.brand}/><Text style={s.sectionTitle}>جستجو بر اساس کد ملی</Text></View>
        <Text style={s.label}>کد ملی ۱۰ رقمی تاکسیران را وارد کنید</Text>
        <TextInput style={s.nationalInput} value={faNum(nid)} onChangeText={(v)=>setNid(faToEn(v).slice(0,10))} keyboardType="number-pad" maxLength={10} placeholder="۰۰۰۰۰۰۰۰۰۰" placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={()=>doSearch('nid')} selectTextOnFocus />
        <View style={s.helpRow}><MaterialCommunityIcons name="information-outline" size={17} color={C.muted}/><Text style={s.helpText}>کد ملی باید شامل ۱۰ رقم باشد.</Text></View>
        <TouchableOpacity style={[s.btn,busy&&s.btnDisabled]} onPress={()=>doSearch('nid')} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<><MaterialCommunityIcons name="magnify" size={22} color="#fff"/><Text style={s.btnTxt}>جستجوی تاکسیران</Text></>}</TouchableOpacity>
      </View>:<View style={s.sectionCard}>
        <View style={s.sectionHeading}><MaterialCommunityIcons name="card-search-outline" size={23} color={C.brand}/><Text style={s.sectionTitle}>جستجو بر اساس پلاک</Text></View>
        <Text style={s.label}>دو بخش عددی پلاک تاکسی را وارد کنید</Text>
        <View style={[s.plateWrap,{transform:[{scale:Math.min(1,(width-(width<360?54:66))/300)}]}]}>
          <View style={s.plateBody}>
            <TextInput style={s.plateInput} value={faNum(p1)} onChangeText={(v)=>{const d=faToEn(v).slice(0,2);setP1(d);if(d.length===2)p3ref.current?.focus()}} keyboardType="number-pad" maxLength={2} placeholder="۱۱" placeholderTextColor="#776d20" selectTextOnFocus/>
            <Text style={s.plateLetter}>ت</Text>
            <TextInput ref={p3ref} style={[s.plateInput,{width:76}]} value={faNum(p3)} onChangeText={(v)=>setP3(faToEn(v).slice(0,3))} keyboardType="number-pad" maxLength={3} placeholder="۱۱۱" placeholderTextColor="#776d20" returnKeyType="search" onSubmitEditing={()=>doSearch('plate')} selectTextOnFocus/>
            <View style={s.plateRegion}><Text style={s.plateRegionNum}>۱۲</Text><View style={s.plateRegionLine}/></View>
          </View><View style={s.plateFlag}><Text style={s.plateFlagIR}>I.R.</Text><Text style={s.plateFlagIran}>ایران</Text></View>
        </View>
        <View style={s.helpRow}><MaterialCommunityIcons name="information-outline" size={17} color={C.muted}/><Text style={s.helpText}>حرف «ت» و کد منطقه «۱۲» ثابت هستند.</Text></View>
        <TouchableOpacity style={[s.btn,busy&&s.btnDisabled]} onPress={()=>doSearch('plate')} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<><MaterialCommunityIcons name="magnify" size={22} color="#fff"/><Text style={s.btnTxt}>جستجوی تاکسی</Text></>}</TouchableOpacity>
      </View>}
      <View style={s.bottomHint}><MaterialCommunityIcons name="database-sync-outline" size={19} color={C.brand}/><Text style={s.bottomText}>در صورت اختلال اتصال، جستجو در اطلاعات ذخیره‌شده دستگاه نیز انجام می‌شود.</Text></View>
    </ScrollView>
  );
}

const s=StyleSheet.create({
 wrap:{flex:1,backgroundColor:C.paper},
 content:{paddingTop:20,paddingBottom:45},
 hero:{flexDirection:'row-reverse',alignItems:'center',gap:12,marginBottom:19},
 heroIcon:{width:54,height:54,borderRadius:17,backgroundColor:'#e5f3eb',alignItems:'center',justifyContent:'center'},
 heroCopy:{flex:1,alignItems:'flex-end'},
 heroTitle:{fontFamily:FONT.bold,fontSize:18,color:C.ink,textAlign:'right'},
 heroSub:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:5,lineHeight:20},
 tabs:{flexDirection:'row-reverse',gap:9,backgroundColor:'#eaf0ee',padding:5,borderRadius:16,marginBottom:14},
 tab:{flex:1,minWidth:0,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:6,paddingVertical:13,borderRadius:12},
 tabOn:{backgroundColor:C.brand,elevation:2},
 tabTxt:{fontFamily:FONT.bold,fontSize:12.5,color:C.ink,textAlign:'center',flexShrink:1},
 tabTxtOn:{color:'#fff'},
 sectionCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:19,padding:16,elevation:1},
 sectionHeading:{flexDirection:'row-reverse',alignItems:'center',gap:9,marginBottom:16},
 sectionTitle:{fontFamily:FONT.bold,fontSize:15,color:C.ink,textAlign:'right',flex:1},
 label:{fontFamily:FONT.regular,fontSize:12.5,color:C.slate,textAlign:'right',marginBottom:10,lineHeight:21},
 nationalInput:{width:'100%',height:62,backgroundColor:'#f8fafb',borderWidth:1,borderColor:C.line,borderRadius:14,textAlign:'center',fontFamily:FONT.bold,fontSize:23,color:C.ink,letterSpacing:2,writingDirection:'ltr'},
 helpRow:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginTop:13,marginBottom:4},
 helpText:{fontFamily:FONT.regular,fontSize:11.5,color:C.muted,textAlign:'right',flex:1,lineHeight:20},
 btn:{backgroundColor:C.brand,borderRadius:13,minHeight:54,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:10,marginTop:16,padding:13},
 btnDisabled:{opacity:.65},
 btnTxt:{fontFamily:FONT.bold,fontSize:15,color:'#fff'},
 plateWrap:{flexDirection:'row',direction:'ltr',alignItems:'stretch',alignSelf:'center',height:76,borderRadius:11,overflow:'hidden',borderWidth:2,borderColor:'#202020',marginVertical:12},
 plateBody:{flexDirection:'row',direction:'ltr',alignItems:'center',backgroundColor:'#f5c518',paddingHorizontal:9,gap:4},
 plateInput:{width:58,height:62,textAlign:'center',fontFamily:FONT.bold,color:'#161616',fontSize:29,padding:0,writingDirection:'ltr'},
 plateLetter:{fontFamily:FONT.bold,color:'#161616',fontSize:26,marginHorizontal:2},
 plateRegion:{alignItems:'center',justifyContent:'center',marginRight:3,borderLeftWidth:1.5,borderLeftColor:'#161616',paddingLeft:8,height:50},
 plateRegionNum:{fontFamily:FONT.bold,color:'#161616',fontSize:22},
 plateRegionLine:{width:28,height:2,backgroundColor:'#161616',marginTop:2},
 plateFlag:{backgroundColor:'#0a3d91',width:42,alignItems:'center',justifyContent:'center',paddingVertical:6},
 plateFlagIR:{color:'#fff',fontFamily:FONT.bold,fontSize:11},
 plateFlagIran:{color:'#fff',fontFamily:FONT.bold,fontSize:12,marginTop:4},
 bottomHint:{flexDirection:'row-reverse',alignItems:'flex-start',gap:9,marginTop:18,paddingHorizontal:6},
 bottomText:{fontFamily:FONT.regular,fontSize:11.5,color:C.muted,textAlign:'right',flex:1,lineHeight:21}
});
