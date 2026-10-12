<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300, stale-while-revalidate=1800');
header('X-Content-Type-Options: nosniff');

function weather_json(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    weather_json(['ok' => false, 'error' => 'روش درخواست پشتیبانی نمی‌شود'], 405);
}

$cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'khatyar-mashhad-weather-v1.json';
$cacheTtl = 1800;
$cached = null;
if (is_file($cacheFile)) {
    $rawCache = @file_get_contents($cacheFile);
    $decodedCache = is_string($rawCache) ? json_decode($rawCache, true) : null;
    if (is_array($decodedCache) && isset($decodedCache['payload'], $decodedCache['saved_at'])) {
        $cached = $decodedCache;
        if (time() - (int)$decodedCache['saved_at'] < $cacheTtl) {
            $payload = $decodedCache['payload'];
            $payload['cached'] = true;
            $payload['stale'] = false;
            weather_json($payload);
        }
    }
}

$query = http_build_query([
    'latitude' => '36.2972',
    'longitude' => '59.6067',
    'current' => 'temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m',
    'timezone' => 'Asia/Tehran',
    'forecast_days' => '1',
]);
$url = 'https://api.open-meteo.com/v1/forecast?' . $query;
$body = false;
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_USERAGENT => 'Khatyar-Weather/1.0 (+https://app.yousefipour.ir)',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (is_string($response) && $status >= 200 && $status < 300) $body = $response;
} else {
    $context = stream_context_create(['http' => [
        'method' => 'GET', 'timeout' => 6, 'ignore_errors' => true,
        'header' => "User-Agent: Khatyar-Weather/1.0\r\n",
    ], 'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $response = @file_get_contents($url, false, $context);
    $statusLine = is_array($http_response_header ?? null) ? ($http_response_header[0] ?? '') : '';
    if (is_string($response) && preg_match('~\s2\d\d\s~', $statusLine)) $body = $response;
}

$upstream = is_string($body) ? json_decode($body, true) : null;
$current = is_array($upstream) && is_array($upstream['current'] ?? null) ? $upstream['current'] : null;
if ($current && isset($current['temperature_2m'], $current['weather_code'])) {
    $payload = [
        'ok' => true, 'city' => 'مشهد',
        'temperature' => (float)$current['temperature_2m'],
        'weather_code' => (int)$current['weather_code'],
        'is_day' => (int)($current['is_day'] ?? 1),
        'humidity' => isset($current['relative_humidity_2m']) ? (int)$current['relative_humidity_2m'] : null,
        'wind_speed' => isset($current['wind_speed_10m']) ? (float)$current['wind_speed_10m'] : null,
        'observed_at' => (string)($current['time'] ?? ''),
        'provider' => 'Open-Meteo', 'provider_url' => 'https://open-meteo.com/',
        'cached' => false, 'stale' => false,
    ];
    @file_put_contents($cacheFile, json_encode(['saved_at' => time(), 'payload' => $payload], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    weather_json($payload);
}
if (is_array($cached) && is_array($cached['payload'] ?? null)) {
    $payload = $cached['payload'];
    $payload['cached'] = true;
    $payload['stale'] = true;
    weather_json($payload);
}
header('Cache-Control: no-store');
weather_json(['ok' => false, 'error' => 'در حال حاضر دریافت اطلاعات هواشناسی امکان‌پذیر نیست', 'city' => 'مشهد', 'provider' => 'Open-Meteo'], 503);
