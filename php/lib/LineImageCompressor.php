<?php
/**
 * JPEG normalization/compression for line/station photos.
 * Reads the existing site image-compression settings when available.
 * No separate line-location quality setting is introduced.
 */
final class LineImageCompressor
{
    private static ?array $settings = null;

    public static function settings(): array
    {
        if (self::$settings !== null) return self::$settings;

        $out = [
            'enabled' => true,
            'quality' => 82,
            'max_width' => 1920,
            'max_height' => 1920,
        ];

        $aliases = [
            'enabled' => ['image_compression_enabled','compress_images','images_compression_enabled'],
            'quality' => ['image_compression_quality','image_quality','compression_quality','photo_quality'],
            'max_width' => ['image_compression_max_width','image_max_width','compression_max_width'],
            'max_height' => ['image_compression_max_height','image_max_height','compression_max_height'],
        ];

        try {
            $tables = Db::all("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME LIKE '%setting%'");
            foreach ($tables as $tr) {
                $table = $tr['TABLE_NAME'] ?? '';
                if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) continue;
                $cols = Db::all("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [$table]);
                $names = array_map(static fn($r) => strtolower((string)($r['COLUMN_NAME'] ?? '')), $cols);
                $keyCol = self::firstColumn($names, ['setting_key','key','name','code','slug']);
                $valueCol = self::firstColumn($names, ['setting_value','value','val','content']);
                if (!$keyCol || !$valueCol) continue;
                foreach ($aliases as $target => $keys) {
                    foreach ($keys as $key) {
                        $row = Db::one("SELECT `$valueCol` AS v FROM `$table` WHERE `$keyCol`=? LIMIT 1", [$key]);
                        if ($row && array_key_exists('v', $row) && $row['v'] !== '') {
                            $out[$target] = $row['v'];
                            break;
                        }
                    }
                }
            }
        } catch (Throwable $e) {
            // Site settings are optional; safe defaults keep station capture working.
        }

        $out['enabled'] = !in_array(strtolower(trim((string)$out['enabled'])), ['0','false','off','no'], true);
        $out['quality'] = max(1, min(100, (int)$out['quality']));
        $out['max_width'] = max(320, min(8000, (int)$out['max_width']));
        $out['max_height'] = max(320, min(8000, (int)$out['max_height']));
        return self::$settings = $out;
    }

    private static function firstColumn(array $available, array $candidates): ?string
    {
        foreach ($candidates as $candidate) if (in_array(strtolower($candidate), $available, true)) return $candidate;
        return null;
    }

    public static function fromBinary(string $binary, string $absolutePath): bool
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) return false;
        $cfg = self::settings();
        $src = @imagecreatefromstring($binary);
        if (!$src) return false;

        $srcW = imagesx($src); $srcH = imagesy($src);
        $scale = min(1, $cfg['max_width'] / max(1, $srcW), $cfg['max_height'] / max(1, $srcH));
        $dstW = max(1, (int)round($srcW * $scale));
        $dstH = max(1, (int)round($srcH * $scale));
        $dst = imagecreatetruecolor($dstW, $dstH);
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefill($dst, 0, 0, $white);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);

        $dir = dirname($absolutePath);
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $ok = @imagejpeg($dst, $absolutePath, $cfg['enabled'] ? $cfg['quality'] : 100);
        imagedestroy($src); imagedestroy($dst);
        return (bool)$ok;
    }

    public static function fromUpload(string $tmp, string $absolutePath): bool
    {
        $binary = @file_get_contents($tmp);
        return is_string($binary) && self::fromBinary($binary, $absolutePath);
    }
}
