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
securityAssert(str_contains($routes, "(int)(\$payload['image_id'] ?? 0) !== (int)\$p['id']"), 'Image ID must be checked');
securityAssert(str_contains($routes, "(\$payload['kind'] ?? '') !== \$requestedKind"), 'Image kind must be checked');
securityAssert(!str_contains($routes, "'&token='.\$tok"), 'Access token must never be embedded in image URLs');
securityAssert(str_contains($router, "!empty(\$user['must_change_pw'])"), 'API must enforce first-login password change');
securityAssert(str_contains($routes, 'strlen($initialPassword) < 12'), 'Initial password must meet minimum strength');
echo "PASS image security: scoped links, session binding, access-token separation, server-side first-login gate\n";
