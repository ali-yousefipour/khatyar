import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import { compressToDataUri } from '../img';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import { getAppConfig } from '../appconfig';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const DEFAULT_OPTS = ['سالم', 'ایراد', 'ندارد'];

export default function ChecklistScreen({ route, navigation }) {
  const { driver } = route.params;
  const insets = useSafeAreaInsets();
  const [tpl, setTpl] = useState(null);
  const [answers, setAnswers] = useState({}); // keyed by item label -> chosen option text
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sendBot, setSendBot] = useState(false);
  const [cfg, setCfg] = useState({});

  useEffect(() => { request('/checklist/template').then(setTpl).catch(() => setTpl(null)); getAppConfig().then(setCfg).catch(()=>{}); }, []);

  const [photoBusy, setPhotoBusy] = useState(false);
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('توجه', 'دسترسی دوربین لازم است'); return; }
    // کیفیت ۰.۸ (به‌جای حداکثر/خام) درخواست می‌شود تا حجم عکس خام گرفته‌شده از دوربین،
    // به‌خصوص روی گوشی‌های جدید با دوربین بسیار پرمگاپیکسل، از ابتدا زیاد نباشد.
    const r = await launchCamera({ quality: 0.8 });
    if (r.canceled) return;
    setPhotoBusy(true);
    try {
      const compressed = await compressToDataUri(r.assets[0].uri);
      if (!compressed) {
        // مهم: هرگز به عکس خام/فشرده‌نشده برگشت داده نمی‌شود، چون حجم آن می‌تواند چند مگابایت
        // باشد و باعث Timeout و «خطای ارتباط با سرور» هنگام ارسال شود. باید دوباره عکس گرفته شود.
        Alert.alert('خطا', 'پردازش تصویر ناموفق بود. لطفاً دوباره عکس بگیرید (یا نور محیط را بهتر کنید).');
        return;
      }
      setPhoto(compressed);
    } finally { setPhotoBusy(false); }
  };

  async function submit() {
    if (!tpl) return;
    if (!photo) { Alert.alert('عکس الزامی است', 'برای ثبت چک‌لیست باید عکس بگیرید.'); return; }
    setBusy(true);
    try {
      const out = {};
      Object.keys(answers).forEach((k) => { out[k] = Array.isArray(answers[k]) ? answers[k].join('، ') : answers[k]; });
      const r = await postOrQueue('/checklist', { template_id: tpl.id, driver_id: driver.id, answers: out, photo_data: photo, send_bot: sendBot ? 1 : 0 });
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد',
        r.queued ? 'چک‌لیست ذخیره شد و بعداً ارسال می‌شود.' : 'چک‌لیست ثبت شد.');
      navigation.goBack();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); }
    finally { setBusy(false); }
  }

  if (!tpl) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 28 }}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
      <Text style={s.title}>{tpl.title}</Text>
      {tpl.items.map((it) => {
        const at = (it.answer_type === 'text') ? 'text' : 'single';
        const opts = (it.options && it.options.length) ? it.options : DEFAULT_OPTS;
        const cur = answers[it.label];
        return (
          <View style={s.item} key={it.id}>
            <Text style={s.label}>{it.label}</Text>
            {at === 'text' ? (
              <TextInput style={s.input} value={cur || ''} multiline
                onChangeText={(v) => setAnswers({ ...answers, [it.label]: v })} placeholder="پاسخ…" placeholderTextColor={C.muted} />
            ) : (
              <View style={s.opts}>
                {opts.map((o) => {
                  const on = (cur === o);
                  return (
                    <TouchableOpacity key={o} onPress={() => setAnswers({ ...answers, [it.label]: o })}
                      style={[s.opt, on && { backgroundColor: C.brand, borderColor: C.brand }]}>
                      <Text style={[s.optTxt, on && { color: '#fff' }]}>{o}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      <Text style={[s.q, { marginTop: 10 }]}>عکس خودرو (الزامی)</Text>
      <TouchableOpacity style={s.photoBtn} onPress={takePhoto} disabled={photoBusy}>
        <Text style={s.photoBtnTxt}>{photoBusy ? '⏳ در حال پردازش تصویر…' : (photo ? '✓ عکس گرفته شد (تعویض)' : '📷 گرفتن عکس')}</Text>
      </TouchableOpacity>
      {cfg.can_send_messenger && cfg.checklist_bot_enabled !== false ? <View style={s.botRow}><Switch value={sendBot} onValueChange={setSendBot} trackColor={{true:'#3b5bd6'}}/><Text style={s.botTxt}>ارسال نتیجه چک‌لیست در ربات‌های راننده</Text></View> : null}
      {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: 180, borderRadius: 12, marginTop: 8 }} resizeMode="cover" /> : null}
      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}><Text style={s.btnTxt}>{busy ? 'در حال ثبت…' : 'ثبت چک‌لیست'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  title: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right', marginBottom: 14 },
  item: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
  label: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', marginBottom: 10 },
  opts: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  opt: { borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  optTxt: { fontFamily: FONT.bold, fontSize: 12, color: C.ink },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 11, padding: 11, minHeight: 64, textAlign: 'right', textAlignVertical: 'top', fontFamily: FONT.regular, color: C.ink },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  q: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  photoBtn: { borderWidth: 1, borderColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 6, backgroundColor: '#e7f3ee' },
  photoBtnTxt: { color: C.brand, fontFamily: FONT.bold, fontSize: 14 },
  botRow: { flexDirection:'row-reverse', alignItems:'center', gap:10, marginTop:12, backgroundColor:'#eef4ff', borderRadius:12, padding:12 },
  botTxt: { flex:1, textAlign:'right', color:C.ink, fontFamily:FONT.bold, fontSize:13 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
});
