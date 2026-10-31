import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, FlatList, RefreshControl, I18nManager } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum, enNum } from '../num';
import ModalKeyboardView from '../components/ModalKeyboardView';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const TABS = [
  ['balance', 'موجودی من'],
  ['deliver', 'تحویل به دیگران'],
  ['pending', 'در انتظار تأیید من'],
  ['history', 'تاریخچه'],
];

export default function InventoryScreen() {
  const [tab, setTab] = useState('balance');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  // فرم تحویل
  const [itemTypeId, setItemTypeId] = useState(null);
  const [roleSel, setRoleSel] = useState('');
  const [picked, setPicked] = useState(null);
  const [nameQ, setNameQ] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [allowResend, setAllowResend] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleQ, setRoleQ] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [itemQ, setItemQ] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [b, it, rc, pd, hs] = await Promise.all([
        request('/inventory/balance', { noStore: true }),
        request('/inventory/item-types', { noStore: true }),
        request('/inventory/recipients', { noStore: true }),
        request('/inventory/pending', { noStore: true }),
        request('/inventory/history', { noStore: true }),
      ]);
      if (![b?.items, it?.items, rc?.users, pd?.items, hs?.items].every(Array.isArray)) throw new Error('اطلاعات انبار ناقص دریافت شد.');
      setBalance(b.items);
      setItemTypes(it.items);
      setRoles((rc.roles || []).map((r) => r.title));
      setUsers(rc.users);
      setPending(pd.items);
      setHistory(hs.items);
      setLoadError('');
    } catch (e) { setLoadError(e?.message || 'دریافت اطلاعات انبار ناموفق بود.'); }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll().catch(() => {});
    setRefreshing(false);
  };

  const doDeliver = async () => {
    if (!itemTypeId) { Alert.alert('توجه', 'نوع قلم را انتخاب کنید.'); return; }
    if (!picked) { Alert.alert('توجه', 'ابتدا سمت و سپس شخص تحویل‌گیرنده را انتخاب کنید.'); return; }
    const normalized = enNum(qty).trim();
    const n = Number(normalized);
    if (!/^-?[1-9]\d*$/.test(normalized) || !Number.isSafeInteger(n)) { Alert.alert('توجه', 'تعداد باید عدد صحیح غیرصفر باشد (مثبت یا منفی).'); return; }
    if (loadError) { Alert.alert('توجه', 'اطلاعات انبار کامل دریافت نشده است. دوباره تلاش کنید.'); return; }
    setBusy(true);
    try {
      await request('/inventory/deliver', { method: 'POST', queueIfOffline: false, body: { item_type_id: itemTypeId, to_user_id: picked.id, quantity: n, note, transferable: allowResend } });
      Alert.alert('انجام شد', 'تحویل ثبت شد؛ پس از تأیید گیرنده، به موجودی او افزوده می‌شود.');
      setQty(''); setNote(''); setPicked(null); setRoleSel(''); setAllowResend(true);
      await loadAll();
      setTab('history');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ثبت تحویل ناموفق بود.');
    } finally { setBusy(false); }
  };

  const doConfirm = async (id) => {
    setBusy(true);
    try { await request(`/inventory/confirm/${id}`, { method: 'POST', queueIfOffline: false, body: {} }); await loadAll(); }
    catch (e) { Alert.alert('خطا', e.message || 'تأیید ناموفق بود.'); }
    finally { setBusy(false); }
  };
  const doReject = (id) => {
    Alert.alert('رد دریافت', 'آیا از رد این تحویل مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'رد کن', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { await request(`/inventory/reject/${id}`, { method: 'POST', queueIfOffline: false, body: {} }); await loadAll(); }
        catch (e) { Alert.alert('خطا', e.message || 'رد ناموفق بود.'); }
        finally { setBusy(false); }
      } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator /></View>;
  const chosenItem = itemTypes.find(it => String(it.id) === String(itemTypeId));
  const chosenBalance = balance.find(it => String(it.item_type_id) === String(itemTypeId));
  const filteredHistory = history.filter(h => (historyFilter === 'all' || h.status === historyFilter) && (!historyQuery.trim() || [h.item_name,h.to_name,h.from_name].some(v => String(v || '').includes(historyQuery.trim()))));

  return (
    <View style={s.page}>
      <View style={s.tabbar}>
        {TABS.map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.tabbtn, tab === k && s.tabbtnOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabtxt, tab === k && s.tabtxtOn]}>{l}{k === 'pending' && pending.length > 0 ? ` (${faNum(pending.length)})` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!loadError && <View style={s.errorBox}><Text style={s.errorText}>{loadError}</Text><TouchableOpacity accessibilityRole="button" onPress={onRefresh} style={s.retry}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}

      <ScrollView persistentScrollbar={true} style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={s.hero}><View style={s.heroHeading}><MaterialCommunityIcons name="package-variant-closed" color="#fff" size={25}/><Text style={s.heroTitle}>{TABS.find(([k])=>k===tab)?.[1]}</Text></View><Text style={s.heroCaption}>{tab==='balance'?'موجودی اقلام و میزان قابل انتقال شما':tab==='deliver'?'ثبت تحویل جدید با تأیید نهایی گیرنده':tab==='pending'?'تحویل‌های منتظر بررسی و تصمیم شما':'سوابق تحویل، دریافت و وضعیت تأیید اقلام'}</Text></View>
        {tab === 'balance' && (
          <View>
            {balance.length === 0 ? <Text style={s.empty}>هنوز قلمی به شما تعلق نگرفته است.</Text> :
              balance.map((it) => (
                <View key={it.item_type_id} style={s.balRow}>
                  <View style={s.balHeading}><View style={s.itemIcon}><MaterialCommunityIcons name="package-variant" size={21} color={C.brand}/></View><Text style={[s.balName,{flexShrink:1}]}>{it.name}</Text></View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.balNum, it.balance < 0 && { color: C.danger }]}>{faNum(it.balance)}{it.unit ? ' ' + it.unit : ''}</Text>
                    {it.transferable_balance < it.balance && (
                      <Text style={s.balSub}>({faNum(it.transferable_balance)} {it.unit || ''} قابل‌انتقال به دیگران)</Text>
                    )}
                  </View>
                </View>
              ))}
          </View>
        )}

        {tab === 'deliver' && (
          <View>
            <View style={s.formCard}>
            <Text style={s.label}>۱. نوع قلم</Text>
            <TouchableOpacity accessibilityRole="button" style={s.select} onPress={()=>setItemOpen(true)}>
              <Text style={[s.selectTxt,!chosenItem&&{color:C.muted}]}>{chosenItem?.name || (itemTypes.length?'انتخاب یا جستجوی قلم':'هنوز نوع قلمی تعریف نشده است')}</Text><MaterialCommunityIcons name="chevron-down" size={22} color={C.muted}/>
            </TouchableOpacity>
            <Text style={s.label}>۲. سمت تحویل‌گیرنده</Text>
            <TouchableOpacity accessibilityRole="button" style={s.select} onPress={()=>setRoleOpen(true)}>
              <Text style={[s.selectTxt,!roleSel&&{color:C.muted}]}>{roleSel || 'انتخاب یا جستجوی سمت'}</Text><MaterialCommunityIcons name="chevron-down" size={22} color={C.muted}/>
            </TouchableOpacity>
            <Text style={s.label}>۳. شخص تحویل‌گیرنده</Text>
            <TouchableOpacity style={s.select} onPress={() => { if (!roleSel) { Alert.alert('توجه', 'ابتدا سمت تحویل‌گیرنده را انتخاب کنید.'); return; } setDropOpen(true); }}>
              <Text style={[s.selectTxt, !picked && { color: C.muted }]}>{picked ? `${picked.name}` : (roleSel ? 'برای انتخاب/جستجو ضربه بزنید' : 'ابتدا سمت را انتخاب کنید')}</Text>
              <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted}/>
            </TouchableOpacity>

            <Text style={s.label}>۴. تعداد</Text>
            <Text style={s.hint}>عدد مثبت برای تحویل و عدد منفی برای اصلاح یا بازپس‌گیری است.</Text>
            <TextInput style={s.input} value={qty} onChangeText={(t) => setQty(enNum(t).replace(/[^0-9-]/g, ''))} placeholder="مثلاً ۲ یا ۲-" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" textAlign="right" />
            {itemTypeId && (() => { const b = chosenBalance; return b ? (
              <Text style={s.hint}>موجودی قابل‌انتقال شما از این قلم: {faNum(b.transferable_balance)}{b.unit ? ' ' + b.unit : ''}</Text>
            ) : null; })()}

            <Text style={s.label}>توضیح (اختیاری)</Text>
            <TextInput style={[s.input,s.noteInput]} multiline textAlignVertical="top" value={note} onChangeText={setNote} placeholder="توضیح کوتاه" placeholderTextColor={C.muted} textAlign="right" />

            <TouchableOpacity style={s.checkRow} onPress={() => setAllowResend(!allowResend)}>
              <View style={[s.checkbox, allowResend && s.checkboxOn]}>{allowResend && <Text style={s.checkboxTick}>✓</Text>}</View>
              <Text style={s.checkLabel}>تحویل‌گیرنده اجازه داشته باشد این قلم را به شخص دیگری هم منتقل کند</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.mainBtn, (busy || !!loadError) && { opacity: 0.6 }]} disabled={busy || !!loadError} onPress={doDeliver}>
              <Text style={s.mainBtnTxt}>{busy ? 'در حال ارسال…' : 'تحویل'}</Text>
            </TouchableOpacity>
            <View style={s.notice}><MaterialCommunityIcons name="information-outline" size={19} color={C.brand}/><Text style={[s.hint,{flex:1,marginTop:0}]}>این انتقال پس از تأیید گیرنده نهایی می‌شود و تا آن زمان از موجودی شما کسر نهایی نخواهد شد.</Text></View>
            </View>
          </View>
        )}

        {tab === 'pending' && (
          <View>
            <Text style={s.sectionSubtitle}>درخواست‌های دریافت اقلام را بررسی کنید.</Text>
            {pending.length === 0 ? <View style={s.emptyCard}><MaterialCommunityIcons name="check-circle-outline" size={34} color={C.brand}/><Text style={s.empty}>موردی برای تأیید ندارید.</Text></View> :
              pending.map((p) => (
                <View key={p.id} style={s.pendCard}>
                  <View style={s.pendHeader}><Text style={s.pendTitle}>{p.item_name} — {faNum(p.quantity)}{p.unit ? ' ' + p.unit : ''}</Text><Text style={s.pendingBadge}>در انتظار تأیید</Text></View>
                  <Text style={s.pendSub}>از: {p.from_name}</Text>
                  {!!p.created_at_fa && <Text style={s.pendSub}>{faNum(p.created_at_fa)}</Text>}
                  {!!p.note && <Text style={s.pendSub}>توضیح: {p.note}</Text>}
                  {!p.transferable && <Text style={s.noResendBadge}>⚠ قابل انتقال به شخص دیگر نیست</Text>}
                  <View style={s.pendActions}>
                    <TouchableOpacity style={s.confirmBtn} disabled={busy || !!loadError} onPress={() => doConfirm(p.id)}><Text style={s.confirmBtnTxt}>✓ تأیید دریافت</Text></TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} disabled={busy || !!loadError} onPress={() => doReject(p.id)}><Text style={s.rejectBtnTxt}>رد</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}

        {tab === 'history' && (
          <View>
            <TextInput style={[s.input,{marginBottom:10}]} value={historyQuery} onChangeText={setHistoryQuery} placeholder="جستجوی قلم یا نام شخص…" placeholderTextColor={C.muted}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
              {[['all','همه'],['pending','در انتظار'],['confirmed','تأییدشده'],['rejected','ردشده']].map(([key,label])=><TouchableOpacity key={key} onPress={()=>setHistoryFilter(key)} style={[s.filterChip,historyFilter===key&&s.filterActive]}><Text style={[s.filterText,historyFilter===key&&s.filterTextActive]}>{label}</Text></TouchableOpacity>)}
            </ScrollView>
            {filteredHistory.length===0?<View style={s.emptyCard}><MaterialCommunityIcons name="archive-search-outline" size={34} color={C.muted}/><Text style={s.empty}>سابقه‌ای با این فیلتر یافت نشد.</Text></View>:filteredHistory.map((h,i)=>{
              const key=String(h.id??i),open=expandedHistory===key;
              return <View key={key} style={s.histCard}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}} style={s.histRow} onPress={()=>setExpandedHistory(open?null:key)}>
                  <View style={{flex:1}}><Text style={s.histName}>{h.item_name} — {faNum(h.quantity)}{h.unit?' '+h.unit:''}</Text><Text style={s.histSub}>{h.direction==='ارسالی'?`به: ${h.to_name||'—'}`:`از: ${h.from_name||'—'}`}</Text></View>
                  <View style={{alignItems:'flex-end',gap:5}}><Text style={[s.histStatus,h.status==='confirmed'&&{color:C.ok},h.status==='pending'&&{color:C.orange},h.status==='rejected'&&{color:C.danger}]}>{h.status==='confirmed'?'تأییدشده':h.status==='pending'?'در انتظار':'ردشده'}</Text><MaterialCommunityIcons name={open?'chevron-up':'chevron-down'} size={20} color={C.muted}/></View>
                </TouchableOpacity>
                {open&&<View style={s.histDetails}>{!!h.confirmed_at_fa&&<Text style={s.histSub}>تاریخ تأیید: {faNum(h.confirmed_at_fa)}</Text>}{!!h.note&&<Text style={s.histSub}>توضیحات: {h.note}</Text>}{!h.transferable&&<Text style={s.noResendBadge}>قابل انتقال به شخص دیگر نیست</Text>}</View>}
              </View>;
            })}
          </View>
        )}

      </ScrollView>

      <Modal visible={itemOpen} animationType="slide" transparent onRequestClose={()=>setItemOpen(false)}>
        <ModalKeyboardView style={s.modalWrap}><View style={s.modalCard}><Text style={s.modalTitle}>انتخاب نوع قلم</Text>
          <TextInput style={s.input} value={itemQ} onChangeText={setItemQ} placeholder="جستجوی نام قلم" placeholderTextColor={C.muted} autoFocus/>
          <FlatList data={itemTypes.filter(it=>String(it.name||'').includes(itemQ.trim()))} keyExtractor={it=>String(it.id)} style={{maxHeight:330,marginTop:8}} ListEmptyComponent={<Text style={s.empty}>قلمی یافت نشد.</Text>} renderItem={({item})=><TouchableOpacity style={s.optRow} onPress={()=>{setItemTypeId(item.id);setItemOpen(false);setItemQ('');}}><Text style={s.optName}>{item.name}</Text></TouchableOpacity>}/>
          <TouchableOpacity style={s.modalClose} onPress={()=>setItemOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
        </View></ModalKeyboardView>
      </Modal>
      <Modal visible={roleOpen} animationType="slide" transparent onRequestClose={()=>setRoleOpen(false)}>
        <ModalKeyboardView style={s.modalWrap}><View style={s.modalCard}><Text style={s.modalTitle}>انتخاب سمت تحویل‌گیرنده</Text>
          <TextInput style={s.input} value={roleQ} onChangeText={setRoleQ} placeholder="جستجوی سمت" placeholderTextColor={C.muted} autoFocus/>
          <FlatList data={roles.filter(r=>String(r).includes(roleQ.trim()))} keyExtractor={r=>String(r)} style={{maxHeight:330,marginTop:8}} ListEmptyComponent={<Text style={s.empty}>سمتی یافت نشد.</Text>} renderItem={({item})=><TouchableOpacity style={s.optRow} onPress={()=>{setRoleSel(item);setPicked(null);setNameQ('');setRoleOpen(false);setRoleQ('');}}><Text style={s.optName}>{item}</Text></TouchableOpacity>}/>
          <TouchableOpacity style={s.modalClose} onPress={()=>setRoleOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
        </View></ModalKeyboardView>
      </Modal>
      <Modal visible={dropOpen} animationType="slide" transparent onRequestClose={() => setDropOpen(false)}>
        <ModalKeyboardView style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب شخص ({roleSel})</Text>
            <TextInput style={s.input} value={nameQ} onChangeText={setNameQ} placeholder="جستجوی نام" placeholderTextColor={C.muted} autoFocus />
            <FlatList
              data={users.filter((u) => u.role_title === roleSel && (!nameQ || (u.name || '').indexOf(nameQ) >= 0))}
              keyExtractor={(it) => String(it.id)}
              style={{ maxHeight: 320, marginTop: 8 }}
              ListEmptyComponent={<Text style={s.empty}>موردی یافت نشد.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.optRow} onPress={() => { setPicked(item); setDropOpen(false); }}>
                  <Text style={s.optName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.modalClose} onPress={() => setDropOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </ModalKeyboardView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  errorBox: { backgroundColor: '#fff1f1', borderColor: '#f3b8c0', borderWidth: 1, borderRadius: 14, padding: 14, margin: 12 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', textAlign: 'right', lineHeight: 22 },
  retry: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  retryText: { fontFamily: FONT.bold, color: C.brand },
  page: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  body: { flex: 1 },
  bodyContent:{padding:14,paddingBottom:50},
  hero:{backgroundColor:C.brand,borderRadius:18,padding:18,marginBottom:14},
  heroHeading:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  heroTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:17,textAlign:'right'},
  heroCaption:{fontFamily:FONT.regular,color:'#e5f4ef',fontSize:12,marginTop:8,textAlign:'right'},
  formCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:18,padding:15},
  noteInput:{minHeight:86},
  notice:{flexDirection:'row-reverse',alignItems:'flex-start',gap:8,backgroundColor:'#e8f4ef',padding:12,borderRadius:12,marginTop:14},
  balHeading:{flexDirection:'row-reverse',alignItems:'center',gap:9,flex:1},
  itemIcon:{width:39,height:39,borderRadius:11,backgroundColor:'#e8f4ef',alignItems:'center',justifyContent:'center'},
  sectionSubtitle:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',marginBottom:13},
  emptyCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:25,alignItems:'center'},
  pendHeader:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',gap:8},
  pendingBadge:{fontFamily:FONT.bold,color:C.orange,fontSize:11,backgroundColor:'#fff5e8',borderRadius:8,paddingHorizontal:8,paddingVertical:5},
  filterRow:{flexDirection:'row-reverse',gap:8,paddingBottom:13},
  filterChip:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:20,paddingHorizontal:14,paddingVertical:9},
  filterActive:{backgroundColor:C.brand,borderColor:C.brand},
  filterText:{fontFamily:FONT.bold,fontSize:12,color:C.slate},
  filterTextActive:{color:'#fff'},
  histCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:15,marginBottom:9,overflow:'hidden'},
  histDetails:{borderTopWidth:1,borderColor:C.line,padding:12},
  tabbar: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, padding: 10, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.line },
  tabbtn: { flexGrow:1,alignItems:'center',paddingHorizontal:11,paddingVertical:11,borderRadius:12,backgroundColor:C.paper,borderWidth:1,borderColor:C.line },
  tabbtnOn: { backgroundColor: C.brand, borderColor: C.brand },
  tabtxt: { fontFamily: FONT.regular, fontSize: 12.5, color: C.slate, textAlign: 'right', writingDirection: 'rtl' },
  tabtxtOn: { color: '#fff', fontFamily: FONT.bold },
  label: { fontFamily: FONT.bold, fontSize: 13.5, color: C.ink, marginTop: 14, marginBottom: 6, textAlign: 'right', writingDirection: 'rtl' },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontFamily: FONT.regular, fontSize: 12.5, color: C.slate, textAlign: 'right', writingDirection: 'rtl' },
  chipTxtOn: { color: '#fff' },
  select: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  selectTxt: { fontFamily: FONT.regular, fontSize: 14, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONT.regular, fontSize: 14, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  mainBtn: { backgroundColor: C.brand, borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: 18 },
  mainBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  hint: { fontFamily: FONT.regular, fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  empty: { fontFamily: FONT.regular, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 20, writingDirection: 'rtl' },
  balRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10 },
  balName: { fontFamily: FONT.bold, fontSize: 14.5, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  balNum: { fontFamily: FONT.bold, fontSize: 16, color: C.brand, textAlign: 'left', writingDirection: 'rtl' },
  balSub: { fontFamily: FONT.regular, fontSize: 11, color: C.muted, marginTop: 2, textAlign: 'left', writingDirection: 'rtl' },
  pendCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  pendTitle: { fontFamily: FONT.bold, fontSize: 14.5, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  pendSub: { fontFamily: FONT.regular, fontSize: 12.5, color: C.muted, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  pendActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  confirmBtn: { backgroundColor: C.ok, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  confirmBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl' },
  rejectBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.danger, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  rejectBtnTxt: { color: C.danger, fontFamily: FONT.bold, fontSize: 12.5, textAlign: 'right', writingDirection: 'rtl' },
  noResendBadge: { fontFamily: FONT.regular, fontSize: 11.5, color: C.orange, marginTop: 6, textAlign: 'right', writingDirection: 'rtl' },
  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.brand, borderColor: C.brand },
  checkboxTick: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  checkLabel: { flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  histRow: { flexDirection: 'row-reverse', alignItems: 'center', gap:8,paddingHorizontal: 13, paddingVertical: 14 },
  histName: { fontFamily: FONT.bold, fontSize: 13.5, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  histSub: { fontFamily: FONT.regular, fontSize: 12, color: C.muted, marginTop: 2, textAlign: 'right', writingDirection: 'rtl' },
  histStatus: { fontFamily: FONT.bold, fontSize: 12, textAlign: 'left', writingDirection: 'rtl' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '75%' },
  modalTitle: { fontFamily: FONT.bold, fontSize: 15, color: C.ink, marginBottom: 8, textAlign: 'right', writingDirection: 'rtl' },
  modalClose: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  modalCloseTxt: { fontFamily: FONT.bold, color: C.muted, textAlign: 'right', writingDirection: 'rtl' },
  optRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  optName: { fontFamily: FONT.regular, fontSize: 14, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
});
