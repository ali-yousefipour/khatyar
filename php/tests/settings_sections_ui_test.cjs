const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/../tools/panel_source.jsx','utf8'),bundle=fs.readFileSync(__dirname+'/../app/assets/panel.bundle.js','utf8');
const index=JSON.parse(source.match(/const SETTINGS_SECTION_INDEX=(\[[\s\S]*?\]);/)[1]);
assert.equal(index.length,49);assert.equal(new Set(index.map(x=>x.id)).size,49);
assert.ok(!index.some(x=>x.id==='settings-section-14'),'global request settings removed');
assert.ok(!source.includes('function RequestSettings('),'legacy editor removed');
for(const [title,tab] of [['سمت‌ها (نقش‌ها)','access'],['سیاست تمدید اجباری','security'],['📍 اعلان‌های میدانی و حضور','monitoring'],['حذف خودکار تصاویر و پیوست‌ها','backup']])assert.equal(index.find(x=>x.title===title)?.tab,tab);
const start=bundle.indexOf('function Settings()'),end=bundle.indexOf('\nfunction ',start+1),code=bundle.slice(start,end);
let cursor=0;const states=[{},'general',['general'],'','',false];
const context={SETTINGS_SECTION_INDEX:index,React:{createElement:(type,props,...children)=>({type,props:props||{},children})},
 useState(initial){const id=cursor++;if(states[id]===undefined)states[id]=initial;return[states[id],value=>states[id]=typeof value==='function'?value(states[id]):value];},useRef:()=>({current:false}),useEffect(){},fa:String,normalizePanelMenuText:s=>s.toLowerCase(),setTimeout(){},db:{},alert(){},console};
for(const match of code.matchAll(/React\.createElement\(([A-Z]\w*)/g))context[match[1]]=()=>null;
context.React={createElement:(type,props,...children)=>({type,props:props||{},children})};
vm.createContext(context);vm.runInContext(code,context);
const render=()=>{cursor=0;return vm.runInContext('Settings()',context);};
const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...(tree.children||[]).flat(Infinity).flatMap(nodes)];
const text=tree=>typeof tree==='string'?tree:!tree?'':(tree.children||[]).flat(Infinity).map(text).join('');
let tree=render();assert.equal(nodes(tree).filter(n=>n.props.id?.startsWith('settings-section-')).length,index.filter(x=>x.tab==='general').length,'initial mount only includes general cards');
const input=nodes(tree).find(n=>n.type==='input'&&n.props.value==='');assert.ok(input);
const radioButton=nodes(tree).find(n=>n.type==='button'&&text(n).includes('تنظیمات بی‌سیم'));assert.ok(radioButton);radioButton.props.onClick();
tree=render();assert.equal(states[1],'radio');assert.ok(states[2].includes('general')&&states[2].includes('radio'),'visited panes stay mounted');
for(const tab of new Set(index.map(x=>x.tab))){states[1]=tab;states[2]=[tab];tree=render();const cards=nodes(tree).filter(n=>n.props.id?.startsWith('settings-section-'));assert.equal(cards.length,index.filter(x=>x.tab===tab).length,'all cards reachable in '+tab);}
states[3]='موقعیت';tree=render();assert.ok(nodes(tree).some(n=>n.type==='button'&&text(n).includes('تنظیمات موقعیت‌یابی')),'section search reaches relocated card');
console.log('PASS settings: 49 unique reachable sections, retired global request editor, corrected categories, deferred mounting and visited state retention');
