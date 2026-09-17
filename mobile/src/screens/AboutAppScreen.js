import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { C, FONT } from '../theme';
import { currentVersion } from '../updater';

export default function AboutAppScreen({ navigation }) {
  const openSite=async()=>{try{await Linking.openURL('https://app.yousefipour.ir')}catch(_){}};
  const rows=[
    ['نام برنامه','خطیار — سامانه مدیریت و نظارت بر ناوگان تاکسیرانی'],
    ['نسخه',currentVersion()],
    ['تولیدکننده','علی یوسفی‌پور'],
    ['شرکت','مبین شات'],
    ['وب‌سایت / سامانه','https://app.yousefipour.ir'],
    ['پشتیبانی','برای پشتیبانی و پیگیری مشکلات، از مسیر ارتباطی رسمی سامانه یا مسئول سامانه سازمان استفاده کنید.'],
    ['سیاست حریم خصوصی','اطلاعات مربوط به داده‌ها و دسترسی‌ها در صفحه سیاست حریم خصوصی ارائه شده است.'],
    ['شرایط استفاده','استفاده از خطیار برای کاربران مجاز سازمانی است و کاربر موظف است از حساب، اطلاعات و امکانات سامانه مطابق مقررات و دستورالعمل‌های سازمان استفاده کند.'],
  ];
  return <ScrollView style={s.wrap} contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.brand}>خطیار</Text><Text style={s.title}>درباره برنامه</Text><Text style={s.sub}>اطلاعات رسمی برنامه</Text></View>
    <View style={s.card}>{rows.map(([label,value])=><View key={label} style={s.row}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>)}
      <TouchableOpacity style={s.btn} onPress={openSite}><Text style={s.btnText}>باز کردن وب‌سایت سامانه</Text></TouchableOpacity>
      <TouchableOpacity style={s.btn} onPress={()=>navigation?.navigate?.('PrivacyPolicy')}><Text style={s.btnText}>مشاهده سیاست حریم خصوصی</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}
const s=StyleSheet.create({wrap:{flex:1,backgroundColor:C.paper},content:{padding:14,paddingBottom:40},hero:{backgroundColor:C.brand,borderRadius:20,padding:20,marginBottom:12},brand:{color:'#fff',fontFamily:FONT.bold,fontSize:24,textAlign:'right'},title:{color:'#fff',fontFamily:FONT.bold,fontSize:18,textAlign:'right',marginTop:8},sub:{color:'#d7eee8',fontFamily:FONT.regular,fontSize:12,textAlign:'right',marginTop:6},card:{backgroundColor:'#fff',borderRadius:15,borderWidth:1,borderColor:'#e4e9f2',padding:14},row:{borderBottomWidth:1,borderBottomColor:'#edf0f4',paddingVertical:10},label:{color:C.brand,fontFamily:FONT.bold,fontSize:12,textAlign:'right'},value:{color:'#344054',fontFamily:FONT.regular,fontSize:12.5,lineHeight:21,textAlign:'right',marginTop:3},btn:{backgroundColor:C.brand,borderRadius:12,paddingVertical:12,alignItems:'center',marginTop:10},btnText:{color:'#fff',fontFamily:FONT.bold,fontSize:12.5}});
