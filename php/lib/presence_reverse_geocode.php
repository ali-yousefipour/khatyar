<?php
/**
 * Optional reverse-geocoding fallback for presence/station photos.
 * Public Nominatim usage policy: globally <= 1 request/second, identifiable UA,
 * caching and attribution. Auth is enforced by the regular API router.
 */
route('GET', '/api/my/reverse-geocode', static function ($params, $body, $user) {
    if (!isset($_GET['lat'], $_GET['lng'])) return ['ok' => false, 'street' => '', 'source' => 'none'];
    $lat = filter_var($_GET['lat'], FILTER_VALIDATE_FLOAT);
    $lon = filter_var($_GET['lng'], FILTER_VALIDATE_FLOAT);
    if ($lat === false || $lon === false || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
        return ['ok' => false, 'street' => '', 'source' => 'none'];
    }
    if (!function_exists('curl_init')) return ['ok' => true, 'street' => '', 'source' => 'unavailable'];
    $file = sys_get_temp_dir() . '/khatyar-reverse-geocode-cache-v1.json';
    $fp = @fopen($file, 'c+');
    if (!$fp) return ['ok' => true, 'street' => '', 'source' => 'unavailable'];
    @chmod($file, 0600);
    // Do not let many simultaneous staff check-ins wait behind a slow external lookup.
    if (!flock($fp, LOCK_EX | LOCK_NB)) { fclose($fp); return ['ok' => true, 'street' => '', 'source' => 'busy']; }
    try {
        rewind($fp);
        $state = json_decode(stream_get_contents($fp) ?: '{}', true);
        if (!is_array($state)) $state = [];
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        // ~50-meter buckets avoid repeatedly querying the same station position.
        $key = sprintf('%.4f,%.4f', round((float)$lat, 4), round((float)$lon, 4));
        $now = time();
        if (isset($items[$key]) && (int)($items[$key]['expires'] ?? 0) > $now) {
            return ['ok' => true, 'street' => (string)($items[$key]['street'] ?? ''), 'source' => 'openstreetmap'];
        }
        if ((float)($state['next_allowed'] ?? 0) > microtime(true)) {
            return ['ok' => true, 'street' => '', 'source' => 'rate_limited'];
        }
        // Reserve the slot even when Nominatim fails, to protect the shared service.
        $state['next_allowed'] = microtime(true) + 1.1;
        $state['items'] = $items;
        rewind($fp); ftruncate($fp, 0);
        fwrite($fp, json_encode($state, JSON_UNESCAPED_UNICODE)); fflush($fp);

        $url = 'https://nominatim.openstreetmap.org/reverse?' . http_build_query([
            'format' => 'jsonv2', 'lat' => round((float)$lat, 6), 'lon' => round((float)$lon, 6),
            'zoom' => 17, 'addressdetails' => 1, 'accept-language' => 'fa,en'
        ], '', '&', PHP_QUERY_RFC3986);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_TIMEOUT => 5, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_HTTPHEADER => [
                'User-Agent: KhatyarTaxiManagement/1.0 (https://app.yousefipour.ir)',
                'Accept: application/json', 'Accept-Language: fa,en'
            ]
        ]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $street = '';
        if ($status === 200 && is_string($raw) && strlen($raw) < 65536) {
            $data = json_decode($raw, true);
            $a = is_array($data['address'] ?? null) ? $data['address'] : [];
            // Never invent a road from a city or locality field.
            foreach (['road', 'pedestrian', 'residential', 'living_street', 'footway', 'path'] as $field) {
                if (!empty($a[$field]) && is_string($a[$field])) {
                    $street = trim($a[$field]); break;
                }
            }
            $street = trim(strip_tags($street));
            $street = function_exists('mb_substr') ? mb_substr($street, 0, 120) : substr($street, 0, 240);
        }
        // Also cache missing road labels to prevent repeated queries at an unmapped position.
        $items[$key] = ['street' => $street, 'expires' => $now + ($street !== '' ? 86400 : 3600)];
        $items = array_filter($items, static fn($x) => ($x['expires'] ?? 0) > $now);
        if (count($items) > 1000) $items = array_slice($items, -1000, null, true);
        $state['items'] = $items;
        rewind($fp); ftruncate($fp, 0);
        fwrite($fp, json_encode($state, JSON_UNESCAPED_UNICODE)); fflush($fp);
        return ['ok' => true, 'street' => $street, 'source' => 'openstreetmap'];
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
});
