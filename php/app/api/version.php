<?php
// Public compatibility endpoint. The canonical Android update data is read from app_settings.
require_once dirname(__DIR__, 2) . '/lib/Db.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$get = function ($key, $default = null) {
    try {
        $row = Db::one("SELECT value FROM app_settings WHERE `key`=?", [$key]);
        if (!$row) return $default;
        $value = json_decode($row['value'], true);
        return $value === null && $row['value'] !== 'null' ? $row['value'] : $value;
    } catch (Throwable $e) {
        return $default;
    }
};

$latest = trim((string)$get('app_latest_version', '1.5.16'));
if (!preg_match('/^\d+\.\d+\.\d+$/', $latest)) $latest = '1.5.16';
$min = trim((string)$get('app_min_version', '0.0.0'));
if (!preg_match('/^\d+\.\d+\.\d+$/', $min)) $min = '0.0.0';
$defaultApkUrl = 'https://github.com/ali-yousefipour/khatyar/releases/latest/download/khatyar.apk';
$url = trim((string)$get('app_apk_url', $defaultApkUrl));
// Do not replace administrator-configured links, including custom APK filenames.
// Empty value is reported as empty so clients can show a clear configuration error.
$sha = strtolower(trim((string)$get('app_apk_sha256', '')));
$notes = (string)$get('app_update_notes', '');

echo json_encode([
    'success' => true,
    'version' => $latest,
    'app_version' => $latest,
    'latest_version' => $latest,
    'min_version' => $min,
    'apk_url' => $url,
    'apk_sha256' => preg_match('/^[a-f0-9]{64}$/', $sha) ? $sha : '',
    'notes' => $notes,
    'panel_version' => $latest,
], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
