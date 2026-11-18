// A response from an unmounted attendance screen must not undo a later write.
// This generation deliberately survives screen unmount/remount.
export const attendanceMutationEpoch = {current:0};
const listeners=new Set();
export function subscribeAttendanceChanges(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function publishAttendanceChange(){
  attendanceMutationEpoch.current++;
  for(const listener of listeners){try{listener();}catch(_) {}}
}

export function retainQueuedOpen(localOpen, pending, userId) {
  return pending&&localOpen?.check_in&&Number(localOpen.owner_user_id)===Number(userId)
    ? localOpen : null;
}
