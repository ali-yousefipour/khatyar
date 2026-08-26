import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';

const mapHtml = (lat, lng) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#m{margin:0;width:100%;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%}</style></head><body><div id="m"><iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - .008}%2C${lat - .006}%2C${lng + .008}%2C${lat + .006}&layer=mapnik&marker=${lat}%2C${lng}"></iframe></div></body></html>`;

export default function LineLocationScreen() {
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState({ allowed: false, can_view: false, can_manage: false });
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState('');
  const [query, setQuery] = useState('');
  const [stationName, setStationName] = useState('');
  const [coords, setCoords] = useState(null);
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleSaving, setRoleSaving] = useState(null);

  const selectedLine = useMemo(() => lines.find(x => String(x.id) === String(lineId)), [lines, lineId]);
  const filteredLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lines.slice(0, 60);
    return lines.filter(x => `${x.code || ''} ${x.origin || ''} ${x.destination || ''}`.toLowerCase().includes(q)).slice(0, 60);
  }, [lines, query]);

  useEffect(() => { boot(); }, []);

  async function boot() {
    try {
      const p = await request('/line-location-api.php?op=permission', { noStore: true });
      setPermission(p);
      if (!p.allowed && !p.can_view) throw new Error('برای سمت فعلی شما دسترسی ثبت/مشاهده موقعیت خطوط فعال نشده است.');
      const l = await request('/line-location-api.php?op=lines', { noStore: true });
      setLines(Array.isArray(l) ? l : []);
      if (p.can_manage) {
        const r = await request('/line-location-api.php?op=roles', { noStore: true });
        setRoles(Array.isArray(r) ? r : []);
      }
    } catch (e) {
      Alert.alert('خطیار', e.message || 'دریافت اطلاعات ناموفق بود.');
    } finally { setLoading(false); }
  }

  async function getGps() {
    try {
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        Alert.alert('GPS خاموش است', 'ابتدا GPS گوشی را روشن کنید.');
        return;
      }
      let p = await Location.getForegroundPermissionsAsync();
      if (p.status !== 'granted') p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') {
        Alert.alert('دسترسی GPS', 'دسترسی موقعیت مکانی برای ثبت ایستگاه لازم است.', [{ text: 'تنظیمات', onPress: () => Linking.openSettings() }, { text: 'لغو', style: 'cancel' }]);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, mayShowUserSettingsDialog: true });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy });
    } catch (e) { Alert.alert('خطای GPS', e.message || 'دریافت موقعیت انجام نشد.'); }
  }

  async function takePhoto(setter, label) {
    try {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (p.status !== 'granted') {
        Alert.alert('دوربین', `دسترسی دوربین برای ${label} لازم است.`);
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: .72, base64: true, exif: false });
      if (!r.canceled && r.assets?.[0]?.base64) setter(`data:image/jpeg;base64,${r.assets[0].base64}`);
    } catch (e) { Alert.alert('دوربین', e.message || 'ثبت تصویر ناموفق بود.'); }
  }

  async function loadHistory(id) {
    if (!id || !permission.can_view) return;
    try { const h = await request(`/line-location-api.php?op=history&line_id=${encodeURIComponent(id)}`, { noStore: true }); setHistory(Array.isArray(h) ? h : []); } catch (_) { setHistory([]); }
  }

  function chooseLine(x) { setLineId(String(x.id)); setQuery(`${x.code || ''} — ${x.origin || ''} ← ${x.destination || ''}`); loadHistory(x.id); }

  async function save() {
    if (!permission.allowed) return Alert.alert('دسترسی', 'شما مجوز ثبت موقعیت خطوط را ندارید.');
    if (!selectedLine || !coords || !photo1 || !photo2) return Alert.alert('اطلاعات ناقص', 'خط، GPS، تصویر محل خط و تصویر تابلو ایستگاه الزامی است.');
    setSaving(true);
    try {
      const r = await request('/line-location-api.php?op=capture', { method: 'POST', body: { line_id: Number(lineId), station_name: stationName.trim(), latitude: coords.latitude, longitude: coords.longitude, accuracy_m: coords.accuracy, location_photo: photo1, sign_photo: photo2 }, timeoutMs: 60000 });
      Alert.alert('ثبت شد', `موقعیت خط ${r.line_code} با موفقیت بروزرسانی شد.`);
      setLines(prev => prev.map(x => String(x.id) === String(lineId) ? { ...x, latitude: r.latitude, longitude: r.longitude, location_accuracy_m: r.accuracy_m, location_photo_path: r.location_photo, station_sign_photo_path: r.sign_photo, location_updated_at: r.updated_at } : x));
      setPhoto1(null); setPhoto2(null); setStationName(''); await loadHistory(lineId);
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت موقعیت ناموفق بود.'); }
    finally { setSaving(false); }
  }

  async function saveRole(x) {
    setRoleSaving(x.id);
    try { await request('/line-location-api.php?op=save-role', { method: 'POST', body: x, noStore: true }); }
    catch (e) { Alert.alert('خطا', e.message || 'ذخیره مجوز ناموفق بود.'); }
    finally { setRoleSaving(null); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={C.brand} /><Text style={s.muted}>در حال دریافت اطلاعات ثبت ایستگاه…</Text></View>;
  if (!permission.allowed && !permission.can_view) return <View style={s.center}><Text style={s.title}>ثبت موقعیت و تصویر خطوط</Text><Text style={s.muted}>دسترسی این قابلیت برای سمت شما فعال نشده است.</Text></View>;

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.card}><Text style={s.title}>ثبت موقعیت و تصویر خطوط</Text><Text style={s.muted}>GPS دقیق ایستگاه، تصویر محل خط و تصویر تابلو ایستگاه در سوابق خط ثبت می‌شود.</Text></View>
    {permission.allowed && <>
      <View style={s.card}>
        <Text style={s.label}>جستجو و انتخاب شماره خط</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="شماره خط، مبدا یا مقصد" placeholderTextColor={C.muted} style={s.input} />
        <View style={s.lineList}>{filteredLines.map(x => <TouchableOpacity key={x.id} style={[s.lineItem, String(x.id) === String(lineId) && s.lineItemOn]} onPress={() => chooseLine(x)}><Text style={s.lineCode}>{x.code}</Text><Text style={s.lineText}>{x.origin || '—'} ← {x.destination || '—'}</Text></TouchableOpacity>)}</View>
        {selectedLine && <Text style={s.selected}>خط انتخاب‌شده: {selectedLine.code}</Text>}
        <TextInput value={stationName} onChangeText={setStationName} placeholder="نام/عنوان ایستگاه (اختیاری)" placeholderTextColor={C.muted} style={s.input} />
      </View>
      <View style={s.card}>
        <TouchableOpacity style={s.gps} onPress={getGps}><Text style={s.gpsText}>📍 دریافت موقعیت دقیق از GPS گوشی</Text></TouchableOpacity>
        {coords ? <><View style={s.coordRow}><Text style={s.coord}>عرض: {coords.latitude.toFixed(7)}</Text><Text style={s.coord}>طول: {coords.longitude.toFixed(7)}</Text><Text style={s.coord}>دقت: {Math.round(coords.accuracy || 0)} متر</Text></View><WebView originWhitelist={['*']} source={{ html: mapHtml(coords.latitude, coords.longitude) }} style={s.map} /></> : <Text style={s.muted}>هنوز موقعیت دریافت نشده است.</Text>}
      </View>
      <View style={s.card}><View style={s.photos}><PhotoBox label="تصویر محل خط" value={photo1} onPress={() => takePhoto(setPhoto1, 'تصویر محل خط')} /><PhotoBox label="تصویر تابلو ایستگاه" value={photo2} onPress={() => takePhoto(setPhoto2, 'تصویر تابلو ایستگاه')} /></View></View>
      <View style={s.card}><TouchableOpacity style={[s.save, saving && s.disabled]} disabled={saving} onPress={save}><Text style={s.saveText}>{saving ? 'در حال ثبت…' : 'ثبت و بروزرسانی اطلاعات خط'}</Text></TouchableOpacity></View>
    </>}
    {permission.can_view && selectedLine && <View style={s.card}><Text style={s.section}>سوابق ثبت موقعیت خط {selectedLine.code}</Text>{history.length ? history.map(h => <View key={h.id} style={s.history}><Text style={s.historyTitle}>{h.station_name || 'ایستگاه بدون عنوان'}</Text><Text style={s.muted}>{h.latitude}, {h.longitude} • دقت {h.accuracy_m ? `${Math.round(h.accuracy_m)} متر` : '—'}</Text><Text style={s.muted}>{h.captured_at || ''}</Text></View>) : <Text style={s.muted}>سابقه‌ای ثبت نشده است.</Text>}</View>}
    {permission.can_manage && roles.length > 0 && <View style={s.card}><Text style={s.section}>مدیریت دسترسی ثبت موقعیت بر اساس سمت</Text>{roles.map(r => <View key={r.id} style={s.roleRow}><Text style={s.roleName}>{r.title}</Text><Toggle label="ثبت" value={!!Number(r.can_capture)} onPress={() => saveRole({ ...r, can_capture: !Number(r.can_capture) })} /><Toggle label="مشاهده" value={!!Number(r.can_view)} onPress={() => saveRole({ ...r, can_view: !Number(r.can_view) })} /><Toggle label="مدیریت" value={!!Number(r.can_manage)} onPress={() => saveRole({ ...r, can_manage: !Number(r.can_manage) })} /></View>)}</View>}
  </ScrollView>;
}

function PhotoBox({ label, value, onPress }) { return <View style={s.photoBox}><Text style={s.label}>{label}</Text>{value ? <Image source={{ uri: value }} style={s.photo} /> : <View style={s.photoEmpty}><Text style={s.muted}>تصویری انتخاب نشده</Text></View>}<TouchableOpacity style={s.camera} onPress={onPress}><Text style={s.cameraText}>{value ? '📷 گرفتن مجدد' : '📷 گرفتن تصویر'}</Text></TouchableOpacity></View>; }
function Toggle({ label, value, onPress }) { return <TouchableOpacity onPress={onPress} style={[s.toggle, value && s.toggleOn]}><Text style={[s.toggleText, value && s.toggleTextOn]}>{label}: {value ? 'فعال' : 'خاموش'}</Text></TouchableOpacity>; }

const s = StyleSheet.create({ page:{flex:1,backgroundColor:C.paper},content:{padding:12,paddingBottom:28},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:C.paper},card:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:C.line,padding:14,marginBottom:10},title:{fontFamily:FONT.bold,fontSize:18,color:C.ink,textAlign:'right',marginBottom:6},section:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right',marginBottom:10},muted:{fontFamily:FONT.regular,fontSize:11,color:C.muted,textAlign:'right',lineHeight:19},label:{fontFamily:FONT.bold,fontSize:12,color:C.ink,textAlign:'right',marginBottom:6},input:{borderWidth:1,borderColor:C.line,borderRadius:12,padding:11,fontFamily:FONT.regular,fontSize:12,color:C.ink,textAlign:'right',marginBottom:8},lineList:{maxHeight:220},lineItem:{padding:10,borderBottomWidth:1,borderBottomColor:C.line,alignItems:'flex-end'},lineItemOn:{backgroundColor:'#eaf7f0'},lineCode:{fontFamily:FONT.bold,fontSize:13,color:C.brand},lineText:{fontFamily:FONT.regular,fontSize:11,color:C.muted,marginTop:2},selected:{fontFamily:FONT.bold,fontSize:12,color:C.brand,textAlign:'right',marginBottom:8},gps:{backgroundColor:'#f7c600',borderRadius:12,padding:13,alignItems:'center'},gpsText:{fontFamily:FONT.bold,color:'#332900',fontSize:12},coordRow:{gap:7,marginVertical:10},coord:{fontFamily:FONT.regular,fontSize:11,color:C.ink,textAlign:'right'},map:{height:250,borderRadius:14,overflow:'hidden'},photos:{gap:10},photoBox:{minHeight:220,borderWidth:1,borderStyle:'dashed',borderColor:'#c9d0dc',borderRadius:14,padding:8},photo:{width:'100%',height:170,borderRadius:10},photoEmpty:{height:170,alignItems:'center',justifyContent:'center',backgroundColor:'#fafbfe',borderRadius:10},camera:{backgroundColor:'#f7c600',borderRadius:10,padding:10,alignItems:'center',marginTop:8},cameraText:{fontFamily:FONT.bold,fontSize:11,color:'#332900'},save:{backgroundColor:C.brand,borderRadius:12,padding:14,alignItems:'center'},disabled:{opacity:.55},saveText:{fontFamily:FONT.bold,color:'#fff',fontSize:13},history:{borderTopWidth:1,borderTopColor:C.line,paddingVertical:9},historyTitle:{fontFamily:FONT.bold,fontSize:12,color:C.ink,textAlign:'right',marginBottom:2},roleRow:{borderTopWidth:1,borderTopColor:C.line,paddingVertical:9},roleName:{fontFamily:FONT.bold,fontSize:12,color:C.ink,textAlign:'right',marginBottom:7},toggle:{alignSelf:'flex-end',borderWidth:1,borderColor:C.line,borderRadius:9,paddingVertical:7,paddingHorizontal:10,marginLeft:5,marginBottom:5},toggleOn:{backgroundColor:C.brand,borderColor:C.brand},toggleText:{fontFamily:FONT.bold,fontSize:10,color:C.muted},toggleTextOn:{color:'#fff'}});
