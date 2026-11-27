const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/presencePresentation.js'),'utf8').replace(/export /g,'');
const {presenceDeadline,mergePresenceRows}=new Function(source+';return {presenceDeadline,mergePresenceRows};')();
const now=1_800_000_000_000;
assert.equal(presenceDeadline(null,3,now),now+180000,'Delayed delivery gives a full first-open window');
assert.equal(presenceDeadline(now,3,now+120000),now+180000,'Reopening must not reset the deadline');
assert.ok(presenceDeadline(now,3,now+240000)<now+240000,'Expired opened request stays expired');
// A fixed-slot deadline is anchored to the minute boundary, not the second
// at which the app discovers the already-active request.
const gateSource=fs.readFileSync(path.join(root,'src/PresenceGate.js'),'utf8');
const deadlineFn=gateSource.match(/function fixedSlotDeadline\([\s\S]*?\n\}/)?.[0];
assert.ok(deadlineFn,'fixed-slot deadline helper is present');
const fixedSlotDeadline=new Function(deadlineFn+';return fixedSlotDeadline;')();
const discoveredAt=12*60*60000+30*60000+48000; // 12:30:48
assert.equal(fixedSlotDeadline(750,3,750,discoveredAt),12*60*60000+33*60000,
  'discovering a fixed slot 48 seconds late must not grant extra time');
assert.equal(fixedSlotDeadline(750,3,754,discoveredAt),discoveredAt,
  'expired fixed slot is immediately due, not restarted');
const day='2026-11-18';
const done={user_id:7,day,slot:'12:30',immediate:true,status:'queued'};
let rows=mergePresenceRows([{id:'urgent-1',slot:'12:30',status:'missed'}],[],{'urgent-1':done},7,day);
assert.equal(rows[0].status,'queued','Queued immediate capture overrides stale server missed status');
rows=mergePresenceRows([{id:'slot_12:30',slot:'12:30',status:'missed'}],[],{[day+'_12:30']:{...done,immediate:false}},7,day);
assert.equal(rows.length,1,'Fixed-slot aliases must not duplicate completed rows');
assert.equal(rows[0].status,'queued');
rows=mergePresenceRows([],[],{'urgent-1':done},7,day);
assert.equal(rows.length,1,'Offline completion is visible without server rows');
assert.equal(rows[0].status,'queued');
assert.equal(mergePresenceRows([],[],{'urgent-1':done},8,day).length,0,'Other accounts do not see local completions');
rows=mergePresenceRows([{id:'urgent-1',status:'pending'}],[],{'urgent-1':done},8,day);
assert.equal(rows[0].status,'pending','Other-account completion cannot override the server');
assert.equal(mergePresenceRows([],[],{'urgent-1':done},7,'2026-11-19').length,0);
const {patchPresenceAlarm}=require('../plugins/withPresenceNotificationAlarm');
const fixture='override suspend fun build(): Notification { val content=notificationContent; return builder.build() }';
const patched=patchPresenceAlarm(fixture);
assert.match(patched,/content.body\?\.optString\("type"\) == "presence_check"/);
assert.match(patched,/Notification.FLAG_INSISTENT/);
assert.match(patched,/Notification.FLAG_AUTO_CANCEL/);
assert.match(patched,/startForegroundService/);
assert.match(patched,/putExtra\("presence_open", builtNotification.contentIntent\)/);
const service=fs.readFileSync(path.join(root,'plugins/khatyar-radio-native/PresenceAlarmService.java'),'utf8');
assert.match(service,/player.setLooping\(true\)/);
assert.match(service,/PowerManager.PARTIAL_WAKE_LOCK/);
assert.match(service,/onDestroy\(\)[\s\S]*player.release\(\)/);
assert.match(service,/START_NOT_STICKY/);
assert.equal(patchPresenceAlarm(patched),patched,'Native patch is idempotent');
assert.throws(()=>patchPresenceAlarm('unexpected Expo builder'),/builder changed/);
const gate=fs.readFileSync(path.join(root,'src/PresenceGate.js'),'utf8');
assert.match(gate,/presence_wizard_started:/);
assert.match(gate,/if\(!saved\)await AsyncStorage.setItem/);
// Account-scoped completion markers and absolute notification deadlines must
// never accept an old challenge from another user or revive an expired alert.
assert.match(gateSource,/presence_user:'\+userId\+':'/,'presence keys must include authenticated user identity');
assert.match(gateSource,/completedForUser\(await localPresenceCompletions\(\),requestId\)/,
 'local completion must belong to the signed-in account');
assert.match(gateSource,/if\(!alive\|\|Date\.now\(\)>=deadlineMs\)return;/,
 'late delivered notifications must never bypass the original deadline');
const alarmSource=fs.readFileSync(path.join(root,'src/presenceAlarm.js'),'utf8');
assert.match(alarmSource,/if\(dismissNotifications\)try\{await NativeModules\?\.KhatyarRadio\?\.stopPresenceAlarm/,
 'Native alarm survives JS hydration and stops only on explicit wizard acknowledgment');
const policySource=fs.readFileSync(path.join(root,'src/presenceLocalSchedule.js'),'utf8');
assert.match(policySource,/POLICY_REFRESH_MS=60\*1000/,'policy refreshes during the same day');
assert.match(policySource,/request_id:'local_'\+Number\(userId\)/,'random requests require account-scoped IDs');
const wizard=fs.readFileSync(path.join(root,'src/PresenceCheckWizard.js'),'utf8');
assert.match(wizard,/stopPresenceAlarm\(\{dismissNotifications:true\}\)/);
assert.doesNotMatch(wizard,/manualSystemCamera/);
console.log('PASS delayed delivery, persisted first-open deadline, queued/fixed/immediate/offline status, account isolation and native repeating alarm');
