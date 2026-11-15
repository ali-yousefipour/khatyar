'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/manualAttendance.js'),'utf8');
const screen=fs.readFileSync(path.join(__dirname,'../src/screens/RequestsScreen.js'),'utf8');
const checkin=fs.readFileSync(path.join(__dirname,'../src/screens/CheckInScreen.js'),'utf8');
const api=fs.readFileSync(path.join(__dirname,'../src/api.js'),'utf8');
const offline=fs.readFileSync(path.join(__dirname,'../src/offline.js'),'utf8');
const parsed=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:async\s+)?function)/g,'');
const store=new Map();
const AsyncStorage={
 async getItem(k){return store.get(k)||null;},
 async setItem(k,v){store.set(k,String(v));},
 async removeItem(k){store.delete(k);}
};
const FIXED=Date.parse('2026-11-15T09:00:00+03:30');
class Clock extends Date {
 constructor(...args){super(...(args.length?args:[FIXED]));}
 static now(){return FIXED;}
}
const tehranGregorianParts=()=>({year:2026,month:11,day:15});
const g2j=()=>[1405,8,24];
const context=vm.createContext({AsyncStorage,tehranGregorianParts,g2j,Date:Clock,Number,String,Math,JSON,Error,Array,Promise,console});
vm.runInContext(parsed+'\nthis.manual={currentTehranJdate,manualTimeToEpoch,applyManualRequestLocally,getProvisionalManual,provisionalOpen,markManualRequestSynced,markManualOrdinaryCheckout,reconcileProvisionalManual};',context);
const mod=context.manual;
(async()=>{
 assert.equal(mod.currentTehranJdate(),'1405-08-24');
 const uid=42;
 await mod.applyManualRequestLocally(uid,{manual_kind:'in',the_date:'1405-08-24',in_time:'08:00'},'in42',true,null);
 let p=await mod.getProvisionalManual(uid);
 assert.equal(p.status,'pending');
 assert.ok(mod.provisionalOpen(p),'Offline pending entry must immediately start timer');
 assert.ok(mod.provisionalOpen(p).check_in.endsWith('08:00:00'));
 await mod.applyManualRequestLocally(uid,{manual_kind:'out',the_date:'1405-08-24',out_time:'09:00'},'out42',true,null);
 p=await mod.getProvisionalManual(uid);
 assert.ok(p.end_ms&&!mod.provisionalOpen(p),'Queued manual exit closes provisional timer');
 await mod.markManualRequestSynced(uid,'out42',222);
 p=await mod.reconcileProvisionalManual(uid,[{id:222,status:'rejected'}]);
 assert.ok(mod.provisionalOpen(p),'Rejected exit must restore pending entry');
 await mod.markManualRequestSynced(uid,'in42',111);
 p=await mod.reconcileProvisionalManual(uid,[{id:111,status:'approved'},{id:222,status:'rejected'}]);
 assert.ok(mod.provisionalOpen(p)&&!mod.provisionalOpen(p).provisional,'Approved entry must no longer be provisional');
 await mod.markManualOrdinaryCheckout(uid,FIXED);
 p=await mod.getProvisionalManual(uid);
 assert.equal(p.end_ms,FIXED);
 assert.equal(mod.provisionalOpen(p),null,'Ordinary exit cannot reopen a phantom manual attendance');
 await mod.applyManualRequestLocally(99,{manual_kind:'in',the_date:'1405-08-24',in_time:'08:10'},'other',true,null);
 assert.equal((await mod.getProvisionalManual(uid)).request_uuid,'ordinary_checkout_'+FIXED,'Users cannot overwrite each other\'s requests');
 assert.match(screen,/launchCamera\(\{/);
 assert.match(screen,/ImagePicker\.CameraType\?\.front/);
 assert.match(screen,/compressToDataUri\(uri\)/);
 assert.doesNotMatch(screen,/data:image\/jpeg;base64,' \+ \(r\.assets\[0\]\.base64/);
 assert.match(screen,/queueIfOffline:true/);
 assert.match(screen,/applyManualRequestLocally/);
 assert.match(checkin,/markManualOrdinaryCheckout/);
 assert.match(checkin,/provisionalOpen\(currentManual\)/);
 assert.match(api,/markManualRequestSynced/);
 assert.match(offline,/persistEmbeddedAssets\(stored\.body/,'Selfie must persist as a file in offline queue');
 console.log('PASS manual traffic: native camera, queue contract, pending entry/out, rejected exit, approved entry, ordinary checkout and account isolation');
})().catch(err=>{console.error(err);process.exitCode=1});
