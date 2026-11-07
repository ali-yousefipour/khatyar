import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openDrawer } from '../drawerControl';
import { FONT } from '../theme';

export default function DetailPageHeader({ title, navigation }) {
  return <View style={s.header}>
    <View style={s.shine} />
    <View style={s.row}>
      <TouchableOpacity style={s.button} accessibilityRole="button" accessibilityLabel="باز کردن منو" onPress={openDrawer}>
        <MaterialCommunityIcons name="menu" size={25} color="#fff" />
      </TouchableOpacity>
      <Text accessibilityRole="header" numberOfLines={2} style={s.title}>{title}</Text>
      <TouchableOpacity style={s.button} accessibilityRole="button" accessibilityLabel="بازگشت" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')}>
        <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>;
}

const s = StyleSheet.create({
  header: { backgroundColor:'#075d4b', borderBottomWidth:3, borderBottomColor:'#1cba8a', paddingHorizontal:15, paddingTop:13, paddingBottom:16, overflow:'hidden', borderBottomLeftRadius:24, borderBottomRightRadius:24 },
  shine: { position:'absolute', top:-95, left:-34, width:235, height:140, backgroundColor:'rgba(40,216,149,.15)', borderRadius:90, transform:[{rotate:'-22deg'}] },
  row: { flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', gap:10 },
  button: { width:46, height:46, borderRadius:14, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,.11)', borderWidth:1, borderColor:'rgba(255,255,255,.19)' },
  title: { flex:1, textAlign:'center', fontSize:20, lineHeight:30, fontFamily:FONT.bold, color:'#fff', writingDirection:'rtl' },
});
