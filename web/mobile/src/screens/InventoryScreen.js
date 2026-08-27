import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, FlatList, RefreshControl, I18nManager } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum, enNum } from '../num';
import ModalKeyboardView from '../components/ModalKeyboardView';
import ActivityIndicator from '../components/PulseLoadingIndicator';

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

  // فرم تحویل
  const [itemTypeId, setItemTypeId] = useState(null);
  const [roleSel, setRoleSel] = useState('');
  const [picked, setPicked] = useState(null);
  const [nameQ, setNameQ] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [allowResend, setAllowResend] = useState(true);

  const loadAll = useCallback(async () => {
    const [b, it, rc, pd, hs] = await Promise.all([
      request('/inventory/balance').catch(() => ({ items: [] })),
      request('/inventory/item-types').catch(() => ({ items: [] })),
      request('/inventory/recipients').catch(() => ({ roles: [], users: [] })),
      request('/inventory/pending').catch(() => ({ items: [] })),
      request('/inventory/history').catch(() => ({ items: [] })),
    ]);
    setBalance(b.items || []);
    setItemTypes(it.items || []);
    setRoles((rc.roles || []).map((r) => r.title));
    setUsers(rc.users || []);
    setPending(pd.items || []);
    setHistory(hs.items || []);
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
    const n = parseInt(enNum(qty), 10);
    if (!n || isNaN(n)) { Alert.alert('توجه', 'تعداد را وارد کنید (می‌تواند مثبت یا منفی باشد).'); return; }
    setBusy(true);
    try {
      await request('/inventory/deliver', { method: 'POST', body: { item_type_id: itemTypeId, to_user_id: picked.id, quantity: n, note, transferable: allowResend } });
      Alert.alert('انجام شد', 'تحویل ثبت شد؛ پس از تأیید گیرنده، به موجودی او افزوده می‌شود.');
      setQty(''); setNote(''); setPicked(null); setRoleSel(''); setAllowResend(true);
      loadAll();
      setTab('history');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ثبت تحویل ناموفق بود.');
    } finally { setBusy(false); }
  };

  const doConfirm = async (id) => {
    setBusy(true);
    try { await request(`/inventory/confirm/${id}`, { method: 'POST', body: {} }); loadAll(); }
    catch (e) { Alert.alert('خطا', e.message || 'تأیید ناموفق بود.'); }
    finally { setBusy(false); }
  };
  const doReject = (id) => {
    Alert.alert('رد دریافت', 'آیا از رد این تحویل مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'رد کن', style: 'destructive', onPress: async () => {
        setBusy(true);
        try { await request(`/inventory/reject/${id}`, { method: 'POST', body: {} }); loadAll(); }
        catch (e) { Alert.alert('خطا', e.message || 'رد ناموفق بود.'); }
        finally { setBusy(false); }
      } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator /></View>;

  return (
    <View style={s.page}>
      <View style={s.tabbar}>
        {TABS.map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.tabbtn, tab === k && s.tabbtnOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabtxt, tab === k && s.tabtxtOn]}>{l}{k === 'pending' && pending.length > 0 ? ` (${faNum(pending.length)})` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {tab === 'balance' && (
          <View>
            {balance.length === 0 ? <Text style={s.empty}>هنوز قلمی به شما تعلق نگرفته است.</Text> :
              balance.map((it) => (
                <View key={it.item_type_id} style={s.balRow}>
                  <Text style={s.balName}>{it.name}</Text>
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
            <Text style={s.label}>۱) نوع قلم</Text>
            <View style={s.chipRow}>
              {itemTypes.map((it) => (
                <TouchableOpacity key={it.id} onPress={() => setItemTypeId(it.id)} style={[s.chip, itemTypeId === it.id && s.chipOn]}>
                  <Text style={[s.chipTxt, itemTypeId === it.id && s.chipTxtOn]}>{it.name}</Text>
                </TouchableOpacity>
              ))}
              {itemTypes.length === 0 && <Text style={s.empty}>هنوز نوع قلمی توسط مدیر سامانه تعریف نشده است.</Text>}
            </View>

            <Text style={s.label}>۲) سمت تحویل‌گیرنده</Text>
            <View style={s.chipRow}>
              {roles.map((r) => (
                <TouchableOpacity key={r} onPress={() => { setRoleSel(roleSel === r ? '' : r); setPicked(null); }} style={[s.chip, roleSel === r && s.chipOn]}>
                  <Text style={[s.chipTxt, roleSel === r && s.chipTxtOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>۳) شخص تحویل‌گیرنده</Text>
            <TouchableOpacity style={s.select} onPress={() => { if (!roleSel) { Alert.alert('توجه', 'ابتدا سمت تحویل‌گیرنده را انتخاب کنید.'); return; } setDropOpen(true); }}>
              <Text style={[s.selectTxt, !picked && { color: C.muted }]}>{picked ? `${picked.name}` : (roleSel ? 'برای انتخاب/جستجو ضربه بزنید' : 'ابتدا سمت را انتخاب کنید')}</Text>
              <Text style={{ color: C.muted }}>▾</Text>
            </TouchableOpacity>

            <Text style={s.label}>۴) تعداد (مثبت = تحویل، منفی = اصلاح/بازپس‌گیری)</Text>
            <TextInput style={s.input} value={qty} onChangeText={(t) => setQty(enNum(t).replace(/[^0-9-]/g, ''))} placeholder="مثلاً ۲ یا ۲-" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" textAlign="right" />
            {itemTypeId && (() => { const b = balance.find((x) => x.item_type_id === itemTypeId); return b ? (
              <Text style={s.hint}>موجودی قابل‌انتقال شما از این قلم: {faNum(b.transferable_balance)}{b.unit ? ' ' + b.unit : ''}</Text>
            ) : null; })()}

            <Text style={s.label}>توضیح (اختیاری)</Text>
            <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="توضیح کوتاه" placeholderTextColor={C.muted} textAlign="right" />

            <TouchableOpacity style={s.checkRow} onPress={() => setAllowResend(!allowResend)}>
              <View style={[s.checkbox, allowResend && s.checkboxOn]}>{allowResend && <Text style={s.checkboxTick}>✓</Text>}</View>
              <Text style={s.checkLabel}>تحویل‌گیرنده اجازه داشته باشد این قلم را به شخص دیگری هم منتقل کند</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.mainBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={doDeliver}>
              <Text style={s.mainBtnTxt}>{busy ? 'در حال ارسال…' : 'تحویل'}</Text>
            </TouchableOpacity>
            <Text style={s.hint}>پس از ثبت، این تحویل تا زمانی‌که گیرنده آن را در برنامهٔ خودش تأیید نکند، از موجودی شما کسر نهایی نمی‌شود.</Text>
          </View>
        )}

        {tab === 'pending' && (
          <View>
            {pending.length === 0 ? <Text style={s.empty}>موردی برای تأیید ندارید.</Text> :
              pending.map((p) => (
                <View key={p.id} style={s.pendCard}>
                  <Text style={s.pendTitle}>{p.item_name} — {faNum(p.quantity)}{p.unit ? ' ' + p.unit : ''}</Text>
                  <Text style={s.pendSub}>از: {p.from_name}</Text>
                  {!!p.created_at_fa && <Text style={s.pendSub}>{faNum(p.created_at_fa)}</Text>}
                  {!!p.note && <Text style={s.pendSub}>توضیح: {p.note}</Text>}
                  {!p.transferable && <Text style={s.noResendBadge}>⚠ قابل انتقال به شخص دیگر نیست</Text>}
                  <View style={s.pendActions}>
                    <TouchableOpacity style={s.confirmBtn} onPress={() => doConfirm(p.id)}><Text style={s.confirmBtnTxt}>✓ تأیید دریافت</Text></TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => doReject(p.id)}><Text style={s.rejectBtnTxt}>رد</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}

        {tab === 'history' && (
          <View>
            {history.length === 0 ? <Text style={s.empty}>هنوز تراکنشی ثبت نشده است.</Text> :
              history.map((h) => (
                <View key={h.id} style={s.histRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histName}>{h.item_name} — {faNum(h.quantity)}{h.unit ? ' ' + h.unit : ''}</Text>
                    <Text style={s.histSub}>{h.direction === 'ارسالی' ? `به: ${h.to_name}` : `از: ${h.from_name}`}</Text>
                    {!!h.confirmed_at_fa && <Text style={s.histSub}>{faNum(h.confirmed_at_fa)}</Text>}
                    {!h.transferable && <Text style={s.noResendBadge}>⚠ قابل انتقال به شخص دیگر نیست</Text>}
                  </View>
                  <Text style={[s.histStatus, h.status === 'confirmed' && { color: C.ok }, h.status === 'pending' && { color: C.orange }, h.status === 'rejected' && { color: C.danger }]}>
                    {h.status === 'confirmed' ? 'تأییدشده' : h.status === 'pending' ? 'در انتظار' : 'رد شده'}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

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
  page: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  body: { flex: 1, padding: 14 },
  tabbar: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, padding: 10, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.line },
  tabbtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  tabbtnOn: { backgroundColor: C.ink, borderColor: C.ink },
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
  histRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
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
