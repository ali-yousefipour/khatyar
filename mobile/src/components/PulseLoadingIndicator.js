import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { C, FONT } from '../theme';

export default function PulseLoadingIndicator({ size = 'small', color = C.brand, style, message, fullScreen = false }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(!!value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener?.('reduceMotionChanged', value => setReduceMotion(!!value));
    return () => { active = false; listener?.remove?.(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { motion.stopAnimation(); motion.setValue(0); return undefined; }
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    anim.start(); return () => anim.stop();
  }, [motion, reduceMotion]);
  const px = typeof size === 'number' ? Math.max(22, size) : (size === 'large' ? 92 : 32);
  const ringScale = motion.interpolate({inputRange:[0,1],outputRange:[0.94,1.12]});
  const opacity = motion.interpolate({inputRange:[0,1],outputRange:[0.48,0.16]});
  const scale = motion.interpolate({inputRange:[0,1],outputRange:[1,1.045]});
  const content = <View style={[styles.box,style]} accessibilityRole="progressbar" accessibilityLabel={message||'در حال بارگذاری'} accessibilityLiveRegion="polite">
    <View style={[styles.logoHolder,{width:px,height:px,borderRadius:px/2}]}>
      <Animated.View style={[styles.ring,{borderColor:color,width:px,height:px,borderRadius:px/2,opacity,transform:[{scale:ringScale}]}]}/>
      <Animated.Image source={require('../../assets/loading-avatar.png')} style={{width:px*0.66,height:px*0.66,transform:[{scale}]}} resizeMode="contain"/>
    </View>
    {message ? <Text style={[styles.text,fullScreen&&styles.fullText]}>{message}</Text> : null}
    {fullScreen ? <Text style={styles.hint}>لطفاً چند لحظه صبر کنید</Text> : null}
  </View>;
  return fullScreen ? <View style={styles.full}>{content}</View> : content;
}
const styles=StyleSheet.create({
  full:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.paper,padding:24},
  box:{alignItems:'center',justifyContent:'center',paddingVertical:4},
  logoHolder:{alignItems:'center',justifyContent:'center',backgroundColor:C.soft},
  ring:{position:'absolute',borderWidth:2},
  text:{fontFamily:FONT.regular,color:C.slate,fontSize:13,lineHeight:23,marginTop:14,textAlign:'center',writingDirection:'rtl'},
  fullText:{fontFamily:FONT.bold,fontSize:15,marginTop:20},
  hint:{fontFamily:FONT.regular,color:C.muted,fontSize:12,marginTop:5,textAlign:'center'}
});
