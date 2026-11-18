<?php
// Independent school complaint workflow. Existing personnel identity is authoritative.
function sc_config(): array {
 $r=Db::one('SELECT config FROM school_complaint_settings WHERE id=1');
 return $r ? (json_decode($r['config'],true)?:[]) : [];
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
function sc_date($v): string {
 $v=sc_text($v,19);$d=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$v,new DateTimeZone('Asia/Tehran'));
 if(!$d||$d->format('Y-m-d H:i:s')!==$v)Http::error('تاریخ نامعتبر است',422);return $v;
}
function sc_case($id,$u): array {
 $a=sc_need($u);$r=Db::one('SELECT * FROM school_complaints WHERE id=?',[$id]);
 if(!$r)Http::error('پرونده یافت نشد',404);
 if(!$a['admin']&&(int)$r['created_by']!==(int)$u['id']&&(int)$r['assigned_to']!==(int)$u['id']&&(int)$r['supervisor_id']!==(int)$u['id']&&!Db::one('SELECT id FROM school_complaint_events WHERE complaint_id=? AND actor_id=? LIMIT 1',[$id,$u['id']]))Http::error('دسترسی به پرونده مجاز نیست',403);
 $r['school_snapshot']=json_decode($r['school_snapshot'],true);$r['company_snapshot']=json_decode($r['company_snapshot'],true);
 $r['overdue']=$r['status']!=='closed'&&strtotime($r['due_at'])<time();
 return $r;
}
function sc_list($u,$inbox=false): array {
 $a=sc_need($u);$w=['1=1'];$p=[];
 if($inbox){$w[]='c.assigned_to=?';$p[]=$u['id'];}
 elseif(!$a['admin']){$w[]='(c.created_by=? OR c.assigned_to=? OR c.supervisor_id=? OR EXISTS (SELECT 1 FROM school_complaint_events e WHERE e.complaint_id=c.id AND e.actor_id=?))';array_push($p,$u['id'],$u['id'],$u['id'],$u['id']);}
 foreach(['school_id','company_id'] as $k)if(!empty($_GET[$k])){$w[]="c.$k=?";$p[]=(int)$_GET[$k];}
 foreach(['first_name','last_name','phone'] as $k)if(!empty($_GET[$k])){$w[]="c.$k LIKE ?";$p[]='%'.sc_text($_GET[$k],100).'%';}
 foreach(['from'=>'>=','to'=>'<='] as $k=>$op)if(!empty($_GET[$k])){$w[]="c.received_at $op ?";$p[]=sc_date($_GET[$k]);}
 $where=implode(' AND ',$w);
 return Db::all("SELECT c.id,c.tracking_code,c.first_name,c.last_name,c.phone,c.subject,c.status,c.received_at,c.created_at,c.due_at,c.closed_at,c.assigned_to,JSON_UNQUOTE(JSON_EXTRACT(c.school_snapshot,'$.name')) school_name,JSON_UNQUOTE(JSON_EXTRACT(c.company_snapshot,'$.name')) company_name,(c.status<>'closed' AND c.due_at<NOW()) overdue FROM school_complaints c WHERE $where ORDER BY c.id DESC LIMIT 500",$p);
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
 $c=['reviewer'=>$review,'supervisor'=>$super,'receivers'=>$receivers,'topics'=>array_values(array_unique($topics)),'review_hours'=>$rh,'supervisor_hours'=>$sh];
 Db::run('INSERT INTO school_complaint_settings(id,config) VALUES(1,?) ON DUPLICATE KEY UPDATE config=VALUES(config)',[json_encode($c,JSON_UNESCAPED_UNICODE)]);return ['ok'=>true];
});
route('GET','/api/school-complaints/topics',function($p,$b,$u){sc_need($u);return sc_config()['topics']??[];});
route('GET','/api/school-complaints/schools',function($p,$b,$u){
 sc_need($u);$q=sc_text((string)($_GET['q']??''),100,false);
 return Db::all('SELECT id,name,educational_district,address,education_level,school_type,gender,phone,latitude,longitude FROM school_service_schools WHERE is_active=1 AND name LIKE ? ORDER BY name LIMIT 100',['%'.$q.'%']);
});
route('GET','/api/school-complaints/companies',function($p,$b,$u){
 sc_need($u);$q=sc_text((string)($_GET['q']??''),100,false);
 $cols='c.id,c.name,c.address,c.manager_name,c.manager_mobile,c.landline_phone';
 if(!empty($_GET['school_id']))return Db::all("SELECT $cols FROM school_service_companies c JOIN school_service_school_companies m ON m.company_id=c.id WHERE m.school_id=? AND c.is_active=1 ORDER BY m.is_primary DESC,c.name",[(int)$_GET['school_id']]);
 return Db::all("SELECT $cols FROM school_service_companies c WHERE c.is_active=1 AND c.name LIKE ? ORDER BY c.name LIMIT 100",['%'.$q.'%']);
});
route('POST','/api/school-complaints',function($p,$b,$u){
 sc_need($u,'receive');$c=sc_config();$review=(int)($c['reviewer']??0);$super=(int)($c['supervisor']??0);
 if(!$review||!$super)Http::error('ابتدا گردش رسیدگی را تنظیم کنید',422);
 foreach([$review,$super] as $id)if(!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$id]))Http::error('مسئول فعال تعیین نشده است',422);
 $type=$b['complainant_type']??'';if(!in_array($type,['parent','driver'],true))Http::error('نوع شاکی نامعتبر است',422);
 $first=sc_text($b['first_name']??'',100);$last=sc_text($b['last_name']??'',100);
 $phone=sc_text($b['phone']??'',30);$address=sc_text($b['address']??'',700,$type==='parent');
 $school=Db::one('SELECT id,name,educational_district,address,education_level,school_type,gender,phone,latitude,longitude FROM school_service_schools WHERE id=? AND is_active=1',[(int)($b['school_id']??0)]);
 $company=Db::one('SELECT id,name,address,manager_name,manager_mobile,landline_phone FROM school_service_companies WHERE id=? AND is_active=1',[(int)($b['company_id']??0)]);
 if(!$school||!$company)Http::error('مدرسه و شرکت معتبر انتخاب کنید',422);
 foreach(['address','educational_district','education_level','school_type','phone'] as $k)if(isset($b['school_snapshot'][$k]))$school[$k]=sc_text($b['school_snapshot'][$k],700,false);
 foreach(['address','manager_name','manager_mobile','landline_phone'] as $k)if(isset($b['company_snapshot'][$k]))$company[$k]=sc_text($b['company_snapshot'][$k],500,false);
 $subject=sc_text($b['subject']??'',255);$body=sc_text($b['body']??'',12000);
 $received=sc_date($b['received_at']??'');$rh=(int)$c['review_hours'];$sh=(int)$c['supervisor_hours'];
 $code='SSC-'.strtoupper(bin2hex(random_bytes(8)));$db=Db::pdo();$db->beginTransaction();
 try{
 $id=Db::insert('INSERT INTO school_complaints(tracking_code,complainant_type,first_name,last_name,phone,address,school_id,company_id,school_snapshot,company_snapshot,subject,body,received_at,created_by,assigned_to,supervisor_id,review_hours,supervisor_hours,due_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$code,$type,$first,$last,$phone,$address,$school['id'],$company['id'],json_encode($school,JSON_UNESCAPED_UNICODE),json_encode($company,JSON_UNESCAPED_UNICODE),$subject,$body,$received,$u['id'],$review,$super,$rh,$sh,date('Y-m-d H:i:s',time()+3600*$rh)]);
 Db::run("INSERT INTO school_complaint_events(complaint_id,actor_id,action,body) VALUES(?,?,'created','')",[$id,$u['id']]);$db->commit();
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
 return ['id'=>$id,'tracking_code'=>$code];
});
route('GET','/api/school-complaints/inbox',function($p,$b,$u){return sc_list($u,true);});
route('GET','/api/school-complaints/search',function($p,$b,$u){return sc_list($u);});
route('GET','/api/school-complaints/{id}',function($p,$b,$u){
 $r=sc_case((int)$p['id'],$u);$r['events']=Db::all("SELECT e.*,CONCAT_WS(' ',u.first_name,u.last_name) actor_name FROM school_complaint_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.complaint_id=? ORDER BY e.id",[$r['id']]);return $r;
});
route('POST','/api/school-complaints/{id}/action',function($p,$b,$u){
 $id=(int)$p['id'];sc_case($id,$u);$act=$b['action']??'';
 if(!in_array($act,['note','reply','escalate','close'],true))Http::error('عملیات نامعتبر است',422);
 $note=sc_text($b['body']??'',12000);$db=Db::pdo();$db->beginTransaction();
 try{
 $r=Db::one('SELECT * FROM school_complaints WHERE id=? FOR UPDATE',[$id]);
 if(!$r||$r['status']==='closed'||(int)$r['assigned_to']!==(int)$u['id']){$db->rollBack();Http::error('پرونده در اختیار شما نیست یا مختومه شده است',409);}
 if($act==='escalate'){
 if($r['status']!=='pending'){$db->rollBack();Http::error('پرونده قبلاً ارجاع شده است',409);}
 if(!Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$r['supervisor_id']])){$db->rollBack();Http::error('مسئول واحد فعال نیست',422);}
 Db::run("UPDATE school_complaints SET status='escalated',assigned_to=supervisor_id,due_at=? WHERE id=?",[date('Y-m-d H:i:s',time()+3600*(int)$r['supervisor_hours']),$id]);
 }
 if($act==='close')Db::run("UPDATE school_complaints SET status='closed',closed_at=NOW() WHERE id=?",[$id]);
 Db::run('INSERT INTO school_complaint_events(complaint_id,actor_id,action,body) VALUES(?,?,?,?)',[$id,$u['id'],$act,$note]);$db->commit();
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
 return ['ok'=>true];
});
