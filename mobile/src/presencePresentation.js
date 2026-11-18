export function presenceDeadline(startedAt, windowMinutes, now=Date.now()) {
  const start=Number(startedAt);
  return (Number.isFinite(start)&&start>0?start:now)+Math.max(1,Number(windowMinutes)||1)*60000;
}

export function mergePresenceRows(server, scheduled, completions, userId, day) {
  const items=scheduled.map(item=>({...item}));
  const used=new Set(items.map(item=>String(item.request_id||item.id)));
  const owned=item=>item&&(!item.user_id||Number(item.user_id)===Number(userId));
  for(const row of server){
    const id=String(row.request_id||row.id);
    if(used.has(id))continue;
    const key=completions[id]?id:(id.startsWith('slot_')?day+'_'+row.slot:id);
    const completion=completions[key];
    items.push({...row,status:owned(completion)?completion.status:row.status});
    used.add(id);
    if(owned(completion))used.add(key);
  }
  for(const [id,item] of Object.entries(completions)){
    if(item.day===day&&Number(item.user_id)===Number(userId)&&!used.has(id)){
      items.push({id,request_id:id,sent_time:item.slot,immediate:item.immediate,status:item.status});
    }
  }
  return items;
}
