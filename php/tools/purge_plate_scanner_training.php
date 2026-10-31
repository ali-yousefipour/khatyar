<?php
/**
 * One-time removal of the retired plate-scanner training dataset.
 * CLI only; dry-run by default. Run on the production host with --execute
 * after verifying the reported row count and taking a database backup.
 * Never deletes drivers, vehicles or their photos.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit(1); }
require_once __DIR__.'/../lib/Db.php';
require_once __DIR__.'/../lib/Media.php';

$execute = in_array('--execute', $argv, true);
$pdo = Db::pdo();
$exists = (bool)Db::one("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='plate_scan_samples'")['n'];
if (!$exists) { fwrite(STDOUT, "No scanner training table exists.\n"); exit(0); }
$count = (int)Db::one('SELECT COUNT(*) AS n FROM plate_scan_samples')['n'];
fwrite(STDOUT, "plate_scan_samples: {$count} rows; mode=".($execute?'DELETE':'DRY-RUN')."\n");
if (!$execute) { fwrite(STDOUT, "Backup first, then run with --execute on the host.\n"); exit(0); }

$paths = [];
$lastId = 0;
do {
  $rows = Db::all('SELECT id,original_image_path,crop_image_path FROM plate_scan_samples WHERE id>? ORDER BY id LIMIT 500', [$lastId]);
  foreach ($rows as $row) {
    $lastId = (int)$row['id'];
    foreach (['original_image_path','crop_image_path'] as $column) {
      $path = (string)($row[$column] ?? '');
      if (preg_match('#^uploads/plate_samples(?:_original)?/[a-zA-Z0-9_./-]+\.jpe?g$#', $path)
        && strpos($path, '..') === false) $paths[$path] = true;
    }
  }
} while (count($rows) === 500);

$pdo->beginTransaction();
try {
  Db::run('DELETE FROM plate_scan_samples');
  $pdo->commit();
} catch (Throwable $error) {
  $pdo->rollBack();
  throw $error;
}
$deleted = 0; $failed = 0;
foreach (array_keys($paths) as $path) {
  $full = Media::fullPath($path);
  if (!$full || !is_file($full)) continue;
  if (@unlink($full)) $deleted++; else $failed++;
}
fwrite(STDOUT, "Removed {$count} training rows and {$deleted} owned JPEGs; failed file removals: {$failed}.\n");
exit($failed ? 2 : 0);
