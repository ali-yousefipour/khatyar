<?php
class OrgChart {
  // Same responsibility precedence as defaultEdges, independent of physical staff membership.
  static function zoneResponsibility($zoneId, $zones, $users) {
    $byZone=[];$byUser=[];$chain=[];$seen=[];
    foreach($zones as $zone)$byZone[(int)$zone['id']]=$zone;
    foreach($users as $user)if(!empty($user['is_active']))$byUser[(int)$user['id']]=$user;
    ksort($byUser,SORT_NUMERIC);
    for($id=(int)$zoneId;$id>0&&isset($byZone[$id])&&!isset($seen[$id]);$id=(int)($byZone[$id]['parent_id']??0)){$seen[$id]=true;$chain[]=$id;}
    $eligible=function($user,$kind){$key=self::roleKey($user['role_title']??'');return $kind==='senior'?$key==='senior':($key==='inspector'||($key==='motor'&&str_contains(strtr($user['role_title']??'',['ي'=>'ی','ك'=>'ک']),'بازرس')));};
    $resolve=function($kind)use($chain,$byZone,$byUser,$eligible){
      foreach($chain as $id){$z=$byZone[$id];$ids=$kind==='senior'?array_filter([$z['senior_user_id']??null]):($z['inspector_ids']??[]);$found=[];foreach($ids as $uid){$uid=(int)$uid;if(isset($byUser[$uid])&&$eligible($byUser[$uid],$kind))$found[$uid]=$byUser[$uid];}if($found)return ['users'=>array_values($found),'zone_id'=>$id,'source'=>'explicit'];}
      foreach($chain as $id){$found=[];foreach($byUser as $user)if((int)($user['zone_id']??0)===$id&&$eligible($user,$kind))$found[]=$user;if($found)return ['users'=>$kind==='senior'?[$found[0]]:$found,'zone_id'=>$id,'source'=>'role'];}
      return ['users'=>[],'zone_id'=>null,'source'=>null];
    };
    $dto=function($u){return ['id'=>(int)$u['id'],'name'=>trim(($u['first_name']??'').' '.($u['last_name']??''))?:($u['name']??$u['username']??''),'role_title'=>$u['role_title']??'','level'=>(int)($u['level']??0),'is_admin'=>(int)($u['is_admin']??0)];};
    $senior=$resolve('senior');$inspectors=$resolve('inspector');
    return ['zone_id'=>$chain?(int)$zoneId:null,'zone_name'=>$byZone[(int)$zoneId]['name']??'','zone_path'=>implode(' / ',array_map(fn($id)=>$byZone[$id]['name']??'',array_reverse($chain))),
      'chief'=>$senior['users']?$dto($senior['users'][0]):null,'inspectors'=>array_map($dto,$inspectors['users']),
      'chief_source'=>$senior['source'],'inspectors_source'=>$inspectors['source'],'chief_zone_id'=>$senior['zone_id'],'inspectors_zone_id'=>$inspectors['zone_id']];
  }
  static function currentZoneResponsibility($zoneId) {
    return self::zoneResponsibility($zoneId,self::withZoneLeaders(Db::all('SELECT id,name,parent_id FROM zones ORDER BY id')),
      Db::all('SELECT u.id,u.first_name,u.last_name,u.username,u.zone_id,u.is_active,r.title role_title,r.level,r.is_admin FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1'));
  }
  static function ensureZoneLeaders() {
    Db::run("CREATE TABLE IF NOT EXISTS zone_leadership (zone_id INT NOT NULL PRIMARY KEY, senior_user_id INT NULL, inspector_ids TEXT NOT NULL, updated_by INT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }
  static function withZoneLeaders($zones) {
    self::ensureZoneLeaders();$leaders=[];
    foreach(Db::all('SELECT zone_id,senior_user_id,inspector_ids FROM zone_leadership') as $row)$leaders[(int)$row['zone_id']]=$row;
    foreach($zones as &$zone){$row=$leaders[(int)$zone['id']]??null;$zone['senior_user_id']=empty($row['senior_user_id'])?null:(int)$row['senior_user_id'];$zone['inspector_ids']=array_values(array_unique(array_map('intval',json_decode($row['inspector_ids']??'[]',true)?:[])));}unset($zone);
    return $zones;
  }
  static function saveZoneLeaders($zoneId,$senior,$inspectors,$actor) {
    self::ensureZoneLeaders();
    if($senior===null || $senior==='')$senior=null;
    elseif(filter_var($senior,FILTER_VALIDATE_INT)===false || (int)$senior<1)Http::error('سربازرس منطقه نامعتبر است',422);
    else $senior=(int)$senior;
    if(!is_array($inspectors) || count($inspectors)>200)Http::error('فهرست بازرس‌ها نامعتبر است',422);
    foreach($inspectors as $id)if(filter_var($id,FILTER_VALIDATE_INT)===false || (int)$id<1)Http::error('شناسهٔ بازرس نامعتبر است',422);
    $inspectors=array_values(array_unique(array_map('intval',$inspectors)));
    $connection=Db::pdo();$connection->beginTransaction();
    try{
      if(!Db::one('SELECT id FROM zones WHERE id=? FOR UPDATE',[(int)$zoneId]))Http::error('منطقه یافت نشد',404);
      $users=Db::all('SELECT u.id,u.is_active,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id FOR UPDATE');$byId=[];foreach($users as $user)$byId[(int)$user['id']]=$user;
      if($senior!==null && (empty($byId[$senior]['is_active']) || self::roleKey($byId[$senior]['role_title']??'')!=='senior'))Http::error('سربازرس باید کاربر فعال با سمت سربازرس منطقه باشد',422);
      foreach($inspectors as $id){$user=$byId[$id]??null;$role=self::roleKey($user['role_title']??'');if(!$user || empty($user['is_active']) || !in_array($role,['inspector','motor'],true) || !str_contains(strtr($user['role_title'],['ي'=>'ی','ك'=>'ک']),'بازرس'))Http::error('بازرس انتخاب‌شده باید فعال و دارای سمت بازرس باشد',422);}
      Db::run('INSERT INTO zone_leadership(zone_id,senior_user_id,inspector_ids,updated_by) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE senior_user_id=VALUES(senior_user_id),inspector_ids=VALUES(inspector_ids),updated_by=VALUES(updated_by)',[(int)$zoneId,$senior,json_encode($inspectors),$actor]);$connection->commit();
    }catch(Throwable $error){if($connection->inTransaction())$connection->rollBack();throw $error;}
    return ['ok'=>true,'senior_user_id'=>$senior,'inspector_ids'=>$inspectors];
  }
  static function roleKey($title) {
    $title = strtr((string)$title, ['ي'=>'ی','ك'=>'ک','ئ'=>'ی']);
    $title = preg_replace('/[\s\x{200c}\x{200d}\x{0640}]+/u', '', $title);
    if (strpos($title, 'صدورپروانه') !== false) return 'licensing';
    if (strpos($title, 'مدیراجرایی') !== false) return 'executive';
    if (strpos($title, 'معاون') !== false && strpos($title, 'بازرسی') !== false) return 'deputy';
    if (strpos($title, 'رییساداره') !== false && strpos($title, 'بازرسی') !== false) return 'head';
    if (strpos($title, 'سربازرسارشد') !== false) return 'chief';
    if (strpos($title, 'سربازرس') !== false) return 'senior';
    if (strpos($title, 'گشت') !== false && strpos($title, 'موتور') !== false) return 'motor';
    if (strpos($title, 'اداری') !== false) return 'office';
    if (strpos($title, 'بازرس') !== false) return 'inspector';
    if (strpos($title, 'ناظرخط') !== false || strpos($title, 'اپراتور') !== false) return 'field';
    return null;
  }

  static function defaultEdges($users, $savedEdges = [], $zones = []) {
    $zoneParents=[];$zoneLeaders=[];$inspectorZones=[];
    foreach($zones as $zone){$zoneId=(int)$zone['id'];$zoneParents[$zoneId]=(int)($zone['parent_id']??0);$zoneLeaders[$zoneId]=$zone;foreach($zone['inspector_ids']??[] as $id)$inspectorZones[(int)$id][]=$zoneId;}
    $active = [];
    $keys = [];
    foreach ($users as $user) {
      $userId = (int)$user['id'];
      if ($userId <= 0 || (isset($user['is_active']) && !$user['is_active'])) continue;
      $active[$userId] = $user;
      $keys[$userId] = self::roleKey($user['role_title'] ?? '');
    }
    ksort($active, SORT_NUMERIC);
    $groups = [];
    foreach ($active as $userId => $user) $groups[$keys[$userId] ?? ''][$userId] = $user;
    $rules = ['field'=>['inspector','motor'], 'inspector'=>['senior'], 'senior'=>['chief'],
      'motor'=>['chief'], 'chief'=>['head'], 'office'=>['head'], 'head'=>['deputy'], 'licensing'=>['executive']];
    $edges = [];
    $children = [];
    foreach ($active as $userId => $user) {
      $role = $keys[$userId];
      $zoneId = (int)($user['zone_id'] ?? 0);
      $regional = in_array($role, ['field','inspector'], true);
      $responsibilityZones=$role==='inspector'?($inspectorZones[$userId]??[$zoneId]):[$zoneId];
      if ($regional && !$zoneId && empty($inspectorZones[$userId])) continue;
      $primary = 1;
      $candidates = [];
      foreach ($rules[$role] ?? [] as $managerRole) $candidates += $groups[$managerRole] ?? [];
      $managerZone=$zoneId;$chosenManagers=[];
      if ($regional) {
        foreach($responsibilityZones as $responsibilityZone){
        $managerZone=$responsibilityZone;
        $seenZones=[];$designated=[];
        while($managerZone>0&&!isset($seenZones[$managerZone])) {
          $seenZones[$managerZone]=true;
          $explicit=$role==='field'?($zoneLeaders[$managerZone]['inspector_ids']??[]):array_filter([$zoneLeaders[$managerZone]['senior_user_id']??null]);
          $designated=array_intersect_key($candidates,array_flip(array_map('intval',$explicit)));
          if($designated){$chosenManagers+=$designated;break;}
          $managerZone=$zoneParents[$managerZone]??0;
        }
        if($designated)continue;
        $managerZone=$responsibilityZone;$seenZones=[];
        while($managerZone>0&&!isset($seenZones[$managerZone])) {
          $seenZones[$managerZone]=true;
          $regionalManagers=array_filter($candidates,fn($manager)=>(int)($manager['zone_id']??0)===$managerZone);
          if ($regionalManagers){$chosenManagers+=$regionalManagers;break;}
          $managerZone=$zoneParents[$managerZone]??0;
        }
        }
        $candidates=$chosenManagers;
      }
      foreach ($candidates as $managerId => $manager) {
        if ($managerId === $userId) continue;
        $edges[$userId.':'.$managerId] = ['user_id'=>$userId,'manager_id'=>$managerId,'primary'=>$primary,'source'=>'regional_default'];
        $children[$managerId][] = $userId;
        $primary = 0;
      }
    }
    foreach ($savedEdges as $edge) {
      $userId = (int)($edge['user_id'] ?? 0);
      $managerId = (int)($edge['manager_id'] ?? 0);
      if (!isset($active[$userId], $active[$managerId]) || $userId === $managerId || $keys[$userId] !== null) continue;
      $queue = [$userId];
      $seen = [];
      $cycle = false;
      while ($queue) {
        $current = array_pop($queue);
        if ($current === $managerId) { $cycle = true; break; }
        if (isset($seen[$current])) continue;
        $seen[$current] = true;
        foreach ($children[$current] ?? [] as $child) $queue[] = $child;
      }
      if ($cycle) continue;
      $edges[$userId.':'.$managerId] = $edge;
      $children[$managerId][] = $userId;
    }
    return array_values($edges);
  }
}
