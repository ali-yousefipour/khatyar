import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import * as Application from 'expo-application';
import { C, FONT } from './theme';
import PulseLoadingIndicator from './components/PulseLoadingIndicator';
export default function SplashLoading({ message }) {
  return <View style={s.wrap}>
    <PulseLoadingIndicator size={150} message={message || 'در حال بارگذاری…'} />
    <Text style={s.title}>خطیار</Text>
    <Text style={s.sub}>سامانه مدیریت خطوط و نیروهای اجرایی</Text>
    <View style={s.footer}><Text style={s.company}>شرکت مبین شات مشهد</Text><Text style={s.ver}>نسخهٔ {Application.nativeApplicationVersion || '—'}</Text></View>
  </View>;
}
const s=StyleSheet.create({wrap:{flex:1,backgroundColor:C.paper,alignItems:'center',justifyContent:'center',padding:28},title:{fontFamily:FONT.bold,color:C.brand,fontSize:28,marginTop:18},sub:{fontFamily:FONT.regular,color:C.muted,fontSize:13,marginTop:5,textAlign:'center'},footer:{position:'absolute',bottom:36,alignItems:'center'},company:{fontFamily:FONT.bold,color:C.slate,fontSize:13},ver:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:3}});
