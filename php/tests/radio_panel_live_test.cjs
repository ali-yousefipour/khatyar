const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const bundle=fs.readFileSync(path.join(__dirname,'../app/assets/panel.bundle.js'),'utf8');
const start=bundle.indexOf('function RadioLiveTab('),source=bundle.slice(start,bundle.indexOf('function RadioArchiveTab(',start));
const settle=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve;const promise=new Promise(callback=>{resolve=callback;});return{promise,resolve};};
function nodes(tree,predicate){if(Array.isArray(tree))return tree.flatMap(value=>nodes(value,predicate));if(!tree||typeof tree!=='object')return [];return [...(predicate(tree)?[tree]:[]),...nodes(tree.props.children||[],predicate)];}
function text(tree){if(Array.isArray(tree))return tree.map(text).join('');if(!tree||typeof tree==='boolean')return '';return typeof tree==='object'?text(tree.props.children||[]):String(tree);}
let index=0,pending=[],response=async()=>({last_message_id:200,messages:[]}),rejectPlay=false;
const states=[],effects=[],intervals=new Map(),calls=[],audios=[];let timer=0;
const useState=initial=>{const slot=index++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];};
const useRef=initial=>{const slot=index++;return states[slot]||(states[slot]={current:initial});};
const useEffect=(callback,deps)=>{const slot=index++,previous=effects[slot];if(!previous||deps.some((value,offset)=>value!==previous.deps[offset]))pending.push(()=>{previous?.cleanup?.();effects[slot]={deps,cleanup:callback()};});};
class Audio {constructor(url){this.url=url;this.paused=false;audios.push(this);}play(){return rejectPlay?Promise.reject(Error('blocked')):Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}}
const context=vm.createContext({React:{createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:'Fragment'},useState,useRef,useEffect,Audio,fa:String,setInterval:callback=>{intervals.set(++timer,callback);return timer;},clearInterval:id=>intervals.delete(id)});
vm.runInContext(source,context);
let channel=2;
const api=async query=>{calls.push(query);return response(query);};
function render(){index=0;pending=[];const tree=context.RadioLiveTab({api,channels:[{id:2,name:'two'},{id:3,name:'three'}],cid:channel,setCid:value=>{channel=value;}});pending.forEach(callback=>callback());return tree;}
async function tick(){for(const callback of intervals.values())callback();await settle();}
(async()=>{
  render();await settle();let tree=render();assert.ok(calls[0].includes('initialize=1'));
  response=async()=>({messages:[{id:180,channel_id:2,audio_url:'/old'},{id:201,channel_id:2,audio_url:'/new'}]});await tick();tree=render();assert.equal(audios.length,1);assert.equal(audios[0].url,'/new');
  const staleEnd=audios[0].onended;const stale=deferred();response=()=>stale.promise;const polling=tick();await settle();channel=3;render();channel=2;response=async()=>({last_message_id:600,messages:[]});render();await settle();stale.resolve({messages:[{id:250,channel_id:2,audio_url:'/stale'}]});await polling;staleEnd();await settle();assert.equal(audios.length,1,'old response and old audio completion isolated');assert.equal(audios[0].paused,true,'switch stops previous audio');
  rejectPlay=true;response=async()=>({messages:[{id:601,channel_id:2,audio_url:'/blocked'}]});await tick();tree=render();assert.match(text(tree),/پخش خودکار/);
  const retry=nodes(tree,node=>node.type==='button'&&text(node).includes('فعال‌کردن صدا'))[0];assert.ok(retry,'blocked audio has visible retry');rejectPlay=false;retry.props.onClick();await settle();assert.equal(audios.at(-1).url,'/blocked');assert.equal(audios.length,3,'retry retains failed message');
  effects.forEach(effect=>effect?.cleanup?.());console.log('Radio panel: live baseline, history exclusion, channel A-B-A, playback cancellation and visible autoplay retry passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
