<?php
/**
 * Read-only chart synchronization for one region. The regional chart is a
 * projection of live role/zone/leadership data, not a second roster table.
 * Never overwrite manually edited chart links or operational approval roles.
 */
class ZoneChartSync {
  public static function snapshot(int $zoneId): array {
    if ($zoneId<=0) Http::error('شناسه منطقه نامعتبر است',422);
    require_once __DIR__.'/OrgChart.php';
    $zones=OrgChart::withZoneLeaders(Db::all('SELECT id,name,parent_id FROM zones ORDER BY id'));
    $byId=[];
    foreach($zones as $zone) $byId[(int)$zone['id']]=$zone;
    if(!isset($byId[$zoneId])) Http::error('منطقه پیدا نشد',404);
    $users=Db::all('SELECT u.id,u.first_name,u.last_name,u.username,u.zone_id,u.is_active,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY u.id');
    $edges=OrgChart::defaultEdges($users,[],$zones);
    $scope=[$zoneId=>true];$changed=true;
    while($changed){$changed=false;foreach($zones as $zone){$id=(int)$zone['id'];$parent=(int)($zone['parent_id']??0);if($parent && isset($scope[$parent])&&!isset($scope[$id])){$scope[$id]=true;$changed=true;}}}
    $included=[];$roleCounts=['senior'=>0,'inspector'=>0,'field'=>0];
    foreach($users as $user){$id=(int)$user['id'];if(!isset($scope[(int)($user['zone_id']??0)]))continue;$included[$id]=true;$role=OrgChart::roleKey($user['role_title']??'');if(isset($roleCounts[$role]))$roleCounts[$role]++;}
    $links=array_values(array_filter($edges,static fn($e)=>isset($included[(int)$e['user_id']])));
    $seen=[];foreach($links as $edge){$key=(int)$edge['user_id'].':'.(int)$edge['manager_id'];$seen[$key]=true;}
    return ['ok'=>true,'zone_id'=>$zoneId,'zone_name'=>$byId[$zoneId]['name'],
      'included_subregions'=>count($scope)-1,'staff_count'=>count($included),
      'role_counts'=>$roleCounts,'edges'=>$links,'relation_count'=>count($seen),
      'chart_type'=>'regional','manual_chart_preserved'=>true,
      'refreshed_at'=>gmdate('c')];
  }
}
