<?php
date_default_timezone_set('Asia/Tehran');const ADMIN=3;
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class EditTransaction {
  public $active=false,$snapshot;
  function beginTransaction(){$this->active=true;$this->snapshot=[Db::$rows,Db::$punches,Db::$assignments,Db::$history];}
  function commit(){$this->active=false;}
  function inTransaction(){return $this->active;}
  function rollBack(){[Db::$rows,Db::$punches,Db::$assignments,Db::$history]=$this->snapshot;$this->active=false;}
}
class Db {
  static $rows=[],$punches=[],$assignments=[],$history=[],$writes=[],$policy,$failAudit=false,$conflict=false,$stale=false,$locks=[],$connection,$locked=1;
  static function pdo(){return self::$connection??=new EditTransaction;}
  static function one($sql,$params=[]){
    if(str_contains($sql,'GET_LOCK')){self::$locks[]='lock';return ['acquired'=>self::$locked];}
    if(str_contains($sql,'RELEASE_LOCK')){self::$locks[]='release';return ['released'=>1];}
    if(str_contains($sql,'COALESCE(z.leave_requires_substitute'))return ['leave_requires_substitute'=>self::$policy['region_required']??0];
    if(str_contains($sql,'SHOW COLUMNS'))return ['Field'=>'substitute_user_id'];
    if(str_contains($sql,'FROM request_approval_steps'))return null;
    if(str_contains($sql,'FROM work_policies'))return self::$policy;
    if(str_contains($sql,'SELECT * FROM users'))return ['id'=>$params[0],'work_policy_id'=>1];
    if(str_contains($sql,'FROM users'))return $params[0]>0?['id'=>$params[0]]:null;
    if(str_contains($sql,'FROM requests')){$r=self::$rows[$params[0]]??null;if(self::$stale&&str_contains($sql,'FOR UPDATE'))$r['reason']='changed concurrently';return $r;}
    if(str_contains($sql,'FROM staff_attendance'))return self::$conflict?['id'=>999]:null;
    if(str_contains($sql,'FROM substitute_assignments')){
      foreach(self::$assignments as $a){if($a['status']!=='active')continue;if(str_contains($sql,'JOIN requests')){if($a['substitute_user_id']==$params[0]&&$a['request_id']!=$params[1]&&$a['from_date']<=$params[2]&&$a['to_date']>=$params[3])return $a;}elseif($a['request_id']==$params[0])return $a;}
      return null;
    }
    throw new LogicException('Unexpected read: '.$sql);
  }
  static function all($sql,$params=[]){
    if(str_contains($sql,'FROM staff_attendance'))return array_values(array_filter(self::$punches,static function($p)use($sql,$params){
      if($p['user_id']!=$params[0])return false;
      if(str_contains($sql,"method='manual'"))return ($p['method']==='manual'||str_starts_with($p['method'],'manual|'))&&$p['check_in']===$params[1]&&(!str_contains($sql,'AND check_out=?')||$p['check_out']===$params[2]);
      return $p['check_out']===$params[1]&&$p['check_in']>=$params[2]&&$p['check_in']<=$params[3];
    }));
    if(str_contains($sql,'FROM substitute_assignments'))return array_values(array_filter(self::$assignments,fn($a)=>$a['status']==='active'&&$a['substitute_user_id']==$params[0]&&$a['request_id']!=($params[1]??0)));
    if(str_contains($sql,'substitute_user_id=?'))return [];
    if(str_contains($sql,'FROM requests')){
      if(!str_contains($sql,'id<>?'))throw new LogicException('Editing must exclude its own request');
      return array_values(array_filter(self::$rows,fn($r)=>$r['user_id']==$params[0]&&$r['type']===$params[1]&&$r['id']!=$params[2]&&in_array($r['status'],['pending','approved'],true)));
    }
    throw new LogicException('Unexpected rows: '.$sql);
  }
  static function run($sql,$params=[]){
    self::$writes[]=[$sql,$params];
    if(str_starts_with($sql,'CREATE TABLE')&&self::pdo()->active)throw new LogicException('DDL inside transaction');
    if(str_starts_with($sql,'UPDATE requests SET')){
      $id=end($params);preg_match('/SET (.*) WHERE/',$sql,$m);$columns=explode(',',$m[1]);foreach($columns as $i=>$column)self::$rows[$id][trim(explode('=',$column)[0])]=$params[$i];
    }elseif(str_starts_with($sql,'UPDATE staff_attendance')){self::$punches[$params[2]]['check_in']=$params[0];self::$punches[$params[2]]['check_out']=$params[1];}
    elseif(str_starts_with($sql,'UPDATE substitute_assignments')){foreach(self::$assignments as &$a)if($a['request_id']==$params[0]&&$a['status']==='active')$a['status']='canceled';unset($a);}
    elseif(str_starts_with($sql,'INSERT INTO substitute_assignments'))self::$assignments[]=['substitute_user_id'=>$params[0],'request_id'=>$params[1],'absent_user_id'=>$params[2],'from_date'=>$params[3],'to_date'=>$params[4],'status'=>'active'];
    return new class {function rowCount(){return 1;}};
  }
  static function insert($sql,$params=[]){if(self::$failAudit)throw new RuntimeException('audit storage failure');self::$history[]=$params;return count(self::$history);}
}
function _db_table_exists_safe($name){return true;}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
function _zone_leave_requirement_storage(){}
function loadPart($source,$start,$end){$a=strpos($source,$start);$b=strpos($source,$end,$a);if($a===false||$b===false)throw new LogicException('Missing source section');eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$a,$b-$a)));}
loadPart($source,'function gregorian_to_jalali(','function j_to_ts(');
loadPart($source,'function _req_active_work_policy(','function _req_approver(');
loadPart($source,'function _date_ranges_overlap(','// بررسی اینکه آیا تاریخ‌های بازه');
loadPart($source,'function _req_prepare_approval_storage(','// گزارش درخواست‌ها برای ادمین');
function expect($name,$value){if(!$value)throw new LogicException('FAIL '.$name);echo "PASS $name\n";}
function denied($name,$code,$fn){try{$fn();}catch(RuntimeException $e){expect($name,$e->getCode()===$code);return;}throw new LogicException('Unexpected success: '.$name);}
function record($extra=[]){return array_replace(['id'=>3,'user_id'=>12,'type'=>'annual','unit'=>'hourly','status'=>'approved','from_jdate'=>'1405-07-01','to_jdate'=>'1405-07-01','the_date'=>'1405-07-01','from_time'=>'08:00','to_time'=>'09:00','minutes'=>60,'reason'=>'original','approver_note'=>'approved note','approver_id'=>99,'decided_at'=>'2026-10-01 09:00:00','pending_on'=>null,'substitute_user_id'=>null,'in_time'=>null,'out_time'=>null,'selfie_data'=>'private-original-photo'], $extra);}
function resetEdit($extra=[]){Db::$rows=[3=>record($extra)];Db::$punches=[];Db::$assignments=[];Db::$history=[];Db::$writes=[];Db::$failAudit=false;Db::$conflict=false;Db::$stale=false;Db::$locked=1;Db::$locks=[];Db::$policy=['config'=>['annual'=>[]]];}
function edit($body=[]){return _req_edit_approved(3,array_replace(['edit_token'=>_req_edit_token(Db::$rows[3]),'edit_reason'=>'اصلاح اشتباه ثبت'], $body),['id'=>7,'role_title'=>'مدیر کل']);}
resetEdit();denied('unassigned manager cannot edit another request',403,fn()=>_req_edit_approved(3,['edit_reason'=>'تلاش غیرمجاز'],['id'=>7,'role_title'=>'سربازرس ارشد']));
resetEdit();edit(['to_time'=>'10:00','minutes'=>9999]);
expect('recomputed duration, preserved approval and original evidence',Db::$rows[3]['minutes']===120&&Db::$rows[3]['approver_id']===99&&Db::$rows[3]['status']==='approved'&&Db::$rows[3]['selfie_data']==='private-original-photo');
$audit=Db::$history[0];expect('required actor/reason and before/after history',$audit[1]===7&&json_decode($audit[3],true)['minutes']===60&&json_decode($audit[4],true)['minutes']===120&&!str_contains($audit[3],'private-original-photo'));
expect('request lock released after save',Db::$locks===['lock','release']);
foreach([['from_time'=>'10:00','to_time'=>'09:00'],['from_time'=>'09:00','to_time'=>'09:00'],['from_time'=>'9:00','to_time'=>'10:00']] as $invalid){resetEdit();denied('invalid/reversed/equal hourly interval blocked',422,fn()=>edit($invalid));expect('invalid interval cannot mutate approved request',Db::$rows[3]['minutes']===60&&!Db::$history&&end(Db::$locks)==='release');}
resetEdit();Db::$rows[4]=record(['id'=>4,'from_time'=>'10:00','to_time'=>'12:00']);denied('overlap excludes self but rejects another request',409,fn()=>edit(['to_time'=>'11:00']));
resetEdit();Db::$policy['config']['annual']['month_h']=1;denied('assigned policy quota still enforced',422,fn()=>edit(['to_time'=>'10:00']));edit(['to_time'=>'08:30']);expect('old duration excluded from quota while reducing leave',Db::$rows[3]['minutes']===30);
resetEdit();Db::$policy['apply_time_limit_on_approve']=1;Db::$policy['config']['annual']['hourly']['deadline_days']=0;edit(['to_time'=>'10:00']);expect('correction does not reapply submission/approval deadline',Db::$rows[3]['minutes']===120);
resetEdit();Db::$stale=true;denied('stale edit token rejected under row lock',409,fn()=>edit(['to_time'=>'10:00']));
resetEdit(['status'=>'pending']);denied('pending cannot use approved edit API',409,fn()=>edit());
foreach([['user_id'=>99],['type'=>'mission'],['unit'=>'daily'],['status'=>'pending'],['reason'=>['invalid']],['edit_reason'=>'']] as $bad){resetEdit();denied('immutable fields and malformed edit rejected',422,fn()=>edit($bad));}
resetEdit();$r=edit();expect('unchanged save does not create audit revision',$r['unchanged']&&!Db::$history);
resetEdit(['from_jdate'=>null,'to_jdate'=>null]);Db::$policy=null;edit(['approver_note'=>'اصلاح یادداشت']);expect('text-only correction preserves nullable date aliases and does not reapprove',Db::$rows[3]['from_jdate']===null&&Db::$rows[3]['to_jdate']===null&&Db::$rows[3]['approver_note']==='اصلاح یادداشت');
resetEdit(['unit'=>'daily','minutes'=>480,'from_time'=>null,'to_time'=>null,'substitute_user_id'=>9]);Db::$assignments=[['request_id'=>3,'substitute_user_id'=>9,'absent_user_id'=>12,'from_date'=>'1405-07-01','to_date'=>'1405-07-01','status'=>'active']];edit(['from_jdate'=>'1405-07-02','to_jdate'=>'1405-07-03','substitute_user_id'=>10]);
expect('substitute old interval canceled and corrected assignment activated',Db::$assignments[0]['status']==='canceled'&&Db::$assignments[1]['substitute_user_id']===10&&Db::$assignments[1]['from_date']==='1405-07-02'&&Db::$rows[3]['minutes']===960);
resetEdit(['unit'=>'daily','minutes'=>480,'from_time'=>null,'to_time'=>null]);Db::$policy['region_required']=true;denied('region requires substitute for changed daily annual leave',422,fn()=>edit(['to_jdate'=>'1405-07-02']));
function manual($in,$out){resetEdit(['type'=>'manual','unit'=>'daily','minutes'=>0,'from_jdate'=>null,'to_jdate'=>null,'from_time'=>null,'to_time'=>null,'in_time'=>$in,'out_time'=>$out]);Db::$policy=['config'=>['manual'=>[]]];return _req_policy_date('1405-07-01')->format('Y-m-d');}
$g=manual('23:00','02:00');$next=(new DateTimeImmutable($g))->modify('+1 day')->format('Y-m-d');Db::$punches=[77=>['id'=>77,'user_id'=>12,'check_in'=>$g.' 23:00:00','check_out'=>$next.' 02:00:00','method'=>'manual','other_evidence'=>'retained']];edit(['in_time'=>'22:00','out_time'=>'03:00']);
expect('overnight manual correction preserves punch ID and other evidence',Db::$punches[77]['check_in']===$g.' 22:00:00'&&Db::$punches[77]['check_out']===$next.' 03:00:00'&&Db::$punches[77]['other_evidence']==='retained');
expect('manual audit records attendance identity',json_decode(Db::$history[0][4],true)['attendance']['id']===77);
$g=manual('08:00',null);Db::$punches=[77=>['id'=>77,'user_id'=>12,'check_in'=>$g.' 08:00:00','check_out'=>$g.' 18:00:00','method'=>'manual']];edit(['in_time'=>'09:00']);expect('in-only edit preserves later actual checkout',Db::$punches[77]['check_out']===$g.' 18:00:00');
$g=manual('08:00',null);Db::$punches=[77=>['id'=>77,'user_id'=>12,'check_in'=>$g.' 08:00:00','check_out'=>$g.' 18:00:00','method'=>'manual|auto_close']];edit(['in_time'=>'09:00']);expect('auto-closed manual evidence and method retained',Db::$punches[77]['method']==='manual|auto_close');
$g=manual(null,'16:00');Db::$punches=[77=>['id'=>77,'user_id'=>12,'check_in'=>$g.' 08:00:00','check_out'=>$g.' 16:00:00','method'=>'gps']];edit(['out_time'=>'17:00']);expect('out-only edit keeps original GPS entry and method',Db::$punches[77]['check_in']===$g.' 08:00:00'&&Db::$punches[77]['method']==='gps'&&Db::$punches[77]['check_out']===$g.' 17:00:00');
$g=manual('08:00','16:00');Db::$punches=[77=>['id'=>77,'user_id'=>12,'check_in'=>$g.' 08:00:00','check_out'=>$g.' 16:00:00','method'=>'manual']];Db::$punches[78]=array_replace(Db::$punches[77],['id'=>78]);denied('ambiguous legacy manual attendance cannot be guessed',409,fn()=>edit(['in_time'=>'09:00']));
unset(Db::$punches[78]);Db::$conflict=true;denied('manual attendance overlap rejected',409,fn()=>edit(['in_time'=>'09:00']));Db::$conflict=false;Db::$failAudit=true;try{edit(['in_time'=>'09:00']);throw new LogicException('expected storage failure');}catch(RuntimeException $e){expect('audit failure rolls request and attendance back',$e->getMessage()==='audit storage failure'&&Db::$punches[77]['check_in']===$g.' 08:00:00'&&Db::$rows[3]['in_time']==='08:00'&&!Db::$history);}
expect('edits never rewrite finalized months or permanent user shifts',!array_filter(Db::$writes,fn($w)=>preg_match('/(?:UPDATE|DELETE|INSERT INTO) (?:finalized_work_months|user_shifts)\b/',$w[0])));
$definitions=[];function route($m,$path,$fn,$public=false,$level=99){$GLOBALS['definitions'][$path]=[$m,$public,$level];}
loadPart($source,"route('PUT','/api/admin/requests/{id}'",'// Install after');expect('edit route is authenticated and admin-only',$definitions['/api/admin/requests/{id}']===['PUT',false,ADMIN]);
echo "Approved request editing regression tests passed\n";
