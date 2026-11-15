<?php
// بارگذاری تنظیمات از فایل .env (در صورت وجود) یا متغیرهای محیطی
// محافظ function_exists تا با require چندباره، تابع دوباره تعریف نشود
if (!function_exists('load_env')) {
  function load_env($path) {
    if (!is_file($path)) return;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
      if ($line === '' || $line[0] === '#') continue;
      $p = strpos($line, '='); if ($p === false) continue;
      $k = trim(substr($line, 0, $p)); $v = trim(substr($line, $p + 1));
      if (getenv($k) === false) putenv("$k=$v");
      $_ENV[$k] = $v;
    }
  }
}

date_default_timezone_set('Asia/Tehran');
load_env(__DIR__ . '/.env');

return [
  'db_host' => getenv('DB_HOST') ?: 'localhost',
  'db_name' => getenv('DB_NAME') ?: 'h301194_app',
  'db_user' => getenv('DB_USER') ?: 'h301194_app',
  'db_pass' => getenv('DB_PASS') ?: '',
  'jwt_secret' => getenv('JWT_SECRET') ?: (function(){
    // Never create a new in-memory JWT key on every request when PHP cannot
    // write to a shared host. That silently invalidates all other sessions.
    $f = __DIR__ . '/.jwt_secret';
    $handle = @fopen($f, 'c+');
    if (!$handle) {
      error_log('JWT_SECRET missing and persisted key cannot be opened');
      throw new RuntimeException('JWT signing key is not persisted');
    }
    try {
      if (!flock($handle, LOCK_EX)) throw new RuntimeException('Cannot lock JWT signing key');
      rewind($handle);
      $secret = trim((string)stream_get_contents($handle));
      if (strlen($secret) < 32) {
        if ($secret !== '') throw new RuntimeException('Persisted JWT signing key is too short');
        $secret = bin2hex(random_bytes(48));
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, $secret) !== strlen($secret) || !fflush($handle))
          throw new RuntimeException('Cannot persist JWT signing key');
        @chmod($f, 0600);
      }
      flock($handle, LOCK_UN);
      return $secret;
    } finally { fclose($handle); }
  })(),
  'access_ttl' => 30 * 24 * 3600, // نشست تا زمان خروج
  'refresh_ttl' => 30 * 24 * 3600,
  'public_url' => getenv('PUBLIC_URL') ?: '',
  'upgrade_key' => getenv('UPGRADE_KEY') ?: 'change-this-upgrade-key',
];
