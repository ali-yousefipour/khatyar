<?php
require_once __DIR__ . '/../lib/Jwt.php';

function securityAssert($ok, $label) {
  if (!$ok) throw new RuntimeException($label);
}

$routes = file_get_contents(__DIR__.'/../lib/routes.php');
$router = file_get_contents(__DIR__.'/../app/index.php');
$begin = strpos($routes, 'function _presence_image_token(');
$end = strpos($routes, '// اعتبارسنجی مختصات جغرافیایی', $begin);
securityAssert($begin !== false && $end !== false, 'Scoped image signer not found');
eval(substr($routes, $begin, $end-$begin));

$GLOBALS['CONFIG'] = ['jwt_secret'=>'unit-test-key-only'];
$actor = ['id'=>7,'device_type'=>'web','device_id'=>'test-device'];
$token = _presence_image_token($actor, 12, 'selfie', 30);
$payload = Jwt::verify($token, $GLOBALS['CONFIG']['jwt_secret']);
securityAssert($payload['t']==='presence-image' && $payload['image_id']===12 && $payload['kind']==='selfie', 'Token must be image-scoped');
securityAssert($payload['device_id']==='test-device' && $payload['sub']===7, 'Token must bind to the session');
securityAssert(!Jwt::isAccessPayload($payload), 'Image token must not authorize general API access');
securityAssert(_presence_image_review_allowed(['is_active'=>1,'level'=>4,'is_admin'=>0]), 'Level 4 reviewer must be able to open images');
securityAssert(_presence_image_review_allowed(['is_active'=>1,'level'=>1,'is_admin'=>1]), 'Level 1 reviewer must retain access');
securityAssert(!_presence_image_review_allowed(['is_active'=>1,'level'=>5,'is_admin'=>0]), 'Level 5 must not gain image access');
securityAssert(!_presence_image_review_allowed(['is_active'=>0,'level'=>4,'is_admin'=>0]), 'Inactive reviewer must not gain image access');
foreach (['/api/admin/presence-checks', '/api/admin/presence-checks/export', '/api/admin/presence-checks/{id}', '/api/admin/presence-violations'] as $routePath) {
  securityAssert((bool)preg_match('~route\(\x27GET\x27,\s*\x27'.preg_quote($routePath,'~').'\x27,[\s\S]*?\}, false, 4\);~',$routes), 'Level 4 presence review route missing: '.$routePath);
}
securityAssert(str_contains($routes, "(int)(\$payload['image_id'] ?? 0) !== (int)\$p['id']"), 'Image ID must be checked');
securityAssert(str_contains($routes, "(\$payload['kind'] ?? '') !== \$requestedKind"), 'Image kind must be checked');
securityAssert(!str_contains($routes, "'&token='.\$tok"), 'Access token must never be embedded in image URLs');
securityAssert(str_contains($router, "!empty(\$user['must_change_pw'])"), 'API must enforce first-login password change');
securityAssert(str_contains($routes, 'strlen($initialPassword) < 12'), 'Initial password must meet minimum strength');
echo "PASS image security: scoped links, session binding, access-token separation, server-side first-login gate\n";
