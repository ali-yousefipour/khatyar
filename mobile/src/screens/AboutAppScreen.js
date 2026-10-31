import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking, Alert, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, FONT } from '../theme';
import { currentVersion } from '../updater';

export default function AboutAppScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const openSite=async()=>{try{await Linking.openURL('https://www.mobinshot.ir')}catch(_){Alert.alert('بازکردن وب‌سایت ممکن نیست','اتصال اینترنت و مرورگر دستگاه را بررسی کنید.');}};
  const callSupport=async()=>{try{await Linking.openURL('tel:09982118899')}catch(_){Alert.alert('تماس برقرار نشد','شماره پشتیبانی: ۰۹۹۸۲۱۱۸۸۹۹');}};
  const rows=[
    ['نام برنامه','خطیار — سامانه مدیریت و نظارت بر ناوگان تاکسیرانی'],
    ['نسخه',currentVersion()],
    ['تولیدکننده','علی یوسفی‌پور'],
    ['شرکت','مبین شات'],
    ['وب‌سایت','www.mobinshot.ir'],
    ['پشتیبانی','۰۹۹۸۲۱۱۸۸۹۹'],
    ['شرایط استفاده','استفاده از خطیار برای کاربران مجاز سازمانی است و کاربر موظف است از حساب، اطلاعات و امکانات سامانه مطابق مقررات و دستورالعمل‌های سازمان استفاده کند.'],
  ];
  return <ScrollView style={s.wrap} contentContainerStyle={[s.content,{paddingHorizontal:width>=700?32:16}]}>
    <View style={s.hero}><Text style={s.brand}>خطیار</Text><Text style={s.title}>درباره برنامه</Text><Text style={s.sub}>اطلاعات رسمی برنامه</Text></View>
    <View style={s.card}>{rows.map(([label,value])=><View key={label} style={s.row}><Text style={s.label}>{label}</Text><Text selectable style={s.value}>{value}</Text></View>)}</View>
    <View style={s.actions}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="باز کردن وب‌سایت مبین شات" style={s.btn} onPress={openSite}><MaterialCommunityIcons name="web" size={21} color="#fff"/><Text style={s.btnText}>باز کردن وب‌سایت</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={s.btnSecondary} onPress={callSupport}><MaterialCommunityIcons name="phone-outline" size={21} color={C.brand}/><Text style={s.btnSecondaryText}>تماس با پشتیبانی: ۰۹۹۸۲۱۱۸۸۹۹</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={s.btnSecondary} onPress={()=>navigation?.navigate?.('PrivacyPolicy')}><MaterialCommunityIcons name="shield-lock-outline" size={21} color={C.brand}/><Text style={s.btnSecondaryText}>سیاست حریم خصوصی</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}
const s=StyleSheet.create({
  wrap:{flex:1,backgroundColor:C.paper},
  content:{paddingTop:16,paddingBottom:48,alignSelf:'center',width:'100%',maxWidth:760},
  hero:{backgroundColor:C.brand,borderRadius:24,padding:24,marginBottom:12},
  brand:{color:'#fff',fontFamily:FONT.bold,fontSize:25,textAlign:'right'},
  title:{color:'#fff',fontFamily:FONT.bold,fontSize:18,textAlign:'right',marginTop:8},
  sub:{color:'#d7eee8',fontFamily:FONT.regular,fontSize:13,textAlign:'right',marginTop:6},
  card:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:C.line,paddingHorizontal:16},
  row:{borderBottomWidth:1,borderBottomColor:C.line,paddingVertical:14},
  label:{color:C.brand,fontFamily:FONT.bold,fontSize:13,textAlign:'right'},
  value:{color:C.ink,fontFamily:FONT.regular,fontSize:14,lineHeight:24,textAlign:'right',marginTop:5},
  actions:{marginTop:14,gap:10},
  btn:{backgroundColor:C.brand,borderRadius:14,paddingHorizontal:16,minHeight:52,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:10},
  btnText:{color:'#fff',fontFamily:FONT.bold,fontSize:14,textAlign:'center'},
  btnSecondary:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,minHeight:52,paddingHorizontal:16,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:10},
  btnSecondaryText:{color:C.brand,fontFamily:FONT.bold,fontSize:13,textAlign:'center',flexShrink:1},
});
