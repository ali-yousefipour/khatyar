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

$latest = (string)$get('app_latest_version', '1.4.9');
$min = (string)$get('app_min_version', '0.0.0');
$url = trim((string)$get('app_apk_url', ''));
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
