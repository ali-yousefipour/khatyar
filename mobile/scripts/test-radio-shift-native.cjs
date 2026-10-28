const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const plugin=read('mobile/plugins/khatyar-radio-native/KhatyarRadioService.java');
const android=read('mobile/android/app/src/main/java/ir/mashhad/taxicontrol/radio/KhatyarRadioService.java');
const context=read('mobile/src/radio/RadioContext.js');
const php=read('php/lib/RadioShiftGate.php');
const v2=read('php/app/radio-api-v2.php');
const legacy=read('php/app/radio-api.php');
for(const [name,source] of [['Expo native service',plugin],['checked-in Android service',android]]){
  for(const snippet of ['private volatile boolean accessDenied = true','revokeRadioAccess()','pendingAudioUrls.clear()','releasePlayer();','__RADIO_FORBIDDEN__','code == 403','radioAuthorized()','FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK','PowerManager.PARTIAL_WAKE_LOCK','acquireAudioFocus()','releaseAudioFocus()','START_STICKY','isAppInForeground()']){
    // Check whitespace-insensitively; both native variants must fail closed.
    const normalized=s=>s.replace(/\s+/g,'');
    assert.ok(normalized(source).includes(normalized(snippet)),name+' is missing '+snippet);
  }
  assert.match(source,/if\s*\(!radioAuthorized\(\).*?getPrefs\(\)\.getLong\("channelId"/s, name+' PTT must be gated');
  assert.match(source,/if\s*\(!radioAuthorized\(\)\s*\|\|\s*player\s*!=\s*null\s*\|\|\s*pendingAudioUrls\.isEmpty\(\)\)/,name+' queue must be gated');
}
assert.ok(context.includes('retryPendingShift()'),'React Native must retry after the next check-in');
assert.ok(context.includes('cancelPlayback();resyncingRef.current=true'),'React Native must cancel on revocation');
assert.ok(context.includes("attendance_revoked")===false,'React Native should not blindly re-issue native PTT');
assert.match(php,/ORDER BY check_in DESC,id DESC LIMIT 1/,'Latest attendance wins');
assert.match(php,/empty\(\$row\['check_out'\]\)/,'Checked-out session must not qualify');
assert.ok(v2.includes('kh_radio_shift_require($u);'),'V2 must enforce radio shift');
assert.ok(v2.includes('radio_audio_signed_user();} kh_radio_shift_require($u);'),'Signed audio must re-check shift');
assert.ok(legacy.includes('kh_radio_shift_require($u)'),'Legacy must enforce shift');
console.log('PASS radio shift gate: foreground/background/locked-screen native paths, audio focus, checkout invalidation and re-check-in recovery');
