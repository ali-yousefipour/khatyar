<?php
/**
 * Server-side radio shift gate, shared by both radio API versions.
 * Only a current, open staff attendance session permits ordinary staff to
 * listen or transmit. Official/management roles (level 1–4) are exempt.
 */
function kh_radio_shift_enabled(): bool {
    $row=Db::one("SELECT value FROM app_settings WHERE `key`='radio_limit_to_shift' LIMIT 1");
    $value=trim((string)($row['value']??''));
    return in_array(strtolower($value), ['1','true','yes','on'], true);
}
function kh_radio_shift_responsible(array $user): bool {
    $level=(int)($user['level']??99);
    return !empty($user['is_admin']) || ($level>=1 && $level<=4);
}
function kh_radio_shift_allowed(array $user): bool {
    if (!kh_radio_shift_enabled() || kh_radio_shift_responsible($user)) return true;
    $uid=(int)($user['id']??0);
    if($uid<=0)return false;
    // The live check-in is the authoritative indication that this user is
    // currently inside their work shift. Reject future and stale open records.
    // MAX 24h also allows overnight / rotating shifts, but not abandoned sessions.
    $row=Db::one("SELECT id FROM staff_attendance WHERE user_id=? AND check_in<=NOW()
        AND check_in>=DATE_SUB(NOW(),INTERVAL 24 HOUR) AND check_out IS NULL
        ORDER BY check_in DESC LIMIT 1",[$uid]);
    return !empty($row);
}
function kh_radio_shift_require(array $user): void {
    if (!kh_radio_shift_allowed($user)) {
        // Consistent code makes it safe for the app/native background service
        // to stop playback and retry after the next check-in.
        if (function_exists('re')) re('بی‌سیم فقط هنگام حضور در شیفت کاری فعال است. ابتدا ورود خود را ثبت کنید.',403);
        if (function_exists('radio_error')) radio_error('بی‌سیم فقط هنگام حضور در شیفت کاری فعال است. ابتدا ورود خود را ثبت کنید.',403);
        throw new RuntimeException('Radio access denied outside shift');
    }
}
