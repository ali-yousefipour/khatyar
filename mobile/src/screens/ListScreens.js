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
  const { width } = useWindowDimensions();
  const [all, setAll] = useState(null);
  useEffect(() => { request(`/attendance/${driver.id}`).then(setAll).catch(() => setAll([])); }, [driver.id]);
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter((r) => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter((r) => inCurrentJYear(r.created_at)).length : 0;
  const sortedRows = useMemo(() => rows ? [...rows].sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))) : null, [rows]);
  return <View style={{ flex: 1, backgroundColor: C.paper }}>
    <List rows={sortedRows} empty="حضوری در بازه انتخاب‌شده ثبت نشده است"
      header={<>
        <View style={at.header}><View style={at.headerIcon}><MaterialCommunityIcons name="calendar-check-outline" size={25} color={C.brand}/></View><View style={at.headerText}><Text style={at.title}>گزارش حضور راننده</Text><Text style={at.subtitle}>سوابق ثبت حضور و آمار فعالیت</Text></View></View>
        <View style={at.stats}>
          <View style={at.stat}><MaterialCommunityIcons name="calendar-month-outline" size={22} color={C.brand}/><Text style={at.statNumber}>{faNum(cm)}</Text><Text style={at.statLabel}>حضور این ماه</Text></View>
          <View style={at.stat}><MaterialCommunityIcons name="calendar-range-outline" size={22} color={C.brand}/><Text style={at.statNumber}>{faNum(cy)}</Text><Text style={at.statLabel}>حضور امسال</Text></View>
        </View>
        <View style={at.filterCard}><View style={at.sectionRow}><MaterialCommunityIcons name="filter-variant" size={20} color={C.brand}/><Text style={at.sectionTitle}>فیلتر بازه زمانی</Text></View><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo}/></View>
        <View style={at.sectionRow}><MaterialCommunityIcons name="history" size={20} color={C.brand}/><Text style={at.sectionTitle}>سوابق حضور</Text><Text style={at.count}>{faNum(sortedRows?.length || 0)} مورد</Text></View>
      </>}
      render={({ item, index }) => {
        const formatted = faNum(fj(item.created_at));
        const parts = formatted.split(/\\s+/);
        const date = parts[0] || formatted;
        const time = parts.slice(1).join(' ');
        return <View style={at.entry}><View style={at.entryIcon}><MaterialCommunityIcons name="check-circle-outline" size={23} color={C.brand}/></View><View style={at.entryContent}><Text style={at.entryDate}>{date}</Text><Text style={at.entryHint}>ثبت حضور راننده</Text></View>{!!time&&<View style={at.timeBadge}><MaterialCommunityIcons name="clock-outline" size={15} color={C.brand}/><Text style={at.timeText}>{time}</Text></View>}</View>;
      }}
    />
  </View>;
}
const at = StyleSheet.create({
  header:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:14},
  headerIcon:{width:49,height:49,borderRadius:15,backgroundColor:'#e6f4ed',alignItems:'center',justifyContent:'center'},
  headerText:{flex:1,alignItems:'flex-end'},
  title:{fontFamily:FONT.bold,color:C.ink,fontSize:17,textAlign:'right'},
  subtitle:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:3,textAlign:'right'},
  stats:{flexDirection:'row-reverse',gap:10,marginBottom:12},
  stat:{flex:1,minWidth:0,backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:17,paddingVertical:14,paddingHorizontal:8,alignItems:'center',gap:5,elevation:1},
  statNumber:{fontFamily:FONT.bold,fontSize:25,color:C.brand},
  statLabel:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'center'},
  filterCard:{backgroundColor:'#fff',borderRadius:16,borderColor:C.line,borderWidth:1,paddingHorizontal:12,paddingVertical:9,marginBottom:14},
  sectionRow:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:10,flexWrap:'wrap'},
  sectionTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right'},
  count:{fontFamily:FONT.bold,color:C.brand,fontSize:12,marginRight:'auto',backgroundColor:'#e9f5ee',paddingHorizontal:9,paddingVertical:5,borderRadius:9},
  entry:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:16,padding:13,marginBottom:9,flexDirection:'row-reverse',alignItems:'center',gap:10,elevation:1},
  entryIcon:{width:43,height:43,borderRadius:13,backgroundColor:'#eaf5ef',alignItems:'center',justifyContent:'center'},
  entryContent:{flex:1,minWidth:0,alignItems:'flex-end'},
  entryDate:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right'},
  entryHint:{fontFamily:FONT.regular,fontSize:11,color:C.muted,marginTop:5,textAlign:'right'},
  timeBadge:{backgroundColor:'#eef7f3',borderRadius:10,paddingHorizontal:8,paddingVertical:7,flexDirection:'row-reverse',alignItems:'center',gap:4,maxWidth:'42%'},
  timeText:{fontFamily:FONT.bold,fontSize:12,color:C.brand}
});

export function PastNoticesScreen({ route }) {
  const { driver } = route.params;
  const { width } = useWindowDimensions();
  const [all, setAll] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [viewer, setViewer] = useState(null);
  useEffect(() => { request(`/notices/${driver.id}`).then(setAll).catch(() => setAll([])); }, [driver.id]);
  const P = { low: 'کم', medium: 'متوسط', high: 'زیاد' };
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const types = useMemo(() => all ? [...new Set(all.map(n => n.reason).filter(Boolean))] : [], [all]);
  const finalRows = useMemo(() => rows ? rows.filter(r => !typeFilter || r.reason === typeFilter).sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))) : null, [rows, typeFilter]);
  const cm = all ? all.filter(r => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter(r => inCurrentJYear(r.created_at)).length : 0;
  return <View style={{ flex: 1, backgroundColor: C.paper }}>
    <List rows={finalRows} empty="تذکری در بازه انتخاب‌شده یافت نشد"
      header={<>
        <View style={pn.header}><View style={pn.headerIcon}><MaterialCommunityIcons name="clipboard-text-clock-outline" size={25} color={C.brand}/></View><View style={pn.headerText}><Text style={pn.heading}>سوابق تذکرات راننده</Text><Text style={pn.subheading}>مرور تذکرات ثبت‌شده و پیوست‌ها</Text></View></View>
        <View style={pn.stats}>
          <View style={pn.stat}><MaterialCommunityIcons name="calendar-month-outline" size={22} color={C.brand}/><Text style={pn.statNumber}>{faNum(cm)}</Text><Text style={pn.statLabel}>تذکر این ماه</Text></View>
          <View style={pn.stat}><MaterialCommunityIcons name="calendar-range-outline" size={22} color={C.brand}/><Text style={pn.statNumber}>{faNum(cy)}</Text><Text style={pn.statLabel}>تذکر امسال</Text></View>
        </View>
        <View style={pn.filters}><View style={pn.sectionHead}><MaterialCommunityIcons name="calendar-filter-outline" size={19} color={C.brand}/><Text style={pn.sectionTitle}>بازه زمانی</Text></View><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo}/>
          {types.length > 0 && <><View style={pn.sectionHead}><MaterialCommunityIcons name="filter-variant" size={19} color={C.brand}/><Text style={pn.sectionTitle}>دلیل تذکر</Text></View><View style={pn.chips}>
            <TouchableOpacity style={[pn.chip,!typeFilter&&pn.chipOn]} onPress={()=>setTypeFilter(null)}><Text style={[pn.chipText,!typeFilter&&pn.chipTextOn]}>همه</Text></TouchableOpacity>
            {types.map(t=><TouchableOpacity key={t} style={[pn.chip,typeFilter===t&&pn.chipOn]} onPress={()=>setTypeFilter(t)}><Text style={[pn.chipText,typeFilter===t&&pn.chipTextOn]}>{t}</Text></TouchableOpacity>)}
          </View></>}
        </View>
        <View style={pn.listTitle}><MaterialCommunityIcons name="history" size={20} color={C.brand}/><Text style={pn.sectionTitle}>فهرست تذکرات</Text><Text style={pn.total}>{faNum(finalRows?.length || 0)} مورد</Text></View>
      </>}
      render={({ item }) => <View style={pn.card}>
        <View style={pn.cardHead}><View style={pn.reasonWrap}><View style={pn.reasonIcon}><MaterialCommunityIcons name="alert-circle-outline" size={21} color={C.brand}/></View><Text style={pn.reason}>{item.reason || 'تذکر'}</Text></View>
          <View style={[pn.priority,item.priority==='high'?pn.priorityHigh:item.priority==='medium'?pn.priorityMedium:pn.priorityLow]}><Text style={pn.priorityText}>اولویت {P[item.priority] || '—'}</Text></View>
        </View>
        {!!item.body&&<View style={pn.bodyBox}><Text style={pn.body}>{item.body}</Text></View>}
        {!!item.attachment_url&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="بزرگ‌نمایی تصویر پیوست" style={pn.photoTouch} onPress={()=>setViewer(item.attachment_url)}>
          <Image source={imageSource(item.attachment_url)} style={[pn.photo,{height:width<360?145:170}]} resizeMode="cover"/>
          <View style={pn.photoCaption}><MaterialCommunityIcons name="image-search-outline" size={17} color={C.brand}/><Text style={pn.photoCaptionText}>مشاهده تصویر در اندازه بزرگ</Text></View>
        </TouchableOpacity>}
        <View style={pn.footer}><View style={pn.footerItem}><MaterialCommunityIcons name="calendar-clock-outline" size={16} color={C.muted}/><Text style={pn.footerText}>{faNum(fj(item.created_at))}</Text></View>
          {!!(item.recorder_name||item.recorder_username)&&<View style={pn.footerItem}><MaterialCommunityIcons name="account-outline" size={16} color={C.muted}/><Text style={pn.footerText}>ثبت‌کننده: {item.recorder_name?.trim()||item.recorder_username}</Text></View>}
        </View>
      </View>} />
    {viewer&&<ImageViewer uri={viewer} visible={!!viewer} onClose={()=>setViewer(null)}/>}
  </View>;
}
const pn = StyleSheet.create({
 header:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:13},
 headerIcon:{width:48,height:48,borderRadius:15,backgroundColor:'#e7f4ed',alignItems:'center',justifyContent:'center'},
 headerText:{flex:1,alignItems:'flex-end'},
 heading:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right'},
 subheading:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:4},
 stats:{flexDirection:'row-reverse',gap:10,marginBottom:12},
 stat:{flex:1,minWidth:0,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:13,alignItems:'center',gap:5},
 statNumber:{fontFamily:FONT.bold,fontSize:25,color:C.brand},
 statLabel:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'center'},
 filters:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:16,padding:12,marginBottom:13},
 sectionHead:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:10},
 sectionTitle:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right'},
 chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginBottom:4},
 chip:{borderWidth:1,borderColor:C.line,borderRadius:11,paddingHorizontal:12,paddingVertical:9,minHeight:40,backgroundColor:'#f8fafb',justifyContent:'center'},
 chipOn:{backgroundColor:C.brand,borderColor:C.brand},
 chipText:{fontFamily:FONT.bold,fontSize:12,color:C.ink},
 chipTextOn:{color:'#fff'},
 listTitle:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginBottom:10},
 total:{fontFamily:FONT.bold,fontSize:12,color:C.brand,marginRight:'auto',backgroundColor:'#e7f4ed',borderRadius:9,paddingHorizontal:9,paddingVertical:5},
 card:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:18,padding:14,marginBottom:11,elevation:1},
 cardHead:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:9},
 reasonWrap:{flexDirection:'row-reverse',alignItems:'center',gap:8,flex:1,minWidth:145},
 reasonIcon:{width:35,height:35,borderRadius:11,backgroundColor:'#e8f4ee',alignItems:'center',justifyContent:'center'},
 reason:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right',flexShrink:1},
 priority:{borderRadius:10,paddingVertical:7,paddingHorizontal:10},
 priorityHigh:{backgroundColor:'#fce8e6'},priorityMedium:{backgroundColor:'#fff3dc'},priorityLow:{backgroundColor:'#e7f5ed'},
 priorityText:{fontFamily:FONT.bold,fontSize:11,color:C.ink},
 bodyBox:{backgroundColor:'#f7f9fb',borderRadius:11,padding:11,marginTop:12},
 body:{fontFamily:FONT.regular,color:C.ink,fontSize:13,lineHeight:23,textAlign:'right'},
 photoTouch:{marginTop:12,borderRadius:12,overflow:'hidden',backgroundColor:'#f3f6f7'},
 photo:{width:'100%',borderRadius:12},
 photoCaption:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7,padding:9},
 photoCaptionText:{fontFamily:FONT.regular,fontSize:11,color:C.brand},
 footer:{borderTopWidth:1,borderTopColor:'#edf0f2',paddingTop:10,marginTop:12,gap:7},
 footerItem:{flexDirection:'row-reverse',alignItems:'center',gap:7,flexWrap:'wrap'},
 footerText:{fontFamily:FONT.regular,fontSize:11.5,color:C.muted,textAlign:'right',flexShrink:1}
});

export function DriverSmsScreen({ route }) {
  const { driver } = route.params;
  const [all, setAll] = useState(null);
  useEffect(() => { request(`/drivers/${driver.id}/sms`).then(setAll).catch(() => setAll([])); }, [driver.id]);
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter(r => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter(r => inCurrentJYear(r.created_at)).length : 0;
  const ordered = useMemo(() => rows ? [...rows].sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))) : null, [rows]);
  const delivery = code => code == 1 ? { title:'تحویل شده', icon:'check-circle-outline', color:C.ok, bg:'#e9f7ef' } : code == 2 ? { title:'تحویل نشده', icon:'alert-circle-outline', color:C.danger, bg:'#fff0ed' } : { title:'وضعیت نامشخص', icon:'clock-outline', color:C.muted, bg:'#f1f3f5' };
  return <View style={{flex:1,backgroundColor:C.paper}}>
    <List rows={ordered} empty="پیامکی برای این راننده در بازه انتخاب‌شده ثبت نشده است"
      header={<>
        <View style={ds.header}><View style={ds.headerIcon}><MaterialCommunityIcons name="message-text-outline" size={25} color={C.brand}/></View><View style={ds.headerCopy}><Text style={ds.title}>پیامک‌های راننده</Text><Text style={ds.subtitle}>سوابق پیامک‌های ارسالی و وضعیت تحویل</Text></View></View>
        <View style={ds.stats}>
          <View style={ds.stat}><MaterialCommunityIcons name="calendar-month-outline" size={21} color={C.brand}/><Text style={ds.statValue}>{faNum(cm)}</Text><Text style={ds.statLabel}>پیامک این ماه</Text></View>
          <View style={ds.stat}><MaterialCommunityIcons name="calendar-range-outline" size={21} color={C.brand}/><Text style={ds.statValue}>{faNum(cy)}</Text><Text style={ds.statLabel}>پیامک امسال</Text></View>
        </View>
        <View style={ds.filterBox}><View style={ds.sectionTitle}><MaterialCommunityIcons name="calendar-filter-outline" size={19} color={C.brand}/><Text style={ds.sectionText}>فیلتر بازه زمانی</Text></View><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo}/></View>
        <View style={ds.sectionTitle}><MaterialCommunityIcons name="history" size={19} color={C.brand}/><Text style={ds.sectionText}>فهرست پیامک‌ها</Text><Text style={ds.count}>{faNum(ordered?.length || 0)} پیامک</Text></View>
      </>}
      render={({item}) => { const d=delivery(item.delivery_code);return <View style={ds.card}>
        <View style={ds.cardHead}><View style={ds.messageIcon}><MaterialCommunityIcons name="message-processing-outline" size={22} color={C.brand}/></View><View style={ds.headContent}><Text style={ds.date}>{faNum(fj(item.created_at))}</Text>{!!item.sender&&<Text style={ds.sender} numberOfLines={2}>فرستنده: {faNum(item.sender)}</Text>}</View></View>
        <Text style={ds.body} selectable>{faNum(item.body || '—')}</Text>
        <View style={ds.footer}><View style={[ds.delivery,{backgroundColor:d.bg}]}><MaterialCommunityIcons name={d.icon} size={17} color={d.color}/><Text style={[ds.deliveryText,{color:d.color}]}>{d.title}</Text></View></View>
      </View>;}}/>
  </View>;
}
const ds=StyleSheet.create({
  header:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:14},
  headerIcon:{width:49,height:49,borderRadius:15,backgroundColor:'#e6f4ee',alignItems:'center',justifyContent:'center'},
  headerCopy:{flex:1,alignItems:'flex-end'},
  title:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right'},
  subtitle:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:4},
  stats:{flexDirection:'row-reverse',gap:10,marginBottom:12},
  stat:{flex:1,minWidth:0,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:13,alignItems:'center',gap:5},
  statValue:{fontFamily:FONT.bold,fontSize:25,color:C.brand},
  statLabel:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'center'},
  filterBox:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:16,padding:12,marginBottom:14},
  sectionTitle:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:10},
  sectionText:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right'},
  count:{fontFamily:FONT.bold,fontSize:12,color:C.brand,marginRight:'auto',backgroundColor:'#e8f5ef',borderRadius:9,paddingHorizontal:9,paddingVertical:5},
  card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:14,marginBottom:10,elevation:1},
  cardHead:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  messageIcon:{width:40,height:40,borderRadius:12,backgroundColor:'#e8f5ef',alignItems:'center',justifyContent:'center'},
  headContent:{flex:1,alignItems:'flex-end'},
  date:{fontFamily:FONT.bold,fontSize:12,color:C.ink,textAlign:'right'},
  sender:{fontFamily:FONT.regular,fontSize:11,color:C.muted,textAlign:'right',marginTop:4},
  body:{fontFamily:FONT.regular,fontSize:14,lineHeight:25,color:C.ink,textAlign:'right',writingDirection:'rtl',backgroundColor:'#f7f9fb',padding:12,borderRadius:12,marginTop:12},
  footer:{flexDirection:'row-reverse',marginTop:11},
  delivery:{flexDirection:'row-reverse',alignItems:'center',gap:6,paddingVertical:7,paddingHorizontal:10,borderRadius:10},
  deliveryText:{fontFamily:FONT.bold,fontSize:11}
});

export function MySmsScreen() {
  const [all, setAll] = useState(null);
  const [expanded, setExpanded] = useState({});
  useEffect(() => { request('/my/sms-log').then(setAll).catch(() => setAll([])); }, []);
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter(r => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter(r => inCurrentJYear(r.created_at)).length : 0;
  const ordered = useMemo(() => rows ? [...rows].sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))) : null, [rows]);
  const dlv = c => c == 1 ? ['تحویل‌شده', C.ok, 'check-circle-outline'] : c == 2 ? ['تحویل‌نشده', C.danger, 'alert-circle-outline'] : ['در انتظار وضعیت', C.muted, 'clock-outline'];
  return <View style={{ flex: 1, backgroundColor: C.paper }}>
    <List rows={ordered} empty="پیامکی در بازه انتخاب‌شده یافت نشد"
      header={<>
        <View style={ms.heading}><View style={ms.headingIcon}><MaterialCommunityIcons name="message-text-outline" size={25} color={C.brand}/></View><View style={ms.headingCopy}><Text style={ms.headingTitle}>پیامک‌های ارسالی من</Text><Text style={ms.headingSub}>سوابق ارسال و وضعیت تحویل پیامک‌ها</Text></View></View>
        <Counts month={cm} year={cy} labelMonth="پیامک این ماه" labelYear="پیامک امسال"/>
        <View style={ms.filterBox}><View style={ms.filterHead}><MaterialCommunityIcons name="calendar-range" size={19} color={C.brand}/><Text style={ms.filterTitle}>فیلتر بازه زمانی</Text></View><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo}/></View>
        <View style={ms.listHeading}><Text style={ms.listTitle}>تاریخچه ارسال</Text><Text style={ms.count}>{faNum(ordered?.length || 0)} پیامک</Text></View>
      </>}
      render={({ item, index }) => {
        const key = String(item.id ?? `${item.created_at}-${item.to_mobile}-${index}`);
        const open = !!expanded[key];
        const status = dlv(item.delivery_code);
        const body = String(item.body || '');
        return <View style={ms.card}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}} activeOpacity={0.8} style={ms.summary} onPress={() => setExpanded(prev => ({...prev,[key]:!prev[key]}))}>
            <View style={ms.messageIcon}><MaterialCommunityIcons name="message-text-outline" size={22} color={C.brand}/></View>
            <View style={ms.summaryBody}>
              <Text style={ms.mobile}>{faNum(item.to_mobile || 'شماره نامشخص')}</Text>
              <Text style={ms.date}>{faNum(fj(item.created_at))}</Text>
            </View>
            <MaterialCommunityIcons name={open?'chevron-up':'chevron-down'} size={23} color={C.muted}/>
          </TouchableOpacity>
          <View style={ms.statusRow}><MaterialCommunityIcons name={status[2]} size={16} color={status[1]}/><Text style={[ms.status,{color:status[1]}]}>{status[0]}</Text></View>
          {!open ? <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(prev => ({...prev,[key]:true}))}><Text style={ms.preview} numberOfLines={2}>{faNum(body || 'بدون متن')}</Text><Text style={ms.expandHint}>مشاهده متن کامل</Text></TouchableOpacity> :
            <View style={ms.fullMessage}><Text style={ms.fullText}>{faNum(body || 'بدون متن')}</Text></View>}
        </View>;
      }}/>
  </View>;
}
const ms = StyleSheet.create({
  heading:{flexDirection:'row-reverse',alignItems:'center',gap:11,marginBottom:13},
  headingIcon:{width:48,height:48,borderRadius:15,backgroundColor:'#e7f5ef',alignItems:'center',justifyContent:'center'},
  headingCopy:{flex:1,alignItems:'flex-end'},
  headingTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:17,textAlign:'right'},
  headingSub:{fontFamily:FONT.regular,color:C.muted,fontSize:11.5,textAlign:'right',marginTop:4},
  filterBox:{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:C.line,padding:12,marginTop:12,marginBottom:14},
  filterHead:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:9},
  filterTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:13},
  listHeading:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  listTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14},
  count:{fontFamily:FONT.bold,color:C.brand,fontSize:12,backgroundColor:'#e7f5ef',paddingHorizontal:11,paddingVertical:6,borderRadius:10},
  card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:13,marginBottom:10,elevation:1},
  summary:{flexDirection:'row-reverse',alignItems:'center',gap:10,minHeight:47},
  messageIcon:{width:40,height:40,borderRadius:12,backgroundColor:'#edf7f2',alignItems:'center',justifyContent:'center'},
  summaryBody:{flex:1,alignItems:'flex-end',minWidth:0},
  mobile:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right'},
  date:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'right',marginTop:4},
  statusRow:{flexDirection:'row-reverse',alignItems:'center',gap:5,marginTop:10,marginBottom:6},
  status:{fontFamily:FONT.bold,fontSize:11.5},
  preview:{fontFamily:FONT.regular,color:C.ink,fontSize:12.5,textAlign:'right',lineHeight:23},
  expandHint:{fontFamily:FONT.bold,color:C.brand,fontSize:11,textAlign:'right',marginTop:7},
  fullMessage:{borderTopWidth:1,borderTopColor:'#edf0f2',paddingTop:10,marginTop:6},
  fullText:{fontFamily:FONT.regular,color:C.ink,fontSize:13,textAlign:'right',lineHeight:25}
});

export function PastChecklistsScreen({ route }) {
  const { driver } = route.params;
  const [all, setAll] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  useEffect(() => { request(`/checklists/${driver.id}`).then(setAll).catch(() => setAll([])); }, [driver.id]);
  const { rows, from, to, setFrom, setTo } = useDateFilter(all);
  const cm = all ? all.filter(r => inCurrentJMonth(r.created_at)).length : 0;
  const cy = all ? all.filter(r => inCurrentJYear(r.created_at)).length : 0;
  const ordered = useMemo(() => rows ? [...rows].sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))) : null, [rows]);
  return <View style={{ flex: 1, backgroundColor: C.paper }}>
    <List rows={ordered} empty="چک‌لیستی در بازه انتخاب‌شده ثبت نشده است"
      header={<>
        <View style={pc.heading}><View style={pc.headingIcon}><MaterialCommunityIcons name="clipboard-check-multiple-outline" size={25} color={C.brand}/></View><View style={pc.headingCopy}><Text style={pc.headingTitle}>سوابق چک‌لیست خودرو</Text><Text style={pc.headingSub}>برای مشاهده جزئیات، چک‌لیست را انتخاب کنید</Text></View></View>
        <Counts month={cm} year={cy} labelMonth="چک‌لیست این ماه" labelYear="چک‌لیست امسال"/>
        <View style={pc.filterBox}><View style={pc.filterTitle}><MaterialCommunityIcons name="calendar-filter-outline" size={18} color={C.brand}/><Text style={pc.filterText}>فیلتر بازه زمانی</Text></View><DateFilterBar from={from} to={to} setFrom={setFrom} setTo={setTo}/></View>
        <View style={pc.listHead}><MaterialCommunityIcons name="history" size={20} color={C.brand}/><Text style={pc.filterText}>چک‌لیست‌های ثبت‌شده</Text><Text style={pc.count}>{faNum(ordered?.length || 0)} مورد</Text></View>
      </>}
      render={({ item, index }) => {
        const key = String(item.id ?? `${item.created_at}-${index}`);
        const open = expandedId === key;
        const checks = Array.isArray(item.items) ? item.items : [];
        const photo = item.photo || item.photo_data;
        return <View style={pc.card}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}} activeOpacity={0.75} style={pc.summary} onPress={() => setExpandedId(open ? null : key)}>
            <View style={pc.summaryIcon}><MaterialCommunityIcons name="clipboard-text-outline" size={23} color={C.brand}/></View>
            <View style={pc.summaryCopy}><Text style={pc.summaryTitle}>چک‌لیست خودرو</Text><Text style={pc.summaryDate}>{faNum(fj(item.created_at))}</Text>
              {!!item.by_name && <Text style={pc.summaryBy} numberOfLines={1}>بازرس: {item.by_name}</Text>}
              <View style={pc.tags}><Text style={pc.tag}>{faNum(checks.length)} مورد بررسی</Text>{!!photo&&<Text style={pc.tag}>دارای تصویر</Text>}</View>
            </View>
            <MaterialCommunityIcons name={open?'chevron-up-circle':'chevron-down-circle-outline'} size={26} color={C.brand}/>
          </TouchableOpacity>
          {open && <View style={pc.details}>
            {!!photo && <TouchableOpacity accessibilityRole="button" accessibilityLabel="بزرگ‌نمایی تصویر چک‌لیست" onPress={() => setViewer(photo)}><Image source={imageSource(photo)} style={pc.photo} resizeMode="cover"/><View style={pc.photoCaption}><MaterialCommunityIcons name="image-search-outline" size={17} color={C.brand}/><Text style={pc.photoCaptionText}>برای بزرگ‌نمایی تصویر لمس کنید</Text></View></TouchableOpacity>}
            <View style={pc.detailTitle}><MaterialCommunityIcons name="format-list-checks" size={20} color={C.brand}/><Text style={pc.detailTitleText}>نتایج بررسی</Text></View>
            {checks.length===0&&<Text style={pc.noItems}>موردی برای این چک‌لیست ثبت نشده است.</Text>}
            {checks.map((it,i)=><View key={i} style={pc.checkRow}><View style={pc.checkIndex}><Text style={pc.checkIndexText}>{faNum(i+1)}</Text></View><Text style={pc.checkLabel}>{it.label}</Text><Text style={pc.checkValue}>{faNum(it.value ?? '—')}</Text></View>)}
          </View>}
        </View>;
      }}/>
    <ImageViewer visible={!!viewer} uri={viewer} onClose={() => setViewer(null)}/>
  </View>;
}
const pc = StyleSheet.create({
 heading:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:14},
 headingIcon:{width:47,height:47,borderRadius:14,backgroundColor:'#e8f5ef',alignItems:'center',justifyContent:'center'},
 headingCopy:{flex:1,alignItems:'flex-end'},
 headingTitle:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right'},
 headingSub:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:4},
 filterBox:{backgroundColor:'#fff',borderRadius:15,borderWidth:1,borderColor:C.line,padding:12,marginTop:4,marginBottom:14},
 filterTitle:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:9},
 filterText:{fontFamily:FONT.bold,fontSize:13,color:C.ink,textAlign:'right'},
 listHead:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:10},
 count:{marginRight:'auto',backgroundColor:'#e8f5ef',color:C.brand,fontFamily:FONT.bold,fontSize:12,borderRadius:10,paddingHorizontal:9,paddingVertical:5},
 card:{backgroundColor:'#fff',borderRadius:17,borderWidth:1,borderColor:C.line,marginBottom:10,overflow:'hidden',elevation:1},
 summary:{flexDirection:'row-reverse',alignItems:'center',padding:13,gap:10,minHeight:88},
 summaryIcon:{width:45,height:45,borderRadius:13,backgroundColor:'#e8f5ef',alignItems:'center',justifyContent:'center'},
 summaryCopy:{flex:1,alignItems:'flex-end',minWidth:0},
 summaryTitle:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right'},
 summaryDate:{fontFamily:FONT.bold,fontSize:12,color:C.brand,textAlign:'right',marginTop:4},
 summaryBy:{fontFamily:FONT.regular,fontSize:11,color:C.muted,textAlign:'right',marginTop:3},
 tags:{flexDirection:'row-reverse',flexWrap:'wrap',gap:6,marginTop:8},
 tag:{fontFamily:FONT.regular,fontSize:10.5,color:C.brand,backgroundColor:'#edf7f1',paddingHorizontal:8,paddingVertical:4,borderRadius:8},
 details:{borderTopWidth:1,borderTopColor:C.line,padding:12},
 photo:{width:'100%',height:175,borderRadius:12},
 photoCaption:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7,paddingVertical:10},
 photoCaptionText:{fontFamily:FONT.regular,fontSize:11,color:C.brand},
 detailTitle:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginTop:5,marginBottom:10},
 detailTitleText:{fontFamily:FONT.bold,fontSize:14,color:C.ink},
 noItems:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',padding:10},
 checkRow:{flexDirection:'row-reverse',alignItems:'center',flexWrap:'wrap',gap:9,paddingVertical:10,borderTopWidth:1,borderTopColor:'#edf0f2'},
 checkIndex:{width:27,height:27,borderRadius:9,backgroundColor:'#e8f5ef',alignItems:'center',justifyContent:'center'},
 checkIndexText:{fontFamily:FONT.bold,fontSize:11,color:C.brand},
 checkLabel:{flex:1,minWidth:110,fontFamily:FONT.regular,fontSize:12,color:C.ink,textAlign:'right'},
 checkValue:{fontFamily:FONT.bold,fontSize:12,color:C.brand,textAlign:'left',maxWidth:'45%'}
});

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
