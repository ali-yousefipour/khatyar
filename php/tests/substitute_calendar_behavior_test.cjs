const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ts=require(require.resolve('typescript',{paths:[path.join(__dirname,'..'),path.join(__dirname,'../..')]}));
const source=fs.readFileSync(path.join(__dirname,'../tools/panel_source.jsx'),'utf8');
const from=source.indexOf('function substituteMonthDays('),to=source.indexOf('\nfunction ShiftManager(',from);
const compiled=ts.transpileModule(source.slice(from,to),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020}}).outputText;
const slots=[],effects=[],requests=[];let cursor=0,pending=[],tree,dirty=false,printed='',exported,pdf;
const depsEqual=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
const context={window:{KhatyarSubstitutePdf:{download:async(rows,options)=>{pdf={rows,options};}}},setInterval:()=>1,clearInterval:()=>{},db:{holidays:async()=>[]},Intl,Date,AbortController,encodeURIComponent,API_BASE:'/api',tok:()=>({}),fa:v=>Number.isFinite(Number(v))?Number(v).toLocaleString('fa'):'—',exportXlsx:rows=>{exported=rows;},printLetterhead:(_title,html)=>{printed=html;},React:{createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)}),Fragment:'fragment'},
 useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{const next=typeof v==='function'?v(slots[i]):v;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
 useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
 useMemo(fn){cursor++;return fn();},
 useEffect(fn,deps){const i=cursor++;if(!depsEqual(effects[i]?.deps,deps)){pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}},
 fetch(url,options){let resolve;const promise=new Promise(r=>resolve=r);requests.push({url,options,resolve(response){resolve({...response,status:response.status??200,text:response.text??(async()=>JSON.stringify(await response.json()))});}});return promise;}};
vm.createContext(context);vm.runInContext(compiled,context);
assert.equal(context.substituteSegmentPlannedMinutes({s:'22:00',e:'06:00'}),480,'overnight segment duration remains eight hours');
assert.equal(context.substituteSegmentPlannedMinutes({s:'26:00',e:'29:00'}),180,'extended overnight hours are not double counted');
assert.equal(context.substituteSegmentPlannedMinutes({s:'bad',e:'09:00'}),null,'unknown segment times never become a fabricated zero');
assert.equal(context.substituteSegmentPlannedMinutes({s:'06:00',e:'14:00',planned_minutes:360}),360,'explicit planned segment duration wins over clock difference');
function render(){let rounds=0;do{dirty=false;cursor=0;tree=context.SubstituteCalendar();const jobs=pending;pending=[];jobs.forEach(fn=>fn());assert(++rounds<15,'render settled');}while(dirty);return tree;}
async function flush(){await new Promise(resolve=>setImmediate(resolve));render();await new Promise(resolve=>setImmediate(resolve));render();}
// Undefined JSX children must not reset traversal to the root.
function nodes(node){if(arguments.length===0)node=tree;return node&&typeof node==='object'&&Array.isArray(node.children)?[node,...node.children.flatMap(n=>nodes(n))]:[];}
assert.deepEqual(nodes(undefined),[],'undefined child never restarts traversal');
const findLabel=label=>nodes().find(n=>n.props['aria-label']===label);
const text=node=>typeof node==='string'?node:node&&typeof node==='object'?node.children.map(text).join(''):'';
const button=caption=>nodes().find(n=>n.type==='button'&&text(n)===caption);
const dayButton=date=>nodes().find(n=>n.type==='button'&&String(n.props['aria-label']||'').startsWith(date+'،'));
const cards=()=>nodes().filter(n=>n.type==='article'&&n.props.className==='sc-shift-card');
function choose(label,value){findLabel(label).props.onChange({target:{value}});render();}
(async()=>{
 render();requests.find(r=>r.url.includes('/admin/lines')).resolve({ok:true,json:async()=>[{id:7,code:'۷',origin:'مبدأ',destination:'مقصد'}]});requests.find(r=>r.url.includes('/admin/substitute-calendar/users')).resolve({ok:true,json:async()=>[{id:1,name:'اول'},{id:2,name:'دوم'}]});await flush();
 choose('نیروی جایگزین','1');const first=requests.at(-1);assert(nodes().some(n=>n.props.role==='status'),'loading visible');
 choose('نیروی جایگزین','');assert(first.options.signal.aborted);assert(!nodes().some(n=>n.props.role==='status'),'clearing selection clears loading');
 choose('نیروی جایگزین','2');const second=requests.at(-1);const date=new URL('https://local'+second.url).searchParams.get('dates').split(',')[0];
 const shift={title:'صبح',segments:[{s:'06:00',e:'14:00'},{s:'16:00',e:'18:00'}],segment_locations:[{line_id:7,line_name:'خط ۷',service_location:'ایستگاه ثبت‌شده'},null],location_status:'partial'};
 second.resolve({ok:true,json:async()=>({days:{[date]:{cover:[{request_id:1,absent_name:'<img src=x onerror=alert(1)>',shift},{request_id:2,absent_name:'دوم',shift}],history:[{request_id:3,absent_name:'منقضی',shift}]}}})});await flush();
 assert.equal(cards().length,2,'multiple active cards directly visible; history hidden');assert(cards().every(c=>text(c).includes('۰۶:۰۰')&&text(c).includes('۱۴:۰۰')&&text(c).includes('۱۶:۰۰')&&text(c).includes('۱۸:۰۰')),'real clock strings visible without opening details');
 await button('دانلود PDF مستقل').props.onClick();assert.equal(pdf.options.person,'دوم');const monthDates=new URL('https://local'+second.url).searchParams.get('dates').split(',');assert.equal(new Set(pdf.rows.map(r=>r['تاریخ'])).size,monthDates.length);assert.equal(pdf.rows.filter(r=>r['روز خالی']).length,monthDates.length-1);assert(pdf.rows.every(r=>r['روز هفته']&&r['نیروی جایگزین']==='دوم'));assert.equal(pdf.rows.filter(r=>!r['روز خالی']).length,4);const actual=pdf.rows.filter(r=>!r['روز خالی']);assert.equal(actual[0]['شروع'],'۰۶:۰۰');assert.equal(actual[0]['پایان'],'۱۴:۰۰');assert.equal(actual[1]['شروع'],'۱۶:۰۰');assert.equal(actual[1]['پایان'],'۱۸:۰۰');
 button('خروجی Excel فیلترشده').props.onClick();assert.equal(exported.length,4,'each source segment exported');
 assert.equal(exported[0]['مدت برنامه‌ریزی‌شده (دقیقه)'],(480).toLocaleString('fa'),'first segment gets own eight-hour duration');
 assert.equal(exported[1]['مدت برنامه‌ریزی‌شده (دقیقه)'],(120).toLocaleString('fa'),'second segment gets own two-hour duration instead of duplicate full-shift duration');assert.equal(exported[0]['خط یا محل خدمت'],'ایستگاه ثبت‌شده','verified historical location exported');assert.equal(exported[1]['خط یا محل خدمت'],'محل خدمت تاریخی ثبت نشده','unknown historic line not fabricated');
 button('چاپ / ذخیره PDF').props.onClick();assert(printed.includes('&lt;img'));assert(!printed.includes('<img src=x'),'print content escaped');
 choose('فیلتر خط خدمت','7');assert.equal(cards().length,2,'line filter keeps only matching verified shift records');choose('فیلتر خط خدمت','all');
 first.resolve({ok:true,json:async()=>({days:{[date]:{cover:[{request_id:9,absent_name:'STALE',shift}]}}})});await flush();
 assert(!nodes().some(n=>text(n).includes('STALE')),'aborted stale response cannot replace selected user');
 choose('وضعیت تخصیص','history');assert.equal(cards().length,1,'history filter shows historical row');
 choose('نیروی جایگزین','1');requests.at(-1).resolve({ok:true,status:200,text:async()=>''});await flush();
 assert(nodes().some(n=>n.props.role==='alert'&&text(n).includes('پاسخ سرور خالی است')),'empty response produces controlled error');
 assert(!button('دانلود PDF مستقل')||button('دانلود PDF مستقل').props.disabled===true,'failed response cannot export fake empty month');
 console.log('PASS component behavior: selection/loading, stale response, multi-card/history filtering, Excel segments and escaped print');
})().catch(e=>{console.error(e);process.exitCode=1;});
