import React from 'react';
import { AppState, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Change the actual background color: translucent overlays could stay white
// if their native opacity animation was interrupted.
export const FLASH_MODES = {
  whiteAmber: { label:'سفید و زرد', colors:['#FFFFFF','#FFCA22'] },
  blackAmber: { label:'مشکی و زرد', colors:['#070B11','#FFCA22'] },
};
// Use a moderate pulse rate to reduce photosensitivity risk.
export const FLASH_FRAME_MS = 350;
export const flashColor = (mode, frame) =>
  FLASH_MODES[mode]?.colors[Math.abs(frame)%2] || FLASH_MODES.whiteAmber.colors[0];

export default function ScreenFlasher({ onClose }) {
  const insets = useSafeAreaInsets();
  const [mode,setMode] = React.useState('whiteAmber');
  const [playing,setPlaying] = React.useState(false);
  const [frame,setFrame] = React.useState(0);

  React.useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setFrame(index => index+1), FLASH_FRAME_MS);
    return () => clearInterval(timer);
  }, [playing]);

  React.useEffect(() => {
    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') onClose();
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => { appState.remove(); back.remove(); };
  }, [onClose]);

  const start = () => { setFrame(0); setPlaying(true); };
  return (
    <View style={[styles.root,{backgroundColor:playing?flashColor(mode,frame):'#101827'}]} accessibilityLabel={playing?'فلاشر '+FLASH_MODES[mode].label+' فعال است':'تنظیمات فلاشر'}>
      <StatusBar hidden={playing} style="light"/>
      {!playing && <View style={styles.options}>
        <MaterialCommunityIcons name="alarm-light-outline" size={40} color="#FFCA22" accessible={false}/>
        <Text style={styles.title}>فلاشر نمایشگر</Text>
        <Text style={styles.subtitle}>ترکیب رنگ را انتخاب کنید و سپس پخش را شروع کنید.</Text>
        {Object.entries(FLASH_MODES).map(([key,option])=>
          <TouchableOpacity key={key} accessibilityRole="radio" accessibilityState={{selected:mode===key}} accessibilityLabel={'فلاشر '+option.label} onPress={()=>setMode(key)} activeOpacity={0.8} style={[styles.modeCard,mode===key&&styles.modeSelected]}>
            <View style={styles.swatches}>{option.colors.map(color=><View key={color} style={[styles.swatch,{backgroundColor:color}]}/>)}</View>
            <Text style={styles.modeLabel}>{option.label}</Text>
            <MaterialCommunityIcons name={mode===key?'radiobox-marked':'radiobox-blank'} color={mode===key?'#FFCA22':'#B6C4D4'} size={24}/>
          </TouchableOpacity>)}
        <Text style={styles.warning}>هشدار: نور چشمک‌زن ممکن است برای افراد حساس به نور مناسب نباشد.</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={'شروع فلاشر '+FLASH_MODES[mode].label} onPress={start} style={styles.start} activeOpacity={0.8}>
          <MaterialCommunityIcons name="play" size={24} color="#101827"/>
          <Text style={styles.startLabel}>شروع فلاشر</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelLabel}>انصراف</Text></TouchableOpacity>
      </View>}
      <TouchableOpacity style={[styles.close,{top:Math.max(insets.top,12)+8}]} onPress={onClose} accessibilityRole="button" accessibilityLabel="خاموش کردن فلاشر" activeOpacity={0.8}>
        <MaterialCommunityIcons name="close" size={22} color="#FFFFFF"/>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:10000,elevation:10000,justifyContent:'center'},
  options: {paddingHorizontal:24,alignItems:'center',width:'100%',maxWidth:520,alignSelf:'center',paddingTop:64,paddingBottom:24},
  title: {color:'#FFFFFF',fontSize:23,fontWeight:'800',marginTop:12,marginBottom:8,textAlign:'center'},
  subtitle: {color:'#B6C4D4',fontSize:14,textAlign:'center',lineHeight:24,marginBottom:22},
  modeCard: {minHeight:74,flexDirection:'row',alignItems:'center',width:'100%',paddingHorizontal:18,marginBottom:12,borderRadius:16,backgroundColor:'#263346',borderWidth:2,borderColor:'#33445A'},
  modeSelected: {borderColor:'#FFCA22',backgroundColor:'#303D50'},
  swatches: {flexDirection:'row',marginRight:14,gap:5},
  swatch: {width:26,height:26,borderRadius:8,borderWidth:1,borderColor:'#77869B'},
  modeLabel: {color:'#FFFFFF',fontSize:16,fontWeight:'700',flex:1,textAlign:'right'},
  warning: {color:'#FFDC82',fontSize:12,textAlign:'center',lineHeight:21,marginTop:5,marginBottom:18},
  start: {minHeight:54,backgroundColor:'#FFCA22',borderRadius:15,width:'100%',justifyContent:'center',alignItems:'center',flexDirection:'row',gap:8},
  startLabel: {fontSize:17,fontWeight:'800',color:'#101827'},
  cancel: {minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:20,marginTop:8},
  cancelLabel: {color:'#F4F7FC',fontSize:15},
  close: {position:'absolute',right:16,width:48,height:48,borderRadius:24,backgroundColor:'rgba(19,27,35,0.92)',justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.75)'},
});
