<?php
declare(strict_types=1);

/* Keep /app and /app.html on the same canonical HTML entry point. */
$source = __DIR__ . '/app.html';
if (!is_file($source)) {
    http_response_code(404);
    exit('Web App unavailable');
}
$html = file_get_contents($source);
if ($html === false) {
    http_response_code(500);
    exit('Web App unavailable');
}

/* Load the existing Android parity layers after the complete app document. */
$tag = '<script src="assets/android-web-parity.js?v=20261025.2" defer></script>'
    . '<script src="assets/android-app-ui.js?v=20261025.2" defer></script>'
    . '<script src="assets/personnel-vehicle-web.js?v=20261015.auth1" defer></script>'
    . '<script src="assets/personnel-vehicle-checklist-enhancement.js?v=20260905.12" defer></script>'
    . '<script src="assets/personnel-vehicle-ui-bridge.js?v=20261025.2" defer></script>'
    . '<script src="assets/presence-immediate-admin.js?v=20260919.02" defer></script>';
if (stripos($html, 'android-web-parity.js') === false) {
    $html = preg_replace('~</body>~i', $tag . "\n</body>", $html, 1);
}
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
echo $html;
