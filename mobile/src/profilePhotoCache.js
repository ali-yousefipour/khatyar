import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { imageSource } from './api';

const key=id=>'profile-photo-cache:v1:'+String(id);
const safeId=id=>String(id).replace(/[^a-zA-Z0-9_-]/g,'');
const inflight=new Map();
const memory=new Map();
export function peekProfilePhotoCache(userId){return memory.get(String(userId))?.uri||null;}
function sourceIdentity(source){
  if(!/^data:image\//i.test(source))return source;
  let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return 'embedded:'+source.length+':'+(hash>>>0).toString(16);
}

export async function readProfilePhotoCache(userId){
  if(!userId)return null;
  try{
    const raw=await AsyncStorage.getItem(key(userId));
    const saved=raw?JSON.parse(raw):null;
    if(!saved?.uri||!saved?.source)return null;
    const info=await FileSystem.getInfoAsync(saved.uri);
    if(info.exists){memory.set(String(userId),saved);return saved;}
    memory.delete(String(userId));return null;
  }catch{return null}
}

export async function cacheProfilePhoto(userId,source,{force=false}={}){
  if(!userId||!source)return null;
  const remote=typeof source==='string'?source:source.uri;
  if(!remote)return null;
  const sourceKey=sourceIdentity(remote);
  const existing=await readProfilePhotoCache(userId);
  if(!force&&existing?.source===sourceKey&&Date.now()-Number(existing.cached_at||0)<12*60*60*1000)return existing.uri;
  if(inflight.has(String(userId)))return inflight.get(String(userId));
  const task=(async()=>{
    const base=FileSystem.documentDirectory;
    if(!base)return existing?.uri||null;
    const prefix=base+'profile-photo-'+safeId(userId)+'-';
    const suffix=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
    const filename=prefix+suffix+'.jpg';
    const temp=prefix+suffix+'-incoming.jpg';
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
      await FileSystem.moveAsync({from:temp,to:filename});
      const metadata={uri:filename,source:sourceKey,cached_at:Date.now()};
      await AsyncStorage.setItem(key(userId),JSON.stringify(metadata));
      memory.set(String(userId),metadata);
      // The Image URI changes on every replacement, avoiding a stale native image cache.
      // Only delete the previous app-owned version after the new one is persisted.
      if(existing?.uri && existing.uri!==filename && existing.uri.startsWith(prefix))
        await FileSystem.deleteAsync(existing.uri,{idempotent:true}).catch(()=>{});
      return filename;
    }catch{
      await FileSystem.deleteAsync(temp,{idempotent:true}).catch(()=>{});
      return existing?.uri||null;
    }
  })();
  inflight.set(String(userId),task);
  try{return await task}finally{inflight.delete(String(userId))}
}
