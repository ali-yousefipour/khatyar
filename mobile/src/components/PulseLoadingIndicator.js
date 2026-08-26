import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { C, FONT } from '../theme';

export default function PulseLoadingIndicator({ size='small', color=C.brand, style, message, fullScreen=false }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:1350,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0,duration:650,useNativeDriver:true}),
    ]));
    anim.start(); return () => anim.stop();
  }, [pulse]);
  const px = typeof size === 'number' ? size : (size === 'large' ? 92 : 30);
  const scale = pulse.interpolate({inputRange:[0,1],outputRange:[0.95,1]});
  const opacity = pulse.interpolate({inputRange:[0,1],outputRange:[0.5,0]});
  const ringScale = pulse.interpolate({inputRange:[0,1],outputRange:[0.78,1.45]});
  const content = <View style={[styles.box,style]} accessibilityRole="progressbar" accessibilityLabel={message||'در حال بارگذاری'}>
    <View style={{width:px,height:px,alignItems:'center',justifyContent:'center'}}>
      <Animated.View style={[styles.ring,{borderColor:color,width:px,height:px,borderRadius:px/2,opacity,transform:[{scale:ringScale}]}]}/>
      <Animated.Image source={require('../../assets/loading-avatar.png')} style={{width:px*0.78,height:px*0.78,borderRadius:px,transform:[{scale}]}} resizeMode="cover"/>
    </View>
    {message ? <Text style={styles.text}>{message}</Text> : null}
  </View>;
  return fullScreen ? <View style={styles.full}>{content}</View> : content;
}
const styles=StyleSheet.create({
  full:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.paper,padding:24},
  box:{alignItems:'center',justifyContent:'center'},
  ring:{position:'absolute',borderWidth:3},
  text:{fontFamily:FONT.regular,color:C.muted,fontSize:13,marginTop:12,textAlign:'center'}
});
