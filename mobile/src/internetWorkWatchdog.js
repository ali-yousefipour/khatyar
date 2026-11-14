import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {cachedValue,postOrQueue,request} from './api';
import {getAppConfig} from './appconfig';
import {playSound} from './soundFx';

export const INTERNET_WORK_WATCHDOG_INTERVAL_MS=30*60*1000;
const CHECK_KEY='internet_work_last_check_v1';

async function attendanceIsOpen(){
  try {
    const response=await request('/my/work-timer',{noStore:true,timeoutMs:5000});
    return !!response?.open;
  }catch(_){
    // اینترنت قطع است؛ از آخرین حضور ثبت‌شده در همین گوشی استفاده می‌کنیم.
    try {const s=JSON.parse(await AsyncStorage.getItem('attendance_local_open_v1')||'null');if(s?.check_in&&!s?.check_out)return true;}catch(_){}
    try {return !!(await cachedValue('/my/checkin-config'))?.open;}catch(_){return false;}
  }
}

export async function runInternetWorkWatchdog({source='foreground',force=false}={}){
  let required=true;
  try {const cfg=await getAppConfig(false);required=cfg?.internet_work_required!==false;}catch(_){}
  if(!required||!(await attendanceIsOpen()))return {checked:false,reason:'inactive'};
  const now=Date.now();
  if(!force){try{const last=Number(await AsyncStorage.getItem(CHECK_KEY)||0);if(last&&now-last<INTERNET_WORK_WATCHDOG_INTERVAL_MS)return {checked:false,reason:'interval'};}catch(_){}}
  let status;
  try{status=await NetInfo.fetch();}catch(_){return {checked:false,reason:'network_check_failed'};}
  if(typeof status?.isConnected!=='boolean')return {checked:false,reason:'network_state_unknown'};
  // A Wi-Fi/mobile connection does not mean that Internet access works.
  // Only an explicit unreachable result is evidence; null is inconclusive.
  const offline=status.isConnected===false || (status.isConnected===true && status.isInternetReachable===false);
  const at=new Date(now).toISOString();
  // نخست هشدار صوتی شروع می‌شود؛ سپس شاهد خاموشی برای ارسال آفلاین ثبت می‌شود.
  if(offline){
    let warningPlayer=null;
    try{warningPlayer=await playSound('internetOff',{volume:1});}catch(_){}
    // A sound playback failure must not erase an observed offline event.
    // The server still evaluates attendance, exemptions and work deductions.
    if(!warningPlayer)console.warn('[internetWorkWatchdog] warning sound unavailable; telemetry retained');
  }
  await postOrQueue('/activity/telemetry',{kind:offline?'internet_off':'internet_on',at,meta:{source,interval_minutes:30,independent_penalty:true}}).catch(()=>{});
  try{await AsyncStorage.setItem(CHECK_KEY,String(now));}catch(_){}
  return {checked:true,offline,penaltyMinutes:offline?30:0};
}
