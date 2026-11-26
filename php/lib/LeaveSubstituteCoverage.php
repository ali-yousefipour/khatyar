<?php
/**
 * Guard pending/approved daily-leave replacement reservations and expose scoped
 * confirmed leave/cover days for the "My attendance > Shift" calendar.
 * Reservation audit storage is append-only; no permanent user_shifts writes.
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
    private static function validatePerson(int $subId,int $ownerId,string $from,string $to): void {
        if($subId===$ownerId)Http::error('نیروی جایگزین نمی‌تواند خود درخواست‌کننده باشد',422);
        if(!Db::one("SELECT id FROM users WHERE id=? AND is_active=1 AND can_be_substitute=1",[$subId]))
            Http::error('نیروی جایگزین فعال و واجد شرایط انتخاب کنید',422);
        if(self::approvedAbsence($subId,$from,$to))Http::error('نیروی جایگزین در بازه انتخابی مرخصی یا مأموریت تأییدشده دارد',409);
    }
    private static function approvedAbsence(int $subId,string $from,string $to): ?array {
        return Db::one("SELECT id FROM requests WHERE user_id=? AND status='approved' AND type IN ('annual','sick','unpaid','mission')
            AND REPLACE(TRIM(COALESCE(NULLIF(from_jdate,''),NULLIF(the_date,''))),'/','-')<=?
            AND REPLACE(TRIM(COALESCE(NULLIF(to_jdate,''),NULLIF(the_date,''),NULLIF(from_jdate,''))),'/','-')>=? LIMIT 1",[$subId,$to,$from]);
    }
    // Persist the authenticated actor separately from the absent and substitute users.
    public static function prepareReservationAudit(): void {
        Db::run("CREATE TABLE IF NOT EXISTS leave_reservation_audit (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            request_id BIGINT NOT NULL, absent_user_id INT NOT NULL,
            substitute_user_id INT NOT NULL, actor_id INT NOT NULL,
            event VARCHAR(24) NOT NULL, from_date VARCHAR(10) NOT NULL,
            to_date VARCHAR(10) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_leave_reservation_request (request_id,id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
    public static function recordReservation(int $id,int $owner,int $sub,int $actor,array $body,string $event='reserved'): array {
        $range=self::range($body);
        if(!$range||$id<=0||$owner<=0||$sub<=0||$actor<=0)throw new InvalidArgumentException('Invalid reservation audit');
        Db::run("INSERT INTO leave_reservation_audit(request_id,absent_user_id,substitute_user_id,actor_id,event,from_date,to_date) VALUES(?,?,?,?,?,?,?)",[$id,$owner,$sub,$actor,$event,$range[0],$range[1]]);
        $people=Db::all("SELECT u.id,TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) name,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id IN (?,?)",[$sub,$actor]);
        $names=[];foreach($people as $person)$names[(int)$person['id']]=$person['name'];
        $message='نیروی جایگزین: '.($names[$sub]??'—').'؛ رزروکننده: '.($names[$actor]??'—').'؛ بازه: '.$range[0].' تا '.$range[1].'؛ '.($event==='changed'?'جایگزینی اصلاح شد.':'در انتظار تأیید نهایی.');
        $data=['type'=>'substitute_assigned','request_id'=>$id,'substitute_user_id'=>$sub,'reserved_by_user_id'=>$actor];
        Db::run("INSERT INTO notifications(user_id,title,body,data) VALUES (?,?,?,?)",[$owner,'اطلاعات رزرو نیروی جایگزین',$message,json_encode($data,JSON_UNESCAPED_UNICODE)]);
        return ['owner'=>$owner,'message'=>$message,'data'=>$data];
    }
    public static function sendReservation(array $notification): void {
        try{Push::send([$notification['owner']],'اطلاعات رزرو نیروی جایگزین',$notification['message'],$notification['data']);}
        catch(Throwable $e){error_log('leave reservation delivery failed: request_id='.(int)$notification['data']['request_id']);}
    }
    private static function enrichReservations($answer): array {
        if(!is_array($answer))return [];
        if(!function_exists('_db_table_exists_safe')||!_db_table_exists_safe('leave_reservation_audit'))return $answer;
        $single=isset($answer['id']);$rows=$single?[$answer]:$answer;
        foreach($rows as &$row){
            if(!is_array($row)||empty($row['id'])||!self::eligible($row)||empty($row['substitute_user_id']))continue;
            $audit=Db::one("SELECT a.actor_id reserved_by_user_id,a.created_at reserved_at,a.from_date,a.to_date,TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) reserved_by_name,r.title reserved_by_role, sr.title substitute_role
                FROM leave_reservation_audit a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN users su ON su.id=a.substitute_user_id LEFT JOIN roles sr ON sr.id=su.role_id
                WHERE a.request_id=? AND a.substitute_user_id=? ORDER BY a.id DESC LIMIT 1",[(int)$row['id'],(int)$row['substitute_user_id']]);
            $row['substitute_reservation']=$audit;
        }unset($row);
        return $single?$rows[0]:$rows;
    }
    private static function guardRegistration(array $body,callable $original,array $params,$user) {
        if(!self::eligible($body)||empty($body['substitute_user_id']))
            return $original($params,$body,$user);
        $subId=(int)$body['substitute_user_id'];$range=self::range($body);
        if($subId<=0||!$range)return $original($params,$body,$user); // Canonical handler validates fields.
        self::lock($subId);
        try{
            self::validatePerson($subId,(int)($body['user_id']??$user['id']??0),$range[0],$range[1]);
            self::ensureAvailable($subId,$range[0],$range[1]);
            return $original($params,$body,$user);
        }finally{self::unlock($subId);}
    }
    private static function guardApproval(array $params,array $body,$user,callable $original) {
        $state=(string)($body['status']??$body['decision']??'');
        if(!in_array($state,['approved','approve'],true))return $original($params,$body,$user);
        $id=(int)($params['id']??0);
        if($id<=0)return $original($params,$body,$user);
        $row=Db::one('SELECT id,user_id,type,unit,substitute_user_id,from_jdate,to_jdate,the_date,status FROM requests WHERE id=?',[$id]);
        if(!$row||!self::eligible($row)||empty($row['substitute_user_id']))return $original($params,$body,$user);
        $subId=(int)$row['substitute_user_id'];$range=self::range($row);
        if(!$range)return $original($params,$body,$user);
        self::lock($subId);
        try{
            // Old duplicate pending requests can be resolved in creation order.
            self::validatePerson($subId,(int)$row['user_id'],$range[0],$range[1]);
            self::ensureAvailable($subId,$range[0],$range[1],$id,true);
            return $original($params,$body,$user);
        }finally{self::unlock($subId);}
    }
    private static function guardApprovedEdit(array $params,array $body,$user,callable $original) {
        $id=(int)($params['id']??0);
        if($id<=0)return $original($params,$body,$user);
        $row=Db::one('SELECT id,user_id,type,unit,substitute_user_id,from_jdate,to_jdate,the_date,status FROM requests WHERE id=?',[$id]);
        if(!$row||$row['status']!=='approved')return $original($params,$body,$user);
        // Do not block a text-only correction; canonical editor handles validation.
        if(!array_intersect(['substitute_user_id','from_jdate','to_jdate','the_date'],array_keys($body)))
            return $original($params,$body,$user);
        $next=array_replace($row,array_intersect_key($body,array_flip(['substitute_user_id','from_jdate','to_jdate','the_date'])));
        if(!self::eligible($next)||empty($next['substitute_user_id']))return $original($params,$body,$user);
        $subId=(int)$next['substitute_user_id'];$range=self::range($next);
        if(!$range)return $original($params,$body,$user);
        self::lock($subId);
        try{
            self::validatePerson($subId,(int)$row['user_id'],$range[0],$range[1]);
            self::ensureAvailable($subId,$range[0],$range[1],$id);
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
            if($id<=0||empty($person['available']))continue;
            if($id===(int)($user['id']??0)||!Db::one("SELECT id FROM users WHERE id=? AND is_active=1 AND can_be_substitute=1",[$id])){
                $person['available']=false;
                $person['reason']='نیروی جایگزین فعال و واجد شرایط نیست';
            }elseif(self::conflict($id,$range[0],$range[1])){
                $person['available']=false;
                $person['reason']='برای درخواست مرخصی دیگری در این بازه رزرو شده است';
            }elseif(self::approvedAbsence($id,$range[0],$range[1])){
                $person['available']=false;
                $person['reason']='در این بازه مرخصی یا مأموریت تأییدشده دارد';
            }
        }
        unset($person);
        return $answer;
    }
    public static function register(array &$routes): void {
        foreach($routes as &$route){
            $p=$route['p']??'';$m=$route['m']??'';
            $original=$route['fn'];
            if($m==='GET'&&in_array($p,['/api/my/requests','/api/admin/requests/{id}'],true))
                $route['fn']=static fn($params,$body,$user)=>self::enrichReservations($original($params,$body,$user));
            elseif($p==='/api/my/substitutes'&&$m==='GET')
                $route['fn']=static fn($params,$body,$user)=>self::listSubstitutes($params,$body,$user,$original);
            elseif($m==='POST'&&in_array($p,['/api/my/requests','/api/admin/requests'],true))
                $route['fn']=static fn($params,$body,$user)=>self::guardRegistration($body,$original,$params,$user);
            elseif($m==='POST'&&in_array($p,['/api/requests/{id}/decide','/api/admin/requests/{id}/decision'],true))
                $route['fn']=static fn($params,$body,$user)=>self::guardApproval($params,$body,$user,$original);
            elseif($m==='PUT'&&$p==='/api/admin/requests/{id}')
                $route['fn']=static fn($params,$body,$user)=>self::guardApprovedEdit($params,$body,$user,$original);
        }
        unset($route);
        route('GET','/api/my/shift-cover-status',static function($params,$body,$user){
            return self::status((int)$user['id']);
        });
    }
    private static function requesterShift(int $userId,string $date): ?array {
        // Resolve the absent employee's OWN effective shift; never infer from
        // the substitute employee's permanent shift.
        if($userId<=0||!function_exists('_active_user_shift_assignment'))return null;
        $shift=_active_user_shift_assignment($userId,$date);
        if(!is_array($shift))return null;
        $title=trim((string)($shift['title']??$shift['shift_title']??$shift['type']??''));
        $result=['title'=>$title,'type'=>(string)($shift['type']??''),'segments'=>[],'minutes'=>null];
        $sid=(int)($shift['shift_id']??$shift['id']??0);
        if($sid>0&&function_exists('_shift_day_row')){
            $row=_shift_day_row($sid,$date);
            if(is_array($row)){
                $segments=$row['segments']??($row['day_config']['segments']??[]);
                if(is_string($segments))$segments=json_decode($segments,true);
                if(is_array($segments))$result['segments']=array_slice($segments,0,10);
                $minute=$row['duty_min']??($row['day_config']['duty_min']??null);
                if(is_numeric($minute))$result['minutes']=(int)$minute;
            }
        }
        return $result;
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
                sa.absent_user_id,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS absent_name
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
                $output[$day]['cover'][]=['request_id'=>(int)$cover['request_id'],'absent_name'=>$cover['absent_name'],'shift'=>self::requesterShift((int)$cover['absent_user_id'],$day)];
            }
        }
        return ['days'=>$output,'from'=>$from,'to'=>$to];
    }
}
