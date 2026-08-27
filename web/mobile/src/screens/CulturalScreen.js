import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import { jToday } from '../jdate';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const todayObj = () => { const [jy, jm, jd] = jToday(); return { jy, jm, jd }; };
const jdateToString = (d) => `${d?.jy}/${String(d?.jm).padStart(2, '0')}/${String(d?.jd).padStart(2, '0')}`;

export default function CulturalScreen({ route }) {
  const presetDriver = route?.params?.driver || null;
  const lockedToDriver = !!presetDriver?.national_id;
  const [types, setTypes] = useState([]);
  const [places, setPlaces] = useState([]);
  const [placeId, setPlaceId] = useState(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [nid, setNid] = useState(presetDriver?.national_id || '');
  const [driver, setDriver] = useState(presetDriver);
  const [typeId, setTypeId] = useState(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [adate, setAdate] = useState(todayObj());
  const [pickDate, setPickDate] = useState(false);
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const [driverList, setDriverList] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadList = () => request('/my/cultural-activities').then(setList).catch(() => setList([]));
  const loadDriverList = (natId) => { if (!natId) return; request('/my/driver-cultural?national_id=' + natId).then(setDriverList).catch(() => setDriverList([])); };
  useEffect(() => {
    request('/my/cultural-types').then((t) => setTypes(t || [])).catch(() => {});
    request('/my/cultural-places').then((pl) => setPlaces(pl || [])).catch(() => {});
    loadList();
    if (presetDriver?.national_id) loadDriverList(presetDriver.national_id);
  }, []);

  const onRefresh = async () => { setRefreshing(true); await loadList(); if (driver?.national_id) loadDriverList(driver.national_id); setRefreshing(false); };

  const lookup = async () => {
    const n = (driver?.national_id || nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    try {
      const r = await request('/search?national_id=' + n);
      if (r.type === 'driver') { setDriver(r.driver); loadDriverList(n); }
      else Alert.alert('یافت نشد', 'راننده‌ای با این کد ملی پیدا نشد.');
    } catch (e) { setDriver(null); Alert.alert('یافت نشد', 'راننده‌ای با این کد ملی پیدا نشد.'); }
  };

  const submit = async () => {
    const n = (driver?.national_id || nid).replace(/\D/g, '');
    if (n.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    if (!typeId) return Alert.alert('توجه', 'نوع فعالیت را انتخاب کنید.');
    setBusy(true);
    try {
      const body = {
        type_id: typeId.id, driver_national_id: n,
        activity_jdate: jdateToString(adate),
        location, hours: hours || null, note, place_id: placeId?.id || null,
      };
      const r = await postOrQueue('/my/cultural-activities', body);
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'فعالیت فرهنگی ذخیره شد و بعد از اتصال با تاریخ همین لحظه ارسال می‌شود.' : `فعالیت فرهنگی برای ${r.driver_name || 'راننده'} ثبت شد.`);
      setTypeId(null); setLocation(''); setHours(''); setNote(''); setPlaceId(null);
      loadList();
      loadDriverList(n);
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق بود.'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.brand]} />}>
      <Text style={s.h}>ثبت فعالیت فرهنگی راننده</Text>

      {!lockedToDriver && (<>
        <Text style={s.label}>کد ملی راننده</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <TextInput style={[s.input, { flex: 1 }]} dir="ltr" keyboardType="number-pad" maxLength={10} value={nid} onChangeText={setNid} placeholder="کد ملی" placeholderTextColor={C.muted} />
          <TouchableOpacity style={s.lookupBtn} onPress={lookup}><Text style={s.lookupTxt}>🔍 فراخوان</Text></TouchableOpacity>
        </View>
      </>)}
      {driver && (
        <View style={s.driverBox}>
          <Text style={s.driverName}>{driver.first_name} {driver.last_name}</Text>
          <Text style={s.driverMeta}>موبایل: {faNum(driver.mobile || '—')} · نوع: {driver.driver_type || '—'}</Text>
        </View>
      )}

      <Text style={[s.label, { marginTop: 12 }]}>نوع فعالیت فرهنگی</Text>
      <TouchableOpacity style={s.select} onPress={() => setTypeOpen(true)}>
        <Text style={[s.selectTxt, !typeId && { color: C.muted }]}>{typeId ? typeId.title : 'انتخاب نوع فعالیت'}</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>تاریخ فعالیت</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickDate(true)}>
            <Text style={s.selectTxt}>{adate ? jLabel(adate.jy, adate.jm, adate.jd) : 'انتخاب'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>مدت (ساعت)</Text>
          <TextInput style={s.input} keyboardType="numeric" value={hours} onChangeText={setHours} placeholder="اختیاری" placeholderTextColor={C.muted} />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>مکان خدمات فرهنگی</Text>
      {places.length > 0 ? (
        <TouchableOpacity style={s.select} onPress={() => setPlaceOpen(true)}>
          <Text style={[s.selectTxt, !placeId && { color: C.muted }]}>{placeId ? placeId.title : 'انتخاب مکان (اختیاری)'}</Text>
        </TouchableOpacity>
      ) : (
        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="مثلاً حرم مطهر، میدان شهدا…" placeholderTextColor={C.muted} />
      )}

      <Text style={[s.label, { marginTop: 12 }]}>توضیحات (اختیاری)</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} multiline placeholder="توضیح…" placeholderTextColor={C.muted} />

      <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        <Text style={s.submitTxt}>{busy ? 'در حال ثبت…' : 'ثبت فعالیت فرهنگی'}</Text>
      </TouchableOpacity>

      {driver && (
        <>
          <Text style={[s.h, { marginTop: 24 }]}>فعالیت‌های فرهنگی این راننده</Text>
          {driverList === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 12 }} /> :
            driverList.length === 0 ? <Text style={s.empty}>این راننده تاکنون فعالیت فرهنگی ثبت‌شده‌ای ندارد.</Text> :
            driverList.map((c) => (
              <View key={c.id} style={s.card}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                  <Text style={s.cardTitle}>{c.type_title}</Text>
                  <Text style={s.cardDate}>{faNum(c.activity_jdate)}</Text>
                </View>
                {(c.place_title || c.location || c.hours) ? <Text style={s.cardMeta}>{c.place_title || c.location || ''}{c.hours ? ` · ${faNum(c.hours)} ساعت` : ''}</Text> : null}
                {!!c.note && <Text style={s.cardNote}>{c.note}</Text>}
                {!!c.recorded_by_name && <Text style={s.cardNote}>ثبت‌کننده: {c.recorded_by_name}</Text>}
              </View>
            ))}
        </>
      )}

      <Text style={[s.h, { marginTop: 24 }]}>فعالیت‌های ثبت‌شدهٔ من</Text>
      {list === null ? <ActivityIndicator color={C.brand} style={{ marginTop: 16 }} /> :
        list.length === 0 ? <Text style={s.empty}>هنوز فعالیتی ثبت نکرده‌اید.</Text> :
        list.map((c) => (
          <View key={c.id} style={s.card}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <Text style={s.cardTitle}>{c.type_title}</Text>
              <Text style={s.cardDate}>{faNum(c.activity_jdate)}</Text>
            </View>
            <Text style={s.cardMeta}>{c.driver_name || c.driver_national_id}{c.place_title ? ` · ${c.place_title}` : (c.location ? ` · ${c.location}` : '')}{c.hours ? ` · ${faNum(c.hours)} ساعت` : ''}</Text>
            {!!c.note && <Text style={s.cardNote}>{c.note}</Text>}
          </View>
        ))}

      <JDatePicker visible={pickDate} onClose={() => setPickDate(false)} initial={adate}
        onSelect={(d) => setAdate({ jy: d.jy, jm: d.jm, jd: d.jd })} />

      <Modal visible={typeOpen} transparent animationType="slide" onRequestClose={() => setTypeOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب نوع فعالیت فرهنگی</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {types.length === 0 ? <Text style={s.empty}>نوع فعالیتی تعریف نشده است.</Text> :
                types.map((t) => (
                  <TouchableOpacity key={t.id} style={s.typeRow} onPress={() => { setTypeId(t); setTypeOpen(false); }}>
                    <Text style={s.typeTxt}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={s.modalClose} onPress={() => setTypeOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={placeOpen} transparent animationType="slide" onRequestClose={() => setPlaceOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب مکان خدمات</Text>
            <ScrollView style={{ maxHeight: 380 }}>
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
  h: { fontFamily: FONT.bold, fontSize: 17, color: C.ink, textAlign: 'right', marginBottom: 10 },
  label: { fontFamily: FONT.bold, color: C.slate, fontSize: 12.5, textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontFamily: FONT.regular, fontSize: 13.5, textAlign: 'right', color: C.ink },
  lookupBtn: { backgroundColor: '#eef1f6', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  lookupTxt: { fontFamily: FONT.bold, color: C.slate, fontSize: 13 },
  driverBox: { backgroundColor: '#eef7f3', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#cfe8df' },
  driverName: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  driverMeta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  select: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12 },
  selectTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  submit: { backgroundColor: C.brand, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  submitTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  empty: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 10 },
  cardTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  cardDate: { fontFamily: FONT.regular, color: C.muted, fontSize: 12 },
  cardMeta: { fontFamily: FONT.regular, color: C.slate, fontSize: 12.5, textAlign: 'right', marginTop: 5 },
  cardNote: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '75%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  typeRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 7 },
  typeTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  modalClose: { backgroundColor: C.ink, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  modalCloseTxt: { color: '#fff', fontFamily: FONT.bold },
});
