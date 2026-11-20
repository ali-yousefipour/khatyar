<?php
require_once __DIR__.'/WorkReportTemplateRepository.php';
require_once __DIR__.'/WorkReportSnapshot.php';
require_once __DIR__.'/WorkReportDefaultPlacement.php';

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
    if(!empty($context['batch_pending']))Http::error('محاسبات پیش‌نمایش هنوز کامل نشده است.',409);
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
        $repo->ensureOrganizationTemplate(); // Safe fallback for hosts not yet backfilled by deployment.
        $rows=$repo->all();
        if(empty($u['is_admin'])||(int)($u['level']??99)!==1)$rows=array_values(array_filter($rows,static fn($r)=>(bool)$r['enabled']));
        return ['templates'=>$rows,'default_template_id'=>$repo->defaultId(),'can_manage'=>!empty($u['is_admin'])&&(int)($u['level']??99)===1];
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
function _work_template_stored_placement(int $templateId): array {
    WorkReportDefaultPlacement::ensureSchema(Db::pdo());
    $q=Db::pdo()->prepare('SELECT placement_json FROM work_report_default_placements WHERE template_id=?');
    $q->execute([$templateId]);
    $json=$q->fetchColumn();
    return $json===false?[]:(json_decode($json,true,32,JSON_THROW_ON_ERROR)?:[]);
}
function _work_template_suggest(array $slots,array $people,int $templateId): array {
    $auto=OrganizationWorkPlacement::suggest($slots,$people);
    $saved=_work_template_stored_placement($templateId);
    return $saved?WorkReportDefaultPlacement::apply($slots,$people,$auto,$saved):$auto;
}
route('GET','/api/admin/shift-report/templates/{id}/default-placement',function($p,$b,$u){
    $repo=_work_template_repo($u);
    return _work_template_safe(function()use($repo,$p){
        $id=_work_template_id($p['id']);$repo->get($id,null,false);
        WorkReportDefaultPlacement::ensureSchema(Db::pdo());
        $q=Db::pdo()->prepare('SELECT source_filename,updated_at,JSON_LENGTH(placement_json) AS count FROM work_report_default_placements WHERE template_id=?');
        $q->execute([$id]);
        return ['ok'=>true,'placement'=>$q->fetch(PDO::FETCH_ASSOC)?:null];
    });
},false,ADMIN);
route('POST','/api/admin/shift-report/templates/{id}/default-placement',function($p,$b,$u){
    $repo=_work_template_repo($u,true);
    return _work_template_safe(function()use($repo,$p,$u){
        $id=_work_template_id($p['id']);
        $template=$repo->get($id,null,true);
        $file=$_FILES['file']??null;
        if(!is_array($file)||($file['error']??1)!==UPLOAD_ERR_OK||
           !is_uploaded_file($file['tmp_name']??'')||
           ($file['size']??0)<1||($file['size']??0)>WorkReportTemplateArchive::MAX_BYTES)
            Http::error('فایل اکسل قبلی نامعتبر یا بیش از حد مجاز است',422);
        $name=basename((string)($file['name']??'work-report.xlsx'));
        if(!preg_match('/\.xlsx$/iu',$name))Http::error('فقط فایل xlsx قابل پذیرش است',422);
        WorkReportDefaultPlacement::ensureSchema(Db::pdo());
        $rows=WorkReportDefaultPlacement::read($file['tmp_name'],$template['structure']);
        if(!$rows)Http::error('هیچ نیروی قابل شناسایی در فایل کارکرد پیدا نشد',422);
        $q=Db::pdo()->prepare('INSERT INTO work_report_default_placements
            (template_id,placement_json,source_sha256,source_filename,updated_by)
            VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE
            placement_json=VALUES(placement_json),source_sha256=VALUES(source_sha256),
            source_filename=VALUES(source_filename),updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP');
        $q->execute([$id,json_encode($rows,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),
            hash_file('sha256',$file['tmp_name']),mb_substr($name,0,255),(int)$u['id']]);
        return ['ok'=>true,'template_id'=>$id,'saved_count'=>count($rows),'message'=>'جایگذاری پیش‌فرض ذخیره شد'];
    });
},false,ADMIN);
route('DELETE','/api/admin/shift-report/templates/{id}/default-placement',function($p,$b,$u){
    $repo=_work_template_repo($u,true);
    return _work_template_safe(function()use($repo,$p){
        $id=_work_template_id($p['id']);$repo->get($id,null,false);
        WorkReportDefaultPlacement::ensureSchema(Db::pdo());
        $q=Db::pdo()->prepare('DELETE FROM work_report_default_placements WHERE template_id=?');
        $q->execute([$id]);return ['ok'=>true];
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
        if(!empty($b['batched'])){
            $frozen=_final_work_month($year,$month);
            $ids=$frozen?array_map('intval',array_column(array_values(array_filter(_work_only_active_users(_work_snapshot_decode($frozen['monthly_json'])),static fn($r)=>!_work_organization_excluded_role($r['role']??''))),'user_id')):array_keys(_work_organization_eligible_ids());
            $context=['year'=>$year,'month'=>$month,'finalized'=>(bool)_final_work_month($year,$month),'forecast_remaining'=>$forecast,'include_surplus'=>$surplus,'template_id'=>$id,'template_version'=>(int)$template['id'],'template_sha256'=>$template['sha256'],'policy_version'=>2,'batch_pending'=>true,'batch_ids'=>$ids,'batch_offset'=>0,'batch_period'=>_work_organization_period($year,$month)];
            $store=new WorkReportSnapshot();
            return ['pending'=>true,'batch_token'=>$store->save((int)$u['id'],$context,[]),'done'=>0,'total'=>count($ids)];
        }
        $data=_work_organization_records($u,$year,$month,['forecast_remaining'=>$forecast?'1':'0','include_surplus'=>$surplus?'1':'0','reuse_token'=>$b['reuse_token']??null]);
        $context=['year'=>$year,'month'=>$month,'finalized'=>$data['finalized'],'forecast_remaining'=>$forecast,'include_surplus'=>$surplus,'template_id'=>$id,'template_version'=>(int)$template['id'],'template_sha256'=>$template['sha256'],'policy_version'=>2];
        $store=new WorkReportSnapshot();
        _work_progress_tick(96,'ذخیره پیش‌نمایش کارکرد');
        $token=$store->save((int)$u['id'],$context,$data['records']);
        $snapshot=$store->load((int)$u['id'],$token);
        $slots=$template['structure']['slots'];$people=_work_template_people($data['records']);
        _work_progress_tick(98,'جانمایی نیروها');
        $result=_work_template_suggest($slots,$people,$id);
        _work_progress_tick(100,'پیش‌نمایش آماده است');
        header('Cache-Control: no-store');
        return ['ok'=>true,'snapshot_token'=>$token,'expires_at'=>$snapshot['expires'],'template'=>['id'=>$id,'version'=>(int)$template['id'],'title'=>$template['title']],'people'=>$people,'slots'=>$slots,'groups'=>$template['structure']['groups']]+_work_template_preview_response($slots,$people,$result);
    });
},false,ADMIN);
route('POST','/api/admin/shift-report/templates/preview-batch',function($p,$b,$u){
    $repo=_work_template_repo($u);
    return _work_template_safe(function()use($repo,$b,$u){
        $store=new WorkReportSnapshot();
        try{$saved=$store->load((int)$u['id'],(string)($b['batch_token']??''));}
        catch(Throwable $e){Http::error('محاسبات منقضی شده؛ دوباره پیش‌نمایش را آغاز کنید.',409);}
        $c=$saved['context'];
        if(empty($c['batch_pending']))Http::error('شناسه مرحله نامعتبر است.',409);
        if((bool)_final_work_month($c['year'],$c['month'])!==$c['finalized']||_work_organization_period($c['year'],$c['month'])!==$c['batch_period'])Http::error('بازه یا وضعیت گزارش تغییر کرده است؛ دوباره محاسبه کنید.',409);
        $template=$repo->get($c['template_id'],$c['template_version'],true);
        if(!hash_equals($c['template_sha256'],$template['sha256']))Http::error('نسخه قالب تغییر کرده است.',409);
        $ids=$c['batch_ids'];$offset=$c['batch_offset'];$total=count($ids);
        $chunk=array_slice($ids,$offset,2);
        _work_progress_start($u,'template-preview');
        if(isset($GLOBALS['kh_work_progress']))$GLOBALS['kh_work_progress']['batch']=[$offset,count($chunk),$total];
        $records=$saved['records'];
        if($chunk){
            $data=_work_organization_records($u,$c['year'],$c['month'],['forecast_remaining'=>$c['forecast_remaining']?'1':'0','include_surplus'=>$c['include_surplus']?'1':'0'],array_fill_keys($chunk,true));
            $records=array_merge($records,$data['records']);
        }
        $offset+=count($chunk);$c['batch_offset']=$offset;
        if(isset($GLOBALS['kh_work_progress']))unset($GLOBALS['kh_work_progress']['batch']);
        if($offset<$total){
            $token=$store->save((int)$u['id'],$c,$records);
            _work_progress_tick(min(95,5+(int)floor(90*$offset/max(1,$total))),'محاسبه مرحله‌ای کارکرد',$offset,$total);
            return ['pending'=>true,'batch_token'=>$token,'done'=>$offset,'total'=>$total];
        }
        unset($c['batch_pending'],$c['batch_ids'],$c['batch_offset'],$c['batch_period']);
        $token=$store->save((int)$u['id'],$c,$records);$snapshot=$store->load((int)$u['id'],$token);
        $slots=$template['structure']['slots'];$people=_work_template_people($records);
        _work_progress_tick(98,'جانمایی نیروها',$total,$total);
        $result=_work_template_suggest($slots,$people,(int)$c['template_id']);
        _work_progress_tick(100,'پیش‌نمایش آماده است',$total,$total);
        header('Cache-Control: no-store');
        return ['ok'=>true,'snapshot_token'=>$token,'expires_at'=>$snapshot['expires'],'template'=>['id'=>$c['template_id'],'version'=>$c['template_version'],'title'=>$template['title']],'people'=>$people,'slots'=>$slots,'groups'=>$template['structure']['groups']]+_work_template_preview_response($slots,$people,$result);
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

route('POST','/api/admin/shift-report/templates/default',function($p,$b,$u){
    $repo=_work_template_repo($u,true);
    return _work_template_safe(function()use($repo,$b,$u){
        if(!array_key_exists('template_id',$b))throw new InvalidArgumentException('Template selection required');
        $id=$b['template_id']===null?null:_work_template_id($b['template_id']);
        $repo->setDefault($id,(int)$u['id']);
        return ['ok'=>true,'default_template_id'=>$repo->defaultId()];
    });
},false,ADMIN);
