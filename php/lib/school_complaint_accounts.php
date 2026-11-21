<?php
/**
 * Isolated school-complaint operator credentials.
 * Operators do not exist in users/roles/zones/manager relationships.
 * For case attribution, negative integer IDs encode local account identities.
 */
function sc_operator_id(int $id): int { return -$id; }
function sc_operator_account(int $id): ?array {
 if($id>=0)return null;
 return Db::one('SELECT id,username,display_name,can_receive,can_report,is_active,token_version FROM school_complaint_accounts WHERE id=?',[-$id]);
}
function sc_identity_active(int $id): bool {
 if($id<0)return (bool)Db::one('SELECT id FROM school_complaint_accounts WHERE id=? AND is_active=1',[-$id]);
 return $id>0&&(bool)Db::one('SELECT id FROM users WHERE id=? AND is_active=1',[$id]);
}
function sc_identity_name(int $id): string {
 if($id<0)return (string)(sc_operator_account($id)['display_name']??'');
 return (string)(Db::one("SELECT CONCAT_WS(' ',first_name,last_name) name FROM users WHERE id=?",[$id])['name']??'');
}
function sc_operator_auth(array $jwt): array {
 if(($jwt['t']??'')!=='sc'||($jwt['scope']??'')!=='school-complaints'||($jwt['dt']??'')!=='web')
   Http::error('توکن دسترسی نامعتبر است',401);
 $uid=(int)($jwt['sub']??0);
 if($uid>=0)Http::error('شناسه حساب معتبر نیست',401);
 $a=sc_operator_account($uid);
 if(!$a||(int)$a['is_active']!==1||(int)$a['token_version']!==(int)($jwt['v']??0))
   Http::error('نشست منقضی یا حساب غیرفعال شده است',401);
 return ['id'=>$uid,'username'=>$a['username'],'first_name'=>$a['display_name'],
   'last_name'=>'','is_active'=>1,'is_admin'=>0,'role_id'=>0,'level'=>99,
   'sc_only'=>true,'sc_receive'=>(bool)$a['can_receive'],'sc_report'=>(bool)$a['can_report'],
   'device_type'=>'web'];
}
function sc_operator_name(string $value,int $max=200): string {
 return sc_text($value,$max);
}
function sc_operator_password($value): string {
 if(!is_string($value)||strlen($value)<12||strlen($value)>128)
   Http::error('رمز عبور باید بین ۱۲ تا ۱۲۸ کاراکتر باشد',422);
 return $value;
}
function sc_account_view(array $r): array {
 return ['id'=>(int)$r['id'],'sc_id'=>(int)$r['id']*-1,'username'=>$r['username'],
  'display_name'=>$r['display_name'],'can_receive'=>(bool)$r['can_receive'],
  'can_report'=>(bool)$r['can_report'],'is_active'=>(bool)$r['is_active']];
}
route('POST','/api/school-complaints/portal/login',function($p,$b,$u){
 $username=trim((string)($b['username']??''));
 $password=(string)($b['password']??'');
 if(strlen($username)>100||strlen($password)>256)Http::error('نام کاربری یا رمز عبور نامعتبر است',401);
 $a=Db::one('SELECT * FROM school_complaint_accounts WHERE username=? LIMIT 1',[$username]);
 // Also do a bcrypt verification for unknown accounts to discourage username enumeration.
 $dummy='$2y$10$KbQi5mGGaRfNN4SYHkw8quT.l7Gnfyl7aR9l2a4JHTqA.VR6wFcrG';
 $valid=password_verify($password,(string)($a['password_hash']??$dummy));
 if(!$a||(int)$a['is_active']!==1||($a['locked_until']&&strtotime($a['locked_until'])>time())||!$valid){
  if($a&&((int)$a['is_active']===1)&&!($a['locked_until']&&strtotime($a['locked_until'])>time()))
    Db::run('UPDATE school_complaint_accounts SET locked_until=CASE WHEN failed_attempts>=4 THEN DATE_ADD(NOW(),INTERVAL 15 MINUTE) ELSE NULL END,failed_attempts=failed_attempts+1 WHERE id=?',[$a['id']]);
  Http::error('نام کاربری یا رمز عبور نامعتبر است؛ در صورت تلاش مکرر حساب موقتاً قفل می‌شود',401);
 }
 Db::run('UPDATE school_complaint_accounts SET failed_attempts=0,locked_until=NULL WHERE id=?',[$a['id']]);
 return ['access'=>Jwt::sign(['t'=>'sc','scope'=>'school-complaints','sub'=>sc_operator_id((int)$a['id']),
   'dt'=>'web','v'=>(int)$a['token_version']],$GLOBALS['CONFIG']['jwt_secret'],28800),
   'name'=>$a['display_name'],'account'=>sc_account_view($a)];
},true);
route('GET','/api/school-complaints/portal/me',function($p,$b,$u){
 if(empty($u['sc_only']))Http::error('این بخش برای کاربران اختصاصی شکایات است',403);
 return ['name'=>$u['first_name'],'id'=>$u['id'],'can_receive'=>$u['sc_receive'],'can_report'=>$u['sc_report']];
});
route('GET','/api/school-complaints/accounts',function($p,$b,$u){
 sc_need($u,'admin');
 return array_map('sc_account_view',Db::all('SELECT id,username,display_name,can_receive,can_report,is_active FROM school_complaint_accounts ORDER BY id DESC LIMIT 500'));
});
route('POST','/api/school-complaints/accounts',function($p,$b,$u){
 sc_need($u,'admin');
 $username=sc_text($b['username']??'',100);
 if(!preg_match('/^[a-zA-Z][a-zA-Z0-9._-]{3,99}$/D',$username))Http::error('نام کاربری باید با حرف لاتین شروع شود و حداقل ۴ نویسه داشته باشد',422);
 $name=sc_operator_name($b['display_name']??'');
 $password=sc_operator_password($b['password']??null);
 try {
  $id=Db::insert('INSERT INTO school_complaint_accounts(username,display_name,password_hash,can_receive,can_report) VALUES(?,?,?,?,?)',
    [$username,$name,password_hash($password,PASSWORD_BCRYPT),!empty($b['can_receive'])?1:0,!empty($b['can_report'])?1:0]);
 }catch(PDOException $e){
  if((int)($e->errorInfo[1]??0)===1062)Http::error('این نام کاربری قبلاً ثبت شده است',409);
  throw $e;
 }
 return ['id'=>$id,'sc_id'=>sc_operator_id((int)$id)];
});
route('PUT','/api/school-complaints/accounts/{id}',function($p,$b,$u){
 sc_need($u,'admin');
 $id=(int)$p['id'];
 if($id<=0||!Db::one('SELECT id FROM school_complaint_accounts WHERE id=?',[$id]))Http::error('حساب یافت نشد',404);
 $name=sc_operator_name($b['display_name']??'');
 $password=$b['password']??'';
 $args=[$name,!empty($b['can_receive'])?1:0,!empty($b['can_report'])?1:0,!empty($b['is_active'])?1:0];
 $query='UPDATE school_complaint_accounts SET display_name=?,can_receive=?,can_report=?,is_active=?,token_version=token_version+1,failed_attempts=0,locked_until=NULL';
 if($password!==''){$args[]=password_hash(sc_operator_password($password),PASSWORD_BCRYPT);$query.=',password_hash=?';}
 $args[]=$id;
 Db::run($query.' WHERE id=?',$args);
 return ['ok'=>true];
});
