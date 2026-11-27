const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/presenceAlarm.js'), 'utf8')
  .replace(/^import .*;\s*$/gm, '')
  .replace(/export async function /g, 'async function ')
  + '\nthis.alarmApi = { startPresenceAlarm, stopPresenceAlarm };';

async function run() {
  const players = [];
  let cancelled = 0;
  let delayedResolve;
  const context = {
    setTimeout, clearTimeout, Date,
    Vibration: { vibrate() {}, cancel() { cancelled++; } },
    playSound: async (_key, opts) => {
      assert.equal(opts.loop, true);
      const player = { stopped: false };
      players.push(player);
      if (delayedResolve) await new Promise(resolve => { delayedResolve = resolve; });
      return player;
    },
    stopSound: async p => { if (p) p.stopped = true; },
  };
  vm.runInNewContext(source, context);
  const { startPresenceAlarm, stopPresenceAlarm } = context.alarmApi;

  await startPresenceAlarm(Date.now() + 45);
  assert.equal(players.length, 1, 'looping audio starts without a five-second delay');
  await new Promise(resolve => setTimeout(resolve, 75));
  assert.equal(players[0].stopped, true, 'audio stops when the presence window expires');

  await startPresenceAlarm(Date.now() + 1000);
  await stopPresenceAlarm();
  assert.equal(players[1].stopped, true, 'entering the capture flow stops the alarm');
  assert.ok(cancelled >= 2, 'vibration is cancelled');

  delayedResolve = true;
  startPresenceAlarm(Date.now() + 1000);
  await stopPresenceAlarm();
  // Let the pending player finish loading after cancellation.
  const resolve = delayedResolve;
  delayedResolve = null;
  resolve();
  await new Promise(done => setTimeout(done, 0));
  assert.equal(players[2].stopped, true, 'late audio initialization cannot restart a cancelled alarm');
  let nativeStops=0;const dismissed=[];
  context.NativeModules={KhatyarRadio:{async startPresenceAlarm(){return true;},stopPresenceAlarm(){nativeStops++;}}};
  context.Notifications={async getPresentedNotificationsAsync(){return [{request:{identifier:'presence-1',content:{data:{type:'presence_check'}}}},{request:{identifier:'message-1',content:{data:{type:'message'}}}}];},async dismissNotificationAsync(id){dismissed.push(id);}};
  const count=players.length;
  await startPresenceAlarm();
  assert.equal(players.length,count,'Native service prevents a duplicate JS sound loop');
  await stopPresenceAlarm();
  assert.equal(nativeStops,1,'Any alarm termination must also release native MediaPlayer');
  await stopPresenceAlarm({dismissNotifications:true});
  assert.equal(nativeStops,2,'Wizard entry stops native playback and dismisses presence notification');
  assert.deepEqual(dismissed,['presence-1'],'Only presence notifications are dismissed');
  let finishNative;context.NativeModules.KhatyarRadio.startPresenceAlarm=()=>new Promise(resolve=>{finishNative=resolve;});
  await startPresenceAlarm();
  await stopPresenceAlarm({dismissNotifications:true});
  finishNative(false);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(players.length,count,'Rejected native start cannot revive JS audio after wizard entry');
  await startPresenceAlarm();
  await stopPresenceAlarm({dismissNotifications:true});
  const stoppedBefore=nativeStops;finishNative(true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(nativeStops,stoppedBefore+1,'Late successful native startup is stopped after wizard entry');
  console.log('PASS presence alarm: immediate loop, deadline, cancellation, late playback');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
