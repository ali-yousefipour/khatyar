<?php
declare(strict_types=1);
// One-use migration activation script. Only upload to the NEW web root after
// the signed APK and the shared DB pass smoke checks. Never commit live token.
header('Content-Type: application/json; charset=utf-8');
$token = '__ACTIVATION_TOKEN__';
$received = (string)($_POST['token'] ?? '');
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !hash_equals($token, $received)) {
    http_response_code(403);
    exit('forbidden');
}
require dirname(__DIR__, 2) . '/lib/Db.php';
$values = [
    'app_latest_version' => '2.0.2',
    'app_min_version' => '2.0.2',
    'app_apk_url' => 'https://khat-yar.ir/releases/khatyar-2.0.2.apk',
    'app_apk_sha256' => '__APK_SHA256__',
];
$db = Db::pdo();
try {
    $db->beginTransaction();
    foreach ($values as $key => $value) {
        Db::exec('INSERT INTO app_settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)', [
            $key, json_encode($value, JSON_UNESCAPED_SLASHES),
        ]);
    }
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('Khatyar cutover failed: '.$e->getCode());
    http_response_code(500);
    exit('activation_failed');
}
echo json_encode(['ok'=>true,'min_version'=>'2.0.2'],JSON_UNESCAPED_SLASHES);
