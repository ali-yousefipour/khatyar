<?php
require_once __DIR__.'/CompanyWork.php';
function _company_work_route($method,$path,$handler){
  route($method,'/api/admin/company-work'.$path,static function($p,$b,$u)use($handler){
    _monthly_work_report_need($u);
    header('Cache-Control: private, no-store');
    try{CompanyWork::schema();return $handler($p,$b,$u);}catch(PayrollError $e){Http::error($e->getMessage(),in_array($e->getCode(),[404,409,422],true)?$e->getCode():422);}
  },false,ADMIN);
}
_company_work_route('GET','',function($p,$b,$u){
  [$y,$m]=Payroll::period((int)($_GET['year']??0),(int)($_GET['month']??0));
  return ['sources'=>Db::all('SELECT a.id,a.jy,a.jm,a.file_name,a.created_at,d.deleted_at FROM company_work_sources a LEFT JOIN company_work_deleted d ON d.kind=\'sources\' AND d.archive_id=a.id WHERE a.jy=? AND a.jm=? ORDER BY a.id DESC',[$y,$m]),'files'=>Db::all('SELECT a.id,a.source_id,a.jy,a.jm,a.created_at,d.deleted_at FROM company_work_files a LEFT JOIN company_work_deleted d ON d.kind=\'files\' AND d.archive_id=a.id WHERE a.jy=? AND a.jm=? ORDER BY a.id DESC',[$y,$m]),'account_fields'=>Db::all('SELECT id,label,fkey FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id')];
});
_company_work_route('POST','/import',function($p,$b,$u){
  // Http::body is the JSON/urlencoded contract. PHP exposes multipart fields in $_POST.
  $form=$_POST;
  if(!isset($form['year'],$form['month']))CompanyWork::fail('سال و ماه همراه فایل دریافت نشد؛ دورهٔ گزارش را انتخاب و فایل را دوباره ارسال کنید');
  [$y,$m]=Payroll::period($form['year'],$form['month']);$f=$_FILES['file']??null;
  if(!$f||$f['error']!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']))CompanyWork::fail('فایل سازمان را انتخاب کنید؛ حداکثر حجم ۱۰ مگابایت');
  if(strtolower(pathinfo($f['name'],PATHINFO_EXTENSION))!=='xlsx')CompanyWork::fail('فقط فایل XLSX پذیرفته می‌شود');
  if(!in_array($form['mode']??'', ['preview','commit'],true))CompanyWork::fail('نوع عملیات نامعتبر است');
  return CompanyWork::import($f['tmp_name'],$f['name'],$y,$m,(int)$u['id'],$form['mode']==='commit');
});
_company_work_route('GET','/sources/{id}',function($p,$b,$u){$s=CompanyWork::source($p['id']);return ['id'=>(int)$s['id'],'year'=>(int)$s['jy'],'month'=>(int)$s['jm'],'rows'=>CompanyWork::matchRows(json_decode($s['rows_json'],true,512,JSON_THROW_ON_ERROR),CompanyWork::users())];});
_company_work_route('GET','/sources/{id}/download',function($p,$b,$u){$s=CompanyWork::source($p['id']);CompanyWork::download($s,$s['file_name']);});
_company_work_route('POST','/sources/{id}/generate',function($p,$b,$u){return CompanyWork::generate(CompanyWork::source($p['id']),(int)($b['account_field_id']??0),(int)$u['id']);});
_company_work_route('GET','/files/{id}',function($p,$b,$u){$f=CompanyWork::activeArchive('files',$p['id']);return ['id'=>(int)$p['id'],'snapshot'=>json_decode($f['snapshot_json'],true,512,JSON_THROW_ON_ERROR)];});
_company_work_route('GET','/files/{id}/download',function($p,$b,$u){$f=CompanyWork::activeArchive('files',$p['id']);CompanyWork::download($f,'کارکرد-شرکت-'.$f['jy'].'-'.$f['jm'].'.xlsx');});

foreach(['sources','files'] as $kind){
  _company_work_route('DELETE','/'.$kind.'/{id}',function($p,$b,$u)use($kind){return CompanyWork::archiveChange($kind,$p['id'],(int)$u['id']);});
  _company_work_route('POST','/'.$kind.'/{id}/restore',function($p,$b,$u)use($kind){return CompanyWork::archiveChange($kind,$p['id'],(int)$u['id'],true);});
}

function _company_work_office_scope($value){if(!in_array($value,['role','zone'],true))CompanyWork::fail('مبنای گروه اداری (سمت یا منطقه) را مشخص کنید');return $value;}
// Incentives are kept separate from factual attendance and immutable finalization.
_company_work_route('GET','/reconciliation',function($p,$b,$u){
  CompanyWork::reconciliationSchema();[$y,$m]=Payroll::period($_GET['year']??0,$_GET['month']??0);
  return ['batches'=>Db::all('SELECT id,source_id,source_name,created_at,reason,reverted_at,revert_reason FROM company_work_reconciliations WHERE jy=? AND jm=? ORDER BY id DESC',[$y,$m]),'active_id'=>(int)(Db::one('SELECT batch_id FROM company_work_reconciliation_state WHERE jy=? AND jm=?',[$y,$m])['batch_id']??0),'finalized'=>(bool)_final_work_month($y,$m)];
});
_company_work_route('GET','/reconciliation/preview/{id}',function($p,$b,$u){CompanyWork::reconciliationSchema();$r=CompanyWork::reconciliationPreview((int)$p['id'],_company_work_office_scope($_GET['office_scope']??null));unset($r['backup']);return $r;});
_company_work_route('POST','/reconciliation/apply/{id}',function($p,$b,$u){CompanyWork::reconciliationSchema();return CompanyWork::reconciliationApply((int)$p['id'],$b['token']??null,$b['reason']??'',(int)$u['id'],_company_work_office_scope($b['office_scope']??null));});
_company_work_route('GET','/reconciliation/batches/{id}',function($p,$b,$u){CompanyWork::reconciliationSchema();$r=CompanyWork::reconciliationRecord($p['id']);return ['id'=>(int)$r['id'],'plan'=>json_decode($r['plan_json'],true,512,JSON_THROW_ON_ERROR),'backup_hash'=>$r['backup_hash'],'source_name'=>$r['source_name'],'created_at'=>$r['created_at'],'reverted_at'=>$r['reverted_at']];});
_company_work_route('POST','/reconciliation/batches/{id}/revert',function($p,$b,$u){CompanyWork::reconciliationSchema();return CompanyWork::reconciliationRevert((int)$p['id'],$b['reason']??'',(int)$u['id']);});
_company_work_route('GET','/reconciliation/batches/{id}/backup',function($p,$b,$u){
  CompanyWork::reconciliationSchema();$r=CompanyWork::reconciliationRecord($p['id']);
  if(!hash_equals($r['backup_hash'],hash('sha256',$r['backup_json'])))CompanyWork::fail('صحت نسخهٔ اصلی تأیید نشد',409);
  header('Content-Type: application/json; charset=utf-8');header('Content-Disposition: attachment; filename="original-work-'.$r['jy'].'-'.$r['jm'].'.json"');header('X-Content-Type-Options: nosniff');echo $r['backup_json'];exit;
});
_company_work_route('GET','/reconciliation/batches/{id}/export',function($p,$b,$u){
  CompanyWork::reconciliationSchema();$r=CompanyWork::reconciliationRecord($p['id']);$plan=json_decode($r['plan_json'],true,512,JSON_THROW_ON_ERROR);
  $daily=($_GET['mode']??'')==='daily';$headers=['نام و نام خانوادگی','شماره پرسنلی'];
  if($daily)$headers=array_merge($headers,['تاریخ شمسی','حضور ثبت‌شدهٔ اولیه','شروع مصوب سازمان','پایان مصوب سازمان','مدت مصوب سازمان (ساعت)','اضافه‌کار قابل پرداخت (ساعت)','تعطیل‌کاری قابل پرداخت (ساعت)','جمعه‌کاری قابل پرداخت (ساعت)']);
  else foreach(['اضافه‌کار','تعطیل‌کاری','جمعه‌کاری'] as $title)foreach(['ثبت‌شدهٔ اولیه','سازمان','قابل پرداخت (تعدیل‌شده)'] as $label)$headers[]=$title.' '.$label.' (ساعت)';
  $x=new XlsxWriter($headers);$x->setProfessionalStyle(true);$x->setTextCol(1);foreach($headers as $i=>$v){$x->setColWidth($i,$i<2?25:20);if($i>=($daily?4:2))$x->setDecimalCol($i);}
  $x->setReportHeading('تطبیق با تعدیلات مصوب سازمان',sprintf('%04d/%02d',$r['jy'],$r['jm']), 'حضور واقعی و نسخهٔ نهایی اصلی تغییر نکرده‌اند؛ توزیع روزانه صرفاً حسابداری است.');
  foreach($plan['rows'] as $row){
    if($daily){foreach($row['days'] as $d){$schedule=$d['organization_schedule']??null;$x->addRow([$row['name'],$row['personnel_code'],$d['jdate'],$d['worked']??'ناموجود',$schedule['from']??'',$schedule['to']??'',$schedule?7.55:'',...array_map(fn($k)=>isset($d['payable_seconds'])?round($d['payable_seconds'][$k]/3600,6):'نسخهٔ قدیمی: تخصیص تعدیل',['overtime','holiday','friday'])]);}}
    else{$values=[$row['name'],$row['personnel_code']];foreach(['overtime','holiday','friday'] as $k)foreach(['actual_seconds','organization_seconds','payable_seconds'] as $field)$values[]=$row[$field][$k]===null?'ناموجود':round($row[$field][$k]/3600,6);$x->addRow($values);}
  }$x->output('organization-incentives-'.$r['id'].'.xlsx','تطبیق کارکرد');
});
