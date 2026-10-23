const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const bundle=fs.readFileSync(path.join(__dirname,'../app/assets/panel.bundle.js'),'utf8');
const code=bundle.slice(bundle.indexOf('function CompanyWorkReport('),bundle.indexOf('function ShiftReport('));
const states=[],effects=[],calls=[],downloads=[];let index=0,pending=[],response,props={year:1405,month:7,onPeriodChange(){}};
function nodes(t,p){if(Array.isArray(t))return t.flatMap(x=>nodes(x,p));if(!t||typeof t!=='object')return [];return [...(p(t)?[t]:[]),...nodes(t.props.children,p)];}
function text(t){if(Array.isArray(t))return t.map(text).join('');if(t==null||typeof t==='boolean')return '';return typeof t==='object'?text(t.props.children):String(t);}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
const c=vm.createContext({React:{createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'Fragment'},Modal:'Modal',
  useState:v=>{const i=index++;if(!(i in states))states[i]=v;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},
  useRef:v=>{const i=index++;return states[i]||(states[i]={current:v});},
  useEffect:(cb,deps)=>{const i=index++;if(!effects[i])pending.push(()=>{effects[i]={cleanup:cb()};});},
  AbortController,FormData,API_BASE:'/api',tok:()=>({Authorization:'Bearer test'}),J_MONTHS:Array.from({length:12},(_,i)=>String(i+1)),faPlain:String,fa:v=>Number(v).toString(),
  fetch:async(url,options)=>{calls.push({url,options});return response(url,options);},
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:u=>downloads.push(['revoke',u])},setTimeout:cb=>cb(),
  document:{createElement:()=>({click(){downloads.push(['download',this.download]);}})}
});vm.runInContext(code,c);
function render(){index=0;const tree=c.CompanyWorkReport(props);const queue=pending;pending=[];queue.forEach(cb=>cb());return tree;}
function button(tree,label){const b=nodes(tree,n=>n.type==='button'&&text(n)===label)[0];assert(b,'button '+label);return b;}
const ok=data=>({ok:true,text:async()=>JSON.stringify(data)}),archive={sources:[{id:1,file_name:'نمونه.xlsx',created_at:'2026-10-23'}],files:[],account_fields:[{id:7,label:'شماره حساب'}]};
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
  response=async()=>ok(archive);let tree=render();await settle();tree=render();
  assert(text(tree).includes('فایل نهایی شرکت'));assert(button(tree,'ساخت و آرشیو فایل شرکت').props.disabled,'explicit account field required');
  const selects=nodes(tree,n=>n.type==='select');selects.at(-1).props.onChange({target:{value:'7'}});tree=render();assert(!button(tree,'ساخت و آرشیو فایل شرکت').props.disabled);
  const row={source_row:4,first_name:'کاربر',last_name:'نمونه',personnel_code:'0007',role:'ناظر',friday_hours:0,holiday_hours:1.5,overtime_hours:2,errors:['شماره نادرست'],suggested_code:'0009'};
  response=async()=>ok({rows:[row]});await button(tree,'جزئیات و تطبیق').props.onClick();tree=render();assert(text(tree).includes('کاربر'));assert(text(tree).includes('0007'));assert(text(tree).includes('0009'));assert(text(tree).includes('شماره نادرست'));
  const query=nodes(tree,n=>n.type==='input'&&!n.props.type)[0];query.props.onChange({target:{value:'ناموجود'}});tree=render();assert(!nodes(tree,n=>n.type==='td').some(n=>text(n)==='کاربر'),'detail search filters real rows');
  const wait=deferred();response=()=>wait.promise;const click=button(tree,'ساخت و آرشیو فایل شرکت').props.onClick;const generating=click();click();
  assert.equal(calls.filter(x=>x.url.endsWith('/generate')).length,1,'duplicate generation suppressed');tree=render();assert(nodes(tree,n=>n.type==='select').every(n=>n.props.disabled),'period locked during generation');
  response=async()=>ok(archive);wait.resolve(ok({generated:false,snapshot:{rows:[row],has_errors:true,account_field:{label:'شماره حساب'}}}));await generating;tree=render();assert(nodes(tree,n=>n.type==='Modal'&&n.props.title==='مغایرت‌ها را پیش از ساخت فایل شرکت رفع کنید').length===1);
  response=async()=>({ok:false,text:async()=>JSON.stringify({error:'دسترسی مجاز نیست'})});await button(tree,'جزئیات و تطبیق').props.onClick();tree=render();assert(text(tree).includes('دسترسی مجاز نیست'));
  response=async()=>({ok:true,blob:async()=>({})});await button(tree,'دانلود فایل سازمان').props.onClick();assert(downloads.some(x=>x[0]==='download'&&x[1].endsWith('.xlsx')));assert(downloads.some(x=>x[0]==='revoke'));
  const late=deferred();response=()=>late.promise;const loading=button(tree,'جزئیات و تطبیق').props.onClick();for(const e of effects)e?.cleanup?.();late.resolve(ok({rows:[{...row,first_name:'stale-response'}]}));await loading;tree=render();assert(!text(tree).includes('stale-response'),'unmounted late response ignored');
  assert(calls.every(x=>x.options.headers.Authorization==='Bearer test'));assert(bundle.includes('reportTab === "company-final"'));assert(bundle.includes('key: periodKey, year: jy, month: jm'),'period changes remount and reset source selection');
  console.log('PASS company UI: real details, search, zero-prefixed identity, explicit account source, duplicate actions, period locking, errors, authenticated downloads, unmount cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
