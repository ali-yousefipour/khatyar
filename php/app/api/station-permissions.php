<?php
/** Dedicated station feature permissions. Does not use legacy line-location permission flags. */
require_once __DIR__ . '/../auth.php';
header('Content-Type: application/json; charset=utf-8');
$user = require_auth();
$roles = $user['roles'] ?? [$user['role'] ?? ''];
$roles = array_values(array_filter((array)$roles, 'is_string'));
$pdo = $GLOBALS['pdo'] ?? null;
if (!$pdo) { http_response_code(500); echo json_encode(['error'=>'DB unavailable'], JSON_UNESCAPED_UNICODE); exit; }
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
  $rows = [];
  try {
    $q=$pdo->query("SELECT role, enabled FROM station_app_permissions ORDER BY role");
    foreach($q as $r) $rows[$r['role']] = (bool)$r['enabled'];
  } catch(Throwable $e) {}
  $enabled=false; foreach($roles as $r) if (($rows[$r] ?? false)) $enabled=true;
  echo json_encode(['allowed'=>$enabled,'roles'=>$rows],JSON_UNESCAPED_UNICODE); exit;
}
if ($method === 'POST') {
  $in=json_decode(file_get_contents('php://input'),true) ?: [];
  if (!in_array(($user['role'] ?? ''), ['admin','superadmin'], true)) { http_response_code(403); echo json_encode(['error'=>'دسترسی غیرمجاز'],JSON_UNESCAPED_UNICODE); exit; }
  $pdo->exec("CREATE TABLE IF NOT EXISTS station_app_permissions (role VARCHAR(120) PRIMARY KEY, enabled TINYINT(1) NOT NULL DEFAULT 0)");
  $items=is_array($in['roles'] ?? null)?$in['roles']:[];
  $st=$pdo->prepare("INSERT INTO station_app_permissions(role,enabled) VALUES(?,?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled)");
  foreach($items as $role=>$enabled) $st->execute([(string)$role,$enabled?1:0]);
  echo json_encode(['ok'=>true],JSON_UNESCAPED_UNICODE); exit;
}
http_response_code(405); echo json_encode(['error'=>'Method not allowed']);
