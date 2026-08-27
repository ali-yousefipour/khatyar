import React from 'react';
import StationCaptureV3Screen from './StationCaptureV3Screen';
import MyStationsScreen from './MyStationsScreen';

/** Existing app-item navigation alias; permissions remain in the existing role-app-items system. */
export default function LineLocationScreen({route,navigation}){
  if(route?.params?.mode==='mine')return <MyStationsScreen route={route} navigation={navigation}/>;
  return <StationCaptureV3Screen route={route} navigation={navigation}/>;
}
