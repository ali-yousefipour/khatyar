import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const normalizeMobile = (value) => {
  const n = String(value || '').replace(/\s|-/g, '');
  if (/^09\d{9}$/.test(n)) return n;
  if (/^989\d{9}$/.test(n)) return `0${n.slice(2)}`;
  if (/^9\d{9}$/.test(n)) return `0${n}`;
  return '';
};

const uniqueMobiles = (items) => Array.from(new Set((items || []).map(normalizeMobile).filter(Boolean)));

export default function SmsScreen() {
  const [tpls, setTpls] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [lineMobiles, setLineMobiles] = useState([]);
  const [manual, setManual] = useState([]);
  const [mInput, setMInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [tplOnly, setTplOnly] = useState(false);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    Promise.all([
      request('/sms/config').catch(() => ({ templates: [], templates_only: false })),
      request('/my/lines').catch(() => []),
      request('/my/sms-quota-v2').catch(() => null),
    ]).then(([cfg, l, q]) => {
      setTpls(Array.isArray(cfg?.templates) ? cfg.templates : []);
      setTplOnly(!!cfg?.templates_only);
      setLines(Array.isArray(l) ? l : []);
      setQuota(q || null);
    }).finally(() => setLoading(false));
  }, []);

  const toggleLine = async (id) => {
    const key = String(id);
    const next = selectedLines.includes(key)
      ? selectedLines.filter((x) => x !== key)
      : [...selectedLines, key];
    setSelectedLines(next);
    setLoadingRecipients(true);
    try {
      if (!next.length) {
        setLineMobiles([]);
        return;
      }
      const results = await Promise.all(next.map((lineId) =>
        request('/sms/drivers-by-line?line_id=' + encodeURIComponent(lineId)).catch(() => [])
      ));
      const mobiles = uniqueMobiles(results.flat().map((d) => d?.mobile || d?.phone || d?.mobile_number));
      setLineMobiles(mobiles);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const addManual = () => {
    const mobile = normalizeMobile(mInput);
    if (!mobile) {
      Alert.alert('توجه', 'شماره موبایل را به صورت ۱۱ رقمی و با ۰ وارد کنید.');
      return;
    }
    setManual((prev) => uniqueMobiles([...prev, mobile]));
    setMInput('');
  };

  const removeManual = (mobile) => setManual((prev) => prev.filter((x) => x !== mobile));

  const recipients = useMemo(() => uniqueMobiles([...lineMobiles, ...manual]), [lineMobiles, manual]);
  const totalCount = recipients.length;
  const panelCount = quota?.panel_credit?.sendable_count ?? quota?.panel_credit?.approx_count;
  const unitCost = quota?.panel_credit?.unit_cost;

  const send = () => {
    if (!msg.trim()) {
      Alert.alert('خطا', tplOnly ? 'یک قالب پیامک را انتخاب کنید.' : 'متن پیامک را وارد یا یک قالب انتخاب کنید.');
      return;
    }
    if (!totalCount) {
      Alert.alert('خطا', 'حداقل یک خط انتخاب یا یک شماره موبایل وارد کنید.');
      return;
    }
    if (panelCount != null && totalCount > Number(panelCount)) {
      Alert.alert('اعتبار ناکافی', `تعداد گیرندگان (${faNum(totalCount)}) از ظرفیت فعلی پنل (${faNum(panelCount)} پیامک) بیشتر است.`);
      return;
    }
    Alert.alert('تأیید ارسال', `ارسال پیامک به ${faNum(totalCount)} شماره؟`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'ارسال', onPress: async () => {
        setBusy(true);
        try {
          const r = await request('/sms/send', {
            method: 'POST',
            body: { driver_ids: [], mobiles: recipients, message: msg.trim() },
          });
          Alert.alert('انجام شد', `پیامک به ${faNum(r?.sent || 0)} شماره ارسال شد.`);
          setSelectedLines([]);
          setLineMobiles([]);
          setManual([]);
          const fresh = await request('/my/sms-quota-v2').catch(() => null);
          if (fresh) setQuota(fresh);
        } catch (e) {
          Alert.alert('خطا', e?.message || 'ارسال پیامک ناموفق بود.');
        } finally {
          setBusy(false);
        }
      } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} persistentScrollbar>
      {quota && (
        <View style={s.creditBox}>
          <Text style={s.creditTitle}>اعتبار پنل پیامک</Text>
          <Text style={s.creditText}>
            {faNum(Number(quota?.panel_credit?.amount || 0).toLocaleString())} ریال
          </Text>
          {panelCount != null && (
            <Text style={s.capacityText}>
              ظرفیت قابل ارسال: {faNum(panelCount)} پیامک{unitCost ? ` — هر پیامک ${faNum(unitCost.toLocaleString())} ریال` : ''}
            </Text>
          )}
          {quota?.effective_limit > 0 ? (
            <Text style={s.limitText}>باقیمانده سهمیه امروز: {faNum(quota.remaining_today)}</Text>
          ) : null}
        </View>
      )}

      <Text style={s.label}>قالب پیامک</Text>
      {tpls.length ? (
        Object.entries(tpls.reduce((acc, t) => {
          const cat = t.category || 'عمومی';
          (acc[cat] ||= []).push(t);
          return acc;
        }, {})).map(([cat, items]) => (
          <View key={cat} style={s.templateGroup}>
            <Text style={s.category}>{cat}</Text>
            <View style={s.templateRow}>
              {items.map((t, i) => (
                <TouchableOpacity key={t.id || i} style={s.template} onPress={() => setMsg(t.body || '')}>
                  <Text style={s.templateText}>{t.title || `قالب ${i + 1}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      ) : <Text style={s.muted}>قالبی تعریف نشده است.</Text>}

      <Text style={s.label}>متن پیامک{tplOnly ? ' — فقط قالب‌ها' : ''}</Text>
      <TextInput
        style={[s.input, s.messageInput, tplOnly && s.disabledInput]}
        multiline
        value={msg}
        onChangeText={tplOnly ? undefined : setMsg}
        editable={!tplOnly}
        placeholder={tplOnly ? 'یک قالب را انتخاب کنید' : 'متن دلخواه پیامک…'}
        placeholderTextColor={C.muted}
      />
      <Text style={s.muted}>هر پیامک فارسی حدود ۷۰ کاراکتر است.</Text>

      <View style={s.sectionHeader}>
        <Text style={s.label}>گیرندگان: {faNum(totalCount)} شماره</Text>
        <TouchableOpacity onPress={() => { setSelectedLines([]); setLineMobiles([]); setManual([]); }}>
          <Text style={s.clear}>پاک‌کردن</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>انتخاب مخاطبین فقط از طریق خط‌ها:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.linesScroll} contentContainerStyle={s.linesRow}>
        {lines.map((line) => {
          const id = String(line.id);
          const on = selectedLines.includes(id);
          return (
            <TouchableOpacity key={id} style={[s.lineChip, on && s.lineChipOn]} onPress={() => toggleLine(line.id)}>
              <Text style={[s.lineText, on && s.lineTextOn]}>خط {faNum(line.code)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loadingRecipients ? (
        <View style={s.loadingRow}><ActivityIndicator color={C.brand} /><Text style={s.muted}>در حال دریافت مخاطبین خطوط…</Text></View>
      ) : selectedLines.length ? (
        <Text style={s.summary}>از {faNum(selectedLines.length)} خط، {faNum(lineMobiles.length)} شماره یکتا انتخاب شده است.</Text>
      ) : (
        <Text style={s.muted}>هیچ خطی انتخاب نشده است.</Text>
      )}

      <Text style={s.label}>افزودن شماره موبایل</Text>
      <View style={s.manualRow}>
        <TextInput style={[s.input, s.manualInput]} value={mInput} onChangeText={setMInput} keyboardType="number-pad" placeholder="09xxxxxxxxx" placeholderTextColor={C.muted} />
        <TouchableOpacity style={s.addButton} onPress={addManual}><Text style={s.addText}>افزودن</Text></TouchableOpacity>
      </View>
      {manual.length > 0 && (
        <View style={s.manualWrap}>
          {manual.map((mobile) => (
            <TouchableOpacity key={mobile} style={s.manualChip} onPress={() => removeManual(mobile)}>
              <Text style={s.manualText}>{mobile} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={[s.sendButton, busy && s.disabledButton]} disabled={busy} onPress={send}>
        <Text style={s.sendText}>{busy ? 'در حال ارسال…' : `ارسال به ${faNum(totalCount)} شماره`}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  content: { padding: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  creditBox: { backgroundColor: '#eef4ff', borderRadius: 12, padding: 12, marginBottom: 8 },
  creditTitle: { fontFamily: FONT.bold, fontSize: 13, color: C.ink, textAlign: 'right' },
  creditText: { fontFamily: FONT.bold, fontSize: 18, color: C.brand, textAlign: 'right', marginTop: 2 },
  capacityText: { fontFamily: FONT.regular, fontSize: 12, color: C.ink, textAlign: 'right', marginTop: 4 },
  limitText: { fontFamily: FONT.regular, fontSize: 11, color: '#b66a00', textAlign: 'right', marginTop: 3 },
  label: { fontFamily: FONT.bold, fontSize: 14, color: C.ink, textAlign: 'right', marginTop: 14, marginBottom: 6 },
  templateGroup: { marginBottom: 6 },
  category: { fontFamily: FONT.bold, color: C.muted, fontSize: 11, textAlign: 'right', marginBottom: 4 },
  templateRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  template: { borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  templateText: { fontFamily: FONT.regular, color: C.ink, fontSize: 12 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 9, backgroundColor: '#fff', color: C.ink, fontFamily: FONT.regular, textAlign: 'right', paddingHorizontal: 10, paddingVertical: 9 },
  messageInput: { minHeight: 92, textAlignVertical: 'top' },
  disabledInput: { backgroundColor: '#f0f0f2', color: C.muted },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 5 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  clear: { fontFamily: FONT.bold, color: C.danger || '#b3261e', fontSize: 12 },
  hint: { fontFamily: FONT.regular, color: C.ink, fontSize: 12, textAlign: 'right', marginBottom: 7 },
  linesScroll: { marginBottom: 3 },
  linesRow: { flexDirection: 'row-reverse', gap: 7 },
  lineChip: { borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  lineChipOn: { backgroundColor: C.brand, borderColor: C.brand },
  lineText: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  lineTextOn: { color: '#fff' },
  loadingRow: { alignItems: 'center', paddingVertical: 12 },
  summary: { fontFamily: FONT.regular, color: C.ink, fontSize: 11, textAlign: 'right', marginTop: 5 },
  manualRow: { flexDirection: 'row-reverse', gap: 7 },
  manualInput: { flex: 1 },
  addButton: { backgroundColor: C.brand, borderRadius: 9, justifyContent: 'center', paddingHorizontal: 14 },
  addText: { fontFamily: FONT.bold, color: '#fff', fontSize: 12 },
  manualWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  manualChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 15, paddingHorizontal: 9, paddingVertical: 6 },
  manualText: { fontFamily: FONT.regular, color: C.ink, fontSize: 11 },
  sendButton: { backgroundColor: C.brand, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  disabledButton: { opacity: 0.6 },
  sendText: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
});
