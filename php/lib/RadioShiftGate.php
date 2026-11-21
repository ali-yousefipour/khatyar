<?php
/**
 * Server-side radio shift gate, shared by both radio API versions.
 * Only a current, open staff attendance session permits ordinary staff to
 * listen or transmit. Official/management roles (level 1–4) are exempt.
 */
function kh_radio_shift_enabled(): bool {
    // Missing or invalid setting retains the historical restricted default.
    try {
        $row=Db::one("SELECT value FROM app_settings WHERE `key`='radio_limit_to_shift' LIMIT 1");
        if(!$row)return true;
        $value=json_decode((string)$row['value'],true);
        if(is_bool($value))return $value;
        if($value===0||$value==='0')return false;
        if($value===1||$value==='1')return true;
    }catch(Throwable $e){error_log('Radio shift setting unavailable: '.$e->getMessage());}
    return true;
}
function kh_radio_shift_responsible(array $user): bool {
    $level=(int)($user['level']??99);
    return $level>=1 && $level<=4;
}
function kh_radio_shift_personal_limit(array $user): bool {
    if(!kh_radio_shift_responsible($user))return false;
    $uid=(int)($user['id']??0);
    if($uid<=0)return false;
    try {
        $row=Db::one("SELECT shift_limit_enabled FROM radio_user_settings WHERE user_id=? LIMIT 1",[$uid]);
        return $row!==null && !empty($row['shift_limit_enabled']);
    }catch(Throwable $e){
        // When the legacy table has not yet been migrated, keep management
        // staff's former exemption until their feature is initialized.
        error_log('Radio personal shift limit unavailable: '.$e->getMessage());
        return false;
    }
}
function kh_radio_shift_restricted(array $user): bool {
    return kh_radio_shift_responsible($user)
        ? kh_radio_shift_personal_limit($user)
        : kh_radio_shift_enabled();
}
function kh_radio_shift_started_at(array $user): ?string {
    $uid=(int)($user['id']??0);
    if($uid<=0)return null;
    $row=Db::one("SELECT id,check_in,check_out FROM staff_attendance
        WHERE user_id=? AND check_in<=NOW()
        AND check_in>=DATE_SUB(NOW(),INTERVAL 24 HOUR)
        ORDER BY check_in DESC,id DESC LIMIT 1",[$uid]);
    return $row !== null && !empty($row['id']) && empty($row['check_out'])
        ? (string)$row['check_in'] : null;
}
function kh_radio_shift_allowed(array $user): bool {
    $uid=(int)($user['id']??0);
    if($uid<=0)return false;
    if (!kh_radio_shift_restricted($user)) return true;
    // Inspect the latest punch (including checked-out rows). An older unclosed
    // row must never re-authorize someone who has already checked out.
    $row=Db::one("SELECT id,check_in,check_out FROM staff_attendance
        WHERE user_id=? AND check_in<=NOW()
        AND check_in>=DATE_SUB(NOW(),INTERVAL 24 HOUR)
        ORDER BY check_in DESC,id DESC LIMIT 1",[$uid]);
    return $row !== null && !empty($row['id']) && empty($row['check_out']);
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
