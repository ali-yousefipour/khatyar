<?php
// Shared release version. This endpoint is intentionally dependency-free so it remains
// available even when optional application modules are unavailable.
const KHATYAR_VERSION = '1.3.72';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
echo json_encode([
    'success' => true,
    'version' => KHATYAR_VERSION,
    'app_version' => KHATYAR_VERSION,
    'panel_version' => KHATYAR_VERSION,
], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
