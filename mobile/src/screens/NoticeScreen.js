import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import { compressToDataUri } from '../img';
import { request } from '../api';
import { getAppConfig } from '../appconfig';
import { C, FONT } from '../theme';

const PRIORITIES = [{ k: 'low', t: 'کم' }, { k: 'medium', t: 'متوسط' }, { k: 'high', t: 'زیاد' }];
const ABONEMAN = 'بدهی آبونمان';

export default function NoticeScreen({ route, navigation }) {
  const { driver, preset } = route.params;
  const [reasons, setReasons] = useState([]);
  const [reasonId, setReasonId] = useState(null);
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('medium');
  const [img, setImg] = useState(null);
  const [cfg, setCfg] = useState({ notice_require_photo: false, notice_camera_only: true, notice_sms_enabled: false, can_send_sms: false });
  const [sendSms, setSendSms] = useState(false);
  const [sendBot, setSendBot] = useState(false);
  const isAboneman = preset === ABONEMAN;
  const enabled = (v) => v === true || v === 1 || String(v).toLowerCase() === 'true' || String(v) === '1' || String(v) === 'فعال';

  const loadConfig = useCallback(() => {
    getAppConfig(true).then((c) => setCfg(c || {})).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { loadConfig(); }, [loadConfig]));

  useEffect(() => {
    request('/notice-reasons').then((rs) => {
      setReasons(rs);
      if (preset) { const m = rs.find((r) => r.title === preset); if (m) setReasonId(m.id); }
    }).catch(() => setReasons([]));
    if (isAboneman) setPriority('medium');
  }, []);

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('دسترسی', 'دسترسی به دوربین لازم است.');
    // کیفیت ۰.۸ (به‌جای حداکثر/خام) تا حجم اولیهٔ عکس، پیش از فشرده‌سازی، زیاد نباشد
    const res = await launchCamera({ quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    setImg({ name: a.fileName || 'photo.jpg', uri: a.uri, type: a.mimeType || 'image/jpeg' });
  }
  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('دسترسی', 'دسترسی به گالری لازم است.');
    const res = await launchLibrary({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    setImg({ name: a.fileName || 'photo.jpg', uri: a.uri, type: a.mimeType || 'image/jpeg' });
  }
  function addImage() {
    if (enabled(cfg.notice_camera_only)) { pickFromCamera(); return; }
    Alert.alert('افزودن تصویر', 'منبع تصویر را انتخاب کنید', [
      { text: 'دوربین', onPress: pickFromCamera },
      { text: 'گالری', onPress: pickFromGallery },
      { text: 'انصراف', style: 'cancel' },
    ]);
  }

  async function submit() {
    if (!reasonId) return Alert.alert('توجه', 'دلیل تذکر را انتخاب کنید.');
    if (enabled(cfg.notice_require_photo) && !img) return Alert.alert('توجه', 'پیوست عکس برای ثبت تذکر الزامی است.');
    try {
      let r;
      const fields = {
        driver_id: driver.id,
        reason_id: reasonId || '',
        priority,
        body,
        send_sms: sendSms && enabled(cfg.notice_sms_enabled) && enabled(cfg.can_send_sms) ? '1' : '0',
      };
      if (img && typeof img.uri === 'string' && img.uri.trim()) {
        // ارسال تصویر تذکر عمداً فقط به‌صورت JSON/Base64 انجام می‌شود.
        // شیء فایل React Native به FormData افزوده نمی‌شود تا خطای
        // Unsupported FormDataPart implementation در Hermes/React Native رخ ندهد.
        const attachmentData = await compressToDataUri(img.uri.trim(), { maxW: 1280, quality: 70 });
        if (!attachmentData || typeof attachmentData !== 'string' || !attachmentData.startsWith('data:image/')) {
          throw new Error('آماده‌سازی تصویر تذکر ناموفق بود. تصویر را دوباره ثبت کنید.');
        }
        r = await request('/notices', {
          method: 'POST',
          body: {
            ...fields,
            send_bot: sendBot && enabled(cfg.can_send_messenger) && cfg.notice_bot_enabled !== false ? '1' : '0',
            attachment_name: String(img.name || 'notice.jpg'),
            attachment_data: attachmentData,
          },
        });
      } else {
        r = await request('/notices', {
          method: 'POST',
          body: {
            ...fields,
            send_bot: sendBot && enabled(cfg.can_send_messenger) && cfg.notice_bot_enabled !== false ? '1' : '0',
          },
        });
      }
      let msg = 'تذکر ثبت شد.';
      if (r.sms && r.sms.ok) msg += '\nپیامک برای راننده ارسال شد.';
      else if (r.sms_debug) msg += '\n\nعدم ارسال پیامک: ' + r.sms_debug;
      else if (r.sms && r.sms.error) msg += '\n\nخطای پیامک: ' + r.sms.error;
      Alert.alert('ثبت شد', msg);
      navigation.goBack();
    } catch (e) {
      Alert.alert('خطا', e.message || 'ثبت تذکر ناموفق بود.');
    }
  }

  const showSmsBox = enabled(cfg.notice_sms_enabled) && enabled(cfg.can_send_sms);

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.label}>دلیل تذکر</Text>
      <View style={s.chips}>
        {reasons.map((r) => {
          const locked = isAboneman;
          const active = reasonId === r.id;
          return (
            <TouchableOpacity key={r.id} disabled={locked} onPress={() => setReasonId(r.id)}
              style={[s.chip, active && { backgroundColor: C.brand, borderColor: C.brand }, locked && !active && { opacity: 0.4 }]}>
              <Text style={[s.chipTxt, active && { color: '#fff' }]}>{r.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {isAboneman && <Text style={s.hint}>دلیل «بدهی آبونمان» و اولویت «متوسط» به‌صورت خودکار انتخاب شد؛ فقط متن تذکر را بنویسید.</Text>}

      <Text style={s.label}>متن تذکر</Text>
      <TextInput style={s.input} value={body} onChangeText={setBody} multiline placeholder="توضیحات…" placeholderTextColor={C.muted} />

      <Text style={s.label}>اولویت</Text>
      <View style={s.opts}>
        {PRIORITIES.map((p) => {
          const active = priority === p.k;
          return (
            <TouchableOpacity key={p.k} disabled={isAboneman} onPress={() => setPriority(p.k)}
              style={[s.opt, active && { backgroundColor: C.taxi, borderColor: C.taxi }, isAboneman && !active && { opacity: 0.4 }]}>
              <Text style={[s.optTxt, active && { color: C.taxiInk }]}>{p.t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.label}>پیوست تصویر {enabled(cfg.notice_require_photo) ? '(الزامی)' : '(اختیاری)'}{enabled(cfg.notice_camera_only) ? ' — فقط دوربین' : ''}</Text>
      <TouchableOpacity style={s.attach} onPress={addImage}><Text style={s.attachTxt}>{img ? 'تصویر انتخاب شد ✓ (تعویض)' : '+ افزودن تصویر'}</Text></TouchableOpacity>
      {img && <Image source={{ uri: img.uri }} style={{ width: '100%', height: 160, borderRadius: 12, marginTop: 8 }} />}

      {enabled(cfg.can_send_messenger) && cfg.notice_bot_enabled !== false && (
        <View style={s.smsRow}>
          <Switch value={sendBot} onValueChange={setSendBot} trackColor={{ true: '#3b5bd6' }} />
          <Text style={s.smsTxt}>ارسال تذکر در ربات‌های متصل راننده</Text>
        </View>
      )}

      {showSmsBox && (
        <View style={s.smsRow}>
          <Switch value={sendSms} onValueChange={setSendSms} trackColor={{ true: C.brand }} />
          <Text style={s.smsTxt}>ارسال تذکر به‌وسیلهٔ پیامک به راننده</Text>
        </View>
      )}

      <TouchableOpacity style={s.btn} onPress={submit}><Text style={s.btnTxt}>ثبت تذکر</Text></TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 8, marginTop: 6, textAlign: 'right' },
  hint: { fontFamily: FONT.regular, color: C.brand, fontSize: 11.5, marginTop: 6, textAlign: 'right' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: C.line, borderWidth: 1, backgroundColor: '#fff', borderRadius: 99, paddingVertical: 7, paddingHorizontal: 13 },
  chipTxt: { fontFamily: FONT.regular, fontSize: 12.5, color: C.ink },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, minHeight: 90, textAlign: 'right', textAlignVertical: 'top', fontFamily: FONT.regular, color: C.ink },
  opts: { flexDirection: 'row-reverse', gap: 8 },
  opt: { flex: 1, borderColor: C.line, borderWidth: 1, backgroundColor: '#fff', borderRadius: 11, padding: 10, alignItems: 'center' },
  optTxt: { fontFamily: FONT.bold, fontSize: 13, color: C.ink },
  attach: { backgroundColor: '#eef1f7', borderRadius: 12, padding: 12, alignItems: 'center' },
  attachTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  smsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: '#eef7f3', borderRadius: 12, padding: 12 },
  smsTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13, flex: 1, textAlign: 'right' },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
});
