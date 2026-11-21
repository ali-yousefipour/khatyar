// Clock rollback cannot extend an active challenge while this JS process lives.
// The backend remains authoritative after a reboot/reconnect/offline upload.
const anchors=new Map();
const monoNow=()=>{
  try{const n=globalThis.performance?.now?.();return Number.isFinite(n)?n:null}catch{return null}
};
export function presenceRemainingMs(requestId,deadlineMs,wallNow=Date.now(),monotonicNow=monoNow()){
  const deadline=Number(deadlineMs);
  if(!Number.isFinite(deadline)||deadline<=0)return 0;
  const key=String(requestId||'')+':'+deadline;
  let entry=anchors.get(key);
  if(!entry){
    entry={initialRemaining:Math.max(0,deadline-wallNow),monotonicNow};
    anchors.set(key,entry);
  }
  const wallRemaining=Math.max(0,deadline-wallNow);
  if(monotonicNow===null||entry.monotonicNow===null||monotonicNow<entry.monotonicNow)
    return wallRemaining;
  return Math.min(wallRemaining,Math.max(0,entry.initialRemaining-(monotonicNow-entry.monotonicNow)));
}
export function clearPresenceClock(requestId){
  const prefix=String(requestId||'')+':';
  for(const key of anchors.keys())if(key.startsWith(prefix))anchors.delete(key);
}
