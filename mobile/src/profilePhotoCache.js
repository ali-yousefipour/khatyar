import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { imageSource } from './api';

const key=id=>'profile-photo-cache:v1:'+String(id);
const safeId=id=>String(id).replace(/[^a-zA-Z0-9_-]/g,'');
const inflight=new Map();

export async function readProfilePhotoCache(userId){
  if(!userId)return null;
  try{
    const raw=await AsyncStorage.getItem(key(userId));
    const saved=raw?JSON.parse(raw):null;
    if(!saved?.uri||!saved?.source)return null;
    const info=await FileSystem.getInfoAsync(saved.uri);
    return info.exists?saved:null;
  }catch{return null}
}

export async function cacheProfilePhoto(userId,source,{force=false}={}){
  if(!userId||!source)return null;
  const remote=typeof source==='string'?source:source.uri;
  if(!remote)return null;
  const existing=await readProfilePhotoCache(userId);
  if(!force&&existing?.source===remote)return existing.uri;
  if(inflight.has(String(userId)))return inflight.get(String(userId));
  const task=(async()=>{
    const base=FileSystem.documentDirectory;
    if(!base)return existing?.uri||null;
    const filename=base+'profile-photo-'+safeId(userId)+'.jpg';
    const temp=base+'profile-photo-'+safeId(userId)+'-incoming.jpg';
    try{
      if(/^data:image\/[^;]+;base64,/i.test(remote)){
        const base64=remote.split(',')[1];
        await FileSystem.writeAsStringAsync(temp,base64,{encoding:FileSystem.EncodingType.Base64});
      }else{
        const data=imageSource(remote);
        const url=typeof data==='string'?data:data?.uri;
        if(!url)return existing?.uri||null;
        const result=await FileSystem.downloadAsync(url,temp,{headers:data?.headers||{}});
        if(result.status<200||result.status>=300)throw new Error('photo_download_failed');
      }
      const info=await FileSystem.getInfoAsync(temp);
      if(!info.exists||!info.size)throw new Error('photo_empty');
      await FileSystem.deleteAsync(filename,{idempotent:true}).catch(()=>{});
      await FileSystem.moveAsync({from:temp,to:filename});
      await AsyncStorage.setItem(key(userId),JSON.stringify({uri:filename,source:remote,cached_at:Date.now()}));
      return filename;
    }catch{
      await FileSystem.deleteAsync(temp,{idempotent:true}).catch(()=>{});
      return existing?.uri||null;
    }
  })();
  inflight.set(String(userId),task);
  try{return await task}finally{inflight.delete(String(userId))}
}
