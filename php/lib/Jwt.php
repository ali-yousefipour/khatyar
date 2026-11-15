<?php
class Jwt {
  private static function b64($d){ return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
  private static function b64d($d){ return base64_decode(strtr($d, '-_', '+/')); }
  public static function sign($payload, $secret, $ttl) {
    $payload['iat'] = time(); $payload['exp'] = time() + $ttl;
    $h = self::b64(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $p = self::b64(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $sig = self::b64(hash_hmac('sha256', "$h.$p", $secret, true));
    return "$h.$p.$sig";
  }
  public static function verify($token, $secret, $allowExpiredAndroidRefresh = false) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $sig] = $parts;
    $header = json_decode(self::b64d($h), true);
    if (($header['alg'] ?? '') !== 'HS256' || ($header['typ'] ?? 'JWT') !== 'JWT') return null;
    $expected = self::b64(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(self::b64d($p), true);
    if (!is_array($payload)) return null;
    // Android refresh credentials are non-expiring only at the dedicated
    // renewal endpoint. Signature, token purpose and exact server-side device
    // session MUST still be verified. Access/web/media tokens always expire.
    $androidRefresh = $allowExpiredAndroidRefresh === true
      && ($payload['dt'] ?? '') === 'android'
      && ($payload['t'] ?? '') === 'r'
      && is_string($payload['device_id'] ?? null)
      && strlen($payload['device_id']) >= 6
      && (int)($payload['sub'] ?? 0) > 0;
    if (!$androidRefresh && ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
  }
  // Legacy access tokens have no type claim. Refresh tokens must never authorize API reads.
  public static function isAccessPayload($payload) {
    return is_array($payload) && in_array($payload['t'] ?? 'a', ['a'], true);
  }
}
