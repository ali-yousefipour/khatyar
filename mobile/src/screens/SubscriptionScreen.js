import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const fa = (n) => Number(n || 0).toLocaleString('fa-IR');

export default function SubscriptionScreen({ onActivated }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await request('/subscription/status', { noStore: true });
      if (!data?.subscription) throw new Error('پاسخ وضعیت اشتراک نامعتبر است');
      setStatus(data.subscription);
      if (data.subscription.active) onActivated?.(data.subscription);
    } catch (e) {
      setError(e?.message || 'دریافت وضعیت اشتراک انجام نشد');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onActivated]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!payment || payment.status === 'paid') return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await request(`/subscription/payment-status/${payment.id}`, { noStore: true });
        if (data.status === 'paid') {
          setPayment((current) => ({ ...current, status: 'paid' }));
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
      setPayment({ id: data.payment_id, status: 'pending' });
      if (!data.bot_link) throw new Error('لینک ربات بله در تنظیمات ثبت نشده است');
      const supported = await Linking.canOpenURL(data.bot_link);
      if (!supported) throw new Error('امکان بازکردن لینک ربات بله در این دستگاه وجود ندارد');
      await Linking.openURL(data.bot_link);
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
        <TouchableOpacity style={styles.button} onPress={() => load()}>
          <Text style={styles.buttonText}>تلاش دوباره</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.icon}>💳</Text>
        <Text style={styles.title}>اشتراک برنامه</Text>
        <Text style={styles.mode}>{status.label || 'وضعیت اشتراک'}</Text>

        {status.enabled ? (
          <>
            <Text style={[styles.status, { color: status.active ? '#087f5b' : '#b42318' }]}>
              {status.active ? 'اشتراک فعال است' : 'اشتراک منقضی شده است'}
            </Text>
            <Text style={styles.days}>
              {status.active ? `${fa(status.days_left)} روز باقی‌مانده` : 'نیازمند تمدید'}
            </Text>
            {status.expires_at ? <Text style={styles.detail}>تاریخ پایان: {status.expires_at}</Text> : null}
            <Text style={styles.amount}>مبلغ تمدید ۳۰ روزه: {fa(status.amount)} ریال</Text>
            {status.can_pay ? (
              <TouchableOpacity style={styles.button} onPress={pay} disabled={busy}>
                {busy ? <ActivityIndicator size={28} /> : <Text style={styles.buttonText}>دریافت صورتحساب از ربات بله</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.note}>پرداخت اشتراک گروهی توسط مدیر اجرایی انجام می‌شود.</Text>
            )}
          </>
        ) : (
          <Text style={styles.note}>سامانه در حالت استفاده معمولی است و نیازی به پرداخت اشتراک ندارد.</Text>
        )}

        {payment?.status === 'pending' ? <Text style={styles.pending}>در انتظار پرداخت و تأیید صورتحساب…</Text> : null}
        {error ? <Text style={styles.errorInline}>{error}</Text> : null}
      </View>

      <TouchableOpacity style={styles.refresh} onPress={() => load()} disabled={loading}>
        <Text style={styles.refreshText}>{loading ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی وضعیت'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  content: { padding: 18, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, alignItems: 'center' },
  icon: { fontSize: 48 },
  title: { fontFamily: FONT.bold, fontSize: 21, color: C.ink, marginTop: 8 },
  mode: { fontFamily: FONT.bold, color: C.brand, fontSize: 17, marginTop: 12 },
  status: { fontFamily: FONT.bold, fontSize: 15, marginTop: 14 },
  days: { fontFamily: FONT.bold, color: C.ink, fontSize: 20, marginTop: 8 },
  detail: { fontFamily: FONT.regular, color: C.muted, marginTop: 8 },
  amount: { fontFamily: FONT.regular, color: C.muted, marginTop: 14 },
  note: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center', lineHeight: 22, marginTop: 18 },
  pending: { fontFamily: FONT.bold, color: '#8a6500', textAlign: 'center', marginTop: 16 },
  error: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'center', lineHeight: 23, marginBottom: 16 },
  errorInline: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'center', marginTop: 14 },
  button: { backgroundColor: C.brand, borderRadius: 14, padding: 14, marginTop: 20, width: '100%', alignItems: 'center' },
  buttonText: { fontFamily: FONT.bold, color: '#fff' },
  refresh: { borderWidth: 1, borderColor: C.brand, borderRadius: 14, padding: 13, marginTop: 14, alignItems: 'center' },
  refreshText: { fontFamily: FONT.bold, color: C.brand },
});
