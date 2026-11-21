'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../app/assets/school-complaints-admin.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../app/assets/school-complaints-admin.css'),'utf8');
const beginning=src.indexOf('function Lookup('),ending=src.indexOf('\nfunction Snapshot(',beginning);
assert.ok(beginning>=0&&ending>beginning,'test the real complaints Lookup implementation');
const states=[],refState=[];let index=0,refIndex=0,picked=null;
const h=(type,props,...children)=>({type,props:{...props,children}});
const context={
 h,base:'/school-complaints',errorText:e=>e?.message||'error',
 useState(initial){const i=index++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},
 useRef(initial){const i=refIndex++;if(!(i in refState))refState[i]={current:initial};return refState[i];},
 useEffect(){},
 field:(label,props)=>h('input',{'aria-label':label,...props}),
 Math,document:{activeElement:null,addEventListener(){},removeEventListener(){}},
 setTimeout,clearTimeout,encodeURIComponent,
};
vm.runInNewContext(src.slice(beginning,ending)+'\nthis.Lookup=Lookup;',context);
const props={get:async()=>[],path:'schools',label:'جستجوی مدرسه',seed:[{id:7,name:'مدرسه آزمایشی'}],display:x=>x.name,onPick:x=>{picked=x;}};
const flatten=el=>Array.isArray(el)?el.flatMap(flatten):el&&typeof el==='object'&&el.props?[el,...flatten(el.props.children)]:[];
function render(){index=0;refIndex=0;return flatten(context.Lookup(props));}
let nodes=render();let input=nodes.find(x=>x.type==='input');
assert.equal(input.props.role,'combobox');
assert.equal(input.props['aria-expanded'],false);
assert.equal(input.props['aria-autocomplete'],'list');
input.props.onFocus();
nodes=render();input=nodes.find(x=>x.type==='input');
assert.equal(input.props['aria-expanded'],true);
const list=nodes.find(x=>x.props.role==='listbox'),options=nodes.filter(x=>x.props.role==='option');
assert.ok(list&&list.props.id,'visible results have stable listbox id');
assert.equal(input.props['aria-controls'],list.props.id);
assert.equal(options.length,1);
options[0].props.onClick();
assert.equal(picked.id,7,'option selection returns the selected object');
nodes=render();input=nodes.find(x=>x.type==='input');
assert.equal(input.props.value,'مدرسه آزمایشی');
assert.equal(input.props['aria-expanded'],false,'selection dismisses the results');
input.props.onFocus();nodes=render();input=nodes.find(x=>x.type==='input');
let prevented=false;
input.props.onKeyDown({key:'Escape',preventDefault(){prevented=true;}});
assert.equal(prevented,true);
assert.equal(render().find(x=>x.type==='input').props['aria-expanded'],false);
assert.match(src,/document\.addEventListener\('pointerdown',outside\)/,'outside clicks close lookup');
assert.match(src,/Number\.isSafeInteger\(total\)/,'export refuses corrupted total counts');
assert.match(src,/total>10000/,'export refuses excessive requests before fetching all pages');
assert.match(src,/role:'status','aria-live':'polite'/,'pagination changes are announced');
assert.match(src,/className:'sc-visually-hidden'/,'report table has accessible caption');
assert.match(css,/\.sc-results \[role="option"\]:focus-visible/,'focused options are visibly highlighted');
console.log('PASS complaints lookup, keyboard dismissal, export count safeguards, pagination and report semantics');
