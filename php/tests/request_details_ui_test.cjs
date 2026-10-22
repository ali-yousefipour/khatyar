const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const bundle=fs.readFileSync(__dirname+'/../app/assets/panel.bundle.js','utf8');
const slice=name=>{const a=bundle.indexOf('function '+name+'('),b=bundle.indexOf('\nfunction ',a+1);assert.ok(a>=0&&b>a);return bundle.slice(a,b);};
const nodes=t=>!t||typeof t!=='object'?[]:[t,...(t.children||[]).flat(Infinity).flatMap(nodes)];
const text=t=>typeof t==='string'?t:!t?'':(t.children||[]).flat(Infinity).map(text).join('');
const tick=()=>new Promise(setImmediate);
function harness(name,props,response){
 let states=[],cursor=0,effectStarted=false,requests=[];
 const c={React:{createElement:(type,props,...children)=>({type,props:props||{},children})},Modal(){},RequestLeaveUsage(){},fa:String,fj:String,props,
 useState(initial){const i=cursor++;if(states[i]===undefined)states[i]=initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},
 useEffect(fn){if(!effectStarted){effectStarted=true;fn();}},GET:async url=>{requests.push(url);return response;}};
 vm.createContext(c);vm.runInContext(slice(name),c);return{c,requests,render(){cursor=0;return vm.runInContext(name+'(props)',c);}};
}
(async()=>{
 const photo='data:image/jpeg;base64,ZmFrZQ==';
 const h=harness('RequestDetails',{requestId:8,onClose(){}},{id:8,type:'manual',requester:'کاربر آزمون',status:'pending',selfie_data:photo,reason:'شرح درخواست',in_time:'08:00',out_time:'16:00'});
 h.render();await tick();let tree=h.render();assert.equal(h.requests[0],'/admin/requests/8/detail');
 assert.ok(text(tree).includes('شرح درخواست'));assert.equal(nodes(tree).find(n=>n.type==='img').props.src,photo,'manual selfie comes from the selected request');
 nodes(tree).find(n=>n.type==='img').props.onError();tree=h.render();assert.ok(text(tree).includes('تصویر قابل بارگذاری نیست'));
 const bad=harness('RequestDetails',{requestId:9},{id:9,type:'manual',selfie_data:'data:image/svg+xml;base64,PHN2Zz4='});bad.render();await tick();assert.ok(!nodes(bad.render()).some(n=>n.type==='img'),'untrusted image formats are not rendered');
 const empty=harness('RequestDetails',{requestId:10},{id:10,type:'manual'});empty.render();await tick();assert.ok(text(empty.render()).includes('ثبت نشده است'),'historical missing selfie is explicit');
 const usage={through_jdate:'1405-07-30',types:{annual:{used_hours_month:10,used_hours_year:50,remaining_hours_month:8,remaining_hours_year:100,pending_hours_year:2,future_approved_hours_year:8}}};
 const u=harness('RequestLeaveUsage',{requestId:11},{usage_through_today:usage,policy_title:'سیاست آزمون'});tree=u.render();assert.equal(u.requests.length,0,'balance is lazy');
 await nodes(tree).find(n=>n.type==='button').props.onClick();tree=u.render();assert.equal(u.requests[0],'/admin/requests/11/leave-context');assert.ok(text(tree).includes('1405-07-30'));assert.ok(text(tree).includes('سیاست آزمون'));assert.ok(text(tree).includes('50'));assert.ok(text(tree).includes('100'));
 const cached=harness('RequestLeaveUsage',{requestId:12,initialContext:{usage_through_today:usage}},null);tree=cached.render();await nodes(tree).find(n=>n.type==='button').props.onClick();assert.equal(cached.requests.length,0,'approval modal reuses its reviewed balance');
 console.log('PASS request details: row identity, selfie, invalid/missing media, lazy leave hours and approval context reuse');
})().catch(e=>{console.error(e);process.exitCode=1;});
