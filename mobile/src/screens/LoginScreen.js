import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useAuth } from '../auth';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function LoginScreen() {
  const { login, loginOtpRequest, loginOtpVerify } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login'); // login | forgot | reset | otp | otp-code
  const [fid, setFid] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [otpMobile, setOtpMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  async function onLogin() {
    setBusy(true);
    try { await login(username.trim(), password, remember); }
    catch (e) { Alert.alert('ورود ناموفق', e.message); }
    finally { setBusy(false); }
  }
  async function onOtpRequest() {
    if (!otpMobile.trim()) return Alert.alert('توجه', 'شمارهٔ موبایل را وارد کنید.');
    setBusy(true);
    try {
      await loginOtpRequest(otpMobile.trim());
      Alert.alert('ارسال شد', 'کد ورود به شمارهٔ شما پیامک شد.');
      setMode('otp-code');
      setOtpCooldown(60);
      const timer = setInterval(() => {
        setOtpCooldown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
      }, 1000);
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }
  async function onOtpVerify(codeOverride) {
    const c = (codeOverride ?? otpCode).trim();
    if (!/^\d{6}$/.test(c)) return Alert.alert('توجه', 'کد ۶ رقمی را کامل وارد کنید.');
    setBusy(true);
    try { await loginOtpVerify(otpMobile.trim(), c); }
    catch (e) { Alert.alert('ورود ناموفق', e.message); }
    finally { setBusy(false); }
  }
  // وقتی کد ۶ رقمی کامل تایپ/پرشد (چه با تایپ دستی و چه با AutoFill خودکار پیامک اندروید)
  // بلافاصله تلاش برای ورود انجام می‌شود — نیازی به لمس دکمهٔ جداگانه نیست.
  useEffect(() => {
    if (mode === 'otp-code' && /^\d{6}$/.test(otpCode.trim()) && !busy) onOtpVerify(otpCode);
  }, [otpCode]);
  async function onForgot() {
    if (!fid.trim()) return Alert.alert('توجه', 'نام کاربری (کد ملی) را وارد کنید.');
    setBusy(true);
    try {
      await request('/auth/forgot-password', { method: 'POST', auth: false, body: { username: fid.trim() } });
      Alert.alert('ارسال شد', 'اگر نام کاربری معتبر باشد، کد بازیابی به موبایل ثبت‌شدهٔ شما پیامک شد.');
      setMode('reset');
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }
  async function onReset() {
    if (!code.trim() || newPw.length < 6) return Alert.alert('توجه', 'کد بازیابی و رمز جدید (حداقل ۶ کاراکتر) را وارد کنید.');
    setBusy(true);
    try {
      await request('/auth/reset-password', { method: 'POST', auth: false, body: { username: fid.trim(), code: code.trim(), password: newPw } });
      Alert.alert('انجام شد', 'رمز با موفقیت تغییر کرد. اکنون وارد شوید.');
      setMode('login'); setPassword('');
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={s.wrap}>
      <View style={s.logo}><Text style={s.logoTxt}>ت</Text></View>
      <Text style={s.title}>خطیار</Text>
      <Text style={s.sub}>مشهد</Text>

      {mode === 'login' ? (
        <>
          <Text style={s.label}>نام کاربری (کد ملی)</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername}
            keyboardType="number-pad" placeholder="کد ملی" placeholderTextColor={C.muted} />
          <Text style={s.label}>رمز عبور</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="رمز عبور" placeholderTextColor={C.muted} />
          <View style={s.remember}>
            <Switch value={remember} onValueChange={setRemember} trackColor={{ true: C.brand }} thumbColor="#fff" />
            <Text style={s.rememberTxt}>مرا به خاطر بسپار (ورود خودکار)</Text>
          </View>
          <TouchableOpacity style={s.btn} onPress={onLogin} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ورود</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('forgot')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: C.brand, fontFamily: FONT.regular }}>رمز عبور را فراموش کرده‌ام</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMode('otp'); setOtpCode(''); }} style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ color: C.brand, fontFamily: FONT.bold }}>ورود با کد پیامکی (بدون رمز عبور)</Text>
          </TouchableOpacity>
          <Text style={s.note}>بسته به تنظیمات سازمان، ورود با VPN روشن، حالت توسعه‌دهنده فعال یا GPS خاموش ممکن است مجاز نباشد.</Text>
        </>
      ) : mode === 'otp' ? (
        <>
          <Text style={s.label}>شمارهٔ موبایل ثبت‌شده</Text>
          <TextInput style={s.input} value={otpMobile} onChangeText={setOtpMobile}
            keyboardType="phone-pad" autoComplete="tel" placeholder="مثلاً 09121234567" placeholderTextColor={C.muted} />
          <Text style={s.note}>یک کد ۶ رقمی به این شماره پیامک می‌شود و در صورت وجود مجوز خواندن خودکار، خودش وارد می‌شود.</Text>
          <TouchableOpacity style={s.btn} onPress={onOtpRequest} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ارسال کد</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontFamily: FONT.regular }}>بازگشت به ورود با رمز عبور</Text>
          </TouchableOpacity>
        </>
      ) : mode === 'otp-code' ? (
        <>
          <Text style={s.label}>کد ۶ رقمیِ پیامک‌شده</Text>
          <TextInput
            style={[s.input, { textAlign: 'center', fontSize: 22, letterSpacing: 6 }]}
            value={otpCode} onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad" maxLength={6}
            // این دو ویژگیِ built-in خودِ ری‌اکت‌نیتیو (بدون نیاز به هیچ کتابخانه/ماژول بومیِ
            // جدید) باعث می‌شود سیستم‌عامل اندروید کد پیامک‌شده را تشخیص داده و کاملاً
            // خودکار (بدون دخالت کاربر) در همین فیلد پر کند.
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            placeholder="------" placeholderTextColor={C.muted} autoFocus
          />
          <TouchableOpacity style={s.btn} onPress={() => onOtpVerify()} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ورود</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onOtpRequest} disabled={busy || otpCooldown > 0} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: otpCooldown > 0 ? C.muted : C.brand, fontFamily: FONT.regular }}>
              {otpCooldown > 0 ? `ارسال مجدد کد (${otpCooldown} ثانیه)` : 'ارسال مجدد کد'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontFamily: FONT.regular }}>بازگشت به ورود با رمز عبور</Text>
          </TouchableOpacity>
        </>
      ) : mode === 'forgot' ? (
        <>
          <Text style={s.label}>نام کاربری (کد ملی)</Text>
          <TextInput style={s.input} value={fid} onChangeText={setFid}
            keyboardType="number-pad" placeholder="کد ملی" placeholderTextColor={C.muted} />
          <Text style={s.note}>کد بازیابی به شمارهٔ موبایل ثبت‌شدهٔ شما پیامک می‌شود.</Text>
          <TouchableOpacity style={s.btn} onPress={onForgot} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ارسال کد بازیابی</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontFamily: FONT.regular }}>بازگشت به ورود</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.label}>کد بازیابی (پیامک‌شده)</Text>
          <TextInput style={s.input} value={code} onChangeText={setCode}
            keyboardType="number-pad" placeholder="کد ۵ رقمی" placeholderTextColor={C.muted} />
          <Text style={s.label}>رمز عبور جدید</Text>
          <TextInput style={s.input} value={newPw} onChangeText={setNewPw}
            secureTextEntry placeholder="حداقل ۶ کاراکتر" placeholderTextColor={C.muted} />
          <TouchableOpacity style={s.btn} onPress={onReset} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>تغییر رمز عبور</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('login')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontFamily: FONT.regular }}>بازگشت به ورود</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, padding: 26, justifyContent: 'center' },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: C.brand, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  logoTxt: { color: '#fff', fontSize: 30, fontFamily: FONT.bold },
  title: { fontFamily: FONT.bold, fontSize: 18, textAlign: 'center', marginTop: 16, color: C.ink },
  sub: { textAlign: 'center', color: C.muted, marginBottom: 26, fontFamily: FONT.regular },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 16, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  remember: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 20 },
  rememberTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  note: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 18, fontFamily: FONT.regular },
});
