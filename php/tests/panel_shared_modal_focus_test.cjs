'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/assets/panel.bundle.js'),'utf8');
const begin=source.indexOf('function Modal('),end=source.indexOf('function seniorityEn(',begin);
assert.ok(begin>=0&&end>begin,'use production compiled shared modal');
let active,handler,cleanup,closed=0;
const effects=[];
const outsider={isConnected:true,focus(){active=this;}};
active=outsider;
const first={getClientRects(){return [1];},focus(){active=this;}};
const last={getClientRects(){return [1];},focus(){active=this;}};
const dialog={
 focus(){active=this;},
 contains(item){return item===this||item===first||item===last;},
 querySelectorAll(){return [first,last];}
};
let dialogs=[dialog];
const documentMock={
 querySelectorAll(){return dialogs;},
 get activeElement(){return active;},
 addEventListener(type,cb){if(type==='keydown')handler=cb;},
 removeEventListener(type,cb){if(type==='keydown'&&handler===cb)handler=null;}
};
const context={
 React:{createElement(type,props,...children){if(props&&props.role==='dialog'&&props.ref)props.ref.current=dialog;return {type,props,children};}},
 useRef(initial){return {current:initial};},
 useEffect(fn){effects.push(fn);},
 document:documentMock,Math
};
vm.runInNewContext(source.slice(begin,end)+'\nthis.Modal=Modal;',context);
context.Modal({title:'آزمون',onClose(){closed++;},children:'محتوا'});
cleanup=effects[0]();
assert.equal(active,dialog,'opening focuses modal');
assert.equal(typeof handler,'function','modal installs keyboard handler');
let prevented=false;
const send=(key,shiftKey=false)=>{prevented=false;handler({key,shiftKey,preventDefault(){prevented=true;}});return prevented;};
assert.ok(send('Tab'),'Tab from the dialog itself is trapped');assert.equal(active,first);
active=outsider;assert.ok(send('Tab'),'Tab from outside is trapped');assert.equal(active,first);
active=outsider;assert.ok(send('Tab',true),'Shift+Tab from outside is trapped');assert.equal(active,last);
assert.ok(send('Tab'),'Tab from last wraps to first');assert.equal(active,first);
assert.ok(send('Tab',true),'Shift+Tab from first wraps to last');assert.equal(active,last);
dialogs=[dialog,{role:'dialog'}];
assert.equal(send('Escape'),false,'underlying dialog must not handle keyboard events while a child is on top');
assert.equal(closed,0,'underlying dialog must not close when another dialog is above it');
dialogs=[dialog];
assert.ok(send('Escape'),'Escape is handled by topmost modal');assert.equal(closed,1);
cleanup();assert.equal(active,outsider,'dialog teardown restores previous focus');
console.log('PASS compiled shared modal keyboard trapping, Escape and focus restoration');
