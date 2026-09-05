import React from 'react';
import { useAuth } from './auth';
import { startUnreadPolling, stopUnreadPolling, refreshUnreadCounts } from './unread';

export default function UnreadBadgeService(){
  const { user } = useAuth();
  React.useEffect(()=>{
    if(!user?.id){ stopUnreadPolling(); return undefined; }
    refreshUnreadCounts();
    startUnreadPolling();
    return ()=>{};
  },[user?.id]);
  return null;
}
