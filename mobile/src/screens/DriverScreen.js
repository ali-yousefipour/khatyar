import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { postOrQueue } from '../api';
import { getAppConfig } from '../appconfig';
import * as Location from 'expo-location';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function DriverScreen({ route, navigation }) {
  const params = route?.params || {};
  const rawDriver = params.driver;
  const driver = rawDriver && typeof rawDriver === 'object' ? rawDriver : {};
  const vehicle = params.vehicle && typeof params.vehicle === 'object' ? params.vehicle : {};
  const warnings = Array.isArray(params.warnings) ? params.warnings : [];
  const temp_lines = Array.isArray(params.temp_lines) ? params.temp_lines : [];
  const [lastAttendance, setLastAttendance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState({ welfare: false, cultural: false });
  const hasDriver = !!(driver && (driver.id || driver.national_id || driver.national_code));
  useEffect(() => {
    getAppConfig().then((c) => setAccess({ welfare: !!c.can_welfare, cultural: !!c.can_cultural })).catch(() => {});
  }, []);
  const safeText = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'بله' : 'خیر';
    return '';
  };
  const Row = ({ l, v }) => {
    const txt = safeText(v);
    return txt ? (
      <View style={s.detRow}><Text style={s.detL}>{l}</Text><Text style={s.detV}>{txt}</Text></View>
    ) : null;
  };

  if (!hasDriver) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontFamily: FONT.bold, color: C.danger, textAlign: 'center' }}>اطلاعات راننده کامل دریافت نشد. لطفاً دوباره جستجو کنید.</Text>
        <TouchableOpacity style={[s.act, s.actPrimary, { marginTop: 16, width: 180 }]} onPress={() => navigation.goBack()}>
          <Text style={[s.actTxt, { color: '#fff' }]}>بازگشت به جستجو</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function registerAttendance() {
    if (busy) return;
    setBusy(true);
    try {
      let lat, lng;
      // ابتدا آخرین موقعیت معلوم (فوری)، سپس در صورت نبود، موقعیت با دقت متعادل و مهلت کوتاه
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (last) { lat = last.coords.latitude; lng = last.coords.longitude; }
        else {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude; lng = pos.coords.longitude;
        }
      } catch {}
      if (!driver.id) throw new Error('شناسه داخلی راننده دریافت نشده است. لطفاً دوباره جستجو کنید یا اطلاعات راننده را در سایت بررسی کنید.');
      const r = await postOrQueue('/attendance', { driver_id: driver.id, lat, lng });
      if (r.queued) Alert.alert('آفلاین', 'حضور ذخیره شد و هنگام اتصال به اینترنت ارسال می‌شود.');
      else { setLastAttendance(Date.now()); Alert.alert('ثبت شد', 'حضور راننده ثبت شد و در لیست حاضرین خط قرار گرفت.'); }
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  const ACTIONS = [
    { t: 'ثبت حضور', e: '✓', primary: true, on: registerAttendance },
    { t: 'بدهی تاکسیران', e: '₪', on: () => navigation.navigate('Debt', { driver }) },
    { t: 'چک‌لیست خودرو', e: '☑', on: () => navigation.navigate('Checklist', { driver }) },
    { t: 'ثبت تذکر', e: '✎', taxi: true, on: () => navigation.navigate('Notice', { driver }) },
    { t: 'گزارش حضور', e: '📅', on: () => navigation.navigate('Attendance', { driver }) },
    { t: 'تذکرات قبلی', e: '🗂', on: () => navigation.navigate('PastNotices', { driver }) },
    { t: 'چک‌لیست‌های قبلی', e: '📋', on: () => navigation.navigate('PastChecklists', { driver }) },
    { t: 'پیامک‌های راننده', e: '✉', on: () => navigation.navigate('DriverSms', { driver }) },
    ...(access.welfare ? [{ t: 'رفاهیات راننده', e: '🎁', on: () => navigation.navigate('Welfare', { driver }) }] : []),
    ...(access.cultural ? [{ t: 'فعالیت فرهنگی', e: '🎭', on: () => navigation.navigate('Cultural', { driver }) }] : []),
  ];

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.pf}><Text style={s.pfTxt}>{safeText(driver.first_name || driver.last_name || '؟').slice(0,1) || '؟'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{safeText(driver.first_name)} {safeText(driver.last_name)}</Text>
            <Text style={s.meta}>کد ملی {safeText(driver.national_id || driver.national_code)}</Text>
          </View>
        </View>
        {warnings.filter(Boolean).map((w, i) => {
          const wt = safeText(w) || safeText(w?.title) || safeText(w?.message) || safeText(w?.description);
          return wt ? <View style={s.warn} key={i}><Text style={s.warnTxt}>⚠ {wt}</Text></View> : null;
        })}
        <View style={{ marginTop: 10 }}>
          <Row l="نوع فعالیت راننده" v={vehicle?.activity_type || driver.driver_type} />
          <Row l="شیفت کاری" v={vehicle?.shift_fa} />
          {vehicle?.beneficiary_name ? <Row l="بهره‌بردار خودرو" v={vehicle?.beneficiary_name} /> : null}
          <Row l="وضعیت پروانه بهره‌برداری" v={driver.op_lic_status} />
          <Row l="اعتبار پروانه بهره‌برداری" v={driver.op_lic_expire} />
          <Row l="وضعیت پروانه تاکسیرانی" v={driver.taxi_lic_status} />
          <Row l="اعتبار پروانه تاکسیرانی" v={driver.taxi_lic_expire} />
          <Row l="خط محل فعالیت" v={vehicle?.line_code ? (vehicle?.line_code + (vehicle?.line_origin ? ' — ' + vehicle?.line_origin : '')) : null} />
          <Row l="کد در خط" v={vehicle?.line_code_in_line} />
          {temp_lines && temp_lines.length > 0 && temp_lines.map((t, idx) => (
            <View key={t?.id || idx} style={s.tempBadge}>
              <Text style={s.tempBadgeTxt}>🚕 راننده موقت در خط {safeText(t?.line_code)}{t?.line_code_in_line ? ` — کد در خط: ${safeText(t.line_code_in_line)}` : ''}</Text>
            </View>
          ))}
          <Row l="پلاک خودرو" v={vehicle?.plate} />
          <Row l="مدل خودرو" v={vehicle?.model_name} />
          <Row l="اعتبار معاینه فنی" v={vehicle?.tech_inspection_expire} />
          {vehicle?.inspection_status ? (
            <View style={s.detRow}><Text style={s.detL}>وضعیت معاینه فنی</Text>
              <Text style={[s.detV, { color: vehicle?.inspection_status === 'معتبر' ? C.ok : C.danger }]}>{vehicle?.inspection_status}</Text></View>
          ) : null}
          <Row l="اعتبار بیمه شخص ثالث" v={vehicle?.insurance_expire} />
          {vehicle?.insurance_status ? (
            <View style={s.detRow}><Text style={s.detL}>وضعیت بیمه شخص ثالث</Text>
              <Text style={[s.detV, { color: vehicle?.insurance_status === 'معتبر' ? C.ok : C.danger }]}>{vehicle?.insurance_status}</Text></View>
          ) : null}
        </View>
      </View>

      <View style={s.acts}>
        {ACTIONS.map((a, i) => (
          <TouchableOpacity key={i} onPress={a.on} disabled={a.primary && busy}
            style={[s.act, a.primary && s.actPrimary, a.taxi && s.actTaxi]}>
            {a.primary && busy
              ? <ActivityIndicator color="#fff" />
              : <><Text style={s.actEm}>{a.e}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[s.actTxt, a.primary && { color: '#fff' }]}>{a.t}</Text></>}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tempBadge: { backgroundColor: '#eef7ff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginVertical: 4, borderWidth: 1, borderColor: '#bcd9f5' },
  tempBadgeTxt: { fontFamily: FONT.regular, color: '#1f6fd6', fontSize: 12.5, fontWeight: 'bold', textAlign: 'right' },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 15 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  pf: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  pfTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 18 },
  name: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT.regular, fontSize: 12, color: C.muted, textAlign: 'right' },
  warn: { backgroundColor: '#fde6ea', borderRadius: 11, padding: 9, marginTop: 12 },
  warnTxt: { color: C.danger, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right' },
  detRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line },
  detL: { fontFamily: FONT.regular, color: C.muted, fontSize: 12.5 },
  detV: { fontFamily: FONT.bold, color: C.ink, fontSize: 12.5, textAlign: 'left', flexShrink: 1, marginLeft: 8 },
  acts: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  act: { width: '47%', backgroundColor: '#fff', borderColor: C.line, borderWidth: 1,
    borderRadius: 14, padding: 14, alignItems: 'center' },
  actPrimary: { backgroundColor: C.brand, borderColor: C.brand },
  actTaxi: { backgroundColor: C.taxi, borderColor: C.taxi },
  actEm: { fontSize: 22, marginBottom: 4 },
  actTxt: { fontFamily: FONT.bold, fontSize: 12.5, color: C.ink, width: '100%', textAlign: 'center' },
});
