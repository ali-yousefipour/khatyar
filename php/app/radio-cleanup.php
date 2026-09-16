<?php
/**
 * پاکسازی آرشیو بی‌سیم بر اساس تنظیمات مدیریتی.
 *
 * مقدار پیش‌فرض نگهداری پیام‌های بی‌سیم ۲۴ ساعت است.
 * اگر مدیر مقدار بیشتری در تنظیمات قدیمی radio_archive_retention_* ثبت کند،
 * همان مقدار اعمال می‌شود.
 * این فایل باید از طریق cron_all.php حداقل روزی یک‌بار اجرا شود.
 */
ini_set('display_errors', '0');
$ROOT = __DIR__ . '/..';
require "$ROOT/lib/Db.php";

const RADIO_RETENTION_DEFAULT_HOURS = 24;
const RADIO_CLEANUP_BATCH = 500;

function radio_cleanup_table($table) {
    $r = Db::one(
        "SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
        [$table]
    );
    return (int)($r['c'] ?? 0) > 0;
}

function radio_cleanup_column($table, $column) {
    $r = Db::one(
        "SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
        [$table, $column]
    );
    return (int)($r['c'] ?? 0) > 0;
}

function radio_cleanup_index($table, $index) {
    $r = Db::one(
        "SELECT COUNT(*) c FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?",
        [$table, $index]
    );
    return (int)($r['c'] ?? 0) > 0;
}

/** مقدار نگهداری: تنظیم قدیمی فعال است و اگر تنظیمی ثبت نشده باشد ۲۴ ساعت است. */
function radio_cleanup_retention_hours() {
    try {
        if (radio_cleanup_table('app_settings')) {
            $r = Db::one(
                "SELECT value FROM app_settings WHERE `key`='radio_archive_retention_hours' LIMIT 1"
            );
            $v = (int)($r['value'] ?? 0);
            if ($v > 0) return max(1, min(87600, $v));

            $r = Db::one(
                "SELECT value FROM app_settings WHERE `key`='radio_archive_retention_days' LIMIT 1"
            );
            $d = (int)($r['value'] ?? 0);
            if ($d > 0) return max(1, min(87600, $d * 24));
        }
    } catch (Throwable $e) {
        // در صورت خطای تنظیمات، مقدار پیش‌فرض اعمال می‌شود.
    }

    return RADIO_RETENTION_DEFAULT_HOURS;
}

/**
 * فقط فایل‌های داخل پوشه uploads/radio اجازه حذف دارند.
 * این کنترل جلوی حذف اشتباه فایل خارج از آرشیو بی‌سیم را می‌گیرد.
 */
function radio_cleanup_audio_file($relativePath) {
    $relativePath = str_replace('\\', '/', trim((string)$relativePath));
    if ($relativePath === '') return ['status' => 'empty'];

    $base = realpath(__DIR__ . '/uploads/radio');
    if ($base === false) return ['status' => 'base_missing'];

    $candidate = __DIR__ . '/' . ltrim($relativePath, '/');
    $real = realpath($candidate);
    if ($real === false || !is_file($real)) return ['status' => 'missing'];

    $baseNorm = rtrim(str_replace('\\', '/', $base), '/') . '/';
    $realNorm = str_replace('\\', '/', $real);
    if (strpos($realNorm, $baseNorm) !== 0) {
        return ['status' => 'outside_radio_dir'];
    }

    return @unlink($real) ? ['status' => 'deleted'] : ['status' => 'unlink_failed'];
}

try {
    if (!radio_cleanup_table('radio_messages')) {
        echo json_encode([
            'ok' => true,
            'retention_hours' => RADIO_RETENTION_DEFAULT_HOURS,
            'deleted' => 0,
            'message' => 'radio_messages table not found'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        exit;
    }

    // برای پاکسازی روی created_at ایندکس داشته باشیم تا با رشد جدول مجبور به اسکن کامل نشویم.
    if (radio_cleanup_column('radio_messages', 'created_at') && !radio_cleanup_index('radio_messages', 'idx_radio_messages_created_at')) {
        try {
            Db::run('ALTER TABLE radio_messages ADD KEY idx_radio_messages_created_at(created_at)');
        } catch (Throwable $e) {
            // اگر هم‌زمان توسط درخواست دیگری ساخته شده باشد، ادامه می‌دهیم.
        }
    }

    $retentionHours = radio_cleanup_retention_hours();
    $deleted = 0;
    $missingFiles = 0;
    $unlinkFailed = 0;
    $outsidePath = 0;
    $batches = 0;
    $cutoff = date('Y-m-d H:i:s', time() - ($retentionHours * 3600));

    // در صورت حجم زیاد، پاکسازی را در بسته‌های کوچک انجام می‌دهیم تا قفل طولانی روی جدول ایجاد نشود.
    while ($batches < 20) {
        $rows = Db::all(
            "SELECT id, audio_path FROM radio_messages
             WHERE created_at < ?
             ORDER BY created_at ASC, id ASC
             LIMIT " . RADIO_CLEANUP_BATCH,
            [$cutoff]
        );
        if (!$rows) break;
        $batches++;

        foreach ($rows as $m) {
            $fileResult = radio_cleanup_audio_file($m['audio_path'] ?? '');
            if ($fileResult['status'] === 'missing') $missingFiles++;
            elseif ($fileResult['status'] === 'unlink_failed') $unlinkFailed++;
            elseif ($fileResult['status'] === 'outside_radio_dir') $outsidePath++;

            // انقضای پیام باید قطعی باشد؛ حتی اگر فایل فیزیکی قبلاً حذف شده یا حذف فایل موقتاً مشکل داشته باشد.
            Db::run('DELETE FROM radio_messages WHERE id=?', [(int)$m['id']]);
            $deleted++;
        }

        if (count($rows) < RADIO_CLEANUP_BATCH) break;
    }

    echo json_encode([
        'ok' => true,
        'retention_hours' => $retentionHours,
        'retention_days' => (int)ceil($retentionHours / 24),
        'default_retention_hours' => RADIO_RETENTION_DEFAULT_HOURS,
        'cutoff' => $cutoff,
        'deleted' => $deleted,
        'missing_files' => $missingFiles,
        'unlink_failed' => $unlinkFailed,
        'outside_radio_dir' => $outsidePath,
        'batches' => $batches
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'retention_hours' => radio_cleanup_retention_hours(),
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
}
