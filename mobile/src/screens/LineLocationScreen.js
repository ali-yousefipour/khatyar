import React from 'react';
import StationCaptureV4Screen from './StationCaptureV4Screen';
import MyStationsScreen from './MyStationsScreen';

/**
 * Backward-compatible route used by the existing app-item system.
 * The permission key remains StationCapture; LineLocation is only a
 * navigation alias and does not create a second permission system.
 */
export default function LineLocationScreen({route,navigation}){
  if(route?.params?.mode==='mine')return <MyStationsScreen route={route} navigation={navigation}/>;
  return <StationCaptureV4Screen route={route} navigation={navigation}/>;
}
