import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, RefreshControl, useWindowDimensions } from 'react-native';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import { jToday } from '../jdate';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const todayObj = () => { const [jy, jm, jd] = jToday(); return { jy, jm, jd }; };
const jdateToString = (d) => `${d?.jy}/${String(d?.jm).padStart(2, '0')}/${String(d?.jd).padStart(2, '0')}`;

export default function WelfareScreen({ route }) {
  const { width } = useWindowDimensions();
  const presetDriver = route?.params?.driver || null;
  const lockedToDriver = !!presetDriver?.national_id;
  const [items, setItems] = useState([]);
  const [places, setPlaces] = useState([]);
  const [nid, setNid] = useState(presetDriver?.national_id || '');
  const [driver, setDriver] = useState(presetDriver);
  const [itemId, setItemId] = useState(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [placeId, setPlaceId] = useState(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [gdate, setGdate] = useState(todayObj());
  const [pickDate, setPickDate] = useState(false);
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const [driverList, setDriverList] = useState(null); // تاریخچهٔ همین راننده (در حالت ورود از پروفایل راننده)
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  const loadList = async () => {
    try { const rows = await request('/my/welfare-grants', { noStore: true }); setList(rows); setLoadError(''); }
    catch (e) { setLoadError(e?.message || 'دریافت سوابق رفاهیات ناموفق بود.'); }
  };
  const loadDriverList = (natId) => {
    if (!natId) return;
    return request('/my/driver-welfare?national_id=' + encodeURIComponent(natId), { noStore: true }).then(setDriverList).catch((e) => { setLoadError(e?.message || 'دریافت سوابق راننده ناموفق بود.'); });
  };
  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([request('/my/welfare-items', { noStore: true }), request('/my/welfare-places', { noStore: true })])
      .then(([t, pl]) => { setItems(t || []); setPlaces(pl || []); })
      .catch((e) => setLoadError(e?.message || 'دریافت گزینه‌های رفاهیات ناموفق بود.'))
      .finally(() => setLoadingOptions(false));
    loadList();
    if (presetDriver?.national_id) loadDriverList(presetDriver.national_id);
  }, []);

  const onRefresh = async () => { setRefreshing(true); try { await Promise.all([loadList(), driver?.national_id ? loadDriverList(driver.national_id) : Promise.resolve()]); } finally { setRefreshing(false); } };

  const lookup = async () => {
    const n = (driver?.national_id || nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    try {
      const r = await request('/search?national_id=' + n);
      if (r.type === 'driver') { setDriver(r.driver); loadDriverList(n); }
      else Alert.alert('یافت نشد', 'راننده‌ای با این کد ملی پیدا نشد.');
    } catch (e) { setDriver(null); Alert.alert('خطای جستجو', e?.message || 'جستجوی راننده انجام نشد.'); }
  };

  const submit = async () => {
    const n = (driver?.national_id || nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    if (!itemId) return Alert.alert('توجه', 'نوع رفاهیت را انتخاب کنید.');
    const quantity = Number(count);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) return Alert.alert('تعداد نامعتبر', 'تعداد را به‌صورت عدد صحیح بین ۱ تا ۱۰۰۰۰ وارد کنید.');
    setBusy(true);
    try {
      const body = {
        item_id: itemId.id, driver_national_id: n,
        place_id: placeId?.id || null,
        granted_jdate: jdateToString(gdate),
        count: quantity, note,
      };
      const r = await postOrQueue('/my/welfare-grants', body);
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'رفاهیت ذخیره شد و بعد از اتصال با تاریخ همین لحظه ارسال می‌شود.' : `رفاهیت برای ${r.driver_name || 'راننده'} ثبت شد.`);
      setItemId(null); setPlaceId(null); setCount('1'); setNote('');
      loadList();
      loadDriverList(n); // به‌روزرسانی تاریخچهٔ همین راننده
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق بود.'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: width < 360 ? 11 : 16, paddingBottom: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.brand]} />}>
      <View style={s.header}><View style={s.headerIcon}><MaterialCommunityIcons name="gift-outline" size={27} color={C.brand}/></View><View style={s.headerCopy}><Text style={s.h}>ثبت تحویل رفاهیت به راننده</Text><Text style={s.headerSub}>ثبت خدمات رفاهی و مشاهده سوابق تحویل</Text></View></View>
      {!!loadError && <View style={s.errorBox}><Text style={s.errorText}>{loadError}</Text><TouchableOpacity accessibilityRole="button" style={s.retryBtn} onPress={onRefresh}><Text style={s.retryTxt}>تلاش مجدد</Text></TouchableOpacity></View>}

      <View style={s.formCard}>
      {!lockedToDriver && (<>
        <Text style={s.label}>کد ملی راننده</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <TextInput style={[s.input, { flex: 1 }]} dir="ltr" keyboardType="number-pad" maxLength={10} value={nid} onChangeText={(v) => { setNid(v); setDriver(null); setDriverList(null); }} placeholder="کد ملی" placeholderTextColor={C.muted} />
          <TouchableOpacity style={s.lookupBtn} onPress={lookup}><Text style={s.lookupTxt}>🔍 فراخوان</Text></TouchableOpacity>
        </View>
      </>)}
      {driver && (
        <View style={s.driverBox}><View style={s.driverAvatar}><MaterialCommunityIcons name="account-tie-outline" size={24} color={C.brand}/></View><View style={s.driverInfo}>
          <Text style={s.driverName}>{driver.first_name} {driver.last_name}</Text>
          <Text style={s.driverMeta}>موبایل: {faNum(driver.mobile || '—')} · نوع: {driver.driver_type || '—'}</Text></View>
        </View>
      )}

      <View style={s.sectionHeading}><MaterialCommunityIcons name="gift-open-outline" size={20} color={C.brand}/><Text style={s.sectionTitle}>مشخصات رفاهیت</Text></View><Text style={[s.label, { marginTop: 12 }]}>نوع رفاهیت</Text>
      <TouchableOpacity style={s.select} onPress={() => setItemOpen(true)} disabled={loadingOptions}>
        <Text style={[s.selectTxt, !itemId && { color: C.muted }]}>{itemId ? itemId.title : loadingOptions ? 'در حال دریافت گزینه‌ها…' : 'انتخاب نوع رفاهیت'}</Text><MaterialCommunityIcons name="chevron-down" size={22} color={C.brand}/>
      </TouchableOpacity>

      {places.length > 0 && (
        <>
          <Text style={[s.label, { marginTop: 12 }]}>مکان ارائه (استخر/مرکز)</Text>
          <TouchableOpacity style={s.select} onPress={() => setPlaceOpen(true)}>
            <Text style={[s.selectTxt, !placeId && { color: C.muted }]}>{placeId ? placeId.title : 'انتخاب مکان (اختیاری)'}</Text><MaterialCommunityIcons name="chevron-down" size={22} color={C.brand}/>
          </TouchableOpacity>
        </>
      )}

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <View style={{ flexGrow: 1, flexBasis: width < 360 ? '100%' : '44%' }}>
          <Text style={s.label}>تاریخ تحویل</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickDate(true)}>
            <Text style={s.selectTxt}>{gdate ? faNum(jLabel(gdate.jy, gdate.jm, gdate.jd)) : 'انتخاب'}</Text><MaterialCommunityIcons name="calendar-month-outline" size={20} color={C.brand}/>
          </TouchableOpacity>
        </View>
        <View style={{ flexGrow: 1, flexBasis: width < 360 ? '100%' : '44%' }}>
          <Text style={s.label}>تعداد</Text>
          <TextInput style={s.input} keyboardType="number-pad" value={count} onChangeText={setCount} />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>توضیحات (اختیاری)</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline placeholder="توضیح…" placeholderTextColor={C.muted} />

      <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}><MaterialCommunityIcons name="content-save-check-outline" size={21} color="#fff"/>
        <Text style={s.submitTxt}>{busy ? 'در حال ثبت…' : 'ثبت تحویل رفاهیت'}</Text>
      </TouchableOpacity>
      </View>

      {driver && (
        <>
          <View style={s.listHeading}><MaterialCommunityIcons name="account-check-outline" size={21} color={C.brand}/><Text style={s.listTitle}>رفاهیات دریافتی این راننده</Text><Text style={s.listCount}>{faNum(driverList?.length || 0)} مورد</Text></View>
          {driverList === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 12 }} /> :
            driverList.length === 0 ? <Text style={s.empty}>این راننده تاکنون رفاهیتی دریافت نکرده است.</Text> :
            [...driverList].sort((a,b)=>String(b.granted_jdate||'').localeCompare(String(a.granted_jdate||''))).map((w) => (
              <View key={w.id} style={s.card}>
                <View style={s.cardTop}><View style={s.cardIcon}><MaterialCommunityIcons name="gift-outline" size={21} color={C.brand}/></View><View style={s.cardMain}>
                  <Text style={s.cardTitle}>{w.item_title}{w.count > 1 ? ` × ${faNum(w.count)}` : ''}</Text>
                  </View><View style={s.dateBadge}><MaterialCommunityIcons name="calendar-outline" size={14} color={C.brand}/><Text style={s.cardDate}>{faNum(w.granted_jdate)}</Text></View></View>
                {!!w.place_title && <Text style={s.cardMeta}>{w.place_title}</Text>}
                {!!w.note && <Text style={s.cardNote}>{w.note}</Text>}
                {!!w.granted_by_name && <Text style={s.cardNote}>ثبت‌کننده: {w.granted_by_name}</Text>}
              </View>
            ))}
        </>
      )}

      <View style={s.listHeading}><MaterialCommunityIcons name="clipboard-list-outline" size={21} color={C.brand}/><Text style={s.listTitle}>رفاهیات ثبت‌شدهٔ من</Text><Text style={s.listCount}>{faNum(list?.length || 0)} مورد</Text></View>
      {list === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 16 }} /> :
        list.length === 0 ? <Text style={s.empty}>هنوز رفاهیتی ثبت نکرده‌اید.</Text> :
        [...list].sort((a,b)=>String(b.granted_jdate||'').localeCompare(String(a.granted_jdate||''))).map((w) => (
          <View key={w.id} style={s.card}>
            <View style={s.cardTop}><View style={s.cardIcon}><MaterialCommunityIcons name="gift-outline" size={21} color={C.brand}/></View><View style={s.cardMain}>
              <Text style={s.cardTitle}>{w.item_title}{w.count > 1 ? ` × ${faNum(w.count)}` : ''}</Text>
              </View><View style={s.dateBadge}><MaterialCommunityIcons name="calendar-outline" size={14} color={C.brand}/><Text style={s.cardDate}>{faNum(w.granted_jdate)}</Text></View></View>
            <Text style={s.cardMeta}>{w.driver_name || w.driver_national_id}{w.place_title ? ` · ${w.place_title}` : ''}</Text>
            {!!w.note && <Text style={s.cardNote}>{w.note}</Text>}
          </View>
        ))}

      <JDatePicker visible={pickDate} onClose={() => setPickDate(false)} initial={gdate}
        onSelect={(d) => setGdate({ jy: d.jy, jm: d.jm, jd: d.jd })} />

      <Modal visible={itemOpen} transparent animationType="slide" onRequestClose={() => setItemOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب نوع رفاهیت</Text>
            <ScrollView persistentScrollbar={true} style={{ maxHeight: 380 }}>
              {items.length === 0 ? <Text style={s.empty}>نوع رفاهیتی تعریف نشده است.</Text> :
                items.map((t) => (
                  <TouchableOpacity key={t.id} style={s.typeRow} onPress={() => { setItemId(t); setItemOpen(false); }}>
                    <Text style={s.typeTxt}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setItemOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={placeOpen} transparent animationType="slide" onRequestClose={() => setPlaceOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب مکان ارائه</Text>
            <ScrollView persistentScrollbar={true} style={{ maxHeight: 380 }}>
              <TouchableOpacity style={s.typeRow} onPress={() => { setPlaceId(null); setPlaceOpen(false); }}>
                <Text style={s.typeTxt}>بدون مکان</Text>
              </TouchableOpacity>
              {places.map((pl) => (
                <TouchableOpacity key={pl.id} style={s.typeRow} onPress={() => { setPlaceId(pl); setPlaceOpen(false); }}>
                  <Text style={s.typeTxt}>{pl.title}</Text>
                  {!!pl.address && <Text style={{ fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 3 }}>{pl.address}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setPlaceOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
 errorBox:{padding:13,borderRadius:14,backgroundColor:'#fff1f1',borderColor:'#f3b8c0',borderWidth:1,marginBottom:12},
 errorText:{fontFamily:FONT.regular,color:'#982b3d',textAlign:'right',lineHeight:22},
 retryBtn:{alignSelf:'flex-end',minHeight:44,justifyContent:'center',paddingHorizontal:16,marginTop:6},
 retryTxt:{fontFamily:FONT.bold,color:C.brand},
 header:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:14},
 headerIcon:{width:50,height:50,borderRadius:15,backgroundColor:'#e5f4ec',alignItems:'center',justifyContent:'center'},
 headerCopy:{flex:1,alignItems:'flex-end'},
 h:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right'},
 headerSub:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:4},
 formCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:18,padding:14,marginBottom:15,elevation:1},
 sectionHeading:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginTop:14,marginBottom:5},
 sectionTitle:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right'},
 label:{fontFamily:FONT.bold,color:C.slate,fontSize:12.5,textAlign:'right',marginBottom:7},
 input:{backgroundColor:'#f8fafb',borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,fontFamily:FONT.regular,fontSize:13.5,textAlign:'right',color:C.ink,minHeight:49},
 lookupBtn:{backgroundColor:'#e8f5ee',borderRadius:11,paddingHorizontal:14,justifyContent:'center'},
 lookupTxt:{fontFamily:FONT.bold,color:C.brand,fontSize:13},
 driverBox:{backgroundColor:'#edf7f1',borderRadius:13,padding:12,marginTop:12,borderWidth:1,borderColor:'#cfe8df',flexDirection:'row-reverse',alignItems:'center',gap:10},
 driverAvatar:{width:44,height:44,borderRadius:13,backgroundColor:'#d8ede1',alignItems:'center',justifyContent:'center'},
 driverInfo:{flex:1,alignItems:'flex-end'},
 driverName:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right'},
 driverMeta:{fontFamily:FONT.regular,color:C.muted,fontSize:11.5,textAlign:'right',marginTop:5,lineHeight:20},
 select:{backgroundColor:'#f8fafb',borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,minHeight:50,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',gap:8},
 selectTxt:{fontFamily:FONT.regular,color:C.ink,fontSize:13.5,textAlign:'right',flex:1},
 submit:{backgroundColor:C.brand,borderRadius:13,padding:14,minHeight:54,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:9,marginTop:16},
 submitTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:15},
 empty:{fontFamily:FONT.regular,color:C.muted,fontSize:13,textAlign:'center',marginTop:16,marginBottom:14},
 listHeading:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginTop:13,marginBottom:12},
 listTitle:{fontFamily:FONT.bold,fontSize:15,color:C.ink,textAlign:'right',flex:1},
 listCount:{fontFamily:FONT.bold,fontSize:11,color:C.brand,backgroundColor:'#e8f5ee',paddingHorizontal:9,paddingVertical:6,borderRadius:10},
 card:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:C.line,padding:13,marginBottom:10,elevation:1},
 cardTop:{flexDirection:'row-reverse',alignItems:'center',gap:8,flexWrap:'wrap'},
 cardIcon:{width:39,height:39,borderRadius:12,backgroundColor:'#e8f5ee',alignItems:'center',justifyContent:'center'},
 cardMain:{flex:1,minWidth:110,alignItems:'flex-end'},
 cardTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:13.5,textAlign:'right'},
 dateBadge:{flexDirection:'row-reverse',alignItems:'center',gap:5,backgroundColor:'#f0f6f3',borderRadius:9,paddingHorizontal:8,paddingVertical:7},
 cardDate:{fontFamily:FONT.bold,color:C.brand,fontSize:11},
 cardMeta:{fontFamily:FONT.regular,color:C.slate,fontSize:12,textAlign:'right',marginTop:9,lineHeight:21},
 cardNote:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'right',marginTop:5,lineHeight:21},
 typeRow:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:12,padding:13,marginBottom:7,minHeight:47},
 typeTxt:{fontFamily:FONT.bold,color:C.ink,fontSize:13.5,textAlign:'right'},
 modalWrap:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'},
 modalCard:{backgroundColor:C.paper,borderTopLeftRadius:20,borderTopRightRadius:20,padding:16,maxHeight:'75%'},
 modalTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right',marginBottom:10},
 modalClose:{backgroundColor:C.ink,borderRadius:14,padding:14,alignItems:'center',marginTop:6},
 modalCloseTxt:{color:'#fff',fontFamily:FONT.bold}
});
