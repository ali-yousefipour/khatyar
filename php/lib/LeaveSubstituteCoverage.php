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
        if($month<1||$month>12||$day<1)return null;
        // A bad Jalali day must never reserve a shift or expand an effective assignment.
        // Use the shared authoritative calendar rather than treating every month as 31 days.
        require_once __DIR__.'/IranCalendar.php';
        return IranCalendar::normalize(sprintf('%04d-%02d-%02d',(int)$m[1],$month,$day));
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
    private static function ensureOpenRange(string $from,string $to): void {
        if(!function_exists('_final_work_month'))return;
        [$year,$month]=array_map('intval',explode('-',$from));
        $last=substr($to,0,7);
        for($n=0;sprintf('%04d-%02d',$year,$month)<=$last;$n++){
            if($n>24)Http::error('بازه جایگزینی بیش از حد طولانی است',422);
            if(_final_work_month($year,$month))Http::error('تغییر جایگزینی در ماه نهایی‌شده مجاز نیست',409);
            if(++$month>12){$month=1;$year++;}
        }
    }
    private static function ensureAvailable(int $subId,string $from,string $to,int $exclude=0,bool $earlierOnly=false,?array $request=null): void {
        $busy=$request&&class_exists('ShiftCalc')?self::preciseConflict($subId,$request,$exclude):self::conflict($subId,$from,$to,$exclude,$earlierOnly);
        if($busy)Http::error('نیروی انتخاب‌شده در این بازه برای درخواست مرخصی دیگری رزرو شده یا جایگزینی تأییدشده دارد. جایگزین دیگری انتخاب کنید.',409);
    }
    private static function validatePerson(int $subId,int $ownerId,string $from,string $to): void {
        if($subId===$ownerId)Http::error('نیروی جایگزین نمی‌تواند خود درخواست‌کننده باشد',422);
        if(!Db::one("SELECT id FROM users WHERE id=? AND is_active=1 AND can_be_substitute=1",[$subId]))
            Http::error('نیروی جایگزین فعال و واجد شرایط انتخاب کنید',422);
        if(self::approvedAbsence($subId,$from,$to))Http::error('نیروی جایگزین در بازه انتخابی مرخصی یا مأموریت تأییدشده دارد',409);
    }
    private static function approvedAbsence(int $subId,string $from,string $to): ?array {
        return Db::one("SELECT id FROM requests WHERE user_id=? AND status='approved' AND type IN ('annual','sick','unpaid','mission') AND COALESCE(unit,'daily')<>'hourly'
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
        // Names are resolved from authenticated database records, never supplied by the request body.
        $people=Db::all("SELECT u.id,TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) name,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id IN (?,?,?)",[$owner,$sub,$actor]);
        $names=[];foreach($people as $person)$names[(int)$person['id']]=trim((string)($person['name']??''));
        $ownerName=$names[$owner]??'';$subName=$names[$sub]??'';$actorName=$names[$actor]??'';
        $dates=$range[0].' تا '.$range[1];
        $changed=$event==='changed';
        $ownerMessage='نیروی جایگزین: '.($subName?:'نام ثبت نشده').'؛ رزروکننده: '.($actorName?:'نام ثبت نشده').'؛ بازه: '.$dates.'؛ '.($changed?'جایگزینی اصلاح شد.':'در انتظار تأیید نهایی.');
        $subMessage='حضور به‌جای: '.($ownerName?:'نام ثبت نشده').'؛ رزروکننده: '.($actorName?:'نام ثبت نشده').'؛ بازه: '.$dates.'؛ '.($changed?'تخصیص شما تغییر کرد.':'رزرو در انتظار تأیید نهایی است.').' ساعت و خط خدمت را از تقویم شیفت معتبر مشاهده کنید.';
        $data=['type'=>'substitute_assigned','request_id'=>$id,'substitute_user_id'=>$sub,'reserved_by_user_id'=>$actor];
        // Both rows participate in the caller's transaction. Push is deferred until commit.
        Db::run("INSERT INTO notifications(user_id,title,body,data) VALUES (?,?,?,?)",[$owner,'اطلاعات رزرو نیروی جایگزین',$ownerMessage,json_encode($data+['recipient'=>'requester'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        Db::run("INSERT INTO notifications(user_id,title,body,data) VALUES (?,?,?,?)",[$sub,'رزرو شیفت جایگزینی',$subMessage,json_encode($data+['recipient'=>'substitute'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        return ['owner'=>$owner,'substitute'=>$sub,'message'=>$ownerMessage,'substitute_message'=>$subMessage,'data'=>$data];
    }
    public static function sendReservation(array $notification): void {
        // This method is called strictly after successful transaction completion.
        try{Push::send([$notification['owner']],'اطلاعات رزرو نیروی جایگزین',$notification['message'],$notification['data']);}
        catch(Throwable $e){error_log('leave requester reservation delivery failed: request_id='.(int)$notification['data']['request_id']);}
        if(!empty($notification['substitute'])){
            try{Push::send([(int)$notification['substitute']],'رزرو شیفت جایگزینی',(string)$notification['substitute_message'],$notification['data']);}
            catch(Throwable $e){error_log('leave substitute reservation delivery failed: request_id='.(int)$notification['data']['request_id']);}
        }
    }
    /** Persist the old substitute's release within the approved-edit transaction. */
    public static function recordRelease(int $id,int $owner,int $oldSub,int $actor,array $before): array {
        if($id<=0||$owner<=0||$oldSub<=0||$actor<=0)throw new InvalidArgumentException('Invalid substitute release');
        $range=self::range($before);
        $people=Db::all("SELECT u.id,TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) name FROM users u WHERE u.id IN (?,?)",[$owner,$actor]);
        $names=[];foreach($people as $person)$names[(int)$person['id']]=trim((string)($person['name']??''));
        $message='رزرو شما برای حضور به‌جای: '.(($names[$owner]??'')?:'نام ثبت نشده')
            .'؛ بازه: '.($range?($range[0].' تا '.$range[1]):'تاریخ ثبت نشده')
            .'؛ توسط '.(($names[$actor]??'')?:'مسئول ثبت').' آزاد شد. این تخصیص دیگر معتبر نیست.';
        $data=['type'=>'substitute_released','request_id'=>$id,'status'=>'released','reserved_by_user_id'=>$actor];
        Db::run("INSERT INTO notifications(user_id,title,body,data) VALUES (?,?,?,?)",
            [$oldSub,'آزاد شدن رزرو جایگزینی',$message,json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        return ['recipient'=>$oldSub,'message'=>$message,'data'=>$data];
    }
    public static function sendRelease(array $notice): void {
        try{Push::send([(int)$notice['recipient']],'آزاد شدن رزرو جایگزینی',$notice['message'],$notice['data']);}
        catch(Throwable $e){error_log('leave substitute release delivery failed: request_id='.(int)$notice['data']['request_id']);}
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
        self::ensureOpenRange($range[0],$range[1]);
        self::lock($subId);
        try{
            self::validatePerson($subId,(int)($body['user_id']??$user['id']??0),$range[0],$range[1]);
            self::ensureAvailable($subId,$range[0],$range[1],0,false,array_replace($body,['user_id'=>(int)($body['user_id']??$user['id'])]));
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
        self::ensureOpenRange($range[0],$range[1]);
        self::lock($subId);
        try{
            // Old duplicate pending requests can be resolved in creation order.
            self::validatePerson($subId,(int)$row['user_id'],$range[0],$range[1]);
            self::ensureAvailable($subId,$range[0],$range[1],$id,true,$row);
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
        $oldRange=self::range($row);if($oldRange)self::ensureOpenRange($oldRange[0],$oldRange[1]);
        $next=array_replace($row,array_intersect_key($body,array_flip(['substitute_user_id','from_jdate','to_jdate','the_date'])));
        if(!self::eligible($next)||empty($next['substitute_user_id']))return $original($params,$body,$user);
        $subId=(int)$next['substitute_user_id'];$range=self::range($next);
        if(!$range)return $original($params,$body,$user);
        self::ensureOpenRange($range[0],$range[1]);
        self::lock($subId);
        try{
            self::validatePerson($subId,(int)$row['user_id'],$range[0],$range[1]);
            self::ensureAvailable($subId,$range[0],$range[1],$id,false,$next);
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
            }elseif(self::preciseConflict($id,['user_id'=>(int)$user['id'],'from_jdate'=>$range[0],'to_jdate'=>$range[1]])){
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
        route('GET','/api/admin/substitute-calendar',static function($params,$body,$user){
            if(empty($user['is_admin']))Http::error('دسترسی مدیریتی لازم است',403);
            $uid=filter_var($_GET['user_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
            if(!$uid)Http::error('نیروی جایگزین را انتخاب کنید',422);
            return self::status((int)$uid,!empty($_GET['include_history']));
        },false,3);
        route('GET','/api/admin/substitute-calendar/users',static function($params,$body,$user){
            if(empty($user['is_admin']))Http::error('دسترسی مدیریتی لازم است',403);
            return Db::all("SELECT u.id,TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) AS name,u.is_active FROM users u WHERE (u.can_be_substitute=1 AND u.is_active=1) OR EXISTS(SELECT 1 FROM requests r WHERE r.substitute_user_id=u.id AND r.type='annual' AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')) ORDER BY name,u.id");
        },false,3);
        route('PUT','/api/admin/substitute-calendar/service-location',static function($params,$body,$user){
            return self::saveServiceLocation($body,$user);
        },false,3);
        route('GET','/api/my/shift-cover-status',static function($params,$body,$user){
            return self::status((int)$user['id']);
        });
    }
    /** Own assignment only: replacement chains must not redefine the source duty. */
    public static function ownShift(int $userId,string $date): ?array {
        $rows=Db::all("SELECT us.shift_id,us.from_jdate,us.to_jdate,s.* FROM user_shifts us LEFT JOIN shifts s ON s.id=us.shift_id WHERE us.user_id=? AND (us.shift_id=0 OR s.is_active=1) ORDER BY us.id DESC",[$userId]);
        foreach($rows as $row){
            $from=self::day($row['from_jdate']??'');$to=self::day($row['to_jdate']??'');
            if(($from&&$date<$from)||($to&&$date>$to))continue;
            if((int)$row['shift_id']===0)return function_exists('_auto_shift_for_user')?_auto_shift_for_user($userId):null;
            return $row;
        }
        return null;
    }
    public static function ownWindows(int $userId,string $date): ?array {
        $shift=self::ownShift($userId,$date);
        if(!$shift)return [];
        // Floating duty without fixed clock bounds cannot safely prove non-overlap.
        if(in_array(($shift['type']??''),['floating','auto'],true))return null;
        $row=null;$id=(int)($shift['shift_id']??$shift['id']??0);
        if($id>0&&function_exists('_shift_day_row'))$row=_shift_day_row($id,$date);
        $config=ShiftCalc::parseJson($row['day_config']??null);
        if(($config['type']??'')==='floating')return null;
        $segments=ShiftCalc::daySegments($shift,$date,$row);
        $base=ShiftCalc::jdateToTs($date);if($base===null)return null;
        $windows=[];
        foreach($segments as $segment){
            $window=ShiftCalc::segmentWindow($segment,$base);
            if(!$window)return null;
            $windows[]=$window;
        }
        return $windows;
    }
    /** Null means the schedule cannot prove availability and must fail closed. */
    public static function requestWindows(array $request): ?array {
        $range=self::range($request);$owner=(int)($request['user_id']??0);
        if(!$range||$owner<=0)return null;
        $date=$range[0];$windows=[];
        for($count=0;$date<=$range[1];$count++){
            if($count>=367)return null;
            $dayWindows=self::ownWindows($owner,$date);
            if($dayWindows===null)return null;
            foreach($dayWindows as $window)$windows[]=$window;
            $next=ShiftCalc::jdateAddDays($date,1);
            if(!$next||$next<=$date)return null;
            $date=$next;
        }
        return $windows;
    }
    private static array $syntheticDays=[];
    private static array $unresolvedComposites=[];
    public static function unresolvedComposite(int $uid,string $date): bool {
        return !empty(self::$unresolvedComposites[$uid][$date]);
    }
    public static function syntheticDay(int $id,string $date): ?array {return self::$syntheticDays[$id][$date]??null;}
    private static function fixedSource(int $uid,string $date): ?array {
        $shift=self::ownShift($uid,$date);if(!$shift||!in_array($shift['type']??'',['simple','advanced','rotating'],true))return null;
        $id=(int)($shift['shift_id']??$shift['id']??0);
        $row=$id>0?_shift_day_row($id,$date):null;
        $cfg=ShiftCalc::parseJson($row['day_config']??null);
        if(($cfg['type']??'')==='floating')return null;
        $segments=ShiftCalc::daySegments($shift,$date,$row);
        $policy=$shift;
        foreach(['id','shift_id','user_id','from_jdate','to_jdate','title','weekly','advanced','created_at','updated_at'] as $key)unset($policy[$key]);
        ksort($policy);ksort($cfg);
        return ['shift'=>$shift,'segments'=>$segments,'config'=>$cfg,'signature'=>json_encode([$policy,$cfg])];
    }
    public static function compatibleRequests(array $left,array $right): bool {
        $a=self::range($left);$b=self::range($right);if(!$a||!$b)return false;
        $from=max($a[0],$b[0]);$to=min($a[1],$b[1]);
        if($from>$to)return false;
        for($date=$from,$n=0;$date<=$to;$date=ShiftCalc::jdateAddDays($date,1),$n++){
            if(!$date||$n>366)return false;
            $x=self::fixedSource((int)$left['user_id'],$date);$y=self::fixedSource((int)$right['user_id'],$date);
            if(!$x||!$y)return false;
        }
        $x=self::requestWindows($left);$y=self::requestWindows($right);
        return $x!==null&&$y!==null&&!self::windowsOverlap($x,$y);
    }
    public static function preciseConflict(int $sub,array $request,int $exclude=0): ?array {
        if(!function_exists('jalali_to_gregorian')||!function_exists('gregorian_to_jalali')){
            $range=self::range($request);return $range?self::conflict($sub,$range[0],$range[1],$exclude):['id'=>0];
        }
        $rows=Db::all("SELECT id,user_id,from_jdate,to_jdate,the_date,status FROM requests WHERE substitute_user_id=? AND id<>? AND type='annual' AND (unit='daily' OR unit IS NULL OR unit='') AND status IN ('pending','approved')",[$sub,$exclude]);
        $range=self::range($request);if(!$range)return ['id'=>0];
        $requested=self::requestWindows($request);
        $hourly=Db::all("SELECT id,from_jdate,to_jdate,the_date,from_time,to_time FROM requests WHERE user_id=? AND status='approved' AND unit='hourly' AND type IN ('annual','sick','unpaid','mission')",[$sub]);
        foreach($hourly as $absence){
            $absenceRange=self::range($absence);if(!$absenceRange)continue;
            $first=ShiftCalc::jdateAddDays($range[0],-1);$last=ShiftCalc::jdateAddDays($range[1],1);
            if($absenceRange[0]>$last||$absenceRange[1]<$first)continue;
            if($requested===null)return ['id'=>$absence['id'],'conflict_type'=>'hourly_absence'];
            for($date=max($first,$absenceRange[0]),$n=0;$date&&$date<=min($last,$absenceRange[1]);$date=ShiftCalc::jdateAddDays($date,1),$n++){
                if($n>369)return ['id'=>$absence['id'],'conflict_type'=>'range'];
                $window=ShiftCalc::segmentWindow(['s'=>$absence['from_time'],'e'=>$absence['to_time']],ShiftCalc::jdateToTs($date));
                if(!$window||self::windowsOverlap($requested,[$window]))return ['id'=>$absence['id'],'conflict_type'=>'hourly_absence'];
            }
        }

        $start=ShiftCalc::jdateAddDays($range[0],-1);$last=ShiftCalc::jdateAddDays($range[1],1);
        for($date=$start,$n=0;$date&&$date<=$last;$date=ShiftCalc::jdateAddDays($date,1),$n++){
            if($n>369)return ['id'=>0,'conflict_type'=>'range'];
            $own=self::ownWindows($sub,$date);
            if($own===null||($own&&($requested===null||self::windowsOverlap($requested,$own))))return ['id'=>0,'conflict_type'=>'own_shift'];
            if($own){
                $source=self::fixedSource((int)$request['user_id'],$date);$primary=self::fixedSource($sub,$date);
                if(!$source||!$primary)return ['id'=>0,'conflict_type'=>'own_policy'];
            }
        }

        foreach($rows as $row){
            $other=self::range($row);if(!$other)continue;
            // Include adjacent days because an overnight shift can cross the date boundary.
            $from=ShiftCalc::jdateAddDays($range[0],-1);$to=ShiftCalc::jdateAddDays($range[1],1);
            if($other[0]>$to||$other[1]<$from)continue;
            if($other[0]<=$range[1]&&$other[1]>=$range[0]){
                if(!self::compatibleRequests($request,$row))return $row;
            }else{
                $x=self::requestWindows($request);$y=self::requestWindows($row);
                if($x===null||$y===null||self::windowsOverlap($x,$y))return $row;
            }
        }
        return null;
    }
    public static function composite(int $uid,string $date): ?array {
        unset(self::$unresolvedComposites[$uid][$date]);
        if(function_exists('_db_table_exists_safe')&&!_db_table_exists_safe('substitute_assignments'))return null;
        $rows=Db::all("SELECT sa.request_id,sa.absent_user_id FROM substitute_assignments sa JOIN requests r ON r.id=sa.request_id AND r.status='approved' AND r.type='annual' AND (r.unit='daily' OR r.unit IS NULL OR r.unit='') WHERE sa.substitute_user_id=? AND sa.status='active' AND r.substitute_user_id=sa.substitute_user_id AND r.user_id=sa.absent_user_id AND sa.id=(SELECT MAX(latest.id) FROM substitute_assignments latest WHERE latest.request_id=sa.request_id AND latest.status='active') AND sa.from_date<=? AND sa.to_date>=? AND REPLACE(TRIM(COALESCE(NULLIF(r.from_jdate,''),NULLIF(r.the_date,''))),'/','-')<=? AND REPLACE(TRIM(COALESCE(NULLIF(r.to_jdate,''),NULLIF(r.the_date,''),NULLIF(r.from_jdate,''))),'/','-')>=? ORDER BY sa.id",[$uid,$date,$date,$date,$date]);
        if(!$rows)return null;
        $primary=self::fixedSource($uid,$date);
        if($primary&&!empty($primary['segments']))array_unshift($rows,['request_id'=>0,'absent_user_id'=>$uid]);
        if(count($rows)<2)return null;
        // A conflict/unknown schedule must never silently fall back to only the first cover.
        self::$unresolvedComposites[$uid][$date]=true;
        $first=null;$segments=[];$seen=[];$windows=[];$parts=[];$explicitDuty=0;$hasExplicitDuty=false;
        foreach($rows as $row){
            if(isset($seen[$row['request_id']]))continue;$seen[$row['request_id']]=true;
            $source=self::fixedSource((int)$row['absent_user_id'],$date);
            if(!$source)return null;
            $first=$first??$source;
            $parts[]=['request_id'=>(int)$row['request_id'],'absent_user_id'=>(int)$row['absent_user_id'],
                'shift'=>$source['shift'],'day_row'=>['segments'=>$source['segments'],'is_off'=>!$source['segments'],'day_config'=>$source['config']]];
            if(isset($source['config']['duty_min'])&&$source['config']['duty_min']!==''){
                $hasExplicitDuty=true;$explicitDuty+=max(0,(int)$source['config']['duty_min']);
            }
            foreach($source['segments'] as $seg){
                $win=ShiftCalc::segmentWindow($seg,ShiftCalc::jdateToTs($date));
                if(!$win||self::windowsOverlap($windows,[$win]))return null;
                $windows[]=$win;$seg['request_id']=(int)$row['request_id'];$seg['absent_user_id']=(int)$row['absent_user_id'];$segments[]=$seg;
            }
        }
        if($hasExplicitDuty)$first['config']['duty_min']=$explicitDuty;
        $id=-max(1,$uid);self::$syntheticDays[$id][$date]=['segments'=>$segments,'is_off'=>!$segments,'day_config'=>$first['config'],'composite_parts'=>$parts];
        unset(self::$unresolvedComposites[$uid][$date]);
        $shift=$first['shift'];$shift['shift_id']=$id;$shift['id']=$id;$shift['type']='advanced';$shift['is_substitute_shift']=1;$shift['substitute_sources']=$rows;$shift['title']='شیفت‌های جایگزینی';return $shift;
    }
    public static function windowsOverlap(array $left,array $right): bool {
        foreach($left as $a)foreach($right as $b)if($a[0]<$b[1]&&$b[0]<$a[1])return true;
        return false;
    }
    private static function requesterShift(int $userId,string $date,array &$context): ?array {
        if($userId<=0)return null;
        $shift=null;
        foreach($context['assignments'][$userId]??[] as $candidate){
            $from=self::day($candidate['from_jdate']??'');$to=self::day($candidate['to_jdate']??'');
            if(($from&&$date<$from)||($to&&$date>$to))continue;
            if((int)$candidate['shift_id']===0){
                if(!array_key_exists($userId,$context['auto']))$context['auto'][$userId]=function_exists('_auto_shift_for_user')?_auto_shift_for_user($userId):null;
                $shift=$context['auto'][$userId];
            }else $shift=$candidate;
            break;
        }
        if(!is_array($shift))return null;
        $sid=(int)($shift['shift_id']??$shift['id']??0);
        $row=$context['days'][$sid][$date]??null;
        $config=ShiftCalc::parseJson($row['day_config']??null);
        if(($config['type']??'')==='floating')return null;
        $segments=ShiftCalc::daySegments($shift,$date,$row);
        $minutes=0;
        foreach($segments as &$segment){
            $minutes+=ShiftCalc::segmentLength($segment);
            $limits=ShiftCalc::segmentTrafficLimits($segment,$config);
            if($limits){
                $segment['allowed_entry_from']=$limits['entry_from'];
                $segment['allowed_entry_until']=$limits['entry_until'];
                $segment['allowed_exit_from']=$limits['exit_from'];
                $segment['allowed_exit_until']=$limits['exit_until'];
            }
        }unset($segment);
        return ['id'=>$sid,'title'=>trim((string)($shift['title']??$shift['shift_title']??$shift['type']??'')),
            'type'=>(string)($shift['type']??''),'segments'=>array_values($segments),
            'minutes'=>($shift['type']??'')==='floating'?null:$minutes,
            'planned_minutes'=>($shift['type']??'')==='floating'?null:$minutes,
            'duty_minutes'=>$segments?ShiftCalc::expectedMinutes($shift,$date,$row):null,
            // No historical service-location field exists on this assignment source.
            'line_id'=>null,'line_name'=>null,'service_location'=>null];
    }
    /** Immutable-at-capture line name; never reconstruct historic service from today's profile. */
    private static function attendanceEvidence(int $uid,string $from,string $to): array {
        $start=ShiftCalc::jdateToTs($from);$end=ShiftCalc::jdateToTs($to);
        if(!$start||!$end)return [];
        return Db::all("SELECT id,check_in,check_out,method,line_id,out_line_id
            FROM staff_attendance WHERE user_id=? AND check_in>=? AND check_in<?
              AND check_out IS NOT NULL ORDER BY check_in,id",
            [$uid,date('Y-m-d H:i:s',$start-3*86400),date('Y-m-d H:i:s',$end+5*86400)]);
    }
    /** Evidence-only completion: every segment must be fully spanned by actual closed sessions. */
    private static function completedByAttendance(string $date,?array $shift,array $attendance): array {
        $segments=$shift['segments']??[];
        if(!$shift||!$segments||in_array($shift['type']??'',['floating','auto'],true))
            return ['completion_status'=>'unverified','attendance_ids'=>[]];
        $base=ShiftCalc::jdateToTs($date);
        if($base===null)return ['completion_status'=>'unverified','attendance_ids'=>[]];
        $used=[];
        foreach($segments as $index=>$segment){
            $window=ShiftCalc::segmentWindow($segment,$base);
            if(!$window)return ['completion_status'=>'unverified','attendance_ids'=>[]];
            [$start,$end]=$window;
            $lineId=(int)($shift['segment_locations'][$index]['line_id']??0);
            // Without a verified historic line, attendance from another station
            // cannot establish that this specific substitution was fulfilled.
            // Unknown is distinct from completed: do not infer a past line.
            if($lineId<=0)return ['completion_status'=>'unverified','attendance_ids'=>array_keys($used)];
            $parts=[];
            foreach($attendance as $punch){
                if(empty($punch['check_in'])||empty($punch['check_out'])||
                   str_contains((string)($punch['method']??''),'auto_close'))continue;
                if($lineId){
                    // A session that checked out on another known line cannot prove
                    // completion of this specific replacement duty segment.
                    if($lineId!==(int)($punch['line_id']??0))continue;
                    $exitLine=(int)($punch['out_line_id']??0);
                    if($exitLine>0&&$exitLine!==$lineId)continue;
                }
                $in=strtotime((string)$punch['check_in']);$out=strtotime((string)$punch['check_out']);
                if(!$in||!$out||$out<=$in||$out<=$start||$in>=$end)continue;
                $parts[]=[max($start,$in),min($end,$out),(int)$punch['id']];
            }
            usort($parts,static fn($a,$b)=>$a[0]<=>$b[0]);
            $cursor=$start;
            foreach($parts as $part){
                if($part[0]>$cursor)break;
                if($part[1]>$cursor){$cursor=$part[1];$used[$part[2]]=true;}
                if($cursor>=$end)break;
            }
            if($cursor<$end)return ['completion_status'=>'unverified','attendance_ids'=>array_keys($used)];
        }
        return ['completion_status'=>'completed','attendance_ids'=>array_keys($used)];
    }
    private static function locationSnapshots(array $covers,string $from,string $to): array {
        if(!$covers||!function_exists('_db_table_exists_safe')||!_db_table_exists_safe('substitute_shift_service_snapshots'))return [];
        $ids=array_values(array_unique(array_filter(array_map(static fn($c)=>(int)($c['assignment_id']??0),$covers))));
        if(!$ids)return [];
        $slots=implode(',',array_fill(0,count($ids),'?'));
        $rows=Db::all("SELECT assignment_id,jdate,segment_index,line_id,line_name,service_location
            FROM substitute_shift_service_snapshots
            WHERE assignment_id IN ($slots) AND jdate>=? AND jdate<=?",array_merge($ids,[$from,$to]));
        $result=[];
        foreach($rows as $row)$result[(int)$row['assignment_id']][$row['jdate']][(int)$row['segment_index']]=$row;
        return $result;
    }
    private static function attachServiceLocation(?array $shift,array $snapshots): ?array {
        if(!$shift)return null;
        $segments=$shift['segments']??[];
        $known=[];$locations=[];
        foreach($segments as $i=>$segment){
            $row=$snapshots[$i]??null;
            $loc=$row?['line_id'=>(int)$row['line_id'],'line_name'=>$row['line_name'],
                'service_location'=>$row['service_location']]:null;
            $locations[]=$loc;
            if($loc)$known[]=$loc;
        }
        $complete=count($segments)>0&&count($known)===count($segments);
        $same=$complete&&count(array_unique(array_column($known,'line_id')))===1;
        $shift['segment_locations']=$locations;
        $shift['location_status']=$complete?'verified':($known?'partial':'unrecorded');
        $shift['line_id']=$same?$known[0]['line_id']:null;
        $shift['line_name']=$same?$known[0]['line_name']:null;
        $shift['service_location']=$same&&count(array_unique(array_column($known,'service_location')))===1
            ?$known[0]['service_location']:null;
        return $shift;
    }
    private static function saveServiceLocation(array $body,array $actor): array {
        if(empty($actor['is_admin'])||(int)($actor['id']??0)<=0)Http::error('دسترسی مدیریتی لازم است',403);
        if(!function_exists('_db_table_exists_safe')||
           !_db_table_exists_safe('substitute_shift_service_snapshots')||
           !_db_table_exists_safe('substitute_shift_service_audit'))
            Http::error('ساختار ثبت محل خدمت تاریخی نصب نشده است',503);
        $assignment=filter_var($body['assignment_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        $lineId=filter_var($body['line_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        $segment=filter_var($body['segment_index']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>0]]);
        $date=self::day($body['jdate']??'');
        $location=trim((string)($body['service_location']??''));
        $reason=trim((string)($body['reason']??''));
        if(!$assignment||!$lineId||$segment===false||$date===null||
           ShiftCalc::jdateToTs($date)===null||mb_strlen($location)<2||mb_strlen($location)>255||
           mb_strlen($reason)<3||mb_strlen($reason)>500)Http::error('اطلاعات محل خدمت یا علت اصلاح معتبر نیست',422);
        if(function_exists('_final_work_month')){
            [$year,$month]=array_map('intval',explode('-',substr($date,0,7)));
            if(_final_work_month($year,$month))Http::error('ماه نهایی‌شده قابل اصلاح نیست',409);
        }
        $lookup=Db::one("SELECT sa.substitute_user_id FROM substitute_assignments sa WHERE sa.id=?",[$assignment]);
        if(!$lookup)Http::error('تخصیص یافت نشد',404);
        $subId=(int)$lookup['substitute_user_id'];
        self::lock($subId);
        $pdo=Db::pdo();
        try{
            $pdo->beginTransaction();
            // Recheck after obtaining the substitute lock: the month might
            // have been finalized while this operation waited for the lock.
            if(function_exists('_final_work_month')){
                [$lockedYear,$lockedMonth]=array_map('intval',explode('-',substr($date,0,7)));
                if(_final_work_month($lockedYear,$lockedMonth))Http::error('ماه نهایی‌شده قابل اصلاح نیست',409);
            }
            $assignmentRow=Db::one("SELECT sa.id,sa.absent_user_id,sa.substitute_user_id,sa.from_date,sa.to_date,
                    r.user_id,r.substitute_user_id request_substitute_id,r.from_jdate,r.to_jdate,r.the_date
                FROM substitute_assignments sa JOIN requests r ON r.id=sa.request_id
                WHERE sa.id=? AND sa.status='active' AND r.status='approved' AND r.type='annual'
                  AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')
                   AND sa.id=(SELECT MAX(latest.id) FROM substitute_assignments latest
                       WHERE latest.request_id=sa.request_id AND latest.status='active') FOR UPDATE",[$assignment]);
            $requestRange=$assignmentRow?self::range($assignmentRow):null;
            if(!$assignmentRow||!$requestRange||$assignmentRow['user_id']!=$assignmentRow['absent_user_id']||
                $assignmentRow['request_substitute_id']!=$assignmentRow['substitute_user_id']||
                $date<max($assignmentRow['from_date'],$requestRange[0])||
                $date>min($assignmentRow['to_date'],$requestRange[1]))
                Http::error('تخصیص در این تاریخ معتبر نیست',409);
            $shift=self::ownShift((int)$assignmentRow['absent_user_id'],$date);
            $shiftId=(int)($shift['shift_id']??$shift['id']??0);
            $dayRow=$shiftId>0&&function_exists('_shift_day_row')?_shift_day_row($shiftId,$date):null;
            $segments=$shift?ShiftCalc::daySegments($shift,$date,$dayRow):[];
            if(!isset($segments[$segment]))Http::error('نوبت شیفت نامعتبر یا فاقد ساعت قطعی است',422);
            $line=Db::one("SELECT id,code,origin,destination FROM `lines` WHERE id=?",[$lineId]);
            if(!$line)Http::error('خط خدمت معتبر نیست',422);
            $lineName=trim((string)($line['code']??''));
            if($lineName==='')Http::error('شناسه خط فاقد عنوان معتبر است',422);
            $previous=Db::one("SELECT line_id,line_name,service_location FROM substitute_shift_service_snapshots
                WHERE assignment_id=? AND jdate=? AND segment_index=? FOR UPDATE",[$assignment,$date,$segment]);
            $next=['line_id'=>(int)$line['id'],'line_name'=>$lineName,'service_location'=>$location];
            if($previous&&(int)($previous['line_id']??0)===$next['line_id']&&
                (string)($previous['line_name']??'')===$next['line_name']&&
                (string)($previous['service_location']??'')===$next['service_location']){
                // An identical retry is not a new historical correction. Avoid
                // duplicating the audit trail or changing its recorded_by stamp.
                $pdo->commit();
                return ['ok'=>true,'unchanged'=>true,'assignment_id'=>$assignment,
                    'jdate'=>$date,'segment_index'=>$segment]+$next;
            }
            Db::run("INSERT INTO substitute_shift_service_snapshots
                (assignment_id,jdate,segment_index,line_id,line_name,service_location,recorded_by)
                VALUES(?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE line_id=VALUES(line_id),line_name=VALUES(line_name),
                service_location=VALUES(service_location),recorded_by=VALUES(recorded_by),recorded_at=NOW()",
                [$assignment,$date,$segment,$lineId,$lineName,$location,(int)$actor['id']]);
            Db::insert("INSERT INTO substitute_shift_service_audit
                (assignment_id,jdate,segment_index,actor_id,previous_json,next_json,reason)
                VALUES(?,?,?,?,?,?,?)",[$assignment,$date,$segment,(int)$actor['id'],
                $previous?json_encode($previous,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR):null,
                json_encode($next,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$reason]);
            $pdo->commit();
            return ['ok'=>true,'assignment_id'=>$assignment,'jdate'=>$date,'segment_index'=>$segment]+$next;
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        finally{self::unlock($subId);}
    }
    private static function reservationMetadata(array $ids,int $uid): array {
        if(!$ids||!function_exists('_db_table_exists_safe')||!_db_table_exists_safe('leave_reservation_audit'))return [];
        $slots=implode(',',array_fill(0,count($ids),'?'));
        $rows=Db::all("SELECT a.id reservation_id,a.request_id,a.actor_id reserved_by_user_id,a.created_at reserved_at,
            TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) reserved_by_name,a.event
            FROM leave_reservation_audit a LEFT JOIN users u ON u.id=a.actor_id
            WHERE a.substitute_user_id=? AND a.request_id IN ($slots) ORDER BY a.id DESC",array_merge([$uid],$ids));
        $result=[];
        foreach($rows as $row){$id=(int)$row['request_id'];if(!isset($result[$id]))$result[$id]=$row;}
        return $result;
    }
    /** Warnings cover loaded substitute reservations only; registration guards have broader duties. */
    private static function calendarConflicts(array &$days): void {
        $events=[];
        foreach($days as $date=>&$day)foreach(['cover','reservations'] as $kind){
            if(!isset($day[$kind]))continue;
            foreach($day[$kind] as $index=>&$entry){
                $entry['conflict']=false;$entry['conflicts']=[];$entry['conflict_scope']='substitute_reservations';
                $shift=$entry['shift']??null;$segments=$shift['segments']??[];$windows=[];
                $complete=is_array($shift)&&!in_array($shift['type']??'',['floating','auto'],true)&&count($segments)>0;
                $base=ShiftCalc::jdateToTs($date);
                foreach($segments as $segment){
                    $window=$base===null?null:ShiftCalc::segmentWindow($segment,$base);
                    if(!$window){$complete=false;continue;}
                    $windows[]=$window;
                }
                $entry['conflict_check_complete']=$complete;
                $events[]=['date'=>$date,'kind'=>$kind,'index'=>$index,'request_id'=>(int)$entry['request_id'],
                    'absent_name'=>$entry['absent_name'],'windows'=>$windows];
            }unset($entry);
        }unset($day);
        $count=count($events);
        for($i=0;$i<$count;$i++)for($j=$i+1;$j<$count;$j++){
            $left=$events[$i];$right=$events[$j];
            if(!self::windowsOverlap($left['windows'],$right['windows']))continue;
            foreach([[$left,$right],[$right,$left]] as [$entry,$other]){
                $target=&$days[$entry['date']][$entry['kind']][$entry['index']];$target['conflict']=true;
                $target['conflicts'][]=['request_id'=>$other['request_id'],'date'=>$other['date'],
                    'absent_name'=>$other['absent_name'],
                    'intervals'=>array_map(static fn($window)=>['start'=>date('Y-m-d H:i:s',$window[0]),'end'=>date('Y-m-d H:i:s',$window[1])],$other['windows'])];
                unset($target);
            }
        }
    }
    public static function status(int $uid,bool $includeHistory=false): array {
        $input=explode(',',(string)($_GET['dates']??''));
        $dates=[];
        foreach($input as $raw){$d=self::day($raw);if(!$d)Http::error('تاریخ تقویم نامعتبر است',422);$dates[$d]=true;}
        if(!$dates||count($dates)>40)Http::error('تاریخ‌های تقویم نامعتبر هستند',422);
        $keys=array_keys($dates);sort($keys);$from=$keys[0];$to=end($keys);
        // A sparse set of distant dates must not trigger unbounded calendar/database reads.
        // The mobile and administrative clients send one Jalali month per call.
        $fromParts=array_map('intval',explode('-',$from));
        $toParts=array_map('intval',explode('-',$to));
        [$fgY,$fgM,$fgD]=IranCalendar::toGregorian(...$fromParts);
        [$tgY,$tgM,$tgD]=IranCalendar::toGregorian(...$toParts);
        if(gmmktime(12,0,0,$tgM,$tgD,$tgY)-gmmktime(12,0,0,$fgM,$fgD,$fgY)>39*86400)
            Http::error('بازه تقویم باید حداکثر چهل روز باشد',422);
        $viewFrom=$from;$viewTo=$to;
        // Include adjacent entry-owned night shifts, including legacy >24-hour clock values.
        for($offset=1;$offset<=3;$offset++){
            $before=ShiftCalc::jdateAddDays($viewFrom,-$offset);$after=ShiftCalc::jdateAddDays($viewTo,$offset);
            if($before)$keys[]=$before;if($after)$keys[]=$after;
        }
        $keys=array_values(array_unique($keys));sort($keys);$from=$keys[0];$to=end($keys);
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
        $covers=Db::all("SELECT sa.id assignment_id,sa.from_date,sa.to_date,r.id AS request_id,r.created_at request_created_at,
                sa.absent_user_id,r.from_jdate,r.to_jdate,r.the_date,r.approver_id,r.decided_at,
                TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS absent_name,
                COALESCE(ar.title,'') absent_role,
                TRIM(CONCAT_WS(' ',ap.first_name,ap.last_name)) AS approver_name,
                TRIM(CONCAT_WS(' ',su.first_name,su.last_name)) AS substitute_name
           FROM substitute_assignments sa
           JOIN requests r ON r.id=sa.request_id AND r.status='approved'
               AND r.type='annual' AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')
           JOIN users u ON u.id=sa.absent_user_id
           LEFT JOIN roles ar ON ar.id=u.role_id
           LEFT JOIN users ap ON ap.id=r.approver_id
           LEFT JOIN users su ON su.id=sa.substitute_user_id
           WHERE sa.substitute_user_id=? AND sa.status='active'
             AND r.substitute_user_id=sa.substitute_user_id AND r.user_id=sa.absent_user_id
             AND sa.id=(SELECT MAX(latest.id) FROM substitute_assignments latest WHERE latest.request_id=sa.request_id AND latest.status='active')
             AND sa.from_date<=? AND sa.to_date>=? ORDER BY sa.id DESC",
           [$uid,$to,$from]);
        $serviceSnapshots=self::locationSnapshots($covers,$from,$to);
        $attendance=self::attendanceEvidence($uid,$from,$to);
        // Pending reservations are advisory and never enter the confirmed cover list.
        $pending=Db::all("SELECT r.id,r.user_id,r.from_jdate,r.to_jdate,r.the_date,
            TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) AS absent_name
            FROM requests r JOIN users u ON u.id=r.user_id
            WHERE r.substitute_user_id=? AND r.status='pending' AND r.type='annual'
              AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')
              AND REPLACE(TRIM(COALESCE(NULLIF(r.from_jdate,''),NULLIF(r.the_date,''))),'/','-')<=?
              AND REPLACE(TRIM(COALESCE(NULLIF(r.to_jdate,''),NULLIF(r.the_date,''),NULLIF(r.from_jdate,''))),'/','-')>=?",[$uid,$to,$from]);
        $owners=[];
        foreach($covers as $r)$owners[(int)$r['absent_user_id']]=true;
        foreach($pending as $r)$owners[(int)$r['user_id']]=true;
        $context=['assignments'=>[],'days'=>[],'auto'=>[]];
        if($owners){
            $ids=array_keys($owners);$slots=implode(',',array_fill(0,count($ids),'?'));
            $assignments=Db::all("SELECT us.user_id,us.shift_id,us.from_jdate,us.to_jdate,s.* FROM user_shifts us LEFT JOIN shifts s ON s.id=us.shift_id WHERE us.user_id IN ($slots) AND (us.shift_id=0 OR s.is_active=1) ORDER BY us.id DESC",$ids);
            $shiftIds=[];
            foreach($assignments as $row){$context['assignments'][(int)$row['user_id']][]=$row;if((int)$row['shift_id']>0)$shiftIds[(int)$row['shift_id']]=true;}
            if($shiftIds){
                $ids=array_keys($shiftIds);$slots=implode(',',array_fill(0,count($ids),'?'));
                foreach(Db::all("SELECT shift_id,jdate,segments,is_off,day_config FROM shift_days WHERE shift_id IN ($slots) AND jdate>=? AND jdate<=?",array_merge($ids,[$from,$to])) as $row){
                    $context['days'][(int)$row['shift_id']][str_replace('/','-',$row['jdate'])]=$row;
                }
            }
        }
        $seenCovers=[];
        foreach($covers as $cover){
            $a=self::day($cover['from_date']??'');$b=self::day($cover['to_date']??'');
            $validRequest=self::range($cover);
            if(!$a||!$b||!$validRequest)continue;
            $a=max($a,$validRequest[0]);$b=min($b,$validRequest[1]);
            if($a>$b)continue;
            foreach($keys as $day){
                if($day<$a||$day>$b)continue;
                $key=(int)$cover['request_id'].':'.$day;
                if(isset($seenCovers[$key]))continue;
                $seenCovers[$key]=true;
                $shift=self::requesterShift((int)$cover['absent_user_id'],$day,$context);
                if($shift&&$shift['type']!=='floating'&&!$shift['segments'])continue;
                $shift=self::attachServiceLocation($shift,$serviceSnapshots[(int)$cover['assignment_id']][$day]??[]);
                $completion=self::completedByAttendance($day,$shift,$attendance);
                $output[$day]['cover'][]=['request_id'=>(int)$cover['request_id'],'absent_user_id'=>(int)$cover['absent_user_id'],
                    'assignment_id'=>isset($cover['assignment_id'])?(int)$cover['assignment_id']:null,
                    'request_created_at'=>$cover['request_created_at']??null,'absent_name'=>$cover['absent_name'],
                    'absent_role'=>$cover['absent_role']??null,
                    'substitute_name'=>$cover['substitute_name']??null,
                    'approved_at'=>$cover['decided_at']??null,'approved_by_id'=>isset($cover['approver_id'])?(int)$cover['approver_id']:null,
                    'approved_by_name'=>$cover['approver_name']??null,
                    'status'=>'confirmed','request_status'=>'approved','is_confirmed'=>true,'shift'=>$shift]+$completion;
            }
        }
        foreach($pending as $reservation){
            $range=self::range($reservation);if(!$range)continue;
            foreach($keys as $date){
                if($date<$range[0]||$date>$range[1])continue;
                $output[$date]['reservations'][]=[
                    'request_id'=>(int)$reservation['id'],
                    'absent_user_id'=>(int)$reservation['user_id'],
                    'absent_name'=>$reservation['absent_name'],
                    'status'=>'pending','is_confirmed'=>false,
                    'shift'=>self::requesterShift((int)$reservation['user_id'],$date,$context)
                ];
            }
        }
        if($includeHistory){
            $history=Db::all("SELECT r.id,r.user_id,r.status,r.from_jdate,r.to_jdate,r.the_date,r.created_at,
                TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) AS absent_name
                FROM requests r JOIN users u ON u.id=r.user_id
                WHERE r.substitute_user_id=? AND r.status IN ('rejected','cancelled','canceled') AND r.type='annual'
                  AND (r.unit='daily' OR r.unit IS NULL OR r.unit='')
                  AND REPLACE(TRIM(COALESCE(NULLIF(r.from_jdate,''),NULLIF(r.the_date,''))),'/','-')<=?
                  AND REPLACE(TRIM(COALESCE(NULLIF(r.to_jdate,''),NULLIF(r.the_date,''),NULLIF(r.from_jdate,''))),'/','-')>=?",[$uid,$to,$from]);
            foreach($history as $r){
                $range=self::range($r);if(!$range)continue;
                foreach($keys as $date){
                    if($date<$range[0]||$date>$range[1])continue;
                    $output[$date]['history'][]=['request_id'=>(int)$r['id'],'absent_user_id'=>(int)$r['user_id'],
                        'absent_name'=>$r['absent_name'],'status'=>$r['status'],'request_status'=>$r['status'],
                        'is_confirmed'=>false,'shift'=>null,'request_created_at'=>$r['created_at']??null];
                }
            }
        }
        // Audit ranges retain reservations released by replacing the substitute or moving dates.
        if($includeHistory&&function_exists('_db_table_exists_safe')&&_db_table_exists_safe('leave_reservation_audit')){
            $released=Db::all("SELECT a.id reservation_id,a.request_id,a.absent_user_id,a.from_date,a.to_date,a.created_at reserved_at,a.actor_id reserved_by_user_id,a.event,
                TRIM(CONCAT_WS(' ',actor.first_name,actor.last_name)) reserved_by_name,
                r.substitute_user_id current_substitute_user_id,r.status current_status,r.from_jdate,r.to_jdate,r.the_date,
                TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) absent_name
                FROM leave_reservation_audit a JOIN requests r ON r.id=a.request_id LEFT JOIN users u ON u.id=a.absent_user_id LEFT JOIN users actor ON actor.id=a.actor_id
                WHERE a.substitute_user_id=? AND a.from_date<=? AND a.to_date>=? ORDER BY a.id DESC",[$uid,$to,$from]);
            $seen=[];
            foreach($released as $r){
                $a=self::day($r['from_date']??'');$b=self::day($r['to_date']??'');if(!$a||!$b)continue;
                $current=self::range($r);
                foreach($keys as $date){
                    if($date<$a||$date>$b)continue;
                    $key=(int)$r['request_id'].':'.$date;if(isset($seen[$key]))continue;$seen[$key]=true;
                    // Current dates remain covered by active or cancelled request records above.
                    if((int)($r['current_substitute_user_id']??0)===$uid&&$current&&$date>=$current[0]&&$date<=$current[1])continue;
                    $output[$date]['history'][]=['request_id'=>(int)$r['request_id'],'absent_user_id'=>(int)$r['absent_user_id'],
                        'absent_name'=>$r['absent_name'],'status'=>'released','request_status'=>$r['current_status'],
                        'reservation_id'=>(int)$r['reservation_id'],'reserved_at'=>$r['reserved_at'],'reserved_by_user_id'=>(int)$r['reserved_by_user_id'],'reserved_by_name'=>$r['reserved_by_name'],'event'=>$r['event'],'is_confirmed'=>false,'shift'=>null];
                }
            }
        }
        $ids=[];
        foreach($output as $day)foreach(['cover','reservations','history'] as $kind)foreach($day[$kind]??[] as $entry)$ids[(int)$entry['request_id']]=true;
        $metadata=self::reservationMetadata(array_keys($ids),$uid);
        foreach($output as &$day)foreach(['cover','reservations','history'] as $kind){
            if(!isset($day[$kind]))continue;
            foreach($day[$kind] as &$entry){$entry['substitute_user_id']=$uid;$entry=array_merge($metadata[(int)$entry['request_id']]??[],$entry);}unset($entry);
        }unset($day);
        self::calendarConflicts($output);
        $output=array_intersect_key($output,$dates);
        return ['days'=>$output,'from'=>$viewFrom,'to'=>$viewTo,'conflict_scope'=>'substitute_reservations'];
    }
}
