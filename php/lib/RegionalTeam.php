<?php
/**
 * Regional scope for "My Subordinates".
 * Never infer permissions from a client-supplied zone or role.
 */
final class RegionalTeam {
    public static function roleKey(string $title): ?string {
        require_once __DIR__.'/OrgChart.php';
        return OrgChart::roleKey($title);
    }
    public static function zoneTree(array $zones, array $roots): array {
        $children=[];
        foreach($zones as $zone) {
            $id=(int)($zone['id']??0);$parent=(int)($zone['parent_id']??0);
            if($id>0)$children[$parent][]=$id;
        }
        $seen=[];$stack=array_values(array_filter(array_map('intval',$roots)));
        while($stack) {
            $id=array_pop($stack);
            if(isset($seen[$id]))continue;
            $seen[$id]=true;
            foreach($children[$id]??[] as $child)$stack[]=$child;
        }
        return array_keys($seen);
    }
    public static function allowedMembers(array $actor,array $users,array $zones,array $leadership): array {
        // Regional hierarchy is configured by numeric role level, not the
        // editable Persian title (which can vary between equivalent roles).
        $viewerLevel=(int)($actor['level']??0);
        if(!in_array($viewerLevel,[5,6],true))return [];
        $actorId=(int)($actor['id']??0);if(!$actorId)return [];
        $roots=[];
        foreach($leadership as $entry){
            $z=(int)($entry['zone_id']??0);
            if($viewerLevel===5 && (int)($entry['senior_user_id']??0)===$actorId)$roots[]=$z;
            if($viewerLevel===6 && in_array($actorId,array_map('intval',$entry['inspector_ids']??[]),true))$roots[]=$z;
        }
        // If explicit responsibility has been assigned, it takes precedence
        // over the staff member's physical base region.
        if(!$roots && (int)($actor['zone_id']??0)>0)$roots[]=(int)$actor['zone_id'];
        if(!$roots)return [];
        $scope=array_fill_keys(self::zoneTree($zones,$roots),true);
        $allowed=[];
        foreach($users as $person){
            $id=(int)($person['id']??0);
            if(!$id||$id===$actorId||empty($person['is_active']))continue;
            $memberLevel=(int)($person['level']??0);
            if($memberLevel<=$viewerLevel || $memberLevel>9)continue;
            $personZone=(int)($person['zone_id']??0);
            $inScope=isset($scope[$personZone]);
            // Inspectors appointed to the region can be based elsewhere.
            if($viewerLevel===5&&$memberLevel===6){
                foreach($leadership as $entry){
                    if(isset($scope[(int)($entry['zone_id']??0)])&&in_array($id,array_map('intval',$entry['inspector_ids']??[]),true)){$inScope=true;break;}
                }
            }
            if($inScope)$allowed[$id]=$person;
        }
        return array_values($allowed);
    }
    public static function attendanceState(array $sessions): array {
        $visits=[];
        foreach($sessions as $session){
            $in=(string)($session['check_in']??'');
            if($in==='')continue;
            $out=$session['check_out']??null;
            $visits[]=['check_in_at'=>$in,'check_out_at'=>$out,
                'check_in_time'=>substr($in,11,5),
                'check_out_time'=>$out?substr((string)$out,11,5):null];
        }
        $last=$visits?end($visits):null;
        $active=$last!==null&&empty($last['check_out_at']);
        $completed=!$active&&count($visits)>0;
        return ['attendance_status'=>$active?'present':($completed?'completed':'absent'),
            'is_present'=>$active,'check_in_time'=>$last['check_in_time']??null,
            'check_in_at'=>$last['check_in_at']??null,
            'check_out_time'=>$last['check_out_time']??null,
            'attendance_sessions'=>$visits];
    }
    public static function response(array $actor): array {
        $actorId=(int)($actor['id']??0);
        $actorRow=Db::one('SELECT u.zone_id,r.level FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?',[$actorId])?:[];
        $actor['zone_id']=$actorRow['zone_id']??null;
        $actor['level']=$actorRow['level']??null;
        $zones=Db::all('SELECT id,name,parent_id FROM zones');
        $users=Db::all('SELECT u.id,u.first_name,u.last_name,u.zone_id,u.is_active,r.title role_title,r.level FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1');
        $leadership=[];
        try{
            foreach(Db::all('SELECT zone_id,senior_user_id,inspector_ids FROM zone_leadership') as $row){
                $row['inspector_ids']=json_decode((string)($row['inspector_ids']??'[]'),true)?:[];
                $leadership[]=$row;
            }
        }catch(Throwable $ignored) {
            // Older installations without zone_leadership use the direct zone assignment.
        }
        $allowed=self::allowedMembers($actor,$users,$zones,$leadership);
        $names=[];foreach($zones as $z)$names[(int)$z['id']]=(string)$z['name'];
        $ids=array_map(static fn($u)=>(int)$u['id'],$allowed);
        $attendance=[];$userLines=[];
        if($ids){
            // Fetch every check-in today (not just the latest) for each scoped person.
            foreach(array_chunk($ids,300) as $chunk){
                $marks=implode(',',array_fill(0,count($chunk),'?'));
                $rows=Db::all('SELECT user_id,check_in,check_out FROM staff_attendance
                    WHERE user_id IN ('.$marks.') AND check_in >= CURDATE() AND check_in < CURDATE() + INTERVAL 1 DAY
                    ORDER BY user_id,check_in,id', $chunk);
                foreach($rows as $a)$attendance[(int)$a['user_id']][]=$a;
                $lineRows=Db::all('SELECT ul.user_id,l.code FROM user_lines ul
                    JOIN `lines` l ON l.id=ul.line_id WHERE ul.user_id IN ('.$marks.') ORDER BY l.code', $chunk);
                foreach($lineRows as $row)$userLines[(int)$row['user_id']][]=(string)$row['code'];
            }
        }
        $groups=[];$present=0;$completed=0;
        foreach($allowed as $p){
            $id=(int)$p['id'];$zoneId=(int)($p['zone_id']??0);
            $state=self::attendanceState($attendance[$id]??[]);
            if($state['attendance_status']==='present')$present++;
            if($state['attendance_status']==='completed')$completed++;
            $title=(string)($p['role_title']??'سایر');
            $lines=$userLines[$id]??[];
            $groups[$title][]=array_merge([
                'id'=>$id,'name'=>trim((string)($p['first_name']??'').' '.(string)($p['last_name']??'')),
                'role_title'=>$title,'zone_id'=>$zoneId,'zone_name'=>$names[$zoneId]??'',
                'line_count'=>count($lines),'lines'=>$lines,
            ],$state);
        }
        ksort($groups,SORT_NATURAL);
        return ['groups'=>$groups,'total'=>count($allowed),'present'=>$present,'completed'=>$completed,'absent'=>count($allowed)-$present-$completed,
                'busiest'=>null,'idlest'=>null];
    }
}
