<?php
/**
 * Public aggregate counts for the marketing page.
 * No identities, individual records or private operational details are returned.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=120');
header('Access-Control-Allow-Origin: https://app.yousefipour.ir');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
  header('Allow: GET'); http_response_code(405); echo '{"error":"Method Not Allowed"}'; exit;
}
$cacheKey='khatyar.public_counts.v2';
if (function_exists('apcu_fetch')) {
  $cached=apcu_fetch($cacheKey,$hit);
  if ($hit && is_array($cached)) {
    echo json_encode($cached,JSON_UNESCAPED_UNICODE); exit;
  }
}
$stats=['drivers'=>null,'lines'=>null,'vehicles'=>null,'users'=>null,'reports'=>null];
try {
  require_once __DIR__.'/../lib/Db.php';
  $pdo=Db::pdo();
  // All identifiers below are static, allowlisted and not user-controlled.
  // Legacy installations may use different table names, so check before selecting.
  $candidates=[
    'drivers'=>['drivers','taxi_drivers','taxi_drivers_registry'],
    'lines'=>['lines','taxi_lines'],
    'vehicles'=>['vehicles','taxi_vehicles'],
    'users'=>['users'],
    'reports'=>['reports','inspection_reports']
  ];
  $dbName=(string)$pdo->query('SELECT DATABASE()')->fetchColumn();
  $stmt=$pdo->prepare('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND TABLE_TYPE = ? LIMIT 1');
  foreach ($candidates as $key=>$names) {
    foreach($names as $table) {
      $stmt->execute([$dbName,$table,'BASE TABLE']);
      if(!$stmt->fetchColumn())continue;
      try {
        $value=$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn();
        $stats[$key]=max(0,(int)$value);
        break;
      } catch(Throwable $ignored){ /* Keep unavailable counts unreported. */ }
    }
  }
} catch(Throwable $e) {
  error_log('public_stats_failed: '.get_class($e));
}
if(function_exists('apcu_store'))apcu_store($cacheKey,$stats,120);
echo json_encode($stats,JSON_UNESCAPED_UNICODE);
