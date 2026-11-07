import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Keyboard, useWindowDimensions } from 'react-native';
import { request } from '../api';
import { refreshSearchCache, offlineSearch } from '../linecache';
import { C, FONT } from '../theme';
import { enNum, faNum } from '../num';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TaxiPlate from '../components/TaxiPlate';
import { openDrawer } from '../drawerControl';
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
  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);


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
        Alert.alert('حالت آفلاین', 'اطلاعات از آخرین داده‌های ذخیره‌شده نمایش داده می‌شود و ممکن است قدیمی یا ناقص باشد.');
        // Cached results may be vehicles or drivers; never show a vehicle as a driver.
        const first = kind === 'plate' ? (found.find(item => item.offline_type === 'vehicle') || found[0]) : (found.find(item => item.offline_type !== 'vehicle') || found[0]);
        if (first.offline_type === 'vehicle') navigation.navigate('Vehicle', { vehicle: normalizeVehicle(first), drivers: [], offline: true });
        else navigation.navigate('Driver', { driver: normalizeDriver(first) || {}, vehicle: {}, warnings: [], offline: true });
      } else Alert.alert('یافت نشد', e.message + '\n(در کش آفلاین نیز یافت نشد)');
    } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={[s.content,{paddingHorizontal:width<360?12:18}]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={s.hero}>
        <View style={s.heroHighlight} />
        <View style={s.heroNav}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="باز کردن منو" style={s.heroNavButton} onPress={openDrawer}><MaterialCommunityIcons name="menu" size={25} color="#fff" /></TouchableOpacity>
          <View style={s.heroBrand}><Text style={s.heroBrandTitle}>خطیار</Text><Text style={s.heroBrandSub}>جستجوی اطلاعات</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="بازگشت" style={s.heroNavButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')}><MaterialCommunityIcons name="arrow-right" size={24} color="#fff" /></TouchableOpacity>
        </View>
        <View style={s.heroIcon}><MaterialCommunityIcons name="car-search" size={36} color="#e2fff3" /></View>
        <Text accessibilityRole="header" style={s.heroTitle}>جستجوی تاکسی و تاکسیران</Text>
        <Text style={s.heroSub}>استعلام سریع و هوشمند</Text>
      </View>
      <View style={s.tabs}>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='nid'}} style={[s.tab,mode==='nid'&&s.tabOn]} onPress={()=>{Keyboard.dismiss();setMode('nid')}}><MaterialCommunityIcons name="account-search-outline" size={21} color={mode==='nid'?'#fff':C.brand}/><Text style={[s.tabTxt,mode==='nid'&&s.tabTxtOn]}>کد ملی راننده</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='plate'}} style={[s.tab,mode==='plate'&&s.tabOn]} onPress={()=>{Keyboard.dismiss();setMode('plate')}}><MaterialCommunityIcons name="car-outline" size={21} color={mode==='plate'?'#fff':C.brand}/><Text style={[s.tabTxt,mode==='plate'&&s.tabTxtOn]}>پلاک تاکسی</Text></TouchableOpacity>
      </View>
      {mode==='nid'?<View style={s.sectionCard}>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><MaterialCommunityIcons name="account-search-outline" size={24} color={C.brand}/></View><Text style={s.sectionTitle}>استعلام مشخصات تاکسیران</Text></View>
        <Text style={s.label}>کد ملی ۱۰ رقمی تاکسیران را وارد کنید</Text>
        <TextInput style={s.nationalInput} value={faNum(nid)} onChangeText={(v)=>setNid(faToEn(v).slice(0,10))} keyboardType="number-pad" maxLength={10} placeholder="۰۰۰۰۰۰۰۰۰۰" placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={()=>doSearch('nid')} selectTextOnFocus />
        <View style={s.helpRow}><MaterialCommunityIcons name="information-outline" size={17} color={C.muted}/><Text style={s.helpText}>کد ملی باید شامل ۱۰ رقم باشد.</Text></View>
        <TouchableOpacity style={[s.btn,busy&&s.btnDisabled]} onPress={()=>doSearch('nid')} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<><MaterialCommunityIcons name="magnify" size={22} color="#fff"/><Text style={s.btnTxt}>جستجوی تاکسیران</Text></>}</TouchableOpacity>
      </View>:<View style={s.sectionCard}>
        <View style={s.sectionHeading}><View style={s.sectionIcon}><MaterialCommunityIcons name="car-search" size={24} color={C.brand}/></View><Text style={s.sectionTitle}>استعلام خودرو با پلاک</Text></View>
        <Text style={s.label}>دو بخش عددی پلاک تاکسی را وارد کنید</Text>
        <TaxiPlate editable first={p1} middle={p3} middleRef={p3ref} region="۱۲" onFirstChange={d=>{setP1(d);if(d.length===2)p3ref.current?.focus()}} onMiddleChange={setP3} onMiddleSubmit={()=>doSearch('plate')}/>
        <View style={s.helpRow}><MaterialCommunityIcons name="information-outline" size={17} color={C.muted}/><Text style={s.helpText}>حرف «ت» و کد منطقه «۱۲» ثابت هستند.</Text></View>
        <TouchableOpacity style={[s.btn,busy&&s.btnDisabled]} onPress={()=>doSearch('plate')} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<><MaterialCommunityIcons name="magnify" size={22} color="#fff"/><Text style={s.btnTxt}>جستجوی تاکسی</Text></>}</TouchableOpacity>
      </View>}
      <View style={s.bottomHint}><MaterialCommunityIcons name="database-sync-outline" size={24} color={C.brand}/><Text style={s.bottomText}>در صورت قطع اینترنت، جستجو در اطلاعات ذخیره‌شده دستگاه نیز انجام می‌شود.</Text></View>
    </ScrollView>
  );
}

const s=StyleSheet.create({
 wrap:{flex:1,backgroundColor:'#edf8f5'},
 content:{paddingTop:12,paddingBottom:45},
 hero:{backgroundColor:'#075d4b',borderRadius:23,paddingHorizontal:16,paddingTop:14,paddingBottom:23,marginBottom:14,alignItems:'center',overflow:'hidden',borderBottomWidth:3,borderBottomColor:'#16a97d',elevation:4,shadowColor:'#075d4b',shadowOpacity:.17,shadowRadius:13},
 heroHighlight:{position:'absolute',top:-75,left:-40,width:240,height:155,borderRadius:100,transform:[{rotate:'-18deg'}],backgroundColor:'rgba(37,210,149,.14)'},
 heroNav:{width:'100%',flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginBottom:4},
 heroNavButton:{width:46,height:46,borderRadius:14,backgroundColor:'rgba(255,255,255,.12)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},
 heroBrand:{alignItems:'center'},
 heroBrandTitle:{fontFamily:FONT.bold,fontSize:24,color:'#fff',lineHeight:32},
 heroBrandSub:{fontFamily:FONT.regular,fontSize:11,color:'#cceee4'},
 heroIcon:{width:69,height:58,alignItems:'center',justifyContent:'center',marginTop:4},
 heroTitle:{fontFamily:FONT.bold,fontSize:21,color:'#fff',textAlign:'center',lineHeight:34},
 heroSub:{fontFamily:FONT.regular,fontSize:13,color:'#d6f9ec',textAlign:'center',marginTop:2,lineHeight:22},
 tabs:{flexDirection:'row-reverse',gap:6,backgroundColor:'#dff5eb',padding:5,borderRadius:19,marginBottom:16,borderWidth:1,borderColor:'#b4ddce'},
 tab:{flex:1,minWidth:0,minHeight:51,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:5,paddingVertical:11,borderRadius:14},
 tabOn:{backgroundColor:'#08725a',elevation:3},
 tabTxt:{fontFamily:FONT.bold,fontSize:12.5,color:'#134a3e',textAlign:'center',flexShrink:1},
 tabTxtOn:{color:'#fff'},
 sectionCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#bfe3d6',borderRadius:22,padding:17,elevation:3,shadowColor:'#0b604a',shadowOpacity:.08,shadowRadius:12},
 sectionHeading:{flexDirection:'row-reverse',alignItems:'center',gap:9,marginBottom:20,paddingBottom:12,borderBottomWidth:1,borderBottomColor:'#d8f1e6'},
 sectionIcon:{width:44,height:44,borderRadius:14,backgroundColor:'#dff7eb',alignItems:'center',justifyContent:'center'},
 sectionTitle:{fontFamily:FONT.bold,fontSize:16,color:C.ink,textAlign:'right',flex:1},
 label:{fontFamily:FONT.bold,fontSize:13,color:C.slate,textAlign:'right',marginBottom:10,lineHeight:22},
 nationalInput:{width:'100%',height:66,backgroundColor:'#f1faf7',borderWidth:1.5,borderColor:'#6ccab0',borderRadius:15,textAlign:'center',fontFamily:FONT.bold,fontSize:24,color:C.ink,letterSpacing:2,writingDirection:'ltr'},
 helpRow:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginTop:13,marginBottom:4},
 helpText:{fontFamily:FONT.regular,fontSize:11.5,color:C.muted,textAlign:'right',flex:1,lineHeight:20},
 btn:{backgroundColor:'#08775c',borderRadius:15,minHeight:58,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:10,marginTop:18,padding:13,elevation:3,shadowColor:'#075d4b',shadowOpacity:.2,shadowRadius:8},
 btnDisabled:{opacity:.65},
 btnTxt:{fontFamily:FONT.bold,fontSize:15,color:'#fff'},
 bottomHint:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginTop:18,paddingHorizontal:14,paddingVertical:15,borderRadius:18,backgroundColor:'#dcf5eb',borderWidth:1,borderColor:'#c3eadb'},
 bottomText:{fontFamily:FONT.regular,fontSize:12,color:'#24584b',textAlign:'right',flex:1,lineHeight:23}
});
