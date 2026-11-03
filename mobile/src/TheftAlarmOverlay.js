import React from 'react';
import { Alert, NativeModules, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT } from './theme';
import { getLockConfig, verifyLockCredential } from './AppLock';

const nativeAlarm = NativeModules.KhatyarTheftAlarm;
const emptyStatus = { armed: false, triggered: false, reason: '' };
const labels = { pin4: 'پین چهاررقمی', numeric: 'رمز عددی', password: 'رمز عبور', pattern: 'الگوی قفل' };

export async function getTheftAlarmStatus() {
  if (!nativeAlarm?.status) return emptyStatus;
  return nativeAlarm.status();
}

export default function TheftAlarmOverlay({ onClose, initialStatus }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = React.useState(initialStatus || emptyStatus);
  const [config, setConfig] = React.useState(null);
  const [value, setValue] = React.useState('');
  const [pattern, setPattern] = React.useState([]);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    getLockConfig().then(x => mounted && setConfig(x));
    const refresh = () => getTheftAlarmStatus().then(x => mounted && setStatus(x)).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 850);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  React.useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const arm = async () => {
    if (busy) return;
    if (!config?.enabled) {
      Alert.alert('ابتدا قفل برنامه را فعال کنید', 'برای امنیت دزدگیر، از تنظیمات خطیار یک پین، رمز یا الگو تعیین کنید.');
      return;
    }
    if (!nativeAlarm?.arm) {
      Alert.alert('دزدگیر در دسترس نیست', 'این قابلیت به نسخه جدید اندروید خطیار نیاز دارد.');
      return;
    }
    setBusy(true);
    try {
      await nativeAlarm.arm();
      setStatus(await getTheftAlarmStatus());
      setError('');
    } catch (_) { Alert.alert('فعال‌سازی ناموفق', 'سرویس دزدگیر فعال نشد. دسترسی اعلان‌ها و تنظیمات باتری را بررسی کنید.'); }
    finally { setBusy(false); }
  };

  const disarm = async (credential) => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    try {
      const result = await verifyLockCredential(credential, config?.type);
      if (!result.ok) {
        setCooldown(Math.ceil(result.waitMs / 1000));
        setError(result.waitMs ? 'تلاش‌های ناموفق زیاد است؛ کمی صبر کنید.' : 'رمز یا الگوی واردشده صحیح نیست.');
        setValue(''); setPattern([]);
        return;
      }
      await nativeAlarm.disarm();
      setStatus(emptyStatus);
      onClose();
    } catch (_) { setError('خاموش‌کردن دزدگیر ممکن نشد. دوباره تلاش کنید.'); }
    finally { setBusy(false); }
  };

  const handleClose = () => {
    if (!status.armed) onClose();
    else Alert.alert('دزدگیر فعال است', 'برای غیرفعال‌سازی و قطع آژیر، رمز قفل برنامه را وارد کنید.');
  };
  const alarmed = status.triggered;
  const type = config?.type || 'pin4';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن دزدگیر" onPress={handleClose} style={styles.close}>
          <MaterialCommunityIcons name="close" size={23} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.heading}>دزدگیر خطیار</Text>
        <MaterialCommunityIcons name="shield-lock-outline" size={27} color={C.brand} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, alarmed && styles.heroAlert, status.armed && !alarmed && styles.heroArmed]}>
          <View style={[styles.heroIcon, alarmed && styles.heroIconAlert]}>
            <MaterialCommunityIcons name={alarmed ? 'alarm-light' : status.armed ? 'shield-check' : 'shield-lock'} size={45} color={alarmed ? '#B91C1C' : C.brand} />
          </View>
          <Text style={styles.heroTitle}>{alarmed ? 'هشدار! آژیر فعال شد' : status.armed ? 'دزدگیر روشن است' : 'دزدگیر خاموش است'}</Text>
          <Text style={styles.heroSub}>
            {alarmed ? status.reason === 'charger' ? 'شارژر گوشی جدا شده است.' : 'حرکت گوشی تشخیص داده شده است.' : status.armed ? 'گوشی تحت مراقبت است. برای پایان مراقبت رمز را وارد کنید.' : 'برای حفاظت از گوشی، دزدگیر را فعال کنید.'}
          </Text>
        </View>

        {!status.armed ? <>
          <View style={styles.infoCard}>
            <Info icon="power-plug-off-outline" text="هنگام جداشدن شارژر (اگر گوشی هنگام فعال‌سازی به برق باشد) آژیر پخش می‌شود." />
            <Info icon="motion-sensor" text="با حرکت محسوس گوشی نیز آژیر پخش می‌شود؛ ۵ ثانیه برای قرار دادن گوشی فرصت دارید." />
            <Info icon="lock-check-outline" text="برای توقف آژیر، رمز یا الگوی قفل خطیار لازم است." />
          </View>
          {!config?.enabled && <Text style={styles.notice}>قفل برنامه فعال نیست. ابتدا از تنظیمات خطیار یک روش قفل تعیین کنید.</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="روشن کردن دزدگیر" disabled={busy || !config?.enabled} onPress={arm} style={[styles.primary, (busy || !config?.enabled) && styles.disabled]}>
            <MaterialCommunityIcons name="shield-check-outline" size={23} color="#fff" />
            <Text style={styles.primaryText}>فعال‌سازی دزدگیر</Text>
          </TouchableOpacity>
        </> : <View style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>خاموش کردن دزدگیر</Text>
          <Text style={styles.verifyHint}>برای خاموش‌کردن، {labels[type] || 'رمز'} فعلی برنامه را وارد کنید.</Text>
          {type === 'pattern' ? <>
            <Text style={styles.patternHint}>نقاط الگو را به‌ترتیب انتخاب کنید.</Text>
            <View style={styles.patternGrid}>
              {Array.from({length:9}, (_,i) => i+1).map(n => <TouchableOpacity key={n} accessibilityRole="button" accessibilityLabel={`نقطه ${n}`} disabled={busy || cooldown>0} onPress={() => setPattern(p => p.includes(n) ? p : [...p,n])} style={[styles.patternNode,pattern.includes(n)&&styles.patternNodeActive]}><Text style={[styles.patternText,pattern.includes(n)&&styles.patternTextActive]}>{pattern.indexOf(n)>=0?pattern.indexOf(n)+1:'●'}</Text></TouchableOpacity>)}
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => setPattern([])} style={styles.reset}><Text style={styles.resetText}>پاک کردن الگو</Text></TouchableOpacity>
          </> : <TextInput style={styles.input} autoFocus={false} secureTextEntry placeholder={labels[type]} placeholderTextColor="#64748B" value={value} onChangeText={setValue} keyboardType={type === 'password' ? 'default' : 'number-pad'} autoCapitalize="none" autoCorrect={false} maxLength={type === 'pin4' ? 4 : 32} editable={!busy && !cooldown} accessibilityLabel="رمز قفل برنامه" />}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!cooldown && <Text style={styles.error}>{cooldown} ثانیه تا تلاش بعدی</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="تأیید رمز و خاموش کردن آژیر" disabled={busy || cooldown>0 || (type==='pattern' ? pattern.length<4 : !value)} onPress={() => disarm(type==='pattern'?pattern.join('-'):value)} style={[styles.primary,(busy || cooldown>0)&&styles.disabled]}>
            <MaterialCommunityIcons name="lock-open-check-outline" size={23} color="#fff" />
            <Text style={styles.primaryText}>تأیید و خاموش کردن</Text>
          </TouchableOpacity>
        </View>}
        <Text style={styles.footer}>هشدار امنیتی · استفاده از حسگر حرکت ممکن است مصرف باتری را افزایش دهد.</Text>
      </ScrollView>
    </View>
  );
}

function Info({icon,text}) { return <View style={styles.infoRow}><MaterialCommunityIcons name={icon} size={22} color={C.brand} /><Text style={styles.infoText}>{text}</Text></View>; }

const styles=StyleSheet.create({
  root:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'#F4F8F7',zIndex:10000,elevation:10000},
  header:{paddingHorizontal:20,minHeight:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  heading:{fontFamily:FONT.bold,fontSize:19,color:C.ink},close:{width:48,height:48,borderRadius:24,backgroundColor:'#E7EEEB',alignItems:'center',justifyContent:'center'},
  content:{padding:20,paddingBottom:35,gap:18},
  hero:{borderRadius:24,padding:28,minHeight:218,alignItems:'center',justifyContent:'center',backgroundColor:'#E5EFEA',borderWidth:1,borderColor:'#C8DED3'},
  heroArmed:{backgroundColor:'#E5F4E9',borderColor:'#9CDAB2'},heroAlert:{backgroundColor:'#FFF1F0',borderColor:'#F7B9B4'},
  heroIcon:{width:82,height:82,borderRadius:26,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center',marginBottom:14},heroIconAlert:{backgroundColor:'#FEE2E2'},
  heroTitle:{fontFamily:FONT.bold,fontSize:20,color:'#173C33',textAlign:'center'},heroSub:{fontFamily:FONT.regular,fontSize:14,color:'#475569',textAlign:'center',marginTop:10,lineHeight:24},
  infoCard:{backgroundColor:'#FFFFFF',borderRadius:20,padding:17,gap:18,borderWidth:1,borderColor:'#DDE6E1'},
  infoRow:{flexDirection:'row-reverse',alignItems:'center',gap:12},infoText:{flex:1,textAlign:'right',writingDirection:'rtl',fontFamily:FONT.regular,color:'#334155',fontSize:14,lineHeight:24},
  notice:{fontFamily:FONT.regular,color:'#B45309',textAlign:'center',fontSize:13,lineHeight:22},
  primary:{minHeight:56,borderRadius:16,backgroundColor:C.brand,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:10},primaryText:{fontFamily:FONT.bold,fontSize:16,color:'#FFFFFF'},disabled:{opacity:0.45},
  verifyCard:{backgroundColor:'#FFFFFF',borderRadius:22,padding:20,gap:14,borderWidth:1,borderColor:'#DDE6E1'},verifyTitle:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right'},verifyHint:{fontFamily:FONT.regular,color:'#475569',fontSize:13,textAlign:'right',lineHeight:22},
  input:{minHeight:54,borderWidth:1,borderColor:'#AFC4BA',borderRadius:13,color:'#0F172A',fontSize:18,textAlign:'center',backgroundColor:'#F8FAFC'},error:{color:'#B91C1C',fontFamily:FONT.regular,fontSize:13,textAlign:'center'},
  patternGrid:{width:224,alignSelf:'center',flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:18,marginVertical:8},patternNode:{width:60,height:60,borderRadius:30,borderWidth:2,borderColor:'#9DB6AA',backgroundColor:'#EDF5F0',justifyContent:'center',alignItems:'center'},patternNodeActive:{backgroundColor:C.brand,borderColor:C.brand},patternText:{fontSize:22,color:'#57786A'},patternTextActive:{color:'#FFFFFF'},patternHint:{fontFamily:FONT.regular,fontSize:12,textAlign:'center',color:'#64748B'},reset:{minHeight:44,alignItems:'center',justifyContent:'center'},resetText:{color:C.brand,fontFamily:FONT.bold},
  footer:{fontFamily:FONT.regular,fontSize:12,color:'#64748B',textAlign:'center',lineHeight:21},
});
