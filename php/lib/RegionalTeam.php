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
        $role=self::roleKey((string)($actor['role_title']??''));
        if(!in_array($role,['senior','inspector'],true))return [];
        $actorId=(int)($actor['id']??0);if(!$actorId)return [];
        $roots=[];
        foreach($leadership as $entry){
            $z=(int)($entry['zone_id']??0);
            if($role==='senior' && (int)($entry['senior_user_id']??0)===$actorId)$roots[]=$z;
            if($role==='inspector' && in_array($actorId,array_map('intval',$entry['inspector_ids']??[]),true))$roots[]=$z;
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
            $kind=self::roleKey((string)($person['role_title']??''));
            if($role==='senior'&&!in_array($kind,['inspector','field'],true))continue;
            if($role==='inspector'&&$kind!=='field')continue;
            $personZone=(int)($person['zone_id']??0);
            $inScope=isset($scope[$personZone]);
            // Inspectors appointed to the region can be based elsewhere.
            if($role==='senior'&&$kind==='inspector'){
                foreach($leadership as $entry){
                    if(isset($scope[(int)($entry['zone_id']??0)])&&in_array($id,array_map('intval',$entry['inspector_ids']??[]),true)){$inScope=true;break;}
                }
            }
            if($inScope)$allowed[$id]=$person;
        }
        return array_values($allowed);
    }
    public static function response(array $actor): array {
        $actorId=(int)($actor['id']??0);
        $actorRow=Db::one('SELECT zone_id FROM users WHERE id=?',[$actorId])?:[];
        $actor['zone_id']=$actorRow['zone_id']??null;
        $zones=Db::all('SELECT id,name,parent_id FROM zones');
        $users=Db::all('SELECT u.id,u.first_name,u.last_name,u.zone_id,u.is_active,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1');
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
        $attendance=[];
        if($ids){
            // One query for the whole scoped team; keep the index on user_id/check_in usable.
            foreach(array_chunk($ids,300) as $chunk){
                $marks=implode(',',array_fill(0,count($chunk),'?'));
                $rows=Db::all('SELECT a.user_id,a.check_in,a.check_out FROM staff_attendance a
                    INNER JOIN (SELECT user_id,MAX(check_in) AS latest FROM staff_attendance
                      WHERE user_id IN ('.$marks.') AND check_in >= CURDATE()
                      GROUP BY user_id) last
                    ON last.user_id=a.user_id AND last.latest=a.check_in', $chunk);
                foreach($rows as $a)$attendance[(int)$a['user_id']]=$a;
            }
        }
        $groups=[];$present=0;
        foreach($allowed as $p){
            $id=(int)$p['id'];$zoneId=(int)($p['zone_id']??0);
            $a=$attendance[$id]??null;
            $active=$a!==null&&empty($a['check_out']);
            if($active)$present++;
            $title=(string)($p['role_title']??'سایر');
            $groups[$title][]=[
                'id'=>$id,'name'=>trim((string)($p['first_name']??'').' '.(string)($p['last_name']??'')),
                'role_title'=>$title,'zone_id'=>$zoneId,'zone_name'=>$names[$zoneId]??'',
                'check_in_time'=>$a?substr((string)$a['check_in'],11,5):null,
                'check_in_at'=>$a['check_in']??null,
                'is_present'=>$active,'line_count'=>0,'lines'=>[],
            ];
        }
        ksort($groups,SORT_NATURAL);
        return ['groups'=>$groups,'total'=>count($allowed),'present'=>$present,'absent'=>count($allowed)-$present,
                'busiest'=>null,'idlest'=>null];
    }
}
