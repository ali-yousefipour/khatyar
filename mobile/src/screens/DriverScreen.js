import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, useWindowDimensions } from 'react-native';
import { postOrQueue, request } from '../api';
import { imageSource } from '../api';
import { ImagePicker, launchCamera } from '../cameraLock';
import { compressToDataUri } from '../img';
import { getAppConfig } from '../appconfig';
import * as Location from 'expo-location';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { faNum } from '../num';
import TaxiPlate from '../components/TaxiPlate';

export default function DriverScreen({ route, navigation }) {
  const { width: viewportWidth } = useWindowDimensions();
  const compact = viewportWidth < 390;
  const params = route?.params || {};
  const rawDriver = params.driver;
  const driver = rawDriver && typeof rawDriver === 'object' ? rawDriver : {};
  const vehicle = params.vehicle && typeof params.vehicle === 'object' ? params.vehicle : {};
  const warnings = Array.isArray(params.warnings) ? params.warnings : [];
  const temp_lines = Array.isArray(params.temp_lines) ? params.temp_lines : [];
  const [lastAttendance, setLastAttendance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState({ welfare: false, cultural: false });
  const [complaintAllowed, setComplaintAllowed] = useState(false);
  const [portrait, setPortrait] = useState(null);
  const [portraitDraft, setPortraitDraft] = useState(null);
  const [portraitConsent, setPortraitConsent] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitLoading, setPortraitLoading] = useState(true);
  const [portraitRequired, setPortraitRequired] = useState(false);
  const [portraitError, setPortraitError] = useState('');
  const hasDriver = !!(driver && (driver.id || driver.national_id || driver.national_code));
  useEffect(() => {
    getAppConfig().then((c) => setAccess({ welfare: !!c.can_welfare, cultural: !!c.can_cultural })).catch(() => {});
    request('/complaints/access', { noStore: true }).then((x) => setComplaintAllowed(!!x?.can_submit)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!driver.id) { setPortraitLoading(false); return; }
    let active = true;
    setPortraitLoading(true);
    request('/driver-photos/config', { noStore: true, queueIfOffline: false })
      .then(data => { if (active) setPortraitRequired(!!data?.required); }).catch(() => {});
    request('/driver-photos/' + driver.id, { noStore: true, queueIfOffline: false })
      .then(data => { if (active) { setPortrait(data?.photo || null); setPortraitRequired(!!data?.required); setPortraitError(''); } })
      .catch(() => { if (active) setPortraitError('دریافت وضعیت تصویر ممکن نشد. دوباره تلاش کنید.'); })
      .finally(() => { if (active) setPortraitLoading(false); });
    return () => { active = false; };
  }, [driver.id]);
  const capturePortrait = async () => {
    if (portrait || portraitBusy) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert('دسترسی دوربین', 'برای ثبت تصویر پرسنلی راننده اجازه دوربین لازم است.');
      const result = await launchCamera({ mediaTypes: ['images'], cameraType: ImagePicker.CameraType.front, allowsEditing: false, quality: 0.7 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setPortraitBusy(true);
      const source = result.assets[0].uri;
      let compressed = null;
      for (const [width, quality] of [[480, 0.34], [400, 0.28], [320, 0.22]]) {
        compressed = await compressToDataUri(source, { maxW: width, maxH: 640, quality });
        if (compressed && Math.floor((compressed.length - compressed.indexOf(',') - 1) * 3 / 4) <= 120 * 1024) break;
      }
      if (!compressed || Math.floor((compressed.length - compressed.indexOf(',') - 1) * 3 / 4) > 120 * 1024) throw new Error('فشرده‌سازی تصویر به حجم مجاز انجام نشد. دوباره عکس بگیرید.');
      setPortraitDraft(compressed);
      setPortraitConsent(false);
    } catch (error) { Alert.alert('تصویر پرسنلی', error?.message || 'ثبت تصویر ممکن نشد.'); }
    finally { setPortraitBusy(false); }
  };
  const confirmPortrait = async () => {
    if (!portraitDraft || !portraitConsent || portraitBusy || !driver.id) return;
    setPortraitBusy(true);
    try {
      const saved = await request('/driver-photos/' + driver.id, { method: 'POST', body: { photo_data: portraitDraft, confirmed: true }, queueIfOffline: false, noStore: true, timeoutMs: 30000 });
      setPortrait(saved.photo); setPortraitDraft(null); setPortraitConsent(false);
      Alert.alert('ثبت قطعی شد', 'تصویر تاکسیران ثبت شد و دیگر در برنامه قابل تغییر نیست.');
    } catch (error) { Alert.alert('ثبت تصویر ناموفق بود', error?.message || 'پس از اتصال به اینترنت دوباره تلاش کنید.'); }
    finally { setPortraitBusy(false); }
  };
  const photoGate = () => {
    Alert.alert('ابتدا تصویر پرسنلی تاکسیران را ثبت کنید', 'عکس باید واضح و متعلق به راننده اصلی باشد. مسئولیت مغایرت تصویر با راننده بر عهده ثبت‌کننده است.', [
      { text: 'بعداً', style: 'cancel' },
      { text: 'رفتن به درج عکس', onPress: () => { if (!portraitDraft) capturePortrait(); } },
    ]);
  };
  const safeText = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'string' || typeof v === 'number') return faNum(String(v));
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
    { t: 'ثبت حضور', e: 'account-check-outline', primary: true, on: registerAttendance },
    { t: 'بدهی تاکسیران', e: 'cash-multiple', on: () => navigation.navigate('Debt', { driver }) },
    { t: 'چک‌لیست خودرو', e: 'clipboard-check-outline', on: () => navigation.navigate('Checklist', { driver }) },
    { t: 'ثبت تذکر', e: 'note-edit-outline', taxi: true, on: () => navigation.navigate('Notice', { driver }) },
    { t: 'گزارش حضور', e: 'calendar-check-outline', on: () => navigation.navigate('Attendance', { driver }) },
    { t: 'تذکرات قبلی', e: 'text-box-multiple-outline', on: () => navigation.navigate('PastNotices', { driver }) },
    { t: 'چک‌لیست‌های قبلی', e: 'clipboard-list-outline', on: () => navigation.navigate('PastChecklists', { driver }) },
    { t: 'پیامک‌های راننده', e: 'message-text-outline', on: () => navigation.navigate('DriverSms', { driver }) },
    ...(complaintAllowed ? [
      { t: 'ثبت شکایت', e: 'bullhorn-outline', on: () => navigation.navigate('Complaints', { driver }) },
      { t: 'سوابق شکایات', e: 'file-document-multiple-outline', on: () => navigation.navigate('Complaints', { driver, tab: 'submit' }) },
    ] : []),
    ...(access.welfare ? [{ t: 'رفاهیات راننده', e: 'gift-outline', on: () => navigation.navigate('Welfare', { driver }) }] : []),
    ...(access.cultural ? [{ t: 'فعالیت فرهنگی', e: 'palette-outline', on: () => navigation.navigate('Cultural', { driver }) }] : []),
  ];

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: compact ? 10 : 16, paddingBottom: 56 }}>
      <View style={s.card}>
        <View style={[s.heroRow, compact && s.heroRowCompact]}>
          <View style={s.identity}>
            <View style={s.pf}>{portrait ? <Image source={imageSource(portrait)} style={s.portraitAvatar} /> : <MaterialCommunityIcons name="account-tie" size={25} color="#fff" />}</View>
            <View style={s.identityText}>
              <Text style={s.name} numberOfLines={2}>{safeText(driver.first_name)} {safeText(driver.last_name)}</Text>
              <Text style={s.meta}>کد ملی: {safeText(driver.national_id || driver.national_code)}</Text>
            </View>
          </View>
        </View>
        <View style={s.portraitCard}>
          <Text style={s.portraitTitle}>تصویر پرسنلی تاکسیران</Text>
          {portrait ? <><Image source={imageSource(portrait)} style={s.portraitPreview}/><Text style={s.portraitSuccess}>تصویر ثبت و تأیید شده است؛ تغییر آن فقط توسط مدیر سامانه امکان‌پذیر است.</Text></> : <>
            <Text style={s.portraitHint}>{portraitLoading ? 'در حال بررسی وضعیت تصویر…' : 'عکس واضح، روبه‌دوربین و متعلق به همین تاکسیران باشد. پس از تأیید نهایی، تصویر در اپ قابل ویرایش نیست.'}</Text>
            {!!portraitError && <Text style={s.portraitWarning}>{portraitError}</Text>}
            {portraitDraft ? <><Image source={{uri:portraitDraft}} style={s.portraitPreview}/><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:portraitConsent}} onPress={() => setPortraitConsent(v=>!v)} style={s.consentRow}><MaterialCommunityIcons name={portraitConsent?'checkbox-marked':'checkbox-blank-outline'} size={23} color={C.brand}/><Text style={s.consentText}>تأیید می‌کنم تصویر واضح و متعلق به راننده اصلی است؛ مسئولیت مغایرت احتمالی با من است.</Text></TouchableOpacity><View style={s.portraitActions}><TouchableOpacity style={s.portraitSecondary} onPress={() => {setPortraitDraft(null);setPortraitConsent(false);}} disabled={portraitBusy}><Text style={s.portraitSecondaryText}>عکس دوباره</Text></TouchableOpacity><TouchableOpacity style={[s.portraitButton,(!portraitConsent||portraitBusy)&&{opacity:.45}]} onPress={confirmPortrait} disabled={!portraitConsent||portraitBusy}><Text style={s.portraitButtonText}>{portraitBusy?'در حال ثبت…':'تأیید و ثبت قطعی'}</Text></TouchableOpacity></View></> : <TouchableOpacity style={s.portraitButton} disabled={portraitBusy||portraitLoading} onPress={capturePortrait}><MaterialCommunityIcons name="camera-outline" size={21} color="#fff"/><Text style={s.portraitButtonText}>گرفتن عکس با دوربین</Text></TouchableOpacity>}
          </>}
        </View>
        {!!vehicle?.plate && <View style={{marginTop:16}}><TaxiPlate plate={vehicle.plate} compact={compact}/></View>}
        <View style={s.sectionHeader}><MaterialCommunityIcons name="card-account-details-outline" size={19} color={C.brand}/><Text style={s.sectionTitle}>مشخصات تاکسیران و خودرو</Text></View>
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

      <View style={s.sectionHeader}><MaterialCommunityIcons name="view-dashboard-outline" size={20} color={C.brand}/><Text style={s.sectionTitle}>خدمات و عملیات</Text></View>
      <View style={s.acts}>
        {ACTIONS.map((a, i) => (
          <TouchableOpacity key={i} accessibilityRole="button" accessibilityLabel={a.t} accessibilityState={{disabled:!!(a.primary&&busy)}} activeOpacity={0.8} onPress={a.t==='ثبت تذکر'?a.on:portraitLoading?()=>Alert.alert('در حال بررسی', 'لطفاً تا بررسی وضعیت تصویر پرسنلی صبر کنید.'):portraitRequired&&!portrait?photoGate:a.on} disabled={a.primary && busy}
            style={[s.act, a.primary && s.actPrimary, a.taxi && s.actTaxi, a.primary&&busy&&{opacity:0.6}]}>
            {a.primary && busy
              ? <ActivityIndicator color="#fff" />
              : <><View style={[s.actionIcon, a.primary && s.actionIconPrimary]}><MaterialCommunityIcons name={a.e} size={25} color={a.primary ? "#fff" : C.brand}/></View>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[s.actTxt, a.primary && { color: '#fff' }]}>{a.t}</Text></>}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  heroRowCompact: { alignItems: 'stretch' },
  identity: { flexDirection: 'row-reverse', alignItems: 'center', flexGrow: 1, flexShrink: 1, minWidth: 165, gap: 9 },
  identityText: { flexShrink: 1, alignItems: 'flex-end' },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 8 },
  sectionTitle: { fontFamily: FONT.bold, fontSize: 15, color: C.ink, textAlign: 'right' },
  actionIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#e8f6f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,.18)' },
  tempBadge: { backgroundColor: '#eef7ff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginVertical: 4, borderWidth: 1, borderColor: '#bcd9f5' },
  tempBadgeTxt: { fontFamily: FONT.regular, color: '#1f6fd6', fontSize: 12.5, fontWeight: 'bold', textAlign: 'right' },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 19, padding: 18 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  pf: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  portraitAvatar: { width: 46, height: 46, borderRadius: 13 },
  portraitCard: { marginTop: 16, backgroundColor: '#F4FAF7', borderWidth: 1, borderColor: '#C8E5D7', borderRadius: 16, padding: 14, gap: 10 },
  portraitTitle: { fontFamily: FONT.bold, color: C.brand, fontSize: 15, textAlign: 'right' },
  portraitHint: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, lineHeight: 22, textAlign: 'right' },
  portraitWarning: { fontFamily: FONT.bold, color: C.danger, textAlign: 'right', fontSize: 12 },
  portraitPreview: { width: 120, height: 156, borderRadius: 12, alignSelf: 'center', backgroundColor: '#E1E8E4' },
  portraitSuccess: { fontFamily: FONT.regular, color: C.brand, fontSize: 12, textAlign: 'right', lineHeight: 21 },
  portraitButton: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: C.brand, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 },
  portraitButtonText: { fontFamily: FONT.bold, color: '#fff', fontSize: 12.5 },
  portraitActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  portraitSecondary: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, justifyContent: 'center' },
  portraitSecondaryText: { fontFamily: FONT.bold, fontSize: 12, color: C.brand },
  consentRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, minHeight: 48 },
  consentText: { flex: 1, fontFamily: FONT.regular, color: C.ink, fontSize: 11.5, textAlign: 'right', lineHeight: 20 },
  pfTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 18 },
  name: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT.regular, fontSize: 12, color: C.muted, textAlign: 'right' },
  warn: { backgroundColor: '#fde6ea', borderRadius: 11, padding: 9, marginTop: 12 },
  warnTxt: { color: C.danger, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right' },
  detRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  detL: { fontFamily: FONT.regular, color: C.muted, fontSize: 12.5 },
  detV: { fontFamily: FONT.bold, color: C.ink, fontSize: 12.5, textAlign: 'left', flexShrink: 1, marginLeft: 8 },
  acts: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  act: { width: '47%', minHeight: 110, backgroundColor: '#fff', borderColor: C.line, borderWidth: 1,
    borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#17352f', shadowOpacity: .06, shadowRadius: 7, elevation: 2 },
  actPrimary: { backgroundColor: C.brand, borderColor: C.brand },
  actTaxi: { backgroundColor: C.taxi, borderColor: C.taxi },
  actEm: { fontSize: 22, marginBottom: 4 },
  actTxt: { fontFamily: FONT.bold, fontSize: 12.5, color: C.ink, width: '100%', textAlign: 'center' },
});
