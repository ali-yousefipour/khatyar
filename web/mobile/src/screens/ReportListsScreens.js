import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Modal } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import { jParts, inJRange } from '../jdate';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import PlateSearch from '../components/PlateSearch';
import ActivityIndicator from '../components/PulseLoadingIndicator';

function useFetch(path) {
  const [data, setData] = useState(null);
  useEffect(() => { request(path).then(setData).catch(() => setData([])); }, [path]);
  return data;
}
const Loading = () => <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
const Empty = () => <Text style={s.empty}>موردی یافت نشد.</Text>;
const matchq = (obj, q) => { if (!q) return true; q = q.trim(); return Object.values(obj).some((v) => String(v || '').indexOf(q) >= 0); };
function SearchBar({ value, onChange, placeholder }) {
  return <TextInput style={s.search} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} />;
}

// فیلتر مشترک لیست‌های انقضا: جستجوی کد ملی/متن + پلاک گرافیکی + فیلتر خط
function ExpiryFilters({ q, setQ, plateQ, setPlateQ, lineFilter, setLineFilter, lines }) {
  const [showPlate, setShowPlate] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const pickedLine = lines.find((l) => String(l.id) === String(lineFilter));
  return (
    <View>
      <SearchBar value={q} onChange={setQ} placeholder="جستجو بر اساس کد ملی، نام، مدل…" />
      <View style={ef.row}>
        <TouchableOpacity style={[ef.toggle, showPlate && ef.toggleOn]} onPress={() => setShowPlate((v) => !v)}>
          <Text style={[ef.toggleTxt, showPlate && { color: '#fff' }]}>🚖 جستجوی پلاک</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ef.toggle, lineFilter && ef.toggleOn]} onPress={() => setLineOpen(true)}>
          <Text style={[ef.toggleTxt, lineFilter && { color: '#fff' }]}>
            {pickedLine ? `خط ${faNum(pickedLine.code)}` : '🔻 فیلتر خط'}
          </Text>
        </TouchableOpacity>
        {(lineFilter || plateQ) ? (
          <TouchableOpacity style={ef.clear} onPress={() => { setLineFilter(null); setPlateQ(''); }}>
            <Text style={ef.clearTxt}>پاک</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showPlate && <PlateSearch onSearch={(plate) => { setPlateQ(plate); }} onClear={() => setPlateQ('')} />}
      {!!plateQ && <Text style={ef.plateActive}>فیلتر پلاک فعال: {faNum(plateQ)}</Text>}

      <Modal visible={lineOpen} transparent animationType="slide" onRequestClose={() => setLineOpen(false)}>
        <View style={ef.modalWrap}>
          <View style={ef.modalCard}>
            <Text style={ef.modalTitle}>انتخاب خط</Text>
            <FlatList data={[{ id: null, code: 'همهٔ خطوط' }, ...lines]} keyExtractor={(it) => String(it.id)}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={ef.lineRow} onPress={() => { setLineFilter(item.id); setLineOpen(false); }}>
                  <Text style={ef.lineTxt}>{item.id ? `خط ${faNum(item.code)}` : item.code}{item.origin ? ` (${item.origin})` : ''}</Text>
                </TouchableOpacity>
              )} />
            <TouchableOpacity style={ef.modalClose} onPress={() => setLineOpen(false)}><Text style={ef.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ef = StyleSheet.create({
  row: { flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
  toggle: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  toggleOn: { backgroundColor: C.brand, borderColor: C.brand },
  toggleTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12.5 },
  clear: { paddingVertical: 8, paddingHorizontal: 10 },
  clearTxt: { color: C.danger, fontFamily: FONT.bold, fontSize: 12.5 },
  plateActive: { fontFamily: FONT.regular, color: C.brand, fontSize: 12, textAlign: 'right', marginTop: 6 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '75%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  lineRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 7 },
  lineTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  modalClose: { backgroundColor: C.ink, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  modalCloseTxt: { color: '#fff', fontFamily: FONT.bold },
});

// هوک مشترک برای بارگذاری خطوط کاربر
function useMyLines() {
  const [lines, setLines] = useState([]);
  useEffect(() => { request('/my/lines').then((l) => setLines(l || [])).catch(() => setLines([])); }, []);
  return lines;
}

// تطبیق پلاک: نرمال‌سازی ارقام و حذف جداکننده‌ها
function plateMatch(rowPlate, query) {
  if (!query) return true;
  const norm = (s) => String(s || '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[\s\-]/g, '');
  return norm(rowPlate).includes(norm(query).replace(/ت/g, 'ت'));
}
const PAGE = 10;
function expKey(s) { const p = jParts(s); if (!p) return 99999999; return p[0] * 10000 + p[1] * 100 + p[2]; }

export function ActivityReportScreen() {
  const rows = useFetch('/my/driver-activity');
  if (rows === null) return <Loading />;
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 14 }}>
      {rows.length === 0 ? <Empty /> : rows.map((r, i) => (
        <View key={i} style={s.card}>
          <Text style={s.title}>خط {r.line}</Text>
          <View style={s.row}><Text style={[s.k, { color: C.ok }]}>پرکارترین: {r.busiest.name}</Text><Text style={s.v}>{faNum(Number(r.busiest.n))} حضور</Text></View>
          <View style={s.row}><Text style={[s.k, { color: C.danger }]}>کم‌کارترین: {r.idlest.name}</Text><Text style={s.v}>{faNum(Number(r.idlest.n))} حضور</Text></View>
        </View>
      ))}
    </ScrollView>
  );
}

export function ExpInsuranceScreen({ navigation }) {
  const ins = useFetch('/my/expiring?type=insurance');
  const insp = useFetch('/my/expiring?type=inspection');
  const myLines = useMyLines();
  const [q, setQ] = useState(''); const [f, setF] = useState('all');
  const [plateQ, setPlateQ] = useState(''); const [lineFilter, setLineFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(null); const [to, setTo] = useState(null); const [pick, setPick] = useState(null);
  const [smsing, setSmsing] = useState(null);
  const openNotice = async (r) => {
    const nid = r.owner_national_id || r.national_id;
    if (!nid) { Alert.alert('توجه', 'کد ملی راننده موجود نیست.'); return; }
    try { const res = await request('/search?national_id=' + nid);
      if (res.type === 'driver') navigation.navigate('Notice', { driver: res.driver, warnings: res.warnings || [], preset: r._k });
    } catch (e) { Alert.alert('خطا', 'راننده یافت نشد.'); }
  };
  const sendSms = async (r) => {
    const kind = r._k === 'بیمه' ? 'insurance' : 'inspection';
    setSmsing(r.plate + kind);
    try {
      await request('/admin/expiry-sms', { method: 'POST', body: { plate: r.plate, kind } });
      Alert.alert('ارسال شد', `پیامک ${r._k} برای راننده ارسال شد.`);
    } catch (e) { Alert.alert('خطا', e.message || 'ارسال ناموفق بود.'); }
    finally { setSmsing(null); }
  };
  const lineCode = useMemo(() => { const l = myLines.find((x) => String(x.id) === String(lineFilter)); return l ? String(l.code) : null; }, [lineFilter, myLines]);
  const list = useMemo(() => {
    if (ins === null || insp === null) return null;
    let l = [];
    if (f === 'all' || f === 'ins') l = l.concat(ins.map((r) => ({ ...r, _k: 'بیمه' })));
    if (f === 'all' || f === 'insp') l = l.concat(insp.map((r) => ({ ...r, _k: 'معاینه فنی' })));
    l = l.filter((r) => matchq({ plate: r.plate, model: r.model_name, line: r.line, k: r._k, nid: r.national_id || r.owner_national_id }, q));
    if (plateQ) l = l.filter((r) => plateMatch(r.plate, plateQ));
    if (lineCode) l = l.filter((r) => String(r.line) === lineCode);
    if (from || to) { const ff = from ? [from.jy, from.jm, from.jd] : null; const tt = to ? [to.jy, to.jm, to.jd] : null; l = l.filter((r) => inJRange(r.expire, ff, tt)); }
    l.sort((a, b) => expKey(a.expire) - expKey(b.expire));
    return l;
  }, [ins, insp, q, f, from, to, plateQ, lineCode]);
  useEffect(() => { setPage(1); }, [q, f, from, to, plateQ, lineFilter]);
  if (list === null) return <Loading />;
  const shown = list.slice(0, page * PAGE);
  const Chip = ({ id, label }) => (
    <TouchableOpacity style={[s.fchip, f === id && s.fchipOn]} onPress={() => setF(id)}><Text style={[s.fchipTxt, f === id && { color: '#fff' }]}>{label}</Text></TouchableOpacity>
  );
  return (
    <View style={s.wrap}>
      <FlatList contentContainerStyle={{ padding: 14 }} data={shown} keyExtractor={(_, i) => String(i)}
        onEndReached={() => { if (shown.length < list.length) setPage((p) => p + 1); }} onEndReachedThreshold={0.4}
        ListHeaderComponent={<>
          <ExpiryFilters q={q} setQ={setQ} plateQ={plateQ} setPlateQ={setPlateQ} lineFilter={lineFilter} setLineFilter={setLineFilter} lines={myLines} />
          <View style={s.frow}><Chip id="all" label="همه" /><Chip id="ins" label="بیمه" /><Chip id="insp" label="معاینه فنی" /></View>
          <View style={s.dateRow}>
            <TouchableOpacity style={s.dBtn} onPress={() => setPick('from')}><Text style={s.dBtnTxt}>{from ? jLabel(from.jy, from.jm, from.jd) : 'از تاریخ انقضا'}</Text></TouchableOpacity>
            <TouchableOpacity style={s.dBtn} onPress={() => setPick('to')}><Text style={s.dBtnTxt}>{to ? jLabel(to.jy, to.jm, to.jd) : 'تا تاریخ انقضا'}</Text></TouchableOpacity>
            {(from || to) ? <TouchableOpacity onPress={() => { setFrom(null); setTo(null); }}><Text style={s.clr}>پاک</Text></TouchableOpacity> : null}
          </View>
          <Text style={s.section}>{faNum(list.length)} مورد (مرتب بر اساس نزدیک‌ترین تاریخ)</Text>
        </>}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={shown.length < list.length ? <Text style={s.more}>در حال بارگذاری بیشتر…</Text> : null}
        renderItem={({ item: r }) => (
          <View style={s.card}>
            <Text style={s.title}>پلاک {faNum(r.plate)}</Text>
            <Text style={s.meta}>{r.model_name || ''} · خط {faNum(r.line || '—')} · {r._k}: {faNum(r.expire)}</Text>
            <View style={s.actRow}>
              <TouchableOpacity style={s.actNotice} onPress={() => openNotice(r)}><Text style={s.actNoticeTxt}>✎ ثبت تذکر</Text></TouchableOpacity>
              <TouchableOpacity style={s.actSms} disabled={smsing === r.plate + (r._k === 'بیمه' ? 'insurance' : 'inspection')} onPress={() => sendSms(r)}>
                <Text style={s.actSmsTxt}>{smsing === r.plate + (r._k === 'بیمه' ? 'insurance' : 'inspection') ? '...' : '✉ ارسال پیامک'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )} />
      <JDatePicker visible={!!pick} onClose={() => setPick(null)} initial={null} onSelect={(d) => { const v = { jy: d.jy, jm: d.jm, jd: d.jd }; if (pick === 'from') setFrom(v); else setTo(v); }} />
    </View>
  );
}

export function ExpTaxiScreen({ navigation }) {
  const rows = useFetch('/my/expiring?type=taxi');
  const myLines = useMyLines();
  const [q, setQ] = useState('');
  const [plateQ, setPlateQ] = useState(''); const [lineFilter, setLineFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(null); const [to, setTo] = useState(null); const [pick, setPick] = useState(null);
  const [smsing, setSmsing] = useState(null);
  const notice = async (nid) => {
    try { const res = await request('/search?national_id=' + nid);
      if (res.type === 'driver') navigation.navigate('Notice', { driver: res.driver, warnings: res.warnings || [] });
    } catch (e) {}
  };
  const sendLicSms = async (r) => {
    setSmsing(r.national_id);
    try {
      await request('/admin/license-sms', { method: 'POST', body: { national_id: r.national_id, kind: 'taxi' } });
      Alert.alert('ارسال شد', 'پیامک پروانهٔ تاکسیرانی برای راننده ارسال شد.');
    } catch (e) { Alert.alert('خطا', e.message || 'ارسال ناموفق بود.'); }
    finally { setSmsing(null); }
  };
  const lineCode = useMemo(() => { const l = myLines.find((x) => String(x.id) === String(lineFilter)); return l ? String(l.code) : null; }, [lineFilter, myLines]);
  const list = useMemo(() => {
    if (rows === null) return null;
    let l = rows.filter((r) => matchq({ n: r.first_name, l: r.last_name, nid: r.national_id, line: r.line }, q));
    if (plateQ) l = l.filter((r) => plateMatch(r.plate, plateQ));
    if (lineCode) l = l.filter((r) => String(r.line) === lineCode);
    if (from || to) { const ff = from ? [from.jy, from.jm, from.jd] : null; const tt = to ? [to.jy, to.jm, to.jd] : null; l = l.filter((r) => inJRange(r.expire, ff, tt)); }
    l.sort((a, b) => expKey(a.expire) - expKey(b.expire));
    return l;
  }, [rows, q, from, to, plateQ, lineCode]);
  useEffect(() => { setPage(1); }, [q, from, to, plateQ, lineFilter]);
  if (list === null) return <Loading />;
  const shown = list.slice(0, page * PAGE);
  return (
    <View style={s.wrap}>
      <FlatList contentContainerStyle={{ padding: 14 }} data={shown} keyExtractor={(_, i) => String(i)}
        onEndReached={() => { if (shown.length < list.length) setPage((p) => p + 1); }} onEndReachedThreshold={0.4}
        ListHeaderComponent={<>
          <ExpiryFilters q={q} setQ={setQ} plateQ={plateQ} setPlateQ={setPlateQ} lineFilter={lineFilter} setLineFilter={setLineFilter} lines={myLines} />
          <View style={s.dateRow}>
            <TouchableOpacity style={s.dBtn} onPress={() => setPick('from')}><Text style={s.dBtnTxt}>{from ? jLabel(from.jy, from.jm, from.jd) : 'از تاریخ'}</Text></TouchableOpacity>
            <TouchableOpacity style={s.dBtn} onPress={() => setPick('to')}><Text style={s.dBtnTxt}>{to ? jLabel(to.jy, to.jm, to.jd) : 'تا تاریخ'}</Text></TouchableOpacity>
            {(from || to) ? <TouchableOpacity onPress={() => { setFrom(null); setTo(null); }}><Text style={s.clr}>پاک</Text></TouchableOpacity> : null}
          </View>
          <Text style={s.section}>{faNum(list.length)} نفر (مرتب بر اساس نزدیک‌ترین تاریخ)</Text>
        </>}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={shown.length < list.length ? <Text style={s.more}>در حال بارگذاری بیشتر…</Text> : null}
        renderItem={({ item: r }) => (
          <View style={s.card}><Text style={s.title}>{r.first_name} {r.last_name}</Text>
            <Text style={s.meta}>کد ملی {faNum(r.national_id)} · خط {faNum(r.line || '—')} · انقضا: {faNum(r.expire)}</Text>
            <View style={s.actRow}>
              <TouchableOpacity style={s.actNotice} onPress={() => notice(r.national_id)}><Text style={s.actNoticeTxt}>✎ ثبت تذکر</Text></TouchableOpacity>
              <TouchableOpacity style={s.actSms} disabled={smsing === r.national_id} onPress={() => sendLicSms(r)}>
                <Text style={s.actSmsTxt}>{smsing === r.national_id ? '...' : '✉ ارسال پیامک'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )} />
      <JDatePicker visible={!!pick} onClose={() => setPick(null)} initial={null} onSelect={(d) => { const v = { jy: d.jy, jm: d.jm, jd: d.jd }; if (pick === 'from') setFrom(v); else setTo(v); }} />
    </View>
  );
}

export function TeamReportScreen() {
  const d = useFetch('/my/team');
  const [linesModal, setLinesModal] = useState(null); // {name, lines}
  if (d === null) return <Loading />;
  const groups = Object.entries(d.groups || {});
  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 14 }}>
      {(d.busiest || d.idlest) && (
        <View style={s.card}><Text style={s.title}>کارایی زیرمجموعه</Text>
          {d.busiest && <View style={s.row}><Text style={[s.k, { color: C.ok }]}>پرکارترین: {d.busiest.name}</Text><Text style={s.v}>{faNum(Number(d.busiest.total))}</Text></View>}
          {d.idlest && <View style={s.row}><Text style={[s.k, { color: C.danger }]}>کم‌کارترین: {d.idlest.name}</Text><Text style={s.v}>{faNum(Number(d.idlest.total))}</Text></View>}
        </View>
      )}
      {groups.length === 0 ? <Empty /> : groups.map(([role, list]) => (
        <View key={role} style={s.card}>
          <Text style={s.title}>{role} ({faNum(Number(list.length))})</Text>
          {list.map((m) => (
            <View key={m.id} style={tm.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={tm.memberName}>{m.name}</Text>
                {!!m.role_title && <Text style={tm.memberRole}>{m.role_title}</Text>}
                {m.line_count > 0 ? (
                  m.line_count <= 6 ? (
                    <Text style={tm.memberLines}>خطوط: {m.lines.map((l) => faNum(l)).join('، ')}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => setLinesModal({ name: m.name, lines: m.lines })}>
                      <Text style={tm.memberLinesLink}>خطوط: {m.lines.slice(0, 6).map((l) => faNum(l)).join('، ')} … (نمایش همهٔ {faNum(m.line_count)} خط)</Text>
                    </TouchableOpacity>
                  )
                ) : <Text style={tm.memberNoLine}>بدون خط اختصاصی</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}

      <Modal visible={!!linesModal} transparent animationType="fade" onRequestClose={() => setLinesModal(null)}>
        <View style={tm.modalBg}>
          <View style={tm.modalBox}>
            <Text style={tm.modalTitle}>خطوط {linesModal?.name}</Text>
            <Text style={tm.modalSub}>{faNum(linesModal?.lines?.length || 0)} خط</Text>
            <ScrollView style={{ maxHeight: 340, marginVertical: 10 }}>
              <View style={tm.chipWrap}>
                {(linesModal?.lines || []).map((l, i) => (
                  <View key={i} style={tm.lineChip}><Text style={tm.lineChipTxt}>خط {faNum(l)}</Text></View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={tm.closeBtn} onPress={() => setLinesModal(null)}>
              <Text style={tm.closeTxt}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const tm = StyleSheet.create({
  memberRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eef1f6' },
  memberName: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  memberRole: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 2 },
  memberLines: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, textAlign: 'right', marginTop: 4 },
  memberLinesLink: { fontFamily: FONT.regular, color: C.brand, fontSize: 12, textAlign: 'right', marginTop: 4 },
  memberNoLine: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 380 },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 16, textAlign: 'right' },
  modalSub: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  chipWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  lineChip: { backgroundColor: '#eef7f3', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: '#cfe8df' },
  lineChipTxt: { fontFamily: FONT.bold, color: C.brand, fontSize: 12.5 },
  closeBtn: { backgroundColor: C.brand, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  closeTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
});

export function ExpOplicScreen({ navigation }) {
  const rows = useFetch('/my/expiring?type=oplic');
  const myLines = useMyLines();
  const [q, setQ] = useState('');
  const [plateQ, setPlateQ] = useState(''); const [lineFilter, setLineFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(null); const [to, setTo] = useState(null); const [pick, setPick] = useState(null);
  const [smsing, setSmsing] = useState(null);
  const sendSms = async (r) => {
    const nid = r.owner_national_id || r.national_id;
    if (!nid) { Alert.alert('توجه', 'کد ملی راننده موجود نیست.'); return; }
    setSmsing(r.plate);
    try {
      await request('/admin/license-sms', { method: 'POST', body: { national_id: nid, kind: 'oplic' } });
      Alert.alert('ارسال شد', 'پیامک پروانهٔ بهره‌برداری برای راننده ارسال شد.');
    } catch (e) { Alert.alert('خطا', e.message || 'ارسال ناموفق بود.'); }
    finally { setSmsing(null); }
  };
  const openNotice = async (r) => {
    const nid = r.owner_national_id || r.national_id;
    if (!nid) { Alert.alert('توجه', 'کد ملی راننده موجود نیست.'); return; }
    try { const res = await request('/search?national_id=' + nid);
      if (res.type === 'driver') navigation.navigate('Notice', { driver: res.driver, warnings: res.warnings || [], preset: 'پروانهٔ بهره‌برداری' });
    } catch (e) { Alert.alert('خطا', 'راننده یافت نشد.'); }
  };
  const lineCode = useMemo(() => { const l = myLines.find((x) => String(x.id) === String(lineFilter)); return l ? String(l.code) : null; }, [lineFilter, myLines]);
  const list = useMemo(() => {
    if (rows === null) return null;
    let l = rows.filter((r) => matchq({ plate: r.plate, ben: r.beneficiary, line: r.line, nid: r.national_id || r.owner_national_id }, q));
    if (plateQ) l = l.filter((r) => plateMatch(r.plate, plateQ));
    if (lineCode) l = l.filter((r) => String(r.line) === lineCode);
    if (from || to) { const ff = from ? [from.jy, from.jm, from.jd] : null; const tt = to ? [to.jy, to.jm, to.jd] : null; l = l.filter((r) => inJRange(r.expire, ff, tt)); }
    l.sort((a, b) => expKey(a.expire) - expKey(b.expire));
    return l;
  }, [rows, q, from, to, plateQ, lineCode]);
  useEffect(() => { setPage(1); }, [q, from, to, plateQ, lineFilter]);
  if (list === null) return <Loading />;
  const shown = list.slice(0, page * PAGE);
  return (
    <View style={s.wrap}>
      <FlatList contentContainerStyle={{ padding: 14 }} data={shown} keyExtractor={(_, i) => String(i)}
        onEndReached={() => { if (shown.length < list.length) setPage((p) => p + 1); }} onEndReachedThreshold={0.4}
        ListHeaderComponent={<>
          <ExpiryFilters q={q} setQ={setQ} plateQ={plateQ} setPlateQ={setPlateQ} lineFilter={lineFilter} setLineFilter={setLineFilter} lines={myLines} />
          <View style={s.dateRow}>
            <TouchableOpacity style={s.dBtn} onPress={() => setPick('from')}><Text style={s.dBtnTxt}>{from ? jLabel(from.jy, from.jm, from.jd) : 'از تاریخ'}</Text></TouchableOpacity>
            <TouchableOpacity style={s.dBtn} onPress={() => setPick('to')}><Text style={s.dBtnTxt}>{to ? jLabel(to.jy, to.jm, to.jd) : 'تا تاریخ'}</Text></TouchableOpacity>
            {(from || to) ? <TouchableOpacity onPress={() => { setFrom(null); setTo(null); }}><Text style={s.clr}>پاک</Text></TouchableOpacity> : null}
          </View>
          <Text style={s.section}>{faNum(list.length)} مورد (مرتب بر اساس نزدیک‌ترین تاریخ)</Text>
        </>}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={shown.length < list.length ? <Text style={s.more}>در حال بارگذاری بیشتر…</Text> : null}
        renderItem={({ item: r }) => (
          <View style={s.card}><Text style={s.title}>پلاک {faNum(r.plate)}</Text>
            <Text style={s.meta}>خط {faNum(r.line || '—')} · بهره‌بردار: {r.beneficiary || '—'} · انقضا: {faNum(r.expire)}</Text>
            <View style={s.actRow}>
              <TouchableOpacity style={s.actNotice} onPress={() => openNotice(r)}><Text style={s.actNoticeTxt}>✎ ثبت تذکر</Text></TouchableOpacity>
              <TouchableOpacity style={s.actSms} disabled={smsing === r.plate} onPress={() => sendSms(r)}>
                <Text style={s.actSmsTxt}>{smsing === r.plate ? '...' : '✉ ارسال پیامک'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )} />
      <JDatePicker visible={!!pick} onClose={() => setPick(null)} initial={null} onSelect={(d) => { const v = { jy: d.jy, jm: d.jm, jd: d.jd }; if (pick === 'from') setFrom(v); else setTo(v); }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginVertical: 16 },
  section: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', marginTop: 14, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  dateRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 10, alignItems: 'center' },
  dBtn: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11 },
  dBtnTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 11.5 },
  clr: { color: C.danger, fontFamily: FONT.regular, fontSize: 11, paddingHorizontal: 6 },
  more: { textAlign: 'center', color: C.muted, fontFamily: FONT.regular, fontSize: 12, paddingVertical: 12 },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 3 },
  actRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actNotice: { backgroundColor: '#eef2ff', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 14 },
  actNoticeTxt: { fontFamily: FONT.bold, color: '#2746a6', fontSize: 12 },
  actSms: { backgroundColor: '#eafaf1', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 14 },
  actSmsTxt: { fontFamily: FONT.bold, color: '#0d7a5f', fontSize: 12 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 6 },
  k: { fontFamily: FONT.regular, fontSize: 13 },
  v: { fontFamily: FONT.bold, fontSize: 12, color: C.ink },
  noticeBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#eef1f7', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  noticeTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  member: { fontFamily: FONT.regular, color: C.ink, fontSize: 13, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.line, textAlign: 'right' },
  search: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 11, textAlign: 'right', fontFamily: FONT.regular, color: C.ink, marginBottom: 8 },
  frow: { flexDirection: 'row-reverse', gap: 6, marginBottom: 6 },
  fchip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  fchipOn: { backgroundColor: C.brand, borderColor: C.brand },
  fchipTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
});
