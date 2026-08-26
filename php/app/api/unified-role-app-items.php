<?php
/**
 * Unified Role App Items source of truth.
 * This endpoint is intentionally standalone because the admin panel calls it directly.
 */
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../../lib/Db.php';
require_once __DIR__ . '/../../lib/Http.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const KH_STATION_CAPTURE = 'StationCapture';
const KH_MY_STATIONS = 'MyStations';
/* Canonical list. Existing app items are preserved; the two line/station items remain in this same list. */
$allItems = ['Search','PresentList','Reports','CheckIn','Requests','RequestInbox','WorkSummary','SalarySlips','CompanyRequests','Subscription','Sms','BotMessages','MySms','Forms','Cultural','Welfare','OfficialPresence','Inventory','MyDailyMission','LineVisitProgram',KH_STATION_CAPTURE,KH_MY_STATIONS,'RoleDashboard','Leaderboard','ActivityReport','ExpInsurance','ExpTaxi','ExpOplic','TeamReport','TempDrivers','Outage'];

function kh_table_exists($table) {
    static $cache = [];
    if (isset($cache[$table])) return $cache[$table];
    try {
        $r = Db::one("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [$table]);
        return $cache[$table] = ((int)($r['c'] ?? 0) > 0);
    } catch (Throwable $e) { return $cache[$table] = false; }
}
function kh_is_admin($u) {
    return !empty($u['is_admin']) || in_array((string)($u['role_title'] ?? ''), ['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد','admin','superadmin'], true);
}
function kh_read_config($pdo) {
    try {
        if (!kh_table_exists('app_settings')) return [];
        $row = $pdo->query("SELECT value FROM app_settings WHERE `key`='role_app_items' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        if (!$row) return [];
        $cfg = json_decode((string)$row['value'], true);
        return is_array($cfg) ? $cfg : [];
    } catch (Throwable $e) { return []; }
}
function kh_roles($pdo) {
    $roles = [];
    try {
        $rows = $pdo->query("SELECT id,title FROM roles ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) $roles[] = ['id'=>(string)$r['id'],'title'=>(string)$r['title']];
    } catch (Throwable $e) {
        error_log('unified-role-app-items roles: '.$e->getMessage());
    }
    return $roles;
}
function kh_normalize_config($cfg,$roles,$allItems) {
    $out=[];
    foreach ($roles as $r) {
        $rid=(string)$r['id'];
        if (!array_key_exists($rid,$cfg)) continue;
        $v=$cfg[$rid];
        if (!is_array($v)) { $out[$rid]=$allItems; continue; }
        $seen=[];$items=[];
        foreach($v as $x){$x=(string)$x;if($x===''||isset($seen[$x]))continue;$seen[$x]=true;$items[]=$x;}
        $out[$rid]=$items;
    }
    return $out;
}

try {
    $user = require_auth();
    $pdo = Db::pdo();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $cfg = kh_read_config($pdo);
    $roles = kh_roles($pdo);
    if ($method === 'GET') {
        if (kh_is_admin($user)) {
            echo json_encode(['success'=>true,'roles'=>$roles,'config'=>$cfg,'items'=>$allItems,'source'=>'role_app_items'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            exit;
        }
        $rid=(string)($user['role_id'] ?? '');
        $explicit=array_key_exists($rid,$cfg)&&is_array($cfg[$rid]);
        $items=$explicit?$cfg[$rid]:$allItems;
        $items=array_values(array_unique(array_filter(array_map('strval',$items),fn($x)=>$x!=='')));
        echo json_encode(['success'=>true,'items'=>$items,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        exit;
    }
    if ($method === 'POST') {
        if (!kh_is_admin($user)) Http::error('دسترسی غیرمجاز',403);
        $in=Http::body();
        $newCfg=$in['config']??null;
        if(!is_array($newCfg)) Http::error('تنظیمات آیتم‌های اپ نامعتبر است',422);
        $newCfg=kh_normalize_config($newCfg,$roles,$allItems);
        if (!kh_table_exists('app_settings')) Http::error('جدول تنظیمات سامانه موجود نیست',500);
        $js=json_encode($newCfg,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        $st=$pdo->prepare("INSERT INTO app_settings(`key`,`value`) VALUES('role_app_items',?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)");
        $st->execute([$js]);
        echo json_encode(['success'=>true,'ok'=>true,'config'=>$newCfg,'items'=>$allItems,'roles'=>$roles,'source'=>'role_app_items'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        exit;
    }
    Http::error('Method not allowed',405);
} catch (Throwable $e) {
    error_log('unified-role-app-items fatal: '.$e->getMessage());
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'خطای داخلی در بارگذاری تنظیمات سمت‌ها و آیتم‌های اپ'],JSON_UNESCAPED_UNICODE);
}
