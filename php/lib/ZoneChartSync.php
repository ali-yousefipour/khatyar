<?php
/**
 * Chart synchronization for one region. The regional chart is a
 * projection of live role/zone/leadership data, not a second roster table.
 * Synchronization replaces saved manager edges only for people in the selected scope.
 * Operational approval policies and leadership assignments remain untouched.
 */
class ZoneChartSync {
  /**
   * Persist the regional chart into the same two stores read by the saved chart:
   * users.manager_id (primary) and user_managers (all parents).
   * The selected zone and its descendants are the only write scope.
   * A single DB transaction prevents partially synchronized reporting chains.
   */
  public static function synchronize(int $zoneId): array {
    $snapshot=self::snapshot($zoneId);
    $scopeUsers=array_values(array_unique(array_map('intval',$snapshot['user_ids'])));
    if(!$scopeUsers) return array_diff_key($snapshot,['user_ids'=>true])+[
      'updated_users'=>0,'saved_relations'=>0,'changed'=>false,'persisted'=>true
    ];
    $relationships=[];
    $externalLeaderIds=array_fill_keys(array_map('intval',$snapshot['responsible_leader_ids']??[]),true);
    // Only home-zone staff are authoritative for deletion/replacement. Leaders
    // with another home region get extra links rather than losing existing ones.
    foreach($snapshot['edges'] as $edge){
      $uid=(int)($edge['user_id']??0);$mid=(int)($edge['manager_id']??0);
      if($uid<1||$mid<1||$uid===$mid)continue;
      $relationships[$uid][$mid]=$mid;
    }
    // Do not erase existing saved reporting lines if the region is not
    // configured and the calculation returned no usable relationships.
    if(!$relationships) Http::error('هیچ ارتباط سازمانی معتبری برای این منطقه محاسبه نشد. ابتدا سربازرس و بازرسان مسئول را تعیین کنید.',422);
    $pdo=Db::pdo();
    $pdo->beginTransaction();
    try{
      $saved=0;
      foreach($scopeUsers as $uid){
        $parents=array_values($relationships[$uid]??[]);
        // People with no regional reporting rule must not lose manually assigned
        // managers during a regional synchronization.
        if(!$parents)continue;
        Db::run('DELETE FROM user_managers WHERE user_id=?',[$uid]);
        foreach($parents as $mid){
          Db::run('INSERT INTO user_managers(user_id,manager_id) VALUES(?,?)',[$uid,$mid]);
          $saved++;
        }
        Db::run('UPDATE users SET manager_id=? WHERE id=?',[($parents[0]??null),$uid]);
      }
      // Preserve other-zone managers when a designated inspector works in
      // several regions. Never change the home primary manager of these staff.
      foreach($externalLeaderIds as $uid=>$unused){
        if(in_array($uid,$scopeUsers,true))continue;
        foreach(array_values($relationships[$uid]??[]) as $mid){
          Db::run('INSERT IGNORE INTO user_managers(user_id,manager_id) VALUES(?,?)',[$uid,$mid]);
          $saved++;
        }
      }
      $pdo->commit();
    }catch(Throwable $failure){
      if($pdo->inTransaction())$pdo->rollBack();
      throw $failure;
    }
    unset($snapshot['user_ids'],$snapshot['responsible_leader_ids']);
    $snapshot['updated_users']=count($scopeUsers);
    $snapshot['saved_relations']=$saved;
    $snapshot['changed']=true;
    $snapshot['persisted']=true;
    $snapshot['manual_chart_preserved']=false;
    return $snapshot;
  }
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
    // Responsible inspectors/seniors may belong to another home zone.
    // Include them in the displayed regional projection while preserving
    // their unrelated saved managers outside this region.
    $assignedLeaders=[];
    foreach($zones as $zone)if(isset($scope[(int)$zone['id']])){
      foreach($zone['inspector_ids']??[] as $uid)$assignedLeaders[(int)$uid]=true;
      $senior=(int)($zone['senior_user_id']??0);
      if($senior>0)$assignedLeaders[$senior]=true;
    }
    $included=[];$homeMembers=[];$roleCounts=['senior'=>0,'inspector'=>0,'field'=>0];
    foreach($users as $user){$id=(int)$user['id'];$home=isset($scope[(int)($user['zone_id']??0)]);if(!$home&&!isset($assignedLeaders[$id]))continue;$included[$id]=true;if($home)$homeMembers[$id]=true;$role=OrgChart::roleKey($user['role_title']??'');if(isset($roleCounts[$role]))$roleCounts[$role]++;}
    $links=array_values(array_filter($edges,static fn($e)=>isset($included[(int)$e['user_id']])));
    $seen=[];foreach($links as $edge){$key=(int)$edge['user_id'].':'.(int)$edge['manager_id'];$seen[$key]=true;}
    return ['ok'=>true,'zone_id'=>$zoneId,'zone_name'=>$byId[$zoneId]['name'],
      'included_subregions'=>count($scope)-1,'staff_count'=>count($included),
      'role_counts'=>$roleCounts,'edges'=>$links,'relation_count'=>count($seen),'user_ids'=>array_keys($homeMembers),'responsible_leader_ids'=>array_values(array_intersect(array_keys($assignedLeaders),array_keys($included))),
      'chart_type'=>'regional','manual_chart_preserved'=>true,
      'refreshed_at'=>gmdate('c')];
  }
}
