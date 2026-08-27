<?php
// خوانندهٔ جریانی xlsx (کم‌حافظه) با XMLReader + وارد‌کنندهٔ مقاوم
class Xlsx {
  private static function sharedStrings($path) {
    $shared = [];
    $r = new XMLReader();
    if (@$r->open('zip://' . $path . '#xl/sharedStrings.xml') === false) return $shared;
    while ($r->read()) {
      if ($r->nodeType === XMLReader::ELEMENT && $r->localName === 'si') {
        $xml = simplexml_load_string($r->readOuterXML());
        $shared[] = self::siText($xml);
      }
    }
    $r->close();
    return $shared;
  }
  private static function siText($si) {
    if (isset($si->t)) return (string)$si->t;
    $o = ''; foreach ($si->r as $rr) $o .= (string)$rr->t; return $o;
  }
  private static function colIndex($letters) {
    $n = 0; $letters = preg_replace('/[^A-Z]/', '', strtoupper($letters));
    foreach (str_split($letters) as $ch) $n = $n * 26 + (ord($ch) - 64);
    return $n - 1;
  }
  public static function eachRow($path, callable $cb) {
    $shared = self::sharedStrings($path);
    $r = new XMLReader();
    if (@$r->open('zip://' . $path . '#xl/worksheets/sheet1.xml') === false) throw new Exception('شیت کاری در فایل یافت نشد');
    $idx = 0;
    while ($r->read()) {
      if ($r->nodeType === XMLReader::ELEMENT && $r->localName === 'row') {
        $row = simplexml_load_string($r->readOuterXML());
        $cells = [];
        foreach ($row->c as $c) {
          $col = self::colIndex((string)$c['r']);
          $t = (string)$c['t']; $v = '';
          if ($t === 's') { $v = $shared[(int)$c->v] ?? ''; }
          elseif ($t === 'inlineStr') { $v = isset($c->is->t) ? (string)$c->is->t : ''; }
          else { $v = (string)$c->v; }
          $cells[$col] = $v;
        }
        $cb($cells, $idx++);
      }
    }
    $r->close();
  }
}

class Importer {
  private static function nid($v){ $s=preg_replace('/\D/','',(string)$v); return $s===''?null:str_pad($s,10,'0',STR_PAD_LEFT); }
  private static function g($row,$h,$name){ $i=$h[$name]??null; return ($i!==null && isset($row[$i]))?$row[$i]:null; }
  private static function ga($row,$h,$names){ foreach((array)$names as $nm){ $i=$h[$nm]??null; if($i!==null && isset($row[$i]) && $row[$i]!=='') return $row[$i]; } return null; }
  private static function val($v){ $v=trim((string)$v); return ($v===''||$v==='None')?null:$v; }
  // جدا کردن نام و نام خانوادگی از یک رشته («آقای محسن اسودی پور»)
  private static function splitName($full){
    $full = trim((string)$full);
    foreach (['آقای ','خانم ','سرکار خانم ','جناب ','جناب آقای '] as $pre) if (mb_strpos($full,$pre)===0) $full = mb_substr($full, mb_strlen($pre));
    $full = trim($full);
    if ($full==='') return ['',''];
    $parts = preg_split('/\s+/u', $full);
    $first = array_shift($parts);
    return [$first, implode(' ', $parts)];
  }
  // بروزرسانی/ایجاد راننده با فیلدهای دلخواه (فقط مقادیر غیرتهی)
  private static function upsertDriver($nid, $fields){
    if (!$nid) return;
    Db::run("INSERT INTO drivers(national_id,updated_at) VALUES(?,NOW()) ON DUPLICATE KEY UPDATE updated_at=NOW()", [$nid]);
    $set=[]; $vals=[];
    foreach ($fields as $k=>$v){ $v=self::val($v); if($v!==null){ $set[]="$k=?"; $vals[]=$v; } }
    if ($set){ $vals[]=$nid; Db::run("UPDATE drivers SET ".implode(',',$set)." WHERE national_id=?", $vals); }
  }
  private static function lineIdByCode($lineVal){
    if ($lineVal===null) return null;
    $code = trim(preg_split('/\s*-\s*/u', trim((string)$lineVal))[0]);
    if ($code==='' || $code==='None') return null;
    $r = Db::one("SELECT id FROM `lines` WHERE code=?", [$code]);
    if ($r) return $r['id'];
    Db::run("INSERT INTO `lines`(code,status) VALUES(?, 'فعال') ON DUPLICATE KEY UPDATE code=VALUES(code)", [$code]);
    $r = Db::one("SELECT id FROM `lines` WHERE code=?", [$code]);
    return $r ? $r['id'] : null;
  }
  private static function upsertVehicle($plate, $fields){
    if (!$plate) return;
    // اگر متن خط داریم، شناسهٔ خط را پیدا/ایجاد کن تا دسترسی خط‌محور درست کار کند
    if (!empty($fields['line_text']) && empty($fields['line_id'])) {
      $lid = self::lineIdByCode($fields['line_text']);
      if ($lid) $fields['line_id'] = $lid;
    }
    Db::run("INSERT INTO vehicles(plate) VALUES(?) ON DUPLICATE KEY UPDATE plate=VALUES(plate)", [$plate]);
    $set=[]; $vals=[];
    foreach ($fields as $k=>$v){ $v=self::val($v); if($v!==null){ $set[]="$k=?"; $vals[]=$v; } }
    if ($set){ $vals[]=$plate; Db::run("UPDATE vehicles SET ".implode(',',$set)." WHERE plate=?", $vals); }
  }
  private static function linkVehicleDriver($plate, $nid, $shift=null, $lcil=null, $role=null, $preserveRole=false){
    if (!$plate || !$nid) return;
    if ($role) {
      Db::run("INSERT INTO vehicle_drivers(vehicle_id,driver_id,role,shift,line_code_in_line)
        SELECT v.id, d.id, ?, ?, ? FROM vehicles v JOIN drivers d ON d.national_id=? WHERE v.plate=?
        ON DUPLICATE KEY UPDATE role=VALUES(role), shift=COALESCE(VALUES(shift),shift), line_code_in_line=COALESCE(VALUES(line_code_in_line),line_code_in_line)",
        [$role, $shift, $lcil, $nid, $plate]);
      return;
    }
    if ($preserveRole) {
      // نقش موجود را دست نزن (برای ایمپورت فیش که نباید نقش پروانهٔ بهره‌برداری را خراب کند)
      Db::run("INSERT INTO vehicle_drivers(vehicle_id,driver_id,role,shift,line_code_in_line)
        SELECT v.id, d.id, IF(d.national_id=COALESCE(v.beneficiary_national_id, v.owner_national_id),'beneficiary','helper'), ?, ?
        FROM vehicles v JOIN drivers d ON d.national_id=? WHERE v.plate=?
        ON DUPLICATE KEY UPDATE shift=COALESCE(VALUES(shift),shift), line_code_in_line=COALESCE(VALUES(line_code_in_line),line_code_in_line)",
        [$shift, $lcil, $nid, $plate]);
      return;
    }
    Db::run("INSERT INTO vehicle_drivers(vehicle_id,driver_id,role,shift,line_code_in_line)
      SELECT v.id, d.id, IF(d.national_id=COALESCE(v.beneficiary_national_id, v.owner_national_id),'beneficiary','helper'), ?, ?
      FROM vehicles v JOIN drivers d ON d.national_id=? WHERE v.plate=?
      ON DUPLICATE KEY UPDATE role=VALUES(role), shift=COALESCE(VALUES(shift),shift), line_code_in_line=COALESCE(VALUES(line_code_in_line),line_code_in_line)",
      [$shift, $lcil, $nid, $plate]);
  }
  private static function roleFromType($t){
    $t = trim((string)$t);
    // فایل پروانهٔ بهره‌برداری: «اصلی» = بهره‌بردار، «کمکی» = راننده کمکی
    if (mb_strpos($t,'اصلی')!==false || mb_strpos($t,'بهره')!==false) return 'beneficiary';
    if (mb_strpos($t,'کمک')!==false) return 'helper';
    return null;
  }

  public static function run($kind, $path, $rowsOverride = null, $rowOffset = 0) {
    @ini_set('memory_limit', '512M'); @set_time_limit(900);
    $pdo = Db::pdo();
    $ZW = "\u{200c}";
    $h = null; $imported = 0; $skipped = 0; $errors = [];
    $pdo->beginTransaction(); $sinceCommit = 0;
    $noHeader = ($kind === 'vehicles'); // فایل خودروها ممکن است سرستون داشته یا نداشته باشد
    $vehHeader = false;

    $handler = function($row, $i) use (&$h, &$imported, &$skipped, &$errors, &$sinceCommit, &$vehHeader, $kind, $ZW, $pdo, $noHeader) {
      if ($kind === 'vehicles' && $i === 0) {
        $vals = array_map(fn($x)=>trim((string)$x), $row);
        if (in_array('شماره پلاک', $vals, true) || (isset($row[0]) && trim((string)$row[0])==='ردیف')) {
          $h = []; foreach ($row as $idx=>$v) $h[trim((string)$v)] = $idx; $vehHeader = true; return;
        }
        $vehHeader = false; // ردیف اول داده است، نه سرستون
      }
      if (!$noHeader && $i === 0) { $h = []; foreach ($row as $idx=>$v) $h[trim($v)] = $idx; return; }
      if (!array_filter($row, fn($x)=>$x!=='' && $x!==null && $x!=='None')) return;
      try {
        if ($kind === 'lines') {
          // ستون واحد «خط» با قالب: کد - مبدأ - مقصد
          $raw = self::ga($row,$h,['خط','کد','کد خط','عنوان خط']) ?? (isset($row[0])?$row[0]:null);
          if ($raw===null || trim($raw)==='') { $skipped++; return; }
          $parts = preg_split('/\s*-\s*/u', trim($raw));
          $code = self::nidFreeCode($parts[0] ?? '');
          if ($code==='') { $skipped++; return; }
          $origin = $parts[1] ?? null; $dest = $parts[2] ?? null;
          Db::run("INSERT INTO `lines`(code,origin,destination,status) VALUES(?,?,?,'فعال')
                   ON DUPLICATE KEY UPDATE origin=VALUES(origin),destination=VALUES(destination)",
                  [$code, $origin, $dest]);
        }
        elseif ($kind === 'vehicles') {
          // اگر سرستون باشد با نام، وگرنه با موقعیت ستون (هر دو فایل ساختار یکسانی دارند)
          $vg = function($names,$pos) use ($row,$h,$vehHeader){ return $vehHeader ? self::ga($row,$h,$names) : (isset($row[$pos])?$row[$pos]:null); };
          $plate = self::val($vg(['شماره پلاک','پلاک','پلاک خودرو'],1)); if (!$plate) { $skipped++; return; }
          $opcode = $vg(['کد بهره'.$ZW.'برداری','کد بهره‌برداری','کد بهره برداری'],3);
          self::upsertVehicle($plate, [
            'vin'=>$vg(['شماره وین','وین'],2), 'engine'=>$vg(['شماره موتور'],9), 'chassis'=>$vg(['شماره بدنه'],10),
            'model_name'=>$vg(['نوع خودرو'],5), 'model_year'=>$vg(['مدل خودرو'],6),
            'color'=>$vg(['رنگ'],11), 'fuel'=>$vg(['سوخت'],12), 'capacity'=>$vg(['ظرفیت'],7),
            'operating_code'=>$opcode, 'ownership_type'=>$vg(['نوع مالکیت'],19),
            'owner_national_id'=>self::nid($vg(['کد/شناسه ملی مالک','کد ملی مالک'],20)),
            'insurance_expire'=>$vg(['اعتبار بیمه نامه','اعتبار بیمه'],26),
            'tech_inspection_expire'=>$vg(['اعتبار معاینه فنی','معاینه فنی'],30),
            'beneficiary_national_id'=>self::nid($vg(['کد ملی بهره'.$ZW.'بردار','کد ملی بهره‌بردار','کد ملی بهره بردار'],22)),
          ]);
          $ownerNid = self::nid($vg(['کد/شناسه ملی مالک','کد ملی مالک'],20));
          $benNid   = self::nid($vg(['کد ملی بهره'.$ZW.'بردار','کد ملی بهره‌بردار','کد ملی بهره بردار'],22));
          [$f,$l] = self::splitName($vg(['نام و نام خانوادگی بهره'.$ZW.'بردار','نام و نام خانوادگی بهره‌بردار','عنوان شخص/شرکت مالک'],23));
          if ($benNid) {
            self::upsertDriver($benNid, [
              'first_name'=>$f, 'last_name'=>$l, 'operating_code'=>$opcode, 'driver_type'=>'بهره‌بردار',
            ]);
            self::linkVehicleDriver($plate, $benNid);
          }
        }
        elseif ($kind === 'drivers') {
          // اطلاعات جامع: راننده + هر فیلد مرتبط (پروانه‌ها، تاریخ‌ها) + خودرو در صورت وجود پلاک
          $code = self::nid(self::ga($row,$h,['کد ملی','کدملی','شماره ملی'])); if (!$code) { $skipped++; return; }
          self::upsertDriver($code, [
            'first_name'=>self::ga($row,$h,['نام']), 'last_name'=>self::ga($row,$h,['نام خانوادگی','نام‌خانوادگی']),
            'father_name'=>self::ga($row,$h,['نام پدر']), 'mobile'=>self::ga($row,$h,['شماره تلفن همراه','تلفن همراه','موبایل','شماره همراه']),
            'smart_no'=>self::ga($row,$h,['شماره هوشمند']), 'gender'=>self::ga($row,$h,['جنسیت']),
            'driver_type'=>self::ga($row,$h,['نوع راننده','نوع فعالیت']),
            'operating_code'=>self::ga($row,$h,['کد بهره'.$ZW.'برداری','کد بهره‌برداری','کد بهره برداری']),
            'op_lic_status'=>self::ga($row,$h,['وضعیت پروانه بهره'.$ZW.'برداری','وضعیت بهره‌برداری']),
            'op_lic_expire'=>self::ga($row,$h,['تاریخ انقضای پروانه بهره'.$ZW.'برداری','انقضای بهره‌برداری','اعتبار پروانه بهره‌برداری']),
            'taxi_lic_status'=>self::ga($row,$h,['وضعیت پروانه تاکسیرانی','وضعیت تاکسیرانی']),
            'taxi_lic_expire'=>self::ga($row,$h,['تاریخ انقضای پروانه تاکسیرانی','انقضای تاکسیرانی','اعتبار پروانه تاکسیرانی']),
          ]);
          $plate = self::val(self::ga($row,$h,['پلاک','پلاک خودرو','شماره پلاک']));
          if ($plate) {
            self::upsertVehicle($plate, [
              'model_name'=>self::ga($row,$h,['مدل خودرو','مدل']), 'owner_national_id'=>$code,
              'tech_inspection_expire'=>self::ga($row,$h,['تاریخ انقضای معاینه فنی','معاینه فنی','اعتبار معاینه فنی']),
              'insurance_expire'=>self::ga($row,$h,['تاریخ انقضای بیمه شخص ثالث','بیمه شخص ثالث','اعتبار بیمه']),
              'line_text'=>self::ga($row,$h,['خط','نام خط','محل فعالیت']),
            ]);
            self::linkVehicleDriver($plate, $code, self::ga($row,$h,['شیفت','شیفت کاری']), null, null, true);
          }
        }
        elseif ($kind === 'oplic') {
          // فیلتر وضعیت و نوع پلاک: فقط ردیف‌های مجاز ایمپورت شوند
          // وضعیت‌های مجاز (پیش‌فرض: فعال، منقضی) و نوع پلاک (پیش‌فرض: تاکسی) از تنظیمات
          $status = trim((string)self::ga($row,$h,['وضعیت']));
          $plateType = trim((string)self::ga($row,$h,['نوع پلاک']));
          static $oplicStatuses = null; static $oplicPlateTypes = null;
          if ($oplicStatuses === null) {
            $rs = Db::one("SELECT value FROM app_settings WHERE `key`='oplic_import_statuses'");
            $oplicStatuses = $rs ? json_decode($rs['value'], true) : ['فعال','منقضی'];
            if (!is_array($oplicStatuses) || !$oplicStatuses) $oplicStatuses = ['فعال','منقضی'];
            $rp = Db::one("SELECT value FROM app_settings WHERE `key`='oplic_import_plate_types'");
            $oplicPlateTypes = $rp ? json_decode($rp['value'], true) : ['تاکسی'];
            if (!is_array($oplicPlateTypes) || !$oplicPlateTypes) $oplicPlateTypes = ['تاکسی'];
          }
          // رد کردن ردیف‌های با وضعیت غیرمجاز یا نوع پلاک غیرمجاز
          if ($status !== '' && !in_array($status, $oplicStatuses, true)) { $skipped++; return; }
          if ($plateType !== '' && !in_array($plateType, $oplicPlateTypes, true)) { $skipped++; return; }

          $code = self::nid(self::ga($row,$h,['کد ملی','کدملی'])); $plate = self::val(self::ga($row,$h,['پلاک خودرو','پلاک']));
          $op = self::ga($row,$h,['کد بهره'.$ZW.'برداری','کد بهره‌برداری','کد بهره برداری']);
          $dtype = self::ga($row,$h,['نوع راننده']);
          $lineTxt = self::ga($row,$h,['عنوان خط','کد خط','نام خط','خط']);
          $lineCode = self::ga($row,$h,['کد خط']);
          $lcil = self::ga($row,$h,['کد تاکسیران در خط','کد در خط','کد لاین در خط']);
          $shiftRaw = self::ga($row,$h,['شیفت کاری','شیفت']);
          // نرمال‌سازی شیفت: مقدار None/خالی → null
          $shift = ($shiftRaw === null || trim((string)$shiftRaw) === '' || trim((string)$shiftRaw) === 'None') ? null : trim((string)$shiftRaw);
          if ($code) self::upsertDriver($code, [
            'first_name'=>self::ga($row,$h,['نام']), 'last_name'=>self::ga($row,$h,['نام خانوادگی']),
            'mobile'=>self::ga($row,$h,['تلفن همراه']),
            'operating_code'=>$op, 'op_lic_issue'=>self::ga($row,$h,['تاریخ آغاز','تاریخ شروع']),
            'op_lic_expire'=>self::ga($row,$h,['تاریخ انقضا','انقضا','اعتبار']), 'op_lic_status'=>$status,
            'driver_type'=>$dtype,
          ]);
          if ($plate) {
            $role = self::roleFromType($dtype);
            self::upsertVehicle($plate, [
              'vin'=>self::ga($row,$h,['شماره وین خودرو','وین']), 'model_name'=>self::ga($row,$h,['نوع خودرو','مدل خودرو']),
              'model_year'=>self::ga($row,$h,['مدل خودرو']),
              'operating_code'=>$op,
              'line_text'=>$lineCode ?: $lineTxt,
            ] + ($role==='beneficiary' ? ['owner_national_id'=>$code, 'beneficiary_national_id'=>$code] : []));
            self::linkVehicleDriver($plate, $code, $shift, $lcil?(string)$lcil:null, $role, $role===null);
          }
        }
        elseif ($kind === 'taxilic') {
          $code = self::nid(self::ga($row,$h,['کد ملی','کدملی'])); if (!$code) { $skipped++; return; }
          self::upsertDriver($code, [
            'first_name'=>self::ga($row,$h,['نام']), 'last_name'=>self::ga($row,$h,['نام خانوادگی']),
            'smart_no'=>self::ga($row,$h,['شماره هوشمند']), 'mobile'=>self::ga($row,$h,['تلفن همراه']),
            'taxi_lic_issue'=>self::ga($row,$h,['تاریخ شروع','تاریخ آغاز']),
            'taxi_lic_expire'=>self::ga($row,$h,['تاریخ انقضا','انقضا','اعتبار']),
            'taxi_lic_status'=>self::ga($row,$h,['وضعیت']),
          ]);
        }
        elseif ($kind === 'bills') {
          // فیلتر کد بابت: فقط ردیف‌هایی با کد بابت مجاز ایمپورت شوند
          // کدهای مجاز از تنظیمات خوانده می‌شوند (پیش‌فرض: ۲۰، ۲۱، ۲۲ = آبونمان)
          $reasonCode = self::ga($row,$h,['کد بابت','کدبابت','reason_code']);
          static $allowedCodes = null;
          if ($allowedCodes === null) {
            $rc = Db::one("SELECT value FROM app_settings WHERE `key`='bill_import_reason_codes'");
            $allowedCodes = $rc ? json_decode($rc['value'], true) : [20, 21, 22];
            if (!is_array($allowedCodes) || !$allowedCodes) $allowedCodes = [20, 21, 22];
            $allowedCodes = array_map('intval', $allowedCodes);
          }
          // اگر کد بابت در فایل وجود دارد و مجاز نیست، رد کن
          if ($reasonCode !== null && $reasonCode !== '') {
            if (!in_array((int)$reasonCode, $allowedCodes, true)) { $skipped++; return; }
          }
          $amount = preg_replace('/\D/', '', (string) self::ga($row,$h,['مبلغ','مبلغ کل']));
          $nid = self::nid(self::ga($row,$h,['کد/شناسه ملی','کد ملی','کدملی','شناسه ملی']));
          $plate = self::val(self::ga($row,$h,['پلاک','پلاک خودرو']));
          $phone = self::ga($row,$h,['تلفن شخص/شرکت','تلفن همراه','موبایل','شماره همراه']);
          $op = self::ga($row,$h,['کد بهره'.$ZW.'برداری','کد بهره‌برداری']);
          $lineTxt = self::ga($row,$h,['خط','کد خط','نام خط']);
          $lcil = self::ga($row,$h,['کد تاکسیران در خط','کد در خط']);
          $billId = self::ga($row,$h,['شناسه قبض','شناسه بیل','شناسهٔ قبض','bill_id','شناسه_قبض']); if ($billId === '' || $billId === null) $billId = null;
          $payId = self::ga($row,$h,['شناسه پرداخت']);
          $statusVal = self::ga($row,$h,['وضعیت پرداخت','وضعیت']);
          $personTitle = self::ga($row,$h,['عنوان شخص/شرکت','عنوان شخص','نام']);
          // رد ردیف خالی: اگر هیچ‌کدام از فیلدهای کلیدی مقدار نداشته باشند، ردیف معتبر نیست (مثلاً ردیف هدر یا خالی)
          if ($billId === null && !$nid && !$plate && ($amount === '' || $amount === null) && !$payId && !$personTitle) {
            $skipped++; return;
          }
          // پیدا کردن driver_id و vehicle_id برای ثبت مستقیم در فیش
          $billDriverId = null; $billVehicleId = null;
          if ($nid) { $dd = Db::one("SELECT id FROM drivers WHERE national_id=?", [$nid]); if ($dd) $billDriverId = $dd['id']; }
          if ($plate) { $vv = Db::one("SELECT id FROM vehicles WHERE plate=?", [$plate]); if ($vv) $billVehicleId = $vv['id'];
            // اگر راننده از کد ملی پیدا نشد، از طریق پلاک بهره‌بردار را بیاب
            if (!$billDriverId && $vv) { $vd = Db::one("SELECT driver_id FROM vehicle_drivers WHERE vehicle_id=? ORDER BY (role='beneficiary') DESC LIMIT 1", [$vv['id']]); if ($vd) $billDriverId = $vd['driver_id']; }
          }
          // تاریخ صدور فیش = تاریخ تراکنش (همیشه پر است، حتی برای فیش‌های پرداخت‌نشده).
          // اگر تاریخ تراکنش نبود، از تاریخ پرداخت استفاده می‌شود.
          $issueDate = self::ga($row,$h,['تاریخ تراکنش','تاریخ صدور','تاریخ فیش']);
          if ($issueDate === '' || $issueDate === null) $issueDate = self::ga($row,$h,['تاریخ پرداخت']);
          // تاریخ پرداخت توسط راننده (فقط برای فیش‌های پرداخت‌شده پر است)
          $paidDate = self::ga($row,$h,['تاریخ پرداخت']);
          if ($paidDate === '') $paidDate = null;
          // INSERT با همهٔ ستون‌ها (با fallback اگر ستون‌های جدید نباشند)
          try {
            Db::run("INSERT INTO bills(bill_id,pay_id,status,reason,person_title,national_id,phone,amount,pay_date,paid_date,plate,operating_code,line_text,driver_id,vehicle_id)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON DUPLICATE KEY UPDATE pay_id=VALUES(pay_id),status=VALUES(status),reason=VALUES(reason),person_title=VALUES(person_title),national_id=VALUES(national_id),phone=VALUES(phone),amount=VALUES(amount),pay_date=VALUES(pay_date),paid_date=VALUES(paid_date),plate=VALUES(plate),operating_code=VALUES(operating_code),line_text=VALUES(line_text),driver_id=VALUES(driver_id),vehicle_id=VALUES(vehicle_id)",
              [$billId, self::ga($row,$h,['شناسه پرداخت']), self::ga($row,$h,['وضعیت پرداخت','وضعیت']),
               self::ga($row,$h,['بابت']), self::ga($row,$h,['عنوان شخص/شرکت']), $nid, $phone,
               $amount!==''?$amount:null, $issueDate, $paidDate, $plate, $op?:null, $lineTxt?:null, $billDriverId, $billVehicleId]);
          } catch (Throwable $e) {
            // fallback: نسخهٔ قدیمی بدون ستون‌های جدید (paid_date)
            try {
              Db::run("INSERT INTO bills(bill_id,pay_id,status,reason,person_title,national_id,phone,amount,pay_date,plate,operating_code,line_text,driver_id,vehicle_id)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE pay_id=VALUES(pay_id),status=VALUES(status),reason=VALUES(reason),person_title=VALUES(person_title),national_id=VALUES(national_id),phone=VALUES(phone),amount=VALUES(amount),pay_date=VALUES(pay_date),plate=VALUES(plate),operating_code=VALUES(operating_code),line_text=VALUES(line_text),driver_id=VALUES(driver_id),vehicle_id=VALUES(vehicle_id)",
                [$billId, self::ga($row,$h,['شناسه پرداخت']), self::ga($row,$h,['وضعیت پرداخت','وضعیت']),
                 self::ga($row,$h,['بابت']), self::ga($row,$h,['عنوان شخص/شرکت']), $nid, $phone,
                 $amount!==''?$amount:null, $issueDate, $plate, $op?:null, $lineTxt?:null, $billDriverId, $billVehicleId]);
            } catch (Throwable $e2) {
              // fallback نهایی: حداقل ستون‌ها
              Db::run("INSERT INTO bills(bill_id,pay_id,status,reason,person_title,national_id,phone,amount,pay_date,plate)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE pay_id=VALUES(pay_id),status=VALUES(status),reason=VALUES(reason),person_title=VALUES(person_title),national_id=VALUES(national_id),phone=VALUES(phone),amount=VALUES(amount),pay_date=VALUES(pay_date),plate=VALUES(plate)",
                [$billId, self::ga($row,$h,['شناسه پرداخت']), self::ga($row,$h,['وضعیت پرداخت','وضعیت']),
                 self::ga($row,$h,['بابت']), self::ga($row,$h,['عنوان شخص/شرکت']), $nid, $phone,
                 $amount!==''?$amount:null, $issueDate, $plate]);
            }
          }
          // بروزرسانی متقابل از ستون‌های موجود در فایل فیش
          if ($nid) self::upsertDriver($nid, [
            'mobile'=>$phone, 'operating_code'=>$op,
            'taxi_lic_expire'=>self::ga($row,$h,['اعتبار پروانه تاکسیرانی','انقضای تاکسیرانی']),
            'op_lic_expire'=>self::ga($row,$h,['اعتبار پروانه بهره'.$ZW.'برداری','اعتبار پروانه بهره‌برداری','انقضای بهره‌برداری']),
          ]);
          if ($plate) { self::upsertVehicle($plate, ['owner_national_id'=>$nid, 'operating_code'=>$op, 'line_text'=>$lineTxt]); if ($nid) self::linkVehicleDriver($plate,$nid,null,$lcil?(string)$lcil:null,null,true); }
        }
        else throw new Exception('نوع نامعتبر');
        $imported++;
      } catch (Throwable $e) {
        $skipped++;
        if (count($errors) < 5) $errors[] = "ردیف " . ($i+1) . ": " . $e->getMessage();
      }
      if (++$sinceCommit >= 400) { $pdo->commit(); $pdo->beginTransaction(); $sinceCommit = 0; }
    };

    try {
      if (is_array($rowsOverride)) {
        // حالت قطعه‌قطعه: ردیف‌ها از مرورگر به‌صورت آرایه آمده‌اند
        foreach ($rowsOverride as $ri => $cells) { $handler($cells, (int)$ri + $rowOffset); }
      } else {
        Xlsx::eachRow($path, $handler);
      }
      if ($pdo->inTransaction()) $pdo->commit();
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
    return ['imported'=>$imported, 'skipped'=>$skipped, 'errors'=>$errors];
  }
  // ورود قطعه‌قطعه: آرایه‌ای از ردیف‌ها (هر ردیف آرایه‌ای از سلول‌ها) + شمارهٔ شروع
  // rowOffset برای حفظ منطق سرستون: قطعهٔ اول با offset=0 (شامل سرستون)، قطعات بعدی با offset>0
  public static function runRows($kind, array $rows, $rowOffset = 0) {
    return self::run($kind, null, $rows, $rowOffset);
  }
  private static function nidFreeCode($s){ $s=trim((string)$s); return preg_replace('/\s+/u','',$s); }
}
