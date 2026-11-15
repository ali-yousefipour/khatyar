'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../src/AppLock.js'),'utf8');
const settings=fs.readFileSync(path.join(__dirname,'../src/screens/AppLockSettingsScreen.js'),'utf8');
const list=/export const LOCK_TIMEOUT_SECONDS=\[[^\n]+\];/.exec(app)?.[0];
const fn=/export function lockTimeoutSeconds\(cfg\)\{[^\n]+\}/.exec(app)?.[0];
assert.ok(list&&fn,'App lock duration policy must remain readable and testable');
const ctx=vm.createContext({});
vm.runInContext(list.replace('export ','')+'\n'+fn.replace('export ','')+'\nthis.get=lockTimeoutSeconds;',ctx);
for(const seconds of [10,20,30,60,120,360]){
 assert.equal(ctx.get({timeoutSeconds:seconds}),seconds,'Configured lock duration must be respected');
 assert.match(settings,new RegExp('\\['+seconds+','));
}
assert.equal(ctx.get({timeoutSeconds:999}),30);
assert.match(app,/onStartShouldSetResponderCapture=/,'Nested screen taps must reset inactivity');
assert.match(app,/onMoveShouldSetResponderCapture=/,'Drag gestures must reset inactivity');
assert.match(app,/Date\.now\(\)-lastInteraction\.current>=lockTimeoutSeconds\(cfgRef\.current\)\*1000/);
assert.match(app,/next\.timeoutSeconds=lockTimeoutSeconds\(next\)/,'Runtime updates must normalize duration');
console.log('PASS all 6 lock timeout choices, nested gestures, and persisted configuration');
