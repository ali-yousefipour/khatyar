<?php
/**
 * Per-region request workflow. The configured zone, not job title or physical
 * location of a reviewer, owns the approval sequence.
 */
final class ZoneWorkflow {
  public static function ensure(): void {
    static $ready=false;
    if($ready)return;
    // Existing installations only need read access to the workflow table.
    // Running CREATE TABLE IF NOT EXISTS on every HTTP request can fail on
    // restricted production accounts and implicitly commit an active transaction.
    try {
      Db::one('SELECT zone_id FROM zone_workflows LIMIT 1');
      $ready=true;
      return;
    } catch (\\Throwable $missing) {
      // Only bootstrap a missing table outside a business transaction.
      if(method_exists('Db','pdo') && Db::pdo()->inTransaction())throw $missing;
    }
    Db::run("CREATE TABLE IF NOT EXISTS zone_workflows (
      zone_id INT NOT NULL PRIMARY KEY,
      mode VARCHAR(20) NOT NULL,
      admin_reviewer_id INT NULL,
      to_chief TINYINT(1) NOT NULL DEFAULT 1,
      to_head TINYINT(1) NOT NULL DEFAULT 1,
      updated_by INT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready=true;
  }
  public static function config(int $zoneId): ?array {
    if($zoneId<1)return null;
    self::ensure();
    $row=Db::one("SELECT zone_id,mode,admin_reviewer_id,to_chief,to_head FROM zone_workflows WHERE zone_id=?",[$zoneId]);
    if(!$row)return null; // No silent default, including HQ and motor patrol.
    return ['zone_id'=>(int)$row['zone_id'],'mode'=>$row['mode'],
      'admin_reviewer_id'=>isset($row['admin_reviewer_id'])?(int)$row['admin_reviewer_id']:null,
      'to_chief'=>(bool)$row['to_chief'],'to_head'=>(bool)$row['to_head']];
  }
  public static function enrich(array $zones): array {
    self::ensure();
    $rows=Db::all("SELECT zone_id,mode,admin_reviewer_id,to_chief,to_head FROM zone_workflows");
    $mapped=[];foreach($rows as $r)$mapped[(int)$r['zone_id']]=$r;
    foreach($zones as &$z){
      $w=$mapped[(int)$z['id']]??null;
      $z['workflow_mode']=$w['mode']??null;
      $z['admin_reviewer_id']=isset($w['admin_reviewer_id'])?(int)$w['admin_reviewer_id']:null;
      $z['to_chief']=$w?((int)$w['to_chief']===1):true;
      $z['to_head']=$w?((int)$w['to_head']===1):true;
      $z['workflow_configured']=$w!==null;
    }unset($z);return $zones;
  }
  private static function activeUser(int $id): ?array {
    if($id<=0)return null;
    $u=Db::one("SELECT u.id,u.is_active,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",[$id]);
    return $u && !empty($u['is_active'])?$u:null;
  }
  private static function activeRole(string $role): ?int {
    require_once __DIR__.'/OrgChart.php';
    foreach(Db::all("SELECT u.id,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY u.id") as $u)
      if(OrgChart::roleKey($u['role_title'])===$role)return (int)$u['id'];
    return null;
  }
  public static function validate(array $b): array {
    require_once __DIR__.'/OrgChart.php';
    $mode=(string)($b['workflow_mode']??$b['mode']??'');
    if(!in_array($mode,['inspection','administrative'],true))Http::error('نوع سلسله‌مراتب منطقه را مشخص کنید.',422);
    $chief=!empty($b['to_chief']);$head=!empty($b['to_head']);
    $senior=(int)($b['senior_user_id']??0);
    $ins=(array)($b['inspector_ids']??[]);
    $ins=array_values(array_unique(array_filter(array_map('intval',$ins),fn($x)=>$x>0)));
    $reviewer=(int)($b['admin_reviewer_id']??0);
    if($mode==='inspection'){
      if($senior<1||!$ins)Http::error('برای حالت بازرسی باید سربازرس و دست‌کم یک بازرس فعال انتخاب شوند.',422);
      $person=self::activeUser($senior);
      if(!$person||!OrgChart::eligibleZoneLeader($person['role_title'],'senior'))Http::error('سربازرس منطقه معتبر یا فعال نیست.',422);
      foreach($ins as $id){
        $person=self::activeUser($id);
        if(!$person||!OrgChart::eligibleZoneLeader($person['role_title'],'inspector')||$id===$senior)Http::error('بازرس منطقه معتبر یا فعال نیست.',422);
      }
      $chief=true;$head=true;$reviewer=0;
    } else {
      $senior=0;$ins=[];
      if(!$reviewer&&!$chief&&!$head)Http::error('برای سلسله‌مراتب اداری حداقل یک مسئول یا مرحله تأیید انتخاب کنید.',422);
      if($reviewer&&!self::activeUser($reviewer))Http::error('مسئول اداری انتخاب‌شده فعال نیست.',422);
    }
    if($chief&&!self::activeRole('chief'))Http::error('برای این زنجیره سربازرس ارشد فعال وجود ندارد.',422);
    if($head&&!self::activeRole('head'))Http::error('برای این زنجیره رئیس اداره بازرسی فعال وجود ندارد.',422);
    if($reviewer&&in_array($reviewer,array_filter([self::activeRole('chief'),self::activeRole('head')]),true))
      Http::error('مسئول اولیه نباید در زنجیره تأیید تکرار شود.',422);
    return ['mode'=>$mode,'senior_user_id'=>$senior?:null,'inspector_ids'=>$ins,
      'admin_reviewer_id'=>$reviewer?:null,'to_chief'=>$chief,'to_head'=>$head];
  }
  public static function write(int $zoneId,array $cfg,int $actor): void {
    self::ensure();
    Db::run("INSERT INTO zone_workflows(zone_id,mode,admin_reviewer_id,to_chief,to_head,updated_by)
      VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE mode=VALUES(mode),admin_reviewer_id=VALUES(admin_reviewer_id),
      to_chief=VALUES(to_chief),to_head=VALUES(to_head),updated_by=VALUES(updated_by)",
      [$zoneId,$cfg['mode'],$cfg['admin_reviewer_id'],$cfg['to_chief']?1:0,$cfg['to_head']?1:0,$actor]);
    // Old area leadership remains available for reports, but cannot override
    // a new administrative workflow.
    Db::run("INSERT INTO zone_leadership(zone_id,senior_user_id,inspector_ids,updated_by) VALUES(?,?,?,?)
      ON DUPLICATE KEY UPDATE senior_user_id=VALUES(senior_user_id),
      inspector_ids=VALUES(inspector_ids),updated_by=VALUES(updated_by)",
      [$zoneId,$cfg['senior_user_id'],json_encode($cfg['inspector_ids']),$actor]);
  }
  public static function chain(int $zoneId): array {
    require_once __DIR__.'/OrgChart.php';
    $cfg=self::config($zoneId);
    if(!$cfg)Http::error('سلسله‌مراتب منطقه تنظیم نشده است. مدیر سامانه باید نوع و مسئولان تأیید را تعیین کند.',422);
    $chain=[];
    if($cfg['mode']==='inspection'){
      $z=OrgChart::withZoneLeaders(Db::all("SELECT id,name,parent_id FROM zones WHERE id=?",[$zoneId]));
      $area=$z[0]??null;
      $ins=$area['inspector_ids']??[];$senior=(int)($area['senior_user_id']??0);
      if(!$senior||!$ins)Http::error('مسئولان بازرسی منطقه ناقص هستند. بازرس و سربازرس را مشخص کنید.',422);
      $actualSenior=self::activeUser($senior);
      if(!$actualSenior||!OrgChart::eligibleZoneLeader($actualSenior['role_title'],'senior'))
        Http::error('سربازرس مسئول منطقه تغییر سمت داده یا غیرفعال شده است.',422);
      foreach($ins as $id){
        $actualInspector=self::activeUser((int)$id);
        if(!$actualInspector||!OrgChart::eligibleZoneLeader($actualInspector['role_title'],'inspector'))
          Http::error('بازرس مسئول منطقه تغییر سمت داده یا غیرفعال شده است.',422);
      }
      // Several inspectors may cover the same area. Select one stable primary
      // reviewer; do not make colleagues approve the same request in series.
      $chain[]=(int)$ins[0];
      $chain[]=$senior;
    } elseif($cfg['mode']==='administrative'){
      if($cfg['admin_reviewer_id'])$chain[]=$cfg['admin_reviewer_id'];
    }else Http::error('نوع سلسله‌مراتب منطقه نامعتبر است.',422);
    if($cfg['to_chief']){$id=self::activeRole('chief');if(!$id)Http::error('سربازرس ارشد فعال تعریف نشده است.',422);$chain[]=$id;}
    if($cfg['to_head']){$id=self::activeRole('head');if(!$id)Http::error('رئیس اداره بازرسی فعال تعریف نشده است.',422);$chain[]=$id;}
    if(!$chain||count($chain)!==count(array_unique($chain)))Http::error('زنجیره تأیید منطقه ناقص یا دارای مسئول تکراری است.',422);
    foreach($chain as $id)if(!self::activeUser((int)$id))Http::error('یکی از مسئولان منطقه غیرفعال شده است.',422);
    return $chain;
  }
}
