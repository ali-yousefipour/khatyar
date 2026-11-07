import React from 'react';
import { AppState, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Change the actual background color: translucent overlays could stay white
// if their native opacity animation was interrupted.
export const FLASH_MODES = {
  whiteAmber: { label:'سفید و زرد', colors:['#FFFFFF','#FFCA22'] },
  blackAmber: { label:'مشکی و زرد', colors:['#070B11','#FFCA22'] },
  redBlue: { label:'قرمز و آبی', colors:['#EC1728','#095DFF'] },
};
export const FLASH_PATTERNS = { federal:'فدرالی', simple:'ساده', random:'تصادفی' };
// Grouped double-pulses and a deliberate recovery gap, rather than a simple toggle.
// Keep each pulse long enough to avoid extreme high-frequency strobing.
export const FLASH_PATTERN_MS = [220, 180, 220, 370, 220, 180, 220, 680];
export const FLASH_SPEED_LEVELS = [1.6, 1.3, 1, 0.9, 0.8];
export const flashDuration = (frame, speedIndex,pattern='federal') =>
  Math.max(160, Math.round((pattern==='simple'?390:pattern==='random'?[280,480,200,620,340,540,180,420][frame%8]:FLASH_PATTERN_MS[frame % FLASH_PATTERN_MS.length]) * FLASH_SPEED_LEVELS[speedIndex]));
export const flashColor = (mode, frame, pattern='federal') => {
  const colors=FLASH_MODES[mode]?.colors || FLASH_MODES.whiteAmber.colors;
  const idx=pattern==='random'?[1,0,0,1,0,1,1,0][frame%8]:pattern==='simple'?frame%2:([1,0,1,0,0,1,0,1][frame%8]);
  return colors[idx];
};

export default function ScreenFlasher({ onClose }) {
  const insets = useSafeAreaInsets();
  const [mode,setMode] = React.useState('whiteAmber');
  const [playing,setPlaying] = React.useState(false);
  const [frame,setFrame] = React.useState(0);
  const [speedIndex,setSpeedIndex] = React.useState(2);
  const [pattern,setPattern] = React.useState('federal');
  const [halfModes,setHalfModes] = React.useState({});
  const halfScreen=!!halfModes[mode];

  React.useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => setFrame(index => (index+1)%FLASH_PATTERN_MS.length), flashDuration(frame,speedIndex,pattern));
    return () => clearTimeout(timer);
  }, [playing,frame,speedIndex,pattern]);

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
    <View style={[styles.root,{backgroundColor:playing?flashColor(mode,frame,pattern):'#101827'}]} accessibilityLabel={playing?'فلاشر '+FLASH_MODES[mode].label+' فعال است':'تنظیمات فلاشر'}>
      <StatusBar hidden={playing} style="light"/>
      {playing&&halfScreen&&<View style={styles.halfScreen} pointerEvents="none"><View style={{flex:1,backgroundColor:flashColor(mode,frame,pattern)}}/><View style={{flex:1,backgroundColor:FLASH_MODES[mode].colors.find(c=>c!==flashColor(mode,frame,pattern))||FLASH_MODES[mode].colors[0]}}/></View>}
      {!playing && <ScrollView style={{width:'100%'}} contentContainerStyle={styles.options} keyboardShouldPersistTaps="handled">
        <MaterialCommunityIcons name="alarm-light-outline" size={40} color="#FFCA22" accessible={false}/>
        <Text style={styles.title}>فلاشر نمایشگر</Text>
        <Text style={styles.subtitle}>ترکیب رنگ را انتخاب کنید و سپس پخش را شروع کنید.</Text>
        {Object.entries(FLASH_MODES).map(([key,option])=>
          <TouchableOpacity key={key} accessibilityRole="radio" accessibilityState={{selected:mode===key}} accessibilityLabel={'فلاشر '+option.label} onPress={()=>setMode(key)} activeOpacity={0.8} style={[styles.modeCard,mode===key&&styles.modeSelected]}>
            <View style={styles.swatches}>{option.colors.map(color=><View key={color} style={[styles.swatch,{backgroundColor:color}]}/>)}</View>
            <View style={{flex:1}}><Text style={styles.modeLabel}>{option.label}</Text><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:!!halfModes[key]}} accessibilityLabel={'نیم صفحه برای فلاشر '+option.label} onPress={()=>{setMode(key);setHalfModes(prev=>({...prev,[key]:!prev[key]}));}} style={styles.halfOption}><MaterialCommunityIcons name={halfModes[key]?'checkbox-marked':'checkbox-blank-outline'} size={18} color="#FFCA22"/><Text style={styles.halfLabel}>نیم صفحه</Text></TouchableOpacity></View>
            <MaterialCommunityIcons name={mode===key?'radiobox-marked':'radiobox-blank'} color={mode===key?'#FFCA22':'#B6C4D4'} size={24}/>
          </TouchableOpacity>)}
        <Text style={styles.speedTitle}>حالت چشمک‌زدن</Text>
        <View style={styles.patternRow}>{Object.entries(FLASH_PATTERNS).map(([key,label])=><TouchableOpacity key={key} accessibilityRole="radio" accessibilityState={{selected:pattern===key}} onPress={()=>{setPattern(key);setFrame(0);}} style={[styles.patternButton,pattern===key&&styles.patternSelected]}><Text style={[styles.patternText,pattern===key&&styles.patternTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
        <Text style={styles.speedTitle}>سرعت پالس‌ها</Text>
        <View style={styles.speedControl}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="کاهش سرعت فلاشر" disabled={speedIndex===0} onPress={()=>setSpeedIndex(i=>Math.max(0,i-1))} style={[styles.speedButton,speedIndex===0&&styles.speedDisabled]}><MaterialCommunityIcons name="minus" size={22} color="#FFFFFF"/></TouchableOpacity>
          <Text style={styles.speedValue}>{['خیلی آرام','آرام','معمولی','تند','خیلی تند'][speedIndex]}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="افزایش سرعت فلاشر" disabled={speedIndex===4} onPress={()=>setSpeedIndex(i=>Math.min(4,i+1))} style={[styles.speedButton,speedIndex===4&&styles.speedDisabled]}><MaterialCommunityIcons name="plus" size={22} color="#FFFFFF"/></TouchableOpacity>
        </View>
        <Text style={styles.warning}>هشدار: نور چشمک‌زن ممکن است برای افراد حساس به نور مناسب نباشد.</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={'شروع فلاشر '+FLASH_MODES[mode].label} onPress={start} style={styles.start} activeOpacity={0.8}>
          <MaterialCommunityIcons name="play" size={24} color="#101827"/>
          <Text style={styles.startLabel}>شروع فلاشر</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelLabel}>انصراف</Text></TouchableOpacity>
      </ScrollView>}
      {playing&&<View style={[styles.playbackSpeed,{top:Math.max(insets.top,12)+13}]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="کاهش سرعت فلاشر" disabled={speedIndex===0} onPress={()=>setSpeedIndex(i=>Math.max(0,i-1))} style={styles.playbackButton}><MaterialCommunityIcons name="minus" size={20} color="#FFFFFF"/></TouchableOpacity>
        <Text style={styles.playbackLabel}>{speedIndex+1}/۵</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="افزایش سرعت فلاشر" disabled={speedIndex===4} onPress={()=>setSpeedIndex(i=>Math.min(4,i+1))} style={styles.playbackButton}><MaterialCommunityIcons name="plus" size={20} color="#FFFFFF"/></TouchableOpacity>
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
  halfScreen: {position:'absolute',top:0,bottom:0,left:0,right:0},
  halfOption: {alignSelf:'flex-end',minHeight:32,flexDirection:'row-reverse',gap:5,alignItems:'center',marginTop:4},
  halfLabel: {color:'#DCE9F3',fontSize:12,fontWeight:'600'},
  patternRow: {width:'100%',flexDirection:'row-reverse',gap:8,marginBottom:14},
  patternButton: {flex:1,alignItems:'center',justifyContent:'center',minHeight:46,borderRadius:11,backgroundColor:'#253348',borderWidth:1,borderColor:'#476078'},
  patternSelected: {backgroundColor:'#FFCA22',borderColor:'#FFCA22'},
  patternText: {color:'#fff',fontSize:12,fontWeight:'700'},
  patternTextSelected: {color:'#101827'},
  title: {color:'#FFFFFF',fontSize:23,fontWeight:'800',marginTop:12,marginBottom:8,textAlign:'center'},
  subtitle: {color:'#B6C4D4',fontSize:14,textAlign:'center',lineHeight:24,marginBottom:22},
  modeCard: {minHeight:74,flexDirection:'row',alignItems:'center',width:'100%',paddingHorizontal:18,marginBottom:12,borderRadius:16,backgroundColor:'#263346',borderWidth:2,borderColor:'#33445A'},
  modeSelected: {borderColor:'#FFCA22',backgroundColor:'#303D50'},
  swatches: {flexDirection:'row',marginRight:14,gap:5},
  swatch: {width:26,height:26,borderRadius:8,borderWidth:1,borderColor:'#77869B'},
  modeLabel: {color:'#FFFFFF',fontSize:16,fontWeight:'700',flex:1,textAlign:'right'},
  speedTitle: {color:'#FFFFFF',fontSize:15,fontWeight:'700',alignSelf:'flex-end',marginTop:8,marginBottom:10},
  speedControl: {width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:8,borderRadius:14,backgroundColor:'#263346'},
  speedButton: {width:48,height:44,alignItems:'center',justifyContent:'center',backgroundColor:'#3C4E62',borderRadius:11},
  speedDisabled: {opacity:0.35},
  speedValue: {color:'#FFFFFF',fontSize:15,fontWeight:'700'},
  playbackSpeed: {position:'absolute',left:14,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(12,20,32,.85)',borderRadius:22,paddingHorizontal:5},
  playbackButton: {minWidth:42,minHeight:42,alignItems:'center',justifyContent:'center'},
  playbackLabel: {color:'#FFFFFF',fontSize:12,fontWeight:'700',paddingHorizontal:4},
  warning: {color:'#FFDC82',fontSize:12,textAlign:'center',lineHeight:21,marginTop:5,marginBottom:18},
  start: {minHeight:54,backgroundColor:'#FFCA22',borderRadius:15,width:'100%',justifyContent:'center',alignItems:'center',flexDirection:'row',gap:8},
  startLabel: {fontSize:17,fontWeight:'800',color:'#101827'},
  cancel: {minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:20,marginTop:8},
  cancelLabel: {color:'#F4F7FC',fontSize:15},
  close: {position:'absolute',right:16,width:48,height:48,borderRadius:24,backgroundColor:'rgba(19,27,35,0.92)',justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.75)'},
});
