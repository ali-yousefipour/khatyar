import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

const KEY='school_service_master_cache_v2';
const memory={data:null};
let refreshPromise=null;

const uniqById=(rows=[])=>{const m=new Map();for(const x of Array.isArray(rows)?rows:[]){const id=String(x?.id??'');if(id)m.set(id,x);}return [...m.values()];};

async function fetchPages(path, pageSize=500){
  const all=[];
  let page=1;
  for(let guard=0;guard<100;guard++){
    const r=await request(path+(path.includes('?')?'&':'?')+'page='+page+'&limit='+pageSize,{noStore:true});
    const items=Array.isArray(r?.items)?r.items:[];
    all.push(...items);
    const pages=Number(r?.pages||0), total=Number(r?.total||0);
    if((pages&&page>=pages)||(!pages&&(items.length<pageSize))||(total&&all.length>=total)||items.length===0)break;
    page++;
  }
  return all;
}

export async function readSchoolServiceCache(){
  if(memory.data)return memory.data;
  try{const raw=await AsyncStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(parsed?.data){memory.data=parsed.data;return parsed.data;}}}catch(_){}
  return null;
}

export async function refreshSchoolServiceCache(){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
    let boot;
    try{
      // یک درخواست bootstrap کل اطلاعات موردنیاز را می‌گیرد؛ این مسیر هم سریع‌تر
      // است و هم از چندین round-trip و بارگذاری تدریجی جلوگیری می‌کند.
      boot=await request('/school-service/bootstrap',{noStore:true,timeoutMs:30000});
    }catch(_){
      // سازگاری با سرورهای قدیمی که bootstrap را ندارند.
      const meta=await request('/school-service/meta',{noStore:true,timeoutMs:15000});
      const [companies,schools]=await Promise.all([
        fetchPages('/school-service/companies',500),
        fetchPages('/school-service/schools',500)
      ]);
      boot={meta,companies,schools};
    }
    const meta=boot?.meta||boot||{};
    const companies=Array.isArray(boot?.companies)?boot.companies:[];
    const schools=Array.isArray(boot?.schools)?boot.schools:[];
  const data={
    version:3,
    savedAt:Date.now(),
    districts:Array.isArray(meta?.districts)?meta.districts:[],
    genders:Array.isArray(meta?.genders)?meta.genders:[],
    driver_genders:Array.isArray(meta?.driver_genders)?meta.driver_genders:[],
    vehicle_types:Array.isArray(meta?.vehicle_types)?meta.vehicle_types:[],
    vehicle_colors:Array.isArray(meta?.vehicle_colors)?meta.vehicle_colors:[],
    violations:Array.isArray(meta?.violations)?meta.violations:[],
    district_boundaries:Array.isArray(boot?.district_boundaries)?boot.district_boundaries:[],
    companies:uniqById(companies),
    schools:uniqById(schools)
  };
  memory.data=data;
    await AsyncStorage.setItem(KEY,JSON.stringify({data}));
    return data;
  })();
  try{return await refreshPromise}finally{refreshPromise=null}
}

export async function loadSchoolServiceCache({refresh=true}={}){
  const cached=await readSchoolServiceCache();
  if(!refresh)return cached;
  try{return await refreshSchoolServiceCache()}catch(_){return cached}
}

export function clearSchoolServiceCache(){memory.data=null;return AsyncStorage.removeItem(KEY).catch(()=>{});}
