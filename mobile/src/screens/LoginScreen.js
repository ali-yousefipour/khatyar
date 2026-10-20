import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert, AppState, Image } from 'react-native';
import { useAuth } from '../auth';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function LoginScreen() {
  const { login, appLoginConfig, appLoginOtpRequest, appLoginOtpVerify } = useAuth();
  const [loginMethod, setLoginMethod] = useState('password');
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [configRetry, setConfigRetry] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [fid, setFid] = useState('');
  const otpSubmitting = useRef(false);
  const cooldownTimer = useRef(null);
  const normalizeDigits = value => String(value ?? '').replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, ch => String(ch.charCodeAt(0) - 1632));

  useEffect(() => {
    let alive = true;
    setConfigLoading(true);
    setConfigError('');
    appLoginConfig().then(x => {
      if (!alive) return;
      if (!['password','sms_otp','bale_otp'].includes(x?.method)) { setConfigError('تنظیمات روش ورود از سرور معتبر نیست. لطفاً با مدیر سامانه تماس بگیرید.'); return; }
      setLoginMethod(x.method);
    }).catch((error) => {
      if (alive) setConfigError('دریافت روش ورود از سرور انجام نشد. ' + (error?.message || 'اتصال اینترنت و دسترسی سرور را بررسی کنید.') + ' — لطفاً دوباره تلاش کنید.');
    }).finally(() => alive && setConfigLoading(false));
    return () => { alive = false; };
  }, [configRetry]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && mode === 'login') setConfigRetry(v => v + 1);
    });
    return () => subscription.remove();
  }, [mode]);
  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  async function onLogin() {
    if (busy || configLoading || configError) return Alert.alert('خطا', 'روش ورود از سرور دریافت نشده است یا درخواست دیگری در حال انجام است.');
    if (!username.trim()) return Alert.alert('توجه', 'نام کاربری (کد ملی) را وارد کنید.');
    if (loginMethod !== 'password') return onOtpRequest();
    if (!password) return Alert.alert('توجه', 'رمز عبور را وارد کنید.');
    setBusy(true);
    try { await login(username.trim(), password, remember); }
    catch (e) { Alert.alert('ورود ناموفق', e.message); }
    finally { setBusy(false); }
  }

  async function onOtpRequest() {
    if (busy || configLoading || configError || loginMethod === 'password') return;
    if (!username.trim()) return Alert.alert('توجه', 'نام کاربری (کد ملی) را وارد کنید.');
    setBusy(true);
    try {
      await appLoginOtpRequest(username.trim());
      setCode('');
      setMode('otp-code');
      setOtpCooldown(60);
      Alert.alert('ارسال شد', loginMethod === 'bale_otp' ? 'کد ورود از طریق ربات بله برای شما ارسال شد.' : 'کد ورود به شماره همراه ثبت‌شده شما پیامک شد.');
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
      cooldownTimer.current = setInterval(() => {
        setOtpCooldown(v => { if (v <= 1) { clearInterval(cooldownTimer.current); cooldownTimer.current = null; return 0; } return v - 1; });
      }, 1000);
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  async function onOtpVerify(value) {
    if (otpSubmitting.current || busy || configError || configLoading) return;
    const c = normalizeDigits(value ?? code).replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(c)) return Alert.alert('توجه', 'کد ۶ رقمی را کامل وارد کنید.');
    otpSubmitting.current = true;
    setBusy(true);
    try { await appLoginOtpVerify(username.trim(), c); }
    catch (e) { Alert.alert('ورود ناموفق', e.message); }
    finally { otpSubmitting.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (mode === 'otp-code' && /^\d{6}$/.test(code) && !busy && !otpSubmitting.current) onOtpVerify(code);
  }, [code]);

  async function onForgot() {
    if (!fid.trim()) return Alert.alert('توجه', 'نام کاربری (کد ملی) را وارد کنید.');
    setBusy(true);
    try {
      await request('/auth/forgot-password', { method: 'POST', auth: false, body: { username: fid.trim() } });
      Alert.alert('ارسال شد', 'اگر نام کاربری معتبر باشد، کد بازیابی به موبایل ثبت‌شده شما پیامک شد.');
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
      setMode('login'); setPassword(''); setCode('');
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  const methodLabel = loginMethod === 'bale_otp' ? 'ربات بله' : loginMethod === 'sms_otp' ? 'پیامک' : 'نام کاربری و کلمه عبور';

  return (
    <View style={s.wrap}>
      <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" accessibilityLabel="لوگوی خطیار" />
      <Text style={s.title}>خطیار</Text>
      <Text style={s.sub}>مشهد</Text>
      {configLoading ? <ActivityIndicator fullScreen size={90} message="در حال دریافت روش ورود…" /> : configError ? (
        <View style={{padding:18,alignItems:'center'}}><Text style={[s.note,{color:'#b42318',textAlign:'center'}]}>{configError}</Text><TouchableOpacity style={s.btn} onPress={()=>setConfigRetry(v=>v+1)}><Text style={s.btnTxt}>تلاش مجدد برای دریافت تنظیمات</Text></TouchableOpacity></View>
      ) : mode === 'login' ? (
        <>
          <Text style={s.label}>نام کاربری (کد ملی)</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername} keyboardType="number-pad" placeholder="کد ملی" placeholderTextColor={C.muted} autoCapitalize="none" />
          {loginMethod === 'password' ? (
            <>
              <Text style={s.label}>رمز عبور</Text>
              <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="رمز عبور" placeholderTextColor={C.muted} />
              <View style={s.remember}>
                <Switch value={remember} onValueChange={setRemember} trackColor={{ true: C.brand }} thumbColor="#fff" />
                <Text style={s.rememberTxt}>مرا به خاطر بسپار (ورود خودکار)</Text>
              </View>
              <TouchableOpacity style={s.btn} onPress={onLogin} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ورود</Text>}</TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('forgot')} style={s.link}><Text style={s.linkTxt}>رمز عبور را فراموش کرده‌ام</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.note}>روش ورود فعال: <Text style={{fontFamily: FONT.bold}}>{methodLabel}</Text></Text>
              <TouchableOpacity style={s.btn} onPress={onOtpRequest} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>دریافت رمز یک‌بارمصرف</Text>}</TouchableOpacity>
            </>
          )}
          <Text style={s.note}>روش ورود اپلیکیشن توسط مدیر سامانه تعیین می‌شود و ورود با روش دیگری امکان‌پذیر نیست.</Text>
        </>
      ) : mode === 'otp-code' ? (
        <>
          <Text style={s.label}>کد ۶ رقمی ورود</Text>
          <TextInput style={[s.input,{textAlign:'center',fontSize:22,letterSpacing:6}]} value={code} onChangeText={t=>setCode(normalizeDigits(t).replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode" placeholder="------" placeholderTextColor={C.muted} autoFocus />
          <TouchableOpacity style={s.btn} onPress={()=>onOtpVerify()} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ورود</Text>}</TouchableOpacity>
          <TouchableOpacity onPress={onOtpRequest} disabled={busy || otpCooldown > 0} style={s.link}><Text style={[s.linkTxt,{color:otpCooldown>0?C.muted:C.brand}]}>{otpCooldown > 0 ? 'ارسال مجدد کد ('+otpCooldown+' ثانیه)' : 'ارسال مجدد کد'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>{setCode('');setMode('login');setConfigRetry(v=>v+1)}} style={s.link}><Text style={{color:C.muted,fontFamily:FONT.regular}}>بازگشت</Text></TouchableOpacity>
        </>
      ) : mode === 'forgot' ? (
        <>
          <Text style={s.label}>نام کاربری (کد ملی)</Text>
          <TextInput style={s.input} value={fid} onChangeText={setFid} keyboardType="number-pad" placeholder="کد ملی" placeholderTextColor={C.muted} />
          <Text style={s.note}>کد بازیابی به شماره موبایل ثبت‌شده شما پیامک می‌شود.</Text>
          <TouchableOpacity style={s.btn} onPress={onForgot} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>ارسال کد بازیابی</Text>}</TouchableOpacity>
          <TouchableOpacity onPress={()=>setMode('login')} style={s.link}><Text style={{color:C.muted,fontFamily:FONT.regular}}>بازگشت به ورود</Text></TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.label}>کد بازیابی (پیامک‌شده)</Text>
          <TextInput style={s.input} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="کد ۵ رقمی" placeholderTextColor={C.muted} />
          <Text style={s.label}>رمز عبور جدید</Text>
          <TextInput style={s.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="حداقل ۶ کاراکتر" placeholderTextColor={C.muted} />
          <TouchableOpacity style={s.btn} onPress={onReset} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.btnTxt}>تغییر رمز عبور</Text>}</TouchableOpacity>
          <TouchableOpacity onPress={()=>setMode('login')} style={s.link}><Text style={{color:C.muted,fontFamily:FONT.regular}}>بازگشت به ورود</Text></TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:{flex:1,backgroundColor:C.paper,padding:26,justifyContent:'center'},
  logo:{width:72,height:72,borderRadius:22,backgroundColor:C.brand,alignSelf:'center',alignItems:'center',justifyContent:'center'},
  logoTxt:{color:'#fff',fontSize:30,fontFamily:FONT.bold},
  title:{fontFamily:FONT.bold,fontSize:18,textAlign:'center',marginTop:16,color:C.ink},
  sub:{textAlign:'center',color:C.muted,marginBottom:26,fontFamily:FONT.regular},
  label:{fontFamily:FONT.regular,color:C.muted,fontSize:13,marginBottom:6,textAlign:'right'},
  input:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:13,padding:13,marginBottom:16,textAlign:'right',fontFamily:FONT.regular,color:C.ink},
  remember:{flexDirection:'row-reverse',alignItems:'center',gap:10,marginBottom:20},
  rememberTxt:{fontFamily:FONT.regular,color:C.ink,fontSize:13},
  btn:{backgroundColor:C.brand,borderRadius:14,padding:15,alignItems:'center'},
  btnTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:15},
  link:{marginTop:14,alignItems:'center'},
  linkTxt:{color:C.brand,fontFamily:FONT.regular},
  note:{color:C.muted,fontSize:11,textAlign:'center',marginTop:18,fontFamily:FONT.regular}
});
