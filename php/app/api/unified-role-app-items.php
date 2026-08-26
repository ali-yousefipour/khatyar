<?php
/** Unified Role App Items source of truth. */
require_once __DIR__ . '/../auth.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
$user = require_auth();
$pdo = $GLOBALS['pdo'] ?? null;
if (!$pdo) { http_response_code(500); echo json_encode(['error'=>'DB unavailable'], JSON_UNESCAPED_UNICODE); exit; }
const KH_STATION_CAPTURE = 'StationCapture';
const KH_MY_STATIONS = 'MyStations';
$allItems = ['Search','PresentList','Reports','CheckIn','Requests','RequestInbox','WorkSummary','SalarySlips','CompanyRequests','Subscription','Sms','BotMessages','MySms','Forms','Cultural','Welfare','OfficialPresence','Inventory','MyDailyMission','LineVisitProgram',KH_STATION_CAPTURE,KH_MY_STATIONS,'RoleDashboard','Leaderboard','ActivityReport','ExpInsurance','ExpTaxi','ExpOplic','TeamReport','TempDrivers','Outage'];
function kh_is_admin($u){return !empty($u['is_admin'])||in_array((string)($u['role_title']??$u['role']??''),['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'],true);}
function kh_read_config($pdo){try{$row=$pdo->query("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1")->fetch(PDO::FETCH_ASSOC);$cfg=$row?json_decode((string)$row['value'],true):[];return is_array($cfg)?$cfg:[];}catch(Throwable $e){return [];}}
function kh_roles($pdo){$roles=[];try{foreach($pdo->query("SELECT id,title FROM roles ORDER BY id") as $r)$roles[]=['id'=>(string)$r['id'],'title'=>(string)$r['title']];}catch(Throwable $e){}return $roles;}
function kh_normalize_config($cfg,$roles,$allItems){$out=[];foreach($roles as $r){$rid=(string)$r['id'];if(!array_key_exists($rid,$cfg))continue;$v=$cfg[$rid];if(!is_array($v)){$out[$rid]=$allItems;continue;}$seen=[];$items=[];foreach($v as $x){$x=(string)$x;if($x===''||isset($seen[$x]))continue;$seen[$x]=true;$items[]=$x;}$items=array_values(array_filter($items,fn($x)=>$x!=='LineLocation'));$out[$rid]=$items;}return $out;}
$method=$_SERVER['REQUEST_METHOD']??'GET';
if($method==='GET'){$cfg=kh_read_config($pdo);$roles=kh_roles($pdo);if(kh_is_admin($user)){echo json_encode(['roles'=>$roles,'config'=>$cfg,'items'=>$allItems,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE);exit;}$rid=(string)($user['role_id']??$user['role']??'');$explicit=array_key_exists($rid,$cfg)&&is_array($cfg[$rid]);$items=$explicit?array_values(array_filter($cfg[$rid],fn($x)=>(string)$x!=='LineLocation')):$allItems;$items=array_values(array_unique(array_map('strval',$items)));echo json_encode(['items'=>$items,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE);exit;}
if($method==='POST'){if(!kh_is_admin($user)){http_response_code(403);echo json_encode(['error'=>'دسترسی غیرمجاز'],JSON_UNESCAPED_UNICODE);exit;}$in=json_decode(file_get_contents('php://input'),true)?:[];$cfg=$in['config']??null;if(!is_array($cfg)){http_response_code(422);echo json_encode(['error'=>'تنظیمات آیتم‌های اپ نامعتبر است'],JSON_UNESCAPED_UNICODE);exit;}$roles=kh_roles($pdo);$cfg=kh_normalize_config($cfg,$roles,$allItems);$js=json_encode($cfg,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$st=$pdo->prepare("INSERT INTO app_settings(`key`,`value`) VALUES('role_app_items',?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)");$st->execute([$js]);echo json_encode(['ok'=>true,'config'=>$cfg,'items'=>$allItems,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE);exit;}
http_response_code(405);echo json_encode(['error'=>'Method not allowed'],JSON_UNESCAPED_UNICODE);
