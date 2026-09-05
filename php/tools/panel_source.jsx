const {useState,useEffect,useRef} = React;
const I8=(name)=><img src={`/assets/icons3d/${name}.png`} alt="" width="30" height="30" loading="eager" decoding="async" style={{objectFit:'contain'}} onError={e=>{e.currentTarget.style.display='none'}}/>;

// چاپ حرفه‌ای با سربرگ (لوگو + عنوان سازمان + تاریخ تولید) — برای استفادهٔ مشترک در همهٔ گزارش‌ها
function printLetterhead(reportTitle, bodyHtml, opts){
  const a=document.getElementById("print-area"); if(!a) return;
  const orgTitle=document.title||"سامانه مدیریت و نظارت بر خطوط و نیروهای اجرایی تاکسیرانی";
  const logo=(window.__brandLogo)||"";
  const now=new Date();
  const dateStr=now.toLocaleDateString("fa-IR")+" — "+now.toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"});
  a.innerHTML=`<div style="padding:26px;font-family:Vazirmatn,sans-serif;color:#1c2530">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0e8a6a;padding-bottom:14px;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:12px">
        ${logo?`<img src="${logo}" style="width:52px;height:52px;object-fit:contain;border-radius:10px"/>`:""}
        <div><div style="font-weight:800;font-size:16px">${orgTitle}</div>
          <div style="font-size:11px;color:#667085;margin-top:2px">گزارش رسمی سامانه — قابل استناد اداری</div></div>
      </div>
      <div style="text-align:left;font-size:11px;color:#667085">تاریخ تولید گزارش<br/><b style="color:#1c2530;font-size:12px">${dateStr}</b></div>
    </div>
    <h2 style="text-align:center;font-size:17px;margin:0 0 4px">${reportTitle}</h2>
    ${opts&&opts.subtitle?`<p style="text-align:center;color:#667085;font-size:12px;margin:0 0 16px">${opts.subtitle}</p>`:'<div style="margin-bottom:16px"></div>'}
    ${bodyHtml}
    <div style="margin-top:28px;padding-top:10px;border-top:1px solid #e4e7ec;font-size:10px;color:#98a2b3;text-align:center">این گزارش به‌صورت خودکار از سامانهٔ مدیریت خطوط و نیروهای اجرایی تاکسیرانی تولید شده است.</div>
  </div>`;
  window.print();
}

/* ============================================================
   لایهٔ API — حالت واقعی به‌صورت خودکار تشخیص داده می‌شود:
   اگر پنل پشت سرور سرو شود (/api/health پاسخ دهد) همه‌چیز واقعی است،
   و اگر فایل به‌تنهایی باز شود، به حالت دموی نمونه برمی‌گردد.
   ============================================================ */
const API_BASE = '/api';
const tok = () => ({ Authorization: 'Bearer ' + (localStorage.token||'') });
// کش کوتاه‌مدت برای کاهش درخواست‌های تکراری (لیست کاربران/خطوط و …) → سرعت بیشتر
const _cache = {};
const _cacheTTL = {
  '/admin/users': 60000, '/admin/roles': 300000, '/admin/lines': 180000,
  '/lines': 180000, '/geofences': 300000, '/admin/zones': 300000, '/zones': 300000,
  '/notice-reasons': 300000, '/checklist/template': 300000, '/admin/settings': 60000,
  '/settings/public': 300000, '/admin/shifts': 120000, '/admin/user-shifts': 120000,
  '/admin/holidays': 300000, '/admin/app-config': 60000
};
function _cacheTtlFor(p){
  for(const [prefix,ttl] of Object.entries(_cacheTTL)) if(p===prefix || p.startsWith(prefix+'?')) return ttl;
  return 0;
}
function _invalidateCache(){ for(const k in _cache) delete _cache[k]; }
async function _readJsonResponse(r){
  const text = await r.text();
  try { return text ? JSON.parse(text) : {}; }
  catch(e){
    const clean = String(text||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,260);
    throw new Error('پاسخ JSON معتبر از سرور دریافت نشد'+(clean?' — '+clean:''));
  }
}
async function GET(p, opts){
  const ttl = (opts&&opts.ttl) || _cacheTtlFor(p);
  const key = p;
  if(ttl && _cache[key] && (Date.now()-_cache[key].t)<ttl) return _cache[key].v;
  const r = await fetch(API_BASE+p,{headers:tok(), cache:'no-store'});
  const v = await _readJsonResponse(r);
  if(!r.ok) throw new Error(v.error||v.message||'خطای سرور');
  if(ttl) _cache[key]={t:Date.now(),v};
  return v;
}

async function downloadProtectedFile(path, filename){
  const r=await fetch(API_BASE+path,{headers:tok(),cache:'no-store'});
  if(!r.ok){let m='خطا در دریافت خروجی';try{const j=await r.json();m=j.error||j.message||m}catch(_){}throw new Error(m)}
  const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=filename||'report.xlsx'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function exportXlsx(rows, sheetName, filename){
  if(typeof XLSX==='undefined') throw new Error('کتابخانه خروجی Excel بارگذاری نشده است');
  const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,String(sheetName||'گزارش').slice(0,31)); XLSX.writeFile(wb,filename);
}
async function SEND(method,p,body){
  const r = await fetch(API_BASE+p,{method,headers:{'content-type':'application/json',...tok()},body:body?JSON.stringify(body):undefined});
  const v = await _readJsonResponse(r);
  if(!r.ok) throw new Error(v.error||v.message||'خطای سرور');
  _invalidateCache(); // بعد از هر تغییر، کش پاک شود تا داده‌ها تازه بماند
  return v;
}
// باز کردن تصویر؛ اگر مسیر فایل فیزیکی (/api/media) باشد با توکن دریافت و در تب جدید باز می‌شود؛
// اگر data URI (base64 قدیمی) باشد مستقیماً باز می‌شود.
async function openMediaUrl(url){
  if(!url) return;
  if(url.indexOf('data:')===0){ const w=window.open(); if(w) w.document.write('<img src="'+url+'" style="max-width:100%"/>'); return; }
  try{
    const full = url.indexOf('/api/')===0 ? (API_BASE.replace(/\/api$/,'')+url) : url;
    const r = await fetch(full,{headers:tok()});
    if(!r.ok) throw new Error('خطا در دریافت تصویر');
    const blob = await r.blob(); const obj = URL.createObjectURL(blob);
    window.open(obj,'_blank');
    setTimeout(()=>URL.revokeObjectURL(obj), 60000);
  }catch(e){ alert(e.message||'خطا در نمایش تصویر'); }
}
// بررسی اتصال به سرور (بدون حالت دمو؛ در صورت قطع اتصال خطا نمایش داده می‌شود)
async function checkConnection(){
  for (const url of [API_BASE+'/health','/health']) {
    try { const r=await fetch(url,{cache:'no-store'}); if(r.ok){ window.__health=await r.json().catch(()=>({})); return true; } } catch(e){}
  }
  return false;
}

const db = {
  // نکته: بدنهٔ ورود به‌جای JSON با فرم urlencoded ارسال می‌شود، چون WAF هاست درخواست‌های
  // POST با Content-Type: application/json را (به‌خصوص برای فیلدهای شبیه به فرم ورود) مسدود
  // می‌کند؛ با تست مستقیم روی سرور واقعی تأیید شد که فرم urlencoded بدون مشکل عبور می‌کند.
  login: async (u,p)=>{
    const form = new URLSearchParams(); form.append('username',u); form.append('password',p); form.append('device_id','web-panel');
    const r = await fetch(API_BASE+'/session/start',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded; charset=UTF-8'},body:form.toString()});
    const d = await _readJsonResponse(r);
    if(!r.ok) throw new Error(d.error||d.message||'ورود ناموفق بود');
    localStorage.token=d.access; return d;
  },
  stats: ()=> GET('/admin/stats'),
  systemHealthDashboard: ()=> GET('/admin/system-health-dashboard'),
  systemHealthRunChecks: ()=> SEND('POST','/admin/system-health-dashboard/run',{}),
  systemHealthIncidents: ()=> GET('/admin/system-health-incidents'),
  deviceHealth: (q='')=> GET('/admin/device-health?q='+encodeURIComponent(q)),
  users: (params)=> GET('/admin/users?'+new URLSearchParams(params||{}).toString()),
  orgChart: ()=> GET('/admin/org-chart'),
  salarySlipUsers: (q='')=> GET('/admin/salary-slips/users?q='+encodeURIComponent(q)),
  salarySlipsForUser: (id)=> GET('/admin/users/'+id+'/salary-slips'),
  salarySlipDelete: (id)=> SEND('DELETE','/admin/salary-slips/'+id,{}),
  salarySlipUpload: async (id, fields, file)=>{
    const fd=new FormData();
    Object.entries(fields||{}).forEach(([k,v])=>fd.append(k,String(v??'')));
    fd.append('file',file,file.name||'salary-slip');
    const r=await fetch(API_BASE+'/admin/users/'+id+'/salary-slips',{method:'POST',headers:tok(),body:fd});
    const v=await _readJsonResponse(r); if(!r.ok) throw new Error(v.error||v.message||'خطا در بارگذاری فیش');
    _invalidateCache(); return v;
  },
  roles: ()=> GET('/admin/roles'),
  smsCredit: ()=> GET('/admin/sms/credit'),
  smsTest: (mobile,message)=> SEND('POST','/admin/sms/test',{mobile,message}),
  smsTemplates: ()=> GET('/sms/templates'),
  smsDrivers: ()=> GET('/my/sms-drivers'),
  smsSend: (driver_ids,message)=> SEND('POST','/sms/send',{driver_ids,message}),
  smsLog: (from,to,kind,sentBy)=> GET(`/admin/sms-log?from=${from}&to=${to}${kind?`&kind=${kind}`:""}${sentBy?`&sent_by=${sentBy}`:""}`),
  smsRefreshStatus: (from,to)=> SEND('POST',`/admin/sms-log/refresh-status?from=${from}&to=${to}`,{}),
  smsDriversByLine: (lineId)=> GET('/sms/drivers-by-line?line_id='+lineId),
  smsSendMixed: (driver_ids,mobiles,message)=> SEND('POST','/sms/send',{driver_ids,mobiles,message}),
  lines: ()=> GET('/admin/lines'),
  expiryPreview: (type,mode,days,lines)=> GET(`/admin/sms-expiry/preview?type=${type}&mode=${mode}&days=${days}${lines?`&lines=${lines}`:""}`),
  expirySample: (type,mode,mobile)=> SEND('POST','/admin/sms-expiry/sample',{type,mode,mobile}),
  expirySend: (type,mode,days,lines)=> SEND('POST','/admin/sms-expiry/send',{type,mode,days,lines}),
  presenceChecks: (from,to,uid)=> GET(`/admin/presence-checks?from=${from}&to=${to}${uid?`&user_id=${uid}`:""}`),
  presenceCheck: (id)=> GET('/admin/presence-checks/'+id),
  presenceExportUrl: (from,to,uid)=> `${API_BASE}/admin/presence-checks/export?from=${from}&to=${to}${uid?`&user_id=${uid}`:""}`,
  presenceViolations: (from,to)=> GET(`/admin/presence-violations?from=${from}&to=${to}`),
  addRole: (obj)=> SEND('POST','/admin/roles',obj),
  updateRole: (id,obj)=> SEND('PUT','/admin/roles/'+id,obj),
  deleteRole: (id)=> SEND('DELETE','/admin/roles/'+id),
  zones: ()=> GET('/admin/zones'),
  lines: ()=> GET('/admin/lines'),
  drivers: (params)=> GET('/admin/drivers?'+new URLSearchParams(params).toString()),
  driverFull: (id)=> GET('/admin/drivers/'+id+'/full'),
  driverPerformance: (nid,year)=> GET('/admin/driver-performance?national_id='+encodeURIComponent(nid)+'&year='+year),
  driverNotices: (nid)=> GET('/admin/driver-notices?national_id='+encodeURIComponent(nid)),
  deleteDriverNotice: (id)=> SEND('DELETE','/admin/driver-notices/'+id,{}),
  driverNoticesExportUrl: (nid)=> API_BASE+'/admin/driver-notices/export?national_id='+encodeURIComponent(nid),
  driverSms: (id)=> GET('/drivers/'+id+'/sms'),
  customFields: ()=> GET('/admin/custom-fields'),
  addCustomField: (b)=> SEND('POST','/admin/custom-fields',b),
  updCustomField: (id,b)=> SEND('PUT','/admin/custom-fields/'+id,b),
  delCustomField: (id)=> SEND('DELETE','/admin/custom-fields/'+id),
  userCustomValues: (id)=> GET('/admin/users/'+id+'/custom-values'),
  saveUserCustomValues: (id,values)=> SEND('POST','/admin/users/'+id+'/custom-values',{values}),
  roleAppItems: ()=> GET('/admin/role-app-items'),
  saveRoleAppItems: (config)=> SEND('POST','/admin/role-app-items',{config}),
  maintenanceStatus: ()=> GET('/admin/maintenance'),
  saveMaintenance: (cfg)=> SEND('POST','/admin/maintenance',cfg),
  adminOutages: (qs)=> GET('/admin/outages'+(qs||"")),
  usersExportUrl: ()=> `${API_BASE}/admin/users/export`,
  outagesExportUrl: (qs)=> `${API_BASE}/admin/outages/export`+(qs||""),
  formsAll: ()=> GET('/admin/forms?all=1'),
  updForm: (id,b)=> SEND('PUT','/admin/forms/'+id,b),
  delForm: (id)=> SEND('DELETE','/admin/forms/'+id,{}),
  formSubs: (id)=> GET('/admin/forms/'+id+'/submissions'),
  formExportUrl: (id)=> `${API_BASE}/admin/forms/${id}/export`,
  updateDriver: (id,b)=> SEND('PUT','/admin/drivers/'+id,b),
  deleteDriver: (id)=> SEND('DELETE','/admin/drivers/'+id),
  adminSetPhoto: (id,photo)=> SEND('POST','/admin/users/'+id+'/photo',{photo}),
  adminSetSignature: (id,signature_data)=> SEND('POST','/admin/users/'+id+'/signature',{signature_data}),
  invItemTypes: ()=> GET('/admin/inventory/item-types'),
  invAddItemType: (b)=> SEND('POST','/admin/inventory/item-types',b),
  invUpdItemType: (id,b)=> SEND('PUT','/admin/inventory/item-types/'+id,b),
  invAssign: (b)=> SEND('POST','/admin/inventory/assign',b),
  invLedger: (qs)=> GET('/admin/inventory/ledger'+(qs||"")),
  invExportUrl: (qs)=> `${API_BASE}/admin/inventory/export`+(qs||""),
  userSessions: (id)=> GET('/admin/users/'+id+'/sessions'),
  bills: ()=> GET('/admin/bills'),
  reports: ()=> GET('/reports?per=20').then(d=>Array.isArray(d)?d:(d.items||[])),
  logs: ()=> GET('/admin/logs'),
  live: (shiftOnly)=> GET('/locations/live'+(shiftOnly?'?shift_only=1':'')),
  track: (uid,from,to)=> GET(`/locations/track?user_id=${uid}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  appVersion: ()=> GET('/app/version'),
  presentStats: ()=> GET('/admin/present-stats'),
  stationExits: (since)=> GET('/admin/station-exits'+(since?('?since='+encodeURIComponent(since)):'')),
  noticeReasons: ()=> GET('/notice-reasons'),
  checklist: ()=> GET('/checklist/template'),
  settings: ()=> GET('/admin/settings'),
  publicSettings: ()=> GET('/settings/public'),
  report: (type,from,to,q)=> GET(`/admin/report?type=${type}&from=${from||''}&to=${to||''}&q=${encodeURIComponent(q||'')}`),
  userLines: (id)=> GET('/admin/users/'+id+'/lines'),
  createUser: (u)=> SEND('POST','/admin/users',u),
  updateUser: (id,b)=> SEND('PUT','/admin/users/'+id,b),
  lineIdents: (lineId)=> GET('/admin/lines/'+lineId+'/idents'),
  setLineMethods: (lineId,methods)=> SEND('PUT','/admin/lines/'+lineId+'/checkin-methods',{methods}),
  addLineIdent: (lineId,b)=> SEND('POST','/admin/lines/'+lineId+'/idents',b),
  delLineIdent: (id)=> SEND('DELETE','/admin/line-idents/'+id,{}),
  userManagers: (id)=> GET('/admin/users/'+id+'/managers'),
  setUserManagers: (id,manager_ids)=> SEND('PUT','/admin/users/'+id+'/managers',{manager_ids}),
  shifts: ()=> GET('/admin/shifts'),
  shift: (id)=> GET('/admin/shifts/'+id),
  saveShift: (b)=> SEND('POST','/admin/shifts',b),
  updateShift: (id,b)=> SEND('PUT','/admin/shifts/'+id,b),
  delShift: (id)=> SEND('DELETE','/admin/shifts/'+id,{}),
  saveShiftDays: (id,days)=> SEND('POST','/admin/shifts/'+id+'/days',{days}),
  userShifts: ()=> GET('/admin/user-shifts'),
  setUserShift: (b)=> SEND('POST','/admin/user-shifts',b),
  delUserShift: (uid)=> SEND('DELETE','/admin/user-shifts/'+uid,{}),
  holidays: ()=> GET('/admin/holidays'),
  addHolidays: (items)=> SEND('POST','/admin/holidays',{items}),
  delHoliday: (jdate)=> SEND('DELETE','/admin/holidays/'+jdate,{}),
  fetchHolidays: (year,month)=> SEND('POST','/admin/holidays/fetch',{year,month}),
  shiftReport: (year,month)=> GET('/admin/shift-report?year='+year+'&month='+month),
  attendanceReport: (userId,from,to)=> GET('/admin/attendance-report?user_id='+userId+'&from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)),
  attendanceSurplusConvert: (body)=> SEND('POST','/admin/attendance-surplus/convert',body),
  attendanceSurplusReset: (body)=> SEND('POST','/admin/attendance-surplus/reset',body),
  ruleEngineRoles: ()=> GET('/admin/rule-engine/roles'),
  saveRuleEngineRole: (roleKey,body)=> SEND('PUT','/admin/rule-engine/roles/'+encodeURIComponent(roleKey),body),
  attendanceRejectLogs: (qs)=> GET('/admin/attendance-reject-logs'+(qs||'')),
  shiftPlanningDiagnostics: ()=> GET('/admin/shift-planning/diagnostics'),
  attendanceRecalculate: (body)=> SEND('POST','/admin/attendance/recalculate',body),
  autoCloseOpenSessions: (body)=> SEND('POST','/admin/attendance/auto-close-open-sessions',body),
  userRuleOverrides: (userId)=> GET('/admin/rule-engine/user-overrides'+(userId?('?user_id='+encodeURIComponent(userId)):'')),
  saveUserRuleOverride: (userId,body)=> SEND('PUT','/admin/rule-engine/user-overrides/'+encodeURIComponent(userId),body),
  deleteUserRuleOverride: (userId)=> SEND('DELETE','/admin/rule-engine/user-overrides/'+encodeURIComponent(userId),{}),
  shiftAssignmentAudit: (userId)=> GET('/admin/shift-assignment-audit'+(userId?('?user_id='+encodeURIComponent(userId)):'')),
  attendancePunchEdit: (id,body)=> SEND('PUT','/admin/attendance-punch/'+id,body),
  attendancePunchDelete: (id)=> SEND('DELETE','/admin/attendance-punch/'+id),
  attendancePunchAdd: (body)=> SEND('POST','/admin/attendance-punch',body),
  plateTrainingStatus: ()=> GET('/admin/plate-training/status'),
  plateTrainingSamples: (qs)=> GET('/admin/plate-training/samples'+(qs||'')),
  plateTrainingReview: (id,body)=> SEND('POST','/admin/plate-training/samples/'+id+'/review',body),
  adminRequests: (qs)=> GET('/admin/requests'+(qs||"")),
  userLeaveBalance: (id)=> GET('/admin/users/'+id+'/leave-balance'),
  leaveBalanceInitList: ()=> GET('/admin/leave-balance-init'),
  leaveBalanceInitSave: (items)=> SEND('POST','/admin/leave-balance-init',{items}),
  workDashboard: (year,month)=> GET('/admin/work-dashboard'+(year?('?year='+year+'&month='+month):"")),
  userPayroll: (id)=> GET('/admin/users/'+id+'/payroll'),
  saveUserPayroll: (id,b)=> SEND('POST','/admin/users/'+id+'/payroll',b),
  userPayslip: (id,year,month)=> GET('/admin/users/'+id+'/payslip?year='+year+'&month='+month),
  payrollExportUrl: (year,month)=> `${API_BASE}/admin/payroll/export?year=${year}&month=${month}`,
  seedHolidays1404: ()=> SEND('POST','/admin/holidays/seed-1404',{}),
  seedHolidays1405: ()=> SEND('POST','/admin/holidays/seed-1405',{}),
  birthdayTest: (user_id)=> SEND('POST','/admin/birthday/test',{user_id}),
  baleSubscribers: ()=> GET('/admin/bale/subscribers'),
  baleLog: ()=> GET('/admin/bale/log'),
  baleTest: (mobile,message)=> SEND('POST','/admin/bale/test',{mobile,message}),
  baleMenuItems: ()=> GET('/admin/bale/menu-items'),
  baleMenuSave: (item)=> item.id ? SEND('PUT','/admin/bale/menu-items/'+item.id,item) : SEND('POST','/admin/bale/menu-items',item),
  baleMenuDelete: (id)=> SEND('DELETE','/admin/bale/menu-items/'+id,{}),
  baleReplies: ()=> GET('/admin/bale/custom-replies'),
  baleReplySave: (item)=> item.id ? SEND('PUT','/admin/bale/custom-replies/'+item.id,item) : SEND('POST','/admin/bale/custom-replies',item),
  baleReplyDelete: (id)=> SEND('DELETE','/admin/bale/custom-replies/'+id,{}),
  baleForms: ()=> GET('/admin/bale/forms'),
  baleFormSave: (item)=> item.id ? SEND('PUT','/admin/bale/forms/'+item.id,item) : SEND('POST','/admin/bale/forms',item),
  baleFormDelete: (id)=> SEND('DELETE','/admin/bale/forms/'+id,{}),
  baleSubmissions: (status)=> GET('/admin/bale/form-submissions'+(status?('?status='+encodeURIComponent(status)):'')),
  baleSubmissionReview: (id,body)=> SEND('POST','/admin/bale/form-submissions/'+id+'/review',body),
  baleEvents: ()=> GET('/admin/bale/events'),
  messengerSubscribers: (platform)=> GET('/admin/messengers/'+platform+'/subscribers'),
  messengerLog: (platform)=> GET('/admin/messengers/'+platform+'/log'),
  messengerTest: (platform,mobile,text)=> SEND('POST','/admin/messengers/'+platform+'/test',{mobile,text}),
  messengerMenuItems: (platform)=> GET('/admin/messengers/'+platform+'/menu-items'),
  messengerMenuSave: (platform,item)=> item.id ? SEND('PUT','/admin/messengers/'+platform+'/menu-items/'+item.id,item) : SEND('POST','/admin/messengers/'+platform+'/menu-items',item),
  messengerMenuDelete: (platform,id)=> SEND('DELETE','/admin/messengers/'+platform+'/menu-items/'+id,{}),
  messengerReplies: (platform)=> GET('/admin/messengers/'+platform+'/custom-replies'),
  messengerReplySave: (platform,item)=> item.id ? SEND('PUT','/admin/messengers/'+platform+'/custom-replies/'+item.id,item) : SEND('POST','/admin/messengers/'+platform+'/custom-replies',item),
  messengerReplyDelete: (platform,id)=> SEND('DELETE','/admin/messengers/'+platform+'/custom-replies/'+id,{}),
  messengerForms: (platform)=> GET('/admin/messengers/'+platform+'/forms'),
  messengerFormSave: (platform,item)=> item.id ? SEND('PUT','/admin/messengers/'+platform+'/forms/'+item.id,item) : SEND('POST','/admin/messengers/'+platform+'/forms',item),
  messengerFormDelete: (platform,id)=> SEND('DELETE','/admin/messengers/'+platform+'/forms/'+id,{}),
  messengerSubmissions: (platform,status)=> GET('/admin/messengers/'+platform+'/form-submissions'+(status?('?status='+encodeURIComponent(status)):'')),
  messengerSubmissionReview: (platform,id,body)=> SEND('POST','/admin/messengers/'+platform+'/form-submissions/'+id+'/review',body),
  messengerEvents: (platform)=> GET('/admin/messengers/'+platform+'/events'),
  messengerRegisterWebhook: (platform)=> SEND('POST','/admin/messengers/'+platform+'/register-webhook',{}),
  messengerSendBulk: (platform,target,text)=> SEND('POST','/admin/messengers/'+platform+'/send',{target,text}),
  messengerSendManual: (mobiles,message)=> SEND('POST','/messengers/send-group',{mobiles,message}),
  messengerInvite: (mobiles,text)=> SEND('POST','/admin/messengers/invite',{mobiles,text}),
  staffAttendance: (from,to)=> GET('/admin/staff-attendance?from='+from+'&to='+to),
  setOrg: (id,b)=> SEND('PUT','/admin/users/'+id+'/org',b),
  assignLines: (id,ids)=> SEND('PUT','/admin/users/'+id+'/lines',{line_ids:ids}),
  revokeDevice: (id,type)=> SEND('POST','/admin/users/'+id+'/revoke-device',type?{device_type:type}:{}),
  deleteUser: (id)=> SEND('DELETE','/admin/users/'+id),
  resetPassword: (id,password)=> SEND('POST','/admin/users/'+id+'/reset-password',{password}),
  createZone: (name)=> SEND('POST','/admin/zones',{name}),
  addReason: (title)=> SEND('POST','/admin/notice-reasons',{title}),
  delReason: (id)=> SEND('DELETE','/admin/notice-reasons/'+id),
  saveChecklist: (title,items)=> SEND('POST','/admin/checklist-templates',{title,items}),
  reportSubjects: ()=> GET('/admin/report-subjects'),
  addReportSubject: (title)=> SEND('POST','/admin/report-subjects',{title}),
  delReportSubject: (id)=> SEND('DELETE','/admin/report-subjects/'+id,{}),
  saveSettings: (obj)=> SEND('PUT','/admin/settings',obj),
  reportAction: (id,b)=> SEND('POST','/reports/'+id+'/action',b),
  reportDetail: (id)=> GET('/reports/'+id),
  officialVisits: (official,from,to)=> GET(`/admin/official-visits?official=${official||''}&from=${from||''}&to=${to||''}`),
  officialChart: ()=> GET('/admin/official-visits/chart'),
  geofences: ()=> GET('/geofences'),
  createGeofence: (g)=> SEND('POST','/admin/geofences',g),
  createLine: (l)=> SEND('POST','/admin/lines',l),
  userLeaderboard: ()=> GET('/admin/user-leaderboard'),
  topWorkers: ()=> GET('/admin/top-workers'),
  usersLite: ()=> GET('/admin/users-lite'),
  userActivity: (uid,date)=> GET('/admin/user-activity?user_id='+uid+'&date='+date),
  presence: ()=> GET('/admin/presence'),
  driversSearch: (q)=> GET('/admin/drivers-search?q='+encodeURIComponent(q)),
  deleteGeofence: (id)=> SEND('DELETE','/admin/geofences/'+id),
  messages: ()=> GET('/admin/messages'),
  sendMessage: (m)=> SEND('POST','/admin/messages',m),
  rolePerms: ()=> GET('/admin/settings').then(s=>s.role_perms||{}),
  cleanupAttachments: ()=> SEND('POST','/admin/cleanup-attachments',{}),
  receipts: (id)=> GET('/admin/messages/'+id+'/receipts'),
  importExcel: async (kind,file)=>{ const fd=new FormData(); fd.append('file',file);
    const r=await fetch(API_BASE+'/admin/import/'+kind,{method:'POST',headers:tok(),body:fd}); if(!r.ok) throw new Error('خطا در بارگذاری فایل'); return r.json(); },
};

// تبدیل تاریخ میلادی ذخیره‌شده به نمایش شمسی
// فشرده‌سازی خودکار عکس قبل از آپلود (کاهش ابعاد و کیفیت)
async function compressImage(file, maxDim=1280, quality=0.6){
  if(!file || !file.type || file.type.indexOf('image/')!==0) return await fileToDataUrl(file);
  const dataUrl=await fileToDataUrl(file);
  return await new Promise(res=>{ const img=new Image(); img.onload=()=>{ let {width:w,height:h}=img;
    if(w>h && w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; } else if(h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; }
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h);
    res(cv.toDataURL('image/jpeg',quality)); }; img.onerror=()=>res(dataUrl); img.src=dataUrl; });
}
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
// ---- ابزار تاریخ شمسی (تبدیل + انتخابگر) ----
function gregToJalali(gy,gm,gd){ const g_d_m=[0,31,59,90,120,151,181,212,243,273,304,334];
  let jy=(gy<=1600)?0:979; gy-=(gy<=1600)?621:1600;
  let gy2=(gm>2)?(gy+1):gy;
  let days=(365*gy)+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)-80+gd+g_d_m[gm-1];
  jy+=33*Math.floor(days/12053); days%=12053; jy+=4*Math.floor(days/1461); days%=1461;
  if(days>365){ jy+=Math.floor((days-1)/365); days=(days-1)%365; }
  const jm=(days<186)?1+Math.floor(days/31):7+Math.floor((days-186)/30);
  const jd=1+((days<186)?(days%31):((days-186)%30)); return [jy,jm,jd]; }
function jalaliToGreg(jy,jm,jd){ jy=+jy; jm=+jm; jd=+jd;
  let gy=(jy<=979)?621:1600; jy-=(jy<=979)?0:979;
  let days=(365*jy)+(Math.floor(jy/33)*8)+Math.floor(((jy%33)+3)/4)+78+jd+((jm<7)?(jm-1)*31:((jm-7)*30)+186);
  gy+=400*Math.floor(days/146097); days%=146097;
  if(days>36524){ gy+=100*Math.floor(--days/36524); days%=36524; if(days>=365)days++; }
  gy+=4*Math.floor(days/1461); days%=1461;
  if(days>365){ gy+=Math.floor((days-1)/365); days=(days-1)%365; }
  let gd=days+1; const sal_a=[0,31,((gy%4===0&&gy%100!==0)||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm=0; for(gm=1;gm<=12;gm++){ if(gd<=sal_a[gm])break; gd-=sal_a[gm]; }
  return [gy,gm,gd]; }
const J_MONTHS=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
function todayJ(){ const n=new Date(); return gregToJalali(n.getFullYear(),n.getMonth()+1,n.getDate()); }
function todayJStr(){ const [y,m,d]=todayJ(); return `${y}/${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")}`; }
function isoFromJ(jy,jm,jd){ const [gy,gm,gd]=jalaliToGreg(jy,jm,jd); return `${gy}-${String(gm).padStart(2,"0")}-${String(gd).padStart(2,"0")}`; }
function jLabel(iso){ if(!iso)return""; const [y,m,d]=iso.split("-").map(Number); const [jy,jm,jd]=gregToJalali(y,m,d); return `${jy}/${String(jm).padStart(2,"0")}/${String(jd).padStart(2,"0")}`; }
function seniorityLabel(iso){ if(!iso)return""; const d=new Date(String(iso).replace(' ','T')); if(isNaN(d))return""; const now=new Date(); let mo=(now.getFullYear()-d.getFullYear())*12+(now.getMonth()-d.getMonth()); if(now.getDate()<d.getDate())mo--; if(mo<0)return"تاریخ نامعتبر"; const y=Math.floor(mo/12),m=mo%12; return `سنوات: ${fa(y)} سال و ${fa(m)} ماه`; }
/* KHATYAR_REACT_JDATE_V2 */
function JDate({value,onChange,placeholder,jalali,yearFrom,yearTo}){
  const [open,setOpen]=useState(false);
  const parse=()=>{
    const raw=String(value||'').trim();
    if(!raw)return null;
    const sep=raw.includes('/')?'/':'-';
    const p=raw.split(sep).map(Number);
    if(p.length<3||p.some(v=>!Number.isFinite(v)||v<=0))return null;
    return jalali?p:gregToJalali(p[0],p[1],p[2]);
  };
  const selected=parse();
  const initial=selected?{y:selected[0],m:selected[1]}:(()=>{const t=todayJ();return{y:t[0],m:t[1]};})();
  const [view,setView]=useState(initial);
  useEffect(()=>{const p=parse();if(p)setView({y:p[0],m:p[1]});},[value,jalali]);
  const daysIn=(y,m)=>{
    const a=jalaliToGreg(y,m,1), b=jalaliToGreg(m===12?y+1:y,m===12?1:m+1,1);
    return a&&b?Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000):(m<=6?31:(m<=11?30:29));
  };
  const firstWeekday=(y,m)=>{
    const g=jalaliToGreg(y,m,1);
    return g?((new Date(Date.UTC(g[0],g[1]-1,g[2],12)).getUTCDay()+1)%7):0;
  };
  const [ty,tm,td]=todayJ();
  const yf=yearFrom||Math.max(1200,ty-80), yt=yearTo||ty+20;
  const years=[];for(let y=yt;y>=yf;y--)years.push(y);
  const monthLen=daysIn(view.y,view.m), first=firstWeekday(view.y,view.m), cells=[];
  for(let i=0;i<first;i++)cells.push(<span key={'e'+i} style={{height:36}}/>);
  const emit=(y,m,d)=>onChange(jalali?`${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}`:isoFromJ(y,m,d));
  for(let d=1;d<=monthLen;d++){
    const sel=!!selected&&selected[0]===view.y&&selected[1]===view.m&&selected[2]===d;
    const tod=ty===view.y&&tm===view.m&&td===d;
    cells.push(<button key={d} type="button" className={sel?"btn p":"btn g"} style={{height:36,padding:0,fontSize:11,fontWeight:sel||tod?800:500,boxShadow:tod?'inset 0 0 0 1.5px var(--brand)':'none'}} onClick={()=>{emit(view.y,view.m,d);setOpen(false);}}>{fa(d)}</button>);
  }
  const shift=(delta)=>{let y=view.y,m=view.m+delta;if(m<1){m=12;y--}if(m>12){m=1;y++}if(y>=yf&&y<=yt)setView({y,m});};
  const label=()=>selected?`${fa(selected[0])}/${fa(String(selected[1]).padStart(2,'0'))}/${fa(String(selected[2]).padStart(2,'0'))}`:'';
  return <span style={{position:'relative',display:'inline-block',width:'100%',minWidth:0}}>
    <input className="input" readOnly value={label()} placeholder={placeholder||'تاریخ'} onClick={()=>setOpen(v=>!v)} style={{cursor:'pointer',maxWidth:150,width:'100%'}}/>
    {value&&<button type="button" onClick={()=>onChange('')} style={{position:'absolute',left:6,top:8,background:'none',border:0,cursor:'pointer',color:'var(--muted)',zIndex:2}}>✕</button>}
    {open&&<div style={{position:'absolute',zIndex:2147483000,background:'#fff',border:'1px solid var(--line)',borderRadius:16,padding:12,boxShadow:'0 18px 50px rgba(0,0,0,.18)',top:'calc(100% + 7px)',right:0,width:330,direction:'rtl'}}>
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr 36px',gap:6,alignItems:'center',marginBottom:8}}><button type="button" className="btn g" onClick={()=>shift(-1)}>‹</button><div style={{display:'flex',gap:6,justifyContent:'center'}}><select className="input" value={view.m} onChange={e=>setView(v=>({...v,m:+e.target.value}))} style={{padding:'6px 8px',fontSize:11,maxWidth:120}}>{J_MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select><select className="input" value={view.y} onChange={e=>setView(v=>({...v,y:+e.target.value}))} style={{padding:'6px 8px',fontSize:11,maxWidth:90}}>{years.map(y=><option key={y} value={y}>{fa(y)}</option>)}</select></div><button type="button" className="btn g" onClick={()=>shift(1)}>›</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:5}}>{['ش','ی','د','س','چ','پ','ج'].map(x=><span key={x} style={{textAlign:'center',fontSize:10,fontWeight:800,color:'var(--muted)'}}>{x}</span>)}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>{cells}</div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:9,paddingTop:9,borderTop:'1px solid var(--line)'}}><button type="button" className="btn g" onClick={()=>{emit(ty,tm,td);setView({y:ty,m:tm});setOpen(false);}}>امروز</button><button type="button" className="btn t" onClick={()=>setOpen(false)}>بستن</button></div>
    </div>}
  </span>;
}
function _g2j(gy,gm,gd){
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334], gy2=gm>2?gy+1:gy;
  let days=355666+365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)+gd+gdm[gm-1];
  let jy=-1595+33*Math.floor(days/12053); days%=12053; jy+=4*Math.floor(days/1461); days%=1461;
  if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365;}
  let jm,jd; if(days<186){jm=1+Math.floor(days/31);jd=1+days%31;}else{jm=7+Math.floor((days-186)/30);jd=1+(days-186)%30;}
  return [jy,jm,jd];
}
function _p2(n){return String(n).padStart(2,'0');}
function fj(s){
  if(!s)return '';
  try{
    const raw=String(s).trim(), m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?/);
    let Y,M,D,h=0,mi=0;
    const hasZone=/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
    if(m&&!hasZone){Y=+m[1];M=+m[2];D=+m[3];h=+(m[4]||0);mi=+(m[5]||0);}
    else{const d=new Date(raw.replace(' ','T'));if(isNaN(d))return raw;const t=new Date(d.getTime()+210*60000);Y=t.getUTCFullYear();M=t.getUTCMonth()+1;D=t.getUTCDate();h=t.getUTCHours();mi=t.getUTCMinutes();}
    const j=_g2j(Y,M,D); return faPlain(`${j[0]}/${_p2(j[1])}/${_p2(j[2])} ${_p2(h)}:${_p2(mi)}`);
  }catch(e){return String(s);}
}

function faDate(value){
  if(value===null||value===undefined||value==='') return '—';
  try { return fj(value) || '—'; } catch(e) { return String(value||'—'); }
}
function faTime(value){
  if(value===null||value===undefined||value==='') return "—";
  try{
    const raw=String(value).trim();
    const timeOnly=raw.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if(timeOnly) return faPlain(String(timeOnly[1]).padStart(2,'0')+':'+timeOnly[2]);
    const d=new Date(raw.replace(' ','T'));
    if(!isNaN(d.getTime())) return faPlain(d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',hour12:false}));
    return faPlain(raw);
  }catch(e){ return "—"; }
}

const STATUS_FA={sent:"ارسال‌شده",seen:"دیده‌شده",answered:"پاسخ‌داده‌شده",forwarded:"ارجاع‌شده",closed:"بسته‌شده"};
const badgeCls=s=>s==="answered"?"b-ok":s==="forwarded"?"b-no":"b-w";
const fa=n=>{ const x=Number(n); return Number.isFinite(x)?x.toLocaleString("fa"):"—"; };
const faPlain=n=>(n===null||n===undefined)?"":String(n).replace(/[0-9]/g,d=>"۰۱۲۳۴۵۶۷۸۹"[+d]);
const onlyDigits=v=>String(v||"").replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g,"");

// هوک صفحه‌بندی سمت‌کلاینت: پیش‌فرض ۱۰ آیتم، قابل تنظیم، با قبلی/بعدی
function usePager(items, initial){
  const [page,setPage]=useState(1); const [per,setPer]=useState(initial||10);
  const arr=Array.isArray(items)?items:[];
  const total=arr.length; const pages=Math.max(1,Math.ceil(total/per));
  const cur=Math.min(page,pages);
  const slice=arr.slice((cur-1)*per, cur*per);
  const Pager=()=> total===0 ? null : (
    <div className="row" style={{gap:8,justifyContent:"center",alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
      <button className="btn g" disabled={cur<=1} onClick={()=>setPage(cur-1)}>قبلی</button>
      <span style={{alignSelf:"center"}}>صفحهٔ {fa(cur)} از {fa(pages)} · مجموع {fa(total)}</span>
      <button className="btn g" disabled={cur>=pages} onClick={()=>setPage(cur+1)}>بعدی</button>
      <span style={{color:"var(--muted)",fontSize:12}}>تعداد در صفحه:</span>
      <select className="input" style={{maxWidth:80}} value={per} onChange={e=>{setPer(+e.target.value);setPage(1);}}>
        <option value={10}>۱۰</option><option value={25}>۲۵</option><option value={50}>۵۰</option><option value={100}>۱۰۰</option></select>
    </div>);
  return {slice,Pager,setPage};
}

function LiveStaffDashboard(){
  const tj=todayJ();
  const [live,setLive]=useState(null); const [tab,setTab]=useState("present");
  const load=()=>db.workDashboard(tj[0],tj[1]).then(x=>setLive(x&&x.live?x.live:null)).catch(()=>setLive(null));
  useEffect(()=>{load(); const iv=setInterval(load,60000); return()=>clearInterval(iv);},[]);
  const methodFa={gps:"GPS",qr:"QR",wifi:"Wi‑Fi",manual:"دستی",nfc:"NFC",bluetooth:"بلوتوث",gsm:"GSM"};
  if(!live)return <div className="panel" style={{margin:"14px 0"}}><span className="muted">در حال دریافت وضعیت حضور پرسنل…</span></div>;
  const rows=tab==="present"?(live.present_list||[]):tab==="leave"?(live.leave_list||[]):(live.absent_list||[]);
  return <div className="panel" style={{margin:"14px 0"}}>
    <div className="row" style={{justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <div><h3 style={{margin:0}}>وضعیت لحظه‌ای حضور پرسنل</h3><div className="muted" style={{fontSize:12,marginTop:4}}>امروز {faPlain(live.jdate||"")} · بروزرسانی خودکار هر ۶۰ ثانیه</div></div>
      <button className="btn g" onClick={load}>↻ بروزرسانی</button>
    </div>
    <div className="kpis" style={{marginTop:12}}>
      {[["کل پرسنل",live.total],["حاضر در شیفت",live.present],["غایب",live.absent],["مرخصی/ماموریت",live.leave]].map(([l,n],i)=><div className="kpi" key={i}><div className="n">{fa(n||0)}</div><div className="l">{l}</div></div>)}
    </div>
    <div className="tabbar" style={{display:"flex",gap:6,margin:"12px 0",borderBottom:"1px solid var(--line)",flexWrap:"wrap"}}>
      {[["present","حاضرین"],["absent","غایبین"],["leave","مرخصی و ماموریت"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",borderBottom:tab===k?"3px solid var(--brand)":"3px solid transparent",padding:"8px 12px",fontFamily:"inherit",fontWeight:tab===k?800:500,cursor:"pointer",color:tab===k?"var(--brand)":"var(--muted)"}}>{l}</button>)}
    </div>
    {rows.length===0?<p className="muted">موردی برای نمایش وجود ندارد.</p>:<div style={{overflowX:"auto"}}><table><thead><tr><th>نام</th><th>سمت</th>{tab==="present"&&<><th>ساعت ورود</th><th>محل ثبت</th><th>خط</th><th>روش</th><th>وضعیت</th></>}</tr></thead><tbody>
      {rows.map((r,i)=><tr key={r.user_id||i}><td>{r.name||"—"}</td><td>{r.role_title||"—"}</td>{tab==="present"&&<><td>{r.check_in?faTime(r.check_in):"—"}</td><td>{r.location||"—"}</td><td>{r.line_code?("خط "+fa(r.line_code)+(r.line_description?" — "+r.line_description:"")):"—"}</td><td>{methodFa[r.method]||r.method||"—"}</td><td><span className={"badge "+(r.is_open?"ok":"muted")}>{r.is_open?"داخل شیفت":"خروج ثبت شده"}</span></td></>}</tr>)}
    </tbody></table></div>}
  </div>;
}

function Dashboard(){
  const [s,setS]=useState(null); const [rep,setRep]=useState([]); const [tw,setTw]=useState({top:[],bottom:[]}); const chartRef=useRef(); const lineRef=useRef();
  const [tab,setTab]=useState("charts");
  const [bdays,setBdays]=useState(null);
  useEffect(()=>{db.stats().then(setS).catch(()=>{}); db.reports().then(setRep).catch(()=>{}); db.topWorkers().then(setTw).catch(()=>{}); GET("/admin/birthdays-month").then(setBdays).catch(()=>{})},[]);
  useEffect(()=>{
    if(!s||tab!=="charts"||!chartRef.current)return;
    const c=new Chart(chartRef.current,{type:"bar",data:{labels:(s.week_attendance||[]).map(x=>x.d||""),
      datasets:[{data:(s.week_attendance||[]).map(x=>x.n!==undefined?x.n:x),backgroundColor:"#0d7a5f",borderRadius:7}]},
      options:{plugins:{legend:{display:false}},scales:{y:{ticks:{font:{family:"Vazirmatn"}}},x:{ticks:{font:{family:"Vazirmatn"}}}}}});
    let c2;
    if(lineRef.current&&s.by_line){
      c2=new Chart(lineRef.current,{type:"bar",data:{labels:s.by_line.map(x=>"خط "+x.code),
        datasets:[{data:s.by_line.map(x=>x.n),backgroundColor:"#f6c324",borderRadius:6}]},
        options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{ticks:{font:{family:"Vazirmatn"}}},y:{ticks:{font:{family:"Vazirmatn"}}}}}});
    }
    return()=>{c.destroy();c2&&c2.destroy();};
  },[s,tab]);
  if(!s)return <div>در حال بارگذاری…</div>;
  const K=[["راننده فعال",s.drivers],["خط فعال",s.lines],["حضور امروز",s.today_attendance],["فیش پرداخت‌نشده",s.unpaid_bills],["تذکر این ماه",s.notices_month]];
  return(<>
    <div className="kpis">{K.map(([l,n],i)=><div className="kpi" key={i}><div className="n">{fa(n)}</div><div className="l">{l}</div></div>)}</div>
    <LiveStaffDashboard/>
    {bdays&&bdays.people&&bdays.people.length>0&&<div style={{background:"linear-gradient(135deg,#fff5f8,#fef9ee)",border:"1px solid #f5d5e0",borderRadius:14,padding:16,margin:"14px 0"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:22}}>🎂</span>
        <b style={{fontSize:15}}>سالگرد تولد همکاران در ماه {bdays.month_name} ({fa(bdays.people.length)} نفر)</b>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        {bdays.people.map((p,i)=>{
          const dl=p.days_left;
          const badge = p.is_today ? {t:"🎉 امروز!",c:"#16a06a",bg:"#e7f7ef"}
            : (dl>0 ? {t:fa(dl)+" روز مانده",c:"#b8860b",bg:"#fdf6e3"}
            : {t:"گذشته",c:"#9aa6b6",bg:"#f0f2f5"});
          return <div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 14px",border:p.is_today?"2px solid #16a06a":"1px solid #f0e0e8",minWidth:200,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:p.is_today?"#e7f7ef":"#fce4ec",display:"grid",placeItems:"center",fontSize:18}}>{p.is_today?"🎉":"🎈"}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13.5}}>{p.name}</div>
              <div style={{fontSize:11.5,color:"var(--muted)"}}>{p.role_title||""} · {bdays.month_name} {fa(p.day)}</div>
              <div style={{fontSize:10.5,color:"#b08",direction:"ltr",textAlign:"right"}}>{faPlain(p.birth_date||"")}</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:badge.c,background:badge.bg,borderRadius:8,padding:"3px 8px",whiteSpace:"nowrap"}}>{badge.t}</div>
          </div>;
        })}
      </div>
    </div>}
    {bdays&&bdays.people&&bdays.people.length===0&&<div style={{background:"#f7f9fc",border:"1px solid var(--line)",borderRadius:12,padding:"12px 16px",margin:"14px 0",fontSize:13,color:"var(--muted)"}}>🎂 در ماه {bdays.month_name} هیچ‌یک از همکاران سالگرد تولد ندارند.</div>}
    <div className="tabbar" style={{display:"flex",gap:8,margin:"14px 0",borderBottom:"2px solid var(--line)",flexWrap:"wrap"}}>
      {[["charts","📊 نمودارها"],["workers","👥 کارایی نیروها"],["reports","📨 گزارش‌های اخیر"]].map(([k,lbl])=>
        <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",borderBottom:tab===k?"3px solid var(--brand)":"3px solid transparent",padding:"8px 14px",cursor:"pointer",fontWeight:tab===k?800:500,color:tab===k?"var(--brand)":"var(--muted)",fontFamily:"inherit",fontSize:14}}>{lbl}</button>)}
    </div>
    {tab==="charts"&&<div className="grid2">
      <div className="panel"><h3>روند حضور در ۷ روز گذشته</h3><canvas ref={chartRef} height="130"></canvas></div>
      <div className="panel"><h3>حضور به تفکیک خط (۳۰ روز)</h3><canvas ref={lineRef} height="130"></canvas></div>
    </div>}
    {tab==="workers"&&(tw && tw.groups && tw.groups.length>0 ? <div>
      <h3 style={{margin:"6px 0 10px",fontSize:16}}>پرکارترین و کم‌کارترین نیروها به تفکیک نقش{tw.zone_scope==="own"?" (منطقهٔ شما)":""}</h3>
      <div className="grid2">
        {tw.groups.map((g,i)=><WorkerGroup key={g.key} title={g.title} data={g} color={GROUP_COLORS[g.key]||"#0d7a5f"}/>)}
        {tw.groups.length%2===1?<div></div>:null}
      </div>
    </div> : <p className="muted" style={{padding:16}}>داده‌ای برای نمایش نیست.</p>)}
    {tab==="reports"&&<div className="panel"><h3>گزارش‌های اخیر</h3>
      <table><tbody>{rep.map(r=><tr key={r.id}><td>{r.first_name} {r.last_name}</td><td>{r.subject}</td>
        <td><span className={"badge "+badgeCls(r.status)}>{STATUS_FA[r.status]||r.status}</span></td></tr>)}</tbody></table>
    </div>}
    <WorkDashboard/></>);
}

// خلاصهٔ تجمیعی کارکرد ماهانه + نمودار برترین‌ها
function WorkDashboard(){
  const tj=todayJ();
  const [jy,setJy]=useState(tj[0]); const [jm,setJm]=useState(tj[1]); const [d,setD]=useState(null); const barRef=useRef();
  const load=()=>db.workDashboard(jy,jm).then(setD).catch(()=>{});
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if(!d||!barRef.current||!d.top.length)return;
    const c=new Chart(barRef.current,{type:"bar",data:{labels:d.top.map(x=>x.name),
      datasets:[{label:"کارکرد (ساعت)",data:d.top.map(x=>Math.round(x.worked/60*10)/10),backgroundColor:"#0d7a5f",borderRadius:6},
        {label:"اضافه‌کار (ساعت)",data:d.top.map(x=>Math.round(x.overtime/60*10)/10),backgroundColor:"#f6c324",borderRadius:6}]},
      options:{plugins:{legend:{labels:{font:{family:"Vazirmatn"}}}},scales:{y:{ticks:{font:{family:"Vazirmatn"}}},x:{ticks:{font:{family:"Vazirmatn"},autoSkip:false,maxRotation:45}}}}});
    return()=>c.destroy();
  },[d]);
  const hm=(m)=>`${fa(Math.floor((m||0)/60))}:${String((m||0)%60).padStart(2,"0")}`;
  return(<div className="panel" style={{marginTop:16}}>
    <div className="row" style={{justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <h3 style={{margin:0}}>خلاصهٔ کارکرد نیروها</h3>
      <div className="row" style={{gap:6,alignItems:"center"}}>
        <select className="input" style={{maxWidth:120}} value={jm} onChange={e=>setJm(+e.target.value)}>{J_MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select>
        <input className="input" type="number" style={{maxWidth:90}} value={jy} onChange={e=>setJy(+e.target.value||tj[0])}/>
        <button className="btn p" onClick={load}>نمایش</button>
        <button className="btn g" onClick={async()=>{ try{ const res=await fetch(db.payrollExportUrl(jy,jm),{headers:tok()}); if(!res.ok)throw new Error("خطا"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`لیست_حقوق_${jy}_${jm}.csv`; a.click(); }catch(e){ alert(e.message); } }}>⤓ اکسل لیست حقوق</button>
      </div>
    </div>
    {!d?<p className="muted" style={{marginTop:10}}>در حال بارگذاری…</p>:<>
      <div className="kpis" style={{marginTop:12}}>
        {[["نیروهای دارای شیفت",d.sum.staff],["مجموع کارکرد",hm(d.sum.worked)],["مجموع اضافه‌کار",hm(d.sum.overtime)],["مجموع کسری",hm(d.sum.shortage)],["شب‌کاری",hm(d.sum.night)],["درخواست در انتظار",d.pending_requests]].map(([l,n],i)=>
          <div className="kpi" key={i}><div className="n" style={{fontSize:18}}>{typeof n==="number"?fa(n):n}</div><div className="l">{l}</div></div>)}
      </div>
      <div className="row" style={{gap:14,flexWrap:"wrap",marginTop:6,fontSize:12,color:"var(--muted)"}}>
        <span>جمعه‌کاری: {hm(d.sum.friday)}</span><span>تعطیل‌کاری: {hm(d.sum.holiday)}</span>
        <span>مرخصی استحقاقی: {hm(d.sum.annual_min)}</span><span>مرخصی استعلاجی: {hm(d.sum.sick_min)}</span><span>ماموریت: {hm(d.sum.mission_min)}</span>
      </div>
      {d.top.length>0?<div style={{marginTop:14}}><canvas ref={barRef} height="140"></canvas></div>:<p className="muted" style={{marginTop:10}}>داده‌ای برای این ماه نیست.</p>}
    </>}
  </div>);
}

const GROUP_COLORS={supervisor:"#0d7a5f",operator:"#0891b2",admin_staff:"#2563eb",chief_inspector:"#7c3aed",inspector:"#d97706"};
// نمایش پرکارترین/کم‌کارترین یک گروه نقش + پنجرهٔ بالنی جزئیات با کلیک روی نام
function WorkerGroup({title,data,color}){
  const [pop,setPop]=useState(null);
  const d=data||{top:[],bottom:[]};
  const Row=(x,i,rank)=>(<tr key={(rank?'t':'b')+x.id} style={{cursor:"pointer"}} onClick={e=>setPop({x,at:{x:e.clientX,y:e.clientY}})}>
    {rank?<td>{fa(i+1)}</td>:null}<td style={{color:"var(--brand)",fontWeight:700}}>{x.name}</td><td><b>{fa(x.total)}</b></td></tr>);
  return(<div className="panel"><h3 style={{color}}>{title} — پرکار/کم‌کار</h3>
    {(!d.top||d.top.length===0)?<p className="muted">داده‌ای موجود نیست.</p>:<>
      <div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>پرکارترین</div>
      <table><tbody>{d.top.map((x,i)=>Row(x,i,true))}</tbody></table>
      <div style={{fontSize:12,color:"var(--muted)",margin:"10px 0 4px"}}>کم‌کارترین</div>
      <table><tbody>{d.bottom.map((x,i)=>Row(x,i,false))}</tbody></table></>}
    <p style={{fontSize:11,color:"var(--muted)",marginTop:8}}>برای دیدن جزئیات، روی نام هر نیرو کلیک کنید.</p>
    {pop&&<WorkerPop x={pop.x} onClose={()=>setPop(null)}/>}
  </div>);
}
function WorkerPop({x,onClose}){
  const items=[["ثبت حضور رانندگان",x.attendances],["چک‌لیست انجام‌شده",x.checklists],["تذکر داده‌شده",x.notices],["تکمیل فرم",x.forms],["حضور مسئولین",x.visits],["گزارش ارسالی",x.reports]];
  return(<div className="modal-bg" onClick={onClose}><div className="modal" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
    <h3 style={{display:"flex",justifyContent:"space-between"}}><span>{x.name}</span><b style={{color:"var(--brand)"}}>مجموع: {fa(x.total)}</b></h3>
    <div style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>{x.role}</div>
    <table><tbody>{items.map(([l,n],i)=><tr key={i}><td>{l}</td><td style={{textAlign:"left"}}><b>{fa(n||0)}</b></td></tr>)}</tbody></table>
    <button className="btn g" style={{marginTop:14,width:"100%"}} onClick={onClose}>بستن</button>
  </div></div>);
}

function StationExits(){
  const [rows,setRows]=useState([]);
  const load=()=>db.stationExits().then(r=>setRows(r||[])).catch(()=>{});
  useEffect(()=>{load(); const iv=setInterval(load,15000); return()=>clearInterval(iv);},[]);
  return(<div className="panel" style={{marginTop:14}}>
    <h3 style={{display:"flex",justifyContent:"space-between"}}><span>🚶 خروج نیرو از محدودهٔ ایستگاه (امروز)</span><span className="badge b-no">{fa(rows.length)}</span></h3>
    <div style={{maxHeight:240,overflow:"auto"}}>
      <table><thead><tr><th>نیرو</th><th>سمت</th><th>ایستگاه/خط</th><th>زمان خروج</th><th>نشان</th></tr></thead>
      <tbody>{rows.length?rows.map(x=><tr key={x.id}>
        <td><b>{x.name}</b></td><td>{x.role||"—"}</td>
        <td>{x.station_name||"—"}{x.line_code?` (خط ${x.line_code})`:""}</td>
        <td>{fj(x.exited_at)}</td>
        <td>{x.lat?<a className="btn g" style={{textDecoration:"none"}} target="_blank" rel="noopener" href={`https://maps.google.com/?q=${x.lat},${x.lng}`}>نشان</a>:"—"}</td></tr>)
        :<tr><td colSpan={5} className="muted" style={{textAlign:"center"}}>امروز خروجی از محدودهٔ ایستگاه ثبت نشده است.</td></tr>}</tbody></table>
    </div>
  </div>);
}

function PresenceLists(){
  const [d,setD]=useState({online:[],offline:[],inactive:[]});
  const load=()=>db.presence().then(setD).catch(()=>{});
  useEffect(()=>{load(); const iv=setInterval(load,15000); return()=>clearInterval(iv);},[]);
  const Col=({title,items,color})=>(<div className="panel" style={{margin:0}}>
    <h3 style={{display:"flex",justifyContent:"space-between"}}><span><span style={{color}}>●</span> {title}</span><span className="badge b-ok">{fa(items.length)}</span></h3>
    <div style={{maxHeight:220,overflow:"auto"}}>{items.length?items.map(x=><div key={x.id} className="card-p" style={{display:"block",padding:"7px 9px"}}>
      <b style={{fontSize:13}}>{x.name}</b><div className="muted" style={{fontSize:11}}>{x.role}{x.captured_at?(" · "+fj(x.captured_at)):""}</div></div>):<p className="muted" style={{fontSize:12}}>—</p>}</div>
  </div>);
  // بخش موارد انجام‌نشده (تخلفات عدم ارسال صحت‌سنجی)
  const today=new Date().toISOString().slice(0,10);
  const [vFrom,setVFrom]=useState(today); const [vTo,setVTo]=useState(today);
  const [viol,setViol]=useState(null); const [vLoading,setVLoading]=useState(false);
  const loadViol=()=>{ setVLoading(true); db.presenceViolations(vFrom, vTo)
    .then(r=>setViol(r||[])).catch(()=>setViol([])).finally(()=>setVLoading(false)); };
  return(<div>
    <div className="grid3" style={{marginTop:14,gap:12,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"}}>
      <Col title="آنلاین" items={d.online} color="#16a06a"/>
      <Col title="غیرفعال (بدون موقعیت)" items={d.inactive} color="#f6c324"/>
      <Col title="آفلاین" items={d.offline} color="#8a93a6"/>
    </div>
    <div className="panel" style={{marginTop:14}}>
      <h3>⚠ موارد انجام‌نشدهٔ صحت‌سنجی حضور</h3>
      <p className="muted" style={{fontSize:13,marginBottom:10}}>نیروهای مشمول صحت‌سنجی که در بازهٔ ساعتی مقرر، سلفی و عکس خط را ارسال نکرده‌اند. (نیاز به فعال بودن صحت‌سنجی و تعریف بازه‌های ساعتی در تنظیمات دارد.)</p>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
        <span className="label">از</span><JDate value={vFrom} onChange={setVFrom}/>
        <span className="label">تا</span><JDate value={vTo} onChange={setVTo}/>
        <button className="btn p" onClick={loadViol}>نمایش موارد انجام‌نشده</button>
        {viol&&<button className="btn g" onClick={()=>{const ws=XLSX.utils.json_to_sheet(viol.map(x=>({تاریخ:fj(x.slot_date),نیرو:x.name,سمت:x.role||"—","بازهٔ ساعتی":x.slot,نوع:x.type})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"موارد انجام‌نشده");XLSX.writeFile(wb,"موارد_انجام_نشده_صحت_سنجی.xlsx");}}>⤓ خروجی اکسل</button>}
      </div>
      {vLoading?<p className="muted" style={{textAlign:"center",padding:12}}>در حال بارگذاری…</p>
       :viol===null?<p className="muted" style={{textAlign:"center",padding:12}}>برای نمایش، بازهٔ تاریخ را انتخاب و دکمه را بزنید.</p>
       :viol.length===0?<p className="muted" style={{textAlign:"center",padding:12,color:"var(--ok)"}}>✓ موردی انجام‌نشده در این بازه یافت نشد.</p>
       :<table><thead><tr><th>تاریخ</th><th>نیرو</th><th>سمت</th><th>بازهٔ ساعتی</th><th>وضعیت</th></tr></thead>
        <tbody>{viol.map((x,i)=><tr key={i}><td>{fj(x.slot_date)}</td><td>{x.name}</td><td>{x.role||"—"}</td><td>{x.slot}</td>
          <td><span className="badge" style={{background:"#fde7ea",color:"#c0293f"}}>انجام نشده</span></td></tr>)}</tbody></table>}
    </div>
  </div>);
}

// انتخابگر کاربر با جستجو (تایپ بخشی از نام/نام‌خانوادگی)
function UserPicker({users,value,onChange,placeholder}){
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const list=users||[];
  const sel=list.find(u=>String(u.id)===String(value));
  const selName=sel?((sel.first_name||"")+" "+(sel.last_name||"")):"";
  const f=q.trim();
  const filtered=f?list.filter(u=>((u.first_name||"")+" "+(u.last_name||"")).includes(f)).slice(0,30):list.slice(0,30);
  return(<div style={{position:"relative",minWidth:240}}>
    <input className="input" placeholder={placeholder||"جستجوی کاربر…"} value={open?q:(selName||q)}
      onFocus={()=>{setOpen(true);setQ("");}} onChange={e=>{setQ(e.target.value);setOpen(true);}}/>
    {open&&<div style={{position:"absolute",top:"100%",right:0,left:0,background:"#fff",border:"1px solid var(--line)",borderRadius:10,boxShadow:"var(--shadow)",zIndex:50,maxHeight:240,overflow:"auto",marginTop:4}}>
      {filtered.length?filtered.map(u=><div key={u.id} className="card-p" style={{margin:6,cursor:"pointer"}}
        onClick={()=>{onChange(String(u.id));setOpen(false);setQ("");}}>
        <b style={{fontSize:13}}>{u.first_name} {u.last_name}</b> <small className="muted">{u.role_title||""}</small></div>)
        :<p className="muted" style={{padding:10,fontSize:12}}>موردی یافت نشد.</p>}
    </div>}
  </div>);
}

// فیلتر نمایش نقشهٔ زنده: بر اساس سمت یا اشخاص خاص (برای افزایش سرعت نمایش)
function MapFilters({allUsers,roleFilter,setRoleFilter,personFilter,setPersonFilter,onApply}){
  const [roles,setRoles]=React.useState([]);
  const [q,setQ]=React.useState("");
  React.useEffect(()=>{ db.roles().then(rs=>setRoles(rs||[])).catch(()=>{}); },[]);
  const toggleRole=(id)=>{ const cur=roleFilter?[...roleFilter]:[]; const i=cur.indexOf(String(id)); i>=0?cur.splice(i,1):cur.push(String(id)); setRoleFilter(cur.length?cur:null); };
  const togglePerson=(id)=>{ const cur=personFilter?[...personFilter]:[]; const i=cur.indexOf(String(id)); i>=0?cur.splice(i,1):cur.push(String(id)); setPersonFilter(cur.length?cur:null); };
  const filtered=q.trim()?allUsers.filter(u=>((u.first_name||"")+" "+(u.last_name||"")).includes(q.trim())):allUsers;
  return(<div style={{background:"var(--brand-soft)",borderRadius:10,padding:12,marginBottom:10}}>
    <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:8}}>برای افزایش سرعت نمایش، می‌توانید فقط سمت‌ها یا اشخاص دلخواه را نمایش دهید. اگر چیزی انتخاب نشود، همه نمایش داده می‌شوند.</p>
    <div style={{marginBottom:10}}>
      <b style={{fontSize:13}}>نمایش بر اساس سمت:</b>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
        {roles.map(r=>{ const on=roleFilter&&roleFilter.includes(String(r.id)); return(
          <label key={r.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,background:on?"var(--brand)":"#fff",color:on?"#fff":"var(--ink)",borderRadius:8,padding:"4px 10px",cursor:"pointer",border:"1px solid var(--line)"}}>
            <input type="checkbox" checked={!!on} onChange={()=>toggleRole(r.id)} style={{margin:0}}/>{r.title}</label>); })}
      </div>
    </div>
    <div>
      <b style={{fontSize:13}}>یا نمایش اشخاص مشخص:</b>
      <input className="input" style={{marginTop:6,marginBottom:6}} placeholder="جستجوی نام شخص…" value={q} onChange={e=>setQ(e.target.value)}/>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:160,overflowY:"auto"}}>
        {filtered.slice(0,100).map(u=>{ const on=personFilter&&personFilter.includes(String(u.id)); return(
          <label key={u.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,background:on?"var(--brand)":"#fff",color:on?"#fff":"var(--ink)",borderRadius:8,padding:"4px 10px",cursor:"pointer",border:"1px solid var(--line)"}}>
            <input type="checkbox" checked={!!on} onChange={()=>togglePerson(u.id)} style={{margin:0}}/>{u.first_name} {u.last_name}</label>); })}
      </div>
    </div>
    <div className="row" style={{gap:8,marginTop:10}}>
      <button className="btn p" onClick={onApply}>اعمال فیلتر</button>
      <button className="btn g" onClick={()=>{setRoleFilter(null);setPersonFilter(null);setTimeout(onApply,50);}}>نمایش همه</button>
    </div>
  </div>);
}

// کنترل پخش مسیر طی‌شده روی نقشه با نشانگر متحرک، تنظیم سرعت و میانگین سرعت بین نقاط
function PlaybackControls({trkPts,pbIdx,setPbIdx,pbPlaying,setPbPlaying,pbSpeed,setPbSpeed,mapRef,pbMarkerRef,pbIvRef}){
  const pts=(trkPts||[]).filter(p=>p.lat&&p.lng);
  // فاصلهٔ هاورساین بین دو نقطه (متر)
  const dist=(a,b)=>{ const R=6371000, toR=x=>x*Math.PI/180;
    const dLat=toR(b.lat-a.lat), dLng=toR(b.lng-a.lng);
    const s=Math.sin(dLat/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(s)); };
  // میانگین سرعت بین نقطهٔ فعلی و قبلی (km/h)
  const speedAt=(i)=>{ if(i<=0||i>=pts.length)return 0;
    const a=pts[i-1], b=pts[i];
    const d=dist({lat:+a.lat,lng:+a.lng},{lat:+b.lat,lng:+b.lng}); // متر
    const dt=(new Date(b.captured_at)-new Date(a.captured_at))/1000; // ثانیه
    if(dt<=0)return 0; return (d/dt)*3.6; };
  // قراردادن نشانگر روی نقطهٔ فعلی
  const placeMarker=(i)=>{ const map=mapRef.current; if(!map||!pts[i])return;
    const ll=[+pts[i].lat,+pts[i].lng];
    if(!pbMarkerRef.current){ pbMarkerRef.current=L.circleMarker(ll,{radius:9,color:"#fff",weight:3,fillColor:"#e3342f",fillOpacity:1}).addTo(map); }
    else pbMarkerRef.current.setLatLng(ll);
    map.panTo(ll,{animate:true,duration:0.3}); };
  React.useEffect(()=>{ if(pts.length)placeMarker(pbIdx); },[pbIdx]);
  React.useEffect(()=>{
    if(pbPlaying){
      pbIvRef.current=setInterval(()=>{
        setPbIdx(prev=>{ if(prev>=pts.length-1){ setPbPlaying(false); return prev; } return prev+1; });
      }, Math.max(120, 1000/pbSpeed));
    } else if(pbIvRef.current){ clearInterval(pbIvRef.current); pbIvRef.current=null; }
    return()=>{ if(pbIvRef.current){clearInterval(pbIvRef.current);pbIvRef.current=null;} };
  },[pbPlaying,pbSpeed]);
  React.useEffect(()=>()=>{ const map=mapRef.current; if(pbMarkerRef.current&&map){map.removeLayer(pbMarkerRef.current);pbMarkerRef.current=null;} },[]);
  if(!pts.length)return null;
  const cur=pts[pbIdx]||{}; const spd=speedAt(pbIdx);
  return(<div style={{background:"var(--brand-soft,#eef7f3)",borderRadius:10,padding:12,marginBottom:12,border:"1px solid var(--line)"}}>
    <div className="row" style={{gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <button className="btn p" onClick={()=>setPbPlaying(!pbPlaying)} style={{minWidth:90}}>{pbPlaying?"⏸ توقف":"▶ پخش مسیر"}</button>
      <button className="btn g" onClick={()=>{setPbPlaying(false);setPbIdx(0);}}>⏮ ابتدا</button>
      <span className="label">سرعت پخش:</span>
      <select className="input" style={{maxWidth:90,padding:"5px 8px"}} value={pbSpeed} onChange={e=>setPbSpeed(+e.target.value)}>
        <option value="0.5">۰٫۵×</option><option value="1">۱×</option><option value="2">۲×</option><option value="4">۴×</option><option value="8">۸×</option>
      </select>
    </div>
    <input type="range" min="0" max={pts.length-1} value={pbIdx} onChange={e=>{setPbPlaying(false);setPbIdx(+e.target.value);}} style={{width:"100%",marginTop:12,accentColor:"#0d7a5f"}}/>
    <div className="row" style={{justifyContent:"space-between",fontSize:12.5,marginTop:6,flexWrap:"wrap",gap:6}}>
      <span>نقطه {fa(pbIdx+1)} از {fa(pts.length)}</span>
      <span>{cur.captured_at?fj(cur.captured_at):""}</span>
      <span style={{fontWeight:700,color:spd>0?"#0d7a5f":"var(--muted)"}}>میانگین سرعت: {fa(Math.round(spd))} km/h</span>
    </div>
  </div>);
}

function LiveMap(){
  const ref=useRef(); const mapRef=useRef(); const lineRef=useRef(); const layerRef=useRef(); const [mode,setMode]=useState("live");
  const [people,setPeople]=useState([]); const [trkUser,setTrkUser]=useState(""); const trkIv=useRef(null);
  const [fromD,setFromD]=useState(""); const [toD,setToD]=useState(""); const [trkInfo,setTrkInfo]=useState(null);
  const [trkPts,setTrkPts]=useState(null); const [fences,setFences]=useState([]); const [trkExits,setTrkExits]=useState([]);
  useEffect(()=>{ db.geofences().then(g=>setFences(g||[])).catch(()=>{}); },[]);
  const [fromT,setFromT]=useState("00:00"); const [toT,setToT]=useState("23:59");
  const [onlineUsers,setOnlineUsers]=useState([]); const [allUsers,setAllUsers]=useState([]);
  useEffect(()=>{ db.usersLite().then(l=>setAllUsers(l||[])).catch(()=>{}); },[]);
  const [mapProvider,setMapProvider]=useState(localStorage.mapProvider||"osm");
  const [shiftFilter,setShiftFilter]=useState(()=>localStorage.liveShiftFilter==="1");
  const [onlyOnline,setOnlyOnline]=useState(()=>localStorage.liveOnlyOnline==="1");
  const onlyOnlineRef=useRef(onlyOnline);
  useEffect(()=>{ onlyOnlineRef.current=onlyOnline; localStorage.liveOnlyOnline=onlyOnline?"1":""; },[onlyOnline]);
  const [roleFilter,setRoleFilter]=useState(()=>{ try{return JSON.parse(localStorage.liveRoleFilter||"null");}catch(e){return null;} }); // null = همه
  const [personFilter,setPersonFilter]=useState(()=>{ try{return JSON.parse(localStorage.livePersonFilter||"null");}catch(e){return null;} }); // null = همه
  const [showFilters,setShowFilters]=useState(false);
  // وضعیت پخش مسیر (playback)
  const [pbIdx,setPbIdx]=useState(0); const [pbPlaying,setPbPlaying]=useState(false); const [pbSpeed,setPbSpeed]=useState(1);
  const pbMarkerRef=useRef(null); const pbIvRef=useRef(null);
  const [viewTab,setViewTab]=useState("main"); // main | live | report | exits
  const roleFilterRef=useRef(roleFilter); const personFilterRef=useRef(personFilter);
  useEffect(()=>{ roleFilterRef.current=roleFilter; localStorage.liveRoleFilter=JSON.stringify(roleFilter); },[roleFilter]);
  useEffect(()=>{ personFilterRef.current=personFilter; localStorage.livePersonFilter=JSON.stringify(personFilter); },[personFilter]);
  const [mapKeys,setMapKeys]=useState({});
  useEffect(()=>{ db.settings().then(s=>setMapKeys({neshan:s.neshan_api_key||"",balad:s.balad_api_key||""})).catch(()=>{}); },[]);
  const baseRef=useRef(null);
  const tileFor=(prov)=>{ const k=mapKeys||{};
    switch(prov){
      case "google": return {url:"https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",opts:{attribution:"© Google",maxZoom:20}};
      case "google_sat": return {url:"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",opts:{attribution:"© Google",maxZoom:20}};
      case "balad": return {url:"https://tile-{s}.balad.ir/v1/main/{z}/{x}/{y}.png",opts:{attribution:"© بلد",subdomains:["a","b","c"],maxZoom:18}};
      case "neshan":
        // تایل نشان از طریق سرور SDK نشان (با کلید وب). الگوی رسمی SDK نشان.
        if(k.neshan) return {url:"https://static.neshan.org/sdk/leaflet/1.4.0/standard-day/{z}/{x}/{y}.png",opts:{attribution:"© نشان",maxZoom:19},note:false};
        return {url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",opts:{attribution:"© OSM (کلید نشان تنظیم نشده)",maxZoom:19},note:true};
      default: return {url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",opts:{attribution:"© OpenStreetMap",maxZoom:19}};
    }
  };
  const applyBase=(prov)=>{ const map=mapRef.current; if(!map)return;
    if(baseRef.current){ map.removeLayer(baseRef.current); baseRef.current=null; }
    const t=tileFor(prov);
    const opts={...t.opts, crossOrigin:true};
    const layer=L.tileLayer(t.url,opts);
    // اگر تایل نشان لود نشد (مثلاً دامنه whitelist نشده)، خودکار به OpenStreetMap برگرد
    if(prov==="neshan"){
      let errCount=0;
      layer.on("tileerror",()=>{ errCount++; if(errCount>=3 && baseRef.current===layer){
        map.removeLayer(layer);
        baseRef.current=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OSM (نشان در دسترس نبود)",maxZoom:19,crossOrigin:true}).addTo(map);
        if(baseRef.current.bringToBack)baseRef.current.bringToBack();
      }});
    }
    baseRef.current=layer.addTo(map); if(baseRef.current.bringToBack)baseRef.current.bringToBack();
  };
  const changeProvider=(prov)=>{ setMapProvider(prov); localStorage.mapProvider=prov; applyBase(prov); };
  // رنگ خط دور تصویر بر اساس سطح/نقش کاربر
  const roleColor=(u)=>{ const r=(u.role_title||""); const lv=+u.level||0;
    if(r.includes("مدیر کل"))return "#7c3aed";
    if(r.includes("بازرسی")||r.includes("سربازرس"))return "#d97706";
    if(r.includes("بازرس"))return "#dc2626";
    if(r.includes("اپراتور"))return "#0891b2";
    if(r.includes("ناظر"))return "#0d7a5f";
    if(lv>=8)return "#7c3aed"; if(lv>=6)return "#d97706"; return "#0d7a5f"; };
  const markersRef=useRef({});
  const liveDataRef=useRef([]);
  const focusRef=useRef(""); // کاربر منتخب برای نمایش انحصاری روی نقشه
  const centerRef=useRef(false);
  const markerHtml=(u)=>{ const online=!!(+u.online); const ring=roleColor(u);
    const initials=((u.first_name||"؟")[0]||"")+((u.last_name||"")[0]||"");
    const photoStyle=u.photo?`background-image:url('${u.photo}');background-size:cover;background-position:center;`:`background:${ring};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;`;
    const dim=online?1:0.5;
    return `<div style="position:relative;width:42px;height:52px;opacity:${dim}">
      <div style="width:40px;height:40px;border-radius:50%;border:3px solid ${ring};box-shadow:0 2px 6px rgba(0,0,0,.4);${photoStyle}overflow:hidden">${u.photo?"":initials}</div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid ${ring}"></div>
      <div style="position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;border:2px solid #fff;background:${online?"#16a06a":"#9aa6b6"}"></div>
      ${(+u.vpn_on)?'<div style="position:absolute;top:-4px;left:-4px;background:#dc2626;color:#fff;font-size:8px;font-weight:700;border-radius:4px;padding:0 3px">VPN</div>':''}
      ${(+u.via_gsm)?'<div style="position:absolute;bottom:8px;left:-6px;background:#d97706;color:#fff;font-size:9px;font-weight:700;border-radius:8px;padding:1px 4px;box-shadow:0 1px 3px rgba(0,0,0,.4)">📶</div>':''}
    </div>`; };
  const popupHtml=(u)=>{ const online=!!(+u.online); const mins=Math.floor((u.secs_ago||0)/60);
    return `<b>${u.first_name} ${u.last_name}</b><br>${u.role_title||''}<br>${online?'<span style="color:#16a06a">● آنلاین (در حال ارسال موقعیت)</span>':'<span style="color:#8a93a6">● آفلاین — '+(mins>0?('آخرین ارسال '+mins+' دقیقه پیش'):'لحظاتی پیش')+'</span>'}${(+u.vpn_on)?'<br><span style="color:#dc2626">⚠ فیلترشکن روشن'+(u.ip_country&&u.ip_country!=='IR'?(' (کشور IP: '+u.ip_country+')'):'')+'</span>':''}${(u.ip_country&&u.ip_country!=='IR'&&!(+u.vpn_on))?'<br><span style="color:#d97706">🌐 کشور IP: '+u.ip_country+'</span>':''}${(+u.via_gsm)?'<br><span style="color:#d97706">📶 موقعیت حدودی (آنتن GSM — GPS خاموش)</span>':''}${(u.battery_level!=null&&u.battery_level!=='')?'<br><span style="color:'+(u.battery_level<20?'#dc2626':'#16a06a')+'">🔋 باتری: '+fa(u.battery_level)+'٪'+(+u.battery_charging?' (در حال شارژ)':'')+'</span>':''}<br>${fj(u.captured_at)}`; };
  const drawUsers=()=>{ const map=mapRef.current; if(!map)return;
    if(!layerRef.current){ layerRef.current=L.layerGroup().addTo(map); }
    const grp=layerRef.current; const mk=markersRef.current; const seen={};
    db.live(shiftFilter).then(list=>{ (list||[]).forEach(u=>{ if(!u.lat||!u.lng)return; const id=u.user_id;
      if(focusRef.current && String(id)!==String(focusRef.current)) return; // فقط کاربر منتخب
      // فیلتر سمت: اگر فهرست سمت‌ها تعیین شده باشد، فقط همان سمت‌ها نمایش داده شوند
      const rf=roleFilterRef.current;
      if(rf && rf.length && !rf.includes(String(u.role_id||u.role_title||""))) return;
      // فیلتر اشخاص: اگر فهرست اشخاص تعیین شده باشد، فقط همان افراد نمایش داده شوند
      const pf=personFilterRef.current;
      if(pf && pf.length && !pf.includes(String(id))) return;
      // فیلتر فقط آنلاین: اگر فعال باشد، افراد آفلاین نمایش داده نشوند
      if(onlyOnlineRef.current && !u.online) return;
      seen[id]=1;
      const pos=[+u.lat,+u.lng]; const icon=L.divIcon({html:markerHtml(u),className:"",iconSize:[42,52],iconAnchor:[21,52],popupAnchor:[0,-50]});
      if(mk[id]){ // فقط موقعیت/آیکن/پاپ‌آپ را به‌روزرسانی کن (بدون حذف و رسم مجدد → بدون چشمک‌زدن)
        mk[id].setLatLng(pos); mk[id].setIcon(icon); mk[id].getPopup()?mk[id].setPopupContent(popupHtml(u)):mk[id].bindPopup(popupHtml(u));
      } else {
        mk[id]=L.marker(pos,{icon}).addTo(grp).bindPopup(popupHtml(u));
      }
      if(focusRef.current && String(id)===String(focusRef.current) && centerRef.current){ map.setView(pos, Math.max(map.getZoom()||12,15)); centerRef.current=false; mk[id].openPopup(); }
    });
    // حذف مارکر کسانی که دیگر در فهرست نیستند
    Object.keys(mk).forEach(id=>{ if(!seen[id]){ grp.removeLayer(mk[id]); delete mk[id]; } });
    // ذخیرهٔ داده‌های فعلی برای استفاده در ذخیرهٔ تصویر نقشه
    liveDataRef.current=(list||[]).filter(u=>{ if(!u.lat||!u.lng)return false;
      const rf=roleFilterRef.current; if(rf&&rf.length&&!rf.includes(String(u.role_id||u.role_title||"")))return false;
      const pf=personFilterRef.current; if(pf&&pf.length&&!pf.includes(String(u.user_id)))return false;
      return true; });
    setOnlineUsers((list||[]).filter(u=>+u.online).map(u=>({id:u.user_id,name:(u.first_name||'')+' '+(u.last_name||'')})));
    }).catch(()=>{});
  };
  useEffect(()=>{
    const map=L.map(ref.current).setView([36.297,59.606],12); mapRef.current=map;
    applyBase(mapProvider);
    db.geofences().then(gs=>(gs||[]).forEach(g=>{
      if(g.type==="circle"&&g.center_lat)L.circle([g.center_lat,g.center_lng],{radius:g.radius_m||200,color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(`ایستگاه: ${g.name}${g.line_code?" — خط "+g.line_code:""}`);
      else if(g.type==="polygon"&&g.polygon)L.polygon(g.polygon,{color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(`محدوده: ${g.name}${g.line_code?" — خط "+g.line_code:""}`);
    })).catch(()=>{});
    drawUsers();
    setTimeout(()=>map.invalidateSize(),200);
    const iv=setInterval(drawUsers,15000);
    return()=>{clearInterval(iv);map.remove();};
  },[]);

  // با انتخاب یک نفر از کشوی رهگیری، در حالت زنده فقط همان نفر روی نقشه نمایش داده شود
  useEffect(()=>{
    focusRef.current=trkUser; centerRef.current=!!trkUser;
    if(mode==="live" && mapRef.current){
      const mk=markersRef.current, grp=layerRef.current;
      // حذف فوری مارکرهای غیرمنتخب تا محو شدن آنی دیده شود
      if(trkUser && grp){ Object.keys(mk).forEach(id=>{ if(String(id)!==String(trkUser)){ grp.removeLayer(mk[id]); delete mk[id]; } }); }
      drawUsers();
    }
  },[trkUser]);
  const drawTrack=(pts)=>{ const map=mapRef.current; if(!map)return; if(lineRef.current)map.removeLayer(lineRef.current);
    const all=(pts||[]).filter(p=>p.lat&&p.lng);
    const latlng=all.map(p=>[+p.lat,+p.lng]);
    if(!latlng.length){ setTrkInfo({count:0}); return; }
    const grp=L.layerGroup().addTo(map); lineRef.current=grp;
    L.polyline(latlng,{color:"#0d7a5f",weight:4}).addTo(grp);
    const dist=(a,b,c,d)=>{ const R=6371000,t=Math.PI/180,dLa=(c-a)*t,dLo=(d-b)*t;
      const x=Math.sin(dLa/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(x)); };
    // نقاط میانی: هر جا موقعیت بیش از ۲۰ متر تغییر کرده، یک نقطهٔ قابل‌کلیک با مشخصات
    let last=null;
    all.forEach((p,i)=>{ const la=+p.lat,lo=+p.lng; const isEnd=(i===0||i===all.length-1);
      if(!isEnd){ if(last && dist(last[0],last[1],la,lo)<20) return; last=[la,lo];
        const isGsm=(+p.via_gsm); const ptColor=isGsm?"#d97706":"#0d7a5f";
        L.circleMarker([la,lo],{radius:4,color:ptColor,weight:1.5,fillColor:isGsm?"#fde68a":"#fff",fillOpacity:1}).addTo(grp)
          .bindPopup(`<b>نقطهٔ تردد</b><br>${fj(p.captured_at)}<br>${isGsm?'<span style="color:#d97706">📶 موقعیت حدودی (آنتن GSM — GPS خاموش)</span><br>':''}${p.mocked?'<span style="color:#e3403e">موقعیت جعلی</span><br>':''}<a href="https://maps.google.com/?q=${la},${lo}" target="_blank">نمایش روی نقشهٔ گوگل</a>`);
      } else { last=[la,lo]; }
    });
    // نقطهٔ شروع و پایان (با مشخصات)
    L.circleMarker(latlng[0],{radius:7,color:"#fff",weight:2,fillColor:"#16a06a",fillOpacity:1}).addTo(grp)
      .bindPopup(`<b>شروع مسیر</b><br>${fj(all[0].captured_at)}`);
    L.circleMarker(latlng[latlng.length-1],{radius:7,color:"#fff",weight:2,fillColor:"#e3403e",fillOpacity:1}).addTo(grp)
      .bindPopup(`<b>پایان مسیر</b><br>${fj(all[all.length-1].captured_at)}`);
    map.fitBounds(L.polyline(latlng).getBounds(),{padding:[30,30]});
  };
  // رهگیری زنده: مسیر امروزِ کاربر انتخابی هر ۱۵ ثانیه به‌روز می‌شود
  const startLive=()=>{ if(!trkUser){alert("یک کاربر را انتخاب کنید");return;} setMode("track");
    if(trkIv.current)clearInterval(trkIv.current);
    const today=new Date().toISOString().slice(0,10);
    const run=()=>db.track(trkUser,today+" 00:00:00",today+" 23:59:59").then(r=>{drawTrack(r.points);setTrkInfo({name:r.name,count:r.count});}).catch(()=>{});
    run(); trkIv.current=setInterval(run,15000);
  };
  // گزارش رهگیری: مسیر کاربر در بازهٔ تاریخی انتخاب‌شده
  const showReport=()=>{ if(!trkUser){alert("یک کاربر را انتخاب کنید");return;}
    if(!fromD||!toD){alert("بازهٔ تاریخ را انتخاب کنید");return;}
    if(trkIv.current){clearInterval(trkIv.current);trkIv.current=null;} setMode("report");
    const from=fromD+" "+(fromT||"00:00")+":00", to=toD+" "+(toT||"23:59")+":59";
    db.track(trkUser,from,to).then(r=>{drawTrack(r.points);setTrkInfo({name:r.name,count:r.count});setTrkPts(r.points||[]);}).catch(e=>alert(e.message||"خطا"));
    db.stationExits(from).then(ex=>setTrkExits((ex||[]).filter(e=>String(e.user_id)===String(trkUser)))).catch(()=>setTrkExits([]));
  };
  const exitNearTime=(cap)=>{ const t=new Date(String(cap).replace(' ','T')).getTime(); for(const e of trkExits){ const et=new Date(String(e.exited_at).replace(' ','T')).getTime(); if(Math.abs(et-t)<=90000) return fj(e.exited_at); } return ""; };
  // محاسبهٔ نام ایستگاه یا فاصله تا نزدیک‌ترین ایستگاه/خط (متر)
  const stationOf=(la,lo)=>{ const st=(fences||[]).filter(g=>g.center_lat&&g.center_lng&&g.radius_m); if(!st.length)return "—";
    const D=(a,b,c,d)=>{const R=6371000,t=Math.PI/180,dLa=(c-a)*t,dLo=(d-b)*t;const x=Math.sin(dLa/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
    let best=null,bd=Infinity; st.forEach(s=>{const dd=D(la,lo,+s.center_lat,+s.center_lng); if(dd<bd){bd=dd;best=s;}});
    if(best&&bd<=(+best.radius_m)) return "داخل: "+best.name+(best.line_code?` (خط ${best.line_code})`:"");
    return `${Math.round(bd)} متر تا «${best?best.name:'?'}»`+(best&&best.line_code?` (خط ${best.line_code})`:""); };
  // preset بازه‌های زمانی آماده
  const setPreset=(p)=>{ const d=new Date(); const iso=x=>x.toISOString().slice(0,10);
    if(p==="today"){ setFromD(iso(d)); setToD(iso(d)); setFromT("00:00"); setToT("23:59"); }
    else if(p==="yesterday"){ const y=new Date(d.getTime()-86400000); setFromD(iso(y)); setToD(iso(y)); setFromT("00:00"); setToT("23:59"); }
    else if(p==="7d"){ const a=new Date(d.getTime()-6*86400000); setFromD(iso(a)); setToD(iso(d)); setFromT("00:00"); setToT("23:59"); }
    else if(p==="30d"){ const a=new Date(d.getTime()-29*86400000); setFromD(iso(a)); setToD(iso(d)); setFromT("00:00"); setToT("23:59"); }
  };
  // خروجی اکسل ریز تردد پرسنل (نقاط مسیر با زمان شمسی + لینک نقشه + ایستگاه/فاصله)
  const exportTrack=async()=>{ if(!trkUser){alert("یک کاربر را انتخاب کنید");return;} if(!fromD||!toD){alert("بازهٔ تاریخ را انتخاب کنید");return;}
    const from=fromD+" "+(fromT||"00:00")+":00", to=toD+" "+(toT||"23:59")+":59";
    try{
      const [r, fences, exits] = await Promise.all([db.track(trkUser,from,to), db.geofences().catch(()=>[]), db.stationExits(from).catch(()=>[])]);
      const pts=r.points||[]; if(!pts.length){alert("نقطه‌ای در این بازه ثبت نشده است");return;}
      const stations=(fences||[]).filter(g=>g.center_lat&&g.center_lng&&g.radius_m);
      const dist=(la1,lo1,la2,lo2)=>{ const R=6371000,t=Math.PI/180,dLa=(la2-la1)*t,dLo=(lo2-lo1)*t;
        const a=Math.sin(dLa/2)**2+Math.cos(la1*t)*Math.cos(la2*t)*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(a)); };
      const stationCol=(la,lo)=>{ if(!stations.length) return "—"; let best=null,bestD=Infinity;
        stations.forEach(s=>{ const d=dist(la,lo,+s.center_lat,+s.center_lng); if(d<bestD){bestD=d;best=s;} });
        if(best && bestD<=(+best.radius_m)) return "داخل ایستگاه: "+best.name;
        return `${Math.round(bestD)} متر تا «${best?best.name:'?'}»`; };
      // زمان‌های خروج از ایستگاه برای این کاربر (برای ستون «خروج از ایستگاه»)
      const exitTimes=(exits||[]).filter(e=>String(e.user_id)===String(trkUser)).map(e=>new Date(String(e.exited_at).replace(' ','T')).getTime());
      const exitNear=(cap)=>{ const t=new Date(String(cap).replace(' ','T')).getTime(); for(const et of exitTimes){ if(Math.abs(et-t)<=90000) return fj(cap); } return ""; };
      // ساخت کاربرگ با هایپرلینک واقعی
      const head=["ردیف","نام کاربر","تاریخ/ساعت (شمسی)","عرض جغرافیایی","طول جغرافیایی","موقعیت جعلی","ایستگاه/فاصله","خروج از ایستگاه","نشان روی نقشه"];
      const aoa=[head]; pts.forEach((p,i)=>{ const la=+p.lat,lo=+p.lng;
        aoa.push([i+1,r.name||"",fj(p.captured_at),la,lo,p.mocked?"بله":"خیر",stationCol(la,lo),exitNear(p.captured_at),"نمایش روی نقشه"]); });
      const ws=XLSX.utils.aoa_to_sheet(aoa);
      // افزودن هایپرلینک به ستون آخر (نشان روی نقشه)
      pts.forEach((p,i)=>{ const cell=XLSX.utils.encode_cell({r:i+1,c:8}); if(ws[cell]) ws[cell].l={Target:`https://maps.google.com/?q=${p.lat},${p.lng}`,Tooltip:"نمایش روی نقشه"}; });
      ws['!cols']=[{wch:6},{wch:18},{wch:20},{wch:12},{wch:12},{wch:10},{wch:28},{wch:18},{wch:16}];
      const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"ریز تردد");
      XLSX.writeFile(wb,`tracking_${trkUser}_${fromD}_${toD}.xlsx`);
    }catch(e){ alert(e.message||"خطا"); }
  };
  // ذخیرهٔ تصویر باکیفیت نقشه با موقعیت نیروها
  const [savingImg,setSavingImg]=useState(false);
  const saveMapImage=async()=>{
    const map=mapRef.current; if(!map){alert("نقشه آماده نیست");return;}
    setSavingImg(true);
    try{
      const mapEl=map.getContainer();
      const W=mapEl.clientWidth, H=mapEl.clientHeight;
      const scale=2;
      const cv=document.createElement("canvas");
      cv.width=W*scale; cv.height=H*scale;
      const ctx=cv.getContext("2d");
      ctx.scale(scale,scale);
      // پس‌زمینه
      ctx.fillStyle="#e8eef2"; ctx.fillRect(0,0,W,H);
      const mapRect=mapEl.getBoundingClientRect();
      // کشیدن کاشی‌های نقشه (تصاویری که leaflet در DOM دارد)
      const imgs=mapEl.querySelectorAll("img.leaflet-tile, .leaflet-tile-loaded");
      let drawn=0, failed=0;
      for(const img of imgs){
        try{
          if(!img.src||!img.complete||img.naturalWidth===0) continue;
          const r=img.getBoundingClientRect();
          const x=r.left-mapRect.left, y=r.top-mapRect.top;
          // فقط اگر CORS اجازه دهد، در غیر این صورت در catch می‌افتد
          ctx.drawImage(img, x, y, r.width, r.height);
          drawn++;
        }catch(e){ failed++; }
      }
      // کشیدن مارکرها با عکس پروفایل + نام + سمت هر نیرو
      const users=liveDataRef.current||[];
      // ابتدا عکس‌ها را به‌صورت موازی لود کن (با توکن)
      const loadImg=(url)=>new Promise((res)=>{
        if(!url){res(null);return;}
        const full=url.indexOf("/api/")===0?(API_BASE.replace(/\/api$/,"")+url):url;
        fetch(full,{headers:tok()}).then(r=>r.ok?r.blob():null).then(bl=>{
          if(!bl){res(null);return;} const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=URL.createObjectURL(bl);
        }).catch(()=>res(null));
      });
      const mapRect2=mapEl.getBoundingClientRect();
      const mkEls=mapEl.querySelectorAll(".leaflet-marker-icon");
      // تطبیق مارکرها با کاربران بر اساس موقعیت پیکسلی
      for(let mi=0; mi<mkEls.length; mi++){
        const mkEl=mkEls[mi];
        const r=mkEl.getBoundingClientRect();
        const x=r.left-mapRect2.left+r.width/2, y=r.top-mapRect2.top+r.height/2;
        // پیدا کردن کاربر متناظر (نزدیک‌ترین به این پیکسل با تبدیل latLng→pixel)
        let u=null;
        try{ const map=mapRef.current;
          let best=1e9;
          for(const cand of users){ const pt=map.latLngToContainerPoint([+cand.lat,+cand.lng]); const d=Math.hypot(pt.x-x,pt.y-y); if(d<best){best=d;u=cand;} }
          if(best>40) u=null;
        }catch(e){}
        const photo = u? (u.photo||null) : null;
        const img = await loadImg(photo);
        // دایرهٔ عکس
        const R=16;
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.closePath();
        ctx.lineWidth=3; ctx.strokeStyle=u&&+u.online?"#16a06a":"#8a93a6";
        if(img){ ctx.clip(); ctx.drawImage(img,x-R,y-R,R*2,R*2); ctx.restore(); ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.lineWidth=3; ctx.strokeStyle=u&&+u.online?"#16a06a":"#8a93a6"; ctx.stroke(); }
        else { ctx.fillStyle="#0d7a5f"; ctx.fill(); ctx.stroke(); ctx.restore();
          if(u){ ctx.fillStyle="#fff"; ctx.font="bold 12px Tahoma"; ctx.textAlign="center"; ctx.fillText(((u.first_name||"؟")[0]||"؟"),x,y+4); } }
        // نام و سمت زیر عکس
        if(u){ const nm=((u.first_name||"")+" "+(u.last_name||"")).trim();
          ctx.font="bold 11px Tahoma"; ctx.textAlign="center"; ctx.direction="rtl";
          // پس‌زمینهٔ نیم‌شفاف برای خوانایی
          const tw=Math.max(ctx.measureText(nm).width, ctx.measureText(u.role_title||"").width)+10;
          ctx.fillStyle="rgba(255,255,255,0.85)"; ctx.fillRect(x-tw/2,y+R+2,tw,(u.role_title?28:16));
          ctx.fillStyle="#0f1b2d"; ctx.fillText(nm,x,y+R+13);
          if(u.role_title){ ctx.font="10px Tahoma"; ctx.fillStyle="#5a6678"; ctx.fillText(u.role_title,x,y+R+25); }
        }
      }
      // سربرگ
      ctx.fillStyle="rgba(13,122,95,0.92)"; ctx.fillRect(0,0,W,32);
      ctx.fillStyle="#fff"; ctx.font="bold 14px Tahoma,sans-serif"; ctx.textAlign="right"; ctx.direction="rtl";
      ctx.fillText("موقعیت لحظه‌ای نیروها — "+new Date().toLocaleString("fa-IR"), W-12, 21);

      if(failed>0 && drawn===0){
        // همهٔ کاشی‌ها CORS داشتند → نقشه قابل‌رسم نیست، فقط مارکرها
        alert("کاشی‌های نقشهٔ آنلاین به‌دلیل محدودیت امنیتی (CORS) قابل ذخیره نیستند. تصویر فقط شامل موقعیت نیروهاست. برای تصویر کامل‌تر، نوع نقشه را به OpenStreetMap تغییر دهید.");
      }
      const url=cv.toDataURL("image/png");
      const a=document.createElement("a");
      a.href=url; a.download="map_positions_"+Date.now()+".png"; a.click();
    }catch(e){
      alert("ذخیرهٔ تصویر ناموفق بود: "+(e.message||e)+"\nمی‌توانید از کلید Print Screen ویندوز استفاده کنید.");
    }finally{ setSavingImg(false); }
  };
  const stopTrack=()=>{ if(trkIv.current){clearInterval(trkIv.current);trkIv.current=null;} const map=mapRef.current; if(lineRef.current&&map)map.removeLayer(lineRef.current); setTrkInfo(null); setTrkPts(null); setMode("live"); drawUsers(); };
  return(<div className="panel"><h3>نقشهٔ نیروها و رهگیری
    <span className="row" style={{gap:8}}>
      <select className="input" style={{maxWidth:170,fontSize:12}} value={mapProvider} onChange={e=>changeProvider(e.target.value)}>
        <option value="osm">نقشهٔ OpenStreetMap</option>
        <option value="google">نقشهٔ گوگل</option>
        <option value="google_sat">ماهواره‌ای گوگل</option>
        <option value="neshan">نشان (Neshan)</option>
        <option value="balad">بلد (Balad)</option>
      </select>
      <button className="btn g" onClick={()=>{stopTrack();}}>{mode==="live"?"● زنده":"زنده"}</button>
      <button className="btn g" onClick={()=>setShowFilters(s=>!s)}>{(roleFilter&&roleFilter.length)||(personFilter&&personFilter.length)?"⚙ فیلتر فعال":"⚙ فیلتر نمایش"}</button>
      <button className={shiftFilter?"btn p":"btn g"} onClick={()=>{ const n=!shiftFilter; setShiftFilter(n); localStorage.liveShiftFilter=n?"1":""; const mk=markersRef.current,grp=layerRef.current; if(grp){Object.keys(mk).forEach(id=>{grp.removeLayer(mk[id]);delete mk[id];}); } drawUsers(); }} title={shiftFilter?"نمایش همه":"فقط در شیفت"}>{shiftFilter?"👥 فقط در شیفت":"👥 همه"}</button>
      <button className={onlyOnline?"btn p":"btn g"} onClick={()=>{ const n=!onlyOnline; setOnlyOnline(n); const mk=markersRef.current,grp=layerRef.current; if(grp){Object.keys(mk).forEach(id=>{grp.removeLayer(mk[id]);delete mk[id];}); } drawUsers(); }} title={onlyOnline?"نمایش همه":"فقط آنلاین‌ها"}>{onlyOnline?"🟢 فقط آنلاین":"🟢 آنلاین/آفلاین"}</button>
      <button className="btn g" disabled={savingImg} onClick={saveMapImage}>{savingImg?"در حال ذخیره…":"📷 ذخیرهٔ تصویر نقشه"}</button></span></h3>
    {/* تب‌بندی نقشه */}
    <div className="tabbar" style={{display:"flex",gap:8,marginBottom:12,borderBottom:"2px solid var(--line)",flexWrap:"wrap"}}>
      {[["main","🗺 نقشهٔ اصلی نیروها"],["live","🛰 رهگیری زنده"],["report","📊 گزارش مسیر و پخش"],["exits","⛔ خروج از محدوده امروز"]].map(([k,lbl])=>
        <button key={k} onClick={()=>{ setViewTab(k); if(k==="main")stopTrack(); }} style={{background:"none",border:"none",borderBottom:viewTab===k?"3px solid var(--brand)":"3px solid transparent",padding:"8px 14px",cursor:"pointer",fontWeight:viewTab===k?800:500,color:viewTab===k?"var(--brand)":"var(--muted)",fontFamily:"inherit",fontSize:13.5,whiteSpace:"nowrap"}}>{lbl}</button>)}
    </div>
    {showFilters&&<MapFilters allUsers={allUsers} roleFilter={roleFilter} setRoleFilter={setRoleFilter} personFilter={personFilter} setPersonFilter={setPersonFilter} onApply={()=>{const mk=markersRef.current,grp=layerRef.current; if(grp){Object.keys(mk).forEach(id=>{grp.removeLayer(mk[id]);delete mk[id];});} drawUsers();}}/>}
    {viewTab==="live"&&<div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--muted)",fontWeight:700}}>رهگیری زنده:</span>
      <select className="input" style={{maxWidth:220}} value={trkUser} onChange={e=>setTrkUser(e.target.value)}>
        <option value="">— انتخاب از کاربران آنلاین —</option>
        {onlineUsers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="btn g" onClick={startLive}>شروع رهگیری زنده</button>
      {mode!=="live"&&<button className="btn" onClick={stopTrack}>توقف/بازگشت</button>}
    </div>}
    {viewTab==="report"&&<>
    <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--muted)",fontWeight:700}}>گزارش مسیر برای:</span>
      <UserPicker users={allUsers} value={trkUser} onChange={setTrkUser} placeholder="جستجوی نام/نام‌خانوادگی…"/>
    </div>
    <div className="row" style={{gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--muted)"}}>بازهٔ آماده:</span>
      <button className="btn g" onClick={()=>setPreset("today")}>امروز</button>
      <button className="btn g" onClick={()=>setPreset("yesterday")}>دیروز</button>
      <button className="btn g" onClick={()=>setPreset("7d")}>۷ روز اخیر</button>
      <button className="btn g" onClick={()=>setPreset("30d")}>۳۰ روز اخیر</button>
    </div></>}
    {viewTab==="report"&&<div className="row" style={{gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
      <span style={{fontSize:12,color:"var(--muted)"}}>از</span>
      <JDate value={fromD} onChange={setFromD} placeholder="از تاریخ"/>
      <input className="input" type="time" value={fromT} onChange={e=>setFromT(e.target.value)} style={{maxWidth:110}}/>
      <span style={{fontSize:12,color:"var(--muted)"}}>تا</span>
      <JDate value={toD} onChange={setToD} placeholder="تا تاریخ"/>
      <input className="input" type="time" value={toT} onChange={e=>setToT(e.target.value)} style={{maxWidth:110}}/>
      <button className="btn t" onClick={showReport}>نمایش مسیر</button>
      <button className="btn p" onClick={exportTrack}>خروجی اکسل ریز تردد</button>
    </div>}
    {trkInfo&&<p style={{fontSize:13,color:"var(--ink)",margin:"4px 0"}}>{trkInfo.name?`کاربر: ${trkInfo.name} — `:""}تعداد نقاط مسیر: {fa(trkInfo.count||0)}{mode==="track"?" (به‌روزرسانی زنده)":""}</p>}
    <div id="map" ref={ref} style={{height:"52vh",minHeight:340,borderRadius:14}}></div>
    {(viewTab==="main"||viewTab==="live")&&<div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11.5,color:"var(--muted)",padding:"8px 4px 0"}}>
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:"50%",background:"#16a06a",display:"inline-block"}}></span> آنلاین (GPS)</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{background:"#d97706",color:"#fff",borderRadius:6,padding:"0 4px",fontWeight:700}}>📶</span> موقعیت حدودی از آنتن GSM (GPS خاموش)</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{background:"#dc2626",color:"#fff",borderRadius:4,padding:"0 4px",fontWeight:700,fontSize:9}}>VPN</span> فیلترشکن روشن</span>
    </div>}
    {mode==="report"&&trkPts&&<div style={{marginTop:12}}>
      <PlaybackControls trkPts={trkPts} pbIdx={pbIdx} setPbIdx={setPbIdx} pbPlaying={pbPlaying} setPbPlaying={setPbPlaying} pbSpeed={pbSpeed} setPbSpeed={setPbSpeed} mapRef={mapRef} pbMarkerRef={pbMarkerRef} pbIvRef={pbIvRef}/>
      <h4 style={{margin:"6px 0"}}>ریز نقاط تردد ({fa((trkPts||[]).length)} نقطه)</h4>
      {trkPts.length? <div style={{maxHeight:"40vh",overflow:"auto"}}>
        <table><thead><tr><th>ردیف</th><th>تاریخ/ساعت</th><th>ایستگاه / فاصله تا نزدیک‌ترین خط</th><th>خروج از ایستگاه</th><th>موقعیت جعلی</th><th>نشان</th></tr></thead>
        <tbody>{trkPts.map((p,i)=>{ const ex=exitNearTime(p.captured_at); return(<tr key={i} style={ex?{background:"#fff5f5"}:null}>
          <td>{fa(i+1)}</td><td>{fj(p.captured_at)}</td><td>{stationOf(+p.lat,+p.lng)}</td>
          <td>{ex?<span className="badge b-no">{ex}</span>:"—"}</td>
          <td>{p.mocked?<span className="badge b-no">بله</span>:<span className="badge b-ok">خیر</span>}</td>
          <td><a href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" rel="noopener" className="btn g" style={{textDecoration:"none"}}>نشان روی نقشه</a></td>
        </tr>); })}</tbody></table></div>
        :<p className="muted">در این بازه نقطه‌ای ثبت نشده است.</p>}
    </div>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>
      <span style={{color:"#16a06a"}}>●</span> آنلاین ·
      <span style={{color:"#8a93a6"}}> ●</span> آفلاین (آخرین موقعیت) · خط سبز = مسیر طی‌شده. فهرست هر ۱۵ ثانیه به‌روز می‌شود.</p>
    {viewTab==="main"&&<PresenceLists/>}
    {viewTab==="exits"&&<StationExits/>}
  </div>);
}

function Modal({title,onClose,children}){
  return(<div className="modal-bg" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><h3>{title}</h3>{children}</div></div>);
}

function Users(){
  const [usersTab,setUsersTab]=useState("users");
  const [users,setUsers]=useState([]); const [roles,setRoles]=useState([]); const [zones,setZones]=useState([]);
  const [edit,setEdit]=useState(null); const [lineModal,setLineModal]=useState(null); const [adding,setAdding]=useState(false);
  const [f,setF]=useState({q:"",role_id:"",zone_id:"",active:""}); const [pw,setPw]=useState("");
  const clean=o=>{const x={...o};Object.keys(x).forEach(k=>(x[k]===""||x[k]==null)&&delete x[k]);return x;};
  const reload=()=>db.users(clean(f)).then(us=>setUsers(us.map(u=>({...u,is_active:(u.is_active==1||u.is_active===true)})))).catch(()=>{});
  const pg=usePager(users,10);
  useEffect(()=>{reload(); db.roles().then(setRoles).catch(()=>{}); db.zones().then(setZones).catch(()=>{})},[]);
  const rt=id=>roles.find(r=>r.id===id)?.title||""; const zn=id=>zones.find(z=>z.id===id)?.name||"—";
  const defaultStars=(role)=>{ const r=String(role||""); if(r.includes("سربازرس"))return 4; if(r.includes("بازرس"))return 2; if(r.includes("ناظر خط")||r.includes("اپراتور"))return 1; return 0; };
  const starsForUser=(u)=>{ const n=(u.rank_stars!==null&&u.rank_stars!==undefined&&u.rank_stars!=="")?Math.max(0,Math.min(5,+u.rank_stars||0)):defaultStars(u.role_title||rt(u.role_id)); return n?"★".repeat(n):"—"; };
  const save=async u=>{ await db.updateUser(u.id,{first_name:u.first_name,last_name:u.last_name,email:u.email,role_id:u.role_id,zone_id:u.zone_id,is_active:u.is_active,allow_android:u.allow_android?1:0,allow_web:u.allow_web?1:0,security_exempt:u.security_exempt?1:0,phone:u.phone,national_code:u.national_code,marital_status:u.marital_status,address:u.address,children_count:u.children_count,presence_required:u.presence_required?1:0,seniority_start:u.seniority_start||null,can_send_sms:u.can_send_sms?1:0,can_be_substitute:u.can_be_substitute?1:0,can_welfare:u.can_welfare?1:0,can_cultural:u.can_cultural?1:0,can_manage_temp_drivers:u.can_manage_temp_drivers?1:0,personnel_code:u.personnel_code||null,birth_date:u.birth_date||null,rank_stars:(u.rank_stars===''||u.rank_stars==null)?null:Math.max(0,Math.min(5,+u.rank_stars||0))});
    if(pw){ await db.resetPassword(u.id,pw); } setEdit(null); setPw(""); reload(); };
  const add=async u=>{ const r=await db.createUser(u); setAdding(false); reload(); if(r&&r.sms_sent) alert("کاربر ساخته شد و نام کاربری/رمز عبور برای او پیامک شد."); };
  const revoke=async(id,type)=>{ if(confirm("شناسهٔ دستگاه ("+(type==='android'?'اندروید':'وب')+") حذف شود؟")){ await db.revokeDevice(id,type); reload(); } };
  const delUser=async u=>{ if(confirm('حذف کامل کاربر «'+u.first_name+' '+u.last_name+'»؟ برگشت‌ناپذیر است.')){ await db.deleteUser(u.id); reload(); } };
  const pickPhoto=async(u,file)=>{ if(!file)return; const data=await compressImage(file,512,0.6); await db.adminSetPhoto(u.id,data); setEdit(e=>e?{...e,photo:data}:e); reload(); };
  const pickSignature=async(u,file)=>{ if(!file)return; const data=await compressImage(file,500,0.7); await db.adminSetSignature(u.id,data); setEdit(e=>e?{...e,signature_data:data}:e); reload(); };
  const clearSignature=async(u)=>{ if(!confirm("امضای این کاربر حذف شود؟"))return; await db.adminSetSignature(u.id,""); setEdit(e=>e?{...e,signature_data:null}:e); reload(); };
  if(usersTab!=="users") return(<div className="panel">
    <h3>مدیریت کاربران</h3>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <button className={"btn "+(usersTab==="users"?"p":"g")} onClick={()=>setUsersTab("users")}>اطلاعات کاربران</button>
      <button className={"btn "+(usersTab==="vehicles"?"p":"g")} onClick={()=>setUsersTab("vehicles")}>خودرو و موتورسیکلت</button>
      <button className={"btn "+(usersTab==="checklist"?"p":"g")} onClick={()=>setUsersTab("checklist")}>چک‌لیست خودرو و موتورسیکلت</button>
    </div>
    {usersTab==="vehicles"?<PersonnelVehicleAssets/>:<PersonnelVehicleChecklist/>}
  </div>);
  return(<div className="panel"><h3>مدیریت کاربران <button className="btn p" onClick={()=>setAdding(true)}>+ افزودن کاربر</button> <button className="btn g" onClick={async()=>{ try{ const res=await fetch(db.usersExportUrl(),{headers:tok()}); if(!res.ok)throw new Error("خطا"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="اطلاعات_کامل_کاربران.xlsx"; a.click(); }catch(e){alert(e.message);} }}>⤓ خروجی کامل کاربران (Excel)</button></h3>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <button className="btn p">اطلاعات کاربران</button>
      <button className="btn g" onClick={()=>setUsersTab("vehicles")}>خودرو و موتورسیکلت</button>
      <button className="btn g" onClick={()=>setUsersTab("checklist")}>چک‌لیست خودرو و موتورسیکلت</button>
    </div>
    <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
      <input className="input" style={{maxWidth:170}} placeholder="نام یا کد ملی" value={f.q} onChange={e=>setF({...f,q:e.target.value})}/>
      <select className="input" style={{maxWidth:150}} value={f.role_id} onChange={e=>setF({...f,role_id:e.target.value})}><option value="">همهٔ سمت‌ها</option>{roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
      <select className="input" style={{maxWidth:150}} value={f.zone_id} onChange={e=>setF({...f,zone_id:e.target.value})}><option value="">همهٔ مناطق</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
      <select className="input" style={{maxWidth:120}} value={f.active} onChange={e=>setF({...f,active:e.target.value})}><option value="">همه</option><option value="1">فعال</option><option value="0">غیرفعال</option></select>
      <button className="btn p" onClick={reload}>اعمال فیلتر</button></div>
    <table><thead><tr><th></th><th>نام</th><th>کد ملی</th><th>سمت</th><th>درجه</th><th>ایمیل</th><th>تعهدات</th><th>دستگاه‌ها</th><th>وضعیت</th><th>اقدامات</th></tr></thead>
    <tbody>{pg.slice.map(u=><tr key={u.id}>
      <td>{u.photo?<img src={u.photo} style={{width:34,height:34,borderRadius:8,objectFit:"cover"}}/>:<span className="pf2">{(u.first_name||"؟")[0]}</span>}</td>
      <td>{u.first_name} {u.last_name}</td><td style={{direction:"ltr",textAlign:"right"}}>{u.username||"—"}</td>
      <td>{u.role_title||rt(u.role_id)}</td><td style={{whiteSpace:"nowrap",color:"#b7791f",fontWeight:800}}>{starsForUser(u)}</td><td style={{direction:"ltr",textAlign:"right",fontSize:12}}>{u.email||"—"}</td>
      <td style={{textAlign:"center"}}>{(u.commitments_count>0)?<span className="badge" style={{background:"#fde7c9",color:"#b45309"}}>{fa(u.commitments_count)}</span>:<span style={{color:"var(--muted)"}}>۰</span>}</td>
      <td style={{fontSize:11}}>{u.android_bound?"📱":"—"} {u.web_bound?"🖥":""}</td>
      <td><span className={"badge "+(u.is_active?"b-ok":"b-no")}>{u.is_active?"فعال":"غیرفعال"}</span></td>
      <td><div className="row" style={{gap:6,flexWrap:"wrap"}}>
        <button className="btn g" onClick={()=>{setEdit({...u,allow_android:u.allow_android==1,allow_web:u.allow_web==1,security_exempt:u.security_exempt==1,presence_required:u.presence_required==1,can_send_sms:u.can_send_sms==1,can_be_substitute:u.can_be_substitute==1,can_welfare:u.can_welfare==1,can_cultural:u.can_cultural==1,can_manage_temp_drivers:u.can_manage_temp_drivers==1,birth_iso:u.birth_date?isoFromJ(...String(u.birth_date).replace(/[\/.]/g,"-").split("-").map(Number)):""});setPw("");}}>ویرایش</button>
        <button className="btn g" onClick={()=>setLineModal(u)}>خطوط</button>
        <button className="btn g" style={{color:'var(--danger)'}} onClick={()=>delUser(u)}>حذف</button></div></td></tr>)}</tbody></table>
    {pg.Pager()}
    {edit&&<Modal title="ویرایش کاربر" onClose={()=>{setEdit(null);setPw("");}}>
      <div className="row" style={{gap:10,alignItems:"center"}}>
        {edit.photo?<img src={edit.photo} style={{width:60,height:60,borderRadius:12,objectFit:"cover"}}/>:<span className="pf2" style={{width:60,height:60,fontSize:24}}>{(edit.first_name||"؟")[0]}</span>}
        <label className="btn g" style={{cursor:"pointer"}}>تغییر عکس<input type="file" accept="image/*" hidden onChange={e=>pickPhoto(edit,e.target.files[0])}/></label></div>
      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line)"}}>
        <label className="label">امضای پرسنلی</label>
        <div className="row" style={{gap:10,alignItems:"center",marginTop:4}}>
          {edit.signature_data?<img src={edit.signature_data} style={{width:120,height:60,borderRadius:8,objectFit:"contain",background:"#fff",border:"1px solid var(--line)"}}/>:<span className="muted" style={{fontSize:12}}>کاربر هنوز امضایی در برنامه ثبت نکرده است.</span>}
          <label className="btn g" style={{cursor:"pointer"}}>{edit.signature_data?"تغییر امضا":"افزودن امضا"}<input type="file" accept="image/*" hidden onChange={e=>pickSignature(edit,e.target.files[0])}/></label>
          {edit.signature_data&&<button type="button" className="btn g" style={{color:"var(--danger)"}} onClick={()=>clearSignature(edit)}>حذف امضا</button>}
        </div>
        <p className="muted" style={{fontSize:11,marginTop:4}}>این امضا همان تصویری است که کاربر داخل برنامه (بخش حساب کاربری) رسم و ذخیره می‌کند و در چاپ گزارش‌ها درج می‌شود؛ مدیر نیز می‌تواند در صورت نیاز آن را از همین‌جا تغییر یا حذف کند.</p>
      </div>
      <div className="row" style={{marginTop:10}}><div><label>نام</label><input className="input" value={edit.first_name||""} onChange={e=>setEdit({...edit,first_name:e.target.value})}/></div>
        <div><label>نام خانوادگی</label><input className="input" value={edit.last_name||""} onChange={e=>setEdit({...edit,last_name:e.target.value})}/></div></div>
      <label>ایمیل</label><input className="input" dir="ltr" value={edit.email||""} onChange={e=>setEdit({...edit,email:e.target.value})}/>
      <label>سمت</label><select className="input" value={edit.role_id||""} onChange={e=>setEdit({...edit,role_id:+e.target.value})}>{roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
      <label>منطقه</label><select className="input" value={edit.zone_id||""} onChange={e=>setEdit({...edit,zone_id:e.target.value?+e.target.value:null})}><option value="">بدون منطقه</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
      <div className="row" style={{marginTop:10,flexWrap:"wrap",gap:10}}>
        <div style={{flex:1,minWidth:140}}><label>تلفن همراه</label><input className="input" dir="ltr" value={edit.phone||""} onChange={e=>setEdit({...edit,phone:e.target.value})}/></div>
        <div style={{flex:1,minWidth:140}}><label>کد ملی</label><input className="input" dir="ltr" maxLength="10" value={edit.national_code||""} onChange={e=>setEdit({...edit,national_code:e.target.value})}/></div>
        <div style={{flex:1,minWidth:140}}><label>کد پرسنلی</label><input className="input" dir="ltr" value={edit.personnel_code||""} onChange={e=>setEdit({...edit,personnel_code:e.target.value})}/></div>
      </div>
      <div className="row" style={{marginTop:6,flexWrap:"wrap",gap:10}}>
        <div style={{flex:1,minWidth:140}}><label>وضعیت تأهل</label><select className="input" value={edit.marital_status||""} onChange={e=>setEdit({...edit,marital_status:e.target.value})}>
          <option value="">—</option><option value="مجرد">مجرد</option><option value="متاهل">متاهل</option></select></div>
        <div style={{flex:1,minWidth:140}}><label>تعداد فرزند</label><input className="input" type="number" min="0" value={edit.children_count??""} onChange={e=>setEdit({...edit,children_count:e.target.value===""?null:+e.target.value})}/></div>
        <div style={{flex:1,minWidth:170}}><label>تاریخ شروع سنوات</label><JDate value={edit.seniority_start||""} onChange={v=>setEdit({...edit,seniority_start:v})}/>{edit.seniority_start&&<span className="muted" style={{fontSize:11}}>{seniorityLabel(edit.seniority_start)}</span>}</div>
        <div style={{flex:1,minWidth:170}}><label>تاریخ تولد</label><JDate yearFrom={1320} yearTo={todayJ()[0]} value={edit.birth_iso||(edit.birth_date?isoFromJ(...String(edit.birth_date).replace(/[\/.]/g,"-").split("-").map(Number)):"")} onChange={v=>{ let bd=""; if(v){ const [y,m,d]=v.split("-").map(Number); const [jy,jm,jd]=gregToJalali(y,m,d); bd=`${jy}-${String(jm).padStart(2,"0")}-${String(jd).padStart(2,"0")}`; } setEdit({...edit,birth_iso:v,birth_date:bd}); }}/>{edit.birth_date&&<span className="muted" style={{fontSize:11}}>{String(edit.birth_date).replace(/-/g,"/")}</span>}</div>
      </div>
      <div style={{flex:1,minWidth:170}}><label>تعداد ستاره درجه</label><input className="input" type="number" min="0" max="5" value={edit.rank_stars??""} placeholder="خالی = پیش‌فرض سمت" onChange={e=>setEdit({...edit,rank_stars:e.target.value===""?null:Math.max(0,Math.min(5,+e.target.value||0))})}/><span className="muted" style={{fontSize:11}}>پیش‌فرض: ناظر/اپراتور ۱، بازرس ۲، سربازرس ۴</span></div>
      <LeaveBalance userId={edit.id}/>
      {(edit.device_model||edit.android_version)&&<div className="muted" style={{fontSize:11.5,marginTop:8}}>دستگاه: {edit.device_model||"—"} · {edit.android_version||""} · نسخهٔ برنامه: {edit.app_version||"—"}</div>}
      <PayrollEditor userId={edit.id} userName={`${edit.first_name||""} ${edit.last_name||""}`.trim()}/>
      <UserCustomValues userId={edit.id}/>
      <label>آدرس محل سکونت</label><textarea className="input" rows="2" value={edit.address||""} onChange={e=>setEdit({...edit,address:e.target.value})}/>
      <label>تغییر رمز عبور (خالی = بدون تغییر)</label><input className="input" type="text" value={pw} placeholder="رمز جدید" onChange={e=>setPw(e.target.value)}/>
      <div className="row" style={{gap:16,marginTop:12,flexWrap:"wrap"}}>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={edit.is_active} onChange={e=>setEdit({...edit,is_active:e.target.checked})}/>فعال</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={edit.allow_android} onChange={e=>setEdit({...edit,allow_android:e.target.checked})}/>ورود با اندروید</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={edit.allow_web} onChange={e=>setEdit({...edit,allow_web:e.target.checked})}/>ورود با وب</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.can_send_sms} onChange={e=>setEdit({...edit,can_send_sms:e.target.checked})}/>اجازهٔ ارسال پیامک</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.presence_required} onChange={e=>setEdit({...edit,presence_required:e.target.checked})}/>مشمول صحت‌سنجی حضور</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.can_be_substitute} onChange={e=>setEdit({...edit,can_be_substitute:e.target.checked})}/>می‌تواند نیروی جایگزین مرخصی باشد</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.can_welfare} onChange={e=>setEdit({...edit,can_welfare:e.target.checked})}/>دسترسی ثبت رفاهیات</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.can_cultural} onChange={e=>setEdit({...edit,can_cultural:e.target.checked})}/>دسترسی ثبت فعالیت فرهنگی</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.can_manage_temp_drivers} onChange={e=>setEdit({...edit,can_manage_temp_drivers:e.target.checked})}/>اجازهٔ مدیریت رانندگان موقت خطوط ویژه</label></div>
      <div style={{marginTop:12,padding:"10px 12px",background:"var(--warn-soft)",borderRadius:10,border:"1px solid #f0e2b8"}}>
        <label className="row" style={{gap:8,alignItems:"flex-start"}}><input type="checkbox" checked={!!edit.security_exempt} onChange={e=>setEdit({...edit,security_exempt:e.target.checked})}/>
          <span><b>معافیت امنیتی این کاربر</b><br/><small style={{color:"var(--muted)"}}>در صورت فعال‌بودن، این کاربر می‌تواند با وجود روشن‌بودن «حالت توسعه‌دهنده»، «موقعیت جعلی» و «VPN» وارد و از برنامه استفاده کند (محدودیت‌های امنیتی برای او اعمال نمی‌شود).</small></span></label></div>
      <div className="row" style={{gap:8,marginTop:12}}>
        <button className="btn g" onClick={()=>revoke(edit.id,'android')}>حذف دستگاه اندروید</button>
        <button className="btn g" onClick={()=>revoke(edit.id,'web')}>حذف نشست وب</button></div>
      <button className="btn p" style={{marginTop:14}} onClick={()=>save(edit)}>ذخیره</button></Modal>}
    {adding&&<AddUser roles={roles} zones={zones} onClose={()=>setAdding(false)} onSave={add}/>}
    {lineModal&&<LineAssign user={lineModal} onClose={()=>setLineModal(null)}/>}
  </div>);
}

function AddUser({roles,zones,onClose,onSave}){
  const [f,setF]=useState({first_name:"",last_name:"",username:"",email:"",role_id:roles[0]?.id||9,zone_id:null,password:"123456",allow_android:1,allow_web:1,birth_date:"",birth_iso:""});
  return(<Modal title="افزودن کاربر جدید" onClose={onClose}>
    <div className="row"><div><label>نام</label><input className="input" onChange={e=>setF({...f,first_name:e.target.value})}/></div>
      <div><label>نام خانوادگی</label><input className="input" onChange={e=>setF({...f,last_name:e.target.value})}/></div></div>
    <label>نام کاربری (کد ملی)</label><input className="input" dir="ltr" onChange={e=>setF({...f,username:e.target.value})}/>
    <label>ایمیل (اختیاری)</label><input className="input" dir="ltr" onChange={e=>setF({...f,email:e.target.value})}/>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:170}}><label>تاریخ تولد</label><JDate yearFrom={1320} yearTo={todayJ()[0]} value={f.birth_iso||""} onChange={v=>{ let bd=""; if(v){ const [y,m,d]=v.split("-").map(Number); const [jy,jm,jd]=gregToJalali(y,m,d); bd=`${jy}-${String(jm).padStart(2,"0")}-${String(jd).padStart(2,"0")}`; } setF({...f,birth_iso:v,birth_date:bd}); }}/>{f.birth_date&&<span className="muted" style={{fontSize:11}}>{String(f.birth_date).replace(/-/g,"/")}</span>}</div></div>
    <label>سمت</label><select className="input" value={f.role_id} onChange={e=>setF({...f,role_id:+e.target.value})}>{roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
    <label>منطقه</label><select className="input" onChange={e=>setF({...f,zone_id:e.target.value?+e.target.value:null})}><option value="">بدون منطقه</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
    <label>رمز اولیه</label><input className="input" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
    <div className="row" style={{gap:16,marginTop:10}}>
      <label className="row" style={{gap:6}}><input type="checkbox" checked={f.allow_android} onChange={e=>setF({...f,allow_android:e.target.checked?1:0})}/>اندروید</label>
      <label className="row" style={{gap:6}}><input type="checkbox" checked={f.allow_web} onChange={e=>setF({...f,allow_web:e.target.checked?1:0})}/>وب</label></div>
    <button className="btn p" style={{marginTop:12}} onClick={()=>onSave(f)}>ساخت کاربر</button></Modal>);
}

function LineAssign({user,onClose}){
  const [lines,setLines]=useState([]); const [sel,setSel]=useState([]); const [q,setQ]=useState("");
  useEffect(()=>{ db.lines().then(setLines).catch(()=>{}); db.userLines(user.id).then(ls=>setSel(ls.map(l=>l.id))).catch(()=>{}); },[]);
  const toggle=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const save=async()=>{ await db.assignLines(user.id,sel); onClose(); };
  const flt=lines.filter(l=>{ const s=(l.code+" "+(l.origin||"")+" "+(l.destination||"")); return !q||s.indexOf(q)>=0; });
  return(<Modal title={`خطوط مجاز — ${user.first_name} ${user.last_name}`} onClose={onClose}>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>خطوطی که این نیرو مجاز به فعالیت روی آنهاست را انتخاب کنید.</p>
    <input className="input" placeholder="جستجوی خط (کد یا مبدأ/مقصد)…" value={q} onChange={e=>setQ(e.target.value)} style={{marginBottom:8}}/>
    <div className="row" style={{justifyContent:"space-between",marginBottom:6}}>
      <button className="btn g" onClick={()=>setSel(flt.map(l=>l.id))}>انتخاب همهٔ نتایج</button>
      <button className="btn g" onClick={()=>setSel([])}>پاک‌کردن انتخاب‌ها</button>
      <span className="muted" style={{fontSize:12}}>{fa(sel.length)} خط انتخاب شده</span></div>
    <div style={{maxHeight:320,overflow:"auto"}}>{flt.map(l=>
      <label key={l.id} className="row" style={{justifyContent:"space-between",padding:"9px 11px",border:"1px solid var(--line)",borderRadius:11,marginBottom:7,cursor:"pointer"}}>
        <span style={{fontSize:13}}>خط {l.code} — {l.origin} به {l.destination}</span>
        <input type="checkbox" checked={sel.includes(l.id)} onChange={()=>toggle(l.id)}/></label>)}</div>
    <button className="btn p" style={{marginTop:12,width:"100%"}} onClick={save}>ذخیرهٔ خطوط ({fa(sel.length)})</button></Modal>);
}

function Zones(){
  const [users,setUsers]=useState([]); const [zones,setZones]=useState([]); const [over,setOver]=useState(null); const [nz,setNz]=useState("");
  useEffect(()=>{db.users().then(setUsers).catch(()=>{}); db.zones().then(setZones).catch(()=>{})},[]);
  const assign=async(uid,zid)=>{ setUsers(us=>us.map(u=>u.id===uid?{...u,zone_id:zid}:u)); await db.setOrg(uid,{zone_id:zid}); };
  const addZone=async()=>{ if(!nz)return; const z=await db.createZone(nz); setZones([...zones,z]); setNz(""); };
  const Card=u=><div className="card-p" key={u.id} draggable onDragStart={e=>e.dataTransfer.setData("uid",u.id)}>
    <span>{u.first_name} {u.last_name}</span><small>{u.role_title}</small></div>;
  const Col=(title,zid)=><div className={"col"+(over===zid?" over":"")} key={zid||"none"}
    onDragOver={e=>{e.preventDefault();setOver(zid)}} onDragLeave={()=>setOver(null)}
    onDrop={e=>{assign(+e.dataTransfer.getData("uid"),zid);setOver(null)}}>
    <h4>{title}</h4>{users.filter(u=>u.zone_id===zid).map(Card)}</div>;
  return(<div className="panel"><h3>منطقه‌بندی نیروها — کارت‌ها را در منطقهٔ موردنظر رها کنید
    <span className="row" style={{gap:8}}><input className="input" style={{padding:"6px 10px",width:160}} placeholder="نام منطقهٔ جدید" value={nz} onChange={e=>setNz(e.target.value)}/>
      <button className="btn p" onClick={addZone}>+ منطقه</button></span></h3>
    <div className="org">{Col("بدون منطقه",null)}{zones.map(z=>Col(z.name,z.id))}</div></div>);
}

function OrgChart(){
  const [data,setData]=useState({users:[],edges:[]});
  const [expanded,setExpanded]=useState(()=>new Set());
  const [zoom,setZoom]=useState(1); const [pan,setPan]=useState({x:30,y:25});
  const [dragPan,setDragPan]=useState(null); const [dragUser,setDragUser]=useState(null); const [over,setOver]=useState(null);
  const [multiUser,setMultiUser]=useState(null); const [query,setQuery]=useState(""); const [fitKey,setFitKey]=useState(0);
  const viewport=useRef(null);
  const lastCanvas=useRef({w:0,h:0});
  const reload=()=>db.orgChart().then(x=>setData({users:x.users||[],edges:x.edges||[]})).catch(()=>db.users().then(users=>setData({users,edges:users.filter(u=>u.manager_id).map(u=>({manager_id:+u.manager_id,user_id:+u.id,primary:1}))})));
  useEffect(()=>{reload()},[]);
  const users=data.users, edges=data.edges;
  const byId=Object.fromEntries(users.map(u=>[+u.id,u]));
  const parents=id=>edges.filter(e=>+e.user_id===+id).map(e=>+e.manager_id).filter(x=>byId[x]);
  const children=id=>[...new Set(edges.filter(e=>+e.manager_id===+id).map(e=>+e.user_id))].filter(x=>byId[x]);
  const naturalRoots=users.filter(u=>parents(u.id).length===0).map(u=>+u.id);
  // گراف سازمانی ممکن است چندوالدی، دارای چرخهٔ داده‌ای یا بخش‌های جداافتاده باشد.
  // برای جلوگیری از خالی‌شدن چارت، همهٔ مؤلفه‌ها یک ریشهٔ نمایشی امن دریافت می‌کنند.
  const roots=(()=>{
    const out=[...naturalRoots], seen=new Set(), q=[...naturalRoots];
    while(q.length){const id=q.shift();if(seen.has(id))continue;seen.add(id);children(id).forEach(c=>{if(!seen.has(c))q.push(c)});}
    users.forEach(u=>{const id=+u.id;if(!seen.has(id)){out.push(id);q.push(id);while(q.length){const x=q.shift();if(seen.has(x))continue;seen.add(x);children(x).forEach(c=>{if(!seen.has(c))q.push(c)});}}});
    return [...new Set(out)];
  })();
  const visible=(()=>{ const out=new Set(roots), q=[...roots]; while(q.length){const id=q.shift(); if(!expanded.has(id))continue; children(id).forEach(c=>{if(!out.has(c)){out.add(c);q.push(c)}})} return out; })();
  const filtered=query.trim()?new Set(users.filter(u=>((u.first_name||'')+' '+(u.last_name||'')+' '+(u.role_title||'')).includes(query.trim())).map(u=>+u.id)):null;
  if(filtered){ [...filtered].forEach(id=>{ let q=[id],seen=new Set(); while(q.length){let x=q.shift(); parents(x).forEach(p=>{if(!seen.has(p)){seen.add(p);filtered.add(p);q.push(p)}})} }); }
  const shown=[...visible].filter(id=>!filtered||filtered.has(id));
  // تعیین سطح با کوتاه‌ترین مسیر و فقط یک‌بار؛ چرخه‌ها دیگر باعث ارتفاع نجومی Canvas نمی‌شوند.
  const level={}; const q=roots.filter(id=>shown.includes(id)); q.forEach(id=>level[id]=0);
  while(q.length){const id=q.shift(); children(id).filter(c=>shown.includes(c)).forEach(c=>{if(level[c]===undefined){level[c]=(level[id]||0)+1;q.push(c)}})}
  shown.forEach(id=>{if(level[id]===undefined)level[id]=0});
  const groups={}; shown.forEach(id=>(groups[level[id]]||(groups[level[id]]=[])).push(id));
  Object.values(groups).forEach(a=>a.sort((a,b)=>((byId[a].role_title||'')+(byId[a].last_name||'')).localeCompare((byId[b].role_title||'')+(byId[b].last_name||''),'fa')));
  const cardW=205,cardH=104,gapX=30,gapY=62,pad=45,maxPerRow=8; const pos={};
  const levels=Object.keys(groups).map(Number).sort((a,b)=>a-b);
  const canvasW=Math.max(900,pad*2+maxPerRow*cardW+(maxPerRow-1)*gapX);
  let cursorY=pad;
  levels.forEach(l=>{
    const items=groups[l], rows=[]; for(let i=0;i<items.length;i+=maxPerRow)rows.push(items.slice(i,i+maxPerRow));
    rows.forEach(row=>{const w=row.length*cardW+(row.length-1)*gapX;row.forEach((id,i)=>pos[id]={x:(canvasW-w)/2+i*(cardW+gapX),y:cursorY});cursorY+=cardH+gapY;});
    cursorY+=18;
  });
  const canvasH=Math.max(420,cursorY+pad);
  const setMgr=async(uid,mid)=>{await db.setOrg(uid,{manager_id:mid||null});reload()};
  const onUserDrop=async(target)=>{const d=dragUser;setDragUser(null);setOver(null);if(!d||d.id===target.id)return; if(parents(target.id).includes(+d.id)){alert('این ارتباط باعث ایجاد چرخه می‌شود.');return;} await setMgr(d.id,target.id)};
  const centerAt=(z=zoom)=>{const el=viewport.current;if(!el)return;setPan({x:(el.clientWidth-canvasW*z)/2,y:Math.max(18,(el.clientHeight-canvasH*z)/2)});};
  const fit=()=>{const el=viewport.current;if(!el)return;const z=Math.min((el.clientWidth-36)/canvasW,(el.clientHeight-36)/canvasH,1.25);const nz=Math.max(.06,z);setZoom(nz);setPan({x:(el.clientWidth-canvasW*nz)/2,y:Math.max(18,(el.clientHeight-canvasH*nz)/2)});};
  const reset=()=>{setZoom(1);requestAnimationFrame(()=>centerAt(1))};
  const toggle=id=>setExpanded(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});
  useEffect(()=>{const el=viewport.current;if(!el)return;const prev=lastCanvas.current;if(prev.w&&prev.h&&(prev.w!==canvasW||prev.h!==canvasH)){setPan(p=>({x:p.x-(canvasW-prev.w)*zoom/2,y:p.y-(canvasH-prev.h)*zoom/2}));}lastCanvas.current={w:canvasW,h:canvasH};},[canvasW,canvasH]);
  const printChart=()=>{const node=document.querySelector('.org-canvas');if(!node)return;const w=window.open('','_org_print','width=1200,height=900');if(!w){alert('اجازهٔ باز شدن پنجره چاپ را فعال کنید.');return;}const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')].map(x=>x.outerHTML).join('');const html=node.outerHTML;w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>چاپ چارت سازمانی</title>${styles}<style>@page{size:A4 landscape;margin:5mm}html,body{width:287mm;height:200mm;margin:0;padding:0;overflow:hidden;background:#fff!important}.print-page{width:277mm;height:190mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-start}.title{text-align:center;font-size:15px;font-weight:bold;height:10mm;line-height:10mm}.chart-fit{width:277mm;height:180mm;position:relative;overflow:hidden;display:flex;align-items:flex-start;justify-content:center}.org-canvas{position:relative!important;margin:0!important;transform-origin:top center!important}.org-canvas button{display:none!important}</style></head><body><div class="print-page"><div class="title">چارت سازمانی نیروها</div><div class="chart-fit">${html}</div></div><script>window.onload=()=>setTimeout(()=>{const n=document.querySelector('.org-canvas'),box=document.querySelector('.chart-fit');if(n&&box){n.style.transform='none';const sw=Math.max(n.scrollWidth,n.offsetWidth,1),sh=Math.max(n.scrollHeight,n.offsetHeight,1);const sc=Math.min(box.clientWidth/sw,box.clientHeight/sh,1);n.style.transform='scale('+sc+')';n.style.transformOrigin='top center';n.style.flex='0 0 '+sw+'px';}setTimeout(()=>window.print(),250)},350)<\/script></body></html>`);w.document.close();};
  const expandAll=()=>{setExpanded(new Set(users.map(u=>+u.id)));setFitKey(k=>k+1)}; const collapseAll=()=>{setExpanded(new Set());setFitKey(k=>k+1)};
  useEffect(()=>{if(fitKey){const t=setTimeout(fit,40);return()=>clearTimeout(t)}},[fitKey,canvasW,canvasH]);
  useEffect(()=>{
    const el=viewport.current;if(!el)return;
    const wheel=e=>{
      e.preventDefault();
      const rect=el.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;
      setZoom(current=>{
        const nz=Math.max(.06,Math.min(2.2,current*(e.deltaY<0?1.1:.9)));
        setPan(p=>({x:mx-(mx-p.x)*(nz/current),y:my-(my-p.y)*(nz/current)}));
        return nz;
      });
    };
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[]);
  return(<div className="panel" style={{padding:0,overflow:"hidden"}}>
    <div style={{padding:"16px 18px 12px",borderBottom:"1px solid var(--line)",background:"linear-gradient(180deg,var(--card),rgba(13,122,95,.035))"}}>
      <div className="row" style={{justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><h3 style={{margin:0}}>چارت سازمانی نیروها</h3><p className="muted" style={{margin:"5px 0 0",fontSize:12}}>زیرمجموعه‌ها به‌صورت پیش‌فرض بسته‌اند. برای نمایش هر شاخه روی دکمهٔ + بزنید. خطوط چندگانه، تمام مسئولان بالادستی هر فرد را نشان می‌دهند.</p></div>
      <div className="row" style={{gap:6,flexWrap:"wrap"}}><button className="btn g" onClick={collapseAll}>بستن همه</button><button className="btn g" onClick={expandAll}>بازکردن همه</button><button className="btn g" onClick={fit}>جا دادن در صفحه</button><button className="btn g" onClick={()=>centerAt()}>مرکز کردن</button><button className="btn p" onClick={printChart}>🖨 چاپ چارت</button></div></div>
      <div className="row" style={{gap:8,marginTop:12,flexWrap:"wrap"}}>
        <input className="input" style={{maxWidth:280}} placeholder="جستجوی نام یا سمت…" value={query} onChange={e=>setQuery(e.target.value)}/>
        <button className="btn g" title="بزرگ‌نمایی" onClick={()=>setZoom(z=>Math.min(2.2,z+.15))}>＋</button><button className="btn g" title="کوچک‌نمایی" onClick={()=>setZoom(z=>Math.max(.06,z-.15))}>−</button><button className="btn g" onClick={reset}>۱۰۰٪</button>
        <span className="muted" style={{fontSize:12}}>بزرگ‌نمایی: {fa(Math.round(zoom*100))}٪ · {fa(shown.length)} نفر</span>
      </div>
    </div>
    <div ref={viewport} onMouseDown={e=>{if(e.target===e.currentTarget||e.target.closest('.org-canvas'))setDragPan({x:e.clientX-pan.x,y:e.clientY-pan.y})}} onMouseMove={e=>{if(dragPan)setPan({x:e.clientX-dragPan.x,y:e.clientY-dragPan.y})}} onMouseUp={()=>setDragPan(null)} onMouseLeave={()=>setDragPan(null)}
      style={{height:"calc(100vh - 245px)",minHeight:520,overflow:"hidden",position:"relative",cursor:dragPan?"grabbing":"grab",backgroundImage:"radial-gradient(var(--line) 1px, transparent 1px)",backgroundSize:"22px 22px",userSelect:"none"}}>
      <div className="org-canvas" style={{position:"absolute",width:canvasW,height:canvasH,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,transformOrigin:"0 0"}}>
        <svg width={canvasW} height={canvasH} style={{position:"absolute",inset:0,overflow:"visible",pointerEvents:"none"}}>
          <defs><marker id="orgArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--brand)"/></marker></defs>
          {edges.filter(e=>pos[+e.manager_id]&&pos[+e.user_id]).map((e,i)=>{const a=pos[+e.manager_id],b=pos[+e.user_id],x1=a.x+cardW/2,y1=a.y+cardH,x2=b.x+cardW/2,y2=b.y,mid=(y1+y2)/2;return <path key={i} d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`} fill="none" stroke={e.primary?"var(--brand)":"var(--muted)"} strokeWidth={e.primary?2.4:1.7} strokeDasharray={e.primary?"":"6 5"} opacity={.8} markerEnd="url(#orgArrow)"/>})}
        </svg>
        {shown.map(id=>{const u=byId[id],p=pos[id],kids=children(id),isOpen=expanded.has(id),parentCount=parents(id).length;return <div key={id} draggable onDragStart={e=>{e.stopPropagation();setDragUser(u)}} onDragOver={e=>{e.preventDefault();e.stopPropagation();setOver(id)}} onDragLeave={()=>setOver(null)} onDrop={e=>{e.preventDefault();e.stopPropagation();onUserDrop(u)}}
          style={{position:"absolute",left:p.x,top:p.y,width:cardW,height:cardH,border:`${over===id?2:1}px solid ${over===id?'var(--brand)':'var(--line)'}`,borderRadius:16,background:"var(--card)",boxShadow:"0 6px 18px rgba(15,27,45,.10)",padding:"11px 12px",cursor:"grab",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div className="row" style={{gap:8,alignItems:"flex-start"}}><div style={{width:38,height:38,borderRadius:12,background:"var(--brand-soft)",display:"grid",placeItems:"center",fontWeight:800,color:"var(--brand)"}}>{(u.first_name||'?').charAt(0)}</div><div style={{minWidth:0,flex:1}}><b style={{display:"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.first_name} {u.last_name}</b><small className="muted" style={{display:"block",marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.role_title||'بدون سمت'}</small></div>
          {kids.length>0&&<button className="btn g" onClick={e=>{e.stopPropagation();toggle(id)}} style={{padding:0,width:28,height:28,borderRadius:9,fontSize:18,lineHeight:1}} title={isOpen?'بستن زیرمجموعه‌ها':'نمایش زیرمجموعه‌ها'}>{isOpen?'−':'+'}</button>}</div>
          <div className="row" style={{justifyContent:"space-between",gap:5}}><span className="muted" style={{fontSize:10.5}}>{kids.length?fa(kids.length)+' زیرمجموعه':'بدون زیرمجموعه'}{parentCount>1?' · '+fa(parentCount)+' مسئول':''}</span><button className="btn g" style={{padding:"3px 7px",fontSize:10.5}} onClick={e=>{e.stopPropagation();setMultiUser(u)}}>تنظیم ارتباط‌ها</button></div>
        </div>})}
      </div>
      {!shown.length&&<div style={{position:"absolute",inset:0,display:"grid",placeItems:"center"}}><div className="muted">نتیجه‌ای برای نمایش وجود ندارد.</div></div>}
    </div>
    {multiUser&&<ManagersEditor user={multiUser} users={users} onClose={()=>{setMultiUser(null);reload();}}/>}
  </div>);
}

// ویرایش چند مقام بالاسری برای یک نیرو
function ManagersEditor({user,users,onClose}){
  const [sel,setSel]=useState([]); const [q,setQ]=useState("");
  useEffect(()=>{ db.userManagers(user.id).then(ids=>setSel(ids||[])).catch(()=>{}); },[]);
  const toggle=(id)=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const save=async()=>{ await db.setUserManagers(user.id, sel); alert("مقام‌های بالاسری ذخیره شد."); onClose(); };
  const cand=users.filter(m=>m.id!==user.id && (!q.trim() || (m.first_name+" "+m.last_name).includes(q.trim()) || (m.role_title||"").includes(q.trim())));
  return(<Modal title={`مقام‌های بالاسری — ${user.first_name} ${user.last_name}`} onClose={onClose}>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>یک نیرو می‌تواند چند مقام بالاسری داشته باشد (مثلاً یک ناظر خط زیر نظر دو یا سه بازرس). گزارش‌های این فرد برای همهٔ مقام‌های انتخاب‌شده ارسال/ارجاع می‌شود.</p>
    <input className="input" placeholder="جستجوی نام یا سمت…" value={q} onChange={e=>setQ(e.target.value)} style={{marginBottom:8}}/>
    <div style={{maxHeight:300,overflow:"auto",border:"1px solid var(--line)",borderRadius:10}}>
      {cand.map(m=><label key={m.id} className="row" style={{gap:8,padding:"8px 12px",borderBottom:"1px solid var(--line)",cursor:"pointer"}}>
        <input type="checkbox" checked={sel.includes(m.id)} onChange={()=>toggle(m.id)}/>
        <span style={{flex:1}}>{m.first_name} {m.last_name}</span><span className="muted" style={{fontSize:11}}>{m.role_title}</span>
      </label>)}
    </div>
    <button className="btn p" style={{marginTop:12,width:"100%"}} onClick={save}>ذخیرهٔ مقام‌های بالاسری ({fa(sel.length)})</button>
  </Modal>);
}

// تاریخچهٔ پیامک‌های یک راننده (در جزئیات راننده)
function DriverCultural({nid}){
  const [list,setList]=useState(null);
  useEffect(()=>{ if(nid) GET("/admin/driver-cultural?national_id="+nid).then(setList).catch(()=>setList([])); },[nid]);
  if(list===null)return <p className="muted">در حال بارگذاری…</p>;
  if(!list.length)return <p className="muted">فعالیت فرهنگی ثبت نشده است.</p>;
  return <div>{list.map((c,i)=><div key={i} className="card-p" style={{display:"flex",justifyContent:"space-between",gap:8}}>
    <span><b>{c.type_title}</b>{c.place_title?(" — "+c.place_title):(c.location?(" — "+c.location):"")}{c.hours?(" · "+fa(c.hours)+" ساعت"):""}{c.note?(" — "+c.note):""}</span>
    <span style={{fontSize:11.5,color:"var(--muted)",whiteSpace:"nowrap"}}>{fa(c.activity_jdate)}{c.recorded_by_name?(" · "+c.recorded_by_name):""}</span>
  </div>)}</div>;
}

function DriverWelfare({nid}){
  const [list,setList]=useState(null);
  useEffect(()=>{ if(nid) GET("/admin/driver-welfare?national_id="+nid).then(setList).catch(()=>setList([])); },[nid]);
  if(list===null)return <p className="muted">در حال بارگذاری…</p>;
  if(!list.length)return <p className="muted">رفاهیتی ثبت نشده است.</p>;
  return <div>{list.map((w,i)=><div key={i} className="card-p" style={{display:"flex",justifyContent:"space-between",gap:8}}>
    <span><b>{w.item_title}</b>{w.count>1?(" × "+fa(w.count)):""}{w.place_title?(" — "+w.place_title):""}{w.note?(" — "+w.note):""}</span>
    <span style={{fontSize:11.5,color:"var(--muted)",whiteSpace:"nowrap"}}>{fa(w.granted_jdate)}{w.granted_by_name?(" · "+w.granted_by_name):""}</span>
  </div>)}</div>;
}

function DriverSmsHistory({driverId}){
  const [rows,setRows]=useState(null);
  useEffect(()=>{ if(driverId) db.driverSms(driverId).then(setRows).catch(()=>setRows([])); },[driverId]);
  if(rows===null) return <p className="muted">در حال بارگذاری…</p>;
  if(!rows.length) return <p className="muted">پیامکی برای این راننده ثبت نشده است.</p>;
  const dlv=(c)=>c==1?["تحویل شد","b-ok"]:c==2?["تحویل نشد","b-no"]:c==null?["—","b-pending"]:["در صف","b-pending"];
  return <div>{rows.map(s=>{ const d=dlv(s.delivery_code); return(
    <div key={s.id} className="card-p" style={{marginBottom:6}}>
      <div className="row" style={{justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
        <span style={{fontSize:11,color:"var(--muted)"}}>{fj(s.created_at)} {s.sender?("· "+s.sender):""}</span>
        <span className={"badge "+d[1]} style={{fontSize:10}}>{d[0]}</span>
      </div>
      <div style={{fontSize:12.5,marginTop:4}}>{s.body}</div>
    </div>); })}</div>;
}

function Drivers(){
  const [data,setData]=useState({rows:[],total:0,page:1,pages:1});
  const [f,setF]=useState({q:"",line:"",model:"",gender:"",driver_type:""}); const [page,setPage]=useState(1); const [per,setPer]=useState(10);
  const [full,setFull]=useState(null); const [edit,setEdit]=useState(null);
  const clean=o=>{const x={...o};Object.keys(x).forEach(k=>!x[k]&&delete x[k]);return x;};
  const norm=d=>Array.isArray(d)?{rows:d,total:d.length,page:1,pages:1}:(d&&Array.isArray(d.rows)?d:{rows:[],total:0,page:1,pages:1});
  const load=(pg=1)=>{ db.drivers({...clean(f),page:pg,per}).then(d=>{const n=norm(d);setData(n);setPage(n.page);}).catch(()=>setData({rows:[],total:0,page:1,pages:1})); };
  useEffect(()=>{load(1)},[]);
  const exportXlsx=async()=>{ const d=await db.drivers({...clean(f),per:10000,page:1}); const rows=norm(d).rows;
    const ws=XLSX.utils.json_to_sheet(rows.map(r=>({'کد ملی':r.national_id,'نام':r.first_name,'نام خانوادگی':r.last_name,'موبایل':r.mobile,'جنسیت':r.gender,'نوع راننده':r.driver_type,'پروانه تاکسیرانی':r.taxi_lic_status,'پروانه بهره‌برداری':r.op_lic_status})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'رانندگان'); XLSX.writeFile(wb,'drivers.xlsx'); };
  const showFull=async id=>{ setFull({loading:true}); try{ setFull(await db.driverFull(id)); }catch(e){ setFull(null); alert(e.message);} };
  const del=async x=>{ if(confirm('حذف راننده «'+x.first_name+' '+x.last_name+'»؟')){ await db.deleteDriver(x.id); load(page); } };
  const saveEdit=async()=>{ await db.updateDriver(edit.id,edit); setEdit(null); load(page); };
  return(<div className="panel"><h3>رانندگان و خودروها <button className="btn p" onClick={exportXlsx}>⬇ خروجی اکسل</button></h3>
    <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
      <input className="input" style={{maxWidth:170}} placeholder="کد ملی یا نام" value={f.q} onChange={e=>setF({...f,q:e.target.value})}/>
      <input className="input" style={{maxWidth:110}} placeholder="کد خط" value={f.line} onChange={e=>setF({...f,line:e.target.value})}/>
      <input className="input" style={{maxWidth:140}} placeholder="مدل خودرو" value={f.model} onChange={e=>setF({...f,model:e.target.value})}/>
      <select className="input" style={{maxWidth:110}} value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option value="">جنسیت</option><option>مرد</option><option>زن</option></select>
      <input className="input" style={{maxWidth:130}} placeholder="نوع راننده" value={f.driver_type} onChange={e=>setF({...f,driver_type:e.target.value})}/>
      <button className="btn p" onClick={()=>load(1)}>اعمال فیلتر</button></div>
    <p className="muted" style={{marginBottom:8}}>مجموع: {fa(data.total)} راننده</p>
    <table><thead><tr><th>کد ملی</th><th>نام</th><th>موبایل</th><th>جنسیت</th><th>پروانه بهره‌برداری</th><th>اقدامات</th></tr></thead>
    <tbody>{data.rows.map(x=><tr key={x.id}>
      <td style={{direction:"ltr",textAlign:"right"}}>{x.national_id}</td><td>{x.first_name} {x.last_name}</td>
      <td style={{direction:"ltr",textAlign:"right"}}>{x.mobile}</td><td>{x.gender}</td>
      <td><span className={"badge "+(x.op_lic_status==="فعال"?"b-ok":"b-no")}>{x.op_lic_status||"—"}</span></td>
      <td><div className="row" style={{gap:6,flexWrap:"wrap"}}>
        <button className="btn g" onClick={()=>showFull(x.id)}>اطلاعات کامل</button>
        <button className="btn g" onClick={()=>setEdit({...x})}>ویرایش</button>
        <button className="btn g" style={{color:'var(--danger)'}} onClick={()=>del(x)}>حذف</button></div></td></tr>)}</tbody></table>
    <div className="row" style={{gap:8,justifyContent:"center",alignItems:"center",marginTop:12}}>
      <button className="btn g" disabled={page<=1} onClick={()=>load(page-1)}>قبلی</button>
      <span style={{alignSelf:"center"}}>صفحهٔ {fa(data.page)} از {fa(data.pages||1)}</span>
      <button className="btn g" disabled={page>=data.pages} onClick={()=>load(page+1)}>بعدی</button>
      <span style={{color:"var(--muted)",fontSize:12}}>تعداد در صفحه:</span>
      <select className="input" style={{maxWidth:80}} value={per} onChange={e=>{setPer(+e.target.value);setTimeout(()=>load(1),0);}}>
        <option value={10}>۱۰</option><option value={25}>۲۵</option><option value={50}>۵۰</option><option value={100}>۱۰۰</option></select></div>
    {full&&<Modal title="اطلاعات کامل راننده" onClose={()=>setFull(null)}>
      {full.loading?<p className="muted">در حال بارگذاری…</p>:<div>
        <p><b>{full.first_name} {full.last_name}</b> — کد ملی {full.national_id}</p>
        <p className="muted">موبایل: {full.mobile||"—"} · جنسیت: {full.gender||"—"} · نوع: {full.driver_type||"—"}</p>
        <h4 style={{marginTop:12}}>خودروها</h4>{(full.vehicles||[]).map((v,i)=><div key={i} className="card-p">{v.plate} — {v.model_name||""} {v.model_year||""} {v.line_code?("/ خط "+v.line_code):""}</div>)}
        <h4 style={{marginTop:12}}>تذکرات</h4>{(full.notices||[]).length?full.notices.map((n,i)=><div key={i} className="card-p">{fj(n.created_at)} — {n.reason||""} ({n.priority})</div>):<p className="muted">—</p>}
        <h4 style={{marginTop:12}}>بدهی‌ها</h4>{(full.bills||[]).length?full.bills.map((bb,i)=><div key={i} className="card-p">{fa(Number(bb.amount||0).toLocaleString('en-US'))} ریال — {bb.status}</div>):<p className="muted">—</p>}
        <h4 style={{marginTop:12}}>چک‌لیست‌ها</h4>{(full.checklists||[]).length?full.checklists.map((c,i)=><div key={i} className="card-p">{fj(c.created_at)}{c.photo?<a href="#" onClick={(e)=>{e.preventDefault();openMediaUrl(c.photo);}} style={{marginInlineStart:8}}>مشاهدهٔ عکس</a>:""}</div>):<p className="muted">—</p>}
        <h4 style={{marginTop:12}}>تاریخچهٔ پیامک‌ها</h4><DriverSmsHistory driverId={full.id}/>
        <h4 style={{marginTop:12}}>🎁 رفاهیات دریافت‌شده</h4><DriverWelfare nid={full.national_id}/>
        <h4 style={{marginTop:12}}>🎭 فعالیت‌های فرهنگی</h4><DriverCultural nid={full.national_id}/>
      </div>}</Modal>}
    {edit&&<Modal title="ویرایش راننده" onClose={()=>setEdit(null)}>
      <div className="row"><div><label>نام</label><input className="input" value={edit.first_name||""} onChange={e=>setEdit({...edit,first_name:e.target.value})}/></div>
        <div><label>نام خانوادگی</label><input className="input" value={edit.last_name||""} onChange={e=>setEdit({...edit,last_name:e.target.value})}/></div></div>
      <label>موبایل</label><input className="input" value={edit.mobile||""} onChange={e=>setEdit({...edit,mobile:e.target.value})}/>
      <label>جنسیت</label><select className="input" value={edit.gender||""} onChange={e=>setEdit({...edit,gender:e.target.value})}><option value="">—</option><option>مرد</option><option>زن</option></select>
      <button className="btn p" style={{marginTop:12}} onClick={saveEdit}>ذخیره</button></Modal>}
  </div>);
}

function Bills(){
  const [data,setData]=useState({rows:[],total:0,page:1,per:25,pages:1});
  const [q,setQ]=useState(""); const [loading,setLoading]=useState(true);
  const load=(search,page)=>{ setLoading(true);
    const params=new URLSearchParams();
    if(search) params.set('q',search);
    params.set('page',page||1); params.set('per',25);
    GET('/admin/bills?'+params.toString())
      .then(r=>{ setData(r&&r.rows?r:{rows:[],total:0,page:1,per:25,pages:1}); setLoading(false); })
      .catch(()=>{ setData({rows:[],total:0,page:1,per:25,pages:1}); setLoading(false); });
  };
  useEffect(()=>{ load("",1); },[]);
  const b=data.rows||[];
  return(<div className="panel"><h3>آبونمان و فیش‌ها</h3>
    <div className="row" style={{gap:8,marginBottom:10,flexWrap:"wrap"}}>
      <input className="input" style={{maxWidth:260}} placeholder="جستجو: نام، کد ملی، پلاک یا شناسه قبض" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(q,1)}/>
      <button className="btn p" onClick={()=>load(q,1)}>جستجو</button>
      <button className="btn g" onClick={()=>{ setQ(""); load("",1); }}>همه</button>
      <button className="btn g" style={{background:"#fff0e6",color:"#c2410c"}} onClick={async()=>{ if(!confirm("ردیف‌های خالی و خراب فیش‌ها حذف شوند؟"))return; try{ const r=await SEND("POST","/admin/bills-cleanup",{}); alert("\u2713 "+fa(r.deleted)+" \u0631\u062f\u06cc\u0641 \u062e\u0627\u0644\u06cc \u062d\u0630\u0641 \u0634\u062f."); load(q,1); }catch(e){ alert(e.message||"\u062e\u0637\u0627"); } }}>🧹 پاکسازی ردیف‌های خالی</button>
    </div>
    {loading?<p className="muted">در حال بارگذاری…</p>:b.length===0?<p className="muted">نتیجه‌ای یافت نشد.</p>:<>
    <p className="muted" style={{marginBottom:8}}>مجموع <b>{fa(data.total)}</b> فیش · صفحهٔ {fa(data.page)} از {fa(data.pages)}</p>
    <table><thead><tr><th>شخص / راننده</th><th>کد ملی</th><th>پلاک</th><th>خط</th><th>مبلغ (ریال)</th><th>وضعیت</th><th>تاریخ</th><th>دلیل</th></tr></thead>
    <tbody>{b.map(x=><tr key={x.id}>
      <td><div>{x.person_title}</div>{x.driver_name&&x.driver_name.trim()&&<div className="muted" style={{fontSize:11}}>{x.driver_name}</div>}</td>
      <td style={{direction:"ltr",textAlign:"right"}}>{x.national_id}</td>
      <td>{x.plate}</td>
      <td style={{fontSize:11}}>{x.line_text||"\u2014"}</td>
      <td>{fa(x.amount)}</td>
      <td><span className={"badge "+(x.status==="پرداخت شده"?"b-ok":"b-no")}>{x.status}</span></td>
      <td style={{fontSize:11}}>{x.pay_date||"\u2014"}</td>
      <td style={{fontSize:11}}>{x.reason||"\u2014"}</td>
    </tr>)}</tbody></table>
    <div className="row" style={{gap:8,justifyContent:"center",alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
      <button className="btn g" disabled={data.page<=1} onClick={()=>load(q,data.page-1)}>قبلی</button>
      <span>صفحهٔ {fa(data.page)} از {fa(data.pages)} · مجموع {fa(data.total)}</span>
      <button className="btn g" disabled={data.page>=data.pages} onClick={()=>load(q,data.page+1)}>بعدی</button>
    </div></>}
  </div>);
}

function Config(){
  const [tab,setTab]=useState("define");
  const TABS=[["define","تعریف موضوعات و چک‌لیست"],["reportsubjects","موضوعات گزارش‌ها"],["notices","تذکرات داده‌شده"],["checklists","چک‌لیست‌های داده‌شده"]];
  return(<div>
    <div className="tabbar" style={{display:"flex",gap:8,marginBottom:14,borderBottom:"2px solid var(--line)",flexWrap:"wrap"}}>
      {TABS.map(([k,lbl])=>
        <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",borderBottom:tab===k?"3px solid var(--brand)":"3px solid transparent",padding:"8px 14px",cursor:"pointer",fontWeight:tab===k?800:500,color:tab===k?"var(--brand)":"var(--muted)",fontFamily:"inherit",fontSize:14}}>{lbl}</button>)}
    </div>
    {tab==="define"&&<ConfigDefine/>}
    {tab==="reportsubjects"&&<ReportSubjectsAdmin/>}
    {tab==="notices"&&<GivenNotices/>}
    {tab==="checklists"&&<GivenChecklists/>}
  </div>);
}

function ReportSubjectsAdmin(){
  const [rows,setRows]=useState([]); const [title,setTitle]=useState(""); const [busy,setBusy]=useState(false);
  const load=()=>db.reportSubjects().then(setRows).catch(e=>alert(e.message));
  useEffect(load,[]);
  const add=async()=>{const t=title.trim();if(!t)return;setBusy(true);try{await db.addReportSubject(t);setTitle("");load();}catch(e){alert(e.message)}finally{setBusy(false)}};
  const del=async(id)=>{if(!confirm("این موضوع غیرفعال شود؟"))return;try{await db.delReportSubject(id);load();}catch(e){alert(e.message)}};
  return <div className="panel"><h3>تعریف موضوعات گزارش‌ها</h3><p className="muted">این موضوعات در فرم ارسال گزارش نرم‌افزار نمایش داده می‌شوند. گزینه «سایر» همیشه برای درج موضوع دلخواه در دسترس است.</p>
    <div className="row" style={{gap:8}}><input className="input" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add()}} placeholder="عنوان موضوع جدید…"/><button className="btn p" disabled={busy} onClick={add}>افزودن</button></div>
    <div className="chiprow" style={{marginTop:12}}>{rows.filter(x=>x.is_active!==0).map(r=><span className="chip" key={r.id}>{r.title}<b onClick={()=>del(r.id)}>✕</b></span>)}</div>
    {!rows.filter(x=>x.is_active!==0).length&&<p className="muted">موضوعی تعریف نشده است.</p>}</div>;
}

function GivenFilters({f,setF,recorders,onApply,onClear}){
  const roles=[...new Set(recorders.map(r=>r.role_title).filter(Boolean))];
  const people=f.recorder_role?recorders.filter(r=>r.role_title===f.recorder_role):recorders;
  return(<div className="filters" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12,alignItems:"center"}}>
    <select className="input" style={{maxWidth:150,padding:"6px 10px"}} value={f.recorder_role||""} onChange={e=>setF({...f,recorder_role:e.target.value,recorder_id:""})}>
      <option value="">همهٔ سمت‌ها</option>{roles.map(r=><option key={r} value={r}>{r}</option>)}
    </select>
    <select className="input" style={{maxWidth:160,padding:"6px 10px"}} value={f.recorder_id||""} onChange={e=>setF({...f,recorder_id:e.target.value})}>
      <option value="">همهٔ افراد</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
    <input className="input" style={{maxWidth:130,padding:"6px 10px"}} placeholder="کد ملی راننده" value={f.national_id||""} onChange={e=>setF({...f,national_id:e.target.value})}/>
    <input className="input" style={{maxWidth:110,padding:"6px 10px"}} placeholder="خط" value={f.line||""} onChange={e=>setF({...f,line:e.target.value})}/>
    <span className="label">از</span><JDate value={f.from||""} onChange={v=>setF({...f,from:v})}/>
    <span className="label">تا</span><JDate value={f.to||""} onChange={v=>setF({...f,to:v})}/>
    <button className="btn p" onClick={onApply}>فیلتر</button>
    <button className="btn g" onClick={onClear}>پاک کردن</button>
  </div>);
}

function GivenNotices(){
  const [rows,setRows]=useState([]); const [recorders,setRecorders]=useState([]); const [f,setF]=useState({}); const [loading,setLoading]=useState(false);
  const qs=()=>{ const p=[]; ["recorder_role","recorder_id","national_id","line","from","to"].forEach(k=>{ if(f[k]) p.push(k+"="+encodeURIComponent(f[k])); }); return p.length?("?"+p.join("&")):""; };
  const load=()=>{ setLoading(true); GET("/admin/given-notices"+qs()).then(setRows).catch(()=>setRows([])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); GET("/admin/recorders").then(setRecorders).catch(()=>{}); },[]);
  const PR={low:"کم",medium:"متوسط",high:"زیاد"};
  const exportExcel=()=>{ const aoa=[["تاریخ","راننده","کد ملی","خط","موضوع","اولویت","متن","ثبت‌کننده","سمت ثبت‌کننده"],
    ...rows.map(r=>[fj(r.created_at),r.driver_name||"",r.national_id||"",r.line||"",r.reason||"",PR[r.priority]||r.priority,r.body||"",r.recorder_name||"",r.recorder_role||""])];
    const ws=XLSX.utils.aoa_to_sheet(aoa); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"تذکرات"); XLSX.writeFile(wb,"تذکرات_داده_شده.xlsx"); };
  return(<div className="panel"><h3>تذکرات داده‌شده</h3>
    <GivenFilters f={f} setF={setF} recorders={recorders} onApply={load} onClear={()=>{setF({});setTimeout(load,0);}}/>
    <div className="row" style={{justifyContent:"space-between",marginBottom:8}}>
      <span className="muted" style={{fontSize:12}}>{loading?"در حال بارگذاری…":fa(rows.length)+" تذکر"}</span>
      <button className="btn g" onClick={exportExcel} disabled={!rows.length}>⤓ خروجی اکسل</button>
    </div>
    <div style={{overflowX:"auto"}}><table style={{fontSize:12,minWidth:820}}><thead><tr><th>تاریخ</th><th>راننده</th><th>کد ملی</th><th>خط</th><th>موضوع</th><th>اولویت</th><th>متن</th><th>ثبت‌کننده</th><th>سمت</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><td>{fj(r.created_at)}</td><td>{r.driver_name||"—"}</td><td>{r.national_id||"—"}</td><td>{r.line||"—"}</td><td>{r.reason||"—"}</td><td>{PR[r.priority]||r.priority}</td><td style={{maxWidth:200,fontSize:11}}>{r.body||"—"}{r.has_attachment?" 📎":""}</td><td>{r.recorder_name||"—"}</td><td style={{fontSize:11}}>{r.recorder_role||"—"}</td></tr>)}
      {!rows.length&&!loading&&<tr><td colSpan="9" className="muted" style={{textAlign:"center"}}>تذکری یافت نشد</td></tr>}</tbody></table></div>
  </div>);
}

function GivenChecklists(){
  const [rows,setRows]=useState([]); const [recorders,setRecorders]=useState([]); const [f,setF]=useState({}); const [loading,setLoading]=useState(false);
  const qs=()=>{ const p=[]; ["recorder_role","recorder_id","national_id","line","from","to"].forEach(k=>{ if(f[k]) p.push(k+"="+encodeURIComponent(f[k])); }); return p.length?("?"+p.join("&")):""; };
  const load=()=>{ setLoading(true); GET("/admin/given-checklists"+qs()).then(setRows).catch(()=>setRows([])).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); GET("/admin/recorders").then(setRecorders).catch(()=>{}); },[]);
  const exportExcel=()=>{ const aoa=[["تاریخ","راننده","کد ملی","خط","چک‌لیست","پاسخ‌ها","ثبت‌کننده","سمت ثبت‌کننده"],
    ...rows.map(r=>[fj(r.created_at),r.driver_name||"",r.national_id||"",r.line||"",r.template_title||"",(r.answers_pretty||[]).map(a=>a.label+": "+a.value).join(" | "),r.recorder_name||"",r.recorder_role||""])];
    const ws=XLSX.utils.aoa_to_sheet(aoa); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"چک‌لیست‌ها"); XLSX.writeFile(wb,"چک_لیست_های_داده_شده.xlsx"); };
  return(<div className="panel"><h3>چک‌لیست‌های داده‌شده</h3>
    <GivenFilters f={f} setF={setF} recorders={recorders} onApply={load} onClear={()=>{setF({});setTimeout(load,0);}}/>
    <div className="row" style={{justifyContent:"space-between",marginBottom:8}}>
      <span className="muted" style={{fontSize:12}}>{loading?"در حال بارگذاری…":fa(rows.length)+" چک‌لیست"}</span>
      <button className="btn g" onClick={exportExcel} disabled={!rows.length}>⤓ خروجی اکسل</button>
    </div>
    <div style={{overflowX:"auto"}}><table style={{fontSize:12,minWidth:820}}><thead><tr><th>تاریخ</th><th>راننده</th><th>کد ملی</th><th>خط</th><th>چک‌لیست</th><th>پاسخ‌ها</th><th>ثبت‌کننده</th><th>سمت</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><td>{fj(r.created_at)}</td><td>{r.driver_name||"—"}</td><td>{r.national_id||"—"}</td><td>{r.line||"—"}</td><td>{r.template_title||"—"}</td>
        <td style={{maxWidth:260,fontSize:11}}>{(r.answers_pretty||[]).map((a,i)=><div key={i}><b>{a.label}:</b> {a.value}</div>)}</td>
        <td>{r.recorder_name||"—"}</td><td style={{fontSize:11}}>{r.recorder_role||"—"}</td></tr>)}
      {!rows.length&&!loading&&<tr><td colSpan="9" className="muted" style={{textAlign:"center"}}>چک‌لیستی یافت نشد</td></tr>}</tbody></table></div>
  </div>);
}

function ConfigDefine(){
  const [reasons,setReasons]=useState([]); const [items,setItems]=useState([]); const [nr,setNr]=useState(""); const [ni,setNi]=useState("");
  useEffect(()=>{db.noticeReasons().then(setReasons).catch(()=>{}); db.checklist().then(c=>setItems((c?.items||[]).map(i=>({...i,optStr:(i.options||[]).join("، "),answer_type:i.answer_type||"single"})))).catch(()=>{})},[]);
  const addR=async()=>{ if(!nr)return; const r=await db.addReason(nr); setReasons([...reasons,r]); setNr(""); };
  const delR=async id=>{ await db.delReason(id); setReasons(reasons.filter(r=>r.id!==id)); };
  const saveCl=async()=>{
    const payload=items.map(i=>({label:String(i.label||"").trim(), answer_type:i.answer_type||"single", options:(i.optStr||"").split(/[،,]/).map(s=>s.trim()).filter(Boolean)})).filter(i=>i.label);
    if(!payload.length){alert("حداقل یک آیتم چک‌لیست تعریف کنید.");return;}
    try{await db.saveChecklist("چک‌لیست بازدید خودرو", payload); alert("چک‌لیست ذخیره شد.");}
    catch(e){alert(e.message||"ذخیره چک‌لیست ناموفق بود.");}
  };
  return(<div className="grid2">
    <div className="panel"><h3>موضوعات تذکر</h3>
      <div className="row"><input className="input" value={nr} onChange={e=>setNr(e.target.value)} placeholder="موضوع جدید…"/>
        <button className="btn p" onClick={addR}>افزودن</button></div>
      <div className="chiprow">{reasons.map(r=><span className="chip" key={r.id}>{r.title}<b onClick={()=>delR(r.id)}>✕</b></span>)}</div></div>
    <div className="panel"><h3>آیتم‌های چک‌لیست خودرو</h3>
      <p className="muted" style={{marginBottom:8}}>برای هر آیتم می‌توانید پاسخ‌های دلخواه تعریف کنید (با کاما جدا کنید). اگر خالی بماند، پیش‌فرض «سالم/ایراد/ندارد» است.</p>
      <div className="row"><input className="input" value={ni} onChange={e=>setNi(e.target.value)} placeholder="عنوان آیتم جدید…"/>
        <button className="btn p" onClick={()=>{if(ni){setItems([...items,{id:Date.now(),label:ni,optStr:""}]);setNi("")}}}>افزودن</button></div>
      <div style={{marginTop:10}}>{items.map((it,i)=><div key={i} className="card-p" style={{display:"block"}}>
        <div className="between"><b>{it.label}</b><b style={{cursor:"pointer",color:"var(--danger)"}} onClick={()=>setItems(items.filter((_,j)=>j!==i))}>✕</b></div>
        <div className="row" style={{gap:8,marginTop:6,flexWrap:"wrap"}}>
          <select className="input" style={{maxWidth:170,fontSize:12}} value={it.answer_type||"single"} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,answer_type:e.target.value}:x))}>
            <option value="single">تک‌گزینه‌ای</option><option value="multi">چندگزینه‌ای</option><option value="text">پاسخ متنی</option></select>
          {it.answer_type!=="text"&&<input className="input" style={{flex:1,minWidth:160,fontSize:12}} placeholder="گزینه‌ها با کاما: عالی، خوب، ضعیف" value={it.optStr} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,optStr:e.target.value}:x))}/>}
        </div>
      </div>)}</div>
      <button className="btn p" style={{marginTop:12}} onClick={saveCl}>ذخیرهٔ چک‌لیست</button></div></div>);
}

function FormBuilder(){
  const DRIVER_ATTRS=[["","—"],["first_name","نام"],["last_name","نام خانوادگی"],["father_name","نام پدر"],["national_id","کد ملی"],["mobile","موبایل"],["gender","جنسیت"],["birth_date","تاریخ تولد"],["address","آدرس"],["smart_no","شماره هوشمند"],["operating_code","کد بهره‌برداری"],["op_lic_status","وضعیت پروانه بهره‌برداری"],["op_lic_issue","صدور بهره‌برداری"],["op_lic_expire","انقضای بهره‌برداری"],["taxi_lic_status","وضعیت پروانه تاکسیرانی"],["taxi_lic_issue","صدور تاکسیرانی"],["taxi_lic_expire","انقضای تاکسیرانی"],["driver_type","نوع راننده"],["plate","پلاک خودرو"],["model_name","مدل خودرو"],["model_year","سال خودرو"],["line_code","کد خط"],["insurance_expire","انقضای بیمه"],["tech_inspection_expire","انقضای معاینه فنی"]];
  const TYPES=[["text","متن"],["number","عدد"],["textarea","متن بلند"],["select","لیست کشویی"],["combobox","کمبوباکس"],["checkbox","بله/خیر"],["signature","امضا"],["national_id","کد ملی (فراخوان راننده)"]];
  const [fields,setFields]=useState([{key:"nid",label:"کد ملی راننده",type:"national_id",options:[],required:true,prefill:"",showIfKey:"",showIfVal:""}]);
  const [title,setTitle]=useState("فرم بازدید میدانی");
  const [editId,setEditId]=useState(null);
  const [list,setList]=useState([]); const [subsFor,setSubsFor]=useState(null);
  const loadList=()=>db.formsAll().then(r=>setList(r||[])).catch(()=>{});
  useEffect(()=>{loadList();},[]);
  const add=()=>setFields([...fields,{key:"f"+Date.now(),label:"فیلد جدید",type:"text",options:[],required:false,prefill:"",showIfKey:"",showIfVal:""}]);
  const upd=(i,k,val)=>setFields(fields.map((f,j)=>j===i?{...f,[k]:val}:f));
  const resetForm=()=>{ setEditId(null); setTitle("فرم جدید"); setFields([{key:"nid",label:"کد ملی راننده",type:"national_id",options:[],required:true,prefill:"",showIfKey:"",showIfVal:""}]); };
  const editForm=(f)=>{ setEditId(f.id); setTitle(f.title); setFields(Array.isArray(f.schema)&&f.schema.length?f.schema:[]); window.scrollTo(0,0); };
  const delForm=async(f)=>{ if(!confirm("حذف فرم «"+f.title+"» و همهٔ پاسخ‌های آن؟"))return; try{ await db.delForm(f.id); loadList(); if(editId===f.id)resetForm(); }catch(e){alert(e.message);} };
  const exportForm=async(f)=>{ try{ const res=await fetch(db.formExportUrl(f.id),{headers:tok()}); if(!res.ok)throw new Error("خطا"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="فرم_"+f.title+".csv"; a.click(); }catch(e){alert(e.message);} };
  const viewSubs=async(f)=>{ try{ const d=await db.formSubs(f.id); setSubsFor(d); }catch(e){alert(e.message);} };
  const save=async()=>{ try{ if(editId){ await db.updForm(editId,{title,schema:fields}); alert("فرم ویرایش شد."); } else { await SEND('POST','/admin/forms',{title,schema:fields}); alert("فرم ذخیره شد."); } loadList(); }catch(e){ alert(e.message); } };
  return(<div className="panel"><h3>فرم‌ساز حرفه‌ای {editId?<span style={{fontSize:13,color:"var(--brand)"}}>(ویرایش فرم #{fa(editId)})</span>:""} <button className="btn p" onClick={add}>+ افزودن فیلد</button> {editId&&<button className="btn g" onClick={resetForm}>فرم جدید</button>}</h3>
    <label className="label">عنوان فرم</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} style={{marginBottom:14}}/>
    {fields.map((f,i)=><div key={i} className="card-p" style={{display:"block"}}>
      <div className="row" style={{gap:8,flexWrap:"wrap"}}>
        <input className="input" style={{maxWidth:200}} value={f.label} onChange={e=>upd(i,"label",e.target.value)} placeholder="عنوان فیلد"/>
        <select className="input" style={{maxWidth:190}} value={f.type} onChange={e=>upd(i,"type",e.target.value)}>{TYPES.map(([v,tt])=><option key={v} value={v}>{tt}</option>)}</select>
        <label className="row" style={{gap:4,fontSize:12}}><input type="checkbox" checked={f.required} onChange={e=>upd(i,"required",e.target.checked)}/>اجباری</label>
        <button className="btn g" onClick={()=>setFields(fields.filter((_,j)=>j!==i))}>حذف</button>
      </div>
      {(f.type==="select"||f.type==="combobox")&&<input className="input" style={{marginTop:6,fontSize:12}} placeholder="گزینه‌ها با کاما: تایید، رد" value={(f.options||[]).join("، ")} onChange={e=>upd(i,"options",e.target.value.split(/[،,]/).map(s=>s.trim()).filter(Boolean))}/>}
      {f.type!=="national_id"&&f.type!=="signature"&&<div className="row" style={{gap:8,marginTop:6,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"var(--muted)"}}>فراخوان خودکار از اطلاعات راننده:</span>
        <select className="input" style={{maxWidth:200,fontSize:12}} value={f.prefill||""} onChange={e=>upd(i,"prefill",e.target.value)}>{DRIVER_ATTRS.map(([v,tt])=><option key={v} value={v}>{tt}</option>)}</select></div>}
      <div className="row" style={{gap:8,marginTop:6,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"var(--muted)"}}>نمایش مشروط: اگر فیلد</span>
        <select className="input" style={{maxWidth:150,fontSize:12}} value={f.showIfKey||""} onChange={e=>upd(i,"showIfKey",e.target.value)}><option value="">(همیشه نمایش)</option>{fields.filter(x=>x.key!==f.key).map(x=><option key={x.key} value={x.key}>{x.label}</option>)}</select>
        <span style={{fontSize:12}}>=</span>
        <input className="input" style={{maxWidth:110,fontSize:12}} value={f.showIfVal||""} onChange={e=>upd(i,"showIfVal",e.target.value)} placeholder="مقدار"/>
      </div>
    </div>)}
    <button className="btn p" style={{marginTop:10}} onClick={save}>{editId?"ذخیرهٔ ویرایش":"ذخیره فرم"}</button>
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>فیلد «کد ملی» در اپ یک دکمهٔ «فراخوان» می‌سازد که با کد ملی، فیلدهای دارای «فراخوان خودکار» را از اطلاعات راننده پر می‌کند.</p>
    <div style={{marginTop:20,paddingTop:16,borderTop:"2px solid var(--line)"}}>
      <h3 style={{marginTop:0}}>فرم‌های ساخته‌شده</h3>
      {list.length===0?<p className="muted">فرمی ساخته نشده است.</p>:
      <div style={{overflowX:"auto"}}><table style={{fontSize:12.5,minWidth:560}}><thead><tr><th>عنوان</th><th>فیلدها</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
        {list.map(f=><tr key={f.id}>
          <td><b>{f.title}</b></td><td>{fa((f.schema||[]).length)}</td>
          <td>{f.is_active?<span className="badge b-ok">فعال</span>:<span className="badge b-no">غیرفعال</span>}</td>
          <td style={{whiteSpace:"nowrap"}}>
            <button className="btn g" onClick={()=>editForm(f)}>ویرایش</button>{" "}
            <button className="btn g" onClick={()=>viewSubs(f)}>پاسخ‌ها</button>{" "}
            <button className="btn g" onClick={()=>exportForm(f)}>⤓ اکسل</button>{" "}
            <button className="btn g" onClick={()=>db.updForm(f.id,{is_active:f.is_active?0:1}).then(loadList)}>{f.is_active?"غیرفعال":"فعال"}</button>{" "}
            <button className="btn d" onClick={()=>delForm(f)}>حذف</button>
          </td>
        </tr>)}
      </tbody></table></div>}
    </div>
    {subsFor&&<Modal title={"پاسخ‌های فرم: "+subsFor.form.title} onClose={()=>setSubsFor(null)}>
      {subsFor.submissions.length===0?<p className="muted">پاسخی ثبت نشده است.</p>:
      <div style={{overflowX:"auto"}}><table style={{fontSize:11.5,minWidth:600}}><thead><tr><th>تاریخ</th><th>ثبت‌کننده</th><th>راننده</th>{(subsFor.form.schema||[]).map((c,i)=><th key={i}>{c.label}</th>)}</tr></thead><tbody>
        {subsFor.submissions.map(sb=><tr key={sb.id}><td style={{whiteSpace:"nowrap"}}>{fj(sb.created_at)}</td><td>{sb.by_name}</td><td>{(sb.driver_name||"").trim()||"—"}</td>
          {(subsFor.form.schema||[]).map((c,i)=>{ let val=sb.answers?(sb.answers[c.key]??sb.answers[c.label]??""):""; if(!val&&c.prefill){ const mp={first_name:"driver_first_name",last_name:"driver_last_name",mobile:"driver_mobile",gender:"driver_gender",line_code_in_line:"driver_line_code"}; val=sb[mp[c.prefill]||""]||""; } if(Array.isArray(val))val=val.join("، "); if(typeof val==="string"&&val.startsWith("data:image"))val="[تصویر]"; return <td key={i}>{val||"—"}</td>; })}
        </tr>)}
      </tbody></table></div>}
      <button className="btn p" style={{marginTop:10}} onClick={()=>exportForm(subsFor.form)}>⤓ خروجی اکسل</button>
    </Modal>}
    </div>);
}

function Cultural(){
  const [tab,setTab]=useState("add");
  const [types,setTypes]=useState([]);
  const [places,setPlaces]=useState([]);
  const [newType,setNewType]=useState({title:"",description:""});
  const [newPlace,setNewPlace]=useState({title:"",address:"",phone:""});
  // فرم ثبت
  const [nid,setNid]=useState("");
  const [driver,setDriver]=useState(null);
  const [typeId,setTypeId]=useState("");
  const [placeId,setPlaceId]=useState("");
  const [adate,setAdate]=useState(todayJStr());
  const [hours,setHours]=useState("");
  const [note,setNote]=useState("");
  const [msg,setMsg]=useState("");
  // گزارش
  const [rep,setRep]=useState(null);
  const [repType,setRepType]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");

  const loadTypes=()=>GET("/admin/cultural-types").then(setTypes).catch(()=>{});
  const loadPlaces=()=>GET("/admin/cultural-places").then(setPlaces).catch(()=>{});
  useEffect(()=>{loadTypes();loadPlaces();},[]);

  const saveType=async()=>{ if(!newType.title.trim())return; await SEND("POST","/admin/cultural-types",newType); setNewType({title:"",description:""}); loadTypes(); };
  const toggleType=async(it)=>{ await SEND("POST","/admin/cultural-types",{...it,is_active:it.is_active?0:1}); loadTypes(); };
  const delType=async(id)=>{ if(!confirm("حذف این نوع فعالیت؟"))return; await SEND("DELETE","/admin/cultural-types/"+id); loadTypes(); };
  const savePlace=async()=>{ if(!newPlace.title.trim())return; await SEND("POST","/admin/cultural-places",newPlace); setNewPlace({title:"",address:"",phone:""}); loadPlaces(); };
  const togglePlace=async(pl)=>{ await SEND("POST","/admin/cultural-places",{...pl,is_active:pl.is_active?0:1}); loadPlaces(); };
  const delPlace=async(id)=>{ if(!confirm("حذف این مکان؟"))return; await SEND("DELETE","/admin/cultural-places/"+id); loadPlaces(); };

  const lookup=async()=>{
    const n=nid.replace(/\D/g,""); if(n.length<8){setMsg("کد ملی معتبر وارد کنید");return;}
    try{ const r=await GET("/search?national_id="+n); if(r.type==="driver"){setDriver(r.driver);setMsg("");} else setMsg("راننده یافت نشد"); }
    catch(e){ setDriver(null); setMsg("راننده‌ای با این کد ملی یافت نشد"); }
  };
  const addActivity=async()=>{
    const n=nid.replace(/\D/g,""); if(n.length<8){setMsg("کد ملی معتبر وارد کنید");return;}
    if(!typeId){setMsg("نوع فعالیت را انتخاب کنید");return;}
    if(!adate){setMsg("تاریخ فعالیت را انتخاب کنید");return;}
    try{ const r=await SEND("POST","/admin/cultural-activities",{type_id:+typeId,place_id:placeId?+placeId:null,driver_national_id:n,activity_jdate:adate,hours:hours||null,note});
      setMsg("✓ فعالیت فرهنگی برای "+(r.driver_name||"راننده")+" ثبت شد"); setNid("");setDriver(null);setTypeId("");setPlaceId("");setHours("");setNote(""); }
    catch(e){ setMsg(e.message||"خطا در ثبت"); }
  };

  const loadReport=()=>{ const p=[]; if(repType)p.push("type_id="+repType); if(from)p.push("from="+from); if(to)p.push("to="+to);
    GET("/admin/cultural-activities"+(p.length?"?"+p.join("&"):"")).then(setRep).catch(()=>{}); };
  useEffect(()=>{ if(tab==="report")loadReport(); },[tab]);
  const delActivity=async(id)=>{ if(!confirm("حذف این فعالیت؟"))return; await SEND("DELETE","/admin/cultural-activities/"+id); loadReport(); };
  const exportRep=()=>{ if(!rep||!rep.rows.length)return;
    const ws=XLSX.utils.json_to_sheet(rep.rows.map(r=>({"فعالیت":r.type_title,"مکان":r.place_title,"کد ملی":r.driver_national_id,"نام راننده":r.driver_name,"تاریخ":r.activity_jdate,"ساعت":r.hours,"ثبت‌کننده":r.recorded_by_name,"توضیح":r.note})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"فعالیت فرهنگی"); XLSX.writeFile(wb,"گزارش_فعالیت_فرهنگی.xlsx"); };

  return(<div>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[["add","➕ ثبت فعالیت"],["types","🎭 انواع فعالیت"],["places","📍 مکان‌ها"],["report","📊 گزارش‌گیری"]].map(([k,l])=>
        <button key={k} className={"btn "+(tab===k?"p":"g")} onClick={()=>setTab(k)}>{l}</button>)}
    </div>

    {tab==="types"&&<div className="panel">
      <h3>تعریف انواع فعالیت فرهنگی</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>مثل: سرویس‌دهی صلواتی، خدمت‌رسانی در چراغ‌برات، حمل‌ونقل رایگان زائر و …</p>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
        <input className="input" style={{maxWidth:220}} placeholder="عنوان فعالیت" value={newType.title} onChange={e=>setNewType({...newType,title:e.target.value})}/>
        <input className="input" style={{maxWidth:300,flex:1}} placeholder="توضیح (اختیاری)" value={newType.description} onChange={e=>setNewType({...newType,description:e.target.value})}/>
        <button className="btn p" onClick={saveType}>افزودن</button>
      </div>
      <div style={{overflowX:"auto"}}><table style={{fontSize:13,minWidth:480}}>
        <thead><tr><th>عنوان</th><th>توضیح</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>{types.map(it=><tr key={it.id}>
          <td style={{fontWeight:700}}>{it.title}</td><td style={{fontSize:12,color:"var(--muted)"}}>{it.description||"—"}</td>
          <td><span style={{color:it.is_active?"var(--ok)":"var(--muted)"}}>{it.is_active?"فعال":"غیرفعال"}</span></td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>toggleType(it)}>{it.is_active?"غیرفعال":"فعال"}</button> <button className="btn g" style={{fontSize:11,padding:"3px 8px",color:"var(--danger)"}} onClick={()=>delType(it.id)}>حذف</button></td>
        </tr>)}</tbody></table>
        {types.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>هنوز فعالیتی تعریف نشده است.</p>}
      </div>
    </div>}

    {tab==="places"&&<div className="panel">
      <h3>مدیریت مکان‌های خدمات فرهنگی</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>مکان‌هایی که خدمات فرهنگی در آن‌ها ارائه می‌شود (حرم، میادین، مسیرهای زیارتی و …).</p>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
        <input className="input" style={{maxWidth:200}} placeholder="نام مکان" value={newPlace.title} onChange={e=>setNewPlace({...newPlace,title:e.target.value})}/>
        <input className="input" style={{maxWidth:280,flex:1}} placeholder="آدرس" value={newPlace.address} onChange={e=>setNewPlace({...newPlace,address:e.target.value})}/>
        <input className="input" style={{maxWidth:140}} placeholder="تلفن" value={newPlace.phone} onChange={e=>setNewPlace({...newPlace,phone:e.target.value})}/>
        <button className="btn p" onClick={savePlace}>افزودن</button>
      </div>
      <div style={{overflowX:"auto"}}><table style={{fontSize:13,minWidth:520}}>
        <thead><tr><th>نام مکان</th><th>آدرس</th><th>تلفن</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>{places.map(pl=><tr key={pl.id}>
          <td style={{fontWeight:700}}>{pl.title}</td><td style={{fontSize:12,color:"var(--muted)"}}>{pl.address||"—"}</td><td dir="ltr">{fa(pl.phone||"—")}</td>
          <td><span style={{color:pl.is_active?"var(--ok)":"var(--muted)"}}>{pl.is_active?"فعال":"غیرفعال"}</span></td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>togglePlace(pl)}>{pl.is_active?"غیرفعال":"فعال"}</button> <button className="btn g" style={{fontSize:11,padding:"3px 8px",color:"var(--danger)"}} onClick={()=>delPlace(pl.id)}>حذف</button></td>
        </tr>)}</tbody></table>
        {places.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>هنوز مکانی تعریف نشده است.</p>}
      </div>
    </div>}

    {tab==="add"&&<div className="panel">
      <h3>ثبت فعالیت فرهنگی راننده</h3>
      <label className="label">کد ملی راننده</label>
      <div className="row" style={{gap:8}}>
        <input className="input" dir="ltr" maxLength="10" style={{maxWidth:200}} placeholder="کد ملی" value={nid} onChange={e=>setNid(e.target.value)}/>
        <button className="btn g" onClick={lookup}>🔍 فراخوان راننده</button>
      </div>
      {driver&&<div style={{background:"#eef7f3",borderRadius:10,padding:12,margin:"10px 0",border:"1px solid #cfe8df"}}>
        <b>{driver.first_name} {driver.last_name}</b>
        <div style={{fontSize:12.5,color:"var(--muted)",marginTop:4}}>موبایل: {fa(driver.mobile||"—")} · نوع: {driver.driver_type||"—"} · کد بهره‌برداری: {fa(driver.operating_code||"—")}</div>
      </div>}
      <label className="label" style={{marginTop:10}}>نوع فعالیت فرهنگی</label>
      <select className="input" value={typeId} onChange={e=>setTypeId(e.target.value)}>
        <option value="">— انتخاب کنید —</option>
        {types.filter(it=>it.is_active).map(it=><option key={it.id} value={it.id}>{it.title}</option>)}
      </select>
      <label className="label" style={{marginTop:10}}>مکان خدمات</label>
      <select className="input" value={placeId} onChange={e=>setPlaceId(e.target.value)}>
        <option value="">— بدون مکان —</option>
        {places.filter(pl=>pl.is_active).map(pl=><option key={pl.id} value={pl.id}>{pl.title}{pl.address?(" — "+pl.address):""}</option>)}
      </select>
      <div className="row" style={{gap:10,marginTop:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:150}}><label className="label">تاریخ فعالیت</label><JDate value={adate} onChange={setAdate} jalali/></div>
        <div style={{flex:1,minWidth:120}}><label className="label">مدت (ساعت)</label><input className="input" type="number" min="0" step="0.5" placeholder="اختیاری" value={hours} onChange={e=>setHours(e.target.value)}/></div>
      </div>
      <label className="label" style={{marginTop:10}}>توضیحات (اختیاری)</label>
      <input className="input" value={note} onChange={e=>setNote(e.target.value)}/>
      <button className="btn p" style={{marginTop:14}} onClick={addActivity}>ثبت فعالیت فرهنگی</button>
      {msg&&<p style={{marginTop:10,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontSize:13,fontWeight:700}}>{msg}</p>}
    </div>}

    {tab==="report"&&<div className="panel">
      <h3>گزارش فعالیت‌های فرهنگی</h3>
      <div className="filters" style={{flexWrap:"wrap",gap:8}}>
        <select className="input" style={{maxWidth:180}} value={repType} onChange={e=>setRepType(e.target.value)}>
          <option value="">همهٔ فعالیت‌ها</option>
          {types.map(it=><option key={it.id} value={it.id}>{it.title}</option>)}
        </select>
        <span className="label">از</span><JDate value={from} onChange={setFrom} jalali/>
        <span className="label">تا</span><JDate value={to} onChange={setTo} jalali/>
        <button className="btn p" onClick={loadReport}>اعمال</button>
        <button className="btn g" onClick={()=>{setFrom("");setTo("");setRepType("");setTimeout(loadReport,0);}}>پاک</button>
        <button className="btn g" onClick={exportRep} disabled={!rep||!rep.rows.length}>⤓ اکسل</button>
      </div>
      {rep&&<>
        {rep.summary&&rep.summary.length>0&&<div className="kpis" style={{marginTop:12}}>
          {rep.summary.map((s,i)=><div className="kpi" key={i}><div className="n">{fa(s.activity_count)}</div><div className="l">{s.title}{s.total_hours>0?(" · "+fa(s.total_hours)+" ساعت"):""}</div></div>)}
        </div>}
        <div style={{overflowX:"auto",marginTop:14}}><table style={{fontSize:12.5,minWidth:720}}>
          <thead><tr><th>فعالیت</th><th>مکان</th><th>راننده</th><th>کد ملی</th><th>تاریخ</th><th>ساعت</th><th>ثبت‌کننده</th><th></th></tr></thead>
          <tbody>{rep.rows.map(r=><tr key={r.id}>
            <td style={{fontWeight:700}}>{r.type_title}</td><td style={{fontSize:11.5}}>{r.place_title||r.location||"—"}</td><td>{r.driver_name||"—"}</td><td dir="ltr">{faPlain(r.driver_national_id)}</td>
            <td>{fa(r.activity_jdate)}</td><td>{r.hours?fa(r.hours):"—"}</td><td style={{fontSize:11}}>{r.recorded_by_name||"—"}</td>
            <td><button className="btn g" style={{fontSize:11,padding:"2px 7px",color:"var(--danger)"}} onClick={()=>delActivity(r.id)}>حذف</button></td>
          </tr>)}</tbody>
        </table>
        {rep.rows.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>موردی یافت نشد.</p>}</div>
      </>}
    </div>}
  </div>);
}

function Welfare(){
  const [tab,setTab]=useState("grant");
  const [items,setItems]=useState([]);
  const [places,setPlaces]=useState([]);
  const [newItem,setNewItem]=useState({title:"",description:""});
  const [newPlace,setNewPlace]=useState({title:"",address:"",phone:""});
  // فرم تحویل
  const [nid,setNid]=useState("");
  const [driver,setDriver]=useState(null);
  const [grantItem,setGrantItem]=useState("");
  const [grantPlace,setGrantPlace]=useState("");
  const [gdate,setGdate]=useState(todayJStr());
  const [count,setCount]=useState(1);
  const [note,setNote]=useState("");
  const [msg,setMsg]=useState("");
  // گزارش
  const [rep,setRep]=useState(null);
  const [repItem,setRepItem]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");

  const loadItems=()=>GET("/admin/welfare-items").then(setItems).catch(()=>{});
  const loadPlaces=()=>GET("/admin/welfare-places").then(setPlaces).catch(()=>{});
  useEffect(()=>{loadItems();loadPlaces();},[]);

  const saveItem=async()=>{ if(!newItem.title.trim())return; await SEND("POST","/admin/welfare-items",newItem); setNewItem({title:"",description:""}); loadItems(); };
  const toggleItem=async(it)=>{ await SEND("POST","/admin/welfare-items",{...it,is_active:it.is_active?0:1}); loadItems(); };
  const delItem=async(id)=>{ if(!confirm("حذف این نوع رفاهیت؟"))return; await SEND("DELETE","/admin/welfare-items/"+id); loadItems(); };
  const savePlace=async()=>{ if(!newPlace.title.trim())return; await SEND("POST","/admin/welfare-places",newPlace); setNewPlace({title:"",address:"",phone:""}); loadPlaces(); };
  const togglePlace=async(pl)=>{ await SEND("POST","/admin/welfare-places",{...pl,is_active:pl.is_active?0:1}); loadPlaces(); };
  const delPlace=async(id)=>{ if(!confirm("حذف این مکان؟"))return; await SEND("DELETE","/admin/welfare-places/"+id); loadPlaces(); };

  const lookup=async()=>{
    const n=nid.replace(/\D/g,""); if(n.length<8){setMsg("کد ملی معتبر وارد کنید");return;}
    try{ const r=await GET("/search?national_id="+n); if(r.type==="driver"){setDriver(r.driver);setMsg("");} else setMsg("راننده یافت نشد"); }
    catch(e){ setDriver(null); setMsg("راننده‌ای با این کد ملی یافت نشد"); }
  };
  const grant=async()=>{
    const n=nid.replace(/\D/g,""); if(n.length<8){setMsg("کد ملی معتبر وارد کنید");return;}
    if(!grantItem){setMsg("نوع رفاهیت را انتخاب کنید");return;}
    try{ const r=await SEND("POST","/admin/welfare-grants",{item_id:+grantItem,place_id:grantPlace?+grantPlace:null,driver_national_id:n,count:+count,note,granted_jdate:gdate});
      setMsg("✓ رفاهیت برای "+(r.driver_name||"راننده")+" ثبت شد"); setNid("");setDriver(null);setCount(1);setNote("");setGrantItem("");setGrantPlace(""); }
    catch(e){ setMsg(e.message||"خطا در ثبت"); }
  };

  const loadReport=()=>{ const p=[]; if(repItem)p.push("item_id="+repItem); if(from)p.push("from="+from); if(to)p.push("to="+to);
    GET("/admin/welfare-grants"+(p.length?"?"+p.join("&"):"")).then(setRep).catch(()=>{}); };
  useEffect(()=>{ if(tab==="report")loadReport(); },[tab]);
  const delGrant=async(id)=>{ if(!confirm("حذف این تحویل؟"))return; await SEND("DELETE","/admin/welfare-grants/"+id); loadReport(); };
  const exportRep=()=>{ if(!rep||!rep.rows.length)return;
    const ws=XLSX.utils.json_to_sheet(rep.rows.map(r=>({"رفاهیت":r.item_title,"مکان":r.place_title,"آدرس":r.place_address,"کد ملی":r.driver_national_id,"نام راننده":r.driver_name,"موبایل":r.driver_mobile,"تعداد":r.count,"تاریخ تحویل":r.granted_jdate,"ثبت‌کننده":r.granted_by_name,"توضیح":r.note})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"رفاهیات"); XLSX.writeFile(wb,"گزارش_رفاهیات.xlsx"); };

  return(<div>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[["grant","➕ تحویل رفاهیت"],["items","🎁 انواع رفاهیات"],["places","📍 مکان‌ها"],["report","📊 گزارش‌گیری"]].map(([k,l])=>
        <button key={k} className={"btn "+(tab===k?"p":"g")} onClick={()=>setTab(k)}>{l}</button>)}
    </div>

    {tab==="items"&&<div className="panel">
      <h3>تعریف انواع رفاهیات</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>مثل: بن استخر رایگان، بسته معیشتی، بن خرید، هدیهٔ مناسبتی و …</p>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
        <input className="input" style={{maxWidth:220}} placeholder="عنوان رفاهیت" value={newItem.title} onChange={e=>setNewItem({...newItem,title:e.target.value})}/>
        <input className="input" style={{maxWidth:300,flex:1}} placeholder="توضیح (اختیاری)" value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})}/>
        <button className="btn p" onClick={saveItem}>افزودن</button>
      </div>
      <div style={{overflowX:"auto"}}><table style={{fontSize:13,minWidth:480}}>
        <thead><tr><th>عنوان</th><th>توضیح</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>{items.map(it=><tr key={it.id}>
          <td style={{fontWeight:700}}>{it.title}</td><td style={{fontSize:12,color:"var(--muted)"}}>{it.description||"—"}</td>
          <td><span style={{color:it.is_active?"var(--ok)":"var(--muted)"}}>{it.is_active?"فعال":"غیرفعال"}</span></td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>toggleItem(it)}>{it.is_active?"غیرفعال":"فعال"}</button> <button className="btn g" style={{fontSize:11,padding:"3px 8px",color:"var(--danger)"}} onClick={()=>delItem(it.id)}>حذف</button></td>
        </tr>)}</tbody></table>
        {items.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>هنوز رفاهیتی تعریف نشده است.</p>}
      </div>
    </div>}

    {tab==="places"&&<div className="panel">
      <h3>مدیریت مکان‌های ارائهٔ رفاهیت</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>مثل: استخر فلان، باشگاه فلان — با نام، آدرس و تلفن.</p>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
        <input className="input" style={{maxWidth:200}} placeholder="نام مکان" value={newPlace.title} onChange={e=>setNewPlace({...newPlace,title:e.target.value})}/>
        <input className="input" style={{maxWidth:280,flex:1}} placeholder="آدرس" value={newPlace.address} onChange={e=>setNewPlace({...newPlace,address:e.target.value})}/>
        <input className="input" style={{maxWidth:140}} placeholder="تلفن" value={newPlace.phone} onChange={e=>setNewPlace({...newPlace,phone:e.target.value})}/>
        <button className="btn p" onClick={savePlace}>افزودن</button>
      </div>
      <div style={{overflowX:"auto"}}><table style={{fontSize:13,minWidth:520}}>
        <thead><tr><th>نام مکان</th><th>آدرس</th><th>تلفن</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>{places.map(pl=><tr key={pl.id}>
          <td style={{fontWeight:700}}>{pl.title}</td><td style={{fontSize:12,color:"var(--muted)"}}>{pl.address||"—"}</td><td dir="ltr">{fa(pl.phone||"—")}</td>
          <td><span style={{color:pl.is_active?"var(--ok)":"var(--muted)"}}>{pl.is_active?"فعال":"غیرفعال"}</span></td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>togglePlace(pl)}>{pl.is_active?"غیرفعال":"فعال"}</button> <button className="btn g" style={{fontSize:11,padding:"3px 8px",color:"var(--danger)"}} onClick={()=>delPlace(pl.id)}>حذف</button></td>
        </tr>)}</tbody></table>
        {places.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>هنوز مکانی تعریف نشده است.</p>}
      </div>
    </div>}

    {tab==="grant"&&<div className="panel">
      <h3>ثبت تحویل رفاهیت به راننده</h3>
      <label className="label">کد ملی راننده</label>
      <div className="row" style={{gap:8}}>
        <input className="input" dir="ltr" maxLength="10" style={{maxWidth:200}} placeholder="کد ملی" value={nid} onChange={e=>setNid(e.target.value)}/>
        <button className="btn g" onClick={lookup}>🔍 فراخوان راننده</button>
      </div>
      {driver&&<div style={{background:"#eef7f3",borderRadius:10,padding:12,margin:"10px 0",border:"1px solid #cfe8df"}}>
        <b>{driver.first_name} {driver.last_name}</b>
        <div style={{fontSize:12.5,color:"var(--muted)",marginTop:4}}>موبایل: {fa(driver.mobile||"—")} · نوع: {driver.driver_type||"—"} · کد بهره‌برداری: {fa(driver.operating_code||"—")}</div>
      </div>}
      <label className="label" style={{marginTop:10}}>نوع رفاهیت</label>
      <select className="input" value={grantItem} onChange={e=>setGrantItem(e.target.value)}>
        <option value="">— انتخاب کنید —</option>
        {items.filter(it=>it.is_active).map(it=><option key={it.id} value={it.id}>{it.title}</option>)}
      </select>
      <label className="label" style={{marginTop:10}}>مکان ارائه (استخر/مرکز)</label>
      <select className="input" value={grantPlace} onChange={e=>setGrantPlace(e.target.value)}>
        <option value="">— بدون مکان —</option>
        {places.filter(pl=>pl.is_active).map(pl=><option key={pl.id} value={pl.id}>{pl.title}{pl.address?(" — "+pl.address):""}</option>)}
      </select>
      <div className="row" style={{gap:10,marginTop:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:140}}><label className="label">تاریخ تحویل</label><JDate value={gdate} onChange={setGdate} jalali/></div>
        <div style={{flex:1,minWidth:90}}><label className="label">تعداد</label><input className="input" type="number" min="1" value={count} onChange={e=>setCount(e.target.value)}/></div>
      </div>
      <label className="label" style={{marginTop:10}}>توضیح (اختیاری)</label>
      <input className="input" value={note} onChange={e=>setNote(e.target.value)}/>
      <button className="btn p" style={{marginTop:14}} onClick={grant}>ثبت تحویل رفاهیت</button>
      {msg&&<p style={{marginTop:10,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontSize:13,fontWeight:700}}>{msg}</p>}
    </div>}

    {tab==="report"&&<div className="panel">
      <h3>گزارش تحویل رفاهیات</h3>
      <div className="filters" style={{flexWrap:"wrap",gap:8}}>
        <select className="input" style={{maxWidth:180}} value={repItem} onChange={e=>setRepItem(e.target.value)}>
          <option value="">همهٔ رفاهیات</option>
          {items.map(it=><option key={it.id} value={it.id}>{it.title}</option>)}
        </select>
        <span className="label">از</span><JDate value={from} onChange={setFrom} jalali/>
        <span className="label">تا</span><JDate value={to} onChange={setTo} jalali/>
        <button className="btn p" onClick={loadReport}>اعمال</button>
        <button className="btn g" onClick={()=>{setFrom("");setTo("");setRepItem("");setTimeout(loadReport,0);}}>پاک</button>
        <button className="btn g" onClick={exportRep} disabled={!rep||!rep.rows.length}>⤓ اکسل</button>
      </div>
      {rep&&<>
        {rep.summary&&rep.summary.length>0&&<div className="kpis" style={{marginTop:12}}>
          {rep.summary.map((s,i)=><div className="kpi" key={i}><div className="n">{fa(s.total_count)}</div><div className="l">{s.title} ({fa(s.grant_count)} تحویل)</div></div>)}
        </div>}
        <div style={{overflowX:"auto",marginTop:14}}><table style={{fontSize:12.5,minWidth:760}}>
          <thead><tr><th>رفاهیت</th><th>مکان</th><th>راننده</th><th>کد ملی</th><th>تعداد</th><th>تاریخ تحویل</th><th>ثبت‌کننده</th><th></th></tr></thead>
          <tbody>{rep.rows.map(r=><tr key={r.id}>
            <td style={{fontWeight:700}}>{r.item_title}</td><td style={{fontSize:11.5}}>{r.place_title||"—"}</td><td>{r.driver_name||"—"}</td><td dir="ltr">{faPlain(r.driver_national_id)}</td>
            <td>{fa(r.count)}</td><td>{fa(r.granted_jdate)}</td><td style={{fontSize:11}}>{r.granted_by_name||"—"}</td>
            <td><button className="btn g" style={{fontSize:11,padding:"2px 7px",color:"var(--danger)"}} onClick={()=>delGrant(r.id)}>حذف</button></td>
          </tr>)}</tbody>
        </table>
        {rep.rows.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>موردی یافت نشد.</p>}</div>
      </>}
    </div>}
  </div>);
}

function GsmReport(){
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false);
  const qs=()=>{ const p=[]; if(from)p.push("from="+from); if(to)p.push("to="+to); return p.length?("?"+p.join("&")):""; };
  const load=()=>{ setLoading(true); GET("/admin/gsm-locations"+qs()).then(setData).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);
  return(<div className="panel"><h3>📶 گزارش موقعیت‌های آنتن GSM</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>موقعیت‌هایی که هنگام خاموش بودن GPS کاربر، از طریق آنتن مخابراتی (GSM) به‌صورت حدودی ثبت و ارسال شده‌اند.</p>
    <div className="filters" style={{flexWrap:"wrap",gap:8}}>
      <span className="label">از</span><JDate value={from} onChange={setFrom}/>
      <span className="label">تا</span><JDate value={to} onChange={setTo}/>
      <button className="btn p" onClick={load}>اعمال</button>
      <button className="btn g" onClick={()=>{setFrom("");setTo("");setTimeout(load,0);}}>کل دوره</button>
    </div>
    {loading&&<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>}
    {data&&<>
      <div className="kpis" style={{marginTop:12}}>
        <div className="kpi"><div className="n">{fa(data.summary.total)}</div><div className="l">کل موقعیت‌های GSM</div></div>
        <div className="kpi"><div className="n">{fa(data.summary.users)}</div><div className="l">کاربر با موقعیت GSM</div></div>
      </div>
      {data.by_user&&data.by_user.length>0&&<div style={{marginTop:14}}>
        <h4 style={{marginBottom:8}}>تفکیک بر اساس کاربر</h4>
        <div style={{overflowX:"auto"}}>
          <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>نام</th><th>سمت</th><th>تعداد</th><th>آخرین</th></tr></thead>
          <tbody>{data.by_user.map((u,i)=><tr key={i}><td style={{fontWeight:700}}>{u.name||"—"}</td><td style={{fontSize:11,color:"var(--muted)"}}>{u.role_title||"—"}</td><td>{fa(u.count)}</td><td style={{fontSize:11}}>{fj(u.last)}</td></tr>)}</tbody></table>
        </div>
      </div>}
      {data.rows&&data.rows.length>0&&<div style={{marginTop:16}}>
        <h4 style={{marginBottom:8}}>جزئیات موقعیت‌ها</h4>
        <div style={{overflowX:"auto",maxHeight:400,overflowY:"auto"}}>
          <table style={{fontSize:12,minWidth:480}}><thead><tr><th>نام</th><th>زمان</th><th>موقعیت</th></tr></thead>
          <tbody>{data.rows.slice(0,1000).map((r,i)=><tr key={i}><td>{r.name||"—"}</td><td style={{fontSize:11}}>{fj(r.captured_at)}</td>
            <td><a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" style={{color:"var(--brand)"}}>نمایش روی نقشه</a></td></tr>)}</tbody></table>
        </div>
      </div>}
      {data.summary.total===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:20}}>موقعیتی از طریق GSM ثبت نشده است.</p>}
    </>}
  </div>);
}


const MISSION_ROLE_LABELS={line_supervisor:"ناظر خط",motor_patrol:"گشت موتوری",vehicle_patrol:"بازرس گشت خودرویی",resident_inspector:"بازرس مقیم",chief_inspector:"سربازرس",administrative_visit:"نیروی اداری",other:"سایر"};

function MissionOperationsDashboard(){
  const [date,setDate]=useState(todayJStr());
  const [rows,setRows]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const [roleSummary,setRoleSummary]=useState(null);
  const [trendUser,setTrendUser]=useState(null);
  const load=()=>{ setLoading(true); setErr("");
    GET("/admin/mission-daily-performance"+(date?`?date=${date}`:"")).then(r=>setRows(r.items||[])).catch(e=>setErr(e.message)).finally(()=>setLoading(false));
    GET("/admin/role-dashboard-summary"+(date?`?date=${date}`:"")).then(r=>setRoleSummary(r.items||[])).catch(()=>setRoleSummary([])); };
  useEffect(()=>{load();},[]);
  const summary=(()=>{ if(!rows||!rows.length) return null;
    const withMission=rows.filter(r=>r.mission_source&&r.mission_source!=='none');
    const avg=withMission.length?Math.round(withMission.reduce((s,r)=>s+Number(r.weighted_achievement||0),0)/withMission.length*10)/10:0;
    const full=withMission.filter(r=>Number(r.weighted_achievement||0)>=90).length;
    const weak=withMission.filter(r=>Number(r.weighted_achievement||0)<50).length;
    return {total:rows.length,withMission:withMission.length,avg,full,weak}; })();
  return(<div className="panel"><h3>🧭 داشبورد عملیات میدانی</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>عملکرد وزن‌دار روزانهٔ نیروهای میدانی (ناظر خط، گشت موتوری، بازرس مقیم، بازرس گشت خودرویی، سربازرس) نسبت به مأموریت مؤثر آن‌ها (الگوی سمت یا مأموریت اختصاصی).</p>
    <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:10}}>
      <span className="label">تاریخ</span><JDate value={date} onChange={setDate} jalali/>
      <button className="btn p" onClick={load}>اعمال</button>
    </div>
    {err&&<p style={{color:"var(--danger)"}}>{err}</p>}
    {loading&&<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>}
    {summary&&<div className="kpis" style={{marginBottom:14}}>
      <div className="kpi"><div className="n">{fa(summary.total)}</div><div className="l">کل نیروهای میدانی</div></div>
      <div className="kpi"><div className="n">{fa(summary.withMission)}</div><div className="l">دارای مأموریت مؤثر</div></div>
      <div className="kpi"><div className="n">٪{fa(summary.avg)}</div><div className="l">میانگین تحقق وزن‌دار</div></div>
      <div className="kpi"><div className="n">{fa(summary.full)}</div><div className="l">تحقق ≥ ۹۰٪</div></div>
      <div className="kpi"><div className="n">{fa(summary.weak)}</div><div className="l">تحقق &lt; ۵۰٪ (نیازمند پیگیری)</div></div>
    </div>}
    {roleSummary&&roleSummary.length>0&&<div style={{marginBottom:16}}>
      <h4 style={{marginBottom:8,fontSize:14}}>📋 خلاصه بر اساس سمت</h4>
      <div style={{overflowX:"auto"}}>
        <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>سمت</th><th>تعداد نفرات</th><th>میانگین تحقق</th><th>مجموع امتیاز</th></tr></thead>
        <tbody>{roleSummary.map(g=>(<tr key={g.role_key}><td style={{fontWeight:700}}>{MISSION_ROLE_LABELS[g.role_key]||g.role_key}</td>
          <td>{fa(g.count)}</td><td>٪{fa(g.avg_achievement)}</td><td>{fa(Math.round(g.total_score*10)/10)}</td></tr>))}</tbody></table>
      </div>
    </div>}
    {rows&&<div style={{overflowX:"auto"}}>
      {rows.length>0&&<button className="btn g" style={{marginBottom:8}} onClick={()=>exportXlsx(rows.map(r=>({'نام':r.user_name,'سمت':r.role_title||MISSION_ROLE_LABELS[r.role_key]||r.role_key,
        'منبع مأموریت':r.mission_source==='user_override'?'اختصاصی':r.mission_source==='role_template'?'الگوی سمت':'—',
        'خطوط تخصیص‌یافته':r.assigned_lines_count,'خطوط بازدیدشده':r.visited_lines_count,'خطوط تأییدشده':r.validated_lines_count,
        'تحقق وزن‌دار (٪)':r.weighted_achievement})),"عملکرد میدانی",`عملکرد_میدانی_${date}.xlsx`)}>⤓ خروجی اکسل</button>}
      <table style={{fontSize:12.5,minWidth:640}}><thead><tr><th>نام</th><th>سمت</th><th>منبع مأموریت</th><th>خطوط تخصیص‌یافته</th><th>خطوط بازدیدشده</th><th>خطوط تأییدشده</th><th>تحقق وزن‌دار</th><th></th></tr></thead>
      <tbody>{rows.sort((a,b)=>Number(b.weighted_achievement||0)-Number(a.weighted_achievement||0)).map((r,i)=>{
        const wa=Number(r.weighted_achievement||0);
        const color=wa>=90?"var(--ok)":wa>=50?"var(--warning,#c99b23)":"var(--danger)";
        return(<React.Fragment key={i}><tr><td style={{fontWeight:700}}>{r.user_name}</td><td style={{fontSize:11,color:"var(--muted)"}}>{r.role_title||MISSION_ROLE_LABELS[r.role_key]||r.role_key}</td>
          <td style={{fontSize:11}}>{r.mission_source==='user_override'?'اختصاصی':r.mission_source==='role_template'?'الگوی سمت':'—'}</td>
          <td>{fa(r.assigned_lines_count)}</td><td>{fa(r.visited_lines_count)}</td><td>{fa(r.validated_lines_count)}</td>
          <td style={{fontWeight:800,color}}>٪{fa(wa)}</td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>setTrendUser(trendUser===r.user_id?null:r.user_id)}>📈 روند</button></td></tr>
        {trendUser===r.user_id&&<tr><td colSpan={8} style={{background:"#fafbfc",padding:14}}><MissionTrendChart userId={r.user_id} title={`روند ۳۰ روز — ${r.user_name}`}/></td></tr>}
        </React.Fragment>);})}</tbody></table>
      {!rows.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:20}}>برای این تاریخ عملکردی ثبت نشده است.</p>}
    </div>}
  </div>);
}

const MISSION_METRIC_LABELS_FALLBACK={driver_attendance_percent:"ثبت حضور رانندگان",vehicle_checklist_percent:"تکمیل چک‌لیست خودروها",expired_notice_percent:"تذکر اعتبارات منقضی",subscription_debt_notice_percent:"تذکر بدهی آبونمان",assigned_lines_visit_percent:"بازدید خطوط تخصیص‌یافته",subordinate_review_percent:"بررسی زیرمجموعه",station_visit_percent:"بازدید ایستگاه‌ها",end_shift_report:"گزارش پایان شیفت"};

function MissionTargetsEditor({metrics,targets,setTargets}){
  const add=()=>setTargets([...targets,{metric_key:metrics[0]?.metric_key||"",target_percent:70,weight:1,is_required:true}]);
  const upd=(i,k,v)=>{ const t=[...targets]; t[i]={...t[i],[k]:v}; setTargets(t); };
  const rm=(i)=>setTargets(targets.filter((_,x)=>x!==i));
  return(<div>
    {targets.map((t,i)=>(<div key={i} className="row" style={{gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
      <select className="input" style={{maxWidth:220}} value={t.metric_key} onChange={e=>upd(i,'metric_key',e.target.value)}>
        {metrics.map(m=><option key={m.metric_key} value={m.metric_key}>{m.title||MISSION_METRIC_LABELS_FALLBACK[m.metric_key]||m.metric_key}</option>)}
      </select>
      <span className="label">هدف٪</span><input className="input" type="number" min={0} max={100} style={{maxWidth:80}} value={t.target_percent} onChange={e=>upd(i,'target_percent',+e.target.value)}/>
      <span className="label">وزن</span><input className="input" type="number" min={0} step={0.5} style={{maxWidth:70}} value={t.weight} onChange={e=>upd(i,'weight',+e.target.value)}/>
      <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12}}><input type="checkbox" checked={!!t.is_required} onChange={e=>upd(i,'is_required',e.target.checked)}/>الزامی</label>
      <button className="btn g" onClick={()=>rm(i)}>حذف</button>
    </div>))}
    <button className="btn g" onClick={add}>➕ افزودن هدف</button>
  </div>);
}

function MissionTemplatesAdmin(){
  const [tab,setTab]=useState("templates");
  const [metrics,setMetrics]=useState([]);
  const [templates,setTemplates]=useState([]);
  const [title,setTitle]=useState(""); const [roleKey,setRoleKey]=useState("line_supervisor"); const [period,setPeriod]=useState("daily");
  const [isDefault,setIsDefault]=useState(true); const [targets,setTargets]=useState([]);
  const [msg,setMsg]=useState("");
  const [users,setUsers]=useState([]); const [ovUser,setOvUser]=useState(""); const [ovTargets,setOvTargets]=useState([]); const [overrides,setOverrides]=useState([]);
  const [settings,setSettings]=useState(null);
  const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [visitRows,setVisitRows]=useState(null);

  const loadMetrics=()=>GET("/admin/mission-metrics").then(setMetrics).catch(()=>{});
  const loadTemplates=()=>GET("/admin/mission-templates").then(setTemplates).catch(()=>{});
  const loadOverrides=()=>GET("/admin/user-mission-overrides"+(ovUser?`?user_id=${ovUser}`:"")).then(setOverrides).catch(()=>{});
  const loadSettings=()=>GET("/admin/mission-execution-settings").then(r=>{ const m={}; (r.items||[]).forEach(x=>m[x.setting_key]=x.setting_value); setSettings(m); }).catch(()=>{});
  const loadVisits=()=>{ const p=[]; if(from)p.push("from="+from); if(to)p.push("to="+to);
    GET("/admin/mission-visit-report"+(p.length?"?"+p.join("&"):"")).then(r=>setVisitRows(r.items||[])).catch(()=>setVisitRows([])); };

  useEffect(()=>{ loadMetrics(); loadTemplates(); db.users().then(setUsers).catch(()=>{}); },[]);
  useEffect(()=>{ if(tab==="overrides")loadOverrides(); if(tab==="settings")loadSettings(); if(tab==="visits")loadVisits(); },[tab]);

  const saveTemplate=async()=>{ setMsg("");
    if(!title.trim()){setMsg("عنوان الگو را وارد کنید");return;}
    if(!targets.length){setMsg("حداقل یک هدف تعریف کنید");return;}
    try{ await SEND("POST","/admin/mission-templates",{title:title.trim(),role_key:roleKey,period,is_default:isDefault,is_active:true,targets});
      setMsg("✓ الگو ذخیره شد"); setTitle(""); setTargets([]); loadTemplates(); }
    catch(e){ setMsg(e.message||"خطا در ذخیره"); } };
  const delTemplate=async(id)=>{ if(!confirm("این الگوی مأموریت حذف شود؟"))return; await SEND("DELETE","/admin/mission-templates/"+id); loadTemplates(); };

  const saveOverride=async()=>{ setMsg("");
    if(!ovUser){setMsg("کاربر را انتخاب کنید");return;}
    if(!ovTargets.length){setMsg("حداقل یک هدف تعریف کنید");return;}
    try{ await SEND("PUT","/admin/user-mission-overrides/"+ovUser,{period:"daily",is_active:true,targets:ovTargets});
      setMsg("✓ مأموریت اختصاصی ذخیره شد"); setOvTargets([]); loadOverrides(); }
    catch(e){ setMsg(e.message||"خطا در ذخیره"); } };
  const delOverride=async(uid)=>{ if(!confirm("مأموریت اختصاصی این کاربر حذف شود؟"))return; await SEND("DELETE","/admin/user-mission-overrides/"+uid+"?period=daily"); loadOverrides(); };

  const saveSettings=async()=>{ setMsg("");
    try{ const items=Object.entries(settings).map(([setting_key,setting_value])=>({setting_key,setting_value:String(setting_value)}));
      await SEND("PUT","/admin/mission-execution-settings",{items}); setMsg("✓ تنظیمات ذخیره شد"); }
    catch(e){ setMsg(e.message||"خطا در ذخیره"); } };

  const SETTINGS_LABELS={visit_min_duration_minutes:"حداقل مدت بازدید (دقیقه)",visit_min_checked_percent:"حداقل درصد چک‌لیست‌شده برای تأیید بازدید",
    visit_require_start_photo:"الزام تصویر شروع بازدید (true/false)",visit_require_finish_photo:"الزام تصویر پایان بازدید (true/false)",
    visit_require_end_report:"الزام گزارش پایان بازدید (true/false)",visit_geo_extra_radius_m:"شعاع مجاز اضافه از محدودهٔ خط (متر)",
    visit_photo_width:"عرض تصویر ذخیره‌شده (پیکسل)",visit_photo_quality:"کیفیت فشرده‌سازی تصویر (٪)"};

  return(<div className="panel"><h3>🎯 موتور مأموریت — الگوها و تنظیمات</h3>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[["templates","📐 الگوهای هر سمت"],["overrides","👤 مأموریت اختصاصی کاربر"],["settings","⚙ تنظیمات اجرای بازدید"],["visits","📑 گزارش بازدیدهای ثبت‌شده"]].map(([k,l])=>
        <button key={k} className={"btn "+(tab===k?"p":"g")} onClick={()=>{setTab(k);setMsg("");}}>{l}</button>)}
    </div>
    {msg&&<p style={{color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",marginBottom:10}}>{msg}</p>}

    {tab==="templates"&&<div>
      <div style={{border:"1px solid var(--line)",borderRadius:10,padding:12,marginBottom:16}}>
        <h4 style={{marginBottom:8}}>افزودن الگوی جدید</h4>
        <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:8}}>
          <div><label className="label">عنوان الگو</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثلاً الگوی روزانهٔ ناظر خط"/></div>
          <div><label className="label">سمت</label><select className="input" value={roleKey} onChange={e=>setRoleKey(e.target.value)}>
            {Object.entries(MISSION_ROLE_LABELS).filter(([k])=>k!=='administrative_visit'&&k!=='other').map(([k,l])=><option key={k} value={k}>{l}</option>)}
          </select></div>
          <div><label className="label">دوره</label><select className="input" value={period} onChange={e=>setPeriod(e.target.value)}>
            <option value="daily">روزانه</option><option value="weekly">هفتگی</option><option value="monthly">ماهانه</option></select></div>
          <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,marginTop:18}}><input type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)}/>الگوی پیش‌فرض این سمت</label>
        </div>
        <MissionTargetsEditor metrics={metrics} targets={targets} setTargets={setTargets}/>
        <button className="btn p" style={{marginTop:10}} onClick={saveTemplate}>ذخیرهٔ الگو</button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{fontSize:12.5,minWidth:560}}><thead><tr><th>عنوان</th><th>سمت</th><th>دوره</th><th>پیش‌فرض</th><th>تعداد اهداف</th><th></th></tr></thead>
        <tbody>{templates.map(t=>(<tr key={t.id}><td style={{fontWeight:700}}>{t.title}</td><td>{MISSION_ROLE_LABELS[t.role_key]||t.role_key}</td>
          <td style={{fontSize:11}}>{t.period==='daily'?'روزانه':t.period==='weekly'?'هفتگی':'ماهانه'}</td>
          <td>{Number(t.is_default)?'✓':'—'}</td><td>{fa((t.targets||[]).length)}</td>
          <td><button className="btn g" onClick={()=>delTemplate(t.id)}>حذف</button></td></tr>))}</tbody></table>
        {!templates.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>هنوز الگویی تعریف نشده است.</p>}
      </div>
    </div>}

    {tab==="overrides"&&<div>
      <div style={{border:"1px solid var(--line)",borderRadius:10,padding:12,marginBottom:16}}>
        <h4 style={{marginBottom:8}}>تعریف مأموریت اختصاصی برای یک کاربر</h4>
        <div className="row" style={{gap:8,marginBottom:8}}>
          <select className="input" style={{maxWidth:260}} value={ovUser} onChange={e=>setOvUser(e.target.value)}>
            <option value="">— انتخاب کاربر —</option>
            {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.role_title||''}</option>)}
          </select>
        </div>
        <MissionTargetsEditor metrics={metrics} targets={ovTargets} setTargets={setOvTargets}/>
        <button className="btn p" style={{marginTop:10}} onClick={saveOverride}>ذخیرهٔ مأموریت اختصاصی (روزانه)</button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>کاربر</th><th>دوره</th><th>تعداد اهداف</th><th></th></tr></thead>
        <tbody>{overrides.map(o=>(<tr key={o.id}><td style={{fontWeight:700}}>{o.user_name}</td><td style={{fontSize:11}}>{o.period}</td>
          <td>{fa((o.targets||[]).length)}</td><td><button className="btn g" onClick={()=>delOverride(o.user_id)}>حذف</button></td></tr>))}</tbody></table>
        {!overrides.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>مأموریت اختصاصی ثبت نشده است.</p>}
      </div>
    </div>}

    {tab==="settings"&&settings&&<div style={{maxWidth:480}}>
      {Object.keys(SETTINGS_LABELS).map(k=>(<div key={k} style={{marginBottom:10}}>
        <label className="label">{SETTINGS_LABELS[k]}</label>
        <input className="input" value={settings[k]??''} onChange={e=>setSettings({...settings,[k]:e.target.value})}/>
      </div>))}
      <button className="btn p" onClick={saveSettings}>ذخیرهٔ تنظیمات</button>
    </div>}

    {tab==="visits"&&<div>
      <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:10}}>
        <span className="label">از</span><JDate value={from} onChange={setFrom} jalali/>
        <span className="label">تا</span><JDate value={to} onChange={setTo} jalali/>
        <button className="btn p" onClick={loadVisits}>اعمال</button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{fontSize:12,minWidth:640}}><thead><tr><th>نیرو</th><th>سمت</th><th>خط</th><th>شروع</th><th>مدت (دقیقه)</th><th>تأییدشده</th><th>درصد اعتبارسنجی</th></tr></thead>
        <tbody>{(visitRows||[]).map((v,i)=>(<tr key={i}><td style={{fontWeight:700}}>{v.user_name}</td><td style={{fontSize:11,color:"var(--muted)"}}>{v.role_title||''}</td>
          <td style={{fontSize:11}}>{v.line_code} ({v.origin}–{v.destination})</td><td style={{fontSize:11}}>{fj(v.started_at)}</td>
          <td>{v.duration_minutes!=null?fa(Math.round(v.duration_minutes)):'—'}</td>
          <td>{Number(v.validated)?<span style={{color:"var(--ok)"}}>✓</span>:<span style={{color:"var(--danger)"}}>✗</span>}</td>
          <td>٪{fa(v.validation_percent)}</td></tr>))}</tbody></table>
        {visitRows&&!visitRows.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>بازدیدی در این بازه ثبت نشده است.</p>}
      </div>
    </div>}
  </div>);
}

function MissionTrendChart({userId,title,days}){
  const [data,setData]=useState(null);
  const ref=useRef();
  useEffect(()=>{ GET(`/admin/mission-trend?days=${days||30}`+(userId?`&user_id=${userId}`:"")).then(setData).catch(()=>setData(null)); },[userId,days]);
  useEffect(()=>{
    if(!data||!ref.current) return;
    const c=new Chart(ref.current,{type:"line",
      data:{labels:data.items.map(x=>x.jdate),
        datasets:[
          {label:"درصد تحقق",data:data.items.map(x=>x.achievement),borderColor:"#0d7a5f",backgroundColor:"rgba(13,122,95,.12)",fill:true,tension:.3,yAxisID:"y"},
          {label:"امتیاز روز",data:data.items.map(x=>x.score),borderColor:"#f6a623",backgroundColor:"rgba(246,166,35,.1)",fill:true,tension:.3,yAxisID:"y1"},
        ]},
      options:{plugins:{legend:{labels:{font:{family:"Vazirmatn"}}}},
        scales:{
          x:{ticks:{font:{family:"Vazirmatn"},maxRotation:0}},
          y:{position:"left",title:{display:true,text:"٪ تحقق",font:{family:"Vazirmatn"}},min:0,max:100,ticks:{font:{family:"Vazirmatn"}}},
          y1:{position:"right",title:{display:true,text:"امتیاز",font:{family:"Vazirmatn"}},grid:{drawOnChartArea:false},ticks:{font:{family:"Vazirmatn"}}},
        }}});
    return()=>c.destroy();
  },[data]);
  return(<div><h4 style={{marginBottom:8,fontSize:14}}>📈 {title||"روند ۳۰ روز گذشته"}</h4>
    {!data?<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>:<canvas ref={ref} height="90"></canvas>}
  </div>);
}

function CityOperationsDashboard(){
  const [date,setDate]=useState(todayJStr());
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const load=()=>{ setLoading(true); setErr("");
    GET("/admin/city-dashboard"+(date?`?date=${date}`:"")).then(setData).catch(e=>setErr(e.message)).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);
  const doPrint=()=>{
    if(!data) return;
    const tbl=(head,rows)=>`<table style="width:100%;border-collapse:collapse;margin:10px 0 22px;font-size:12px"><thead><tr>${head.map(h=>`<th style="border:1px solid #d0d5dd;padding:7px;background:#f2f4f7">${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td style="border:1px solid #d0d5dd;padding:7px;text-align:center">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const body=`
      <h3 style="font-size:13px;margin:14px 0 6px">پوشش کل شهر</h3>
      ${tbl(["پوشش","خودرو بررسی‌شده","کل خودرو","تعداد خطوط"],[[`٪${data.city_coverage.coverage_percent}`,data.city_coverage.checked_count,data.city_coverage.total_vehicles,data.city_coverage.lines_count]])}
      <h3 style="font-size:13px;margin:14px 0 6px">خطوط کم‌پوشش</h3>
      ${tbl(["خط","بررسی‌شده/کل","پوشش"],data.weak_lines.map(l=>[`${l.code} (${l.origin}–${l.destination})`,`${l.checked_count}/${l.total_vehicles}`,`٪${l.coverage_percent}`]))}
      <h3 style="font-size:13px;margin:14px 0 6px">عملکرد سمت‌ها</h3>
      ${tbl(["سمت","تعداد","میانگین تحقق","مجموع امتیاز"],data.role_summary.map(g=>[MISSION_ROLE_LABELS[g.role_key]||g.role_key,g.count,`٪${g.avg_achievement}`,g.total_score]))}
      <h3 style="font-size:13px;margin:14px 0 6px">مأموریت‌های ناقص</h3>
      ${tbl(["نام","سمت","تحقق"],data.incomplete_missions.items.map(r=>[r.name,r.role_title||"",`٪${Math.round(r.weighted_achievement)}`]))}
      <h3 style="font-size:13px;margin:14px 0 6px">کاربران برتر</h3>
      ${tbl(["رتبه","نام","امتیاز"],data.top_users.map(u=>[u.rank,u.user_name,Math.round(u.total_points*10)/10]))}
    `;
    printLetterhead("داشبورد مدیریتی عملیات میدانی — کل شهر",body,{subtitle:"تاریخ گزارش: "+date});
  };
  return(<div className="panel"><h3>🏙 داشبورد مدیریتی عملیات میدانی — کل شهر</h3>
    <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:14}}>
      <span className="label">تاریخ</span><JDate value={date} onChange={setDate} jalali/>
      <button className="btn p" onClick={load}>اعمال</button>
      <button className="btn g" onClick={doPrint} disabled={!data}>🖨 چاپ گزارش</button>
    </div>
    {err&&<p style={{color:"var(--danger)"}}>{err}</p>}
    {loading&&<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>}
    {data&&<>
      <div className="kpis" style={{marginBottom:18}}>
        <div className="kpi"><div className="n">٪{fa(data.city_coverage.coverage_percent)}</div><div className="l">پوشش کل شهر (چک‌لیست)</div></div>
        <div className="kpi"><div className="n">{fa(data.city_coverage.checked_count)}/{fa(data.city_coverage.total_vehicles)}</div><div className="l">خودرو بررسی‌شده از کل</div></div>
        <div className="kpi"><div className="n">{fa(data.city_coverage.lines_count)}</div><div className="l">تعداد خطوط فعال</div></div>
        <div className="kpi"><div className="n">{fa(data.incomplete_missions.count)}</div><div className="l">مأموریت ناقص امروز</div></div>
      </div>

      <button className="btn g" style={{marginBottom:14}} onClick={()=>{
        if(typeof XLSX==='undefined'){alert('کتابخانه خروجی Excel بارگذاری نشده است');return;}
        const wb=XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.weak_lines.map(l=>({'خط':l.code,'مبدأ':l.origin,'مقصد':l.destination,'بررسی‌شده':l.checked_count,'کل خودرو':l.total_vehicles,'پوشش (٪)':l.coverage_percent}))),"خطوط کم‌پوشش".slice(0,31));
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.role_summary.map(g=>({'سمت':MISSION_ROLE_LABELS[g.role_key]||g.role_key,'تعداد نفرات':g.count,'میانگین تحقق (٪)':g.avg_achievement,'مجموع امتیاز':g.total_score}))),"عملکرد سمت‌ها".slice(0,31));
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.incomplete_missions.items.map(r=>({'نام':r.name,'سمت':r.role_title||MISSION_ROLE_LABELS[r.role_key]||r.role_key,'خطوط بازدیدشده':r.visited_lines,'خطوط تخصیص‌یافته':r.assigned_lines,'تحقق (٪)':Math.round(r.weighted_achievement)}))),"مأموریت ناقص".slice(0,31));
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.top_users.map(r=>({'رتبه':r.rank,'نام':r.user_name,'امتیاز':Math.round(r.total_points*10)/10}))),"کاربران برتر".slice(0,31));
        XLSX.writeFile(wb,`داشبورد_کل_شهر_${date}.xlsx`);
      }}>⤓ خروجی اکسل کامل گزارش</button>

      <div style={{marginBottom:18,background:"#fff",border:"1px solid var(--line)",borderRadius:10,padding:14}}>
        <MissionTrendChart title="روند میانگین تحقق مأموریت و مجموع امتیاز کل شهر (۳۰ روز)"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>
        <div>
          <h4 style={{marginBottom:8,fontSize:14}}>⚠ خطوط کم‌پوشش (۱۰ خط ضعیف‌تر)</h4>
          <div style={{overflowX:"auto"}}>
            <table style={{fontSize:12,minWidth:280}}><thead><tr><th>خط</th><th>خودرو</th><th>پوشش</th></tr></thead>
            <tbody>{data.weak_lines.map(l=>(<tr key={l.id}><td style={{fontWeight:700}}>{l.code} ({l.origin}–{l.destination})</td>
              <td>{fa(l.checked_count)}/{fa(l.total_vehicles)}</td>
              <td style={{fontWeight:800,color:l.coverage_percent>=70?"var(--ok)":l.coverage_percent>=40?"#c99b23":"var(--danger)"}}>٪{fa(l.coverage_percent)}</td></tr>))}</tbody></table>
            {!data.weak_lines.length&&<p style={{color:"var(--muted)",padding:10}}>خطی با خودروی ثبت‌شده یافت نشد.</p>}
          </div>
        </div>
        <div>
          <h4 style={{marginBottom:8,fontSize:14}}>🏆 کاربران برتر امروز</h4>
          <div style={{overflowX:"auto"}}>
            <table style={{fontSize:12,minWidth:260}}><thead><tr><th>رتبه</th><th>نام</th><th>امتیاز</th></tr></thead>
            <tbody>{data.top_users.map(r=>(<tr key={r.user_id}><td>{r.rank<=3?["🥇","🥈","🥉"][r.rank-1]:fa(r.rank)}</td>
              <td style={{fontWeight:700}}>{r.user_name}</td><td style={{fontWeight:800,color:"var(--ok)"}}>{fa(Math.round(r.total_points*10)/10)}</td></tr>))}</tbody></table>
            {!data.top_users.length&&<p style={{color:"var(--muted)",padding:10}}>امتیازی برای این تاریخ ثبت نشده است.</p>}
          </div>
        </div>
      </div>

      <h4 style={{marginBottom:8,fontSize:14}}>👮 عملکرد گشت‌ها و ناظران بر اساس سمت</h4>
      <div style={{overflowX:"auto",marginBottom:18}}>
        <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>سمت</th><th>تعداد نفرات</th><th>میانگین تحقق</th><th>مجموع امتیاز</th></tr></thead>
        <tbody>{data.role_summary.map(g=>(<tr key={g.role_key}><td style={{fontWeight:700}}>{MISSION_ROLE_LABELS[g.role_key]||g.role_key}</td>
          <td>{fa(g.count)}</td><td>٪{fa(g.avg_achievement)}</td><td>{fa(Math.round(g.total_score*10)/10)}</td></tr>))}</tbody></table>
      </div>

      <h4 style={{marginBottom:8,fontSize:14}}>🚫 مأموریت‌های ناقص (تحقق زیر ۵۰٪)</h4>
      <div style={{overflowX:"auto"}}>
        <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>نام</th><th>سمت</th><th>خطوط بازدیدشده</th><th>تحقق</th></tr></thead>
        <tbody>{data.incomplete_missions.items.map(r=>(<tr key={r.user_id}><td style={{fontWeight:700}}>{r.name}</td>
          <td style={{fontSize:11,color:"var(--muted)"}}>{r.role_title||MISSION_ROLE_LABELS[r.role_key]||r.role_key}</td>
          <td>{fa(r.visited_lines||0)}/{fa(r.assigned_lines||0)}</td>
          <td style={{fontWeight:800,color:"var(--danger)"}}>٪{fa(Math.round(r.weighted_achievement))}</td></tr>))}</tbody></table>
        {!data.incomplete_missions.items.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>مأموریت ناقصی برای این تاریخ ثبت نشده — عالی‌ست 🎉</p>}
      </div>
    </>}
  </div>);
}

function ScoreEngineAdmin(){
  const [tab,setTab]=useState("rules");
  const [rules,setRules]=useState(null);
  const [roleCo,setRoleCo]=useState(null);
  const [lineCo,setLineCo]=useState(null);
  const [date,setDate]=useState(todayJStr());
  const [daily,setDaily]=useState(null);
  const [adjUser,setAdjUser]=useState(null);
  const [adjForm,setAdjForm]=useState(null);
  const [lbPeriod,setLbPeriod]=useState("daily");
  const [leaderboard,setLeaderboard]=useState(null);
  const [badgeList,setBadgeList]=useState(null);
  const [msg,setMsg]=useState("");

  const loadRules=()=>GET("/admin/score-rules").then(r=>setRules(r.items||[])).catch(()=>{});
  const loadRoleCo=()=>GET("/admin/role-score-coefficients").then(r=>setRoleCo(r.items||[])).catch(()=>{});
  const loadLineCo=()=>GET("/admin/line-score-coefficients").then(r=>setLineCo(r.items||[])).catch(()=>{});
  const loadDaily=()=>GET("/admin/score-daily"+(date?`?date=${date}`:"")).then(setDaily).catch(()=>setDaily({items:[]}));
  const loadLeaderboard=()=>{ GET("/leaderboard?period="+lbPeriod).then(setLeaderboard).catch(()=>setLeaderboard({items:[]}));
    GET("/admin/badges?period_type="+lbPeriod).then(r=>setBadgeList(r.items||[])).catch(()=>setBadgeList([])); };

  useEffect(()=>{ loadRules(); },[]);
  useEffect(()=>{ if(tab==="roles"&&!roleCo)loadRoleCo(); if(tab==="lines"&&!lineCo)loadLineCo(); if(tab==="daily")loadDaily(); if(tab==="leaderboard")loadLeaderboard(); },[tab]);
  useEffect(()=>{ if(tab==="leaderboard") loadLeaderboard(); },[lbPeriod]);

  const saveRules=async()=>{ setMsg("");
    try{ await SEND("PUT","/admin/score-rules",{items:rules.map(r=>({rule_key:r.rule_key,base_points:r.base_points,is_active:r.is_active}))}); setMsg("✓ ذخیره شد"); }
    catch(e){ setMsg(e.message||"خطا"); } };
  const saveRoleCo=async()=>{ setMsg("");
    try{ await SEND("PUT","/admin/role-score-coefficients",{items:roleCo}); setMsg("✓ ذخیره شد"); }
    catch(e){ setMsg(e.message||"خطا"); } };
  const saveLineCo=async()=>{ setMsg("");
    try{ await SEND("PUT","/admin/line-score-coefficients",{items:lineCo}); setMsg("✓ ذخیره شد"); }
    catch(e){ setMsg(e.message||"خطا"); } };

  return(<div className="panel"><h3>🏆 موتور امتیازدهی نیروهای میدانی</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>امتیاز نهایی هر ردیف = امتیاز پایه × ضریب سمت × میانگین ضریب سختی خطوط تخصیص‌یافته. محاسبه به‌صورت خودکار و روزانه، هم‌زمان با بارگذاری «مأموریت روزانه» یا «برنامه بازدید» هر کاربر انجام می‌شود.</p>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[["rules","📐 قوانین امتیاز"],["roles","👤 ضریب سمت‌ها"],["lines","🛣 ضریب سختی خطوط"],["daily","📊 جدول امتیازات روزانه"],["leaderboard","🏆 رتبه‌بندی و نشان‌ها"]].map(([k,l])=>
        <button key={k} className={"btn "+(tab===k?"p":"g")} onClick={()=>{setTab(k);setMsg("");}}>{l}</button>)}
    </div>
    {msg&&<p style={{color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",marginBottom:10}}>{msg}</p>}

    {tab==="rules"&&rules&&<div style={{overflowX:"auto"}}>
      <table style={{fontSize:12.5,minWidth:560}}><thead><tr><th>عنوان</th><th>نوع</th><th>امتیاز پایه</th><th>فعال</th></tr></thead>
      <tbody>{rules.map((r,i)=>(<tr key={r.rule_key}><td style={{fontWeight:700}}>{r.title}</td>
        <td style={{color:Number(r.is_negative)?"var(--danger)":"var(--ok)",fontSize:11}}>{Number(r.is_negative)?"منفی":"مثبت"}</td>
        <td><input className="input" type="number" step={0.5} style={{maxWidth:90}} value={r.base_points}
          onChange={e=>{ const a=[...rules]; a[i]={...a[i],base_points:e.target.value}; setRules(a); }}/></td>
        <td><input type="checkbox" checked={!!Number(r.is_active)} onChange={e=>{ const a=[...rules]; a[i]={...a[i],is_active:e.target.checked?1:0}; setRules(a); }}/></td>
      </tr>))}</tbody></table>
      <button className="btn p" style={{marginTop:10}} onClick={saveRules}>ذخیرهٔ قوانین</button>
    </div>}

    {tab==="roles"&&roleCo&&<div style={{maxWidth:420}}>
      {roleCo.map((r,i)=>(<div key={r.role_key} className="row" style={{gap:8,alignItems:"center",marginBottom:8}}>
        <span style={{minWidth:140}}>{MISSION_ROLE_LABELS[r.role_key]||r.role_key}</span>
        <input className="input" type="number" step={0.1} style={{maxWidth:100}} value={r.coefficient}
          onChange={e=>{ const a=[...roleCo]; a[i]={...a[i],coefficient:e.target.value}; setRoleCo(a); }}/>
      </div>))}
      <button className="btn p" onClick={saveRoleCo}>ذخیرهٔ ضرایب سمت‌ها</button>
    </div>}

    {tab==="lines"&&lineCo&&<div style={{overflowX:"auto"}}>
      <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>خط</th><th>ضریب سختی</th><th>یادداشت</th></tr></thead>
      <tbody>{lineCo.map((l,i)=>(<tr key={l.line_id}><td style={{fontWeight:700}}>{l.code} ({l.origin}–{l.destination})</td>
        <td><input className="input" type="number" step={0.1} style={{maxWidth:90}} value={l.coefficient}
          onChange={e=>{ const a=[...lineCo]; a[i]={...a[i],coefficient:e.target.value}; setLineCo(a); }}/></td>
        <td><input className="input" value={l.note||''} onChange={e=>{ const a=[...lineCo]; a[i]={...a[i],note:e.target.value}; setLineCo(a); }}/></td>
      </tr>))}</tbody></table>
      <button className="btn p" style={{marginTop:10}} onClick={saveLineCo}>ذخیرهٔ ضرایب خطوط</button>
    </div>}

    {tab==="daily"&&<div>
      <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:10}}>
        <span className="label">تاریخ</span><JDate value={date} onChange={setDate} jalali/>
        <button className="btn p" onClick={loadDaily}>اعمال</button>
      </div>
      {daily&&<div style={{overflowX:"auto"}}>
        <table style={{fontSize:12.5,minWidth:480}}><thead><tr><th>نیرو</th><th>سمت</th><th>مجموع امتیاز روز</th><th></th></tr></thead>
        <tbody>{(daily.items||[]).sort((a,b)=>b.total_points-a.total_points).map(u=>(<React.Fragment key={u.user_id}><tr>
          <td style={{fontWeight:700}}>{u.user_name}</td><td style={{fontSize:11,color:"var(--muted)"}}>{u.role_title||''}</td>
          <td style={{fontWeight:800,color:u.total_points>=0?"var(--ok)":"var(--danger)"}}>{fa(Math.round(u.total_points*10)/10)}</td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>setAdjUser(adjUser===u.user_id?null:u.user_id)}>جزئیات</button></td>
        </tr>
        {adjUser===u.user_id&&<tr><td colSpan={4} style={{background:"#fafbfc",padding:12}}>
          <table style={{fontSize:12,width:"100%"}}><thead><tr><th>مورد</th><th>تعداد</th><th>امتیاز</th><th></th></tr></thead>
          <tbody>{u.items.map((it,ix)=>{
            const rule=rules?.find(rr=>rr.rule_key===it.rule_key);
            const isAdjEditing=adjForm&&adjForm.user_id===u.user_id&&adjForm.rule_key===it.rule_key;
            return(<tr key={ix}>
              <td>{rule?.title||it.rule_key}{Number(it.is_adjusted)===1&&<span title={it.adjustment_reason||''} style={{color:"var(--brand)",fontSize:10,marginRight:4}}> ✎ تعدیل‌شده</span>}</td>
              <td>{fa(Math.round(it.count*10)/10)}</td>
              <td style={{fontWeight:700,color:it.points>=0?"var(--ok)":"var(--danger)"}}>{fa(Math.round(it.points*10)/10)}</td>
              <td>{Number(it.points)<0&&!isAdjEditing&&<button className="btn g" style={{fontSize:10,padding:"2px 6px"}} onClick={()=>setAdjForm({user_id:u.user_id,rule_key:it.rule_key,points:it.points,reason:""})}>بازبینی</button>}
                {isAdjEditing&&<div className="row" style={{gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <input className="input" type="number" step={0.5} style={{maxWidth:80}} value={adjForm.points} onChange={e=>setAdjForm({...adjForm,points:e.target.value})}/>
                  <input className="input" placeholder="دلیل بازبینی (الزامی)" style={{maxWidth:220}} value={adjForm.reason} onChange={e=>setAdjForm({...adjForm,reason:e.target.value})}/>
                  <button className="btn p" style={{fontSize:11}} onClick={async()=>{
                    if(!adjForm.reason.trim()){alert('دلیل بازبینی الزامی است');return;}
                    try{ await SEND('POST','/admin/score-daily/adjust',{user_id:adjForm.user_id,score_date:date,rule_key:adjForm.rule_key,adjusted_points:adjForm.points,reason:adjForm.reason});
                      setAdjForm(null); loadDaily(); }catch(e){alert(e.message||'خطا در ثبت بازبینی');}
                  }}>ثبت</button>
                  <button className="btn g" style={{fontSize:11}} onClick={()=>setAdjForm(null)}>انصراف</button>
                </div>}
              </td>
            </tr>);})}</tbody></table>
        </td></tr>}
        </React.Fragment>))}</tbody></table>
        {!daily.items?.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>برای این تاریخ امتیازی محاسبه نشده است.</p>}
      </div>}
    </div>}

    {tab==="leaderboard"&&<div>
      <div className="row" style={{gap:8,marginBottom:14}}>
        {[["daily","روزانه"],["weekly","هفتگی (شمسی)"],["monthly","ماهانه (شمسی)"]].map(([k,l])=>
          <button key={k} className={"btn "+(lbPeriod===k?"p":"g")} onClick={()=>setLbPeriod(k)}>{l}</button>)}
      </div>
      {leaderboard&&<div style={{overflowX:"auto",marginBottom:16}}>
        <p style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>بازهٔ: {leaderboard.from} تا {leaderboard.to}</p>
        <table style={{fontSize:12.5,minWidth:480}}><thead><tr><th>رتبه</th><th>نیرو</th><th>سمت</th><th>مجموع امتیاز</th></tr></thead>
        <tbody>{(leaderboard.items||[]).map(r=>(<tr key={r.user_id} style={r.rank<=3?{background:"#fff8e6"}:{}}>
          <td style={{fontWeight:800}}>{r.rank<=3?["🥇","🥈","🥉"][r.rank-1]:fa(r.rank)}</td>
          <td style={{fontWeight:700}}>{r.user_name}</td><td style={{fontSize:11,color:"var(--muted)"}}>{r.role_title||''}</td>
          <td style={{fontWeight:800,color:r.total_points>=0?"var(--ok)":"var(--danger)"}}>{fa(Math.round(r.total_points*10)/10)}</td>
        </tr>))}</tbody></table>
        {!leaderboard.items?.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>در این بازه امتیازی ثبت نشده است.</p>}
      </div>}
      <h4 style={{marginBottom:8,fontSize:14}}>🏅 نشان‌های اعطاشده در این بازه</h4>
      <div style={{overflowX:"auto"}}>
        <table style={{fontSize:12.5,minWidth:420}}><thead><tr><th>نیرو</th><th>نشان</th><th>دورهٔ اعطا</th><th>تاریخ اعطا</th></tr></thead>
        <tbody>{(badgeList||[]).map((b,i)=>(<tr key={i}><td style={{fontWeight:700}}>{b.user_name}</td>
          <td>{({gold:"🥇 نفر اول",silver:"🥈 نفر دوم",bronze:"🥉 نفر سوم",discipline:"🛡 انضباط",best_report:"📷 بهترین گزارش"})[b.badge_key]||b.badge_key}</td>
          <td style={{fontSize:11}}>{b.period_key}</td><td style={{fontSize:11,color:"var(--muted)"}}>{fj(b.awarded_at)}</td></tr>))}</tbody></table>
        {!badgeList?.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>هنوز نشانی در این بازه اعطا نشده است (نشان‌ها پایان روز/هفته/ماه به‌صورت خودکار محاسبه می‌شوند).</p>}
      </div>
    </div>}
  </div>);
}

function PersonnelPerformance(){
  const tj=todayJ();
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false);
  const qs=()=>{ const p=[]; if(from)p.push("from="+from); if(to)p.push("to="+to); return p.length?("?"+p.join("&")):""; };
  const load=()=>{ setLoading(true); GET("/admin/personnel-performance"+qs()).then(setData).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);
  const exportExcel=()=>{ if(!data)return;
    const cols=["نام","سمت","چک‌لیست","حضور راننده","تذکر","حضور مسئول","گزارش","پیامک ارسالی","پیامک آبونمان","کلیک پرداخت قبض","پرداخت موفق (۷ روز)","مجموع فعالیت"];
    const rows=data.people.map(p=>[p.name,p.role_title||"",p.checklists,p.driver_attendances,p.notices,p.official_visits,p.reports,p.sms_total||0,p.sms_abonman||0,p.bill_pay_clicks||0,p.bill_pay_effective||0,p.total]);
    const ws=XLSX.utils.aoa_to_sheet([cols,...rows]); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"عملکرد پرسنل"); XLSX.writeFile(wb,"عملکرد_پرسنل.xlsx"); };
  return(<div className="panel"><h3>گزارش عملکرد پرسنل</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>تعداد فعالیت‌های هر نیرو در بازهٔ انتخابی شامل چک‌لیست، حضور، تذکر، گزارش، پیامک‌های ارسالی و عملکرد پرداخت قبض. خالی گذاشتن تاریخ = کل دوره.</p>
    <div className="filters" style={{flexWrap:"wrap",gap:8}}>
      <span className="label">از</span><JDate value={from} onChange={setFrom} jalali/>
      <span className="label">تا</span><JDate value={to} onChange={setTo} jalali/>
      <button className="btn p" onClick={load}>اعمال</button>
      <button className="btn g" onClick={()=>{setFrom("");setTo("");setTimeout(load,0);}}>کل دوره</button>
      <button className="btn g" onClick={exportExcel} disabled={!data}>⤓ خروجی اکسل</button>
    </div>
    {loading&&<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>}
    {data&&<div style={{overflowX:"auto",marginTop:10}}>
      <table style={{fontSize:12.5,minWidth:980}}>
        <thead><tr><th>نام</th><th>سمت</th><th>چک‌لیست</th><th>حضور راننده</th><th>تذکر</th><th>حضور مسئول</th><th>گزارش</th><th>پیامک</th><th>آبونمان</th><th>کلیک پرداخت</th><th>پرداخت موفق</th><th>مجموع</th></tr></thead>
        <tbody>{data.people.map((p,i)=><tr key={i} style={i<3?{background:"#f0faf6"}:{}}>
          <td style={{fontWeight:700}}>{p.name}</td><td style={{fontSize:11,color:"var(--muted)"}}>{p.role_title||"—"}</td>
          <td>{fa(p.checklists)}</td><td>{fa(p.driver_attendances)}</td><td>{fa(p.notices)}</td>
          <td>{fa(p.official_visits)}</td><td>{fa(p.reports)}</td>
          <td>{fa(p.sms_total||0)}</td><td>{fa(p.sms_abonman||0)}</td><td>{fa(p.bill_pay_clicks||0)}</td><td style={{color:"#16a06a",fontWeight:700}}>{fa(p.bill_pay_effective||0)}</td>
          <td style={{fontWeight:800,color:"var(--brand)"}}>{fa(p.total)}</td></tr>)}</tbody>
      </table>
      {data.people.length===0&&<p style={{color:"var(--muted)",textAlign:"center",padding:20}}>داده‌ای یافت نشد.</p>}
    </div>}
  </div>);
}

function Reporting(){
  const TYPES={attendance:"حضور رانندگان",notices:"تذکرات",checklists:"چک‌لیست‌ها",bills:"بدهی آبونمان",presence_violations:"تخلفات عدم صحت‌سنجی حضور"};
  const [type,setType]=useState("attendance"); const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [person,setPerson]=useState("");
  const [cur,setCur]=useState({cols:[],rows:[]}); const [loaded,setLoaded]=useState(false); const [loading,setLoading]=useState(false);
  const load=()=>{ setLoading(true); db.report(type,from,to,person).then(d=>{setCur(d||{cols:[],rows:[]});setLoaded(true);}).catch(()=>{}).finally(()=>setLoading(false)); };
  // به‌صورت خودکار بارگذاری نمی‌شود؛ تا کاربر فیلتر/جستجو نزند چیزی نمایش داده نمی‌شود (سرعت بیشتر)
  const jcell=(c)=>{ const s=String(c); return /^\d{4}-\d{2}-\d{2}/.test(s)?fj(s):c; };
  const jrows=cur.rows.map(r=>r.map(jcell));
  const shownRows=jrows.filter(r=>!person||r.join("").includes(person));
  const exportExcel=()=>{ const ws=XLSX.utils.aoa_to_sheet([cur.cols,...shownRows]); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,TYPES[type]); XLSX.writeFile(wb,`گزارش_${TYPES[type]}.xlsx`); };
  const printPdf=()=>{ const a=document.getElementById("print-area");
    a.innerHTML=`<div style="padding:24px;font-family:Vazirmatn"><h2 style="text-align:center">گزارش ${TYPES[type]}</h2>
      <p style="text-align:center;color:#666">سامانه مدیریت و نظارت بر خطوط و نیروهای اجرایی تاکسیرانی — ${new Date().toLocaleDateString("fa-IR")}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px"><thead><tr>${cur.cols.map(c=>`<th style="border:1px solid #ccc;padding:8px;background:#eef1f7">${c}</th>`).join("")}</tr></thead>
      <tbody>${shownRows.map(r=>`<tr>${r.map(c=>`<td style="border:1px solid #ccc;padding:8px;text-align:center">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    window.print(); };
  return(<div className="panel"><h3>گزارش‌گیری پیشرفته</h3>
    <div className="filters no-print">
      <select value={type} onChange={e=>setType(e.target.value)}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      <JDate value={from} onChange={setFrom} placeholder="از تاریخ"/>
      <JDate value={to} onChange={setTo} placeholder="تا تاریخ"/>
      <input placeholder="نام شخص…" value={person} onChange={e=>setPerson(e.target.value)}/>
      <button className="btn g" onClick={load}>اعمال فیلتر</button>
      <button className="btn p" onClick={exportExcel} disabled={!loaded}>⬇ خروجی Excel</button>
      <button className="btn t" onClick={printPdf} disabled={!loaded}>🖨 چاپ / PDF</button></div>
    {loading?<p className="muted" style={{textAlign:"center",padding:"30px 0"}}>در حال بارگذاری…</p>
     :!loaded?<div style={{textAlign:"center",padding:"40px 16px",color:"var(--muted)"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔎</div>
        <p>برای نمایش گزارش، نوع گزارش و بازهٔ تاریخ را انتخاب کنید و «اعمال فیلتر» را بزنید.</p></div>
     :<table><thead><tr>{cur.cols.map((c,i)=><th key={i}>{c}</th>)}</tr></thead>
      <tbody>{shownRows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>خروجی Excel یک فایل xlsx واقعی می‌سازد؛ «چاپ/PDF» از قالب چاپی استفاده می‌کند.</p></div>);
}

// مدیریت فیلدهای سفارشی پرسنل (تعریف فیلد دلخواه برای اطلاعات کارکنان)
// تنظیم آیتم‌های قابل نمایش اپ برای هر سمت (نقش)
// نمای مستقل آیتم‌های اپ هر سمت (در سایدبار)
function ReportsCenter(){
  const CATS=[
    {t:"عملیات میدانی",items:[
      ["missiondashboard","🧭","داشبورد عملیات میدانی","تحقق مأموریت روزانهٔ همهٔ نیروهای میدانی"],
      ["citydashboard","🏙","داشبورد مدیریتی کل‌شهر","پوشش کل شهر، خطوط ضعیف، مأموریت‌های ناقص، برترین‌ها"],
      ["missiontemplates","🎯","گزارش بازدید خطوط","لیست کامل بازدیدهای ثبت‌شده با وضعیت اعتبارسنجی (تب «گزارش بازدید»)"],
      ["scoreengine","🏆","امتیازات و رتبه‌بندی","جدول امتیاز روزانه، رتبه‌بندی و نشان‌های اعطاشده"],
    ]},
    {t:"پرسنل و حضور",items:[
      ["perfreport","🏆","عملکرد پرسنل","امتیازدهی و رتبه‌بندی ماهانهٔ نیروها بر اساس شاخص‌های کاری"],
      ["attreport","🕒","تردد پرسنل","ورود/خروج و ساعات کاری ثبت‌شده"],
      ["useract","⏱","فعالیت کاربران","لاگ کامل اقدامات هر کاربر در سامانه"],
      ["commitments","📋","تعهدات انضباطی","سوابق تعهدنامه و برخورد انضباطی پرسنل"],
      ["shifts","🗓","شیفت و کارکرد","برنامهٔ شیفت‌ها و محاسبهٔ کارکرد"],
    ]},
    {t:"تاکسیرانی",items:[
      ["driverservicereport","📈","عملکرد و تذکرات تاکسیران","سابقهٔ کامل هر راننده: حضور، چک‌لیست، تذکر"],
      ["reports","✉","گردش گزارش‌ها","گزارش‌های ارسالی/دریافتی بین نیروها"],
      ["report","📊","گزارش‌گیری پیشرفته","ساخت گزارش سفارشی با فیلتر و خروجی اکسل"],
    ]},
    {t:"مالی و ارتباطات",items:[
      ["salaryslips","💳","فیش‌های حقوقی بارگذاری‌شده","آرشیو فیش‌های حقوقی هر کاربر"],
      ["smslog","📜","تاریخچهٔ پیامک","سوابق کامل پیامک‌های ارسالی سامانه"],
    ]},
  ];
  return(<div className="panel"><h3>🗂 مرکز گزارش‌ها</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:18}}>همهٔ گزارش‌های سامانه در یک نگاه، دسته‌بندی‌شده. روی هرکدام بزنید تا مستقیم باز شود.</p>
    {CATS.map(cat=>(<div key={cat.t} style={{marginBottom:22}}>
      <h4 style={{fontSize:14,marginBottom:10,color:"var(--brand)"}}>{cat.t}</h4>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
        {cat.items.map(([key,ic,title,desc])=>(
          <button key={key} onClick={()=>window.__navigateTo&&window.__navigateTo(key)}
            style={{textAlign:"right",cursor:"pointer",border:"1px solid var(--line)",borderRadius:12,padding:14,background:"#fff",display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{display:"block"}}>
              <span style={{display:"block",fontWeight:800,fontSize:13,color:"var(--ink)"}}>{title}</span>
              <span style={{display:"block",fontSize:11,color:"var(--muted)",marginTop:4,lineHeight:1.7}}>{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>))}
  </div>);
}

function ActiveSessionsView(){
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [q,setQ]=useState("");
  const load=()=>{ setLoading(true); GET("/admin/active-sessions").then(setData).catch(()=>setData({items:[],count:0})).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);
  const revoke=async(userId,type,name)=>{
    if(!confirm(`نشست ${type==='android'?'اندروید':'وب'} کاربر «${name}» قطع شود؟ کاربر باید دوباره وارد شود.`)) return;
    await db.revokeDevice(userId,type); load();
  };
  const items=(data?.items||[]).filter(r=>!q||r.user_name.includes(q)||(r.device_model||'').includes(q));
  return(<div className="panel"><h3>🔐 جلسات فعال کاربران</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:12}}>هر کاربر می‌تواند هم‌زمان یک نشست اندروید و یک نشست وب داشته باشد. اگر مشکوک به دسترسی غیرمجاز هستید، می‌توانید هر نشست را از راه دور قطع کنید — کاربر بلافاصله باید دوباره وارد شود.</p>
    <div className="row" style={{gap:8,marginBottom:12}}>
      <input className="input" style={{maxWidth:260}} placeholder="جست‌وجوی نام یا مدل دستگاه…" value={q} onChange={e=>setQ(e.target.value)}/>
      <button className="btn p" onClick={load}>بروزرسانی</button>
      <span style={{fontSize:12,color:"var(--muted)",alignSelf:"center"}}>{data?fa(items.length)+" نشست فعال":""}</span>
    </div>
    {loading&&<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>}
    {data&&<div style={{overflowX:"auto"}}>
      <table style={{fontSize:12.5,minWidth:560}}><thead><tr><th>کاربر</th><th>سمت</th><th>نوع دستگاه</th><th>مدل/شناسه</th><th>زمان ورود</th><th></th></tr></thead>
      <tbody>{items.map(s=>(<tr key={s.id}>
        <td style={{fontWeight:700}}>{s.user_name}</td>
        <td style={{fontSize:11,color:"var(--muted)"}}>{s.role_title||""}</td>
        <td>{s.device_type==='android'?"📱 اندروید":s.device_type==='web'?"🖥 وب":s.device_type}</td>
        <td style={{fontSize:11,fontFamily:"monospace"}}>{s.device_model||s.device_id||"—"}</td>
        <td style={{fontSize:11}}>{fj(s.created_at)}</td>
        <td><button className="btn g" onClick={()=>revoke(s.user_id,s.device_type,s.user_name)}>قطع نشست</button></td>
      </tr>))}</tbody></table>
      {!items.length&&<p style={{color:"var(--muted)",textAlign:"center",padding:16}}>نشست فعالی یافت نشد.</p>}
    </div>}
  </div>);
}

function CronStatusView(){
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  const [origin,setOrigin]=useState("");
  const load=()=>{ setLoading(true); setErr("");
    GET("/admin/cron-status").then(setData).catch(e=>setErr(e.message)).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); try{ setOrigin(window.location.origin.replace(/\/$/,"")); }catch(e){} },[]);
  const STATUS_META={
    ok:{ic:"✅",t:"سالم — طبق زمان‌بندی اجرا شده",color:"var(--ok)"},
    late:{ic:"⏰",t:"دیرکرد — احتمالاً در کنترل‌پنل هاست تنظیم نشده یا زمان‌بندی‌اش اشتباه است",color:"#c99b23"},
    never_run:{ic:"❌",t:"هرگز اجرا نشده — در کنترل‌پنل هاست اضافه نشده است",color:"var(--danger)"},
    error:{ic:"🛑",t:"آخرین اجرا با خطا مواجه شده",color:"var(--danger)"},
  };
  return(<div className="panel"><h3>⏱ پایش سلامت کرون‌های سامانه</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:6}}>هر ردیف یکی از فایل‌های Cron موجود در پروژه است. برای اضافه‌کردن هرکدام در cPanel → Cron Jobs،
      دستور را با مسیر واقعی فایل روی هاست خودتان جایگزین کنید (این فایل‌ها کنار index.php هستند):</p>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:14,fontFamily:"monospace",background:"var(--bg2,#f4f6f9)",padding:8,borderRadius:8}}>
      /usr/local/bin/php {origin?origin.replace(/^https?:\/\//,"/home/کاربر-هاست/public_html/"):"/home/.../public_html/"}[نام‌فایل].php
    </p>
    <button className="btn p" onClick={load} style={{marginBottom:14}}>بروزرسانی وضعیت</button>
    {err&&<p style={{color:"var(--danger)"}}>{err}</p>}
    {loading&&<p style={{color:"var(--muted)"}}>در حال بارگذاری…</p>}
    {data&&<div style={{overflowX:"auto"}}>
      <table style={{fontSize:12.5,minWidth:720}}><thead><tr><th>وضعیت</th><th>نام فایل</th><th>کار</th><th>زمان‌بندی پیشنهادی</th><th>آخرین اجرا</th><th>تعداد اجرا</th></tr></thead>
      <tbody>{data.items.map(c=>{ const m=STATUS_META[c.status]||STATUS_META.never_run;
        return(<tr key={c.key}>
          <td><span title={m.t} style={{color:m.color,fontWeight:800}}>{m.ic}</span></td>
          <td style={{fontWeight:700,fontFamily:"monospace"}}>{c.file}</td>
          <td>{c.title}{c.optional_bundle&&<span style={{fontSize:10,color:"var(--muted)"}}> (اختیاری/جایگزین)</span>}</td>
          <td style={{fontSize:11}}>{c.schedule}</td>
          <td style={{fontSize:11}}>{c.last_run_at?`${fj(c.last_run_at)} (${c.minutes_since<60?fa(c.minutes_since)+' دقیقه پیش':c.minutes_since<1440?fa(Math.round(c.minutes_since/60))+' ساعت پیش':fa(Math.round(c.minutes_since/1440))+' روز پیش'})`:"—"}</td>
          <td>{fa(c.run_count)}</td>
        </tr>);})}</tbody></table>
      <div style={{marginTop:14,fontSize:12,color:"var(--muted)",lineHeight:2}}>
        <div>✅ سالم — در بازهٔ منتظره اجرا شده · ⏰ دیرکرد — بیشتر از حد انتظار از آخرین اجرا گذشته، زمان‌بندی‌اش را در کنترل‌پنل هاست بررسی کنید ·
        ❌ هرگز اجرا نشده — احتمالاً این فایل هنوز به Cron Jobs هاست اضافه نشده · 🛑 خطا — آخرین اجرا با خطا مواجه شده (روی مشکل کلیک/هاور کنید)</div>
        <div style={{marginTop:6}}>نکته: کارهای «sms-expiry, push-expiry, birthday, cleanup» را می‌توانید تک‌تک یا یک‌جا با فایل <code>cron_daily.php</code> اجرا کنید — هرکدام را استفاده کنید، وضعیتش در همین جدول جداگانه ثبت می‌شود.</div>
      </div>
    </div>}
  </div>);
}

function RoleAppItemsView(){
  return(<div className="panel"><h3>📱 آیتم‌های قابل نمایش اپ بر اساس سمت</h3><RoleAppItems/></div>);
}

function RoleAppItems(){
  // منبع حقیقت آیتم‌های اپ: باید دقیقاً با MainStack در mobile/App.js یکسان باشد.
  const ITEMS=[
    ["Dashboard","داشبورد"],["Search","جستجوی تاکسی و تاکسیران"],["Driver","اطلاعات راننده"],["Vehicle","اطلاعات خودرو"],["Debt","بدهی آبونمان"],["Checklist","چک‌لیست خودرو"],["Notice","ثبت تذکر"],["Reports","ارسال گزارش"],["Sms","ارسال پیامک به رانندگان"],["BotMessages","ارسال پیام در ربات‌ها"],["Requests","درخواست‌ها"],["RequestInbox","کارتابل تأیید درخواست‌ها"],["WorkSummary","کارکرد من"],["SalarySlips","فیش‌های حقوقی من"],["CompanyRequests","ارسال برای شرکت"],["Subscription","اشتراک گروهی و انفرادی"],["CheckIn","ثبت حضور من"],["Forms","فرم‌ها"],["Cultural","فعالیت‌های فرهنگی"],["Welfare","رفاهیات"],["TempDrivers","رانندگان موقت"],["Notifications","اعلان‌ها"],["FieldAlerts","هشدارها"],["ActivityReport","فعالیت رانندگان هر خط"],["ExpInsurance","وضعیت بیمه و معاینه"],["ExpTaxi","افراد فاقد اعتبار"],["ExpOplic","خودروهای فاقد بهره‌برداری"],["TeamReport","زیرمجموعه من"],["InboxReports","گزارشات دریافتی"],["ReportDetail","جزئیات گزارش"],["OfficialPresence","ثبت حضور مسئولین در خط"],["Inventory","اقلام تحویلی"],["Messages","پیام‌ها"],["Attendance","گزارش حضور"],["PastNotices","تذکرات قبلی"],["PastChecklists","چک‌لیست‌های قبلی"],["DriverSms","پیامک‌های راننده"],["MySms","پیامک‌های ارسالی من"],["CustomFields","اطلاعات تکمیلی"],["Outage","اعلام قطع سیستم نوبت‌دهی"],["Profile","حساب کاربری"],["ChangePassword","تغییر رمز"],["EditProfile","ویرایش اطلاعات من"],["PersonnelVehicleAsset","مشخصات خودرو یا موتورسیکلت"],["PersonnelVehicleChecklist","چک‌لیست خودرویی و موتوری"],["MapSettings","تنظیمات نقشه"],["ExpiryNotificationSettings","تنظیمات اعلان اعتبار"],["FieldAlertSettings","تنظیمات هشدارهای میدانی"],["ImportTimes","آخرین زمان‌های به‌روزرسانی"],["AppLockSettings","قفل برنامه"],["CrashReports","گزارش خطاهای برنامه"],["LineVisitProgram","برنامه بازدید و پوشش خط"],["LineLocation","ثبت موقعیت و تصویر خطوط"],["MyDailyMission","مأموریت روزانه من"],["RoleDashboard","داشبورد و امتیاز من"],["Leaderboard","رتبه‌بندی و نشان‌ها"],["Radio","بی‌سیم خطیار"],["Help","راهنمای برنامه"],["StationCapture","ثبت موقعیت و تصویر خطوط"],["MyStations","ایستگاه‌های ثبت‌شده من"],["PresentList","حاضرین در خط"]
  ];
  const [roles,setRoles]=useState([]); const [cfg,setCfg]=useState({}); const [rid,setRid]=useState(""); const [saving,setSaving]=useState(false);
  useEffect(()=>{ db.roleAppItems().then(d=>{ setRoles(d.roles||[]); setCfg(d.config&&!Array.isArray(d.config)?d.config:{}); if(d.roles&&d.roles[0])setRid(String(d.roles[0].id)); }).catch(()=>{}); },[]);
  const sel = (cfg[rid]===undefined) ? null : (cfg[rid]||[]);
  const allKeys = ITEMS.map(i=>i[0]);
  const toggleItem=(k)=>{ const cur=sel===null?allKeys.slice():sel.slice(); const i=cur.indexOf(k); if(i>=0)cur.splice(i,1); else cur.push(k); setCfg({...cfg,[rid]:cur}); };
  const setAll=()=>{ const c={...cfg}; delete c[rid]; setCfg(c); };
  const setNone=()=>setCfg({...cfg,[rid]:[]});
  const save=async()=>{setSaving(true);try{await db.saveRoleAppItems(cfg);alert("ذخیره شد. کاربران آن سمت پس از ورود مجدد تغییر را می‌بینند.");}catch(e){alert(e.message||"خطا");}finally{setSaving(false);}};
  return <div>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>این فهرست فقط آیتم‌های واقعی نرم‌افزار اندروید است و مستقیماً با Routeهای <code>MainStack</code> در اپ تطبیق داده شده است؛ هیچ آیتم پنل وب در این بخش قرار ندارد.</p>
    <div className="row" style={{gap:8,alignItems:"center",flexWrap:"wrap"}}><span className="label">سمت:</span><select className="input" style={{maxWidth:240}} value={rid} onChange={e=>setRid(e.target.value)}>{roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select><button className="btn g" onClick={setAll}>نمایش همه</button><button className="btn g" onClick={setNone}>هیچ‌کدام</button></div>
    <p className="muted" style={{fontSize:11,marginTop:8}}>{sel===null?`وضعیت فعلی: همهٔ ${fa(ITEMS.length)} آیتم نمایش داده می‌شوند`:`وضعیت فعلی: ${fa(sel.length)} از ${fa(ITEMS.length)} آیتم انتخاب شده`}</p>
    <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:6}}>{ITEMS.map(([k,l])=>{const on=sel===null?true:sel.includes(k);return <label key={k} className="row" style={{gap:6,minWidth:200,padding:"6px 8px",border:"1px solid var(--line)",borderRadius:8,background:on?"#e7f3ee":"#fff"}}><input type="checkbox" checked={on} onChange={()=>toggleItem(k)}/>{l}</label>})}</div>
    <button className="btn p" style={{marginTop:12}} disabled={saving} onClick={save}>{saving?"در حال ذخیره…":"ذخیرهٔ تنظیمات"}</button>
  </div>;
}

function RadioSettings(){
  const [data,setData]=useState({channels:[],users:[],roles:[],regions:[],retention_days:1,retention_hours:24}); const [busy,setBusy]=useState(false); const [form,setForm]=useState({id:0,name:'',code:'',description:'',channel_type:'region',match_mode:'OR',max_talk_ms:25000,priority:0,is_active:true,rules:{regions:[],users:[],roles:[]}});
  const api=async(op,opt={})=>{const r=await fetch(`/api/radio-admin-api.php?op=${op}`,{...opt,headers:{...(opt.headers||{}),Authorization:`Bearer ${localStorage.token||''}`,'Content-Type':'application/json'},cache:'no-store'});const d=await r.json();if(!r.ok||d.ok===false)throw Error(d.error||'خطای سرور');return d;};
  const load=async()=>{try{setData(await api('bootstrap'));}catch(e){alert(e.message)}}; useEffect(()=>{load()},[]);
  const save=async()=>{setBusy(true);try{await api('save',{method:'POST',body:JSON.stringify(form)});setForm({id:0,name:'',code:'',description:'',channel_type:'region',match_mode:'OR',max_talk_ms:25000,priority:0,is_active:true,rules:{regions:[],users:[],roles:[]}});await load();}catch(e){alert(e.message)}finally{setBusy(false)}};
  const edit=c=>setForm({...c,rules:c.rules||{regions:[],users:[],roles:[]},max_talk_ms:Number(c.max_talk_ms||25000)});
  const del=async(id)=>{if(!confirm('این کانال حذف شود؟'))return;try{await api('delete',{method:'POST',body:JSON.stringify({id})});await load()}catch(e){alert(e.message)}};
  const toggle=(key,id)=>setForm(f=>({...f,rules:{...f.rules,[key]:f.rules[key].includes(id)?f.rules[key].filter(x=>x!==id):[...f.rules[key],id]}}));
  return <div><p className="muted" style={{fontSize:12}}>تنظیمات بی‌سیم اکنون بخشی از تنظیمات اصلی سامانه است. مدیریت کانال‌ها و نگهداری آرشیو از همین تب انجام می‌شود.</p><div className="panel"><h3>{form.id?'ویرایش کانال':'ایجاد کانال جدید'}</h3><div className="grid2"><div><label className="label">نام کانال</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><label className="label">کد یکتا</label><input className="input" dir="ltr" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></div><div><label className="label">نوع کانال</label><select className="input" value={form.channel_type} onChange={e=>setForm({...form,channel_type:e.target.value})}><option value="region">منطقه‌ای</option><option value="users">اعضای انتخابی</option><option value="roles">سمت‌محور</option><option value="custom">ترکیبی</option></select></div><div><label className="label">منطق شروط</label><select className="input" value={form.match_mode} onChange={e=>setForm({...form,match_mode:e.target.value})}><option value="OR">OR</option><option value="AND">AND</option></select></div><div><label className="label">حداکثر زمان صحبت (ثانیه)</label><input className="input" type="number" min="5" max="120" value={Math.round(form.max_talk_ms/1000)} onChange={e=>setForm({...form,max_talk_ms:Math.max(5000,Math.min(120000,(Number(e.target.value)||25)*1000))})}/></div><div><label className="label">اولویت</label><input className="input" type="number" value={form.priority} onChange={e=>setForm({...form,priority:Number(e.target.value)||0})}/></div></div><label className="row" style={{gap:8,marginTop:10}}><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>کانال فعال باشد</label><label className="label" style={{marginTop:10}}>توضیحات</label><textarea className="input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/><div className="grid2" style={{marginTop:10}}>{[['regions','مناطق مجاز',data.regions],['roles','سمت‌های مجاز',data.roles],['users','کاربران مجاز',data.users]].map(([k,l,arr])=><div key={k}><label className="label">{l}</label><div style={{maxHeight:150,overflow:'auto',border:'1px solid var(--line)',padding:8,borderRadius:8}}>{(arr||[]).map(x=><label key={x.id} className="row" style={{gap:6,fontSize:11,padding:3}}><input type="checkbox" checked={form.rules[k].includes(Number(x.id))} onChange={()=>toggle(k,Number(x.id))}/>{x.name||x.title||`${x.first_name||''} ${x.last_name||''}`}</label>)}</div></div>)}</div><div className="row" style={{gap:8,marginTop:12}}><button className="btn p" disabled={busy} onClick={save}>{busy?'در حال ذخیره…':'ذخیره کانال'}</button>{form.id>0&&<button className="btn g" onClick={()=>setForm({id:0,name:'',code:'',description:'',channel_type:'region',match_mode:'OR',max_talk_ms:25000,priority:0,is_active:true,rules:{regions:[],users:[],roles:[]}})}>انصراف</button>}</div></div><div className="panel"><div className="row" style={{justifyContent:'space-between'}}><h3>نگهداری آرشیو</h3><span className="muted">{fa(data.retention_hours||24)} ساعت</span></div><div className="row" style={{gap:8,alignItems:'center',flexWrap:'wrap'}}><input className="input" type="number" min="1" max="87600" value={data.retention_hours||24} onChange={e=>setData({...data,retention_hours:Number(e.target.value)||24,retention_days:Math.max(1,Math.ceil((Number(e.target.value)||24)/24))})}/><span className="muted">ساعت</span><button className="btn p" onClick={async()=>{try{await api('retention-set',{method:'POST',body:JSON.stringify({retention_hours:data.retention_hours})});await load()}catch(e){alert(e.message)}}}>ذخیره</button></div><p className="muted" style={{marginTop:6}}>پیش‌فرض: ۲۴ ساعت. پیام‌های قدیمی‌تر از این بازه توسط پاکسازی خودکار حذف می‌شوند.</p></div><div className="panel"><h3>کانال‌های تعریف‌شده</h3><table><thead><tr><th>کانال</th><th>نوع</th><th>اولویت</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{data.channels.map(c=><tr key={c.id}><td><b>{c.name}</b><br/><small>{c.code}</small></td><td>{({region:'منطقه‌ای',users:'اعضای انتخابی',roles:'سمت‌محور',custom:'ترکیبی'}[c.channel_type]||c.channel_type)}</td><td>{fa(c.priority||0)}</td><td>{c.is_active?'فعال':'غیرفعال'}</td><td><button className="btn g" onClick={()=>edit(c)}>ویرایش</button> <button className="btn d" onClick={()=>del(c.id)}>حذف</button></td></tr>)}</tbody></table></div></div>;
}

function RadioCenter(){
  const [tab,setTab]=useState('live'); const [channels,setChannels]=useState([]); const [cid,setCid]=useState(0); const [messages,setMessages]=useState([]); const [after,setAfter]=useState(0); const afterRef=React.useRef(0); const [retention,setRetention]=useState(1);
  const api=async(op)=>{const r=await fetch(`/api/radio-admin-api.php?op=${op}`,{headers:{Authorization:`Bearer ${localStorage.token||''}`},cache:'no-store'});const d=await r.json();if(!r.ok||d.ok===false)throw Error(d.error||'خطای سرور');return d;};
  const load=async()=>{try{const d=await api('channel-list');setChannels(d.channels||[]);setCid(x=>x||(d.channels?.[0]?.id||0));setAfter(x=>{const c=(d.channels||[]).find(q=>Number(q.id)===Number(cid||d.channels?.[0]?.id));const n=c?Number(c.last_message_id||0):x;afterRef.current=n;return n;});}catch(e){alert(e.message)}};
  const poll=async()=>{if(!cid)return;try{const d=await api(`monitor&channel_id=${cid}&after=${afterRef.current}`);if((d.messages||[]).length){const n=Math.max(afterRef.current,...d.messages.map(x=>Number(x.id)));afterRef.current=n;setMessages(m=>[...(d.messages||[]).map(x=>({...x,newItem:true})),...m].slice(0,100));setAfter(n)}}catch(_) {}}
  useEffect(()=>{load()},[]); useEffect(()=>{if(tab!=='live'||!cid)return; poll();const t=setInterval(poll,1800);return()=>clearInterval(t)},[tab,cid]);
  const archive=async()=>{try{const d=await api(`archive&channel_id=${cid}&limit=100`);setMessages(d.messages||[]);setRetention(d.retention_hours||((d.retention_days||1)*24))}catch(e){alert(e.message)}};
  useEffect(()=>{if(tab==='archive')archive(); else if(tab==='live'&&cid){const c=channels.find(x=>Number(x.id)===Number(cid));const n=Number(c?.last_message_id||0);afterRef.current=n;setAfter(n);setMessages([]);}},[tab,cid]);
  return <div><div className="tabbar"><button className={'tabbtn'+(tab==='live'?' on':'')} onClick={()=>setTab('live')}>پخش زنده بی‌سیم</button><button className={'tabbtn'+(tab==='archive'?' on':'')} onClick={()=>setTab('archive')}>آرشیو پیام‌ها</button></div><div className="panel"><div className="row" style={{gap:8,alignItems:'center',flexWrap:'wrap'}}><label className="label">کانال</label><select className="input" style={{maxWidth:280}} value={cid} onChange={e=>{setCid(Number(e.target.value));setAfter(0);afterRef.current=0;setMessages([])}}>{channels.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select>{tab==='live'&&<span className="muted">در حال شنود زنده…</span>}{tab==='archive'&&<span className="muted">نگهداری: {fa(retention)} ساعت</span>}</div></div><div className="panel"><h3>{tab==='live'?'شنود زنده':'آرشیو پیام‌های صوتی'}</h3>{tab==='live'&&<p className="muted" style={{marginBottom:8}}>در این بخش فقط پیام‌هایی که پس از ورود شما به شنود زنده دریافت شوند نمایش داده می‌شوند؛ پیام‌های قبلی در آرشیو هستند.</p>}{messages.length?messages.map(m=><div key={m.id} className="row" style={{justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid var(--line)',alignItems:'center'}}><div><b>{m.sender_name||'کاربر'}</b><div className="muted" style={{fontSize:11}}>{m.created_at||''} · {fa(Math.round(Number(m.duration_ms||0)/1000))} ثانیه</div></div><audio controls preload="none" src={m.audio_url} style={{maxWidth:280}}/></div>):<p className="muted">پیامی برای نمایش وجود ندارد.</p>}</div></div>;
}

function CustomFieldsManager(){
  const [fields,setFields]=useState(null);
  const [form,setForm]=useState(null); // فرم افزودن/ویرایش
  const TYPES=[["text","متن"],["number","عدد"],["date","تاریخ"],["checkbox","بله/خیر"],["select","انتخاب تکی"],["multiselect","انتخاب چندتایی"],["textarea","متن بلند"]];
  const load=()=>db.customFields().then(setFields).catch(()=>setFields([]));
  useEffect(()=>{load();},[]);
  const blank={label:"",ftype:"text",options:"",required:0,user_editable:1,sort_order:0};
  const save=async()=>{
    if(!form.label.trim()){alert("عنوان فیلد را وارد کنید");return;}
    try{
      if(form.id) await db.updCustomField(form.id,form);
      else await db.addCustomField(form);
      setForm(null); load();
    }catch(e){alert(e.message||"خطا");}
  };
  const toggle=async(fld,key)=>{ try{ await db.updCustomField(fld.id,{[key]:fld[key]?0:1}); load(); }catch(e){alert(e.message);} };
  const del=async(fld)=>{ if(!confirm("حذف فیلد «"+fld.label+"» و همهٔ مقادیر ثبت‌شده؟"))return; try{ await db.delCustomField(fld.id); load(); }catch(e){alert(e.message);} };
  if(fields===null) return <p className="muted">در حال بارگذاری…</p>;
  const needOptions = form && (form.ftype==="select"||form.ftype==="multiselect");
  return(<div>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>فیلدهای دلخواه برای اطلاعات پرسنل تعریف کنید (مثل شماره شناسنامه، شبا، سایز لباس، قد، شماره بیمه و ...). فیلدهای «قابل تکمیل توسط کاربر» در اپ به نیرو نمایش داده می‌شوند تا کامل کند.</p>
    {!form && <button className="btn p" onClick={()=>setForm({...blank})}>+ افزودن فیلد جدید</button>}
    {form && <div className="card-p" style={{marginTop:10}}>
      <div className="row" style={{gap:8,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:160}}><label className="label">عنوان فیلد</label><input className="input" value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="مثلاً شماره شبا"/></div>
        <div style={{minWidth:150}}><label className="label">نوع</label><select className="input" value={form.ftype} onChange={e=>setForm({...form,ftype:e.target.value})}>{TYPES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
        <div style={{width:90}}><label className="label">ترتیب</label><input className="input" type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></div>
      </div>
      {needOptions && <div style={{marginTop:8}}><label className="label">گزینه‌ها (با | جدا کنید)</label><input className="input" value={form.options||""} onChange={e=>setForm({...form,options:e.target.value})} placeholder="مثلاً S|M|L|XL"/></div>}
      <div className="row" style={{gap:14,marginTop:10,flexWrap:"wrap"}}>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!form.required} onChange={e=>setForm({...form,required:e.target.checked?1:0})}/>تکمیل الزامی</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!form.user_editable} onChange={e=>setForm({...form,user_editable:e.target.checked?1:0})}/>قابل تکمیل توسط کاربر در اپ</label>
      </div>
      <div className="row" style={{gap:8,marginTop:12}}>
        <button className="btn p" onClick={save}>{form.id?"ذخیرهٔ تغییرات":"افزودن"}</button>
        <button className="btn g" onClick={()=>setForm(null)}>انصراف</button>
      </div>
    </div>}
    <table style={{marginTop:14,fontSize:12.5}}><thead><tr><th>عنوان</th><th>نوع</th><th>الزامی</th><th>کاربر پر کند</th><th>فعال</th><th></th></tr></thead><tbody>
      {fields.length===0?<tr><td colSpan="6" className="muted">فیلدی تعریف نشده است.</td></tr>:
       fields.map(f=>{ const ty=(TYPES.find(t=>t[0]===f.ftype)||["",""])[1]; return(<tr key={f.id}>
        <td><b>{f.label}</b>{f.options?<div style={{fontSize:10.5,color:"var(--muted)"}}>{f.options.replace(/\|/g,"، ")}</div>:""}</td>
        <td>{ty}</td>
        <td><input type="checkbox" checked={!!f.required} onChange={()=>toggle(f,"required")}/></td>
        <td><input type="checkbox" checked={!!f.user_editable} onChange={()=>toggle(f,"user_editable")}/></td>
        <td><input type="checkbox" checked={!!f.is_active} onChange={()=>toggle(f,"is_active")}/></td>
        <td style={{whiteSpace:"nowrap"}}><button className="btn g" onClick={()=>setForm({...f})}>ویرایش</button> <button className="btn d" onClick={()=>del(f)}>حذف</button></td>
      </tr>); })}
    </tbody></table>
  </div>);
}

function InventoryAdmin(){
  const [tab,setTab]=useState("assign");
  const [types,setTypes]=useState(null);
  const [typeForm,setTypeForm]=useState(null);
  const [users,setUsers]=useState([]);
  const [assignForm,setAssignForm]=useState({item_type_id:"",to_user_id:"",quantity:"",note:"",transferable:true});
  const [ledger,setLedger]=useState(null);
  const [filt,setFilt]=useState({item_type_id:"",from:"",to:""});
  const loadTypes=()=>db.invItemTypes().then(d=>setTypes(d.items||[])).catch(()=>setTypes([]));
  useEffect(()=>{ loadTypes(); db.users({}).then(d=>setUsers(Array.isArray(d)?d:(d.rows||d.items||[]))).catch(()=>{}); },[]);
  const saveType=async()=>{
    if(!typeForm.name?.trim()){alert("نام قلم را وارد کنید");return;}
    try{ if(typeForm.id) await db.invUpdItemType(typeForm.id,typeForm); else await db.invAddItemType(typeForm); setTypeForm(null); loadTypes(); }catch(e){alert(e.message||"خطا");}
  };
  const toggleType=async(t)=>{ try{ await db.invUpdItemType(t.id,{is_active:t.is_active?0:1}); loadTypes(); }catch(e){alert(e.message);} };
  const doAssign=async()=>{
    if(!assignForm.item_type_id||!assignForm.to_user_id||!assignForm.quantity){alert("همهٔ فیلدها را پر کنید");return;}
    try{ await db.invAssign({...assignForm,quantity:+assignForm.quantity}); alert("واگذار شد؛ پس از تأیید گیرنده در برنامه، به موجودی او افزوده می‌شود."); setAssignForm({item_type_id:"",to_user_id:"",quantity:"",note:"",transferable:true}); }catch(e){alert(e.message||"خطا");}
  };
  const loadLedger=()=>{
    const qs=new URLSearchParams(Object.fromEntries(Object.entries(filt).filter(([,v])=>v))).toString();
    db.invLedger(qs?("?"+qs):"").then(d=>setLedger(d.items||[])).catch(()=>setLedger([]));
  };
  useEffect(()=>{ if(tab==="report") loadLedger(); },[tab]);
  const exportUrl=()=>{ const qs=new URLSearchParams(Object.fromEntries(Object.entries(filt).filter(([,v])=>v))).toString(); return db.invExportUrl(qs?("?"+qs):""); };
  return(<div>
    <div className="row" style={{gap:8,marginBottom:14}}>
      {[["assign","واگذاری اقلام"],["types","انواع اقلام"],["report","گزارش و خروجی اکسل"]].map(([k,l])=>
        <button key={k} className={"btn "+(tab===k?"p":"g")} onClick={()=>setTab(k)}>{l}</button>)}
    </div>

    {tab==="assign" && <div className="panel">
      <h3>واگذاری اقلام به یک شخص</h3>
      <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:10}}>پس از واگذاری، قلم به‌صورت «در انتظار تأیید» برای همان شخص نمایش داده می‌شود و تا زمانی‌که او در برنامه دریافت را تأیید نکند، به موجودی‌اش اضافه نمی‌شود. آن شخص نیز می‌تواند بعداً بخشی از موجودیِ تأییدشدهٔ خود را به دیگران تحویل دهد.</p>
      <div className="grid2" style={{gap:10}}>
        <div><label className="label">نوع قلم</label>
          <select className="input" value={assignForm.item_type_id} onChange={e=>setAssignForm({...assignForm,item_type_id:e.target.value})}>
            <option value="">— انتخاب کنید —</option>
            {(types||[]).filter(t=>t.is_active).map(t=><option key={t.id} value={t.id}>{t.name}{t.unit?" ("+t.unit+")":""}</option>)}
          </select></div>
        <div><label className="label">تحویل‌گیرنده</label>
          <select className="input" value={assignForm.to_user_id} onChange={e=>setAssignForm({...assignForm,to_user_id:e.target.value})}>
            <option value="">— انتخاب کنید —</option>
            {users.map(u2=><option key={u2.id} value={u2.id}>{u2.first_name} {u2.last_name}{u2.role_title?" — "+u2.role_title:""}</option>)}
          </select></div>
        <div><label className="label">تعداد</label><input className="input" type="number" value={assignForm.quantity} onChange={e=>setAssignForm({...assignForm,quantity:e.target.value})}/></div>
        <div><label className="label">توضیح (اختیاری)</label><input className="input" value={assignForm.note} onChange={e=>setAssignForm({...assignForm,note:e.target.value})}/></div>
      </div>
      <label className="row" style={{gap:8,marginTop:10}}><input type="checkbox" checked={assignForm.transferable} onChange={e=>setAssignForm({...assignForm,transferable:e.target.checked})}/>گیرنده اجازه داشته باشد این قلم را به شخص دیگری هم منتقل کند</label>
      <button className="btn p" style={{marginTop:12}} onClick={doAssign}>واگذاری</button>
    </div>}

    {tab==="types" && <div className="panel">
      <h3>انواع اقلام</h3>
      {!typeForm && <button className="btn p" onClick={()=>setTypeForm({name:"",unit:""})}>+ افزودن نوع قلم</button>}
      {typeForm && <div className="card-p" style={{marginTop:10}}>
        <div className="row" style={{gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:160}}><label className="label">نام قلم</label><input className="input" value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})} placeholder="مثلاً بی‌سیم"/></div>
          <div style={{width:120}}><label className="label">واحد (اختیاری)</label><input className="input" value={typeForm.unit||""} onChange={e=>setTypeForm({...typeForm,unit:e.target.value})} placeholder="عدد"/></div>
        </div>
        <div className="row" style={{gap:8,marginTop:10}}>
          <button className="btn p" onClick={saveType}>{typeForm.id?"ذخیرهٔ تغییرات":"افزودن"}</button>
          <button className="btn g" onClick={()=>setTypeForm(null)}>انصراف</button>
        </div>
      </div>}
      <table style={{marginTop:14,fontSize:12.5}}><thead><tr><th>نام</th><th>واحد</th><th>فعال</th><th></th></tr></thead><tbody>
        {(types||[]).length===0?<tr><td colSpan="4" className="muted">نوع قلمی تعریف نشده است.</td></tr>:
         (types||[]).map(t=>(<tr key={t.id}>
          <td><b>{t.name}</b></td><td>{t.unit||"—"}</td>
          <td><input type="checkbox" checked={!!t.is_active} onChange={()=>toggleType(t)}/></td>
          <td><button className="btn g" onClick={()=>setTypeForm({...t})}>ویرایش</button></td>
        </tr>))}
      </tbody></table>
    </div>}

    {tab==="report" && <div className="panel">
      <h3>گزارش تحویل‌های تأییدشده</h3>
      <div className="row" style={{gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <select className="input" style={{maxWidth:200}} value={filt.item_type_id} onChange={e=>setFilt({...filt,item_type_id:e.target.value})}>
          <option value="">همهٔ اقلام</option>
          {(types||[]).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input" type="date" value={filt.from} onChange={e=>setFilt({...filt,from:e.target.value})} style={{maxWidth:150}}/>
        <input className="input" type="date" value={filt.to} onChange={e=>setFilt({...filt,to:e.target.value})} style={{maxWidth:150}}/>
        <button className="btn p" onClick={loadLedger}>نمایش</button>
        <button className="btn g" onClick={async()=>{ try{ const res=await fetch(exportUrl(),{headers:tok()}); if(!res.ok)throw new Error("خطا در دریافت خروجی"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="گزارش_اقلام_تحویلی.xlsx"; a.click(); }catch(e){alert(e.message||"خطا");} }}>⤓ خروجی اکسل (با امضا)</button>
      </div>
      <table style={{fontSize:12.5}}><thead><tr><th>قلم</th><th>تعداد</th><th>تحویل‌دهنده</th><th>تحویل‌گیرنده</th><th>قابل انتقال مجدد</th><th>تاریخ تأیید</th></tr></thead><tbody>
        {ledger===null?<tr><td colSpan="6" className="muted">در حال بارگذاری…</td></tr>:
         ledger.length===0?<tr><td colSpan="6" className="muted">موردی یافت نشد.</td></tr>:
         ledger.map(r=>(<tr key={r.id}>
          <td>{r.item_name}</td><td>{r.quantity}{r.unit?" "+r.unit:""}</td>
          <td>{r.from_name||"مدیر سامانه"}</td><td>{r.to_name}</td><td>{r.transferable?"بله":"خیر"}</td><td>{r.confirmed_at_fa||r.confirmed_at}</td>
        </tr>))}
      </tbody></table>
    </div>}
  </div>);
}

function StringListEditor({value,onChange,placeholder}){
  const [txt,setTxt]=React.useState("");
  const arr=Array.isArray(value)?value:[];
  const add=()=>{ const t=txt.trim(); if(!t)return; if(arr.includes(t)){setTxt("");return;} onChange([...arr,t]); setTxt(""); };
  const del=(i)=>onChange(arr.filter((_,j)=>j!==i));
  return(<div>
    <div className="row" style={{gap:8}}>
      <input className="input" style={{flex:1}} value={txt} onChange={e=>setTxt(e.target.value)} placeholder={placeholder||"مورد جدید"} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}}/>
      <button className="btn g" onClick={add}>+ افزودن</button>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
      {arr.map((it,i)=><span key={i} style={{background:"#eef2f6",borderRadius:14,padding:"5px 10px",fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>{it}<span style={{cursor:"pointer",color:"#d63b54",fontWeight:700}} onClick={()=>del(i)}>×</span></span>)}
      {arr.length===0&&<span style={{color:"var(--muted)",fontSize:12}}>موردی اضافه نشده است.</span>}
    </div>
  </div>);
}

function OrgBrandingSettings({v,set,save}){
  const orgRef=React.useRef(); const siteRef=React.useRef();
  const pickLogo=(key,e)=>{ const f=e.target.files&&e.target.files[0]; if(!f)return;
    if(!/^image\/(png|jpeg|webp|svg\+xml|gif)$/i.test(f.type||"")){ alert("فقط فایل تصویر مجاز است."); return; }
    if(f.size>700*1024){ alert("حجم لوگو باید کمتر از ۷۰۰ کیلوبایت باشد."); return; }
    const r=new FileReader(); r.onload=()=>set(key,r.result); r.readAsDataURL(f); };
  const LogoPicker=({keyName,label,refObj})=><div style={{marginTop:10}}><label className="label">{label}</label>
    <div className="row" style={{gap:12,alignItems:"center",marginTop:4}}>
      {v[keyName]? <img src={v[keyName]} alt="لوگو" style={{height:64,width:64,objectFit:"contain",border:"1px solid var(--line)",borderRadius:10,background:"#fff",padding:4}}/> : <div style={{height:64,width:64,border:"1px dashed var(--line)",borderRadius:10,display:"grid",placeItems:"center",color:"var(--muted)",fontSize:11}}>بدون لوگو</div>}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" ref={refObj} style={{display:"none"}} onChange={e=>pickLogo(keyName,e)}/>
      <button className="btn g" onClick={()=>refObj.current&&refObj.current.click()}>انتخاب لوگو</button>
      {v[keyName]&&<button className="btn g" onClick={()=>set(keyName,"")}>حذف لوگو</button>}
    </div></div>;
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>عنوان و لوگوی سایت در صفحه ورود، سایدبار، عنوان مرورگر و همچنین سربرگ چاپ گزارش‌ها استفاده می‌شود.</p>
    <label className="label">عنوان سایت</label>
    <input className="input" value={v.site_title||v.org_title||""} onChange={e=>set("site_title",e.target.value)} placeholder="مثلاً سامانه مدیریت و نظارت تاکسیرانی"/>
    <label className="label" style={{marginTop:10}}>عنوان اداره برای چاپ</label>
    <input className="input" value={v.org_title||""} onChange={e=>set("org_title",e.target.value)} placeholder="مثلاً سازمان مدیریت و نظارت بر تاکسیرانی شهر مشهد"/>
    <LogoPicker keyName="site_logo" label="لوگوی سایت و صفحه ورود" refObj={siteRef}/>
    <LogoPicker keyName="org_logo" label="لوگوی سربرگ چاپ و خروجی‌ها" refObj={orgRef}/>
    <button className="btn p" style={{marginTop:12}} onClick={save}>ذخیرهٔ لوگو و عنوان</button>
  </div>);
}

// پشتیبان‌گیری، بازیابی و پاکسازی دیتابیس
// ویرایشگر بازه‌های ساعتی به فرمت [{from:"HH:MM", to:"HH:MM"}]
function HoursRangeEditor({value,onChange}){
  const list=Array.isArray(value)?value:[];
  const [from,setFrom]=React.useState("08:00"); const [to,setTo]=React.useState("14:00");
  const add=()=>{ if(!/^\d{1,2}:\d{2}$/.test(from)||!/^\d{1,2}:\d{2}$/.test(to)){alert("ساعت را به شکل 08:00 وارد کنید");return;} onChange([...list,{from,to}]); };
  const del=(i)=>{ onChange(list.filter((_,j)=>j!==i)); };
  return(<div>
    <div className="chiprow" style={{margin:"6px 0",display:"flex",flexWrap:"wrap",gap:6}}>
      {list.length?list.map((h,i)=><span key={i} className="chip" style={{background:"var(--brand-soft)",borderRadius:8,padding:"3px 9px"}}>{h.from} تا {h.to} <b style={{cursor:"pointer",color:"var(--danger)"}} onClick={()=>del(i)}>×</b></span>):<span className="muted" style={{fontSize:12}}>بازه‌ای تعریف نشده (همهٔ ساعات).</span>}
    </div>
    <div className="row" style={{gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <span className="label">از</span><input className="input" style={{maxWidth:90}} placeholder="08:00" value={from} onChange={e=>setFrom(e.target.value)}/>
      <span className="label">تا</span><input className="input" style={{maxWidth:90}} placeholder="14:00" value={to} onChange={e=>setTo(e.target.value)}/>
      <button className="btn g" onClick={add}>+ افزودن بازه</button>
    </div>
  </div>);
}

function BackupSettings(){
  const [busy,setBusy]=useState("");
  const [restoreResult,setRestoreResult]=useState(null);
  const [purgeKinds,setPurgeKinds]=useState([]);
  const [purgeConfirm,setPurgeConfirm]=useState("");
  const [purgeResult,setPurgeResult]=useState(null);
  const [migResult,setMigResult]=useState(null);
  // مهاجرت تصاویر قدیمی از دیتابیس به فایل فیزیکی (دسته‌ای تا تمام شود)
  const runMigration=async()=>{
    if(!confirm("تصاویر قدیمی که داخل دیتابیس هستند به فایل فیزیکی منتقل می‌شوند. این کار ممکن است چند دقیقه طول بکشد و در چند دسته انجام می‌شود. ادامه می‌دهید؟"))return;
    setBusy("migrate"); setMigResult(null);
    let totalMig=0, rounds=0;
    try{
      let more=true;
      while(more && rounds<100){
        const d=await SEND("POST","/admin/migrate-images",{limit:100});
        rounds++;
        for(const k in (d.report||{})){ const r=d.report[k]; if(r&&typeof r==="object"&&r.migrated) totalMig+=r.migrated; }
        more=d.more;
        setMigResult({running:true,total:totalMig,rounds});
      }
      setMigResult({running:false,total:totalMig,rounds,done:true});
    }catch(e){ setMigResult({running:false,error:e.message,total:totalMig}); } finally{ setBusy(""); }
  };
  const PURGE_OPTIONS=[
    ["reports","گزارش‌ها و گردش آن‌ها"],["notices","تذکرها"],["checklists","چک‌لیست‌ها"],
    ["attendance","حضور رانندگان و نیروها"],["presence","صحت‌سنجی حضور"],["covert","سلفی‌های نامحسوس"],
    ["official_visits","حضور مسئولین"],["messages","پیام‌ها"],["outages","قطعی سیستم نوبت‌دهی"],
    ["requests","درخواست‌ها (مرخصی/ماموریت)"],["sms_log","تاریخچهٔ پیامک"],["locations","ردیابی موقعیت"],
    ["forms","پاسخ فرم‌ها"],["all_images","فقط خالی‌کردن همهٔ تصاویر (بدون حذف رکورد)"],
  ];
  const download=(light)=>{ setBusy(light?"backup-light":"backup");
    const url=API_BASE+"/admin/backup"+(light?"?light=1&":"?")+"token="+encodeURIComponent(localStorage.token||"");
    const a=document.createElement("a"); a.href=url; a.download=""; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>setBusy(""),2000);
  };
  const downloadJson=(light)=>{ setBusy(light?"json-light":"json");
    const url=API_BASE+"/admin/backup-json"+(light?"?light=1&":"?")+"token="+encodeURIComponent(localStorage.token||"");
    const a=document.createElement("a"); a.href=url; a.download=""; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>setBusy(""),2000);
  };
  const doRestore=async(input)=>{ const file=input.files[0]; if(!file)return;
    if(!confirm("⚠ هشدار جدی: بازیابی، داده‌های فعلی را با محتوای فایل بکاپ جایگزین می‌کند و این عمل برگشت‌ناپذیر است. آیا مطمئن هستید؟"))return;
    setBusy("restore"); setRestoreResult(null);
    try{ const fd=new FormData(); fd.append("file",file);
      const r=await fetch(API_BASE+"/admin/restore",{method:"POST",headers:tok(),body:fd});
      const d=await r.json(); if(!r.ok)throw new Error(d.error||"خطا در بازیابی");
      setRestoreResult({ok:true,executed:d.executed,errors:d.errors||[]});
    }catch(e){ setRestoreResult({ok:false,error:e.message}); } finally{ setBusy(""); input.value=""; }
  };
  const toggleKind=(k)=>{ setPurgeKinds(ks=>ks.includes(k)?ks.filter(x=>x!==k):[...ks,k]); };
  const doPurge=async()=>{
    if(!purgeKinds.length)return alert("حداقل یک مورد را برای پاکسازی انتخاب کنید.");
    if(purgeConfirm!=="پاکسازی")return alert("برای تأیید، کلمهٔ «پاکسازی» را دقیقاً در کادر بنویسید.");
    if(!confirm("⚠ هشدار جدی: داده‌های انتخاب‌شده برای همیشه حذف می‌شوند و قابل بازگشت نیستند. قبل از ادامه حتماً بکاپ بگیرید. ادامه می‌دهید؟"))return;
    setBusy("purge"); setPurgeResult(null);
    try{ const d=await SEND("POST","/admin/purge",{kinds:purgeKinds,confirm:purgeConfirm});
      setPurgeResult({ok:true,report:d.report||{}}); setPurgeKinds([]); setPurgeConfirm("");
    }catch(e){ setPurgeResult({ok:false,error:e.message}); } finally{ setBusy(""); }
  };
  return(<div>
    {/* بکاپ */}
    <div style={{marginBottom:20}}>
      <h4 style={{margin:"0 0 8px"}}>۱) تهیهٔ نسخهٔ پشتیبان</h4>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>یک فایل SQL از کل دیتابیس دانلود می‌شود. نسخهٔ «سبک» بدون تصاویر است (حجم کمتر، مناسب پشتیبان‌گیری مرتب).</p>
      <div className="row" style={{gap:10,flexWrap:"wrap"}}>
        <button className="btn p" disabled={!!busy} onClick={()=>download(false)}>{busy==="backup"?"در حال آماده‌سازی…":"⤓ دانلود بکاپ کامل"}</button>
        <button className="btn g" disabled={!!busy} onClick={()=>download(true)}>{busy==="backup-light"?"در حال آماده‌سازی…":"⤓ دانلود بکاپ سبک (بدون تصاویر)"}</button>
      </div>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:8}}>💡 از این پس چون تصاویر روی هاست (پوشهٔ uploads) ذخیره می‌شوند، برای پشتیبان کامل، علاوه بر این فایل، از پوشهٔ public/uploads هم در هاست بکاپ بگیرید.</p>
    </div>

    {/* بکاپ JSON + نرم‌افزار ویندوزی آفلاین */}
    <div style={{marginBottom:20,padding:14,background:"#0f1a2e",borderRadius:10,border:"1px solid #1e3a5f"}}>
      <h4 style={{margin:"0 0 8px"}}>🖥 نرم‌افزار پشتیبان و مرور آفلاین (ویندوز)</h4>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>برای نگهداری ماهانهٔ کل اطلاعات سامانه و استفادهٔ آفلاین روی ویندوز، یک نرم‌افزار پایتونی فراهم شده است. این نرم‌افزار کل دیتابیس را به‌صورت JSON دریافت و در یک پایگاه‌دادهٔ محلی (SQLite) ایمپورت می‌کند و امکان مرور همهٔ داده‌ها (پرسنل، خطوط، گزارش‌ها، چک‌لیست‌ها، ترددها، تصاویر و …) را به‌صورت آفلاین می‌دهد.</p>
      <div className="row" style={{gap:10,flexWrap:"wrap"}}>
        <button className="btn p" disabled={!!busy} onClick={()=>downloadJson(false)}>{busy==="json"?"در حال آماده‌سازی…":"⤓ دانلود بکاپ JSON کامل"}</button>
        <button className="btn g" disabled={!!busy} onClick={()=>downloadJson(true)}>{busy==="json-light"?"در حال آماده‌سازی…":"⤓ دانلود JSON سبک (بدون تصاویر)"}</button>
      </div>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10,lineHeight:1.9}}>
        <b>راه‌اندازی نرم‌افزار ویندوزی:</b> پوشهٔ <code>windows-backup-app</code> (همراه فایل‌های سامانه) شامل برنامهٔ <code>taxi_backup.py</code> است.<br/>
        ۱) پایتون را نصب کنید و دستور <code>pip install requests</code> را اجرا کنید.<br/>
        ۲) برنامه را با <code>python taxi_backup.py</code> اجرا کنید (یا با <code>build_exe.bat</code> یک فایل اجرایی EXE بسازید).<br/>
        ۳) در برنامه، آدرس سرور و توکن ادمین را وارد کرده و «دریافت پشتیبان» را بزنید.<br/>
        نرم‌افزار به‌صورت خودکار از همین endpointها (<code>/admin/backup-json</code> و تصاویر) استفاده می‌کند و همه‌چیز را آفلاین در دسترس قرار می‌دهد.
      </p>
    </div>
    {/* تبدیل تصاویر قدیمی */}
    <div style={{marginBottom:20,paddingTop:16,borderTop:"1px solid var(--line)"}}>
      <h4 style={{margin:"0 0 8px"}}>۲) تبدیل تصاویر موجود (base64) به فایل فیزیکی</h4>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>تصاویری که از قبل به‌صورت base64 داخل دیتابیس ذخیره شده‌اند را به فایل فشردهٔ فیزیکی روی هاست منتقل می‌کند. این کار حجم دیتابیس را کم می‌کند. عملیات در چند دسته انجام می‌شود و ممکن است چند دقیقه طول بکشد.</p>
      <button className="btn p" disabled={!!busy} onClick={runMigration}>{busy==="migrate"?"در حال تبدیل…":"🖼 تبدیل تصاویر موجود به فایل"}</button>
      {migResult&&<div className="card" style={{marginTop:10}}>
        {migResult.error?<p style={{color:"var(--danger)"}}>خطا: {migResult.error} (تا این لحظه {fa(migResult.total||0)} تصویر منتقل شد)</p>
         :migResult.running?<p style={{color:"var(--muted)"}}>در حال انتقال… تا کنون {fa(migResult.total)} تصویر (دور {fa(migResult.rounds)})</p>
         :<p style={{color:"var(--brand)"}}>✅ انتقال کامل شد. مجموعاً {fa(migResult.total)} تصویر به فایل فیزیکی منتقل شد.</p>}
      </div>}
    </div>
    {/* بازیابی */}
    <div style={{marginBottom:20,paddingTop:16,borderTop:"1px solid var(--line)"}}>
      <h4 style={{margin:"0 0 8px"}}>۳) بازیابی از فایل پشتیبان</h4>
      <div style={{background:"#fdeef0",border:"1px solid #f5c2c7",borderRadius:10,padding:12,marginBottom:10}}>
        <p style={{fontSize:13,color:"#a12d3b",margin:0}}>⚠ بازیابی، داده‌های فعلی را با محتوای فایل جایگزین می‌کند و برگشت‌ناپذیر است. قبل از بازیابی حتماً یک بکاپ از وضعیت فعلی بگیرید.</p>
      </div>
      <div className="row" style={{gap:10,alignItems:"center"}}>
        <input type="file" accept=".sql" id="restoreFile" style={{fontSize:12}} disabled={!!busy}/>
        <button className="btn p" disabled={!!busy} onClick={()=>doRestore(document.getElementById("restoreFile"))}>{busy==="restore"?"در حال بازیابی…":"بازیابی"}</button>
      </div>
      {restoreResult&&<div className="card" style={{marginTop:10}}>
        {restoreResult.ok?<div><p style={{color:"var(--brand)"}}>✅ بازیابی انجام شد. {fa(restoreResult.executed)} دستور اجرا شد.</p>
          {restoreResult.errors.length>0&&<div style={{marginTop:6}}><p className="muted" style={{fontSize:12}}>چند خطای جزئی (معمولاً قابل‌اغماض):</p>{restoreResult.errors.slice(0,5).map((e,i)=><div key={i} style={{fontSize:11,color:"var(--muted)"}}>{e}</div>)}</div>}</div>
        :<p style={{color:"var(--danger)"}}>خطا: {restoreResult.error}</p>}
      </div>}
    </div>
    {/* پاکسازی */}
    <div style={{paddingTop:16,borderTop:"1px solid var(--line)"}}>
      <h4 style={{margin:"0 0 8px"}}>۴) پاکسازی انتخابی داده‌ها</h4>
      <div style={{background:"#fdeef0",border:"1px solid #f5c2c7",borderRadius:10,padding:12,marginBottom:12}}>
        <p style={{fontSize:13,color:"#a12d3b",margin:0}}>⚠ موارد انتخاب‌شده برای همیشه حذف می‌شوند. این عمل برگشت‌ناپذیر است. حتماً قبل از پاکسازی بکاپ بگیرید.</p>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
        {PURGE_OPTIONS.map(([k,t])=>{ const on=purgeKinds.includes(k); return(
          <label key={k} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,background:on?"#fde7ea":"#f4f6f9",border:"1px solid "+(on?"#e89aa6":"var(--line)"),borderRadius:8,padding:"6px 11px",cursor:"pointer"}}>
            <input type="checkbox" checked={on} onChange={()=>toggleKind(k)} style={{margin:0}}/>{t}</label>); })}
      </div>
      <div className="row" style={{gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span className="label">برای تأیید، کلمهٔ «پاکسازی» را بنویسید:</span>
        <input className="input" style={{maxWidth:160}} value={purgeConfirm} onChange={e=>setPurgeConfirm(e.target.value)} placeholder="پاکسازی"/>
        <button className="btn" style={{background:"#d63b54",color:"#fff"}} disabled={!!busy||purgeKinds.length===0||purgeConfirm!=="پاکسازی"} onClick={doPurge}>{busy==="purge"?"در حال پاکسازی…":"پاکسازی موارد انتخاب‌شده"}</button>
      </div>
      {purgeResult&&<div className="card" style={{marginTop:10}}>
        {purgeResult.ok?<div><p style={{color:"var(--brand)"}}>✅ پاکسازی انجام شد.</p>
          {Object.entries(purgeResult.report).map(([k,v])=><div key={k} style={{fontSize:12}}>{k}: {typeof v==="number"?fa(v)+" رکورد حذف شد":String(v)}</div>)}</div>
        :<p style={{color:"var(--danger)"}}>خطا: {purgeResult.error}</p>}
      </div>}
    </div>
  </div>);
}

function SmsCostPanel({v,set,save}){
  const [cap,setCap]=useState(null);
  const loadCap=()=>GET("/admin/sms/capacity").then(setCap).catch(()=>{});
  useEffect(()=>{loadCap();},[]);
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>هزینهٔ هر پیامک را وارد کنید تا تعداد پیامک‌های قابل ارسال با مانده اعتبار محاسبه شود. (واحد: ریال)</p>
    <div className="row" style={{gap:12,flexWrap:"wrap",marginBottom:10}}>
      <div><label className="label">هزینهٔ هر پیامک فارسی</label>
        <input className="input" type="number" min="0" style={{maxWidth:160}} value={v.sms_cost_fa||0} onChange={e=>set("sms_cost_fa",parseInt(e.target.value)||0)}/></div>
      <div><label className="label">هزینهٔ هر پیامک انگلیسی</label>
        <input className="input" type="number" min="0" style={{maxWidth:160}} value={v.sms_cost_en||0} onChange={e=>set("sms_cost_en",parseInt(e.target.value)||0)}/></div>
    </div>
    <button className="btn p" onClick={()=>{save();setTimeout(loadCap,500);}}>ذخیره و محاسبه</button>
    {cap&&<div style={{background:"var(--brand-soft)",borderRadius:10,padding:14,marginTop:14}}>
      <div style={{fontSize:14,marginBottom:8}}>مانده اعتبار پنل: <b>{fa(Number(cap.credit||0).toLocaleString())} ریال</b></div>
      <div className="row" style={{gap:20,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:140,background:"#fff",borderRadius:8,padding:10,textAlign:"center"}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>پیامک فارسی قابل ارسال</div>
          <div style={{fontSize:22,fontWeight:800,color:"var(--brand)"}}>{cap.count_fa!=null?fa(cap.count_fa.toLocaleString()):"—"}</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>{cap.cost_fa>0?`هر کدام ${fa(cap.cost_fa)} ریال`:"هزینه تنظیم نشده"}</div>
        </div>
        <div style={{flex:1,minWidth:140,background:"#fff",borderRadius:8,padding:10,textAlign:"center"}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>پیامک انگلیسی قابل ارسال</div>
          <div style={{fontSize:22,fontWeight:800,color:"var(--brand)"}}>{cap.count_en!=null?fa(cap.count_en.toLocaleString()):"—"}</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>{cap.cost_en>0?`هر کدام ${fa(cap.cost_en)} ریال`:"هزینه تنظیم نشده"}</div>
        </div>
      </div>
    </div>}
  </div>);
}

function SmsCreditAndLimit(){
  const [credit,setCredit]=useState(null); const [loading,setLoading]=useState(false);
  const [limit,setLimit]=useState(0); const [userLimits,setUserLimits]=useState([]);
  const [users,setUsers]=useState([]); const [usage,setUsage]=useState([]);
  const [busy,setBusy]=useState(false);
  const loadCredit=async()=>{ setLoading(true);
    try{ const r=await GET('/admin/sms/credit');
      if(r.ok){ const c=r.credit; const perSms=0.4; // تقریب هزینهٔ هر پیامک (ریال)
        setCredit({raw:c, perSms, approx: c&&perSms ? Math.floor(c/perSms) : null}); }
      else setCredit({err:r.error||"خطا"});
    }catch(e){setCredit({err:e.message}); } setLoading(false); };
  const loadData=async()=>{
    try{ const [lim,us,uu]=await Promise.all([GET('/admin/sms/limit'),GET('/admin/users?active=1'),GET('/admin/sms/usage').catch(()=>[])]);
      setLimit(lim.global_limit||0); setUsers(us||[]); setUsage(Array.isArray(uu)?uu:[]);
      // تنظیم‌های اختصاصی کاربران
      const ul={}; (us||[]).forEach(u=>{ ul[u.id]={user_id:u.id,limit:0}; }); setUserLimits(Object.values(ul));
    }catch(e){}
  };
  React.useEffect(()=>{ loadData(); },[]);
  const save=async()=>{ setBusy(true);
    try{ await SEND('POST','/admin/sms/limit',{global_limit:+limit,user_limits:userLimits.filter(x=>x.limit>0)});
      alert('ذخیره شد'); }catch(e){alert(e.message||'خطا');} setBusy(false); };
  const usageMap={}; usage.forEach(u=>{usageMap[u.sent_by]=+u.sent_today;});
  return(<div>
    {/* اعتبار */}
    <div style={{marginBottom:16,padding:12,background:"var(--brand-soft)",borderRadius:12}}>
      <div className="row" style={{gap:10,alignItems:"center",flexWrap:"wrap"}}>
        {credit?
          credit.err?<span style={{color:"var(--danger)"}}>{credit.err}</span>:
          <span style={{fontFamily:"bold"}}><b>{fa(Math.round(credit.raw||0))} ریال</b> اعتبار باقی‌مانده — تقریباً <b>{fa(credit.approx||0)} پیامک</b></span>
          :<span className="muted">برای نمایش اعتبار دکمه را بزنید</span>}
        <button className="btn p" onClick={loadCredit} disabled={loading}>{loading?"در حال دریافت…":"🔄 نمایش اعتبار فعلی"}</button>
      </div>
    </div>
    {/* محدودیت کلی */}
    <div style={{marginBottom:14}}>
      <label className="label">سقف ارسال روزانه برای همهٔ کاربران (۰ = بدون محدودیت):</label>
      <div className="row" style={{gap:8,marginTop:4}}>
        <input className="input" type="number" min="0" style={{maxWidth:120}} value={limit} onChange={e=>setLimit(+e.target.value||0)}/>
        <span className="muted" style={{fontSize:12}}>تعداد پیامک در روز — شامل همهٔ انواع ارسال (تذکر، فیش، ثبت‌نام و...)</span>
      </div>
    </div>
    {/* آمار ارسال امروز */}
    {usage.length>0&&<div style={{marginBottom:14}}>
      <label className="label">ارسال امروز:</label>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:6}}>
        {usage.map(u=><span key={u.sent_by} className="chip" style={{background:"#f0f4ff",borderRadius:8,padding:"4px 10px",fontSize:12}}>
          {u.first_name} {u.last_name}: {fa(u.sent_today)} پیامک</span>)}
      </div>
    </div>}
    {/* محدودیت اختصاصی کاربران */}
    {users.length>0&&<div style={{marginBottom:14}}>
      <label className="label">محدودیت اختصاصی هر کاربر (۰ = از محدودیت کلی پیروی کند):</label>
      <div style={{maxHeight:220,overflow:"auto",marginTop:8}}>
        {users.filter(u=>u.is_active).map(u=>{
          const ul=userLimits.find(x=>x.user_id===u.id)||{user_id:u.id,limit:0};
          return(<div key={u.id} className="row" style={{gap:8,marginBottom:8,alignItems:"center"}}>
            <input className="input" type="number" min="0" style={{maxWidth:90}} value={ul.limit} onChange={e=>{
              const v=+e.target.value||0;
              setUserLimits(ls=>ls.map(x=>x.user_id===u.id?{...x,limit:v}:x).concat(ls.find(x=>x.user_id===u.id)?[]:[{user_id:u.id,limit:v}]));
            }}/>
            <span style={{fontFamily:"inherit",fontSize:13}}>{u.first_name} {u.last_name} ({u.role_title||"—"})</span>
            {usageMap[u.id]>0&&<span className="muted" style={{fontSize:11}}>امروز: {fa(usageMap[u.id])}</span>}
          </div>);
        })}
      </div>
    </div>}
    <button className="btn p" disabled={busy} onClick={save}>{busy?"در حال ذخیره…":"ذخیرهٔ محدودیت‌ها"}</button>
  </div>);
}


function BaleSettings({v,setV,set,save}){
  const [tab,setTab]=useState('basic');
  const [platform,setPlatform]=useState('bale');
  const platformNames={bale:'بله',telegram:'تلگرام',eitaa:'ایتا'};
  const platformTitle=platformNames[platform]||platform;
  const key=(suffix)=>platform+'_'+suffix;
  const getP=(suffix,def='')=>v[key(suffix)]!==undefined?v[key(suffix)]:def;
  const setP=(suffix,val)=>set(key(suffix),val);
  const [subs,setSubs]=useState([]), [logs,setLogs]=useState([]), [events,setEvents]=useState([]), [mobile,setMobile]=useState(''), [msg,setMsg]=useState('پیام آزمایشی ربات پیام‌رسان');
  const [loading,setLoading]=useState(false), [loadError,setLoadError]=useState(''), [notice,setNotice]=useState('');
  const [whBusy,setWhBusy]=useState(false);
  const [menus,setMenus]=useState([]), [replies,setReplies]=useState([]), [forms,setForms]=useState([]), [subsForm,setSubsForm]=useState([]);
  const emptyMenu={title:'',action_type:'message',action_payload:'',form_id:'',sort_order:0,is_active:1};
  const emptyReply={trigger_text:'',match_type:'exact',response_text:'',sort_order:0,is_active:1};
  const emptyForm={title:'',slug:'',description:'',require_national_code:1,auto_prefill_driver:1,success_message:'',is_active:1,sort_order:0,fields:[]};
  const [menuEdit,setMenuEdit]=useState(emptyMenu), [replyEdit,setReplyEdit]=useState(emptyReply), [formEdit,setFormEdit]=useState(emptyForm);
  const load=async()=>{
    setLoading(true); setLoadError('');
    try{
      const [a,b,c,d,e,f,g]=await Promise.all([db.messengerSubscribers(platform),db.messengerLog(platform),db.messengerMenuItems(platform),db.messengerReplies(platform),db.messengerForms(platform),db.messengerSubmissions(platform),db.messengerEvents(platform)]);
      setSubs(a||[]); setLogs(b||[]); setMenus(c||[]); setReplies(d||[]); setForms(e||[]); setSubsForm(f||[]); setEvents(g||[]);
    }catch(e){ setLoadError(e.message||'خطا در دریافت تنظیمات ربات'); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ load(); },[platform]);
  const item=(k,label)=><label className="row" style={{gap:8,margin:'6px 0'}}><input type="checkbox" checked={(getP('enabled_items',{})||{})[k]!==false} onChange={e=>setV({...v,[key('enabled_items')]:{...(getP('enabled_items',{})||{}),[k]:e.target.checked}})}/>{label}</label>;
  const webhook = (v.public_url||location.origin).replace(/\/$/,'') + '/api/' + platform + '/webhook/' + (getP('webhook_secret')||'SECRET');
  const test=async()=>{ if(!mobile.trim()) return alert('شماره همراه مقصد را وارد کنید'); try{ const r=await db.messengerTest(platform,mobile,msg); alert(r.ok?'ارسال شد':'ارسال نشد: '+(r.error||'خطا')); load(); }catch(e){ alert(e.message||'خطا'); } };
  const registerWebhook=async()=>{ setWhBusy(true); try{ await save(); const r=await db.messengerRegisterWebhook(platform); if(r.ok){ setNotice('✓ Webhook ربات '+platformTitle+' با موفقیت نزد سرویس ثبت شد.'); } else { alert('ثبت Webhook ناموفق بود: '+(r.response?.description||r.response?.error||'خطای نامشخص')); } }catch(e){ alert(e.message||'خطا در ثبت Webhook'); } finally{ setWhBusy(false); } };
  const saveMenu=async()=>{ if(!menuEdit.title.trim()) return alert('عنوان منو لازم است'); try{await db.messengerMenuSave(platform,{...menuEdit,is_active:menuEdit.is_active?1:0,form_id:menuEdit.form_id||null}); setMenuEdit(emptyMenu); setNotice('آیتم منوی '+platformTitle+' ذخیره شد.'); await load();}catch(e){alert(e.message||'خطا در ذخیره منو');} };
  const saveReply=async()=>{ if(!replyEdit.trigger_text.trim()||!replyEdit.response_text.trim()) return alert('کلید و پاسخ لازم است'); try{await db.messengerReplySave(platform,{...replyEdit,is_active:replyEdit.is_active?1:0}); setReplyEdit(emptyReply); setNotice('پاسخ سفارشی '+platformTitle+' ذخیره شد.'); await load();}catch(e){alert(e.message||'خطا در ذخیره پاسخ');} };
  const addField=()=>setFormEdit({...formEdit,fields:[...(formEdit.fields||[]),{field_key:'field_'+((formEdit.fields||[]).length+1),label:'',field_type:'text',is_required:0,prefill_source:'',sort_order:(formEdit.fields||[]).length}]});
  const setField=(i,k,val)=>setFormEdit({...formEdit,fields:(formEdit.fields||[]).map((f,idx)=>idx===i?{...f,[k]:val}:f)});
  const delField=(i)=>setFormEdit({...formEdit,fields:(formEdit.fields||[]).filter((_,idx)=>idx!==i)});
  const saveForm=async()=>{ if(!formEdit.title.trim()) return alert('عنوان فرم لازم است'); try{await db.messengerFormSave(platform,{...formEdit,is_active:formEdit.is_active?1:0,require_national_code:formEdit.require_national_code?1:0,auto_prefill_driver:formEdit.auto_prefill_driver?1:0}); setFormEdit(emptyForm); setNotice('فرم '+platformTitle+' ذخیره شد.'); await load();}catch(e){alert(e.message||'خطا در ذخیره فرم');} };
  const editForm=(f)=>setFormEdit({...f,fields:(f.fields||[]).map(x=>({...x,options:[]}))});
  const review=async(id,status)=>{ const note=prompt('یادداشت مدیر:','')||''; await db.messengerSubmissionReview(platform,id,{status,review_note:note}); load(); };
  const tabs=[['basic','تنظیمات'],['menu','منوی ربات'],['replies','پاسخ سفارشی'],['forms','فرم‌ها'],['submissions','ثبت‌نام‌ها'],['logs','لاگ']];
  return <div>
    {loading&&<div className="notice">در حال دریافت اطلاعات ربات {platformTitle}…</div>}
    {loadError&&<div className="notice err">{loadError} <button className="btn" onClick={load}>تلاش مجدد</button></div>}
    {notice&&<div className="notice ok">{notice}</div>}
    <div className="tabbar" style={{marginBottom:10}}>{[['bale','بله'],['telegram','تلگرام'],['eitaa','ایتا']].map(([k,l])=><button key={k} className={'tabbtn'+(platform===k?' on':'')} onClick={()=>setPlatform(k)}>{l}</button>)}</div>
    <div className="tabbar" style={{marginBottom:10}}>{tabs.map(([k,l])=><button key={k} className={'tabbtn'+(tab===k?' on':'')} onClick={()=>setTab(k)}>{l}</button>)}</div>

    {tab==='basic'&&<div>
      <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!getP('enabled')} onChange={e=>setP('enabled',e.target.checked)}/><b>فعال‌سازی ربات {platformTitle}</b></label>
      <label className="label">توکن ربات {platformTitle}</label><input className="input" dir="ltr" value={getP('bot_token')} onChange={e=>setP('bot_token',e.target.value)} placeholder={'توکن ربات '+platformTitle}/>
      <label className="label">آدرس API {platformTitle}</label><input className="input" dir="ltr" value={getP('api_base', platform==='telegram'?'https://api.telegram.org':(platform==='eitaa'?'https://eitaayar.ir/api':'https://tapi.bale.ai'))} onChange={e=>setP('api_base',e.target.value)} />
      <label className="label">حالت مسیر API</label><select className="input" value={getP('api_mode', platform==='eitaa'?'token_method':'bot_token_method')} onChange={e=>setP('api_mode',e.target.value)}><option value="bot_token_method">/botTOKEN/method</option><option value="token_method">/TOKEN/method</option><option value="query_token">/method?token=TOKEN</option></select>
      <label className="label">کلید محرمانه Webhook</label><input className="input" dir="ltr" value={getP('webhook_secret')} onChange={e=>setP('webhook_secret',e.target.value)} placeholder="یک رشته تصادفی طولانی"/>
      <label className="label">آدرس Webhook</label><div className="row" style={{gap:8,alignItems:'center'}}><input className="input" dir="ltr" readOnly value={webhook} style={{flex:1}}/><button className="btn p" onClick={registerWebhook} disabled={whBusy}>{whBusy?'در حال ثبت…':'ثبت خودکار Webhook'}</button></div>
      <p className="muted" style={{fontSize:11,marginTop:4}}>پس از ذخیرهٔ توکن، این دکمه آدرس بالا را مستقیماً نزد سرویس {platformTitle} ثبت می‌کند (معادل فراخوانی دستی setWebhook).</p>
      <label className="label">متن خوش‌آمد و راهنمای اتصال</label><textarea className="input" rows="3" value={getP('welcome_text')} onChange={e=>setP('welcome_text',e.target.value)} />
      <div className="panel" style={{marginTop:10,background:'rgba(0,0,0,.02)'}}><h4>آیتم‌های فعال ربات</h4>
        {item('messages','پیام‌های عمومی سامانه')}{item('birthday','تبریک تولد')}{item('attendance','اعلان‌های حضور و غیاب')}{item('bills','قبوض و بدهی رانندگان')}{item('warnings','تذکرها و اخطارها')}{item('bot_forms','فرم‌ها و ثبت‌نام ربات')}{item('custom_replies','پاسخ‌های سفارشی')}
      </div>
      <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیره تنظیمات ربات</button>
      <div className="panel" style={{marginTop:12}}><h4>ارسال آزمایشی</h4><div className="row" style={{gap:8,flexWrap:'wrap'}}><input className="input" style={{maxWidth:180}} dir="ltr" placeholder="09xxxxxxxxx" value={mobile} onChange={e=>setMobile(e.target.value)}/><input className="input" style={{flex:1}} value={msg} onChange={e=>setMsg(e.target.value)}/><button className="btn g" onClick={test}>ارسال تست</button></div></div>
      <div className="panel" style={{marginTop:12}}><h4>کاربران/رانندگان متصل به ربات</h4><table><thead><tr><th>نام</th><th>موبایل</th><th>Chat ID</th><th>آخرین فعالیت</th></tr></thead><tbody>{subs.map(x=><tr key={x.id}><td>{x.user_name||x.driver_name||x.display_name||'—'}</td><td>{x.mobile}</td><td dir="ltr">{x.chat_id}</td><td>{fj(x.last_seen_at||x.created_at)}</td></tr>)}</tbody></table></div>
    </div>}

    {tab==='menu'&&<div className="grid2">
      <div className="panel"><h4>تعریف آیتم منو</h4>
        <label className="label">عنوان دکمه</label><input className="input" value={menuEdit.title||''} onChange={e=>setMenuEdit({...menuEdit,title:e.target.value})}/>
        <label className="label">نوع عملیات</label><select className="input" value={menuEdit.action_type||'message'} onChange={e=>setMenuEdit({...menuEdit,action_type:e.target.value})}><option value="message">ارسال متن</option><option value="form">شروع فرم</option><option value="forms">لیست فرم‌ها</option><option value="profile">اطلاعات من</option><option value="help">راهنما</option></select>
        {menuEdit.action_type==='form'&&<><label className="label">فرم</label><select className="input" value={menuEdit.form_id||''} onChange={e=>setMenuEdit({...menuEdit,form_id:e.target.value})}><option value="">انتخاب فرم</option>{forms.map(f=><option key={f.id} value={f.id}>{f.title}</option>)}</select></>}
        {menuEdit.action_type==='message'&&<><label className="label">متن پاسخ</label><textarea className="input" rows="4" value={menuEdit.action_payload||''} onChange={e=>setMenuEdit({...menuEdit,action_payload:e.target.value})}/></>}
        <div className="row" style={{gap:8,marginTop:8}}><input className="input" type="number" style={{maxWidth:90}} value={menuEdit.sort_order||0} onChange={e=>setMenuEdit({...menuEdit,sort_order:+e.target.value||0})}/><label><input type="checkbox" checked={!!menuEdit.is_active} onChange={e=>setMenuEdit({...menuEdit,is_active:e.target.checked})}/> فعال</label></div>
        <button className="btn p" onClick={saveMenu}>{menuEdit.id?'ویرایش':'افزودن'}</button>
      </div>
      <div className="panel"><h4>منوهای ثبت‌شده</h4><table><thead><tr><th>عنوان</th><th>نوع</th><th>وضعیت</th><th></th></tr></thead><tbody>{menus.map(x=><tr key={x.id}><td>{x.title}</td><td>{x.action_type}</td><td>{x.is_active?'فعال':'غیرفعال'}</td><td><button className="btn" onClick={()=>setMenuEdit(x)}>ویرایش</button><button className="btn d" onClick={async()=>{if(confirm('حذف شود؟')){await db.messengerMenuDelete(platform,x.id);load();}}}>حذف</button></td></tr>)}</tbody></table></div>
    </div>}

    {tab==='replies'&&<div className="grid2">
      <div className="panel"><h4>پاسخ سفارشی</h4>
        <label className="label">عبارت ورودی کاربر</label><input className="input" value={replyEdit.trigger_text||''} onChange={e=>setReplyEdit({...replyEdit,trigger_text:e.target.value})}/>
        <label className="label">نوع تطبیق</label><select className="input" value={replyEdit.match_type||'exact'} onChange={e=>setReplyEdit({...replyEdit,match_type:e.target.value})}><option value="exact">برابر دقیق</option><option value="contains">شامل عبارت</option><option value="starts_with">شروع با عبارت</option></select>
        <label className="label">متن پاسخ</label><textarea className="input" rows="5" value={replyEdit.response_text||''} onChange={e=>setReplyEdit({...replyEdit,response_text:e.target.value})}/>
        <div className="row" style={{gap:8,marginTop:8}}><input className="input" type="number" style={{maxWidth:90}} value={replyEdit.sort_order||0} onChange={e=>setReplyEdit({...replyEdit,sort_order:+e.target.value||0})}/><label><input type="checkbox" checked={!!replyEdit.is_active} onChange={e=>setReplyEdit({...replyEdit,is_active:e.target.checked})}/> فعال</label></div>
        <button className="btn p" onClick={saveReply}>{replyEdit.id?'ویرایش':'افزودن'}</button>
      </div>
      <div className="panel"><h4>پاسخ‌ها</h4><table><thead><tr><th>کلید</th><th>نوع</th><th>وضعیت</th><th></th></tr></thead><tbody>{replies.map(x=><tr key={x.id}><td>{x.trigger_text}</td><td>{x.match_type}</td><td>{x.is_active?'فعال':'غیرفعال'}</td><td><button className="btn" onClick={()=>setReplyEdit(x)}>ویرایش</button><button className="btn d" onClick={async()=>{if(confirm('حذف شود؟')){await db.messengerReplyDelete(platform,x.id);load();}}}>حذف</button></td></tr>)}</tbody></table></div>
    </div>}

    {tab==='forms'&&<div>
      <div className="panel"><h4>فرم ثبت‌نام/درخواست داخل ربات‌ها</h4>
        <div className="grid2"><div><label className="label">عنوان فرم</label><input className="input" value={formEdit.title||''} onChange={e=>setFormEdit({...formEdit,title:e.target.value})}/></div><div><label className="label">اسلاگ</label><input className="input" dir="ltr" value={formEdit.slug||''} onChange={e=>setFormEdit({...formEdit,slug:e.target.value})}/></div></div>
        <label className="label">توضیح</label><textarea className="input" rows="2" value={formEdit.description||''} onChange={e=>setFormEdit({...formEdit,description:e.target.value})}/>
        <label className="label">پیام موفقیت</label><textarea className="input" rows="2" value={formEdit.success_message||''} onChange={e=>setFormEdit({...formEdit,success_message:e.target.value})}/>
        <div className="row" style={{gap:14,margin:'8px 0'}}><label><input type="checkbox" checked={!!formEdit.require_national_code} onChange={e=>setFormEdit({...formEdit,require_national_code:e.target.checked})}/> دریافت کد ملی</label><label><input type="checkbox" checked={!!formEdit.auto_prefill_driver} onChange={e=>setFormEdit({...formEdit,auto_prefill_driver:e.target.checked})}/> تکمیل خودکار از اطلاعات راننده</label><label><input type="checkbox" checked={!!formEdit.is_active} onChange={e=>setFormEdit({...formEdit,is_active:e.target.checked})}/> فعال</label></div>
        <h4>فیلدها</h4>{(formEdit.fields||[]).map((f,i)=><div key={i} className="panel" style={{background:'rgba(0,0,0,.025)',marginBottom:8}}>
          <div className="grid2"><input className="input" placeholder="field_key" dir="ltr" value={f.field_key||''} onChange={e=>setField(i,'field_key',e.target.value)}/><input className="input" placeholder="عنوان فیلد" value={f.label||''} onChange={e=>setField(i,'label',e.target.value)}/></div>
          <div className="row" style={{gap:8,marginTop:6,flexWrap:'wrap'}}><select className="input" style={{maxWidth:140}} value={f.field_type||'text'} onChange={e=>setField(i,'field_type',e.target.value)}><option value="text">متن</option><option value="number">عدد</option><option value="mobile">موبایل</option><option value="national_code">کد ملی</option><option value="date">تاریخ</option></select><select className="input" style={{maxWidth:230}} value={f.prefill_source||''} onChange={e=>setField(i,'prefill_source',e.target.value)}><option value="">بدون تکمیل خودکار</option><option value="driver.full_name">نام کامل راننده</option><option value="driver.first_name">نام راننده</option><option value="driver.last_name">نام خانوادگی راننده</option><option value="driver.mobile">موبایل راننده</option><option value="driver.national_code">کد ملی راننده</option><option value="driver.plate">پلاک خودرو</option><option value="driver.smart_code">کد هوشمند</option><option value="user.full_name">نام کامل کاربر</option><option value="user.mobile">موبایل کاربر</option><option value="user.national_code">کد ملی کاربر</option></select><label><input type="checkbox" checked={!!f.is_required} onChange={e=>setField(i,'is_required',e.target.checked)}/> اجباری</label><button className="btn d" onClick={()=>delField(i)}>حذف فیلد</button></div>
        </div>)}
        <button className="btn" onClick={addField}>افزودن فیلد</button> <button className="btn p" onClick={saveForm}>{formEdit.id?'ذخیره ویرایش فرم':'ثبت فرم'}</button>
      </div>
      <div className="panel" style={{marginTop:12}}><h4>فرم‌های ثبت‌شده</h4><table><thead><tr><th>عنوان</th><th>فیلد</th><th>وضعیت</th><th></th></tr></thead><tbody>{forms.map(f=><tr key={f.id}><td>{f.title}</td><td>{fa((f.fields||[]).length)}</td><td>{f.is_active?'فعال':'غیرفعال'}</td><td><button className="btn" onClick={()=>editForm(f)}>ویرایش</button><button className="btn d" onClick={async()=>{if(confirm('غیرفعال شود؟')){await db.messengerFormDelete(platform,f.id);load();}}}>غیرفعال</button></td></tr>)}</tbody></table></div>
    </div>}

    {tab==='submissions'&&<div className="panel"><h4>ثبت‌نام‌ها و فرم‌های دریافتی</h4><button className="btn" onClick={()=>db.messengerSubmissions(platform).then(setSubsForm)}>بازخوانی</button><table><thead><tr><th>زمان</th><th>فرم</th><th>راننده/کاربر</th><th>کد ملی</th><th>وضعیت</th><th>اطلاعات</th><th></th></tr></thead><tbody>{subsForm.map(x=><tr key={x.id}><td>{fj(x.created_at)}</td><td>{x.form_title}</td><td>{x.driver_name||x.user_name||'—'}</td><td dir="ltr">{x.national_code||'—'}</td><td>{x.status}</td><td><pre style={{whiteSpace:'pre-wrap',fontSize:11,maxWidth:260}}>{JSON.stringify(x.data||{},null,2)}</pre></td><td><button className="btn g" onClick={()=>review(x.id,'approved')}>تأیید</button><button className="btn d" onClick={()=>review(x.id,'rejected')}>رد</button><button className="btn" onClick={()=>review(x.id,'done')}>انجام شد</button></td></tr>)}</tbody></table></div>}

    {tab==='logs'&&<div className="grid2"><div className="panel"><h4>گزارش ارسال ربات</h4><table><thead><tr><th>زمان</th><th>وضعیت</th><th>Chat</th><th>متن</th></tr></thead><tbody>{logs.slice(0,120).map(x=><tr key={x.id}><td>{fj(x.created_at)}</td><td>{x.status}</td><td dir="ltr">{x.chat_id}</td><td>{String(x.body||'').slice(0,80)}</td></tr>)}</tbody></table></div><div className="panel"><h4>رویدادهای ورودی ربات</h4><table><thead><tr><th>زمان</th><th>Chat</th><th>نوع</th><th>متن</th></tr></thead><tbody>{events.slice(0,120).map(x=><tr key={x.id}><td>{fj(x.created_at)}</td><td dir="ltr">{x.chat_id}</td><td>{x.event_type}</td><td>{String(x.input_text||'').slice(0,80)}</td></tr>)}</tbody></table></div></div>}
  </div>;
}


function MaintenanceModeSettings(){
  const [v,setV]=useState({enabled:false,message:'',allow_admin:true});
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  useEffect(()=>{ db.maintenanceStatus().then(x=>setV({enabled:!!x.enabled,message:x.message||'',allow_admin:x.allow_admin!==false})).catch(e=>console.error(e)).finally(()=>setLoading(false)); },[]);
  const save=async()=>{ setSaving(true); try{ await db.saveMaintenance(v); alert('تنظیمات حالت نگهداری ذخیره شد'); }catch(e){ alert(e.message||'خطا در ذخیره'); }finally{setSaving(false);} };
  if(loading) return <p className="muted">در حال دریافت وضعیت نگهداری…</p>;
  return <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--line)'}}>
    <h4 style={{margin:'0 0 10px'}}>حالت نگهداری سامانه</h4>
    <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={!!v.enabled} onChange={e=>setV({...v,enabled:e.target.checked})}/><b>فعال‌سازی حالت نگهداری</b></label>
    <label className="label">پیام قابل نمایش به کاربران</label><textarea className="input" rows="3" value={v.message} onChange={e=>setV({...v,message:e.target.value})}/>
    <label className="row" style={{gap:8,marginTop:8}}><input type="checkbox" checked={v.allow_admin!==false} onChange={e=>setV({...v,allow_admin:e.target.checked})}/>اجازه ورود مدیران در حالت نگهداری</label>
    <button className="btn p" style={{marginTop:10}} disabled={saving} onClick={save}>{saving?'در حال ذخیره…':'ذخیره حالت نگهداری'}</button>
  </div>;
}

function Settings(){
  const [v,setV]=useState(null);
  const [tab,setTab]=useState("general");
  useEffect(()=>{db.settings().then(setV).catch(()=>{})},[]);
  if(!v)return <div>در حال بارگذاری…</div>;
  const set=(k,val)=>setV({...v,[k]:val});
  const save=async()=>{ await db.saveSettings(v); alert("تنظیمات ذخیره شد."); };
  const TABS=[["general","عمومی و موقعیت"],["subscription","اشتراک"],["monitoring","پایش و هشدارها"],["dashboard","داشبورد و محاسبهٔ عملکرد"],["hr","منابع انسانی"],["fields","فیلدهای پرسنل"],["appitems","آیتم‌های اپ هر سمت"],["sms","پیامک"],["bale","ربات‌ها"],["radio","بی‌سیم"],["security","امنیت و نسخه اپ"],["files","پیوست‌ها و اعلان‌ها"],["drivers","بدهکاران"],["print","قالب چاپ"],["access","دسترسی‌ها"],["backup","پشتیبان‌گیری و پاکسازی"]];
  const Field=(k,l)=><div style={{marginBottom:12}}><label style={{fontSize:13,color:"var(--muted)"}}>{l}</label>
    <input className="input" value={v[k]??""} onChange={e=>set(k,e.target.value)} style={{marginTop:5}}/></div>;
  const Toggle=(k,l)=><label className="row" style={{justifyContent:"space-between",padding:"8px 0",cursor:"pointer"}}>
    <span style={{fontSize:13}}>{l}</span><input type="checkbox" checked={!!v[k]} onChange={e=>set(k,e.target.checked)}/></label>;
  return(<div>
    <div className="tabbar">{TABS.map(([k,l])=><button key={k} className={"tabbtn"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{l}</button>)}</div>
    <div className={"grid2 settings-tabs tab-"+tab}>
    <div className="panel t-general"><h3>تنظیمات عمومی</h3>{Field("org_name","نام سازمان")}{Field("deputy_name","معاونت نظارت و بازرسی")}
      {Field("inspection_head","رییس اداره بازرسی")}{Field("payment_base_url","آدرس پایهٔ درگاه پرداخت")}
      {Field("attendance_cooldown_min","فاصلهٔ مجاز ثبت حضور (دقیقه)")}
      <div style={{marginTop:12}}>
        <label className="label">حالت فعال‌سازی ردیابی، سلفی نامحسوس، اسکرین‌شات و صحت‌سنجی:</label>
        <div className="row" style={{gap:16,marginTop:6,flexWrap:"wrap"}}>
          {[["always","همیشه فعال (۲۴ ساعته)"],["shift_only","فقط در ساعات شیفت کاری کاربر"]].map(([val,lbl])=>(
            <label key={val} style={{display:"inline-flex",gap:6,alignItems:"center",cursor:"pointer",fontSize:13}}>
              <input type="radio" name="activity_mode" value={val} checked={(v.activity_mode||"always")===val} onChange={()=>set("activity_mode",val)}/>{lbl}</label>))}
        </div>
        <p style={{fontSize:12,color:"var(--muted)",marginTop:6}}>در حالت «فقط شیفت کاری»: موقعیت ارسال نمی‌شود، سلفی و اسکرین‌شات نامحسوس گرفته نمی‌شود، اعلان‌ها ارسال نمی‌شوند — مگر در ساعاتی که شیفت کاری کاربر تعریف شده است.</p>
      </div>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره تنظیمات</button></div>

    <div className="panel t-subscription"><h3>💳 اشتراک گروهی و انفرادی</h3>
      {Toggle("subscription_enabled","فعال‌سازی محدودیت اشتراک برنامه")}
      <label className="label">نوع استفاده</label><select className="input" value={v.subscription_mode||"normal"} onChange={e=>set("subscription_mode",e.target.value)}><option value="normal">استفاده معمولی بدون اشتراک</option><option value="group">اشتراک گروهی</option><option value="individual">اشتراک انفرادی</option></select>
      {Field("subscription_group_amount","مبلغ کل اشتراک گروهی (ریال)")}
      {Field("subscription_individual_amount","مبلغ اشتراک هر فرد برای ۳۰ روز (ریال)")}
      <p className="muted" style={{fontSize:12,lineHeight:2}}>در حالت گروهی، مدیر اجرایی صورتحساب کل مجموعه را از ربات بله دریافت می‌کند و با پرداخت آن، دسترسی همه کاربران برای ۳۰ روز فعال می‌شود. در حالت انفرادی، هر کاربر صورتحساب شخصی خود را دریافت و اشتراک ۳۰ روزه را تمدید می‌کند. وضعیت اشتراک در اپ، داشبورد و منوی حساب کاربری نمایش داده می‌شود.</p>
      <button className="btn p" onClick={save}>ذخیره تنظیمات اشتراک</button></div>
    <div className="panel t-monitoring"><h3>⏱ تنظیم دوره پایش و ارسال هشدار</h3>
      <p style={{fontSize:12.5,color:"var(--muted)",lineHeight:2,marginBottom:12}}>فاصلهٔ بررسی وضعیت‌های میدانی را تعیین کنید. پس از پایان هر دوره، در صورت ادامه داشتن وضعیت غیرمجاز، هشدار برای مسئولان مجاز و مطابق فیلترهای دریافت آنان ارسال می‌شود.</p>
      <div className="grid2" style={{gap:12}}>
        <div><label className="label">بررسی خاموش بودن GPS (ثانیه)</label><input className="input" type="number" min="15" max="3600" value={v.gps_check_seconds??60} onChange={e=>set("gps_check_seconds",Math.max(15,Math.min(3600,parseInt(e.target.value)||60)))}/></div>
        <div><label className="label">بررسی روشن بودن VPN (ثانیه)</label><input className="input" type="number" min="15" max="3600" value={v.vpn_check_seconds??60} onChange={e=>set("vpn_check_seconds",Math.max(15,Math.min(3600,parseInt(e.target.value)||60)))}/></div>
        <div><label className="label">بررسی خروج از محدوده ایستگاه (ثانیه)</label><input className="input" type="number" min="15" max="3600" value={v.station_check_seconds??60} onChange={e=>set("station_check_seconds",Math.max(15,Math.min(3600,parseInt(e.target.value)||60)))}/></div>
      </div>
      <p className="muted" style={{fontSize:12,marginTop:10}}>حداقل ۱۵ ثانیه و حداکثر ۳۶۰۰ ثانیه است.</p>
      <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیره دوره‌های پایش</button>
    </div>
    <div className="panel t-general"><h3>لوگو و عنوان سایت و اداره</h3>
      <OrgBrandingSettings v={v} set={set} save={save}/></div>
    <div className="panel t-security"><h3>قوانین امنیتی ورود</h3>{Toggle("require_gps","الزام روشن‌بودن GPS")}
      {Toggle("block_vpn","مسدودسازی هنگام VPN روشن")}{Toggle("block_dev_options","مسدودسازی هنگام Developer Options")}
      {Toggle("block_mock_location","مسدودسازی هنگام موقعیت جعلی (Mock)")}
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>این قوانین توسط اپ موبایل بررسی و توسط سرور اعمال می‌شوند.</p>
      <MaintenanceModeSettings/>
    </div>
    <div className="panel t-general"><h3>تنظیمات موقعیت‌یابی</h3>
      {Field("location_interval_sec","فاصلهٔ ارسال موقعیت کاربران (ثانیه) — پیش‌فرض ۶۰")}
      <div className="row" style={{gap:10,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label">محدودهٔ خطای مجاز ثبت حضور (متر):</label>
        <input className="input" type="number" min="0" max="500" style={{maxWidth:90}} value={v.checkin_error_radius_m??0} onChange={e=>set("checkin_error_radius_m",Math.max(0,+e.target.value||0))}/>
        <span className="muted" style={{fontSize:12}}>۰ = بدون خطا / مثلاً ۵۰ متر اطراف مرز ایستگاه</span>
      </div>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>فاصلهٔ زمانی ارسال موقعیت را تعیین می‌کند. محدودهٔ خطا اجازه می‌دهد کاربران تا چند متر بیرون از مرز ایستگاه هم بتوانند ثبت حضور کنند.</p></div>
    <div className="panel t-general"><h3>🖼 کیفیت تصاویر ارسالی از موبایل</h3>
      <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:10}}>کیفیت و رزولوشن تصاویری که از اپ موبایل برای گزارش‌ها، چک‌لیست‌ها، حضور مسئولین و سایر موارد ارسال می‌شوند. کاهش این مقادیر، حجم آپلود و فضای ذخیره‌سازی را کم می‌کند؛ افزایش آن‌ها کیفیت تصویر را بالا می‌برد.</p>
      <div style={{marginBottom:14}}>
        <label className="label">درصد فشرده‌سازی (کیفیت): {fa(v.image_quality??45)}٪</label>
        <input type="range" min="10" max="100" step="5" style={{width:"100%"}} value={v.image_quality??45} onChange={e=>set("image_quality",+e.target.value)}/>
        <div className="row" style={{justifyContent:"space-between",fontSize:11,color:"var(--muted)"}}><span>حجم کمتر (۱۰٪)</span><span>کیفیت بالاتر (۱۰۰٪)</span></div>
      </div>
      <div style={{marginBottom:14}}>
        <label className="label">حداکثر عرض تصویر (پیکسل): {fa(v.image_max_width??1024)}px</label>
        <input type="range" min="480" max="2560" step="80" style={{width:"100%"}} value={v.image_max_width??1024} onChange={e=>set("image_max_width",+e.target.value)}/>
        <div className="row" style={{gap:8,marginTop:6,flexWrap:"wrap"}}>
          {[640,800,1024,1280,1600,2048].map(w=><button key={w} className={"btn g"} style={{fontSize:11,padding:"3px 10px",...(Number(v.image_max_width)===w?{background:"var(--accent)",color:"#fff"}:{})}} onClick={()=>set("image_max_width",w)}>{fa(w)}px</button>)}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label className="label">حداکثر ارتفاع تصویر (پیکسل): {fa(v.image_max_height??1920)}px</label>
        <input type="range" min="480" max="4096" step="80" style={{width:"100%"}} value={v.image_max_height??1920} onChange={e=>set("image_max_height",+e.target.value)}/>
      </div>
      <div className="grid2" style={{gap:10,marginBottom:14}}>
        <div><label className="label">اندازه بندانگشتی (px)</label><input className="input" type="number" min="120" max="800" value={v.thumbnail_size??320} onChange={e=>set("thumbnail_size",Math.max(120,Math.min(800,+e.target.value||320)))}/></div>
        <div><label className="label">کیفیت بندانگشتی (%)</label><input className="input" type="number" min="30" max="90" value={v.thumbnail_quality??70} onChange={e=>set("thumbnail_quality",Math.max(30,Math.min(90,+e.target.value||70)))}/></div>
      </div>
      <button className="btn p" onClick={save}>ذخیره</button>
      <p style={{fontSize:11.5,color:"var(--muted)",marginTop:10}}>این تنظیمات پس از باز/بسته شدن اپ یا بارگذاری مجدد، روی دستگاه‌های موبایل اعمال می‌شوند. پیشنهاد: کیفیت ۴۵٪ و عرض ۱۰۲۴px تعادل خوبی بین حجم و وضوح است.</p></div>
    <div className="panel t-hr"><h3>انتخاب منطقه و بازرس توسط کاربر</h3>
      <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={!!v.allow_self_zone_select} onChange={e=>set("allow_self_zone_select",e.target.checked)}/><b>کاربران بتوانند در اپ، منطقه، بازرس‌ها و سربازرس خود را انتخاب کنند</b></label>
      <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:8}}>اگر فعال باشد، در «ویرایش اطلاعات» اپ، کاربر می‌تواند منطقهٔ خود را از فهرست انتخاب کند، یک یا چند بازرس و یک سربازرس برگزیند. این انتخاب‌ها به‌صورت خودکار در چارت سازمانی و منطقه‌بندی نیروها اعمال می‌شوند.</p>
      <button className="btn p" onClick={save}>ذخیره</button></div>
    <div className="panel t-hr"><h3>ثبت حضور مسئولین</h3>
      <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={v.official_visit_require_station!==false&&v.official_visit_require_station!==0} onChange={e=>set("official_visit_require_station",e.target.checked)}/>ثبت حضور مسئول فقط در محدودهٔ ایستگاه مجاز باشد</label>
      <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={!!v.official_visit_require_photo} onChange={e=>set("official_visit_require_photo",e.target.checked)}/>پیوست عکس هنگام ثبت حضور مسئول الزامی باشد</label>
      <div className="row" style={{gap:10,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label">حداکثر ثبت هر مسئول توسط یک کاربر در روز:</label>
        <input className="input" type="number" min="0" style={{maxWidth:90}} value={v.official_visit_daily_max??0} onChange={e=>set("official_visit_daily_max",Math.max(0,+e.target.value||0))}/>
        <span className="muted" style={{fontSize:12}}>۰ = بدون محدودیت</span>
      </div>
      <div className="row" style={{gap:10,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label">حداقل فاصلهٔ زمانی بین دو ثبت یک مسئول (دقیقه):</label>
        <input className="input" type="number" min="0" style={{maxWidth:100}} value={v.official_visit_gap_min??0} onChange={e=>set("official_visit_gap_min",Math.max(0,+e.target.value||0))}/>
        <span className="muted" style={{fontSize:12}}>مثلاً ۳۰۰</span>
      </div>
      <label className="label" style={{marginTop:12,display:"block",fontWeight:700}}>نحوهٔ اطلاع‌رسانی به مسئول هنگام ثبت بازدید او:</label>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:8}}>
        {[["both","پیامک + پیام درون‌اپ"],["sms","فقط پیامک"],["notification","فقط پیام درون‌اپ"]].map(([val,lbl])=>
          <button key={val} className={"btn "+((v.official_visit_notify_mode||"both")===val?"p":"g")} onClick={()=>set("official_visit_notify_mode",val)}>{lbl}</button>)}
      </div>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>پیام درون‌اپ در «پیام‌های ورودی» مسئول با متن «بازدید شما از خط … توسط … در تاریخ و ساعت … ثبت گردید» نمایش داده می‌شود.</p>
      {((v.official_visit_notify_mode||"both")!=="notification")&&<div style={{marginBottom:8}}>
        <label className="label">متن پیامک (متغیرها: {"{name}"}=نام مسئول، {"{recorder}"}=ثبت‌کننده، {"{line}"}=خط، {"{datetime}"}=تاریخ/ساعت):</label>
        <textarea className="input" rows="2" placeholder="جناب {name}، بازدید شما از خط {line} توسط {recorder} در {datetime} ثبت شد." value={v.official_visit_sms_template||""} onChange={e=>setV({...v,official_visit_sms_template:e.target.value})}/>
      </div>}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>اگر این گزینه روشن باشد و برای خطوط، «ایستگاه» (محدودهٔ مکانی) تعریف شده باشد، ثبت حضور فقط داخل محدوده ممکن است. محدودیت‌های تعداد و فاصله از ثبت تکراری برای بالا بردن رتبه جلوگیری می‌کنند.</p></div>
    <div className="panel t-hr"><h3>محدودیت‌های ماهانهٔ کاربر</h3>
      <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:10}}>محدودیت تعداد دفعاتی که هر کاربر در ۳۰ روز اخیر می‌تواند از قابلیت‌های زیر استفاده کند. مقدار صفر = بدون محدودیت.</p>
      <label className="label">حداکثر دفعات «فراموشی ثبت تردد» در ماه</label>
      <input className="input" type="number" min="0" style={{maxWidth:140}} value={v.forget_checkin_monthly_limit||0} onChange={e=>set("forget_checkin_monthly_limit",parseInt(e.target.value)||0)}/>
      <label className="label" style={{marginTop:10,display:"block"}}>حداکثر دفعات «خروج از حساب کاربری» در ماه</label>
      <input className="input" type="number" min="0" style={{maxWidth:140}} value={v.logout_monthly_limit||0} onChange={e=>set("logout_monthly_limit",parseInt(e.target.value)||0)}/>
      <label className="row" style={{gap:8,marginTop:12,marginBottom:6}}><input type="checkbox" checked={v.allow_logout!==false} onChange={e=>set("allow_logout",e.target.checked)}/><b>کاربران مجاز به خروج از حساب کاربری خود هستند</b></label>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>اگر غیرفعال شود، دکمهٔ خروج در اپ کار نخواهد کرد. در هر ورود، تعداد دفعات باقی‌ماندهٔ خروج به کاربر نمایش داده می‌شود.</p>
      <button className="btn p" onClick={save}>ذخیره</button></div>
    <div className="panel t-hr"><h3>محدودیت‌های ثبت روزانه</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>برای جلوگیری از ثبت‌های تکراری یا بیش از حد، می‌توانید فاصله یا سقف مجاز هر فرایند را تعیین کنید. مقدار ۰ یعنی بدون محدودیت.</p>
      <div className="row" style={{gap:10,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label" style={{minWidth:230}}>فاصلهٔ مجاز چک‌لیست هر خودرو (روز):</label>
        <input className="input" type="number" min="0" style={{maxWidth:90}} value={v.checklist_interval_days??0} onChange={e=>set("checklist_interval_days",Math.max(0,+e.target.value||0))}/>
        <span className="muted" style={{fontSize:12}}>۱ = حداکثر روزی یک‌بار</span>
      </div>
      <div className="row" style={{gap:10,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label" style={{minWidth:230}}>فاصلهٔ مجاز تذکر به هر راننده (روز):</label>
        <input className="input" type="number" min="0" style={{maxWidth:90}} value={v.notice_interval_days??0} onChange={e=>set("notice_interval_days",Math.max(0,+e.target.value||0))}/>
      </div>
      <div className="row" style={{gap:10,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label" style={{minWidth:230}}>حداکثر گزارش هر کاربر در روز:</label>
        <input className="input" type="number" min="0" style={{maxWidth:90}} value={v.report_daily_limit??0} onChange={e=>set("report_daily_limit",Math.max(0,+e.target.value||0))}/>
      </div>
      <div className="row" style={{gap:10,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label" style={{minWidth:230}}>حداقل فاصلهٔ بین دو گزارش هر کاربر (دقیقه):</label>
        <input className="input" type="number" min="0" style={{maxWidth:100}} value={v.report_send_interval_min??0} onChange={e=>set("report_send_interval_min",Math.max(0,+e.target.value||0))}/>
      </div>
      <button className="btn p" style={{marginTop:6}} onClick={save}>ذخیرهٔ محدودیت‌ها</button></div>
    <div className="panel t-hr"><h3>تنظیمات درخواست‌ها (مرخصی/ماموریت/اضافه‌کار)</h3><RequestSettings v={v} set={set} save={save}/></div>
    <div className="panel t-hr"><h3>تنظیمات حقوق و دستمزد</h3><PayrollSettings v={v} set={set} save={save}/></div>
    <div className="panel t-hr"><h3>🎂 تبریک تولد خودکار</h3><BirthdaySettings v={v} set={set} save={save}/></div>
    <div className="panel t-fields"><h3>🗂 فیلدهای سفارشی پرسنل</h3><CustomFieldsManager/>
      <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid var(--line)"}}>
        <label className="row" style={{gap:8,marginBottom:6}}><input type="checkbox" checked={!!v.require_complete_profile_login} onChange={e=>set("require_complete_profile_login",e.target.checked)}/><b>جلوگیری از ورود کاربرانی که اطلاعات تکمیلی یا امضای خود را وارد نکرده‌اند</b></label>
        <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:8}}>در صورت فعال بودن، هر کاربری (به‌جز مدیران) که یکی از فیلدهای سفارشیِ «الزامی» را تکمیل نکرده باشد یا هنوز امضای خود را داخل برنامه ثبت نکرده باشد، هنگام ورود با پیام خطا مواجه شده و اجازهٔ ورود به نرم‌افزار را نخواهد داشت تا زمانی‌که اطلاعات را تکمیل کند. فیلدهای «الزامی» را از همین بخش (فیلدهای سفارشی پرسنل) مشخص کنید.</p>
        <button className="btn p" onClick={save}>ذخیره تنظیمات</button>
      </div>
    </div>
    <div className="panel t-appitems"><h3>📱 آیتم‌های قابل نمایش اپ بر اساس سمت</h3><RoleAppItems/></div>
    <div className="panel t-general"><h3>خطوط دارای سیستم نوبت‌دهی</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>سیستم نوبت‌دهی فقط روی این خطوط فعال است و قطعی فقط برای آن‌ها ثبت می‌شود. کد خطوط را وارد کنید (پیش‌فرض: ۳۰۰، ۵۰۰، ۵۰۱، ۵۰۲، ۵۰۳، ۵۰۵، ۷۰۰).</p>
      <StringListEditor value={v.nobat_line_codes||["300","500","501","502","503","505","700"]} onChange={(arr)=>set("nobat_line_codes",arr)} placeholder="مثلاً 300"/>
      <label className="row" style={{gap:8,marginTop:12,alignItems:"center"}}><input type="checkbox" checked={!!v.disable_driver_attendance_for_nobat_lines} onChange={e=>set("disable_driver_attendance_for_nobat_lines",e.target.checked)}/><b>غیرفعال کردن ثبت حضور رانندگان در خطوط دارای سیستم نوبت‌دهی</b></label>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:6}}>در صورت فعال بودن، کاربران خطوط فوق امکان ثبت حضور راننده را نخواهند داشت.</p>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ خطوط نوبت‌دهی</button></div>
    <div className="panel t-general"><h3>کلید API نقشه‌ها (نشان و بلد)</h3>
      <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:8}}>نشان دو نوع کلید دارد: «کلید وب» برای نمایش نقشه و «کلید سرویس» برای تبدیل مختصات به آدرس (نام خیابان). هر دو را وارد کنید.</p>
      {Field("neshan_api_key","کلید وب نشان (web.xxx) — برای نمایش نقشه")}
      {Field("neshan_service_key","کلید سرویس نشان (service.xxx) — برای نام خیابان و آدرس")}
      {Field("balad_api_key","کلید API بلد (Balad)")}
      <label className="row" style={{gap:8,marginTop:10,alignItems:"center"}}><span style={{fontSize:13,fontWeight:700}}>نقشهٔ پیش‌فرض (سایت و اپ):</span>
        <select className="input" style={{maxWidth:220}} value={v.map_provider||"osm"} onChange={e=>set("map_provider",e.target.value)}>
          <option value="osm">OpenStreetMap</option>
          <option value="neshan">نشان (Neshan)</option>
          <option value="balad">بلد (Balad)</option>
          <option value="google">گوگل (نقشه)</option>
          <option value="google_sat">گوگل (ماهواره)</option>
        </select></label>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>نوع نقشهٔ انتخاب‌شده هم در «نقشهٔ زندهٔ» سایت و هم در نقشهٔ «ثبت حضور» اپ موبایل اعمال می‌شود. برای نشان/بلد کلید API لازم است.</p></div>
    <div className="panel t-general"><h3>علت‌های قطع سیستم نوبت‌دهی</h3>
      <StringListEditor value={v.outage_reasons||[]} onChange={(arr)=>set("outage_reasons",arr)} placeholder="مثلاً اختلال شبکه" />
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ علت‌ها</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>این علت‌ها در فرم «اعلام قطع سیستم» اپ به‌صورت گزینه‌ای به اپراتور نمایش داده می‌شوند.</p></div>
    <div className="panel t-sms"><h3>پیامک تذکر به راننده</h3>
      <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!v.notice_sms_enabled} onChange={e=>set("notice_sms_enabled",e.target.checked)}/><b>امکان ارسال تذکر به‌صورت پیامک به راننده فعال باشد</b></label>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>متغیرها: <code dir="ltr">{"{name}"}</code>، <code dir="ltr">{"{first_name}"}</code>، <code dir="ltr">{"{last_name}"}</code>، <code dir="ltr">{"{national_id}"}</code>، <code dir="ltr">{"{reason}"}</code>، <code dir="ltr">{"{body}"}</code>، <code dir="ltr">{"{priority}"}</code></p>
      <textarea className="input" rows="3" placeholder={"راننده گرامی {name}، یک تذکر برای شما ثبت شد: {body}"} value={v.notice_sms_template||""} onChange={e=>setV({...v,notice_sms_template:e.target.value})}/>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ قالب تذکر</button></div>
    <div className="panel t-sms"><h3>پیامک اطلاعات فیش آبونمان</h3>
      <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!v.bill_sms_enabled} onChange={e=>set("bill_sms_enabled",e.target.checked)}/><b>امکان ارسال پیامک اطلاعات فیش آبونمان به تاکسیران فعال باشد</b></label>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>متغیرها: <code dir="ltr">{"{name}"}</code>، <code dir="ltr">{"{bill_id}"}</code>، <code dir="ltr">{"{pay_id}"}</code>، <code dir="ltr">{"{amount}"}</code>، <code dir="ltr">{"{plate}"}</code>، <code dir="ltr">{"{pay_url}"}</code></p>
      <textarea className="input" rows="5" placeholder={"تاکسیران گرامی {name}\nشناسهٔ قبض: {bill_id}\nشناسهٔ پرداخت: {pay_id}\nمبلغ: {amount} ریال\nپرداخت: {pay_url}"} value={v.bill_sms_template||""} onChange={e=>setV({...v,bill_sms_template:e.target.value})}/>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ قالب فیش</button>
      <hr style={{margin:"16px 0",border:"none",borderTop:"1px solid var(--line)"}}/>
      <h4 style={{margin:"0 0 8px"}}>قالب پیامک گروهی آبونمان</h4>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>برای ارسال گروهی به بدهکاران (هر فیش پیامک جدا با لینک پرداخت). متغیرها: <code dir="ltr">{"{name}"}</code>، <code dir="ltr">{"{bill_id}"}</code> (شناسهٔ قبض)، <code dir="ltr">{"{pay_id}"}</code> (شناسهٔ پرداخت)، <code dir="ltr">{"{amount}"}</code> (مبلغ قبض)، <code dir="ltr">{"{pay_url}"}</code> (لینک درگاه)، <code dir="ltr">{"{plate}"}</code>، <code dir="ltr">{"{line}"}</code></p>
      <textarea className="input" rows="3" placeholder={"راننده گرامی {name}، قبض آبونمان شما به شناسهٔ {bill_id} و مبلغ {amount} ریال در انتظار پرداخت است. پرداخت آنلاین:\n{pay_url}"} value={v.bill_bulk_sms_template||""} onChange={e=>setV({...v,bill_bulk_sms_template:e.target.value})}/>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ قالب گروهی</button></div>
    <div className="panel t-hr"><h3>تنظیمات ثبت تذکر</h3>
      <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={!!v.notice_require_photo} onChange={e=>set("notice_require_photo",e.target.checked)}/>پیوست عکس هنگام ثبت تذکر الزامی باشد</label>
      <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={v.notice_camera_only!==false&&v.notice_camera_only!==0} onChange={e=>set("notice_camera_only",e.target.checked)}/>عکس تذکر فقط با دوربین گرفته شود (امکان انتخاب از گالری نباشد)</label>
      <button className="btn p" style={{marginTop:4}} onClick={save}>ذخیره</button></div>
    <div className="panel t-security"><h3>نسخه و به‌روزرسانی اپ اندروید</h3>
      {Field("app_latest_version","آخرین نسخهٔ منتشرشده (مثل 1.2.0)")}
      {Field("app_min_version","حداقل نسخهٔ مجاز (پایین‌تر از این، به‌روزرسانی اجباری)")}
      {Field("app_apk_url","آدرس فایل APK روی سرور (لینک مستقیم دانلود)")}
      {Field("app_update_notes","توضیحات به‌روزرسانی (اختیاری)")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ تنظیمات نسخه</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>اپ هنگام شروع، نسخهٔ خود را با «حداقل نسخهٔ مجاز» مقایسه می‌کند؛ اگر پایین‌تر بود، تا دانلود و نصب فایل جدید اجازهٔ ورود ندارد. فایل APK را در هاست آپلود کنید و لینک مستقیمش را اینجا بگذارید.</p></div>
    <div className="panel t-files"><h3>محدودیت فایل‌های پیوست (هر بخش جداگانه)</h3>
      {["upload_reports","گزارش‌ها"].length&&[["upload_reports","گزارش‌ها"],["upload_checklists","چک‌لیست‌ها"],["upload_notices","ثبت تذکر"]].map(([k,l])=>{
        const cur=v[k]||{}; const setSub=(sk,sv)=>set(k,{...cur,[sk]:sv});
        return(<div key={k} className="card-p" style={{display:"block"}}>
          <b>{l}</b>
          <div className="row" style={{gap:8,marginTop:6,flexWrap:"wrap"}}>
            <div><label style={{fontSize:12,color:"var(--muted)"}}>حداکثر حجم (مگابایت)</label>
              <input className="input" type="number" style={{maxWidth:130}} value={cur.max_mb??""} onChange={e=>setSub("max_mb",+e.target.value||0)}/></div>
            <div style={{flex:1,minWidth:180}}><label style={{fontSize:12,color:"var(--muted)"}}>پسوندهای مجاز (با کاما)</label>
              <input className="input" value={cur.types??""} placeholder="jpg,png,pdf" onChange={e=>setSub("types",e.target.value)}/></div>
          </div></div>);
      })}
      <div style={{marginTop:8}}><label style={{fontSize:13,color:"var(--muted)"}}>حذف خودکار پیوست‌ها پس از این تعداد روز (۰ = غیرفعال)</label>
        <input className="input" type="number" value={v.attachment_retention_days??""} onChange={e=>set("attachment_retention_days",+e.target.value||0)} style={{marginTop:5,maxWidth:160}}/></div>
      <div className="row" style={{gap:8,marginTop:10}}>
        <button className="btn p" onClick={save}>ذخیره</button>
        <button className="btn g" onClick={async()=>{const r=await db.cleanupAttachments();alert(r.days?("پیوست‌های قدیمی‌تر از "+fa(r.days)+" روز پاک شدند."):(r.note||"انجام شد."));}}>پاک‌سازی پیوست‌های قدیمی الان</button></div>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:8}}>برای حذف خودکار روزانه، فایل db/cleanup_cron.sql یا این دکمه را در Cron هاست زمان‌بندی کنید.</p>
    </div>
    <div className="panel t-files"><h3>📸 سلفی نامحسوس از نیروها</h3>
      <p className="muted" style={{marginBottom:10,fontSize:13}}>طبق تنظیم جدید، اپ دیگر هنگام ورود یا ثبت حضور سلفی نمی‌گیرد. سلفی فقط وقتی گرفته می‌شود که مدیر از سمت سرور برای همان کاربر دستور سلفی ارسال کند.</p>
      <div className="card-p" style={{display:"block",background:"#f8fafc"}}>
        <b>وضعیت جدید:</b>
        <p className="muted" style={{fontSize:12,marginTop:6}}>گزینه‌های «سلفی هنگام ورود»، «سلفی هنگام ثبت حضور» و «سلفی دوره‌ای» از اپ موبایل حذف شده‌اند. ارسال دستور سلفی از بخش مدیریت سلفی‌ها همچنان فعال است.</p>
      </div>
      <div className="row" style={{gap:10,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <label className="label">پاک‌سازی خودکار سلفی‌های نامحسوس پس از (روز — ۰ = غیرفعال):</label>
        <input className="input" type="number" min="0" style={{maxWidth:90}} value={v.covert_selfie_retention_days??0} onChange={e=>set("covert_selfie_retention_days",Math.max(0,+e.target.value||0))}/>
        <span className="muted" style={{fontSize:12}}>نیاز به اجرای کرون روزانه دارد</span>
      </div>
      <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیرهٔ تنظیمات سلفی</button>
    </div>
    <div className="panel t-security"><h3>📍 اعلان‌های میدانی و حضور</h3>
      <p className="muted" style={{fontSize:13,marginBottom:14}}>برای هر رویداد می‌توانید ابتدا تعیین کنید کدام پرسنل تحت پایش باشند؛ سپس مسئولان دریافت‌کننده را مشخص کنید و برای هر مسئول نیز دامنهٔ اختصاصی افراد تحت نظارت تعریف کنید. پیام‌ها همراه تاریخ و ساعت در اعلان داخل برنامه، Push و ربات‌های متصل ارسال می‌شوند.</p>
      {[
        {key:'station_exit_notify', title:'خروج کاربر از محدودهٔ خط', desc:'هنگام خروج موقعیت کاربر از محدودهٔ ایستگاه یا خط.'},
        {key:'station_enter_notify', title:'ورود کاربر به محدودهٔ خط', desc:'هنگام ورود موقعیت کاربر به محدودهٔ ایستگاه یا خط.'},
        {key:'vpn_on_notify', title:'روشن‌شدن فیلترشکن (VPN)', desc:'در لحظه تغییر وضعیت VPN از خاموش به روشن.'},
        {key:'gps_off_notify', title:'خاموش‌شدن GPS', desc:'در لحظه‌ای که اپ خاموش‌شدن موقعیت‌یاب را گزارش کند.'},
        {key:'attendance_checkin_notify', title:'ثبت ورود از «حضور من»', desc:'پس از ثبت موفق ورود کاربر از صفحه حضور من.'},
        {key:'attendance_checkout_notify', title:'ثبت خروج از «حضور من»', desc:'پس از ثبت موفق خروج کاربر از صفحه حضور من.'},
      ].map(({key,title,desc})=>{
        const cur=v[key]||{};
        const setSub=(k,val)=>set(key,{...cur,[k]:val});
        return <div key={key} style={{borderTop:"1px solid var(--line)",paddingTop:12,marginTop:12}}>
          <label className="row" style={{gap:8,marginBottom:6,fontWeight:700}}><input type="checkbox" checked={!!cur.enabled} onChange={e=>setSub("enabled",e.target.checked)}/>{title}</label>
          <p className="muted" style={{fontSize:12,marginBottom:8}}>{desc}</p>
          {cur.enabled&&<div style={{marginInlineStart:8}}>
            <FieldAlertScopePicker title="افراد تحت پایش برای این رویداد" mode={cur.subject_mode||"all"} roleIds={cur.subject_role_ids||[]} userIds={cur.subject_user_ids||[]} onChange={(x)=>set(key,{...cur,subject_mode:x.mode,subject_role_ids:x.roleIds,subject_user_ids:x.userIds})}/>
            <label className="label" style={{marginTop:12}}>روش تعیین مسئول دریافت‌کننده</label>
            <select className="input" value={cur.mode||"hierarchy"} onChange={e=>setSub("mode",e.target.value)} style={{maxWidth:320}}>
              <option value="hierarchy">مدیران بالادست طبق سلسله‌مراتب</option>
              <option value="specific">مسئولان مشخص با دامنه اختصاصی</option>
            </select>
            {(cur.mode||"hierarchy")==="specific"&&<AdvancedFieldAlertRecipients cur={cur} onChange={(recipients)=>setSub("recipients",recipients)}/>} 
          </div>}
        </div>;
      })}
      <button className="btn p" style={{marginTop:14}} onClick={save}>ذخیره تنظیمات اعلان‌های میدانی</button>
    </div>
    <div className="panel t-files"><h3>🖥 اسکرین‌شات نامحسوس از صفحهٔ نیروها</h3>
      <p className="muted" style={{marginBottom:10,fontSize:13}}>اپ می‌تواند به‌صورت نامحسوس از صفحهٔ نمایش گوشی نیرو اسکرین‌شات بگیرد و ارسال کند. تصاویر مانند سلفی‌های نامحسوس در همان بخش ذخیره می‌شوند.</p>
      <p className="muted" style={{fontSize:12,marginBottom:10,background:"#fff3cd",padding:8,borderRadius:8}}>⚠ این قابلیت نیاز به نصب <b>react-native-view-shot</b> دارد: <code>npx expo install react-native-view-shot</code> سپس prebuild مجدد.</p>
      <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!v.covert_screenshot_enabled} onChange={e=>set("covert_screenshot_enabled",e.target.checked)}/>فعال‌سازی اسکرین‌شات نامحسوس</label>
      {v.covert_screenshot_enabled&&<div style={{marginInlineStart:8}}>
        <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!v.covert_screenshot_on_login} onChange={e=>set("covert_screenshot_on_login",e.target.checked)}/>اسکرین‌شات هنگام ورود به برنامه</label>
        <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!v.covert_screenshot_on_checkin} onChange={e=>set("covert_screenshot_on_checkin",e.target.checked)}/>اسکرین‌شات هنگام زدن «ثبت حضور من»</label>
        <div className="row" style={{gap:10,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
          <label className="label">فاصلهٔ زمانی اسکرین‌شات دوره‌ای (دقیقه):</label>
          <input className="input" type="number" min="0" style={{maxWidth:100}} value={v.covert_screenshot_interval_min??0} onChange={e=>set("covert_screenshot_interval_min",Math.max(0,+e.target.value||0))}/>
          <span className="muted" style={{fontSize:12}}>۰ = فقط هنگام ورود</span>
        </div>
        <label className="label">ساعت‌های مجاز اسکرین‌شات (خالی = تمام شبانه‌روز)</label>
        <HoursRangeEditor value={v.covert_screenshot_hours||[]} onChange={(arr)=>set("covert_screenshot_hours",arr)}/>
      </div>}
      <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیرهٔ تنظیمات اسکرین‌شات</button>
    </div>
    <div className="panel t-files"><h3>اعلان‌ها و هشدارهای خودکار (Push)</h3>
      <p className="muted" style={{marginBottom:8}}>برای ارسال خودکار هشدار انقضای اعتبار به گوشی نیروها (حتی وقتی اپ بسته است)، یک کلید مخفی تعیین کنید و آدرس زیر را در Cron روزانهٔ هاست قرار دهید.</p>
      <label className="label">کلید مخفی Cron</label>
      <input className="input" value={v.cron_key||""} onChange={e=>set("cron_key",e.target.value)} placeholder="مثلاً یک رشتهٔ تصادفی طولانی"/>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ کلید</button>
      <div style={{marginTop:10,background:"rgba(0,0,0,.05)",borderRadius:10,padding:10,direction:"ltr",fontSize:12,wordBreak:"break-all"}}>
        php /home/h301194/public_html/cron_push_expiry.php
      </div>
      <p className="muted" style={{fontSize:12,marginTop:8}}>در cPanel → Cron Jobs، دستور بالا را روزی یک‌بار اجرا کنید (مسیر دقیق فایل را از File Manager بردارید؛ این فایل کنار index.php است). نیازی به wget یا کلید نیست — اسکریپت PHP مستقیماً اجرا می‌شود. پیام‌ها و ارجاع گزارش‌ها به‌صورت لحظه‌ای Push می‌شوند و به Cron نیاز ندارند.</p>
      <p className="muted" style={{fontSize:12,marginTop:4}}>کلید مخفی بالا فقط برای فراخوانی از طریق آدرس اینترنتی (در صورت پشتیبانی هاست از wget) لازم است.</p>
    </div>
    <div className="panel t-drivers"><h3>مسدودسازی رانندگان بدهکار</h3>
      <p className="muted" style={{marginBottom:8}}>تعیین کنید با چند فیش پرداخت‌نشده در چند ماه اخیر، ثبت حضور راننده مسدود شود. همچنین می‌توانید رانندگان خاصی را دستی مسدود کنید.</p>
      <DriverBlock v={v} set={set} save={save}/>
    </div>
    <div className="panel t-print"><h3>قالب چاپ گزارش‌ها</h3>
      <p className="muted" style={{marginBottom:8}}>ترتیب و نمایش هر بخش، تراز متن، اندازهٔ فونت و سربرگ/پاورقی چاپ را تنظیم کنید.</p>
      {(()=>{ const tp=v.report_print_template||{}; const setTp=(patch)=>set("report_print_template",{...tp,...patch});
        const labels={subject:"موضوع",sender:"فرستنده",date:"تاریخ",status:"وضعیت",body:"متن گزارش",trail:"روند گردش"};
        const order=(tp.order&&tp.order.length)?tp.order.slice():["subject","sender","date","status","body","trail"];
        const fields=tp.fields||{}; const setField=(k,val)=>setTp({fields:{...fields,[k]:val}});
        const move=(i,d)=>{ const j=i+d; if(j<0||j>=order.length)return; const a=order.slice(); [a[i],a[j]]=[a[j],a[i]]; setTp({order:a}); };
        return(<div>
          <label className="label">سربرگ چاپ (خالی = بدون سربرگ)</label><input className="input" value={tp.header??"سامانه مدیریت و نظارت بر خطوط و نیروهای اجرایی تاکسیرانی"} onChange={e=>setTp({header:e.target.value})}/>
          <label className="label" style={{marginTop:8}}>پاورقی</label><input className="input" value={tp.footer??""} onChange={e=>setTp({footer:e.target.value})}/>
          <div className="row" style={{gap:12,marginTop:8,flexWrap:"wrap"}}>
            <div><label className="label">تراز متن</label>
              <select className="input" value={tp.align||"right"} onChange={e=>setTp({align:e.target.value})}><option value="right">راست</option><option value="center">وسط</option><option value="left">چپ</option></select></div>
            <div><label className="label">اندازهٔ فونت (px)</label>
              <input className="input" type="number" style={{maxWidth:110}} value={tp.fontPx||13} onChange={e=>setTp({fontPx:+e.target.value||13})}/></div>
          </div>
          <label className="label" style={{marginTop:10}}>ترتیب و نمایش بخش‌ها</label>
          {order.map((k,i)=><div key={k} className="row" style={{justifyContent:"space-between",alignItems:"center",padding:"6px 8px",border:"1px solid var(--line)",borderRadius:10,marginBottom:6}}>
            <span style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="checkbox" checked={fields[k]!==false} onChange={e=>setField(k,e.target.checked)}/>
              <b>{labels[k]}</b></span>
            <span className="row" style={{gap:4}}>
              <button className="btn g" onClick={()=>move(i,-1)} disabled={i===0}>↑</button>
              <button className="btn g" onClick={()=>move(i,1)} disabled={i===order.length-1}>↓</button></span>
          </div>)}
          <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیرهٔ قالب چاپ</button>
        </div>); })()}
    </div>
    <div className="panel t-dashboard"><h3>چیدمان داشبورد و نحوهٔ محاسبهٔ عملکرد هر نیرو</h3><DashboardConfig/></div>
    <div className="panel t-dashboard"><h3>صحت‌سنجی حضور (عکس سلفی + خودروها)</h3><PresenceSettings/></div>
    <div className="panel t-dashboard"><h3>حذف خودکار تصاویر و پیوست‌ها</h3>
      {Field("presence_retention_days","نگهداری تصاویر صحت‌سنجی حضور (روز) — ۰ = بدون حذف")}
      {Field("form_attachment_retention_days","نگهداری تصاویر پیوست فرم‌ها و چک‌لیست‌ها (روز)")}
      {Field("attachment_retention_days","نگهداری پیوست گزارش‌ها و پیام‌ها (روز)")}
      {Field("salary_slip_retention_days","نگهداری فیش‌های حقوقی (روز) — ۰ = بدون حذف")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>تصاویر/پیوست‌ها و فیش‌های حقوقی قدیمی‌تر از مدت تعیین‌شده، به‌صورت خودکار از سرور حذف می‌شوند. برای اجرای خودکار روزانه، یک Cron به آدرس <code dir="ltr">/api/cron/cleanup?key=کلید</code> تنظیم کنید.</p></div>
    <div className="panel t-dashboard"><h3>سمت‌ها (نقش‌ها)</h3><RolesManager/></div>
    <div className="panel t-dashboard"><h3>سیاست تمدید اجباری</h3>
      {Field("renew_days","دورهٔ تغییر اجباری رمز و عکس پرسنلی (روز) — پیش‌فرض ۳۰")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره</button>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>هر چند روز یک‌بار کاربر در اپ موبایل ملزم به تغییر رمز عبور و گرفتن عکس پرسنلی جدید شود.</p></div>
    <div className="panel t-sms"><h3>قالب پیامک انقضای مدارک</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>این قالب‌ها هنگام ارسال پیامک از صفحات «بیمه/معاینه»، «پروانهٔ تاکسیرانی» و «بهره‌برداری» در اپ استفاده می‌شوند.</p>
      <label className="label">قالب پیامک بیمهٔ شخص ثالث — متغیرها: {"{name}"}، {"{plate}"}، {"{expire}"}</label>
      <textarea className="input" rows="2" placeholder={"راننده گرامی {name}، بیمهٔ شخص ثالث خودروی شما با پلاک {plate} در تاریخ {expire} منقضی می‌شود."} value={v.insurance_sms_template||""} onChange={e=>setV({...v,insurance_sms_template:e.target.value})}/>
      <label className="label" style={{marginTop:8}}>قالب پیامک معاینهٔ فنی — متغیرها: {"{name}"}، {"{plate}"}، {"{expire}"}</label>
      <textarea className="input" rows="2" placeholder={"راننده گرامی {name}، معاینهٔ فنی خودروی شما با پلاک {plate} در تاریخ {expire} منقضی می‌شود."} value={v.inspection_sms_template||""} onChange={e=>setV({...v,inspection_sms_template:e.target.value})}/>
      <label className="label" style={{marginTop:8}}>قالب پیامک پروانهٔ تاکسیرانی — متغیرها: {"{name}"}، {"{expire}"}</label>
      <textarea className="input" rows="2" placeholder={"تاکسیران گرامی {name}، پروانهٔ تاکسیرانی شما در تاریخ {expire} منقضی می‌شود. لطفاً جهت تمدید اقدام فرمایید."} value={v.taxilic_sms_template||""} onChange={e=>setV({...v,taxilic_sms_template:e.target.value})}/>
      <label className="label" style={{marginTop:8}}>قالب پیامک پروانهٔ بهره‌برداری — متغیرها: {"{name}"}، {"{expire}"}</label>
      <textarea className="input" rows="2" placeholder={"تاکسیران گرامی {name}، پروانهٔ بهره‌برداری خودروی شما در تاریخ {expire} منقضی می‌شود. لطفاً جهت تمدید اقدام فرمایید."} value={v.oplic_sms_template||""} onChange={e=>setV({...v,oplic_sms_template:e.target.value})}/>
      <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیره قالب‌ها</button>
    </div>
    <div className="panel t-sms"><h3>تنظیمات سرویس پیامک (نگین ارتباط)</h3>
      <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={!!v.sms_enabled} onChange={e=>setV({...v,sms_enabled:e.target.checked})}/><b>فعال‌سازی سرویس پیامک</b></label>
      {Field("sms_wsdl","آدرس وب‌سرویس (WSDL) — پیش‌فرض: https://sms.3300.ir/almassms.asmx?WSDL")}
      {Field("sms_username","نام کاربری وب‌سرویس")}
      {Field("sms_password","کلمه عبور وب‌سرویس")}
      {Field("sms_line","شمارهٔ خط ارسال (اختیاری)")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ تنظیمات پیامک</button>
      <SmsTools/>
    </div>
    <div className="panel t-sms"><h3>🔑 ورود با کد پیامکی (OTP) و خواندن خودکار کد</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>برای اینکه اپ اندروید بتواند کد پیامکی را <b>بدون هیچ مجوز حساسی و کاملاً خودکار</b> بخواند (Android SMS Retriever API)، باید «امضای اپلیکیشن» (App Hash — یک رشتهٔ ۱۱ کاراکتری) در انتهای متن پیامک درج شود. این مقدار را از توسعه‌دهنده بگیرید (به‌ازای هر keystore متفاوت است) و اینجا ثبت کنید.</p>
      {Field("android_sms_app_hash","App Hash اپلیکیشن اندروید (۱۱ کاراکتر)")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیره</button>
    </div>
    <div className="panel t-sms"><h3>قالب‌های پیش‌فرض پیامک</h3><SmsTemplates v={v} setV={setV} save={save}/></div>
    <div className="panel t-sms"><h3>💳 اعتبار و محدودیت ارسال پیامک</h3><SmsCreditAndLimit/></div>
    <div className="panel t-sms"><h3>💰 هزینهٔ پیامک و ظرفیت ارسال</h3><SmsCostPanel v={v} set={set} save={save}/></div>
    <div className="panel t-sms"><h3>محدودیت ارسال پیامک</h3><label className="row" style={{gap:8}}><input type="checkbox" checked={!!v.sms_templates_only} onChange={e=>set("sms_templates_only",e.target.checked)}/>کاربران فقط بتوانند از قالب‌های تعریف‌شده استفاده کنند (امکان نوشتن متن دلخواه نباشد)</label><button className="btn p" style={{marginTop:10}} onClick={save}>ذخیره</button></div>
    <div className="panel t-bale"><h3>🤖 تنظیمات ربات‌های پیام‌رسان</h3><BaleSettings v={v} setV={setV} set={set} save={save}/></div>
    <div className="panel t-radio"><h3>📻 تنظیمات بی‌سیم</h3><RadioSettings/></div>
<div className="panel t-sms"><h3>پیامک خوش‌آمد هنگام ثبت‌نام کاربر</h3>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:8}}>هنگام ایجاد کاربر جدید (در صورت داشتن موبایل و فعال بودن سرویس)، این پیامک حاوی نام کاربری و رمز عبور برای او ارسال می‌شود. از متغیرها استفاده کنید: <code dir="ltr">{"{username}"}</code>، <code dir="ltr">{"{password}"}</code>، <code dir="ltr">{"{first_name}"}</code>، <code dir="ltr">{"{last_name}"}</code></p>
      <textarea className="input" rows="4" placeholder={"به سامانه خوش آمدید.\nنام کاربری: {username}\nرمز عبور: {password}"} value={v.sms_welcome_template||""} onChange={e=>setV({...v,sms_welcome_template:e.target.value})}/>
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ قالب خوش‌آمد</button>
    </div>
    <div className="panel t-sms"><h3>اطلاعات شرکت (برای پیامک‌های انقضا)</h3>
      {Field("company_name","نام شرکت")}
      {Field("company_address","آدرس شرکت")}
      {Field("company_phone","شمارهٔ تماس شرکت")}
      <button className="btn p" style={{marginTop:8}} onClick={save}>ذخیرهٔ اطلاعات شرکت</button>
    </div>
    <div className="panel t-sms"><h3>قالب و ارسال خودکار پیامک‌های انقضا</h3><ExpirySettings v={v} setV={setV} save={save}/></div>
    <div className="panel t-access"><h3>سطح دسترسی سمت‌ها به بخش‌های سایت</h3><RolePerms/></div>
    <div className="panel t-backup"><h3>پشتیبان‌گیری، بازیابی و پاکسازی</h3><BackupSettings/></div></div></div>);
}

function Logs(){
  const [l,setL]=useState([]); const [users,setUsers]=useState([]); const [events,setEvents]=useState([]);
  const [f,setF]=useState({event:"",user_id:"",from:"",to:""});
  const ev={login:"ورود",login_blocked_security:"ورود مسدود (امنیتی)",login_failed:"ورود ناموفق",gps_off:"خاموش‌کردن GPS",device_revoked:"حذف دستگاه",device_mismatch:"دستگاه ناهمخوان",net_off:"قطع اینترنت",logout:"خروج"};
  const load=()=>{ const q=new URLSearchParams(); Object.entries(f).forEach(([k,v])=>{if(v)q.set(k,v)}); q.set("all","1");
    GET("/admin/logs?"+q.toString()).then(setL).catch(()=>{}); };
  useEffect(()=>{ load(); db.users().then(setUsers).catch(()=>{}); GET("/admin/log-events").then(setEvents).catch(()=>{}); },[]);
  const exportExcel=()=>{ const rows=l.map(x=>[fj(x.created_at),(x.first_name||"")+" "+(x.last_name||""),ev[x.event]||x.event,(x.meta&&x.meta.reason)||""]);
    const ws=XLSX.utils.aoa_to_sheet([["زمان","کاربر","رویداد","توضیح"],...rows]); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"لاگ"); XLSX.writeFile(wb,"لاگ_فعالیت‌ها.xlsx"); };
  return(<div className="panel"><h3>لاگ فعالیت‌ها و رویدادهای امنیتی</h3>
    <div className="row no-print" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
      <select className="input" style={{maxWidth:180}} value={f.event} onChange={e=>setF({...f,event:e.target.value})}><option value="">همهٔ رویدادها</option>{events.map(e=><option key={e} value={e}>{ev[e]||e}</option>)}</select>
      <select className="input" style={{maxWidth:200}} value={f.user_id} onChange={e=>setF({...f,user_id:e.target.value})}><option value="">همهٔ کاربران</option>{visibleUsers.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}{u.username?` — ${u.username}`:""}</option>)}</select>
      <JDate value={f.from} onChange={v=>setF({...f,from:v})} placeholder="از تاریخ"/>
      <JDate value={f.to} onChange={v=>setF({...f,to:v})} placeholder="تا تاریخ"/>
      <button className="btn g" onClick={load}>اعمال فیلتر</button>
      <button className="btn p" onClick={exportExcel}>⬇ خروجی Excel</button></div>
    <table><thead><tr><th>زمان</th><th>کاربر</th><th>رویداد</th><th>توضیح</th></tr></thead>
    <tbody>{l.map(x=><tr key={x.id}><td>{fj(x.created_at)}</td><td>{x.first_name} {x.last_name}</td>
      <td><span className={"badge "+((x.event||"").includes("blocked")||(x.event||"").includes("off")||(x.event||"").includes("failed")?"b-no":"b-w")}>{ev[x.event]||x.event}</span></td>
      <td style={{fontSize:12,color:"var(--muted)"}}>{x.meta?.reason||"—"}</td></tr>)}</tbody></table>
    {l.length===0&&<p className="muted" style={{textAlign:"center",padding:12}}>رکوردی یافت نشد.</p>}</div>);
}

function OplicImportFilterEditor(){
  const [statuses,setStatuses]=useState(["فعال","منقضی"]); const [plateTypes,setPlateTypes]=useState(["تاکسی"]);
  const [si,setSi]=useState(""); const [pi,setPi]=useState(""); const [busy,setBusy]=useState(false); const [saved,setSaved]=useState(false);
  useEffect(()=>{ GET('/admin/oplic-import-filters').then(r=>{ setStatuses(r.statuses||["فعال","منقضی"]); setPlateTypes(r.plate_types||["تاکسی"]); }).catch(()=>{}); },[]);
  const addS=()=>{ const v=si.trim(); if(v&&!statuses.includes(v)){ setStatuses([...statuses,v]); setSi(""); setSaved(false); } };
  const addP=()=>{ const v=pi.trim(); if(v&&!plateTypes.includes(v)){ setPlateTypes([...plateTypes,v]); setPi(""); setSaved(false); } };
  const save=async()=>{ setBusy(true); try{ const r=await SEND('POST','/admin/oplic-import-filters',{statuses,plate_types:plateTypes}); setStatuses(r.statuses); setPlateTypes(r.plate_types); setSaved(true); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  const chip=(label,onRemove)=><span style={{background:"#fff",border:"1px solid var(--brand)",borderRadius:8,padding:"4px 10px",fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>{label}<button onClick={onRemove} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:15,lineHeight:1}}>×</button></span>;
  return(<div style={{background:"var(--brand-soft)",borderRadius:12,padding:14,marginBottom:16}}>
    <h4 style={{margin:"0 0 8px"}}>⚙ فیلتر ایمپورت پروانهٔ بهره‌برداری</h4>
    <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:10}}>فقط ردیف‌هایی ایمپورت می‌شوند که «وضعیت» و «نوع پلاک» آن‌ها در فهرست زیر باشد. پیش‌فرض: وضعیت فعال/منقضی، نوع پلاک تاکسی.</p>
    <div style={{marginBottom:10}}>
      <label className="label" style={{fontSize:12}}>وضعیت‌های مجاز:</label>
      <div className="row" style={{gap:6,flexWrap:"wrap",margin:"6px 0"}}>{statuses.map(s=><span key={s}>{chip(s,()=>{setStatuses(statuses.filter(x=>x!==s));setSaved(false);})}</span>)}</div>
      <div className="row" style={{gap:8}}><input className="input" style={{maxWidth:140}} placeholder="مثلاً فعال" value={si} onChange={e=>setSi(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addS()}/><button className="btn g" onClick={addS}>افزودن وضعیت</button></div>
    </div>
    <div style={{marginBottom:10}}>
      <label className="label" style={{fontSize:12}}>نوع پلاک‌های مجاز:</label>
      <div className="row" style={{gap:6,flexWrap:"wrap",margin:"6px 0"}}>{plateTypes.map(s=><span key={s}>{chip(s,()=>{setPlateTypes(plateTypes.filter(x=>x!==s));setSaved(false);})}</span>)}</div>
      <div className="row" style={{gap:8}}><input className="input" style={{maxWidth:140}} placeholder="مثلاً تاکسی" value={pi} onChange={e=>setPi(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addP()}/><button className="btn g" onClick={addP}>افزودن نوع پلاک</button></div>
    </div>
    <button className="btn p" onClick={save} disabled={busy}>{busy?"در حال ذخیره…":saved?"✓ ذخیره شد":"ذخیرهٔ فیلترها"}</button>
  </div>);
}

function BillReasonCodeEditor(){
  const [codes,setCodes]=useState([20,21,22]); const [input,setInput]=useState(""); const [busy,setBusy]=useState(false); const [saved,setSaved]=useState(false);
  useEffect(()=>{ GET('/admin/bill-reason-codes').then(r=>setCodes(r.codes||[20,21,22])).catch(()=>{}); },[]);
  const add=()=>{ const v=parseInt(input); if(v>0&&!codes.includes(v)){ setCodes([...codes,v].sort((a,b)=>a-b)); setInput(""); setSaved(false); } };
  const remove=(c)=>{ setCodes(codes.filter(x=>x!==c)); setSaved(false); };
  const save=async()=>{ setBusy(true); try{ const r=await SEND('POST','/admin/bill-reason-codes',{codes}); setCodes(r.codes); setSaved(true); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  return(<div style={{background:"var(--brand-soft)",borderRadius:12,padding:14,marginBottom:16}}>
    <h4 style={{margin:"0 0 8px"}}>⚙ کدهای بابت مجاز برای ایمپورت فیش</h4>
    <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:10}}>فقط ردیف‌هایی که «کد بابت» آن‌ها در این فهرست باشد ایمپورت می‌شوند. پیش‌فرض: ۲۰ (راه‌آهن)، ۲۱ (فرودگاه)، ۲۲ (خطوط ویژه) — همگی آبونمان.</p>
    <div className="row" style={{gap:6,flexWrap:"wrap",marginBottom:10}}>
      {codes.map(c=><span key={c} style={{background:"#fff",border:"1px solid var(--brand)",borderRadius:8,padding:"4px 10px",fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>
        {fa(c)}<button onClick={()=>remove(c)} style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:15,lineHeight:1}}>×</button></span>)}
      {codes.length===0&&<span className="muted" style={{fontSize:12}}>هیچ کدی انتخاب نشده — همهٔ ردیف‌ها ایمپورت می‌شوند</span>}
    </div>
    <div className="row" style={{gap:8}}>
      <input className="input" type="number" min="1" style={{maxWidth:110}} placeholder="کد جدید" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/>
      <button className="btn g" onClick={add}>افزودن</button>
      <button className="btn p" onClick={save} disabled={busy}>{busy?"در حال ذخیره…":saved?"✓ ذخیره شد":"ذخیرهٔ کدها"}</button>
    </div>
  </div>);
}

function ExcelImport(){
  const kinds=[["vehicles","اطلاعات خودروها (سامانهٔ جامع)"],["drivers","اطلاعات جامع رانندگان"],["lines","لیست خطوط"],["bills","پرداخت فیش‌ها (آبونمان)"],["oplic","پروانه‌های بهره‌برداری"],["taxilic","پروانه‌های تاکسیرانی"]];
  const [busy,setBusy]=useState(null); const [result,setResult]=useState(null); const [stage,setStage]=useState(""); const [progress,setProgress]=useState(null);
  const CHUNK=300; // تعداد ردیف در هر قطعه
  // ورود قطعه‌قطعه برای فایل‌های حجیم: خواندن در مرورگر، تقسیم، ارسال تکه‌تکه
  const upChunked=async(kind,file)=>{
    setStage("در حال خواندن فایل اکسل…");
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array"});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""});
    if(!aoa.length) throw new Error("فایل خالی است");
    const header=aoa[0]; // ردیف سرستون
    const dataRows=aoa.slice(1); // ردیف‌های داده (بدون سرستون)
    const total=dataRows.length; let imported=0, skipped=0; const errors=[];
    // هر قطعه شامل ردیف سرستون + بخشی از داده‌ها است، و offset=0 تا سرور همیشه سرستون را تشخیص دهد
    let pos=0;
    while(pos<total){
      const slice=dataRows.slice(pos, pos+CHUNK);
      const chunk=[header, ...slice]; // سرستون + داده‌های این قطعه
      setStage(`در حال ارسال ردیف‌های ${fa(pos+1)} تا ${fa(Math.min(pos+CHUNK,total))} از ${fa(total)}…`);
      setProgress(Math.round((pos/total)*100));
      const r=await SEND("POST","/admin/import-chunk/"+kind,{rows:chunk, offset:0});
      imported+=r.imported||0; skipped+=r.skipped||0;
      if(r.errors&&r.errors.length&&errors.length<8) errors.push(...r.errors.slice(0,8-errors.length));
      pos+=CHUNK;
    }
    setProgress(100);
    return {imported, skipped, errors};
  };
  const up=async(kind,input)=>{ const file=input.files[0]; if(!file)return; setBusy(kind); setResult(null); setProgress(null);
    const big=file.size>1.5*1024*1024; // فایل‌های بزرگ‌تر از ۱.۵ مگابایت → قطعه‌قطعه
    const msgs=["در حال آپلود فایل به سرور…","در حال خواندن ردیف‌های اکسل…","در حال ذخیره در دیتابیس…","در حال نهایی‌سازی…"];
    let mi=0; let iv=null;
    if(!big){ setStage(msgs[0]); iv=setInterval(()=>{ mi=(mi+1)%msgs.length; setStage(msgs[mi]); },1600); }
    try{
      const r = big ? await upChunked(kind,file) : await db.importExcel(kind,file);
      setResult({kind, imported:r.imported||0, skipped:r.skipped||0, errors:r.errors||[]});
    }catch(e){ setResult({kind, error:e.message}); } finally{ if(iv)clearInterval(iv); setStage(""); setBusy(null); setProgress(null); } };
  return(<div className="panel"><h3>بروزرسانی دیتابیس از فایل اکسل</h3>
    {busy&&<div style={{position:"fixed",inset:0,background:"rgba(15,27,45,.55)",display:"grid",placeItems:"center",zIndex:9999}}>
      <div style={{background:"#fff",borderRadius:16,padding:"28px 34px",textAlign:"center",minWidth:300}}>
        <div className="spinner"></div>
        <p style={{fontWeight:800,marginTop:14}}>در حال پردازش فایل…</p>
        <p style={{color:"var(--muted)",fontSize:13,marginTop:6}}>{stage}</p>
        {progress!=null&&<div style={{marginTop:12,background:"#eef1f5",borderRadius:8,height:10,overflow:"hidden"}}>
          <div style={{width:progress+"%",height:"100%",background:"var(--brand)",transition:"width .3s"}}></div></div>}
        {progress!=null&&<p style={{fontSize:12,color:"var(--muted)",marginTop:6}}>{fa(progress)}٪</p>}
        <p style={{color:"var(--muted)",fontSize:11,marginTop:10}}>برای فایل‌های بزرگ ممکن است چند دقیقه طول بکشد؛ این صفحه را نبندید.</p>
      </div></div>}
    <BillReasonCodeEditor/>
    <OplicImportFilterEditor/>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>فایل خروجی سامانهٔ جامع تاکسیرانی را انتخاب کنید. فایل‌های بزرگ به‌صورت خودکار در مرورگر به قطعات کوچک تقسیم و تکه‌تکه ارسال می‌شوند تا خطای حجم/زمان رخ ندهد.</p>
    {kinds.map(([k,t])=><div key={k} className="row" style={{marginBottom:10,justifyContent:"space-between",border:"1px solid var(--line)",borderRadius:12,padding:"10px 14px"}}>
      <span style={{fontSize:13}}>{t}</span><div className="row"><input type="file" accept=".xlsx" id={"f_"+k} style={{fontSize:12}}/>
      <button className="btn p" onClick={()=>up(k,document.getElementById("f_"+k))} disabled={busy===k}>{busy===k?"در حال بارگذاری…":"بارگذاری"}</button></div></div>)}
    {result&&<div className="card" style={{marginTop:14}}>
      {result.error?<p style={{color:"var(--danger)"}}>خطا: {result.error}</p>:<div>
        <p>✅ واردشده: <b>{fa(result.imported)}</b> · ردشده: <b>{fa(result.skipped)}</b></p>
        {result.errors.length>0&&<div style={{marginTop:6}}><p className="muted">نمونهٔ خطاهای ردیف:</p>
          {result.errors.map((e,i)=><div key={i} style={{fontSize:12,color:"var(--danger)"}}>{e}</div>)}</div>}
      </div>}
    </div>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:12}}>اگر فایل کوچک بود و خطای حجم گرفتید، در کنترل‌پنل هاست مقدار upload_max_filesize و post_max_size را افزایش دهید. فایل‌های بزرگ نیازی به این تنظیم ندارند چون تکه‌تکه ارسال می‌شوند.</p>
  </div>);
}

function OfficialVisitImg({id}){
  const [src,setSrc]=React.useState(null); const [failed,setFailed]=React.useState(false);
  React.useEffect(()=>{ let alive=true; setSrc(null); setFailed(false);
    fetch(API_BASE+"/admin/official-visits/"+id+"/image",{headers:tok()})
      .then(r=>{ if(!r.ok) throw new Error('no image'); return r.blob(); })
      .then(b=>{ if(alive) setSrc(URL.createObjectURL(b)); }).catch(()=>{ if(alive) setFailed(true); });
    return ()=>{ alive=false; };
  },[id]);
  if(failed) return <div style={{width:"100%",height:220,background:"#f5f6f8",borderRadius:10,display:"grid",placeItems:"center",color:"var(--muted)",fontSize:13}}>تصویری برای این حضور ثبت نشده است.</div>;
  if(!src) return <div style={{width:"100%",height:220,background:"#eef1f7",borderRadius:10}}/>;
  return <img src={src} alt="" style={{width:"100%",maxHeight:420,objectFit:"contain",borderRadius:10,background:"#f5f6f8"}}/>;
}

function Officials(){
  const [rows,setRows]=useState([]); const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [people,setPeople]=useState([]); const [officialId,setOfficialId]=useState(""); const [role,setRole]=useState("");
  const [detail,setDetail]=useState(null);
  const chartRef=useRef(); const [chart,setChart]=useState({labels:[],data:[]});
  const load=()=>{ const qp=[]; if(officialId)qp.push("official_id="+officialId); if(role)qp.push("role="+encodeURIComponent(role)); if(from)qp.push("from="+from); if(to)qp.push("to="+to);
    GET("/admin/official-visits"+(qp.length?("?"+qp.join("&")):"")).then(setRows).catch(()=>{}); };
  useEffect(()=>{load(); db.officialChart().then(setChart).catch(()=>{}); GET("/admin/official-list").then(setPeople).catch(()=>{});},[]);
  // سمت‌های موجود از فهرست مسئولین
  const roles=[...new Set(people.map(p=>p.role_title).filter(Boolean))];
  // افراد فیلترشده بر اساس سمت انتخابی
  const filteredPeople=role?people.filter(p=>p.role_title===role):people;
  useEffect(()=>{
    if(!chartRef.current)return;
    const c=new Chart(chartRef.current,{type:"bar",data:{labels:chart.labels,
      datasets:[{label:"تعداد حضور",data:chart.data,backgroundColor:"#0d7a5f",borderRadius:6}]},
      options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{ticks:{font:{family:"Vazirmatn"}}},y:{ticks:{font:{family:"Vazirmatn"}}}}}});
    return()=>c.destroy();
  },[chart]);
  const exportExcel=()=>{ const aoa=[["تاریخ","مسئول","سمت","خط","ثبت‌کننده","توضیحات"],
    ...rows.map(r=>[fj(r.created_at),r.official,r.official_role,r.line||"",r.recorded_by,r.note||""])];
    const ws=XLSX.utils.aoa_to_sheet(aoa); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"حضور مسئولین"); XLSX.writeFile(wb,"حضور_مسئولین_در_خط.xlsx"); };
  return(<div className="grid2">
    <div className="panel"><h3>حضور مسئولین در خط</h3>
      <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:10}}>
        <select className="input" style={{padding:"6px 10px",maxWidth:150}} value={role} onChange={e=>{setRole(e.target.value);setOfficialId("");}}>
          <option value="">همهٔ سمت‌ها</option>
          {roles.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input" style={{padding:"6px 10px",maxWidth:170}} value={officialId} onChange={e=>setOfficialId(e.target.value)}>
          <option value="">همهٔ افراد</option>
          {filteredPeople.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="label">از</span><JDate value={from} onChange={setFrom}/>
        <span className="label">تا</span><JDate value={to} onChange={setTo}/>
        <button className="btn p" onClick={load}>فیلتر</button>
        <button className="btn g" onClick={()=>{setRole("");setOfficialId("");setFrom("");setTo("");setTimeout(load,0);}}>پاک کردن</button>
        <button className="btn g" onClick={exportExcel}>⬇ Excel</button>
      </div>
      <p className="muted" style={{fontSize:12,marginBottom:6}}>{fa(rows.length)} رکورد</p>
      <table><thead><tr><th>تاریخ</th><th>مسئول</th><th>سمت</th><th>خط</th><th>ثبت‌کننده</th><th></th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><td>{fj(r.created_at)}</td><td>{r.official}</td><td>{r.official_role}</td>
        <td>{r.line||"—"}</td><td>{r.recorded_by}</td>
        <td><button className="btn g" onClick={()=>setDetail(r)}>جزئیات</button></td></tr>)}</tbody></table>
      {rows.length===0&&<p style={{color:"var(--muted)",fontSize:13,textAlign:"center",padding:12}}>رکوردی یافت نشد.</p>}</div>
    <div className="panel"><h3>نمودار حضور هر مسئول</h3><canvas ref={chartRef} height="220"></canvas></div>
    {detail&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"grid",placeItems:"center",zIndex:50,padding:16}} onClick={()=>setDetail(null)}>
      <div className="panel" style={{maxWidth:460,width:"100%",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{marginBottom:10}}>جزئیات حضور مسئول <button className="btn g" style={{float:"left"}} onClick={()=>setDetail(null)}>بستن ✕</button></h3>
        <div style={{marginBottom:12}}><OfficialVisitImg id={detail.id}/></div>
        <div style={{fontSize:13,lineHeight:2.2}}>
          <div><b>مسئول:</b> {detail.official} — {detail.official_role||"—"}</div>
          <div><b>خط:</b> {detail.line||"—"}</div>
          <div><b>ثبت‌کننده:</b> {detail.recorded_by}</div>
          <div><b>تاریخ و ساعت:</b> {fj(detail.created_at)}</div>
          {detail.lat&&detail.lng&&<div><b>موقعیت:</b> <a href={`https://www.google.com/maps?q=${detail.lat},${detail.lng}`} target="_blank" rel="noreferrer">نمایش روی نقشه</a></div>}
          <div style={{marginTop:8}}><b>توضیحات ثبت‌شده:</b><div style={{background:"#f7f8fa",borderRadius:8,padding:10,marginTop:4,minHeight:36}}>{detail.note||<span style={{color:"var(--muted)"}}>توضیحی ثبت نشده است.</span>}</div></div>
        </div>
      </div>
    </div>}
  </div>);
}


function Messages(){
  const [tab,setTab]=useState("compose"); const [list,setList]=useState([]); const [users,setUsers]=useState([]); const [zones,setZones]=useState([]);
  const [target,setTarget]=useState("all"); const [zoneId,setZoneId]=useState(""); const [sel,setSel]=useState([]);
  const [title,setTitle]=useState(""); const [body,setBody]=useState(""); const [receipts,setReceipts]=useState(null); const [sending,setSending]=useState(false); const [att,setAtt]=useState(null); const [alsoSms,setAlsoSms]=useState(false); const [alsoBale,setAlsoBale]=useState(false);
  const reload=()=>db.messages().then(setList).catch(()=>{});
  useEffect(()=>{reload(); db.users().then(setUsers).catch(()=>{}); db.zones().then(setZones).catch(()=>{})},[]);
  const send=async()=>{ if(!body)return alert("متن پیام را وارد کنید."); setSending(true);
    try{ const r=await db.sendMessage({title,body,target_type:target,zone_id:zoneId?+zoneId:null,user_ids:sel,attachment_name:att?.name,attachment_data:att?.data,also_sms:alsoSms,also_bale:alsoBale,also_messengers:alsoBale});
      alert(`پیام به ${fa(r.recipients||0)} نفر ارسال شد.`+(alsoSms?` پیامک به ${fa(r.sms_sent||0)} شماره ارسال شد.`:"")+(alsoBale?` ربات‌ها: ${fa(r.messenger_sent||r.bale_sent||0)} ارسال، ${fa(r.messenger_not_connected||r.bale_not_connected||0)} متصل‌نشده.`:"")); setTitle("");setBody("");setSel([]);setAtt(null);setAlsoSms(false);setAlsoBale(false);setTab("sent");reload();
    }catch(e){alert(e.message);} setSending(false); };
  const showReceipts=async m=>{ setReceipts({m,rows:null}); const rows=await db.receipts(m.id); setReceipts({m,rows}); };
  const toggleU=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  return(<div className="panel"><h3>پیام‌رسانی به نیروها
    <span className="row" style={{gap:8}}><button className={"btn "+(tab==="compose"?"p":"g")} onClick={()=>setTab("compose")}>ارسال پیام</button>
      <button className={"btn "+(tab==="sent"?"p":"g")} onClick={()=>setTab("sent")}>پیام‌های ارسالی</button></span></h3>
    {tab==="compose"?<div>
      <label className="label">گیرندگان</label>
      <div className="row" style={{gap:8}}>
        {[["all","همهٔ نیروها"],["zone","یک منطقه"],["selected","انتخاب نیروها"]].map(([v,t])=>
          <span key={v} className={"chip"+(target===v?" on":"")} style={{cursor:"pointer"}} onClick={()=>setTarget(v)}>{t}</span>)}
      </div>
      {target==="zone"&&<select className="input" style={{marginTop:10}} value={zoneId} onChange={e=>setZoneId(e.target.value)}>
        <option value="">منطقه را انتخاب کنید</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>}
      {target==="selected"&&<div style={{maxHeight:160,overflow:"auto",border:"1px solid var(--line)",borderRadius:11,padding:8,marginTop:10}}>
        {users.map(u=><label key={u.id} className="row" style={{justifyContent:"space-between",padding:"5px 4px"}}>
          <span style={{fontSize:13}}>{u.first_name} {u.last_name} <span style={{color:"var(--muted)",fontSize:11}}>({u.role_title})</span></span>
          <input type="checkbox" checked={sel.includes(u.id)} onChange={()=>toggleU(u.id)}/></label>)}</div>}
      <label className="label">عنوان (اختیاری)</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)}/>
      <label className="label">متن پیام</label><textarea className="input" rows="4" value={body} onChange={e=>setBody(e.target.value)}></textarea>
      <label className="label">پیوست (اختیاری)</label><input type="file" onChange={async e=>{const file=e.target.files[0]; if(!file)return; const data=await compressImage(file); if(data.length>4000000){alert("حجم فایل پس از فشرده‌سازی هم زیاد است");return;} setAtt({name:file.name,data});}}/>{att&&<p className="muted">پیوست: {att.name}</p>}
      <label className="row" style={{gap:8,marginTop:12}}><input type="checkbox" checked={alsoSms} onChange={e=>setAlsoSms(e.target.checked)}/>همین متن به‌صورت پیامک هم برای گیرندگان ارسال شود (نیازمند فعال‌بودن سرویس پیامک و وجود موبایل کاربران)</label>
      <label className="row" style={{gap:8,marginTop:8}}><input type="checkbox" checked={alsoBale} onChange={e=>setAlsoBale(e.target.checked)}/>همین متن از طریق ربات‌های بله، تلگرام و ایتا برای کاربران متصل ارسال شود</label>
      <button className="btn p" style={{marginTop:14}} onClick={send} disabled={sending}>{sending?"در حال ارسال…":"ارسال پیام"}</button>
    </div>:<div>
      <table><thead><tr><th>عنوان/متن</th><th>فرستنده</th><th>زمان</th><th>خوانده‌شده</th><th></th></tr></thead>
      <tbody>{list.map(m=><tr key={m.id}><td>{m.title||m.body.slice(0,40)}</td><td>{m.sender}</td><td>{fj(m.created_at)}</td>
        <td><span className={"badge "+(m.read_count===m.total?"b-ok":"b-w")}>{fa(m.read_count)} از {fa(m.total)}</span></td>
        <td><button className="btn g" onClick={()=>showReceipts(m)}>چه کسانی خواندند</button></td></tr>)}</tbody></table>
    </div>}
    {receipts&&<Modal title={"رسید خواندن — "+(receipts.m.title||"پیام")} onClose={()=>setReceipts(null)}>
      {!receipts.rows?<p className="muted">در حال بارگذاری…</p>:<>
      <div className="row" style={{justifyContent:"flex-start",marginBottom:8}}>
        <button className="btn g" onClick={()=>{
          const rows=[["نام","سمت","وضعیت","زمان خواندن (شمسی)"]];
          receipts.rows.forEach(r=>rows.push([r.name,r.role,r.read_at?"خوانده‌شده":"خوانده‌نشده",r.read_at?fj(r.read_at):"—"]));
          const ws=XLSX.utils.aoa_to_sheet(rows); const wb=XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb,ws,"رسید"); XLSX.writeFile(wb,`رسید_${(receipts.m.title||"پیام")}.xlsx`);
        }}>⬇ خروجی اکسل وضعیت خواندن</button>
      </div>
      <table><thead><tr><th>نام</th><th>سمت</th><th>وضعیت</th></tr></thead>
      <tbody>{receipts.rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.role}</td>
        <td><span className={"badge "+(r.read_at?"b-ok":"b-no")}>{r.read_at?("خوانده — "+fj(r.read_at)):"خوانده‌نشده"}</span></td></tr>)}</tbody></table></>}
    </Modal>}
  </div>);
}

// تعیین روش‌های مجاز ثبت حضور برای یک خط
function LineMethods({line,onClose}){
  const ALL=[["gps","موقعیت (GPS)"],["gsm","آنتن GSM (دکل مخابراتی)"],["qr","QR کد"],["wifi","WiFi"],["nfc","NFC"],["bt","بلوتوث"]];
  const init=()=>{ try{ const m=line.checkin_methods; if(!m)return null; return Array.isArray(m)?m:JSON.parse(m); }catch(e){return null;} };
  const [sel,setSel]=useState(init()); // null = همه مجاز
  const [busy,setBusy]=useState(false);
  const toggle=(k)=>{ const cur=sel?[...sel]:ALL.map(x=>x[0]); const i=cur.indexOf(k); i>=0?cur.splice(i,1):cur.push(k); setSel(cur); };
  const save=async()=>{ setBusy(true); try{ await db.setLineMethods(line.id, (sel&&sel.length&&sel.length<ALL.length)?sel:(sel&&sel.length?sel:null)); alert("روش‌های ثبت حضور این خط ذخیره شد."); onClose(); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  const allOn=!sel||sel.length===0;
  return(<Modal title={`روش‌های ثبت حضور — خط ${line.code}`} onClose={onClose}>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>تعیین کنید در این خط با کدام روش‌ها بتوان ثبت حضور کرد. اگر هیچ‌کدام انتخاب نشود، همهٔ روش‌ها مجاز خواهند بود.</p>
    <label className="row" style={{gap:8,marginBottom:10,fontWeight:700}}><input type="checkbox" checked={allOn} onChange={()=>setSel(allOn?["gps"]:null)}/>همهٔ روش‌ها مجاز باشند</label>
    {!allOn&&<div style={{display:"flex",flexDirection:"column",gap:8,marginInlineStart:8}}>
      {ALL.map(([k,t])=>{ const on=sel&&sel.includes(k); return(
        <label key={k} className="row" style={{gap:8,alignItems:"center"}}><input type="checkbox" checked={!!on} onChange={()=>toggle(k)}/>{t}
          {k!=="gps"&&<span className="muted" style={{fontSize:11}}>(نیازمند تعریف شناسهٔ حضور)</span>}</label>); })}
    </div>}
    <div className="row" style={{gap:8,marginTop:14}}>
      <button className="btn p" disabled={busy} onClick={save}>{busy?"در حال ذخیره…":"ذخیره"}</button>
      <button className="btn g" onClick={onClose}>انصراف</button>
    </div>
  </Modal>);
}

// --- ابزارهای مشترک بخش «خطوط تاکسیرانی»: نقشه، موقعیت ایستگاه‌ها، نوع تابلوها، خروجی اکسل و جزئیات خط ---
// نکته: این endpoint (station-admin-v4.php) در ریشهٔ اپ PHP است، نه زیر /api، پس از GET/SEND ماژول استفاده نمی‌کند.
async function sa4(op, opts){
  opts = opts || {};
  const headers = Object.assign({}, tok(), {Accept:'application/json'}, opts.headers||{});
  const r = await fetch('/station-admin-v4.php?op='+encodeURIComponent(op), Object.assign({}, opts, {headers, cache:'no-store'}));
  const d = await _readJsonResponse(r);
  if(!r.ok) throw new Error(d.error||d.message||'خطای سرور');
  return d;
}
// تصاویر ایستگاه/تابلو از یک endpoint احرازهویت‌شده سرو می‌شوند؛ برای نمایش مستقیم در <img>
// (که نمی‌تواند هدر Authorization بفرستد) توکن به‌صورت پارامتر access_token اضافه می‌شود.
function authImg(url){
  if(!url) return '';
  const t = localStorage.token||''; if(!t) return url;
  return url + (url.indexOf('?')>=0?'&':'?') + 'access_token=' + encodeURIComponent(t);
}
function validCoord(lat,lon){ lat=Number(lat); lon=Number(lon); return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180; }

function LineStationDetailModal({line,onClose}){
  const [data,setData]=useState(null); const [err,setErr]=useState(''); const [history,setHistory]=useState(null); const [histBusy,setHistBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    sa4('map').then(d=>{
      if(!active)return;
      const x=(d.lines||[]).find(z=>String(z.id)===String(line.id));
      if(!x){ setErr('اطلاعات این خط پیدا نشد.'); return; }
      setData(x);
    }).catch(e=>{ if(active) setErr(e.message||'خطا در دریافت اطلاعات'); });
    return ()=>{active=false};
  },[line.id]);
  const loadHistory=async()=>{
    if(!data?.station_id) return;
    setHistBusy(true);
    try{
      const r=await fetch('/station-history-details.php?station_id='+encodeURIComponent(data.station_id),{headers:tok(),cache:'no-store'});
      const q=await _readJsonResponse(r);
      if(!r.ok) throw new Error(q.error||'خطا در دریافت سوابق');
      setHistory(q.history||[]);
    }catch(e){ setHistory([]); alert(e.message||'خطا در دریافت سوابق'); }
    finally{ setHistBusy(false); }
  };
  return(<Modal title={"جزئیات خط "+(line.code||'')} onClose={onClose}>
    {err&&<p className="muted" style={{color:'#b42318'}}>{err}</p>}
    {!err&&!data&&<p className="muted">در حال دریافت جزئیات…</p>}
    {data&&<div>
      <div className="row" style={{gap:8,flexWrap:'wrap',marginBottom:14}}>
        <div className="card-p"><b>کد خط</b><div>{fa(data.code)}</div></div>
        <div className="card-p"><b>مبدأ</b><div>{data.origin||'—'}</div></div>
        <div className="card-p"><b>مقصد</b><div>{data.destination||'—'}</div></div>
        <div className="card-p"><b>وضعیت ایستگاه</b><div>{data.registered?'ثبت شده':'ثبت نشده'}</div></div>
        <div className="card-p"><b>مختصات</b><div>{validCoord(data.latitude,data.longitude)?(data.latitude+'، '+data.longitude):'ثبت نشده'}</div></div>
        <div className="card-p"><b>دقت GPS</b><div>{data.accuracy_m?fa(data.accuracy_m)+' متر':'—'}</div></div>
        <div className="card-p"><b>آدرس فیزیکی</b><div>{data.physical_address||'—'}</div></div>
        <div className="card-p"><b>تاریخ ثبت</b><div>{data.captured_at||'—'}</div></div>
        <div className="card-p"><b>ثبت‌کننده</b><div>{data.captured_by_name||'—'}</div></div>
        <div className="card-p"><b>آخرین ویرایش خط</b><div>{data.location_updated_at||'—'}</div></div>
      </div>
      {validCoord(data.latitude,data.longitude)&&<button className="btn g" style={{marginBottom:12}} onClick={()=>window.open('https://www.openstreetmap.org/?mlat='+encodeURIComponent(data.latitude)+'&mlon='+encodeURIComponent(data.longitude)+'#map=19/'+encodeURIComponent(data.latitude)+'/'+encodeURIComponent(data.longitude),'_blank','noopener')}>مشاهده موقعیت روی نقشه</button>}
      <h4 style={{margin:'10px 0'}}>تصویر ایستگاه</h4>
      {data.location_photo_url?<a href={authImg(data.location_photo_url)} target="_blank" rel="noopener"><img src={authImg(data.location_photo_url)} style={{width:220,maxHeight:170,objectFit:'cover',borderRadius:10,marginBottom:14}}/></a>:<p className="muted">تصویر ایستگاه ثبت نشده است.</p>}
      <h4 style={{margin:'10px 0'}}>تابلوها ({fa((data.signs||[]).length)})</h4>
      <div className="row" style={{gap:10,flexWrap:'wrap',marginBottom:12}}>
        {(data.signs||[]).length?data.signs.map(z=><a key={z.id} href={authImg(z.photo_url)} target="_blank" rel="noopener" style={{display:'block',width:150}}>
          <img src={authImg(z.photo_url)} style={{width:150,height:110,objectFit:'cover',borderRadius:8}}/>
          <div className="muted" style={{fontSize:11,marginTop:4}}>{z.title||z.code||'تابلو'}</div>
        </a>):<p className="muted">تابلویی ثبت نشده است.</p>}
      </div>
      {data.station_id?<div>
        {!history&&<button className="btn g" onClick={loadHistory} disabled={histBusy}>{histBusy?'در حال دریافت…':'نمایش لاگ ثبت و ویرایش ایستگاه'}</button>}
        {history&&history.length>0&&<table style={{marginTop:10}}><thead><tr><th>تاریخ ثبت</th><th>کد ایستگاه</th><th>وضعیت</th><th>مختصات</th><th>دقت</th><th>تعداد تابلو</th><th>ثبت‌کننده</th></tr></thead>
          <tbody>{history.map((r,i)=><tr key={i}><td>{r.captured_at}</td><td>{r.station_code}</td><td>{r.station_status}</td><td>{r.latitude&&r.longitude?(r.latitude+'، '+r.longitude):'—'}</td><td>{r.accuracy_m||'—'}</td><td>{fa(r.sign_count||0)}</td><td>{r.captured_by_name||r.captured_by||'—'}</td></tr>)}</tbody>
        </table>}
        {history&&history.length===0&&<p className="muted" style={{marginTop:8}}>سابقه‌ای برای این ایستگاه ثبت نشده است.</p>}
      </div>:null}
    </div>}
  </Modal>);
}

function LineMapPanel(){
  const ref=useRef(); const [stats,setStats]=useState(null); const [err,setErr]=useState('');
  useEffect(()=>{
    let active=true;
    const map=L.map(ref.current,{minZoom:10,maxZoom:19}).setView([36.297,59.606],12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:10,maxZoom:19,maxNativeZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    sa4('map').then(d=>{
      if(!active)return;
      setStats(d.stats);
      const bounds=[];
      (d.lines||[]).forEach(x=>{
        if(!validCoord(x.latitude,x.longitude))return;
        const lat=Number(x.latitude), lon=Number(x.longitude);
        const marker=L.circleMarker([lat,lon],{radius:8,weight:2,fillOpacity:.9,fillColor:x.registered?'#168a58':'#d92d20'}).addTo(map);
        let html='<div dir="rtl" style="font-family:Vazirmatn,Tahoma"><b>خط '+(x.code||'بدون شماره')+'</b><br>'+[x.origin,x.destination].filter(Boolean).join(' تا ')+'<br>وضعیت: '+(x.registered?'ایستگاه ثبت شده':'ایستگاه ثبت نشده');
        if(x.registered){
          if(x.physical_address)html+='<br>آدرس: '+x.physical_address;
          if(x.accuracy_m!=null)html+='<br>دقت GPS: '+x.accuracy_m+' متر';
          if(x.location_photo_url)html+='<br><img src="'+authImg(x.location_photo_url)+'" style="width:180px;max-height:140px;object-fit:cover;border-radius:8px;margin-top:6px">';
        }
        html+='</div>';
        marker.bindPopup(html,{maxWidth:310});
        bounds.push([lat,lon]);
      });
      if(bounds.length)map.fitBounds(bounds,{padding:[20,20],maxZoom:18});
    }).catch(e=>active&&setErr(e.message||'خطا در دریافت اطلاعات نقشه'));
    setTimeout(()=>map.invalidateSize(),250);
    return ()=>{active=false; map.remove();};
  },[]);
  return(<div>
    {stats&&<div className="row" style={{gap:10,flexWrap:'wrap',marginBottom:10}}>
      <div className="card-p">کل خطوط: <b>{fa(stats.total)}</b></div>
      <div className="card-p">ثبت‌شده: <b>{fa(stats.registered)}</b></div>
      <div className="card-p">ثبت‌نشده: <b>{fa(stats.unregistered)}</b></div>
    </div>}
    {err&&<p className="muted" style={{color:'#b42318'}}>{err}</p>}
    <div ref={ref} style={{height:470,borderRadius:13,overflow:'hidden',border:'1px solid var(--line)'}}></div>
  </div>);
}

function LineLocationsPanel(){
  const [rows,setRows]=useState(null); const [err,setErr]=useState('');
  useEffect(()=>{ let active=true; sa4('map').then(d=>{if(active)setRows(d.lines||[])}).catch(e=>active&&setErr(e.message||'خطا در دریافت اطلاعات')); return ()=>{active=false}; },[]);
  if(err) return <p className="muted" style={{color:'#b42318'}}>{err}</p>;
  if(!rows) return <p className="muted">در حال بارگذاری…</p>;
  return(<div style={{overflow:'auto'}}><table><thead><tr><th>خط</th><th>مبدأ و مقصد</th><th>مختصات</th><th>وضعیت ایستگاه</th><th>آدرس</th><th>تابلوها / نوع</th><th>تصویر ایستگاه</th></tr></thead>
  <tbody>{rows.map(x=>{ const signs=x.signs||[]; const types=signs.map(z=>z.title||z.code).filter(Boolean).join('، ');
    return(<tr key={x.id}><td>{x.code}</td><td>{[x.origin,x.destination].filter(Boolean).join(' تا ')}</td>
      <td>{validCoord(x.latitude,x.longitude)?x.latitude+'، '+x.longitude:'بدون مختصات'}</td>
      <td>{x.registered?'ثبت شده':'ثبت نشده'}</td><td>{x.physical_address||'—'}</td>
      <td>{fa(signs.length)}{types?<><br/><small>{types}</small></>:null}</td>
      <td>{x.location_photo_url?<img src={authImg(x.location_photo_url)} style={{width:72,height:54,objectFit:'cover',borderRadius:7}}/>:'—'}</td>
    </tr>); })}</tbody></table></div>);
}

function LineSignTypesPanel(){
  const [types,setTypes]=useState(null); const [edit,setEdit]=useState(null); // null=بسته، آبجکت=در حال ویرایش/افزودن
  const load=()=>sa4('types').then(d=>setTypes(d.types||[])).catch(()=>setTypes([]));
  useEffect(()=>{load()},[]);
  const save=async()=>{
    if(!edit.title||!edit.title.trim()) return alert('عنوان نوع تابلو الزامی است.');
    await sa4('save-type',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:edit.id||0,title:edit.title.trim(),code:edit.code||'',sort_order:Number(edit.sort_order)||0,is_active:!!edit.is_active})});
    setEdit(null); load();
  };
  const del=async id=>{
    if(!confirm('این نوع تابلو حذف/غیرفعال شود؟')) return;
    const fd=new URLSearchParams({id}); await sa4('delete-type',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:fd}); load();
  };
  if(!types) return <p className="muted">در حال بارگذاری…</p>;
  return(<div>
    <button className="btn p" style={{marginBottom:10}} onClick={()=>setEdit({title:'',code:'',sort_order:types.length,is_active:true})}>+ افزودن نوع تابلو</button>
    <table><thead><tr><th>ترتیب</th><th>عنوان</th><th>کد</th><th>وضعیت</th><th>عملیات</th></tr></thead>
    <tbody>{types.map(x=><tr key={x.id}><td>{fa(x.sort_order)}</td><td>{x.title}</td><td>{x.code||'—'}</td><td>{Number(x.is_active)?'فعال':'غیرفعال'}</td>
      <td><button className="btn g" onClick={()=>setEdit({...x})}>ویرایش</button> <button className="btn g" onClick={()=>del(x.id)}>حذف</button></td></tr>)}</tbody></table>
    {edit&&<Modal title={edit.id?'ویرایش نوع تابلو':'نوع تابلوی جدید'} onClose={()=>setEdit(null)}>
      <div style={{display:'grid',gap:10}}>
        <div><label className="label">عنوان</label><input className="input" value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})}/></div>
        <div><label className="label">کد (اختیاری)</label><input className="input" value={edit.code||''} onChange={e=>setEdit({...edit,code:e.target.value})}/></div>
        <div><label className="label">ترتیب نمایش</label><input className="input" type="number" value={edit.sort_order??0} onChange={e=>setEdit({...edit,sort_order:e.target.value})}/></div>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!edit.is_active} onChange={e=>setEdit({...edit,is_active:e.target.checked})}/> فعال</label>
        <button className="btn p" onClick={save}>ذخیره</button>
      </div>
    </Modal>}
  </div>);
}

function LineExcelPanel(){
  const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  const run=async()=>{
    setBusy(true); setMsg('در حال تولید فایل...');
    try{ await downloadProtectedFile('/line-location-export-v4.php','گزارش-خطوط-و-ایستگاه‌ها.xlsx'); setMsg('✓ فایل تولید و دانلود شد'); }
    catch(e){ setMsg(e.message||'خطا در تولید فایل'); }
    finally{ setBusy(false); }
  };
  return(<div>
    <p className="muted" style={{marginBottom:10}}>خروجی شامل اطلاعات خطوط، موقعیت ایستگاه، تعداد و نوع تابلوها، تصاویر ایستگاه و تابلوها و لینک مشاهده موقعیت روی نقشه است.</p>
    <button className="btn p" onClick={run} disabled={busy}>{busy?'در حال تولید…':'تولید و دانلود Excel'}</button>
    {msg&&<span className="muted" style={{marginRight:8}}>{msg}</span>}
  </div>);
}

function Lines(){
  const [list,setList]=useState([]); const [editLine,setEditLine]=useState(null); const [counts,setCounts]=useState({}); const [identLine,setIdentLine]=useState(null); const [methodLine,setMethodLine]=useState(null); const [detailLine,setDetailLine]=useState(null);
  const [adding,setAdding]=useState(false); const [nl,setNl]=useState({code:"",origin:"",destination:""});
  // چهار زیربخش «نقشه/موقعیت‌ها/نوع تابلو/خروجی اکسل» به‌صورت تب‌های همین صفحه (نه آیتم جدا در سایدبار) نمایش داده می‌شوند.
  const [tab,setTab]=useState('list');
  const TABS=[['list','فهرست خطوط'],['map','نقشه خطوط'],['locations','موقعیت خطوط و ایستگاه‌ها'],['types','تنظیمات نوع تابلوها'],['excel','خروجی Excel']];
  const addLine=async()=>{ if(!nl.code)return alert("کد خط لازم است"); await db.createLine(nl); setNl({code:"",origin:"",destination:""}); setAdding(false); load(); };
  const load=()=>db.lines().then(setList).catch(()=>{});
  const loadCounts=()=>db.geofences().then(all=>{ const c={}; (all||[]).forEach(g=>{ if(g.line_id) c[g.line_id]=(c[g.line_id]||0)+1; }); setCounts(c); }).catch(()=>{});
  useEffect(()=>{load(); loadCounts()},[]);
  const [q,setQ]=useState(""); const term=q.trim();
  const filtered=list.filter(l=>!term || (l.code&&String(l.code).includes(term)) || (l.origin&&l.origin.includes(term)) || (l.destination&&l.destination.includes(term)));
  const pg=usePager(filtered,10);
  return(<div className="panel"><h3>خطوط تاکسیرانی {tab==='list'&&<button className="btn p" onClick={()=>setAdding(a=>!a)}>+ تعریف خط جدید</button>}</h3>
    <div className="row" style={{gap:6,flexWrap:'wrap',marginBottom:14,borderBottom:'1px solid var(--line)',paddingBottom:10}}>
      {TABS.map(([key,label])=><button key={key} className={"btn "+(tab===key?'p':'g')} onClick={()=>setTab(key)}>{label}</button>)}
    </div>
    {tab==='list'&&<div>
      {adding&&<div className="card-p" style={{display:"block",marginBottom:12}}>
        <div className="row" style={{gap:8,flexWrap:"wrap"}}>
          <input className="input" style={{maxWidth:110}} placeholder="کد خط" value={nl.code} onChange={e=>setNl({...nl,code:e.target.value})}/>
          <input className="input" style={{maxWidth:180}} placeholder="مبدأ" value={nl.origin} onChange={e=>setNl({...nl,origin:e.target.value})}/>
          <input className="input" style={{maxWidth:180}} placeholder="مقصد" value={nl.destination} onChange={e=>setNl({...nl,destination:e.target.value})}/>
          <button className="btn p" onClick={addLine}>ذخیره خط</button></div></div>}
      <div className="row" style={{gap:8,marginBottom:10}}>
        <input className="input" style={{maxWidth:260}} placeholder="جستجو بر اساس کد، مبدأ یا مقصد خط" value={q} onChange={e=>{setQ(e.target.value);pg.setPage(1);}}/></div>
      <p className="muted" style={{marginBottom:10}}>برای هر خط می‌توانید «محدودهٔ ایستگاه» را روی نقشه (چندضلعی یا دایره) تعریف کنید؛ این محدوده‌ها در نقشهٔ زندهٔ نیروها با رنگ دیده می‌شوند.</p>
      <table><thead><tr><th>کد</th><th>مبدأ</th><th>مقصد</th><th>وضعیت</th><th>محدوده‌ها</th><th>اقدامات</th></tr></thead>
      <tbody>{pg.slice.map(l=><tr key={l.id}><td>{l.code}</td><td>{l.origin}</td><td>{l.destination}</td>
        <td><span className={"badge "+(l.status==="فعال"?"b-ok":"b-no")}>{l.status||"—"}</span></td>
        <td>{counts[l.id]?fa(counts[l.id])+" ایستگاه":"—"}</td>
        <td><button className="btn p" onClick={()=>setDetailLine(l)}>جزئیات</button> <button className="btn p" onClick={()=>setEditLine(l)}>تعریف محدودهٔ ایستگاه</button> <button className="btn g" onClick={()=>setIdentLine(l)}>شناسه‌های حضور</button> <button className="btn g" onClick={()=>setMethodLine(l)}>روش‌های ثبت حضور</button></td></tr>)}</tbody></table>
      {list.length===0&&<p className="muted" style={{textAlign:"center",padding:12}}>خطی یافت نشد. از «ورود اطلاعات (اکسل)» فایل خطوط را بارگذاری کنید.</p>}
      {pg.Pager()}
    </div>}
    {tab==='map'&&<LineMapPanel/>}
    {tab==='locations'&&<LineLocationsPanel/>}
    {tab==='types'&&<LineSignTypesPanel/>}
    {tab==='excel'&&<LineExcelPanel/>}
    {editLine&&<LineGeofence line={editLine} onClose={()=>{setEditLine(null);loadCounts();}}/>}
    {identLine&&<LineIdents line={identLine} onClose={()=>setIdentLine(null)}/>}
    {methodLine&&<LineMethods line={methodLine} onClose={()=>{setMethodLine(null);load();}}/>}
    {detailLine&&<LineStationDetailModal line={detailLine} onClose={()=>setDetailLine(null)}/>}
  </div>);
}

// مدیریت شناسه‌های جایگزین GPS برای یک خط
function LineIdents({line,onClose}){
  const KINDS=[["wifi","WiFi (BSSID)","مثلاً a1:b2:c3:d4:e5:f6"],["gsm","آنتن GSM (Cell ID)","مثلاً 432-11-1234-5678"],["qr","QR کد","متن داخل QR"],["nfc","تگ NFC","شناسهٔ تگ"],["bt","بلوتوث (MAC)","مثلاً 00:11:22:33:44:55"]];
  const [items,setItems]=useState([]); const [kind,setKind]=useState("wifi"); const [value,setValue]=useState(""); const [label,setLabel]=useState("");
  const load=()=>db.lineIdents(line.id).then(setItems).catch(()=>{});
  useEffect(()=>{load();},[]);
  const add=async()=>{ if(!value.trim())return alert("مقدار شناسه را وارد کنید"); await db.addLineIdent(line.id,{kind,value:value.trim(),label:label.trim()||null}); setValue("");setLabel(""); load(); };
  const del=async(id)=>{ if(!confirm("حذف این شناسه؟"))return; await db.delLineIdent(id); load(); };
  const KL={wifi:"WiFi",gsm:"GSM",qr:"QR",nfc:"NFC",bt:"بلوتوث"};
  return(<Modal title={`شناسه‌های حضور — خط ${line.code}`} onClose={onClose}>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>برای هر خط می‌توانید چند BSSID وای‌فای، یک یا چند QR، تگ NFC و MAC بلوتوث تعریف کنید تا کاربر در صورت اختلال GPS بتواند با یکی از این‌ها ثبت حضور کند.</p>
    <div className="row" style={{gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
      <div><label className="label">نوع</label><select className="input" style={{maxWidth:150}} value={kind} onChange={e=>setKind(e.target.value)}>{KINDS.map(([k,t])=><option key={k} value={k}>{t}</option>)}</select></div>
      <div style={{flex:1,minWidth:160}}><label className="label">مقدار</label><input className="input" dir="ltr" placeholder={KINDS.find(x=>x[0]===kind)[2]} value={value} onChange={e=>setValue(e.target.value)}/></div>
      <div><label className="label">برچسب (اختیاری)</label><input className="input" style={{maxWidth:140}} value={label} onChange={e=>setLabel(e.target.value)}/></div>
      <button className="btn p" onClick={add}>+ افزودن</button>
    </div>
    {items.length===0?<p className="muted">هنوز شناسه‌ای تعریف نشده است.</p>:
    <table><thead><tr><th>نوع</th><th>مقدار</th><th>برچسب</th><th></th></tr></thead>
    <tbody>{items.map(it=><tr key={it.id}><td>{KL[it.kind]||it.kind}</td><td dir="ltr" style={{fontSize:12}}>{it.value}</td><td>{it.label||"—"}</td>
      <td><button className="btn g" onClick={()=>del(it.id)}>حذف</button></td></tr>)}</tbody></table>}
  </Modal>);
}

function LineGeofence({line,onClose}){
  const ref=useRef(); const mapRef=useRef(); const drawnRef=useRef();
  const [list,setList]=useState([]); const [pending,setPending]=useState(null);
  const [name,setName]=useState("خط "+line.code+" — ایستگاه"); const [color,setColor]=useState("#e23b54");
  const reloadList=()=>db.geofences().then(all=>setList((all||[]).filter(g=>g.line_id===line.id))).catch(()=>{});
  useEffect(()=>{
    const map=L.map(ref.current).setView([36.297,59.606],12); mapRef.current=map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
    const drawn=new L.FeatureGroup().addTo(map); drawnRef.current=drawn;
    const ctrl=new L.Control.Draw({edit:{featureGroup:drawn},draw:{polygon:true,circle:true,marker:false,polyline:false,rectangle:false,circlemarker:false}});
    map.addControl(ctrl);
    map.on(L.Draw.Event.CREATED,e=>{ drawn.clearLayers(); drawn.addLayer(e.layer);
      if(e.layerType==="circle"){const c=e.layer.getLatLng();setPending({type:"circle",center_lat:c.lat,center_lng:c.lng,radius_m:Math.round(e.layer.getRadius())});}
      else {const pts=e.layer.getLatLngs()[0].map(pp=>[pp.lat,pp.lng]);setPending({type:"polygon",polygon:pts});}
    });
    db.geofences().then(all=>{ const mine=(all||[]).filter(g=>g.line_id===line.id); setList(mine); mine.forEach(g=>{
      if(g.type==="circle"&&g.center_lat)L.circle([g.center_lat,g.center_lng],{radius:g.radius_m,color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(g.name);
      else if(g.polygon)L.polygon(g.polygon,{color:g.color,fillColor:g.color,fillOpacity:.18}).addTo(map).bindPopup(g.name);
    }); }).catch(()=>{});
    setTimeout(()=>map.invalidateSize(),250);
    return ()=>map.remove();
  },[]);
  const save=async()=>{ if(!pending||!name)return alert("ابتدا روی نقشه محدوده بکشید و نام را وارد کنید.");
    await db.createGeofence({...pending,name,color,line_id:line.id});
    const g={...pending,name,color};
    if(g.type==="circle")L.circle([g.center_lat,g.center_lng],{radius:g.radius_m,color,fillColor:color,fillOpacity:.18}).addTo(mapRef.current).bindPopup(name);
    else L.polygon(g.polygon,{color,fillColor:color,fillOpacity:.18}).addTo(mapRef.current).bindPopup(name);
    setPending(null); drawnRef.current.clearLayers(); reloadList();
  };
  const del=async id=>{ await db.deleteGeofence(id); reloadList(); };
  return(<Modal title={"محدودهٔ ایستگاه — خط "+line.code} onClose={onClose}>
    <p className="muted" style={{marginBottom:8}}>روی نقشه یک «چندضلعی» یا «دایره» بکشید، سپس نام و رنگ را تعیین و ذخیره کنید.</p>
    <div ref={ref} style={{height:300,borderRadius:12,overflow:"hidden",border:"1px solid var(--line)"}}></div>
    <div className="row" style={{gap:8,marginTop:10,flexWrap:"wrap"}}>
      <input className="input" style={{maxWidth:200}} placeholder="نام ایستگاه" value={name} onChange={e=>setName(e.target.value)}/>
      <label className="row" style={{gap:6}}>رنگ <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
      <button className="btn p" onClick={save}>ذخیرهٔ محدوده {pending?("("+(pending.type==="circle"?"دایره":"چندضلعی")+")"):""}</button>
    </div>
    <table style={{marginTop:12}}><thead><tr><th>نام</th><th>نوع</th><th>رنگ</th><th></th></tr></thead>
    <tbody>{list.map(g=><tr key={g.id}><td>{g.name}</td><td>{g.type==="circle"?"دایره":"چندضلعی"}</td>
      <td><span style={{display:"inline-block",width:16,height:16,borderRadius:4,background:g.color}}></span></td>
      <td><button className="btn g" onClick={()=>del(g.id)}>حذف</button></td></tr>)}</tbody></table>
  </Modal>);
}

function DriverBlock({v,set,save}){
  const bk=v.driver_block||{}; const setBk=(patch)=>set("driver_block",{...bk,...patch});
  const [q,setQ]=useState(""); const [res,setRes]=useState([]);
  const ids=bk.driver_ids||[];
  const find=async()=>{ if(q.trim().length<2)return; setRes(await db.driversSearch(q)); };
  const add=(d)=>{ if(!ids.includes(d.id)) setBk({driver_ids:[...ids,d.id], _names:{...(bk._names||{}),[d.id]:d.name}}); };
  const rm=(id)=>setBk({driver_ids:ids.filter(x=>x!==id)});
  return(<div>
    <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={!!bk.enabled} onChange={e=>setBk({enabled:e.target.checked})}/> مسدودسازی خودکار بر اساس بدهی فعال باشد</label>
    <div className="row" style={{gap:8,flexWrap:"wrap"}}>
      <div><label className="label">حداقل تعداد فیش پرداخت‌نشده</label><input className="input" type="number" style={{maxWidth:130}} value={bk.count??""} onChange={e=>setBk({count:+e.target.value||0})}/></div>
      <div><label className="label">در چند ماه اخیر</label><input className="input" type="number" style={{maxWidth:130}} value={bk.months??""} onChange={e=>setBk({months:+e.target.value||0})}/></div>
    </div>
    <label className="label" style={{marginTop:10}}>مسدودسازی دستی راننده</label>
    <div className="row" style={{gap:8}}><input className="input" placeholder="جستجوی نام/کد ملی راننده…" value={q} onChange={e=>setQ(e.target.value)}/><button className="btn g" onClick={find}>جستجو</button></div>
    {res.length>0&&<div style={{maxHeight:160,overflow:"auto",marginTop:6}}>{res.map(d=><div key={d.id} className="row" style={{justifyContent:"space-between",padding:"6px 8px",borderBottom:"1px solid var(--line)"}}>
      <span>{d.name} <span className="muted">{d.national_id}</span></span><button className="btn g" onClick={()=>add(d)}>افزودن به لیست مسدود</button></div>)}</div>}
    {ids.length>0&&<div style={{marginTop:10}}><b>رانندگان مسدودشده:</b>{ids.map(id=><div key={id} className="row" style={{justifyContent:"space-between",padding:"5px 8px",borderBottom:"1px solid var(--line)"}}>
      <span>{(bk._names&&bk._names[id])||("راننده #"+id)}</span><button className="btn t" onClick={()=>rm(id)}>حذف</button></div>)}</div>}
    <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیرهٔ تنظیمات مسدودسازی</button>
  </div>);
}

// ابزارهای پیامک: اعتبار و ارسال آزمایشی
function SmsTools(){
  const [credit,setCredit]=useState(null); const [busy,setBusy]=useState(false);
  const [to,setTo]=useState(""); const [msg,setMsg]=useState("پیام آزمایشی سامانهٔ مدیریت خطوط");
  const getCredit=async()=>{ setBusy(true); try{ const r=await db.smsCredit(); setCredit(r.ok?`اعتبار: ${Number(r.credit||0).toLocaleString('fa')} ریال`:(r.error||"خطا")); }catch(e){ setCredit(e.message||"خطا"); } setBusy(false); };
  const sendTest=async()=>{ if(!to.trim())return alert("شماره مقصد را وارد کنید"); setBusy(true); try{ const r=await db.smsTest(to.trim(),msg); alert(r.ok?("ارسال شد. شناسه: "+(r.id||"-")):("خطا: "+(r.error||""))); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  return(<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--line)"}}>
    <div className="row" style={{gap:8,alignItems:"center",marginBottom:10}}>
      <button className="btn g" disabled={busy} onClick={getCredit}>بررسی اعتبار</button>
      {credit&&<span style={{fontSize:13,color:"var(--ink)"}}>{credit}</span>}
    </div>
    <div className="label">ارسال آزمایشی:</div>
    <div className="row" style={{gap:8,marginTop:6,flexWrap:"wrap",alignItems:"flex-end"}}>
      <input className="input" dir="ltr" style={{maxWidth:160}} placeholder="09xxxxxxxxx" value={to} onChange={e=>setTo(e.target.value)}/>
      <input className="input" style={{flex:1,minWidth:200}} value={msg} onChange={e=>setMsg(e.target.value)}/>
      <button className="btn p" disabled={busy} onClick={sendTest}>ارسال آزمایشی</button>
    </div>
  </div>);
}
// مدیریت قالب‌های پیامک (با دسته و دسترسی نقش‌محور)
function SmsTemplates({v,setV,save}){
  const tpls=v.sms_templates||[];
  const [roles,setRoles]=useState([]);
  useEffect(()=>{ db.roles().then(r=>setRoles(r||[])).catch(()=>{}); },[]);
  const set=(arr)=>setV({...v,sms_templates:arr});
  const add=()=>set([...tpls,{title:"قالب جدید",body:"",category:"عمومی",roles:[]}]);
  const upd=(i,patch)=>set(tpls.map((t,j)=>j===i?{...t,...patch}:t));
  const del=(i)=>set(tpls.filter((_,j)=>j!==i));
  const toggleRole=(i,rid)=>{ const t=tpls[i]; const rs=Array.isArray(t.roles)?t.roles:[]; upd(i,{roles:rs.includes(rid)?rs.filter(x=>x!==rid):[...rs,rid]}); };
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>قالب‌ها در سایت و اپ برای کاربرانِ مجاز نمایش داده می‌شوند. با خالی‌گذاشتن «نقش‌های مجاز»، قالب برای همه در دسترس است. می‌توانید دستهٔ «فراخوان» را برای ناظران/سربازرسان تعریف کنید.</p>
    {tpls.map((t,i)=><div key={i} className="card-p" style={{marginBottom:10}}>
      <div className="row" style={{gap:8,marginBottom:6,flexWrap:"wrap"}}>
        <input className="input" style={{flex:1,minWidth:160}} placeholder="عنوان قالب" value={t.title||""} onChange={e=>upd(i,{title:e.target.value})}/>
        <input className="input" style={{maxWidth:140}} placeholder="دسته (مثلاً فراخوان)" value={t.category||""} onChange={e=>upd(i,{category:e.target.value})}/>
        <button className="btn g" onClick={()=>del(i)}>حذف</button>
      </div>
      <textarea className="input" rows="2" placeholder="متن پیامک…" value={t.body||""} onChange={e=>upd(i,{body:e.target.value})}/>
      <div className="label" style={{marginTop:8}}>نقش‌های مجاز (خالی = همه):</div>
      <div className="chiprow" style={{marginTop:6}}>{roles.map(r=>{ const on=(t.roles||[]).includes(r.id); return(
        <label key={r.id} className="chip" style={{cursor:"pointer",background:on?"var(--brand)":"",color:on?"#fff":""}}>
          <input type="checkbox" style={{marginInlineEnd:4}} checked={on} onChange={()=>toggleRole(i,r.id)}/>{r.title}
        </label>); })}</div>
    </div>)}
    <div className="row" style={{gap:10,marginTop:8}}>
      <button className="btn g" onClick={add}>+ افزودن قالب</button>
      <button className="btn p" onClick={save}>ذخیرهٔ قالب‌ها</button>
    </div>
  </div>);
}

// مدیریت سمت‌ها (نقش‌ها): تعریف، ویرایش، حذف
// تنظیمات سقف‌ها و گردش تأیید درخواست‌ها
function RequestSettings({v,set,save}){
  const [users,setUsers]=useState([]);
  useEffect(()=>{ db.usersLite().then(u=>setUsers(u||[])).catch(()=>{}); },[]);
  const N=(k,l,suffix)=><div style={{minWidth:150}}><label className="label">{l}</label><div className="row" style={{gap:4,alignItems:"center"}}><input className="input" type="number" min="0" style={{maxWidth:90}} value={v[k]??""} onChange={e=>set(k,e.target.value)}/>{suffix&&<span className="muted" style={{fontSize:11}}>{suffix}</span>}</div></div>;
  return(<div>
    <h4 style={{margin:"4px 0 8px"}}>مرخصی استحقاقی</h4>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}>{N("annual_hourly_month","ساعتی در ماه","ساعت")}{N("annual_hourly_year","ساعتی در سال","ساعت")}{N("annual_daily_month","روزانه در ماه","روز")}{N("annual_daily_year","روزانه در سال","روز")}</div>
    <h4 style={{margin:"14px 0 8px"}}>مرخصی استعلاجی</h4>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}>{N("sick_hourly_month","ساعتی در ماه","ساعت")}{N("sick_hourly_year","ساعتی در سال","ساعت")}{N("sick_daily_month","روزانه در ماه","روز")}{N("sick_daily_year","روزانه در سال","روز")}</div>
    <h4 style={{margin:"14px 0 8px"}}>اضافه‌کار</h4>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}>{N("ot_count_month","تعداد در ماه","بار")}{N("ot_minutes_month","دقیقه در ماه","دقیقه")}{N("ot_count_year","تعداد در سال","بار")}{N("ot_minutes_year","دقیقه در سال","دقیقه")}</div>
    <h4 style={{margin:"14px 0 8px"}}>ماموریت</h4>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}>{N("mission_count_month","تعداد در ماه","بار")}{N("mission_hours_month","ساعت در ماه","ساعت")}{N("mission_count_year","تعداد در سال","بار")}{N("mission_hours_year","ساعت در سال","ساعت")}{N("mission_max_hours","حداکثر هر ماموریت","ساعت")}</div>
    <h4 style={{margin:"14px 0 8px"}}>عمومی</h4>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}>{N("leave_carryover_days","مرخصی قابل انتقال به سال بعد","روز")}</div>
    <label className="row" style={{gap:8,marginTop:12}}><input type="checkbox" checked={!!v.manual_attendance_selfie} onChange={e=>set("manual_attendance_selfie",e.target.checked)}/>الزام الصاق عکس سلفی هنگام ثبت تردد دستی</label>
    <label className="row" style={{gap:8,marginTop:8}}><input type="checkbox" checked={v.checklist_require_photo!==false&&v.checklist_require_photo!==0} onChange={e=>set("checklist_require_photo",e.target.checked)}/>الزام درج عکس هنگام ثبت چک‌لیست خودرو</label>
    <label className="row" style={{gap:8,marginTop:8}}><input type="checkbox" checked={!!v.request_sms_notify} onChange={e=>set("request_sms_notify",e.target.checked)}/>ارسال پیامک به متقاضی هنگام تأیید یا رد درخواست (نیازمند فعال‌بودن سرویس پیامک)</label>
    <h4 style={{margin:"14px 0 8px"}}>گردش تأیید درخواست‌ها</h4>
    <div className="row" style={{gap:14,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><label className="label">شیوهٔ تأیید</label>
        <select className="input" style={{maxWidth:220}} value={v.request_approval_mode||"hierarchical"} onChange={e=>set("request_approval_mode",e.target.value)}>
          <option value="hierarchical">سلسله‌مراتبی (زنجیرهٔ مدیران)</option>
          <option value="specific">یک مسئول خاص</option>
        </select>
      </div>
      {v.request_approval_mode==="specific"&&<div><label className="label">مسئول تأیید</label>
        <select className="input" style={{maxWidth:220}} value={v.request_approver_id||""} onChange={e=>set("request_approver_id",e.target.value)}>
          <option value="">— انتخاب —</option>
          {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
        </select></div>}
    </div>
    <button className="btn p" style={{marginTop:14}} onClick={save}>ذخیرهٔ تنظیمات درخواست‌ها</button>
    <p style={{fontSize:11,color:"var(--muted)",marginTop:8}}>مقدار صفر یا خالی = بدون محدودیت. در حالت سلسله‌مراتبی، درخواست از مدیر مستقیم شروع و تا بالاترین مقام بالادست ارجاع می‌شود.</p>
  </div>);
}


// انتخاب دریافت‌کننده اعلان خروج از محدوده: اول سمت، سپس کاربر همان سمت
// انتخاب یک یا چند «مسئول» دریافت‌کنندهٔ یک نوع هشدار میدانی (خروج از خط/VPN/GPS).
// آرایه‌ای از شناسه‌ها را در user_ids ذخیره می‌کند تا بشود برای چند مسئول هم‌زمان ارسال کرد.
function FieldAlertScopePicker({title,mode,roleIds,userIds,onChange,compact=false}){
  const [users,setUsers]=useState([]); const [q,setQ]=useState("");
  useEffect(()=>{db.usersLite().then(x=>setUsers(x||[])).catch(()=>{});},[]);
  const roles=[]; const seen=new Set();
  users.forEach(u=>{const id=String(u.role_id||""); if(id&&!seen.has(id)){seen.add(id);roles.push({id:+id,title:u.role_title||("سمت "+id)});}});
  const setMode=(m)=>onChange({mode:m,roleIds:roleIds||[],userIds:userIds||[]});
  const toggleRole=(id)=>{const a=(roleIds||[]).map(Number);onChange({mode,roleIds:a.includes(+id)?a.filter(x=>x!==+id):[...a,+id],userIds:userIds||[]});};
  const toggleUser=(id)=>{const a=(userIds||[]).map(Number);onChange({mode,roleIds:roleIds||[],userIds:a.includes(+id)?a.filter(x=>x!==+id):[...a,+id]});};
  const filtered=users.filter(u=>!q||(`${u.first_name||""} ${u.last_name||""} ${u.role_title||""}`).includes(q));
  return <div className="card-p" style={{display:"block",marginTop:8,padding:compact?10:12}}>
    {title&&<b style={{fontSize:13}}>{title}</b>}
    <div className="row" style={{gap:14,marginTop:8,flexWrap:"wrap"}}>
      {[['all','همه پرسنل'],['roles','سمت‌های خاص'],['users','افراد خاص']].map(([k,l])=><label key={k} style={{display:"inline-flex",gap:5,alignItems:"center",fontSize:12.5}}><input type="radio" checked={mode===k} onChange={()=>setMode(k)}/>{l}</label>)}
    </div>
    {mode==='roles'&&<div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>{roles.map(r=><label key={r.id} className="badge" style={{cursor:"pointer"}}><input type="checkbox" checked={(roleIds||[]).map(Number).includes(r.id)} onChange={()=>toggleRole(r.id)}/> {r.title}</label>)}</div>}
    {mode==='users'&&<div style={{marginTop:8}}><input className="input" placeholder="جستجوی نام یا سمت…" value={q} onChange={e=>setQ(e.target.value)}/><div style={{maxHeight:150,overflowY:"auto",marginTop:6,border:"1px solid var(--line)",borderRadius:8,padding:6}}>{filtered.map(u=><label key={u.id} className="row" style={{gap:7,padding:"3px 2px"}}><input type="checkbox" checked={(userIds||[]).map(Number).includes(+u.id)} onChange={()=>toggleUser(u.id)}/>{u.first_name} {u.last_name} — {u.role_title||'بدون سمت'}</label>)}</div></div>}
  </div>;
}
function AdvancedFieldAlertRecipients({cur,onChange}){
  const [users,setUsers]=useState([]); const [pick,setPick]=useState("");
  useEffect(()=>{db.usersLite().then(x=>setUsers(x||[])).catch(()=>{});},[]);
  const recs=Array.isArray(cur.recipients)?cur.recipients:((cur.user_ids||[]).map(id=>({user_id:+id,subject_mode:'all',role_ids:[],user_ids:[]})));
  const add=()=>{const id=+pick;if(!id||recs.some(r=>+r.user_id===id))return;onChange([...recs,{user_id:id,subject_mode:'all',role_ids:[],user_ids:[]}]);setPick("");};
  const upd=(idx,x)=>onChange(recs.map((r,i)=>i===idx?{...r,...x}:r));
  const del=(idx)=>onChange(recs.filter((_,i)=>i!==idx));
  return <div style={{marginTop:10}}>
    <div className="row" style={{gap:8,alignItems:"flex-end",flexWrap:"wrap"}}><div style={{minWidth:260,flex:1}}><label className="label">افزودن مسئول دریافت‌کننده</label><select className="input" value={pick} onChange={e=>setPick(e.target.value)}><option value="">انتخاب مسئول…</option>{users.filter(u=>!recs.some(r=>+r.user_id===+u.id)).map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.role_title||'بدون سمت'}</option>)}</select></div><button className="btn g" type="button" onClick={add}>+ افزودن</button></div>
    {recs.map((r,i)=>{const u=users.find(x=>+x.id===+r.user_id);return <div key={r.user_id||i} style={{border:"1px solid var(--line)",borderRadius:10,padding:10,marginTop:10}}><div className="row" style={{justifyContent:"space-between",gap:8}}><b>{u?`${u.first_name} ${u.last_name} — ${u.role_title||'بدون سمت'}`:`کاربر ${r.user_id}`}</b><button type="button" className="btn d" style={{padding:"4px 8px"}} onClick={()=>del(i)}>حذف</button></div><FieldAlertScopePicker compact title="این مسئول اعلان چه افرادی را دریافت کند؟" mode={r.subject_mode||'all'} roleIds={r.role_ids||[]} userIds={r.user_ids||[]} onChange={x=>upd(i,{subject_mode:x.mode,role_ids:x.roleIds,user_ids:x.userIds})}/></div>;})}
    {!recs.length&&<p className="muted" style={{fontSize:12,marginTop:8}}>هنوز مسئولی انتخاب نشده است.</p>}
  </div>;
}
function MultiRecipientPicker({cur,setSub}){ return <AdvancedFieldAlertRecipients cur={cur} onChange={(x)=>setSub('recipients',x)}/>; }

// تنظیمات تبریک تولد
function BirthdaySettings({v,set,save}){
  const [testId,setTestId]=useState(""); const [users,setUsers]=useState([]);
  useEffect(()=>{ db.usersLite().then(u=>setUsers(u||[])).catch(()=>{}); },[]);
  const test=async()=>{ if(!testId){alert("یک کاربر را انتخاب کنید");return;} try{ const r=await db.birthdayTest(+testId); alert("ارسال شد: "+((r.sent||[]).join("، ")||"—")+"\nمتن: "+r.message); }catch(e){ alert(e.message||"خطا"); } };
  const cronUrl=`${location.origin}/api/cron/birthday?key=${encodeURIComponent(v.cron_key||"CRON_KEY")}`;
  return(<div>
    <label className="row" style={{gap:8}}><input type="checkbox" checked={!!v.birthday_enabled} onChange={e=>set("birthday_enabled",e.target.checked)}/>ارسال خودکار تبریک در روز تولد پرسنل فعال باشد</label>
    <div style={{marginTop:10}}><label className="label">روش ارسال</label>
      <select className="input" style={{maxWidth:220}} value={v.birthday_channel||"notif"} onChange={e=>set("birthday_channel",e.target.value)}>
        <option value="notif">فقط نوتیفیکیشن</option><option value="sms">فقط پیامک</option><option value="both">هر دو (نوتیفیکیشن و پیامک)</option>
      </select>
    </div>
    <div style={{marginTop:10}}><label className="label">متن پیام (می‌توانید از {"{name}"} و {"{first_name}"} استفاده کنید)</label>
      <textarea className="input" rows="3" value={v.birthday_message||""} onChange={e=>set("birthday_message",e.target.value)} placeholder="همکار گرامی {name}، تولدتان مبارک! 🎉"/>
    </div>
    <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیرهٔ تنظیمات تولد</button>
    <div className="card-p" style={{marginTop:14}}>
      <b style={{fontSize:13}}>آزمایش ارسال</b>
      <div className="row" style={{gap:8,marginTop:8,flexWrap:"wrap"}}>
        <select className="input" style={{maxWidth:220}} value={testId} onChange={e=>setTestId(e.target.value)}><option value="">انتخاب کاربر…</option>{users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select>
        <button className="btn g" onClick={test}>ارسال آزمایشی</button>
      </div>
    </div>
    <div className="card-p" style={{marginTop:12}}>
      <b style={{fontSize:13}}>زمان‌بندی روزانه (Cron)</b>
      <p style={{fontSize:12,color:"var(--muted)",margin:"6px 0"}}>برای ارسال خودکار، در cPanel یک Cron Job روزانه (مثلاً ساعت ۸ صبح) بسازید که این آدرس را فراخوانی کند:</p>
      <code style={{display:"block",background:"#0d1b2a",color:"#9ae6b4",padding:"8px 10px",borderRadius:8,fontSize:11,direction:"ltr",overflowX:"auto"}}>curl -s "{cronUrl}"</code>
      <p style={{fontSize:11,color:"var(--muted)",marginTop:6}}>کلید کرون (cron_key) را در تب «امنیت» تنظیم کنید. تطبیق تولد بر اساس ماه و روز شمسی انجام می‌شود.</p>
    </div>
  </div>);
}

// رندر یک ورودی بر اساس نوع فیلد سفارشی (مشترک پنل)
function CustomFieldInput({field,value,onChange}){
  const opts=(field.options||"").split("|").filter(Boolean);
  if(field.ftype==="textarea") return <textarea className="input" rows="2" value={value||""} onChange={e=>onChange(e.target.value)}/>;
  if(field.ftype==="number") return <input className="input" type="number" value={value||""} onChange={e=>onChange(e.target.value)}/>;
  if(field.ftype==="date") return <JDate value={value||""} onChange={onChange}/>;
  if(field.ftype==="checkbox") return <label className="row" style={{gap:6}}><input type="checkbox" checked={value==="1"||value===true} onChange={e=>onChange(e.target.checked?"1":"0")}/>بله</label>;
  if(field.ftype==="select") return <select className="input" value={value||""} onChange={e=>onChange(e.target.value)}><option value="">— انتخاب —</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>;
  if(field.ftype==="multiselect"){ const sel=(value||"").split("|").filter(Boolean);
    return <div className="row" style={{gap:6,flexWrap:"wrap"}}>{opts.map(o=>{ const on=sel.includes(o); return <button key={o} type="button" className={"chip"+(on?" on":"")} onClick={()=>{ const ns=on?sel.filter(x=>x!==o):[...sel,o]; onChange(ns.join("|")); }}>{o}</button>; })}</div>; }
  return <input className="input" value={value||""} onChange={e=>onChange(e.target.value)}/>;
}

// تکمیل مقادیر فیلدهای سفارشی برای یک کاربر (در فرم ادمین)
function CustomFieldsFiller({userId}){
  const [fields,setFields]=useState(null); const [vals,setVals]=useState({}); const [open,setOpen]=useState(false);
  const load=()=>{ setOpen(true); db.customFields().then(fs=>{ setFields(fs||[]); if(userId) db.userCustomValues(userId).then(vs=>{ const m={}; (vs||[]).forEach(v=>m[v.field_id]=v.value); setVals(m); }); }); };
  const save=async()=>{ await db.saveUserCustomValues(userId,vals); alert("اطلاعات تکمیلی ذخیره شد."); };
  if(!userId) return null;
  return(<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line)"}}>
    {!open?<button className="btn g" type="button" onClick={load}>اطلاعات تکمیلی (فیلدهای سفارشی)</button>:
     fields===null?<span className="muted">در حال بارگذاری…</span>:
     fields.length===0?<p className="muted" style={{fontSize:12}}>فیلد سفارشی‌ای تعریف نشده است. از منوی «فیلدهای سفارشی» اضافه کنید.</p>:
     <div>
       {fields.map(f=><div key={f.id} style={{marginBottom:8}}>
         <label className="label">{f.label}{f.required==1?" *":""}{f.user_editable==1?"":" 🔒"}</label>
         <CustomFieldInput field={f} value={vals[f.id]} onChange={v=>setVals({...vals,[f.id]:v})}/>
       </div>)}
       <button className="btn p" onClick={save}>ذخیرهٔ اطلاعات تکمیلی</button>
     </div>}
  </div>);
}


// تنظیمات کلی حقوق (نرخ ساعت و ضرایب)
function PayrollSettings({v,set,save}){
  const F=(k,l,ph)=><div style={{minWidth:160}}><label className="label">{l}</label><input className="input" type="number" step="0.01" style={{maxWidth:140}} value={v[k]??""} placeholder={ph||""} onChange={e=>set(k,e.target.value)}/></div>;
  return(<div>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>ضرایب بر اساس برابر حقوق عادی هستند (مثلاً ۱.۴ یعنی ۴۰٪ بیشتر). اگر «نرخ هر ساعت» را خالی بگذارید، از حقوق پایهٔ ماهانهٔ هر نیرو تقسیم بر ساعت موظف محاسبه می‌شود.</p>
    <div className="row" style={{gap:10,flexWrap:"wrap"}}>
      {F("payroll_hour_rate","نرخ هر ساعت (ریال) — اختیاری","از پایه")}
      {F("std_month_hours","ساعت موظف ماهانه","192")}
      {F("ot_mult","ضریب اضافه‌کار","1.4")}
      {F("night_mult","ضریب شب‌کاری","1.35")}
      {F("friday_mult","ضریب جمعه‌کاری","1.4")}
      {F("holiday_mult","ضریب تعطیل‌کاری","1.4")}
    </div>
    <button className="btn p" style={{marginTop:12}} onClick={save}>ذخیرهٔ تنظیمات حقوق</button>
  </div>);
}

function RolesManager(){
  const [roles,setRoles]=useState([]); const [edits,setEdits]=useState({}); const [nt,setNt]=useState(""); const [nl,setNl]=useState(1); const [na,setNa]=useState(false); const [okId,setOkId]=useState(null);
  const load=()=>db.roles().then(rs=>{setRoles(rs||[]);setEdits({});}).catch(()=>{});
  useEffect(()=>{load();},[]);
  const ev=(r)=>edits[r.id]||{title:r.title,level:r.level,is_admin:r.is_admin==1};
  const setEv=(r,patch)=>setEdits({...edits,[r.id]:{...ev(r),...patch}});
  const add=async()=>{ if(!nt.trim())return alert("عنوان نقش را وارد کنید"); try{ await db.addRole({title:nt.trim(),level:+nl||1,is_admin:na?1:0}); setNt("");setNl(1);setNa(false); load(); }catch(e){ alert(e.message||"خطا"); } };
  const saveRow=async(r)=>{ const e=ev(r); try{ await db.updateRole(r.id,{title:e.title.trim(),level:+e.level||1,is_admin:e.is_admin?1:0}); setOkId(r.id); setTimeout(()=>setOkId(null),1500); load(); }catch(err){ alert(err.message||"خطا"); } };
  const del=async(r)=>{ if(!confirm(`نقش «${r.title}» حذف شود؟`))return; try{ await db.deleteRole(r.id); load(); }catch(e){ alert(e.message||"خطا"); } };
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>سمت‌های پیش‌فرض موجودند؛ می‌توانید سمت جدید تعریف یا موارد موجود را ویرایش و ذخیره کنید. «سطح» بالاتر = ارشدتر. «دسترسی پنل وب» یعنی این سمت می‌تواند وارد پنل مدیریت وب شود.</p>
    <table><thead><tr><th>عنوان سمت</th><th>سطح</th><th>دسترسی پنل وب</th><th>عملیات</th></tr></thead>
    <tbody>{roles.map(r=>{ const e=ev(r); return(<tr key={r.id}>
      <td><input className="input" value={e.title} style={{minWidth:160}} onChange={ev2=>setEv(r,{title:ev2.target.value})}/></td>
      <td><input className="input" type="number" value={e.level} style={{maxWidth:80}} onChange={ev2=>setEv(r,{level:ev2.target.value})}/></td>
      <td><label className="row" style={{gap:6}}><input type="checkbox" checked={!!e.is_admin} onChange={ev2=>setEv(r,{is_admin:ev2.target.checked})}/>دارد</label></td>
      <td><div className="row" style={{gap:6}}>
        <button className="btn p" onClick={()=>saveRow(r)}>ذخیره</button>
        <button className="btn g" onClick={()=>del(r)}>حذف</button>
        {okId===r.id&&<span style={{color:"var(--ok)",fontSize:12}}>✓</span>}
      </div></td>
    </tr>); })}</tbody></table>
    <div className="row" style={{gap:8,marginTop:12,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><label className="label">عنوان سمت جدید</label><input className="input" value={nt} onChange={e=>setNt(e.target.value)} placeholder="مثلاً ناظر ارشد"/></div>
      <div><label className="label">سطح</label><input className="input" type="number" style={{maxWidth:90}} value={nl} onChange={e=>setNl(e.target.value)}/></div>
      <label className="row" style={{gap:6}}><input type="checkbox" checked={na} onChange={e=>setNa(e.target.checked)}/>دسترسی پنل وب</label>
      <button className="btn p" onClick={add}>افزودن سمت</button>
    </div>
  </div>);
}

// تنظیمات صحت‌سنجی حضور
function PresenceSettings(){
  const [cfg,setCfg]=useState({enabled:false,slots:[],window_minutes:1,grace_minutes:15,alarm:true,audience:'all_required',server_push:true});
  const [nt,setNt]=useState(""); const [saved,setSaved]=useState(false);
  useEffect(()=>{ db.settings().then(s=>{ if(s.presence_check) setCfg({enabled:!!s.presence_check.enabled,slots:s.presence_check.slots||[],window_minutes:s.presence_check.window_minutes||1,grace_minutes:s.presence_check.grace_minutes||15,alarm:s.presence_check.alarm!==false,audience:s.presence_check.audience||'all_required',server_push:s.presence_check.server_push!==false}); }).catch(()=>{}); },[]);
  const addSlot=()=>{ if(!/^\d{2}:\d{2}$/.test(nt)){alert("ساعت را به شکل HH:MM وارد کنید، مثل 08:30");return;} if(cfg.slots.includes(nt))return; setCfg({...cfg,slots:[...cfg.slots,nt].sort()}); setNt(""); setSaved(false); };
  const delSlot=(s)=>{ setCfg({...cfg,slots:cfg.slots.filter(x=>x!==s)}); setSaved(false); };
  const save=async()=>{ await db.saveSettings({presence_check:cfg}); setSaved(true); };
  return(<div>
    <label className="row" style={{gap:8,marginBottom:12}}><input type="checkbox" checked={cfg.enabled} onChange={e=>{setCfg({...cfg,enabled:e.target.checked});setSaved(false);}}/><b>فعال‌سازی صحت‌سنجی حضور</b></label>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>در هر بازهٔ ساعتی تعریف‌شده، برای کاربرانِ «مشمول صحت‌سنجی» پنجره‌ای در اپ باز می‌شود تا سلفی و عکس خودروهای خط ارسال کنند.</p>
    <div className="label">بازه‌های ساعتی روزانه:</div>
    <div className="chiprow" style={{margin:"8px 0"}}>{cfg.slots.length?cfg.slots.map(s=><span key={s} className="chip">{s} <b onClick={()=>delSlot(s)}>×</b></span>):<span className="muted" style={{fontSize:12}}>هنوز بازه‌ای تعریف نشده.</span>}</div>
    <div className="row" style={{gap:8,marginBottom:12}}>
      <input className="input" style={{maxWidth:120}} placeholder="08:30" value={nt} onChange={e=>setNt(e.target.value)}/>
      <button className="btn g" onClick={addSlot}>+ افزودن بازه</button>
    </div>
    <div className="row" style={{gap:14,flexWrap:"wrap"}}>
      <div><label className="label">مهلت گرفتن عکس (دقیقه)</label><input className="input" type="number" min="1" style={{maxWidth:90}} value={cfg.window_minutes} onChange={e=>{setCfg({...cfg,window_minutes:Math.max(1,+e.target.value||1)});setSaved(false);}}/></div>
      <div><label className="label">مهلت تا ثبت تخلف (دقیقه)</label><input className="input" type="number" min="1" style={{maxWidth:90}} value={cfg.grace_minutes} onChange={e=>{setCfg({...cfg,grace_minutes:Math.max(1,+e.target.value||1)});setSaved(false);}}/></div>
    </div>
    <div style={{marginTop:14,marginBottom:8}}>
      <label className="label">ارسال صحت‌سنجی برای چه کسانی انجام شود؟</label>
      <select className="input" value={cfg.audience||'all_required'} onChange={e=>{setCfg({...cfg,audience:e.target.value});setSaved(false);}} style={{maxWidth:360}}>
        <option value="all_required">همهٔ کاربران مشمول صحت‌سنجی</option>
        <option value="shift_only">فقط کاربران مشمول که در ساعت شیفت کاری حضور دارند</option>
      </select>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:5}}>در حالت دوم، سیستم براساس شیفت فعال و تاریخ تخصیص شیفت، صحت‌سنجی و تخلف عدم ارسال را فقط برای افراد داخل بازهٔ شیفت محاسبه می‌کند.</p>
    </div>
    <label className="row" style={{gap:8,marginTop:10,marginBottom:4}}><input type="checkbox" checked={cfg.server_push!==false} onChange={e=>{setCfg({...cfg,server_push:e.target.checked});setSaved(false);}}/><b>ارسال Push از سمت سرور در شروع هر بازه</b></label>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>برای دریافت هشدار وقتی اپ باز نیست یا صفحه خاموش است، کرون هر دقیقهٔ <code>/api/cron/presence-alert</code> باید روی هاست فعال باشد.</p>
    <label className="row" style={{gap:8,marginTop:14,marginBottom:4}}><input type="checkbox" checked={cfg.alarm!==false} onChange={e=>{setCfg({...cfg,alarm:e.target.checked});setSaved(false);}}/><b>🔊 پخش صدای آلارم هنگام صحت‌سنجی (حتی با صفحهٔ خاموش)</b></label>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>هنگام باز شدن پنجرهٔ صحت‌سنجی، صدای آلارم و لرزش برای جلب توجه کاربر پخش می‌شود.</p>
    <div className="row" style={{gap:10,marginTop:14}}><button className="btn p" onClick={save}>ذخیرهٔ تنظیمات صحت‌سنجی</button>{saved&&<span style={{color:"var(--ok)",fontSize:13}}>✓ ذخیره شد</span>}</div>
  </div>);
}

// تنظیم چیدمان داشبورد به تفکیک نقشِ بیننده
function DashboardConfig(){
  // گروه‌های «پرکار/کم‌کار» اکنون به‌صورت پویا از روی فهرست واقعی سمت‌ها ساخته می‌شوند
  // تا با افزودن هر سمت جدید (مثلاً گشت موتوری، گشت خودرویی، بازرس مقیم)، بدون نیاز به
  // تغییر کد، به‌طور خودکار در همین تنظیمات هم قابل‌پیکربندی باشد.
  const isManagerTitle=(t)=>["رییس","رئیس","معاونت","مدیر کل","مدیرکل"].some(k=>(t||"").indexOf(k)>=0);
  const [roles,setRoles]=useState([]);
  const GROUPS = roles.filter(r=>!isManagerTitle(r.title)).map(r=>[String(r.id), r.title]);
  const DEF=()=>({groups:Object.fromEntries(GROUPS.map(([k])=>[k,{web:true,app:true,count:5}])),zone_scope:"all"});
  const [cfg,setCfg]=useState({default:{groups:{},zone_scope:"all"},roles:{}});
  const [sel,setSel]=useState("default"); const [saved,setSaved]=useState(false);
  // مهاجرت ساختار قدیمی (show) به وب/اپ
  const migrate=(rc)=>{ if(!rc||!rc.groups)return rc; const g={}; for(const k in rc.groups){ const x=rc.groups[k]||{}; if("web" in x||"app" in x) g[k]=x; else g[k]={web:!!x.show,app:!!x.show,count:x.count??5}; } return {...rc,groups:g}; };
  useEffect(()=>{ db.roles().then(rs=>{ setRoles(rs||[]); }).catch(()=>{});
    db.settings().then(s=>{ if(s.dashboard_config){ const d=s.dashboard_config; const rr={}; for(const id in (d.roles||{})) rr[id]=migrate(d.roles[id]); setCfg({default:migrate(d.default)||{groups:{},zone_scope:"all"},roles:rr}); } }).catch(()=>{}); },[]);
  const cur=()=> sel==="default" ? cfg.default : (cfg.roles[sel]||{groups:{},zone_scope:"all"});
  const setCur=(nc)=>{ if(sel==="default") setCfg({...cfg,default:nc}); else setCfg({...cfg,roles:{...cfg.roles,[sel]:nc}}); setSaved(false); };
  const c=cur();
  const setGroup=(k,patch)=>{ const g={...c.groups,[k]:{...(c.groups[k]||{web:true,app:true,count:5}),...patch}}; setCur({...c,groups:g}); };
  const save=async()=>{ await db.saveSettings({dashboard_config:cfg}); setSaved(true); };
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>برای هر سمت تعیین کنید در داشبورد او کدام گروه‌های پرکار/کم‌کار، با چه تعدادی، در «پنل وب» و در «اپلیکیشن» نمایش داده شوند و محدودهٔ محاسبه چه باشد. «پیش‌فرض» برای سمت‌هایی که تنظیم اختصاصی ندارند اعمال می‌شود. فهرست «گروه نقش» زیر به‌صورت خودکار از سمت‌های تعریف‌شدهٔ سامانه ساخته می‌شود؛ با افزودن سمت جدید، بدون نیاز به کار اضافه، همین‌جا هم ظاهر می‌شود.</p>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      <span className="label">تنظیم برای سمت:</span>
      <select className="input" style={{maxWidth:260}} value={sel} onChange={e=>setSel(e.target.value)}>
        <option value="default">پیش‌فرض (همهٔ سمت‌ها)</option>
        {roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
      </select>
    </div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>در این بخش تعیین می‌کنید عملکرد (پرکار/کم‌کار بودن) هر گروه از نیروها بر اساس مجموع کدام فعالیت‌ها محاسبه شود و چند نفر در داشبورد نمایش داده شوند. ستون «مبنای محاسبهٔ مجموع فعالیت» همان نحوهٔ محاسبهٔ عملکرد هر نیروست.</p>
    <div style={{marginBottom:14,padding:"10px 12px",background:"var(--brand-soft)",borderRadius:10}}>
      <span className="label">محدودهٔ محاسبه: </span>
      <label className="row" style={{display:"inline-flex",gap:6,marginInlineStart:10}}><input type="radio" checked={c.zone_scope!=="own"} onChange={()=>setCur({...c,zone_scope:"all"})}/>کل نیروها</label>
      <label className="row" style={{display:"inline-flex",gap:6,marginInlineStart:14}}><input type="radio" checked={c.zone_scope==="own"} onChange={()=>setCur({...c,zone_scope:"own"})}/>فقط منطقهٔ بیننده</label>
    </div>
    <table><thead><tr><th>گروه نقش</th><th style={{textAlign:"center"}}>پنل وب</th><th style={{textAlign:"center"}}>اپ</th><th>تعداد</th><th>مبنای محاسبهٔ مجموع فعالیت</th></tr></thead>
    <tbody>{GROUPS.map(([k,t])=>{ const g=c.groups[k]||{web:true,app:true,count:5}; const METRICS=[["attendances","حضور راننده"],["checklists","چک‌لیست"],["notices","تذکر"],["forms","فرم"],["visits","ثبت مسئول"],["reports","گزارش"]]; const sel=Array.isArray(g.metrics)?g.metrics:null; const toggleM=(mk)=>{ const cur=sel?[...sel]:METRICS.map(m=>m[0]); const i=cur.indexOf(mk); i>=0?cur.splice(i,1):cur.push(mk); setGroup(k,{metrics:cur}); }; return(<tr key={k}>
      <td><b>{t}</b></td>
      <td style={{textAlign:"center"}}><input type="checkbox" checked={!!g.web} onChange={e=>setGroup(k,{web:e.target.checked})}/></td>
      <td style={{textAlign:"center"}}><input type="checkbox" checked={!!g.app} onChange={e=>setGroup(k,{app:e.target.checked})}/></td>
      <td><input className="input" type="number" min="1" max="20" style={{maxWidth:70}} value={g.count??5} onChange={e=>setGroup(k,{count:Math.max(1,+e.target.value||1)})} disabled={!g.web&&!g.app}/></td>
      <td><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{METRICS.map(([mk,ml])=>{ const on=sel?sel.includes(mk):true; return(<label key={mk} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11.5,background:on?"var(--brand-soft)":"#f0f2f6",borderRadius:8,padding:"2px 7px",cursor:"pointer"}}><input type="checkbox" checked={on} onChange={()=>toggleM(mk)} style={{margin:0}}/>{ml}</label>); })}</div>
      <div style={{fontSize:10.5,color:"var(--muted)",marginTop:3}}>{sel?`فقط ${fa(sel.length)} مورد انتخاب‌شده`:"همهٔ فعالیت‌ها (پیش‌فرض)"}</div></td>
    </tr>); })}</tbody></table>
    <div className="row" style={{gap:10,marginTop:14}}>
      <button className="btn p" onClick={save}>ذخیرهٔ چیدمان داشبورد</button>
      {saved&&<span style={{color:"var(--ok)",fontSize:13}}>✓ ذخیره شد</span>}
    </div>
  </div>);
}

function RolePerms(){
  const MENU=[["dashboard","داشبورد"],["reportscenter","مرکز گزارش‌ها"],["health","سلامت سامانه"],["map","نقشهٔ زنده"],["present","آمار حاضرین"],["presentchart","نمودار زندهٔ حاضرین"],["missiondashboard","داشبورد عملیات میدانی"],["citydashboard","داشبورد مدیریتی کل‌شهر"],["missiontemplates","موتور مأموریت — الگوها و تنظیمات"],["scoreengine","موتور امتیازدهی"],["driverservicereport","عملکرد و تذکرات تاکسیران"],["officials","حضور مسئولین"],["covertselfies","سلفی‌های نامحسوس"],["messages","پیام‌رسانی"],["messengercenter","مرکز ارسال ربات‌ها"],["companyrequests","مدارک ارسالی شرکت"],["salaryslips","بارگذاری فیش حقوقی"],["users","کاربران"],["zones","منطقه‌بندی"],["org","چارت سازمانی"],["drivers","رانندگان"],["platetraining","پلاک‌خوان"],["lines","خطوط"],["bills","آبونمان"],["config","تذکر/چک‌لیست"],["forms","فرم‌ساز"],["reports","گردش گزارش"],["report","گزارش‌گیری"],["perfreport","گزارش عملکرد پرسنل"],["welfare","رفاهیات روابط عمومی"],["cultural","فعالیت‌های فرهنگی"],["excel","ورود اکسل"],["logs","لاگ"],["useract","فعالیت کاربران"],["commitments","تعهدات انضباطی"],["tempdrivers","رانندگان موقت"],["presence","صحت‌سنجی حضور"],["attendance","حضور نیروها"],["shifts","شیفت و کارکرد"],["attreport","گزارش تردد پرسنل"],["workpolicy","سیاست کاری"],["requests","گزارش درخواست‌ها"],["outages","قطعی سیستم نوبت‌دهی"],["customfields","فیلدهای سفارشی"],["inventory","اقلام تحویلی"],["sms","ارسال پیامک"],["smslog","تاریخچهٔ پیامک"],["appitems","آیتم‌های اپ هر سمت"],["cronstatus","پایش سلامت کرون‌ها"],["activesessions","جلسات فعال کاربران"],["radiocenter","مرکز بی‌سیم"],["vehicleassets","ماشین‌آلات و وسایل مأموریتی"],["vehiclechecklist","چک‌لیست خودرویی و موتوری"],["settings","تنظیمات"]];
  const [roles,setRoles]=useState([]); const [perms,setPerms]=useState({}); const [sel,setSel]=useState(null);
  useEffect(()=>{ db.roles().then(rs=>{setRoles(rs);}).catch(()=>{}); db.settings().then(s=>setPerms(s.role_perms||{})).catch(()=>{}); },[]);
  const allowed=sel!=null?(perms[sel]||MENU.map(m=>m[0])):[];
  const toggle=(k)=>{ if(sel==null)return; const cur=new Set(perms[sel]||MENU.map(m=>m[0])); cur.has(k)?cur.delete(k):cur.add(k); setPerms({...perms,[sel]:[...cur]}); };
  const save=async()=>{ await db.saveSettings({role_perms:perms}); alert("دسترسی سمت‌ها ذخیره شد. (پس از ورود مجدد کاربران اعمال می‌شود)"); };
  return(<div>
    <p className="muted" style={{marginBottom:8}}>برای هر سمت تعیین کنید کدام بخش‌های پنل را ببیند. اگر برای سمتی چیزی تعریف نشود، همهٔ بخش‌ها در دسترس است.</p>
    <select className="input" value={sel??""} onChange={e=>setSel(e.target.value?+e.target.value:null)}>
      <option value="">یک سمت را انتخاب کنید…</option>
      {roles.map(r=><option key={r.id} value={r.id}>{r.title}{r.is_admin==1?" (پنل وب)":" (اپ موبایل)"}</option>)}</select>
    {sel!=null&&<div style={{marginTop:10}}>{MENU.map(([k,l])=>
      <label key={k} className="row" style={{justifyContent:"space-between",padding:"6px 2px",borderBottom:"1px solid var(--line)"}}>
        <span style={{fontSize:13}}>{l}</span>
        <input type="checkbox" checked={allowed.includes(k)} onChange={()=>toggle(k)}/></label>)}
      <button className="btn p" style={{marginTop:10}} onClick={save}>ذخیرهٔ دسترسی‌ها</button></div>}
  </div>);
}

function Reports(){
  const [list,setList]=useState([]); const [cur,setCur]=useState(null);
  const [f,setF]=useState({sender:"",subject:"",from:"",to:""}); const [note,setNote]=useState("");
  const [page,setPage]=useState(1); const [pages,setPages]=useState(1); const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const qstr=(extra)=>{ const q=new URLSearchParams(); if(f.sender)q.set("sender",f.sender); if(f.subject)q.set("subject",f.subject); if(f.from)q.set("from",f.from); if(f.to)q.set("to",f.to); if(extra)for(const k in extra)q.set(k,extra[k]); return q.toString(); };
  const load=(pg)=>{ const p=pg||page; setLoading(true);
    GET("/reports?"+qstr({page:p,per:20})).then(d=>{
      // پشتیبانی از ساختار جدید (items/total/pages) و قدیمی (آرایه)
      if(Array.isArray(d)){ setList(d); setPages(1); setTotal(d.length); }
      else { setList(d.items||[]); setPages(d.pages||1); setTotal(d.total||0); setPage(d.page||p); }
    }).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load(1)},[]);
  const applyFilter=()=>{ setPage(1); load(1); };
  const goPage=(p)=>{ if(p<1||p>pages)return; setPage(p); load(p); };
  const exportXls=()=>{ window.open(API_BASE+"/reports/export?"+qstr()+"&token="+encodeURIComponent(localStorage.token||""),"_blank"); };
  const open=async r=>{ setNote(""); try{ setCur(await db.reportDetail(r.id)); }catch(e){ alert(e.message); } };
  const act=async(action)=>{ await db.reportAction(cur.id,{action,note}); const d=await db.reportDetail(cur.id); setCur(d); setNote(""); load(); };
  const [tpl,setTpl]=useState(null); const [org,setOrg]=useState({});
  useEffect(()=>{db.settings().then(s=>{setTpl(s.report_print_template||null); setOrg({title:s.org_title||"",logo:s.org_logo||""});}).catch(()=>{})},[]);
  const printReport=()=>{ const r=cur; const T=tpl||{};
    const E=(s)=>String(s==null?"":s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const stMap={sent:"ارسال‌شده",seen:"دیده‌شده",answered:"پاسخ‌داده‌شده",forwarded:"ارجاع‌شده"};
    const order=(T.order&&T.order.length)?T.order:["subject","sender","date","status","body","trail"];
    const vis=(k)=> (T.fields? T.fields[k]!==false : true);
    const align=T.align||"right"; const fontPx=T.fontPx||13;
    const piece=(k)=>{ if(!vis(k))return "";
      if(k==="subject") return `<h1>${E(r.subject||"گزارش")}</h1>`;
      if(k==="sender")  return `<div class="meta">فرستنده: ${E((r.first_name||"")+" "+(r.last_name||""))} — سمت: ${E(r.sender_role_title||"—")}</div>${r.sender_signature?`<div class="sig"><span>امضای ارسال‌کننده</span><img src="${r.sender_signature}"/></div>`:""}`;
      if(k==="date")    return `<div class="meta">تاریخ: ${E(fj(r.created_at))}</div>`;
      if(k==="status")  return `<div class="meta">وضعیت: ${E(stMap[r.status]||r.status)}</div>`;
      if(k==="body")    return `<div class="box">${E(r.body||"")}</div>`;
      if(k==="trail")   return `<h3>روند گردش</h3><table><thead><tr><th>اقدام</th><th>توسط</th><th>سمت</th><th>تاریخ</th><th>یادداشت</th><th>امضا</th></tr></thead><tbody>${(r.trail||[]).map(x=>`<tr><td>${x.action==="reply"?"پاسخ":x.action==="forward"?"ارجاع":"مشاهده"}</td><td>${E((x.a_first||"")+" "+(x.a_last||""))}</td><td>${E(x.a_role_title||"—")}</td><td>${E(fj(x.created_at))}</td><td>${E(x.note||"")}</td><td>${x.a_signature?`<img class="sigimg" src="${x.a_signature}"/>`:"—"}</td></tr>`).join("")}</tbody></table>`;
      return ""; };
    const w=window.open("","_print","width=820,height=920"); if(!w){alert("لطفاً اجازهٔ باز شدن پنجره (popup) را بدهید.");return;}
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>چاپ گزارش</title>
      <style>body{font-family:Tahoma,sans-serif;padding:30px;color:#0f1b2d;text-align:${align};font-size:${fontPx}px} h1{font-size:18px} .meta{color:#555;margin:6px 0} .box{border:1px solid #ccc;border-radius:8px;padding:12px;margin-top:10px;white-space:pre-wrap} table{width:100%;border-collapse:collapse;margin-top:10px} td,th{border:1px solid #ccc;padding:6px;font-size:12px} .hdr{text-align:center;color:#0a5f4a;font-weight:bold;font-size:16px;margin-bottom:6px} .ftr{margin-top:18px;color:#555;text-align:center} .orghdr{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid #0d7a5f} .orglogo{height:60px;width:auto;object-fit:contain} .orgtitle{font-size:17px;font-weight:bold;color:#0f1b2d}.sig{margin:10px 0;display:flex;align-items:center;gap:12px}.sig img,.sigimg{max-width:150px;max-height:65px;object-fit:contain}.sig span{font-size:12px;color:#555}</style></head><body>
      ${(org.logo||org.title)?`<div class="orghdr">${org.logo?`<img src="${org.logo}" class="orglogo"/>`:""}${org.title?`<div class="orgtitle">${E(org.title)}</div>`:""}</div>`:""}
      ${T.header!==""?`<div class="hdr">${E(T.header||"سامانه مدیریت و نظارت بر خطوط و نیروهای اجرایی تاکسیرانی")}</div>`:""}
      ${order.map(piece).join("")}
      ${T.footer?`<div class="ftr">${E(T.footer)}</div>`:""}
      
<!-- SalarySlipAdminModule: ماژول فیش حقوقی PDF
مسیرهای API افزوده‌شده:
GET  /api/admin/salary-slips/users?q=
GET  /api/admin/users/{id}/salary-slips
POST /api/admin/users/{id}/salary-slips  multipart: period_jy, period_jm, title, file
DELETE /api/admin/salary-slips/{id}
-->
</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>{try{w.print();}catch(e){}},400);
  };
  const ST={sent:"ارسال‌شده",seen:"دیده‌شده",answered:"پاسخ‌داده‌شده",forwarded:"ارجاع‌شده"};
  return(<div className="panel"><h3>گردش گزارش‌ها</h3><p className="muted" style={{fontSize:12,marginBottom:10}}>گزارش‌های ارسالی، دریافتی و گزارش‌هایی که قبلاً ارجاع داده‌اید برای پیگیری در این بخش باقی می‌مانند.</p>
    <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:12}}>
      <input className="input" style={{maxWidth:160}} placeholder="فرستنده" value={f.sender} onChange={e=>setF({...f,sender:e.target.value})}/>
      <input className="input" style={{maxWidth:160}} placeholder="موضوع" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/>
      <JDate value={f.from} onChange={v=>setF({...f,from:v})} placeholder="از تاریخ"/>
      <JDate value={f.to} onChange={v=>setF({...f,to:v})} placeholder="تا تاریخ"/>
      <button className="btn p" onClick={applyFilter}>اعمال فیلتر</button>
      <button className="btn g" onClick={exportXls}>⤓ خروجی اکسل</button>
      <span className="muted" style={{fontSize:12}}>{fa(total)} گزارش</span></div>
    {loading&&<p className="muted" style={{textAlign:"center",padding:8}}>در حال بارگذاری…</p>}
    <table><thead><tr><th>موضوع</th><th>فرستنده</th><th>وضعیت</th><th>ثبت</th><th>مهلت</th><th></th></tr></thead>
    <tbody>{list.map(r=><tr key={r.id}><td>{r.subject}{(r.has_attachment||r.attachment_name)?" 📎":""}</td><td>{r.first_name} {r.last_name}</td>
      <td><span className="badge b-ok">{ST[r.status]||r.status}</span></td><td>{fj(r.created_at)}</td>
      <td><button className="btn g" onClick={()=>open(r)}>مشاهده</button></td></tr>)}</tbody></table>
    {list.length===0&&!loading&&<p className="muted" style={{textAlign:"center",padding:12}}>گزارشی یافت نشد.</p>}
    {pages>1&&<div className="row" style={{justifyContent:"center",gap:8,marginTop:12}}>
      <button className="btn g" disabled={page<=1} onClick={()=>goPage(page-1)}>قبلی</button>
      <span className="muted" style={{fontSize:13,alignSelf:"center"}}>صفحهٔ {fa(page)} از {fa(pages)}</span>
      <button className="btn g" disabled={page>=pages} onClick={()=>goPage(page+1)}>بعدی</button></div>}
    {cur&&<Modal title={"گزارش: "+cur.subject} onClose={()=>setCur(null)}>
      <p className="muted">از {cur.first_name} {cur.last_name} · {fj(cur.created_at)} · وضعیت: {ST[cur.status]||cur.status}</p>
      <div className="card-p" style={{display:"block",marginTop:8,whiteSpace:"pre-wrap"}}>{cur.body}</div>
      {(()=>{
        const extra=Array.isArray(cur.attachments)?cur.attachments:[];
        const extraImages=extra.filter(a=>!a.mime_type||String(a.mime_type).startsWith("image"));
        const extraFiles=extra.filter(a=>a.mime_type&&!String(a.mime_type).startsWith("image"));
        const gallery=[...(cur.attachment_url?[{url:cur.attachment_url,thumbnail_url:cur.attachment_url,file_name:cur.attachment_name||"فایل ۱"}]:[]),...extraImages];
        return(<>
          {gallery.length>0&&<div style={{marginTop:8}}>
            <p className="muted" style={{fontSize:12,marginBottom:6}}>{gallery.length>1?`پیوست‌ها (${fa(gallery.length)} تصویر):`:"پیوست:"}</p>
            <div className="row" style={{gap:8,flexWrap:"wrap"}}>
              {gallery.map((a,i)=><a key={i} href="#" onClick={(e)=>{e.preventDefault();openMediaUrl(a.url);}} title={a.file_name||"پیوست"}>
                <img src={a.url&&a.url.indexOf("data:")===0?a.url:(a.url&&a.url.indexOf("/api/")===0?API_BASE.replace(/\/api$/,"")+a.url:a.url)} style={{width:96,height:96,objectFit:"cover",borderRadius:8,border:"1px solid var(--line)"}} onError={(e)=>{e.target.style.display="none";}}/>
              </a>)}
            </div>
          </div>}
          {extraFiles.length>0&&<div style={{marginTop:8}}>
            {extraFiles.map((a,i)=><a key={i} className="btn g" style={{marginTop:4,marginInlineEnd:6,display:"inline-block"}} href="#" onClick={(e)=>{e.preventDefault();openMediaUrl(a.url);}}>مشاهده/دریافت پیوست: {a.file_name||"فایل"}</a>)}
          </div>}
        </>);
      })()}
      <h4 style={{marginTop:14}}>روند گردش</h4>
      {(cur.trail||[]).map((x,i)=><div key={i} className="card-p" style={{display:"block"}}>
        <b>{x.action==="reply"?"پاسخ":x.action==="forward"?"ارجاع":"مشاهده"}</b> — {x.a_first} {x.a_last} · {fj(x.created_at)}
        {x.note&&<div style={{marginTop:4}}>{x.note}</div>}</div>)}
      <label className="label" style={{marginTop:12}}>یادداشت / پاسخ</label>
      <textarea className="input" rows="3" value={note} onChange={e=>setNote(e.target.value)}></textarea>
      <div className="row" style={{gap:8,marginTop:10}}>
        <button className="btn g" onClick={()=>act("seen")}>ثبت مشاهده</button>
        <button className="btn p" onClick={()=>act("reply")}>ثبت پاسخ</button>
        <button className="btn t" onClick={()=>act("forward")}>ارجاع به بالادست</button>
        <button className="btn g" onClick={printReport}>🖨 چاپ گزارش</button></div>
    </Modal>}
  </div>);
}


// ==================== مدیریت شیفت کاری ====================
const WD=["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه"];
function emptySeg(){ return {s:"08:00",e:"14:00",es:"07:30",ls:"09:00",ee:"13:30",le:"15:00"}; }

// ساختار پیش‌فرض تنظیمات هر نوع درخواست
function emptyPolicyConfig(){
  return {
    annual:   { year_h:0, year_m:0, month_h:0, month_m:0, allow_over_year:false, allow_over_month:false,
                carry_h:0, carry_m:0, mode:"daily",
                daily:{ year_cap:0, month_cap:0, min_days:0, max_days:0, deadline_days:30, deadline_dir:"after" },
                hourly:{ year_cap:0, month_cap:0, min_h:0, min_m:0, max_h:0, max_m:0, deadline_days:0, deadline_dir:"after" } },
    sick:     { year_h:0, year_m:0, month_h:0, month_m:0, mode:"daily",
                daily:{ year_cap:0, month_cap:0, min_days:0, max_days:0, deadline_days:30, deadline_dir:"after" },
                hourly:{ year_cap:0, month_cap:0, min_h:0, min_m:0, max_h:0, max_m:0, deadline_days:0, deadline_dir:"after" } },
    unpaid:   { year_h:0, year_m:0, month_h:0, month_m:0, mode:"daily",
                daily:{ year_cap:0, month_cap:0, min_days:0, max_days:0, deadline_days:30, deadline_dir:"after" },
                hourly:{ year_cap:0, month_cap:0, min_h:0, min_m:0, max_h:0, max_m:0, deadline_days:0, deadline_dir:"after" } },
    mission:  { year_h:0, year_m:0, month_h:0, month_m:0, mode:"daily",
                daily:{ year_cap:0, month_cap:0, min_days:0, max_days:0, deadline_days:60, deadline_dir:"after" },
                hourly:{ year_cap:0, month_cap:0, min_h:0, min_m:0, max_h:0, max_m:0, deadline_days:0, deadline_dir:"after" } },
    overtime: { year_h:0, year_m:0, month_h:0, month_m:0, deadline_days:30, deadline_dir:"after",
                year_cap:0, month_cap:0, min_h:0, min_m:0, max_h:0, max_m:0 },
    manual:   { year_cap:0, month_cap:0, deadline_days:30, deadline_dir:"after" },
  };
}

const REQ_TABS = [
  ["annual","مرخصی استحقاقی"],["sick","مرخصی استعلاجی"],["unpaid","مرخصی بی‌حقوق"],
  ["mission","ماموریت"],["overtime","اضافه کار"],["manual","تردد دستی"],
];

function HM({h,m,oh,om,label}){
  return <div style={{marginBottom:12}}>
    {label&&<label className="label">{label}</label>}
    <div className="row" style={{gap:8}}>
      <input className="input" type="number" min="0" placeholder="ساعت" value={h} onChange={oh}/>
      <span style={{alignSelf:"center"}}>:</span>
      <input className="input" type="number" min="0" max="59" placeholder="دقیقه" value={m} onChange={om}/>
    </div>
  </div>;
}

function NumF({label,value,onChange,placeholder}){
  return <div style={{marginBottom:12}}>
    <label className="label">{label}</label>
    <input className="input" type="number" min="0" placeholder={placeholder||"تعداد"} value={value} onChange={onChange}/>
  </div>;
}

function DeadlineRow({days,dir,onDays,onDir}){
  return <div style={{marginBottom:12}}>
    <label className="label">مهلت ثبت درخواست</label>
    <div className="row" style={{gap:8,alignItems:"center"}}>
      <input className="input" type="number" min="0" style={{maxWidth:90}} placeholder="روز" value={days} onChange={onDays}/>
      <span>روز</span>
      <select className="input" style={{maxWidth:150}} value={dir} onChange={onDir}>
        <option value="after">بعد از شروع درخواست</option>
        <option value="before">قبل از شروع درخواست</option>
      </select>
    </div>
  </div>;
}

function WorkPolicy(){
  const [list,setList]=useState([]);
  const [editing,setEditing]=useState(null); // {id?, title, description, apply_time_limit_on_approve, config}
  const [reqTab,setReqTab]=useState("annual");
  const [modeTab,setModeTab]=useState("daily"); // daily | hourly برای انواع دارای حالت
  const [users,setUsers]=useState([]);
  const [assignFor,setAssignFor]=useState(null); // policy id برای تخصیص
  const [pickedUsers,setPickedUsers]=useState([]);
  const [msg,setMsg]=useState("");

  const load=()=>GET("/admin/work-policies").then(d=>setList(d||[])).catch(()=>{});
  useEffect(()=>{load(); db.users().then(setUsers).catch(()=>{});},[]);

  const newPolicy=()=>{ setEditing({title:"",description:"",apply_time_limit_on_approve:false,config:emptyPolicyConfig()}); setReqTab("annual"); setMsg(""); };
  const editPolicy=async(id)=>{ const wp=await GET("/admin/work-policies/"+id); setEditing({...wp, apply_time_limit_on_approve:!!wp.apply_time_limit_on_approve, config:wp.config||emptyPolicyConfig()}); setReqTab("annual"); setMsg(""); };
  const save=async()=>{
    if(!editing.title.trim()){setMsg("نام سیاست کاری را وارد کنید");return;}
    try{ const r=await SEND("POST","/admin/work-policies",editing); setMsg("✓ ذخیره شد"); if(!editing.id)setEditing({...editing,id:r.id}); load(); }
    catch(e){ setMsg(e.message||"خطا"); }
  };
  const del=async(id)=>{ if(!confirm("حذف این سیاست کاری؟"))return; await SEND("DELETE","/admin/work-policies/"+id); if(editing&&editing.id===id)setEditing(null); load(); };
  const doAssign=async()=>{
    if(!pickedUsers.length){setMsg("کاربری انتخاب نشده");return;}
    try{ await SEND("POST","/admin/work-policies/"+assignFor+"/assign",{user_ids:pickedUsers}); setMsg("✓ به "+fa(pickedUsers.length)+" کاربر تخصیص یافت"); setAssignFor(null);setPickedUsers([]); load(); }
    catch(e){ setMsg(e.message||"خطا"); }
  };

  // کمک‌کننده برای تغییر config تو در تو
  const setCfg=(path,val)=>{
    setEditing(prev=>{ const c=JSON.parse(JSON.stringify(prev.config)); let o=c; const keys=path.split("."); 
      for(let i=0;i<keys.length-1;i++)o=o[keys[i]]; o[keys[keys.length-1]]=val; return {...prev,config:c}; });
  };
  const g=(path)=>{ let o=editing.config; for(const k of path.split("."))o=o?.[k]; return o ?? ""; };
  const num=(path)=>e=>setCfg(path, e.target.value===""?0:+e.target.value);
  const chk=(path)=>e=>setCfg(path, e.target.checked);

  // ---- فهرست سیاست‌ها ----
  if(!editing && !assignFor) return(<div className="panel">
    <div className="row" style={{justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h3>📐 سیاست کاری</h3>
      <button className="btn p" onClick={newPolicy}>+ سیاست کاری جدید</button>
    </div>
    {msg&&<p style={{color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontWeight:700,marginBottom:10}}>{msg}</p>}
    {list.length===0?<p className="muted">هنوز سیاست کاری تعریف نشده است.</p>:
    <table><thead><tr><th>نام</th><th>کاربران</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
      {list.map(wp=><tr key={wp.id}>
        <td style={{fontWeight:700}}>{wp.title}</td><td>{fa(wp.user_count||0)} نفر</td>
        <td><span style={{color:wp.is_active?"var(--ok)":"var(--muted)"}}>{wp.is_active?"فعال":"غیرفعال"}</span></td>
        <td>
          <button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>editPolicy(wp.id)}>ویرایش</button>{" "}
          <button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>{setAssignFor(wp.id);setPickedUsers([]);}}>تخصیص</button>{" "}
          <button className="btn g" style={{fontSize:11,padding:"3px 8px",color:"var(--danger)"}} onClick={()=>del(wp.id)}>حذف</button>
        </td>
      </tr>)}
    </tbody></table>}
  </div>);

  // ---- تخصیص به کاربران ----
  if(assignFor) return(<div className="panel">
    <div className="row" style={{justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h3>تخصیص سیاست کاری به کاربران</h3>
      <button className="btn g" onClick={()=>{setAssignFor(null);setPickedUsers([]);}}>بازگشت</button>
    </div>
    <div className="row" style={{gap:8,marginBottom:10}}>
      <button className="btn g" onClick={()=>setPickedUsers(users.map(u=>u.id))}>انتخاب همه</button>
      <button className="btn g" onClick={()=>setPickedUsers([])}>پاک کردن</button>
      <span className="muted">{fa(pickedUsers.length)} نفر انتخاب شده</span>
    </div>
    <div style={{maxHeight:360,overflowY:"auto",border:"1px solid var(--line)",borderRadius:10,padding:8}}>
      {users.map(u=><label key={u.id} className="row" style={{gap:8,padding:"5px 4px",borderBottom:"1px solid var(--line)"}}>
        <input type="checkbox" checked={pickedUsers.includes(u.id)} onChange={e=>setPickedUsers(p=>e.target.checked?[...p,u.id]:p.filter(x=>x!==u.id))}/>
        <span>{u.first_name} {u.last_name}</span><span className="muted" style={{fontSize:11}}>{u.role_title||""}</span>
      </label>)}
    </div>
    <button className="btn p" style={{marginTop:12}} onClick={doAssign}>تخصیص به کاربران انتخابی</button>
    {msg&&<p style={{marginTop:10,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontWeight:700}}>{msg}</p>}
  </div>);

  // ---- ویرایش سیاست کاری ----
  const hasMode = ["annual","sick","unpaid","mission"].includes(reqTab);
  return(<div className="panel">
    <div className="row" style={{justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h3>{editing.id?"ویرایش":"ثبت"} سیاست کاری</h3>
      <button className="btn g" onClick={()=>setEditing(null)}>بازگشت به فهرست</button>
    </div>

    <label className="label">نام سیاست کاری <span style={{color:"var(--danger)"}}>*</span></label>
    <input className="input" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/>
    <label className="label" style={{marginTop:10}}>توضیحات</label>
    <textarea className="input" rows="2" placeholder="توضیحات سیاست کاری را وارد نمایید" value={editing.description||""} onChange={e=>setEditing({...editing,description:e.target.value})}/>
    <div className="row" style={{marginTop:10}}><button className="btn p" style={{flex:1}} onClick={save}>ثبت</button></div>
    <label className="row" style={{gap:8,marginTop:12}}>
      <input type="checkbox" checked={!!editing.apply_time_limit_on_approve} onChange={e=>setEditing({...editing,apply_time_limit_on_approve:e.target.checked})}/>
      اعمال محدودیت زمانی در زمان تائید درخواست
    </label>
    {msg&&<p style={{marginTop:8,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontWeight:700}}>{msg}</p>}

    <h4 style={{textAlign:"center",margin:"18px 0 10px"}}>درخواست‌ها</h4>
    <div className="tabbar" style={{flexWrap:"wrap",overflowX:"auto"}}>
      {REQ_TABS.map(([k,t])=><button key={k} className={"tabbtn"+(reqTab===k?" on":"")} onClick={()=>{setReqTab(k);setModeTab("daily");}}>{t}</button>)}
    </div>

    <div style={{marginTop:14}}>
      {/* سقف سالانه/ماهانه (برای انواع زمان‌محور) */}
      {reqTab!=="manual"&&<div className="card-p" style={{marginBottom:14}}>
        <HM label={"سقف "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" مجاز در سال"} h={g(reqTab+".year_h")} m={g(reqTab+".year_m")} oh={num(reqTab+".year_h")} om={num(reqTab+".year_m")}/>
        <HM label={"سقف "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" مجاز در ماه"} h={g(reqTab+".month_h")} m={g(reqTab+".month_m")} oh={num(reqTab+".month_h")} om={num(reqTab+".month_m")}/>
        {reqTab==="annual"&&<>
          <label className="row" style={{gap:8}}><input type="checkbox" checked={!!g("annual.allow_over_year")} onChange={chk("annual.allow_over_year")}/>امکان ثبت مرخصی در صورت رسیدن به سقف مجاز سالانه</label>
          <label className="row" style={{gap:8,marginTop:6}}><input type="checkbox" checked={!!g("annual.allow_over_month")} onChange={chk("annual.allow_over_month")}/>امکان ثبت مرخصی در صورت رسیدن به سقف مجاز ماهانه</label>
          <HM label="سقف مرخصی استحقاقی قابل انتقال به سال بعد" h={g("annual.carry_h")} m={g("annual.carry_m")} oh={num("annual.carry_h")} om={num("annual.carry_m")}/>
        </>}
      </div>}

      {/* اضافه کار: ساختار خاص */}
      {reqTab==="overtime"&&<div className="card-p">
        <DeadlineRow days={g("overtime.deadline_days")} dir={g("overtime.deadline_dir")} onDays={num("overtime.deadline_days")} onDir={e=>setCfg("overtime.deadline_dir",e.target.value)}/>
        <NumF label="سقف تعداد درخواست اضافه کار مجاز در سال" value={g("overtime.year_cap")} onChange={num("overtime.year_cap")}/>
        <NumF label="سقف تعداد درخواست اضافه کار مجاز در ماه" value={g("overtime.month_cap")} onChange={num("overtime.month_cap")}/>
        <HM label="حداقل طول بازه درخواست اضافه کار" h={g("overtime.min_h")} m={g("overtime.min_m")} oh={num("overtime.min_h")} om={num("overtime.min_m")}/>
        <HM label="حداکثر طول بازه درخواست اضافه کار" h={g("overtime.max_h")} m={g("overtime.max_m")} oh={num("overtime.max_h")} om={num("overtime.max_m")}/>
      </div>}

      {/* تردد دستی: ساختار خاص */}
      {reqTab==="manual"&&<div className="card-p">
        <NumF label="سقف تعداد درخواست تردد دستی مجاز در سال" value={g("manual.year_cap")} onChange={num("manual.year_cap")}/>
        <NumF label="سقف تعداد درخواست تردد دستی مجاز در ماه" value={g("manual.month_cap")} onChange={num("manual.month_cap")}/>
        <DeadlineRow days={g("manual.deadline_days")} dir={g("manual.deadline_dir")} onDays={num("manual.deadline_days")} onDir={e=>setCfg("manual.deadline_dir",e.target.value)}/>
      </div>}

      {/* انواع دارای حالت روزانه/ساعتی */}
      {hasMode&&<div className="card-p">
        <div className="tabbar" style={{justifyContent:"flex-start",marginBottom:12}}>
          <button className={"tabbtn"+(modeTab==="hourly"?" on":"")} onClick={()=>setModeTab("hourly")}>ساعتی</button>
          <button className={"tabbtn"+(modeTab==="daily"?" on":"")} onClick={()=>setModeTab("daily")}>روزانه</button>
        </div>
        {modeTab==="daily"?<>
          <NumF label={"سقف تعداد درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" روزانه مجاز در سال"} value={g(reqTab+".daily.year_cap")} onChange={num(reqTab+".daily.year_cap")}/>
          <NumF label={"سقف تعداد درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" روزانه مجاز در ماه"} value={g(reqTab+".daily.month_cap")} onChange={num(reqTab+".daily.month_cap")}/>
          <NumF label={"حداقل طول بازه درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" روزانه"} value={g(reqTab+".daily.min_days")} onChange={num(reqTab+".daily.min_days")}/>
          <NumF label={"حداکثر طول بازه درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" روزانه"} value={g(reqTab+".daily.max_days")} onChange={num(reqTab+".daily.max_days")}/>
          <DeadlineRow days={g(reqTab+".daily.deadline_days")} dir={g(reqTab+".daily.deadline_dir")} onDays={num(reqTab+".daily.deadline_days")} onDir={e=>setCfg(reqTab+".daily.deadline_dir",e.target.value)}/>
        </>:<>
          <NumF label={"سقف تعداد درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" ساعتی مجاز در سال"} value={g(reqTab+".hourly.year_cap")} onChange={num(reqTab+".hourly.year_cap")}/>
          <NumF label={"سقف تعداد درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]+" ساعتی مجاز در ماه"} value={g(reqTab+".hourly.month_cap")} onChange={num(reqTab+".hourly.month_cap")}/>
          <HM label={"حداقل طول بازه درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]} h={g(reqTab+".hourly.min_h")} m={g(reqTab+".hourly.min_m")} oh={num(reqTab+".hourly.min_h")} om={num(reqTab+".hourly.min_m")}/>
          <HM label={"حداکثر طول بازه درخواست "+REQ_TABS.find(t=>t[0]===reqTab)[1]} h={g(reqTab+".hourly.max_h")} m={g(reqTab+".hourly.max_m")} oh={num(reqTab+".hourly.max_h")} om={num(reqTab+".hourly.max_m")}/>
          <DeadlineRow days={g(reqTab+".hourly.deadline_days")} dir={g(reqTab+".hourly.deadline_dir")} onDays={num(reqTab+".hourly.deadline_days")} onDir={e=>setCfg(reqTab+".hourly.deadline_dir",e.target.value)}/>
        </>}
      </div>}
    </div>
    <div className="row" style={{marginTop:16}}><button className="btn p" style={{flex:1}} onClick={save}>ثبت سیاست کاری</button></div>
  </div>);
}

function LeaveBlockedDates(){
  const [list,setList]=useState([]);
  const [jdate,setJdate]=useState("");
  const [reason,setReason]=useState("");
  const [msg,setMsg]=useState("");
  const load=()=>GET("/admin/leave-blocked-dates").then(d=>setList(d||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const add=async()=>{
    if(!jdate){setMsg("تاریخ را انتخاب کنید");return;}
    try{ await SEND("POST","/admin/leave-blocked-dates",{jdate,reason}); setJdate("");setReason("");setMsg("✓ روز ممنوعه ثبت شد"); load(); }
    catch(e){ setMsg(e.message||"خطا در ثبت"); }
  };
  const del=async(id)=>{ if(!confirm("حذف این روز ممنوعه؟"))return; await SEND("DELETE","/admin/leave-blocked-dates/"+id); load(); };
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:12}}>روزهایی که گرفتن مرخصی در آن‌ها ممنوع است را اینجا تعریف کنید (مثلاً ایام پیک سفر، مناسبت‌های خاص). هنگام ثبت درخواست مرخصی، اگر بازهٔ انتخابی شامل این روزها باشد، درخواست رد می‌شود.</p>
    <div className="card-p" style={{marginBottom:14}}>
      <div className="row" style={{gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div><label className="label">تاریخ ممنوعه</label><JDate value={jdate} onChange={setJdate}/></div>
        <div style={{flex:1,minWidth:200}}><label className="label">علت (اختیاری)</label><input className="input" placeholder="مثلاً تعطیلات نوروز / پیک زیارتی" value={reason} onChange={e=>setReason(e.target.value)}/></div>
        <button className="btn p" onClick={add}>افزودن</button>
      </div>
      {msg&&<p style={{marginTop:10,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontSize:13,fontWeight:700}}>{msg}</p>}
    </div>
    {list.length===0?<p className="muted">هنوز روز ممنوعه‌ای تعریف نشده است.</p>:
    <table><thead><tr><th>تاریخ</th><th>علت</th><th></th></tr></thead><tbody>
      {list.map(d=><tr key={d.id}>
        <td style={{fontWeight:700}}>{fa(d.jdate)}</td><td style={{fontSize:12.5,color:"var(--muted)"}}>{d.reason||"—"}</td>
        <td><button className="btn g" style={{color:"var(--danger)"}} onClick={()=>del(d.id)}>حذف</button></td>
      </tr>)}
    </tbody></table>}
  </div>);
}

// گرید ماندهٔ مرخصی استحقاقی ابتدای دوره برای همهٔ پرسنل (مدل فینتو)
function LeaveBalanceInit(){
  const [rows,setRows]=useState(null);
  const [q,setQ]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const load=()=>db.leaveBalanceInitList().then(r=>setRows((r||[]).map(x=>{ const m=+x.minutes||0; return {...x, h:Math.floor(m/60), m:m%60}; }))).catch(()=>setRows([]));
  useEffect(()=>{load();},[]);
  const setCell=(id,k,v)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[k]:Math.max(0,Math.min(k==="m"?59:9999,+v||0))}:r));
  const save=async()=>{ setBusy(true); setMsg("");
    try{ const items=rows.map(r=>({user_id:r.id,minutes:(+r.h||0)*60+(+r.m||0)}));
      await db.leaveBalanceInitSave(items); setMsg("✓ ماندهٔ مرخصی ذخیره شد"); }
    catch(e){ setMsg(e.message||"خطا در ذخیره"); }
    finally{ setBusy(false); }
  };
  // «کپی از سال قبل»: در این سامانه مانده به‌صورت تجمعی نگه داشته می‌شود؛ این دکمه مانده فعلی را حفظ می‌کند
  // و امکان افزودن استحقاق سالانه را می‌دهد (به‌صورت دستی در ستون ساعت).
  const filtered=(rows||[]).filter(r=>!q||(r.name+" "+(r.role_title||"")).indexOf(q)>=0);
  if(rows===null) return <p className="muted">در حال بارگذاری…</p>;
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>ماندهٔ مرخصی استحقاقی هر نیرو در ابتدای دوره را وارد کنید (ساعت و دقیقه). این مقدار مبنای محاسبهٔ مانده در طول دوره است.</p>
    <div className="row" style={{gap:8,marginBottom:10,flexWrap:"wrap"}}>
      <input className="input" placeholder="جستجوی نام/سمت…" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:200}}/>
      <button className="btn p" onClick={save} disabled={busy}>{busy?"در حال ذخیره…":"💾 ذخیرهٔ همه"}</button>
      <button className="btn g" onClick={()=>{ if(confirm("ماندهٔ همهٔ نیروها صفر شود؟"))setRows(rs=>rs.map(r=>({...r,h:0,m:0}))); }}>صفر کردن همه</button>
    </div>
    {msg&&<p style={{color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontWeight:700,marginBottom:8}}>{msg}</p>}
    <div style={{overflowX:"auto"}}>
      <table style={{fontSize:12.5,minWidth:560}}>
        <thead><tr><th>#</th><th>نام</th><th>سمت</th><th>ساعت</th><th>دقیقه</th></tr></thead>
        <tbody>{filtered.map((r,i)=><tr key={r.id}>
          <td>{fa(i+1)}</td>
          <td style={{fontWeight:700}}>{r.name}</td>
          <td style={{fontSize:11,color:"var(--muted)"}}>{r.role_title||"—"}</td>
          <td><input className="input" type="number" min="0" style={{maxWidth:80}} value={r.h} onChange={e=>setCell(r.id,"h",e.target.value)}/></td>
          <td><input className="input" type="number" min="0" max="59" style={{maxWidth:80}} value={r.m} onChange={e=>setCell(r.id,"m",e.target.value)}/></td>
        </tr>)}</tbody>
      </table>
      {filtered.length===0&&<p className="muted" style={{textAlign:"center",padding:16}}>نیرویی یافت نشد.</p>}
    </div>
  </div>);
}


function OfflineSyncConflicts(){
  const [rows,setRows]=useState([]);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const load=async()=>{ setBusy(true); setMsg(""); try{ const d=await GET('/admin/offline-sync-conflicts'+(status?'?status='+encodeURIComponent(status):'')); setRows(d.items||[]); }catch(e){ setMsg(e.message||'خطا در دریافت'); } finally{ setBusy(false); } };
  useEffect(()=>{load();},[status]);
  const retry=async(id)=>{ const note=prompt('توضیح پردازش مجدد:', 'پردازش مجدد توسط مدیر')||''; setMsg(''); try{ await SEND('POST','/admin/offline-sync-conflicts/'+id+'/retry',{note}); setMsg('✓ رکورد دوباره پردازش شد'); load(); }catch(e){ setMsg(e.message||'خطا در پردازش مجدد'); } };
  const ignore=async(id)=>{ const note=prompt('علت نادیده گرفتن:', 'رکورد نامعتبر یا تکراری')||''; if(!note)return; try{ await SEND('POST','/admin/offline-sync-conflicts/'+id+'/ignore',{note}); setMsg('✓ رکورد نادیده گرفته شد'); load(); }catch(e){ setMsg(e.message||'خطا در ثبت'); } };
  const mark=async(id)=>{ const reason=prompt('علت ارجاع به بررسی:', 'نیازمند بررسی مدیریتی')||''; if(!reason)return; try{ await SEND('POST','/admin/offline-sync-conflicts/'+id+'/mark-conflict',{reason}); setMsg('✓ وضعیت تعارض ثبت شد'); load(); }catch(e){ setMsg(e.message||'خطا در ثبت تعارض'); } };
  const payloadText=(r)=>{ try{ return typeof r.payload==='string'?r.payload:JSON.stringify(r.payload||{},null,2); }catch(e){ return ''; } };
  return(<div>
    <p style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>رکوردهای آفلاینی که پردازش نشده، خطا خورده یا نیازمند تصمیم مدیریتی هستند از این بخش مدیریت می‌شوند.</p>
    <div className="row" style={{gap:8,marginBottom:10,flexWrap:'wrap'}}>
      <select className="input" style={{maxWidth:220}} value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">خطاها و تعارض‌ها</option>
        <option value="received">دریافت‌شده/پردازش‌نشده</option>
        <option value="failed">ناموفق</option>
        <option value="conflict">تعارض</option>
        <option value="ignored">نادیده‌گرفته‌شده</option>
        <option value="processed">پردازش‌شده</option>
      </select>
      <button className="btn p" onClick={load} disabled={busy}>{busy?'در حال بارگذاری…':'بروزرسانی'}</button>
    </div>
    {msg&&<p style={{color:msg.startsWith('✓')?'var(--ok)':'var(--danger)',fontWeight:700,marginBottom:8}}>{msg}</p>}
    <div style={{overflowX:'auto'}}>
      <table style={{minWidth:980,fontSize:12}}><thead><tr><th>#</th><th>کاربر</th><th>نوع</th><th>وضعیت</th><th>علت/خطا</th><th>زمان</th><th>عملیات</th></tr></thead><tbody>
        {rows.map(r=><tr key={r.id}>
          <td>{fa(r.id)}</td>
          <td><b>{r.user_name||'—'}</b><div className="muted" style={{fontSize:10.5}}>{r.role_title||''}</div></td>
          <td>{r.item_type||r.source_path||'—'}<details style={{marginTop:4}}><summary style={{cursor:'pointer',color:'var(--brand)'}}>Payload</summary><pre style={{whiteSpace:'pre-wrap',maxWidth:360,background:'#f7f8fa',padding:8,borderRadius:8,direction:'ltr',textAlign:'left'}}>{payloadText(r)}</pre></details></td>
          <td><span className="badge">{r.status}</span></td>
          <td style={{maxWidth:260,whiteSpace:'pre-wrap'}}>{r.conflict_reason||r.error||'—'}{r.resolution_note&&<div className="muted" style={{marginTop:4}}>نتیجه: {r.resolution_note}</div>}</td>
          <td>{fj(r.created_at)}{r.processed_at&&<div className="muted" style={{fontSize:10.5}}>پردازش: {fj(r.processed_at)}</div>}</td>
          <td><div className="row" style={{gap:4,flexWrap:'wrap'}}>
            <button className="btn g" onClick={()=>retry(r.id)}>پردازش مجدد</button>
            <button className="btn g" onClick={()=>mark(r.id)}>تعارض</button>
            <button className="btn g" style={{color:'var(--danger)'}} onClick={()=>ignore(r.id)}>نادیده گرفتن</button>
          </div></td>
        </tr>)}
      </tbody></table>
      {!rows.length&&<p className="muted" style={{padding:16,textAlign:'center'}}>رکوردی برای نمایش وجود ندارد.</p>}
    </div>
  </div>);
}

function ShiftManager(){
  const [tab,setTab]=useState("shifts");
  const TABS=[["shifts","تعریف شیفت‌ها"],["assign","تخصیص به نیروها"],["autoRules","قوانین شیفت خودکار"],["userRules","قانون اختصاصی افراد"],["shiftOps","عملیات و عیب‌یابی شیفت"],["rejectLogs","لاگ رد حضور"],["offlineConflicts","تعارض آفلاین"],["holidays","تعطیلات رسمی"],["blocked","روزهای ممنوعهٔ مرخصی"],["leavebal","ماندهٔ مرخصی ابتدای دوره"],["report","گزارش کارکرد ماهانه"]];
  return(<div className="panel"><h3>🗓 شیفت کاری و کارکرد</h3>
    <div className="tabbar" style={{flexWrap:"wrap"}}>{TABS.map(([k,t])=><button key={k} className={"tabbtn"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{t}</button>)}</div>
    {tab==="shifts"&&<ShiftList/>}
    {tab==="assign"&&<ShiftAssign/>}
    {tab==="autoRules"&&<AutoShiftRules/>}
    {tab==="userRules"&&<UserRuleOverrides/>}
    {tab==="shiftOps"&&<ShiftOperations/>}
    {tab==="rejectLogs"&&<AttendanceRejectLogs/>}
    {tab==="offlineConflicts"&&<OfflineSyncConflicts/>}
    {tab==="holidays"&&<Holidays/>}
    {tab==="blocked"&&<LeaveBlockedDates/>}
    {tab==="leavebal"&&<LeaveBalanceInit/>}
    {tab==="report"&&<ShiftReport/>}
  </div>);
}


function minToHMInput(m){ m=parseInt(m||0,10); return {h:Math.floor(m/60),m:m%60}; }
function hmInputToMin(h,m){ return (parseInt(h||0,10)*60)+(parseInt(m||0,10)); }
function AutoShiftRules(){
  const [rows,setRows]=useState(null); const [saving,setSaving]=useState(null); const [msg,setMsg]=useState('');
  const load=()=>db.ruleEngineRoles().then(r=>setRows((r||[]).map(x=>({...x,_d:minToHMInput(x.duty_minutes),_o:minToHMInput(x.overtime_limit_minutes),_s:minToHMInput(x.surplus_after_minutes)})))).catch(e=>{setMsg(e.message||'خطا در دریافت قوانین');setRows([]);});
  useEffect(()=>{load();},[]);
  const patch=(i,k,v)=>setRows(rs=>rs.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const patchHM=(i,key,k,v)=>setRows(rs=>rs.map((r,idx)=>idx===i?{...r,[key]:{...r[key],[k]:v}}:r));
  const save=async(i)=>{ const r=rows[i]; setSaving(r.role_key); setMsg('');
    const body={...r,duty_minutes:hmInputToMin(r._d.h,r._d.m),overtime_limit_minutes:hmInputToMin(r._o.h,r._o.m),surplus_after_minutes:hmInputToMin(r._s.h,r._s.m)};
    try{ await db.saveRuleEngineRole(r.role_key,body); setMsg('ذخیره شد'); await load(); }catch(e){ setMsg(e.message||'خطا در ذخیره'); } finally{ setSaving(null); }
  };
  if(rows===null)return <p className="muted">در حال بارگذاری…</p>;
  return(<div>
    <p style={{fontSize:12.5,color:'var(--muted)',margin:'6px 0 12px'}}>قوانین شیفت خودکار از اینجا کنترل می‌شود. این قوانین در تایمر اپ، ثبت ورود، محاسبه موظفی، اضافه‌کار، مازاد، شب‌کاری، جمعه‌کاری و تعطیل‌کاری استفاده می‌شوند.</p>
    {msg&&<p style={{fontWeight:700,color:msg==='ذخیره شد'?'var(--ok)':'var(--danger)'}}>{msg}</p>}
    <div style={{overflowX:'auto'}}><table style={{minWidth:1480,fontSize:12}}><thead><tr><th>سمت</th><th>موظفی</th><th>اضافه‌کار مجاز</th><th>شروع مازاد</th><th>شب‌کاری</th><th>بازه ورود</th><th>هشدار</th><th>محاسبه‌ها</th><th>جمعه/تعطیل</th><th>جلسه باز</th><th>فعال</th><th>ذخیره</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.role_key}>
      <td><input className="input" value={r.title||r.role_key} onChange={e=>patch(i,'title',e.target.value)} style={{minWidth:130}}/><div className="muted" style={{fontSize:10,direction:'ltr'}}>{r.role_key}</div></td>
      <td><div className="row" style={{gap:4}}><input className="input" type="number" min="0" value={r._d.h} onChange={e=>patchHM(i,'_d','h',e.target.value)} style={{width:58}}/><span>:</span><input className="input" type="number" min="0" max="59" value={r._d.m} onChange={e=>patchHM(i,'_d','m',e.target.value)} style={{width:58}}/></div></td>
      <td><div className="row" style={{gap:4}}><input className="input" type="number" min="0" value={r._o.h} onChange={e=>patchHM(i,'_o','h',e.target.value)} style={{width:58}}/><span>:</span><input className="input" type="number" min="0" max="59" value={r._o.m} onChange={e=>patchHM(i,'_o','m',e.target.value)} style={{width:58}}/></div></td>
      <td><div className="row" style={{gap:4}}><input className="input" type="number" min="0" value={r._s.h} onChange={e=>patchHM(i,'_s','h',e.target.value)} style={{width:58}}/><span>:</span><input className="input" type="number" min="0" max="59" value={r._s.m} onChange={e=>patchHM(i,'_s','m',e.target.value)} style={{width:58}}/></div></td>
      <td><div className="row" style={{gap:4}}><input className="input" type="time" value={(r.night_start||'22:00').slice(0,5)} onChange={e=>patch(i,'night_start',e.target.value)} style={{width:95}}/><input className="input" type="time" value={(r.night_end||'06:00').slice(0,5)} onChange={e=>patch(i,'night_end',e.target.value)} style={{width:95}}/></div></td>
      <td><label style={{display:'block'}}><input type="checkbox" checked={!!Number(r.checkin_any_time)} onChange={e=>patch(i,'checkin_any_time',e.target.checked?1:0)}/> آزاد</label>{!Number(r.checkin_any_time)&&<div className="row" style={{gap:4,marginTop:4}}><input className="input" type="time" value={(r.allowed_checkin_from||'').slice(0,5)} onChange={e=>patch(i,'allowed_checkin_from',e.target.value)} style={{width:95}}/><input className="input" type="time" value={(r.allowed_checkin_to||'').slice(0,5)} onChange={e=>patch(i,'allowed_checkin_to',e.target.value)} style={{width:95}}/></div>}</td>
      <td><input className="input" type="number" min="0" max="240" value={r.warn_before_overtime_cap_minutes||0} onChange={e=>patch(i,'warn_before_overtime_cap_minutes',e.target.value)} style={{width:80}}/><div className="muted" style={{fontSize:10}}>دقیقه مانده به سقف</div></td>
      <td><label><input type="checkbox" checked={Number(r.night_calc)!==0} onChange={e=>patch(i,'night_calc',e.target.checked?1:0)}/> شب</label><br/><label><input type="checkbox" checked={Number(r.friday_calc)!==0} onChange={e=>patch(i,'friday_calc',e.target.checked?1:0)}/> جمعه</label><br/><label><input type="checkbox" checked={Number(r.holiday_calc)!==0} onChange={e=>patch(i,'holiday_calc',e.target.checked?1:0)}/> تعطیل</label></td>
      <td><label><input type="checkbox" checked={Number(r.include_friday_in_duty)!==1} onChange={e=>patch(i,'include_friday_in_duty',e.target.checked?0:1)}/> جمعه خارج از موظفی</label><br/><label><input type="checkbox" checked={Number(r.include_holiday_in_duty)!==1} onChange={e=>patch(i,'include_holiday_in_duty',e.target.checked?0:1)}/> تعطیل خارج از موظفی</label></td>
      <td><input className="input" type="number" min="60" value={r.max_open_session_minutes||960} onChange={e=>patch(i,'max_open_session_minutes',e.target.value)} style={{width:85}}/><div className="muted" style={{fontSize:10}}>حداکثر باز بودن</div><label><input type="checkbox" checked={Number(r.auto_close_enabled)!==0} onChange={e=>patch(i,'auto_close_enabled',e.target.checked?1:0)}/> خروج خودکار</label><input className="input" type="number" min="0" value={r.auto_close_after_minutes||0} onChange={e=>patch(i,'auto_close_after_minutes',e.target.value)} style={{width:85,marginTop:4}}/></td>
      <td><label><input type="checkbox" checked={Number(r.auto_shift_enabled)!==0} onChange={e=>patch(i,'auto_shift_enabled',e.target.checked?1:0)}/> شیفت خودکار</label><br/><label><input type="checkbox" checked={Number(r.is_active)!==0} onChange={e=>patch(i,'is_active',e.target.checked?1:0)}/> قانون فعال</label><br/><label><input type="checkbox" checked={Number(r.require_checkout_after_cap)!==0} onChange={e=>patch(i,'require_checkout_after_cap',e.target.checked?1:0)}/> الزام خروج پس از سقف</label></td>
      <td><button className="btn p" disabled={saving===r.role_key} onClick={()=>save(i)}>{saving===r.role_key?'در حال ذخیره':'ذخیره'}</button></td>
    </tr>)}</tbody></table></div>
  </div>);
}

function UserRuleOverrides(){
  const [users,setUsers]=useState([]), [uid,setUid]=useState(''), [row,setRow]=useState(null), [msg,setMsg]=useState('');
  useEffect(()=>{db.usersLite().then(setUsers).catch(()=>{});},[]);
  const load=async(id)=>{setUid(id);setMsg(''); if(!id){setRow(null);return;} const r=await db.userRuleOverrides(id); const x=(r&&r[0])||{user_id:id,is_active:1}; setRow({...x,_d:minToHMInput(x.duty_minutes||453),_o:minToHMInput(x.overtime_limit_minutes||27),_s:minToHMInput(x.surplus_after_minutes||480)});};
  const patch=(k,v)=>setRow(r=>({...r,[k]:v})); const patchHM=(key,k,v)=>setRow(r=>({...r,[key]:{...r[key],[k]:v}}));
  const save=async()=>{ if(!uid||!row)return; const body={...row,duty_minutes:hmInputToMin(row._d.h,row._d.m),overtime_limit_minutes:hmInputToMin(row._o.h,row._o.m),surplus_after_minutes:hmInputToMin(row._s.h,row._s.m)}; await db.saveUserRuleOverride(uid,body); setMsg('ذخیره شد'); await load(uid); };
  const del=async()=>{ if(!uid)return; if(!confirm('قانون اختصاصی این کاربر حذف شود؟'))return; await db.deleteUserRuleOverride(uid); setMsg('حذف شد'); await load(uid); };
  return <div><p className="muted" style={{fontSize:12}}>برای افراد خاص می‌توان قانون شیفت خودکار را مستقل از سمت تنظیم کرد. مقدارهای خالی از قانون سمت گرفته می‌شود.</p><select className="input" style={{maxWidth:320,marginBottom:12}} value={uid} onChange={e=>load(e.target.value)}><option value="">انتخاب کاربر</option>{users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select>{msg&&<p style={{fontWeight:700,color:'var(--ok)'}}>{msg}</p>}{row&&<div className="card-p"><div className="row" style={{gap:8,flexWrap:'wrap'}}><input className="input" placeholder="عنوان قانون اختصاصی" value={row.title||''} onChange={e=>patch('title',e.target.value)} style={{maxWidth:240}}/><label><input type="checkbox" checked={Number(row.is_active)!==0} onChange={e=>patch('is_active',e.target.checked?1:0)}/> فعال</label></div><div style={{overflowX:'auto'}}><table style={{fontSize:12,minWidth:980,marginTop:10}}><thead><tr><th>موظفی</th><th>اضافه‌کار</th><th>شروع مازاد</th><th>شب‌کاری</th><th>بازه ورود</th><th>جمعه/تعطیل</th><th>جلسه باز</th></tr></thead><tbody><tr><td><input className="input" type="number" value={row._d.h} onChange={e=>patchHM('_d','h',e.target.value)} style={{width:55}}/>:<input className="input" type="number" value={row._d.m} onChange={e=>patchHM('_d','m',e.target.value)} style={{width:55}}/></td><td><input className="input" type="number" value={row._o.h} onChange={e=>patchHM('_o','h',e.target.value)} style={{width:55}}/>:<input className="input" type="number" value={row._o.m} onChange={e=>patchHM('_o','m',e.target.value)} style={{width:55}}/></td><td><input className="input" type="number" value={row._s.h} onChange={e=>patchHM('_s','h',e.target.value)} style={{width:55}}/>:<input className="input" type="number" value={row._s.m} onChange={e=>patchHM('_s','m',e.target.value)} style={{width:55}}/></td><td><input className="input" type="time" value={(row.night_start||'22:00').slice(0,5)} onChange={e=>patch('night_start',e.target.value)} style={{width:95}}/> <input className="input" type="time" value={(row.night_end||'06:00').slice(0,5)} onChange={e=>patch('night_end',e.target.value)} style={{width:95}}/></td><td><label><input type="checkbox" checked={Number(row.checkin_any_time)!==0} onChange={e=>patch('checkin_any_time',e.target.checked?1:0)}/> آزاد</label><br/><input className="input" type="time" value={(row.allowed_checkin_from||'').slice(0,5)} onChange={e=>patch('allowed_checkin_from',e.target.value)} style={{width:95}}/> <input className="input" type="time" value={(row.allowed_checkin_to||'').slice(0,5)} onChange={e=>patch('allowed_checkin_to',e.target.value)} style={{width:95}}/></td><td><label><input type="checkbox" checked={Number(row.friday_calc)!==0} onChange={e=>patch('friday_calc',e.target.checked?1:0)}/> جمعه</label><br/><label><input type="checkbox" checked={Number(row.holiday_calc)!==0} onChange={e=>patch('holiday_calc',e.target.checked?1:0)}/> تعطیل</label><br/><label><input type="checkbox" checked={Number(row.include_friday_in_duty)!==0} onChange={e=>patch('include_friday_in_duty',e.target.checked?1:0)}/> جمعه داخل موظفی</label></td><td><input className="input" type="number" value={row.max_open_session_minutes||960} onChange={e=>patch('max_open_session_minutes',e.target.value)} style={{width:90}}/><br/><label><input type="checkbox" checked={Number(row.auto_close_enabled)!==0} onChange={e=>patch('auto_close_enabled',e.target.checked?1:0)}/> خروج خودکار</label><br/><input className="input" type="number" value={row.auto_close_after_minutes||0} onChange={e=>patch('auto_close_after_minutes',e.target.value)} style={{width:90}}/></td></tr></tbody></table></div><div style={{marginTop:12}}><button className="btn p" onClick={save}>ذخیره قانون اختصاصی</button> <button className="btn g" onClick={del}>حذف قانون اختصاصی</button></div></div>}</div>;
}

function ShiftOperations(){
  const [diag,setDiag]=useState(null), [msg,setMsg]=useState(''); const tj=todayJStr(); const [from,setFrom]=useState(tj), [to,setTo]=useState(tj), [uid,setUid]=useState('');
  const load=async()=>{setDiag(await db.shiftPlanningDiagnostics());}; useEffect(()=>{load();},[]);
  const recalc=async()=>{const r=await db.attendanceRecalculate({user_id:uid?+uid:0,from,to});setMsg('محاسبه مجدد: '+fa(r.rows_count||0)+' رکورد');};
  const autoclose=async(dry)=>{const r=await db.autoCloseOpenSessions({dry_run:dry});setMsg((dry?'بررسی':'بستن')+' جلسات باز: '+fa(r.closed_count||0)+' مورد'); await load();};
  return <div><p className="muted" style={{fontSize:12}}>کنترل نهایی شیفت‌بندی: تعارض تخصیص، شیفت چرخشی بدون تاریخ شروع، جلسات باز طولانی و محاسبه مجدد کارکرد.</p>{msg&&<p style={{fontWeight:700,color:'var(--ok)'}}>{msg}</p>}<div className="card-p"><h4>محاسبه مجدد کارکرد</h4><div className="row" style={{gap:8,flexWrap:'wrap',alignItems:'end'}}><div><label className="label">از تاریخ</label><JDate value={from} onChange={setFrom}/></div><div><label className="label">تا تاریخ</label><JDate value={to} onChange={setTo}/></div><input className="input" placeholder="شناسه کاربر، خالی=همه" value={uid} onChange={e=>setUid(e.target.value.replace(/\D/g,''))} style={{maxWidth:160}}/><button className="btn p" onClick={recalc}>محاسبه مجدد</button><button className="btn g" onClick={()=>autoclose(true)}>بررسی خروج خودکار</button><button className="btn p" onClick={()=>autoclose(false)}>اجرای خروج خودکار</button></div></div><button className="btn g" style={{margin:'10px 0'}} onClick={load}>بروزرسانی عیب‌یابی</button>{diag&&<div className="grid2"><div className="card-p"><h4>تعارض تخصیص شیفت</h4>{diag.overlaps?.length?diag.overlaps.map((r,i)=><p key={i} style={{fontSize:12}}>{r.user_name}: {r.shift_a_title} با {r.shift_b_title}</p>):<p className="muted">موردی نیست.</p>}</div><div className="card-p"><h4>شیفت چرخشی ناقص</h4>{diag.rotating_without_start?.length?diag.rotating_without_start.map(r=><p key={r.id}>{r.title}</p>):<p className="muted">موردی نیست.</p>}</div><div className="card-p"><h4>جلسات باز</h4>{diag.open_sessions?.length?diag.open_sessions.map(r=><p key={r.id} style={{fontSize:12,color:r.too_long?'var(--danger)':'inherit'}}>{r.user_name}: {fa(r.open_minutes)} دقیقه باز / حد {fa(r.max_open_session_minutes)}</p>):<p className="muted">موردی نیست.</p>}</div><div className="card-p"><h4>سمت بدون قانون دقیق</h4>{diag.users_without_exact_role_rule?.length?diag.users_without_exact_role_rule.map(r=><p key={r.user_id} style={{fontSize:12}}>{r.user_name} — {r.role_title}</p>):<p className="muted">موردی نیست.</p>}</div></div>}</div>;
}

function AttendanceRejectLogs(){
  const today=new Date().toISOString().slice(0,10); const [from,setFrom]=useState(today); const [to,setTo]=useState(today); const [uid,setUid]=useState(''); const [rows,setRows]=useState([]); const [busy,setBusy]=useState(false);
  const load=async()=>{setBusy(true);try{const qs='?from='+encodeURIComponent(from||'')+'&to='+encodeURIComponent(to||'')+(uid?('&user_id='+encodeURIComponent(uid)):'');setRows(await db.attendanceRejectLogs(qs)||[]);}catch(e){alert(e.message||'خطا');}finally{setBusy(false);}};
  useEffect(()=>{load();},[]);
  return(<div>
    <p style={{fontSize:12.5,color:'var(--muted)',margin:'6px 0 12px'}}>این بخش علت فعال نشدن یا رد شدن ثبت حضور را نشان می‌دهد: فاصله از ایستگاه، خط انتخابی، دقت GPS و پیام خطا.</p>
    <div className="row" style={{gap:8,marginBottom:10,flexWrap:'wrap'}}><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{maxWidth:150}}/><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{maxWidth:150}}/><input className="input" placeholder="شناسه کاربر" value={uid} onChange={e=>setUid(e.target.value.replace(/\D/g,''))} style={{maxWidth:130}}/><button className="btn p" onClick={load}>{busy?'در حال دریافت':'نمایش'}</button></div>
    <div style={{overflowX:'auto'}}><table style={{minWidth:980,fontSize:12}}><thead><tr><th>زمان</th><th>کاربر</th><th>خط</th><th>روش</th><th>GPS</th><th>دقت</th><th>علت</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{fj(r.created_at)}</td><td>{r.user_name||r.user_id}</td><td>{r.line_code||r.line_id||'—'}<div className="muted" style={{fontSize:10}}>{r.line_title||''}</div></td><td>{r.method}</td><td dir="ltr">{r.lat||'—'}, {r.lng||'—'}</td><td>{r.accuracy_m?fa(r.accuracy_m)+' متر':'—'}</td><td style={{maxWidth:360}}>{r.reason}</td></tr>)}</tbody></table>{rows.length===0&&<p className="muted" style={{padding:14,textAlign:'center'}}>رکوردی وجود ندارد.</p>}</div>
  </div>);
}

function ShiftList(){
  const [list,setList]=useState([]); const [edit,setEdit]=useState(null);
  const load=()=>db.shifts().then(s=>setList(s||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const create=async(type)=>{ const r=await db.saveShift({title:"شیفت جدید",type,weekly:type==="simple"?{}:undefined,float_minutes:type==="floating"?480:null}); const full=await db.shift(r.id); setEdit(full); };
  const del=async(id)=>{ if(!confirm("حذف این شیفت؟"))return; await db.delShift(id); load(); };
  if(edit) return <ShiftEdit shift={edit} onClose={()=>{setEdit(null);load();}}/>;
  return(<div>
    <div className="row" style={{gap:8,marginBottom:12,flexWrap:"wrap"}}>
      <button className="btn p" onClick={()=>create("simple")}>+ شیفت ساده</button>
      <button className="btn p" onClick={()=>create("advanced")}>+ شیفت پیشرفته (تقویمی)</button>
      <button className="btn p" onClick={()=>create("floating")}>+ شیفت شناور</button>
      <button className="btn p" onClick={()=>create("rotating")}>+ شیفت چرخشی ۷/۷/۷</button>
    </div>
    {list.length===0?<p className="muted">شیفتی تعریف نشده است.</p>:
    <table><thead><tr><th>عنوان</th><th>نوع</th><th>اضافه‌کار روزانه/ماهانه</th><th></th></tr></thead><tbody>
      {list.map(s=><tr key={s.id}>
        <td>{s.title}</td>
        <td>{{simple:"ساده",advanced:"پیشرفته",floating:"شناور",rotating:"چرخشی"}[s.type]||s.type}</td>
        <td style={{fontSize:12}}>{s.daily_ot_cap?fa(s.daily_ot_cap)+"د":"—"} / {s.monthly_ot_cap?fa(s.monthly_ot_cap)+"د":"—"}</td>
        <td><button className="btn g" onClick={async()=>setEdit(await db.shift(s.id))}>ویرایش</button> <button className="btn g" onClick={()=>del(s.id)}>حذف</button></td>
      </tr>)}
    </tbody></table>}
  </div>);
}

function ShiftEdit({shift,onClose}){
  const [s,setS]=useState(shift);
  const set=(patch)=>setS({...s,...patch});
  const saveMeta=async()=>{ await db.updateShift(s.id,{title:s.title,float_minutes:s.float_minutes,allow_offday:s.allow_offday?1:0,daily_ot_cap:s.daily_ot_cap||null,monthly_ot_cap:s.monthly_ot_cap||null,night_calc:s.night_calc?1:0,friday_calc:s.friday_calc?1:0,holiday_calc:s.holiday_calc?1:0,weekly:s.type==="simple"?(s.weekly||{}):undefined,advanced:s.type==="rotating"?(s.advanced||{}):undefined}); alert("ذخیره شد."); };
  return(<div>
    <button className="btn g" style={{marginBottom:12}} onClick={onClose}>‹ بازگشت به فهرست</button>
    <div className="card-p" style={{marginBottom:14}}>
      <div className="row" style={{gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:180}}><label className="label">عنوان شیفت</label><input className="input" value={s.title||""} onChange={e=>set({title:e.target.value})}/></div>
        <div><label className="label">نوع</label><div style={{padding:"9px 0",fontWeight:700}}>{{simple:"ساده",advanced:"پیشرفته (تقویمی)",floating:"شناور",rotating:"چرخشی ۷/۷/۷"}[s.type]}</div></div>
      </div>
      {s.type==="floating"&&<div style={{marginTop:10}}><label className="label">مدت حضور لازم روزانه (دقیقه)</label><input className="input" type="number" style={{maxWidth:140}} value={s.float_minutes||0} onChange={e=>set({float_minutes:+e.target.value||0})}/><span className="muted" style={{marginInlineStart:8}}>= {fa(Math.floor((s.float_minutes||0)/60))} ساعت و {fa((s.float_minutes||0)%60)} دقیقه</span></div>}
      <div className="row" style={{gap:16,flexWrap:"wrap",marginTop:12}}>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={!!s.allow_offday} onChange={e=>set({allow_offday:e.target.checked})}/>حضور در روزهای بدون شیفت مجاز است</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={s.night_calc!=0} onChange={e=>set({night_calc:e.target.checked?1:0})}/>محاسبهٔ شب‌کاری (۲۲ تا ۶)</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={s.friday_calc!=0} onChange={e=>set({friday_calc:e.target.checked?1:0})}/>محاسبهٔ جمعه‌کاری</label>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={s.holiday_calc!=0} onChange={e=>set({holiday_calc:e.target.checked?1:0})}/>محاسبهٔ تعطیل‌کاری</label>
      </div>
      <div className="row" style={{gap:10,flexWrap:"wrap",marginTop:10}}>
        <div><label className="label">سقف اضافه‌کار روزانه (دقیقه)</label><input className="input" type="number" style={{maxWidth:130}} value={s.daily_ot_cap||""} onChange={e=>set({daily_ot_cap:+e.target.value||null})}/></div>
        <div><label className="label">سقف اضافه‌کار ماهانه (دقیقه)</label><input className="input" type="number" style={{maxWidth:130}} value={s.monthly_ot_cap||""} onChange={e=>set({monthly_ot_cap:+e.target.value||null})}/></div>
      </div>
      <button className="btn p" style={{marginTop:12}} onClick={saveMeta}>ذخیرهٔ تنظیمات شیفت</button>
    </div>
    {s.type==="simple"&&<SimpleWeekly s={s} set={set}/>}
    {s.type==="advanced"&&<AdvancedCalendar shift={s}/>}
    {s.type==="floating"&&<p className="muted">برای شیفت شناور فقط مدت حضور روزانه لازم است؛ آستانهٔ ساعتی اعمال نمی‌شود.</p>}
    {s.type==="rotating"&&<RotatingShiftEditor s={s} set={set}/>}
  </div>);
}

// ویرایشگر هفتگی شیفت ساده (۷ روز، هر روز یک یا دو قطعه با آستانه)
function SimpleWeekly({s,set}){
  const weekly=s.weekly||{};
  const setDay=(d,segs)=>set({weekly:{...weekly,[d]:segs}});
  const addSeg=(d)=>{ const cur=weekly[d]||[]; if(cur.length>=2)return alert("حداکثر دو قطعه در روز"); setDay(d,[...cur,emptySeg()]); };
  const updSeg=(d,i,k,v)=>{ const cur=[...(weekly[d]||[])]; cur[i]={...cur[i],[k]:v}; setDay(d,cur); };
  const delSeg=(d,i)=>{ const cur=(weekly[d]||[]).filter((_,j)=>j!==i); setDay(d,cur); };
  const copyDay=(d)=>{ window._shiftClip=JSON.stringify(weekly[d]||[]); alert("شیفت روز کپی شد. روی روز مقصد «پیست» بزنید."); };
  const pasteDay=(d)=>{ if(!window._shiftClip)return alert("ابتدا یک روز را کپی کنید"); setDay(d,JSON.parse(window._shiftClip)); };
  return(<div>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>برای هر روز هفته می‌توانید یک یا دو قطعه (شیفت دوتکه) تعریف کنید. «آستانهٔ ورود» = زودترین/دیرترین زمان مجاز ثبت ورود؛ «آستانهٔ خروج» = زودترین/دیرترین زمان مجاز ثبت خروج.</p>
    {WD.map((wd,d)=><div key={d} className="card-p" style={{marginBottom:8}}>
      <div className="row" style={{justifyContent:"space-between",marginBottom:6}}>
        <b>{wd}</b>
        <span className="row" style={{gap:6}}>
          <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>copyDay(d)}>کپی</button>
          <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>pasteDay(d)}>پیست</button>
          <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>addSeg(d)}>+ قطعه</button>
        </span>
      </div>
      {(weekly[d]||[]).length===0?<span className="muted" style={{fontSize:12}}>تعطیل / بدون شیفت</span>:
        (weekly[d]||[]).map((seg,i)=><div key={i} className="seg-row">
          <span className="seg-lbl">قطعه {fa(i+1)}</span>
          <TimeField label="شروع" v={seg.s} on={x=>updSeg(d,i,"s",x)}/>
          <TimeField label="پایان" v={seg.e} on={x=>updSeg(d,i,"e",x)}/>
          <TimeField label="ورود از" v={seg.es} on={x=>updSeg(d,i,"es",x)}/>
          <TimeField label="ورود تا" v={seg.ls} on={x=>updSeg(d,i,"ls",x)}/>
          <TimeField label="خروج از" v={seg.ee} on={x=>updSeg(d,i,"ee",x)}/>
          <TimeField label="خروج تا" v={seg.le} on={x=>updSeg(d,i,"le",x)}/>
          <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>delSeg(d,i)}>×</button>
        </div>)}
    </div>)}
    <p style={{fontSize:12,color:"var(--muted)"}}>برای شیفت شبانه، «پایان» را کوچک‌تر از «شروع» بگذارید (مثلاً شروع ۲۲:۰۰ و پایان ۰۶:۰۰)؛ سامانه آن را بین دو روز محاسبه می‌کند.</p>
  </div>);
}

function RotatingShiftEditor({s,set}){
  const adv=s.advanced||{}; const rot=adv.rotation||adv||{};
  const cycle=rot.cycle||[
    {days:7,segments:[{s:"07:00",e:"15:00",es:"06:30",ls:"07:30",ee:"14:30",le:"15:30"}]},
    {days:7,segments:[{s:"15:00",e:"23:00",es:"14:30",ls:"15:30",ee:"22:30",le:"23:30"}]},
    {days:7,segments:[{s:"23:00",e:"07:00",es:"22:30",ls:"23:30",ee:"06:30",le:"07:30"}]},
  ];
  const update=(patch)=>set({advanced:{rotation:{...rot,cycle,...patch}}});
  const updSeg=(i,k,v)=>{ const nc=cycle.map((c,idx)=>idx===i?{...c,segments:[{...(c.segments?.[0]||{}),[k]:v}]}:c); set({advanced:{rotation:{...rot,cycle:nc}}}); };
  return(<div className="card-p">
    <h4>تنظیم شیفت چرخشی</h4>
    <p className="muted" style={{fontSize:12}}>الگوی پیش‌فرض: ۷ روز صبح، ۷ روز عصر، ۷ روز شب. تاریخ شروع چرخه باید اولین روز شیفت صبح باشد.</p>
    <label className="label">تاریخ شروع چرخه، مثل 1405-01-01</label>
    <input className="input" style={{maxWidth:160,direction:"ltr"}} value={rot.cycle_start_jdate||rot.start_jdate||""} onChange={e=>update({cycle_start_jdate:e.target.value})}/>
    {cycle.map((c,i)=><div key={i} className="seg-row" style={{marginTop:8}}>
      <span className="seg-lbl">دوره {fa(i+1)} / {fa(c.days||7)} روز</span>
      <TimeField label="شروع" v={c.segments?.[0]?.s} on={x=>updSeg(i,"s",x)}/>
      <TimeField label="پایان" v={c.segments?.[0]?.e} on={x=>updSeg(i,"e",x)}/>
      <TimeField label="ورود از" v={c.segments?.[0]?.es} on={x=>updSeg(i,"es",x)}/>
      <TimeField label="ورود تا" v={c.segments?.[0]?.ls} on={x=>updSeg(i,"ls",x)}/>
      <TimeField label="خروج از" v={c.segments?.[0]?.ee} on={x=>updSeg(i,"ee",x)}/>
      <TimeField label="خروج تا" v={c.segments?.[0]?.le} on={x=>updSeg(i,"le",x)}/>
    </div>)}
  </div>);
}

function TimeField({label,v,on}){ return(<span className="tf"><span className="tf-l">{label}</span><input className="input tf-i" type="time" value={v||""} onChange={e=>on(e.target.value)}/></span>); }

// مودال ویرایش مشخصات شیفت روز (مدل فینتو)
function ShiftDayModal({day, jdate, onSave, onClose}){
  const init = day && day.day_config ? day.day_config : {};
  const [type,setType]=useState(init.type||"simple"); // simple | floating
  const [duty_min,setDuty]=useState(init.duty_min!=null?init.duty_min:""); // مدت موظفی روزانه (دقیقه)
  const [daily_ot,setDailyOt]=useState(init.daily_ot!=null?init.daily_ot:""); // سقف اضافه کاری روزانه (دقیقه)
  const [float_min,setFloatMin]=useState(init.float_min!=null?init.float_min:""); // زمان شناوری (دقیقه)
  const [adv,setAdv]=useState(true); // باز بودن تنظیمات پیشرفته
  // بازهٔ مجاز تردد
  const [traffic_start,setTrafficStart]=useState(init.traffic_start||"");
  const [traffic_end,setTrafficEnd]=useState(init.traffic_end||"");
  // شب کاری
  const [is_night,setIsNight]=useState(!!init.is_night);
  const [night_start,setNightStart]=useState(init.night_start||"");
  const [night_dur,setNightDur]=useState(init.night_dur||"");
  // اضافه کار از ابتدا/میانه/انتها (دقیقه) — فقط شناور
  const [ot_begin,setOtBegin]=useState(init.ot_begin!=null?init.ot_begin:"");
  const [ot_middle,setOtMiddle]=useState(init.ot_middle!=null?init.ot_middle:"");
  const [ot_end,setOtEnd]=useState(init.ot_end!=null?init.ot_end:"");
  // تاخیر/تعجیل مجاز (دقیقه)
  const [late_ok,setLateOk]=useState(init.late_ok!=null?init.late_ok:"");
  const [early_ok,setEarlyOk]=useState(init.early_ok!=null?init.early_ok:"");
  // شناوری قبل شیفت (دقیقه) — فقط شناور
  const [float_before,setFloatBefore]=useState(init.float_before!=null?init.float_before:"");
  // قسمت اول روز
  const [p1,setP1]=useState(init.p1_on!==false);
  const [p1s,setP1s]=useState(init.p1_start||"07:00");
  const [p1e,setP1e]=useState(init.p1_end||"14:33");
  // قسمت دوم روز
  const [p2,setP2]=useState(!!init.p2_on);
  const [p2s,setP2s]=useState(init.p2_start||"");
  const [p2e,setP2e]=useState(init.p2_end||"");

  const save=()=>{
    const cfg={ type, duty_min:duty_min===""?null:+duty_min, daily_ot:daily_ot===""?null:+daily_ot,
      float_min:float_min===""?null:+float_min, traffic_start, traffic_end,
      is_night, night_start, night_dur, ot_begin:ot_begin===""?null:+ot_begin,
      ot_middle:ot_middle===""?null:+ot_middle, ot_end:ot_end===""?null:+ot_end,
      late_ok:late_ok===""?null:+late_ok, early_ok:early_ok===""?null:+early_ok,
      float_before:float_before===""?null:+float_before,
      p1_on:p1, p1_start:p1s, p1_end:p1e, p2_on:p2, p2_start:p2s, p2_end:p2e };
    // segments به فرمت آبجکت برای محاسبهٔ آستانهٔ ورود/خروج (سازگار با ShiftCalc سرور)
    // با اعمال تاخیر مجاز (late_ok) و تعجیل مجاز (early_ok)
    const addMin=(t,d)=>{ if(!t)return t; const[h,m]=t.split(":").map(Number); let x=h*60+m+d; x=((x%1440)+1440)%1440; return String(Math.floor(x/60)).padStart(2,"0")+":"+String(x%60).padStart(2,"0"); };
    const lo=late_ok===""?0:+late_ok, eo=early_ok===""?0:+early_ok;
    const mkSeg=(s,e)=>({ s, e,
      es: addMin(s,-eo),     // ورود از: تعجیل مجاز قبل از شروع
      ls: addMin(s, lo),     // ورود تا: تاخیر مجاز بعد از شروع
      ee: addMin(e,-eo),     // خروج از: تعجیل مجاز قبل از پایان
      le: addMin(e, lo) });  // خروج تا: تاخیر مجاز بعد از پایان
    const segs=[]; if(p1&&p1s&&p1e)segs.push(mkSeg(p1s,p1e)); if(p2&&p2s&&p2e)segs.push(mkSeg(p2s,p2e));
    onSave({jdate, day_config:cfg, segments:segs, is_off:false});
  };

  const Time=({label,value,onChange,hint})=>(<div style={{marginBottom:12}}>
    <label className="label">{label} {hint&&<span title={hint} style={{cursor:"help",color:"var(--muted)"}}>ⓘ</span>}</label>
    <input className="input" type="time" value={value} onChange={e=>onChange(e.target.value)}/>
  </div>);
  const MinF=({label,value,onChange,hint})=>(<div style={{marginBottom:12}}>
    <label className="label">{label} {hint&&<span title={hint} style={{cursor:"help",color:"var(--muted)"}}>ⓘ</span>}</label>
    <input className="input" type="number" min="0" placeholder="دقیقه" value={value} onChange={e=>onChange(e.target.value)}/>
  </div>);

  return(<div className="modal-bg" onClick={onClose}>
    <div className="modal" style={{maxWidth:560,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div className="row" style={{justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3>مشخصات شیفت ({jdate.replace(/-/g,"/")})</h3>
        <button className="btn g" onClick={onClose}>✕</button>
      </div>

      <label className="label">نوع شیفت:</label>
      <div className="row" style={{gap:16,marginBottom:14}}>
        <label className="row" style={{gap:6}}><input type="radio" checked={type==="simple"} onChange={()=>setType("simple")}/>ساده</label>
        <label className="row" style={{gap:6}}><input type="radio" checked={type==="floating"} onChange={()=>setType("floating")}/>شناور</label>
      </div>

      {type==="floating"&&<MinF label="زمان شناوری" hint="مدت زمانی که کاربر می‌تواند دیرتر از شروع شیفت بیاید" value={float_min} onChange={setFloatMin}/>}
      <MinF label="مدت زمان موظفی روزانه" hint="مجموع دقایقی که کاربر باید کار کند" value={duty_min} onChange={setDuty}/>
      <MinF label="سقف اضافه کاری روزانه" value={daily_ot} onChange={setDailyOt}/>

      <div className="row" style={{justifyContent:"space-between",alignItems:"center",margin:"14px 0 10px",borderTop:"1px solid var(--line)",paddingTop:12}}>
        <b style={{color:"var(--brand)"}}>تنظیمات پیشرفته</b>
        <button className="btn g" style={{padding:"2px 10px"}} onClick={()=>setAdv(!adv)}>{adv?"−":"+"}</button>
      </div>

      {adv&&<div>
        {type==="floating"&&<>
          <MinF label="اضافه کار از ابتدای شیفت" value={ot_begin} onChange={setOtBegin}/>
          <MinF label="اضافه کار در میانه شیفت" value={ot_middle} onChange={setOtMiddle}/>
          <MinF label="اضافه کار از انتهای شیفت" value={ot_end} onChange={setOtEnd}/>
          <MinF label="شناوری قبل شیفت" value={float_before} onChange={setFloatBefore}/>
        </>}
        <Time label="شروع بازه مجاز ثبت تردد" hint="زودترین زمانی که ثبت تردد پذیرفته می‌شود" value={traffic_start} onChange={setTrafficStart}/>
        <Time label="پایان بازه مجاز ثبت تردد" hint="دیرترین زمانی که ثبت تردد پذیرفته می‌شود" value={traffic_end} onChange={setTrafficEnd}/>
        <MinF label="تاخیر مجاز" value={late_ok} onChange={setLateOk}/>
        <MinF label="تعجیل مجاز" value={early_ok} onChange={setEarlyOk}/>

        <label className="label" style={{marginTop:10}}>شب کاری:</label>
        <label className="row" style={{gap:6,marginBottom:10}}><input type="checkbox" checked={is_night} onChange={e=>setIsNight(e.target.checked)}/>انتهای این شیفت در روز بعد است</label>
        {is_night&&<>
          <Time label="شروع شب کاری" value={night_start} onChange={setNightStart}/>
          <div style={{marginBottom:12}}><label className="label">مدت زمان شب کاری</label><input className="input" type="time" value={night_dur} onChange={e=>setNightDur(e.target.value)}/></div>
        </>}

        <div style={{borderTop:"1px solid var(--line)",margin:"14px 0",paddingTop:12}}>
          <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={p1} onChange={e=>setP1(e.target.checked)}/><b>قسمت اول روز</b></label>
          {p1&&<div className="row" style={{gap:10}}>
            <div style={{flex:1}}><label className="label">زمان شروع</label><input className="input" type="time" value={p1s} onChange={e=>setP1s(e.target.value)}/></div>
            <div style={{flex:1}}><label className="label">زمان پایان</label><input className="input" type="time" value={p1e} onChange={e=>setP1e(e.target.value)}/></div>
          </div>}
        </div>
        <div style={{borderTop:"1px solid var(--line)",paddingTop:12}}>
          <label className="row" style={{gap:8,marginBottom:10}}><input type="checkbox" checked={p2} onChange={e=>setP2(e.target.checked)}/><b>قسمت دوم روز</b></label>
          {p2&&<div className="row" style={{gap:10}}>
            <div style={{flex:1}}><label className="label">زمان شروع</label><input className="input" type="time" value={p2s} onChange={e=>setP2s(e.target.value)}/></div>
            <div style={{flex:1}}><label className="label">زمان پایان</label><input className="input" type="time" value={p2e} onChange={e=>setP2e(e.target.value)}/></div>
          </div>}
        </div>
      </div>}

      <button className="btn p" style={{width:"100%",marginTop:16}} onClick={save}>ثبت</button>
    </div>
  </div>);
}

// تقویم شمسی شیفت پیشرفته با کپی/پیست روز
function AdvancedCalendar({shift}){
  const [tj]=useState(todayJ()); const [jy,setJy]=useState(tj[0]); const [jm,setJm]=useState(tj[1]);
  const [days,setDays]=useState({}); const [sel,setSel]=useState(null); const [clip,setClip]=useState(null); const [advDay,setAdvDay]=useState(null);
  useEffect(()=>{ db.shift(shift.id).then(full=>{ const map={}; (full.days||[]).forEach(d=>{ map[d.jdate]={segments:typeof d.segments==="string"?JSON.parse(d.segments||"[]"):(d.segments||[]),is_off:!!d.is_off,day_config:typeof d.day_config==="string"?JSON.parse(d.day_config||"null"):(d.day_config||null)}; }); setDays(map); }).catch(()=>{}); },[shift.id]);
  const dim=(jm<=6)?31:(jm<=11?30:29);
  const jd2=(d)=>`${jy}-${String(jm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const setDay=(key,val)=>setDays(p=>({...p,[key]:val}));
  const saveAll=async()=>{ const arr=Object.entries(days).map(([jdate,v])=>({jdate,segments:v.segments||[],is_off:v.is_off?1:0,day_config:v.day_config||null})); await db.saveShiftDays(shift.id,arr); alert("تقویم شیفت ذخیره شد."); };
  // تکرار الگوی روزهای هفته‌ی ماه جاری روی کل سال جاری: برای هر روز هفته، اولین روزِ تنظیم‌شده در ماه را الگو می‌گیرد
  const repeatPattern=()=>{
    if(!confirm("الگوی روزهای این ماه بر اساس روزِ هفته، روی تمام ماه‌های سال "+fa(jy)+" اعمال شود؟ (روزهای تنظیم‌نشده تغییری نمی‌کنند)")) return;
    // برای هر روزِ هفته (۰..۶) یک الگو از ماه جاری انتخاب کن
    const wkPattern={};
    for(let d=1; d<=dim; d++){ const key=jd2(d); const v=days[key]; if(!v) continue; const wd=gregToJalaliWeekday(jy,jm,d); if(wkPattern[wd]===undefined) wkPattern[wd]=v; }
    const next={...days};
    for(let m=1;m<=12;m++){ const dm=(m<=6)?31:(m<=11?30:(((jy%33)%4===1)?30:29));
      for(let d=1; d<=dm; d++){ const wd=gregToJalaliWeekday(jy,m,d); const pat=wkPattern[wd]; if(pat===undefined) continue;
        const key=`${jy}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        next[key]=JSON.parse(JSON.stringify(pat)); } }
    setDays(next); alert("الگو روی کل سال اعمال شد. برای ذخیره، «ذخیرهٔ تقویم» را بزنید.");
  };
  // کپی کل تقویم سال جاری به سال بعد
  const copyNextYear=async()=>{
    if(!confirm("کل تقویم سال "+fa(jy)+" به سال "+fa(jy+1)+" کپی شود؟")) return;
    const next={...days};
    Object.entries(days).forEach(([key,v])=>{ const [y,m,d]=key.split("-"); if(+y===jy){ next[`${jy+1}-${m}-${d}`]=JSON.parse(JSON.stringify(v)); } });
    setDays(next); alert("تقویم به سال بعد کپی شد. برای ذخیره، «ذخیرهٔ تقویم» را بزنید.");
  };
  const firstWd=gregToJalaliWeekday(jy,jm,1);
  return(<div>
    <div className="row" style={{gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
      <button className="btn g" onClick={()=>{ if(jm===1){setJy(jy-1);setJm(12);}else setJm(jm-1); }}>‹ ماه قبل</button>
      <b>{J_MONTHS[jm-1]} {fa(jy)}</b>
      <button className="btn g" onClick={()=>{ if(jm===12){setJy(jy+1);setJm(1);}else setJm(jm+1); }}>ماه بعد ›</button>
      <button className="btn g" onClick={repeatPattern}>⟳ تکرار الگو روی کل سال</button>
      <button className="btn g" onClick={copyNextYear}>⊕ کپی به سال بعد</button>
      <button className="btn p" style={{marginInlineStart:"auto"}} onClick={saveAll}>ذخیرهٔ تقویم</button>
    </div>
    <div className="cal-grid">
      {WD.map(w=><div key={w} className="cal-h">{w}</div>)}
      {Array.from({length:firstWd}).map((_,i)=><div key={"e"+i}/>)}
      {Array.from({length:dim}).map((_,i)=>{ const d=i+1; const key=jd2(d); const v=days[key]; const has=v&&!v.is_off&&(v.segments||[]).length; const off=v&&v.is_off;
        return(<div key={key} className={"cal-d"+(sel===key?" sel":"")+(has?" has":"")+(off?" off":"")} onClick={()=>setSel(key)}>
          <span className="cal-n">{fa(d)}</span>
          {has?<span className="cal-tag">{fa((v.segments||[]).length)} قطعه</span>:off?<span className="cal-tag">تعطیل</span>:null}
        </div>); })}
    </div>
    {sel&&<DayEditor jdate={sel} val={days[sel]||{segments:[],is_off:false}} onChange={v=>setDay(sel,v)}
      onCopy={()=>{ setClip(JSON.stringify(days[sel]||{segments:[],is_off:false})); alert("روز کپی شد."); }}
      onPaste={()=>{ if(!clip)return alert("ابتدا یک روز را کپی کنید"); setDay(sel,JSON.parse(clip)); }}
      onAdvanced={()=>setAdvDay(sel)}/>}
    {advDay&&<ShiftDayModal jdate={advDay} day={days[advDay]} onClose={()=>setAdvDay(null)}
      onSave={(v)=>{ setDay(advDay,{segments:v.segments||[],is_off:!!v.is_off,day_config:v.day_config}); setAdvDay(null); }}/>}
  </div>);
}
function DayEditor({jdate,val,onChange,onCopy,onPaste,onAdvanced}){
  const segs=val.segments||[];
  const upd=(i,k,v)=>{ const c=[...segs]; c[i]={...c[i],[k]:v}; onChange({...val,segments:c,is_off:false}); };
  const add=()=>{ if(segs.length>=2)return alert("حداکثر دو قطعه"); onChange({...val,is_off:false,segments:[...segs,emptySeg()]}); };
  const del=(i)=>onChange({...val,segments:segs.filter((_,j)=>j!==i)});
  return(<div className="card-p" style={{marginTop:12}}>
    <div className="row" style={{justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}>
      <b>{jLabel(isoFromJ(...jdate.split("-")))||jdate}</b>
      <span className="row" style={{gap:6}}>
        {onAdvanced&&<button className="btn p" style={{fontSize:11,padding:"2px 10px"}} onClick={onAdvanced}>⚙ ویرایش پیشرفته</button>}
        <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={onCopy}>کپی روز</button>
        <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={onPaste}>پیست روز</button>
        <label className="row" style={{gap:4,fontSize:12}}><input type="checkbox" checked={!!val.is_off} onChange={e=>onChange({...val,is_off:e.target.checked,segments:e.target.checked?[]:segs})}/>تعطیل</label>
        <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={add}>+ قطعه</button>
      </span>
    </div>
    {val.day_config&&<p style={{fontSize:11.5,color:"var(--brand)",marginBottom:6}}>✓ تنظیمات پیشرفته ثبت شده ({val.day_config.type==="floating"?"شناور":"ساده"})</p>}
    {val.is_off?<span className="muted">این روز تعطیل است.</span>:
      segs.length===0?<span className="muted" style={{fontSize:12}}>بدون شیفت</span>:
      segs.map((seg,i)=><div key={i} className="seg-row">
        <span className="seg-lbl">قطعه {fa(i+1)}</span>
        <TimeField label="شروع" v={seg.s} on={x=>upd(i,"s",x)}/>
        <TimeField label="پایان" v={seg.e} on={x=>upd(i,"e",x)}/>
        <TimeField label="ورود از" v={seg.es} on={x=>upd(i,"es",x)}/>
        <TimeField label="ورود تا" v={seg.ls} on={x=>upd(i,"ls",x)}/>
        <TimeField label="خروج از" v={seg.ee} on={x=>upd(i,"ee",x)}/>
        <TimeField label="خروج تا" v={seg.le} on={x=>upd(i,"le",x)}/>
        <button className="btn g" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>del(i)}>×</button>
      </div>)}
  </div>);
}
// روز هفتهٔ اولِ ماه شمسی (0=شنبه)
function gregToJalaliWeekday(jy,jm,jd){ const [gy,gm,gd]=jalaliToGreg(jy,jm,jd); const w=new Date(gy,gm-1,gd).getDay(); return ({6:0,0:1,1:2,2:3,3:4,4:5,5:6})[w]; }

// تخصیص شیفت به نیروها
function ShiftAssign(){
  const [users,setUsers]=useState([]); const [shifts,setShifts]=useState([]); const [assigns,setAssigns]=useState([]); const [q,setQ]=useState("");
  const load=()=>db.userShifts().then(a=>setAssigns(a||[])).catch(()=>{});
  useEffect(()=>{ db.usersLite().then(u=>setUsers(u||[])).catch(()=>{}); db.shifts().then(s=>setShifts(s||[])).catch(()=>{}); load(); },[]);
  const cur=(uid)=>assigns.find(a=>a.user_id===uid);
  const setShift=async(uid,sid)=>{ if(!sid){ await db.delUserShift(uid); } else { await db.setUserShift({user_id:uid,shift_id:+sid}); } load(); };
  const filtered=q.trim()?users.filter(u=>((u.first_name||"")+" "+(u.last_name||"")).includes(q.trim())):users;
  return(<div>
    <input className="input" style={{maxWidth:240,marginBottom:10}} placeholder="جستجوی نیرو…" value={q} onChange={e=>setQ(e.target.value)}/>
    <table><thead><tr><th>نیرو</th><th>شیفت تخصیص‌یافته</th></tr></thead><tbody>
      {filtered.map(u=>{ const c=cur(u.id); return(<tr key={u.id}>
        <td>{u.first_name} {u.last_name}</td>
        <td><select className="input" style={{maxWidth:240}} value={c?c.shift_id:""} onChange={e=>setShift(u.id,e.target.value)}>
          <option value="">— بدون شیفت —</option>
          {shifts.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
        </select></td>
      </tr>); })}
    </tbody></table>
  </div>);
}

// تعطیلات رسمی
function Holidays(){
  const tj=todayJ();
  const [list,setList]=useState([]); const [d,setD]=useState(""); const [title,setTitle]=useState("");
  const [fy,setFy]=useState(tj[0]); const [fm,setFm]=useState(tj[1]); const [busy,setBusy]=useState(false);
  const load=()=>db.holidays().then(h=>setList(h||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const add=async()=>{ if(!d)return alert("تاریخ را انتخاب کنید"); const [y,m,dd]=d.split("-").map(Number); const [jy,jm,jd]=gregToJalali(y,m,dd); await db.addHolidays([{jdate:`${jy}-${String(jm).padStart(2,"0")}-${String(jd).padStart(2,"0")}`,title}]); setD("");setTitle(""); load(); };
  const del=async(j)=>{ if(!confirm("حذف؟"))return; await db.delHoliday(j); load(); };
  const fetchMonth=async()=>{ setBusy(true); try{ const r=await db.fetchHolidays(fy,fm); alert(`فراخوان انجام شد: ${fa(r.added||0)} تعطیلی برای ${J_MONTHS[fm-1]} ${fa(fy)} ثبت شد.`); load(); }catch(e){ alert(e.message||"خطا در فراخوان"); } setBusy(false); };
  const fetchYear=async()=>{ if(!confirm("فراخوان تعطیلات کل سال "+fa(fy)+"؟ (ممکن است کمی طول بکشد)"))return; setBusy(true); let total=0; try{ for(let m=1;m<=12;m++){ const r=await db.fetchHolidays(fy,m); total+=(r.added||0); } alert(`فراخوان سال انجام شد: ${fa(total)} تعطیلی ثبت شد.`); load(); }catch(e){ alert("توقف در فراخوان: "+(e.message||"خطا")); load(); } setBusy(false); };
  return(<div>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>روزهای تعطیل رسمی برای محاسبهٔ «تعطیل‌کاری» استفاده می‌شوند (جمعه‌ها خودکار جمعه‌کاری حساب می‌شوند).</p>
    <div className="card-p" style={{marginBottom:12}}>
      <b>درج تعطیلات رسمی سال ۱۴۰۴</b>
      <p style={{fontSize:12,color:"var(--muted)",margin:"6px 0"}}>فهرست کامل و واقعی تعطیلات رسمی سال ۱۴۰۴ (نوروز، اعیاد، مناسبت‌های مذهبی و ملی) به‌صورت یکجا درج می‌شود. سرویس holidayapi.ir دیگر در دسترس نیست؛ این فهرست از تقویم رسمی کشور تهیه شده است.</p>
      <button className="btn p" disabled={busy} onClick={async()=>{ setBusy(true); try{ const r=await db.seedHolidays1404(); alert(`درج شد: ${fa(r.count||0)} روز تعطیل رسمی ۱۴۰۴ ثبت/به‌روزرسانی شد.`); load(); }catch(e){ alert(e.message||"خطا"); } setBusy(false); }}>{busy?"…":"درج تعطیلات رسمی ۱۴۰۴"}</button>
      <button className="btn g" disabled={busy} onClick={async()=>{ setBusy(true); try{ const r=await db.seedHolidays1405(); alert(`درج شد: ${fa(r.count||0)} روز تعطیل رسمی ۱۴۰۵ ثبت/به‌روزرسانی شد.`); load(); }catch(e){ alert(e.message||"خطا"); } setBusy(false); }}>{busy?"…":"درج تعطیلات رسمی ۱۴۰۵ (سال جاری)"}</button>
    </div>
    <div className="row" style={{gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><label className="label">افزودن دستی تعطیلی</label><JDate value={d} onChange={setD}/></div>
      <input className="input" style={{maxWidth:200}} placeholder="عنوان (اختیاری)" value={title} onChange={e=>setTitle(e.target.value)}/>
      <button className="btn p" onClick={add}>افزودن</button>
    </div>
    {list.length===0?<p className="muted">تعطیلی ثبت نشده.</p>:
    <div className="chiprow">{list.map(h=><span key={h.jdate} className="chip">{h.jdate}{h.title?` — ${h.title}`:""} <b style={{cursor:"pointer"}} onClick={()=>del(h.jdate)}>×</b></span>)}</div>}
  </div>);
}

// گزارش کارکرد ماهانه
// گزارش تردد پرسنل (مدل فینتو) — سطر روزانه + پاپ‌آپ لیست ورود/خروج + ویرایش ساعت توسط ادمین
function AttendanceReport(){
  const [users,setUsers]=useState([]);
  const [uid,setUid]=useState("");
  const [personQuery,setPersonQuery]=useState("");
  const [from,setFrom]=useState(todayJStr());
  const [to,setTo]=useState(todayJStr());
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [openDay,setOpenDay]=useState(null); // jdate پاپ‌آپ باز
  const [edit,setEdit]=useState(null); // {punch, field} در حال ویرایش
  const [addModal,setAddModal]=useState(null); // {jdate}
  useEffect(()=>{ db.users().then(us=>setUsers(us||[])).catch(()=>{}); },[]);
  const visibleUsers=users.filter(u=>{const q=String(personQuery||"").trim().toLowerCase();return !q||String((u.first_name||"")+" "+(u.last_name||"")).toLowerCase().includes(q)||String(u.username||"").includes(q);});
  const run=async()=>{ if(!uid){alert("پرسنل را انتخاب کنید");return;} setBusy(true); setData(null); setOpenDay(null);
    try{ const r=await db.attendanceReport(uid,from,to); setData(r); }
    catch(e){ alert(e.message||"خطا در دریافت گزارش"); }
    finally{ setBusy(false); } };
  const refresh=async()=>{ try{ const r=await db.attendanceReport(uid,from,to); setData(r); }catch(e){} };
  const savePunch=async(punch,ci,co)=>{ try{ await db.attendancePunchEdit(punch.id,{check_in:ci,check_out:co}); setEdit(null); await refresh(); }catch(e){alert(e.message||"خطا");} };
  const delPunch=async(punch)=>{ if(!confirm("این تردد حذف شود؟"))return; try{ await db.attendancePunchDelete(punch.id); await refresh(); }catch(e){alert(e.message||"خطا");} };
  const addPunch=async(jdate,ci,co)=>{ try{ await db.attendancePunchAdd({user_id:+uid,jdate,check_in:ci,check_out:co||null}); setAddModal(null); await refresh(); }catch(e){alert(e.message||"خطا");} };
  const hmToMin=(v)=>{ const m=String(v||"00:00").match(/(\d+):(\d+)/); return m?(+m[1])*60+(+m[2]):0; };
  const convertSurplus=async(d)=>{ const surplus=hmToMin(d.surplus); if(!surplus){alert("مازاد حضوری برای تبدیل وجود ندارد");return;} const val=prompt("چند دقیقه از مازاد حضور به اضافه‌کار تبدیل شود؟", String(surplus)); if(val===null)return; const minutes=Math.max(0,Math.min(surplus,parseInt(String(val).replace(/\D/g,""),10)||0)); const reason=prompt("علت/توضیح تأیید مازاد حضور:", "تأیید مدیر"); try{ await db.attendanceSurplusConvert({user_id:+uid,jdate:d.jdate,minutes,reason:reason||""}); await refresh(); }catch(e){alert(e.message||"خطا در تبدیل مازاد حضور");} };
  const resetSurplus=async(d)=>{ if(!confirm("تبدیل مازاد حضور این روز حذف شود؟"))return; try{ await db.attendanceSurplusReset({user_id:+uid,jdate:d.jdate}); await refresh(); }catch(e){alert(e.message||"خطا");} };
  const exportExcel=()=>{ if(!data)return;
    const rows=[]; data.days.forEach(d=>{ if(!d.punches.length){ rows.push({"تاریخ":d.jdate,"روز هفته":d.weekday,"ورود":"--:--","خروج":"--:--","محل ورود":"--","محل خروج":"--","حضور کل":d.worked,"حضور در شیفت":d.in_shift,"کسری کار":d.shortage,"شب کاری":d.night,"جمعه کاری":d.friday_work||d.friday||"00:00","تعطیل کاری":d.holiday_work||d.holiday||"00:00","اضافه کاری":d.overtime,"مازاد حضور":d.surplus||"00:00","تبدیل‌شده":d.adjusted_ot||"00:00","وضعیت":d.is_holiday?"تعطیل":(d.absent?"غیبت":"")}); }
      else d.punches.forEach((p,i)=>rows.push({"تاریخ":i===0?d.jdate:"","روز هفته":i===0?d.weekday:"","ورود":p.in||"--:--","خروج":p.out||"--:--","محل ورود":p.in_station||"--","محل خروج":p.out_station||"--","حضور کل":i===0?d.worked:"","حضور در شیفت":i===0?d.in_shift:"","کسری کار":i===0?d.shortage:"","شب کاری":i===0?d.night:"","جمعه کاری":i===0?(d.friday||"00:00"):"","تعطیل کاری":i===0?(d.holiday||"00:00"):"","اضافه کاری":i===0?d.overtime:"","مازاد حضور":i===0?(d.surplus||"00:00"):"","تبدیل‌شده":i===0?(d.adjusted_ot||"00:00"):"","وضعیت":i===0&&d.is_holiday?"تعطیل":""})); });
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,(data.user.name||"تردد").slice(0,28)); XLSX.writeFile(wb,"گزارش_تردد_"+(data.user.name||"")+".xlsx"); };

  return(<div className="panel"><h3>🕒 گزارش تردد پرسنل</h3>
    <div className="card-p" style={{marginBottom:14}}>
      <div className="row" style={{gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{minWidth:260}}><label className="label">پرسنل</label>
          <input className="input" value={personQuery} onChange={e=>setPersonQuery(e.target.value)} placeholder="جستجوی نام، نام خانوادگی یا کد ملی" style={{marginBottom:6}}/>
          <select className="input" value={uid} onChange={e=>setUid(e.target.value)}>
            <option value="">انتخاب پرسنل…</option>
            {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
          </select></div>
        <div><label className="label">از تاریخ</label><JDate value={from} onChange={setFrom} jalali/></div>
        <div><label className="label">تا تاریخ</label><JDate value={to} onChange={setTo} jalali/></div>
        <button className="btn p" onClick={run} disabled={busy}>{busy?"…":"🔍 مشاهده گزارش"}</button>
        <button className="btn g" onClick={exportExcel} disabled={!data}>⤓ دانلود گزارش</button>
      </div>
    </div>

    {data&&<div className="card-p" style={{marginBottom:10,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <b>{data.user.name}</b>
      <span style={{color:"var(--muted)",fontSize:12}}>کد پرسنلی: {fa(data.user.pcode)} | از {fa(data.from)} تا {fa(data.to)}</span>
    </div>}

    {data&&<div style={{overflowX:"auto"}}>
      <table style={{fontSize:12.5,minWidth:640}}>
        <thead><tr><th>تاریخ</th><th>روز هفته</th><th>خلاصه تردد</th><th>حضور کل</th><th>حضور در شیفت</th><th>کسری کار</th><th>شب کاری</th><th>جمعه/تعطیل</th><th>اضافه کاری</th><th>مازاد حضور</th><th>اقدام</th></tr></thead>
        <tbody>{data.days.map(d=>{
          const red=!!d.is_holiday || !!d.is_friday || d.weekday==="جمعه";
          return(<tr key={d.jdate}>
            <td style={{color:red?"var(--danger)":"inherit",fontWeight:red?700:400}}>{fa(d.jdate)}{red&&<div style={{fontSize:10}}>تعطیل</div>}</td>
            <td style={{color:red?"var(--danger)":"inherit"}}>{d.weekday}</td>
            <td style={{textAlign:"center",position:"relative"}}>
              <button onClick={()=>setOpenDay(openDay===d.jdate?null:d.jdate)} title="لیست ورود و خروج" aria-label="لیست ورود و خروج" data-attendance-clock="1"
                style={{border:"none",background:"none",cursor:"pointer",color:d.punches.length?"#b83b8c":"#888",fontSize:18}}>🕐</button>
              {openDay===d.jdate&&<PunchPopup day={d} onClose={()=>setOpenDay(null)} onEdit={setEdit} onDel={delPunch} onAdd={()=>setAddModal({jdate:d.jdate})}/>}
            </td>
            <td>{fa(d.worked||"00:00")}</td>
            <td>{fa(d.in_shift)}</td>
            <td style={{color:d.shortage!=="00:00"?"var(--danger)":"inherit"}}>{fa(d.shortage)}</td>
            <td>{fa(d.night)}</td>
            <td><div>{fa(d.friday_work||d.friday||"00:00")} جمعه</div><div>{fa(d.holiday_work||d.holiday||"00:00")} تعطیل</div></td>
            <td style={{color:"var(--ok)"}}>{fa(d.overtime)}</td>
            <td style={{color:(d.surplus&&d.surplus!=="00:00")?"var(--danger)":"inherit"}}>{fa(d.surplus||"00:00")}{d.adjusted_ot&&d.adjusted_ot!=="00:00"?<div style={{fontSize:10,color:"var(--ok)"}}>تبدیل‌شده: {fa(d.adjusted_ot)}</div>:null}</td>
            <td>{d.surplus&&d.surplus!=="00:00"?<button className="btn p" style={{padding:"5px 8px",fontSize:11}} onClick={()=>convertSurplus(d)}>تبدیل</button>:d.adjusted_ot&&d.adjusted_ot!=="00:00"?<button className="btn g" style={{padding:"5px 8px",fontSize:11}} onClick={()=>resetSurplus(d)}>لغو</button>:"—"}</td>
          </tr>);
        })}</tbody>
      </table>
    </div>}

    {edit&&<PunchEditModal punch={edit} onSave={savePunch} onClose={()=>setEdit(null)}/>}
    {addModal&&<PunchAddModal jdate={addModal.jdate} onSave={addPunch} onClose={()=>setAddModal(null)}/>}
  </div>);
}

// پاپ‌آپ لیست ورود و خروج یک روز
function PunchPopup({day,onClose,onEdit,onDel,onAdd}){
  return(<div style={{position:"absolute",top:"100%",right:0,zIndex:50,background:"#1f2330",border:"1px solid #3a3f4f",borderRadius:10,padding:12,minWidth:320,boxShadow:"0 8px 24px rgba(0,0,0,.4)",textAlign:"right"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
      <b style={{color:"#fff"}}>لیست ورود و خروج</b>
      <span style={{color:"#9aa",fontSize:11}}>{fa(day.jdate)}</span>
    </div>
    {day.punches.length===0?<p style={{color:"#9aa",fontSize:12,padding:"8px 0"}}>ترددی ثبت نشده است.</p>:
    <table style={{width:"100%",fontSize:12}}><thead><tr style={{color:"#9aa"}}><th>خروج</th><th>ورود</th><th></th></tr></thead>
      <tbody>{day.punches.map(p=><React.Fragment key={p.id}>
        <tr>
          <td style={{padding:"4px 6px"}}>
            <span style={{color:"#6cf",cursor:"pointer",marginInlineEnd:4}} onClick={()=>onEdit({...p,field:"out"})}>✎</span>
            <span style={{color:"#f66",cursor:"pointer",marginInlineEnd:6}} onClick={()=>onDel(p)}>🗑</span>
            {fa(p.out||"--:--")}
          </td>
          <td style={{padding:"4px 6px"}}>{fa(p.in||"--:--")}
            <span style={{color:"#6cf",cursor:"pointer",marginInlineStart:4}} onClick={()=>onEdit({...p,field:"in"})}>✎</span>
            <span style={{color:"#f66",cursor:"pointer",marginInlineStart:4}} onClick={()=>onDel(p)}>🗑</span>
          </td>
          <td>{(p.method)&&<span title={p.method} style={{color:"#69f",fontSize:14}}>ⓘ</span>}</td>
        </tr>
        {(p.in_station||p.device)&&<tr><td colSpan={3} style={{fontSize:10.5,color:"#9aa",padding:"0 6px 6px",lineHeight:1.7}}>
          {p.device&&<div>دستگاه ورود: {p.device}</div>}
          {p.in_station&&<div>محل ورود: {p.in_station}{(p.in_lat)&&<a href={"https://maps.google.com/?q="+p.in_lat+","+p.in_lng} target="_blank" style={{color:"#6cf",marginInlineStart:4}}>(مشاهده روی نقشه)</a>}</div>}
          {p.out_station&&<div>محل خروج: {p.out_station}{(p.out_lat)&&<a href={"https://maps.google.com/?q="+p.out_lat+","+p.out_lng} target="_blank" style={{color:"#6cf",marginInlineStart:4}}>(مشاهده روی نقشه)</a>}</div>}
        </td></tr>}
      </React.Fragment>)}</tbody>
    </table>}
    <button className="btn g" style={{width:"100%",marginTop:8,fontSize:12}} onClick={onAdd}>+ درخواست تردد دستی</button>
    <button onClick={onClose} style={{position:"absolute",top:6,left:8,border:"none",background:"none",color:"#9aa",cursor:"pointer",fontSize:16}}>×</button>
  </div>);
}

// مودال ویرایش ساعت یک پانچ (ادمین)
function PunchEditModal({punch,onSave,onClose}){
  const [ci,setCi]=useState(punch.in||"");
  const [co,setCo]=useState(punch.out||"");
  return(<div className="modal-bg" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:340}}>
    <h4>ویرایش ساعت تردد</h4>
    <label className="label">ساعت ورود (HH:MM)</label>
    <input className="input" value={ci} onChange={e=>setCi(e.target.value)} placeholder="مثلاً 08:55" style={{direction:"ltr",textAlign:"left"}}/>
    <label className="label">ساعت خروج (HH:MM)</label>
    <input className="input" value={co} onChange={e=>setCo(e.target.value)} placeholder="مثلاً 13:00 یا خالی" style={{direction:"ltr",textAlign:"left"}}/>
    <p style={{fontSize:11,color:"var(--muted)",marginTop:6}}>اگر خروج کوچک‌تر از ورود باشد، به روز بعد منتقل می‌شود (شیفت شب).</p>
    <div className="row" style={{gap:8,marginTop:12,justifyContent:"flex-end"}}>
      <button className="btn g" onClick={onClose}>انصراف</button>
      <button className="btn p" onClick={()=>onSave(punch,ci,co)}>ذخیره</button>
    </div>
  </div></div>);
}

// مودال افزودن تردد دستی (ادمین)
function PunchAddModal({jdate,onSave,onClose}){
  const [ci,setCi]=useState(""); const [co,setCo]=useState("");
  return(<div className="modal-bg" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:340}}>
    <h4>درخواست تردد دستی — {fa(jdate)}</h4>
    <label className="label">ساعت ورود (HH:MM)</label>
    <input className="input" value={ci} onChange={e=>setCi(e.target.value)} placeholder="مثلاً 08:55" style={{direction:"ltr",textAlign:"left"}}/>
    <label className="label">ساعت خروج (HH:MM) — اختیاری</label>
    <input className="input" value={co} onChange={e=>setCo(e.target.value)} placeholder="مثلاً 13:00" style={{direction:"ltr",textAlign:"left"}}/>
    <div className="row" style={{gap:8,marginTop:12,justifyContent:"flex-end"}}>
      <button className="btn g" onClick={onClose}>انصراف</button>
      <button className="btn p" onClick={()=>{ if(!ci){alert("ساعت ورود الزامی است");return;} onSave(jdate,ci,co); }}>ثبت</button>
    </div>
  </div></div>);
}

function ShiftReport(){
  const tj=todayJ();
  const [jy,setJy]=useState(tj[0]); const [jm,setJm]=useState(tj[1]); const [rows,setRows]=useState(null); const [busy,setBusy]=useState(false);
  const hm=(m)=>`${fa(Math.floor((m||0)/60))}:${String((m||0)%60).padStart(2,"0")}`;
  const run=async()=>{ setBusy(true); try{ const r=await db.shiftReport(jy,jm); setRows(r.rows||[]); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  const exportExcel=async()=>{ try{ const res=await fetch(`${API_BASE}/admin/shift-report/export?year=${jy}&month=${jm}`,{headers:tok()}); if(!res.ok)throw new Error("خطا"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`کارکرد_${jy}_${jm}.csv`; a.click(); }catch(e){ alert(e.message); } };
  return(<div>
    <div className="row" style={{gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><label className="label">سال</label><input className="input" type="number" style={{maxWidth:100}} value={jy} onChange={e=>setJy(+e.target.value||tj[0])}/></div>
      <div><label className="label">ماه</label><select className="input" style={{maxWidth:130}} value={jm} onChange={e=>setJm(+e.target.value)}>{J_MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
      <button className="btn p" disabled={busy} onClick={run}>{busy?"…":"محاسبه"}</button>
      {rows&&rows.length>0&&<button className="btn g" onClick={exportExcel}>⤓ خروجی اکسل</button>}
      <span className="muted" style={{fontSize:12}}>شیفت شب، اسفند کبیسه، بازه تخصیص، تاخیر و تعجیل خروج در محاسبه لحاظ می‌شود.</span>
    </div>
    {rows&&(rows.length===0?<p className="muted">داده‌ای برای این ماه نیست (نیرویی شیفت ندارد یا ترددی ثبت نشده).</p>:
    <div style={{overflowX:"auto"}}><table style={{fontSize:12,minWidth:1280}}><thead><tr><th>نام و نام خانوادگی</th><th>موظفی</th><th>حضور کل</th><th>حضور در شیفت</th><th>تاخیر ورود</th><th>تعجیل خروج</th><th>کسری کار</th><th>غیبت</th><th>جمع غیبت و کسری</th><th>شب کاری</th><th>اضافه کاری</th><th>ماموریت</th><th>م.استحقاقی</th><th>م.استعلاجی</th></tr></thead><tbody>
      {rows.map((r,i)=>{ const gh=(r.absent_min||0)+(r.shortage||0); return(<tr key={i}><td style={{fontWeight:700}}>{r.name}</td><td>{hm(r.expected)}</td><td>{hm(r.worked)}</td><td>{hm(r.in_shift||r.worked)}</td><td style={{color:r.late_in?"var(--danger)":"inherit"}}>{hm(r.late_in||0)}</td><td style={{color:r.early_out?"var(--danger)":"inherit"}}>{hm(r.early_out||0)}</td><td style={{color:r.shortage?"var(--danger)":"inherit"}}>{hm(r.shortage)}</td><td style={{color:r.absent_min?"var(--danger)":"inherit"}}>{hm(r.absent_min||0)}</td><td>{hm(gh)}</td><td>{hm(r.night)}</td><td style={{color:"var(--ok)"}}>{hm(r.overtime)}</td><td>{hm(r.mission_min||0)}</td><td>{hm(r.annual_min||0)}</td><td>{hm(r.sick_min||0)}</td></tr>); })}
    </tbody></table></div>)}
  </div>);
}

// تنظیم پایهٔ حقوق و مشاهدهٔ فیش حقوقی یک کاربر
function PayrollEditor({userId,userName}){
  const tj=todayJ();
  const [open,setOpen]=useState(false); const [base,setBase]=useState(null);
  const [jy,setJy]=useState(tj[0]); const [jm,setJm]=useState(tj[1]); const [slip,setSlip]=useState(null);
  const [company,setCompany]=useState({});
  const load=()=>{ setOpen(true); db.userPayroll(userId).then(setBase).catch(()=>setBase({})); db.settings().then(s=>setCompany(s||{})).catch(()=>{}); };
  const set=(k,val)=>setBase(b=>({...b,[k]:val}));
  const saveBase=async()=>{ await db.saveUserPayroll(userId,base); alert("پایهٔ حقوق ذخیره شد."); };
  const calc=async()=>{ const s=await db.userPayslip(userId,jy,jm); setSlip(s); };
  const money=(n)=>fa(Number(n||0).toLocaleString("en-US"));
  if(!userId) return null;
  const F=(k,l)=><div style={{minWidth:130}}><label className="label">{l}</label><input className="input" type="number" style={{maxWidth:150}} value={base?.[k]??""} onChange={e=>set(k,e.target.value)}/></div>;
  const printSlip=()=>{
    if(!slip) return;
    const comp=company.company_name||company.org_name||"شرکت";
    const addr=company.company_address||""; const phone=company.company_phone||"";
    const rows=(obj,cls)=>Object.entries(obj).filter(([,v])=>v).map(([k,v])=>`<tr><td>${k}</td><td class="${cls}">${Number(v).toLocaleString("en-US")}</td></tr>`).join("");
    const html=`<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>فیش حقوقی</title>
<style>
@import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
*{font-family:Vazirmatn,Tahoma,sans-serif;box-sizing:border-box}
body{margin:0;padding:24px;color:#1a2b3c;background:#fff}
.sheet{max-width:760px;margin:0 auto;border:2px solid #0d7a5f;border-radius:14px;overflow:hidden}
.head{background:#0d7a5f;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.head h1{margin:0;font-size:20px}
.head .c{font-size:13px;opacity:.95;text-align:left}
.title{text-align:center;font-size:17px;font-weight:700;padding:14px;background:#e7f3ee;color:#0d7a5f}
.meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:14px 22px;font-size:13px;border-bottom:1px dashed #cbd5e1}
.meta b{color:#0d7a5f}
.cols{display:flex;gap:0;flex-wrap:wrap}
.col{flex:1;min-width:280px;padding:14px 22px}
.col h3{margin:0 0 8px;font-size:14px;border-bottom:2px solid #0d7a5f;padding-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:13px}
td{padding:7px 4px;border-bottom:1px solid #eef1f4}
.earn{color:#0d7a5f;text-align:left;font-variant-numeric:tabular-nums}
.ded{color:#d63b54;text-align:left;font-variant-numeric:tabular-nums}
.sum td{font-weight:700;border-top:2px solid #0d7a5f}
.net{background:#0d7a5f;color:#fff;text-align:center;padding:16px;font-size:18px;font-weight:700}
.foot{padding:12px 22px;font-size:11px;color:#64748b;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
.work{padding:10px 22px;font-size:12px;color:#475569;background:#f8fafc;display:flex;gap:18px;flex-wrap:wrap}
@media print{body{padding:0}.sheet{border:none}}
</style></head><body>
<div class="sheet">
  <div class="head"><h1>${comp}</h1><div class="c">${addr?addr+"<br>":""}${phone?"تلفن: "+phone:""}</div></div>
  <div class="title">فیش حقوقی ${J_MONTHS[jm-1]} ${jy}</div>
  <div class="meta"><span>نام و نام خانوادگی: <b>${userName||"-"}</b></span><span>ماه: <b>${J_MONTHS[jm-1]} ${jy}</b></span><span>نرخ هر ساعت: <b>${Number(slip.hour_rate||0).toLocaleString("en-US")}</b> ریال</span></div>
  <div class="work"><span>کارکرد: ${slip.worked_h} ساعت</span><span>اضافه‌کار: ${slip.ot_h} ساعت</span><span>شب‌کاری: ${slip.night_h} ساعت</span><span>جمعه‌کاری: ${slip.friday_h} ساعت</span><span>تعطیل‌کاری: ${slip.holiday_h} ساعت</span></div>
  <div class="cols">
    <div class="col"><h3>دریافتی‌ها</h3><table>${rows(slip.earnings,"earn")}<tr class="sum"><td>جمع دریافتی</td><td class="earn">${Number(slip.gross).toLocaleString("en-US")}</td></tr></table></div>
    <div class="col"><h3>کسورات</h3><table>${rows(slip.deductions,"ded")}<tr class="sum"><td>جمع کسورات</td><td class="ded">${Number(slip.total_deduct).toLocaleString("en-US")}</td></tr></table></div>
  </div>
  <div class="net">خالص پرداختی: ${Number(slip.net).toLocaleString("en-US")} ریال</div>
  <div class="foot"><span>این فیش به‌صورت سیستمی صادر شده است.</span><span>تاریخ صدور: ${tj[0]}/${String(tj[1]).padStart(2,"0")}/${String(tj[2]).padStart(2,"0")}</span></div>
</div>
<`+`script>window.onload=function(){setTimeout(function(){window.print();},600);}<`+`/script>

<!-- SalarySlipAdminModule: ماژول فیش حقوقی PDF
مسیرهای API افزوده‌شده:
GET  /api/admin/salary-slips/users?q=
GET  /api/admin/users/{id}/salary-slips
POST /api/admin/users/{id}/salary-slips  multipart: period_jy, period_jm, title, file
DELETE /api/admin/salary-slips/{id}
-->
</body></html>`;
    const w=window.open("","_blank");
    if(!w){ alert("پنجرهٔ چاپ مسدود شد. لطفاً اجازهٔ باز شدن پنجره را بدهید."); return; }
    w.document.write(html); w.document.close();
  };
  return(<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line)"}}>
    {!open?<button className="btn g" type="button" onClick={load}>حقوق و دستمزد و فیش حقوقی</button>:
    <div>
      <b style={{fontSize:13}}>پایهٔ حقوق (ریال):</b>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:8}}>
        {F("base_monthly","حقوق پایهٔ ماهانه")}{F("housing","حق مسکن")}{F("family","حق خانوار")}{F("food","بن/خواربار")}{F("other_allow","سایر مزایا")}
      </div>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:8}}>
        {F("insurance_pct","درصد بیمه")}{F("tax_pct","درصد مالیات")}{F("other_deduct","سایر کسورات")}
      </div>
      <button className="btn p" style={{marginTop:10}} onClick={saveBase}>ذخیرهٔ پایهٔ حقوق</button>
      <div style={{marginTop:14,paddingTop:12,borderTop:"1px dashed var(--line)"}}>
        <div className="row" style={{gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div><label className="label">ماه</label><select className="input" style={{maxWidth:120}} value={jm} onChange={e=>setJm(+e.target.value)}>{J_MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
          <div><label className="label">سال</label><input className="input" type="number" style={{maxWidth:90}} value={jy} onChange={e=>setJy(+e.target.value||tj[0])}/></div>
          <button className="btn p" onClick={calc}>محاسبهٔ فیش حقوقی</button>
          {slip&&<button className="btn g" onClick={printSlip}>🖨 چاپ فیش / PDF</button>}
        </div>
        {slip&&<div className="card-p" style={{marginTop:12}}>
          <div className="row" style={{gap:14,flexWrap:"wrap",fontSize:12,color:"var(--muted)",marginBottom:8}}>
            <span>کارکرد: {fa(slip.worked_h)} ساعت</span><span>اضافه‌کار: {fa(slip.ot_h)} ساعت</span><span>شب‌کاری: {fa(slip.night_h)}</span><span>نرخ ساعت: {money(slip.hour_rate)}</span>
          </div>
          <table style={{fontSize:12,width:"100%"}}><tbody>
            {Object.entries(slip.earnings).filter(([,val])=>val).map(([k,val])=><tr key={k}><td>{k}</td><td style={{textAlign:"left",color:"var(--ok)"}}>{money(val)}</td></tr>)}
            <tr style={{borderTop:"1px solid var(--line)",fontWeight:700}}><td>جمع دریافتی</td><td style={{textAlign:"left"}}>{money(slip.gross)}</td></tr>
            {Object.entries(slip.deductions).filter(([,val])=>val).map(([k,val])=><tr key={k}><td>{k}</td><td style={{textAlign:"left",color:"var(--danger)"}}>−{money(val)}</td></tr>)}
            <tr style={{borderTop:"2px solid var(--brand)",fontWeight:700,fontSize:14}}><td>خالص پرداختی</td><td style={{textAlign:"left",color:"var(--brand)"}}>{money(slip.net)} ریال</td></tr>
          </tbody></table>
        </div>}
      </div>
    </div>}
  </div>);
}

// ویرایش مقادیر فیلدهای سفارشی یک کاربر (توسط ادمین)
function UserCustomValues({userId}){
  const [open,setOpen]=useState(false); const [fields,setFields]=useState(null); const [vals,setVals]=useState({});
  const load=()=>{ setOpen(true); db.userCustomValues(userId).then(fs=>{ setFields(fs); const m={}; fs.forEach(f=>{ m[f.id]= f.ftype==="multiselect" ? (f.value?f.value.split("|"):[]) : (f.value||""); }); setVals(m); }).catch(()=>setFields([])); };
  const save=async()=>{ try{ await db.saveUserCustomValues(userId,vals); alert("اطلاعات ذخیره شد."); }catch(e){alert(e.message||"خطا");} };
  if(!userId) return null;
  const setV=(id,v)=>setVals(s=>({...s,[id]:v}));
  const renderInput=(f)=>{
    const opts=(f.options||"").split("|").filter(Boolean);
    if(f.ftype==="textarea") return <textarea className="input" rows="2" value={vals[f.id]||""} onChange={e=>setV(f.id,e.target.value)}/>;
    if(f.ftype==="number") return <input className="input" type="number" value={vals[f.id]||""} onChange={e=>setV(f.id,e.target.value)}/>;
    if(f.ftype==="date") return <JDate value={vals[f.id]||""} onChange={v=>setV(f.id,v)}/>;
    if(f.ftype==="checkbox") return <label className="row" style={{gap:6}}><input type="checkbox" checked={vals[f.id]==="1"||vals[f.id]===1||vals[f.id]===true} onChange={e=>setV(f.id,e.target.checked?"1":"0")}/>بله</label>;
    if(f.ftype==="select") return <select className="input" value={vals[f.id]||""} onChange={e=>setV(f.id,e.target.value)}><option value="">—</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>;
    if(f.ftype==="multiselect") return <div className="row" style={{gap:6,flexWrap:"wrap"}}>{opts.map(o=>{ const arr=Array.isArray(vals[f.id])?vals[f.id]:[]; const on=arr.includes(o); return <button type="button" key={o} className={"chip"+(on?" on":"")} onClick={()=>setV(f.id, on?arr.filter(x=>x!==o):[...arr,o])}>{o}</button>; })}</div>;
    return <input className="input" value={vals[f.id]||""} onChange={e=>setV(f.id,e.target.value)}/>;
  };
  return(<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line)"}}>
    {!open?<button className="btn g" type="button" onClick={load}>اطلاعات تکمیلی پرسنل (فیلدهای سفارشی)</button>:
     fields===null?<span className="muted">در حال بارگذاری…</span>:
     fields.length===0?<span className="muted">فیلد سفارشی‌ای تعریف نشده است. از تنظیمات → فیلدهای پرسنل اضافه کنید.</span>:
     <div>
       {fields.map(f=><div key={f.id} style={{marginBottom:8}}><label className="label">{f.label}{f.required?" *":""}{!f.user_editable?" (فقط مدیر)":""}</label>{renderInput(f)}</div>)}
       <button className="btn p" onClick={save}>ذخیرهٔ اطلاعات تکمیلی</button>
     </div>}
  </div>);
}

// نمایش مانده مرخصی/ماموریت/اضافه‌کار یک کاربر
function LeaveBalance({userId}){
  const [bal,setBal]=useState(null); const [open,setOpen]=useState(false);
  const load=()=>{ setOpen(true); db.userLeaveBalance(userId).then(setBal).catch(()=>{}); };
  if(!userId) return null;
  const num=(x)=>x==null?"∞":fa(typeof x==="number"?(Math.round(x*10)/10):x);
  const hm=(m)=>`${fa(Math.floor((m||0)/60))}:${String((m||0)%60).padStart(2,"0")}`;
  return(<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line)"}}>
    {!open?<button className="btn g" type="button" onClick={load}>نمایش مانده مرخصی و سقف‌ها</button>:
     !bal?<span className="muted">در حال بارگذاری…</span>:
     <div style={{fontSize:12}}>
       <b>مانده‌ها (ماه {fa(bal.month)} / سال {fa(bal.year)}):</b>
       <table style={{marginTop:6,fontSize:11.5}}><thead><tr><th>نوع</th><th>مصرف ماه</th><th>مانده ماه</th><th>مصرف سال</th><th>مانده سال</th></tr></thead><tbody>
         {[["annual_daily","استحقاقی روزانه (روز)"],["annual_hourly","استحقاقی ساعتی (ساعت)"],["sick_daily","استعلاجی روزانه (روز)"],["sick_hourly","استعلاجی ساعتی (ساعت)"]].map(([k,l])=>{ const b=bal.balance[k]||{}; return(
           <tr key={k}><td>{l}</td><td>{num(b.used_month)}</td><td style={{color:"var(--ok)"}}>{num(b.left_month)}</td><td>{num(b.used_year)}</td><td style={{color:"var(--ok)"}}>{num(b.left_year)}</td></tr>); })}
         <tr><td>اضافه‌کار</td><td colSpan="2">ماه: {fa(bal.balance.overtime.used_count_month)} بار / {hm(bal.balance.overtime.used_min_month)}</td><td colSpan="2">سال: {fa(bal.balance.overtime.used_count_year)} بار / {hm(bal.balance.overtime.used_min_year)}</td></tr>
         <tr><td>ماموریت</td><td colSpan="2">ماه: {fa(bal.balance.mission.used_count_month)} بار / {hm(bal.balance.mission.used_min_month)}</td><td colSpan="2">سال: {fa(bal.balance.mission.used_count_year)} بار / {hm(bal.balance.mission.used_min_year)}</td></tr>
       </tbody></table>
       <span className="muted" style={{fontSize:10.5}}>∞ = بدون سقف. مانده = سقف منهای مجموع درخواست‌های در انتظار و تأییدشده.</span>
     </div>}
  </div>);
}

// گزارش قطعی سیستم نوبت‌دهی (جدول + نمودار per-خط + خروجی)
function OutageReport(){
  const tj=todayJ();
  // بازهٔ پیش‌فرض: از ابتدای ماه جاری تا امروز (روز پایان = روز امروز، نه ۳۱ که ممکن است نامعتبر باشد)
  const [from,setFrom]=useState(isoFromJ(tj[0],tj[1],1));
  const [to,setTo]=useState(isoFromJ(tj[0],tj[1],tj[2]));
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const barRef=useRef(); const cntRef=useRef();
  const qs=()=>{ const p=[]; if(from)p.push("from="+from); if(to)p.push("to="+to); return p.length?("?"+p.join("&")):""; };
  const load=()=>{ setLoading(true); db.adminOutages(qs()).then(setData).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if(!data||!barRef.current) return;
    const labels=Object.keys(data.by_line||{}); const vals=labels.map(k=>Math.round((data.by_line[k]/60)*10)/10);
    if(!labels.length) return;
    const c=new Chart(barRef.current,{type:"bar",data:{labels,datasets:[{label:"ساعت قطعی در بازه",data:vals,backgroundColor:"#d63b54",borderRadius:6}]},
      options:{plugins:{legend:{labels:{font:{family:"Vazirmatn"}}}},scales:{y:{ticks:{font:{family:"Vazirmatn"}}},x:{ticks:{font:{family:"Vazirmatn"}}}}}});
    return()=>c.destroy();
  },[data]);
  // نمودار بیشترین تعداد قطعی هر خط
  useEffect(()=>{
    if(!data||!cntRef.current) return;
    const top=(data.top_by_count||[]).slice(0,10);
    if(!top.length) return;
    const c=new Chart(cntRef.current,{type:"bar",data:{labels:top.map(x=>"خط "+x.line),datasets:[{label:"تعداد دفعات قطعی",data:top.map(x=>x.count),backgroundColor:"#f6c324",borderRadius:6}]},
      options:{indexAxis:"y",plugins:{legend:{labels:{font:{family:"Vazirmatn"}}}},scales:{y:{ticks:{font:{family:"Vazirmatn"}}},x:{ticks:{font:{family:"Vazirmatn"},precision:0}}}}});
    return()=>c.destroy();
  },[data]);
  const hm=(m)=>`${fa(Math.floor((m||0)/60))}:${String((m||0)%60).padStart(2,"0")}`;
  const exportExcel=async()=>{ try{ const res=await fetch(db.outagesExportUrl(qs()),{headers:tok()}); if(!res.ok)throw new Error("خطا"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="قطعی_سیستم.csv"; a.click(); }catch(e){alert(e.message);} };
  return(<div className="panel"><h3>⛔ گزارش قطعی سیستم نوبت‌دهی</h3>
    <div className="filters" style={{flexWrap:"wrap",gap:8}}>
      <span className="label">از</span><JDate value={from} onChange={setFrom}/>
      <span className="label">تا</span><JDate value={to} onChange={setTo}/>
      <button className="btn p" onClick={load}>اعمال</button>
      <button className="btn g" onClick={()=>{ setFrom(""); setTo(""); setTimeout(load,0); }}>همهٔ تاریخ‌ها</button>
      <button className="btn g" onClick={exportExcel}>⤓ خروجی اکسل</button>
      <button className="btn g" title="اگر قطعی‌های قدیمی نمایش داده نمی‌شوند، یک‌بار این را بزنید" onClick={async()=>{ if(!confirm("تاریخ قطعی‌های قدیمی (که جلالی ذخیره شده‌اند) به میلادی اصلاح شود؟ این کار یک‌بار لازم است."))return; try{ const r=await SEND("POST","/admin/outages/fix-dates",{}); alert(`${fa(r.fixed)} رکورد اصلاح شد.`); load(); }catch(e){alert(e.message||"خطا");} }}>🔧 اصلاح تاریخ‌های قدیمی</button>
    </div>
    {loading?<p className="muted">در حال بارگذاری…</p>:!data?<p className="muted">—</p>:<>
      <div className="kpis" style={{marginTop:12}}>
        <div className="kpi"><div className="n">{hm(data.total)}</div><div className="l">مجموع قطعی در بازه</div></div>
        <div className="kpi"><div className="n">{fa((data.rows||[]).length)}</div><div className="l">تعداد موارد ثبت‌شده</div></div>
        <div className="kpi"><div className="n">{fa(Object.keys(data.by_line||{}).length)}</div><div className="l">خطوط درگیر</div></div>
      </div>
      {Object.keys(data.by_line||{}).length>0&&<div style={{marginTop:14}}><b style={{fontSize:13}}>مجموع ساعت قطعی هر خط:</b><canvas ref={barRef} height="130"></canvas></div>}
      {(data.top_by_count||[]).length>0&&<div style={{marginTop:18}}><b style={{fontSize:13}}>خطوط با بیشترین تعداد قطعی:</b><canvas ref={cntRef} height="130"></canvas></div>}
      {data.by_month&&Object.keys(data.by_month).length>0&&<div style={{marginTop:18}}><b style={{fontSize:13}}>آمار ماهانهٔ قطعی:</b>
        <div style={{overflowX:"auto",marginTop:8}}><table style={{fontSize:12,minWidth:420}}><thead><tr><th>ماه</th><th>تعداد قطعی</th><th>مجموع مدت</th></tr></thead><tbody>
          {Object.keys(data.by_month).sort().reverse().map(m=><tr key={m}><td>{m}</td><td>{fa(data.by_month[m].count)}</td><td>{hm(data.by_month[m].minutes)}</td></tr>)}
        </tbody></table></div></div>}
      <div style={{overflowX:"auto",marginTop:14}}><table style={{fontSize:12,minWidth:720}}><thead><tr><th>تاریخ</th><th>خط</th><th>شروع</th><th>پایان</th><th>مدت</th><th>ثبت‌کننده</th><th>توضیحات</th></tr></thead><tbody>
        {(data.rows||[]).map(r=><tr key={r.id}><td>{fj(r.outage_date)}</td><td>{r.line_code?("خط "+r.line_code):("#"+r.line_id)}</td><td>{r.start_time}</td><td>{r.end_time}</td><td>{hm(r.minutes)}</td><td>{r.reporter||"—"}</td><td style={{fontSize:11,color:"var(--muted)"}}>{r.note||""}</td></tr>)}
        {(!data.rows||!data.rows.length)&&<tr><td colSpan="7" className="muted">موردی ثبت نشده است.</td></tr>}
      </tbody></table></div>
    </>}
  </div>);
}

// تبدیل ISO به جلالی YYYY-MM-DD برای کوئری
function jFromIso(iso){ if(!iso)return ""; const d=new Date(iso); if(isNaN(d))return ""; const [jy,jm,jd]=gregToJalali(d.getFullYear(),d.getMonth()+1,d.getDate()); return `${jy}-${String(jm).padStart(2,"0")}-${String(jd).padStart(2,"0")}`; }

// گزارش درخواست‌ها برای ادمین (مرخصی/ماموریت/اضافه‌کار/تردد دستی)
function AdminRequests(){
  const [users,setUsers]=useState([]); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false);
  const [fUser,setFUser]=useState(""); const [fType,setFType]=useState(""); const [fStatus,setFStatus]=useState("");
  const TY={annual:"مرخصی استحقاقی",sick:"مرخصی استعلاجی",mission:"ماموریت",overtime:"اضافه‌کار",manual:"تردد دستی"};
  const ST={pending:["در انتظار","b-pending"],approved:["تأییدشده","b-ok"],rejected:["ردشده","b-no"]};
  useEffect(()=>{ db.usersLite().then(u=>setUsers(u||[])).catch(()=>{}); load(); },[]);
  const qs=()=>{ const p=[]; if(fUser)p.push("user_id="+fUser); if(fType)p.push("type="+fType); if(fStatus)p.push("status="+fStatus); return p.length?"?"+p.join("&"):""; };
  const load=()=>{ setLoading(true); db.adminRequests(qs()).then(r=>setRows(r||[])).catch(()=>{}).finally(()=>setLoading(false)); };
  const hm=(m)=>m?`${fa(Math.floor(m/60))}:${String(m%60).padStart(2,"0")}`:"—";
  const exportExcel=async()=>{ try{ const res=await fetch(`${API_BASE}/admin/requests/export${qs()}`,{headers:tok()}); if(!res.ok)throw new Error("خطا"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="گزارش_درخواستها.csv"; a.click(); }catch(e){ alert(e.message); } };
  return(<div className="panel"><h3>📋 گزارش درخواست‌ها</h3>
    <div className="filters" style={{flexWrap:"wrap",gap:8}}>
      <select className="input" style={{maxWidth:200}} value={fUser} onChange={e=>setFUser(e.target.value)}><option value="">همهٔ نیروها</option>{users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select>
      <select className="input" style={{maxWidth:170}} value={fType} onChange={e=>setFType(e.target.value)}><option value="">همهٔ انواع</option>{Object.entries(TY).map(([k,t])=><option key={k} value={k}>{t}</option>)}</select>
      <select className="input" style={{maxWidth:150}} value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">همهٔ وضعیت‌ها</option><option value="pending">در انتظار</option><option value="approved">تأییدشده</option><option value="rejected">ردشده</option></select>
      <button className="btn p" onClick={load}>اعمال فیلتر</button>
      <button className="btn g" onClick={exportExcel}>⤓ خروجی اکسل</button>
    </div>
    {loading?<p className="muted">در حال بارگذاری…</p>:rows.length===0?<p className="muted">درخواستی یافت نشد.</p>:
    <div style={{overflowX:"auto"}}><table style={{fontSize:12,minWidth:860}}><thead><tr><th>نیرو</th><th>نوع</th><th>واحد</th><th>تاریخ</th><th>ساعت</th><th>مدت</th><th>وضعیت</th><th>تأییدکننده</th><th>توضیحات</th></tr></thead><tbody>
      {rows.map(r=>{ const st=ST[r.status]||["—","b-pending"]; return(<tr key={r.id}>
        <td>{r.requester}</td><td>{TY[r.type]||r.type}</td><td>{r.unit==="hourly"?"ساعتی":r.unit==="daily"?"روزانه":"—"}</td>
        <td style={{whiteSpace:"nowrap"}}>{r.the_date||r.from_jdate}{r.to_jdate&&r.to_jdate!==r.from_jdate?` تا ${r.to_jdate}`:""}</td>
        <td style={{whiteSpace:"nowrap"}}>{r.from_time?`${r.from_time}–${r.to_time}`:r.in_time?`${r.in_time}/${r.out_time||"—"}`:"—"}</td>
        <td>{hm(r.minutes)}</td><td><span className={"badge "+st[1]}>{st[0]}</span></td>
        <td>{(r.approver||"").trim()||"—"}</td><td style={{maxWidth:200,fontSize:11,color:"var(--muted)"}}>{r.reason||""}{r.approver_note?` | پاسخ: ${r.approver_note}`:""}{r.attachment_name?" 📎":""}</td>
      </tr>); })}
    </tbody></table></div>}
  </div>);
}

// گزارش ثبت حضور نیروها (چک‌این/چک‌اوت)
function StaffAttendance(){
  const today=new Date().toISOString().slice(0,10);
  const [from,setFrom]=useState(today); const [to,setTo]=useState(today); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false);
  const [fUser,setFUser]=useState(""); const [fLine,setFLine]=useState(""); const [fRole,setFRole]=useState(""); const [fMethod,setFMethod]=useState("");
  const [users,setUsers]=useState([]); const [lines,setLines]=useState([]); const [roles,setRoles]=useState([]);
  const M={gps:"موقعیت",wifi:"WiFi",qr:"QR",nfc:"NFC",bt:"بلوتوث",manual:"دستی"};
  const qs=()=>{ const p=[]; const f=jFromIso?jFromIso(from):from, t2=jFromIso?jFromIso(to):to;
    p.push("from="+(f||from)); p.push("to="+(t2||to));
    if(fUser)p.push("user_id="+fUser); if(fLine)p.push("line_id="+fLine); if(fRole)p.push("role_id="+fRole); if(fMethod)p.push("method="+fMethod);
    return p.join("&"); };
  const load=()=>{ setLoading(true); GET("/admin/staff-attendance?"+qs()).then(r=>setRows(r||[])).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load();
    db.usersLite().then(u=>setUsers(u||[])).catch(()=>{});
    db.lines&&db.lines().then(l=>setLines(l||[])).catch(()=>{});
    db.roles().then(r=>setRoles(r||[])).catch(()=>{});
  },[]);
  const fmtDur=(m)=>{ m=+m||0; const h=Math.floor(m/60), mm=m%60; return (h?fa(h)+" ساعت ":"")+fa(mm)+" دقیقه"; };
  const exportExcel=()=>{ window.open(API_BASE+"/admin/staff-attendance/export?"+qs()+"&token="+encodeURIComponent(localStorage.token||""),"_blank"); };
  return(<div className="panel"><h3>🕒 گزارش حضور نیروها</h3>
    <div className="filters" style={{flexWrap:"wrap",gap:8}}>
      <span className="label">از</span><JDate value={from} onChange={setFrom}/>
      <span className="label">تا</span><JDate value={to} onChange={setTo}/>
      <select className="input" style={{maxWidth:170}} value={fUser} onChange={e=>setFUser(e.target.value)}>
        <option value="">همهٔ کاربران</option>{users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select>
      <select className="input" style={{maxWidth:140}} value={fRole} onChange={e=>setFRole(e.target.value)}>
        <option value="">همهٔ سمت‌ها</option>{roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
      <select className="input" style={{maxWidth:130}} value={fLine} onChange={e=>setFLine(e.target.value)}>
        <option value="">همهٔ خطوط</option>{lines.map(l=><option key={l.id} value={l.id}>خط {l.code}</option>)}</select>
      <select className="input" style={{maxWidth:120}} value={fMethod} onChange={e=>setFMethod(e.target.value)}>
        <option value="">همهٔ روش‌ها</option><option value="gps">موقعیت</option><option value="qr">QR</option><option value="wifi">WiFi</option><option value="nfc">NFC</option><option value="bt">بلوتوث</option></select>
      <button className="btn p" onClick={load}>اعمال فیلتر</button>
      <button className="btn g" onClick={exportExcel}>⤓ خروجی اکسل</button>
    </div>
    {loading?<p className="muted">در حال بارگذاری…</p>:rows.length?(
    <table><thead><tr><th>نام</th><th>سمت</th><th>خط</th><th>روش</th><th>ورود</th><th>خروج</th><th>مدت</th></tr></thead>
    <tbody>{rows.map(r=><tr key={r.id}>
      <td>{r.name}</td><td>{r.role||"—"}</td><td>{r.line||"—"}</td>
      <td><span className="badge b-ok">{M[r.method]||r.method||"—"}</span></td>
      <td style={{whiteSpace:"nowrap"}}>{fj(r.check_in)}</td>
      <td style={{whiteSpace:"nowrap"}}>{r.check_out?fj(r.check_out):<span className="badge b-pending">در حال حضور</span>}</td>
      <td>{fmtDur(r.minutes)}</td>
    </tr>)}</tbody></table>
    ):<p className="muted">ثبت حضوری در این بازه یافت نشد.</p>}
  </div>);
}

// تاریخچهٔ پیامک‌ها: فهرست، وضعیت تحویل، خروجی اکسل
function SmsLog(){
  const today=new Date().toISOString().slice(0,10);
  const weekAgo=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  const [from,setFrom]=useState(weekAgo); const [to,setTo]=useState(today); const [kind,setKind]=useState(""); const [sentBy,setSentBy]=useState("");
  const [users,setUsers]=useState([]);
  const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false); const [busy,setBusy]=useState(false);
  const KIND={register:"ثبت‌نام",reset:"بازیابی رمز",driver:"به راننده",test:"آزمایشی"};
  const DELV={"-1":"ارسال نشده","1":"تحویل به گیرنده","2":"ناموفق","8":"تحویل به مخابرات","16":"عدم تحویل مخابرات","0":"نامشخص"};
  const load=()=>{ setLoading(true); db.smsLog(from,to,kind,sentBy).then(r=>setRows(r||[])).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load(); db.usersLite().then(u=>setUsers(u||[])).catch(()=>{});},[]);
  const refresh=async()=>{ setBusy(true); try{ const r=await db.smsRefreshStatus(from,to); if(r.ok)alert(`وضعیت ${fa(r.updated||0)} پیامک به‌روزرسانی شد.`+(r.note?("\n"+r.note):"")); else alert("خطا: "+(r.error||"")); load(); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  const exportExcel=async()=>{ try{
      const res=await fetch(`${API_BASE}/admin/sms-log/export?from=${from}&to=${to}${kind?`&kind=${kind}`:""}${sentBy?`&sent_by=${sentBy}`:""}`,{headers:tok()});
      if(!res.ok)throw new Error("خطا در دریافت فایل");
      const blob=await res.blob(); const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download=`گزارش_پیامک_${from}_${to}.csv`; a.click();
    }catch(e){ alert(e.message||"خطا در خروجی"); } };
  const delvBadge=(c)=>{ if(c===null||c===undefined)return <span className="muted">بررسی‌نشده</span>;
    const cls = (c==1)?"b-ok":((c==2||c==16)?"b-no":"b-pending"); return <span className={"badge "+cls}>{DELV[String(c)]||("کد "+c)}</span>; };
  return(<div className="panel"><h3 style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><span>📜 تاریخچهٔ پیامک‌های ارسالی</span></h3>
    <div className="filters" style={{flexWrap:"wrap",gap:8}}>
      <span className="label">از</span><JDate value={from} onChange={setFrom}/>
      <span className="label">تا</span><JDate value={to} onChange={setTo}/>
      <select className="input" style={{maxWidth:150}} value={kind} onChange={e=>setKind(e.target.value)}>
        <option value="">همهٔ انواع</option><option value="driver">به راننده</option><option value="register">ثبت‌نام</option><option value="reset">بازیابی رمز</option><option value="test">آزمایشی</option>
      </select>
      <select className="input" style={{maxWidth:180}} value={sentBy} onChange={e=>setSentBy(e.target.value)}>
        <option value="">همهٔ فرستندگان</option>
        {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
      </select>
      <button className="btn p" onClick={load}>اعمال فیلتر</button>
      <button className="btn g" disabled={busy} onClick={refresh}>{busy?"در حال بررسی…":"به‌روزرسانی وضعیت تحویل"}</button>
      <button className="btn g" onClick={exportExcel}>⤓ خروجی اکسل</button>
    </div>
    {loading?<p className="muted">در حال بارگذاری…</p>:rows.length?(
    <table><thead><tr><th>تاریخ</th><th>گیرنده</th><th>نوع</th><th>وضعیت ارسال</th><th>وضعیت تحویل</th><th>فرستنده</th><th>متن</th></tr></thead>
    <tbody>{rows.map(r=><tr key={r.id}>
      <td style={{whiteSpace:"nowrap"}}>{fj(r.created_at)}</td>
      <td dir="ltr">{r.to_mobile}</td>
      <td>{KIND[r.kind]||r.kind||"—"}</td>
      <td>{r.status==="ok"?<span className="badge b-ok">ارسال‌شده</span>:<span className="badge b-no">خطا</span>}</td>
      <td>{delvBadge(r.delivery_code)}</td>
      <td>{(r.sender||"").trim()||"—"}</td>
      <td style={{maxWidth:280,fontSize:12,color:"var(--muted)"}}>{(r.body||"").slice(0,80)}{(r.body||"").length>80?"…":""}</td>
    </tr>)}</tbody></table>
    ):<p className="muted">پیامکی در این بازه ثبت نشده است.</p>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>توجه: بررسی وضعیت تحویل از سمت مخابرات فقط تا ۷ روز پس از ارسال امکان‌پذیر است.</p>
  </div>);
}

// تنظیم قالب و ارسال خودکار پیامک‌های انقضا (۴ نوع)
function ExpirySettings({v,setV,save}){
  const TYPES=[["taxi_lic","پروانهٔ تاکسیرانی"],["op_lic","پروانهٔ بهره‌برداری"],["inspection","معاینهٔ فنی"],["insurance","بیمهٔ شخص ثالث"]];
  const [lines,setLines]=useState([]); const [open,setOpen]=useState("taxi_lic");
  useEffect(()=>{ db.lines().then(l=>setLines(l||[])).catch(()=>{}); },[]);
  const cfg=v.sms_expiry||{};
  const get=(t)=>cfg[t]||{template:"",auto_enabled:false,days:30,lines:["all"]};
  const setT=(t,patch)=>setV({...v,sms_expiry:{...cfg,[t]:{...get(t),...patch}}});
  const toggleLine=(t,id)=>{ const c=get(t); let ls=Array.isArray(c.lines)?c.lines.filter(x=>x!=="all"):[]; ls=ls.includes(id)?ls.filter(x=>x!==id):[...ls,id]; setT(t,{lines:ls.length?ls:["all"]}); };
  const DEFAULT="تاکسیران گرامی {name}\n{lic} شما در مورخ {expire} {verb}؛ لطفاً هرچه سریع‌تر با مراجعه به شرکت {company} واقع در {address} مراجعه نمایید و یا با شماره {phone} تماس حاصل نمایید.";
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>متغیرها: <code dir="ltr">{"{name}"}</code> نام، <code dir="ltr">{"{expire}"}</code> تاریخ انقضا، <code dir="ltr">{"{lic}"}</code> نوع پروانه، <code dir="ltr">{"{verb}"}</code> (می‌شود/شده است)، <code dir="ltr">{"{company}"}</code>، <code dir="ltr">{"{address}"}</code>، <code dir="ltr">{"{phone}"}</code></p>
    <div className="tabbar" style={{flexWrap:"wrap"}}>{TYPES.map(([k,t])=><button key={k} className={"tabbtn"+(open===k?" on":"")} onClick={()=>setOpen(k)}>{t}</button>)}</div>
    {TYPES.filter(([k])=>k===open).map(([k,t])=>{ const c=get(k); const ls=Array.isArray(c.lines)?c.lines:["all"]; const allLines=ls.includes("all"); return(<div key={k} style={{marginTop:12}}>
      <div className="label">متن پیامک {t}:</div>
      <textarea className="input" rows="4" placeholder={DEFAULT} value={c.template||""} onChange={e=>setT(k,{template:e.target.value})}/>
      <button className="btn g" style={{marginTop:6}} onClick={()=>setT(k,{template:DEFAULT})}>درج متن پیش‌فرض</button>
      <div className="card-p" style={{marginTop:12}}>
        <label className="row" style={{gap:8,marginBottom:8}}><input type="checkbox" checked={!!c.auto_enabled} onChange={e=>setT(k,{auto_enabled:e.target.checked})}/><b>ارسال خودکار روزانه</b></label>
        <div className="row" style={{gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div><label className="label">ارسال برای انقضای تا چند روز آینده</label><input className="input" type="number" min="1" style={{maxWidth:110}} value={c.days??30} onChange={e=>setT(k,{days:Math.max(1,+e.target.value||1)})}/></div>
        </div>
        <div className="label" style={{marginTop:10}}>خطوط مشمول ارسال خودکار:</div>
        <label className="row" style={{gap:6,margin:"6px 0"}}><input type="checkbox" checked={allLines} onChange={()=>setT(k,{lines:["all"]})}/>همهٔ خطوط</label>
        {!allLines&&<div className="chiprow">{lines.map(l=><label key={l.id} className="chip" style={{cursor:"pointer",background:ls.includes(l.id)?"var(--brand)":"",color:ls.includes(l.id)?"#fff":""}}><input type="checkbox" style={{marginInlineEnd:4}} checked={ls.includes(l.id)} onChange={()=>toggleLine(k,l.id)}/>خط {l.code}</label>)}</div>}
      </div>
    </div>); })}
    <div className="row" style={{gap:10,marginTop:14}}><button className="btn p" onClick={save}>ذخیرهٔ تنظیمات انقضا</button></div>
    <p style={{fontSize:12,color:"var(--muted)",marginTop:10}}>برای ارسال خودکار، یک Cron روزانه به آدرس <code dir="ltr">/api/cron/sms-expiry?key=کلید</code> تنظیم کنید (کلید = <code dir="ltr">cron_key</code> در تنظیمات). از ارسال تکراری به یک شماره طی ۷ روز جلوگیری می‌شود.</p>
  </div>);
}

// ارسال پیامک: تب رانندگان + تب‌های انقضای پروانه/معاینه/بیمه
function SmsCustomList(){
  const [text,setText]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(null);
  const [result,setResult]=useState(null);
  const [fileInfo,setFileInfo]=useState(null);

  const toEn=(s)=>String(s).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const parseNumbers=(raw)=>{
    const en=toEn(raw);
    const parts=en.split(/[\s,;،\n\r\t]+/).map(x=>x.trim()).filter(Boolean);
    const cleaned=parts.map(p=>p.replace(/[^\d+]/g,''));
    const valid=cleaned.filter(p=>/^(\+?98|0)?9\d{9}$/.test(p)||/^\d{10,13}$/.test(p));
    return Array.from(new Set(valid));
  };
  const numbers=parseNumbers(text);

  const onFile=async(e)=>{
    const file=e.target.files[0]; if(!file) return;
    try{
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""});
      const flat=aoa.flat().map(x=>String(x||'').trim()).filter(Boolean);
      const found=parseNumbers(flat.join("\n"));
      setText(t=>(t.trim()?t.trim()+"\n":"")+found.join("\n"));
      setFileInfo({name:file.name,rows:aoa.length,found:found.length});
    }catch(err){ alert("خطا در خواندن فایل اکسل: "+(err.message||err)); }
    e.target.value="";
  };

  const doSend=async()=>{
    if(!numbers.length){ alert("هیچ شمارهٔ معتبری در لیست یافت نشد."); return; }
    if(!message.trim()){ alert("متن پیامک را وارد کنید."); return; }
    if(!confirm(`ارسال پیامک به ${fa(numbers.length)} شماره؟ (متن یکسان برای همه ارسال می‌شود)`)) return;
    setBusy(true); setResult(null); setProgress(0);
    const CH=50; let sent=0, failed=0; const errs=[];
    for(let i=0;i<numbers.length;i+=CH){
      const chunk=numbers.slice(i,i+CH);
      try{ await db.smsSendMixed([],chunk,message); sent+=chunk.length; }
      catch(e){ failed+=chunk.length; if(errs.length<5) errs.push(e.message||String(e)); }
      setProgress(Math.round(Math.min(i+CH,numbers.length)/numbers.length*100));
    }
    setResult({sent,failed,total:numbers.length,errors:errs});
    setBusy(false); setProgress(null);
  };

  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:12}}>شماره‌ها را مستقیم تایپ/جای‌گذاری کنید (هر شماره در یک خط، یا جداشده با کاما/فاصله) یا یک فایل اکسل بارگذاری کنید — همهٔ سلول‌های همهٔ ستون‌ها بررسی و شماره‌های معتبر از میان آن‌ها استخراج می‌شوند. سپس متن دلخواه را بنویسید و ارسال کنید.</p>
    <div style={{marginBottom:10}}>
      <label className="label">لیست شماره‌ها</label>
      <textarea className="input" rows={6} style={{width:"100%",fontFamily:"monospace"}} value={text} onChange={e=>setText(e.target.value)}
        placeholder={"مثال:\n09121234567\n09359876543\nیا: 09121234567,09359876543"}/>
    </div>
    <div className="row" style={{gap:10,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
      <label className="btn g" style={{cursor:"pointer"}}>📥 بارگذاری از فایل اکسل<input type="file" accept=".xlsx,.xls" hidden onChange={onFile}/></label>
      {fileInfo&&<span style={{fontSize:12,color:"var(--muted)"}}>از «{fileInfo.name}» ({fa(fileInfo.rows)} ردیف): {fa(fileInfo.found)} شمارهٔ معتبر یافت و به لیست بالا اضافه شد.</span>}
      {text&&<button className="btn g" onClick={()=>{setText("");setFileInfo(null);}}>پاک‌کردن لیست</button>}
    </div>
    <p style={{fontSize:13,marginBottom:14}}>تعداد شمارهٔ معتبر شناسایی‌شده: <b style={{color:numbers.length?"var(--ok)":"var(--danger)"}}>{fa(numbers.length)}</b></p>

    <div style={{marginBottom:10}}>
      <label className="label">متن پیامک (برای همهٔ شماره‌ها یکسان ارسال می‌شود)</label>
      <textarea className="input" rows={4} style={{width:"100%"}} value={message} onChange={e=>setMessage(e.target.value)} placeholder="متن دلخواه پیامک را اینجا بنویسید…"/>
    </div>

    <button className="btn p" onClick={doSend} disabled={busy||!numbers.length||!message.trim()}>
      {busy?`در حال ارسال… ${progress!=null?fa(progress)+'٪':''}`:`✉ ارسال به ${fa(numbers.length)} شماره`}
    </button>

    {result&&<div style={{marginTop:14,background:result.failed?"#fff8e6":"#eafaf1",border:"1px solid "+(result.failed?"#f0d98a":"#b6e6cd"),borderRadius:10,padding:12}}>
      ✓ ارسال به {fa(result.sent)} شماره موفق{result.failed>0?`، ${fa(result.failed)} شماره ناموفق`:""} از مجموع {fa(result.total)}.
      {result.errors.length>0&&<div style={{marginTop:6}}>{result.errors.map((e,i)=><div key={i} style={{fontSize:12,color:"var(--danger)"}}>{e}</div>)}</div>}
    </div>}
  </div>);
}

function SmsSend(){
  const TABS=[["drivers","به رانندگان"],["custom","لیست دلخواه (تایپی/اکسل)"],["bill_bulk","آبونمان (گروهی)"],["taxi_lic","پروانهٔ تاکسیرانی"],["op_lic","پروانهٔ بهره‌برداری"],["inspection","معاینهٔ فنی"],["insurance","بیمهٔ شخص ثالث"]];
  const [tab,setTab]=useState("drivers");
  return(<div className="panel"><h3>✉ ارسال پیامک</h3>
    <div className="tabbar" style={{flexWrap:"wrap"}}>
      {TABS.map(([k,t])=><button key={k} className={"tabbtn"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{t}</button>)}
    </div>
    {tab==="drivers"?<SmsDrivers/>:tab==="custom"?<SmsCustomList/>:tab==="bill_bulk"?<SmsBillBulk/>:<SmsExpiry type={tab} title={TABS.find(x=>x[0]===tab)[1]}/>}
  </div>);
}

function SmsBillBulk(){
  const [opts,setOpts]=useState({dates:[],lines:[],contacts:[]});
  const [fromDate,setFromDate]=useState(""); const [toDate,setToDate]=useState(""); const [oneDate,setOneDate]=useState("");
  const [selLines,setSelLines]=useState([]); // کدهای خط انتخاب‌شده
  const [preview,setPreview]=useState(null); const [loading,setLoading]=useState(false); const [sending,setSending]=useState(false); const [result,setResult]=useState(null);
  const [showPrev,setShowPrev]=useState(false);
  // گیرندگان خارج از لیست
  const [extra,setExtra]=useState([]); // [{name,phone}]
  const [exName,setExName]=useState(""); const [exPhone,setExPhone]=useState("");
  const loadOpts=()=>GET("/admin/bill-sms/options").then(setOpts).catch(()=>{});
  useEffect(()=>{loadOpts();},[]);
  const toggleLine=(code)=>setSelLines(s=>s.includes(code)?s.filter(x=>x!==code):[...s,code]);
  const filterBody=()=>({ from_date:fromDate, to_date:toDate, pay_date:oneDate, lines:selLines.length?selLines:undefined });
  const doPreview=async()=>{ setLoading(true); setResult(null); setShowPrev(false);
    try{ const r=await SEND("POST","/admin/bill-sms/preview",filterBody()); setPreview(r); }
    catch(e){ alert(e.message||"خطا"); setPreview(null); } setLoading(false); };
  const doSend=async()=>{ if(!preview||!preview.count) return;
    if(!confirm(`ارسال پیامک به ${fa(preview.count)} راننده${extra.length?` و ${fa(extra.length)} گیرندهٔ خارج از لیست`:""}؟`)) return;
    setSending(true);
    try{ const r=await SEND("POST","/admin/bill-sms/send",{...filterBody(),extra_numbers:extra.map(e=>e.phone)}); setResult(r); setPreview(null); setShowPrev(false); }
    catch(e){ alert(e.message||"خطا"); } setSending(false); };
  const addExtra=()=>{ const ph=exPhone.trim(); if(!ph){alert("شماره را وارد کنید");return;} if(extra.find(e=>e.phone===ph)){alert("این شماره قبلاً اضافه شده");return;} setExtra([...extra,{name:exName.trim(),phone:ph}]); setExName(""); setExPhone(""); };
  const saveContact=async(c)=>{ try{ await SEND("POST","/admin/sms-contacts",{name:c.name,phone:c.phone}); loadOpts(); alert("در دفترچهٔ مخاطبین ذخیره شد."); }catch(e){alert(e.message||"خطا");} };
  const addFromContact=(c)=>{ if(extra.find(e=>e.phone===c.phone)){return;} setExtra([...extra,{name:c.name,phone:c.phone}]); };
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>برای رانندگانی که فیش آبونمان پرداخت‌نشده دارند، هر فیش به‌صورت یک پیامک جدا با شناسهٔ قبض، مبلغ و لینک درگاه پرداخت ارسال می‌شود. قالب پیامک در «تنظیمات → پیامک» قابل ویرایش است (متغیرها: {"{name}"}، {"{bill_id}"}، {"{pay_id}"}، {"{amount}"}، {"{pay_url}"}، {"{plate}"}، {"{line}"}).</p>

    {/* انتخاب تاریخ از دراپ‌داون فیش‌های موجود */}
    <div style={{background:"var(--brand-soft)",borderRadius:10,padding:12,marginBottom:10}}>
      <b style={{fontSize:13}}>۱) انتخاب تاریخ فیش</b>
      <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:8,alignItems:"center"}}>
        <span className="label">یک تاریخ مشخص:</span>
        <select className="input" style={{maxWidth:180}} value={oneDate} onChange={e=>{setOneDate(e.target.value);setFromDate("");setToDate("");}}>
          <option value="">— انتخاب از فیش‌های موجود —</option>
          {opts.dates.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <span className="label">یا بازه:</span>
        <select className="input" style={{maxWidth:150}} value={fromDate} onChange={e=>{setFromDate(e.target.value);setOneDate("");}}>
          <option value="">از تاریخ…</option>{opts.dates.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input" style={{maxWidth:150}} value={toDate} onChange={e=>{setToDate(e.target.value);setOneDate("");}}>
          <option value="">تا تاریخ…</option>{opts.dates.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>

    {/* انتخاب چند خط از خطوط در دسترس */}
    <div style={{background:"var(--brand-soft)",borderRadius:10,padding:12,marginBottom:10}}>
      <b style={{fontSize:13}}>۲) انتخاب خط (می‌توانید چند خط انتخاب کنید — خالی = همهٔ خطوط شما)</b>
      <div className="chiprow" style={{marginTop:8,maxHeight:120,overflowY:"auto"}}>
        {opts.lines.map(l=><span key={l.id} className={"chip"+(selLines.includes(String(l.code))?" on":"")} style={{cursor:"pointer",background:selLines.includes(String(l.code))?"var(--brand)":undefined,color:selLines.includes(String(l.code))?"#fff":undefined}} onClick={()=>toggleLine(String(l.code))}>خط {l.code}{l.origin?` (${l.origin})`:""}</span>)}
        {!opts.lines.length&&<span className="muted">خطی در دسترس نیست.</span>}
      </div>
    </div>

    <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:10}}>
      <button className="btn p" onClick={doPreview} disabled={loading}>{loading?"در حال بارگذاری…":"🔄 بارگذاری لیست فیش‌ها"}</button>
      {preview&&preview.count>0&&<button className="btn g" onClick={()=>setShowPrev(s=>!s)}>👁 پیش‌نمایش پیامک با اطلاعات واقعی</button>}
    </div>

    {result&&<div style={{background:"#eafaf1",border:"1px solid #b6e6cd",borderRadius:10,padding:12,marginBottom:12}}>
      ✓ ارسال انجام شد: {fa(result.sent)} موفق{result.failed>0?`، ${fa(result.failed)} ناموفق`:""} از مجموع {fa(result.total)} راننده{result.extra_sent>0?` + ${fa(result.extra_sent)} گیرندهٔ خارج از لیست`:""}.
    </div>}

    {/* پیش‌نمایش پیامک واقعی ۵ نفر اول و آخر */}
    {showPrev&&preview&&<div style={{background:"#fffdf3",border:"1px solid #f0d98a",borderRadius:10,padding:12,marginBottom:12}}>
      <b style={{fontSize:13}}>نمونهٔ پیامک‌های واقعی:</b>
      <div style={{marginTop:8}}><b style={{fontSize:12,color:"var(--brand)"}}>۵ نفر اول لیست:</b>
        {(preview.preview_first||[]).map((m,i)=><div key={i} style={{background:"#fff",borderRadius:8,padding:8,marginTop:6,fontSize:12}}><b>{m.name||"—"}</b> ({m.phone})<div style={{whiteSpace:"pre-wrap",marginTop:4,color:"var(--ink)"}}>{m.msg}</div></div>)}
      </div>
      <div style={{marginTop:10}}><b style={{fontSize:12,color:"var(--brand)"}}>۵ نفر آخر لیست:</b>
        {(preview.preview_last||[]).map((m,i)=><div key={i} style={{background:"#fff",borderRadius:8,padding:8,marginTop:6,fontSize:12}}><b>{m.name||"—"}</b> ({m.phone})<div style={{whiteSpace:"pre-wrap",marginTop:4,color:"var(--ink)"}}>{m.msg}</div></div>)}
      </div>
    </div>}

    {preview&&<div>
      <div style={{background:"var(--brand-soft)",borderRadius:10,padding:12,marginBottom:10}}>
        <b>{fa(preview.count)} راننده</b> با مجموع <b>{fa(preview.total_amount.toLocaleString())} ریال</b> بدهی آبونمان پرداخت‌نشده.
        {preview.total_match!==undefined&&preview.count===0&&preview.total_match>0&&<div style={{color:"#b45309",fontSize:12.5,marginTop:6}}>⚠ {fa(preview.total_match)} فیش با این فیلتر یافت شد اما {fa(preview.no_phone)} مورد شمارهٔ موبایل ندارند، یا همگی پرداخت‌شده‌اند. لطفاً فیلتر تاریخ/خط را بررسی کنید.</div>}
        {preview.no_phone>0&&preview.count>0&&<div style={{color:"#b45309",fontSize:12,marginTop:4}}>({fa(preview.no_phone)} فیش بدون موبایل از فهرست کنار گذاشته شد.)</div>}
        {preview.count>0&&<button className="btn p" style={{marginRight:12}} onClick={doSend} disabled={sending}>{sending?"در حال ارسال…":`✉ ارسال به ${fa(preview.count)} راننده`}</button>}
      </div>

      {/* گیرندگان خارج از لیست */}
      <div style={{background:"#f7f9fc",border:"1px solid var(--line)",borderRadius:10,padding:12,marginBottom:10}}>
        <b style={{fontSize:13}}>➕ افزودن گیرندگان خارج از لیست</b>
        <p style={{fontSize:12,color:"var(--muted)",margin:"6px 0"}}>این شماره‌ها متن پیامک «نفر آخر لیست» را با عبارت «جهت استحضار» دریافت می‌کنند.</p>
        <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:8}}>
          <input className="input" style={{maxWidth:140}} placeholder="نام (اختیاری)" value={exName} onChange={e=>setExName(e.target.value)}/>
          <input className="input" style={{maxWidth:150}} placeholder="شمارهٔ موبایل" value={exPhone} onChange={e=>setExPhone(e.target.value)}/>
          <button className="btn g" onClick={addExtra}>افزودن</button>
        </div>
        {extra.length>0&&<div className="chiprow" style={{marginBottom:8}}>
          {extra.map((e,i)=><span key={i} className="chip">{e.name?e.name+" ":""}{e.phone}
            <b style={{cursor:"pointer",marginRight:6}} onClick={()=>saveContact(e)} title="ذخیره در دفترچه">💾</b>
            <b style={{cursor:"pointer"}} onClick={()=>setExtra(extra.filter((_,j)=>j!==i))}>✕</b></span>)}
        </div>}
        {opts.contacts.length>0&&<div>
          <span className="label">دفترچهٔ مخاطبین (لمس برای افزودن):</span>
          <div className="chiprow" style={{marginTop:6}}>
            {opts.contacts.map(c=><span key={c.id} className="chip" style={{cursor:"pointer"}} onClick={()=>addFromContact(c)}>{c.name||c.phone} ({c.phone})</span>)}
          </div>
        </div>}
      </div>

      {preview.count>0&&<div style={{overflowX:"auto",maxHeight:360,overflowY:"auto"}}>
        <table style={{fontSize:12,minWidth:560}}><thead><tr><th>راننده</th><th>کد ملی</th><th>پلاک</th><th>خط</th><th>تعداد فیش</th><th>مبلغ کل</th><th>موبایل</th></tr></thead>
        <tbody>{preview.recipients.map((r,i)=><tr key={i}><td>{r.person_title||"—"}</td><td>{r.national_id||"—"}</td><td>{r.plate||"—"}</td><td style={{fontSize:11}}>{r.line_text||"—"}</td><td>{fa(r.bill_count)}</td><td>{fa(Number(r.total_amount).toLocaleString())}</td><td>{r.phone}</td></tr>)}</tbody></table>
      </div>}
    </div>}
    <BillBulkReport/>
  </div>);
}

function BillBulkReport(){
  const [rows,setRows]=useState([]);
  const load=()=>GET("/admin/bill-sms/report").then(setRows).catch(()=>{});
  useEffect(()=>{load();},[]);
  if(!rows.length) return null;
  return(<div style={{marginTop:20}}>
    <h4 style={{marginBottom:8}}>📊 گزارش پیامک‌های گروهی آبونمان</h4>
    <div style={{overflowX:"auto"}}><table style={{fontSize:12,minWidth:480}}><thead><tr><th>تاریخ ارسال</th><th>ارسال‌کننده</th><th>تعداد پیامک</th></tr></thead>
      <tbody>{rows.map((r,i)=><tr key={i}><td>{fj(r.sent_at)}</td><td>{r.sender||"—"}</td><td>{fa(r.total)}</td></tr>)}</tbody></table></div>
  </div>);
}

// تب رانندگان: انتخاب بر اساس خط، چک‌باکس، و ورود دستی شماره
function SmsDrivers(){
  const [tpls,setTpls]=useState([]); const [lines,setLines]=useState([]); const [lineId,setLineId]=useState("");
  const [drivers,setDrivers]=useState([]); const [sel,setSel]=useState({}); const [manual,setManual]=useState([]); const [mInput,setMInput]=useState("");
  const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false); const [q,setQ]=useState("");
  useEffect(()=>{ db.smsTemplates().then(t=>setTpls(t||[])).catch(()=>{}); db.lines().then(l=>setLines(l||[])).catch(()=>{}); db.smsDrivers().then(d=>setDrivers(d||[])).catch(()=>{}); },[]);
  const loadLine=(id)=>{ setLineId(id); if(!id){ db.smsDrivers().then(d=>setDrivers(d||[])).catch(()=>{}); return;} db.smsDriversByLine(id).then(d=>setDrivers(d||[])).catch(()=>{}); };
  const toggle=(id)=>setSel(s=>({...s,[id]:!s[id]}));
  const chosen=drivers.filter(d=>sel[d.id]);
  const filtered=q.trim()?drivers.filter(d=>(d.name||"").includes(q.trim())||(d.mobile||"").includes(q.trim())):drivers;
  const selectAll=()=>{ const ns={...sel}; filtered.forEach(d=>ns[d.id]=true); setSel(ns); };
  const addManual=()=>{ const m=mInput.replace(/\s/g,""); if(!/^0\d{10}$/.test(m))return alert("شماره را به‌صورت ۱۱ رقمی و با ۰ ابتدا وارد کنید"); if(!manual.includes(m))setManual([...manual,m]); setMInput(""); };
  const totalCount=chosen.length+manual.length;
  const send=async()=>{
    if(!msg.trim())return alert("متن پیامک را وارد یا قالبی انتخاب کنید");
    if(!totalCount)return alert("حداقل یک گیرنده انتخاب یا وارد کنید");
    if(!confirm(`ارسال پیامک به ${fa(totalCount)} گیرنده؟`))return;
    setBusy(true);
    try{ const r=await db.smsSendMixed(chosen.map(d=>d.id),manual,msg.trim()); alert(r.ok?`پیامک به ${fa(r.sent)} شماره ارسال شد.`:("خطا: "+(r.error||""))); }
    catch(e){ alert(e.message||"خطا در ارسال"); } setBusy(false);
  };
  return(<div>
    <div className="label">قالب پیامک:</div>
    <div className="row" style={{gap:8,flexWrap:"wrap",margin:"6px 0 12px"}}>
      {tpls.length?tpls.map((t,i)=><button key={i} className="btn g" onClick={()=>setMsg(t.body||"")}>{t.title||("قالب "+(i+1))}</button>):<span className="muted" style={{fontSize:12}}>قالبی تعریف نشده — می‌توانید متن دلخواه بنویسید.</span>}
    </div>
    <textarea className="input" rows="3" placeholder="متن پیامک…" value={msg} onChange={e=>setMsg(e.target.value)}/>
    <div className="row" style={{gap:8,margin:"10px 0",flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><label className="label">انتخاب بر اساس خط</label>
        <select className="input" style={{maxWidth:220}} value={lineId} onChange={e=>loadLine(e.target.value)}>
          <option value="">همهٔ خطوط مجاز</option>
          {lines.map(l=><option key={l.id} value={l.id}>خط {l.code} ({l.origin}→{l.destination})</option>)}
        </select>
      </div>
      <input className="input" style={{maxWidth:160}} placeholder="جستجوی راننده…" value={q} onChange={e=>setQ(e.target.value)}/>
      <button className="btn g" onClick={selectAll}>انتخاب همه</button>
      <button className="btn g" onClick={()=>setSel({})}>پاک‌کردن</button>
    </div>
    {drivers.length===0?<p className="muted">راننده‌ای با موبایل یافت نشد.</p>:
    <div style={{maxHeight:280,overflow:"auto",border:"1px solid var(--line)",borderRadius:10}}>
      {filtered.map(d=><label key={d.id} className="row" style={{gap:8,padding:"8px 12px",borderBottom:"1px solid var(--line)",cursor:"pointer"}}>
        <input type="checkbox" checked={!!sel[d.id]} onChange={()=>toggle(d.id)}/>
        <span style={{flex:1}}>{d.name}</span><span className="muted" dir="ltr">{d.mobile}</span>
      </label>)}
    </div>}
    <div style={{marginTop:14}}>
      <div className="label">ورود دستی شمارهٔ موبایل:</div>
      <div className="row" style={{gap:8,marginTop:6}}>
        <input className="input" dir="ltr" style={{maxWidth:180}} placeholder="09xxxxxxxxx" value={mInput} onChange={e=>setMInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addManual()}/>
        <button className="btn g" onClick={addManual}>+ افزودن شماره</button>
      </div>
      {manual.length>0&&<div className="chiprow" style={{marginTop:8}}>{manual.map(m=><span key={m} className="chip" dir="ltr">{m} <b onClick={()=>setManual(manual.filter(x=>x!==m))}>×</b></span>)}</div>}
    </div>
    <button className="btn p" style={{marginTop:16}} disabled={busy} onClick={send}>{busy?"در حال ارسال…":`ارسال به ${fa(totalCount)} گیرنده`}</button>
  </div>);
}

// تب انقضا: پروانه/معاینه/بیمه
function SmsExpiry({type,title}){
  const [mode,setMode]=useState("expiring"); const [days,setDays]=useState(30);
  const [lines,setLines]=useState([]); const [selLines,setSelLines]=useState([]);
  const [data,setData]=useState(null); const [busy,setBusy]=useState(false); const [sampleNo,setSampleNo]=useState("");
  useEffect(()=>{ db.lines().then(l=>setLines(l||[])).catch(()=>{}); },[]);
  const preview=async()=>{ setBusy(true); try{ const r=await db.expiryPreview(type,mode,days,selLines.join(",")); setData(r); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  const sendAll=async()=>{ if(!data||!data.count)return alert("ابتدا پیش‌نمایش بگیرید"); if(!confirm(`ارسال پیامک به ${fa(data.count)} نفر؟`))return; setBusy(true);
    try{ const r=await db.expirySend(type,mode,days,selLines); alert(r.ok?`ارسال شد: ${fa(r.sent)} موفق${r.failed?`، ${fa(r.failed)} ناموفق`:""}`:("خطا: "+(r.error||""))); }catch(e){ alert(e.message||"خطا"); } setBusy(false); };
  const sendSample=async()=>{ if(!/^0\d{10}$/.test(sampleNo.replace(/\s/g,"")))return alert("شمارهٔ نمونه را درست وارد کنید"); try{ const r=await db.expirySample(type,mode,sampleNo.replace(/\s/g,"")); alert(r.ok?"پیامک نمونه ارسال شد.":("خطا: "+(r.error||""))); }catch(e){ alert(e.message||"خطا"); } };
  const toggleLine=(id)=>setSelLines(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  return(<div>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>ارسال پیامک یادآوری به افرادی که {title} آن‌ها منقضی شده یا در روزهای آینده منقضی می‌شود. متن پیامک و اطلاعات شرکت در «تنظیمات → پیامک» قابل ویرایش است.{type==="op_lic"?" (فقط برای بهره‌برداران ارسال می‌شود، نه کمکی‌ها.)":""}</p>
    <div className="row" style={{gap:14,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
      <div><label className="label">وضعیت</label>
        <select className="input" style={{maxWidth:180}} value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="expiring">رو به انقضا (در روزهای آینده)</option>
          <option value="expired">منقضی‌شده</option>
        </select>
      </div>
      {mode==="expiring"&&<div><label className="label">تا چند روز آینده</label><input className="input" type="number" min="1" style={{maxWidth:100}} value={days} onChange={e=>setDays(Math.max(1,+e.target.value||1))}/></div>}
      <button className="btn p" disabled={busy} onClick={preview}>پیش‌نمایش گیرندگان</button>
    </div>
    <div style={{marginBottom:12}}>
      <div className="label">محدود به خطوط (خالی = همهٔ خطوط):</div>
      <div className="chiprow" style={{marginTop:6}}>{lines.map(l=><label key={l.id} className="chip" style={{cursor:"pointer",background:selLines.includes(l.id)?"var(--brand)":"",color:selLines.includes(l.id)?"#fff":""}}><input type="checkbox" style={{marginInlineEnd:4}} checked={selLines.includes(l.id)} onChange={()=>toggleLine(l.id)}/>خط {l.code}</label>)}</div>
    </div>
    {data&&<div className="card-p" style={{marginBottom:12}}>
      <b>{fa(data.count)} گیرنده یافت شد.</b>
      {data.count>0&&<div style={{maxHeight:240,overflow:"auto",marginTop:8,border:"1px solid var(--line)",borderRadius:8}}>
        <table style={{fontSize:12}}><thead><tr><th>نام</th><th>موبایل</th><th>انقضا</th></tr></thead>
        <tbody>{data.recipients.slice(0,200).map((r,i)=><tr key={i}><td>{r.name}</td><td dir="ltr">{r.mobile}</td><td>{r.expire}</td></tr>)}</tbody></table>
      </div>}
      {data.count>0&&<div style={{marginTop:10,padding:10,background:"var(--paper)",borderRadius:8,fontSize:12,whiteSpace:"pre-wrap"}}><b>نمونهٔ متن:</b><br/>{data.recipients[0].message}</div>}
    </div>}
    <div className="row" style={{gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
      <input className="input" dir="ltr" style={{maxWidth:170}} placeholder="شمارهٔ نمونه 09..." value={sampleNo} onChange={e=>setSampleNo(e.target.value)}/>
      <button className="btn g" onClick={sendSample}>ارسال پیامک نمونه</button>
      <button className="btn p" disabled={busy||!data||!data.count} onClick={sendAll}>{busy?"در حال ارسال…":`ارسال به همه (${data?fa(data.count):"۰"})`}</button>
    </div>
  </div>);
}

// صحت‌سنجی حضور: مشاهدهٔ ارسال‌ها (سلفی + عکس خودروها) و تخلفات عدم ارسال
function PresenceChecks(){
  const today=new Date().toISOString().slice(0,10);
  const [from,setFrom]=useState(today); const [to,setTo]=useState(today);
  const [rows,setRows]=useState([]); const [viol,setViol]=useState([]); const [loading,setLoading]=useState(false);
  const [pick,setPick]=useState(null); const [tab,setTab]=useState("sent");
  const load=()=>{ setLoading(true); Promise.all([db.presenceChecks(from,to,""),db.presenceViolations(from,to)])
    .then(([r,v])=>{setRows(r||[]);setViol(v||[]);}).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);
  const [geo,setGeo]=useState(null); const [full,setFull]=useState(null);
  const openImg=async(id)=>{ try{ const d=await db.presenceCheck(id); setPick(d); setGeo(null);
    if(d.lat&&d.lng){ GET(`/geo/reverse?lat=${d.lat}&lng=${d.lng}`).then(g=>setGeo(g)).catch(()=>setGeo(null)); }
  }catch(e){ alert(e.message||"خطا"); } };
  const dlImg=(url,name)=>{ const a=document.createElement("a"); a.href=url; a.download=name||"presence.jpg"; a.target="_blank"; a.click(); };
  const exportExcel=async()=>{ try{ const res=await fetch(db.presenceExportUrl(from,to,""),{headers:tok()}); if(!res.ok)throw new Error("خطا در دریافت"); const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`صحت‌سنجی_${from}_${to}.csv`; a.click(); }catch(e){ alert(e.message); } };
  return(<div className="panel"><h3 style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <span>📸 صحت‌سنجی حضور نیروها</span></h3>
    <div className="filters">
      <span className="label">از</span><JDate value={from} onChange={setFrom}/>
      <span className="label">تا</span><JDate value={to} onChange={setTo}/>
      <button className="btn p" onClick={load}>اعمال فیلتر</button>
      {rows.length>0&&<button className="btn g" onClick={exportExcel}>⤓ خروجی اکسل (با لینک عکس‌ها)</button>}
    </div>
    <div className="tabbar" style={{marginTop:6}}>
      <button className={"tabbtn"+(tab==="sent"?" on":"")} onClick={()=>setTab("sent")}>ارسال‌شده ({fa(rows.length)})</button>
      <button className={"tabbtn"+(tab==="miss"?" on":"")} onClick={()=>setTab("miss")}>تخلف عدم ارسال ({fa(viol.length)})</button>
    </div>
    {loading?<p className="muted">در حال بارگذاری…</p>: tab==="sent"?(
      rows.length?<table><thead><tr><th>نیرو</th><th>سمت</th><th>تاریخ</th><th>بازه</th><th>موقعیت</th><th>زمان ثبت (تهران)</th><th>تصاویر</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}>
        <td><b>{r.name}</b></td><td>{r.role||"—"}</td><td>{fj(r.slot_date)}</td><td>{r.slot}</td>
        <td>{r.lat?<a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank">نقشه</a>:"—"}</td>
        <td>{r.captured_fa||fj(r.captured_at)}</td>
        <td><button className="btn g" onClick={()=>openImg(r.id)}>مشاهده عکس‌ها</button></td>
      </tr>)}</tbody></table>:<p className="muted">ارسالی در این بازه نیست.</p>
    ):(
      viol.length?<table><thead><tr><th>نیرو</th><th>سمت</th><th>تاریخ</th><th>بازه</th><th>نوع تخلف</th></tr></thead>
      <tbody>{viol.map((v,i)=><tr key={i}><td><b>{v.name}</b></td><td>{v.role||"—"}</td><td>{fj(v.slot_date)}</td><td>{v.slot}</td><td><span className="badge b-no">{v.type}</span></td></tr>)}</tbody></table>
      :<p className="muted">تخلفی در این بازه نیست.</p>
    )}
    {pick&&<div className="modal-bg" onClick={()=>setPick(null)}><div className="modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
      <h3>{pick.name} — {fj(pick.slot_date)} ساعت {pick.slot}</h3>
      {geo&&<div style={{background:"var(--brand-soft,#eef7f3)",borderRadius:10,padding:"10px 12px",margin:"10px 0",fontSize:13,lineHeight:2}}>
        {geo.address&&<div>📍 <b>آدرس:</b> {geo.address}</div>}
        {geo.street&&<div>🛣 <b>خیابان:</b> {geo.street}</div>}
        {geo.nearest_line&&<div>🚖 <b>نزدیک‌ترین خط:</b> {geo.nearest_line}{geo.nearest_station?` (${geo.nearest_station})`:""}{geo.distance_m!=null?` — فاصله: ${fa(geo.distance_m)} متر`:""}</div>}
      </div>}
      <div className="grid2" style={{marginTop:10}}>
        {["selfie","vehicles_photo"].map(key=>{ const src=pick[key]?(pick[key].indexOf("/api/")===0?API_BASE.replace(/\/api$/,"")+pick[key]:pick[key]):null;
          return(<div key={key}><div className="label" style={{marginBottom:6}}>{key==="selfie"?"سلفی":"خودروهای خط"}</div>
            {src?<div style={{position:"relative"}}>
              <img src={src} style={{width:"100%",borderRadius:10,cursor:"pointer"}} onClick={()=>setFull(src)}/>
              {/* درج اطلاعات روی عکس */}
              {geo&&(geo.street||geo.nearest_line)&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.6)",color:"#fff",fontSize:11,padding:"5px 8px",borderRadius:"0 0 10px 10px",lineHeight:1.7}}>
                {geo.street?`🛣 ${geo.street}`:""}{geo.nearest_line?` · 🚖 ${geo.nearest_line}${geo.distance_m!=null?` (${fa(geo.distance_m)}م)`:""}`:""}
              </div>}
              <div style={{display:"flex",gap:6,marginTop:6}}>
                <button className="btn g" style={{flex:1}} onClick={()=>setFull(src)}>🔍 تمام‌صفحه</button>
                <button className="btn g" style={{flex:1}} onClick={()=>dlImg(src,`${pick.name}_${key}.jpg`)}>⤓ ذخیره</button>
              </div>
            </div>:<p className="muted">—</p>}</div>);
        })}
      </div>
      {pick.lat?<p style={{marginTop:10,fontSize:13}}>موقعیت: <a href={`https://maps.google.com/?q=${pick.lat},${pick.lng}`} target="_blank">{pick.lat}, {pick.lng}</a></p>:null}
      <button className="btn g" style={{marginTop:12,width:"100%"}} onClick={()=>setPick(null)}>بستن</button>
    </div></div>}
    {full&&<div onClick={()=>setFull(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20,flexDirection:"column",gap:12}}>
      <img src={full} style={{maxWidth:"95%",maxHeight:"82%",borderRadius:8}} onClick={e=>e.stopPropagation()}/>
      <div style={{display:"flex",gap:10}}>
        <button className="btn p" onClick={(e)=>{e.stopPropagation();dlImg(full,"presence_full.jpg");}}>⤓ ذخیرهٔ تصویر</button>
        <button className="btn g" onClick={()=>setFull(null)}>بستن</button>
      </div>
    </div>}
  </div>);
}

// صحت‌سنجی حضور: مشاهدهٔ ارسال‌ها (سلفی + عکس خودروها) و تخلفات عدم ارسال
function TempDriversPanel(){
  const [list,setList]=useState(null);
  const [lines,setLines]=useState([]);
  const [fLine,setFLine]=useState("");
  // افزودن
  const [nid,setNid]=useState("");
  const [vehicleQ,setVehicleQ]=useState("");
  const [vehicleFound,setVehicleFound]=useState(null);
  const [selectedDrivers,setSelectedDrivers]=useState({});
  const [found,setFound]=useState(null);
  const [lineId,setLineId]=useState("");
  const [codeInLine,setCodeInLine]=useState("");
  const [note,setNote]=useState("");
  const [msg,setMsg]=useState("");

  const loadLines=()=>GET("/temp-drivers/special-lines").then(r=>setLines(r||[])).catch(()=>{});
  const load=()=>{ const q=fLine?("?line_id="+fLine):""; GET("/temp-drivers"+q).then(r=>setList(r||[])).catch(()=>setList([])); };
  useEffect(()=>{loadLines();load();},[]);

  const lookup=async()=>{ const n=onlyDigits(nid); if(n.length<8){setMsg("کد ملی معتبر وارد کنید");return;}
    setMsg(""); setFound(null); setVehicleFound(null); setSelectedDrivers({});
    try{ const r=await GET("/temp-drivers/search?national_id="+encodeURIComponent(n)); setFound(r); }
    catch(e){ setMsg(e.message||"راننده یافت نشد"); } };
  const lookupVehicle=async()=>{ const q=String(vehicleQ||"").trim(); if(q.length<2){setMsg("پلاک، کد خودرو یا بخشی از مشخصات خودرو را وارد کنید");return;}
    setMsg(""); setFound(null); setVehicleFound(null); setSelectedDrivers({});
    try{ const r=await GET("/temp-drivers/vehicle-search?q="+encodeURIComponent(q)); setVehicleFound(r); const sel={}; (r.drivers||[]).forEach(d=>{ if(d.role==='beneficiary'||d.role==='helper') sel[d.id]=true; }); setSelectedDrivers(sel); }
    catch(e){ setMsg(e.message||"خودرو یافت نشد"); } };
  const chosenDriverIds=()=> vehicleFound?.drivers ? Object.keys(selectedDrivers).filter(k=>selectedDrivers[k]).map(k=>+k) : (found?.driver?[+found.driver.id]:[]);
  const add=async()=>{ const ids=chosenDriverIds(); if(!ids.length){setMsg("ابتدا راننده یا خودرو را جستجو و راننده‌های موردنظر را انتخاب کنید");return;} if(!lineId){setMsg("خط ویژه را انتخاب کنید");return;}
    try{ await SEND("POST","/temp-drivers",{driver_ids:ids,national_id:found?.driver?.national_id||null,line_id:+lineId,line_code_in_line:codeInLine||null,note:note||null});
      setMsg("✓ تخصیص موقت ثبت شد"); setLineId("");setCodeInLine("");setNote(""); if(found)lookup(); if(vehicleFound)lookupVehicle(); load(); }
    catch(e){ setMsg(e.message||"خطا در افزودن"); } };
  const endTemp=async(id)=>{ if(!confirm("پایان این تخصیص موقت؟"))return; await SEND("DELETE","/temp-drivers/"+id); load(); if(found)lookup(); };
  const exportExcel=()=>{ if(!list||!list.length)return;
    const ws=XLSX.utils.json_to_sheet(list.map(t=>({"نام":t.first_name+" "+t.last_name,"کد ملی":t.national_id,"خط ویژه":t.line_code,"کد در خط":t.line_code_in_line||"","موبایل":t.mobile||"","توضیح":t.note||"","افزوده‌شده توسط":t.added_by_name||""})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"رانندگان موقت"); XLSX.writeFile(wb,"رانندگان_موقت.xlsx"); };

  return(<div className="panel"><h3>🚕 رانندگان موقت خطوط ویژه</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:12}}>رانندگانی که خط اصلی آن‌ها حفظ شده ولی به‌صورت موقت به خطوط ویژه (۳۰۰، ۵۰۰، ۵۰۱، ۵۰۲، ۵۰۳، ۵۰۵، ۷۰۰) اضافه شده‌اند. این رانندگان برای ناظر/اپراتور/بازرسِ آن خط قابل مشاهده و بررسی (چک‌لیست، تذکر) هستند.</p>

    <div className="card-p" style={{marginBottom:16}}>
      <h4 style={{marginBottom:10}}>افزودن راننده به خط ویژه</h4>
      <div className="row" style={{gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div><label className="label">کد ملی راننده</label><input className="input" style={{maxWidth:170}} value={nid} onChange={e=>setNid(onlyDigits(e.target.value).slice(0,10))} placeholder="کد ملی" inputMode="numeric" maxLength="10"/></div>
        <button className="btn p" onClick={lookup}>🔍 جستجوی راننده</button>
        <div><label className="label">جستجوی خودرو / پلاک / کد بهره‌برداری</label><input className="input" style={{maxWidth:260}} value={vehicleQ} onChange={e=>setVehicleQ(e.target.value)} placeholder="مثلاً ۱۲۳ یا ایران ۱۲"/></div>
        <button className="btn p" onClick={lookupVehicle}>🚕 جستجوی خودرو</button>
      </div>
      {vehicleFound && vehicleFound.vehicle ? (
        <div style={{marginTop:12,padding:12,background:"#f6f9fc",borderRadius:10}}>
          <b style={{fontSize:15}}>خودرو: {vehicleFound.vehicle.plate || "—"}</b>
          <span style={{color:"var(--muted)",marginRight:10,fontSize:12}}>مدل: {vehicleFound.vehicle.model_name || "—"}</span>
          <div style={{fontSize:12.5,color:"var(--muted)",marginTop:4}}>
            خط فعلی خودرو: {vehicleFound.main_line && vehicleFound.main_line.line_code ? faPlain(vehicleFound.main_line.line_code) : (vehicleFound.vehicle.line_text || "نامشخص")}
          </div>
          <div style={{marginTop:10}}>
            <b style={{fontSize:12.5}}>انتخاب رانندگان برای ثبت همزمان:</b>
            {((vehicleFound.drivers || []).length === 0) ? (
              <p className="muted">برای این خودرو بهره‌بردار یا کمکی ثبت نشده است.</p>
            ) : (
              (vehicleFound.drivers || []).map(d => (
                <label key={d.id} className="row" style={{justifyContent:"space-between",background:"#fff",borderRadius:6,padding:"7px 10px",marginTop:5,cursor:"pointer"}}>
                  <span style={{fontSize:12.5}}>
                    {d.first_name || ""} {d.last_name || ""} — {d.role === 'beneficiary' ? 'بهره‌بردار' : d.role === 'helper' ? 'کمکی' : 'راننده'} — کد ملی: {faPlain(d.national_id || "")}
                  </span>
                  <input
                    type="checkbox"
                    checked={!!selectedDrivers[d.id]}
                    onChange={e => setSelectedDrivers({...selectedDrivers, [d.id]: e.target.checked})}
                  />
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
      {found?.driver&&<div style={{marginTop:12,padding:12,background:"#f6f9fc",borderRadius:10}}>
        <b style={{fontSize:15}}>{found.driver.first_name} {found.driver.last_name}</b>
        <span style={{color:"var(--muted)",marginRight:10,fontSize:12}}>کد ملی: {faPlain(found.driver.national_id)}</span>
        <div style={{fontSize:12.5,color:"var(--muted)",marginTop:4}}>خط اصلی: {found.main_line?.line_code?fa(found.main_line.line_code):"نامشخص"}{found.main_line?.line_code_in_line?(" — کد در خط: "+fa(found.main_line.line_code_in_line)):""}</div>
        {found.temp_lines?.length>0&&<div style={{marginTop:8}}>
          <b style={{fontSize:12.5}}>خطوط موقت فعلی:</b>
          {found.temp_lines.map(t=><div key={t.id} className="row" style={{justifyContent:"space-between",background:"#fff",borderRadius:6,padding:"5px 10px",marginTop:4}}>
            <span style={{fontSize:12.5}}>خط {fa(t.line_code)}{t.line_code_in_line?(" — کد "+fa(t.line_code_in_line)):""}</span>
            <button className="btn g" style={{color:"var(--danger)",fontSize:11,padding:"2px 8px"}} onClick={()=>endTemp(t.id)}>پایان</button>
          </div>)}
        </div>}
        <div className="row" style={{gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:12}}>
          <div><label className="label">خط ویژه</label><select className="input" style={{maxWidth:200}} value={lineId} onChange={e=>setLineId(e.target.value)}><option value="">انتخاب…</option>{lines.map(l=><option key={l.id} value={l.id}>خط {l.code}{l.origin?(" ("+l.origin+")"):""}</option>)}</select></div>
          <div><label className="label">کد در خط (اختیاری)</label><input className="input" style={{maxWidth:120}} value={codeInLine} onChange={e=>setCodeInLine(e.target.value)} placeholder="کد"/></div>
          <div style={{flex:1,minWidth:160}}><label className="label">توضیح (اختیاری)</label><input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="علت تخصیص"/></div>
          <button className="btn p" onClick={add}>➕ افزودن موقت</button>
        </div>
      </div>}
      {msg&&<p style={{marginTop:8,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontSize:13,fontWeight:700}}>{msg}</p>}
    </div>

    <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:10}}>
      <select className="input" style={{maxWidth:200}} value={fLine} onChange={e=>setFLine(e.target.value)}><option value="">همهٔ خطوط ویژه</option>{lines.map(l=><option key={l.id} value={l.id}>خط {l.code}</option>)}</select>
      <button className="btn p" onClick={load}>اعمال</button>
      <button className="btn g" onClick={()=>{setFLine("");setTimeout(load,0);}}>همه</button>
      <button className="btn g" onClick={exportExcel} disabled={!list||!list.length}>⤓ خروجی اکسل</button>
    </div>
    {list===null?<p className="muted">در حال بارگذاری…</p>:list.length===0?<p className="muted">راننده موقتی ثبت نشده است.</p>:
    <div style={{overflowX:"auto"}}><table style={{fontSize:12.5,minWidth:720}}><thead><tr><th>نام</th><th>کد ملی</th><th>خط ویژه</th><th>کد در خط</th><th>موبایل</th><th>توضیح</th><th>افزوده توسط</th><th></th></tr></thead><tbody>
      {list.map(t=><tr key={t.id}>
        <td style={{fontWeight:700}}>{t.first_name} {t.last_name}</td><td style={{direction:"ltr",textAlign:"right"}}>{faPlain(t.national_id)}</td>
        <td><span className="badge" style={{background:"#dbeafe",color:"#1d4ed8"}}>{fa(t.line_code)}</span></td>
        <td>{t.line_code_in_line?fa(t.line_code_in_line):"—"}</td><td style={{direction:"ltr",textAlign:"right",fontSize:11}}>{t.mobile||"—"}</td>
        <td style={{fontSize:11.5,color:"var(--muted)"}}>{t.note||"—"}</td><td style={{fontSize:11}}>{t.added_by_name||"—"}</td>
        <td><button className="btn g" style={{color:"var(--danger)",fontSize:11,padding:"2px 8px"}} onClick={()=>endTemp(t.id)}>پایان</button></td>
      </tr>)}
    </tbody></table></div>}
  </div>);
}

function Commitments(){
  const [tab,setTab]=useState("add");
  const [users,setUsers]=useState([]);
  const [reasons,setReasons]=useState([]);
  // فرم ثبت
  const [uid,setUid]=useState("");
  const [uq,setUq]=useState("");
  const [reasonId,setReasonId]=useState("");
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [cdate,setCdate]=useState(todayJStr());
  const [att,setAtt]=useState(null);
  const [msg,setMsg]=useState("");
  // فهرست همه
  const [all,setAll]=useState(null);
  const [fUser,setFUser]=useState("");
  const [fReason,setFReason]=useState("");
  // مدیریت دلایل
  const [newReason,setNewReason]=useState("");

  const loadUsers=()=>db.users().then(setUsers).catch(()=>{});
  const loadReasons=()=>GET("/admin/commitment-reasons").then(r=>setReasons(r||[])).catch(()=>{});
  useEffect(()=>{loadUsers();loadReasons();},[]);

  const pickFile=(e)=>{ const f=e.target.files[0]; if(!f)return; if(f.size>5*1024*1024){setMsg("حجم فایل باید کمتر از ۵ مگابایت باشد");return;}
    const rd=new FileReader(); rd.onload=()=>setAtt({name:f.name,data:rd.result}); rd.readAsDataURL(f); };

  const save=async()=>{
    if(!uid){setMsg("کاربر را انتخاب کنید");return;}
    const rTitle=reasonId?(reasons.find(r=>r.id==reasonId)||{}).title:"";
    const finalTitle=(title.trim()||rTitle).trim();
    if(!finalTitle){setMsg("عنوان تعهد را وارد کنید یا یک دلیل انتخاب کنید");return;}
    try{ await SEND("POST","/admin/user-commitments",{user_id:+uid,title:finalTitle,reason_id:reasonId?+reasonId:null,description:desc,commit_jdate:cdate,attachment_name:att?att.name:null,attachment_data:att?att.data:null});
      setMsg("✓ تعهد ثبت شد"); setTitle("");setDesc("");setAtt(null);setReasonId("");
      if(tab==="list")loadAll(); }
    catch(e){ setMsg(e.message||"خطا در ثبت"); }
  };

  const loadAll=()=>{ const p=[]; if(fUser)p.push("user_id="+fUser); if(fReason)p.push("reason_id="+fReason);
    GET("/admin/commitments-all"+(p.length?"?"+p.join("&"):"")).then(r=>setAll(r||[])).catch(()=>setAll([])); };
  useEffect(()=>{ if(tab==="list")loadAll(); },[tab]);
  const del=async(id)=>{ if(!confirm("حذف این تعهد؟"))return; await SEND("DELETE","/admin/user-commitments/"+id); loadAll(); };
  const viewAtt=async(id)=>{ try{ const r=await GET("/admin/user-commitments/"+id+"/attachment"); if(r.attachment_data){ const w=window.open(); if(w) w.document.write('<iframe src="'+r.attachment_data+'" style="width:100%;height:100%;border:0"></iframe>'); } }catch(e){ alert("پیوست در دسترس نیست"); } };
  const exportAll=()=>{ if(!all||!all.length)return;
    const ws=XLSX.utils.json_to_sheet(all.map(c=>({"کاربر":c.user_name,"سمت":c.user_role||"",  "عنوان تعهد":c.title,"دلیل":c.reason_title||"",  "تاریخ":c.commit_jdate,"توضیح":c.description||"","ثبت‌کننده":c.created_by_name||"","پیوست":c.has_attachment?"دارد":"ندارد"})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"تعهدات"); XLSX.writeFile(wb,"تعهدات_انضباطی.xlsx"); };

  // مدیریت دلایل
  const addReason=async()=>{ if(!newReason.trim())return; await SEND("POST","/admin/commitment-reasons",{title:newReason.trim()}); setNewReason(""); loadReasons(); };
  const toggleReason=async(r)=>{ await SEND("POST","/admin/commitment-reasons",{...r,is_active:r.is_active?0:1}); loadReasons(); };
  const delReason=async(id)=>{ if(!confirm("حذف این دلیل؟"))return; await SEND("DELETE","/admin/commitment-reasons/"+id); loadReasons(); };

  const fUsers=users.filter(u=>{ const s=(u.first_name+" "+u.last_name+" "+(u.role_title||"")); return !uq||s.indexOf(uq)>=0; });

  return(<div className="panel"><h3>📋 تعهدات انضباطی</h3>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[["add","➕ ثبت تعهد"],["list","📑 فهرست تعهدات"],["reasons","⚙ مدیریت دلایل"]].map(([k,l])=>
        <button key={k} className={"btn "+(tab===k?"p":"g")} onClick={()=>setTab(k)}>{l}</button>)}
    </div>

    {tab==="add"&&<div>
      <div className="row" style={{gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:10}}>
        <div><label className="label">جستجوی کاربر</label><input className="input" placeholder="نام/سمت…" value={uq} onChange={e=>setUq(e.target.value)} style={{maxWidth:160}}/></div>
        <div style={{flex:1,minWidth:220}}><label className="label">کاربر *</label><select className="input" value={uid} onChange={e=>setUid(e.target.value)}><option value="">انتخاب کاربر…</option>{fUsers.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.role_title}</option>)}</select></div>
        <div><label className="label">تاریخ اخذ</label><JDate value={cdate} onChange={setCdate} jalali/></div>
      </div>
      <label className="label">دلیل تعهد (از لیست)</label>
      <select className="input" value={reasonId} onChange={e=>{setReasonId(e.target.value); const rt=(reasons.find(r=>r.id==e.target.value)||{}).title; if(rt&&!title)setTitle(rt);}}>
        <option value="">— انتخاب دلیل (اختیاری) —</option>
        {reasons.filter(r=>r.is_active).map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
      </select>
      <label className="label" style={{marginTop:10}}>عنوان تعهد {reasonId?"(در صورت خالی بودن، از دلیل استفاده می‌شود)":"*"}</label>
      <input className="input" placeholder="مثلاً تعهد عدم تکرار تأخیر" value={title} onChange={e=>setTitle(e.target.value)}/>
      <label className="label" style={{marginTop:10}}>توضیحات (اختیاری)</label>
      <textarea className="input" rows="2" value={desc} onChange={e=>setDesc(e.target.value)}/>
      <div className="row" style={{gap:10,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
        <label className="btn g" style={{cursor:"pointer"}}>📎 پیوست (تصویر/PDF)<input type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={pickFile}/></label>
        {att&&<span style={{fontSize:12,color:"var(--ok)"}}>✓ {att.name}</span>}
        <button className="btn p" onClick={save}>ثبت تعهد</button>
      </div>
      {msg&&<p style={{marginTop:8,color:msg.startsWith("✓")?"var(--ok)":"var(--danger)",fontSize:13,fontWeight:700}}>{msg}</p>}
    </div>}

    {tab==="list"&&<div>
      <div className="filters" style={{flexWrap:"wrap",gap:8,marginBottom:10}}>
        <select className="input" style={{maxWidth:200}} value={fUser} onChange={e=>setFUser(e.target.value)}><option value="">همهٔ کاربران</option>{users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select>
        <select className="input" style={{maxWidth:180}} value={fReason} onChange={e=>setFReason(e.target.value)}><option value="">همهٔ دلایل</option>{reasons.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select>
        <button className="btn p" onClick={loadAll}>اعمال</button>
        <button className="btn g" onClick={()=>{setFUser("");setFReason("");setTimeout(loadAll,0);}}>پاک</button>
        <button className="btn g" onClick={exportAll} disabled={!all||!all.length}>⤓ خروجی اکسل</button>
      </div>
      {all===null?<p className="muted">در حال بارگذاری…</p>:all.length===0?<p className="muted">تعهدی ثبت نشده است.</p>:
      <div style={{overflowX:"auto"}}><table style={{fontSize:12.5,minWidth:760}}><thead><tr><th>کاربر</th><th>سمت</th><th>عنوان</th><th>دلیل</th><th>تاریخ</th><th>پیوست</th><th>ثبت‌کننده</th><th></th></tr></thead><tbody>
        {all.map(c=><tr key={c.id}>
          <td style={{fontWeight:700}}>{c.user_name}</td><td style={{fontSize:11,color:"var(--muted)"}}>{c.user_role||"—"}</td>
          <td>{c.title}</td><td style={{fontSize:11.5}}>{c.reason_title||"—"}</td><td>{fa(c.commit_jdate)}</td>
          <td>{c.has_attachment?<button className="btn t" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>viewAtt(c.id)}>مشاهده</button>:"—"}</td>
          <td style={{fontSize:11}}>{c.created_by_name||"—"}</td>
          <td><button className="btn g" style={{color:"var(--danger)",fontSize:11,padding:"2px 8px"}} onClick={()=>del(c.id)}>حذف</button></td>
        </tr>)}
      </tbody></table></div>}
    </div>}

    {tab==="reasons"&&<div>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>دلایل از پیش‌تعریف‌شده برای تعهدات. هنگام ثبت تعهد می‌توان از این لیست انتخاب کرد.</p>
      <div className="row" style={{gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input className="input" style={{flex:1,minWidth:220}} placeholder="عنوان دلیل جدید (مثلاً تأخیر مکرر در حضور)" value={newReason} onChange={e=>setNewReason(e.target.value)}/>
        <button className="btn p" onClick={addReason}>+ افزودن</button>
      </div>
      {reasons.length===0?<p className="muted">هنوز دلیلی تعریف نشده است.</p>:
      <table><thead><tr><th>عنوان</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
        {reasons.map(r=><tr key={r.id}>
          <td style={{fontWeight:700}}>{r.title}</td>
          <td><span style={{color:r.is_active?"var(--ok)":"var(--muted)"}}>{r.is_active?"فعال":"غیرفعال"}</span></td>
          <td><button className="btn g" style={{fontSize:11,padding:"3px 8px"}} onClick={()=>toggleReason(r)}>{r.is_active?"غیرفعال":"فعال"}</button> <button className="btn g" style={{fontSize:11,padding:"3px 8px",color:"var(--danger)"}} onClick={()=>delReason(r.id)}>حذف</button></td>
        </tr>)}
      </tbody></table>}
    </div>}
  </div>);
}

function UserActivity(){
  const [users,setUsers]=useState([]); const [uid,setUid]=useState(""); const [q,setQ]=useState("");
  const [from,setFrom]=useState(""); const [to,setTo]=useState(""); const [data,setData]=useState(null);
  useEffect(()=>{db.users().then(setUsers).catch(()=>{})},[]);
  const load=async()=>{ if(!uid)return alert("یک کاربر را انتخاب کنید"); const f=from||new Date().toISOString().slice(0,10); const tt=to||f;
    setData(await GET(`/admin/user-activity-range?user_id=${uid}&from=${f}&to=${tt}`)); };
  const fmt=(sec)=>{ sec=+sec||0; const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60); return (h?fa(h)+" ساعت ":"")+fa(m)+" دقیقه"; };
  const filtered=users.filter(u=>{ const s=(u.first_name+" "+u.last_name+" "+(u.role_title||"")); return !q||s.indexOf(q)>=0; });
  const selName=()=>{ const u=users.find(x=>x.id==uid); return u?(u.first_name+" "+u.last_name):""; };
  const exportExcel=()=>{ if(!data)return; const rows=[
      ["کاربر",selName()],["از تاریخ",jLabel(data.from)],["تا تاریخ",jLabel(data.to)],
      ["مدت استفاده از برنامه",fmt(data.usage_seconds)],["مدت روشن‌بودن اینترنت",fmt(data.online_seconds)],
      ["مدت روشن‌بودن GPS",fmt(data.gps_on_seconds)],["اولین ورود",data.first_login?fj(data.first_login):"—"],["آخرین خروج",data.last_logout?fj(data.last_logout):"—"]];
    const ws=XLSX.utils.aoa_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"فعالیت"); XLSX.writeFile(wb,`فعالیت_${selName()}.xlsx`); };
  // خروجی اکسل ریز عملکرد: ساعات استفاده، خاموشی GPS و قطعی اینترنت (از سرور با زمان شمسی)
  const exportDetail=async()=>{ if(!uid)return alert("یک کاربر را انتخاب کنید");
    const f=from||new Date().toISOString().slice(0,10); const tt=to||f;
    try{
      const res=await fetch(`${API_BASE}/admin/user-activity/export?user_id=${uid}&from=${f}&to=${tt}`,{headers:tok()});
      if(!res.ok) throw new Error("خطا در دریافت فایل");
      const blob=await res.blob(); const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download=`ریز_عملکرد_${selName()}_${f}_${tt}.csv`; a.click();
    }catch(e){ alert(e.message||"خطا"); }
  };
  // خروجی اکسل فعالیت همهٔ کاربران (گزارش کلی)
  const [allBusy,setAllBusy]=useState(false);
  const exportAll=async()=>{
    const f=from||new Date().toISOString().slice(0,10); const tt=to||f;
    setAllBusy(true);
    try{
      const r=await GET(`/admin/user-activity-all?from=${f}&to=${tt}`);
      if(!r||!r.people||!r.people.length){ alert("داده‌ای برای این بازه یافت نشد"); setAllBusy(false); return; }
      const cols=["نام","سمت","مدت استفاده (دقیقه)","مدت آنلاین (دقیقه)","مدت GPS روشن (دقیقه)","استفاده از VPN","پیامک ارسالی","پیامک آبونمان","کلیک پرداخت قبض","پرداخت موفق (۷ روز)","تعداد تعهدات"];
      const rows=r.people.map(p=>[p.name,p.role_title||"",Math.round((p.usage_seconds||0)/60),Math.round((p.online_seconds||0)/60),Math.round((p.gps_on_seconds||0)/60),p.vpn_used?"بله":"خیر",p.sms_total||0,p.sms_abonman||0,p.bill_pay_clicks||0,p.bill_pay_effective||0,p.commitments_count||0]);
      const ws=XLSX.utils.aoa_to_sheet([cols,...rows]); const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,"فعالیت همه کاربران"); XLSX.writeFile(wb,`فعالیت_همه_کاربران_${f}_${tt}.xlsx`);
    }catch(e){ alert(e.message||"خطا"); }
    setAllBusy(false);
  };
  return(<div className="panel"><h3>گزارش فعالیت کاربران</h3>
   <div className="row" style={{gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
     <div><label className="label">جستجوی کاربر</label><input className="input" placeholder="نام/سمت…" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:170}}/></div>
     <div><label className="label">کاربر</label><select className="input" style={{maxWidth:240}} value={uid} onChange={e=>setUid(e.target.value)}><option value="">انتخاب…</option>{filtered.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.role_title}</option>)}</select></div>
     <div><label className="label">از تاریخ</label><br/><JDate value={from} onChange={setFrom} placeholder="از تاریخ"/></div>
     <div><label className="label">تا تاریخ</label><br/><JDate value={to} onChange={setTo} placeholder="تا تاریخ"/></div>
     <button className="btn p" onClick={load}>نمایش</button>
     {data&&<button className="btn g" onClick={exportExcel}>⬇ خروجی Excel (خلاصه)</button>}
     {uid&&<button className="btn t" onClick={exportDetail}>⬇ خروجی اکسل ریز عملکرد</button>}
     <button className="btn g" onClick={exportAll} disabled={allBusy} style={{background:"#0f766e",color:"#fff"}}>{allBusy?"در حال آماده‌سازی…":"⬇ خروجی اکسل همهٔ کاربران"}</button></div>
   {data&&<div className="kpis" style={{marginTop:14}}>
     <div className="kpi"><div className="n">{fmt(data.usage_seconds)}</div><div className="l">مدت استفاده از برنامه</div></div>
     <div className="kpi"><div className="n">{fmt(data.online_seconds)}</div><div className="l">مدت روشن‌بودن اینترنت</div></div>
     <div className="kpi"><div className="n">{fmt(data.gps_on_seconds)}</div><div className="l">مدت روشن‌بودن GPS</div></div>
     <div className="kpi"><div className="n">{data.first_login?fj(data.first_login):"—"}</div><div className="l">اولین ورود</div></div>
     <div className="kpi"><div className="n">{data.last_logout?fj(data.last_logout):"—"}</div><div className="l">آخرین خروج</div></div>
     <div className="kpi" style={{borderColor:data.vpn_used?"#e23b54":undefined}}><div className="n" style={{color:data.vpn_used?"#e23b54":"#16a06a",fontSize:18}}>{data.vpn_used?"بله":"خیر"}</div><div className="l">استفاده از VPN (فیلترشکن)</div></div>
   </div>}
   {data&&data.vpn_spans&&data.vpn_spans.length>0&&<div className="panel" style={{marginTop:14,borderColor:"#f3c0ca"}}>
     <h3 style={{color:"#e23b54"}}>زمان‌های روشن‌بودن فیلترشکن ({fa(data.vpn_spans.length)})</h3>
     <table><thead><tr><th>#</th><th>روشن شد</th><th>خاموش شد</th></tr></thead>
     <tbody>{data.vpn_spans.map((s,i)=><tr key={i}><td>{fa(i+1)}</td><td>{fj(s[0])}</td><td>{fj(s[1])}</td></tr>)}</tbody></table>
   </div>}
   {data&&data.vpn_events&&data.vpn_events.length>0&&<div style={{marginTop:12}}>
     <h3 style={{color:"#e23b54"}}>رویدادهای شبکه و کشور IP</h3>
     <table><thead><tr><th>زمان</th><th>وضعیت</th><th>کشور IP</th><th>IP</th></tr></thead>
     <tbody>{data.vpn_events.map((e,i)=><tr key={i}>
       <td>{fj(e.at)}</td>
       <td><span style={{color:e.state?"#e23b54":"#16a06a"}}>{e.state?"فیلترشکن روشن":"خاموش"}</span></td>
       <td style={{fontWeight:700,color:(e.country&&e.country!=="IR")?"#d97706":"inherit"}} dir="ltr">{e.country||"—"}</td>
       <td dir="ltr" style={{fontSize:11}}>{e.ip||"—"}</td>
     </tr>)}</tbody></table>
   </div>}
   <p className="muted" style={{marginTop:10,fontSize:12}}>مدت روشن/خاموش بودن اینترنت و GPS از اپ موبایل ارسال می‌شود و برای کاربرانی که اپ نصب دارند در دسترس است.</p>
  </div>);
}

function PresentChart(){
  const [data,setData]=useState(null);
  const load=()=>db.presentStats().then(setData).catch(()=>setData({lines:[],total_present:0}));
  useEffect(()=>{ load(); const iv=setInterval(load,15000); return()=>clearInterval(iv); },[]);
  if(!data) return <div className="panel"><h3>نمودار زندهٔ رانندگان حاضر</h3><p className="muted">در حال بارگذاری…</p></div>;
  const all=data.lines||[];
  const withDrivers=all.filter(l=>l.present>0).sort((a,b)=>b.present-a.present);
  const zero=all.filter(l=>!l.present||l.present===0);
  const max=withDrivers.length?withDrivers[0].present:1;
  return(<div className="panel"><h3>نمودار زندهٔ رانندگان حاضر در خطوط
    <span className="row" style={{gap:8}}><span className="btn g">جمع کل: {fa(data.total_present||0)}</span>
      <button className="btn g" onClick={load}>به‌روزرسانی</button></span></h3>
    {withDrivers.length?<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6}}>
      {withDrivers.map(l=>{ const pct=Math.round((l.present/max)*100);
        return(<div key={l.line_id} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{minWidth:130,fontSize:13,textAlign:"left"}}>
            <b>خط {l.code||"—"}</b> <span className="muted" style={{fontSize:11}}>#{fa(l.line_id)}</span>
            {l.origin?<div className="muted" style={{fontSize:11}}>{l.origin}{l.destination?` ← ${l.destination}`:""}</div>:null}
          </div>
          <div style={{flex:1,background:"#eef1f7",borderRadius:8,height:26,position:"relative",overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#0d7a5f,#16a06a)",borderRadius:8,transition:"width .5s"}}></div>
            <span style={{position:"absolute",right:8,top:0,lineHeight:"26px",fontSize:12,fontWeight:700,color:pct>40?"#fff":"#0d7a5f"}}>{fa(l.present)} نفر</span>
          </div>
        </div>); })}
    </div>:<p className="muted" style={{textAlign:"center",padding:"20px 0"}}>در حال حاضر هیچ راننده‌ای در هیچ خطی حاضر نیست.</p>}

    {zero.length>0&&<div style={{marginTop:18}}>
      <h4 style={{margin:"6px 0"}}>خطوط بدون رانندهٔ حاضر ({fa(zero.length)})</h4>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {zero.map(l=><span key={l.line_id} className="badge b-no" style={{fontSize:12}}>خط {l.code||"—"} <span style={{opacity:.7}}>#{fa(l.line_id)}</span></span>)}
      </div>
    </div>}
    <p style={{fontSize:12,color:"var(--muted)",marginTop:14}}>نمودار هر ۱۵ ثانیه به‌روز می‌شود؛ خطوط دارای راننده به‌ترتیب بیشترین به کمترین نمایش داده می‌شوند و خطوط بدون راننده جداگانه فهرست شده‌اند.</p>
  </div>);
}

function PresentStats(){
  const [data,setData]=useState(null); const [q,setQ]=useState("");
  const load=()=>db.presentStats().then(setData).catch(()=>setData({lines:[],total_present:0}));
  useEffect(()=>{ load(); const iv=setInterval(load,15000); return()=>clearInterval(iv); },[]);
  const chartRef=useRef();
  // فقط خطوطی که حداقل ۱ نفر حاضر دارند (برای سرعت و وضوح)
  const present1=React.useMemo(()=>(data?.lines||[]).filter(l=>(l.present||0)>=1).sort((a,b)=>b.present-a.present),[data]);
  useEffect(()=>{
    if(!chartRef.current||!present1.length) return;
    const top=present1.slice(0,15);
    const c=new Chart(chartRef.current,{type:"bar",data:{labels:top.map(l=>"خط "+(l.code||l.line_id)),
      datasets:[{label:"تعداد حاضر",data:top.map(l=>l.present),backgroundColor:"#0d7a5f",borderRadius:6}]},
      options:{indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{ticks:{font:{family:"Vazirmatn"},precision:0}},y:{ticks:{font:{family:"Vazirmatn"}}}}}});
    return()=>c.destroy();
  },[present1]);
  if(!data) return <div className="panel"><h3>آمار لحظه‌ای حاضرین در خطوط</h3><p className="muted">در حال بارگذاری…</p></div>;
  const term=q.trim();
  const rows=present1.filter(l=>!term ||
    (l.code&&String(l.code).includes(term)) ||
    (l.origin&&l.origin.includes(term)) ||
    (l.destination&&l.destination.includes(term)));
  return(<div className="panel"><h3>آمار لحظه‌ای حاضرین در خطوط
    <span className="row" style={{gap:8}}><span className="btn g">جمع کل: {fa(data.total_present||0)}</span></span></h3>
    <div className="row" style={{gap:8,marginBottom:10}}>
      <input className="input" style={{maxWidth:260}} placeholder="فیلتر بر اساس نام/کد خط یا مبدا/مقصد" value={q} onChange={e=>setQ(e.target.value)}/>
      <button className="btn g" onClick={load}>به‌روزرسانی</button>
    </div>
    {present1.length>0&&<div style={{marginBottom:14}}><b style={{fontSize:13}}>نمودار لحظه‌ای حاضرین (خطوط فعال):</b><canvas ref={chartRef} height="120"></canvas></div>}
    <table><thead><tr><th>ردیف</th><th>کد خط</th><th>مبدا</th><th>مقصد</th><th>تعداد حاضر</th></tr></thead>
      <tbody>{rows.length?rows.map((l,i)=><tr key={l.line_id}>
        <td>{fa(i+1)}</td><td>{l.code||"—"}</td><td>{l.origin||"—"}</td><td>{l.destination||"—"}</td>
        <td><b style={{color:l.present>0?"#0d7a5f":"var(--muted)"}}>{fa(l.present)}</b></td></tr>)
        :<tr><td colSpan={5} className="muted" style={{textAlign:"center"}}>در حال حاضر هیچ خطی نیروی حاضر ندارد</td></tr>}</tbody></table>
    <p style={{fontSize:12,color:"var(--muted)",marginTop:8}}>فقط خطوط دارای حداقل یک نیروی حاضر نمایش داده می‌شوند. هر ۱۵ ثانیه به‌روز می‌شود.</p>
  </div>);
}

function CovertSelfieImg({id}){
  const [src,setSrc]=React.useState(null);
  React.useEffect(()=>{ let alive=true;
    fetch(API_BASE+"/admin/covert-selfies/"+id+"/image",{headers:tok()})
      .then(r=>r.blob()).then(b=>{ if(alive) setSrc(URL.createObjectURL(b)); }).catch(()=>{});
    return ()=>{ alive=false; };
  },[id]);
  if(!src)return <div style={{width:"100%",height:150,background:"#eef1f7",borderRadius:8}}/>;
  return <img src={src} alt="" style={{width:"100%",height:150,objectFit:"cover",borderRadius:8}} />;
}
function CovertSelfieRequestForm(){
  const [users,setUsers]=useState([]); const [roles,setRoles]=useState([]); const [zones,setZones]=useState([]);
  const [mode,setMode]=useState("user"); // user | role | zone
  const [sel,setSel]=useState(""); const [note,setNote]=useState(""); const [busy,setBusy]=useState(false); const [result,setResult]=useState(null);
  useEffect(()=>{
    db.usersLite&&db.usersLite().then(u=>setUsers(u||[])).catch(()=>{});
    db.roles&&db.roles().then(r=>setRoles(r||[])).catch(()=>{});
    db.zones&&db.zones().then(z=>setZones(z||[])).catch(()=>{});
  },[]);
  const send=async()=>{ if(!sel){alert("یک گزینه انتخاب کنید");return;} setBusy(true); setResult(null);
    try{ const body={note}; body[mode==="user"?"user_id":mode==="role"?"role_id":"zone_id"]=+sel;
      const r=await SEND("POST","/admin/covert-selfie-request",body);
      setResult({ok:true,msg:`درخواست ارسال شد. اپ تا ۳۰ دقیقه سلفی را در اولین فرصت می‌گیرد.`}); setSel(""); setNote("");
    }catch(e){ setResult({ok:false,msg:e.message}); } setBusy(false); };
  return(<div style={{background:"var(--brand-soft)",borderRadius:12,padding:14,marginBottom:16}}>
    <h4 style={{margin:"0 0 10px"}}>📤 ارسال درخواست سلفی نامحسوس</h4>
    <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:10}}>یک درخواست به اپ ارسال کنید. اپ در اولین فرصت (تا ۳ دقیقه بعد) سلفی گرفته و اینجا ارسال می‌کند.</p>
    <div className="row" style={{gap:8,marginBottom:8,flexWrap:"wrap"}}>
      {[["user","فرد خاص"],["role","سمت"],["zone","منطقه"]].map(([m,t])=>
        <label key={m} style={{display:"inline-flex",gap:4,alignItems:"center",cursor:"pointer",fontSize:13}}>
          <input type="radio" name="covert_mode" value={m} checked={mode===m} onChange={()=>{setMode(m);setSel("");}}/>{t}</label>)}
    </div>
    <select className="input" style={{marginBottom:8}} value={sel} onChange={e=>setSel(e.target.value)}>
      <option value="">انتخاب کنید…</option>
      {mode==="user"&&users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
      {mode==="role"&&roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
      {mode==="zone"&&zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
    </select>
    <input className="input" placeholder="یادداشت (اختیاری)" value={note} onChange={e=>setNote(e.target.value)} style={{marginBottom:8}}/>
    <button className="btn p" disabled={busy||!sel} onClick={send}>{busy?"در حال ارسال…":"ارسال درخواست سلفی"}</button>
    {result&&<p style={{marginTop:8,fontSize:13,color:result.ok?"var(--ok)":"var(--danger)"}}>{result.msg}</p>}
  </div>);
}

function CovertSelfies(){
  const [tab,setTab]=React.useState("command");
  const TABS=[["command","ارسال دستور سلفی"],["request","ارسال درخواست سلفی"],["gallery","سلفی‌های گرفته‌شده"]];
  return(<div>
    <div className="tabbar" style={{display:"flex",gap:8,marginBottom:14,borderBottom:"2px solid var(--line)",flexWrap:"wrap"}}>
      {TABS.map(([k,lbl])=>
        <button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",borderBottom:tab===k?"3px solid var(--brand)":"3px solid transparent",padding:"8px 14px",cursor:"pointer",fontWeight:tab===k?800:500,color:tab===k?"var(--brand)":"var(--muted)",fontFamily:"inherit",fontSize:14}}>{lbl}</button>)}
    </div>
    {tab==="command"&&<CovertCommand/>}
    {tab==="request"&&<div className="panel"><CovertSelfieRequestForm/></div>}
    {tab==="gallery"&&<CovertGallery/>}
  </div>);
}

function CovertCommand(){
  const [cmdType,setCmdType]=React.useState("all");
  const [cmdUsers,setCmdUsers]=React.useState([]); const [cmdRoles,setCmdRoles]=React.useState([]); const [cmdZones,setCmdZones]=React.useState([]);
  const [users,setUsers]=React.useState([]); const [roles,setRoles]=React.useState([]); const [zones,setZones]=React.useState([]);
  const [cmdBusy,setCmdBusy]=React.useState(false); const [cmdResult,setCmdResult]=React.useState(null);
  React.useEffect(()=>{ db.usersLite().then(u=>setUsers(u||[])).catch(()=>{}); db.roles().then(r=>setRoles(r||[])).catch(()=>{}); db.zones&&db.zones().then(z=>setZones(z||[])).catch(()=>{}); },[]);
  const sendCmd=async()=>{
    if(!confirm("دستور گرفتن سلفی نامحسوس به کاربران انتخاب‌شده ارسال شود؟"))return;
    setCmdBusy(true); setCmdResult(null);
    try{ const ids=cmdType==="user"?cmdUsers:cmdType==="role"?cmdRoles:cmdZones;
      const r=await SEND("POST","/admin/covert-selfie/command",{target_type:cmdType,ids});
      setCmdResult(`✅ دستور به ${fa(r.sent||0)} کاربر ارسال شد. اپ در دور بعدی polling (حداکثر ۳۰ ثانیه) سلفی می‌گیرد.`);
    }catch(e){setCmdResult("خطا: "+e.message);}finally{setCmdBusy(false);}
  };
  return(<div className="panel" style={{background:"var(--brand-soft)",borderRadius:12}}>
    <h3 style={{marginBottom:8}}>📤 ارسال دستور سلفی نامحسوس فوری</h3>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>اپ موبایل در دور بعدی بررسی (حداکثر ۳۰ ثانیه) این دستور را دریافت و سلفی می‌گیرد.</p>
    <div className="row" style={{gap:8,flexWrap:"wrap",marginBottom:10}}>
      {[["all","همهٔ نیروها"],["user","کاربر مشخص"],["role","سمت مشخص"],["zone","منطقهٔ مشخص"]].map(([v,t])=>
        <button key={v} className={"btn "+(cmdType===v?"p":"g")} onClick={()=>setCmdType(v)}>{t}</button>)}
    </div>
    {cmdType==="user"&&<div><label className="label">انتخاب کاربر:</label>
      <select className="input" multiple style={{height:100}} onChange={e=>setCmdUsers([...e.target.selectedOptions].map(o=>+o.value))}>
        {users.map(u=><option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select></div>}
    {cmdType==="role"&&<div><label className="label">انتخاب سمت:</label>
      <select className="input" multiple style={{height:80}} onChange={e=>setCmdRoles([...e.target.selectedOptions].map(o=>+o.value))}>
        {roles.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></div>}
    {cmdType==="zone"&&<div><label className="label">انتخاب منطقه:</label>
      <select className="input" multiple style={{height:80}} onChange={e=>setCmdZones([...e.target.selectedOptions].map(o=>+o.value))}>
        {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></div>}
    <button className="btn p" style={{marginTop:10}} disabled={cmdBusy} onClick={sendCmd}>{cmdBusy?"در حال ارسال…":"ارسال دستور سلفی فوری"}</button>
    {cmdResult&&<p style={{marginTop:8,fontSize:13,color:"var(--brand)"}}>{cmdResult}</p>}
  </div>);
}

function CovertGallery(){
  const [rows,setRows]=React.useState(null); const [view,setView]=React.useState(null);
  const [fName,setFName]=React.useState(""); const [fRole,setFRole]=React.useState(""); const [from,setFrom]=React.useState(""); const [to,setTo]=React.useState("");
  const reload=()=>GET("/admin/covert-selfies").then(setRows).catch(()=>setRows([]));
  React.useEffect(()=>{reload();},[]);
  const del=async(id,e)=>{ e.stopPropagation(); if(!confirm("این سلفی حذف شود؟"))return;
    try{ await SEND("DELETE","/admin/covert-selfies/"+id,{}); setRows(r=>r.filter(x=>x.id!==id)); }catch(ex){ alert(ex.message||"خطا"); } };
  if(rows===null)return <div className="card">در حال بارگذاری…</div>;
  const roles=[...new Set(rows.map(r=>r.role_title).filter(Boolean))];
  const filtered=rows.filter(r=>{
    if(fName&&!((r.name||"").includes(fName)))return false;
    if(fRole&&r.role_title!==fRole)return false;
    if(from&&fj(r.created_at)<from)return false; // مقایسهٔ متنی شمسی تقریبی
    if(from||to){ const d=isoFromJ? null:null; }
    return true;
  }).filter(r=>{
    if(!from&&!to)return true;
    const j=jFromIso(r.created_at); // به شمسی
    if(from&&j<from)return false; if(to&&j>to)return false; return true;
  });
  return(<div className="panel">
    <h3 style={{marginBottom:10}}>سلفی‌های دریافتی نامحسوس</h3>
    <p style={{color:"var(--muted)",fontSize:13,marginBottom:12}}>تصاویری که اپ به‌صورت نامحسوس از دوربین جلوی گوشی نیروها گرفته است. با فیلترها می‌توانید بر اساس شخص، سمت و زمان جستجو کنید.</p>
    <div className="filters" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12,alignItems:"center"}}>
      <input className="input" style={{maxWidth:150,padding:"6px 10px"}} placeholder="نام شخص" value={fName} onChange={e=>setFName(e.target.value)}/>
      <select className="input" style={{maxWidth:150,padding:"6px 10px"}} value={fRole} onChange={e=>setFRole(e.target.value)}>
        <option value="">همهٔ سمت‌ها</option>{roles.map(r=><option key={r} value={r}>{r}</option>)}
      </select>
      <span className="label">از</span><JDate value={from} onChange={setFrom}/>
      <span className="label">تا</span><JDate value={to} onChange={setTo}/>
      {(fName||fRole||from||to)&&<button className="btn g" onClick={()=>{setFName("");setFRole("");setFrom("");setTo("");}}>پاک کردن</button>}
    </div>
    <p className="muted" style={{fontSize:12,marginBottom:10}}>{fa(filtered.length)} سلفی</p>
    {filtered.length===0?<div className="card">موردی یافت نشد.</div>:
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
      {filtered.map(r=><div key={r.id} className="card" style={{padding:8,cursor:"pointer",position:"relative"}} onClick={()=>setView(r)}>
        <CovertSelfieImg id={r.id}/>
        <div style={{fontSize:12,marginTop:6,fontWeight:700}}>{r.name||("کاربر "+r.user_id)}</div>
        {r.role_title&&<div style={{fontSize:11,color:"var(--muted)"}}>{r.role_title}</div>}
        <div style={{fontSize:11,color:"var(--muted)"}}>{fj(r.created_at)}</div>
        {r.reason&&<div style={{fontSize:11,color:"var(--muted)"}}>{r.reason==='login'?'هنگام ورود':r.reason==='checkin'?'ثبت حضور':r.reason==='manual'?'دستی':'دوره‌ای'}</div>}
        <button onClick={(e)=>del(r.id,e)} style={{position:"absolute",top:4,left:4,background:"var(--danger)",color:"#fff",border:"none",borderRadius:6,padding:"2px 7px",fontSize:11,cursor:"pointer"}}>✕ حذف</button>
      </div>)}
    </div>}
    {view&&<div onClick={()=>setView(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      <div style={{maxWidth:"92%",maxHeight:"88%"}}><CovertSelfieImg id={view.id}/></div>
    </div>}
  </div>);
}


function PlateTrainingPanel(){
  const [rows,setRows]=useState([]);
  const [st,setSt]=useState(null);
  const [status,setStatus]=useState('pending');
  const [q,setQ]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const load=async()=>{ setBusy(true); setMsg(''); try{ const qs='?status='+encodeURIComponent(status||'')+'&q='+encodeURIComponent(q||'')+'&limit=500'; const d=await db.plateTrainingSamples(qs); setRows(d.items||[]); setSt(d.status||null); }catch(e){ setMsg(e.message||'خطا در دریافت نمونه‌ها'); } finally{ setBusy(false); } };
  useEffect(()=>{ load(); },[status]);
  const review=async(r,newStatus)=>{ const d2=prompt('دو رقم اول پلاک:', r.corrected_digits_2||'')||''; const d3=prompt('سه رقم آخر پلاک:', r.corrected_digits_3||'')||''; if((d2+d3).replace(/\D/g,'').length<5) return; const note=prompt('یادداشت بررسی:', r.review_note||'')||''; try{ await db.plateTrainingReview(r.id,{status:newStatus,corrected_digits_2:d2,corrected_digits_3:d3,review_note:note}); setMsg('✓ نمونه ثبت شد'); if(status==='pending') setRows(xs=>xs.filter(x=>x.id!==r.id)); else load(); }catch(e){ setMsg(e.message||'خطا در ثبت بررسی'); } };
  const quick=async(r,newStatus)=>{ try{ const body={status:newStatus,review_note:r.review_note||''}; if(r.corrected_plate) body.corrected_plate=r.corrected_plate; await db.plateTrainingReview(r.id,body); setMsg('✓ وضعیت نمونه تغییر کرد'); if(status==='pending' && newStatus!=='pending') setRows(xs=>xs.filter(x=>x.id!==r.id)); else load(); }catch(e){ setMsg(e.message||'خطا در تغییر وضعیت'); } };
  const stat=st?.samples||{};
  return(<div className="panel">
    <h3>مدیریت نمونه‌های پلاک‌خوان</h3>
    <p className="muted" style={{fontSize:13,marginBottom:12}}>تشخیص پلاک به‌طور کامل روی گوشی (ML Kit) انجام می‌شود. این بخش صرفاً برای بازبینی و آرشیو نمونه‌های ثبت‌شده توسط کاربران است.</p>
    <div className="grid2" style={{marginTop:0}}>
      <div className="card-p"><h4>وضعیت دیتاست</h4><p>کل نمونه‌ها: <b>{fa(stat.total||0)}</b></p><p>تأییدشده: <b>{fa(stat.verified||0)}</b> · در انتظار: <b>{fa(stat.pending||0)}</b> · ردشده: <b>{fa(stat.rejected||0)}</b></p><p>دارای عکس برش‌خورده: <b>{fa(stat.with_crop||0)}</b></p></div>
    </div>
    <div className="row" style={{gap:8,flexWrap:'wrap',alignItems:'center',margin:'12px 0'}}>
      <select className="input" style={{maxWidth:170}} value={status} onChange={e=>setStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="verified">تأییدشده</option><option value="pending">در انتظار</option><option value="rejected">ردشده</option></select>
      <input className="input" placeholder="جستجوی پلاک/کاربر/متن OCR" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:260}} onKeyDown={e=>{if(e.key==='Enter')load();}}/>
      <button className="btn p" onClick={load} disabled={busy}>{busy?'در حال دریافت':'نمایش'}</button>
    </div>
    {msg&&<p style={{fontWeight:700,color:msg.startsWith('✓')?'var(--ok)':'var(--danger)',marginBottom:8}}>{msg}</p>}
    <div style={{overflowX:'auto'}}><table style={{minWidth:1120,fontSize:12}}><thead><tr><th>#</th><th>تصویر</th><th>پلاک اصلاح‌شده</th><th>OCR</th><th>کاربر/خودرو</th><th>وضعیت</th><th>زمان</th><th>عملیات</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>
      <td>{fa(r.id)}</td>
      <td>{r.crop_image?<img src={r.crop_image} onClick={()=>openMediaUrl(r.crop_image)} style={{width:145,height:54,objectFit:'cover',borderRadius:8,border:'1px solid var(--line)',cursor:'pointer'}}/>:<span className="muted">بدون برش</span>}{r.original_image&&<div><button className="btn g" style={{fontSize:10,padding:'3px 7px',marginTop:4}} onClick={()=>openMediaUrl(r.original_image)}>تصویر اصلی</button></div>}</td>
      <td><b>{r.corrected_plate||'—'}</b><div className="muted" dir="ltr" style={{fontSize:10}}>{r.corrected_digits_2||'--'} + {r.corrected_digits_3||'---'} / ت / 12</div></td>
      <td>{r.detected_plate||'—'}<div className="muted" style={{fontSize:10}}>اطمینان: {r.confidence!=null?fa(Math.round(Number(r.confidence)*100))+'٪':'—'} · {r.ocr_source||'—'}</div>{r.raw_text&&<details><summary style={{cursor:'pointer',color:'var(--brand)'}}>متن خام</summary><pre style={{whiteSpace:'pre-wrap',maxWidth:260,direction:'ltr',textAlign:'left'}}>{r.raw_text}</pre></details>}</td>
      <td><b>{r.user_name||'—'}</b><div className="muted" style={{fontSize:10}}>{r.vehicle_plate||'—'} {r.line_code?(' / خط '+r.line_code):''}</div></td>
      <td><span className="badge">{{verified:'تأییدشده',pending:'در انتظار',rejected:'ردشده'}[r.status]||r.status}</span>{r.reviewer_name&&<div className="muted" style={{fontSize:10}}>بررسی: {r.reviewer_name}</div>}</td>
      <td>{fj(r.created_at)}{r.client_time&&<div className="muted" style={{fontSize:10}}>ثبت واقعی: {fj(r.client_time)}</div>}</td>
      <td><div className="row" style={{gap:4,flexWrap:'wrap'}}><button className="btn g" onClick={()=>review(r,'verified')}>اصلاح/تأیید</button><button className="btn g" onClick={()=>quick(r,'pending')}>در انتظار</button><button className="btn g" style={{color:'var(--danger)'}} onClick={()=>quick(r,'rejected')}>رد</button></div></td>
    </tr>)}</tbody></table>{!rows.length&&<p className="muted" style={{textAlign:'center',padding:18}}>نمونه‌ای برای نمایش وجود ندارد.</p>}</div>
  </div>);
}



function MessengerCenterPanel(){
  const platforms=[
    {id:'bale',title:'بله',icon:'🟢'},
    {id:'telegram',title:'تلگرام',icon:'🔵'},
    {id:'eitaa',title:'ایتا',icon:'🟠'}
  ];
  const [active,setActive]=useState('bale');
  const [subs,setSubs]=useState({bale:[],telegram:[],eitaa:[]});
  const [loading,setLoading]=useState(false);
  const [sending,setSending]=useState(false);
  const [msg,setMsg]=useState('');
  const [q,setQ]=useState('');
  const [target,setTarget]=useState('all_drivers');
  const [text,setText]=useState('');
  const [manual,setManual]=useState('');
  const [inviteMobiles,setInviteMobiles]=useState('');
  const [inviteText,setInviteText]=useState('');
  const normalizeList=(value)=>String(value||'').split(/[،,;\n\r]+/).map(x=>x.trim()).filter(Boolean);
  const loadPlatform=async(platform)=>{
    setLoading(true); setMsg('');
    try{
      const rows=await db.messengerSubscribers(platform);
      setSubs(prev=>({...prev,[platform]:Array.isArray(rows)?rows:[]}));
    }catch(e){setMsg(e.message||'خطا در دریافت مشترکین');}
    finally{setLoading(false);}
  };
  const loadAll=async()=>{
    setLoading(true); setMsg('');
    try{
      const out=await Promise.all(platforms.map(p=>db.messengerSubscribers(p.id)));
      setSubs({bale:out[0]||[],telegram:out[1]||[],eitaa:out[2]||[]});
    }catch(e){setMsg(e.message||'خطا در دریافت مشترکین');}
    finally{setLoading(false);}
  };
  useEffect(()=>{loadAll();},[]);
  const send=async()=>{
    if(!text.trim())return setMsg('متن پیام را وارد کنید.');
    setSending(true); setMsg('');
    try{
      const selected=platforms.map(p=>p.id);
      const results=[];
      for(const platform of selected){
        const r=await db.messengerSendBulk(platform,target,text.trim());
        results.push({platform,...r});
      }
      const mobiles=normalizeList(manual);
      let manualResult=null;
      if(mobiles.length)manualResult=await db.messengerSendManual(mobiles,text.trim());
      const summary=results.map(r=>`${platforms.find(p=>p.id===r.platform)?.title||r.platform}: ${fa(r.sent||0)} موفق، ${fa(r.not_connected||0)} عضو نشده، ${fa(r.failed||0)} ناموفق`).join(' | ');
      setMsg('✓ '+summary+(manualResult?` | شماره‌های دستی: ${fa(manualResult.sent||0)} موفق` : ''));
    }catch(e){setMsg(e.message||'ارسال پیام ناموفق بود');}
    finally{setSending(false);}
  };
  const invite=async()=>{
    const mobiles=normalizeList(inviteMobiles);
    if(!mobiles.length)return setMsg('حداقل یک شماره برای دعوت وارد کنید.');
    setSending(true); setMsg('');
    try{const r=await db.messengerInvite(mobiles,inviteText.trim());setMsg(`✓ دعوت برای ${fa(r.sent||r.count||mobiles.length)} شماره ارسال شد.`);}
    catch(e){setMsg(e.message||'ارسال دعوت ناموفق بود');}
    finally{setSending(false);}
  };
  const rows=(subs[active]||[]).filter(r=>{
    const z=(String(r.mobile||'')+' '+String(r.display_name||'')+' '+String(r.user_name||'')+' '+String(r.driver_name||'')+' '+String(r.chat_id||'')).toLowerCase();
    return !q.trim()||z.includes(q.trim().toLowerCase());
  });
  const counts={}; platforms.forEach(p=>{const a=subs[p.id]||[];counts[p.id]={all:a.length,active:a.filter(x=>Number(x.is_active??(x.status==='active'?1:0))===1).length};});
  return <div className="panel messenger-center-native">
    <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><h3>مرکز ارسال ربات‌ها</h3><p className="muted" style={{marginTop:5}}>ارسال گروهی، دعوت مشترکین و مدیریت اتصال کاربران به ربات‌های رسمی سامانه</p></div>
      <button className="btn g" onClick={loadAll} disabled={loading}>{loading?'در حال بروزرسانی':'بروزرسانی همه'}</button>
    </div>
    {msg&&<div style={{marginTop:12,padding:'11px 13px',borderRadius:12,background:msg.startsWith('✓')?'#eaf8f1':'#fff1f2',color:msg.startsWith('✓')?'var(--ok)':'var(--danger)',fontWeight:700,lineHeight:1.9}}>{msg}</div>}
    <div className="grid2" style={{marginTop:16,alignItems:'start'}}>
      <div className="card-p">
        <h4>ارسال گروهی در همه ربات‌ها</h4>
        <label className="muted">گروه گیرندگان</label>
        <select className="input" value={target} onChange={e=>setTarget(e.target.value)} style={{width:'100%',marginTop:5}}><option value="all_drivers">همه رانندگان دارای شماره</option><option value="all_users">همه کاربران فعال</option></select>
        <label className="muted" style={{display:'block',marginTop:12}}>متن پیام</label>
        <textarea className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="متن پیام گروهی…" style={{width:'100%',minHeight:130,marginTop:5}}/>
        <label className="muted" style={{display:'block',marginTop:12}}>شماره‌های دستی اختیاری</label>
        <textarea className="input" value={manual} onChange={e=>setManual(e.target.value)} placeholder="شماره‌ها را با ویرگول یا خط جدید جدا کنید" style={{width:'100%',minHeight:78,marginTop:5}}/>
        <button className="btn p" onClick={send} disabled={sending} style={{width:'100%',marginTop:12}}>{sending?'در حال ارسال':'ارسال در بله، تلگرام و ایتا'}</button>
      </div>
      <div className="card-p">
        <h4>دعوت به ربات‌ها</h4>
        <p className="muted" style={{lineHeight:1.9}}>کاربرانی که هنوز ربات را فعال نکرده‌اند از طریق پیامک، لینک ورود به ربات‌های رسمی را دریافت می‌کنند.</p>
        <textarea className="input" value={inviteMobiles} onChange={e=>setInviteMobiles(e.target.value)} placeholder="شماره‌ها را با ویرگول یا خط جدید جدا کنید" style={{width:'100%',minHeight:110,marginTop:8}}/>
        <textarea className="input" value={inviteText} onChange={e=>setInviteText(e.target.value)} placeholder="متن دعوت اختیاری" style={{width:'100%',minHeight:90,marginTop:8}}/>
        <button className="btn p" onClick={invite} disabled={sending} style={{width:'100%',marginTop:12}}>ارسال دعوت پیامکی</button>
      </div>
    </div>
    <div className="card-p" style={{marginTop:16}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><div><h4 style={{marginBottom:4}}>مشترکین ربات‌ها</h4><span className="muted">هر پیام‌رسان فهرست مستقل خود را دارد.</span></div><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو در مشترکین" style={{maxWidth:280}}/></div>
      <div className="row" style={{gap:8,marginTop:14,flexWrap:'wrap'}}>{platforms.map(p=><button key={p.id} className={active===p.id?'btn p':'btn g'} onClick={()=>{setActive(p.id);if(!(subs[p.id]||[]).length)loadPlatform(p.id);}}>{p.icon} {p.title} · {fa(counts[p.id].active)} فعال از {fa(counts[p.id].all)}</button>)}</div>
      <div style={{overflowX:'auto',marginTop:14}}><table style={{minWidth:900}}><thead><tr><th>#</th><th>نام مشترک</th><th>شماره همراه</th><th>ارتباط با سامانه</th><th>شناسه گفتگو</th><th>وضعیت</th><th>آخرین مشاهده</th><th>تاریخ اتصال</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||i}><td>{fa(i+1)}</td><td><b>{r.display_name||r.user_name||r.driver_name||'—'}</b></td><td dir="ltr">{r.mobile||'—'}</td><td>{r.driver_name?`راننده: ${r.driver_name}`:(r.user_name?`کاربر: ${r.user_name}`:'—')}</td><td dir="ltr">{r.chat_id||'—'}</td><td><span className="badge" style={{color:Number(r.is_active??(r.status==='active'?1:0))===1?'var(--ok)':'var(--danger)'}}>{Number(r.is_active??(r.status==='active'?1:0))===1?'فعال':'غیرفعال'}</span></td><td>{fj(r.last_seen_at)||'—'}</td><td>{fj(r.created_at)||'—'}</td></tr>)}</tbody></table>{!rows.length&&<p className="muted" style={{padding:24,textAlign:'center'}}>برای ربات {platforms.find(p=>p.id===active)?.title} مشترکی ثبت نشده است.</p>}</div>
    </div>
  </div>;
}

function SalarySlipsAdmin(){
  const months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const [q,setQ]=useState(''); const [users,setUsers]=useState([]); const [selected,setSelected]=useState(null);
  const [rows,setRows]=useState([]); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState(''); const [file,setFile]=useState(null); const [drag,setDrag]=useState(false);
  const [nowJy,nowJm]=todayJ();
  const [form,setForm]=useState({period_jy:nowJy,period_jm:nowJm,title:''});
  const search=async()=>{setLoading(true);setMsg('');try{const r=await db.salarySlipUsers(q.trim());setUsers(r.rows||[]);}catch(e){setMsg(e.message||'خطا در جستجو');}finally{setLoading(false);}};
  const selectUser=async(u)=>{setSelected(u);setRows([]);setMsg('');try{const r=await db.salarySlipsForUser(u.id);setRows(r.rows||[]);}catch(e){setMsg(e.message||'خطا در دریافت فیش‌ها');}};
  useEffect(()=>{search();},[]);
  const chooseFile=(f)=>{if(!f)return;const n=String(f.name||'').toLowerCase();const ok=['application/pdf','image/jpeg','image/png'].includes(f.type)||/\.(pdf|jpe?g|png)$/.test(n);if(!ok){setMsg('فقط فایل PDF یا تصویر JPG، JPEG و PNG قابل انتخاب است.');return;}if(f.size>10*1024*1024){setMsg('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');return;}setFile(f);setMsg('');};
  const upload=async()=>{if(!selected)return setMsg('ابتدا یک کاربر را انتخاب کنید.');if(!file)return setMsg('فایل PDF یا تصویر فیش را انتخاب کنید.');setBusy(true);setMsg('');try{await db.salarySlipUpload(selected.id,form,file);setMsg('✓ فیش حقوقی با موفقیت بارگذاری و برای کاربر قابل دریافت شد.');setFile(null);setForm(x=>({...x,title:''}));const r=await db.salarySlipsForUser(selected.id);setRows(r.rows||[]);}catch(e){setMsg(e.message||'بارگذاری ناموفق بود');}finally{setBusy(false);}};
  const del=async(id)=>{if(!confirm('این فیش حقوقی حذف شود؟'))return;try{await db.salarySlipDelete(id);setRows(x=>x.filter(r=>r.id!==id));setMsg('✓ فیش حذف شد.');}catch(e){setMsg(e.message||'حذف ناموفق بود');}};
  return <div className="panel salary-admin">
    <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div><h3>مدیریت و بارگذاری فیش حقوقی</h3><p className="muted" style={{fontSize:13,marginTop:5}}>فیش حقوقی را به‌صورت PDF یا تصویر JPG/PNG برای هر کاربر، بر اساس سال و ماه شمسی ثبت و سوابق قبلی را مدیریت کنید.</p></div>
      <span className="badge" style={{color:'var(--brand)',borderColor:'var(--brand)'}}>PDF / JPG / PNG · حداکثر ۱۰ مگابایت</span>
    </div>
    {msg&&<div style={{marginTop:12,padding:'10px 12px',borderRadius:10,background:msg.startsWith('✓')?'#eaf8f1':'#fff1f2',color:msg.startsWith('✓')?'var(--ok)':'var(--danger)',fontWeight:700}}>{msg}</div>}
    <div className="grid2" style={{marginTop:16,alignItems:'start'}}>
      <div className="card-p">
        <h4>۱. انتخاب کاربر</h4>
        <div className="row" style={{gap:8}}><input className="input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="نام، نام کاربری، موبایل یا کد ملی"/><button className="btn p" onClick={search} disabled={loading}>{loading?'در حال جستجو':'جستجو'}</button></div>
        <div style={{marginTop:10,maxHeight:430,overflow:'auto'}}>{users.length?users.map(u=><button key={u.id} type="button" onClick={()=>selectUser(u)} style={{width:'100%',textAlign:'right',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:12,marginBottom:7,borderRadius:12,border:selected?.id===u.id?'2px solid var(--brand)':'1px solid var(--line)',background:selected?.id===u.id?'#edf8f4':'#fff',cursor:'pointer',fontFamily:'inherit'}}><span><b>{u.name||u.username||'بدون نام'}</b><small className="muted" style={{display:'block',marginTop:3}}>{u.username||''} {u.mobile?' · '+u.mobile:''} {u.national_code?' · '+u.national_code:''}</small></span><span style={{color:'var(--brand)',fontWeight:800}}>انتخاب</span></button>):<p className="muted" style={{padding:18,textAlign:'center'}}>کاربری یافت نشد.</p>}</div>
      </div>
      <div>
        <div className="card-p">
          <h4>۲. مشخصات و فایل فیش</h4>
          {!selected?<p className="muted" style={{padding:22,textAlign:'center'}}>برای شروع، یک کاربر را از ستون مقابل انتخاب کنید.</p>:<>
            <div style={{padding:11,borderRadius:12,background:'#f6f9fc',marginBottom:12}}><b>{selected.name||selected.username}</b><div className="muted" style={{fontSize:12,marginTop:3}}>{selected.mobile||'بدون شماره'} · {selected.national_code||'بدون کد ملی'}</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
              <label><span className="label">سال شمسی</span><input className="input" style={{width:'100%'}} type="number" min="1300" max="1500" value={form.period_jy} onChange={e=>setForm({...form,period_jy:e.target.value})}/></label>
              <label><span className="label">ماه</span><select className="input" style={{width:'100%'}} value={form.period_jm} onChange={e=>setForm({...form,period_jm:e.target.value})}>{months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label>
            </div>
            <label style={{display:'block',marginBottom:10}}><span className="label">عنوان فیش</span><input className="input" style={{width:'100%'}} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder={'فیش حقوقی '+months[(+form.period_jm||1)-1]+' '+form.period_jy}/></label>
            <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);chooseFile(e.dataTransfer.files?.[0])}} style={{border:'2px dashed '+(drag?'var(--brand)':'var(--line)'),borderRadius:16,padding:22,textAlign:'center',background:drag?'#edf8f4':'#fafbfd',marginTop:10}}>
              <div style={{fontSize:34}}>📄</div><b>{file?file.name:'فایل PDF را اینجا رها کنید'}</b><div className="muted" style={{fontSize:12,margin:'5px 0 10px'}}>{file?fa(Math.ceil(file.size/1024))+' کیلوبایت':'یا از دکمه زیر انتخاب کنید'}</div>
              <label className="btn g" style={{display:'inline-block',cursor:'pointer'}}>انتخاب فایل<input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>chooseFile(e.target.files?.[0])}/></label>
            </div>
            <button className="btn p" style={{width:'100%',marginTop:12,padding:13}} onClick={upload} disabled={busy}>{busy?'در حال بارگذاری...':'بارگذاری و ثبت فیش حقوقی'}</button>
          </>}
        </div>
        {selected&&<div className="card-p" style={{marginTop:14}}><h4>فیش‌های ثبت‌شده</h4>{rows.length?rows.map(r=><div key={r.id} className="row" style={{justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid var(--line)'}}><span><b>{r.title||'فیش حقوقی'}</b><small className="muted" style={{display:'block'}}>{r.period_label} · {(r.mime_type||'').startsWith('image/')?'تصویر فیش':'PDF'} · {r.file_name||'salary-slip'} · {fj(r.created_at)}</small></span><button className="btn d" onClick={()=>del(r.id)}>حذف</button></div>):<p className="muted" style={{padding:16,textAlign:'center'}}>برای این کاربر فیشی ثبت نشده است.</p>}</div>}
      </div>
    </div>
  </div>;
}

function SystemHealthDashboard(){
  const [d,setD]=useState(null); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(''); const [auto,setAuto]=useState(false);
  const [devices,setDevices]=useState([]); const [deviceStats,setDeviceStats]=useState({}); const [dq,setDq]=useState('');
  const loadDevices=async(q=dq)=>{ try{ const x=await db.deviceHealth(q); setDevices(x.items||[]); setDeviceStats(x.stats||{}); }catch(e){} };
  const load=async(run)=>{ setBusy(true); setMsg(''); try{ const r=run?await db.systemHealthRunChecks():await db.systemHealthDashboard(); setD(r); await loadDevices(); if(run)setMsg('✓ چک سلامت اجرا و ثبت شد'); }catch(e){ setMsg(e.message||'خطا در دریافت سلامت سامانه'); } finally{ setBusy(false); } };
  useEffect(()=>{ load(false); },[]);
  useEffect(()=>{ if(!auto)return; const t=setInterval(()=>load(false),30000); return()=>clearInterval(t); },[auto]);
  const badge=(st)=>{ const c=st==='ok'?'var(--ok)':(st==='warning'?'#d18b00':'var(--danger)'); const t=st==='ok'?'سالم':(st==='warning'?'هشدار':'خطا'); return <span className="badge" style={{color:c,borderColor:c}}>{t}</span>; };
  const meta=(v)=>{ try{return JSON.stringify(v||{},null,2);}catch(e){return '';} };
  const statCards=d?[['وضعیت کلی',d.status==='ok'?'سالم':(d.status==='warning'?'هشدار':'خطا')],['نسخه سایت',d.site_version],['نسخه اپ',d.app_version],['کاربران فعال',d.stats?.users_active],['رانندگان',d.stats?.drivers_total],['خطوط',d.stats?.lines_total],['جلسات باز',d.stats?.open_staff_sessions],['خطای اپ ۲۴ساعت',d.stats?.mobile_errors_24h],['رد حضور ۲۴ساعت',d.stats?.attendance_rejects_24h],['صف آفلاین ناموفق',d.stats?.offline_failed],['Dead-letter',d.stats?.delivery_dead_letters],['نمونه پلاک در انتظار',d.stats?.plate_pending]]:[];
  return(<div className="panel">
    <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <div><h3>داشبورد سلامت سامانه</h3><p className="muted" style={{fontSize:13,marginTop:4}}>پایش دیتابیس، فضای ذخیره‌سازی، صف پیام‌ها، آفلاین، خطاهای موبایل، OCR پلاک، ربات‌ها و کرون‌جاب‌ها.</p></div>
      <div className="row" style={{gap:8,flexWrap:'wrap'}}><button className="btn g" onClick={()=>load(false)} disabled={busy}>{busy?'در حال دریافت':'بروزرسانی'}</button><button className="btn p" onClick={()=>load(true)} disabled={busy}>اجرای چک و ثبت</button><button className={auto?'btn p':'btn g'} onClick={()=>setAuto(a=>!a)}>{auto?'Auto 30s فعال':'Auto 30s خاموش'}</button></div>
    </div>
    {msg&&<p style={{fontWeight:700,color:msg.startsWith('✓')?'var(--ok)':'var(--danger)',marginTop:10}}>{msg}</p>}
    {!d?<p className="muted" style={{padding:20}}>داده‌ای دریافت نشده است.</p>:<>
      <div className="grid" style={{marginTop:12}}>{statCards.map(([k,v])=><div className="kpi" key={k}><span>{k}</span><b>{typeof v==='number'?fa(v):(v||'—')}</b></div>)}</div>
      <div style={{margin:'16px 0 8px'}}><b>وضعیت کلی:</b> {badge(d.status)} <span className="muted" style={{fontSize:12,marginRight:8}}>آخرین دریافت: {fj(d.time)}</span></div>
      <div style={{overflowX:'auto'}}><table style={{minWidth:980,fontSize:12}}><thead><tr><th>بخش</th><th>وضعیت</th><th>پیام</th><th>جزئیات</th></tr></thead><tbody>{(d.components||[]).map(c=><tr key={c.key}>
        <td><b>{c.title}</b><div className="muted" dir="ltr" style={{fontSize:10}}>{c.key}</div></td><td>{badge(c.status)}</td><td>{c.message}</td><td><details><summary style={{cursor:'pointer',color:'var(--brand)'}}>نمایش</summary><pre dir="ltr" style={{whiteSpace:'pre-wrap',textAlign:'left',maxWidth:520,maxHeight:220,overflow:'auto'}}>{meta(c.meta)}</pre></details></td>
      </tr>)}</tbody></table></div>
      <div className="grid2" style={{marginTop:14}}>
        <div className="card-p"><h4>خطاها و هشدارهای اخیر سامانه</h4>{(d.recent_errors||[]).length? <div style={{maxHeight:260,overflow:'auto'}}>{d.recent_errors.map(r=><div key={r.id} style={{borderBottom:'1px solid var(--line)',padding:'7px 0'}}><b style={{color:r.level==='error'?'var(--danger)':'#d18b00'}}>{r.level}</b> · {r.source}<div style={{fontSize:12}}>{r.message}</div><div className="muted" style={{fontSize:10}}>{fj(r.created_at)}</div></div>)}</div>:<p className="muted">موردی ثبت نشده است.</p>}</div>
        <div className="card-p"><h4>خطاهای اخیر اپ موبایل</h4>{(d.recent_mobile_errors||[]).length? <div style={{maxHeight:260,overflow:'auto'}}>{d.recent_mobile_errors.map(r=><div key={r.id} style={{borderBottom:'1px solid var(--line)',padding:'7px 0'}}><b>{r.screen||'app'}</b><div style={{fontSize:12}}>{r.message}</div><div className="muted" style={{fontSize:10}}>{fj(r.created_at)} · نسخه {r.app_version||'—'}</div></div>)}</div>:<p className="muted">موردی ثبت نشده است.</p>}</div>
        <div className="card-p"><h4>شکست‌های آفلاین</h4>{(d.recent_offline_failures||[]).length? <div style={{maxHeight:260,overflow:'auto'}}>{d.recent_offline_failures.map(r=><div key={r.id} style={{borderBottom:'1px solid var(--line)',padding:'7px 0'}}><b>{r.status}</b> · {r.item_type||r.source_path||'—'}<div style={{fontSize:12,color:'var(--danger)'}}>{r.error||r.conflict_reason||''}</div><div className="muted" style={{fontSize:10}}>{fj(r.created_at)}</div></div>)}</div>:<p className="muted">موردی ثبت نشده است.</p>}</div>
        <div className="card-p"><h4>تاریخچه چک‌ها</h4>{(d.checks_history||[]).length? <div style={{maxHeight:260,overflow:'auto'}}>{d.checks_history.map((r,i)=><div key={i} style={{borderBottom:'1px solid var(--line)',padding:'7px 0'}}>{badge(r.status)} <b dir="ltr">{r.check_key}</b><div style={{fontSize:12}}>{r.message}</div><div className="muted" style={{fontSize:10}}>{fj(r.checked_at)}</div></div>)}</div>:<p className="muted">هنوز چک ثبت نشده است.</p>}</div>
      </div>
      <div className="card-p" style={{marginTop:16}}>
        <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div><h4>سلامت دستگاه‌های موبایل</h4><p className="muted" style={{fontSize:12}}>آخرین وضعیت باتری، حافظه، شبکه، پاسخ API و نسخه اندروید کاربران.</p></div>
          <div className="row" style={{gap:6}}><input value={dq} onChange={e=>setDq(e.target.value)} placeholder="جستجو نام، مدل یا نسخه"/><button className="btn g" onClick={()=>loadDevices(dq)}>جستجو</button></div>
        </div>
        <div className="grid" style={{margin:'10px 0'}}>{[
          ['دستگاه‌ها',deviceStats.total_devices],['بدون گزارش تازه',deviceStats.stale_devices],['خطای API',deviceStats.api_failed],['آفلاین',deviceStats.offline_devices],['باتری کم',deviceStats.low_battery],['حافظه کم',deviceStats.low_storage],['میانگین پاسخ API',deviceStats.avg_latency_ms?fa(deviceStats.avg_latency_ms)+' ms':'—']
        ].map(([k,v])=><div className="kpi" key={k}><span>{k}</span><b>{typeof v==='number'?fa(v):(v||'۰')}</b></div>)}</div>
        <div style={{overflowX:'auto'}}><table style={{minWidth:1150,fontSize:12}}><thead><tr><th>کاربر</th><th>دستگاه</th><th>نسخه</th><th>اندروید</th><th>باتری</th><th>فضای آزاد</th><th>شبکه</th><th>API</th><th>آخرین گزارش</th><th>وضعیت</th></tr></thead><tbody>
          {devices.length?devices.map(x=><tr key={x.user_id+'-'+x.device_key}><td><b>{x.user_name||'—'}</b><div className="muted">{x.role_title||''}</div></td><td>{[x.manufacturer,x.model_name].filter(Boolean).join(' ')||'—'}</td><td dir="ltr">{x.app_version||'—'}</td><td>{x.android_sdk?fa(x.android_sdk):'—'}</td><td>{x.battery_level!=null?fa(x.battery_level)+'٪':'—'}</td><td>{x.free_disk_bytes?fa(Math.round(Number(x.free_disk_bytes)/1073741824))+' GB':'—'}</td><td>{Number(x.network_connected)?'متصل':'قطع'}</td><td>{Number(x.api_ok)?fa(x.api_latency_ms||0)+' ms':'ناموفق'}</td><td>{fj(x.captured_at)}</td><td>{badge(x.health_status==='stale'?'warning':x.health_status)}</td></tr>):<tr><td colSpan="10" className="muted">هنوز گزارش سلامت دستگاهی دریافت نشده است.</td></tr>}
        </tbody></table></div>
      </div>
      <p className="muted" style={{fontSize:12,marginTop:12}}>برای ثبت دوره‌ای سلامت، کرون‌جاب را روی <code dir="ltr">/api/cron/system-health-probe?key=CRON_KEY</code> تنظیم کنید.</p>
    </>}
  </div>);
}



function CompanyRequestsAdmin(){
  const STATUS={draft:"پیش‌نویس",documents_pending:"در انتظار مدارک",payment_pending:"در انتظار پرداخت",pending_review:"در انتظار بررسی",needs_correction:"نیازمند اصلاح",approved:"تأییدشده",rejected:"ردشده",completed:"تکمیل‌شده",cancelled:"لغوشده"};
  const PAY={unpaid:"پرداخت‌نشده",pending:"در انتظار بررسی",paid:"پرداخت‌شده",rejected:"ردشده",failed:"ناموفق"};
  const DOC={technical_inspection:"معاینه فنی",insurance_policy:"بیمه‌نامه",national_card:"کارت ملی",birth_certificate_page1:"شناسنامه صفحه اول",birth_certificate_page2:"شناسنامه صفحه دوم",residence_document:"مدرک سکونت",license_front:"گواهینامه رو",license_back:"گواهینامه پشت",personal_photo:"عکس پرسنلی",vehicle_card_front:"کارت خودرو رو",vehicle_card_back:"کارت خودرو پشت",payment_receipt:"رسید پرداخت"};
  const [tab,setTab]=useState("requests"),[items,setItems]=useState([]),[q,setQ]=useState(""),[status,setStatus]=useState(""),[paymentStatus,setPaymentStatus]=useState(""),[overdueOnly,setOverdueOnly]=useState(false),[stats,setStats]=useState({}),[loading,setLoading]=useState(false),[pick,setPick]=useState(null),[detail,setDetail]=useState(null),[note,setNote]=useState(""),[settings,setSettings]=useState({}),[types,setTypes]=useState([]),[saved,setSaved]=useState(false),[err,setErr]=useState("");
  const loadStats=async()=>{try{const x=await SEND('GET','/admin/company-requests/stats');setStats(x.stats||{});}catch(e){setErr(e.message)}};
  const load=async()=>{setLoading(true);setErr("");try{const x=await SEND('GET','/admin/company-requests?'+new URLSearchParams({q,status,payment_status:paymentStatus,overdue:overdueOnly?'1':'0'}));setItems(x.items||[]);}catch(e){setErr(e.message)}finally{setLoading(false)}};
  const loadSettings=async()=>{try{const x=await SEND('GET','/admin/company-request-settings');setSettings(x.settings||{});setTypes(x.types||[]);}catch(e){setErr(e.message)}};
  useEffect(()=>{load();loadStats();loadSettings();},[]);
  const open=async(id)=>{setPick(id);setDetail(null);setNote("");try{const x=await SEND('GET','/admin/company-requests/'+id);setDetail(x.item);}catch(e){setErr(e.message)}};
  const act=async(path,body)=>{setErr("");try{await SEND('POST',path,body);await open(pick);await load();await loadStats();}catch(e){setErr(e.message)}};
  const changeStatus=async(st)=>{
    const cleanNote=String(note||'').trim();
    if((st==='rejected'||st==='cancelled')&&!cleanNote){
      setErr('برای رد یا لغو درخواست، ثبت توضیح الزامی است.');
      return;
    }
    await act('/admin/company-requests/'+pick+'/status',{status:String(st||'').trim(),note:cleanNote});
  };
  const deleteRequest=async()=>{
    if(!pick)return;
    const code=detail?.tracking_code?(' با کد رهگیری '+detail.tracking_code):'';
    if(!window.confirm('درخواست'+code+' و تمام مدارک و پرداخت‌های وابسته حذف شود؟ این عملیات قابل بازگشت نیست.'))return;
    setErr('');
    try{
      await SEND('DELETE','/admin/company-requests/'+pick,{});
      setPick(null);setDetail(null);setNote('');
      await load();await loadStats();
    }catch(e){setErr(e.message||'حذف درخواست ناموفق بود');}
  };
  const correction=()=>{if(!note.trim())return setErr('توضیح اصلاحات را وارد کنید.');act('/admin/company-requests/'+pick+'/request-correction',{note});};
  const reviewPay=(pay,decision)=>{let reason='';if(decision==='reject'){reason=prompt('علت رد پرداخت را وارد کنید:')||'';if(!reason)return;}const opNote=prompt('یادداشت اپراتور (اختیاری):')||'';act('/admin/company-requests/'+pick+'/payment-review',{payment_id:pay.id,decision,reason,note:opNote});};
  const saveSettings=async()=>{setSaved(false);setErr("");try{await SEND('POST','/admin/company-request-settings',{settings,types});setSaved(true);await loadSettings();}catch(e){setErr(e.message)}};
  const scanSla=async()=>{setErr("");try{const x=await SEND('POST','/admin/company-requests/sla-scan',{});alert(`${fa(x.count||0)} هشدار مهلت بررسی و ارسال شد.`);await loadStats();await load();}catch(e){setErr(e.message)}};
  const money=n=>fa(Number(n||0).toLocaleString('en-US'))+' ریال';
  const secureCompanyMediaUrl = path => { const clean=String(path||'').replace(/^\/+/, ''); if(!clean) return ''; const q='/api/media?path='+encodeURIComponent(clean); const token=localStorage.token||''; return token ? q+'&token='+encodeURIComponent(token) : q; };
  const fileUrl=f=>secureCompanyMediaUrl(f.processed_path||f.file_path||'');
  const thumbUrl=f=>secureCompanyMediaUrl(f.thumbnail_path||f.processed_path||f.file_path||'');
  return <div>
    <div className="row" style={{gap:8,marginBottom:14,flexWrap:'wrap'}}>
      <button className={'btn '+(tab==='requests'?'p':'')} onClick={()=>setTab('requests')}>درخواست‌ها</button>
      <button className={'btn '+(tab==='settings'?'p':'')} onClick={()=>setTab('settings')}>تعرفه و پرداخت</button>
    </div>
    {err&&<div className="panel" style={{borderColor:'var(--danger)',color:'var(--danger)',marginBottom:12}}>{err}</div>}
    {tab==='requests'&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10,marginBottom:12}}>
        {[['کل درخواست‌ها',stats.total,'📨'],['امروز',stats.today_count,'🗓'],['در انتظار بررسی',stats.pending_review,'🔎'],['نیازمند اصلاح',stats.needs_correction,'🛠'],['پرداخت‌های معلق',stats.payment_pending,'💳'],['خارج از مهلت',stats.overdue,'⏰'],['تکمیل‌شده',stats.completed,'✅']].map((x,i)=><div key={i} className="panel" style={{padding:12,borderColor:i===5&&Number(x[1])>0?'var(--danger)':undefined}}><div style={{fontSize:22}}>{x[2]}</div><b style={{fontSize:22}}>{fa(x[1]||0)}</b><div className="muted">{x[0]}</div></div>)}
      </div>
      <div className="panel"><div className="row" style={{gap:8,flexWrap:'wrap'}}>
        <input className="input" placeholder="جستجوی کد رهگیری، کاربر یا خدمت" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:330}}/>
        <select className="input" value={status} onChange={e=>setStatus(e.target.value)} style={{maxWidth:210}}><option value="">همه وضعیت‌ها</option>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} style={{maxWidth:190}}><option value="">همه پرداخت‌ها</option>{Object.entries(PAY).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <label className="row" style={{gap:6}}><input type="checkbox" checked={overdueOnly} onChange={e=>setOverdueOnly(e.target.checked)}/>فقط خارج از مهلت</label>
        <button className="btn p" onClick={()=>{load();loadStats()}}>جستجو</button><button className="btn" onClick={scanSla}>بررسی و اعلان مهلت‌ها</button>
      </div></div>
      <div className="panel" style={{overflowX:'auto'}}>{loading?<div style={{padding:24,textAlign:'center'}}>در حال دریافت…</div>:<table><thead><tr><th>کد رهگیری</th><th>متقاضی</th><th>خدمت</th><th>مبلغ</th><th>پرداخت</th><th>وضعیت</th><th>تاریخ</th><th></th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><b>{x.tracking_code}</b></td><td>{x.user_name||'—'}</td><td>{x.request_type_title}</td><td>{money(x.amount)}</td><td>{PAY[x.payment_status]||x.payment_status}</td><td>{STATUS[x.status]||x.status}{Number(x.is_overdue)===1&&<div style={{color:'var(--danger)',fontSize:11}}>خارج از مهلت</div>}</td><td>{faDate(x.created_at)}</td><td style={{color:Number(x.is_overdue)===1?'var(--danger)':undefined}}>{x.due_at?faDate(x.due_at):'—'}</td><td><button className="btn g" onClick={()=>open(x.id)}>بررسی</button></td></tr>)}{!items.length&&<tr><td colSpan="8" style={{textAlign:'center',color:'var(--muted)'}}>درخواستی یافت نشد.</td></tr>}</tbody></table>}</div>
    </>}
    {tab==='settings'&&<div className="panel">
      <h3>تعرفه خدمات</h3><div style={{overflowX:'auto'}}><table><thead><tr><th>خدمت</th><th>مبلغ (ریال)</th><th>مهلت (روز)</th><th>فعال</th><th>توضیحات</th></tr></thead><tbody>{types.map((t,i)=><tr key={t.id}><td><input className="input" value={t.title||''} onChange={e=>setTypes(types.map((z,j)=>j===i?{...z,title:e.target.value}:z))}/></td><td><input className="input" type="number" min="0" value={t.price||0} onChange={e=>setTypes(types.map((z,j)=>j===i?{...z,price:+e.target.value||0}:z))}/></td><td><input className="input" type="number" min="1" value={t.deadline_days||1} onChange={e=>setTypes(types.map((z,j)=>j===i?{...z,deadline_days:+e.target.value||1}:z))}/></td><td><input type="checkbox" checked={!!Number(t.enabled)} onChange={e=>setTypes(types.map((z,j)=>j===i?{...z,enabled:e.target.checked?1:0}:z))}/></td><td><input className="input" value={t.description||''} onChange={e=>setTypes(types.map((z,j)=>j===i?{...z,description:e.target.value}:z))}/></td></tr>)}</tbody></table></div>
      <h3 style={{marginTop:20}}>روش‌های پرداخت</h3>
      <div className="grid2">
        <div><label className="label">روش فعال</label><select className="input" value={settings.payment_mode||'both'} onChange={e=>setSettings({...settings,payment_mode:e.target.value})}><option value="both">کیف پول بله و کارت‌به‌کارت</option><option value="bale_wallet">فقط کیف پول بله</option><option value="card_to_card">فقط کارت‌به‌کارت</option></select></div>
        <div><label className="label">فعال‌بودن پرداخت بله</label><label className="row" style={{gap:8}}><input type="checkbox" checked={!!settings.bale_payment_enabled} onChange={e=>setSettings({...settings,bale_payment_enabled:e.target.checked})}/>فعال</label></div>
        <div><label className="label">توکن Provider بله</label><input className="input" type="password" value={settings.bale_provider_token||''} onChange={e=>setSettings({...settings,bale_provider_token:e.target.value})}/></div>
        <div><label className="label">تصویر صورتحساب بله (URL)</label><input className="input" dir="ltr" value={settings.bale_invoice_photo_url||''} onChange={e=>setSettings({...settings,bale_invoice_photo_url:e.target.value})}/></div>
        <div><label className="label">فعال‌بودن کارت‌به‌کارت</label><label className="row" style={{gap:8}}><input type="checkbox" checked={settings.card_payment_enabled!==false} onChange={e=>setSettings({...settings,card_payment_enabled:e.target.checked})}/>فعال</label></div><div><label className="label">نام بانک</label><input className="input" value={settings.card_bank||''} onChange={e=>setSettings({...settings,card_bank:e.target.value})}/></div>
        <div><label className="label">نام صاحب حساب</label><input className="input" value={settings.card_owner||''} onChange={e=>setSettings({...settings,card_owner:e.target.value})}/></div>
        <div><label className="label">شماره کارت</label><input className="input" dir="ltr" value={settings.card_number||''} onChange={e=>setSettings({...settings,card_number:e.target.value})}/></div>
        <div><label className="label">شماره شبا</label><input className="input" dir="ltr" value={settings.card_sheba||''} onChange={e=>setSettings({...settings,card_sheba:e.target.value})}/></div>
        <div><label className="label">مهلت ارسال رسید (ساعت)</label><input className="input" type="number" min="1" value={settings.card_receipt_deadline_hours||24} onChange={e=>setSettings({...settings,card_receipt_deadline_hours:+e.target.value||24})}/></div><div><label className="label">الزام شماره پیگیری</label><input type="checkbox" checked={settings.card_require_tracking!==false} onChange={e=>setSettings({...settings,card_require_tracking:e.target.checked})}/></div><div><label className="label">الزام مبلغ</label><input type="checkbox" checked={settings.card_require_amount!==false} onChange={e=>setSettings({...settings,card_require_amount:e.target.checked})}/></div><div><label className="label">الزام تاریخ پرداخت</label><input type="checkbox" checked={settings.card_require_paid_at!==false} onChange={e=>setSettings({...settings,card_require_paid_at:e.target.checked})}/></div><div><label className="label">حداکثر حجم هر فایل (MB)</label><input className="input" type="number" min="1" value={settings.max_upload_mb||12} onChange={e=>setSettings({...settings,max_upload_mb:+e.target.value||12})}/></div><div><label className="label">حداقل امتیاز پذیرش</label><input className="input" type="number" min="20" max="95" value={settings.quality_min_score||55} onChange={e=>setSettings({...settings,quality_min_score:+e.target.value||55})}/></div><div><label className="label">امتیاز کیفیت مناسب</label><input className="input" type="number" min="50" max="95" value={settings.quality_good_score||70} onChange={e=>setSettings({...settings,quality_good_score:+e.target.value||70})}/></div><div><label className="label">حداقل عرض تصویر</label><input className="input" type="number" min="700" value={settings.quality_min_width||1200} onChange={e=>setSettings({...settings,quality_min_width:+e.target.value||1200})}/></div><div><label className="label">حداقل ارتفاع تصویر</label><input className="input" type="number" min="450" value={settings.quality_min_height||800} onChange={e=>setSettings({...settings,quality_min_height:+e.target.value||800})}/></div><div><label className="label">عرض نسخه پردازش‌شده</label><input className="input" type="number" min="1200" max="3200" value={settings.processed_max_width||2200} onChange={e=>setSettings({...settings,processed_max_width:+e.target.value||2200})}/></div><div><label className="label">کیفیت JPEG پردازش‌شده</label><input className="input" type="number" min="60" max="95" value={settings.processed_jpeg_quality||88} onChange={e=>setSettings({...settings,processed_jpeg_quality:+e.target.value||88})}/></div><div><label className="label">کنترل اجباری کیفیت</label><label className="row" style={{gap:8}}><input type="checkbox" checked={!!settings.quality_enforce} onChange={e=>setSettings({...settings,quality_enforce:e.target.checked})}/>رد خودکار تصاویر ضعیف، تار، کم‌نور یا دارای بازتاب شدید</label></div>
        <div><label className="label">ارسال اعلان درخواست جدید برای مدیران</label><label className="row" style={{gap:8}}><input type="checkbox" checked={settings.notify_admins!==false} onChange={e=>setSettings({...settings,notify_admins:e.target.checked})}/>فعال</label></div>
        <div><label className="label">هشدار پیش از پایان مهلت (ساعت)</label><input className="input" type="number" min="1" max="168" value={settings.sla_warning_hours||24} onChange={e=>setSettings({...settings,sla_warning_hours:+e.target.value||24})}/></div>
        <div><label className="label">شناسه کاربران مدیر دریافت‌کننده اعلان</label><input className="input" dir="ltr" placeholder="مثال: 1,5,8 — خالی یعنی همه مدیران" value={(settings.notification_admin_user_ids||[]).join(',')} onChange={e=>setSettings({...settings,notification_admin_user_ids:e.target.value.split(',').map(x=>+x.trim()).filter(Boolean)})}/></div>
        <div><label className="label">توضیحات کارت‌به‌کارت</label><textarea className="input" value={settings.card_description||''} onChange={e=>setSettings({...settings,card_description:e.target.value})}/></div>
      </div>
      <div className="row" style={{gap:10,marginTop:16}}><button className="btn p" onClick={saveSettings}>ذخیره تنظیمات</button>{saved&&<span style={{color:'var(--ok)'}}>✓ ذخیره شد</span>}</div>
    </div>}
    {pick&&<div className="modal-bg" onClick={()=>{setPick(null);setDetail(null)}}><div className="modal" style={{maxWidth:1000,maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      {!detail?<div style={{padding:30,textAlign:'center'}}>در حال دریافت جزئیات…</div>:<>
        <div className="row" style={{justifyContent:'space-between',gap:10}}><h3>{detail.request_type_title} — {detail.tracking_code}</h3><button className="btn" onClick={()=>{setPick(null);setDetail(null)}}>بستن</button></div>
        <div className="grid2"><div className="panel"><b>وضعیت درخواست:</b> {STATUS[detail.status]||detail.status}<br/><b>وضعیت پرداخت:</b> {PAY[detail.payment_status]||detail.payment_status}<br/><b>مبلغ:</b> {money(detail.amount)}<br/><b>تاریخ:</b> {faDate(detail.created_at)}<br/><b>مهلت:</b> {detail.due_at?faDate(detail.due_at):'—'}{detail.admin_note&&<><br/><b>آخرین یادداشت مدیر:</b> {detail.admin_note}</>}</div><div className="panel"><b>اطلاعات فرم</b><pre style={{whiteSpace:'pre-wrap',direction:'ltr',textAlign:'left',fontSize:12}}>{JSON.stringify(detail.form_data||{},null,2)}</pre></div></div>
        <h3>مدارک ارسالی</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>{(detail.files||[]).map(f=><a key={f.id} href={fileUrl(f)} target="_blank" className="panel" style={{display:'block',textDecoration:'none',color:'inherit'}}>{String(f.mime_type||'').startsWith('image/')?<img src={thumbUrl(f)} style={{width:'100%',height:150,objectFit:'contain',borderRadius:8,background:'#f5f5f5'}}/>:<div style={{height:150,display:'grid',placeItems:'center',fontSize:44}}>📄</div>}<b>{DOC[f.document_type]||f.document_type}</b><div className="muted" style={{fontSize:11}}>{fa(Math.round((f.file_size||0)/1024))} KB</div>{f.quality_score!=null&&<div style={{fontSize:11,color:Number(f.quality_score)>=70?'var(--ok)':Number(f.quality_score)>=45?'#a66b00':'var(--danger)'}}>کیفیت: {fa(f.quality_score)} از ۱۰۰</div>}{f.quality_meta&&<details style={{fontSize:11,marginTop:5}}><summary>جزئیات کنترل کیفیت</summary>{(()=>{let q={};try{q=typeof f.quality_meta==='string'?JSON.parse(f.quality_meta):f.quality_meta||{}}catch(_){q={}}return <div style={{lineHeight:1.9,direction:'rtl',textAlign:'right'}}><div>ابعاد: {fa(q.width||0)} × {fa(q.height||0)}</div><div>روشنایی: {fa(q.brightness??'—')}</div><div>کنتراست: {fa(q.contrast??'—')}</div><div>وضوح: {fa(q.sharpness??'—')}</div><div>بازتاب نور: {fa(q.glare_percent??0)}٪</div><div>سایه شدید: {fa(q.dark_percent??0)}٪</div><div>منبع: {f.source_type==='camera'?'دوربین':f.source_type==='library'?'گالری':'نامشخص'}</div>{q.likely_screenshot&&<div style={{color:'var(--danger)'}}>احتمال اسکرین‌شات</div>}{(q.warnings||[]).map((w,i)=><div key={i} style={{color:'#a66b00'}}>• {w}</div>)}</div>})()}</details>}{f.original_path&&<div style={{display:'flex',gap:6,marginTop:6}}><a href={'/'+String(f.original_path).replace(/^\/+/, '')} target="_blank" className="btn">نسخه اصلی</a><a href={fileUrl(f)} target="_blank" className="btn">نسخه پردازش‌شده</a></div>}</a>)}</div>
        <h3 style={{marginTop:18}}>پرداخت‌ها</h3>{(detail.payments||[]).map(p=><div key={p.id} className="panel"><b>{p.method==='bale_wallet'?'کیف پول بله':'کارت‌به‌کارت'}</b> — {money(p.amount)} — {PAY[p.status]||p.status}{p.tracking_code&&<span> · پیگیری: {p.tracking_code}</span>}{p.declared_amount!=null&&<span> · مبلغ اعلامی: {money(p.declared_amount)}</span>}{p.paid_at&&<span> · زمان پرداخت: {faDate(p.paid_at)}</span>}{p.bank_name&&<span> · بانک مبدأ: {p.bank_name}</span>}{p.receipt_file_path&&<div><a href={'/'+p.receipt_file_path.replace(/^\/+/, '')} target="_blank">مشاهده رسید</a></div>}{p.method==='card_to_card'&&p.status==='pending'&&<div className="row" style={{gap:8,marginTop:8}}><button className="btn p" onClick={()=>reviewPay(p,'approve')}>تأیید پرداخت</button><button className="btn d" onClick={()=>reviewPay(p,'reject')}>رد پرداخت</button></div>}</div>)}
        <h3 style={{marginTop:18}}>اقدام مدیریتی</h3><textarea className="input" placeholder="یادداشت یا توضیح اصلاحات" value={note} onChange={e=>setNote(e.target.value)} style={{minHeight:80}}/>
        <div className="row" style={{gap:7,flexWrap:'wrap',marginTop:10}}><button className="btn" onClick={correction}>درخواست اصلاح</button><button className="btn p" onClick={()=>changeStatus('approved')}>تأیید درخواست</button><button className="btn d" onClick={()=>changeStatus('rejected')}>رد درخواست</button><button className="btn g" onClick={()=>changeStatus('completed')}>ثبت تکمیل</button><button className="btn d" style={{marginInlineStart:'auto'}} onClick={deleteRequest}>حذف درخواست</button></div>
        <div className="muted" style={{fontSize:11,marginTop:7}}>برای رد درخواست، نوشتن علت در کادر بالا الزامی است.</div>
        <h3 style={{marginTop:18}}>تاریخچه</h3><div>{(detail.logs||[]).map((l,i)=><div key={i} style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}><b>{l.user_name||'سامانه'}:</b> {l.description||l.action}<span className="muted" style={{marginInlineStart:8,fontSize:11}}>{faDate(l.created_at)}</span></div>)}</div>
      </>}
    </div></div>}
  </div>;
}


const JMONTHS=['','فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function DriverServiceReport(){
  const [nid,setNid]=useState(''); const [year,setYear]=useState(1405); const [data,setData]=useState(null); const [month,setMonth]=useState(0); const [notices,setNotices]=useState(null); const [msg,setMsg]=useState('');
  const search=async()=>{setMsg('');setMonth(0);try{const [a,n]=await Promise.all([db.driverPerformance(nid,year),db.driverNotices(nid)]);setData(a);setNotices(n);}catch(e){setMsg(e.message)}};
  const del=async(id)=>{if(!confirm('این تذکر به‌صورت فیزیکی و غیرقابل‌بازگشت حذف شود؟'))return;try{await db.deleteDriverNotice(id);setNotices(await db.driverNotices(nid));setMsg('تذکر حذف شد.')}catch(e){setMsg(e.message)}};
  const printReport=()=>window.print();
  const exportNotices=()=>{try{const rows=(notices?.rows||[]).map(x=>({'تاریخ':x.created_at||'','نوع':x.reason||'—','اولویت':x.priority||'—','شرح':x.body||'—','ثبت‌کننده':x.recorder_name||'—'}));exportXlsx(rows,'تذکرات',`driver-notices-${nid}.xlsx`)}catch(e){setMsg(e.message)}};
  const exportAnnual=()=>{try{const rows=JMONTHS.slice(1).map((name,i)=>({'ماه':name,'تعداد سرویس / ثبت حضور':Number(data?.months?.[i+1]||0)}));rows.push({'ماه':'جمع کل','تعداد سرویس / ثبت حضور':Number(data?.total||0)});exportXlsx(rows,'عملکرد سالیانه',`driver-performance-${nid}-${year}.xlsx`)}catch(e){setMsg(e.message)}};
  const exportMonth=()=>{try{if(!month)throw new Error('ابتدا یک ماه را انتخاب کنید');const rows=(data?.details?.[month]||[]).map(x=>({'تاریخ شمسی':x.jdate||'','زمان ورود':x.created_at||'','زمان خروج':x.exit_at||'باز','مدت (دقیقه)':Number(x.duration_minutes||0),'کد خط':x.line_code||'—','مبدأ':x.origin||'—','مقصد':x.destination||'—','ثبت‌کننده':x.recorder_name||'—'}));exportXlsx(rows,`ریز ${JMONTHS[month]}`,`driver-month-${nid}-${year}-${String(month).padStart(2,'0')}.xlsx`)}catch(e){setMsg(e.message)}};
  return <div className="panel"><div className="row" style={{gap:8,flexWrap:'wrap',alignItems:'end'}}><div><label className="label">کد ملی تاکسیران</label><input className="input" maxLength="10" value={nid} onChange={e=>setNid(e.target.value.replace(/\D/g,'').slice(0,10))}/></div><div><label className="label">سال شمسی</label><input className="input" style={{width:110}} value={year} onChange={e=>setYear(+e.target.value||1405)}/></div><button className="btn p" onClick={search}>جستجو و تهیه گزارش</button>{data&&<button className="btn" onClick={printReport}>چاپ / PDF</button>}{data&&<button className="btn g" onClick={exportAnnual}>خروجی Excel عملکرد سالیانه</button>}{notices&&<button className="btn g" onClick={exportNotices}>خروجی Excel تذکرات</button>}</div>{msg&&<p style={{color:msg.includes('حذف شد')?'var(--ok)':'var(--danger)'}}>{msg}</p>}
  {data&&<><h3 style={{marginTop:18}}>گزارش عملکرد {data.driver.first_name} {data.driver.last_name}</h3><div className="grid cards">{JMONTHS.slice(1).map((name,i)=>{const m=i+1,n=Number(data.months[m]||0);return <button key={m} className="card" style={{cursor:'pointer',textAlign:'center',outline:month===m?'2px solid var(--brand)':'none'}} onClick={()=>setMonth(m)}><b>{name}</b><div style={{fontSize:26,color:'var(--brand)',marginTop:8}}>{fa(n)}</div><small>سرویس / ثبت حضور</small></button>})}</div>{month>0&&<div style={{marginTop:18}}><div className="row" style={{justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><h3>ریز گزارش {JMONTHS[month]}</h3><button className="btn g" onClick={exportMonth}>خروجی Excel ریز ورود و خروج ماه</button></div><table><thead><tr><th>تاریخ</th><th>ورود</th><th>خروج</th><th>مدت</th><th>خط</th><th>ثبت‌کننده</th></tr></thead><tbody>{(data.details[month]||[]).map(x=><tr key={x.id}><td>{fa(x.jdate)}</td><td>{faDate(x.created_at)}</td><td>{x.exit_at?faDate(x.exit_at):'باز'}</td><td>{fa(x.duration_minutes||0)} دقیقه</td><td>{x.line_code||'—'} {x.origin&&x.destination?`(${x.origin}–${x.destination})`:''}</td><td>{x.recorder_name||'—'}</td></tr>)}</tbody></table></div>}</>}
  {notices&&<div style={{marginTop:24}}><h3>تذکرات ثبت‌شده ({fa(notices.total)})</h3><table><thead><tr><th>تاریخ</th><th>نوع</th><th>اولویت</th><th>شرح</th><th>ثبت‌کننده</th><th>عملیات</th></tr></thead><tbody>{notices.rows.map(x=><tr key={x.id}><td>{faDate(x.created_at)}</td><td>{x.reason||'—'}</td><td>{x.priority||'—'}</td><td>{x.body||'—'}</td><td>{x.recorder_name||'—'}</td><td><button className="btn d" onClick={()=>del(x.id)}>حذف دائمی</button></td></tr>)}</tbody></table></div>}
  </div>;
}

function pvaFa(v){return String(v??'').replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);}
function pvaEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
const PVA_CAR_PHOTOS=[['car_front','جلوی خودرو'],['car_back','پشت خودرو'],['car_right','سمت راست خودرو'],['car_left','سمت چپ خودرو'],['license_front','روی گواهینامه'],['license_back','پشت گواهینامه'],['vehicle_card_front','روی کارت خودرو'],['vehicle_card_back','پشت کارت خودرو'],['technical_inspection','معاینه فنی'],['insurance','بیمه‌نامه'],['green_card','برگ سبز']];
const PVA_MOTOR_PHOTOS=[['motor_front','جلوی موتورسیکلت'],['motor_back','پشت موتورسیکلت'],['motor_right','سمت راست موتورسیکلت'],['motor_left','سمت چپ موتورسیکلت'],['motor_card_front','کارت موتورسیکلت'],['motor_card_back','پشت کارت موتورسیکلت'],['green_card','برگ سبز'],['insurance','بیمه‌نامه'],['license_front','روی گواهینامه'],['license_back','پشت گواهینامه']];
const PVA_CAR_CHECKS=[['identity','تطبیق مشخصات خودرو با مدارک'],['plate','صحت پلاک خودرو'],['license','صحت گواهینامه و تاریخ اعتبار'],['insurance','صحت بیمه شخص ثالث و تاریخ اعتبار'],['technical','صحت معاینه فنی و تاریخ اعتبار'],['photos','صحت چهار طرف خودرو و تصاویر مدارک'],['equipment','چراغ‌گردان، گرمایش، سرمایش و آمپلی‌فایر'],['numbers','صحت شماره شاسی، موتور و VIN']];
const PVA_MOTOR_CHECKS=[['identity','تطبیق مشخصات موتورسیکلت با مدارک'],['plate','صحت پلاک موتورسیکلت'],['license','صحت گواهینامه و تاریخ اعتبار'],['insurance','صحت بیمه شخص ثالث و تاریخ اعتبار'],['photos','صحت چهار طرف موتورسیکلت و تصاویر مدارک'],['numbers','صحت شماره موتور، تنه/شاسی و سیستم موتور']];
function pvaPlate(r){return r?.asset_type==='motorcycle'?`${r.motorcycle_plate_top||''} / ${r.motorcycle_plate_bottom||''}`.trim():`${r?.plate_part_right||''} ${r?.plate_letter||''} ${r?.plate_part_left||''} ایران ${r?.plate_iran||''}`.replace(/\s+/g,' ').trim();}
function pvaStatus(s){return ({pending:'در انتظار بررسی',verified:'تأیید شده',needs_correction:'نیازمند اصلاح',draft:'پیش‌نویس'}[s]||s||'—');}
function PVAFields({a}){const motor=a.asset_type==='motorcycle';const rows=motor?[['نوع وسیله','موتورسیکلت'],['پلاک',pvaPlate(a)],['کاربری موتور',a.motorcycle_usage],['سیستم موتور',a.motorcycle_system],['تیپ موتور',a.motorcycle_type],['سوخت',a.fuel_type],['سال ساخت',pvaFa(a.model_year)],['رنگ',a.color],['سیلندر',pvaFa(a.cylinders)],['شماره موتور',a.engine_number],['شماره تنه/شاسی',a.chassis_number],['گواهینامه',a.license_number],['صدور گواهینامه',a.license_issue_date],['انقضای گواهینامه',a.license_expiry_date],['بیمه',a.insurance_number],['شروع بیمه',a.insurance_issue_date],['پایان بیمه',a.insurance_expiry_date]]:[['نوع وسیله','خودرو'],['پلاک',pvaPlate(a)],['نوع خودرو',a.vehicle_type],['سوخت',a.fuel_type],['سال ساخت',pvaFa(a.model_year)],['رنگ',a.color],['شماره شاسی',a.chassis_number],['شماره موتور',a.engine_number],['VIN',a.vin],['گواهینامه',a.license_number],['صدور گواهینامه',a.license_issue_date],['انقضای گواهینامه',a.license_expiry_date],['بیمه',a.insurance_number],['شرکت بیمه',a.insurance_company],['صدور بیمه',a.insurance_issue_date],['انقضای بیمه',a.insurance_expiry_date],['معاینه فنی',a.technical_inspection_number],['صدور معاینه',a.technical_inspection_issue_date],['انقضای معاینه',a.technical_inspection_expiry_date],['چراغگردان ثابت',Number(a.fixed_beacon)?'بله':'خیر'],['چراغگردان متحرک',Number(a.mobile_beacon)?'بله':'خیر'],['گرمایش',Number(a.heating_ok)?'سالم':'ناسالم'],['سرمایش',Number(a.cooling_ok)?'سالم':'ناسالم'],['آمپلی‌فایر',Number(a.amplifier)?'دارد':'ندارد']];return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>{rows.map(([k,v])=><div key={k} style={{border:'1px solid var(--line)',borderRadius:10,padding:9,background:'#fff'}}><small className="muted">{k}</small><div style={{fontWeight:700,marginTop:3}}>{v||'—'}</div></div>)}</div>}
function PVAHistory({history=[]}){return <div>{history.length?history.map(h=><div key={h.id} style={{borderBottom:'1px solid var(--line)',padding:'9px 0'}}><b>{h.result==='verified'?'تأیید نهایی':'نیازمند اصلاح'}</b><div className="muted" style={{fontSize:11}}>{h.checked_at||'—'} {h.checker_name?`— ${h.checker_name}`:''}</div>{h.note&&<div style={{fontSize:12,marginTop:3}}>{h.note}</div>}</div>):<div className="muted">هنوز سابقه‌ای ثبت نشده است.</div>}</div>}
function PersonnelVehicleAssets(){const [items,setItems]=useState([]),[selected,setSelected]=useState(null),[loading,setLoading]=useState(true),[q,setQ]=useState('');const load=async()=>{setLoading(true);try{const d=await GET('/personnel-vehicle-assets.php?op=list',{ttl:0});setItems(d.items||[]);}catch(e){alert(e.message)}finally{setLoading(false)}};useEffect(()=>{load()},[]);const filtered=items.filter(a=>{const s=(a.first_name+' '+a.last_name+' '+pvaPlate(a)+' '+(a.national_code||'')).toLowerCase();return !q||s.includes(q.toLowerCase())});const open=async a=>{try{const d=await GET('/personnel-vehicle-assets.php?op=detail&id='+encodeURIComponent(a.id),{ttl:0});setSelected(d.asset)}catch(e){alert(e.message)}};return <div className="panel"><div className="row" style={{justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><div><h3>ماشین‌آلات و وسایل مأموریتی</h3><p className="muted">پرونده یکپارچه خودرو و موتورسیکلت پرسنل گشت، تصاویر مدارک و آخرین وضعیت چک‌لیست.</p></div><div className="row" style={{gap:8}}><input className="input" placeholder="جستجوی نام، پلاک یا کد ملی" value={q} onChange={e=>setQ(e.target.value)}/><button className="btn g" onClick={()=>downloadProtectedFile('/personnel-vehicle-assets.php?op=export','personnel_vehicle_assets.xlsx')}>خروجی Excel + تصاویر</button></div></div>{loading?<p className="muted">در حال دریافت اطلاعات…</p>:<div style={{display:'grid',gridTemplateColumns:'minmax(250px,32%) 1fr',gap:10}}><div style={{display:'grid',gap:7,maxHeight:650,overflow:'auto'}}>{filtered.map(a=><button key={a.id} type="button" onClick={()=>open(a)} style={{textAlign:'right',border:'1px solid var(--line)',background:'#fff',borderRadius:12,padding:10,cursor:'pointer',outline:selected?.id===a.id?'2px solid var(--brand)':'none'}}><b>{pvaPlate(a)||'بدون پلاک'}</b><div style={{fontSize:12}}>{a.first_name} {a.last_name} — {a.asset_type==='car'?'خودرو':'موتورسیکلت'}</div><div className="muted" style={{fontSize:11}}>{pvaStatus(a.status)} · آخرین چک‌لیست: {a.checklist_last_at||'—'}</div></button>)}{!filtered.length&&<div className="muted" style={{padding:20,textAlign:'center'}}>پرونده‌ای یافت نشد.</div>}</div><div style={{background:'#f8fafc',border:'1px solid var(--line)',borderRadius:14,padding:14}}>{selected?<PVAAssetDetail asset={selected}/>:<div className="muted" style={{padding:30,textAlign:'center'}}>برای مشاهده مشخصات، یک خودرو یا موتورسیکلت را انتخاب کنید.</div>}</div></div>}</div>}
function PVAAssetDetail({asset:a}){return <div><div className="row" style={{justifyContent:'space-between',alignItems:'start'}}><div><h3>{a.asset_type==='car'?'خودرو':'موتورسیکلت'} — {pvaPlate(a)}</h3><div className="muted">{a.first_name} {a.last_name} · {a.role_title||'—'} · وضعیت: {pvaStatus(a.status)}</div></div></div><div className="panel"><h4>مشخصات کامل</h4><PVAFields a={a}/></div><div className="panel"><h4>تصاویر و مدارک</h4><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>{(a.photos||[]).map(p=><figure key={p.photo_key} style={{margin:0,border:'1px solid var(--line)',borderRadius:10,padding:6}}><img src={p.data_uri} style={{width:'100%',height:120,objectFit:'contain',background:'#f5f6f8',borderRadius:7}}/><figcaption style={{fontSize:10,textAlign:'center'}}>{p.photo_key}</figcaption></figure>)}</div></div><div className="panel"><h4>تاریخچه چک‌لیست</h4><PVAHistory history={a.checklist_history||[]}/></div></div>}
function PersonnelVehicleChecklist(){const [items,setItems]=useState([]),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null),[checks,setChecks]=useState({}),[note,setNote]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);const load=async()=>{setLoading(true);try{const d=await GET('/personnel-vehicle-assets.php?op=checklist-list',{ttl:0});setItems(d.items||[])}catch(e){alert(e.message)}finally{setLoading(false)}};useEffect(()=>{load()},[]);const open=async a=>{setSelected(a);setLoading(true);try{const d=await GET('/personnel-vehicle-assets.php?op=detail&id='+encodeURIComponent(a.id),{ttl:0});const x=d.asset||a;setDetail(x);const m={};(x.checks||[]).forEach(c=>m[c.check_key]=!!Number(c.check_value));setChecks(m);setNote(x.checklist_note||'')}catch(e){alert(e.message)}finally{setLoading(false)}};const motor=detail?.asset_type==='motorcycle',list=motor?PVA_MOTOR_CHECKS:PVA_CAR_CHECKS;const submit=async approved=>{const missing=list.filter(([k])=>checks[k]===undefined);if(missing.length){alert('تمام موارد چک‌لیست را تعیین تکلیف کنید.');return}if(approved&&list.some(([k])=>checks[k]!==true)){alert('برای تأیید نهایی همه موارد باید تأیید شده باشند.');return}setSaving(true);try{await SEND('POST','/personnel-vehicle-assets.php?op=checklist-verify',{asset_id:detail.id,approved,checks:Object.fromEntries(list.map(([k])=>[k,{value:!!checks[k],note:''}])),note});alert(approved?'وسیله تأیید شد.':'وسیله برای اصلاح برگشت داده شد.');setSelected(null);setDetail(null);await load()}catch(e){alert(e.message)}finally{setSaving(false)}};if(loading&&!detail)return <div className="panel"><p className="muted">در حال دریافت اطلاعات…</p></div>;return <div className="panel"><h3>چک‌لیست خودرویی و موتوری</h3>{!detail?<><p className="muted">پلاک را انتخاب کنید تا مشخصات کامل، تصاویر مدارک و سوابق چک‌لیست نمایش داده شود.</p><div style={{display:'grid',gap:8}}>{items.map(a=><button key={a.id} type="button" onClick={()=>open(a)} style={{textAlign:'right',background:'#fff',border:'1px solid var(--line)',borderRadius:12,padding:12,cursor:'pointer'}}><b>{pvaPlate(a)}</b><div>{a.first_name} {a.last_name} — {a.asset_type==='car'?'خودرو':'موتورسیکلت'}</div><small className="muted">{pvaStatus(a.status)} · {a.checklist_count?`${pvaFa(a.checklist_count)} بار بررسی شده`: 'بدون سابقه'}</small></button>)}{!items.length&&<div className="muted">هنوز وسیله‌ای برای بررسی ثبت نشده است.</div>}</div></>:<><button className="btn g" onClick={()=>{setDetail(null);setSelected(null)}}>بازگشت به فهرست</button><div className="panel"><h4>مشخصات و مالک</h4><PVAFields a={detail}/></div><div className="panel"><h4>تصاویر و مدارک</h4><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>{(detail.photos||[]).map(p=><figure key={p.photo_key} style={{margin:0}}><img src={p.data_uri} style={{width:'100%',height:130,objectFit:'contain',border:'1px solid var(--line)',borderRadius:10}}/><figcaption style={{fontSize:10,textAlign:'center'}}>{p.photo_key}</figcaption></figure>)}</div></div><div className="panel"><h4>تاریخچه قبلی</h4><PVAHistory history={detail.checklist_history||[]}/></div><div className="panel"><h4>بررسی چک‌لیست</h4>{list.map(([k,t])=><div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--line)'}}><b style={{fontSize:13}}>{t}</b><div className="row" style={{gap:6}}><button className={'btn '+(checks[k]===true?'p':'')} onClick={()=>setChecks(x=>({...x,[k]:true}))}>تأیید</button><button className={'btn '+(checks[k]===false?'d':'')} onClick={()=>setChecks(x=>({...x,[k]:false}))}>رد</button></div></div>)}<label className="label" style={{display:'block',marginTop:12}}>توضیحات</label><textarea className="input" rows="4" value={note} onChange={e=>setNote(e.target.value)}/><div className="row" style={{gap:8,marginTop:10}}><button className="btn d" disabled={saving} onClick={()=>submit(false)}>نیازمند اصلاح</button><button className="btn p" disabled={saving} onClick={()=>submit(true)}>{saving?'در حال ثبت…':'تأیید نهایی'}</button></div></div></> }</div>}

const VIEWS={
  covertselfies:{t:"سلفی‌های نامحسوس",ic:"📸",c:CovertSelfies},
  dashboard:{t:"داشبورد مدیریت",ic:"▦",c:Dashboard},
  reportscenter:{t:"مرکز گزارش‌ها",ic:"🗂",c:ReportsCenter},
  health:{t:"داشبورد سلامت سامانه",ic:"◉",c:SystemHealthDashboard},
  map:{t:"نقشهٔ زندهٔ نیروها",ic:"◎",c:LiveMap},
  present:{t:"آمار لحظه‌ای حاضرین در خطوط",ic:"🧍",c:PresentStats},
  presentchart:{t:"نمودار زندهٔ رانندگان حاضر",ic:"📊",c:PresentChart},
  officials:{t:"حضور مسئولین در خط",ic:"👤",c:Officials},
  messages:{t:"پیام‌رسانی به نیروها",ic:"✉",c:Messages},
  salaryslips:{t:"بارگذاری فیش حقوقی",ic:"💳",c:SalarySlipsAdmin},
  messengercenter:{t:"مرکز ارسال ربات‌ها",ic:"🤖",c:MessengerCenterPanel},
  companyrequests:{t:"مدارک ارسالی شرکت",ic:"📨",c:CompanyRequestsAdmin},
  users:{t:"مدیریت کاربران",ic:"☷",c:Users},
  zones:{t:"منطقه‌بندی نیروها",ic:"⬡",c:Zones},
  org:{t:"چارت سازمانی",ic:"⤢",c:OrgChart},
  drivers:{t:"رانندگان و خودروها",ic:"<img>",c:Drivers},
  platetraining:{t:"پلاک‌خوان",ic:"🔎",c:PlateTrainingPanel},
  driverservicereport:{t:"عملکرد و تذکرات تاکسیران",ic:"📈",c:DriverServiceReport},
  lines:{t:"خطوط تاکسیرانی",ic:"⇄",c:Lines},
  bills:{t:"آبونمان و فیش‌ها",ic:"₪",c:Bills},
  config:{t:"تذکرات و چک‌لیست",ic:"✎",c:Config},
  forms:{t:"فرم‌ساز",ic:"▤",c:FormBuilder},
  reports:{t:"گردش گزارش‌ها",ic:"✉",c:Reports},
  report:{t:"گزارش‌گیری پیشرفته",ic:"📊",c:Reporting},
  perfreport:{t:"گزارش عملکرد پرسنل",ic:"🏆",c:PersonnelPerformance},
  welfare:{t:"رفاهیات روابط عمومی",ic:"🎁",c:Welfare},
  cultural:{t:"فعالیت‌های فرهنگی",ic:"🎭",c:Cultural},
  excel:{t:"ورود اطلاعات (اکسل)",ic:"⤓",c:ExcelImport},
  logs:{t:"لاگ فعالیت‌ها",ic:"⎘",c:Logs},
  useract:{t:"فعالیت کاربران",ic:"⏱",c:UserActivity},
  commitments:{t:"تعهدات انضباطی",ic:"📋",c:Commitments},
  tempdrivers:{t:"رانندگان موقت",ic:"🚕",c:TempDriversPanel},
  presence:{t:"صحت‌سنجی حضور",ic:"📸",c:PresenceChecks},
  sms:{t:"ارسال پیامک",ic:"✉",c:SmsSend},
  smslog:{t:"تاریخچهٔ پیامک",ic:"📜",c:SmsLog},
  attendance:{t:"حضور نیروها",ic:"🕒",c:StaffAttendance},
  shifts:{t:"شیفت و کارکرد",ic:"🗓",c:ShiftManager},
  attreport:{t:"گزارش تردد پرسنل",ic:"🕒",c:AttendanceReport},
  workpolicy:{t:"سیاست کاری",ic:"📐",c:WorkPolicy},
  requests:{t:"گزارش درخواست‌ها",ic:"📋",c:AdminRequests},
  outages:{t:"قطعی سیستم نوبت‌دهی",ic:"⛔",c:OutageReport},
  missiondashboard:{t:"داشبورد عملیات میدانی",ic:"🧭",c:MissionOperationsDashboard},
  citydashboard:{t:"داشبورد مدیریتی کل‌شهر",ic:"🏙",c:CityOperationsDashboard},
  missiontemplates:{t:"موتور مأموریت — الگوها و تنظیمات",ic:"🎯",c:MissionTemplatesAdmin},
  scoreengine:{t:"موتور امتیازدهی",ic:"🏆",c:ScoreEngineAdmin},
  customfields:{t:"فیلدهای سفارشی",ic:"🧩",c:CustomFieldsManager},
  inventory:{t:"اقلام تحویلی",ic:"📦",c:InventoryAdmin},
  appitems:{t:"آیتم‌های اپ هر سمت",ic:"📱",c:RoleAppItemsView},
  cronstatus:{t:"پایش سلامت کرون‌ها",ic:"⏱",c:CronStatusView},
  activesessions:{t:"جلسات فعال کاربران",ic:"🔐",c:ActiveSessionsView},
  radiocenter:{t:"مرکز بی‌سیم",ic:"📻",c:RadioCenter},
  vehicleassets:{t:"ماشین‌آلات و وسایل مأموریتی",ic:"🚙",c:PersonnelVehicleAssets},
  vehiclechecklist:{t:"چک‌لیست خودرویی و موتوری",ic:"☑",c:PersonnelVehicleChecklist},
  settings:{t:"تنظیمات سامانه",ic:"⚙",c:Settings},
};

function Login({onLogin,brand}){
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState("");
  const [mode,setMode]=useState("login"); const [code,setCode]=useState(""); const [np,setNp]=useState(""); const [info,setInfo]=useState("");
  const submit=async()=>{ try{ const d=await db.login(u,p); onLogin(d.user); }catch(e){ setErr(e.message); } };
  const sendCode=async()=>{ setErr("");setInfo(""); try{ await SEND('POST','/auth/forgot-password',{username:u}); setInfo("اگر نام کاربری معتبر باشد، کد بازیابی پیامک شد."); setMode("reset"); }catch(e){ setErr(e.message); } };
  const doReset=async()=>{ setErr("");setInfo(""); try{ await SEND('POST','/auth/reset-password',{username:u,code,password:np}); setInfo("رمز با موفقیت تغییر کرد. اکنون وارد شوید."); setMode("login"); setP(""); }catch(e){ setErr(e.message); } };
  return(<div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--paper)"}}>
    <div className="panel" style={{width:380}}>
      <div style={{textAlign:"center",marginBottom:18}}>{brand?.logo?<img src={brand.logo} style={{margin:"0 auto 10px",width:58,height:58,borderRadius:14,objectFit:"contain",background:"#fff",padding:5,border:"1px solid var(--line)"}}/>:<img src="/brand-khatyar.png" style={{margin:"0 auto 10px",width:58,height:58,borderRadius:29,objectFit:"cover"}}/>}
        <h3 style={{justifyContent:"center"}}>ورود به {brand?.title||"خطیار"}</h3></div>
      <input className="input" placeholder="نام کاربری (کد ملی)" value={u} onChange={e=>setU(e.target.value)} style={{marginBottom:10}}/>
      {mode==="login"&&<>
        <input className="input" type="password" placeholder="رمز عبور" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        <button className="btn p" style={{width:"100%",marginTop:14}} onClick={submit}>ورود</button>
        <p style={{textAlign:"center",marginTop:10}}><a style={{fontSize:12,color:"var(--brand)",cursor:"pointer"}} onClick={()=>{setErr("");setInfo("");setMode("forgot");}}>فراموشی رمز عبور</a></p>
      </>}
      {mode==="forgot"&&<>
        <p style={{fontSize:12,color:"var(--muted)",marginBottom:8}}>نام کاربری خود را وارد کنید تا کد بازیابی به موبایل ثبت‌شده پیامک شود.</p>
        <button className="btn p" style={{width:"100%"}} onClick={sendCode}>ارسال کد بازیابی</button>
        <p style={{textAlign:"center",marginTop:10}}><a style={{fontSize:12,color:"var(--muted)",cursor:"pointer"}} onClick={()=>setMode("login")}>بازگشت به ورود</a></p>
      </>}
      {mode==="reset"&&<>
        <input className="input" dir="ltr" placeholder="کد بازیابی پیامک‌شده" value={code} onChange={e=>setCode(e.target.value)} style={{marginBottom:10}}/>
        <input className="input" type="password" placeholder="رمز عبور جدید" value={np} onChange={e=>setNp(e.target.value)}/>
        <button className="btn p" style={{width:"100%",marginTop:14}} onClick={doReset}>تغییر رمز</button>
        <p style={{textAlign:"center",marginTop:10}}><a style={{fontSize:12,color:"var(--muted)",cursor:"pointer"}} onClick={()=>setMode("login")}>بازگشت به ورود</a></p>
      </>}
      {info&&<p style={{color:"var(--ok)",fontSize:12,marginTop:8}}>{info}</p>}
      {err&&<p style={{color:"var(--danger)",fontSize:12,marginTop:8}}>{err}</p>}
    </div></div>);
}

function App(){
  const [me,setMe]=useState(null); const [v,setV]=useState("dashboard"); const [allowed,setAllowed]=useState(null); const [drawer,setDrawer]=useState(false); const [brand,setBrand]=useState({});
  const [openSections,setOpenSections]=useState({"داشبورد و پایش":true,"عملیات میدانی":true,"تاکسی و تاکسیران":false,"گزارش‌ها":false,"منابع انسانی":false,"ارتباطات":false,"مدیریت سامانه":false});
  useEffect(()=>{ db.publicSettings().then(s=>{ const b={title:s.site_title||s.org_title||"خطیار", logo:s.site_logo||s.org_logo||""}; setBrand(b); document.title=b.title; window.__brandLogo=b.logo; }).catch(()=>{}); },[]);
  useEffect(()=>{ if(me&&me.is_admin){ db.settings().then(s=>{ const all=s.role_perms||{}; const has=Object.prototype.hasOwnProperty.call(all,String(me.role_id))||Object.prototype.hasOwnProperty.call(all,me.role_id); const rp=all[me.role_id]; setAllowed(has&&Array.isArray(rp)?rp:null); const b={title:s.site_title||s.org_title||"خطیار", logo:s.site_logo||s.org_logo||""}; setBrand(b); document.title=b.title; window.__brandLogo=b.logo; }).catch(()=>setAllowed(null)); } },[me]);
  if(!me)return <Login onLogin={setMe} brand={brand}/>;
  if(!me.is_admin) return (<div style={{minHeight:"100vh",display:"grid",placeItems:"center",textAlign:"center",padding:24}}>
    <div><h2 style={{color:"var(--danger)"}}>دسترسی مدیریتی ندارید</h2>
    <p style={{color:"var(--muted)",maxWidth:430,lineHeight:2,marginTop:8}}>ورود به سامانه مدیریت و نظارت بر خطوط و نیروهای اجرایی تاکسیرانی تنها برای نیروی اداری، نیروی اداری ارشد، رییس اداره بازرسی و مدیر کل مجاز است. برای کارهای میدانی از اپ موبایل/وب‌اپ استفاده کنید.</p>
    <button className="btn p" style={{marginTop:16}} onClick={()=>{localStorage.removeItem("token");setMe(null);}}>خروج</button></div></div>);
  const CORE_VIEWS=["dashboard","driverservicereport"];
  const vk=(!allowed||allowed.includes(v)||CORE_VIEWS.includes(v))?v:"dashboard"; const View=VIEWS[vk].c;
  window.__navigateTo = (k)=>{ setV(k); setDrawer(false); };
  const SECTIONS=[
    ["داشبورد و پایش",["dashboard","reportscenter","health","map","present","presentchart"]],
    ["عملیات میدانی",["missiondashboard","citydashboard","missiontemplates","scoreengine","officials","presence","attendance","companyrequests","outages","covertselfies"]],
    ["تاکسی و تاکسیران",["drivers","driverservicereport","tempdrivers","lines","zones","bills"]],
    ["گزارش‌ها",["reports","report","perfreport","attreport","useract"]],
    ["منابع انسانی",["shifts","workpolicy","requests","salaryslips","commitments","welfare","cultural"]],
    ["ارتباطات",["messages","sms","smslog","messengercenter","radiocenter"]],
    ["مدیریت سامانه",["users","org","forms","config","customfields","inventory","excel","appitems","cronstatus","activesessions","logs","settings"]],
  ];
  const CORE=["dashboard","driverservicereport"];
  const MENU_ICONS={
    dashboard:'dashboard-home', reportscenter:'reports-folder', health:'system-health', map:'city-map', present:'present-group', presentchart:'presence-chart',
    missiondashboard:'performance-gauge', citydashboard:'city-map', missiontemplates:'forms-pen', scoreengine:'reports-folder',
    officials:'official-badge', presence:'self-checkin', attendance:'attendance-register', companyrequests:'company-envelope', outages:'service-outage', covertselfies:'covert-camera',
    drivers:'driver-id', driverservicereport:'driver-service-chart', tempdrivers:'temporary-driver-clock', lines:'route-line', zones:'zone-grid', bills:'billing-receipt',
    reports:'reports-folder', report:'report-send', perfreport:'performance-gauge', attreport:'attendance-calendar', useract:'user-activity',
    shifts:'shift-cycle', workpolicy:'work-policy', requests:'request-form', salaryslips:'salary-slip', commitments:'commitment-sign', welfare:'welfare-gift', cultural:'cultural-book',
    messages:'messages-mail', sms:'sms-phone', smslog:'sms-history', messengercenter:'messenger-bot', radiocenter:'radio-tower', users:'users-admin', org:'organization-tree', forms:'forms-pen',
    config:'system-config', customfields:'custom-fields', inventory:'request-box', excel:'excel-upload', appitems:'app-menu', cronstatus:'system-health', activesessions:'security-lock', logs:'audit-logs', settings:'settings-gears'
  };
  const can=(k)=>!allowed||allowed.includes(k)||CORE.includes(k);
  const closeOnPick=(k)=>{ setV(k); setDrawer(false); };
  return(<div className={"layout"+(drawer?" drawer-open":"")}>
    <div className="scrim" onClick={()=>setDrawer(false)}></div>
    <aside className="side"><div className="brand">{brand.logo?<img src={brand.logo} style={{width:38,height:38,borderRadius:10,objectFit:"contain",background:"#fff",padding:3}}/>:<img src="/brand-khatyar.png" style={{width:38,height:38,borderRadius:19,objectFit:"cover"}}/>}<span>{brand.title||"خطیار"}</span></div>
      <nav className="nav" style={{flex:1}}>{SECTIONS.map(([title,keys])=>{ const ks=keys.filter(k=>VIEWS[k]&&can(k)); if(!ks.length)return null; const open=!!openSections[title];
        return(<div key={title} className={"navsec"+(open?" open":"")}>
          <button className="navsec-head" onClick={()=>setOpenSections(cur=>({...cur,[title]:!cur[title]}))} aria-expanded={open}>
            <span>{title}</span><span className="nav-chevron">‹</span>
          </button>
          <div className="navsec-body" style={{maxHeight:open?`${ks.length*60}px`:'0px',opacity:open?1:0}}>
            {ks.map(k=><button key={k} className={"navitem "+(v===k?"on":"")} onClick={()=>closeOnPick(k)}><span className="ic">{I8(MENU_ICONS[k])}</span><span className="navlabel">{VIEWS[k].t}</span></button>)}
          </div>
        </div>); })}
        <button className="navitem logout-item" onClick={()=>{localStorage.removeItem("token");setMe(null);}}><span className="ic">{I8('logout-door')}</span><span className="navlabel">خروج</span></button></nav>
      <div className="apibar">
        <div>برنامه‌نویسی و راه‌اندازی شده توسط شرکت مبین شات مشهد (خرداد ۱۴۰۵)</div>
        <div style={{marginTop:4,opacity:.85}}>نسخهٔ سایت {(window.__health&&window.__health.site_version)?fa(window.__health.site_version):"—"} · <span style={{color:(window.__health?"#16a06a":"#e3403e")}}>{window.__health?"متصل به سرور":"قطع"}</span></div>
      </div></aside>
    <main className="main"><div className="top">
      <button className="burger" onClick={()=>setDrawer(d=>!d)}>☰</button>
      <h2>{VIEWS[vk].t}</h2>
      <div className="who"><span>{me.name} — {me.role}{me.rank_stars?" · "+"★".repeat(Math.max(0,Math.min(5,+me.rank_stars))):""}</span><div className="av">{(me.name||"؟")[0]}</div></div></div>
      <View/></main></div>);
}

(async ()=>{
  const ok = await checkConnection();
  const root = document.getElementById("root");
  if(!ok){ root.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px;font-family:Vazirmatn"><div><h2 style="color:#e23b54">اتصال به سرور برقرار نشد</h2><p style="color:#6b7890;max-width:420px;line-height:2">این پنل باید از آدرس سرور باز شود (مثل https://app.yousefipour.ir/). لطفاً آدرس <b>/api/health</b> را بررسی کنید و مطمئن شوید نصب کامل شده است.</p></div></div>'; return; }
  console.log("PANEL BUILD: 2026-09-05-v218 (users-hierarchy-radio-attendance-vehicle-fix)");
  ReactDOM.createRoot(root).render(<App/>);
})();
