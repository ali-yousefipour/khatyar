<?php
/* Apache wrapper used to add the Android/Web parity layers without rewriting the large legacy app.html. */
$source = __DIR__ . '/app.html';
if (!is_file($source)) { http_response_code(404); exit('app.html not found'); }
$html = file_get_contents($source);
$tag = '<script src="assets/android-web-parity.js?v=20260904" defer></script><script src="assets/android-web-existing-screen-parity.js?v=20260904" defer></script><script src="assets/personnel-vehicle-web.js?v=20260904" defer></script><script src="assets/personnel-vehicle-ui-bridge.js?v=20260904" defer></script>';
if (strpos($html, 'android-web-parity.js') === false) {
    $html = preg_replace('/<\/body>/i', $tag . "\n</body>", $html, 1);
} elseif (strpos($html, 'android-web-existing-screen-parity.js') === false) {
    $html = preg_replace('/<\/body>/i', '<script src="assets/android-web-existing-screen-parity.js?v=20260904" defer></script><script src="assets/personnel-vehicle-web.js?v=20260904" defer></script><script src="assets/personnel-vehicle-ui-bridge.js?v=20260904" defer></script>' . "\n</body>", $html, 1);
} elseif (strpos($html, 'personnel-vehicle-web.js') === false) {
    $html = preg_replace('/<\/body>/i', '<script src="assets/personnel-vehicle-web.js?v=20260904" defer></script><script src="assets/personnel-vehicle-ui-bridge.js?v=20260904" defer></script>' . "\n</body>", $html, 1);
} elseif (strpos($html, 'personnel-vehicle-ui-bridge.js') === false) {
    $html = preg_replace('/<\/body>/i', '<script src="assets/personnel-vehicle-ui-bridge.js?v=20260904" defer></script>' . "\n</body>", $html, 1);
}
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
echo $html;