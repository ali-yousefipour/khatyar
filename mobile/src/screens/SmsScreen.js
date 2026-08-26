import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

// ارسال پیامک به رانندگان خطوط با قالب‌های پیش‌فرض
export default function SmsScreen() {
  const [tpls, setTpls] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState('');
  const [sel, setSel] = useState({});
  const [manual, setManual] = useState([]);
  const [mInput, setMInput] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tplOnly, setTplOnly] = useState(false);
  const [roleGroup, setRoleGroup] = useState(''); // '' | beneficiary | helper | driver
  const [pickFromList, setPickFromList] = useState(false); // انتخاب از لیست (به‌جای کل نوع راننده)
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const [credit, setCredit] = useState(null);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    // فقط قالب‌ها، خطوط و سهمیه را لود کن — لیست رانندگان لود نمی‌شود (سرعت بیشتر)
    Promise.all([
      request('/sms/config').catch(() => ({ templates: [], templates_only: false })),
      request('/my/lines').catch(() => []),
      request('/my/sms-quota').catch(() => null),
    ]).then(([cfg, l, q]) => {
      setTpls(cfg.templates || []); setTplOnly(!!cfg.templates_only);
      setLines(l || []);
      if (q) {
        setQuota(q);
        if (q.panel_credit) setCredit({ amount: q.panel_credit.amount, approx: q.panel_credit.approx_count });
      }
    }).finally(() => setLoading(false));
  }, []);

  const loadLine = (id, role) => {
    setLineId(id);
    const rg = role !== undefined ? role : roleGroup;
    setDrivers([]); setSel({});
    if (!id) return; // بدون خط، رانندگان لود نمی‌شوند
    setLoadingDrivers(true);
    const rq = rg ? `&role=${rg}` : '';
    request('/sms/drivers-by-line?line_id=' + id + rq)
      .then((d) => { setDrivers(d || []); setSel({}); })
      .catch(() => setDrivers([]))
      .finally(() => setLoadingDrivers(false));
  };
  const pickRole = (rg) => { const next = roleGroup === rg ? '' : rg; setRoleGroup(next); if (lineId) loadLine(lineId, next); };
  const addManual = () => {
    const m = (mInput || '').replace(/\s/g, '');
    if (!/^0\d{10}$/.test(m)) { Alert.alert('توجه', 'شماره را ۱۱ رقمی و با ۰ ابتدا وارد کنید'); return; }
    if (!manual.includes(m)) setManual([...manual, m]);
    setMInput('');
  };

  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  // اگر «انتخاب از لیست» فعال باشد فقط تیک‌خورده‌ها؛ وگرنه همهٔ رانندگان بارگذاری‌شده
  const chosen = pickFromList ? drivers.filter((d) => sel[d.id]) : drivers;
  const filtered = q.trim() ? drivers.filter((d) => (d.name || '').includes(q.trim()) || (d.mobile || '').includes(q.trim())) : drivers;
  const totalCount = chosen.length + manual.length;

  const send = async () => {
    if (!msg.trim()) { Alert.alert('خطا', 'متن پیامک را وارد یا قالبی انتخاب کنید'); return; }
    if (!totalCount) { Alert.alert('خطا', 'حداقل یک گیرنده انتخاب یا وارد کنید'); return; }
    Alert.alert('تأیید ارسال', `ارسال پیامک به ${totalCount} گیرنده؟`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'ارسال', onPress: async () => {
        setBusy(true);
        try {
          const r = await request('/sms/send', { method: 'POST', body: { driver_ids: chosen.map((d) => d.id), mobiles: manual, message: msg.trim() } });
          Alert.alert('انجام شد', `پیامک به ${r.sent} شماره ارسال شد.`);
          setSel({}); setManual([]);
        } catch (e) { Alert.alert('خطا', e.message || 'ارسال ناموفق'); }
        finally { setBusy(false); }
      } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {/* نمایش اعتبار و سهمیهٔ کاربر */}
      {(credit || quota) && (
        <View style={s.creditBox}>
          {credit && credit.amount != null && <Text style={s.creditTxt}>💳 اعتبار پنل: {faNum(Math.round(Number(credit.amount) || 0).toLocaleString())} ریال ≈ {faNum(credit.approx || 0)} پیامک</Text>}
          {quota && quota.effective_limit > 0 ? (
            <Text style={s.limitTxt}>
              📊 سهمیهٔ امروز شما: {faNum(quota.sent_today)} از {faNum(quota.effective_limit)} — باقیمانده: {faNum(quota.remaining_today)}
            </Text>
          ) : quota ? (
            <Text style={s.limitTxt}>📊 ارسال امروز شما: {faNum(quota.sent_today)} پیامک (بدون محدودیت)</Text>
          ) : null}
          {quota && quota.sent_month > 0 && <Text style={s.monthTxt}>ارسال این ماه: {faNum(quota.sent_month)} پیامک</Text>}
        </View>
      )}
      <Text style={s.label}>قالب پیامک</Text>
      {tpls.length ? (
        Object.entries(tpls.reduce((acc, t) => { const c = t.category || 'عمومی'; (acc[c] = acc[c] || []).push(t); return acc; }, {})).map(([cat, items]) => (
          <View key={cat} style={{ marginBottom: 6 }}>
            <Text style={s.catLabel}>{cat}</Text>
            <View style={s.tplRow}>
              {items.map((t, i) => (
                <TouchableOpacity key={i} style={s.tpl} onPress={() => setMsg(t.body || '')}>
                  <Text style={s.tplTxt}>{t.title || `قالب ${i + 1}`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      ) : <Text style={s.muted}>قالبی تعریف نشده — می‌توانید متن دلخواه بنویسید.</Text>}

      <Text style={s.label}>متن پیامک{tplOnly ? ' (فقط از قالب‌ها قابل انتخاب است)' : ''}</Text>
      <TextInput style={[s.input, { height: 90, textAlignVertical: 'top' }, tplOnly && { backgroundColor: '#f1f1f4', color: C.muted }]} multiline value={msg}
        onChangeText={tplOnly ? undefined : setMsg} editable={!tplOnly}
        placeholder={tplOnly ? 'یک قالب را از بالا انتخاب کنید' : 'متن پیامک…'} placeholderTextColor={C.muted} />
      <Text style={s.muted}>هر پیامک فارسی حدود ۷۰ کاراکتر است.</Text>

      <View style={s.selRow}>
        <Text style={[s.label, { marginTop: 0 }]}>گیرندگان ({faNum(totalCount)})</Text>
        <TouchableOpacity onPress={() => { setSel({}); setManual([]); }}><Text style={s.clear}>پاک‌کردن</Text></TouchableOpacity>
      </View>

      <Text style={s.hint}>۱) ابتدا یک خط انتخاب کنید تا رانندگان آن بارگذاری شوند:</Text>
      {lines.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {lines.map((l) => (
            <TouchableOpacity key={l.id} style={[s.lineChip, String(lineId) === String(l.id) && s.lineChipOn]} onPress={() => loadLine(l.id)}>
              <Text style={[s.lineChipTxt, String(lineId) === String(l.id) && s.lineChipTxtOn]}>خط {faNum(l.code)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {lineId ? (
        <>
          <Text style={s.hint}>۲) نوع راننده (تفکیک بهره‌بردار/کمکی):</Text>
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {[['', 'همه'], ['beneficiary', 'بهره‌برداران'], ['helper', 'رانندگان کمکی'], ['driver', 'رانندگان']].map(([rg, lbl]) => (
              <TouchableOpacity key={rg} style={[s.roleChip, roleGroup === rg && s.roleChipOn]} onPress={() => pickRole(rg)}>
                <Text style={[s.roleChipTxt, roleGroup === rg && s.roleChipTxtOn]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingDrivers ? (
            <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator color={C.brand} /><Text style={s.muted}>در حال بارگذاری رانندگان…</Text></View>
          ) : drivers.length === 0 ? (
            <Text style={s.muted}>راننده‌ای با شمارهٔ موبایل در این خط یافت نشد.</Text>
          ) : (
            <>
              <View style={s.summaryBox}>
                <Text style={s.summaryTxt}>{faNum(drivers.length)} راننده در این انتخاب بارگذاری شد.</Text>
                {!pickFromList && <Text style={s.summarySub}>پیامک به همهٔ این رانندگان ارسال می‌شود.</Text>}
              </View>

              <TouchableOpacity style={s.pickToggle} onPress={() => { setPickFromList((v) => !v); setSel({}); }}>
                <View style={[s.cb, pickFromList && s.cbOn]}>{pickFromList ? <Text style={s.cbTick}>✓</Text> : null}</View>
                <Text style={s.pickToggleTxt}>فقط برای برخی رانندگان ارسال شود (انتخاب از لیست)</Text>
              </TouchableOpacity>

              {pickFromList && (
                <>
                  <TextInput style={s.input} value={q} onChangeText={setQ} placeholder="جستجوی راننده…" placeholderTextColor={C.muted} />
                  <View style={s.list}>
                    {filtered.map((d) => (
                      <TouchableOpacity key={d.id} style={s.drow} onPress={() => toggle(d.id)}>
                        <View style={[s.cb, sel[d.id] && s.cbOn]}>{sel[d.id] ? <Text style={s.cbTick}>✓</Text> : null}</View>
                        <Text style={s.dname}>{d.name}</Text>
                        <Text style={s.dmobile}>{d.mobile}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <Text style={s.muted}>برای ارسال به رانندگان، ابتدا یک خط را از بالا انتخاب کنید. (می‌توانید بدون انتخاب خط، فقط شماره‌های دستی وارد کنید.)</Text>
      )}

      <Text style={[s.label, { marginTop: 14 }]}>ورود دستی شمارهٔ موبایل</Text>
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        <TextInput style={[s.input, { flex: 1 }]} value={mInput} onChangeText={setMInput} keyboardType="number-pad" placeholder="09xxxxxxxxx" placeholderTextColor={C.muted} />
        <TouchableOpacity style={s.addBtn} onPress={addManual}><Text style={s.addBtnTxt}>افزودن</Text></TouchableOpacity>
      </View>
      {manual.length > 0 && (
        <View style={s.manualWrap}>
          {manual.map((m) => (
            <TouchableOpacity key={m} style={s.manualChip} onPress={() => setManual(manual.filter((x) => x !== m))}>
              <Text style={s.manualTxt}>{m} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={send}>
        <Text style={s.btnTxt}>{busy ? 'در حال ارسال…' : `ارسال پیامک به ${faNum(totalCount)} گیرنده`}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  creditBox: { backgroundColor: '#eef4ff', borderRadius: 10, padding: 11, marginBottom: 12 },
  creditTxt: { fontFamily: FONT.bold, color: '#1b4bb5', fontSize: 12.5, textAlign: 'right', marginBottom: 2 },
  limitTxt: { fontFamily: FONT.regular, color: '#c26b00', fontSize: 12, textAlign: 'right', marginTop: 2 },
  monthTxt: { fontFamily: FONT.regular, color: '#888', fontSize: 11, textAlign: 'right', marginTop: 2 },
  wrap: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  label: { fontFamily: FONT.bold, fontSize: 14, color: C.ink, textAlign: 'right', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, fontFamily: FONT.regular, fontSize: 14, textAlign: 'right', color: C.ink },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  hint: { fontFamily: FONT.bold, color: C.slate, fontSize: 12.5, textAlign: 'right', marginBottom: 6, marginTop: 4 },
  summaryBox: { backgroundColor: '#eef7f3', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#cfe8df' },
  summaryTxt: { fontFamily: FONT.bold, color: C.brand, fontSize: 13, textAlign: 'right' },
  summarySub: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 3 },
  pickToggle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 6 },
  pickToggleTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 13, flex: 1, textAlign: 'right' },
  tplRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  catLabel: { fontFamily: FONT.bold, fontSize: 12, color: C.brand, textAlign: 'right', marginBottom: 4, marginTop: 2 },
  tpl: { backgroundColor: '#e7f3ee', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  tplTxt: { fontFamily: FONT.bold, color: C.brand, fontSize: 13 },
  selRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  clear: { fontFamily: FONT.regular, color: C.danger, fontSize: 12, marginTop: 14 },
  list: { borderWidth: 1, borderColor: C.line, borderRadius: 11, marginTop: 8, overflow: 'hidden' },
  drow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 11, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 },
  cb: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  cbOn: { backgroundColor: C.brand, borderColor: C.brand },
  cbTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dname: { flex: 1, fontFamily: FONT.bold, color: C.ink, fontSize: 13, textAlign: 'right' },
  dmobile: { fontFamily: FONT.regular, color: C.muted, fontSize: 12 },
  btn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  lineChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, marginLeft: 8 },
  lineChipOn: { backgroundColor: C.brand, borderColor: C.brand },
  lineChipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5 },
  roleChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  roleChipOn: { backgroundColor: C.taxi || C.brand, borderColor: C.taxi || C.brand },
  roleChipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 11.5 },
  roleChipTxtOn: { color: C.taxiInk || '#fff', fontFamily: FONT.bold },
  lineChipTxtOn: { color: '#fff', fontFamily: FONT.bold },
  addBtn: { backgroundColor: '#e7f3ee', borderRadius: 11, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 13 },
  manualWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  manualChip: { backgroundColor: '#fff3e6', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  manualTxt: { color: '#cc7a14', fontFamily: FONT.bold, fontSize: 12 },
});
