<?php
// Independent school complaint workflow. Existing personnel identity is authoritative.
function sc_config(): array {
 $r=Db::one('SELECT config FROM school_complaint_settings WHERE id=1');
 return $r ? (json_decode($r['config'],true)?:[]) : [];
}
// Persist the notification in the same transaction as the case transition.
function sc_notify($uid,$id,$title): void {
 Db::run("INSERT INTO notifications(user_id,title,body,data) VALUES(?,?,?,?)",[(int)$uid,$title,'برای مشاهده پرونده به صندوق شکایات سرویس مدارس مراجعه کنید.',json_encode(['type'=>'school_complaint','complaint_id'=>(int)$id],JSON_UNESCAPED_UNICODE)]);
}
function sc_overdue_scan(): int {
 $rows=Db::all("SELECT c.id FROM school_complaints c WHERE c.status<>'closed' AND c.due_at<NOW() ORDER BY c.due_at LIMIT 250");
 $count=0;$db=Db::pdo();
 foreach($rows as $candidate){
  $db->beginTransaction();
  try{
   $r=Db::one("SELECT id,assigned_to,supervisor_id,status,due_at FROM school_complaints WHERE id=? AND status<>'closed' AND due_at<NOW() FOR UPDATE",[$candidate['id']]);
   if($r){
    $stage=Db::one("SELECT id FROM school_complaint_events WHERE complaint_id=? AND action IN ('created','escalate','return') ORDER BY id DESC LIMIT 1",[$r['id']]);
    if($stage)foreach(array_unique([(int)$r['assigned_to'],(int)$r['supervisor_id']]) as $uid){
     if(!$uid)continue;
     $added=Db::exec("INSERT IGNORE INTO school_complaint_overdue_notices(complaint_id,stage_event_id,recipient_id) VALUES(?,?,?)",[$r['id'],$stage['id'],$uid]);
     if($added){sc_notify($uid,$r['id'],'پایان مهلت رسیدگی به شکایت سرویس مدارس');$count++;}
    }
   }
   $db->commit();
  }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
 }
 return $count;
}
function sc_access($u): array {
 $c=sc_config();$id=(int)$u['id'];$admin=!empty($u['is_admin']);
 $role=Db::one("SELECT value FROM app_settings WHERE `key`='role_perms'");
 $perms=$role?json_decode($role['value'],true):[];
 $allowed=$admin||in_array('schoolcomplaints',(array)($perms[(string)$u['role_id']]??[]),true);
 $receive=$admin||in_array($id,array_map('intval',(array)($c['receivers']??[])),true);
 $review=$id===(int)($c['reviewer']??0);$super=$id===(int)($c['supervisor']??0);
 return ['allowed'=>$allowed||$receive||$review||$super,'receive'=>$receive,'review'=>$review,'supervisor'=>$super,'admin'=>$admin];
}
function sc_need($u,$cap='allowed'): array {
 $a=sc_access($u);if(empty($a[$cap]))Http::error('دسترسی مجاز نیست',403);return $a;
}
function sc_text($v,$max,$required=true): string {
 if(!is_string($v))Http::error('مقدار نامعتبر است',422);
 $v=trim($v);if(($required&&$v==='')||mb_strlen($v)>$max)Http::error('اطلاعات ناقص یا طولانی است',422);return $v;
}
function sc_phone($v,$type): string {
 $v=sc_text($v,30);
 $v=strtr($v,array_combine(preg_split('//u','۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',-1,PREG_SPLIT_NO_EMPTY),str_split('01234567890123456789')));
 $v=preg_replace('/[\s()\-]+/u','',$v);
 if(str_starts_with($v,'+98'))$v='0'.substr($v,3);
 if(str_starts_with($v,'0098'))$v='0'.substr($v,4);
 if(!preg_match($type==='driver'?'/^09[0-9]{9}$/D':'/^0[1-9][0-9]{9}$/D',$v))Http::error('شماره تماس معتبر وارد کنید',422);
 return $v;
}
function sc_deadline($hours): string {
 return (new DateTimeImmutable('now',new DateTimeZone('Asia/Tehran')))->modify('+'.(int)$hours.' hours')->format('Y-m-d H:i:s');
}
function sc_date($v): string {
 $v=sc_text($v,19);$d=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$v,new DateTimeZone('Asia/Tehran'));
 if(!$d||$d->format('Y-m-d H:i:s')!==$v)Http::error('تاریخ نامعتبر است',422);return $v;
}
// Overall SLA is fixed at creation from the two snapshotted stage budgets.
// Each completed stage is measured against the preceding assignment event.
function sc_overall_due_expr(): string {
 return "TIMESTAMPADD(HOUR,c.review_hours+c.supervisor_hours,c.created_at)";
}
function sc_completed_on_time_expr(): string {
 $overall=sc_overall_due_expr();
 return "(c.status='closed' AND c.closed_at<=$overall AND c.closed_at<=c.due_at AND NOT EXISTS (
 SELECT 1 FROM school_complaint_events finish
 JOIN school_complaint_events stage ON stage.id=(
 SELECT MAX(prev.id) FROM school_complaint_events prev
 WHERE prev.complaint_id=finish.complaint_id AND prev.id<finish.id AND prev.action IN ('created','escalate','return'))
 WHERE finish.complaint_id=c.id AND finish.action IN ('escalate','return','close')
 AND finish.created_at>TIMESTAMPADD(HOUR,CASE WHEN stage.action='escalate' THEN c.supervisor_hours ELSE c.review_hours END,stage.created_at)
 ))";
}
function sc_allowed_actions($r,$u): array {
 if($r['status']==='closed'||(int)$r['assigned_to']!==(int)$u['id'])return [];
 $status=$r['status'];$actions=['note'];
 if(in_array($status,['pending','returned'],true))$actions[]='start';
 if(in_array($status,['pending','in_progress','returned','escalated'],true))$actions[]='reply';
 if(in_array($status,['pending','in_progress','answered','returned'],true))$actions[]='escalate';
 if($status==='escalated'&&(int)$r['supervisor_id']===(int)$u['id']){$actions[]='return';$actions[]='close';}
 elseif($status==='answered'&&!(sc_config()['require_supervisor']??true))$actions[]='close';
 return $actions;
}
function sc_case($id,$u): array {
 $a=sc_need($u);$r=Db::one('SELECT * FROM school_complaints WHERE id=?',[$id]);
 if(!$r)Http::error('پرونده یافت نشد',404);
 if(!$a['admin']&&(int)$r['created_by']!==(int)$u['id']&&(int)$r['assigned_to']!==(int)$u['id']&&(int)$r['supervisor_id']!==(int)$u['id']&&!Db::one('SELECT id FROM school_complaint_events WHERE complaint_id=? AND actor_id=? LIMIT 1',[$id,$u['id']]))Http::error('دسترسی به پرونده مجاز نیست',403);
 $r['school_snapshot']=json_decode($r['school_snapshot'],true);$r['company_snapshot']=json_decode($r['company_snapshot'],true);
 $r['allowed_actions']=sc_allowed_actions($r,$u);
 $r['can_act']=!empty($r['allowed_actions']);
 $overall=(new DateTimeImmutable($r['created_at'],new DateTimeZone('Asia/Tehran')))->modify('+'.((int)$r['review_hours']+(int)$r['supervisor_hours']).' hours');
 $r['overall_due_at']=$overall->format('Y-m-d H:i:s');
 $r['overall_remaining_minutes']=(int)floor(($overall->getTimestamp()-time())/60);
 $r['overall_overdue']=$r['status']==='closed' ? $r['closed_at']>$r['overall_due_at'] : $r['overall_remaining_minutes']<0;
 $r['can_attach']=$r['status']!=='closed'&&((int)$r['assigned_to']===(int)$u['id']||(int)$r['created_by']===(int)$u['id']);
 $r['assigned_name']=Db::one("SELECT CONCAT_WS(' ',first_name,last_name) name FROM users WHERE id=?",[$r['assigned_to']])['name']??'';
 $r['remaining_minutes']=(int)floor(((new DateTimeImmutable($r['due_at'],new DateTimeZone('Asia/Tehran')))->getTimestamp()-time())/60);
 $r['overdue']=$r['status']!=='closed'&&new DateTimeImmutable($r['due_at'],new DateTimeZone('Asia/Tehran'))<new DateTimeImmutable('now');
 return $r;
}
function sc_list($u,$inbox=false,$summary=false): array {
 $a=sc_need($u);$w=['1=1'];$p=[];
 if($inbox){$w[]='(c.assigned_to=? OR EXISTS (SELECT 1 FROM school_complaint_events e WHERE e.complaint_id=c.id AND e.actor_id=?))';array_push($p,$u['id'],$u['id']);}
 elseif(!$a['admin']){$w[]='(c.created_by=? OR c.assigned_to=? OR c.supervisor_id=? OR EXISTS (SELECT 1 FROM school_complaint_events e WHERE e.complaint_id=c.id AND e.actor_id=?))';array_push($p,$u['id'],$u['id'],$u['id'],$u['id']);}
 foreach(['school_id','company_id'] as $k)if(!empty($_GET[$k])){$w[]="c.$k=?";$p[]=(int)$_GET[$k];}
 foreach(['first_name','last_name','phone'] as $k)if(!empty($_GET[$k])){$w[]="c.$k LIKE ?";$p[]='%'.sc_text($_GET[$k],100).'%';}
 foreach(['from'=>'>=','to'=>'<='] as $k=>$op)if(!empty($_GET[$k])){$w[]="c.received_at $op ?";$p[]=sc_date($_GET[$k]);}
 foreach(['status','complainant_type','tracking_code','subject'] as $k)if(isset($_GET[$k])&&$_GET[$k]!==''){$w[]="c.$k=?";$p[]=sc_text($_GET[$k],255);}
 if(!empty($_GET['district'])){$w[]="JSON_UNQUOTE(JSON_EXTRACT(c.school_snapshot,'$.educational_district'))=?";$p[]=sc_text($_GET['district'],100);}
 foreach(['closed_from'=>'>=','closed_to'=>'<='] as $k=>$op)if(!empty($_GET[$k])){$w[]="c.closed_at $op ?";$p[]=sc_date($_GET[$k]);}
 foreach(['assigned_to','created_by','supervisor_id'] as $k)if(!empty($_GET[$k])){$w[]="c.$k=?";$p[]=(int)$_GET[$k];}
 if(($_GET['overdue']??'')==='1')$w[]="(c.status<>'closed' AND c.due_at<NOW())";
 $where=implode(' AND ',$w);
 if($summary){$onTime=sc_completed_on_time_expr();$overallDue=sc_overall_due_expr();$metrics=Db::one("SELECT COUNT(*) total,COALESCE(SUM(c.status='pending'),0) pending,COALESCE(SUM(c.status='in_progress'),0) in_progress,COALESCE(SUM(c.status='answered'),0) answered,COALESCE(SUM(c.status='returned'),0) returned,COALESCE(SUM(c.status='escalated'),0) escalated,COALESCE(SUM(c.status='closed'),0) closed,COALESCE(SUM(c.status<>'closed' AND c.due_at<NOW()),0) overdue,COALESCE(SUM(c.complainant_type='parent'),0) parents,COALESCE(SUM(c.complainant_type='driver'),0) drivers,COALESCE(SUM(DATE(c.received_at)=CURRENT_DATE()),0) today,AVG(CASE WHEN c.closed_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,c.created_at,c.closed_at) END) average_resolution_minutes,100*SUM(c.status='closed')/NULLIF(COUNT(*),0) resolved_percent,100*SUM($onTime)/NULLIF(SUM(c.status='closed'),0) on_time_percent,COALESCE(SUM(c.status<>'closed' AND $overallDue<NOW()),0) overall_overdue FROM school_complaints c WHERE $where",$p)??[];
 $metrics['charts']=[];
 foreach(['status'=>'c.status','type'=>'c.complainant_type','subject'=>'c.subject','district'=>"JSON_UNQUOTE(JSON_EXTRACT(c.school_snapshot,'$.educational_district'))",'school'=>"JSON_UNQUOTE(JSON_EXTRACT(c.school_snapshot,'$.name'))",'company'=>"JSON_UNQUOTE(JSON_EXTRACT(c.company_snapshot,'$.name'))",'day'=>'DATE(c.received_at)', 'overdue'=>"(c.status<>'closed' AND c.due_at<NOW())",'receiver'=>'c.created_by','assignee'=>'c.assigned_to'] as $key=>$expr){$metrics['charts'][$key]=Db::all("SELECT $expr label,COUNT(*) total FROM school_complaints c WHERE $where GROUP BY $expr ORDER BY total DESC LIMIT 12",$p);}
 // Group by Persian calendar month using counts per Gregorian day, not top-N days.
 $days=Db::all("SELECT DATE(c.received_at) label,COUNT(*) total FROM school_complaints c WHERE $where GROUP BY DATE(c.received_at) ORDER BY label",$p);
 $metrics['charts']['month']=[];$metrics['month']=null;
 if(class_exists('IntlDateFormatter')){
  $fmt=new IntlDateFormatter('fa_IR@calendar=persian',IntlDateFormatter::NONE,IntlDateFormatter::NONE,'Asia/Tehran',IntlDateFormatter::TRADITIONAL,'yyyy-MM');
  $months=[];$current=$fmt->format(time());
  foreach($days as $day){$d=new DateTimeImmutable($day['label'].' 12:00:00',new DateTimeZone('Asia/Tehran'));$key=$fmt->format($d);if($key===false)continue;$months[$key]=($months[$key]??0)+(int)$day['total'];}
  $metrics['month']=$months[$current]??0;
  foreach(array_slice($months,-12,null,true) as $key=>$total)$metrics['charts']['month'][]=['label'=>$key,'total'=>$total];
 }
 return $metrics;}
 $page=max(1,min(100000,(int)($_GET['page']??1)));$size=max(1,min(100,(int)($_GET['page_size']??50)));
 $offset=($page-1)*$size;
 $sort=['id'=>'c.id','received_at'=>'c.received_at','status'=>'c.status','due_at'=>'c.due_at','tracking_code'=>'c.tracking_code','last_name'=>'c.last_name'][(string)($_GET['sort']??'id')]??'c.id';
 $direction=strtolower((string)($_GET['direction']??''))==='asc'?'ASC':'DESC';
 $limit=isset($_GET['page'])?"LIMIT $size OFFSET $offset":"LIMIT 500";
 $overallDue=sc_overall_due_expr();
 $rows=Db::all("SELECT c.id,c.complainant_type,c.school_id,c.company_id,c.tracking_code,c.first_name,c.last_name,c.phone,c.subject,c.status,c.received_at,c.created_at,c.due_at,c.closed_at,c.assigned_to,$overallDue overall_due_at,TIMESTAMPDIFF(MINUTE,NOW(),$overallDue) overall_remaining_minutes,(SELECT CONCAT_WS(' ',u.first_name,u.last_name) FROM users u WHERE u.id=c.assigned_to) assigned_name,TIMESTAMPDIFF(MINUTE,NOW(),c.due_at) remaining_minutes,JSON_UNQUOTE(JSON_EXTRACT(c.school_snapshot,'$.name')) school_name,JSON_UNQUOTE(JSON_EXTRACT(c.company_snapshot,'$.name')) company_name,(c.status<>'closed' AND c.due_at<NOW()) overdue FROM school_complaints c WHERE $where ORDER BY $sort $direction,c.id DESC $limit",$p);
 if(!isset($_GET['page']))return $rows;
 $total=(int)(Db::one("SELECT COUNT(*) n FROM school_complaints c WHERE $where",$p)['n']??0);
 $result=['rows'=>$rows,'total'=>$total,'page'=>$page,'page_size'=>$size];
 if($inbox){
  $result['metrics']=Db::one("SELECT COUNT(*) total,COALESCE(SUM(c.status='pending'),0) pending,COALESCE(SUM(c.status IN ('in_progress','returned')),0) in_progress,COALESCE(SUM(c.status='escalated'),0) escalated,COALESCE(SUM(c.status='answered'),0) answered,COALESCE(SUM(c.status='closed'),0) closed,COALESCE(SUM(c.status<>'closed' AND c.due_at<NOW()),0) overdue FROM school_complaints c WHERE (c.assigned_to=? OR EXISTS (SELECT 1 FROM school_complaint_events e WHERE e.complaint_id=c.id AND e.actor_id=?))",[$u['id'],$u['id']])??[];
 }
 return $result;
}
route('GET','/api/school-complaints/access',function($p,$b,$u){return sc_access($u);});
route('GET','/api/school-complaints/settings',function($p,$b,$u){sc_need($u,'admin');return sc_config();});
route('PUT','/api/school-complaints/settings',function($p,$b,$u){
 sc_need($u,'admin');$review=(int)($b['reviewer']??0);$super=(int)($b['supervisor']??0);
 $receivers=array_values(array_unique(array_filter(array_map('intval',(array)($b['receivers']??[])))));
 if(!$review||!$super||$review===$super||!$receivers)Http::error('مسئولان و دریافت‌کنندگان را تعیین کنید',422);
 foreach(array_unique(array_merge($receivers,[$review,$super])) as $id)if(!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$id]))Http::error('کاربر فعال یافت نشد',422);
 $topics=[];foreach((array)($b['topics']??[]) as $topic)$topics[]=sc_text($topic,255);
 $rh=(int)($b['review_hours']??24);$sh=(int)($b['supervisor_hours']??24);
 if(min($rh,$sh)<1||max($rh,$sh)>8760)Http::error('مهلت نامعتبر است',422);
 $c=['reviewer'=>$review,'supervisor'=>$super,'receivers'=>$receivers,'topics'=>array_values(array_unique($topics)),'review_hours'=>$rh,'supervisor_hours'=>$sh,'require_supervisor'=>($b['require_supervisor']??true)===true];
 Db::run('INSERT INTO school_complaint_settings(id,config) VALUES(1,?) ON DUPLICATE KEY UPDATE config=VALUES(config)',[json_encode($c,JSON_UNESCAPED_UNICODE)]);return ['ok'=>true];
});
route('GET','/api/school-complaints/topics',function($p,$b,$u){sc_need($u);return array_values(array_unique(array_merge(sc_config()['topics']??[],['سایر'])));});
route('GET','/api/school-complaints/users',function($p,$b,$u){
 sc_need($u,'admin');$q=sc_text((string)($_GET['q']??''),100,false);$like='%'.$q.'%';
 return Db::all("SELECT id,first_name,last_name,username FROM users WHERE is_active=1 AND (first_name LIKE ? OR last_name LIKE ? OR username LIKE ? OR CONCAT_WS(' ',first_name,last_name) LIKE ?) ORDER BY last_name,first_name LIMIT 50",[$like,$like,$like,$like]);
});
route('GET','/api/school-complaints/drivers',function($p,$b,$u){
 sc_need($u,'receive');$q=sc_text((string)($_GET['q']??''),100,false);
 if(mb_strlen($q)<2)return [];
 $like='%'.$q.'%';
 return Db::all("SELECT first_name,last_name,mobile,national_code FROM school_service_sepand_drivers WHERE first_name LIKE ? OR last_name LIKE ? OR mobile LIKE ? OR national_code LIKE ? OR CONCAT_WS(' ',first_name,last_name) LIKE ? ORDER BY last_name,first_name LIMIT 30",array_fill(0,5,$like));
});
route('GET','/api/school-complaints/schools',function($p,$b,$u){
 sc_need($u);$q=sc_text((string)($_GET['q']??''),100,false);
 return Db::all('SELECT id,code,name,educational_district,address,education_level,school_type,gender,shift,student_count,phone,latitude,longitude FROM school_service_schools WHERE is_active=1 AND (name LIKE ? OR code LIKE ? OR educational_district LIKE ? OR address LIKE ?) ORDER BY name LIMIT 100',array_fill(0,4,'%'.$q.'%'));
});
route('GET','/api/school-complaints/companies',function($p,$b,$u){
 sc_need($u);$q=sc_text((string)($_GET['q']??''),100,false);
 $cols='c.id,c.name,c.address,c.manager_name,c.manager_mobile,c.landline_phone';
 if(!empty($_GET['school_id']))return Db::all("SELECT $cols FROM school_service_companies c JOIN school_service_school_companies m ON m.company_id=c.id WHERE m.school_id=? AND c.is_active=1 ORDER BY m.is_primary DESC,c.name",[(int)$_GET['school_id']]);
 return Db::all("SELECT $cols FROM school_service_companies c WHERE c.is_active=1 AND c.name LIKE ? ORDER BY c.name LIMIT 100",['%'.$q.'%']);
});
route('POST','/api/school-complaints',function($p,$b,$u){
 sc_need($u,'receive');$key=$b['submission_key']??null;
 if($key!==null&&(!is_string($key)||!preg_match('/^[a-f0-9-]{32,36}$/D',$key)))Http::error('شناسه ثبت نامعتبر است',422);
 $code=$key===null?'SSC-'.strtoupper(bin2hex(random_bytes(8))):'SSC-'.strtoupper(substr(hash('sha256',(int)$u['id'].':'.$key),0,32));
 if($key!==null&&($existing=Db::one('SELECT id,tracking_code FROM school_complaints WHERE tracking_code=? AND created_by=?',[$code,$u['id']])))return $existing;
 $c=sc_config();$review=(int)($c['reviewer']??0);$super=(int)($c['supervisor']??0);
 if(!$review||!$super)Http::error('ابتدا گردش رسیدگی را تنظیم کنید',422);
 foreach([$review,$super] as $id)if(!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$id]))Http::error('مسئول فعال تعیین نشده است',422);
 $type=$b['complainant_type']??'';if(!in_array($type,['parent','driver'],true))Http::error('نوع شاکی نامعتبر است',422);
 $first=sc_text($b['first_name']??'',100);$last=sc_text($b['last_name']??'',100);
 $phone=sc_phone($b['phone']??'',$type);$address=sc_text($b['address']??'',700,$type==='parent');
 $school=Db::one('SELECT id,code,name,educational_district,address,education_level,school_type,gender,shift,student_count,phone,latitude,longitude FROM school_service_schools WHERE id=? AND is_active=1',[(int)($b['school_id']??0)]);
 $company=Db::one('SELECT id,name,address,manager_name,manager_mobile,landline_phone FROM school_service_companies WHERE id=? AND is_active=1',[(int)($b['company_id']??0)]);
 if(!$school||!$company)Http::error('مدرسه و شرکت معتبر انتخاب کنید',422);
 foreach(['address','educational_district','education_level','school_type','phone'] as $k)if(isset($b['school_snapshot'][$k]))$school[$k]=sc_text($b['school_snapshot'][$k],700,false);
 foreach(['address','manager_name','manager_mobile','landline_phone'] as $k)if(isset($b['company_snapshot'][$k]))$company[$k]=sc_text($b['company_snapshot'][$k],500,false);
 $subject=sc_text($b['subject']??'',255);if($subject==='سایر')$subject=sc_text($b['custom_subject']??'',255);elseif(!in_array($subject,(array)($c['topics']??[]),true))Http::error('موضوع معتبر انتخاب کنید',422);$body=sc_text($b['body']??'',12000);
 $received=sc_date($b['received_at']??'');$rh=(int)$c['review_hours'];$sh=(int)$c['supervisor_hours'];
 $db=Db::pdo();$db->beginTransaction();
 try{
 $id=Db::insert('INSERT INTO school_complaints(tracking_code,complainant_type,first_name,last_name,phone,address,school_id,company_id,school_snapshot,company_snapshot,subject,body,received_at,created_by,assigned_to,supervisor_id,review_hours,supervisor_hours,due_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$code,$type,$first,$last,$phone,$address,$school['id'],$company['id'],json_encode($school,JSON_UNESCAPED_UNICODE),json_encode($company,JSON_UNESCAPED_UNICODE),$subject,$body,$received,$u['id'],$review,$super,$rh,$sh,sc_deadline($rh)]);
 Db::run("INSERT INTO school_complaint_events(complaint_id,actor_id,action,body) VALUES(?,?,'created','')",[$id,$u['id']]);sc_notify($review,$id,'شکایت جدید سرویس مدارس');$db->commit();
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();if($key!==null&&$e instanceof PDOException&&(int)($e->errorInfo[1]??0)===1062&&($existing=Db::one('SELECT id,tracking_code FROM school_complaints WHERE tracking_code=? AND created_by=?',[$code,$u['id']])))return $existing;throw $e;}
 return ['id'=>$id,'tracking_code'=>$code];
});
route('GET','/api/school-complaints/inbox',function($p,$b,$u){return sc_list($u,true);});
route('GET','/api/school-complaints/search',function($p,$b,$u){return sc_list($u);});
route('GET','/api/school-complaints/dashboard',function($p,$b,$u){return sc_list($u,false,true);});
route('GET','/api/school-complaints/{id}',function($p,$b,$u){
 $r=sc_case((int)$p['id'],$u);$r['events']=Db::all("SELECT e.*,CONCAT_WS(' ',u.first_name,u.last_name) actor_name FROM school_complaint_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.complaint_id=? ORDER BY e.id",[$r['id']]);return $r;
});
route('GET','/api/school-complaints/{id}/attachments',function($p,$b,$u){
 $r=sc_case((int)$p['id'],$u);
 return Db::all("SELECT id,filename,mime,byte_size,created_at,uploader_id FROM school_complaint_attachments WHERE complaint_id=? ORDER BY id",[$r['id']]);
});
route('POST','/api/school-complaints/{id}/attachments',function($p,$b,$u){
 $id=(int)$p['id'];$r=sc_case($id,$u);
 if(!$r['can_attach'])Http::error('مجوز افزودن مستندات ندارید',403);
 $filename=sc_text($b['filename']??'',255);
 $filename=preg_replace('~[\\\\/\\x00-\\x1f\\x7f]+~u','_',$filename);
 $encoded=$b['content']??null;
 if(!is_string($encoded)||strlen($encoded)>4*1024*1024)Http::error('حجم فایل بیش از حد مجاز است',413);
 $raw=base64_decode($encoded,true);if($raw===false||$raw===''||strlen($raw)>3*1024*1024)Http::error('فایل نامعتبر یا بزرگ است',422);
 $mime=(new finfo(FILEINFO_MIME_TYPE))->buffer($raw);
 $allowed=['image/jpeg','image/png','application/pdf'];
 if(!in_array($mime,$allowed,true))Http::error('فقط تصاویر JPEG و PNG و مستند PDF پذیرفته می‌شوند',422);
 if($mime!=='application/pdf'&&!@getimagesizefromstring($raw))Http::error('تصویر نامعتبر است',422);
 $digest=hash('sha256',$raw);
 $db=Db::pdo();$db->beginTransaction();
 try{
  $locked=Db::one('SELECT status,assigned_to,created_by FROM school_complaints WHERE id=? FOR UPDATE',[$id]);
  if(!$locked||$locked['status']==='closed'||!in_array((int)$u['id'],[(int)$locked['assigned_to'],(int)$locked['created_by']],true)){$db->rollBack();Http::error('مجوز افزودن مستندات ندارید',403);}
  $existing=Db::one('SELECT id FROM school_complaint_attachments WHERE complaint_id=? AND digest=?',[$id,$digest]);
  if($existing){$db->commit();return ['id'=>(int)$existing['id'],'duplicate'=>true];}
  $quota=Db::one('SELECT COUNT(*) n,COALESCE(SUM(byte_size),0) bytes FROM school_complaint_attachments WHERE complaint_id=?',[$id]);
  if((int)$quota['n']>=20||(int)$quota['bytes']+strlen($raw)>30*1024*1024){$db->rollBack();Http::error('ظرفیت مستندات پرونده تکمیل شده است',422);}
  $aid=Db::insert('INSERT INTO school_complaint_attachments(complaint_id,uploader_id,filename,mime,byte_size,digest,content) VALUES(?,?,?,?,?,?,?)',[$id,$u['id'],$filename,$mime,strlen($raw),$digest,$raw]);
  $db->commit();return ['id'=>$aid];
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
});
route('GET','/api/school-complaints/{id}/attachments/{attachment_id}',function($p,$b,$u){
 $r=sc_case((int)$p['id'],$u);
 $file=Db::one('SELECT filename,mime,content FROM school_complaint_attachments WHERE complaint_id=? AND id=?',[$r['id'],(int)$p['attachment_id']]);
 if(!$file)Http::error('مستند یافت نشد',404);
 return ['filename'=>$file['filename'],'mime'=>$file['mime'],'content'=>base64_encode($file['content'])];
});
route('POST','/api/school-complaints/{id}/action',function($p,$b,$u){
 $id=(int)$p['id'];sc_case($id,$u);$act=$b['action']??'';
 if(!in_array($act,['start','note','reply','escalate','return','close'],true))Http::error('عملیات نامعتبر است',422);
 $note=sc_text($b['body']??'',12000,$act!=='start');$db=Db::pdo();$db->beginTransaction();
 try{
 $r=Db::one('SELECT * FROM school_complaints WHERE id=? FOR UPDATE',[$id]);
 if(!$r||$r['status']==='closed'||(int)$r['assigned_to']!==(int)$u['id']){$db->rollBack();Http::error('پرونده در اختیار شما نیست یا مختومه شده است',409);}
 if(!in_array($act,sc_allowed_actions($r,$u),true)){$db->rollBack();Http::error('عملیات در وضعیت فعلی مجاز نیست',409);}
 if($act==='start'&&!in_array($r['status'],['pending','returned'],true)){$db->rollBack();Http::error('شروع بررسی در این وضعیت مجاز نیست',409);}
 if($act==='reply'&&!in_array($r['status'],['pending','in_progress','returned','escalated'],true)){$db->rollBack();Http::error('ثبت پاسخ در این وضعیت مجاز نیست',409);}
 if($act==='start'&&in_array($r['status'],['pending','returned'],true))Db::run("UPDATE school_complaints SET status='in_progress' WHERE id=?",[$id]);
 if($act==='reply'&&in_array($r['status'],['pending','in_progress','returned'],true))Db::run("UPDATE school_complaints SET status='answered' WHERE id=?",[$id]);
 if($act==='return'){
 if($r['status']!=='escalated'||(int)$r['supervisor_id']!==(int)$u['id']){$db->rollBack();Http::error('بازگشت فقط توسط مسئول واحد مجاز است',409);}
 $previous=Db::one("SELECT actor_id FROM school_complaint_events WHERE complaint_id=? AND action='escalate' ORDER BY id DESC LIMIT 1",[$id]);
 $reviewer=(int)($previous['actor_id']??0);if(!$reviewer||!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$reviewer])){$db->rollBack();Http::error('رسیدگی‌کننده قبلی فعال نیست',409);}
 Db::run("UPDATE school_complaints SET status='returned',assigned_to=?,due_at=? WHERE id=?",[$reviewer,sc_deadline($r['review_hours']),$id]);
 }
 if($act==='escalate'){
 if(!in_array($r['status'],['pending','in_progress','answered','returned'],true)){$db->rollBack();Http::error('پرونده قبلاً ارجاع شده است',409);}
 if(!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$r['supervisor_id']])){$db->rollBack();Http::error('مسئول واحد فعال نیست',422);}
 Db::run("UPDATE school_complaints SET status='escalated',assigned_to=supervisor_id,due_at=? WHERE id=?",[sc_deadline($r['supervisor_hours']),$id]);
 }
 if($act==='close'&&$r['status']==='escalated'&&(int)$r['supervisor_id']!==(int)$u['id']){$db->rollBack();Http::error('مختومه کردن فقط توسط مسئول واحد مجاز است',409);}
 if($act==='close'&&$r['status']!=='escalated'&&(sc_config()['require_supervisor']??true)){$db->rollBack();Http::error('تأیید مسئول واحد الزامی است',409);}
 if($act==='close')Db::run("UPDATE school_complaints SET status='closed',closed_at=NOW() WHERE id=?",[$id]);
 Db::run('INSERT INTO school_complaint_events(complaint_id,actor_id,action,body) VALUES(?,?,?,?)',[$id,$u['id'],$act,$note]);
 if($act==='escalate')sc_notify($r['supervisor_id'],$id,'ارجاع شکایت سرویس مدارس');
 if($act==='return')sc_notify($reviewer,$id,'بازگشت شکایت برای بررسی تکمیلی');
 if($act==='close')sc_notify($r['created_by'],$id,'مختومه شدن شکایت سرویس مدارس');
 $db->commit();
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
 return ['ok'=>true];
});
