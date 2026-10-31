<?php
declare(strict_types=1);

class Db {
  public static bool $historyMatch=false;
  public static function one(string $sql,array $args=[]): ?array {
    if(str_contains($sql,'request_approval_steps'))return self::$historyMatch?['id'=>5]:null;
    throw new LogicException('Unexpected query: '.$sql);
  }
}
class Http { public static function error(string $message,int $code=400): void { throw new RuntimeException($message,$code); } }
function _db_table_exists_safe(string $table): bool { return $table==='request_approval_steps'; }
function checkScope(bool $condition,string $message): void { if(!$condition)throw new RuntimeException($message); }

$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function _req_is_root_admin(');
$end=strpos($source,'function _req_report_csv_cell(',$start);
checkScope($start!==false&&$end!==false,'Request visibility helpers not found');
eval(substr($source,$start,$end-$start));

$director=['id'=>1,'username'=>'director','role_title'=>'مدیر کل'];
$admin=['id'=>2,'username'=>'admin','role_title'=>'سربازرس ارشد'];
$reviewer=['id'=>7,'username'=>'reviewer','role_title'=>'سربازرس ارشد'];
$request=['id'=>10,'status'=>'pending','pending_on'=>7,'approver_id'=>null];
checkScope(_req_is_root_admin($director),'Director must have full access');
checkScope(!_req_is_root_admin($admin),'Username admin must not grant full access');
checkScope(_req_admin_can_view_request($director,$request),'Director can see any request');
checkScope(_req_admin_can_view_request($reviewer,$request),'Assigned reviewer can see pending request');
checkScope(!_req_admin_can_view_request($admin,$request),'Unassigned manager cannot see pending request');
$request['status']='approved';$request['pending_on']=null;
checkScope(!_req_admin_can_view_request($admin,$request),'Completed requests are not public to managers');
$request['approver_id']=7;
checkScope(_req_admin_can_view_request($reviewer,$request),'Final approver can see reviewed request');
$request['approver_id']=8;Db::$historyMatch=true;
checkScope(_req_admin_can_view_request($reviewer,$request),'Prior approver can see request from history');
Db::$historyMatch=false;
checkScope(!_req_admin_can_view_request($reviewer,$request),'Unrelated request is hidden');
[$where,$args]=_req_report_filter(['status'=>'approved'],$reviewer);
checkScope(str_contains($where,'EXISTS (SELECT 1 FROM request_approval_steps'),'History enforced in list and export');
checkScope($args===[7,7,7,'approved'],'Scope parameters precede client filters');
[$directorWhere,$directorArgs]=_req_report_filter([],$director);
checkScope($directorWhere===''&&$directorArgs===[],'Director has unrestricted listing');
echo "PASS request recipient scope: director, pending recipient, final/prior approver, unrelated requests and SQL filter\n";
