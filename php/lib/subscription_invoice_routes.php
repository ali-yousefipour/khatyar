<?php
// Invoice endpoints are accessible only through the authenticated administrative router.
// Monetary amounts are stored as integer rials; no online payment or tax submission is implied.
function kh_invoice_schema() {
  static $ready=false;
  if($ready)return;
  Db::run("CREATE TABLE IF NOT EXISTS kh_subscription_customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(190) NOT NULL,
    national_id VARCHAR(30) NULL,
    economic_code VARCHAR(40) NULL,
    phone VARCHAR(40) NULL,
    address TEXT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_name(company_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  Db::run("CREATE TABLE IF NOT EXISTS kh_subscription_invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(40) UNIQUE NULL,
    company_id BIGINT UNSIGNED NOT NULL,
    company_snapshot JSON NOT NULL,
    issued_date CHAR(10) NOT NULL,
    due_date CHAR(10) NULL,
    description TEXT NULL,
    line_items JSON NOT NULL,
    subtotal_rial BIGINT NOT NULL,
    discount_rial BIGINT NOT NULL DEFAULT 0,
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_rial BIGINT NOT NULL DEFAULT 0,
    total_rial BIGINT NOT NULL,
    status ENUM('unpaid','paid','cancelled') NOT NULL DEFAULT 'unpaid',
    payment_reference VARCHAR(190) NULL,
    paid_at DATETIME NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_company(company_id), KEY idx_created(created_at), KEY idx_status(status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $ready=true;
}
function kh_inv_str($v,$limit=190){return mb_substr(trim((string)($v??'')),0,$limit);}
function kh_inv_rial($v){
  if(!is_numeric($v) || !preg_match('/^\d+$/',(string)$v) || strlen((string)$v)>13) Http::error('مبلغ ریالی معتبر نیست',422);
  return (int)$v;
}
function kh_inv_date($v,$nullable=false) {
  $v=trim((string)$v);
  if($nullable&&$v==='')return null;
  if(!preg_match('/^1[34]\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/',$v)) Http::error('تاریخ شمسی معتبر نیست',422);
  return $v;
}
route('GET','/api/admin/subscription-customers',static function($p,$b,$u){
  kh_invoice_schema();
  return Db::all("SELECT * FROM kh_subscription_customers ORDER BY company_name");
},false,3);
route('POST','/api/admin/subscription-customers',static function($p,$b,$u){
  kh_invoice_schema();
  $name=kh_inv_str($b['company_name']??'');
  if(mb_strlen($name)<2)Http::error('نام شرکت الزامی است',422);
  $id=Db::insert("INSERT INTO kh_subscription_customers(company_name,national_id,economic_code,phone,address) VALUES(?,?,?,?,?)",[
    $name,kh_inv_str($b['national_id']??'',30),kh_inv_str($b['economic_code']??'',40),kh_inv_str($b['phone']??'',40),kh_inv_str($b['address']??'',2000)
  ]);
  return ['ok'=>true,'id'=>$id];
},false,3);
route('GET','/api/admin/subscription-invoices',static function($p,$b,$u){
  kh_invoice_schema();
  $where='';$params=[];
  if(!empty($_GET['company_id'])){$where=' WHERE i.company_id=?';$params[]=(int)$_GET['company_id'];}
  return Db::all("SELECT i.*,c.company_name FROM kh_subscription_invoices i JOIN kh_subscription_customers c ON c.id=i.company_id $where ORDER BY i.id DESC LIMIT 500",$params);
},false,3);
route('POST','/api/admin/subscription-invoices',static function($p,$b,$u){
  kh_invoice_schema();
  $companyId=(int)($b['company_id']??0);
  $company=Db::one("SELECT * FROM kh_subscription_customers WHERE id=? AND is_active=1",[$companyId]);
  if(!$company)Http::error('شرکت انتخاب‌شده معتبر نیست',422);
  $items=$b['items']??[];
  if(!is_array($items)||count($items)<1||count($items)>30)Http::error('فاکتور باید ۱ تا ۳۰ ردیف داشته باشد',422);
  $clean=[];$subtotal=0;
  foreach($items as $item){
    if(!is_array($item))Http::error('ردیف فاکتور معتبر نیست',422);
    $title=kh_inv_str($item['title']??'',250);
    $quantity=(int)($item['quantity']??0);
    $unit=kh_inv_rial($item['unit_price_rial']??'');
    if(!$title||$quantity<1||$quantity>10000)Http::error('عنوان، تعداد یا مبلغ ردیف معتبر نیست',422);
    $sum=$quantity*$unit;
    if($sum>100000000000000)Http::error('مبلغ ردیف بیش از حد مجاز است',422);
    $subtotal+=$sum;
    $clean[]=['title'=>$title,'quantity'=>$quantity,'unit_price_rial'=>$unit,'total_rial'=>$sum];
  }
  $discount=kh_inv_rial($b['discount_rial']??0);
  $tax=(float)($b['tax_percent']??0);
  if(!is_finite($tax)||$tax<0||$tax>100||$discount>$subtotal||$subtotal>100000000000000)
    Http::error('تخفیف یا درصد مالیات نامعتبر است',422);
  $tax=round($tax,2);
  $taxAmount=(int)round(($subtotal-$discount)*$tax/100);
  $total=$subtotal-$discount+$taxAmount;
  $date=kh_inv_date($b['issued_date']??'');
  $due=kh_inv_date($b['due_date']??'',true);
  if($due&&strcmp($due,$date)<0)Http::error('سررسید نمی‌تواند پیش از تاریخ صدور باشد',422);
  $pdo=Db::pdo();
  $pdo->beginTransaction();
  try{
    $id=Db::insert("INSERT INTO kh_subscription_invoices(company_id,company_snapshot,issued_date,due_date,description,line_items,subtotal_rial,discount_rial,tax_percent,tax_rial,total_rial,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",[
      $companyId,json_encode($company,JSON_UNESCAPED_UNICODE),$date,$due,kh_inv_str($b['description']??'',1000),
      json_encode($clean,JSON_UNESCAPED_UNICODE),$subtotal,$discount,$tax,$taxAmount,$total,(int)$u['id']
    ]);
    $number='KH-'.str_pad((string)$id,8,'0',STR_PAD_LEFT);
    Db::run("UPDATE kh_subscription_invoices SET invoice_number=? WHERE id=?",[$number,$id]);
    $pdo->commit();
    return ['ok'=>true,'id'=>$id,'invoice_number'=>$number,'total_rial'=>$total];
  }catch(Throwable $e){$pdo->rollBack();throw $e;}
},false,3);
route('POST','/api/admin/subscription-invoices/{id}/status',static function($p,$b,$u){
  kh_invoice_schema();
  $id=(int)($p['id']??0);
  $status=(string)($b['status']??'');
  if(!in_array($status,['paid','cancelled','unpaid'],true))Http::error('وضعیت نامعتبر است',422);
  $old=Db::one("SELECT id,status FROM kh_subscription_invoices WHERE id=?",[$id]);
  if(!$old)Http::error('فاکتور یافت نشد',404);
  if($old['status']==='cancelled'||($old['status']==='paid'&&$status==='unpaid')) Http::error('تغییر این وضعیت مجاز نیست',409);
  $ref=kh_inv_str($b['payment_reference']??'',190);
  Db::run("UPDATE kh_subscription_invoices SET status=?,payment_reference=?,paid_at=CASE WHEN ?='paid' THEN NOW() ELSE NULL END WHERE id=?",[$status,$status==='paid'?$ref:null,$status,$id]);
  return ['ok'=>true];
},false,3);
