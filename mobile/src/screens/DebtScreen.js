import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert, Modal } from 'react-native';
import { request } from '../api';
import { getAppConfig } from '../appconfig';
import { faNum } from '../num';
import { C, FONT } from '../theme';
import { sendTelemetry } from '../telemetry';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Dates can be Jalali/Gregorian, slash/dash separated, or include a time.
const dateOrder = value => {
  const ascii = String(value ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const parts = ascii.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}))?/);
  if (parts) return Number(parts[1]) * 1e10 + Number(parts[2]) * 1e8 + Number(parts[3]) * 1e6 + Number(parts[4] || 0) * 1e4 + Number(parts[5] || 0) * 100 + Number(parts[6] || 0);
  return 0;
};

export default function DebtScreen({ route, navigation }) {
  const { driver } = route.params;
  const [data, setData] = useState(null);
  const [cfg, setCfg] = useState({ bill_sms_enabled: false, can_send_sms: false });
  const [sending, setSending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailBill, setDetailBill] = useState(null); // فیش انتخاب‌شده برای نمایش درشت

  function load() {
    setLoading(true);
    const nid = driver.national_id;
    const plate = driver.plate || route.params?.vehicle?.plate;
    if (nid) {
      request(`/debt/${nid}`).then((d) => {
        // اگر با کد ملی فیشی پیدا نشد، با پلاک امتحان کن
        if ((!d.bills || d.bills.length === 0) && plate) {
          request(`/debt-by-plate/${encodeURIComponent(plate)}`).then(setData).catch(() => setData(d)).finally(() => setLoading(false));
        } else { setData(d); setLoading(false); }
      }).catch((e) => {
        // خطا در کد ملی — با پلاک امتحان کن
        if (plate) request(`/debt-by-plate/${encodeURIComponent(plate)}`).then(setData).catch((e2) => setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: e2.message })).finally(() => setLoading(false));
        else { setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: e.message }); setLoading(false); }
      });
    } else if (plate) {
      request(`/debt-by-plate/${encodeURIComponent(plate)}`).then(setData).catch((e) => setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: e.message })).finally(() => setLoading(false));
    } else {
      setData({ bills: [], unpaid_count: 0, total_unpaid: 0, _err: 'کد ملی و پلاک راننده موجود نیست' });
      setLoading(false);
    }
  }
  useEffect(() => { load(); getAppConfig().then((c) => setCfg(c || {})).catch(() => {}); }, []);

  async function sendBillBot(b) {
    if (sending !== null) return;
    try { setSending('bot'+b.id); const r=await request(`/debt/${b.id}/messenger`, { method:'POST', body:{} }); const count=Number(r?.sent||0); Alert.alert(count>0?'ارسال شد':'ارسالی انجام نشد', `ارسال موفق: ${faNum(count)}، متصل‌نشده: ${faNum(r?.not_connected||0)}`); } catch(e){ Alert.alert('خطا',e.message||'ارسال در ربات‌ها ناموفق بود.'); } finally { setSending(null); }
  }

  async function sendBillSms(b) {
    if (sending !== null) return;
    try {
      setSending(b.id);
      await request(`/debt/${b.id}/sms`, { method: 'POST', body: {} });
      Alert.alert('ارسال شد', 'اطلاعات فیش به‌صورت پیامک برای تاکسیران ارسال شد.');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ارسال پیامک ناموفق بود.');
    } finally { setSending(null); }
  }

  async function openPayment(b) {
    if (!b.pay_url) { Alert.alert('لینک پرداخت موجود نیست', 'برای دریافت لینک پرداخت با پشتیبانی سامانه تماس بگیرید.'); return; }
    try {
      const supported = await Linking.canOpenURL(b.pay_url);
      if (!supported) throw new Error('cannot_open_payment_link');
      sendTelemetry('bill_pay_click', { bill_id: b.bill_id || null });
      await Linking.openURL(b.pay_url);
    } catch (_) { Alert.alert('بازکردن پرداخت ناموفق بود', 'اتصال اینترنت و مرورگر گوشی را بررسی کنید. هیچ پرداختی در برنامه تأیید نشده است.'); }
  }

  if (!data && loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (!data) return <View style={s.center}><Text style={s.errorText}>اطلاعات فیش‌ها دریافت نشد.</Text><TouchableOpacity style={s.retryBtn} onPress={load}><Text style={s.retryTxt}>تلاش دوباره</Text></TouchableOpacity></View>;
  const showSms = cfg.bill_sms_enabled && cfg.can_send_sms;
  const sortedBills = [...(Array.isArray(data.bills) ? data.bills : [])].sort((a, b) =>
    dateOrder(b.pay_date || b.issue_date || b.created_at) - dateOrder(a.pay_date || a.issue_date || a.created_at) ||
    dateOrder(b.paid_date) - dateOrder(a.paid_date) || String(b.id ?? '').localeCompare(String(a.id ?? ''), 'en', { numeric: true })
  );

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <View style={s.header}><View style={s.headerIcon}><MaterialCommunityIcons name="receipt-text-outline" size={23} color={C.brand}/></View><View style={{ flex: 1 }}><Text style={s.headerTitle}>فیش‌های آبونمان تاکسیران</Text><Text style={s.headerSubtitle}>{faNum(sortedBills.length)} فیش · مرتب‌شده از جدیدترین به قدیمی‌ترین</Text></View></View>
      {data.unpaid_count > 0 && (
        <View style={s.red}>
          <Text style={s.redTxt}>{faNum(data.unpaid_count)} فیش پرداخت‌نشده · مجموع {faNum(faNum(Number(data.total_unpaid).toLocaleString()))} ریال</Text>
        </View>
      )}
      {data._err && <View accessibilityLiveRegion="polite" style={s.red}><Text style={s.redTxt}>خطا: {data._err}</Text><TouchableOpacity accessibilityRole="button" onPress={load} disabled={loading} style={s.retryBtn}><Text style={s.retryTxt}>{loading?'در حال دریافت…':'تلاش دوباره'}</Text></TouchableOpacity></View>}
      {!data._err && sortedBills.length === 0 && <View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: C.muted, fontFamily: FONT.regular }}>فیشی برای این راننده ثبت نشده است.</Text></View>}
      {sortedBills.map((b) => {
        const unpaid = b.status !== 'پرداخت شده';
        return (
          <View style={s.fish} key={b.id}>
            <View style={s.billHead}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.amt}>{faNum(Number(b.amount || 0).toLocaleString('en-US'))} <Text style={s.currency}>ریال</Text></Text>
                <View style={[s.statusPill, unpaid ? s.unpaidPill : s.paidPill]}><MaterialCommunityIcons name={unpaid ? 'clock-alert-outline' : 'check-circle-outline'} size={16} color={unpaid ? '#a46316' : C.ok}/><Text style={[s.status, { color: unpaid ? '#a46316' : C.ok }]}>{faNum(b.status || (unpaid ? 'پرداخت‌نشده' : 'پرداخت شده'))}</Text></View>
              </View>
              <View style={[s.billIcon, unpaid && s.billIconUnpaid]}><MaterialCommunityIcons name={unpaid ? 'receipt-text-clock-outline' : 'receipt-text-check-outline'} size={25} color={unpaid ? '#ad751f' : C.brand}/></View>
            </View>
            <View style={s.billInfo}>
              {!!b.pay_date && <View style={s.infoRow}><MaterialCommunityIcons name="calendar-outline" size={16} color={C.muted}/><Text style={s.meta}>تاریخ صدور: {faNum(b.pay_date)}</Text></View>}
              {!!b.paid_date && <View style={s.infoRow}><MaterialCommunityIcons name="calendar-check-outline" size={16} color={C.ok}/><Text style={[s.meta, { color: C.ok }]}>تاریخ پرداخت: {faNum(b.paid_date)}</Text></View>}
              {!!b.bill_id && <View style={s.infoRow}><MaterialCommunityIcons name="identifier" size={16} color={C.muted}/><Text style={s.meta}>شناسه قبض: {faNum(b.bill_id)}</Text></View>}
            </View>
            <View style={s.billActions}>
              <TouchableOpacity style={[s.detailBtn, s.actionButton]} onPress={() => setDetailBill(b)}><MaterialCommunityIcons name="information-outline" size={18} color="#2746a6"/><Text style={s.detailTxt}>نمایش اطلاعات</Text></TouchableOpacity>
              {unpaid && <TouchableOpacity accessibilityRole="button" style={[s.pay, s.actionButton]} onPress={() => openPayment(b)}><MaterialCommunityIcons name="credit-card-outline" size={18} color="#fff"/><Text style={s.payTxt}>پرداخت</Text></TouchableOpacity>}
              {unpaid && cfg.can_send_messenger && cfg.bill_bot_enabled !== false && <TouchableOpacity style={[s.botBtn, s.actionButton]} disabled={sending === 'bot'+b.id} onPress={() => sendBillBot(b)}><MaterialCommunityIcons name="robot-outline" size={18} color="#3b5bd6"/><Text style={s.botTxt}>{sending === 'bot'+b.id ? 'در حال ارسال…' : 'ارسال در ربات‌ها'}</Text></TouchableOpacity>}
              {unpaid && showSms && <TouchableOpacity style={[s.smsBtn, s.actionButton]} disabled={sending === b.id} onPress={() => sendBillSms(b)}><MaterialCommunityIcons name="message-text-outline" size={18} color={C.brand}/><Text style={s.smsTxt}>{sending === b.id ? 'در حال ارسال…' : 'ارسال پیامک'}</Text></TouchableOpacity>}
            </View>
          </View>
        );
      })}
      <TouchableOpacity style={s.noticeBtn} onPress={() => navigation.navigate('Notice', { driver, preset: 'بدهی آبونمان' })}>
        <MaterialCommunityIcons name="note-edit-outline" size={19} color={C.taxiInk}/><Text style={s.noticeTxt}>ثبت تذکر آبونمان</Text>
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
  red: { backgroundColor: C.danger, borderRadius: 16, padding: 15, marginBottom: 12 },
  redTxt: { color: '#fff', fontFamily: FONT.bold, textAlign: 'center', fontSize: 13 },
  errorText: { color: C.danger, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  retryBtn: { minHeight: 48, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, backgroundColor: C.brand },
  retryTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 16 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e6f4ef', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 17, textAlign: 'right' },
  headerSubtitle: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 3 },
  fish: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#17352f', shadowOpacity: .05, shadowRadius: 8 },
  billHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  billIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#e6f4ef', alignItems: 'center', justifyContent: 'center' },
  billIconUnpaid: { backgroundColor: '#fff3dd' },
  currency: { fontSize: 13, color: C.muted },
  statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, alignSelf: 'flex-end', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, marginTop: 7 },
  paidPill: { backgroundColor: '#e9f7ef' },
  unpaidPill: { backgroundColor: '#fff4e4' },
  billInfo: { backgroundColor: '#f7f9fb', borderRadius: 12, padding: 11, marginTop: 12, gap: 7 },
  infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  billActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42 },
  amt: { fontFamily: FONT.bold, fontSize: 20, color: C.ink, textAlign: 'right' },
  status: { fontFamily: FONT.regular, fontSize: 12, textAlign: 'right' },
  meta: { fontFamily: FONT.regular, fontSize: 12, color: C.muted, textAlign: 'right', flexShrink: 1 },
  pay: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 16 },
  detailBtn: { backgroundColor: '#eef2ff', borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12 },
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
  noticeBtn: { backgroundColor: C.taxi, borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  noticeTxt: { color: C.taxiInk, fontFamily: FONT.bold },
});
