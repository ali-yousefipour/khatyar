const assert=require('node:assert/strict');
const path=require('node:path');
const vm=require('node:vm');
const babel=require('@babel/core');
const compiled=babel.transformFileSync(process.env.RADIO_TEST_SOURCE||path.join(__dirname,'../src/radio/RadioContext.js'),{presets:[require.resolve('babel-preset-expo')],plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')],babelrc:false,configFile:false}).code;
const settle=async()=>{for(let index=0;index<8;index++)await new Promise(resolve=>setTimeout(resolve,2));};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function harness(){
  let index=0,pending=[],requestImpl;const state=[],effects=[],intervals=new Map(),calls=[],played=[];let timerId=0;
  const React={createContext:()=>({Provider:'Provider'}),createElement:(type,props,...children)=>({type,props:{...props,children}}),useContext:()=>null,useMemo:callback=>callback(),useState:initial=>{const slot=index++;if(!(slot in state))state[slot]=initial;return[state[slot],value=>{state[slot]=typeof value==='function'?value(state[slot]):value;}];},useRef:initial=>{const slot=index++;return state[slot]||(state[slot]={current:initial});},useEffect:(callback,deps)=>{const slot=index++;const old=effects[slot];if(!old||deps.some((value,offset)=>value!==old.deps[offset]))pending.push(()=>{old?.cleanup?.();effects[slot]={deps,cleanup:callback()};});}};
  const player=()=>({seekTo(){},play(){},pause(){},release(){}});
  const modules={react:React,'react-native':{Alert:{alert(){}},AppState:{currentState:'active',addEventListener:()=>({remove(){}})},DeviceEventEmitter:{addListener:()=>({remove(){}})},NativeModules:{}},'@react-native-async-storage/async-storage':{getItem:async()=>null,setItem:async()=>{}},'expo-secure-store':{getItemAsync:async()=>'test-token'},'expo-file-system/legacy':{cacheDirectory:'cache/',downloadAsync:async()=>({status:200}),deleteAsync:async()=>{}},'expo-audio':{useAudioPlayer:player,useAudioRecorder:()=>({stop(){}}),setAudioModeAsync:async()=>{},createAudioPlayer:target=>{played.push(target);return player();}},'expo-notifications':{},'../api':{request:async(endpoint,options)=>{calls.push({endpoint,options});return requestImpl(endpoint,options);}},'../config':{apiBase:()=>'https://example.test/api'},'../auth':{useAuth:()=>({user:{id:9}})},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}};
  const exports={};
  vm.runInNewContext(compiled,{exports,require:name=>{if(name.startsWith('@babel/runtime/'))return require(name);if(name.endsWith('.wav'))return name;assert.ok(name in modules,'Unknown import '+name);return modules[name];},setTimeout:(callback,delay)=>setTimeout(callback,Math.min(delay||0,1)),clearTimeout,setInterval:(callback,delay)=>{const id=++timerId;intervals.set(id,{callback,delay});return id;},clearInterval:id=>intervals.delete(id)});
  return{calls,played,respond:callback=>{requestImpl=callback;},render(){index=0;pending=[];const tree=exports.RadioProvider({children:null});pending.forEach(callback=>callback());return tree.props.value;},async tick(){for(const value of [...intervals.values()])if(value.delay===1800)value.callback();await settle();},unmount(){effects.forEach(effect=>effect?.cleanup?.());}};
}
(async()=>{
  const app=harness();const baseline=new Map([[1,10],[2,100]]);const held=new Map();let pendingPoll=null;let nextMessages=[];
  app.respond(async endpoint=>{
    if(endpoint.includes('op=channels'))return{channels:[{id:1,name:'one'},{id:2,name:'two'}],listen_all_allowed:true};
    const url=new URL('https://example.test/'+endpoint),op=url.searchParams.get('op'),channel=Number(url.searchParams.get('channel_id'));
    if(url.searchParams.get('initialize')){if(held.has(channel))return held.get(channel).promise;return{last_message_id:op==='poll-all'?900:baseline.get(channel),messages:[]};}
    if(op==='responsible-recent')return{messages:[{id:90,channel_id:2,audio_url:'/old',sender_id:8,duration_ms:10}]};
    if(op==='poll'||op==='poll-all'){if(pendingPoll){const promise=pendingPoll.promise;pendingPoll=null;return promise;}const messages=nextMessages;nextMessages=[];return{messages};}
    return{ok:true};
  });
  app.render();await settle();let value=app.render();await settle();
  assert.ok(app.calls.some(call=>call.endpoint.includes('initialize=1')),'initial entry must establish a live boundary');
  const switchGate=deferred();held.set(2,switchGate);const changing=value.setChannel(2);value=app.render();await app.tick();
  assert.ok(!app.calls.some(call=>call.endpoint.includes('op=poll&channel_id=2&after=')),'no poll before new-channel initialization');
  switchGate.resolve({last_message_id:100,messages:[]});await changing;held.delete(2);value=app.render();await settle();assert.equal(app.played.length,0,'history is not autoplayed on channel entry');
  nextMessages=[{id:90,channel_id:2,sender_id:8,audio_url:'/old',duration_ms:10},{id:101,channel_id:2,sender_id:8,audio_url:'/new',duration_ms:10}];await app.tick();await settle();
  assert.equal(app.played.length,1,'only messages newer than boundary play');assert.ok(app.played[0].includes('101'));
  value=app.render();await value.playRecentMessage({id:90,channel_id:2,sender_id:8,audio_url:'/old',duration_ms:10});assert.equal(app.played.length,2,'manual history playback remains available');
  const first=deferred(),second=deferred();held.set(1,first);held.set(2,second);
  const switchOne=value.setChannel(1);value=app.render();const switchTwo=value.setChannel(2);value=app.render();second.resolve({last_message_id:200,messages:[]});await switchTwo;first.resolve({last_message_id:11,messages:[]});await switchOne;held.clear();value=app.render();await app.tick();
  assert.equal(value.channelId,2,'rapid A-B-A selection stays on latest choice');assert.ok(app.calls.some(call=>call.endpoint.includes('channel_id=2&after=200')),'late baseline cannot overwrite current cursor');
  const stale=deferred();pendingPoll=stale;const polling=app.tick();await new Promise(resolve=>setTimeout(resolve,2));value=app.render();baseline.set(1,500);await value.setChannel(1);value=app.render();baseline.set(2,600);await value.setChannel(2);value=app.render();stale.resolve({messages:[{id:250,channel_id:2,sender_id:8,audio_url:'/stale',duration_ms:10}]});await polling;await settle();assert.equal(app.played.length,2,'stale response from earlier session cannot play after A-B-A');
  const failure=deferred();held.set(1,failure);const failing=value.setChannel(1);failure.reject(Error('offline'));await failing;held.delete(1);value=app.render();const count=app.calls.length;await app.tick();assert.equal(app.calls.filter(call=>call.endpoint.includes('op=poll&')&&!call.endpoint.includes('initialize')).length,app.calls.slice(0,count).filter(call=>call.endpoint.includes('op=poll&')&&!call.endpoint.includes('initialize')).length,'failed initialization stays paused');assert.equal(value.loadError,'offline');
  await value.setChannel(2);value=app.render();await value.setListenAll(true);value=app.render();await app.tick();assert.ok(app.calls.some(call=>call.endpoint.includes('op=poll-all&after=900')),'all-channel listening has a fresh global boundary');
  app.unmount();console.log('Radio live: initial boundary, channel-switch race, manual history, rapid switching, stale replies, failed initialization and listen-all passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
