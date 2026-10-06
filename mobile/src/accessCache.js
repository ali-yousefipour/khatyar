import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

const KEY='app_access_cache_v1';
const memory={data:null};
let refreshPromise=null;

function normalize(x){
  if(!x||typeof x!=='object') return null;
  return {
    appItems:Array.isArray(x.appItems)?x.appItems:[],
    schoolService:x.schoolService&&typeof x.schoolService==='object'?x.schoolService:null,
    savedAt:Number(x.savedAt||Date.now())
  };
}

export async function readAccessCache(){
  if(memory.data)return memory.data;
  try{
    const raw=await AsyncStorage.getItem(KEY);
    if(raw){
      const d=normalize(JSON.parse(raw));
      if(d){memory.data=d;return d;}
    }
  }catch(_){}
  return null;
}

export async function refreshAccessCache(){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
    const [app,school]=await Promise.all([
      request('/my/app-items',{noStore:true,timeoutMs:10000}).catch(()=>null),
      request('/school-service/access',{noStore:true,timeoutMs:10000}).catch(()=>null)
    ]);
    const old=await readAccessCache();
    const data=normalize({
      appItems:Array.isArray(app?.items)?app.items:(old?.appItems||[]),
      schoolService:school&&typeof school==='object'?school:(old?.schoolService||null),
      savedAt:Date.now()
    });
    if(data.appItems.length||data.schoolService){
      memory.data=data;
      await AsyncStorage.setItem(KEY,JSON.stringify(data));
    }
    return data;
  })();
  try{return await refreshPromise}finally{refreshPromise=null}
}

export function clearAccessCache(){
  memory.data=null;
  return AsyncStorage.removeItem(KEY).catch(()=>{});
}

export function hasAppItem(data,name){
  return Array.isArray(data?.appItems)&&data.appItems.includes(name);
}
