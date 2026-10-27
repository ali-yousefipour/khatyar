<?php
// Offline regression checks: never query external geocoding providers during CI.
$handlers = [];
function route($method, $path, $callback, $public = false, $minLevel = 99) {
    global $handlers;
    $handlers[$method.' '.$path] = ['callback'=>$callback, 'public'=>$public];
}
require __DIR__.'/../lib/presence_reverse_geocode.php';
$key = 'GET /api/my/reverse-geocode';
if (!isset($handlers[$key]) || $handlers[$key]['public'] !== false) {
    throw new RuntimeException('Reverse-geocode endpoint must be registered with authentication');
}
$fn = $handlers[$key]['callback'];
foreach ([[], ['lat'=>'foo','lng'=>'59.6'], ['lat'=>'91','lng'=>'59.6'],
    ['lat'=>'36','lng'=>'-181']] as $query) {
    $_GET = $query;
    $result = $fn([], [], ['id'=>1]);
    if (($result['ok']??null)!==false || ($result['street']??null)!=='') {
        throw new RuntimeException('Invalid coordinates must be rejected without external lookup');
    }
}
$src = file_get_contents(__DIR__.'/../lib/presence_reverse_geocode.php');
foreach (['LOCK_EX | LOCK_NB', 'next_allowed', 'User-Agent: KhatyarTaxiManagement',
    'openstreetmap.org/reverse', 'accept-language', 'expires', 'road'] as $required) {
    if (!str_contains($src, $required)) throw new RuntimeException('Missing OSM API safety: '.$required);
}
$mobile = file_get_contents(__DIR__.'/../../mobile/src/VehiclesPhotoCapture.js');
foreach (['/my/reverse-geocode?lat=', 'Location.reverseGeocodeAsync',
    "source === 'openstreetmap'", '© OpenStreetMap contributors'] as $required) {
    if (!str_contains($mobile, $required)) throw new RuntimeException('Missing mobile street fallback: '.$required);
}
echo "PASS authenticated reverse-geocode endpoint, invalid inputs, throttling/cache and mobile attribution\n";
