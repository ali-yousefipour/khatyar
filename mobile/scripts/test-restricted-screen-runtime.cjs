'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const babel=require('@babel/core');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../App.js'),'utf8');
const start=source.indexOf('function RestrictedScreen(');
const end=source.indexOf('function MainStack(',start);
assert.ok(start>=0&&end>start,'RestrictedScreen exists');
const compiled=babel.transformSync(source.slice(start,end),{
  filename:path.resolve(__dirname,'../App.js'),presets:[require.resolve('babel-preset-expo')],babelrc:false,configFile:false
}).code;
const jsx=(type,props)=>({type,props:props||{}});
const SECRET=()=>null;
let user={id:11,role_id:1,level:5,is_admin:false,role_title:'بازرس'};
let activeGrants=['Secret'];
const states=[],effectKeys=[],cleanup=[];
let cursor=0,effectCursor=0,effects=[];
const React={
  createElement:(type,props,...children)=>jsx(type,{...props,children}),
  useState(initial){
    const index=cursor++;
    if(!(index in states))states[index]=initial;
    return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];
  },
  useEffect(callback,deps){
    const index=effectCursor++,key=JSON.stringify(deps);
    if(effectKeys[index]!==key){effectKeys[index]=key;effects.push({index,callback});}
  },
};
const context={
  React,useAuth:()=>({user}),View:'View',Text:'Text',TouchableOpacity:'TouchableOpacity',
  ActivityIndicator:'ActivityIndicator',C:{paper:'#fff',brand:'green',muted:'gray',ink:'black'},
  FONT:{regular:'regular',bold:'bold'},
  readAppItems:async()=>activeGrants.slice(),
  refreshAppItems:async()=>activeGrants.slice(),
  require:name=>{
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'Fragment'};
    if(name==='react')return React;
    if(name.startsWith('@babel/runtime/'))return require(name);
    throw Error('Unexpected compiled require: '+name);
  },
};
vm.createContext(context);
vm.runInContext(compiled+'\nthis.RestrictedScreen=RestrictedScreen;',context);
function render(){
  cursor=0;effectCursor=0;
  return context.RestrictedScreen({routeName:'Secret',Component:SECRET});
}
function runEffects(){
  const next=effects;effects=[];
  for(const {index,callback} of next){cleanup[index]?.();cleanup[index]=callback();}
}
async function settle(){
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
}
(async()=>{
  assert.notEqual(render().type,SECRET,'before authorization the restricted page stays hidden');
  runEffects();await settle();
  assert.equal(render().type,SECRET,'permitted route renders after scoped permissions resolve');
  user={...user,role_id:2,role_title:'اپراتور'};
  activeGrants=[];
  assert.notEqual(render().type,SECRET,'old role cannot render a protected route before next effect runs');
  runEffects();await settle();
  assert.notEqual(render().type,SECRET,'revoked route stays denied after permission refresh');
  user={...user,id:22,role_id:1,role_title:'بازرس'};
  activeGrants=['Secret'];
  assert.notEqual(render().type,SECRET,'previous account permission cannot render for a new account');
  runEffects();await settle();
  assert.equal(render().type,SECRET,'new account becomes authorized only after its own permission load');
  user={...user,is_admin:true};
  assert.notEqual(render().type,SECRET,'admin flag transition cannot reuse the previous render grant');
  runEffects();await settle();
  assert.equal(render().type,SECRET,'new admin scope is authorized only after refresh');
  console.log('PASS runtime role guard: no old-role/account/admin render before permission refresh');
})().catch(error=>{console.error(error);process.exitCode=1;});
