import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { request, imageSource } from '../api';
import { C, FONT } from '../theme';
import { fj, inCurrentJMonth, inCurrentJYear, inJRange } from '../jdate';
import { faNum } from '../num';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import ImageViewer from '../components/ImageViewer';
import ActivityIndicator from '../components/PulseLoadingIndicator';

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
  const { vehicle, drivers } = route.params;
  function openDriver(d) {
    // رانندهٔ کمکی با پروانهٔ بهره‌برداری منقضی → مسدود
    if (d.access_blocked) {
      Alert.alert(
        'دسترسی مسدود است',
        d.block_reason || 'پروانهٔ بهره‌برداری این رانندهٔ کمکی منقضی شده و قانوناً امکان استفاده از این تاکسی را ندارد.',
        [{ text: 'متوجه شدم' }]
      );
      return;
    }
    navigation.navigate('Driver', {
      driver: d,
      vehicle: { ...vehicle, activity_type: d.role_fa, shift_fa: d.shift_fa, line_code_in_line: d.line_code_in_line },
      warnings: [],
    });
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <View style={s.card}>
        <Text style={s.title}>خودرو {vehicle.plate}</Text>
        <Text style={s.meta}>{vehicle.model_name || ''}{vehicle.line_code ? ` — خط ${vehicle.line_code}` : ''}</Text>
      </View>
      <Text style={[s.meta, { marginVertical: 10 }]}>بهره‌بردار و رانندگان کمکی:</Text>
      {drivers.map((d) => {
        const isBen = d.role === 'beneficiary';
        const blocked = d.access_blocked;
        return (
          <TouchableOpacity key={d.id} style={[s.card, blocked && { borderColor: '#e0b4b4', backgroundColor: '#fdf3f3' }]} onPress={() => openDriver(d)}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.title}>{d.first_name} {d.last_name}</Text>
              <View style={[s.roleBadge, isBen ? s.roleBen : s.roleHelper]}>
                <Text style={[s.roleBadgeTxt, isBen ? { color: '#0d7a5f' } : { color: '#9a6b00' }]}>
                  {d.role_fa || (isBen ? 'بهره‌بردار (اصلی)' : 'کمکی')}
                </Text>
              </View>
            </View>
            <Text style={s.meta}>
              {d.shift_fa ? `شیفت ${d.shift_fa}` : (isBen ? 'بدون شیفت' : '')}
              {d.line_code_in_line ? ` · کد در خط: ${faNum(d.line_code_in_line)}` : ''}
            </Text>
            {d.op_lic_expired && (
              <Text style={[s.meta, { color: blocked ? '#c0392b' : '#c26b00', marginTop: 4 }]}>
                {blocked
                  ? '⛔ پروانهٔ بهره‌برداری منقضی — دسترسی مسدود است'
                  : '⚠ پروانهٔ بهره‌برداری منقضی (راننده اصلی — دسترسی باز)'}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  empty: { color: C.muted, fontFamily: FONT.regular },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  txt: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', marginTop: 2 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 2 },
  prBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 9 },
  prHigh: { backgroundColor: '#fdecea' }, prMed: { backgroundColor: '#fff4e0' }, prLow: { backgroundColor: '#eaf6ef' },
  prTxt: { fontFamily: FONT.bold, fontSize: 11, color: '#444' },
  noticeFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  recorder: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5 },
  tapHint: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  roleBadge: { borderRadius: 7, paddingVertical: 3, paddingHorizontal: 9 },
  roleBen: { backgroundColor: '#e6f5ef' },
  roleHelper: { backgroundColor: '#fdf3e0' },
  roleBadgeTxt: { fontFamily: FONT.bold, fontSize: 11 },
  filterBar: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
  fBtn: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  fBtnTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  clr: { paddingVertical: 8, paddingHorizontal: 10 },
  clrTxt: { fontFamily: FONT.regular, color: C.danger, fontSize: 11.5 },
  counts: { flexDirection: 'row-reverse', gap: 10, marginBottom: 12 },
  countBox: { flex: 1, backgroundColor: '#e7f3ee', borderRadius: 12, padding: 12, alignItems: 'center' },
  countN: { fontFamily: FONT.bold, fontSize: 22, color: C.brand },
  countL: { fontFamily: FONT.regular, fontSize: 11, color: C.muted, marginTop: 2 },
  typeRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  typeChip: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  typeOn: { backgroundColor: C.brand, borderColor: C.brand },
  typeTxt: { fontFamily: FONT.regular, fontSize: 11.5, color: C.ink },
});
