import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView, useWindowDimensions } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const fa = (n) => Number(n || 0).toLocaleString('fa-IR');

export default function SubscriptionScreen({ onActivated }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState(null);
  const generation = useRef(0);
  const { width } = useWindowDimensions();

  const load = useCallback(async (silent = false) => {
    const current = ++generation.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await request('/subscription/status', { noStore: true });
      if (!data?.subscription) throw new Error('پاسخ وضعیت اشتراک نامعتبر است');
      if (current !== generation.current) return;
      setStatus(data.subscription);
      if (data.subscription.active) onActivated?.(data.subscription);
    } catch (e) {
      if (current === generation.current) setError(e?.message || 'دریافت وضعیت اشتراک انجام نشد. اتصال اینترنت را بررسی کنید.');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [onActivated]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 30000);
    return () => { clearInterval(timer); generation.current += 1; };
  }, [load]);

  useEffect(() => {
    if (!payment || payment.status === 'paid') return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await request(`/subscription/payment-status/${payment.id}`, { noStore: true });
        if (data.status === 'paid') {
          setPayment((current) => current?.id === payment.id ? { ...current, status: 'paid' } : current);
          setStatus(data.subscription);
          if (data.subscription?.active) onActivated?.(data.subscription);
        }
      } catch (_error) {}
    }, 5000);
    return () => clearInterval(timer);
  }, [payment, onActivated]);

  async function pay() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await request('/subscription/payment', { method: 'POST', body: {} });
      if (data?.skipped || data?.subscription?.enabled === false) {
        setStatus(data.subscription || { enabled: false, mode: 'normal', active: true, label: 'استفاده معمولی' });
        setPayment(null);
        Alert.alert('بدون نیاز به پرداخت', data?.message || 'سامانه در حالت بدون اشتراک است.');
        return;
      }
      if (!data?.payment_id) throw new Error('شناسه صورتحساب دریافت نشد.');
      if (!data.bot_link) throw new Error('لینک ربات بله در تنظیمات ثبت نشده است');
      const supported = await Linking.canOpenURL(data.bot_link);
      if (!supported) throw new Error('امکان بازکردن لینک ربات بله در این دستگاه وجود ندارد');
      await Linking.openURL(data.bot_link);
      setPayment({ id: data.payment_id, status: 'pending' });
    } catch (e) {
      Alert.alert('خطا', e?.message || 'ایجاد صورتحساب انجام نشد');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !status) return <ActivityIndicator fullScreen message="در حال دریافت وضعیت اشتراک…" />;

  if (!status) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'وضعیت اشتراک دریافت نشد.'}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => load()}>
          <Text style={styles.buttonText}>تلاش دوباره</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView persistentScrollbar={true} style={styles.page} contentContainerStyle={[styles.content,{paddingHorizontal:width>=700?32:16}]}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="credit-card-check-outline" size={48} color={C.brand} accessibilityLabel="وضعیت اشتراک" />
        <Text style={styles.title}>اشتراک برنامه</Text>
        <Text style={styles.mode}>{status.label || 'وضعیت اشتراک'}</Text>

        {status.enabled ? (
          <>
            <View style={[styles.statusBadge,{backgroundColor:status.active?'#e7f6ed':'#fff1f1'}]}>
              <MaterialCommunityIcons name={status.active?'check-circle-outline':'alert-circle-outline'} size={20} color={status.active?'#087f5b':'#b42318'}/>
              <Text style={[styles.status, { color: status.active ? '#087f5b' : '#b42318' }]}>
              {status.active ? 'اشتراک فعال است' : 'اشتراک منقضی شده است'}
              </Text>
            </View>
            <Text style={styles.days}>
              {status.active ? `${fa(status.days_left)} روز باقی‌مانده` : 'نیازمند تمدید'}
            </Text>
            {status.expires_at ? <Text style={styles.detail}>تاریخ پایان: {status.expires_at}</Text> : null}
            <Text style={styles.amount}>مبلغ تمدید ۳۰ روزه: {fa(status.amount)} ریال</Text>
            {status.can_pay ? (
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} style={styles.button} onPress={pay} disabled={busy}>
                {busy ? <ActivityIndicator size={28} /> : <Text style={styles.buttonText}>دریافت صورتحساب از ربات بله</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.note}>پرداخت اشتراک گروهی توسط مدیر اجرایی انجام می‌شود.</Text>
            )}
          </>
        ) : (
          <Text style={styles.note}>سامانه در حالت استفاده معمولی است و نیازی به پرداخت اشتراک ندارد.</Text>
        )}

        {payment?.status === 'pending' ? <View style={styles.pendingBox}><MaterialCommunityIcons name="clock-outline" size={23} color="#8a6500"/><Text accessibilityLiveRegion="polite" style={styles.pending}>در انتظار پرداخت و تأیید صورتحساب… پس از پرداخت وضعیت را به‌روزرسانی کنید.</Text></View> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.errorInline}>{error}</Text> : null}
      </View>

      <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:loading}} style={[styles.refresh,loading&&{opacity:0.5}]} onPress={() => load()} disabled={loading}>
        <Text style={styles.refreshText}>{loading ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی وضعیت'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  content: { paddingTop: 16, paddingBottom: 48, alignSelf: 'center', width: '100%', maxWidth: 760 },
  center: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 23, padding: 24, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  icon: { fontSize: 48 },
  title: { fontFamily: FONT.bold, fontSize: 21, color: C.ink, marginTop: 8 },
  mode: { fontFamily: FONT.bold, color: C.brand, fontSize: 17, marginTop: 12 },
  statusBadge: { marginTop: 16, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  status: { fontFamily: FONT.bold, fontSize: 15, textAlign: 'center' },
  days: { fontFamily: FONT.bold, color: C.ink, fontSize: 20, marginTop: 8 },
  detail: { fontFamily: FONT.regular, color: C.muted, marginTop: 8 },
  amount: { fontFamily: FONT.regular, color: C.muted, marginTop: 14 },
  note: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center', lineHeight: 22, marginTop: 18 },
  pendingBox: { marginTop: 16, borderWidth: 1, borderColor: '#ebd9a9', backgroundColor: '#fff9e8', borderRadius: 14, padding: 14, gap: 8, alignItems: 'center' },
  pending: { fontFamily: FONT.bold, color: '#8a6500', textAlign: 'center', lineHeight: 23 },
  error: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'center', lineHeight: 23, marginBottom: 16 },
  errorInline: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'center', marginTop: 14 },
  button: { backgroundColor: C.brand, borderRadius: 16, padding: 16, minHeight: 52, marginTop: 20, width: '100%', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: FONT.bold, color: '#fff' },
  refresh: { borderWidth: 1, borderColor: C.brand, borderRadius: 14, padding: 13, minHeight: 48, marginTop: 14, alignItems: 'center' },
  refreshText: { fontFamily: FONT.bold, color: C.brand },
});
