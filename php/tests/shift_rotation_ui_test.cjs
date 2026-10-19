const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bundle=fs.readFileSync(require('node:path').join(__dirname,'../app/assets/panel.bundle.js'),'utf8');
const code=bundle.slice(bundle.indexOf('function ShiftRotationReport('),bundle.indexOf('function ShiftReport('));
const states=[],effects=[],calls=[],downloads=[];let index=0,pending=[],props={year:1405,month:7,disabled:false},response;
function nodes(tree,predicate){if(Array.isArray(tree))return tree.flatMap(x=>nodes(x,predicate));if(!tree||typeof tree!=='object')return [];return [...(predicate(tree)?[tree]:[]),...nodes(tree.props.children,predicate)];}
function text(tree){if(Array.isArray(tree))return tree.map(text).join('');if(tree===null||tree===undefined||typeof tree==='boolean')return '';return typeof tree==='object'?text(tree.props.children):String(tree);}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
const c=vm.createContext({React:{createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'Fragment'},
  useState:v=>{const i=index++;if(!(i in states))states[i]=v;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},
  useRef:v=>{const i=index++;return states[i]||(states[i]={current:v});},
  useEffect:(cb,deps)=>{const i=index++;if(!effects[i]||deps.some((d,n)=>d!==effects[i].deps[n]))pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:cb()};});},
  API_BASE:'/api',tok:()=>({Authorization:'Bearer test'}),J_MONTHS:Array.from({length:12},(_,i)=>String(i+1)),
  fetch:async(url,options)=>{calls.push({url,options});return response(url,options);},
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:u=>downloads.push(['revoke',u])},setTimeout:cb=>cb(),
  document:{body:{appendChild(){}},createElement:()=>({click(){downloads.push(['download',this.download]);},remove(){}})}
});
vm.runInContext(code,c);
props.onPeriodChange=(year,month)=>{props={...props,year,month};};
function render(){index=0;const tree=c.ShiftRotationReport(props);const queue=pending;pending=[];queue.forEach(cb=>cb());return tree;}
function button(tree,label){return nodes(tree,n=>n.type==='button'&&text(n)===label)[0];}
const result=(month=7)=>({year:1405,month,source:'live',rows:[{user_id:1,name:'کاربر نمونه',national_code:'0012345678',personnel_code:'0007',morning:.5,afternoon:.5,night:0,matched_days:1,outside_days:0,open_sessions:0}],totals:{morning:.5,afternoon:.5,night:0,matched_days:1,outside_days:0,open_sessions:0}});
(async()=>{
  let tree=render();tree=render();assert(button(tree,'⤓ خروجی اکسل چرخش شیفت').props.disabled);
  const stale=deferred();response=()=>stale.promise;
  const first=button(tree,'محاسبه چرخش شیفت').props.onClick;const request=first();first();assert.equal(calls.length,1,'single-flight report');
  tree=render();nodes(tree,n=>n.type==='select')[0].props.onChange({target:{value:'6'}});render();
  stale.resolve({ok:true,json:async()=>result(7)});await request;tree=render();assert(!text(tree).includes('کاربر نمونه'),'late old-month response ignored');
  response=async()=>({ok:false,json:async()=>({error:'دسترسی گزارش مجاز نیست'})});
  await button(tree,'محاسبه چرخش شیفت').props.onClick();tree=render();assert(text(tree).includes('دسترسی گزارش مجاز نیست'));
  response=async()=>({ok:true,json:async()=>result(6)});
  await button(tree,'محاسبه چرخش شیفت').props.onClick();tree=render();assert(text(tree).includes('0012345678'));assert.equal(nodes(tree,n=>n.type==='th'&&n.props.colSpan===3).length,1);
  const exportWait=deferred();response=()=>exportWait.promise;
  const click=button(tree,'⤓ خروجی اکسل چرخش شیفت').props.onClick;const exporting=click();click();
  assert.equal(calls.filter(x=>x.url.includes('/export')).length,1,'single-flight export');
  exportWait.resolve({ok:true,blob:async()=>({})});await exporting;assert(downloads.some(x=>x[0]==='download'&&x[1].includes('1405_6')));assert(downloads.some(x=>x[0]==='revoke'));
  assert(calls.every(x=>x.options.headers.Authorization==='Bearer test'));
  assert(text(tree).includes('محاسبه چرخش شیفت نیروها'));
  assert(bundle.includes('reportTab === "rotation"'),'tab connected in compiled monthly report');
  for(const e of effects)e?.cleanup?.();
  console.log('PASS rotation UI: period race, duplicate clicks, errors, identity display, grouped headers and authenticated Excel export');
})().catch(e=>{console.error(e);process.exitCode=1;});
