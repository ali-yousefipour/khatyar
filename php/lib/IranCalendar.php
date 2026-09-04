<?php
/* خطیار — تقویم رسمی ایران
 * منبع اصلی تشخیص تعطیلات: تقویم رسمی کشور.
 * جدول holidays فقط برای تعطیلات دستی سازمان است و با تقویم رسمی ادغام می‌شود.
 */
class IranCalendar
{
    private static $years = [
        1405 => [
            '01-01'=>'نوروز و تعطیل عید فطر',
            '01-02'=>'عید نوروز',
            '01-03'=>'عید نوروز',
            '01-04'=>'عید نوروز',
            '01-12'=>'روز جمهوری اسلامی ایران',
            '01-13'=>'روز طبیعت',
            '01-24'=>'شهادت امام جعفر صادق (ع)',
            '03-03'=>'شهادت امام محمد باقر (ع)',
            '03-06'=>'عید سعید قربان',
            '03-14'=>'رحلت حضرت امام خمینی (ره) و عید سعید غدیر خم',
            '03-15'=>'قیام ۱۵ خرداد',
            '04-03'=>'تاسوعای حسینی',
            '04-04'=>'عاشورای حسینی',
            '05-13'=>'اربعین حسینی',
            '05-21'=>'رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)',
            '05-22'=>'شهادت امام رضا (ع)',
            '05-30'=>'شهادت امام حسن عسکری (ع) و آغاز امامت حضرت ولیعصر (عج)',
            '06-08'=>'ولادت حضرت رسول اکرم (ص) و ولادت امام جعفر صادق (ع)',
            '08-22'=>'شهادت حضرت فاطمه زهرا (س)',
            '10-02'=>'ولادت حضرت امام علی (ع) و روز پدر',
            '10-16'=>'مبعث حضرت رسول اکرم (ص)',
            '11-04'=>'ولادت حضرت قائم (عج) و نیمه شعبان',
            '11-22'=>'پیروزی انقلاب اسلامی ایران',
            '12-09'=>'شهادت حضرت علی (ع)',
            '12-19'=>'عید سعید فطر',
            '12-20'=>'تعطیل به مناسبت عید سعید فطر',
            '12-29'=>'روز ملی شدن صنعت نفت ایران',
        ],
    ];

    public static function normalize($jdate)
    {
        $s = trim(strtr((string)$jdate, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']));
        $s = str_replace(['/', '.'], '-', $s);
        if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $s, $m)) return null;
        return sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
    }

    public static function isOfficialHoliday($jdate)
    {
        $d = self::normalize($jdate);
        if (!$d) return false;
        [$y,$m,$day] = array_map('intval', explode('-', $d));
        return isset(self::$years[$y][sprintf('%02d-%02d',$m,$day)]);
    }

    public static function title($jdate)
    {
        $d = self::normalize($jdate);
        if (!$d) return null;
        [$y,$m,$day] = array_map('intval', explode('-', $d));
        return self::$years[$y][sprintf('%02d-%02d',$m,$day)] ?? null;
    }

    public static function manualTitle($jdate)
    {
        $d = self::normalize($jdate);
        if (!$d || !class_exists('Db')) return null;
        try {
            $r = Db::one("SELECT title FROM holidays WHERE jdate IN (?,?) LIMIT 1", [$d, str_replace('-','/',$d)]);
            return $r && array_key_exists('title',$r) ? trim((string)$r['title']) : null;
        } catch (Throwable $e) { return null; }
    }

    public static function isManualHoliday($jdate)
    {
        return self::manualTitle($jdate) !== null;
    }

    public static function holidays($year)
    {
        $year = (int)$year;
        $out = [];
        foreach (self::$years[$year] ?? [] as $md=>$title) $out[$year.'-'.$md] = $title;
        if (class_exists('Db')) {
            try {
                $prefix = sprintf('%04d-', $year);
                $rows = Db::all("SELECT jdate,title FROM holidays WHERE jdate LIKE ? ORDER BY jdate", [$prefix.'%']);
                foreach ($rows as $r) {
                    $d = self::normalize($r['jdate'] ?? '');
                    if (!$d) continue;
                    $out[$d] = trim((string)($r['title'] ?? '')) ?: ($out[$d] ?? 'تعطیل دستی');
                }
            } catch (Throwable $e) {}
        }
        ksort($out);
        return $out;
    }

    public static function day($jdate)
    {
        $d = self::normalize($jdate);
        if (!$d) return ['is_official_holiday'=>false,'is_manual_holiday'=>false,'is_holiday'=>false,'title'=>null,'source'=>null];
        $official = self::isOfficialHoliday($d);
        $officialTitle = self::title($d);
        $manualTitle = self::manualTitle($d);
        $manual = ($manualTitle !== null);
        $titles = array_values(array_filter([$officialTitle, $manualTitle]));
        return [
            'is_official_holiday'=>$official,
            'is_manual_holiday'=>$manual,
            'is_holiday'=>($official || $manual),
            'title'=>implode(' | ', array_unique($titles)) ?: null,
            'source'=>$official && $manual ? 'official+manual' : ($official ? 'official' : ($manual ? 'manual' : null)),
        ];
    }
}
