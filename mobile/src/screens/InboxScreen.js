import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, Switch } from 'react-native';
import { request, imageSource } from '../api';
import { C, FONT } from '../theme';
import { fj, inJRange } from '../jdate';
import ImageViewer from '../components/ImageViewer';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const ST = { sent: 'جدید', seen: 'دیده‌شده', answered: 'پاسخ‌داده‌شده', forwarded: 'ارجاع‌شده', rejected: 'رد شده' };
const PR = { normal: 'عادی', important: 'مهم', urgent: 'فوری' };
const ST_COLOR = { sent: '#cc7a14', seen: '#3b5bd6', answered: '#0d7a5f', forwarded: '#6a4fd6' };

export function InboxReportsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('inbox');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [pick, setPick] = useState(null);
  const [sender, setSender] = useState(null);
  const [statusF, setStatusF] = useState(null);

  const load = useCallback(() => {
    const url = tab === 'archived' ? '/my/inbox-reports/archived' : (tab === 'forwarded' ? '/my/forwarded-reports' : (tab === 'cc' ? '/my/cc-reports' : '/my/inbox-reports'));
    request(url).then(setData).catch(() => setData([]));
  }, [tab]);
  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => { const un = navigation.addListener('focus', load); return un; }, [navigation, load]);

  const senders = useMemo(() => {
    if (!data) return [];
    const m = {};
    data.forEach((r) => { const n = `${r.first_name || ''} ${r.last_name || ''}`.trim(); if (n) m[r.sender_id] = n; });
    return Object.entries(m).map(([id, name]) => ({ id, name }));
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return null;
    let r = data;
    if (from || to) { const f = from ? [from.jy, from.jm, from.jd] : null; const t = to ? [to.jy, to.jm, to.jd] : null; r = r.filter((x) => inJRange(x.created_at, f, t)); }
    if (sender) r = r.filter((x) => String(x.sender_id) === String(sender));
    if (statusF) r = r.filter((x) => x.status === statusF);
    return r;
  }, [data, from, to, sender, statusF]);

  async function toggleArchive(item) {
    try { await request(`/my/inbox-reports/${item.id}/archive`, { method: 'POST', body: { archive: tab !== 'archived' } }); load(); }
    catch (e) { Alert.alert('خطا', e.message); }
  }

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  return (
    <View style={s.wrap}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'inbox' && s.tabOn]} onPress={() => setTab('inbox')}><Text style={[s.tabTxt, tab === 'inbox' && s.tabTxtOn]}>دریافتی</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'forwarded' && s.tabOn]} onPress={() => setTab('forwarded')}><Text style={[s.tabTxt, tab === 'forwarded' && s.tabTxtOn]}>ارجاع‌شده توسط من</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'cc' && s.tabOn]} onPress={() => setTab('cc')}><Text style={[s.tabTxt, tab === 'cc' && s.tabTxtOn]}>رونوشت‌های من</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'archived' && s.tabOn]} onPress={() => setTab('archived')}><Text style={[s.tabTxt, tab === 'archived' && s.tabTxtOn]}>بایگانی</Text></TouchableOpacity>
      </View>
      <View style={s.filters}>
        <TouchableOpacity style={s.fBtn} onPress={() => setPick('from')}><Text style={s.fBtnTxt}>{from ? jLabel(from.jy, from.jm, from.jd) : 'از تاریخ'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.fBtn} onPress={() => setPick('to')}><Text style={s.fBtnTxt}>{to ? jLabel(to.jy, to.jm, to.jd) : 'تا تاریخ'}</Text></TouchableOpacity>
        {(from || to || sender || statusF) ? <TouchableOpacity style={s.clr} onPress={() => { setFrom(null); setTo(null); setSender(null); setStatusF(null); }}><Text style={s.clrTxt}>پاک</Text></TouchableOpacity> : null}
      </View>
      {senders.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsRow}>
          <TouchableOpacity style={[s.chip, !sender && s.chipOn]} onPress={() => setSender(null)}><Text style={[s.chipTxt, !sender && { color: '#fff' }]}>همه فرستندگان</Text></TouchableOpacity>
          {senders.map((sd) => <TouchableOpacity key={sd.id} style={[s.chip, sender === sd.id && s.chipOn]} onPress={() => setSender(sd.id)}><Text style={[s.chipTxt, sender === sd.id && { color: '#fff' }]}>{sd.name}</Text></TouchableOpacity>)}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsRow}>
        <TouchableOpacity style={[s.chip, !statusF && s.chipOn]} onPress={() => setStatusF(null)}><Text style={[s.chipTxt, !statusF && { color: '#fff' }]}>همه وضعیت‌ها</Text></TouchableOpacity>
        {Object.entries(ST).map(([k, v]) => <TouchableOpacity key={k} style={[s.chip, statusF === k && s.chipOn]} onPress={() => setStatusF(k)}><Text style={[s.chipTxt, statusF === k && { color: '#fff' }]}>{v}</Text></TouchableOpacity>)}
      </ScrollView>
      <FlatList contentContainerStyle={{ padding: 14 }} data={rows} keyExtractor={(it) => String(it.id)}
        ListEmptyComponent={<Text style={s.empty}>{tab === 'archived' ? 'بایگانی خالی است.' : (tab === 'forwarded' ? 'گزارشی ارجاع نکرده‌اید.' : (tab === 'cc' ? 'رونوشتی برای شما ارسال نشده است.' : 'گزارش دریافتی ندارید.'))}</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity onPress={() => navigation.navigate('ReportDetail', { id: item.id })}>
              <View style={s.rowB}>
                <Text style={s.title}>{item.subject}</Text>
                <Text style={[s.badge, { color: ST_COLOR[item.status] || C.muted, borderColor: ST_COLOR[item.status] || C.line }]}>{PR[item.priority] ? `${PR[item.priority]} · ` : ''}{ST[item.status] || item.status}</Text>
              </View>
              <Text style={s.meta}>از {item.first_name} {item.last_name} · {fj(item.created_at)}{tab === 'forwarded' && item.forwarded_at ? ` · ارجاع: ${fj(item.forwarded_at)}` : ''}{tab === 'cc' ? ` · رونوشت از ${item.cc_by_name || '—'} · ${fj(item.cc_at)}` : ''}</Text>
              <Text style={s.snippet} numberOfLines={2}>{item.body}</Text>
              {(item.attachment_name || item.attachment_path || item.attachments_count > 0) ? <Text style={s.hasAtt}>📎 دارای پیوست {item.attachments_count ? `(${item.attachments_count})` : ''}</Text> : null}
            </TouchableOpacity>
            {tab !== 'forwarded' && tab !== 'cc' ? <TouchableOpacity style={s.archBtn} onPress={() => toggleArchive(item)}>
              <Text style={s.archTxt}>{tab === 'archived' ? '↩ خروج از بایگانی' : '🗄 بایگانی'}</Text>
            </TouchableOpacity> : null}
          </View>
        )} />
      <JDatePicker visible={!!pick} onClose={() => setPick(null)} initial={null}
        onSelect={(d) => { const v = { jy: d.jy, jm: d.jm, jd: d.jd }; if (pick === 'from') setFrom(v); else setTo(v); }} />
    </View>
  );
}

export function ReportDetailScreen({ route, navigation }) {
  const { id, mine } = route.params || {};
  const [r, setR] = useState(null);
  const [flow, setFlow] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confidentialForward, setConfidentialForward] = useState(false);
  const [targets, setTargets] = useState([]);
  const [showFwd, setShowFwd] = useState(false);
  const [fwdRole, setFwdRole] = useState(null);
  const [showCc, setShowCc] = useState(false);
  const [ccRole, setCcRole] = useState(null);
  const [qCc, setQCc] = useState('');
  const [q, setQ] = useState('');
  const [viewer, setViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [eSubject, setESubject] = useState('');
  const [eBody, setEBody] = useState('');
  const [ePriority, setEPriority] = useState('normal');
  const [rejectReason, setRejectReason] = useState('');
  const load = useCallback(() => {
    request('/reports/' + id).then(setR).catch(() => setR(null));
    request('/my/reports/' + id + '/flow').then(setFlow).catch(() => setFlow([]));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!mine) request('/my/forward-targets').then(setTargets).catch(() => setTargets([])); }, [mine]);
  // نکته: این useMemo باید پیش از هر return زودهنگام (early return) بیاید — چون قوانین
  // React (Rules of Hooks) ایجاب می‌کند تعداد و ترتیب Hook ها در هر رندر یکسان باشد. قبلاً
  // این خط بعد از «if (!r) return …» بود؛ یعنی در اولین رندر (پیش از رسیدن داده) اصلاً اجرا
  // نمی‌شد، ولی در رندرهای بعدی اجرا می‌شد — دقیقاً همان خطای «Rendered more hooks than
  // during the previous render» که در گزارش خطا دیده شد.
  const fwdRoles = useMemo(() => Array.from(new Set(targets.map((t) => t.role_title).filter(Boolean))), [targets]);
  if (!r) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  const startEdit = () => { setESubject(r.subject || ''); setEBody(r.body || ''); setEPriority(r.priority || 'normal'); setEditing(true); };
  const saveEdit = async () => {
    if (!eSubject.trim() || !eBody.trim()) return Alert.alert('خطا', 'موضوع و متن الزامی است.');
    setBusy(true);
    try { await request('/reports/' + id, { method: 'PUT', body: { subject: eSubject, body: eBody, priority: ePriority } }); setEditing(false); load(); Alert.alert('انجام شد', 'گزارش ویرایش شد.'); }
    catch(e) { Alert.alert('خطا', e.message || 'ویرایش ناموفق بود.'); } finally { setBusy(false); }
  };
  const deleteReport = async () => {
    Alert.alert('حذف گزارش', mine ? 'آیا از حذف گزارش مطمئن هستید؟' : 'گزارش برای شما حذف/بایگانی می‌شود. ادامه می‌دهید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { try { await request('/reports/' + id, { method: 'DELETE', body: { reason: rejectReason || undefined } }); navigation.goBack(); } catch(e) { Alert.alert('خطا', e.message); } } }
    ]);
  };
  const rejectReport = async () => {
    if (!rejectReason.trim()) return Alert.alert('علت رد', 'علت حذف/رد گزارش بی‌مورد را بنویسید.');
    try { await request('/reports/' + id + '/reject', { method: 'POST', body: { reason: rejectReason } }); Alert.alert('ثبت شد', 'گزارش رد شد و علت ثبت گردید.'); navigation.goBack(); }
    catch(e) { Alert.alert('خطا', e.message); }
  };

  const act = async (action, toUserId) => {    if ((action === 'note' || action === 'reply') && !note.trim()) { Alert.alert('خطا', 'متن را وارد کنید'); return; }
    setBusy(true);
    try {
      await request('/reports/' + id + '/action', { method: 'POST', body: { action, note, to_user_id: toUserId || null, confidential_history: action === 'forward' && confidentialForward ? 1 : 0 } });
      Alert.alert('انجام شد', action === 'forward' ? 'گزارش ارجاع شد' : action === 'reply' ? 'پاسخ ثبت شد' : 'یادداشت ثبت شد');
      if (action === 'forward') navigation.goBack(); else { setNote(''); load(); }
    } catch (e) { Alert.alert('خطا', e.message); } finally { setBusy(false); setShowFwd(false); }
  };
  const fwdList = q.trim() ? targets.filter((t) => ((t.first_name || '') + ' ' + (t.last_name || '')).includes(q.trim())) : targets;
  const fwdByRole = fwdRole ? fwdList.filter((t) => t.role_title === fwdRole) : [];
  const ccList = qCc.trim() ? targets.filter((t) => ((t.first_name || '') + ' ' + (t.last_name || '')).includes(qCc.trim())) : targets;
  const ccByRole = ccRole ? ccList.filter((t) => t.role_title === ccRole) : [];
  const sendCc = async (toUserId) => {
    setBusy(true);
    try {
      await request('/reports/' + id + '/cc', { method: 'POST', body: { to_user_id: toUserId } });
      Alert.alert('انجام شد', 'رونوشت گزارش ارسال شد.');
    } catch (e) { Alert.alert('خطا', e.message); } finally { setBusy(false); setShowCc(false); setCcRole(null); setQCc(''); }
  };
  const actMeta = {
    forward: { label: 'ارجاع', color: '#6a4fd6', bg: '#f0ecff', icon: '➡' },
    reply: { label: 'پاسخ', color: '#0d7a5f', bg: '#e7f3ee', icon: '↩' },
    note: { label: 'یادداشت', color: '#cc7a14', bg: '#fff3e6', icon: '✎' },
    seen: { label: 'مشاهده', color: '#3b5bd6', bg: '#eef2fb', icon: '👁' },
    reject: { label: 'رد گزارش', color: '#dc2626', bg: '#fff1f2', icon: '✕' },
    delete: { label: 'حذف', color: '#dc2626', bg: '#fff1f2', icon: '🗑' },
    edit: { label: 'ویرایش', color: '#0d7a5f', bg: '#e7f3ee', icon: '✎' },
    view: { label: 'مشاهده', color: '#3b5bd6', bg: '#eef2fb', icon: '👁' },
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 14 }}>
      <View style={s.card}>
        {editing ? (<>
          <Text style={s.label}>موضوع</Text>
          <TextInput style={s.input} value={eSubject} onChangeText={setESubject} placeholder="موضوع" placeholderTextColor={C.muted} />
          <Text style={s.label}>اولویت</Text>
          <View style={s.actRow}>{Object.entries(PR).map(([k, v]) => <TouchableOpacity key={k} style={[s.btnGhost, { flex: 1 }, ePriority === k && { backgroundColor: C.brand }]} onPress={() => setEPriority(k)}><Text style={[s.btnGhostTxt, ePriority === k && { color: '#fff' }]}>{v}</Text></TouchableOpacity>)}</View>
          <Text style={s.label}>متن</Text>
          <TextInput style={s.input} value={eBody} onChangeText={setEBody} multiline placeholder="متن گزارش" placeholderTextColor={C.muted} />
          <View style={s.actRow}><TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={saveEdit} disabled={busy}><Text style={s.btnTxt}>ذخیره</Text></TouchableOpacity><TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={() => setEditing(false)}><Text style={s.btnGhostTxt}>انصراف</Text></TouchableOpacity></View>
        </>) : (<>
          <Text style={s.title}>{r.subject}</Text>
          <Text style={s.meta}>از {r.first_name} {r.last_name} · {fj(r.created_at)} · اولویت: {PR[r.priority] || 'عادی'}</Text>
          <Text style={s.body}>{r.body}</Text>
          {Number(r.confidential_history) === 1 ? <Text style={[s.hasAtt, { color: '#9a5b00', backgroundColor: '#fff8e8', padding: 8, borderRadius: 9 }]}>ارجاع محرمانه: سابقه و یادداشت‌های بعدی برای ارسال‌کننده مخفی است.</Text> : null}
          {r.can_edit ? <TouchableOpacity style={s.archBtn} onPress={startEdit}><Text style={s.archTxt}>✎ ویرایش گزارش</Text></TouchableOpacity> : null}
          {(mine || !r.can_edit) ? <TouchableOpacity style={[s.archBtn, { backgroundColor: '#ffecec' }]} onPress={deleteReport}><Text style={[s.archTxt, { color: C.danger }]}>🗑 حذف گزارش</Text></TouchableOpacity> : null}
        </>)}
        {(() => {
          const primaryUrl = r.attachment_url || r.attachment_data;
          const extra = Array.isArray(r.attachments) ? r.attachments : [];
          const extraImages = extra.filter((a) => !a.mime_type || String(a.mime_type).startsWith('image'));
          const extraFiles = extra.filter((a) => a.mime_type && !String(a.mime_type).startsWith('image'));
          const gallery = [
            ...(primaryUrl ? [{ uri: primaryUrl, label: null }] : []),
            ...extraImages.map((a) => ({ uri: a.url, thumbnailUri: a.thumbnail_url || a.url, label: a.file_name || null })),
          ];
          return (
            <>
              {gallery.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={s.meta}>{gallery.length > 1 ? `پیوست‌ها (${gallery.length} تصویر — برای نمایش کامل لمس کنید):` : 'پیوست (برای نمایش کامل لمس کنید):'}</Text>
                  <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {gallery.map((g, i) => (
                      <TouchableOpacity key={i} onPress={() => { setViewerIndex(i); setViewer(true); }}>
                        <Image source={imageSource(g.uri)} style={gallery.length > 1 ? { width: 104, height: 104, borderRadius: 12 } : { width: '100%', height: 200, borderRadius: 12 }} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {extraFiles.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {extraFiles.map((a) => <Text key={a.id} style={s.hasAtt}>📎 {a.file_name || 'پیوست'} {a.mime_type ? `· ${a.mime_type}` : ''}</Text>)}
                </View>
              )}
              {gallery.length === 0 && r.attachment_name ? <Text style={s.meta}>پیوست: {r.attachment_name} (حذف‌شده طبق سیاست نگهداری)</Text> : null}
            </>
          );
        })()}
        {r.rejected_at ? <Text style={[s.hasAtt, { color: C.danger }]}>رد شده: {r.reject_reason || '—'}</Text> : null}
      </View>

      {!mine && (<>
        <Text style={s.label}>یادداشت / پاسخ</Text>
        <TextInput style={s.input} value={note} onChangeText={setNote} multiline placeholder="متن یادداشت یا پاسخ…" placeholderTextColor={C.muted} />
        <View style={s.actRow}>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} disabled={busy} onPress={() => act('note')}><Text style={s.btnGhostTxt}>ثبت یادداشت</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} disabled={busy} onPress={() => act('reply')}><Text style={s.btnGhostTxt}>پاسخ به فرستنده</Text></TouchableOpacity>
        </View>
        <View style={{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff8e8',borderWidth:1,borderColor:'#f0c36a',borderRadius:12,padding:10,marginTop:8}}><View style={{flex:1}}><Text style={{fontFamily:FONT.bold,color:C.ink,textAlign:'right'}}>ارجاع محرمانه</Text><Text style={{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'right',marginTop:3}}>با فعال‌سازی توسط دریافت‌کننده، سوابق بعدی برای ارسال‌کننده اولیه مخفی می‌شود.</Text></View><Switch value={confidentialForward} onValueChange={setConfidentialForward}/></View>
        <TouchableOpacity style={s.btn} disabled={busy} onPress={() => act('forward')}><Text style={s.btnTxt}>ارجاع به مسئول بالادستی</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#2563eb', marginTop: 8 }]} disabled={busy} onPress={() => { setShowFwd((v) => !v); setShowCc(false); }}><Text style={s.btnTxt}>ارجاع به فرد مشخص…</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#6a4fd6', marginTop: 8 }]} disabled={busy} onPress={() => { setShowCc((v) => !v); setShowFwd(false); }}><Text style={s.btnTxt}>📋 ارسال رونوشت به فرد دیگر</Text></TouchableOpacity>
        <TextInput style={[s.input, { minHeight: 50, marginTop: 8 }]} value={rejectReason} onChangeText={setRejectReason} placeholder="علت رد/حذف گزارش بی‌مورد…" placeholderTextColor={C.muted} />
        <TouchableOpacity style={[s.btn, { backgroundColor: C.danger, marginTop: 8 }]} disabled={busy} onPress={rejectReport}><Text style={s.btnTxt}>رد / حذف به‌عنوان گزارش بی‌مورد</Text></TouchableOpacity>
        {showFwd && (
          <View style={[s.card, { marginTop: 8 }]}>
            <Text style={s.label}>۱) ابتدا سمت گیرنده را انتخاب کنید</Text>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {fwdRoles.map((role) => (
                <TouchableOpacity key={role} onPress={() => setFwdRole(fwdRole === role ? null : role)} style={[s.roleChip, fwdRole === role && s.roleChipOn]}>
                  <Text style={[s.roleChipTxt, fwdRole === role && s.roleChipTxtOn]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {fwdRole && (<>
              <Text style={[s.label, { marginTop: 10 }]}>۲) سپس شخص را انتخاب کنید</Text>
              <TextInput style={s.input} value={q} onChangeText={setQ} placeholder="جستجوی نام فرد…" placeholderTextColor={C.muted} />
              {fwdByRole.slice(0, 20).map((t) => (
                <TouchableOpacity key={t.id} style={s.fwdRow} onPress={() => act('forward', t.id)}>
                  <Text style={s.fwdName}>{t.first_name} {t.last_name}</Text>
                  <Text style={s.meta}>{t.role_title || ''}</Text>
                </TouchableOpacity>
              ))}
              {fwdByRole.length === 0 && <Text style={s.meta}>موردی یافت نشد.</Text>}
            </>)}
          </View>
        )}
        {showCc && (
          <View style={[s.card, { marginTop: 8 }]}>
            <Text style={s.label}>۱) ابتدا سمت گیرندهٔ رونوشت را انتخاب کنید</Text>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {fwdRoles.map((role) => (
                <TouchableOpacity key={role} onPress={() => setCcRole(ccRole === role ? null : role)} style={[s.roleChip, ccRole === role && s.roleChipOn]}>
                  <Text style={[s.roleChipTxt, ccRole === role && s.roleChipTxtOn]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {ccRole && (<>
              <Text style={[s.label, { marginTop: 10 }]}>۲) سپس شخص را انتخاب کنید</Text>
              <TextInput style={s.input} value={qCc} onChangeText={setQCc} placeholder="جستجوی نام فرد…" placeholderTextColor={C.muted} />
              {ccByRole.slice(0, 20).map((t) => (
                <TouchableOpacity key={t.id} style={s.fwdRow} onPress={() => sendCc(t.id)}>
                  <Text style={s.fwdName}>{t.first_name} {t.last_name}</Text>
                  <Text style={s.meta}>{t.role_title || ''}</Text>
                </TouchableOpacity>
              ))}
              {ccByRole.length === 0 && <Text style={s.meta}>موردی یافت نشد.</Text>}
            </>)}
          </View>
        )}
      </>)}

      <Text style={s.label}>روند گردش کار</Text>
      {r.history_hidden_for_sender ? <Text style={[s.meta, { color: '#9a5b00' }]}>به‌دلیل فعال بودن «اختفای سابقه و ارجاع محرمانه»، سوابق و یادداشت‌های این گزارش برای شما قابل مشاهده نیست.</Text> : null}
      {!r.history_hidden_for_sender && flow.length === 0 && <Text style={s.meta}>هنوز اقدامی روی این گزارش ثبت نشده است.</Text>}
      {flow.map((x, i) => {
        const m = actMeta[x.action] || { label: x.action, color: C.muted, bg: '#f7f9fc', icon: '•' };
        const actor = `${x.af_fn || ''} ${x.af_ln || ''}`.trim() || '—';
        const target = `${x.tu_fn || ''} ${x.tu_ln || ''}`.trim();
        return (
          <View key={i} style={[s.flowCard, { backgroundColor: m.bg, borderColor: m.color }]}>
            <View style={s.rowB}>
              <Text style={[s.flowAct, { color: m.color }]}>{m.icon} {m.label}</Text>
              <Text style={s.meta}>{fj(x.created_at)}</Text>
            </View>
            <Text style={s.flowWho}>
              <Text style={{ fontFamily: FONT.bold }}>{actor}</Text>
              {x.action === 'forward' && target ? <Text> گزارش را به <Text style={{ fontFamily: FONT.bold, color: m.color }}>{target}</Text> ارجاع داد</Text> : null}
              {x.action === 'reply' && target ? <Text> به <Text style={{ fontFamily: FONT.bold, color: m.color }}>{target}</Text> پاسخ داد</Text> : null}
              {x.action === 'note' ? <Text> یادداشتی ثبت کرد</Text> : null}
              {(x.action === 'seen' || x.action === 'view') ? <Text> گزارش را مشاهده کرد</Text> : null}
            </Text>
            {x.note ? <Text style={s.body}>{x.note}</Text> : null}
          </View>
        );
      })}
      <ImageViewer
        visible={viewer}
        initialIndex={viewerIndex}
        images={[
          ...((r.attachment_url || r.attachment_data) ? [{ uri: r.attachment_url || r.attachment_data, label: null }] : []),
          ...((Array.isArray(r.attachments) ? r.attachments : []).filter((a) => !a.mime_type || String(a.mime_type).startsWith('image')).map((a) => ({ uri: a.url, thumbnailUri: a.thumbnail_url || a.url, label: a.file_name || null }))),
        ]}
        onClose={() => setViewer(false)}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 30 },
  tabs: { flexDirection: 'row-reverse', gap: 8, padding: 12, paddingBottom: 6 },
  tab: { flex: 1, backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 11, paddingVertical: 9, alignItems: 'center' },
  tabOn: { backgroundColor: C.brand, borderColor: C.brand },
  tabTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  tabTxtOn: { color: '#fff' },
  filters: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 12, alignItems: 'center' },
  fBtn: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11 },
  fBtnTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 11.5 },
  clr: { paddingHorizontal: 8 }, clrTxt: { color: C.danger, fontFamily: FONT.regular, fontSize: 11 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { flexShrink: 0, backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start' },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 11.5 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  rowB: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', flex: 1 },
  badge: { fontFamily: FONT.bold, fontSize: 11, marginRight: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 3 },
  snippet: { fontFamily: FONT.regular, color: C.ink, fontSize: 13, textAlign: 'right', marginTop: 6 },
  hasAtt: { fontFamily: FONT.regular, color: C.brand, fontSize: 11.5, textAlign: 'right', marginTop: 5 },
  body: { fontFamily: FONT.regular, color: C.ink, fontSize: 14, textAlign: 'right', marginTop: 8, lineHeight: 22 },
  label: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 11, textAlign: 'right', fontFamily: FONT.regular, color: C.ink, minHeight: 80, textAlignVertical: 'top' },
  actRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  btnGhost: { backgroundColor: '#eef1f7', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnGhostTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
  archBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#f0f2f7', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12 },
  archTxt: { fontFamily: FONT.bold, color: C.slate, fontSize: 11.5 },
  flowCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  flowAct: { fontFamily: FONT.bold, fontSize: 13 },
  flowWho: { fontFamily: FONT.regular, color: C.ink, fontSize: 13, textAlign: 'right', marginTop: 6, lineHeight: 21 },
  fwdRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  fwdName: { fontFamily: FONT.bold, color: C.brand, fontSize: 13, textAlign: 'right' },
});
