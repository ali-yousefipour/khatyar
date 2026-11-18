const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/presenceLocalSchedule.js'),'utf8');
const gate=fs.readFileSync(path.join(__dirname,'../src/PresenceGate.js'),'utf8');
const wizard=fs.readFileSync(path.join(__dirname,'../src/PresenceCheckWizard.js'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../src/api.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../../php/lib/routes.php'),'utf8');
assert.match(gate,/currentPresencePolicy\(userId,request\)/);
assert.doesNotMatch(gate,/request\('\/my\/presence-random-schedule'/);
assert.match(wizard,/queueIfOffline:true/);
assert.doesNotMatch(wizard,/manualSystemCamera/);
assert.match(wizard,/<PersonalPhotoCapture systemCameraFirst/);
assert.match(api,/markLocalPresenceCompleted|presence_local_completions_v1/);
const cron=server.split("route('GET', '/api/cron/presence-alert'")[1]?.split('\n}, true);')[0];
assert.ok(cron);
assert.doesNotMatch(cron,/presence_random_schedules|_presence_random_schedule_for_attendance|presence_random_attendance/);
const store=new Map();
const notifications=[];
let next=0;
const AsyncStorage={
  async getItem(key){return store.has(key)?store.get(key):null;},
  async setItem(key,value){store.set(key,String(value));},
  async removeItem(key){store.delete(key);}
};
const Notifications={
  SchedulableTriggerInputTypes:{DATE:'date'},
  AndroidNotificationPriority:{MAX:'max'},
  async scheduleNotificationAsync(info){notifications.push(info);return 'notification-'+(++next);},
  async cancelScheduledNotificationAsync(id){notifications.push({cancel:id})}
};
const tehranGregorianParts=()=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=key=>Number(parts.find(part=>part.type===key)?.value||0);
  return{year:get('year'),month:get('month'),day:get('day')};
};
const script=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+/g,'');
const localModule=new Function('AsyncStorage','Notifications','ensurePresenceChannel','tehranGregorianParts',script+
 '\nreturn {scheduleFixedAlerts,currentPresencePolicy,storePresencePolicy,ensureLocalRandomSchedule,localAttendanceSession,markLocalPresenceCompleted,localPresenceCompletions,clearLocalRandomSchedule};')(
 AsyncStorage,Notifications,async()=>{},tehranGregorianParts
);
(async()=>{
  let fetched=0;
  const query=async()=>{fetched++;return {enabled:true,required:false,assigned:true,random_enabled:true,window_minutes:3,slots:[]}};
  const policy1=await localModule.currentPresencePolicy(42,query);
  const policy2=await localModule.currentPresencePolicy(42,query);
  assert.equal(fetched,1,'Presence mode must be fetched only once on the same Tehran day');
  assert.deepEqual(policy1,policy2);
  const start=Date.now()+300000;
  await AsyncStorage.setItem('attendance_local_open_v1',JSON.stringify({id:'local123',owner_user_id:42,check_in:new Date(start).toISOString()}));
  assert.ok(await localModule.localAttendanceSession(42));
  assert.equal(await localModule.localAttendanceSession(99),null,'Offline attendance must be user-scoped');
  const open=await localModule.localAttendanceSession(42);
  const schedule=await localModule.ensureLocalRandomSchedule(42,open,3);
  assert.equal(schedule.items.length,6,'Three checks per four-hour block, six per shift/day');
  for(let i=0;i<schedule.items.length;i++){
    const row=schedule.items[i],block=Math.floor(i/3);
    assert.ok(row.ts*1000>=start+block*4*3600000,'Random check must follow clock-in');
    assert.ok(row.ts*1000<start+(block+1)*4*3600000,'Random check must stay in its four-hour block');
  }
  const originalCount=notifications.length;
  const same=await localModule.ensureLocalRandomSchedule(42,{...open,attendance_id:'server543'},3);
  assert.deepEqual(schedule.items,same.items,'Offline-to-online ID migration must keep random checks stable');
  assert.equal(notifications.length,originalCount,'Local reminders must not duplicate after a refresh');
  await localModule.markLocalPresenceCompleted(schedule.items[0].request_id,'queued');
  assert.equal((await localModule.localPresenceCompletions())[schedule.items[0].request_id].status,'queued');
  await localModule.markLocalPresenceCompleted('urgent-test','queued',{user_id:42,day:'2099-01-01',slot:'09:30',immediate:true});
  assert.equal((await localModule.localPresenceCompletions())['urgent-test'].user_id,42);
  const fixedBefore=notifications.length;
  await localModule.scheduleFixedAlerts({user_id:42,day:'2099-01-01',enabled:true,assigned:true,random_enabled:false,slots:['09:30','25:99'],window_minutes:3});
  assert.equal(notifications.length,fixedBefore+1,'Valid fixed time schedules a notification; invalid times are rejected');
  await localModule.clearLocalRandomSchedule();
  assert.equal(await AsyncStorage.getItem('presence_local_schedule_v2'),null);
  console.log('PASS local random presence: daily config, offline clock-in, 3+3 checks, dedupe, completion and cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
