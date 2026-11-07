import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { imageSource, request } from '../api';
import { C } from '../theme';

/** Shared driver portrait, using the authenticated media URL returned by list APIs. */
export default function DriverPhotoAvatar({ driver, size = 48, beneficiary = false, style }) {
  const [fetchedPhoto, setFetchedPhoto] = useState(null);
  const hasListPhoto = driver && Object.prototype.hasOwnProperty.call(driver, 'photo_url');
  useEffect(() => {
    setFetchedPhoto(null);
    if (!driver?.id || hasListPhoto || driver?.driver_photo_url || driver?.profile_photo_url) return;
    let active = true;
    request('/driver-photos/' + driver.id, { noStore:true, queueIfOffline:false })
      .then(data => { if (active) setFetchedPhoto(data?.photo || null); })
      .catch(() => {});
    return () => { active = false; };
  }, [driver?.id, hasListPhoto, driver?.driver_photo_url, driver?.profile_photo_url]);
  const photo = driver?.photo_url || driver?.driver_photo_url || driver?.profile_photo_url || fetchedPhoto;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [photo]);
  const source = photo ? imageSource(photo) : null;
  return <View style={[styles.frame, { width:size, height:size, borderRadius:Math.round(size*.28) }, beneficiary && styles.beneficiary, style]}>
    {source && !failed ? <Image source={source} resizeMode="cover" style={styles.image} accessibilityLabel={`تصویر ${[driver?.first_name, driver?.last_name].filter(Boolean).join(' ') || 'تاکسیران'}`} onError={() => setFailed(true)}/>
      : <MaterialCommunityIcons name={beneficiary ? 'account-tie-outline' : 'account-outline'} size={Math.round(size*.52)} color={beneficiary?'#fff':C.brand} accessibilityLabel="تصویر ثبت نشده"/>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { alignItems:'center', justifyContent:'center', backgroundColor:'#e6f5ee', overflow:'hidden', borderWidth:1, borderColor:'#cae8dc' },
  beneficiary: { backgroundColor:C.brand },
  image: { width:'100%', height:'100%' },
});
