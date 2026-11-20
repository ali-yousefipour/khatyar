<?php
require_once __DIR__.'/WorkReportTemplateRepository.php';
require_once __DIR__.'/WorkReportSnapshot.php';

function _work_template_repo($u,bool $manage=false): WorkReportTemplateRepository {
    _monthly_work_report_need($u);
    if($manage&&(empty($u['is_admin'])||(int)($u['level']??99)!==1))Http::error('مدیریت قالب فقط برای مدیر کل مجاز است',403);
    return new WorkReportTemplateRepository(Db::pdo());
}
function _work_template_id($value): int {
    $id=filter_var($value,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
    if($id===false)Http::error('شناسه نامعتبر است',422);
    return $id;
}
function _work_template_flag($value): bool {
    if(!in_array($value,[true,false,1,0,'1','0'],true))Http::error('تنظیم گزارش نامعتبر است',422);
    return in_array($value,[true,1,'1'],true);
}
function _work_template_safe(callable $callback){
    try{return $callback();}
    catch(InvalidArgumentException|JsonException $e){Http::error('اطلاعات قالب یا چینش نامعتبر است: '.$e->getMessage(),422);}
    catch(Throwable $e){error_log('work template failure: '.get_class($e).' '.$e->getMessage());Http::error('عملیات قالب گزارش انجام نشد؛ با مدیر سامانه تماس بگیرید.',500);}
}
function _work_template_upload($repo,$u,?int $id): array {
    $file=$_FILES['file']??null;
    if(!is_array($file)||($file['error']??1)!==UPLOAD_ERR_OK||!is_uploaded_file($file['tmp_name']??'')||($file['size']??0)>WorkReportTemplateArchive::MAX_BYTES)Http::error('فایل اکسل نامعتبر یا بیش از حد مجاز است',422);
    $mapping=json_decode((string)($_POST['mapping']??''),true,32,JSON_THROW_ON_ERROR);
    if(!is_array($mapping))throw new InvalidArgumentException('Column mapping required');
    $title=(string)($_POST['title']??'');$description=(string)($_POST['description']??'');
    if($id!==null){$old=$repo->get($id,null,false);$title=$old['title'];$description=(string)$old['description'];}
    $result=$repo->save($id,$title,$description,$file['tmp_name'],$mapping,(int)$u['id']);
    error_log('work template saved actor='.(int)$u['id'].' template='.$result['id'].' version='.$result['version_id']);
    return $result;
}
function _work_template_public(array $row): array {
    unset($row['workbook'],$row['mapping_json']);
    return $row;
}
function _work_template_snapshot($u,$b,$repo): array {
    try{$data=(new WorkReportSnapshot())->load((int)$u['id'],(string)($b['snapshot_token']??''));}
    catch(Throwable $e){Http::error('پیش‌نمایش منقضی یا نامعتبر است؛ گزارش را دوباره محاسبه کنید.',409);}
    $context=$data['context'];
    if((bool)_final_work_month($context['year'],$context['month'])!==$context['finalized'])Http::error('وضعیت نهایی ماه تغییر کرده است؛ گزارش را دوباره محاسبه کنید.',409);
    $template=$repo->get($context['template_id'],$context['template_version'],true);
    if(!hash_equals($context['template_sha256'],$template['sha256']))Http::error('نسخه قالب تغییر کرده است',409);
    return [$data,$template];
}
function _work_template_people(array $records): array {
    return array_map(static fn($r)=>['id'=>$r['user_id'],'first_name'=>$r['cells'][4],'last_name'=>$r['cells'][5],'personnel_code'=>$r['cells'][6],'friday'=>$r['cells'][7],'holiday'=>$r['cells'][8],'overtime'=>$r['cells'][9]]+$r['placement'],$records);
}
function _work_template_preview_response(array $slots,array $people,array $result): array {
    $assign=$result['assignments'];$vacant=array_keys(array_filter($assign,static fn($v)=>$v===null));
    return ['assignments'=>(object)$assign,'vacant'=>$vacant,'overflow'=>$result['overflow'],'unmatched'=>$result['unmatched'],'summary'=>['total_people'=>count($people),'total_slots'=>count($slots),'assigned'=>count($slots)-count($vacant),'vacant'=>count($vacant),'overflow'=>count($result['overflow']),'unmatched'=>count($result['unmatched'])]];
}
route('GET','/api/admin/shift-report/templates',function($p,$b,$u){
    $repo=_work_template_repo($u);
    return _work_template_safe(function()use($repo,$u){
        $rows=$repo->all();
        if(empty($u['is_admin'])||(int)($u['level']??99)!==1)$rows=array_values(array_filter($rows,static fn($r)=>(bool)$r['enabled']));
        return ['templates'=>$rows];
    });
},false,ADMIN);
route('POST','/api/admin/shift-report/templates',function($p,$b,$u){
    $repo=_work_template_repo($u,true);return _work_template_safe(fn()=>_work_template_upload($repo,$u,null));
},false,ADMIN);
route('GET','/api/admin/shift-report/templates/{id}',function($p,$b,$u){
    $repo=_work_template_repo($u,true);return _work_template_safe(fn()=>_work_template_public($repo->get(_work_template_id($p['id']),null,false)));
},false,ADMIN);
route('GET','/api/admin/shift-report/templates/{id}/versions',function($p,$b,$u){
    $repo=_work_template_repo($u,true);return _work_template_safe(fn()=>['versions'=>$repo->versions(_work_template_id($p['id']))]);
},false,ADMIN);
route('POST','/api/admin/shift-report/templates/{id}/versions',function($p,$b,$u){
    $repo=_work_template_repo($u,true);return _work_template_safe(fn()=>_work_template_upload($repo,$u,_work_template_id($p['id'])));
},false,ADMIN);
route('PUT','/api/admin/shift-report/templates/{id}',function($p,$b,$u){
    $repo=_work_template_repo($u,true);
    return _work_template_safe(function()use($repo,$p,$b,$u){
        $repo->update(_work_template_id($p['id']),(string)($b['title']??''),(string)($b['description']??''),_work_template_flag($b['enabled']??true),_work_template_id($b['version_id']??null),(int)$u['id']);
        return ['ok'=>true];
    });
},false,ADMIN);
route('GET','/api/admin/shift-report/templates/{id}/download',function($p,$b,$u){
    $repo=_work_template_repo($u,true);
    _work_template_safe(function()use($repo,$p,$u){
        $row=$repo->get(_work_template_id($p['id']),isset($_GET['version_id'])?_work_template_id($_GET['version_id']):null,false);
        error_log('work template download actor='.(int)$u['id'].' version='.$row['id']);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="work-template-'.(int)$row['id'].'.xlsx"');
        header('Cache-Control: no-store');header('Content-Length: '.strlen($row['workbook']));echo $row['workbook'];exit;
    });
},false,ADMIN);
route('POST','/api/admin/shift-report/templates/preview',function($p,$b,$u){
    $repo=_work_template_repo($u);
    return _work_template_safe(function()use($repo,$b,$u){
        $year=_work_template_id($b['year']??null);$month=_work_template_id($b['month']??null);
        if($year<1300||$year>1500||$month>12)Http::error('ماه و سال نامعتبر است',422);
        $forecast=_work_template_flag($b['forecast_remaining']??true);$surplus=_work_template_flag($b['include_surplus']??false);
        _work_progress_start($u,'template-preview');
        $id=_work_template_id($b['template_id']??null);
        $template=$repo->get($id,isset($b['template_version'])?_work_template_id($b['template_version']):null,true);
        $data=_work_organization_records($u,$year,$month,['forecast_remaining'=>$forecast?'1':'0','include_surplus'=>$surplus?'1':'0','reuse_token'=>$b['reuse_token']??null]);
        $context=['year'=>$year,'month'=>$month,'finalized'=>$data['finalized'],'forecast_remaining'=>$forecast,'include_surplus'=>$surplus,'template_id'=>$id,'template_version'=>(int)$template['id'],'template_sha256'=>$template['sha256'],'policy_version'=>2];
        $store=new WorkReportSnapshot();
        _work_progress_tick(96,'ذخیره پیش‌نمایش کارکرد');
        $token=$store->save((int)$u['id'],$context,$data['records']);
        $snapshot=$store->load((int)$u['id'],$token);
        $slots=$template['structure']['slots'];$people=_work_template_people($data['records']);
        _work_progress_tick(98,'جانمایی نیروها');
        $result=OrganizationWorkPlacement::suggest($slots,$people);
        _work_progress_tick(100,'پیش‌نمایش آماده است');
        header('Cache-Control: no-store');
        return ['ok'=>true,'snapshot_token'=>$token,'expires_at'=>$snapshot['expires'],'template'=>['id'=>$id,'version'=>(int)$template['id'],'title'=>$template['title']],'people'=>$people,'slots'=>$slots,'groups'=>$template['structure']['groups']]+_work_template_preview_response($slots,$people,$result);
    });
},false,ADMIN);
route('POST','/api/admin/shift-report/templates/validate-placement',function($p,$b,$u){
    $repo=_work_template_repo($u);
    return _work_template_safe(function()use($repo,$b,$u){
        [$data,$template]=_work_template_snapshot($u,$b,$repo);
        $slots=$template['structure']['slots'];$people=_work_template_people($data['records']);
        $fixed=_work_template_validate_assignments($slots,$people,$b['assignments']??null);
        return ['ok'=>true]+_work_template_preview_response($slots,$people,$fixed);
    });
},false,ADMIN);

function _work_template_validate_assignments(array $slots,array $people,$items): array {
    $assign=[];
    if(!is_array($items)||count($items)>count($slots))throw new InvalidArgumentException('Invalid assignments');
    foreach($items as $item){
        if(!is_array($item)||!is_string($item['slot_id']??null)||array_key_exists($item['slot_id'],$assign))throw new InvalidArgumentException('Invalid or duplicate slot');
        $assign[$item['slot_id']]=$item['user_id']??null;
    }
    $fixed=OrganizationWorkPlacement::validate($slots,$people,$assign);
    $auto=OrganizationWorkPlacement::suggest($slots,$people);
    $fixed['unmatched']=array_values(array_intersect($fixed['unassigned'],$auto['unmatched']));
    $fixed['overflow']=array_values(array_diff($fixed['unassigned'],$fixed['unmatched']));
    return $fixed;
}
route('POST','/api/admin/shift-report/templates/export',function($p,$b,$u){
    $repo=_work_template_repo($u);
    return _work_template_safe(function()use($repo,$b,$u){
        require_once __DIR__.'/WorkReportTemplateExporter.php';
        _work_progress_start($u,'template-export');
        [$data,$template]=_work_template_snapshot($u,$b,$repo);
        _work_progress_tick(15,'اعتبارسنجی چینش');
        $fixed=_work_template_validate_assignments($template['structure']['slots'],_work_template_people($data['records']),$b['assignments']??null);
        $input=tempnam(sys_get_temp_dir(),'kh-work-template-');$out=null;
        if($input===false)throw new RuntimeException('Temporary template unavailable');
        try{
            if(!chmod($input,0600)||file_put_contents($input,$template['workbook'])!==strlen($template['workbook']))throw new RuntimeException('Cannot write template');
            _work_progress_tick(25,'تولید اکسل و انتقال کامنت‌ها');
            $out=WorkReportTemplateExporter::export($input,$template['structure'],$data['records'],$fixed,$data['context']);
            _work_progress_tick(95,'فایل معتبر و آماده دانلود');
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="organization-work-'.(int)$data['context']['year'].'-'.(int)$data['context']['month'].'.xlsx"');
            header('Cache-Control: no-store');header('Content-Length: '.filesize($out));
            readfile($out);_work_progress_tick(100,'دانلود تکمیل شد');
        }finally{@unlink($input);if($out!==null)@unlink($out);}
        exit;
    });
},false,ADMIN);
