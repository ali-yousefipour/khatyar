<?php
const ADMIN = 3;
// Execute the actual handlers with an in-memory DB; no live account or SMS is used.
class Http { public static function error($message, $status=400) { throw new RuntimeException($message, $status); } }
class TestStatement { public function __construct(private int $count=1) {} public function rowCount() { return $this->count; } }
class Db {
  public static $user, $session, $otp;
  public static $settings=[];
  public static $recent=false, $hourly=0, $lostConsume=false;
  public static function one($sql,$params=[]) {
    if (str_contains($sql,'SELECT r.title FROM users')) return ['title'=>self::$user['role_title']];
    if (str_contains($sql,'FROM app_settings')) return ['value'=>json_encode(self::$settings[$params[0]]??false)];
    if (str_contains($sql,'FROM users')) return ($params[0]===self::$user['username'] || $params[0]===self::$user['id']) ? self::$user : null;
    if (str_contains($sql,'FROM user_sessions')) return self::$session;
    if (str_contains($sql,'COUNT(*) n FROM login_otp')) return ['n'=>self::$hourly];
    if (str_contains($sql,'FROM login_otp')) {
      if (str_contains($sql,'INTERVAL 60 SECOND')) return self::$recent ? ['id'=>1] : null;
      return self::$otp && self::$otp['consumed_at']===null ? self::$otp : null;
    }
    throw new RuntimeException('Unexpected query: '.$sql);
  }
  public static function run($sql,$params=[]) {
    if (str_starts_with($sql,'INSERT INTO login_otp')) self::$otp=['id'=>1,'user_id'=>$params[0],'code_hash'=>$params[2],'expires_at'=>date('Y-m-d H:i:s',time()+180),'attempts'=>0,'consumed_at'=>null];
    elseif (str_contains($sql,'SET attempts=attempts+1')) {
      if (self::$otp['consumed_at']!==null || self::$otp['attempts']>=5) return new TestStatement(0);
      self::$otp['attempts']++;
    } elseif (str_contains($sql,'SET consumed_at=NOW()')) {
      if (self::$lostConsume || self::$otp['consumed_at']!==null) return new TestStatement(0);
      self::$otp['consumed_at']=date('Y-m-d H:i:s');
    } elseif (str_starts_with($sql,'INSERT INTO user_sessions')) self::$session=['device_id'=>$params[2],'revoked_at'=>null];
    elseif (str_starts_with($sql,'UPDATE user_sessions SET device_id=')) self::$session=['device_id'=>$params[0],'revoked_at'=>null];
    elseif (str_starts_with($sql,'UPDATE user_sessions SET revoked_at=')) self::$session['revoked_at']=date('Y-m-d H:i:s');
    elseif (!str_contains($sql,'activity_logs')) throw new RuntimeException('Unexpected write: '.$sql);
    return new TestStatement;
  }
  public static function all($sql,$params=[]) { throw new RuntimeException('Unexpected list: '.$sql); }
}
class Sms { public static $code; public static function send($mobiles,$text,...$rest) { preg_match('/\b[0-9]{6}\b/',$text,$m); self::$code=$m[0];return ['ok'=>true]; } }
class BaleBot {
  public static $code;
  public static function isEnabled() { return true; }
  public static function findChatForUser($id) { return 'test-chat'; }
  public static function sendMessage($chat,$text) { preg_match('/\b[0-9]{6}\b/',$text,$m);self::$code=$m[0];return ['ok'=>true]; }
}
class Jwt { public static $payload; public static function verify(...$args) { return self::$payload; } }
function _req_setting($key,$default=null) { return Db::$settings[$key]??$default; }
function _maintenance_status() { return ['enabled'=>Db::$settings['maintenance']??false,'message'=>'maintenance']; }
function _user_photo_url(...$args) { return null; }
function issueTokens($id,$device,$type) { return ['access'=>'test-access','refresh'=>'test-refresh','device_type'=>$type]; }
function _app_en_digits($code) { return strtr($code,['۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','۰'=>'0']); }
$registered=[];
function route($method,$path,$handler,...$rest) { $GLOBALS['registered'][$method.' '.$path]=$handler; }
$source=file_get_contents($argv[1]??__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _login_method(');
if ($start===false) throw new RuntimeException('Missing configurable login API');
$end=strpos($source,'$refreshHandler =',$start);
eval(substr($source,$start,$end-$start));
$start=strpos($source,'$refreshHandler =');
$end=strpos($source,'/* ================= ورود با کد',$start);
eval(substr($source,$start,$end-$start));
$GLOBALS['CONFIG']=['jwt_secret'=>'test-only'];
$start=strpos($source,'function _login_otp_request(');
$end=strpos($source,"route('POST', '/api/auth/logout'",$start);
eval(substr($source,$start,$end-$start));
$start=strpos($source,"route('POST', '/api/admin/users/{id}/revoke-device'");
$end=strpos($source,"route('POST', '/api/admin/users/{id}/photo'",$start);
eval(substr($source,$start,$end-$start));
function check($condition,$message) { if (!$condition) throw new RuntimeException($message); }
function rejects($fn,$status) { try {$fn();} catch (RuntimeException $e) { check($e->getCode()===$status,'Expected '.$status.', got '.$e->getCode().': '.$e->getMessage());return; } throw new RuntimeException('Expected rejection '.$status); }
function callRoute($method,$path,$body=[]) { return $GLOBALS['registered'][$method.' '.$path]([], $body, null); }
function resetState($app='password',$web='sms_otp') {
  Db::$settings=['app_login_method'=>$app,'web_login_method'=>$web];
  Db::$session=null;Db::$otp=null;
  Db::$recent=false;Db::$hourly=0;Db::$lostConsume=false;
  Db::$user=['id'=>7,'username'=>'test-user','is_active'=>1,'password_hash'=>password_hash('correct',PASSWORD_BCRYPT),'security_exempt'=>1,'allow_android'=>1,'allow_web'=>1,'is_admin'=>0,'role_title'=>'employee','role_id'=>4,'level'=>4,'first_name'=>'Test','last_name'=>'User','phone'=>'09120000000','email'=>null];
}
$body=['username'=>'test-user','password'=>'correct','device_id'=>'device-new','device_type'=>'android'];
resetState();
check(callRoute('GET','/api/session/app-login-config')['method']==='password','App policy');
check(callRoute('GET','/api/session/web-login-config')['method']==='sms_otp','Independent web policy');
check(callRoute('POST','/api/session/start',$body)['device_type']==='android','Android password login');
Db::$session=['device_id'=>'device-old','revoked_at'=>null];
rejects(fn()=>callRoute('POST','/api/session/start',$body),409);
$registered['POST /api/admin/users/{id}/revoke-device'](['id'=>7],['device_type'=>'android'],['id'=>1]);
Jwt::$payload=['sub'=>7,'dt'=>'android','device_id'=>'device-old','t'=>'r'];
rejects(fn()=>callRoute('POST','/api/session/renew',['refresh'=>'test']),401);
check(callRoute('POST','/api/session/start',$body)['access']==='test-access','Revocation permits rebind');
rejects(fn()=>callRoute('POST','/api/session/renew',['refresh'=>'test']),401);
Jwt::$payload['device_id']='device-new';
check(callRoute('POST','/api/session/renew',['refresh'=>'test'])['access']==='test-access','New device refresh');
resetState('sms_otp','password');
rejects(fn()=>callRoute('POST','/api/session/start',$body),403);
check(callRoute('POST','/api/session/start',array_merge($body,['device_type'=>'web']))['device_type']==='web','Web password enabled');
foreach (['sms_otp','bale_otp'] as $method) {
  resetState($method,$method);
  $r=callRoute('POST','/api/session/app-login-request',$body);
  check($r['channel']===($method==='bale_otp'?'bale':'sms'),'OTP channel');
  $code=$method==='bale_otp'?BaleBot::$code:Sms::$code;
  $otp=array_merge($body,['code'=>$code]);
  rejects(fn()=>callRoute('POST','/api/session/otp-verify',$otp),401); // Android code cannot log into web.
  Db::$session=['device_id'=>'device-old','revoked_at'=>null];
  rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),409);
  callRoute('POST','/api/session/app-login-request',$body);
  $otp['code']=$method==='bale_otp'?BaleBot::$code:Sms::$code;
  Db::$session['revoked_at']=date('Y-m-d H:i:s');
  check(callRoute('POST','/api/session/app-login-verify',$otp)['device_type']==='android','Android OTP after revocation');
  rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),401);
  callRoute('POST','/api/session/otp-request',$body);
  $otp['code']=$method==='bale_otp'?BaleBot::$code:Sms::$code;
  check(callRoute('POST','/api/session/otp-verify',$otp)['device_type']==='web','Web OTP');
}
resetState('sms_otp');callRoute('POST','/api/session/app-login-request',$body);
$otp=array_merge($body,['code'=>Sms::$code]);
Db::$lostConsume=true;
rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),401);
check(Db::$session===null,'Lost concurrent consumption must not bind a session');Db::$lostConsume=false;
Db::$otp['expires_at']=date('Y-m-d H:i:s',time()-1);
rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),401);
Db::$otp['expires_at']=date('Y-m-d H:i:s',time()+180);Db::$otp['attempts']=5;
rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),429);
Db::$otp['attempts']=0;Db::$user['security_exempt']=0;Db::$settings['block_vpn']=true;
rejects(fn()=>callRoute('POST','/api/session/app-login-verify',array_merge($otp,['vpn_on'=>'true'])),403);
callRoute('POST','/api/session/app-login-request',$body);$otp['code']=Sms::$code;Db::$user['security_exempt']=1;Db::$user['allow_android']=0;
rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),403);
Db::$settings['app_login_method']='invalid';rejects(fn()=>callRoute('GET','/api/session/app-login-config'),503);
resetState('sms_otp');Db::$recent=true;rejects(fn()=>callRoute('POST','/api/session/app-login-request',$body),429);
Db::$recent=false;Db::$hourly=5;rejects(fn()=>callRoute('POST','/api/session/app-login-request',$body),429);
resetState('sms_otp');callRoute('POST','/api/session/app-login-request',$body);$otp['code']=Sms::$code;
Db::$settings['app_login_method']='bale_otp';rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),401);
resetState('sms_otp');callRoute('POST','/api/session/app-login-request',$body);$otp['code']=Sms::$code;
Db::$settings['maintenance']=true;rejects(fn()=>callRoute('POST','/api/session/app-login-verify',$otp),503);
echo "PASS login policies, web/password, SMS/Bale OTP, platform isolation, expiry/replay/attempt cap, security, access and device revocation\n";
