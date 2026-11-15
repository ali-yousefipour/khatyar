import AsyncStorage from '@react-native-async-storage/async-storage';
const storageKey=id=>'expiry-display-preferences:v1:'+String(id);
export async function readExpiryPreferences(userId){
  if(!userId)return null;
  try{const raw=await AsyncStorage.getItem(storageKey(userId));const parsed=raw?JSON.parse(raw):null;return parsed?.types&&typeof parsed.types==='object'?parsed:null}catch{return null}
}
export async function saveExpiryPreferences(userId,prefs){
  if(userId&&prefs?.types)await AsyncStorage.setItem(storageKey(userId),JSON.stringify(prefs));
}
function category(notice){
  const data=notice?.data&&typeof notice.data==='object'?notice.data:{};
  const id=String(notice?.id||'');
  const type=String(data.expiry_type||data.document_type||data.subtype||'').toLowerCase();
  const title=(String(notice?.title||'')+' '+String(notice?.body||'')).toLowerCase();
  if(type.includes('taxi_license')||/پروانه تاکسیرانی/.test(title))return 'taxi_license';
  if(type.includes('operation_license')||/بهره.?برداری/.test(title))return 'operation_license';
  if(type.includes('technical_inspection')||/معاینه فنی/.test(title))return 'technical_inspection';
  if(type.includes('third_party_insurance')||/بیمه شخص ثالث/.test(title))return 'third_party_insurance';
  if(id.startsWith('expiry:')||/expir|انقضا|پایان اعتبار/.test(type+' '+title))return 'generic_expiry';
  return null;
}
export function expiryNoticeEnabled(notice,prefs){
  const kind=category(notice);
  if(!kind||!prefs?.types)return true;
  if(kind==='generic_expiry')return Object.values(prefs.types).some(v=>v!==false);
  return prefs.types[kind]!==false;
}
