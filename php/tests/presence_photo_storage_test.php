<?php
class Http {
  static function error($message, $status) { throw new RuntimeException($message, $status); }
}
class Db {
  static $existing = null;
  static $writes = [];
  static function one($query, $params) { return self::$existing; }
  static function run($query, $params) { self::$writes[] = $params; }
  static function insert($query, $params) { self::$writes[] = $params; return 12; }
}
class Media {
  static $results = [];
  static $deleted = [];
  static function saveBase64($data, $type, $width, $quality) { return array_shift(self::$results); }
  static function delete($path) { self::$deleted[] = $path; }
}

$source = file_get_contents(__DIR__.'/../lib/routes.php');
$start = strpos($source, "route('POST', '/api/my/presence-check', ");
if ($start === false) throw new RuntimeException('Presence route not found');
$start += strlen("route('POST', '/api/my/presence-check', ");
$end = strpos($source, "\n});", $start);
if ($end === false) throw new RuntimeException('Presence route end not found');
$handler = eval('return '.substr($source, $start, $end - $start)."\n};");
$body = ['slot'=>'10:30', 'selfie'=>'data:image/jpeg;base64,selfie', 'vehicles_photo'=>'data:image/jpeg;base64,vehicles'];

foreach ([null, ['id'=>7]] as $existing) {
  foreach ([[null, 'vehicles.jpg'], ['selfie.jpg', null], [null, null], ['selfie.jpg', 'vehicles.jpg']] as $results) {
    Db::$existing = $existing;
    Db::$writes = [];
    Media::$results = $results;
    Media::$deleted = [];
    $success = $results[0] !== null && $results[1] !== null;
    try {
      $response = $handler([], $body, ['id'=>1]);
      if (!$success || !$response['ok'] || count(Db::$writes) !== 1) throw new LogicException('Unexpected success or missing database write');
      if ($response['id'] !== ($existing ? 7 : 12)) throw new LogicException('Wrong record id');
    } catch (RuntimeException $error) {
      if ($success || $error->getCode() !== 500 || Db::$writes !== []) throw $error;
      $expected = array_values(array_filter($results));
      if (Media::$deleted !== $expected) throw new LogicException('Partially saved photos were not cleaned up');
    }
  }
}
echo "PASS presence insert/update: both photos required, failed saves rejected, partial files cleaned up\n";
