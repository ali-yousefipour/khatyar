import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert, Modal } from 'react-native';
import { request } from '../api';
import { getAppConfig } from '../appconfig';
import { faNum } from '../num';
import { C, FONT } from '../theme';
import { sendTelemetry } from '../telemetry';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function DebtScreen({ route, navigation }) {
  const { driver } = route.params;
  const [data, setData] = useState(null);
  const [cfg, setCfg] = useState({ bill_sms_enabled: false, can_send_sms: false });
  const [sending, setSending] = useState(null);
  const [detailBill, setDetailBill] = useState(null); // فیش انتخاب‌شده برای نمایش درشت

  function load() {
    const nid = driver.national_id;
    const plate = driver.plate || route.params?.vehicle?.plate;
    if (nid) {
      request(`/debt/${nid}`).then((d) => {
        // اگر با کد ملی فیشی پیدا نشد، با پلاک امتحان کن
        if ((!d.bills || d.bills.length === 0) && plate) {
          request(`/debt-by-plate/${encodeURIComponent(plate)}`).then(setData).catch(() => setData(d));
        } else setData(d);
      }).catch((e) => {
        // خطا در کد ملی — با پلاک امتحان کن
        if (plate) request(`/debt-by-plate/${encodeURIComponent(plate)}`).then(setData).catch((e2) => setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: e2.message }));
        else setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: e.message });
      });
    } else if (plate) {
      request(`/debt-by-plate/${encodeURIComponent(plate)}`).then(setData).catch((e) => setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: e.message }));
    } else {
      setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: 'کد ملی و پلاک راننده موجود نیست' });
    }
  }
  useEffect(() => { load(); getAppConfig().then((c) => setCfg(c || {})).catch(() => {}); }, []);

  async function sendBillBot(b) {
    try { setSending('bot'+b.id); const r=await request(`/debt/${b.id}/messenger`, { method:'POST', body:{} }); Alert.alert('ارسال شد', `مشخصات فیش در ربات‌ها ارسال شد. ارسال موفق: ${r.sent||0}، متصل‌نشده: ${r.not_connected||0}`); } catch(e){ Alert.alert('خطا',e.message||'ارسال در ربات‌ها ناموفق بود.'); } finally { setSending(null); }
  }

  async function sendBillSms(b) {
    try {
      setSending(b.id);
      await request(`/debt/${b.id}/sms`, { method: 'POST', body: {} });
      Alert.alert('ارسال شد', 'اطلاعات فیش به‌صورت پیامک برای تاکسیران ارسال شد.');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ارسال پیامک ناموفق بود.');
    } finally { setSending(null); }
  }

  if (!data) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  const showSms = cfg.bill_sms_enabled && cfg.can_send_sms;

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      {data.unpaid_count > 0 && (
        <View style={s.red}>
          <Text style={s.redTxt}>{faNum(data.unpaid_count)} فیش پرداخت‌نشده · مجموع {faNum(faNum(Number(data.total_unpaid).toLocaleString()))} ریال</Text>
        </View>
      )}
      {data._err && <View style={s.red}><Text style={s.redTxt}>خطا: {data._err}</Text></View>}
      {!data._err && data.bills.length === 0 && <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: C.muted, fontFamily: FONT.regular }}>فیشی برای این راننده ثبت نشده است.</Text></View>}
      {data.bills.map((b) => {
        const unpaid = b.status !== 'پرداخت شده';
        return (
          <View style={s.fish} key={b.id}>
            <View style={{ flex: 1 }}>
              <Text style={s.amt}>{faNum(faNum(Number(b.amount).toLocaleString()))} ریال</Text>
              <Text style={[s.status, { color: unpaid ? C.muted : C.ok }]}>{b.status}</Text>
              {!!b.pay_date && <Text style={s.meta}>تاریخ صدور فیش: {faNum(b.pay_date)}</Text>}
              {!!b.paid_date && <Text style={[s.meta, { color: C.ok }]}>تاریخ پرداخت: {faNum(b.paid_date)}</Text>}
              {!!b.bill_id && <Text style={s.meta}>شناسهٔ قبض: {faNum(b.bill_id)}</Text>}
            </View>
            <View style={{ gap: 6, alignItems: 'flex-start' }}>
              {unpaid
                ? <TouchableOpacity style={s.pay} onPress={() => { if (b.pay_url) { sendTelemetry('bill_pay_click', { bill_id: b.bill_id || null }); Linking.openURL(b.pay_url); } }}><Text style={s.payTxt}>پرداخت</Text></TouchableOpacity>
                : <Text style={{ color: C.ok, fontSize: 18 }}>✓</Text>}
              <TouchableOpacity style={s.detailBtn} onPress={() => setDetailBill(b)}>
                <Text style={s.detailTxt}>نمایش اطلاعات</Text>
              </TouchableOpacity>
              {unpaid && cfg.can_send_messenger && cfg.bill_bot_enabled !== false && (
                <TouchableOpacity style={s.botBtn} disabled={sending === 'bot'+b.id} onPress={() => sendBillBot(b)}>
                  <Text style={s.botTxt}>{sending === 'bot'+b.id ? 'در حال ارسال…' : '🤖 ارسال مشخصات فیش در ربات‌ها'}</Text>
                </TouchableOpacity>
              )}
              {unpaid && showSms && (
                <TouchableOpacity style={s.smsBtn} disabled={sending === b.id} onPress={() => sendBillSms(b)}>
                  <Text style={s.smsTxt}>{sending === b.id ? 'در حال ارسال…' : '✉ ارسال پیامک فیش'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={s.noticeBtn} onPress={() => navigation.navigate('Notice', { driver, preset: 'بدهی آبونمان' })}>
        <Text style={s.noticeTxt}>✎ ثبت تذکر آبونمان</Text>
      </TouchableOpacity>

      {/* پنجرهٔ نمایش اطلاعات فیش با فونت درشت */}
      <Modal visible={!!detailBill} transparent animationType="fade" onRequestClose={() => setDetailBill(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>اطلاعات فیش آبونمان</Text>
            {detailBill && (
              <View style={{ width: '100%' }}>
                <DetailRow label="تاکسیران" value={`${driver.first_name || ''} ${driver.last_name || ''}`} />
                <DetailRow label="مبلغ" value={`${faNum(Number(detailBill.amount || 0).toLocaleString())} ریال`} big />
                <DetailRow label="شناسهٔ قبض" value={faNum(detailBill.bill_id || '—')} mono />
                <DetailRow label="شناسهٔ پرداخت" value={faNum(detailBill.pay_id || '—')} mono />
                <DetailRow label="وضعیت" value={detailBill.status || '—'} />
                {!!detailBill.plate && <DetailRow label="پلاک" value={detailBill.plate} />}
                {!!detailBill.pay_date && <DetailRow label="تاریخ صدور فیش" value={faNum(detailBill.pay_date)} />}
                {!!detailBill.paid_date && <DetailRow label="تاریخ پرداخت" value={faNum(detailBill.paid_date)} />}
              </View>
            )}
            <TouchableOpacity style={s.modalClose} onPress={() => setDetailBill(null)}>
              <Text style={s.modalCloseTxt}>بستن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value, big, mono }) {
  return (
    <View style={s.dRow}>
      <Text style={s.dLabel}>{label}:</Text>
      <Text style={[s.dValue, big && s.dValueBig, mono && { letterSpacing: 1 }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  red: { backgroundColor: C.danger, borderRadius: 12, padding: 12, marginBottom: 12 },
  redTxt: { color: '#fff', fontFamily: FONT.bold, textAlign: 'center', fontSize: 13 },
  fish: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  amt: { fontFamily: FONT.bold, fontSize: 14, color: C.ink, textAlign: 'right' },
  status: { fontFamily: FONT.regular, fontSize: 11, textAlign: 'right', marginTop: 2 },
  meta: { fontFamily: FONT.regular, fontSize: 10.5, color: C.muted, textAlign: 'right', marginTop: 2 },
  pay: { backgroundColor: C.brand, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  detailBtn: { backgroundColor: '#eef2ff', borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12 },
  detailTxt: { fontFamily: FONT.bold, color: '#2746a6', fontSize: 11.5 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, width: '100%', alignItems: 'center' },
  modalTitle: { fontFamily: FONT.bold, fontSize: 17, color: C.ink, marginBottom: 16 },
  dRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dLabel: { fontFamily: FONT.regular, fontSize: 14, color: C.muted },
  dValue: { fontFamily: FONT.bold, fontSize: 17, color: C.ink, textAlign: 'left' },
  dValueBig: { fontSize: 24, color: C.brand },
  modalClose: { marginTop: 18, backgroundColor: C.ink, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40 },
  modalCloseTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
  payTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 12 },
  smsBtn: { backgroundColor: '#eef7f3', borderColor: C.brand, borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  smsTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 11 },
  botBtn: { backgroundColor: '#eef4ff', borderColor: '#3b5bd6', borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  botTxt: { color: '#3b5bd6', fontFamily: FONT.bold, fontSize: 11 },
  noticeBtn: { backgroundColor: C.taxi, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  noticeTxt: { color: C.taxiInk, fontFamily: FONT.bold },
});
