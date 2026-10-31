// Radio history is intentionally limited to the latest three messages from responsible officials; live polling handles playback separately.
import React,{createContext,useContext,useEffect,useMemo,useRef,useState}from'react';import{Alert,AppState,DeviceEventEmitter,NativeModules}from'react-native';import AsyncStorage from'@react-native-async-storage/async-storage';import * as SecureStore from'expo-secure-store';import * as FileSystem from'expo-file-system/legacy';import{createAudioPlayer,useAudioPlayer,useAudioRecorder,setAudioModeAsync,getRecordingPermissionsAsync,requestRecordingPermissionsAsync}from'expo-audio';import * as Notifications from'expo-notifications';import{request}from'../api';import{apiBase}from'../config';import{useAuth}from'../auth';
const RadioContext=createContext(null),KEY_ENABLED='khatyar.radio.enabled',KEY_CHANNEL='khatyar.radio.channel',KEY_VOLUME_PTT='khatyar.radio.volume_ptt',DEFAULT_TALK_MS=25000,MIN_TALK_MS=1500,PTT_RELEASE_GRACE_MS=500,NATIVE=NativeModules?.KhatyarRadio;
const RECORDING_OPTIONS={extension:'.m4a',sampleRate:8000,numberOfChannels:1,bitRate:12000,android:{extension:'.m4a',outputFormat:'mpeg4',audioEncoder:'aac',sampleRate:8000,numberOfChannels:1,bitRate:12000},ios:{extension:'.m4a',outputFormat:'mpeg4aac',audioQuality:0,linearPCMBitDepth:16,linearPCMIsBigEndian:false,linearPCMIsFloat:false,sampleRate:8000,bitRate:12000},web:{mimeType:'audio/webm',bitsPerSecond:12000}};
const extractChannels=r=>{const a=Array.isArray(r)?r:(Array.isArray(r?.channels)?r.channels:Array.isArray(r?.data?.channels)?r.data.channels:Array.isArray(r?.items)?r.items:Array.isArray(r?.data?.items)?r.data.items:[]);return a.filter(x=>x&&x.id!=null).map(x=>({...x,id:Number(x.id)}));};
export function RadioProvider({children}){const{user}=useAuth();const[enabled,setEnabledState]=useState(true),[channels,setChannels]=useState([]),[channelId,setChannelIdState]=useState(0),[volumePttEnabled,setVolumePttEnabledState]=useState(false),[minTalkMs,setMinTalkMs]=useState(MIN_TALK_MS),[busy,setBusy]=useState(false),[speaker,setSpeaker]=useState(null),[recording,setRecording]=useState(false),[status,setStatus]=useState(''),[lastMessage,setLastMessage]=useState(null),[recentMessages,setRecentMessages]=useState([]),[playingMessageId,setPlayingMessageId]=useState(0),[maxTalkMs,setMaxTalkMs]=useState(DEFAULT_TALK_MS),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState(''),[listenAll,setListenAllState]=useState(false),[listenAllAllowed,setListenAllAllowed]=useState(false);const enabledRef=useRef(true),channelRef=useRef(0),lastIdRef=useRef(0),pollingRef=useRef(false),recentLoadingRef=useRef(false),recentRefreshPendingRef=useRef(false),recentRequestIdRef=useRef(0),mountedRef=useRef(true),recordingRef=useRef(false),limitRef=useRef(DEFAULT_TALK_MS),talkStartRef=useRef(0),autoStoppedRef=useRef(false),pttReleaseTimerRef=useRef(null),pttDownRef=useRef(false),talkGenerationRef=useRef(0),pttInputGenerationRef=useRef(0),listenAllRef=useRef(false),listenAllLastIdRef=useRef(0),pollAllRef=useRef(false),resyncingRef=useRef(true),sessionRef=useRef(0),playbackRef=useRef(null),channelsRef=useRef([]),loadSequenceRef=useRef(0);const recorder=useAudioRecorder(RECORDING_OPTIONS);const nativeRecordingRef=useRef(false);
const eotPlayer=useAudioPlayer(require('../../assets/sounds/radio_eot.wav')),pttPressPlayer=useAudioPlayer(require('../../assets/sounds/radio_ptt_press.wav')),rogerPlayer=useAudioPlayer(require('../../assets/sounds/radio_roger_beep.wav')),squelchOpenPlayer=useAudioPlayer(require('../../assets/sounds/radio_squelch_open.wav')),squelchClosePlayer=useAudioPlayer(require('../../assets/sounds/radio_squelch_close.wav'));
const playSfx=(player,duration=90)=>{try{player.volume=0.25;player.seekTo(0);Promise.resolve(player.play()).catch(()=>{});setTimeout(()=>{try{player.pause();}catch(error){}},duration);}catch(error){}};const nativeSfx=kind=>{try{if(NATIVE?.playRadioEffect){NATIVE.playRadioEffect(kind).catch(()=>{});return true}}catch(e){}return false};const playEffect=(kind,fallback)=>{if(!nativeSfx(kind)&&fallback)playSfx(fallback)};const wait=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));const playReceiveLeadIn=async()=>{if(!nativeSfx('receive_leadin'))playSfx(squelchOpenPlayer,70);await wait(100)};const playReceiveTail=async()=>{if(!nativeSfx('receive_tail'))playSfx(squelchClosePlayer,85);await wait(110)};
useEffect(()=>{enabledRef.current=enabled},[enabled]);useEffect(()=>{channelRef.current=channelId},[channelId]);useEffect(()=>()=>{mountedRef.current=false;sessionRef.current++;cancelPlayback();if(pttReleaseTimerRef.current)clearTimeout(pttReleaseTimerRef.current)},[]);
const syncVolumePttNative=async(value)=>{try{if(NATIVE?.setVolumePttEnabled)await NATIVE.setVolumePttEnabled(!!value);else if(NATIVE?.setVolumePtt)await NATIVE.setVolumePtt(!!value)}catch(e){}};
const syncNative=async(overrides={})=>{
  if(!NATIVE||!user?.id||(resyncingRef.current&&!overrides.initialized))return;
  const generation=overrides.generation??sessionRef.current;
  try{const token=await SecureStore.getItemAsync('access');if(generation!==sessionRef.current||!mountedRef.current)return;
    const cid=Number(overrides.channelId??channelRef.current),ch=channelsRef.current.find(x=>Number(x.id)===cid),nextEnabled=overrides.enabled??enabledRef.current;
    const nextVolumePtt=overrides.volumePttEnabled??(volumePttEnabled&&nextEnabled);
    const cursor=overrides.lastMessageId??(listenAllRef.current?listenAllLastIdRef.current:lastIdRef.current);
    await NATIVE.configure(token||'',apiBase(),Number(user.id),cid,nextEnabled,cursor,overrides.listenAll??listenAllRef.current);
    if(generation!==sessionRef.current)return;
    if(NATIVE.setChannelInfo)await NATIVE.setChannelInfo(cid,String(ch?.name||ch?.title||`کانال ${cid}`));
    if(NATIVE.setUserInfo)await NATIVE.setUserInfo(String(user?.role_title||user?.role_name||user?.position_name||user?.position||user?.role||'').trim());
    await syncVolumePttNative(nextVolumePtt);
  }catch(error){if(overrides.initialized)throw error;}
};
const sortRecentMessages=list=>{const map=new Map();for(const m of(Array.isArray(list)?list:[])){if(m&&m.id!=null)map.set(String(m.id),m)}return Array.from(map.values()).sort((a,b)=>Number(b?.id||0)-Number(a?.id||0)).slice(0,3)};
const loadRecentMessages=async()=>{if(!user?.id||!channelRef.current)return;if(recentLoadingRef.current){recentRefreshPendingRef.current=true;return}const requestId=++recentRequestIdRef.current;const requestedChannel=Number(channelRef.current);recentLoadingRef.current=true;try{const r=await request(`/radio-api-v2.php?op=responsible-recent&channel_id=${requestedChannel}`,{noStore:true});if(!mountedRef.current||requestId!==recentRequestIdRef.current||requestedChannel!==Number(channelRef.current))return;const list=Array.isArray(r?.messages)?r.messages:[];setRecentMessages(sortRecentMessages(list))}catch(e){}finally{recentLoadingRef.current=false;if(recentRefreshPendingRef.current){recentRefreshPendingRef.current=false;setTimeout(()=>loadRecentMessages(),0)}}};
const cancelPlayback=()=>{playbackRef.current?.cancel?.();setPlayingMessageId(0);setLastMessage(null);};
const beginSession=()=>{const generation=++sessionRef.current;resyncingRef.current=true;lastIdRef.current=0;listenAllLastIdRef.current=0;recentRequestIdRef.current+=1;setRecentMessages([]);setBusy(false);setSpeaker(null);cancelPlayback();if(NATIVE)NATIVE.stop().catch(()=>{});return generation;};
const shiftDenied=e=>/403|شیفت کاری|ورود خود را ثبت کنید|دسترسی به بی‌سیم/i.test(String(e?.message||e||''));
const initializeLive=async(generation,cid,all=listenAllRef.current)=>{
  if(!cid)return false;
  let response;
  try{response=await request(`/radio-api-v2.php?op=${all?'poll-all':'poll'}&channel_id=${cid}&initialize=1`,{noStore:true});}
  catch(error){
    if(shiftDenied(error)&&generation===sessionRef.current){
      // Keep the native foreground poller alive; it must not play anything
      // until the server confirms that a new attendance session is active.
      cancelPlayback();
      if(NATIVE)await syncNative({channelId:cid,lastMessageId:0,listenAll:all,initialized:true,generation});
      setLoadError('برای استفاده از بی‌سیم ابتدا از «ثبت حضور من» ورود بزنید.');
      return false;
    }
    throw error;
  }
  if(!mountedRef.current||generation!==sessionRef.current||cid!==Number(channelRef.current))return false;
  const cursor=Number(response.last_message_id);
  if(!Number.isSafeInteger(cursor)||cursor<0)throw new Error('همگام‌سازی زندهٔ بی‌سیم ناموفق بود؛ دوباره کانال را بارگذاری کنید.');
  if(all)listenAllLastIdRef.current=cursor;else lastIdRef.current=cursor;
  await syncNative({channelId:cid,lastMessageId:cursor,listenAll:all,initialized:true,generation});
  if(generation!==sessionRef.current)return false;
  resyncingRef.current=false;setLoadError('');return true;
};
const apply=async(r,savedC,savedE)=>{
  const generation=beginSession(),list=extractChannels(r);channelsRef.current=list;setChannels(list);
  const cid=Number(savedC||r?.channel_id||r?.data?.channel_id||list?.[0]?.id||0),chosen=list.find(x=>Number(x.id)===cid)||list[0],actual=Number(chosen?.id||0);
  setChannelIdState(actual);channelRef.current=actual;
  const minLimit=Math.max(MIN_TALK_MS,Number(chosen?.min_talk_ms||MIN_TALK_MS)),limit=Math.max(minLimit,Number(chosen?.max_talk_ms||DEFAULT_TALK_MS));
  setMinTalkMs(minLimit);setMaxTalkMs(limit);limitRef.current=limit;
  const en=savedE===null?((r?.enabled??r?.data?.enabled)!==false):savedE==='1';setEnabledState(en);enabledRef.current=en;
  const allowed=!!r?.listen_all_allowed,all=allowed&&!!r?.listen_all;setListenAllAllowed(allowed);setListenAllState(all);listenAllRef.current=all;
  if(actual&&en)await initializeLive(generation,actual,all);
  return list;
};
const load=async()=>{
  if(!user?.id)return;if(recordingRef.current){setLoadError('پس از پایان ضبط، کانال‌ها را بروزرسانی کنید.');return;}
  const sequence=++loadSequenceRef.current;setLoading(true);setLoadError('');
  try{
    const savedE=await AsyncStorage.getItem(KEY_ENABLED),savedC=await AsyncStorage.getItem(KEY_CHANNEL),savedV=await AsyncStorage.getItem(KEY_VOLUME_PTT);
    const response=await request('/radio-api-v2.php?op=channels',{noStore:true});
    if(!mountedRef.current||sequence!==loadSequenceRef.current)return;
    setVolumePttEnabledState(savedV==='1');const list=await apply(response,savedC,savedE);
    if(!mountedRef.current||sequence!==loadSequenceRef.current)return;
    if(response.shift_allowed===false)setLoadError('بی‌سیم غیرفعال است: برای استفاده باید در «ثبت حضور من» ورود ثبت کنید و خروج نزده باشید.');
    else if(!list.length)setLoadError('هیچ کانال مجازی برای حساب شما دریافت نشد.');else setTimeout(()=>loadRecentMessages(),0);
  }catch(error){if(mountedRef.current&&sequence===loadSequenceRef.current)setLoadError(error.message||'دریافت کانال‌های بی‌سیم ناموفق بود.');}
  finally{if(mountedRef.current&&sequence===loadSequenceRef.current)setLoading(false);}
};
useEffect(()=>{if(!user?.id){loadSequenceRef.current++;beginSession();channelsRef.current=[];setChannels([]);setChannelIdState(0);setRecording(false);setRecentMessages([]);setLoadError('');if(NATIVE)NATIVE.stop().catch(()=>{});return}load();return()=>{try{if(nativeRecordingRef.current&&NATIVE?.stopOutgoingRecording)NATIVE.stopOutgoingRecording().catch(()=>{});nativeRecordingRef.current=false}catch(e){}try{recorder.stop()}catch(e){}}},[user?.id]);
useEffect(()=>{if(!user?.id||!NATIVE)return;syncNative();},[user?.id,enabled,channelId,volumePttEnabled]);
const setVolumePttEnabled=async value=>{const next=!!value;setVolumePttEnabledState(next);await AsyncStorage.setItem(KEY_VOLUME_PTT,next?'1':'0');await syncNative({volumePttEnabled:next});};
const setEnabled=async value=>{
  const next=!!value,generation=beginSession();setEnabledState(next);enabledRef.current=next;setLoading(next);
  try{await AsyncStorage.setItem(KEY_ENABLED,next?'1':'0');if(next&&channelRef.current)await initializeLive(generation,Number(channelRef.current));
    if(generation!==sessionRef.current)return;
    await request('/radio-api-v2.php?op=settings',{method:'POST',body:{enabled:next,channel_id:channelRef.current},queueIfOffline:false});
  }catch(error){if(generation===sessionRef.current)setLoadError(error.message||'همگام‌سازی بی‌سیم ناموفق بود.');}
  finally{if(generation===sessionRef.current)setLoading(false);}
};
const setListenAll=async value=>{
  if(!listenAllAllowed)return;const next=!!value,generation=beginSession();setListenAllState(next);listenAllRef.current=next;setLoading(true);
  try{if(enabledRef.current)await initializeLive(generation,Number(channelRef.current),next);
    if(generation!==sessionRef.current)return;
    await request('/radio-api-v2.php?op=settings',{method:'POST',body:{enabled:enabledRef.current,channel_id:channelRef.current,listen_all:next},queueIfOffline:false});
  }catch(error){if(generation===sessionRef.current)setLoadError(error.message||'همگام‌سازی شنود ناموفق بود.');}
  finally{if(generation===sessionRef.current)setLoading(false);}
};
const setChannel=async id=>{
  const cid=Number(id),selected=channels.find(item=>Number(item.id)===cid);if(!selected||recordingRef.current)return;
  if(cid===Number(channelRef.current)&&!resyncingRef.current)return;
  const generation=beginSession();channelRef.current=cid;setChannelIdState(cid);setLoading(true);setLoadError('');
  const minLimit=Math.max(MIN_TALK_MS,Number(selected.min_talk_ms||MIN_TALK_MS)),limit=Math.max(minLimit,Number(selected.max_talk_ms||DEFAULT_TALK_MS));
  setMinTalkMs(minLimit);setMaxTalkMs(limit);limitRef.current=limit;
  try{if(!await initializeLive(generation,cid))return;
    await AsyncStorage.setItem(KEY_CHANNEL,String(cid));if(generation!==sessionRef.current)return;
    await request('/radio-api-v2.php?op=settings',{method:'POST',body:{enabled:enabledRef.current,channel_id:cid},queueIfOffline:false});
    if(generation===sessionRef.current)loadRecentMessages();
  }catch(error){if(generation===sessionRef.current)setLoadError(error.message||'تغییر کانال ناموفق بود؛ دوباره تلاش کنید.');}
  finally{if(generation===sessionRef.current)setLoading(false);}
};
const playFile=async(message,{generation=sessionRef.current,manual=false,all=false}={})=>{
  const current=()=>mountedRef.current&&generation===sessionRef.current&&(manual||(!resyncingRef.current&&enabledRef.current))&&(all||Number(message.channel_id)===Number(channelRef.current));
  if(playbackRef.current)await playbackRef.current.done;
  if(!message?.audio_url||!current())return;
  const target=(FileSystem.cacheDirectory||FileSystem.documentDirectory)+`radio-${message.id}-${generation}.m4a`;
  let resolveDone;const entry={player:null,timer:null,finished:false,done:new Promise(resolve=>{resolveDone=resolve;})};
  const finish=()=>{if(entry.finished)return;entry.finished=true;if(entry.timer)clearTimeout(entry.timer);try{entry.player?.release();}catch(error){}FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});if(playbackRef.current===entry){playbackRef.current=null;if(mountedRef.current)setPlayingMessageId(0);}resolveDone();};
  entry.cancel=finish;playbackRef.current=entry;
  try{const token=await SecureStore.getItemAsync('access'),url=message.audio_url.startsWith('http')?message.audio_url:apiBase().replace(/\/api$/,'')+message.audio_url;
    await FileSystem.downloadAsync(url,target,{headers:token?{Authorization:`Bearer ${token}`}:{}});
    if(!current()||entry.finished){FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});finish();return;}
    await playReceiveLeadIn();if(!current()||entry.finished){finish();return;}
    entry.player=createAudioPlayer(target);entry.player.play();setLastMessage(message);setPlayingMessageId(Number(message.id)||0);
    entry.timer=setTimeout(async()=>{try{entry.player?.release();entry.player=null;if(current())await playReceiveTail();}finally{finish();}},Math.max(600,Number(message.duration_ms||0)+150));
    await entry.done;
  }catch(error){finish();}
};
const pollFailRef=useRef(0),reconnectRef=useRef(false),nextReconnectRef=useRef(0);
const poll=async()=>{
  if(!user?.id||!enabledRef.current||pollingRef.current||!channelRef.current||resyncingRef.current||listenAllRef.current)return;
  pollingRef.current=true;const requestedChannel=Number(channelRef.current),generation=sessionRef.current;
  try{const response=await request(`/radio-api-v2.php?op=poll&channel_id=${requestedChannel}&after=${lastIdRef.current}`,{noStore:true});
    if(!mountedRef.current||generation!==sessionRef.current||resyncingRef.current)return;
    pollFailRef.current=0;setLoadError('');setBusy(!!response.busy);setSpeaker(response.speaker_id?{id:Number(response.speaker_id),name:response.speaker_name||'کاربر در حال صحبت',role:response.speaker_role||''}:null);
    for(const message of Array.isArray(response.messages)?response.messages:[]){
      if(generation!==sessionRef.current||resyncingRef.current)break;
      if(Number(message.channel_id)!==requestedChannel||Number(message.id)<=lastIdRef.current)continue;
      lastIdRef.current=Number(message.id);
      if(AppState.currentState==='active'&&Number(message.sender_id)!==Number(user.id))await playFile(message,{generation});
    }
    if(generation===sessionRef.current)loadRecentMessages();
  }catch(error){if(generation===sessionRef.current){if(shiftDenied(error)){cancelPlayback();resyncingRef.current=true;setLoadError('بی‌سیم غیرفعال است: ورود فعال در «ثبت حضور من» ندارید یا خروج ثبت کرده‌اید.');}else{pollFailRef.current++;if(mountedRef.current&&pollFailRef.current>=3)setLoadError(error.message||'دریافت پیام بی‌سیم ناموفق بود.');}}}
  finally{pollingRef.current=false;}
};
const pollAll=async()=>{
  if(!user?.id||!enabledRef.current||!listenAllRef.current||pollAllRef.current||resyncingRef.current)return;
  pollAllRef.current=true;const generation=sessionRef.current;
  try{const response=await request(`/radio-api-v2.php?op=poll-all&after=${listenAllLastIdRef.current}`,{noStore:true});
    if(!mountedRef.current||generation!==sessionRef.current||resyncingRef.current)return;
    for(const message of Array.isArray(response.messages)?response.messages:[]){
      if(generation!==sessionRef.current||resyncingRef.current)break;
      if(Number(message.id)<=listenAllLastIdRef.current)continue;listenAllLastIdRef.current=Number(message.id);
      if(AppState.currentState==='active'&&Number(message.sender_id)!==Number(user.id))await playFile(message,{generation,all:true});
    }
  }catch(error){if(generation===sessionRef.current){if(shiftDenied(error)){cancelPlayback();resyncingRef.current=true;setLoadError('بی‌سیم غیرفعال است: ورود فعال در «ثبت حضور من» ندارید یا خروج ثبت کرده‌اید.');}else setLoadError(error.message||'دریافت پیام شنود ناموفق بود.');}}
  finally{pollAllRef.current=false;}
};
const presence=async()=>{if(!user?.id||!enabledRef.current||!channelRef.current)return;try{await request('/radio-api-v2.php?op=presence',{method:'POST',body:{channel_id:channelRef.current}})}catch(e){}};
const retryPendingShift=async()=>{
  if(!resyncingRef.current||!enabledRef.current||!channelRef.current||reconnectRef.current||Date.now()<nextReconnectRef.current)return;
  reconnectRef.current=true;nextReconnectRef.current=Date.now()+7000;
  try{await initializeLive(sessionRef.current,Number(channelRef.current));}
  catch(error){if(mountedRef.current)setLoadError(error.message||'اتصال مجدد بی‌سیم ناموفق بود.');}
  finally{reconnectRef.current=false;}
};
const resyncToLive=async()=>{
  const generation=beginSession();
  try{if(enabledRef.current&&channelRef.current)await initializeLive(generation,Number(channelRef.current));}
  catch(error){if(generation===sessionRef.current)setLoadError(error.message||'همگام‌سازی بی‌سیم ناموفق بود؛ بروزرسانی کنید.');}
};
useEffect(()=>{if(!user?.id||!enabled||!channelRef.current)return;const tick=()=>{if(resyncingRef.current){retryPendingShift();return;}if(listenAllRef.current)pollAll();else poll();presence()};tick();loadRecentMessages();const t=setInterval(tick,1800),sub=AppState.addEventListener('change',s=>{if(s==='active'){resyncToLive().then(tick)}});return()=>{clearInterval(t);try{sub.remove()}catch(e){}}},[user?.id,enabled,channelId]);
useEffect(()=>{if(!NATIVE)return;const send=v=>{try{NATIVE.setForegroundState(v)}catch(e){}};send(AppState.currentState==='active');const sub=AppState.addEventListener('change',s=>send(s==='active'));const hb=setInterval(()=>{if(AppState.currentState==='active')send(true)},2000);return()=>{try{sub.remove()}catch(e){}clearInterval(hb);send(false)}},[]);
const releaseTake=async()=>{try{await request('/radio-api-v2.php?op=release',{method:'POST',body:{channel_id:channelRef.current}})}catch(_){} };
const startTalk=async()=>{if(pttReleaseTimerRef.current){clearTimeout(pttReleaseTimerRef.current);pttReleaseTimerRef.current=null}const inputGeneration=++pttInputGenerationRef.current;pttDownRef.current=true;if(recordingRef.current)return;try{if(resyncingRef.current||!channelRef.current){pttDownRef.current=false;Alert.alert('بی‌سیم',channels.length?'ابتدا یک کانال انتخاب کنید.':'هیچ کانال مجازی برای شما در دسترس نیست.');return}let mic=await getRecordingPermissionsAsync().catch(()=>({granted:false}));if(!mic?.granted)mic=await requestRecordingPermissionsAsync().catch(()=>({granted:false}));if(!mic?.granted){pttDownRef.current=false;return}if(!pttDownRef.current||inputGeneration!==pttInputGenerationRef.current)return;const r=await request('/radio-api-v2.php?op=take',{method:'POST',body:{channel_id:channelRef.current}});if(!r.ok)throw new Error(r.error);if(!pttDownRef.current||inputGeneration!==pttInputGenerationRef.current){await releaseTake();return}const minLimit=Math.max(MIN_TALK_MS,Number(channels.find(x=>Number(x.id)===Number(channelRef.current))?.min_talk_ms||minTalkMs||MIN_TALK_MS));const limit=Math.max(minLimit,Number(r.lease_ms||limitRef.current||DEFAULT_TALK_MS));limitRef.current=limit;setMaxTalkMs(limit);await setAudioModeAsync({playsInSilentMode:true,allowsRecording:true,interruptionMode:'doNotMix'});if(!pttDownRef.current||inputGeneration!==pttInputGenerationRef.current){await releaseTake();return}playEffect('ptt_press',pttPressPlayer);await wait(90);if(!pttDownRef.current||inputGeneration!==pttInputGenerationRef.current){await releaseTake();return}let nativeStarted=false;if(NATIVE?.startOutgoingRecording){try{await NATIVE.startOutgoingRecording();nativeRecordingRef.current=true;nativeStarted=true}catch(_){nativeRecordingRef.current=false}}if(!nativeStarted){await recorder.prepareToRecordAsync()}if(!pttDownRef.current||inputGeneration!==pttInputGenerationRef.current){if(nativeRecordingRef.current){try{await NATIVE.stopOutgoingRecording()}catch(_){}}nativeRecordingRef.current=false;try{await recorder.stop()}catch(_){ }await releaseTake();return}if(!nativeStarted)recorder.record();talkStartRef.current=Date.now();autoStoppedRef.current=false;recordingRef.current=true;talkGenerationRef.current+=1;setRecording(true);setStatus(`در حال صحبت… حداکثر ${Math.round(limit/1000)} ثانیه`);setTimeout(()=>{if(recordingRef.current){autoStoppedRef.current=true;stopTalk({immediate:true})}},limit)}catch(e){pttDownRef.current=false;setStatus('');try{await releaseTake()}catch(_){}Alert.alert('بی‌سیم',String(e.message||'').includes('استفاده')?'کانال در حال استفاده است.':(e.message||'امکان صحبت وجود ندارد.'))}};
const sendAudio=async(uri,duration)=>{if(Number(duration)<minTalkMs)return null;const token=await SecureStore.getItemAsync('access');const res=await FileSystem.uploadAsync(`${apiBase()}/radio-api-v2.php?op=send`,uri,{httpMethod:'POST',uploadType:FileSystem.FileSystemUploadType.MULTIPART,fieldName:'audio',mimeType:'audio/mp4',parameters:{channel_id:String(channelRef.current),duration_ms:String(Math.min(duration,limitRef.current))},headers:token?{Authorization:`Bearer ${token}`}:{}});let data={};try{data=JSON.parse(res.body)}catch(e){}if(res.status<200||res.status>=300||!data.ok)throw new Error(data.error||`ارسال پیام صوتی ناموفق بود (${res.status})`);return data};
const finishTalk=async generation=>{if(!recordingRef.current||generation!==talkGenerationRef.current)return;recordingRef.current=false;pttDownRef.current=false;setRecording(false);setStatus('در حال تکمیل ضبط و ارسال…');try{let uri=null;if(nativeRecordingRef.current&&NATIVE?.stopOutgoingRecording){const result=await NATIVE.stopOutgoingRecording();nativeRecordingRef.current=false;uri=result?.uri||result?.path||null}else{await recorder.stop();uri=recorder.uri}if(!uri)throw new Error('فایل صوتی ساخته نشد.');const duration=Math.max(300,Math.min(limitRef.current,Date.now()-(talkStartRef.current||Date.now())));if(duration<minTalkMs){try{await FileSystem.deleteAsync(uri,{idempotent:true})}catch(_){}await releaseTake();setStatus('');return}await sendAudio(uri,duration);try{await FileSystem.deleteAsync(uri,{idempotent:true})}catch(_){}playEffect(autoStoppedRef.current?'eot':'roger',autoStoppedRef.current?eotPlayer:rogerPlayer);setStatus('');loadRecentMessages();poll()}catch(e){await releaseTake();setStatus('');Alert.alert('بی‌سیم',e.message||'ارسال پیام صوتی ناموفق بود.')}};
const stopTalk=async({immediate=false}={})=>{++pttInputGenerationRef.current;if(!recordingRef.current){pttDownRef.current=false;return}if(immediate){if(pttReleaseTimerRef.current){clearTimeout(pttReleaseTimerRef.current);pttReleaseTimerRef.current=null}return finishTalk(talkGenerationRef.current)}pttDownRef.current=false;if(pttReleaseTimerRef.current)clearTimeout(pttReleaseTimerRef.current);const generation=talkGenerationRef.current;setStatus('در حال تکمیل ضبط…');pttReleaseTimerRef.current=setTimeout(()=>{pttReleaseTimerRef.current=null;if(!pttDownRef.current)finishTalk(generation)},PTT_RELEASE_GRACE_MS)};
useEffect(()=>{if(!NATIVE)return;const sub=DeviceEventEmitter.addListener('khatyarRadioPTT',event=>{if(event?.down)startTalk();else stopTalk()});return()=>{try{sub.remove()}catch(_){}}},[NATIVE,startTalk,stopTalk]);
const value=useMemo(()=>({enabled,channels,channelId,busy,speaker,recording,status,lastMessage,recentMessages,playingMessageId,maxTalkMs,minTalkMs,loading,loadError,listenAll,listenAllAllowed,volumePttEnabled,setVolumePttEnabled,setListenAll,setEnabled,setChannel,startTalk,stopTalk,reloadChannels:load,playRecentMessage:async message=>{if(message?.audio_url)await playFile(message,{manual:true})},backgroundRadio:!!NATIVE}),[enabled,channels,channelId,busy,speaker,recording,status,lastMessage,recentMessages,playingMessageId,maxTalkMs,minTalkMs,loading,loadError,listenAll,listenAllAllowed,volumePttEnabled]);return <RadioContext.Provider value={value}>{children}</RadioContext.Provider>};export const useRadio=()=>useContext(RadioContext);
