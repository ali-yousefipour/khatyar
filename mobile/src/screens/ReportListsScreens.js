import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
function ExpiryFilters({ q, setQ, plateQ, setPlateQ, lineFilter, setLineFilter, lines, hideSearch = false }) {
  const [showPlate, setShowPlate] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const pickedLine = lines.find((l) => String(l.id) === String(lineFilter));
  return (
    <View>
      {!hideSearch && <SearchBar value={q} onChange={setQ} placeholder="جستجو بر اساس کد ملی، نام، مدل…" />}
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

function ActivityPerson({ title, person, busy }) {
  const tint = busy ? '#e9f7f0' : '#fff0f1';
  const ink = busy ? '#087755' : '#b63d50';
  return <View style={[ar.person,{backgroundColor:tint}]}>
    <View style={ar.personHeader}><MaterialCommunityIcons name={busy?'trending-up':'trending-down'} size={19} color={ink}/><Text style={[ar.personLabel,{color:ink}]}>{title}</Text></View>
    <Text style={ar.personName} numberOfLines={3}>{person?.name||'اطلاعات موجود نیست'}</Text>
    <View style={ar.countRow}><Text style={[ar.countNumber,{color:ink}]}>{faNum(Number(person?.n||0))}</Text><Text style={ar.countUnit}>حضور ثبت‌شده</Text></View>
  </View>;
}
export function ActivityReportScreen() {
  const rows = useFetch('/my/driver-activity');
  if (rows === null) return <Loading />;
  const items = Array.isArray(rows)?rows:[];
  return (
    <ScrollView persistentScrollbar={true} style={s.wrap} contentContainerStyle={ar.content}>
      <View style={ar.hero}>
        <View style={ar.heroHeader}><MaterialCommunityIcons name="chart-timeline-variant" size={27} color="#fff"/><Text style={ar.heroTitle}>پرکارترین و کم‌کارترین هر خط</Text></View>
        <Text style={ar.heroSubtitle}>مقایسه تعداد حضور ثبت‌شده رانندگان در خطوط فعالیت</Text>
        <View style={ar.heroStat}><Text style={ar.heroNumber}>{faNum(items.length)}</Text><Text style={ar.heroStatText}>خط در گزارش</Text></View>
      </View>
      <View style={ar.listHeader}><Text style={ar.listTitle}>عملکرد خطوط</Text><Text style={ar.listHint}>بر اساس اطلاعات ثبت‌شده</Text></View>
      {items.length===0?<Empty/>:items.map((r,i)=>(
        <View key={String(r.line??i)} style={ar.card}>
          <View style={ar.cardHeader}>
            <View style={ar.lineBadge}><MaterialCommunityIcons name="bus" size={18} color={C.brand}/><Text style={ar.lineTitle}>خط {faNum(r.line??'—')}</Text></View>
            <Text style={ar.cardCaption}>مقایسه میزان حضور</Text>
          </View>
          <ActivityPerson title="پرکارترین" person={r.busiest} busy />
          <ActivityPerson title="کم‌کارترین" person={r.idlest} busy={false}/>
        </View>
      ))}
    </ScrollView>
  );
}
const ar=StyleSheet.create({
  content:{paddingHorizontal:16,paddingTop:18,paddingBottom:48},
  hero:{backgroundColor:C.brand,borderRadius:23,padding:20,marginBottom:20},
  heroHeader:{flexDirection:'row-reverse',alignItems:'center',gap:10},
  heroTitle:{fontFamily:FONT.bold,fontSize:19,color:'#fff',textAlign:'right',flex:1},
  heroSubtitle:{fontFamily:FONT.regular,fontSize:12,color:'#d8f3e8',textAlign:'right',lineHeight:22,marginTop:9},
  heroStat:{flexDirection:'row-reverse',alignItems:'center',gap:9,backgroundColor:'rgba(255,255,255,0.14)',borderRadius:14,padding:12,marginTop:16},
  heroNumber:{fontFamily:FONT.bold,color:'#fff',fontSize:22},
  heroStatText:{fontFamily:FONT.regular,color:'#fff',fontSize:12},
  listHeader:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8},
  listTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:16},
  listHint:{fontFamily:FONT.regular,color:C.muted,fontSize:11},
  card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:20,padding:15,marginBottom:14},
  cardHeader:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:14},
  lineBadge:{flexDirection:'row-reverse',alignItems:'center',gap:8,backgroundColor:'#e8f5ee',borderRadius:12,paddingHorizontal:12,paddingVertical:9},
  lineTitle:{fontFamily:FONT.bold,color:C.brand,fontSize:15},
  cardCaption:{fontFamily:FONT.regular,color:C.muted,fontSize:11},
  person:{borderRadius:15,padding:14,marginBottom:9},
  personHeader:{flexDirection:'row-reverse',alignItems:'center',gap:7},
  personLabel:{fontFamily:FONT.bold,fontSize:12},
  personName:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right',marginTop:9,lineHeight:25},
  countRow:{flexDirection:'row-reverse',alignItems:'baseline',gap:7,marginTop:7},
  countNumber:{fontFamily:FONT.bold,fontSize:23},
  countUnit:{fontFamily:FONT.regular,color:C.slate,fontSize:12},
});

function ExpiryHero({ title, description, total, filtered, icon }) {
  return <View style={op.hero}>
    <View style={{flexDirection:'row-reverse',alignItems:'center',gap:10}}>
      <MaterialCommunityIcons name={icon} size={26} color="#fff"/>
      <View style={{flex:1}}><Text style={op.heroTitle}>{title}</Text><Text style={op.heroDesc}>{description}</Text></View>
    </View>
    <View style={op.heroStats}>
      <View style={op.heroStat}><Text style={op.heroStatNum}>{faNum(total)}</Text><Text style={op.heroStatLabel}>کل موارد دریافتی</Text></View>
      <View style={op.heroStat}><Text style={op.heroStatNum}>{faNum(filtered)}</Text><Text style={op.heroStatLabel}>نتایج فیلترشده</Text></View>
    </View>
  </View>;
}
function ExpiryInfo({ label, value }) {
  return <View style={op.infoRow}><Text style={op.infoValue} numberOfLines={2}>{faNum(value ?? '—')}</Text><Text style={op.infoLabel}>{label}</Text></View>;
}
function ExpiryFilterDates({ from, to, setFrom, setTo, setPick }) {
  return <View><Text style={op.fieldLabel}>بازه تاریخ انقضا</Text>
    <View style={op.dateButtons}>
      <TouchableOpacity style={op.dateButton} onPress={()=>setPick('from')}><Text style={op.dateText}>{from?jLabel(from.jy,from.jm,from.jd):'از تاریخ'}</Text></TouchableOpacity>
      <TouchableOpacity style={op.dateButton} onPress={()=>setPick('to')}><Text style={op.dateText}>{to?jLabel(to.jy,to.jm,to.jd):'تا تاریخ'}</Text></TouchableOpacity>
    </View>
    {(from||to)?<TouchableOpacity style={op.resetButton} onPress={()=>{setFrom(null);setTo(null)}}><Text style={op.resetText}>پاک‌کردن بازه تاریخ</Text></TouchableOpacity>:null}
  </View>;
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
          <ExpiryHero title="بیمه و معاینه فنی خودروها" description="پیگیری اعتبار مدارک خودروها و اطلاع‌رسانی انقضا" total={(ins?.length||0)+(insp?.length||0)} filtered={list.length} icon="shield-car"/>
          <View style={op.filters}><Text style={op.filterTitle}>جستجو و پالایش خودروها</Text>
            <ExpiryFilters q={q} setQ={setQ} plateQ={plateQ} setPlateQ={setPlateQ} lineFilter={lineFilter} setLineFilter={setLineFilter} lines={myLines} />
            <View style={[s.frow,{flexWrap:'wrap',marginTop:12}]}><Chip id="all" label="همه" /><Chip id="ins" label="بیمه" /><Chip id="insp" label="معاینه فنی" /></View>
            <ExpiryFilterDates from={from} to={to} setFrom={setFrom} setTo={setTo} setPick={setPick}/>
          </View>
          <View style={op.resultRow}><Text style={op.resultText}>{faNum(list.length)} خودرو</Text><Text style={op.resultHint}>بر اساس نزدیک‌ترین تاریخ انقضا</Text></View>
        </>}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={shown.length < list.length ? <Text style={s.more}>در حال بارگذاری بیشتر…</Text> : null}
        renderItem={({ item: r }) => (
          <View style={op.vehicleCard}>
            <View style={op.cardTop}><Text style={op.plateTitle}>پلاک {faNum(r.plate)}</Text><View style={op.statusTag}><Text style={op.statusText}>{r._k}</Text></View></View>
            <View style={op.cardDivider}/>
            <ExpiryInfo label="مدل خودرو" value={r.model_name||'نامشخص'}/>
            <ExpiryInfo label="خط فعالیت" value={r.line?'خط '+faNum(r.line):'نامشخص'}/>
            <View style={op.expiryRow}><Text style={op.expiryValue}>{faNum(r.expire||'نامشخص')}</Text><Text style={op.expiryLabel}>تاریخ انقضای {r._k}</Text></View>
            <View style={op.actionRow}>
              <TouchableOpacity style={op.actionNotice} onPress={() => openNotice(r)}><Text style={op.actionNoticeText}>✎ ثبت تذکر</Text></TouchableOpacity>
              <TouchableOpacity style={op.actionSms} disabled={smsing === r.plate + (r._k === 'بیمه' ? 'insurance' : 'inspection')} onPress={() => sendSms(r)}><Text style={op.actionSmsText}>{smsing === r.plate + (r._k === 'بیمه' ? 'insurance' : 'inspection') ? 'در حال ارسال…' : '✉ ارسال پیامک'}</Text></TouchableOpacity>
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
          <ExpiryHero title="افراد فاقد اعتبار" description="بررسی اعتبار پروانه تاکسیرانی و پیگیری رانندگان" total={rows?.length||0} filtered={list.length} icon="card-account-details-outline"/>
          <View style={op.filters}><Text style={op.filterTitle}>جستجو و پالایش افراد</Text>
            <ExpiryFilters q={q} setQ={setQ} plateQ={plateQ} setPlateQ={setPlateQ} lineFilter={lineFilter} setLineFilter={setLineFilter} lines={myLines} />
            <ExpiryFilterDates from={from} to={to} setFrom={setFrom} setTo={setTo} setPick={setPick}/>
          </View>
          <View style={op.resultRow}><Text style={op.resultText}>{faNum(list.length)} نفر</Text><Text style={op.resultHint}>بر اساس نزدیک‌ترین تاریخ انقضا</Text></View>
        </>}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={shown.length < list.length ? <Text style={s.more}>در حال بارگذاری بیشتر…</Text> : null}
        renderItem={({ item: r }) => (
          <View style={op.vehicleCard}>
            <View style={op.cardTop}><Text style={op.plateTitle}>{r.first_name} {r.last_name}</Text><View style={op.statusTag}><Text style={op.statusText}>نیازمند بررسی اعتبار</Text></View></View>
            <View style={op.cardDivider}/>
            <ExpiryInfo label="کد ملی" value={r.national_id}/>
            <ExpiryInfo label="خط فعالیت" value={r.line?'خط '+faNum(r.line):'نامشخص'}/>
            <View style={op.expiryRow}><Text style={op.expiryValue}>{faNum(r.expire||'نامشخص')}</Text><Text style={op.expiryLabel}>تاریخ انقضای پروانه</Text></View>
            <View style={op.actionRow}>
              <TouchableOpacity style={op.actionNotice} onPress={() => notice(r.national_id)}><Text style={op.actionNoticeText}>✎ ثبت تذکر</Text></TouchableOpacity>
              <TouchableOpacity style={op.actionSms} disabled={smsing === r.national_id} onPress={() => sendLicSms(r)}><Text style={op.actionSmsText}>{smsing === r.national_id ? 'در حال ارسال…' : '✉ ارسال پیامک'}</Text></TouchableOpacity>
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
    <ScrollView persistentScrollbar={true} style={s.wrap} contentContainerStyle={{ padding: 14 }}>
      {(d.busiest || d.idlest) && (
        <View style={s.card}><Text style={s.title}>کارایی زیرمجموعه</Text>
          {d.busiest && <View style={s.row}><Text style={[s.k, { color: C.ok }]}>پرکارترین: {d.busiest.name}</Text><Text style={s.v}>{faNum(Number(d.busiest.total))}</Text></View>}
          {d.idlest && <View style={s.row}><Text style={[s.k, { color: C.danger }]}>کم‌کارترین: {d.idlest.name}</Text><Text style={s.v}>{faNum(Number(d.idlest.total))}</Text></View>}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.title}>وضعیت نیروهای منطقه‌های تحت مسئولیت</Text>
        <View style={s.row}>
          <Text style={s.k}>کل زیرمجموعه: {faNum(Number(d.total || 0))}</Text>
          <Text style={[s.v, { color: C.ok }]}>حاضر: {faNum(Number(d.present || 0))}</Text>
          <Text style={[s.v, { color: C.danger }]}>بدون حضور: {faNum(Number(d.absent || 0))}</Text>
        </View>
      </View>
      {groups.length === 0 ? <Empty /> : groups.map(([role, list]) => (
        <View key={role} style={s.card}>
          <Text style={s.title}>{role} ({faNum(Number(list.length))})</Text>
          {list.map((m) => (
            <View key={m.id} style={tm.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={tm.memberName}>{m.name}</Text>
                {!!m.role_title && <Text style={tm.memberRole}>{m.role_title}</Text>}
                {!!m.zone_name && <Text style={tm.memberRegion}>منطقه: {m.zone_name}</Text>}
                <Text style={[tm.memberAttendance, { color: m.is_present ? C.ok : C.danger }]}>
                  {m.is_present ? '● حاضر' : '● فاقد حضور فعال'} {m.check_in_time ? '  |  ساعت ورود: ' + faNum(m.check_in_time) : '  |  ورود امروز ثبت نشده'}
                </Text>
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
            <ScrollView persistentScrollbar={true} style={{ maxHeight: 340, marginVertical: 10 }}>
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
  memberRegion: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, textAlign: 'right', marginTop: 4 },
  memberAttendance: { fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', marginTop: 4 },
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
  const [advanced, setAdvanced] = useState(false);
  const [sort, setSort] = useState('nearest');
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
    let l = rows.filter((r) => matchq({ plate: r.plate, ben: r.beneficiary, model: r.model_name || r.model, line: r.line, nid: r.national_id || r.owner_national_id }, q));
    if (plateQ) l = l.filter((r) => plateMatch(r.plate, plateQ));
    if (lineCode) l = l.filter((r) => String(r.line) === lineCode);
    if (from || to) { const ff = from ? [from.jy, from.jm, from.jd] : null; const tt = to ? [to.jy, to.jm, to.jd] : null; l = l.filter((r) => inJRange(r.expire, ff, tt)); }
    l.sort((a, b) => sort === 'nearest' ? expKey(a.expire) - expKey(b.expire) : expKey(b.expire) - expKey(a.expire));
    return l;
  }, [rows, q, from, to, plateQ, lineCode, sort]);
  useEffect(() => { setPage(1); }, [q, from, to, plateQ, lineFilter, sort]);
  if (list === null) return <Loading />;
  const shown = list.slice(0, page * PAGE);
  const resetFilters = () => { setQ(''); setPlateQ(''); setLineFilter(null); setFrom(null); setTo(null); setSort('nearest'); };
  const activeFilters = !!(q || plateQ || lineFilter || from || to || sort !== 'nearest');
  return (
    <View style={s.wrap}>
      <FlatList contentContainerStyle={{ padding: 14 }} data={shown} keyExtractor={(_, i) => String(i)}
        onEndReached={() => { if (shown.length < list.length) setPage((p) => p + 1); }} onEndReachedThreshold={0.4}
        ListHeaderComponent={<>
          <View style={op.hero}>
            <Text style={op.heroTitle}>خودروهای فاقد بهره‌برداری</Text>
            <Text style={op.heroDesc}>بررسی اعتبار پروانه بهره‌برداری و پیگیری خودروها</Text>
            <View style={op.heroStats}>
              <View style={op.heroStat}><Text style={op.heroStatNum}>{faNum(rows.length)}</Text><Text style={op.heroStatLabel}>کل موارد دریافتی</Text></View>
              <View style={op.heroStat}><Text style={op.heroStatNum}>{faNum(list.length)}</Text><Text style={op.heroStatLabel}>نتایج فیلترشده</Text></View>
            </View>
          </View>
          <View style={op.filters}>
            <Text style={op.filterTitle}>جستجو و پالایش خودروها</Text>
            <SearchBar value={q} onChange={setQ} placeholder="نام بهره‌بردار، کد ملی، پلاک، مدل یا خط…" />
            <View style={op.filterActions}>
              <TouchableOpacity style={[op.filterButton, advanced && op.filterButtonOn]} onPress={() => setAdvanced(!advanced)} accessibilityRole="button">
                <Text style={[op.filterButtonText, advanced && { color: '#fff' }]}>☷ {advanced ? 'بستن فیلترها' : 'فیلترهای پیشرفته'}</Text>
              </TouchableOpacity>
              {activeFilters && <TouchableOpacity style={op.resetButton} onPress={resetFilters}><Text style={op.resetText}>پاک‌کردن فیلترها</Text></TouchableOpacity>}
            </View>
            {advanced && <>
              <ExpiryFilters q={q} setQ={setQ} plateQ={plateQ} setPlateQ={setPlateQ} lineFilter={lineFilter} setLineFilter={setLineFilter} lines={myLines} hideSearch />
              <Text style={op.fieldLabel}>بازه تاریخ انقضای پروانه</Text>
              <View style={op.dateButtons}>
                <TouchableOpacity style={op.dateButton} onPress={() => setPick('from')}><Text style={op.dateText}>{from ? jLabel(from.jy, from.jm, from.jd) : 'از تاریخ'}</Text></TouchableOpacity>
                <TouchableOpacity style={op.dateButton} onPress={() => setPick('to')}><Text style={op.dateText}>{to ? jLabel(to.jy, to.jm, to.jd) : 'تا تاریخ'}</Text></TouchableOpacity>
              </View>
              <Text style={op.fieldLabel}>مرتب‌سازی بر اساس تاریخ انقضا</Text>
              <View style={op.dateButtons}>
                <TouchableOpacity style={[op.sortButton, sort === 'nearest' && op.sortOn]} onPress={() => setSort('nearest')}><Text style={[op.sortText, sort === 'nearest' && op.sortTextOn]}>قدیمی‌ترین</Text></TouchableOpacity>
                <TouchableOpacity style={[op.sortButton, sort === 'latest' && op.sortOn]} onPress={() => setSort('latest')}><Text style={[op.sortText, sort === 'latest' && op.sortTextOn]}>جدیدترین</Text></TouchableOpacity>
              </View>
            </>}
          </View>
          <View style={op.resultRow}><Text style={op.resultText}>{faNum(list.length)} خودرو</Text><Text style={op.resultHint}>بر اساس تاریخ انقضا</Text></View>
        </>}
        ListEmptyComponent={<View style={op.emptyCard}><Text style={op.emptyTitle}>خودرویی یافت نشد</Text><Text style={op.emptySubtitle}>فیلترها را تغییر دهید یا جستجو را پاک کنید.</Text>{activeFilters && <TouchableOpacity onPress={resetFilters}><Text style={op.resetText}>نمایش همه موارد</Text></TouchableOpacity>}</View>}
        ListFooterComponent={shown.length < list.length ? <Text style={s.more}>در حال بارگذاری بیشتر…</Text> : null}
        renderItem={({ item: r }) => (
          <View style={op.vehicleCard}>
            <View style={op.cardTop}>
              <View style={op.statusTag}><Text style={op.statusText}>نیازمند بررسی اعتبار</Text></View>
              <Text style={op.plateTitle}>پلاک {faNum(r.plate || '—')}</Text>
            </View>
            <View style={op.cardDivider} />
            <View style={op.infoRow}><Text style={op.infoValue}>{r.beneficiary || 'نامشخص'}</Text><Text style={op.infoLabel}>بهره‌بردار</Text></View>
            <View style={op.infoRow}><Text style={op.infoValue}>خط {faNum(r.line || '—')}</Text><Text style={op.infoLabel}>خط فعالیت</Text></View>
            {!!(r.model_name || r.model) && <View style={op.infoRow}><Text style={op.infoValue}>{r.model_name || r.model}</Text><Text style={op.infoLabel}>مدل خودرو</Text></View>}
            <View style={op.expiryRow}><Text style={op.expiryValue}>{faNum(r.expire || 'نامشخص')}</Text><Text style={op.expiryLabel}>تاریخ انقضای پروانه</Text></View>
            <View style={op.actionRow}>
              <TouchableOpacity style={op.actionNotice} onPress={() => openNotice(r)} accessibilityRole="button"><Text style={op.actionNoticeText}>✎ ثبت تذکر</Text></TouchableOpacity>
              <TouchableOpacity style={op.actionSms} disabled={smsing === r.plate} onPress={() => Alert.alert('تأیید ارسال پیامک', 'پیامک یادآوری پروانه بهره‌برداری برای بهره‌بردار این خودرو ارسال شود؟', [{ text: 'انصراف', style: 'cancel' }, { text: 'ارسال', onPress: () => sendSms(r) }])} accessibilityRole="button"><Text style={op.actionSmsText}>{smsing === r.plate ? 'در حال ارسال…' : '✉ ارسال پیامک'}</Text></TouchableOpacity>
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

const op = StyleSheet.create({
  hero: { backgroundColor: C.brand, borderRadius: 20, padding: 18, marginBottom: 14 },
  heroTitle: { fontFamily: FONT.bold, color: '#fff', fontSize: 19, textAlign: 'right' },
  heroDesc: { fontFamily: FONT.regular, color: '#d8f1e8', fontSize: 12, textAlign: 'right', marginTop: 6 },
  heroStats: { flexDirection: 'row-reverse', gap: 10, marginTop: 16 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', padding: 12, borderRadius: 12 },
  heroStatNum: { color: '#fff', fontFamily: FONT.bold, fontSize: 20, textAlign: 'right' },
  heroStatLabel: { color: '#e0f4ee', fontFamily: FONT.regular, fontSize: 11, textAlign: 'right' },
  filters: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 13, marginBottom: 14 },
  filterTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  filterActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  filterButton: { borderWidth: 1, borderColor: C.brand, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  filterButtonOn: { backgroundColor: C.brand },
  filterButtonText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12 },
  resetButton: { paddingVertical: 10, paddingHorizontal: 5 },
  resetText: { color: C.danger, fontFamily: FONT.bold, fontSize: 12, textAlign: 'center' },
  fieldLabel: { color: C.slate, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', marginTop: 14, marginBottom: 7 },
  dateButtons: { flexDirection: 'row-reverse', gap: 9 },
  dateButton: { flex: 1, backgroundColor: '#f7f9fb', borderColor: C.line, borderWidth: 1, borderRadius: 11, paddingVertical: 12, alignItems: 'center' },
  dateText: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  sortButton: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sortOn: { backgroundColor: C.brand, borderColor: C.brand },
  sortText: { color: C.ink, fontFamily: FONT.bold, fontSize: 12 },
  sortTextOn: { color: '#fff' },
  resultRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultText: { color: C.ink, fontFamily: FONT.bold, fontSize: 15 },
  resultHint: { color: C.muted, fontFamily: FONT.regular, fontSize: 11 },
  vehicleCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 15, marginBottom: 12 },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  plateTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 16, textAlign: 'right' },
  statusTag: { backgroundColor: '#fff3df', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: '#9b5a12', fontFamily: FONT.bold, fontSize: 10 },
  cardDivider: { height: 1, backgroundColor: '#edf0f4', marginVertical: 12 },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoLabel: { color: C.muted, fontFamily: FONT.regular, fontSize: 12 },
  infoValue: { color: C.ink, fontFamily: FONT.bold, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  expiryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f6f8fa', borderRadius: 10, padding: 11, marginTop: 3 },
  expiryLabel: { color: C.slate, fontFamily: FONT.regular, fontSize: 12 },
  expiryValue: { color: C.danger, fontFamily: FONT.bold, fontSize: 13 },
  actionRow: { flexDirection: 'row-reverse', gap: 9, marginTop: 13 },
  actionNotice: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 11, backgroundColor: '#eef2ff' },
  actionNoticeText: { color: '#2746a6', fontFamily: FONT.bold, fontSize: 12 },
  actionSms: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 11, backgroundColor: '#e5f5ee' },
  actionSmsText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12 },
  emptyCard: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 15 },
  emptySubtitle: { color: C.muted, fontFamily: FONT.regular, fontSize: 12, textAlign: 'center', marginVertical: 10 },
});
