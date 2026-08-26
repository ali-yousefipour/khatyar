<?php
// Shared release version for Android/Web/Admin.
const KHATYAR_VERSION = '1.3.73';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
echo json_encode([
    'success' => true,
    'version' => KHATYAR_VERSION,
    'app_version' => KHATYAR_VERSION,
    'panel_version' => KHATYAR_VERSION,
], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
