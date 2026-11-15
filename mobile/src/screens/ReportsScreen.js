import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, useWindowDimensions } from 'react-native';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { compressToDataUri } from '../img';
import { postOrQueue, request, cachedValue } from '../api';
import { C, FONT } from '../theme';
import { fj } from '../jdate';
import { playSound } from '../soundFx';
import ReportPersonPickerModal from '../components/ReportPersonPickerModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { faNum } from '../num';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../auth';

const STATUS = { sent: 'ارسال‌شده', seen: 'دیده‌شده', answered: 'پاسخ‌داده‌شده', forwarded: 'ارجاع‌شده', rejected: 'رد شده' };
const PRIORITY = { normal: 'عادی', important: 'مهم', urgent: 'فوری' };

export default function ReportsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const draftKey = user?.id ? `khatyar:report-draft:v1:${user.id}` : null;
  const draftRestored = useRef(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [tab, setTab] = useState('send');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [mine, setMine] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState('normal');
  const [reportSubjects, setReportSubjects] = useState([]);
  const [subjectMode, setSubjectMode] = useState('other');
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [managers, setManagers] = useState([]);
  const [allTargets, setAllTargets] = useState([]);
  const [targetMode, setTargetMode] = useState('manager');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetQuery, setTargetQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [toUserId, setToUserId] = useState(null);
  const [sentQuery, setSentQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [ccRole, setCcRole] = useState('');
  const [ccQuery, setCcQuery] = useState('');
  const [ccUserId, setCcUserId] = useState(null);
  const [sortNewest, setSortNewest] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [listError, setListError] = useState('');
  const [listBusy, setListBusy] = useState(false);
  const [sentSelection, setSentSelection] = useState([]);
  const [bulkSentBusy, setBulkSentBusy] = useState(false);
  const [sentPriorityFilter, setSentPriorityFilter] = useState('all');
  const [sentStatusFilter, setSentStatusFilter] = useState('all');
  const [sentSort, setSentSort] = useState('date');
  const [sentGroup, setSentGroup] = useState('none');
  const [sentFiltersOpen, setSentFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    const suffix = sentQuery.trim() ? `?q=${encodeURIComponent(sentQuery.trim())}` : '';
    const url='/my/reports' + suffix;
    setListBusy(true);
    try {
      const saved=await cachedValue(url);
      if(Array.isArray(saved))setMine(saved);
      const result=await request(url,{queueIfOffline:false});
      if(!Array.isArray(result))throw new Error('پاسخ گزارش‌های ارسالی معتبر نیست.');
      setMine(result);setListError('');
    } catch(e) { setListError(e?.message || 'دریافت گزارش‌های ارسال‌شده ممکن نشد.'); }
    finally {setListBusy(false);}
  }, [sentQuery]);

  useEffect(() => {
    draftRestored.current = false;
    setDraftReady(false);
    if (!draftKey) return;
    let active = true;
    AsyncStorage.getItem(draftKey).then(raw => {
      if (!active || !raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      draftRestored.current = true;
      setSubject(String(d.subject || ''));
      setBody(String(d.body || ''));
      setSubjectMode(String(d.subjectMode || 'other'));
      setPriority(['normal','important','urgent'].includes(d.priority) ? d.priority : 'normal');
      setTargetMode(d.targetMode === 'specific' ? 'specific' : 'manager');
      setToUserId(d.toUserId || null);
      setCcEnabled(Boolean(d.ccEnabled));
      setCcUserId(d.ccUserId || null);
      setDraftStatus('پیش‌نویس قبلی بازیابی شد');
    }).catch(() => setDraftStatus('بازیابی پیش‌نویس ممکن نشد')).finally(() => { if (active) setDraftReady(true); });
    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady || !draftKey || sending) return;
    const id = setTimeout(async () => {
      try {
        if (!body.trim() && (!subject.trim() || subjectMode !== 'other') && !ccEnabled) {
          await AsyncStorage.removeItem(draftKey);
          setDraftStatus('');
          return;
        }
        await AsyncStorage.setItem(draftKey, JSON.stringify({
          subject, body, subjectMode, priority, targetMode, toUserId, ccEnabled, ccUserId,
          savedAt: Date.now(),
        }));
        setDraftStatus('پیش‌نویس در همین دستگاه ذخیره شد (بدون پیوست)');
      } catch (_) { setDraftStatus('ذخیره خودکار پیش‌نویس ناموفق بود'); }
    }, 800);
    return () => clearTimeout(id);
  }, [draftKey, draftReady, subject, body, subjectMode, priority, targetMode, toUserId, ccEnabled, ccUserId, sending]);

  useEffect(() => {
    request('/my/managers').then((m) => {
      setManagers(m || []);
      if (m && m.length === 1 && !draftRestored.current) setToUserId(m[0].id);
      else if (m && m.length > 1 && !draftRestored.current) {
        const chief = m.find((x) => x.is_chief);
        if (chief) setToUserId(chief.id);
      }
    }).catch(() => setManagers([]));
    request('/my/forward-targets').then((r) => setAllTargets(r || [])).catch(() => setAllTargets([]));
    request('/report-subjects').then((r)=>{setReportSubjects(r||[]); if(r&&r.length&&!draftRestored.current){setSubjectMode(String(r[0].id));setSubject(r[0].title||'');}}).catch(()=>setReportSubjects([]));
  }, []);

  useEffect(() => {
    if (tab !== 'sent') return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [tab, load]);

  const sortedMine = useMemo(() => mine.filter(r => (sentPriorityFilter === 'all' || r.priority === sentPriorityFilter) && (sentStatusFilter === 'all' || r.status === sentStatusFilter) && (!sentQuery.trim() || [r.subject,r.body,r.sender_name,r.sender].some(v=>String(v||'').includes(sentQuery.trim())))).sort((a, b) => {
    let compare = 0;
    if (sentSort === 'subject') compare = String(a.subject || '').localeCompare(String(b.subject || ''), 'fa');
    else if (sentSort === 'priority') compare = ({ urgent: 3, important: 2, normal: 1 }[a.priority] || 0) - ({ urgent: 3, important: 2, normal: 1 }[b.priority] || 0);
    else compare = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    return (sortNewest ? -1 : 1) * compare;
  }), [mine, sortNewest, sentQuery, sentPriorityFilter, sentStatusFilter, sentSort]);

  const sentGroupLabel = (r) => sentGroup === 'priority' ? (PRIORITY[r.priority] || 'بدون اولویت') : sentGroup === 'status' ? (STATUS[r.status] || r.status || 'نامشخص') : '';
  const orderedSent = useMemo(() => {
    if (sentGroup === 'none') return sortedMine;
    return [...sortedMine].sort((a, b) => {
      const order = sentGroupLabel(a).localeCompare(sentGroupLabel(b), 'fa');
      return order || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    });
  }, [sortedMine, sentGroup]);
  const sentGroupCounts = sortedMine.reduce((acc, r) => {
    const key = sentGroupLabel(r);
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const shownSentIds = sortedMine.map(item => String(item.id));
  const selectedSentIds = sentSelection.filter(id => shownSentIds.includes(id));
  const allSentSelected = shownSentIds.length > 0 && shownSentIds.every(id => selectedSentIds.includes(id));
  const deleteSelectedSent = () => {
    if (!selectedSentIds.length || bulkSentBusy) return;
    Alert.alert('حذف گزارش‌های ارسالی', `حذف ${selectedSentIds.length.toLocaleString('fa-IR')} گزارش؟ گزارش‌هایی که گیرنده مشاهده کرده است ممکن است قابل حذف نباشند. برای مدیر، حذف می‌تواند سراسری باشد.`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'تأیید حذف', style: 'destructive', onPress: async () => {
        setBulkSentBusy(true);
        const failed = [], success = [];
        for (const id of selectedSentIds) {
          try {
            await request(`/reports/${id}`, { method: 'DELETE', queueIfOffline: false });
            success.push(id);
          } catch (e) { failed.push({ id, message: e?.message || 'خطا' }); }
        }
        setMine(previous => previous.filter(item => !success.includes(String(item.id))));
        setSentSelection(failed.map(item => item.id));
        setBulkSentBusy(false);
        Alert.alert('نتیجه حذف گروهی', `${success.length.toLocaleString('fa-IR')} موفق، ${failed.length.toLocaleString('fa-IR')} ناموفق${failed.length ? `؛ گزارش ${failed[0].id}: ${failed[0].message}` : ''}`);
      }},
    ]);
  };

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

  const ccTargets = useMemo(() => {
    if (!ccRole) return [];
    const q = ccQuery.trim();
    return allTargets.filter((t) => {
      const roleKey = String(t.role_id || t.role_title || 'بدون سمت');
      const hay = `${t.first_name || ''} ${t.last_name || ''} ${t.role_title || ''}`;
      return roleKey === ccRole && (!q || hay.includes(q)) && String(t.id) !== String(toUserId);
    }).slice(0, 50);
  }, [allTargets, ccRole, ccQuery, toUserId]);

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

  function removeAttachment(idx) { setAttachments((prev) => prev.filter((_, i) => i !== idx)); }

  async function exportPdf() {
    if (pdfBusy) return;
    if (!sortedMine.length) return Alert.alert('خروجی PDF', 'گزارشی برای خروجی وجود ندارد.');
    setPdfBusy(true);
    try {
      const rows = sortedMine.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.subject)}</td><td>${esc(r.body)}</td><td>${esc(r.sender_name || r.sender || '')}</td><td>${esc(STATUS[r.status] || r.status || '')}</td><td>${esc(fj(r.created_at))}</td></tr>`).join('');
      let template = null;
      try { const p = await request('/reports/print-data'); template = p?.template || null; } catch (_) {}
      const fallback = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Tahoma,Arial,sans-serif;color:#172033;font-size:11px}h1{font-size:18px;text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top;text-align:right}th{background:#f1f5f9}.meta{text-align:center;color:#64748b;font-size:10px}</style></head><body><h1>گردش گزارشات</h1><div class="meta">تعداد: ${sortedMine.length} · مرتب‌سازی: ${sortNewest ? 'جدیدترین' : 'قدیمی‌ترین'}</div><table><thead><tr><th>#</th><th>موضوع</th><th>متن</th><th>فرستنده</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      const html = template ? applyTemplate(template, sortedMine) : fallback;
      const result = await Print.printToFileAsync({ html, base64: false, margins: { top: 12, bottom: 12, left: 12, right: 12 } });
      if (result?.uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'خروجی PDF گردش گزارشات' });
      else if (result?.uri) Alert.alert('PDF آماده شد', result.uri);
    } catch (e) { Alert.alert('خطای PDF', e?.message || 'ساخت PDF ناموفق بود.'); }
    finally { setPdfBusy(false); }
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
        cc_user_id: ccEnabled && ccUserId ? ccUserId : undefined,
      });
      let botDelivery = null;
      if (!r?.queued) {
        try {
          botDelivery = await request('/report-bot-notify.php', { method: 'POST', body: { subject: subject.trim(), body: body.trim(), report_id: r?.id || r?.report_id || null, attachments }, timeoutMs: 45000 });
        } catch (botError) { botDelivery = { ok: false, error: botError?.message || 'ارسال به ربات‌ها ناموفق بود.' }; }
      }
      const chosen = [...managers, ...allTargets].find((m) => String(m.id) === String(toUserId));
      const toName = toUserId ? (chosen?.name || `${chosen?.first_name || ''} ${chosen?.last_name || ''}`.trim() || 'گیرنده') : 'مقام بالادست شما';
      if (!r.queued) playSound('reportSentSuccess').catch(() => {});
      const botFailed = !r.queued && botDelivery && botDelivery.ok === false;
      const botText = botFailed ? '\nارسال به ربات‌های پیام‌رسان انجام نشد؛ گزارش اصلی ثبت شده است.' : '';
      Alert.alert(r.queued ? 'آفلاین' : 'ارسال شد', r.queued ? 'گزارش ذخیره شد و بعداً ارسال می‌شود.' : `گزارش به ${toName} ارسال شد.${botText}`);
      if (draftKey) await AsyncStorage.removeItem(draftKey).catch(() => {});
      setDraftStatus('');
      setBody(''); setAttachments([]); setPriority('normal'); if(reportSubjects.length){setSubjectMode(String(reportSubjects[0].id));setSubject(reportSubjects[0].title||'');}else{setSubjectMode('other');setSubject('');}
      setTargetQuery(''); setSelectedRole(''); setCcEnabled(false); setCcRole(''); setCcQuery(''); setCcUserId(null); setTab('sent'); setSentQuery('');
    } catch (e) { Alert.alert('خطا در ارسال', e?.message || 'ارسال گزارش ناموفق بود. دوباره تلاش کنید.'); }
    finally { setSending(false); }
  }

  return (
    <View style={s.page}>
      <View style={s.reportHero}><View style={s.reportHeroRow}><MaterialCommunityIcons name={tab==='send'?'send-outline':'clipboard-check-outline'} size={25} color="#f1d69b"/><Text style={s.reportHeroTitle}>{tab==='send'?'ارسال گزارش':'گزارش‌های ارسال‌شده'}</Text></View><Text style={s.reportHeroSub}>{tab==='send'?'ثبت گزارش جدید و انتخاب گیرندگان':'سوابق گزارش‌ها و وضعیت رسیدگی'}</Text></View>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'send' && s.tabOn]} onPress={() => setTab('send')}><MaterialCommunityIcons name="send-outline" size={19} color={tab==='send'?'#fff':C.brand}/><Text style={[s.tabTxt, tab === 'send' && s.tabTxtOn]}>ارسال گزارش</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'sent' && s.tabOn]} onPress={() => setTab('sent')}><MaterialCommunityIcons name="clipboard-check-outline" size={19} color={tab==='sent'?'#fff':C.brand}/><Text style={[s.tabTxt, tab === 'sent' && s.tabTxtOn]}>گزارشات ارسال‌شده</Text></TouchableOpacity>
      </View>
      {tab === 'send' ? (
        <ScrollView persistentScrollbar={true} contentContainerStyle={[s.content,{paddingHorizontal:width<360?11:16}]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={s.draftNotice}><MaterialCommunityIcons name="content-save-check-outline" size={19} color={C.brand}/><Text style={s.draftNoticeText}>{draftStatus || 'متن گزارش به‌صورت خودکار روی این دستگاه ذخیره می‌شود. پیوست‌ها ذخیره نمی‌شوند.'}</Text></View>
          <View style={s.sectionCard}><View style={s.sectionHead}><MaterialCommunityIcons name="file-document-edit-outline" size={21} color={C.brand}/><Text style={s.sectionTitle}>موضوع و اولویت گزارش</Text></View><Text style={s.label}>موضوع گزارش</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:subjectDropdownOpen}} style={s.subjectPickerTrigger} onPress={()=>{setSubjectSearch('');setSubjectDropdownOpen(open=>!open);}}>
            <MaterialCommunityIcons name="chevron-down" size={22} color={C.brand}/>
            <Text style={s.subjectPickerValue}>{subjectMode==='other'?'سایر (موضوع دلخواه)':(reportSubjects.find(x=>String(x.id)===subjectMode)?.title||'انتخاب موضوع گزارش')}</Text>
            <MaterialCommunityIcons name="format-list-bulleted" size={19} color={C.brand}/>
          </TouchableOpacity>
          {subjectDropdownOpen && <View style={s.subjectDropdown}>
            <View style={s.subjectSearchRow}><MaterialCommunityIcons name="magnify" size={20} color={C.muted}/><TextInput autoFocus value={subjectSearch} onChangeText={setSubjectSearch} style={s.subjectSearchInput} placeholder="جستجوی لحظه‌ای موضوع…" placeholderTextColor={C.muted}/></View>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={s.subjectOptions}>
              {[...reportSubjects.map(x=>({id:String(x.id),title:String(x.title||'')})),{id:'other',title:'سایر (موضوع دلخواه)'}].filter(x=>x.title.toLocaleLowerCase('fa-IR').includes(subjectSearch.trim().toLocaleLowerCase('fa-IR'))).map(x=>
                <TouchableOpacity accessibilityRole="button" key={x.id} style={[s.subjectOption,subjectMode===x.id&&s.subjectSelected]} onPress={()=>{setSubjectMode(x.id);setSubject(x.id==='other'?'':x.title);setSubjectDropdownOpen(false);setSubjectSearch('');}}>
                  <MaterialCommunityIcons name={subjectMode===x.id?'check-circle':'circle-outline'} size={18} color={C.brand}/>
                  <Text style={s.subjectOptionText}>{x.title}</Text>
                </TouchableOpacity>)}
              {![...reportSubjects.map(x=>String(x.title||'')),'سایر (موضوع دلخواه)'].some(title=>title.toLocaleLowerCase('fa-IR').includes(subjectSearch.trim().toLocaleLowerCase('fa-IR')))&&<Text style={s.subjectEmpty}>موضوعی پیدا نشد.</Text>}
            </ScrollView>
          </View>}
          {subjectMode==='other'?<TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="موضوع دلخواه را وارد کنید…" placeholderTextColor={C.muted}/>:null}
          <Text style={s.label}>اولویت گزارش</Text>
          <View style={s.priorityWrap}>{Object.entries(PRIORITY).map(([k, v]) => <TouchableOpacity key={k} style={[s.priorityChip, priority === k && s.priorityOn]} onPress={() => setPriority(k)}><Text style={[s.priorityTxt, priority === k && s.white]}>{v}</Text></TouchableOpacity>)}</View>
          </View><View style={s.sectionCard}><View style={s.sectionHead}><MaterialCommunityIcons name="text-box-outline" size={21} color={C.brand}/><Text style={s.sectionTitle}>شرح گزارش و پیوست‌ها</Text></View><Text style={s.label}>متن گزارش</Text><TextInput style={[s.input, s.bodyInput]} value={body} onChangeText={setBody} multiline placeholder="شرح گزارش…" placeholderTextColor={C.muted} />
          <View style={s.formHint}><Text style={s.formHintText}>{faNum(body.trim().length)} نویسه · شرح روشن، زمان و مکان رویداد و اقدام مورد انتظار را ثبت کنید.</Text></View>
          <Text style={s.label}>پیوست‌ها (حداکثر ۵ تصویر)</Text>
          <View style={s.attachRow}><TouchableOpacity accessibilityRole="button" style={s.attach} onPress={pickImage}><MaterialCommunityIcons name="image-plus" size={19} color={C.brand}/><Text style={s.attachTxt}>افزودن تصویر</Text></TouchableOpacity></View>
          {attachments.map((a, idx) => <View key={`${a.name}-${idx}`} style={s.attItem}>{String(a.mime_type || '').startsWith('image') ? <Image source={{ uri: a.data }} style={s.thumb} /> : null}<Text style={s.attName}>{a.name}</Text><TouchableOpacity onPress={() => removeAttachment(idx)}><Text style={s.attDel}>حذف</Text></TouchableOpacity></View>)}
          </View><View style={s.sectionCard}><View style={s.sectionHead}><MaterialCommunityIcons name="account-arrow-left-outline" size={21} color={C.brand}/><Text style={s.sectionTitle}>گیرندگان گزارش</Text></View><Text style={[s.label, { marginTop: 14 }]}>گیرنده گزارش</Text>
          <View style={s.mgrWrap}><TouchableOpacity style={[s.mgrChip, targetMode === 'manager' && s.mgrChipOn]} onPress={() => { setTargetMode('manager'); setSelectedRole(''); setTargetQuery(''); setToUserId(managers.length === 1 ? managers[0].id : null); }}><Text style={[s.mgrChipTxt, targetMode === 'manager' && s.white]}>مقام بالادست</Text></TouchableOpacity><TouchableOpacity style={[s.mgrChip, targetMode === 'specific' && s.mgrChipOn]} onPress={() => { setTargetMode('specific'); setToUserId(null); setSelectedRole(''); setTargetQuery(''); setShowTargetModal(true); }}><Text style={[s.mgrChipTxt, targetMode === 'specific' && s.white]}>ارسال برای شخص دیگر</Text></TouchableOpacity></View>
          {targetMode === 'manager' ? <View style={s.mgrWrap}>{managers.map((m) => <TouchableOpacity key={m.id} style={[s.mgrChip, String(toUserId) === String(m.id) && s.mgrChipOn]} onPress={() => setToUserId(m.id)}><Text style={[s.mgrChipTxt, String(toUserId) === String(m.id) && s.white]}>{m.is_chief ? '★ ' : ''}{m.name}{m.role_title ? ` (${m.role_title})` : ''}</Text></TouchableOpacity>)}</View> : <TouchableOpacity style={s.personSelect} onPress={() => setShowTargetModal(true)}><Text style={s.personSelectTitle}>{toUserId ? 'گیرنده انتخاب شده' : 'انتخاب شخص دیگر'}</Text><Text style={s.personSelectValue}>{toUserId ? (([...managers, ...allTargets].find(x => String(x.id) === String(toUserId))?.first_name || '') + ' ' + ([...managers, ...allTargets].find(x => String(x.id) === String(toUserId))?.last_name || '')).trim() : 'جستجوی مستقیم یا فیلتر بر اساس سمت'}</Text></TouchableOpacity>}
          <TouchableOpacity style={s.ccToggle} accessibilityRole="checkbox" accessibilityState={{checked:ccEnabled}} onPress={() => { setCcEnabled((v) => !v); setCcRole(''); setCcQuery(''); setCcUserId(null); }}><MaterialCommunityIcons name={ccEnabled?'checkbox-marked-outline':'checkbox-blank-outline'} color={C.brand} size={22}/><Text style={s.ccToggleTxt}>ارسال رونوشت به فرد دیگر</Text></TouchableOpacity>
          {ccEnabled && <><Text style={s.stepTitle}>۱. انتخاب سمت گیرندهٔ رونوشت</Text><View style={s.mgrWrap}>{roles.map((r) => <TouchableOpacity key={r.key} style={[s.mgrChip, ccRole === r.key && s.mgrChipOn]} onPress={() => { setCcRole(r.key); setCcUserId(null); setCcQuery(''); }}><Text style={[s.mgrChipTxt, ccRole === r.key && s.white]}>{r.title}</Text></TouchableOpacity>)}</View>{ccRole ? <><Text style={s.stepTitle}>۲. انتخاب شخص</Text><TextInput style={s.input} value={ccQuery} onChangeText={setCcQuery} placeholder="جستجوی نام شخص…" placeholderTextColor={C.muted} /><View style={s.mgrWrap}>{ccTargets.map((t) => <TouchableOpacity key={t.id} style={[s.mgrChip, String(ccUserId) === String(t.id) && s.mgrChipOn]} onPress={() => setCcUserId(t.id)}><Text style={[s.mgrChipTxt, String(ccUserId) === String(t.id) && s.white]}>{t.first_name} {t.last_name}</Text></TouchableOpacity>)}</View></> : null}</>}
          </View><TouchableOpacity style={[s.btn, sending && { opacity: 0.6 }]} onPress={send} disabled={sending}><MaterialCommunityIcons name="send-check-outline" size={21} color="#fff"/><Text style={s.btnTxt}>{sending ? 'در حال ارسال…' : 'ارسال گزارش'}</Text></TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView persistentScrollbar={true} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.sentHero}><MaterialCommunityIcons name="clipboard-text-clock-outline" size={23} color={C.brand}/><View style={s.sentHeroText}><Text style={s.sectionTitle}>سوابق گزارش‌های ارسال‌شده</Text><Text style={s.sentCount}>{faNum(sortedMine.length)} گزارش</Text></View><TouchableOpacity accessibilityRole="button" disabled={listBusy} onPress={load}><MaterialCommunityIcons name="refresh" size={23} color={C.brand}/></TouchableOpacity></View><TextInput style={s.input} value={sentQuery} onChangeText={setSentQuery} placeholder="جستجو بر اساس موضوع یا بخشی از متن گزارش…" placeholderTextColor={C.muted} />
          <View style={s.sentFilterPanel}>
             <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:sentFiltersOpen}} onPress={()=>setSentFiltersOpen(open=>!open)} style={s.sentFilterHeading}>
               <View style={s.sentFilterTitleRow}><MaterialCommunityIcons name="filter-variant" color={C.brand} size={21}/><Text style={s.sentFilterTitle}>فیلترهای پیشرفته</Text></View>
               <MaterialCommunityIcons name={sentFiltersOpen?'chevron-up':'chevron-down'} color={C.brand} size={22}/>
             </TouchableOpacity>
             {sentFiltersOpen && <View style={s.sentFilterContent}>
               <View style={s.sortBar}><TouchableOpacity style={[s.sortBtn, sortNewest && s.sortBtnOn]} onPress={() => setSortNewest(true)}><Text style={[s.sortTxt, sortNewest && s.white]}>جدیدترین</Text></TouchableOpacity><TouchableOpacity style={[s.sortBtn, !sortNewest && s.sortBtnOn]} onPress={() => setSortNewest(false)}><Text style={[s.sortTxt, !sortNewest && s.white]}>قدیمی‌ترین</Text></TouchableOpacity><TouchableOpacity style={[s.pdfBtn, pdfBusy && { opacity: .6 }]} disabled={pdfBusy} onPress={exportPdf}><MaterialCommunityIcons name="file-pdf-box" size={17} color="#fff"/><Text style={s.pdfTxt}>{pdfBusy ? 'در حال ساخت PDF…' : 'خروجی PDF'}</Text></TouchableOpacity></View>
               <View style={s.sentPriorityRow}>
            {['all','normal','important','urgent'].map(key => <TouchableOpacity key={key} onPress={() => {setSentPriorityFilter(key);setSentSelection([]);}} style={[s.sentPriorityChip,sentPriorityFilter===key&&s.sentPriorityActive]}><Text style={[s.sentPriorityTxt,sentPriorityFilter===key&&{color:'#fff'}]}>{key==='all'?'همه اولویت‌ها':PRIORITY[key]}</Text></TouchableOpacity>)}
          </View>
          <View style={s.sentPriorityRow}>
            {['all','sent','seen','answered','forwarded','rejected'].map(key => <TouchableOpacity key={key} onPress={() => {setSentStatusFilter(key);setSentSelection([]);}} style={[s.sentPriorityChip,sentStatusFilter===key&&s.sentPriorityActive]}><Text style={[s.sentPriorityTxt,sentStatusFilter===key&&{color:'#fff'}]}>{key==='all'?'همه وضعیت‌ها':STATUS[key]}</Text></TouchableOpacity>)}
          </View>
          <View style={s.sentBulkRow}><Text style={s.sentBulkText}>مرتب‌سازی</Text>{['date','subject','priority'].map(key=><TouchableOpacity key={key} onPress={()=>setSentSort(key)} style={[s.sentPriorityChip,sentSort===key&&s.sentPriorityActive]}><Text style={[s.sentPriorityTxt,sentSort===key&&{color:'#fff'}]}>{key==='date'?'تاریخ':key==='subject'?'موضوع':'اولویت'}</Text></TouchableOpacity>)}</View>
          <View style={s.sentBulkRow}><Text style={s.sentBulkText}>دسته‌بندی</Text>{['none','status','priority'].map(key=><TouchableOpacity key={key} onPress={()=>setSentGroup(key)} style={[s.sentPriorityChip,sentGroup===key&&s.sentPriorityActive]}><Text style={[s.sentPriorityTxt,sentGroup===key&&{color:'#fff'}]}>{key==='none'?'بدون گروه':key==='status'?'وضعیت':'اولویت'}</Text></TouchableOpacity>)}</View>
          {sentGroup !== 'none' && <View style={s.sentPriorityRow}>{Object.entries(sentGroupCounts).map(([name,count])=><View key={name} style={s.sentPriorityChip}><Text style={s.sentPriorityTxt}>{name} · {faNum(count)}</Text></View>)}</View>}
               <View style={s.sentFilterFooter}>
                 <TouchableOpacity style={s.sentFilterClear} onPress={()=>{setSentPriorityFilter('all');setSentStatusFilter('all');setSentSort('date');setSortNewest(true);setSentGroup('none');setSentSelection([]);}}><MaterialCommunityIcons name="restore" size={17} color={C.brand}/><Text style={s.sentBulkText}>پاک‌سازی فیلترها</Text></TouchableOpacity>
                 <TouchableOpacity style={s.sentFilterApply} onPress={()=>setSentFiltersOpen(false)}><MaterialCommunityIcons name="check" size={17} color="#fff"/><Text style={[s.sentBulkText,{color:'#fff'}]}>اعمال فیلترها</Text></TouchableOpacity>
               </View>
             </View>}
           </View>
           <View style={s.sentBulkRow}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:allSentSelected}} disabled={bulkSentBusy || !shownSentIds.length} onPress={() => setSentSelection(previous => allSentSelected ? previous.filter(id => !shownSentIds.includes(id)) : Array.from(new Set([...previous, ...shownSentIds])))} style={s.sentSelectAll}>
              <MaterialCommunityIcons name={allSentSelected?'checkbox-marked':'checkbox-blank-outline'} size={23} color={C.brand}/>
              <Text style={s.sentBulkText}>انتخاب همه نتایج ({faNum(shownSentIds.length)})</Text>
            </TouchableOpacity>
            <Text style={s.sentBulkText}>{faNum(selectedSentIds.length)} انتخاب</Text>
          </View>
          {selectedSentIds.length > 0 && <View style={s.sentBulkRow}>
            <TouchableOpacity accessibilityRole="button" disabled={bulkSentBusy} onPress={deleteSelectedSent} style={[s.sentPriorityChip,{borderColor:'#e9b3b3'}]}><MaterialCommunityIcons name="delete-outline" size={18} color={C.danger}/><Text style={[s.sentPriorityTxt,{color:C.danger}]}>{bulkSentBusy?'در حال حذف…':'حذف انتخاب‌شده‌ها'}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={bulkSentBusy} onPress={() => setSentSelection([])}><Text style={s.sentBulkText}>لغو انتخاب</Text></TouchableOpacity>
          </View>}
          {!!listError && <View style={{backgroundColor:'#fff2f0',borderWidth:1,borderColor:'#efc5bf',borderRadius:13,padding:14,marginTop:10}}><Text style={{fontFamily:FONT.regular,color:'#922f26',textAlign:'center'}}>{listError} اطلاعات قبلی ممکن است قدیمی باشند.</Text><TouchableOpacity accessibilityRole="button" onPress={load} style={{minHeight:48,alignItems:'center',justifyContent:'center'}}><Text style={{fontFamily:FONT.bold,color:C.brand}}>تلاش دوباره</Text></TouchableOpacity></View>}
          {sortedMine.length === 0 && !listError && <Text style={s.empty}>{listBusy?'در حال دریافت گزارش‌ها…':'گزارشی مطابق جستجو یافت نشد.'}</Text>}
          {orderedSent.map((r, idx) => <View key={r.id} style={[s.card,selectedSentIds.includes(String(r.id))&&{borderColor:C.brand,borderWidth:2}]}>{sentGroup !== 'none' && (idx === 0 || sentGroupLabel(r) !== sentGroupLabel(orderedSent[idx-1])) && <View style={s.groupHeader}><Text style={s.groupHeaderText}>{sentGroupLabel(r)} · {faNum(sentGroupCounts[sentGroupLabel(r)] || 0)}</Text></View>}
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:selectedSentIds.includes(String(r.id))}} accessibilityLabel={`انتخاب گزارش ${r.id}`} style={s.sentCardCheck} onPress={() => setSentSelection(previous => previous.includes(String(r.id)) ? previous.filter(id=>id!==String(r.id)) : [...previous,String(r.id)])}><MaterialCommunityIcons name={selectedSentIds.includes(String(r.id))?'checkbox-marked':'checkbox-blank-outline'} size={23} color={C.brand}/><Text style={s.sentBulkText}>انتخاب</Text></TouchableOpacity><TouchableOpacity onPress={() => navigation.navigate('ReportDetail', { id: r.id, mine: true })}><View style={s.cardHead}><View style={s.cardTitleRow}><MaterialCommunityIcons name="file-document-outline" size={19} color={C.brand}/><Text style={s.cardTitle}>{r.subject}</Text></View><Text style={[s.status,r.priority==='urgent'&&s.urgentStatus]}>{PRIORITY[r.priority] ? `${PRIORITY[r.priority]} · ` : ''}{STATUS[r.status] || r.status}</Text></View><Text numberOfLines={2} style={s.preview}>{r.body}</Text>{r.current_owner_name ? <View style={s.sentOwner}><MaterialCommunityIcons name="account-check-outline" size={17} color={C.brand}/><Text style={s.sentOwnerTxt}>مسئول جاری: {r.current_owner_name}</Text></View> : null}<View style={s.dateRow}><MaterialCommunityIcons name="calendar-clock-outline" size={15} color={C.muted}/><Text style={s.date}>{faNum(fj(r.created_at))}</Text></View>{Number(r.confidential_history) === 1 ? <Text style={s.confBadge}>محرمانه · سابقه برای ارسال‌کننده مخفی است</Text> : null}<View style={s.cardFooter}><Text style={s.tapHint}>مشاهده جزئیات و پیوست‌ها</Text><MaterialCommunityIcons name="chevron-left" size={19} color={C.brand}/></View></TouchableOpacity></View>)}
        </ScrollView>
      )}
      <ReportPersonPickerModal
        visible={showTargetModal}
        title="انتخاب گیرنده گزارش"
        targets={allTargets}
        selectedId={toUserId}
        onClose={() => setShowTargetModal(false)}
        onSelect={(person) => { setToUserId(person.id); setSelectedRole(String(person.role_id || person.role_title || '')); setTargetQuery(''); setShowTargetModal(false); }}
      />
    </View>
  );
}

function esc(v) { return String(v ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function applyTemplate(template, reports) {
  const data = reports.map((r, i) => ({ index: i + 1, subject: r.subject || '', body: r.body || '', sender: r.sender_name || r.sender || '', status: STATUS[r.status] || r.status || '', date: fj(r.created_at) }));
  let html = String(template);
  html = html.replace(/\{\{REPORTS_JSON\}\}/g, esc(JSON.stringify(data)));
  if (html.includes('{{REPORT_ROWS}}')) html = html.replace(/\{\{REPORT_ROWS\}\}/g, data.map(r => `<tr><td>${r.index}</td><td>${esc(r.subject)}</td><td>${esc(r.body)}</td><td>${esc(r.sender)}</td><td>${esc(r.status)}</td><td>${esc(r.date)}</td></tr>`).join(''));
  return html.replace(/\{\{TITLE\}\}/g, 'گردش گزارشات').replace(/\{\{COUNT\}\}/g, String(reports.length));
}

const s = StyleSheet.create({
  reportHero:{backgroundColor:'#075f51',paddingHorizontal:20,paddingTop:21,paddingBottom:19,borderBottomLeftRadius:23,borderBottomRightRadius:23,elevation:2},
  reportHeroRow:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  reportHeroTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:20,textAlign:'right',flex:1},
  reportHeroSub:{fontFamily:FONT.regular,color:'#dcefe6',fontSize:12,lineHeight:21,textAlign:'right',marginTop:7},

  sentFilterPanel:{borderWidth:1,borderColor:'#dbe9e1',borderRadius:19,backgroundColor:'#fff',marginTop:13,marginBottom:11,overflow:'hidden',elevation:1},
  sentFilterHeading:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingHorizontal:15,minHeight:54},
  sentFilterTitleRow:{flexDirection:'row-reverse',gap:8,alignItems:'center'},
  sentFilterTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14},
  sentFilterContent:{padding:12,borderTopWidth:1,borderTopColor:'#eaf1eb'},
  sentFilterFooter:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingTop:12,marginTop:10,borderTopWidth:1,borderTopColor:'#eaf0ec'},
  sentFilterClear:{flexDirection:'row-reverse',gap:5,alignItems:'center',minHeight:45,paddingHorizontal:7},
  sentFilterApply:{flexDirection:'row-reverse',gap:5,alignItems:'center',backgroundColor:C.brand,borderRadius:11,minHeight:45,paddingHorizontal:13},

  subjectPickerTrigger:{flexDirection:'row-reverse',alignItems:'center',gap:8,backgroundColor:'#f8fcfa',borderWidth:1,borderColor:'#b9d7c9',borderRadius:14,minHeight:52,paddingHorizontal:12,marginTop:8},
  subjectPickerValue:{fontFamily:FONT.bold,color:C.ink,flex:1,textAlign:'right',fontSize:13},
  subjectDropdown:{borderWidth:1,borderColor:'#d8e6de',borderRadius:15,backgroundColor:'#fff',padding:9,marginTop:5,elevation:3},
  subjectSearchRow:{flexDirection:'row-reverse',alignItems:'center',gap:8,borderRadius:11,borderWidth:1,borderColor:C.line,backgroundColor:'#f6faf8',paddingHorizontal:10,minHeight:45},
  subjectSearchInput:{flex:1,textAlign:'right',color:C.ink,fontFamily:FONT.regular,fontSize:13,paddingVertical:8},
  subjectOptions:{maxHeight:220},
  subjectOption:{flexDirection:'row-reverse',alignItems:'center',gap:9,minHeight:45,paddingHorizontal:11,borderBottomWidth:1,borderBottomColor:'#edf3ef',borderRadius:8},
  subjectSelected:{backgroundColor:'#eaf6ef'},
  subjectOptionText:{flex:1,textAlign:'right',fontFamily:FONT.regular,fontSize:13,color:C.ink},
  subjectEmpty:{textAlign:'center',fontFamily:FONT.regular,color:C.muted,padding:16},

  sentOwner: {flexDirection:'row-reverse',alignItems:'center',gap:5,paddingVertical:5},
  sentOwnerTxt: {fontFamily:FONT.regular,color:C.brand,textAlign:'right',fontSize:12},
  groupHeader: {padding:9,backgroundColor:'#eef2f9',borderRadius:10,marginBottom:8},
  groupHeaderText: {fontFamily:FONT.bold,color:C.brand,textAlign:'right',fontSize:13},

  draftNotice: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', borderRadius: 13, backgroundColor: '#eaf4ff', padding: 13, marginBottom: 12 },
  draftNoticeText: { color: C.ink, fontFamily: FONT.regular, fontSize: 12, flex: 1, textAlign: 'right' },
  formHint: { paddingVertical: 8 },
  formHintText: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', fontSize: 12 },

  sentBulkRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 8, flexWrap: 'wrap' },
  sentSelectAll: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  sentBulkText: { fontFamily: FONT.bold, color: C.brand, fontSize: 12 },
  sentPriorityRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7, marginVertical: 8 },
  sentPriorityChip: { minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingHorizontal: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  sentPriorityActive: { backgroundColor: C.brand, borderColor: C.brand },
  sentPriorityTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  sentCardCheck: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, minHeight: 40 },

  sectionCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#dceae2',borderRadius:21,padding:16,marginBottom:13,elevation:1},
  sectionHead:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginBottom:12},
  sectionTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right',flex:1},
  sentHero:{flexDirection:'row-reverse',alignItems:'center',gap:11,backgroundColor:'#e4f4ec',borderRadius:18,borderWidth:1,borderColor:'#c8e6d6',padding:15,marginBottom:13},
  sentHeroText:{flex:1,alignItems:'flex-end'},
  sentCount:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:3},
  cardTitleRow:{flexDirection:'row-reverse',alignItems:'center',gap:8,flex:1,minWidth:0},
  urgentStatus:{color:'#b53434',backgroundColor:'#fceaea'},
  dateRow:{flexDirection:'row-reverse',alignItems:'center',gap:5,marginTop:9},
  cardFooter:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'flex-start',gap:5,borderTopWidth:1,borderTopColor:'#edf0f2',marginTop:12,paddingTop:10},
  page: { flex: 1, backgroundColor: '#f3f8f6' }, content: { padding: 16, paddingBottom: 28 },
  tabs: { flexDirection: 'row-reverse', padding: 8, gap: 8, backgroundColor: '#e6f3ed', borderBottomWidth: 1, borderBottomColor: '#cfe7d9' },
  tab: { flex: 1, minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection:'row-reverse',gap:7,paddingHorizontal:5, backgroundColor: '#fff' }, tabOn: { backgroundColor: '#075f51' },
  tabTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12.5, textAlign:'center',flexShrink:1 }, tabTxtOn: { color: '#fff' }, white: { color: '#fff' },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 8, marginTop: 8, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: '#cbded3', borderWidth: 1, borderRadius: 16, padding: 15, textAlign: 'right', fontFamily: FONT.regular, color: C.ink }, bodyInput: { minHeight: 110, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row-reverse', gap: 8 }, attach: { flex: 1, backgroundColor: '#eaf5ef', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent:'center', flexDirection:'row-reverse',gap:7, marginTop: 6 }, attachTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  attItem: { alignItems: 'center', backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 7, flexDirection: 'row-reverse' }, thumb: { width: 44, height: 44, borderRadius: 8, marginEnd: 8 }, attName: { fontFamily: FONT.regular, color: C.ink, fontSize: 12, flex: 1, textAlign: 'right' }, attDel: { fontFamily: FONT.bold, color: C.danger, fontSize: 12, paddingHorizontal: 8 },
  priorityWrap: { flexDirection: 'row-reverse', gap: 8, marginBottom: 8 }, priorityChip: { flex: 1, backgroundColor: '#eef1f7', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.line }, priorityOn: { backgroundColor: C.brand, borderColor: C.brand }, priorityTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  mgrWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 6 }, mgrChip: { backgroundColor: '#eef2f8', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 }, mgrChipOn: { backgroundColor: C.brand, borderColor: C.brand }, mgrChipTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 }, stepTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', marginTop: 14, marginBottom: 3 },
  ccToggle: { backgroundColor: '#eaf5ef', borderWidth: 1, borderColor: '#b6d9cd', borderRadius: 12, minHeight:48,paddingVertical: 11, flexDirection:'row-reverse',justifyContent:'center',alignItems: 'center',gap:8,marginTop: 14 }, ccToggleTxt: { fontFamily: FONT.bold, color: C.brand, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 16, padding: 16, minHeight:54, alignItems: 'center', justifyContent:'center',flexDirection:'row-reverse',gap:10,marginTop: 5 }, btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 }, empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 16 },
  sortBar: { flexDirection: 'row-reverse', flexWrap:'wrap',gap: 7, marginTop: 9, marginBottom: 4 }, sortBtn: { flexGrow: 1,flexBasis:'27%', backgroundColor: '#eef1f7', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.line }, sortBtnOn: { backgroundColor: C.brand, borderColor: C.brand }, sortTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 11.5 }, pdfBtn: { flexGrow: 1,flexBasis:'28%', backgroundColor: '#5b3bb8', borderRadius: 10, paddingVertical: 10, alignItems: 'center',justifyContent:'center',flexDirection:'row-reverse',gap:5,paddingHorizontal:6 }, pdfTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 11.5 },
  card: { backgroundColor: '#fff', borderColor: '#dceae2', borderWidth: 1, borderRadius: 20, padding: 17, marginTop: 11, shadowColor: '#17352f', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }, cardHead: { flexDirection: 'row-reverse', alignItems:'flex-start',flexWrap:'wrap',gap:8,justifyContent: 'space-between' }, cardTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', flex: 1 }, status: { fontFamily: FONT.bold, color: C.brand, fontSize: 11,backgroundColor:'#eaf6ef',paddingVertical:5,paddingHorizontal:8,borderRadius:8,overflow:'hidden' }, preview: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5, textAlign: 'right', marginTop: 8, lineHeight: 20 }, date: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 5 }, confBadge: { fontFamily: FONT.bold, color: '#9a5b00', fontSize: 11.5, textAlign: 'right', marginTop: 6 }, tapHint: { fontFamily: FONT.regular, color: C.brand, fontSize: 11.5, textAlign: 'right', marginTop: 6 },
});
