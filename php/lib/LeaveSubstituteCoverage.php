<?php
/**
 * Guard pending/approved daily-leave replacement reservations and expose scoped
 * confirmed leave/cover days for the "My attendance > Shift" calendar.
 * No schema changes, permanent user_shifts writes or public data exposure.
 */
final class LeaveSubstituteCoverage {
    private static function day($raw): ?string {
        $v=str_replace('/','-',trim((string)$raw));
        if(!preg_match('/^(1[34][0-9]{2})-([0-9]{1,2})-([0-9]{1,2})$/D',$v,$m))return null;
        $month=(int)$m[2];$day=(int)$m[3];
        if($month<1||$month>12||$day<1||$day>31)return null;
        return sprintf('%04d-%02d-%02d',(int)$m[1],$month,$day);
    }
    private static function range(array $body): ?array {
        $from=self::day($body['from_jdate']??$body['the_date']??null);
        $to=self::day($body['to_jdate']??$body['the_date']??$body['from_jdate']??null);
        if(!$from||!$to||$from>$to)return null;
        return [$from,$to];
    }
    private static function eligible(array $r): bool {
        return ($r['type']??'')==='annual'&&in_array(($r['unit']??'daily'),['daily',''],true);
    }
    private static function lock(int $id): void {
        // GET_LOCK serializes competing requests for a shared substitute across connections.
        $v=Db::one('SELECT GET_LOCK(?,8) AS ok',['khatyar:leave-cover:'.$id]);
        if((int)($v['ok']??0)!==1)Http::error('درخواست جایگزینی دیگری در حال ثبت است؛ دوباره تلاش کنید',409);
    }
    private static function unlock(int $id): void {
        try{Db::one('SELECT RELEASE_LOCK(?) AS ok',['khatyar:leave-cover:'.$id]);}catch(Throwable $e){error_log('leave coverage unlock failed');}
    }
    public static function conflict(int $subId,string $from,string $to,int $exclude=0,bool $earlierOnly=false): ?array {
        if($subId<=0)return null;
        $sql="SELECT r.id,r.status FROM requests r
          WHERE r.substitute_user_id=? AND r.id<>?
          AND r.type='annual' AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')
          AND r.status IN ('pending','approved')
          AND REPLACE(TRIM(COALESCE(NULLIF(r.from_jdate,''),NULLIF(r.the_date,''))),'/','-') <= ?
          AND REPLACE(TRIM(COALESCE(NULLIF(r.to_jdate,''),NULLIF(r.the_date,''),NULLIF(r.from_jdate,''))),'/','-') >= ?";
        $params=[$subId,$exclude,$to,$from];
        if($earlierOnly&&$exclude>0){$sql.=" AND (r.status='approved' OR r.id<?)";$params[]=$exclude;}
        $sql.=" ORDER BY (r.status='approved') DESC,r.id ASC LIMIT 1";
        return Db::one($sql,$params);
    }
    private static function ensureAvailable(int $subId,string $from,string $to,int $exclude=0,bool $earlierOnly=false): void {
        $busy=self::conflict($subId,$from,$to,$exclude,$earlierOnly);
        if($busy)Http::error('نیروی انتخاب‌شده در این بازه برای درخواست مرخصی دیگری رزرو شده یا جایگزینی تأییدشده دارد. جایگزین دیگری انتخاب کنید.',409);
    }
    private static function guardRegistration(array $body,callable $original,array $params,$user) {
        if(!self::eligible($body)||empty($body['substitute_user_id']))
            return $original($params,$body,$user);
        $subId=(int)$body['substitute_user_id'];$range=self::range($body);
        if($subId<=0||!$range)return $original($params,$body,$user); // Canonical handler validates fields.
        self::lock($subId);
        try{
            self::ensureAvailable($subId,$range[0],$range[1]);
            return $original($params,$body,$user);
        }finally{self::unlock($subId);}
    }
    private static function guardApproval(array $params,array $body,$user,callable $original) {
        $state=(string)($body['status']??$body['decision']??'');
        if(!in_array($state,['approved','approve'],true))return $original($params,$body,$user);
        $id=(int)($params['id']??0);
        if($id<=0)return $original($params,$body,$user);
        $row=Db::one('SELECT id,type,unit,substitute_user_id,from_jdate,to_jdate,the_date,status FROM requests WHERE id=?',[$id]);
        if(!$row||!self::eligible($row)||empty($row['substitute_user_id']))return $original($params,$body,$user);
        $subId=(int)$row['substitute_user_id'];$range=self::range($row);
        if(!$range)return $original($params,$body,$user);
        self::lock($subId);
        try{
            // Old duplicate pending requests can be resolved in creation order.
            self::ensureAvailable($subId,$range[0],$range[1],$id,true);
            return $original($params,$body,$user);
        }finally{self::unlock($subId);}
    }
    private static function listSubstitutes(array $params,array $body,$user,callable $original) {
        $answer=$original($params,$body,$user);
        if(!is_array($answer)||!isset($answer['substitutes'])||!is_array($answer['substitutes']))return $answer;
        $range=self::range(['from_jdate'=>$_GET['from']??'','to_jdate'=>$_GET['to']??'']);
        if(!$range)return $answer;
        foreach($answer['substitutes'] as &$person){
            $id=(int)($person['id']??0);
            if($id>0&&self::conflict($id,$range[0],$range[1])){
                $person['available']=false;
                $person['reason']='برای درخواست مرخصی دیگری در این بازه رزرو شده است';
            }
        }
        unset($person);
        return $answer;
    }
    public static function register(array &$routes): void {
        foreach($routes as &$route){
            $p=$route['p']??'';$m=$route['m']??'';
            $original=$route['fn'];
            if($p==='/api/my/substitutes'&&$m==='GET')
                $route['fn']=static fn($params,$body,$user)=>self::listSubstitutes($params,$body,$user,$original);
            elseif($m==='POST'&&in_array($p,['/api/my/requests','/api/admin/requests'],true))
                $route['fn']=static fn($params,$body,$user)=>self::guardRegistration($body,$original,$params,$user);
            elseif($m==='POST'&&in_array($p,['/api/requests/{id}/decide','/api/admin/requests/{id}/decision'],true))
                $route['fn']=static fn($params,$body,$user)=>self::guardApproval($params,$body,$user,$original);
        }
        unset($route);
        route('GET','/api/my/shift-cover-status',static function($params,$body,$user){
            return self::status((int)$user['id']);
        });
    }
    public static function status(int $uid): array {
        $input=explode(',',(string)($_GET['dates']??''));
        $dates=[];
        foreach($input as $raw){$d=self::day($raw);if($d)$dates[$d]=true;}
        if(!$dates||count($dates)>40)Http::error('تاریخ‌های تقویم نامعتبر هستند',422);
        $keys=array_keys($dates);sort($keys);$from=$keys[0];$to=end($keys);
        $output=[];
        $leaves=Db::all("SELECT id,type,unit,from_jdate,to_jdate,the_date,from_time,to_time
          FROM requests WHERE user_id=? AND status='approved' AND type IN ('annual','sick')
          AND REPLACE(TRIM(COALESCE(NULLIF(from_jdate,''),NULLIF(the_date,''))),'/','-')<=?
          AND REPLACE(TRIM(COALESCE(NULLIF(to_jdate,''),NULLIF(the_date,''),NULLIF(from_jdate,''))),'/','-')>=?",
          [$uid,$to,$from]);
        foreach($leaves as $r){
            $range=self::range($r);if(!$range)continue;
            foreach($keys as $day){
                if($day<$range[0]||$day>$range[1])continue;
                $output[$day]['leave'][]=[
                    'type'=>$r['type'],'unit'=>$r['unit']??'daily',
                    'from_time'=>($r['unit']??'')==='hourly'?($r['from_time']??null):null,
                    'to_time'=>($r['unit']??'')==='hourly'?($r['to_time']??null):null
                ];
            }
        }
        $covers=Db::all("SELECT sa.from_date,sa.to_date,r.id AS request_id,
                TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS absent_name
           FROM substitute_assignments sa
           JOIN requests r ON r.id=sa.request_id AND r.status='approved'
               AND r.type='annual' AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')
           JOIN users u ON u.id=sa.absent_user_id
           WHERE sa.substitute_user_id=? AND sa.status='active'
             AND sa.from_date<=? AND sa.to_date>=?",
           [$uid,$to,$from]);
        foreach($covers as $cover){
            $a=self::day($cover['from_date']??'');$b=self::day($cover['to_date']??'');
            if(!$a||!$b)continue;
            foreach($keys as $day){
                if($day<$a||$day>$b)continue;
                $output[$day]['cover'][]=['request_id'=>(int)$cover['request_id'],'absent_name'=>$cover['absent_name']];
            }
        }
        return ['days'=>$output,'from'=>$from,'to'=>$to];
    }
}
