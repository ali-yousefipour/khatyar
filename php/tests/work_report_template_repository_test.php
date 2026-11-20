<?php
require_once __DIR__.'/../lib/WorkReportTemplateRepository.php';
require_once __DIR__.'/../lib/XlsxWriter.php';
function wrAssert($ok,string $message): void {if(!$ok)throw new RuntimeException($message);}
$dsn=getenv('WORK_REPORT_TEST_DSN');
if(!$dsn||!str_contains($dsn,'dbname=work_report_test'))throw new RuntimeException('Dedicated test database required');
$db=new PDO($dsn,getenv('WORK_REPORT_TEST_USER'),getenv('WORK_REPORT_TEST_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
$repo=new WorkReportTemplateRepository($db);
$repo->ensureSchema();$repo->ensureSchema();
$orgId=$repo->ensureOrganizationTemplate();
wrAssert($orgId===$repo->ensureOrganizationTemplate(),'organization seed idempotency');
$org=$repo->get($orgId);
wrAssert($org['title']==='قالب سازمان'&&$org['sha256']===WorkReportTemplateRepository::ORGANIZATION_SHA256,'approved organization seed');
wrAssert($org['workbook']===file_get_contents(__DIR__.'/../lib/organization-template.xlsx'),'exact seeded workbook');
wrAssert(count($org['structure']['slots'])===107&&count($org['structure']['merges'])===43,'approved organization structure');
wrAssert(count($repo->versions($orgId))===1&&$repo->defaultId()===$orgId,'one seed and initial default');
$w=new XlsxWriter(['ردیف','محل','سمت','نام','نام خانوادگی','پرسنلی','جمعه','تعطیل','اضافه']);
$w->addRow([1,'راه آهن','بازرس','آزمایش','نمونه','001',2,3,4]);
$file=$w->output('fixture.xlsx','fixture',true);
try {
    $mapping=['sheet'=>'fixture','first_row'=>2,'last_row'=>2,'columns'=>['ordinal'=>'A','location'=>'B','role'=>'C','first_name'=>'D','last_name'=>'E','personnel_code'=>'F','friday'=>'G','holiday'=>'H','overtime'=>'I']];
    $a=$repo->save(null,'Test template','Fixture',$file,$mapping,1);
    $id=$a['id'];$v1=$a['version_id'];$raw=file_get_contents($file);
    $got=$repo->get($id);
    wrAssert($got['workbook']===$raw,'binary round trip');
    wrAssert($got['sha256']===hash('sha256',$raw),'hash');
    wrAssert(count($got['structure']['slots'])===1,'parsed slots');
    $b=$repo->save($id,'Test template','Version 2',$file,$mapping,1);
    $v2=$b['version_id'];
    wrAssert($v1!==$v2&&count($repo->versions($id))===2,'version history');
    wrAssert((int)$repo->get($id)['id']===$v2,'active version');
    wrAssert($repo->get($id,$v1)['workbook']===$raw,'old version retained');
    $repo->update($id,'Updated','Updated description',true,$v1,1);
    wrAssert((int)$repo->get($id)['id']===$v1,'activate previous version');
    $repo->setDefault($id,1);wrAssert($repo->defaultId()===$id,'default selection');
    $repo->update($id,'Updated','Updated description',false,$v1,1);
    wrAssert($repo->defaultId()===null,'disabled fallback');
    try{$repo->setDefault($id,1);throw new LogicException('Disabled default accepted');}catch(InvalidArgumentException $e){}
    $repo->update($id,'Updated','Updated description',true,$v1,1);
    $repo->setDefault($id,1);$repo->setDefault(null,1);wrAssert($repo->defaultId()===null,'internal default');
    $other=$repo->save(null,'Second template','Fixture',$file,$mapping,1);
    try{$repo->update($id,'Invalid cross-template','',true,$other['version_id'],1);throw new LogicException('Foreign version accepted');}catch(InvalidArgumentException $e){}
    wrAssert($repo->get($id)['title']==='Updated','failed update rollback');
    $repo->ensureSchema();wrAssert(count($repo->versions($id))===2,'migration idempotency');
    $repo->ensureOrganizationTemplate();wrAssert($repo->defaultId()===null,'seed must not override later internal default');
    $repo->update($orgId,'قالب سازمان','Disabled by administrator',false,(int)$org['id'],1);
    $repo->ensureOrganizationTemplate();wrAssert((int)$repo->get($orgId,null,false)['enabled']===0,'seed must not reactivate disabled template');
    foreach($repo->all() as $row)wrAssert(!array_key_exists('workbook',$row),'catalog must not contain workbook');
    echo "Repository, parser, defaults and migration OK\n";
} finally {if(is_string($file))@unlink($file);}
