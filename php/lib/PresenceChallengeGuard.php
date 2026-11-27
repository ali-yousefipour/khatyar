<?php
declare(strict_types=1);

/**
 * Authoritative time/identity checks for presence submissions.
 * A device-generated timestamp alone is not evidence of a valid challenge.
 * Callers must check every challenge before committing images.
 */
final class PresenceChallengeGuard {
    private const ZONE='Asia/Tehran';

    private static function localDate(int $timestamp, string $format): string {
        return (new DateTimeImmutable('@'.$timestamp))->setTimezone(new DateTimeZone(self::ZONE))->format($format);
    }

    private static function requireWindow(int $captured, int $start, int $minutes): void {
        if ($captured < $start || $captured >= $start + $minutes * 60) {
            throw new DomainException('تصاویر خارج از مهلت معتبر صحت‌سنجی ثبت شده‌اند.');
        }
    }

    public static function validate(array $body, int $userId, int $captured, array $policy, callable $findNotification, callable $findAttendance): array {
        $slot=(string)($body['slot']??'');
        $requestId=(string)($body['request_id']??'');
        if($userId<=0 || !preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9]$/D',$slot)
            || $requestId==='' || strlen($requestId)>128) {
            throw new DomainException('شناسه یا بازه درخواست صحت‌سنجی معتبر نیست.');
        }
        // Preserve legitimate late OFFLINE uploads, but do not permit future
        // device timestamps or records older than the retention window.
        if($captured>time()+300 || $captured<time()-30*86400) {
            throw new DomainException('زمان ثبت تصویر معتبر نیست.');
        }
        $day=self::localDate($captured,'Y-m-d');
        $random=!empty($body['random']);
        $immediate=!empty($body['immediate']);
        if($random && $immediate)throw new DomainException('نوع درخواست صحت‌سنجی متناقض است.');

        if($random) {
            // A locally generated challenge is not a server-signed random proof.
            // Require a real user-owned attendance session and enforce the
            // generated challenge's chronological 8-hour session boundary.
            if(!preg_match('/^local_(?:(\d+)_)?(\d{10})_(\d{10})$/D',$requestId,$m))
                throw new DomainException('شناسه صحت‌سنجی تصادفی معتبر نیست.');
            $encodedUser=($m[1]??'')!==''?(int)$m[1]:$userId;
            $sessionStart=(int)$m[2];
            $challengeAt=(int)$m[3];
            if($encodedUser!==$userId || abs($captured-$challengeAt)>600
                || $challengeAt<$sessionStart || $challengeAt>=$sessionStart+8*3600
                || self::localDate($challengeAt,'H:i')!==$slot) {
                throw new DomainException('زمان یا مالک صحت‌سنجی تصادفی معتبر نیست.');
            }
            $attendance=$findAttendance($userId,$sessionStart);
            if(!$attendance || abs(strtotime((string)($attendance['check_in']??''))-$sessionStart)>2) {
                throw new DomainException('جلسه حضور مرتبط با صحت‌سنجی یافت نشد.');
            }
            $checkOut=(string)($attendance['check_out']??'');
            if($checkOut!=='' && ($out=strtotime($checkOut))!==false && $challengeAt>=$out) {
                throw new DomainException('درخواست صحت‌سنجی پس از پایان حضور ثبت شده است.');
            }
            $window=min(10,max(3,(int)($policy['window_minutes']??3)));
            self::requireWindow($captured,$challengeAt,$window);
            return ['kind'=>'random','request_id'=>$requestId,'start'=>$challengeAt,'window_minutes'=>$window];
        }

        if($immediate) {
            $notice=$findNotification($userId,$requestId);
            if(!$notice || empty($notice['immediate']) || (string)($notice['request_id']??'')!==$requestId)
                throw new DomainException('درخواست فوری معتبر یا متعلق به این کاربر نیست.');
            $ts=(int)($notice['ts']??0);
            $window=max(1,min(30,(int)($notice['window_minutes']??3)));
            if($ts<=0 || self::localDate($ts,'H:i')!==$slot)
                throw new DomainException('زمان درخواست فوری معتبر نیست.');
            self::requireWindow($captured,$ts,$window);
            return ['kind'=>'immediate','request_id'=>$requestId,'start'=>$ts,'window_minutes'=>$window];
        }

        if(empty($policy['enabled']) || !empty($policy['random_enabled']))
            throw new DomainException('صحت‌سنجی زمان‌بندی‌شده فعال نیست.');
        if($requestId!==$day.'_'.$slot || !in_array($slot,$policy['slots']??[],true))
            throw new DomainException('بازه درخواست با برنامه معتبر روز مطابقت ندارد.');
        $start=(new DateTimeImmutable($day.' '.$slot.':00',new DateTimeZone(self::ZONE)))->getTimestamp();
        $window=max(1,min(30,(int)($policy['window_minutes']??3)));
        self::requireWindow($captured,$start,$window);
        return ['kind'=>'fixed','request_id'=>$requestId,'start'=>$start,'window_minutes'=>$window];
    }
}
