<?php
/** Sepand source-of-truth import: never erase an existing value on an empty spreadsheet cell. */
function _ssv_sepand_schema(){
  static $ready=false;if($ready)return;
  Db::run("CREATE TABLE IF NOT EXISTS school_service_sepand_drivers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, national_code VARCHAR(10) NOT NULL,
    request_id VARCHAR(30) NULL, first_name VARCHAR(120) NULL, last_name VARCHAR(160) NULL,
    gender VARCHAR(30) NULL, mobile VARCHAR(20) NULL, vin VARCHAR(40) NULL,
    plate_two VARCHAR(2) NULL, plate_letter VARCHAR(8) NULL, plate_three VARCHAR(3) NULL,
    plate_region_code VARCHAR(2) NULL, company_name VARCHAR(255) NULL,
    company_national_id VARCHAR(30) NULL, sepand_status VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sepand_driver_nid(national_code),KEY idx_sepand_driver_vin(vin),
    KEY idx_sepand_driver_status(sepand_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS school_service_sepand_source_rows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, source_type VARCHAR(20) NOT NULL,
    row_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    record_key VARCHAR(120) NOT NULL, payload_json LONGTEXT NOT NULL,
    imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sepand_source_row(row_hash), KEY idx_sepand_source_record(source_type,record_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $existing=[];foreach(Db::all('SHOW COLUMNS FROM school_service_vehicles') as $column)$existing[(string)$column['Field']]=true;
  foreach([
    'sepand_vin'=>'VARCHAR(40) NULL','sepand_system'=>'VARCHAR(100) NULL',
    'sepand_tip'=>'VARCHAR(120) NULL','sepand_make_year'=>'VARCHAR(8) NULL',
    'sepand_capacity'=>'INT NULL','sepand_fuel_type'=>'VARCHAR(80) NULL',
    'sepand_engine_number'=>'VARCHAR(90) NULL','sepand_chassis_number'=>'VARCHAR(90) NULL',
    'sepand_insurance_number'=>'VARCHAR(100) NULL','sepand_driver_national_code'=>'VARCHAR(10) NULL',
    'sepand_student_national_code'=>'VARCHAR(10) NULL','sepand_company_national_id'=>'VARCHAR(30) NULL'
  ] as $column=>$definition){
    if(isset($existing[$column]))continue;
    try{Db::run("ALTER TABLE school_service_vehicles ADD COLUMN $column $definition");}
    catch(Throwable $e){if(strpos($e->getMessage(),'Duplicate column')===false&&strpos($e->getMessage(),'1060')===false)throw $e;}
  }
  $ready=true;
}
function _ssv_sepand_cell($row,$index){return _ssv_norm(_ssv_en($row[$index]??''));}
function _ssv_sepand_import($type,$file,$dryRun){
  if(!in_array($type,['drivers','vehicles'],true))Http::error('نوع فایل سپند نامعتبر است.',422);
  if(($file['size']??0)>12*1024*1024)Http::error('حجم فایل از ۱۲ مگابایت بیشتر است.',413);
  $sheets=_ssv_xlsx_rows($file);$rows=[];
  $required=$type==='drivers'?['شناسه درخواست','نام','نام خانوادگی','کد ملی','شماره موبایل','وضعیت']:['p1','p2_letter','p3','p4_iran','driver_national_code','vin','tip'];
  foreach($sheets as $sheet){if(!$sheet)continue;
    // XLSX parser keys are one-based Excel column positions; preserve those keys.
    $header=array_map(fn($value)=>trim((string)$value),$sheet[0]);
    foreach($required as $col){if(!in_array($col,$header,true))Http::error('ستون الزامی «'.$col.'» در فایل سپند وجود ندارد.',422);}
    $columns=array_flip($header);
    foreach(array_slice($sheet,1) as $row){if(count(array_filter($row,fn($v)=>trim((string)$v)!==''))>0)$rows[]=['cells'=>$row,'columns'=>$columns];}
  }
  if(!$rows)Http::error('فایل سپند ردیف اطلاعاتی ندارد.',422);
  if(count($rows)>25000)Http::error('حداکثر ۲۵ هزار ردیف در هر فایل مجاز است.',422);
  _ssv_tables();_ssv_sepand_schema();
  $pdo=Db::pdo();$created=0;$updated=0;$skipped=0;$errors=[];$seen=[];
  if(!$dryRun)$pdo->beginTransaction();
  try{
    foreach($rows as $i=>$source){
      $row=$source['cells'];$columns=$source['columns'];
      $get=fn($name)=>array_key_exists($name,$columns)?_ssv_sepand_cell($row,$columns[$name]):'';
      if($type==='drivers'){
        $nid=$get('کد ملی');if(!preg_match('/^\d{10}$/',$nid)){$errors[]='ردیف '.($i+2).': کد ملی نامعتبر';continue;}
        $data=['request_id'=>$get('شناسه درخواست'),'first_name'=>$get('نام'),'last_name'=>$get('نام خانوادگی'),'gender'=>$get('جنسیت'),'mobile'=>$get('شماره موبایل'),
          'vin'=>$get('شماره VIN'),'plate_two'=>$get('پلاک (دو رقم)'),'plate_letter'=>$get('پلاک (حرف)'),'plate_three'=>$get('پلاک (سه رقم)'),'plate_region_code'=>$get('پلاک (ایران)'),
          'company_name'=>$get('نام شرکت'),'company_national_id'=>$get('شناسه ملی شرکت'),'sepand_status'=>$get('وضعیت')];
        $table='school_service_sepand_drivers';$key='national_code';$value=$nid;
      }else{
        $p1=$get('p1');$letter=$get('p2_letter');$p3=$get('p3');$p4=$get('p4_iran');
        if(!preg_match('/^\d{2}$/',$p1)||$letter===''||!preg_match('/^\d{3}$/',$p3)||!preg_match('/^\d{2}$/',$p4)){$errors[]='ردیف '.($i+2).': پلاک نامعتبر';continue;}
        // Map by actual spreadsheet headers; `tip` is the displayed vehicle type.
        $data=['vehicle_type'=>$get('tip'),'vehicle_color'=>$get('color'),'sepand_driver_national_code'=>$get('driver_national_code'),
          'sepand_vin'=>$get('vin'),'sepand_system'=>$get('system'),'sepand_tip'=>$get('tip'),'sepand_make_year'=>$get('make_year'),
          'sepand_capacity'=>ctype_digit($get('capacity'))?(int)$get('capacity'):null,'sepand_fuel_type'=>$get('fuel_type'),
          'sepand_engine_number'=>$get('engine_number'),'sepand_chassis_number'=>$get('chassis_number'),
          'sepand_insurance_number'=>$get('insurance_number'),'sepand_student_national_code'=>$get('student_national_code'),
          'sepand_company_national_id'=>$get('co_national_id')];
        $table='school_service_vehicles';$key='plate_two';$value=$p1;
      }
      $fingerprint=$type==='drivers'?$value:implode('|',[$p1,$letter,$p3,$p4]);
      $repeated=isset($seen[$fingerprint]);if($repeated)$skipped++;$seen[$fingerprint]=true;
      $existing=$type==='drivers'?Db::one("SELECT id FROM $table WHERE national_code=?",[$value]):Db::one('SELECT id FROM school_service_vehicles WHERE plate_two=? AND plate_letter=? AND plate_three=? AND plate_region_code=?',[$p1,$letter,$p3,$p4]);
      if(!$repeated){if($existing)$updated++;else$created++;}
      if($dryRun)continue;
      $json=json_encode($row,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
      $hash=hash('sha256',$type.'|'.$fingerprint.'|'.$json);
      Db::run('INSERT IGNORE INTO school_service_sepand_source_rows(source_type,row_hash,record_key,payload_json) VALUES(?,?,?,?)',[$type,$hash,$fingerprint,$json]);
      if($existing){
        // Ignore missing cells rather than clearing information from previous imports or manual edits.
        $data=array_filter($data,fn($v)=>$v!==null&&$v!=='');
        if($data){$assign=implode(',',array_map(fn($k)=>"$k=?",array_keys($data)));Db::run("UPDATE $table SET $assign WHERE id=?",[...array_values($data),(int)$existing['id']]);}
      }else{
        if($type==='drivers')$data=['national_code'=>$nid]+$data;
        else $data=['plate_two'=>$p1,'plate_letter'=>$letter,'plate_three'=>$p3,'plate_region_code'=>$p4]+$data;
        $cols=implode(',',array_keys($data));$markers=implode(',',array_fill(0,count($data),'?'));
        Db::run("INSERT INTO $table ($cols) VALUES ($markers)",array_values($data));
      }
    }
    if(!$dryRun)$pdo->commit();
  }catch(Throwable $e){if(!$dryRun&&$pdo->inTransaction())$pdo->rollBack();throw $e;}
  return ['ok'=>true,'type'=>$type,'preview'=>$dryRun,'rows'=>count($rows),'created'=>$created,'updated'=>$updated,'duplicates'=>$skipped,'invalid'=>count($errors),'errors'=>array_slice($errors,0,60)];
}
route('POST','/api/school-service/sepand-import/{type}',function($p,$b,$u){
  _ssv_need($u,'import');return _ssv_sepand_import((string)$p['type'],$_FILES['file']??null,!empty($_GET['preview']));
});
route('GET','/api/school-service/sepand-drivers',function($p,$b,$u){
  _ssv_need($u,'view');_ssv_tables();_ssv_sepand_schema();
  $page=max(1,(int)($_GET['page']??1));$limit=25;$search=_ssv_norm($_GET['search']??'');$status=_ssv_norm($_GET['status']??'');$where=['1=1'];$args=[];
  if($search!==''){$where[]='(national_code LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR mobile LIKE ? OR vin LIKE ?)';for($j=0;$j<5;$j++)$args[]='%'.$search.'%';}
  if($status!==''){$where[]='sepand_status=?';$args[]=$status;}
  $sql=implode(' AND ',$where);$total=(int)(Db::one("SELECT COUNT(*) n FROM school_service_sepand_drivers WHERE $sql",$args)['n']??0);
  $items=Db::all("SELECT * FROM school_service_sepand_drivers WHERE $sql ORDER BY id DESC LIMIT $limit OFFSET ".(($page-1)*$limit),$args);
  return ['items'=>$items,'total'=>$total,'page'=>$page,'pages'=>max(1,(int)ceil($total/$limit))];
});
/** Application history is distinct from the unique driver profile and field inspections. */
route('GET','/api/school-service/sepand-drivers/{national_code}/history',function($p,$b,$u){
  _ssv_need($u,'view');_ssv_tables();_ssv_sepand_schema();
  $nid=_ssv_en((string)$p['national_code']);
  if(!preg_match('/^\d{10}$/',$nid))Http::error('کد ملی معتبر نیست.',422);
  $driver=Db::one('SELECT id,national_code,first_name,last_name,sepand_status FROM school_service_sepand_drivers WHERE national_code=?',[$nid]);
  if(!$driver)Http::error('پرونده راننده پیدا نشد.',404);
  $records=Db::all("SELECT payload_json,imported_at FROM school_service_sepand_source_rows WHERE source_type='drivers' AND record_key=? ORDER BY id DESC LIMIT 200",[$nid]);
  $history=[];foreach($records as $record){$raw=json_decode($record['payload_json'],true);if(!is_array($raw))continue;
    $history[]=['request_id'=>(string)($raw[1]??''),'status'=>(string)($raw[14]??''),
      'vin'=>(string)($raw[7]??''),'plate_two'=>(string)($raw[8]??''),'plate_letter'=>(string)($raw[9]??''),
      'plate_three'=>(string)($raw[10]??''),'plate_region_code'=>(string)($raw[11]??''),
      'company_name'=>(string)($raw[12]??''),'imported_at'=>$record['imported_at']];
  }
  usort($history,fn($a,$b)=>(int)$b['request_id']<=>(int)$a['request_id']);
  return ['driver'=>$driver,'requests'=>$history,'count'=>count($history)];
});
/** Inspection records are event logs; vehicle metadata is never duplicated per inspection. */
route('GET','/api/school-service/sepand-vehicles/{id}/inspections',function($p,$b,$u){
  _ssv_need($u,'view');_ssv_tables();_ssv_sepand_schema();
  $vehicle=Db::one('SELECT id,plate_two,plate_letter,plate_three,plate_region_code FROM school_service_vehicles WHERE id=?',[(int)$p['id']]);
  if(!$vehicle)Http::error('پرونده خودرو یافت نشد.',404);
  $history=Db::all("SELECT i.id,i.violation_date,i.violation_time,i.created_at,i.description,
    s.name school_name,c.name company_name,
    (SELECT COUNT(*) FROM school_service_inspection_violations iv WHERE iv.inspection_id=i.id) violation_count
    FROM school_service_inspections i
    LEFT JOIN school_service_schools s ON s.id=i.school_id
    LEFT JOIN school_service_companies c ON c.id=i.company_id
    WHERE i.plate_two=? AND i.plate_letter=? AND i.plate_three=? AND i.plate_region_code=?
    ORDER BY i.id DESC LIMIT 200",[$vehicle['plate_two'],$vehicle['plate_letter'],$vehicle['plate_three'],$vehicle['plate_region_code']]);
  return ['vehicle'=>$vehicle,'inspections'=>$history,'count'=>count($history)];
});
