<?php
require_once __DIR__ . '/../lib/Jwt.php';

function checkAccessPolicy($condition, $message) {
  if (!$condition) throw new RuntimeException($message);
}

$secret = 'synthetic-unit-test-secret';
$base = ['sub' => 7, 'dt' => 'web', 'device_id' => 'synthetic-device'];
$access = Jwt::sign($base + ['t' => 'a'], $secret, 300);
$refresh = Jwt::sign($base + ['t' => 'r'], $secret, 300);
$legacy = Jwt::sign($base, $secret, 300);
checkAccessPolicy(Jwt::isAccessPayload(Jwt::verify($access, $secret)), 'Access token must be accepted');
checkAccessPolicy(!Jwt::isAccessPayload(Jwt::verify($refresh, $secret)), 'Refresh token must not authorize API requests');
checkAccessPolicy(Jwt::isAccessPayload(Jwt::verify($legacy, $secret)), 'Previously issued access tokens remain valid during rollout');
checkAccessPolicy(!Jwt::isAccessPayload(Jwt::verify('invalid', $secret)), 'Invalid token must be rejected');

$router = file_get_contents(__DIR__ . '/../app/index.php');
$routes = file_get_contents(__DIR__ . '/../lib/routes.php');
checkAccessPolicy(str_contains($router, "(\$payload['t'] ?? 'a') !== 'a'"), 'API middleware must enforce access token type without deployment-sensitive helper calls');
checkAccessPolicy(str_contains($routes, "SELECT revoked_at FROM user_sessions WHERE user_id=? AND device_type=? AND device_id=? LIMIT 1"), 'Image download must check the exact active session');
checkAccessPolicy(str_contains($routes, 'if (!_presence_image_review_allowed($actor))'), 'Image download must enforce supervisory authorization');
checkAccessPolicy(str_contains($routes, "(int)\$actor['level']<=4"), 'Image download must reject roles below supervision level');
echo "PASS token access policy: access/refresh separation, legacy compatibility, image authorization guards\n";
