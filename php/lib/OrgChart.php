<?php
class OrgChart {
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
    $zoneParents=[];
    foreach($zones as $zone)$zoneParents[(int)$zone['id']]=(int)($zone['parent_id']??0);
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
      if ($regional && $zoneId <= 0) continue;
      $primary = 1;
      $candidates = [];
      foreach ($rules[$role] ?? [] as $managerRole) $candidates += $groups[$managerRole] ?? [];
      $managerZone=$zoneId;
      if ($regional) {
        $seenZones=[];
        while($managerZone>0&&!isset($seenZones[$managerZone])) {
          $seenZones[$managerZone]=true;
          $regionalManagers=array_filter($candidates,fn($manager)=>(int)($manager['zone_id']??0)===$managerZone);
          if ($regionalManagers) break;
          $managerZone=$zoneParents[$managerZone]??0;
        }
      }
      foreach ($candidates as $managerId => $manager) {
        if ($managerId === $userId) continue;
        if ($regional && ($managerZone<=0 || (int)($manager['zone_id'] ?? 0) !== $managerZone)) continue;
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
