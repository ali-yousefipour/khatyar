import React,{useState}from'react';
import{View,Text,TextInput,TouchableOpacity,StyleSheet,Alert,ScrollView}from'react-native';
import{C as CC,FONT}from'../theme';
import{getLockConfig,setLockConfig,setLockSecret,validateLockSecret}from'../AppLock';

export default function AppLockSetupScreen({onConfigured}){
 const[type,setType]=useState('pin4'),[secret,setSecret]=useState(''),[confirm,setConfirm]=useState(''),[saving,setSaving]=useState(false);
 const methods=[['pin4','پین ۴ رقمی'],['numeric','رمز عددی'],['password','رمز حروفی و عددی']];
 const save=async()=>{
  const error=validateLockSecret(type,secret);
  if(error){Alert.alert('رمز نامعتبر',error);return}
  if(secret!==confirm){Alert.alert('عدم تطابق','رمز و تکرار آن یکسان نیستند.');return}
  setSaving(true);
  try{const cfg=await getLockConfig();await setLockSecret(secret);await setLockConfig({...cfg,enabled:true,type,timeoutSeconds:30});onConfigured?.()}
  catch{Alert.alert('خطا','ذخیره قفل ممکن نشد. دوباره تلاش کنید.')}
  finally{setSaving(false)}
 };
 const numeric=type!=='password';
 return<ScrollView style={styles.page}contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
  <View style={styles.shield}><Text style={styles.shieldText}>🔒</Text></View>
  <Text style={styles.title}>راه‌اندازی قفل خطیار</Text>
  <Text style={styles.desc}>برای حفاظت از اطلاعات رانندگان و ارتباط بی‌سیم، پیش از ورود به برنامه قفل شخصی خود را تنظیم کنید. این مرحله اجباری است.</Text>
  <Text style={styles.label}>روش قفل</Text>
  <View style={styles.methods}>{methods.map(([id,label])=><TouchableOpacity accessibilityRole="button" key={id} onPress={()=>{setType(id);setSecret('');setConfirm('')}} style={[styles.method,type===id&&styles.selected]}><Text style={[styles.methodText,type===id&&styles.selectedText]}>{label}</Text></TouchableOpacity>)}</View>
  <Text style={styles.label}>رمز جدید</Text>
  <TextInput accessibilityLabel="رمز جدید قفل" value={secret} onChangeText={setSecret} secureTextEntry keyboardType={numeric?'number-pad':'default'} maxLength={type==='pin4'?4:type==='numeric'?16:32} style={styles.input} autoCapitalize="none" autoCorrect={false} placeholder={type==='pin4'?'۴ رقم':numeric?'۵ تا ۱۶ رقم':'حروف انگلیسی و عدد'} textAlign="center"/>
  <Text style={styles.label}>تکرار رمز</Text>
  <TextInput accessibilityLabel="تکرار رمز قفل" value={confirm} onChangeText={setConfirm} secureTextEntry keyboardType={numeric?'number-pad':'default'} maxLength={type==='pin4'?4:type==='numeric'?16:32} style={styles.input} autoCapitalize="none" autoCorrect={false} placeholder="رمز را دوباره وارد کنید" textAlign="center"/>
  <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={save} style={[styles.submit,saving&&{opacity:.6}]}><Text style={styles.submitText}>{saving?'در حال ذخیره…':'ذخیره قفل و ورود به خطیار'}</Text></TouchableOpacity>
  <Text style={styles.help}>زمان پیش‌فرض قفل خودکار ۳۰ ثانیه است؛ پس از ورود از تنظیمات می‌توانید آن را تغییر دهید.</Text>
 </ScrollView>
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:CC.paper},body:{padding:22,paddingTop:38,paddingBottom:48},shield:{alignSelf:'center',width:80,height:80,borderRadius:26,alignItems:'center',justifyContent:'center',backgroundColor:'#e4f3ee',marginBottom:18},shieldText:{fontSize:37},title:{fontFamily:FONT.bold,fontSize:22,color:CC.ink,textAlign:'center'},desc:{fontFamily:FONT.regular,color:CC.muted,fontSize:13,lineHeight:23,textAlign:'center',marginTop:13,marginBottom:22},label:{fontFamily:FONT.bold,color:CC.ink,textAlign:'right',fontSize:14,marginTop:12,marginBottom:9},methods:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},method:{borderWidth:1,borderColor:CC.line,backgroundColor:'#fff',borderRadius:13,paddingVertical:11,paddingHorizontal:13,minHeight:46,justifyContent:'center'},selected:{backgroundColor:CC.brand,borderColor:CC.brand},methodText:{fontFamily:FONT.bold,color:CC.ink,fontSize:12},selectedText:{color:'#fff'},input:{backgroundColor:'#fff',borderColor:CC.line,borderWidth:1,borderRadius:14,padding:13,color:CC.ink,fontSize:17,fontFamily:FONT.regular},submit:{backgroundColor:CC.brand,borderRadius:14,minHeight:52,alignItems:'center',justifyContent:'center',marginTop:26},submitText:{fontFamily:FONT.bold,color:'#fff',fontSize:14},help:{color:CC.muted,fontFamily:FONT.regular,fontSize:12,lineHeight:21,textAlign:'center',marginTop:17}});
