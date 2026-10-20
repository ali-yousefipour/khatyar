import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { request, imageSource } from '../api';
import { C, FONT } from '../theme';
import { fj, inCurrentJMonth, inCurrentJYear, inJRange } from '../jdate';
import { faNum } from '../num';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import ImageViewer from '../components/ImageViewer';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function DateFilterBar({ from, to, setFrom, setTo }) {
  const [pick, setPick] = useState(null);
  return (
    <View style={s.filterBar}>
      <TouchableOpacity style={s.fBtn} onPress={() => setPick('from')}><Text style={s.fBtnTxt}>{from ? jLabel(from.jy, from.jm, from.jd) : 'از تاریخ'}</Text></TouchableOpacity>
      <TouchableOpacity style={s.fBtn} onPress={() => setPick('to')}><Text style={s.fBtnTxt}>{to ? jLabel(to.jy, to.jm, to.jd) : 'تا تاریخ'}</Text></TouchableOpacity>
      {(from || to) ? <TouchableOpacity style={s.clr} onPress={() => { setFrom(null); setTo(null); }}><Text style={s.clrTxt}>پاک‌کردن</Text></TouchableOpacity> : null}
      <JDatePicker visible={!!pick} onClose={() => setPick(null)} initial={null}
        onSelect={(d) => { const v = { jy: d.jy, jm: d.jm, jd: d.jd }; if (pick === 'from') setFrom(v); else setTo(v); }} />
    </View>
  );
}
function Counts({ month, year, labelMonth = 'این ماه', labelYear = 'امسال' }) {
  return (
    <View style={s.counts}>
      <View style={s.countBox}><Text style={s.countN}>{faNum(month)}</Text><Text style={s.countL}>{labelMonth}</Text></View>
      <View style={s.countBox}><Text style={s.countN}>{faNum(year)}</Text><Text style={s.countL}>{labelYear}</Text></View>
    </View>
  );
}
function List({ rows, render, empty, header }) {
  if (!rows) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  return <FlatList data={rows} keyExtractor={(_, i) => String(i)} ListHeaderComponent={header}
    contentContainerStyle={{ padding: 16, paddingBottom: 56 }} renderItem={render}
    ListEmptyComponent={<View style={s.center}><Text style={s.empty}>{empty}</Text></View>} />;
}
function useDateFilter(allRows, dateField = 'created_at') {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const rows = useMemo(() => {
    if (!allRows) return null;
    if (!from && !to) return allRows;
    const f = from ? [from.jy, from.jm, from.jd] : null;
    const t = to ? [to.jy, to.jm, to.jd] : null;
    return allRows.filter((r) => inJRange(r[dateField], f, t));
  }, [allRows, from, to]);
  return { rows, from, to, setFrom, setTo };
}

export function AttendanceScreen({ route }) {
  const { driver } = route.params;
  const [all, setAll] = useState(null);
  useEffect(() => { request(`/attendance/${driver.id}`).then(setAll).catch(() => setAll([])); }, []);
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter((r) => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter((r) => inCurrentJYear(r.created_at)).length : 0;
  return <View style={{ flex: 1, backgroundColor: C.paper }}><List rows={rows} empty="حضوری ثبت نشده است"
    header={<><Counts month={cm} year={cy} labelMonth="حضور این ماه" labelYear="حضور امسال" /><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} /></>}
    render={({ item }) => <View style={s.card}><Text style={s.txt}>{fj(item.created_at)}</Text></View>} /></View>;
}

export function PastNoticesScreen({ route }) {
  const { driver } = route.params;
  const [all, setAll] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [viewer, setViewer] = useState(null);
  useEffect(() => { request(`/notices/${driver.id}`).then(setAll).catch(() => setAll([])); }, []);
  const P = { low: 'کم', medium: 'متوسط', high: 'زیاد' };
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const types = useMemo(() => all ? [...new Set(all.map((n) => n.reason).filter(Boolean))] : [], [all]);
  const finalRows = useMemo(() => rows ? (typeFilter ? rows.filter((r) => r.reason === typeFilter) : rows) : null, [rows, typeFilter]);
  const cm = all ? all.filter((r) => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter((r) => inCurrentJYear(r.created_at)).length : 0;
  return <View style={{ flex: 1, backgroundColor: C.paper }}><List rows={finalRows} empty="تذکری ثبت نشده است"
    header={<>
      <Counts month={cm} year={cy} labelMonth="تذکر این ماه" labelYear="تذکر امسال" />
      <DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} />
      {types.length > 0 && <View style={s.typeRow}>
        <TouchableOpacity style={[s.typeChip, !typeFilter && s.typeOn]} onPress={() => setTypeFilter(null)}><Text style={[s.typeTxt, !typeFilter && { color: '#fff' }]}>همه</Text></TouchableOpacity>
        {types.map((t) => <TouchableOpacity key={t} style={[s.typeChip, typeFilter === t && s.typeOn]} onPress={() => setTypeFilter(t)}><Text style={[s.typeTxt, typeFilter === t && { color: '#fff' }]}>{t}</Text></TouchableOpacity>)}
      </View>}
    </>}
    render={({ item }) => <View style={s.card}>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.title}>{item.reason || 'تذکر'}</Text>
        <View style={[s.prBadge, item.priority === 'high' ? s.prHigh : item.priority === 'medium' ? s.prMed : s.prLow]}>
          <Text style={s.prTxt}>اولویت {P[item.priority] || '—'}</Text>
        </View>
      </View>
      {!!item.body && <Text style={s.txt}>{item.body}</Text>}
      {(item.attachment_url) ? (
        <TouchableOpacity onPress={() => setViewer(item.attachment_url)}>
          <Image source={imageSource(item.attachment_url)} style={{ width: '100%', height: 170, borderRadius: 10, marginTop: 8 }} resizeMode="cover" />
          <Text style={s.tapHint}>برای بزرگ‌نمایی لمس کنید</Text>
        </TouchableOpacity>
      ) : null}
      <View style={s.noticeFooter}>
        <Text style={s.meta}>{fj(item.created_at)}</Text>
        {(item.recorder_name || item.recorder_username) ? (
          <Text style={s.recorder}>ثبت‌کننده: {item.recorder_name?.trim() || item.recorder_username}</Text>
        ) : null}
      </View>
    </View>} />
    {viewer && <ImageViewer uri={viewer} visible={!!viewer} onClose={() => setViewer(null)} />}
  </View>;
}

export function DriverSmsScreen({ route }) {
  const { driver } = route.params;
  const [all, setAll] = useState(null);
  useEffect(() => { request(`/drivers/${driver.id}/sms`).then(setAll).catch(() => setAll([])); }, []);
  const dlv = (c) => c == 1 ? ['تحویل شد', C.ok] : c == 2 ? ['تحویل نشد', C.danger] : ['—', C.muted];
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter((r) => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter((r) => inCurrentJYear(r.created_at)).length : 0;
  return <View style={{ flex: 1, backgroundColor: C.paper }}><List rows={rows} empty="پیامکی برای این راننده ثبت نشده است"
    header={<><Counts month={cm} year={cy} labelMonth="پیامک این ماه" labelYear="پیامک امسال" /><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} /></>}
    render={({ item }) => { const d = dlv(item.delivery_code); return (
      <View style={s.card}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
          <Text style={s.meta}>{fj(item.created_at)}{item.sender ? ` · ${item.sender}` : ''}</Text>
          <Text style={{ color: d[1], fontFamily: FONT.bold, fontSize: 11 }}>{d[0]}</Text>
        </View>
        <Text style={s.txt}>{item.body}</Text>
      </View>); }} /></View>;
}

export function MySmsScreen() {
  const [all, setAll] = useState(null);
  useEffect(() => { request('/my/sms-log').then(setAll).catch(() => setAll([])); }, []);
  const dlv = (c) => c == 1 ? ['تحویل شد', C.ok] : c == 2 ? ['تحویل نشد', C.danger] : ['—', C.muted];
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter((r) => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter((r) => inCurrentJYear(r.created_at)).length : 0;
  return <View style={{ flex: 1, backgroundColor: C.paper }}><List rows={rows} empty="شما پیامکی ارسال نکرده‌اید"
    header={<><Counts month={cm} year={cy} labelMonth="پیامک این ماه" labelYear="پیامک امسال" /><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} /></>}
    render={({ item }) => { const d = dlv(item.delivery_code); return (
      <View style={s.card}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
          <Text style={s.meta}>{item.to_mobile} · {fj(item.created_at)}</Text>
          <Text style={{ color: d[1], fontFamily: FONT.bold, fontSize: 11 }}>{d[0]}</Text>
        </View>
        <Text style={s.txt}>{item.body}</Text>
      </View>); }} /></View>;
}

export function PastChecklistsScreen({ route }) {
  const { driver } = route.params;
  const [all, setAll] = useState(null);
  const [viewer, setViewer] = useState(null);
  useEffect(() => { request(`/checklists/${driver.id}`).then(setAll).catch(() => setAll([])); }, []);
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter((r) => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter((r) => inCurrentJYear(r.created_at)).length : 0;
  return <View style={{ flex: 1, backgroundColor: C.paper }}>
    <List rows={rows} empty="چک‌لیستی برای این راننده ثبت نشده است"
      header={<><Counts month={cm} year={cy} labelMonth="چک‌لیست این ماه" labelYear="چک‌لیست امسال" /><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} /></>}
      render={({ item }) => <View style={s.card}>
        <Text style={s.title}>چک‌لیست خودرو</Text>
        <Text style={s.meta}>{fj(item.created_at)}{item.by_name ? ` · توسط ${item.by_name}` : ''}</Text>
        {(item.photo || item.photo_data) ? <TouchableOpacity onPress={() => setViewer(item.photo || item.photo_data)}><Image source={imageSource(item.photo || item.photo_data)} style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 6 }} resizeMode="cover" /></TouchableOpacity> : null}
        {(item.items || []).map((it, i) => (
          <View key={i} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 6, borderTopWidth: i ? 1 : 0, borderTopColor: C.line, paddingTop: i ? 6 : 0 }}>
            <Text style={[s.txt, { flex: 1 }]}>{it.label}</Text>
            <Text style={[s.title, { color: C.brand }]}>{it.value}</Text>
          </View>
        ))}
      </View>} />
    <ImageViewer visible={!!viewer} uri={viewer} onClose={() => setViewer(null)} />
  </View>;
}

export function VehicleScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const vehicle = route?.params?.vehicle || {};
  const drivers = Array.isArray(route?.params?.drivers) ? route.params.drivers : [];
  const plate = String(vehicle.plate || '').trim();
  const latinDigits = value => String(value || '').replace(/[۰-۹٠-٩]/g, d => {
    const p = '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);
    return String(p >= 0 ? p : '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  });
  const plateParts = latinDigits(plate).match(/^(\\d{2})\\s*([آ-یA-Za-z])\\s*(\\d{3})\\s*[-\\s]*(\\d{2})$/);
  function openDriver(d) {
    if (d.access_blocked) {
      Alert.alert('دسترسی مسدود است',
        d.block_reason || 'پروانهٔ بهره‌برداری این رانندهٔ کمکی منقضی شده و قانوناً امکان استفاده از این تاکسی را ندارد.',
        [{ text: 'متوجه شدم' }]);
      return;
    }
    navigation.navigate('Driver', {
      driver: d,
      vehicle: { ...vehicle, activity_type: d.role_fa, shift_fa: d.shift_fa, line_code_in_line: d.line_code_in_line },
      warnings: [],
    });
  }
  return (
    <ScrollView persistentScrollbar style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={vs.page}>
      <View style={vs.hero}>
        <View style={vs.heading}><MaterialCommunityIcons name="taxi" size={22} color={C.brand}/><Text style={vs.headingText}>مشخصات تاکسی</Text></View>
        <View style={[vs.plate, { maxWidth: Math.max(220, width - 68) }]}>
          <View style={vs.plateBody}>
            <Text style={vs.plateNumber} numberOfLines={1} adjustsFontSizeToFit>{plateParts ? `${faNum(plateParts[1])} ${plateParts[2]} ${faNum(plateParts[3])}` : faNum(plate || '—')}</Text>
          </View>
          <View style={vs.plateRegion}><Text style={vs.plateRegionLabel}>ایران</Text><Text style={vs.plateRegionNumber}>{plateParts ? faNum(plateParts[4]) : '—'}</Text></View>
        </View>
        <View style={vs.vehicleFacts}>
          {!!vehicle.model_name && <View style={vs.fact}><MaterialCommunityIcons name="car-outline" size={17} color={C.brand}/><Text style={vs.factText}>{faNum(vehicle.model_name)}</Text></View>}
          {!!vehicle.line_code && <View style={vs.fact}><MaterialCommunityIcons name="map-marker-path" size={17} color={C.brand}/><Text style={vs.factText}>خط {faNum(vehicle.line_code)}</Text></View>}
        </View>
      </View>
      <View style={vs.listHeading}><View style={vs.listTitleRow}><MaterialCommunityIcons name="account-group-outline" size={21} color={C.brand}/><Text style={vs.listTitle}>رانندگان این تاکسی</Text></View><View style={vs.countBadge}><Text style={vs.countText}>{faNum(drivers.length)} نفر</Text></View></View>
      {drivers.length === 0 && <View style={vs.empty}><Text style={vs.emptyText}>راننده‌ای برای این خودرو ثبت نشده است.</Text></View>}
      {drivers.map((d, index) => {
        const isBen = d.role === 'beneficiary';
        const blocked = !!d.access_blocked;
        const fullName = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'نام نامشخص';
        return <TouchableOpacity key={d.id || index} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`مشاهده مشخصات ${fullName}`} onPress={() => openDriver(d)} style={[vs.driverCard, blocked && vs.blockedCard]}>
          <View style={vs.driverTop}>
            <View style={vs.driverIdentity}><View style={[vs.avatar, isBen && vs.avatarMain]}><MaterialCommunityIcons name={isBen ? 'account-tie' : 'account-outline'} size={24} color={isBen ? '#fff' : C.brand}/></View><View style={vs.driverNames}><Text style={vs.driverName} numberOfLines={2}>{faNum(fullName)}</Text><Text style={vs.driverHint}>{isBen ? 'راننده اصلی' : 'راننده کمکی'}</Text></View></View>
            <View style={[vs.rolePill, isBen ? vs.beneficiaryPill : vs.helperPill]}><Text style={[vs.roleText, { color: isBen ? '#08765c' : '#916400' }]}>{faNum(d.role_fa || (isBen ? 'بهره‌بردار' : 'کمکی'))}</Text></View>
          </View>
          <View style={vs.driverDetails}>
            <View style={vs.detailChip}><MaterialCommunityIcons name="clock-outline" size={16} color={C.muted}/><Text style={vs.detailText}>{faNum(d.shift_fa ? `شیفت ${d.shift_fa}` : 'بدون شیفت')}</Text></View>
            {!!d.line_code_in_line && <View style={vs.detailChip}><MaterialCommunityIcons name="identifier" size={16} color={C.muted}/><Text style={vs.detailText}>کد در خط: {faNum(d.line_code_in_line)}</Text></View>}
          </View>
          {d.op_lic_expired && <View style={vs.warning}><MaterialCommunityIcons name="alert-circle-outline" size={17} color={blocked ? C.danger : '#a66c00'}/><Text style={[vs.warningText, blocked && { color: C.danger }]}>{blocked ? 'پروانه بهره‌برداری منقضی؛ دسترسی مسدود است' : 'پروانه بهره‌برداری منقضی'}</Text></View>}
          <View style={vs.driverFooter}><Text style={vs.footerText}>{blocked ? 'مشاهده محدود شده است' : 'مشاهده پرونده و خدمات راننده'}</Text><MaterialCommunityIcons name="chevron-left-circle-outline" size={21} color={blocked ? C.muted : C.brand}/></View>
        </TouchableOpacity>;
      })}
    </ScrollView>
  );
}

const vs = StyleSheet.create({
  page: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 60 },
  hero: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line, alignItems: 'center', elevation: 2 },
  heading: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'stretch', gap: 8, marginBottom: 12 },
  headingText: { fontFamily: FONT.bold, fontSize: 16, color: C.ink },
  plate: { flexDirection: 'row', direction: 'ltr', width: '100%', maxWidth: 330, height: 76, backgroundColor: '#f5c518', borderRadius: 11, borderWidth: 2, borderColor: '#242424', overflow: 'hidden' },
  plateBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  plateNumber: { fontFamily: FONT.bold, color: '#1d1d1d', fontSize: 27, writingDirection: 'ltr', textAlign: 'center' },
  plateRegion: { backgroundColor: '#fff', width: 56, borderLeftWidth: 1.5, borderLeftColor: '#242424', alignItems: 'center', justifyContent: 'center' },
  plateRegionLabel: { fontFamily: FONT.bold, fontSize: 13, color: '#242424' },
  plateRegionNumber: { fontFamily: FONT.bold, fontSize: 22, color: '#242424' },
  vehicleFacts: { flexDirection: 'row-reverse', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  fact: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#eff7f4', borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  factText: { fontFamily: FONT.bold, fontSize: 12, color: C.ink },
  listHeading: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  listTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  listTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.ink },
  countBadge: { backgroundColor: '#e4f3ed', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  countText: { fontFamily: FONT.bold, fontSize: 12, color: C.brand },
  driverCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 11, elevation: 2 },
  blockedCard: { backgroundColor: '#fff6f6', borderColor: '#eab9b9' },
  driverTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  driverIdentity: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1, minWidth: 0, gap: 9 },
  avatar: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f5ef' },
  avatarMain: { backgroundColor: C.brand },
  driverNames: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  driverName: { fontFamily: FONT.bold, fontSize: 15, color: C.ink, textAlign: 'right' },
  driverHint: { fontFamily: FONT.regular, fontSize: 11, color: C.muted, marginTop: 3 },
  rolePill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, maxWidth: '36%' },
  beneficiaryPill: { backgroundColor: '#e6f5ef' },
  helperPill: { backgroundColor: '#fff4dc' },
  roleText: { fontFamily: FONT.bold, fontSize: 11, textAlign: 'center' },
  driverDetails: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  detailChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f4f6f8' },
  detailText: { fontFamily: FONT.regular, color: C.ink, fontSize: 12 },
  warning: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#fff0e0', borderRadius: 10, padding: 9, marginTop: 10 },
  warningText: { fontFamily: FONT.bold, fontSize: 11, color: '#a66c00', flexShrink: 1, textAlign: 'right' },
  driverFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#edf0f2', paddingTop: 11, marginTop: 12 },
  footerText: { fontFamily: FONT.regular, fontSize: 11, color: C.muted },
  empty: { padding: 25, alignItems: 'center' },
  emptyText: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center' },
});

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  empty: { color: C.muted, fontFamily: FONT.regular },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 10, shadowColor: '#17352f', shadowOpacity: 0.045, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  txt: { fontFamily: FONT.regular, color: C.ink, fontSize: 14, textAlign: 'right', marginTop: 2 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 2 },
  prBadge: { borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10 },
  prHigh: { backgroundColor: '#fdecea' }, prMed: { backgroundColor: '#fff4e0' }, prLow: { backgroundColor: '#eaf6ef' },
  prTxt: { fontFamily: FONT.bold, fontSize: 11, color: '#444' },
  noticeFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  recorder: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5 },
  tapHint: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  roleBadge: { borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10 },
  roleBen: { backgroundColor: '#e6f5ef' },
  roleHelper: { backgroundColor: '#fdf3e0' },
  roleBadgeTxt: { fontFamily: FONT.bold, fontSize: 11 },
  filterBar: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
  fBtn: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
  fBtnTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  clr: { paddingVertical: 8, paddingHorizontal: 10 },
  clrTxt: { fontFamily: FONT.regular, color: C.danger, fontSize: 11.5 },
  counts: { flexDirection: 'row-reverse', gap: 10, marginBottom: 12 },
  countBox: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, alignItems: 'center' },
  countN: { fontFamily: FONT.bold, fontSize: 22, color: C.brand },
  countL: { fontFamily: FONT.regular, fontSize: 11, color: C.muted, marginTop: 2 },
  typeRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  typeChip: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  typeOn: { backgroundColor: C.brand, borderColor: C.brand },
  typeTxt: { fontFamily: FONT.regular, fontSize: 11.5, color: C.ink },
});
