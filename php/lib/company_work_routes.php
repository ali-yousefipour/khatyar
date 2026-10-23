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
  return ['sources'=>Db::all('SELECT id,jy,jm,file_name,created_at FROM company_work_sources WHERE jy=? AND jm=? ORDER BY id DESC',[$y,$m]),'files'=>Db::all('SELECT id,source_id,jy,jm,created_at FROM company_work_files WHERE jy=? AND jm=? ORDER BY id DESC',[$y,$m]),'account_fields'=>Db::all('SELECT id,label,fkey FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id')];
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
_company_work_route('GET','/files/{id}',function($p,$b,$u){$f=Db::one('SELECT snapshot_json FROM company_work_files WHERE id=?',[(int)$p['id']]);if(!$f)CompanyWork::fail('فایل شرکت یافت نشد',404);return ['id'=>(int)$p['id'],'snapshot'=>json_decode($f['snapshot_json'],true,512,JSON_THROW_ON_ERROR)];});
_company_work_route('GET','/files/{id}/download',function($p,$b,$u){$f=Db::one('SELECT * FROM company_work_files WHERE id=?',[(int)$p['id']]);if(!$f)CompanyWork::fail('فایل شرکت یافت نشد',404);CompanyWork::download($f,'کارکرد-شرکت-'.$f['jy'].'-'.$f['jm'].'.xlsx');});
