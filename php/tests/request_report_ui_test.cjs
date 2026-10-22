const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const bundle=fs.readFileSync(__dirname+'/../app/assets/panel.bundle.js','utf8');
const start=bundle.indexOf('function AdminRequests()'),end=bundle.indexOf('\nfunction ',start+1);
let cursor=0,refCursor=0,states=[],refs=[],loads=[],decisions=[];
const context={React:{createElement:(type,props,...children)=>({type,props:props||{},children})},useEffect(){},
 useState(initial){const i=cursor++;if(states[i]===undefined)states[i]=initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},
 useRef(initial){const i=refCursor++;return refs[i]??=( {current:initial});},Modal(){},fa:String,GET:async()=>({year:1405,month:7,balance:{},requests:[]}),prompt:()=>'',
 db:{adminRequests:()=>new Promise((resolve,reject)=>loads.push({resolve,reject})),adminRequestDecision:async(id,body)=>decisions.push({id,...body})},setTimeout,URL,console};
vm.createContext(context);vm.runInContext(bundle.slice(start,end),context);
const render=()=>{cursor=0;refCursor=0;return vm.runInContext('AdminRequests()',context);};
const nodes=t=>!t||typeof t!=='object'?[]:[t,...(t.children||[]).flat(Infinity).flatMap(nodes)];
const text=t=>typeof t==='string'?t:!t?'':(t.children||[]).flat(Infinity).map(text).join('');
const button=(tree,label)=>nodes(tree).find(n=>n.type==='button'&&text(n)===label);
const input=(tree,label)=>nodes(tree).find(n=>n.type==='input'&&n.props['aria-label']===label);
const tick=()=>new Promise(setImmediate);
(async()=>{
 let tree=render();button(tree,'اعمال فیلتر').props.onClick();
 const rows=[{id:1,type:'annual',unit:'daily',minutes:480,status:'pending',requester:'الف'},{id:2,type:'manual',unit:'hourly',minutes:0,status:'approved',requester:'ب'}];
 loads.shift().resolve(rows);await tick();tree=render();
 assert.ok(text(tree).includes('1 روز'),'daily duration uses days');
 input(tree,'انتخاب درخواست 1').props.onChange({target:{checked:true}});tree=render();
 assert.equal(button(tree,'تأیید گروهی').props.disabled,false);
 nodes(tree).find(n=>n.type==='select').props.onChange({target:{value:'12'}});tree=render();
 assert.equal(button(tree,'تأیید گروهی').props.disabled,true,'changing filter clears hidden selections');
 input(tree,'انتخاب همه درخواست‌های نمایش‌داده‌شده').props.onChange({target:{checked:true}});tree=render();
 await button(tree,'تأیید گروهی').props.onClick();tree=render();assert.ok(text(tree).includes('1 درخواست'),'only pending rows enter decision modal');
 button(tree,'تأیید نهایی عملیات').props.onClick();await tick();assert.equal(decisions.length,1);assert.equal(decisions[0].id,1);
 loads.shift().resolve(rows);await tick();tree=render();
 button(tree,'اعمال فیلتر').props.onClick();button(tree,'اعمال فیلتر').props.onClick();
 const old=loads.shift(),fresh=loads.shift();fresh.resolve([rows[1]]);await tick();old.resolve(rows);await tick();tree=render();
 assert.ok(!input(tree,'انتخاب درخواست 1'),'old response cannot restore outdated requests');
 button(tree,'اعمال فیلتر').props.onClick();loads.shift().reject(new Error('offline'));await tick();tree=render();
 assert.ok(text(tree).includes('offline'));assert.ok(!input(tree,'انتخاب درخواست 2'),'failed refresh clears stale actionable rows');
 console.log('PASS request report UI: daily units, filter selection reset, pending-only batch, stale responses and failure recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
