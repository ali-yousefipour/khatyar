import * as SecureStore from 'expo-secure-store';

const KEY='verified_offline_user_v1';
const MAX_AGE=7*24*60*60*1000;
const FIELDS=['id','username','name','first_name','last_name','role','role_id','role_title','level','is_admin','rank_stars','must_change_pw','must_setup','must_renew','security_exempt'];

export async function saveVerifiedUser(user){
  if(!user?.id)return;
  const snapshot={};
  FIELDS.forEach(k=>{if(user[k]!==undefined&&user[k]!==null)snapshot[k]=user[k]});
  await SecureStore.setItemAsync(KEY,JSON.stringify({user:snapshot,verifiedAt:Date.now()})).catch(()=>{});
}

export async function readVerifiedUser(){
  try{const raw=await SecureStore.getItemAsync(KEY);if(!raw)return null;const saved=JSON.parse(raw);if(!saved?.user?.id||!saved.verifiedAt||Date.now()-Number(saved.verifiedAt)>MAX_AGE||Date.now()<Number(saved.verifiedAt))return null;if(saved.user.must_change_pw||saved.user.must_setup||saved.user.must_renew)return null;return saved.user;}catch(_){return null}
}

export async function clearVerifiedUser(){await SecureStore.deleteItemAsync(KEY).catch(()=>{})}
