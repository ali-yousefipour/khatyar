<?php
class Http {
  public static $currentToken = null;
  private static $clientRequest = null;
  private static $clientRequestReady = false;

  private static function clientRequestKey($body) {
    $uuid = is_array($body) ? trim((string)($body['client_uuid'] ?? '')) : '';
    if ($uuid === '' || strlen($uuid) > 191 || !preg_match('/^[A-Za-z0-9._:-]+$/', $uuid)) return null;
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '/';
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'POST'));
    return [$uuid, $method, $path, hash('sha256',$uuid."\n".$method."\n".$path)];
  }
  private static function beginClientRequest($body) {
    if (self::$clientRequestReady) return;
    self::$clientRequestReady = true;
    $key = self::clientRequestKey($body);
    if (!$key || !class_exists('Db')) return;
    [$uuid,$method,$path,$requestHash] = $key;
    try {
      Db::run("CREATE TABLE IF NOT EXISTS api_client_requests_v2 (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        request_hash CHAR(64) NOT NULL,
        client_uuid VARCHAR(191) NOT NULL,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(191) NOT NULL,
        status_code SMALLINT NOT NULL DEFAULT 102,
        response_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        PRIMARY KEY(id),
        UNIQUE KEY uq_api_client_request_hash(request_hash),
        KEY idx_api_client_request_created(created_at),
        KEY idx_api_client_request_uuid(client_uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
      $row = Db::one("SELECT id,status_code,response_json,created_at FROM api_client_requests_v2 WHERE request_hash=? LIMIT 1",[$requestHash]);
      if ($row) {
        $age = time() - (strtotime((string)$row['created_at']) ?: time());
        if ((int)$row['status_code'] >= 200 && (int)$row['status_code'] < 300 && !empty($row['response_json'])) {
          $data = json_decode($row['response_json'], true);
          if (json_last_error() === JSON_ERROR_NONE) self::json($data,(int)$row['status_code']);
        }
        if ((int)$row['status_code'] === 102 && $age < 600) self::error('این عملیات هم‌زمان در حال پردازش است. لطفاً کمی بعد دوباره تلاش کنید.',409);
        Db::run("DELETE FROM api_client_requests_v2 WHERE id=?",[$row['id']]);
      }
      try { Db::run("INSERT INTO api_client_requests_v2(request_hash,client_uuid,method,path,status_code) VALUES(?,?,?,?,102)",[$requestHash,$uuid,$method,$path]); }
      catch (Throwable $e) {
        $row = Db::one("SELECT id,status_code,response_json FROM api_client_requests_v2 WHERE request_hash=? LIMIT 1",[$requestHash]);
        if ($row && (int)$row['status_code'] >= 200 && (int)$row['status_code'] < 300 && !empty($row['response_json'])) {
          $data = json_decode($row['response_json'], true);
          if (json_last_error() === JSON_ERROR_NONE) self::json($data,(int)$row['status_code']);
        }
      }
      self::$clientRequest = [$requestHash,$uuid,$method,$path];
    } catch (Throwable $e) {
      self::$clientRequest = null;
    }
  }
  private static function finishClientRequest($data,$code) {
    if (!self::$clientRequest || !class_exists('Db')) return;
    [$requestHash,$uuid,$method,$path] = self::$clientRequest;
    try {
      if ($code >= 200 && $code < 300) {
        Db::run("UPDATE api_client_requests_v2 SET status_code=?,response_json=?,completed_at=NOW() WHERE request_hash=?",[$code,json_encode($data,JSON_UNESCAPED_UNICODE),$requestHash]);
      } else {
        Db::run("DELETE FROM api_client_requests_v2 WHERE request_hash=?",[$requestHash]);
      }
    } catch (Throwable $e) {}
  }

  public static function body() {
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    $max = 5 * 1024 * 1024;
    if ($len > $max) self::error('حجم درخواست بیش از حد مجاز است', 413);
    $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
      $body = is_array($_POST) ? $_POST : [];
      self::beginClientRequest($body);
      return $body;
    }
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) { self::beginClientRequest([]); return []; }
    $j = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) self::error('فرمت JSON نامعتبر است', 400);
    $body = is_array($j) ? $j : [];
    self::beginClientRequest($body);
    return $body;
  }
  private static function stampMediaUrls($data) {
    if (is_array($data)) { foreach ($data as $k => $v) $data[$k] = self::stampMediaUrls($v); return $data; }
    if (is_string($data) && self::$currentToken && strpos($data, '/api/media?path=') === 0 && strpos($data, 'token=') === false) return $data . '&token=' . urlencode(self::$currentToken);
    return $data;
  }
  public static function json($data, $code = 200) {
    if (self::$currentToken) $data = self::stampMediaUrls($data);
    self::finishClientRequest($data,$code);
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
  }
  public static function error($msg, $code = 400) { self::json(['error' => $msg], $code); }
  public static function bearer() {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!$h && function_exists('apache_request_headers')) { $hdrs = apache_request_headers(); $h = $hdrs['Authorization'] ?? ($hdrs['authorization'] ?? ''); }
    if (stripos($h, 'Bearer ') === 0) return substr($h, 7);
    if (!empty($_GET['token'])) {
      $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
      $allowed = ['#^/api/admin/[^/]+/export$#', '#^/api/admin/.*/export$#', '#^/api/reports/export$#', '#^/api/admin/backup$#', '#^/api/admin/backup-json$#', '#^/api/media$#'];
      if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') foreach ($allowed as $re) if (preg_match($re, $path)) return $_GET['token'];
    }
    return null;
  }
}
