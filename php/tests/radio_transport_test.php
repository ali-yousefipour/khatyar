<?php
// Execute production authentication/dispatch and waiting code with isolated DB data.
require __DIR__.'/../lib/Jwt.php';
class RadioResponse extends RuntimeException {}
function te($table){return true;}
function re($message,$status=400){throw new RadioResponse($message,$status);}
function check($ok,$why){if(!$ok)throw new RuntimeException($why);}
class Http {static $token;static function bearer(){return self::$token;}}
class Db {
    static $revoked=null,$releaseCount=0,$deviceEnabled=true;
    static function one($sql,$params=[]){
        if(str_contains($sql,'FROM users'))return ['id'=>7,'is_active'=>1,'allow_web'=>self::$deviceEnabled,'allow_android'=>1,'role_title'=>'staff','level'=>6];
        // A later session on a different browser must not replace this lookup.
        if(str_contains($sql,'FROM user_sessions'))return isset($params[2])&&$params[2]==='device-original'
            ? ['device_id'=>'device-original','revoked_at'=>self::$revoked]
            : ['device_id'=>'device-newer','revoked_at'=>null];
        throw new RuntimeException('Unexpected SQL');
    }
    static function releaseIdle(){self::$releaseCount++;return true;}
}
$CONFIG=['jwt_secret'=>'isolated-test-secret-not-production'];
$source=file_get_contents($argv[1]??(__DIR__.'/../app/radio-api-v2.php'));
function extractFunction($source,$start,$end){
    $a=strpos($source,$start);$b=strpos($source,$end,$a);
    check($a!==false&&$b!==false,'Function boundaries missing');
    eval(substr($source,$a,$b-$a));
}
extractFunction($source,'function au(){','function ch(');
extractFunction($source,'function radio_audio_sig(',str_contains($source,'$u=au();$op=')?'$u=au();$op=':'$op=$_GET');
extractFunction($source,'function radio_wait_for_change(','function radio_audio_sig(');
$dispatchStart=strpos($source,str_contains($source,'$u=au();$op=')?'$u=au();$op=':'$op=$_GET');
$dispatchEnd=strpos($source,'// A phone polls',$dispatchStart);
$dispatch=substr($source,$dispatchStart,$dispatchEnd-$dispatchStart);
function dispatch($query,$token=null){global $dispatch,$CONFIG;$_GET=$query;$_POST=[];$_SERVER['REQUEST_METHOD']='GET';Http::$token=$token;eval($dispatch);return $u;}
$access=Jwt::sign(['sub'=>7,'dt'=>'web','device_id'=>'device-original','t'=>'a'],$CONFIG['jwt_secret'],60);
// Mixed workload represents 200 app and 20 browser authentication calls, not a DB load benchmark.
for($i=0;$i<220;$i++)check(dispatch(['op'=>'poll'],$access)['id']===7,'Valid exact-device session rejected');
function rejects($query,$token,$status){try{dispatch($query,$token);throw new RuntimeException('Unauthorized request accepted');}catch(RadioResponse $e){check($e->getCode()===$status,'Unexpected rejection status');}}
Db::$revoked='2026-01-01';rejects(['op'=>'poll'],$access,401);Db::$revoked=null;
Db::$deviceEnabled=false;rejects(['op'=>'poll'],$access,403);Db::$deviceEnabled=true;
$refresh=Jwt::sign(['sub'=>7,'dt'=>'web','device_id'=>'device-original','t'=>'r'],$CONFIG['jwt_secret'],60);
rejects(['op'=>'poll'],$refresh,401);
$expires=time()+60;$query=['op'=>'audio','id'=>11,'uid'=>7,'exp'=>$expires,'sig'=>radio_audio_sig(11,$expires,7)];
check(dispatch($query)['id']===7,'Signed audio requires bearer');
$query['op']='poll';rejects($query,null,401);$query['op']='audio';
$query['id']=12;rejects($query,null,401);$query['id']=11;
$query['exp']=time()-1;rejects($query,null,401);
$_GET=['wait_ms'=>1000];$reads=0;
[$messages,$held]=radio_wait_for_change(function()use(&$reads){$reads++;if($reads===1)return [];check(Db::$releaseCount===1,'DB held across wait');return [['id'=>12]];},fn()=>false);
check($held&&$messages[0]['id']===12,'Waiting missed new message');
[$messages,$held]=radio_wait_for_change(fn()=>[['id'=>13]],fn()=>false);
check($held&&Db::$releaseCount===1,'Immediate messages should not disconnect');
radio_wait_for_change(fn()=>[],fn()=>true);
check(Db::$releaseCount===1,'Busy channel unnecessarily waits');
check(str_contains($source,'Db::releaseIdle();readfile($p);'),'Audio stream holds DB');
$admin=file_get_contents(__DIR__.'/../app/radio-admin-api.php');
check(str_contains($admin,'Db::releaseIdle();readfile($p);'),'Admin audio holds DB');
echo "PASS 220 mixed authentication calls, revocation, device policy, token scope, signed audio and idle polling\n";
