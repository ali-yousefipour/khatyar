<?php
/**
 * Work contract templates, immutable per-person snapshots, and Word exports.
 * Route handlers are registered only in the authenticated API dispatcher.
 */
final class WorkContracts {
  private static function db(): PDO { return Db::pdo(); }
  public static function setup(): void {
    static $ready=false;
    if($ready)return;
    try {
    Db::run("CREATE TABLE IF NOT EXISTS work_contract_templates (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(180) NOT NULL, kind VARCHAR(12) NOT NULL,
      body_html LONGTEXT NULL, docx_blob LONGBLOB NULL, is_default TINYINT NOT NULL DEFAULT 0,
      created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS work_contracts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, template_id INT NOT NULL, user_id INT NOT NULL,
      start_date CHAR(10) NOT NULL, end_date CHAR(10) NOT NULL, duration_label VARCHAR(100) NOT NULL,
      snapshot_json LONGTEXT NOT NULL, body_html LONGTEXT NOT NULL,
      docx_blob LONGBLOB NULL, created_by INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY ix_contract_user (user_id,id),KEY ix_contract_template (template_id,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $r=Db::one("SELECT id FROM work_contract_templates WHERE name=? LIMIT 1",['قرارداد پیش‌فرض شرکت سعید توس عدل']);
    if(!$r) Db::run("INSERT INTO work_contract_templates(name,kind,body_html,is_default) VALUES(?,?,?,1)",
      ['قرارداد پیش‌فرض شرکت سعید توس عدل','html',self::defaultHtml()]);
    Db::run("CREATE TABLE IF NOT EXISTS work_contract_audit (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,contract_id BIGINT NOT NULL,actor_id INT NOT NULL,
      action VARCHAR(20) NOT NULL,before_json LONGTEXT NULL,after_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY idx_audit_contract(contract_id,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $deletedColumn=Db::one("SELECT COUNT(*) n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='work_contracts' AND COLUMN_NAME='deleted_at'");
    if((int)($deletedColumn['n']??0)===0)
      Db::run("ALTER TABLE work_contracts ADD COLUMN deleted_at DATETIME NULL");
    $ready=true;
    } catch(Throwable $error) {
      error_log('work contracts database initialization: '.get_class($error).': '.$error->getMessage());
      Http::error('پایگاه داده قراردادهای کاری آماده نیست. لازم است جدول‌های قرارداد در سرور ایجاد و مجوز پایگاه داده بررسی شود.',503);
    }
  }
  public static function defaultHtml(): string {
    return <<<'HTML'
<div class="wc-paper" dir="rtl">
<h1>قرارداد کار</h1>
<h3>۱) مشخصات طرفین</h3>
<p><b>کارفرما / نماینده کارفرما:</b> شرکت سعید توس عدل دارای شماره ثبت 12543 به نشانی مشهد مقدس، خیابان امام خمینی 28، برج مرمر، طبقه 9، واحد 4، تلفن 05138585242-05138537649</p>
<p><b>کارگر:</b> خانم/آقا: {{full_name}} ـ فرزند: {{father_name}} ـ متولد: {{birth_date}} ـ شماره شناسنامه: {{identity_number}} ـ شماره ملی: {{national_code}} ـ نشانی: {{address}} ـ تلفن تماس: {{mobile}}</p>
<h3>۲) نوع قرارداد: موقت</h3>
<p><b>۳) عنوان شغل:</b> {{role_title}}</p>
<p>تبصره: تغییر جایگاه شغلی کارگر بر حسب مورد نیاز و توانایی کارگر از اختیارات کارفرما می باشد.</p>
<p><b>۴) محل انجام کار:</b> خطوط تاکسیرانی مشهد مقدس</p>
<p><b>۵) مدت قرارداد:</b> از تاریخ {{start_date}} لغایت {{end_date}} (مدت: {{duration_label}}) تعیین می گردد.</p>
<p>پس از اتمام مدت قرارداد در صورت نیاز، قرارداد با توافق طرفین قابل تمدید خواهد بود و در غیر اینصورت رابطه کاری طرف دوم کاملا قطع شده و طرف دوم حق هرگونه اعتراض و شکایت را از خود سلب و ساقط نمود.</p>
<p><b>۱/۵) ساعت کار:</b> طرف دوم موظف است در مقابل حق السعی دریافتی به طور منظم و مطابق با برنامه زمان بندی کارفرما در هفته 44 ساعت انجام وظیفه نماید. در صورت ارجاع کار اضافی در ایام تعطیل و غیر تعطیل نسبت به پرداخت اضافه کار وفق مقررات اقدام می گردد. بدیهی است در صورت عدم انجام واگذاری به هر دلیل کارفرما مجاز به فسخ قرارداد می باشد و کارگر حق هرگونه اعتراض را از خود سلب و ساقط می نماید.</p>
<p><b>۶) شرح قرارداد:</b> این قرارداد به استناد ماده 10 قانون کار فی مابین شرکت سعید توس عدل به نمایندگی فاطمه ساعدی به عنوان کارفرما و نیروی فوق به عنوان طرف دوم قرارداد می باشد.</p>
<p>چنانچه کار مشابه در جای دیگر به کارگر ارجاع شود بدون هیچگونه عذری آن را انجام خواهد داد. نوع کار و محل کار به کارگر اعلام شده و عدم قبول به منزله ترک کار و فسخ قرارداد می باشد.</p>
<p>کارفرما هیچگونه تعهدی در قبال سرویس ایاب ذهاب ندارد.</p>
<p>سایر مواردی که در این قرارداد پیش‌بینی نشده است تابع قانون کار و سازمان تامین اجتماعی و مقررات تبعی آنهاست.</p>
<div class="wc-sign"><span>محل امضای کارگر</span><span>محل امضای کارفرما</span></div>
<div class="wc-page-break"></div>
<h3>۷) حق السعی</h3>
<p>الف) مزد مبنا 5،541،849 ریال</p>
<p>ب) حق مسکن: 30.000.000 ریال</p>
<p>ج) بن کارگری: 22.000.000 ریال</p>
<p>د) حق اولاد: 16.625.548 ریال</p>
<p><b>۸) حقوق و مزایای کارگر:</b> به صورت ماهانه به حساب شماره {{bank_account}} نزد بانک شهر توسط کارفرما یا نماینده وی پرداخت می گردد.</p>
<p><b>۹) بیمه:</b> به موجب ماده 148 قانون کار، کارفرما مکلف است کارگر را نزد سازمان تامین اجتماعی بیمه نماید.</p>
<p><b>۱۰) عیدی و پاداش سالانه:</b> به موجب ماده واحده قانون مربوط به تعیین عیدی و پاداش سالانه کارگران شاغل در کارگاه‌های مشمول قانون کار مصوب 06/12/1370 مجلس شورای اسلامی، به ازای یک سال کار معادل شصت روز مزد مبنا (تا سقف نود روز حداقل مزد روزانه قانونی کارگران) به عنوان عیدی و پاداش سالانه به کارگر پرداخت می شود. برای کمتر از یک سال میزان عیدی و پاداش و سقف مربوطه، به نسبت کارکرد محاسبه خواهد شد.</p>
<p><b>۱۱) حق سنوات یا مزایای پایان کار:</b> به هنگام فسخ یا خاتمه قرارداد کار حق سنوات مطابق قانون به کارگر پرداخت می شود.</p>
<h3>۱۲) شرایط فسخ قرارداد</h3>
<p>فسخ قرارداد 3 روز قبل به طرف مقابل کتبا اعلام می شود.</p>
<p>غیبت متوالی به مدت 3 روز در هفته یا 7 روز متناوب در ماه و همچنین تاخیر و تعجیل در ورود و خروج از کارگاه جمعا به مدت 10 ساعت در ماه موجب فسخ قرارداد می باشد.</p>
<p>رد صلاحیت از طریق مراجع ذی صلاح و حراست سازمان مدیریت و نظارت بر تاکسیرانی شهرداری مشهد، ارتکاب اعمال خلاف قانون که موجب تعقیب از طریق مراجع قضایی و غیر قضایی گردد.</p>
<p>اعتیاد به هرگونه مواد مخدر گیاهی و صنعتی و ... در صورت ارائه گزارش بازرسین یا با تایید مراجع ذی صلاح.</p>
<p>تعدیل نیرو یا عدم نیاز به ادامه خدمت کارگر ناشی از تقلیل فعالیت کارگاه و تغییر ساختار و همچنین عدم وجود تفاهم بین کارگر و کارفرما و لزوم حفظ نظم محل کار به تشخیص کارفرما.</p>
<div class="wc-sign"><span>محل امضای کارگر</span><span>محل امضای کارفرما</span></div>
</div>
HTML;
  }
  private static function fields(): array {
    $rows=Db::all("SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users'");
    return array_fill_keys(array_column($rows,'name'),true);
  }
  private static function userSnapshot(int $id): array {
    $columns=self::fields();
    $wanted=['id','first_name','last_name','father_name','birth_date','identity_number','id_number',
      'national_code','national_id','address','home_address','mobile','phone','mobile_number',
      'bank_account','account_number','bank_account_number','shaba','gender'];
    $available=array_values(array_filter($wanted,fn($f)=>isset($columns[$f])));
    if(!$available) throw new RuntimeException('ستون مشخصات کاربران یافت نشد');
    // Fully qualify user columns to avoid ambiguous id.
    $sql='SELECT '.implode(',',array_map(fn($f)=>'u.`'.$f.'`',$available)).',r.title AS role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.is_active=1';
    $u=Db::one($sql,[$id]);
    if(!$u) Http::error('نیروی انتخاب‌شده فعال نیست یا وجود ندارد',422);
    $first=function(array $keys)use($u):string{foreach($keys as $k)if(!empty($u[$k]))return trim((string)$u[$k]);return '';};
    // Account information is normally stored in the configurable personnel
    // fields, not in the users table. Read the exact selected employee's values.
    $custom=[];
    foreach(Db::all("SELECT f.fkey,f.label,v.value FROM custom_field_values v
      JOIN custom_fields f ON f.id=v.field_id
      WHERE v.user_id=? AND f.is_active=1",[$id]) as $field){
      $key=mb_strtolower(trim((string)($field['fkey']??'')),'UTF-8');
      $label=trim((string)($field['label']??''));
      $value=trim((string)($field['value']??''));
      if($value==='')continue;
      if(in_array($key,['bank_account','account_number','bank_account_number','account','bankaccount','hesab','shomare_hesab'],true)
        || in_array($label,['شماره حساب','شماره حساب بانکی','حساب بانکی','شماره حساب بانک شهر'],true))
        $custom['bank_account']=$value;
      if(in_array($key,['father_name','father','fathername','name_father','pedar','name_pedar'],true)
        || in_array($label,['نام پدر','نام پدر پرسنل','نام پدر کاربر','نام پدر کارمند'],true))
        $custom['father_name']=$value;
      if(in_array($key,['identity_number','id_number','birth_certificate_number','shenasnameh','shomare_shenasnameh','shenaseh'],true)
        || in_array($label,['شماره شناسنامه','شماره شناسنامه پرسنل','شماره شناسنامه کاربر'],true))
        $custom['identity_number']=$value;
      if(in_array($key,['shaba','iban','sheba'],true)||in_array($label,['شماره شبا','شبا'],true))
        $custom['shaba']=$value;
    }
    return [
      'user_id'=>$id,'full_name'=>trim(($u['first_name']??'').' '.($u['last_name']??'')),
      'first_name'=>$u['first_name']??'','last_name'=>$u['last_name']??'',
      'father_name'=>$first(['father_name']) ?: ($custom['father_name']??''),'birth_date'=>$first(['birth_date']),
      'identity_number'=>$first(['identity_number','id_number']) ?: ($custom['identity_number']??''),
      'national_code'=>$first(['national_code','national_id']),
      'address'=>$first(['address','home_address']),
      'mobile'=>$first(['mobile','mobile_number','phone']),
      'role_title'=>$u['role_title']??'',
      'bank_account'=>$first(['bank_account','account_number','bank_account_number']) ?: ($custom['bank_account']??''),
      'shaba'=>$first(['shaba']) ?: ($custom['shaba']??''),'gender'=>$first(['gender'])
    ];
  }
  private static function render(string $text,array $snapshot,bool $xml=false): string {
    $replacements=[];
    foreach($snapshot as $field=>$value) {
      $replacements['{{'.$field.'}}']=$xml?htmlspecialchars((string)$value,ENT_XML1|ENT_QUOTES,'UTF-8'):htmlspecialchars((string)$value,ENT_QUOTES,'UTF-8');
    }
    return strtr($text,$replacements);
  }
  private static function docxReplace(string $binary,array $values): string {
    if(!class_exists('ZipArchive')||!class_exists('DOMDocument'))throw new RuntimeException('افزونه‌های ZIP و XML برای پردازش Word در سرور لازم هستند');
    $temp=tempnam(sys_get_temp_dir(),'wct');file_put_contents($temp,$binary);
    $zip=new ZipArchive();
    if($zip->open($temp)!==true){unlink($temp);throw new RuntimeException('فایل Word معتبر نیست');}
    $xml=$zip->getFromName('word/document.xml');
    if($xml===false){$zip->close();unlink($temp);throw new RuntimeException('ساختار فایل Word معتبر نیست');}
    // Word frequently splits a single {{field}} token over several <w:t> runs.
    // Match across run boundaries while keeping all paragraph/run formatting.
    $doc=new DOMDocument('1.0','UTF-8');
    if(!$doc->loadXML($xml,LIBXML_NONET|LIBXML_COMPACT)){
      $zip->close();unlink($temp);throw new RuntimeException('XML قالب Word معتبر نیست');
    }
    $xpath=new DOMXPath($doc);
    $xpath->registerNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main');
    foreach($xpath->query('//w:p') as $para){
      $nodes=[];$full='';
      foreach($xpath->query('.//w:t',$para) as $node){$nodes[]=$node;$full.=$node->nodeValue;}
      if(!$nodes||strpos($full,'{{')===false)continue;
      preg_match_all('/\\{\\{([a-z_]+)\\}\\}/u',$full,$matches,PREG_OFFSET_CAPTURE);
      $originals=array_map(static fn($n)=>$n->nodeValue,$nodes);
      $starts=[];$offset=0;
      foreach($originals as $t){$starts[]=$offset;$offset+=mb_strlen($t,'UTF-8');}
      for($m=count($matches[0])-1;$m>=0;$m--){
        $token=$matches[0][$m][0];$key=$matches[1][$m][0];
        if(!array_key_exists($key,$values))continue;
        $begin=mb_strlen(substr($full,0,$matches[0][$m][1]),'UTF-8');
        $finish=$begin+mb_strlen($token,'UTF-8');
        $first=null;$last=null;
        foreach($originals as $i=>$value){
          $lo=$starts[$i];$hi=$lo+mb_strlen($value,'UTF-8');
          if($first===null&&$begin<$hi)$first=$i;
          if($finish>$lo&&$finish<=$hi){$last=$i;break;}
        }
        if($first===null||$last===null)continue;
        $replacement=(string)$values[$key];
        $left=mb_substr($nodes[$first]->nodeValue,0,$begin-$starts[$first],'UTF-8');
        $right=mb_substr($nodes[$last]->nodeValue,$finish-$starts[$last],null,'UTF-8');
        if($first===$last){$nodes[$first]->nodeValue=$left.$replacement.$right;continue;}
        $nodes[$first]->nodeValue=$left.$replacement;
        for($j=$first+1;$j<$last;$j++)$nodes[$j]->nodeValue='';
        $nodes[$last]->nodeValue=$right;
      }
    }
    $xml=$doc->saveXML();
    $zip->deleteName('word/document.xml');$zip->addFromString('word/document.xml',$xml);
    $zip->close();$out=file_get_contents($temp);unlink($temp);return $out;
  }
  private static function docxHtml(string $binary): string {
    if(!class_exists('ZipArchive')||!class_exists('DOMDocument'))
      throw new RuntimeException('افزونه‌های پردازش Word در سرور نصب نیستند');
    $temp=tempnam(sys_get_temp_dir(),'wch');
    file_put_contents($temp,$binary);
    $zip=new ZipArchive();
    if($zip->open($temp)!==true){@unlink($temp);throw new RuntimeException('قالب Word معتبر نیست');}
    try{
      $xml=$zip->getFromName('word/document.xml');
      if($xml===false)throw new RuntimeException('متن فایل Word پیدا نشد');
      $dom=new DOMDocument('1.0','UTF-8');
      if(!@$dom->loadXML($xml,LIBXML_NONET|LIBXML_COMPACT))
        throw new RuntimeException('ساختار Word نامعتبر است');
      $xp=new DOMXPath($dom);
      $w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      $rns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
      $xp->registerNamespace('w',$w);
      $xp->registerNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main');
      $xp->registerNamespace('wp','http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing');
      $rels=[];
      $relXml=$zip->getFromName('word/_rels/document.xml.rels');
      if($relXml!==false){
        $rd=new DOMDocument();
        if(@$rd->loadXML($relXml,LIBXML_NONET|LIBXML_COMPACT)){
          foreach($rd->getElementsByTagNameNS('http://schemas.openxmlformats.org/package/2006/relationships','Relationship') as $rel){
            if($rel->getAttribute('TargetMode')==='External')continue;
            $target=str_replace('\\','/',$rel->getAttribute('Target'));
            if(!preg_match('~(?:^|/)media/([^/]+\.(?:png|jpe?g|gif|webp))$~i',$target,$m))continue;
            $rels[$rel->getAttribute('Id')]='word/media/'.$m[1];
          }
        }
      }
      $html='<div class="wc-paper wc-word" dir="rtl">';
      $page2=false;
      foreach($xp->query('//w:body/w:p') as $p){
        $raw='';$rich='';$images=[];
        foreach($xp->query('.//w:r',$p) as $run){
          $text='';
          foreach($xp->query('./w:t|./w:tab|./w:br',$run) as $node){
            if($node->localName==='t')$text.=$node->textContent;
            elseif($node->localName==='tab')$text.=' ';
            elseif($node->localName==='br')$text.="\n";
          }
          if($text!==''){
            $raw.=$text;
            $escaped=htmlspecialchars($text,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
            $bold=$xp->query('./w:rPr/w:b[not(@w:val="0" or @w:val="false")]', $run)->length>0;
            $font=$xp->query('./w:rPr/w:rFonts',$run)->item(0);
            $size=$xp->query('./w:rPr/w:szCs|./w:rPr/w:sz',$run)->item(0);
            $fontName=$font?($font->getAttributeNS($w,'cs')?:$font->getAttributeNS($w,'ascii')):'';
            $runCss='';
            // Respect genuine DOCX typeface/size when the browser has it installed.
            if($fontName!=='' && preg_match('/^[\p{L}\p{N} ._-]{1,45}$/u',$fontName))
              $runCss.='font-family:&quot;'.htmlspecialchars($fontName,ENT_QUOTES,'UTF-8').'&quot;,Tahoma,sans-serif;';
            if($size){
              $n=(int)$size->getAttributeNS($w,'val');
              if($n>=16&&$n<=34)$runCss.='font-size:'.($n/2).'pt;';
            }
            if($bold)$runCss.='font-weight:700;';
            $rich.='<span'.($runCss?' style="'.$runCss.'"':'').'>'.$escaped.'</span>';
          }
          foreach($xp->query('.//a:blip',$run) as $blip){
            $rid=$blip->getAttributeNS($rns,'embed');
            $path=$rels[$rid]??'';
            if(!$path)continue;
            $bytes=$zip->getFromName($path);
            if($bytes===false||strlen($bytes)>1500000)continue;
            $extension=strtolower(pathinfo($path,PATHINFO_EXTENSION));
            $mime=($extension==='jpg'||$extension==='jpeg')?'image/jpeg':
                  ($extension==='png'?'image/png':($extension==='gif'?'image/gif':'image/webp'));
            $extent=$xp->query('.//wp:extent',$run)->item(0);
            $width=$extent?(int)round((float)$extent->getAttribute('cx')/914400*96):100;
            $width=max(40,min(150,$width));
            $images[]='<img class="wc-template-logo" alt="" width="'.$width.'" src="data:'.$mime.';base64,'.base64_encode($bytes).'">';
          }
        }
        if($images){
          // The supplied original Word contract places its two logos in the
          // first paragraph, before the title. Preserve them inside the PDF.
          $html.='<div class="wc-logo-row">'.implode('',$images).'</div>';
        }
        if(trim($raw)==='')continue;
        $raw=str_replace(["\r\n","\r","\\n"],"\n",$raw);
        $rich=str_replace(["\r\n","\r","\\n"],"\n",$rich);
        $segments=explode("\n",$raw);
        $canUseRich=count($segments)===1;
        foreach($segments as $segment){
          $plain=trim($segment);
          if($plain==='')continue;
          $content=$canUseRich?$rich:htmlspecialchars($plain,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
          if(!$page2 && preg_match('/^(?:۷|7)\s*[)\-.،:]?\s*حق\s*السعی/u',$plain)){
            $html.='<div class="wc-page-break"></div>';$page2=true;
          }
          if(preg_match('/^قرارداد\s*کار$/u',$plain)){
            $html.='<h1>'.$content.'</h1>';
          }elseif(mb_strlen($plain,'UTF-8')<=68 &&
                   preg_match('~^[۰-۹0-9]+(?:/[۰-۹0-9]+)?\s*[)\-.،:]\s*~u',$plain)){
            $html.='<h3>'.$content.'</h3>';
          }elseif(preg_match('~^([۰-۹0-9]+(?:/[۰-۹0-9]+)?\s*[)\-.،:]\s*[^:：]{1,45}[:：])\s*(.+)$~u',$plain,$parts)){
            // Make only the article heading bold, not its entire long paragraph.
            $html.='<p class="wc-clause"><strong>'.
              htmlspecialchars($parts[1],ENT_QUOTES,'UTF-8').'</strong> '.
              htmlspecialchars($parts[2],ENT_QUOTES,'UTF-8').'</p>';
          }else{
            $html.='<p>'.$content.'</p>';
          }
        }
      }
      return $html.'</div>';
    }finally{
      $zip->close();@unlink($temp);
    }
  }
  private static function renderContract(array $tpl,array $snapshot): array {
    if(($tpl['kind']??'html')==='docx'){
      $word=self::docxReplace((string)$tpl['docx_blob'],$snapshot);
      return [self::docxHtml($word),$word];
    }
    return [self::render((string)($tpl['body_html']??''),$snapshot),null];
  }
  private static function datesAndDuration(array $body): array {
    require_once __DIR__.'/IranCalendar.php';
    $start=str_replace('/','-',trim((string)($body['start_date']??'')));
    $end=str_replace('/','-',trim((string)($body['end_date']??'')));
    foreach([$start,$end] as $date){
      if(!preg_match('/^1[34]\\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/',$date))
        Http::error('تاریخ قرارداد باید شمسی و معتبر باشد',422);
      [$y,$m,$d]=array_map('intval',explode('-',$date));
      if($d>IranCalendar::monthLength($y,$m))Http::error('روز واردشده معتبر نیست',422);
    }
    if(strcmp($start,$end)>0)Http::error('تاریخ پایان قبل از شروع قرارداد است',422);
    $duration=trim((string)($body['duration_label']??''));
    if(!$duration||mb_strlen($duration)>100)Http::error('مدت قرارداد معتبر نیست',422);
    return [$start,$end,$duration];
  }
  public static function register(): void {
    route('GET','/api/admin/work-contracts/bootstrap',static function($p,$b,$actor){
      self::setup();
      $templates=Db::all('SELECT id,name,kind,is_default,created_at FROM work_contract_templates ORDER BY is_default DESC,id DESC');
      $users=Db::all("SELECT u.id,u.first_name,u.last_name,r.title AS role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY u.last_name,u.first_name");
      return ['ok'=>true,'templates'=>$templates,'users'=>$users];
    },false,3);
    route('POST','/api/admin/work-contracts/templates',static function($p,$b,$actor){
      self::setup();
      $name=trim((string)($b['name']??$_POST['name']??''));
      if(mb_strlen($name)<3||mb_strlen($name)>180)Http::error('نام قالب معتبر نیست',422);
      $f=$_FILES['file']??null;
      if(!$f||$f['error']!==UPLOAD_ERR_OK)Http::error('فایل Word را انتخاب کنید',422);
      if((int)$f['size']>5*1024*1024||strtolower(pathinfo($f['name'],PATHINFO_EXTENSION))!=='docx')
        Http::error('فقط فایل Word با پسوند docx تا پنج مگابایت مجاز است',422);
      $blob=file_get_contents($f['tmp_name']);if(substr($blob,0,2)!=='PK')Http::error('فرمت فایل Word معتبر نیست',422);
      if(!class_exists('ZipArchive')||!class_exists('DOMDocument'))
        Http::error('افزونه‌های ZIP و XML در سرور فعال نیستند؛ بارگذاری Word امکان‌پذیر نیست',503);
      $z=new ZipArchive();if($z->open($f['tmp_name'])!==true||$z->locateName('word/document.xml')===false)
        Http::error('فایل Word ساختار معتبر ندارد',422);
      $z->close();
      Db::run("INSERT INTO work_contract_templates(name,kind,docx_blob,created_by) VALUES(?,'docx',?,?)",[$name,$blob,(int)$actor['id']]);
      return ['ok'=>true,'id'=>(int)self::db()->lastInsertId()];
    },false,3);
    route('POST','/api/admin/work-contracts/generate',static function($p,$b,$actor){
      self::setup();
      $ids=$b['user_ids']??[];$ids=is_array($ids)?array_values(array_unique(array_map('intval',$ids))):[];
      if(!$ids||count($ids)>150||min($ids)<=0)Http::error('بین یک تا ۱۵۰ نیروی معتبر انتخاب کنید',422);
      $start=str_replace('/','-',trim((string)($b['start_date']??'')));
      $end=str_replace('/','-',trim((string)($b['end_date']??'')));
      foreach([$start,$end] as $date)if(!preg_match('/^1[34]\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/',$date))
        Http::error('تاریخ شروع و پایان باید شمسی و معتبر باشند',422);
      require_once __DIR__.'/IranCalendar.php';
      foreach([$start,$end] as $date){
        [$year,$month,$day]=array_map('intval',explode('-',$date));
        if($day>IranCalendar::monthLength($year,$month))
          Http::error('روز واردشده در تقویم شمسی معتبر نیست',422);
      }
      if(strcmp($end,$start)<0)Http::error('تاریخ پایان قبل از شروع است',422);
      $duration=trim((string)($b['duration_label']??''));
      if($duration===''||mb_strlen($duration)>100)Http::error('مدت قرارداد را مشخص کنید',422);
      $tid=(int)($b['template_id']??0);
      $tpl=Db::one('SELECT * FROM work_contract_templates WHERE id=?',[$tid]);
      if(!$tpl)Http::error('قالب قرارداد وجود ندارد',404);
      $pdo=self::db();$pdo->beginTransaction();$created=[];
      try{
        foreach($ids as $uid){
          $snapshot=self::userSnapshot($uid);
          $snapshot['start_date']=$start;$snapshot['end_date']=$end;$snapshot['duration_label']=$duration;
          // Missing personnel data remains blank; never invent legal identifiers.
          $missing=[];
          foreach(['national_code'=>'کد ملی','father_name'=>'نام پدر','birth_date'=>'تاریخ تولد',
                   'identity_number'=>'شماره شناسنامه','address'=>'نشانی','mobile'=>'تلفن تماس',
                   'bank_account'=>'شماره حساب'] as $field=>$label)
            if(trim((string)($snapshot[$field]??''))==='')$missing[]=$label;
          [$rendered,$word]=self::renderContract($tpl,$snapshot);
          Db::run('INSERT INTO work_contracts(template_id,user_id,start_date,end_date,duration_label,snapshot_json,body_html,docx_blob,created_by) VALUES(?,?,?,?,?,?,?,?,?)',
            [$tid,$uid,$start,$end,$duration,json_encode($snapshot,JSON_UNESCAPED_UNICODE),$rendered,$word,(int)$actor['id']]);
          $created[]=['id'=>(int)$pdo->lastInsertId(),'user_id'=>$uid,'name'=>$snapshot['full_name'],'missing'=>$missing];
        }
        $pdo->commit();
      }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
      return ['ok'=>true,'contracts'=>$created];
    },false,3);
    route('GET','/api/admin/work-contracts/history',static function($p,$b,$actor){
      self::setup();
      $rows=Db::all("SELECT c.id,c.user_id,c.start_date,c.end_date,c.duration_label,c.created_at,
      u.first_name,u.last_name,t.name template_name,t.kind
      FROM work_contracts c JOIN users u ON u.id=c.user_id
      JOIN work_contract_templates t ON t.id=c.template_id WHERE c.deleted_at IS NULL ORDER BY c.id DESC LIMIT 300");
      return ['ok'=>true,'rows'=>$rows];
    },false,3);
    route('GET','/api/admin/work-contracts/{id}',static function($p,$b,$actor){
      self::setup();
      $row=Db::one("SELECT id,user_id,template_id,start_date,end_date,duration_label,snapshot_json
        FROM work_contracts WHERE id=? AND deleted_at IS NULL",[(int)$p['id']]);
      if(!$row)Http::error('قرارداد یافت نشد',404);
      $row['snapshot']=json_decode((string)$row['snapshot_json'],true)?:[];
      unset($row['snapshot_json']);
      return ['ok'=>true,'contract'=>$row];
    },false,3);
    route('PUT','/api/admin/work-contracts/{id}',static function($p,$b,$actor){
      self::setup();
      $id=(int)$p['id'];
      $old=Db::one('SELECT * FROM work_contracts WHERE id=? AND deleted_at IS NULL',[$id]);
      if(!$old)Http::error('قرارداد یافت نشد',404);
      [$start,$end,$duration]=self::datesAndDuration($b);
      $snap=json_decode((string)$old['snapshot_json'],true);
      if(!is_array($snap))Http::error('اطلاعات اولیه قرارداد نامعتبر است',422);
      $editable=['full_name','father_name','birth_date','identity_number','national_code',
        'address','mobile','role_title','bank_account','shaba'];
      foreach($editable as $field) {
        if(!array_key_exists($field,$b))continue;
        $value=trim((string)$b[$field]);
        if(mb_strlen($value)>400)Http::error('طول اطلاعات قرارداد بیش از حد مجاز است',422);
        $snap[$field]=$value;
      }
      $snap['start_date']=$start;$snap['end_date']=$end;$snap['duration_label']=$duration;
      $templateId=(int)($b['template_id']??$old['template_id']);
      $template=Db::one('SELECT * FROM work_contract_templates WHERE id=?',[$templateId]);
      if(!$template)Http::error('قالب قرارداد یافت نشد',404);
      [$body,$word]=self::renderContract($template,$snap);
      $pdo=self::db();$pdo->beginTransaction();
      try{
        Db::run('UPDATE work_contracts SET template_id=?,start_date=?,end_date=?,duration_label=?,snapshot_json=?,body_html=?,docx_blob=? WHERE id=? AND deleted_at IS NULL',
          [$templateId,$start,$end,$duration,json_encode($snap,JSON_UNESCAPED_UNICODE),$body,$word,$id]);
        Db::run("INSERT INTO work_contract_audit(contract_id,actor_id,action,before_json,after_json) VALUES(?,?,?,?,?)",
          [$id,(int)$actor['id'],'updated',json_encode(['snapshot'=>$old['snapshot_json'],'start_date'=>$old['start_date'],'end_date'=>$old['end_date'],'duration_label'=>$old['duration_label']],JSON_UNESCAPED_UNICODE),json_encode(['snapshot'=>$snap,'start_date'=>$start,'end_date'=>$end,'duration_label'=>$duration],JSON_UNESCAPED_UNICODE)]);
        $pdo->commit();
      }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
      return ['ok'=>true,'id'=>$id];
    },false,3);
    route('DELETE','/api/admin/work-contracts/{id}',static function($p,$b,$actor){
      self::setup();$id=(int)($p['id']??0);
      if($id<=0)Http::error('شناسه قرارداد معتبر نیست',422);
      $pdo=self::db();
      $pdo->beginTransaction();
      try{
        // Permanent, atomic deletion: no contract snapshot, generated DOCX
        // or personally identifiable data may remain in the audit table.
        $row=Db::one('SELECT id FROM work_contracts WHERE id=? FOR UPDATE',[$id]);
        if(!$row)Http::error('قرارداد یافت نشد',404);
        Db::run('DELETE FROM work_contract_audit WHERE contract_id=?',[$id]);
        Db::run('DELETE FROM work_contracts WHERE id=?',[$id]);
        $pdo->commit();
      }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
      }
      return ['ok'=>true,'id'=>$id,'deleted_permanently'=>true];
    },false,3);
    route('GET','/api/admin/work-contracts/{id}/print',static function($p,$b,$actor){
      self::setup();$id=(int)($p['id']??0);
      $row=Db::one('SELECT id,body_html,snapshot_json,docx_blob FROM work_contracts WHERE id=? AND deleted_at IS NULL',[$id]);
      if(!$row)Http::error('قرارداد یافت نشد',404);
      // Repair already-issued Word contracts whose saved HTML contained literal \\n.
      if(!empty($row['docx_blob']))$row['body_html']=self::docxHtml($row['docx_blob']);
      header('Content-Type: text/html; charset=utf-8');header('Cache-Control: private,no-store');
      header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'");
      $style=<<<'CSS'
@page{size:A4 portrait;margin:15mm 15mm 14mm}
:root{color-scheme:light}
*{box-sizing:border-box}
html{direction:rtl}
body{margin:0;background:#edf1f2;color:#111827;direction:rtl;font-family:Tahoma,"Vazirmatn","Noto Naskh Arabic",sans-serif;font-size:11.2pt;line-height:1.65;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wc-tools{padding:12px;text-align:center;background:#fff;border-bottom:1px solid #d4dfdd}
.wc-tools button{border:0;background:#157650;color:#fff;padding:10px 26px;border-radius:8px;cursor:pointer;font:inherit}
.wc-paper{width:210mm;max-width:100%;padding:15mm;background:#fff;margin:16px auto;box-shadow:0 2px 14px #0002;direction:rtl;text-align:right}
.wc-paper h1{text-align:center;margin:0 0 14px;font-size:17pt;font-weight:700}
.wc-paper h3{font-size:11.7pt;font-weight:700;margin:11px 0 5px;break-after:avoid}
.wc-paper p{font-size:11pt;line-height:1.78;margin:5px 0;text-align:justify;direction:rtl;unicode-bidi:plaintext;orphans:2;widows:2}
.wc-paper b{font-weight:700}
.wc-paper .wc-sign{display:flex;justify-content:space-between;gap:20px;margin-top:24px;min-height:40px;break-inside:avoid;font-weight:700}
.wc-paper .wc-page-break{break-before:page;page-break-before:always;height:0;margin:0;padding:0}
.wc-paper .wc-docx-text{white-space:pre-wrap;line-height:1.8;text-align:justify}
@media print{
 html,body{width:auto;background:#fff}
 .wc-tools{display:none!important}
 .wc-paper{width:auto;max-width:none;margin:0;padding:0;box-shadow:none}
 .wc-paper p,.wc-paper h3,.wc-paper .wc-sign{break-inside:avoid-page}
}
CSS;
      $autoPrint=!empty($_GET['autoprint']);
      $printScript=$autoPrint?'<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},350);});</script>':'';
      echo '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>قرارداد شماره '.(int)$id.'</title><style>'.$style.'</style><div class="wc-tools" style="text-align:center;padding:14px"><button onclick="window.print()">چاپ / ذخیره PDF</button></div>'.$row['body_html'].$printScript.'</html>';exit;
    },false,3);
    route('GET','/api/admin/work-contracts/{id}/word',static function($p,$b,$actor){
      self::setup();$id=(int)($p['id']??0);
      $row=Db::one('SELECT docx_blob FROM work_contracts WHERE id=?',[$id]);
      if(!$row)Http::error('قرارداد یافت نشد',404);
      if(empty($row['docx_blob']))Http::error('برای این قالب، نسخه Word موجود نیست؛ از چاپ استفاده کنید',422);
      header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      header('Content-Disposition: attachment; filename="khatyar-contract-'.$id.'.docx"');
      header('Content-Length: '.strlen($row['docx_blob']));
      header('Cache-Control: private,no-store');
      echo $row['docx_blob'];exit;
    },false,3);
  }
}
