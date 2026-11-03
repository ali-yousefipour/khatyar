<?php
// Run: php php/tests/media_scoped_token_test.php
require_once __DIR__ . '/../lib/Jwt.php';
require_once __DIR__ . '/../lib/Http.php';

$GLOBALS['CONFIG'] = ['jwt_secret' => 'media-scope-test-secret'];
$access = Jwt::sign(['t'=>'a','sub'=>17,'dt'=>'web','device_id'=>'device-1'], $GLOBALS['CONFIG']['jwt_secret'], 3600);
Http::$currentToken = $access;
$stamp = new ReflectionMethod(Http::class, 'stampMediaUrls');
$original = '/api/media?path=uploads%2Fusers%2Favatar.jpg&v=4';
$stamped = $stamp->invoke(null, $original);
parse_str((string)parse_url($stamped, PHP_URL_QUERY), $params);
if ($stamped === $original || !isset($params['token']) || $params['token'] === $access) {
  throw new RuntimeException('Media URL must have a distinct scoped token');
}
if (($params['path'] ?? '') !== 'uploads/users/avatar.jpg' || ($params['v'] ?? '') !== '4') {
  throw new RuntimeException('Media URL path and cache version must be preserved');
}
$claims = Jwt::verify($params['token'], $GLOBALS['CONFIG']['jwt_secret']);
if (($claims['t'] ?? '') !== 'media' || ($claims['sub'] ?? 0) !== 17 ||
    ($claims['path_hash'] ?? '') !== hash('sha256', $params['path']) ||
    ($claims['exp'] - $claims['iat']) !== 900) {
  throw new RuntimeException('Media token scope, principal or expiration is invalid');
}
if (hash_equals($claims['path_hash'], hash('sha256', 'uploads/users/other.jpg'))) {
  throw new RuntimeException('Media token must not authorize another path');
}
$stampedAgain = $stamp->invoke(null, $original . '&token=' . rawurlencode($access));
parse_str((string)parse_url($stampedAgain, PHP_URL_QUERY), $again);
if (($again['token'] ?? '') === $access) {
  throw new RuntimeException('Existing full bearer token must be replaced');
}
echo "PASS: scoped media URLs preserve path, replace bearer tokens and expire\n";
