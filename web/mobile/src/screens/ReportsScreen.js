import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { compressToDataUri } from '../img';
import { postOrQueue, request } from '../api';
import { C, FONT } from '../theme';
import { fj } from '../jdate';
import { playSound } from '../soundFx';

const STATUS = { sent: 'ارسال‌شده', seen: 'دیده‌شده', answered: 'پاسخ‌داده‌شده', forwarded: 'ارجاع‌شده', rejected: 'رد شده' };
const PRIORITY = { normal: 'عادی', important: 'مهم', urgent: 'فوری' };

export default function ReportsScreen({ navigation }) {
  const [tab, setTab] = useState('send');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [mine, setMine] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState('normal');
  const [reportSubjects, setReportSubjects] = useState([]);
  const [subjectMode, setSubjectMode] = useState('other');
  const [managers, setManagers] = useState([]);
  const [allTargets, setAllTargets] = useState([]);
  const [targetMode, setTargetMode] = useState('manager');
  const [targetQuery, setTargetQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [toUserId, setToUserId] = useState(null);
  const [sentQuery, setSentQuery] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    const suffix = sentQuery.trim() ? `?q=${encodeURIComponent(sentQuery.trim())}` : '';
    request('/my/reports' + suffix).then(setMine).catch(() => setMine([]));
  }, [sentQuery]);

  useEffect(() => {
    request('/my/managers').then((m) => {
      setManagers(m || []);
      if (m && m.length === 1) setToUserId(m[0].id);
      else if (m && m.length > 1) {
        const chief = m.find((x) => x.is_chief);
        if (chief) setToUserId(chief.id);
      }
    }).catch(() => setManagers([]));
    request('/my/forward-targets').then((r) => setAllTargets(r || [])).catch(() => setAllTargets([]));
    request('/report-subjects').then((r)=>{setReportSubjects(r||[]); if(r&&r.length){setSubjectMode(String(r[0].id));setSubject(r[0].title||'');}}).catch(()=>setReportSubjects([]));
  }, []);

  useEffect(() => {
    if (tab !== 'sent') return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [tab, load]);

  const roles = useMemo(() => {
    const map = new Map();
    allTargets.forEach((t) => {
      const key = String(t.role_id || t.role_title || 'بدون سمت');
      if (!map.has(key)) map.set(key, { key, title: t.role_title || 'بدون سمت' });
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'fa'));
  }, [allTargets]);

  const roleTargets = useMemo(() => {
    if (!selectedRole) return [];
    const q = targetQuery.trim();
    return allTargets.filter((t) => {
      const roleKey = String(t.role_id || t.role_title || 'بدون سمت');
      const hay = `${t.first_name || ''} ${t.last_name || ''} ${t.role_title || ''}`;
      return roleKey === selectedRole && (!q || hay.includes(q));
    }).slice(0, 50);
  }, [allTargets, selectedRole, targetQuery]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await launchLibrary({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, allowsMultipleSelection: true, selectionLimit: 5 });
    if (res.canceled) return;
    const picked = [];
    for (const a of (res.assets || []).slice(0, 5)) {
      const data = await compressToDataUri(a.uri);
      if (data) picked.push({ name: a.fileName || 'photo.jpg', mime_type: 'image/jpeg', data });
    }
    setAttachments((prev) => [...prev, ...picked].slice(0, 5));
  }

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    const picked = [];
    for (const a of (res.assets || []).slice(0, 5)) {
      try {
        const b64 = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
        picked.push({ name: a.name || 'file.pdf', mime_type: 'application/pdf', data: `data:application/pdf;base64,${b64}` });
      } catch (e) {}
    }
    setAttachments((prev) => [...prev, ...picked].slice(0, 5));
  }

  function removeAttachment(idx) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function send() {
    if (sending) return;
    if (!subject.trim() || !body.trim()) return Alert.alert('توجه', 'موضوع و متن گزارش را وارد کنید.');
    if (!toUserId && managers.length > 1 && targetMode === 'manager') return Alert.alert('انتخاب گیرنده', 'مقام بالادست را انتخاب کنید.');
    if (targetMode === 'specific' && !selectedRole) return Alert.alert('انتخاب سمت', 'ابتدا سمت دریافت‌کننده را انتخاب کنید.');
    if (targetMode === 'specific' && !toUserId) return Alert.alert('انتخاب شخص', 'پس از انتخاب سمت، شخص دریافت‌کننده را انتخاب کنید.');
    setSending(true);
    try {
      const r = await postOrQueue('/reports', {
        subject: subject.trim(), body: body.trim(), priority,
        attachments, to_user_id: toUserId || undefined,
      });
      const chosen = [...managers, ...allTargets].find((m) => String(m.id) === String(toUserId));
      const toName = toUserId ? (chosen?.name || `${chosen?.first_name || ''} ${chosen?.last_name || ''}`.trim() || 'گیرنده') : 'مقام بالادست شما';
      if (!r.queued) playSound('reportSentSuccess').catch(() => {});
      Alert.alert(r.queued ? 'آفلاین' : 'ارسال شد', r.queued ? 'گزارش ذخیره شد و بعداً ارسال می‌شود.' : `گزارش به ${toName} ارسال شد.`);
      setBody(''); setAttachments([]); setPriority('normal'); if(reportSubjects.length){setSubjectMode(String(reportSubjects[0].id));setSubject(reportSubjects[0].title||'');}else{setSubjectMode('other');setSubject('');}
      setTargetQuery(''); setSelectedRole('');
      setTab('sent'); setSentQuery('');
    } catch (e) {
      Alert.alert('خطا در ارسال', e?.message || 'ارسال گزارش ناموفق بود. دوباره تلاش کنید.');
    } finally { setSending(false); }
  }

  return (
    <View style={s.page}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'send' && s.tabOn]} onPress={() => setTab('send')}><Text style={[s.tabTxt, tab === 'send' && s.tabTxtOn]}>ارسال گزارش</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'sent' && s.tabOn]} onPress={() => setTab('sent')}><Text style={[s.tabTxt, tab === 'sent' && s.tabTxtOn]}>گزارشات ارسال‌شده</Text></TouchableOpacity>
      </View>

      {tab === 'send' ? (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>موضوع گزارش</Text>
          <View style={s.mgrWrap}>{reportSubjects.map((x)=><TouchableOpacity key={x.id} style={[s.mgrChip,subjectMode===String(x.id)&&s.mgrChipOn]} onPress={()=>{setSubjectMode(String(x.id));setSubject(x.title||'')}}><Text style={[s.mgrChipTxt,subjectMode===String(x.id)&&s.white]}>{x.title}</Text></TouchableOpacity>)}<TouchableOpacity style={[s.mgrChip,subjectMode==='other'&&s.mgrChipOn]} onPress={()=>{setSubjectMode('other');setSubject('')}}><Text style={[s.mgrChipTxt,subjectMode==='other'&&s.white]}>سایر</Text></TouchableOpacity></View>
          {subjectMode==='other'?<TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="موضوع دلخواه را وارد کنید…" placeholderTextColor={C.muted}/>:null}
          <Text style={s.label}>اولویت گزارش</Text>
          <View style={s.priorityWrap}>{Object.entries(PRIORITY).map(([k, v]) => <TouchableOpacity key={k} style={[s.priorityChip, priority === k && s.priorityOn]} onPress={() => setPriority(k)}><Text style={[s.priorityTxt, priority === k && s.white]}>{v}</Text></TouchableOpacity>)}</View>
          <Text style={s.label}>متن گزارش</Text>
          <TextInput style={[s.input, s.bodyInput]} value={body} onChangeText={setBody} multiline placeholder="شرح گزارش…" placeholderTextColor={C.muted} />
          <Text style={s.label}>پیوست‌ها (حداکثر ۵ تصویر یا PDF)</Text>
          <View style={s.attachRow}><TouchableOpacity style={s.attach} onPress={pickImage}><Text style={s.attachTxt}>+ تصویر</Text></TouchableOpacity><TouchableOpacity style={s.attach} onPress={pickPdf}><Text style={s.attachTxt}>+ PDF</Text></TouchableOpacity></View>
          {attachments.map((a, idx) => <View key={`${a.name}-${idx}`} style={s.attItem}>{String(a.mime_type || '').startsWith('image') ? <Image source={{ uri: a.data }} style={s.thumb} /> : null}<Text style={s.attName}>{a.name}</Text><TouchableOpacity onPress={() => removeAttachment(idx)}><Text style={s.attDel}>حذف</Text></TouchableOpacity></View>)}

          <Text style={[s.label, { marginTop: 14 }]}>گیرنده گزارش</Text>
          <View style={s.mgrWrap}>
            <TouchableOpacity style={[s.mgrChip, targetMode === 'manager' && s.mgrChipOn]} onPress={() => { setTargetMode('manager'); setSelectedRole(''); setTargetQuery(''); setToUserId(managers.length === 1 ? managers[0].id : null); }}><Text style={[s.mgrChipTxt, targetMode === 'manager' && s.white]}>مقام بالادست</Text></TouchableOpacity>
            <TouchableOpacity style={[s.mgrChip, targetMode === 'specific' && s.mgrChipOn]} onPress={() => { setTargetMode('specific'); setToUserId(null); setSelectedRole(''); setTargetQuery(''); }}><Text style={[s.mgrChipTxt, targetMode === 'specific' && s.white]}>شخص خاص</Text></TouchableOpacity>
          </View>
          {targetMode === 'manager' ? <View style={s.mgrWrap}>{managers.map((m) => <TouchableOpacity key={m.id} style={[s.mgrChip, String(toUserId) === String(m.id) && s.mgrChipOn]} onPress={() => setToUserId(m.id)}><Text style={[s.mgrChipTxt, String(toUserId) === String(m.id) && s.white]}>{m.is_chief ? '★ ' : ''}{m.name}{m.role_title ? ` (${m.role_title})` : ''}</Text></TouchableOpacity>)}</View> : <>
            <Text style={s.stepTitle}>۱. انتخاب سمت</Text>
            <View style={s.mgrWrap}>{roles.map((r) => <TouchableOpacity key={r.key} style={[s.mgrChip, selectedRole === r.key && s.mgrChipOn]} onPress={() => { setSelectedRole(r.key); setToUserId(null); setTargetQuery(''); }}><Text style={[s.mgrChipTxt, selectedRole === r.key && s.white]}>{r.title}</Text></TouchableOpacity>)}</View>
            {selectedRole ? <><Text style={s.stepTitle}>۲. انتخاب شخص</Text><TextInput style={s.input} value={targetQuery} onChangeText={setTargetQuery} placeholder="جستجوی نام شخص…" placeholderTextColor={C.muted} /><View style={s.mgrWrap}>{roleTargets.map((t) => <TouchableOpacity key={t.id} style={[s.mgrChip, String(toUserId) === String(t.id) && s.mgrChipOn]} onPress={() => setToUserId(t.id)}><Text style={[s.mgrChipTxt, String(toUserId) === String(t.id) && s.white]}>{t.first_name} {t.last_name}</Text></TouchableOpacity>)}</View>{roleTargets.length === 0 ? <Text style={s.empty}>شخصی با این مشخصات یافت نشد.</Text> : null}</> : null}
          </>}
          <TouchableOpacity style={[s.btn, sending && { opacity: 0.6 }]} onPress={send} disabled={sending}><Text style={s.btnTxt}>{sending ? 'در حال ارسال…' : 'ارسال گزارش'}</Text></TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <TextInput style={s.input} value={sentQuery} onChangeText={setSentQuery} placeholder="جستجو بر اساس موضوع یا بخشی از متن گزارش…" placeholderTextColor={C.muted} />
          {mine.length === 0 && <Text style={s.empty}>گزارشی مطابق جستجو یافت نشد.</Text>}
          {mine.map((r) => <TouchableOpacity key={r.id} style={s.card} onPress={() => navigation.navigate('ReportDetail', { id: r.id, mine: true })}><View style={s.cardHead}><Text style={s.cardTitle}>{r.subject}</Text><Text style={s.status}>{PRIORITY[r.priority] ? `${PRIORITY[r.priority]} · ` : ''}{STATUS[r.status] || r.status}</Text></View><Text numberOfLines={2} style={s.preview}>{r.body}</Text><Text style={s.date}>{fj(r.created_at)}</Text>{Number(r.confidential_history) === 1 ? <Text style={s.confBadge}>محرمانه · سابقه برای ارسال‌کننده مخفی است</Text> : null}<Text style={s.tapHint}>برای دیدن متن کامل و پیوست‌ها ضربه بزنید ›</Text></TouchableOpacity>)}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 28 },
  tabs: { flexDirection: 'row-reverse', padding: 8, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.line },
  tab: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }, tabOn: { backgroundColor: C.brand },
  tabTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 }, tabTxtOn: { color: '#fff' }, white: { color: '#fff' },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 8, marginTop: 8, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, textAlign: 'right', fontFamily: FONT.regular, color: C.ink }, bodyInput: { minHeight: 110, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row-reverse', gap: 8 }, attach: { flex: 1, backgroundColor: '#eef1f7', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 }, attachTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  attItem: { alignItems: 'center', backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 7, flexDirection: 'row-reverse' }, thumb: { width: 44, height: 44, borderRadius: 8, marginEnd: 8 }, attName: { fontFamily: FONT.regular, color: C.ink, fontSize: 12, flex: 1, textAlign: 'right' }, attDel: { fontFamily: FONT.bold, color: C.danger, fontSize: 12, paddingHorizontal: 8 },
  priorityWrap: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8 }, priorityChip: { flex: 1, backgroundColor: '#eef1f7', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.line }, priorityOn: { backgroundColor: C.brand, borderColor: C.brand }, priorityTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  mgrWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 6 }, mgrChip: { backgroundColor: '#eef2f8', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 }, mgrChipOn: { backgroundColor: C.brand, borderColor: C.brand }, mgrChipTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 }, stepTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', marginTop: 14, marginBottom: 3 },
  confCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff8e8', borderColor: '#f0c36a', borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 16 }, confTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' }, confHelp: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, lineHeight: 19, textAlign: 'right', marginTop: 4 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 }, btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 }, empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 16 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginTop: 10 }, cardHead: { flexDirection: 'row-reverse', justifyContent: 'space-between' }, cardTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', flex: 1 }, status: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, marginRight: 8 }, preview: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5, textAlign: 'right', marginTop: 8, lineHeight: 20 }, date: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 5 }, confBadge: { fontFamily: FONT.bold, color: '#9a5b00', fontSize: 11.5, textAlign: 'right', marginTop: 6 }, tapHint: { fontFamily: FONT.regular, color: C.brand, fontSize: 11.5, textAlign: 'right', marginTop: 6 },
});
