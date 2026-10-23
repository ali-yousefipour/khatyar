const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bundle=fs.readFileSync(__dirname+'/../app/assets/panel.bundle.js','utf8');
const a=bundle.indexOf('function ApprovedRequestEditor('),b=bundle.indexOf('\nfunction AdminRequests(',a),source=bundle.slice(a,b);assert(a>=0&&b>a);
const nodes=t=>Array.isArray(t)?t.flatMap(nodes):!t||typeof t!=='object'?[]:[t,...nodes(t.children||[])];
const text=t=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.children||[]):String(t);
const tick=()=>new Promise(setImmediate),event={preventDefault(){}};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
const record=extra=>({id:3,user_id:12,type:'annual',unit:'hourly',status:'approved',requester:'کاربر آزمون',the_date:'1405-07-01',from_jdate:'1405-07-01',to_jdate:'1405-07-01',from_time:'08:00',to_time:'09:00',edit_token:'a'.repeat(64),...extra});
function harness(row){let states=[],refs=[],cursor=0,refCursor=0,started=false,cleanup;const calls=[],saved=[],closed=[];
 const c={React:{createElement:(type,props,...children)=>({type,props:props||{},children})},Modal(){},JDate(){},fa:String,
 useState:v=>{const i=cursor++;if(!(i in states))states[i]=v;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},
 useRef:v=>{const i=refCursor++;return refs[i]??={current:v};},useEffect:fn=>{if(!started){started=true;cleanup=fn();}},
 GET:async()=>await row,db:{adminRequestEdit:async(id,body)=>{calls.push({id,body});return c.response();}},response:async()=>({id:3,status:'approved'}),
 props:{requestId:3,users:[{id:12,first_name:'درخواست‌کننده'},{id:9,first_name:'جایگزین',last_name:'نمونه'}],onClose:()=>closed.push(true),onSaved:r=>saved.push(r)}};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,calls,saved,closed,render(){cursor=refCursor=0;return c.ApprovedRequestEditor(c.props);},unmount(){cleanup?.();}};
}
const input=(t,label)=>nodes(t).find(n=>n.props['aria-label']===label);
const form=t=>nodes(t).find(n=>n.type==='form');
const change=(h,label,value)=>input(h.render(),label).props.onChange({target:{value}});
(async()=>{
 const h=harness(record());h.render();await tick();let t=h.render();assert(text(t).includes('کاربر آزمون'));assert(nodes(t).filter(n=>n.type===h.c.JDate).every(n=>n.props.jalali===true),'request dates must use Jalali values');
 await form(t).props.onSubmit(event);assert.equal(h.calls.length,0);assert(text(h.render()).includes('علت اصلاح'));
 change(h,'علت اصلاح درخواست','اصلاح ساعت اشتباه');change(h,'ساعت شروع درخواست','12:00');change(h,'ساعت پایان درخواست','11:00');await form(h.render()).props.onSubmit(event);assert.equal(h.calls.length,0);assert(text(h.render()).includes('ساعت شروع باید کوچک‌تر'));
 change(h,'ساعت پایان درخواست','12:00');await form(h.render()).props.onSubmit(event);assert.equal(h.calls.length,0,'equal endpoints rejected before HTTP');
 change(h,'ساعت پایان درخواست','13:00');const wait=deferred();h.c.response=()=>wait.promise;const save=form(h.render()).props.onSubmit;const pending=save(event);save(event);assert.equal(h.calls.length,1,'single-flight save');t=h.render();assert(nodes(t).some(n=>n.type==='fieldset'&&n.props.disabled));nodes(t).find(n=>n.type===h.c.Modal).props.onClose();assert.equal(h.closed.length,0,'cannot dismiss a saving edit');
 assert.equal(h.calls[0].body.edit_token,'a'.repeat(64));assert.equal(h.calls[0].body.to_time,'13:00');assert(!('substitute_user_id' in h.calls[0].body));assert(!('user_id' in h.calls[0].body));assert(!('attachment_data' in h.calls[0].body));
 wait.resolve({id:3,status:'approved'});await pending;assert.equal(h.saved.length,1);
 h.c.response=async()=>{throw Error('درخواست هم‌زمان تغییر کرده است');};await form(h.render()).props.onSubmit(event);t=h.render();assert(text(t).includes('درخواست هم‌زمان تغییر کرده'));assert.equal(input(t,'ساعت پایان درخواست').props.value,'13:00','server failure preserves draft');h.unmount();
 const daily=harness(record({unit:'daily',substitute_user_id:9}));daily.render();await tick();t=daily.render();const dates=nodes(t).filter(n=>n.type===daily.c.JDate);assert.equal(dates.length,2);dates[0].props.onChange('1405/07/05');dates[1].props.onChange('1405/07/06');change(daily,'علت اصلاح درخواست','اصلاح بازه روزانه');await form(daily.render()).props.onSubmit(event);assert.equal(daily.calls[0].body.from_jdate,'1405-07-05');assert.equal(daily.calls[0].body.to_jdate,'1405-07-06');assert.equal(daily.calls[0].body.substitute_user_id,'9');
 const manual=harness(record({type:'manual',unit:'daily',in_time:'23:00',out_time:'02:00'}));manual.render();await tick();change(manual,'علت اصلاح درخواست','اصلاح تردد شبانه');change(manual,'ویرایش ساعت ورود','22:00');await form(manual.render()).props.onSubmit(event);assert.equal(manual.calls.length,1,'manual overnight remains allowed');assert.equal(manual.calls[0].body.out_time,'02:00');
 const stale=deferred(),gone=harness(stale.promise);gone.render();gone.unmount();stale.resolve(record());await tick();assert(!form(gone.render()),'late detail response after unmount ignored');
 const wrong=harness(record({status:'pending'}));wrong.render();await tick();assert(!form(wrong.render()),'only approved request can be edited');
 console.log('PASS approved edit UI: Jalali dates, mandatory reason, strict hourly order, tokens, single-flight, immutable identity/media, substitute scope, preserved drafts, manual overnight and stale load cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
