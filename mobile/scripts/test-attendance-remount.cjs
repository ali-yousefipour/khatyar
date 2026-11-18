const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const stateSource=fs.readFileSync(path.join(root,'src/attendanceState.js'),'utf8').replace(/export /g,'');
const {attendanceMutationEpoch,retainQueuedOpen,subscribeAttendanceChanges,publishAttendanceChange}=new Function(stateSource+';return {attendanceMutationEpoch,retainQueuedOpen,subscribeAttendanceChanges,publishAttendanceChange};')();
let refreshes=0;const unsubscribe=subscribeAttendanceChanges(()=>refreshes++);publishAttendanceChange();assert.equal(refreshes,1,'New screen receives confirmation of an in-flight write from old screen');unsubscribe();publishAttendanceChange();assert.equal(refreshes,1);
const local={id:'local_1',owner_user_id:7,check_in:'2026-11-18T10:00:00Z'};
assert.equal(retainQueuedOpen(local,true,7),local,'Pending check-in survives an empty server snapshot');
assert.equal(retainQueuedOpen(local,false,7),null,'Confirmed server closure remains authoritative');
assert.equal(retainQueuedOpen(local,true,8),null,'Other account cannot inherit the session');
const api=fs.readFileSync(process.argv[2]||path.join(root,'src/api.js'),'utf8');
const begin=api.indexOf('async function requestImpl(');
const end=api.indexOf('// Remove a stale GET snapshot',begin);
assert.ok(begin>0&&end>begin);
const region=api.slice(begin,end).replace(/export /g,'');
const calls=[];const memCache={};const stored=new Map();
const request=new Function('attendanceMutationEpoch','calls','memCache','stored',`
let userCacheEpoch=0,accessToken='test';
const isAttendanceRead=path=>path==='/my/checkin-config'||path==='/my/work-timer';
const setLastApi=()=>{},apiBase=()=> 'https://test.invalid',isQueueableWrite=()=>false;
const AsyncStorage={async setItem(k,v){stored.set(k,v)},async getItem(k){return stored.get(k)||null}};
function fetchTimeout(url){return new Promise(resolve=>calls.push({url,resolve:data=>resolve({status:200,ok:true,async text(){return JSON.stringify(data)}})}));}
${region}
return request;`)(attendanceMutationEpoch,calls,memCache,stored);
(async()=>{
  const staleScreenEpoch=attendanceMutationEpoch.current;
  const old=request('/my/checkin-config',{noStore:true});
  assert.equal(calls.length,1);
  attendanceMutationEpoch.current++; // Successful check-in, then screen remount.
  const fresh=request('/my/checkin-config',{noStore:true});
  assert.equal(calls.length,2,'Remounted screen must not reuse a pre-check-in GET');
  calls[1].resolve({open:{id:71}});assert.equal((await fresh).open.id,71);
  calls[0].resolve({open:null});await old;
  assert.notEqual(staleScreenEpoch,attendanceMutationEpoch.current,'Old screen response is rejected across remount');
  const staleCache=request('/my/work-timer');
  attendanceMutationEpoch.current++;
  calls[2].resolve({open:null,elapsed_sec:0});await staleCache;
  assert.equal(memCache['cache:/my/work-timer'],undefined,'Old response cannot repopulate attendance cache');
  const same=request('/me/full-profile',{noStore:true});
  attendanceMutationEpoch.current++;
  const shared=request('/me/full-profile',{noStore:true});
  assert.equal(same,shared,'Unrelated GET deduplication is preserved');
  calls[3].resolve({id:7});await same;
  const screen=fs.readFileSync(path.join(root,'src/screens/CheckInScreen.js'),'utf8');
  assert.match(screen,/const attendanceStateEpochRef = attendanceMutationEpoch/);
  assert.match(screen,/else if\(fallback\|\|queuedOpen\)/);
  assert.match(screen,/if\(syncEpoch!==attendanceStateEpochRef.current\)return/);
  console.log('PASS attendance remount: queued session, account isolation, authoritative closure, stale GET sharing/cache and cross-screen generations');
})().catch(error=>{console.error(error);process.exitCode=1;});
