const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(__dirname+'/../tools/panel_source.jsx','utf8');
function between(a,b){const start=source.indexOf(a);assert.ok(start>=0);const end=source.indexOf(b,start);assert.ok(end>start);return source.slice(start,end);}
// Exercise the actual asynchronous loader with delayed server responses.
const begin=source.indexOf('  const drawUsers=()=>',source.indexOf('function LiveMap(){'));
const end=source.indexOf('\n  useEffect(()=>{',begin);
let resolveRequest,calls=0,loading,updated,error;const markers={};
const context={mapRef:{current:{}},layerRef:{current:{removeLayer(){}}},markersRef:{current:markers},liveRequestRef:{current:false},refreshPendingRef:{current:false},liveMountedRef:{current:true},shiftFilterRef:{current:false},focusRef:{current:''},roleFilterRef:{current:null},personFilterRef:{current:null},onlyOnlineRef:{current:true},centerRef:{current:false},liveDataRef:{current:[]},setLiveLoading:value=>loading=value,setLiveError:value=>error=value,setLiveUpdated:value=>updated=value,setOnlineUsers(){},db:{live:()=>{calls++;return new Promise(resolve=>resolveRequest=resolve);}},L:{divIcon(){return{};},marker(){return{addTo(){return this;},bindPopup(){return this;}};}},markerHtml:()=>'',popupHtml:()=>'',Date};
vm.createContext(context);vm.runInContext(source.slice(begin,end)+'\nglobalThis.load=drawUsers;',context);
(async()=>{
 context.load();context.load();assert.equal(calls,1,'parallel refreshes share a single flight');assert.equal(loading,true);
 resolveRequest([{user_id:1,lat:36,lng:59,online:'0'},{user_id:2,lat:36,lng:59,online:'1'}]);await new Promise(setImmediate);
 assert.ok(!markers[1]&&markers[2],'string zero is offline');assert.ok(updated);assert.equal(error,'');assert.equal(calls,2,'queued refresh runs after the first flight');
 resolveRequest([{user_id:2,lat:36,lng:59,online:'1'}]);await new Promise(setImmediate);assert.equal(loading,false);
 context.load();context.shiftFilterRef.current=true;resolveRequest([]);await new Promise(setImmediate);assert.equal(calls,4,'changed shift reloads immediately after old flight finishes');
 context.liveMountedRef.current=false;resolveRequest([]);await new Promise(setImmediate);
 const admin=between('function AdminRequests(){','// گزارش ثبت حضور');
 assert.ok(admin.includes('انتخاب همهٔ نتایج نمایش‌داده‌شده'));assert.ok(admin.includes("status==='delete'||row.status==='pending'"));
 assert.ok(admin.includes("const context=await GET('/admin/requests/'+row.id+'/leave-context')"));
 assert.ok(admin.indexOf('setReview({ids:')>admin.indexOf("'/leave-context'"),'leave context loads before approval modal is ready');
 assert.ok(admin.includes('failed.push')&&admin.includes('actionLock.current=true'),'bulk failures and double click guard');
 console.log('PASS: map single-flight, stale shift retry, offline string status; bulk selection, pending-only decisions and leave review gate');
})().catch(error=>{console.error(error);process.exitCode=1;});
