<?php
$__root = realpath(__DIR__ . '/../');
if (!$__root) $__root = dirname(__DIR__);
if (is_file($__root . '/.installed') && getenv('ALLOW_MAINTENANCE') !== '1') { http_response_code(403); exit('Maintenance scripts are disabled.'); }

// نصاب وب: http://app.yousefipour.ir/install.php
$ROOT = __DIR__ . '/..';
$LOCK = "$ROOT/.installed";
require "$ROOT/lib/Db.php";
$msg = null; $done = false;

if (is_file($LOCK)) { $msg = ['s', 'سامانه قبلاً نصب شده است. برای نصب مجدد فایل .installed را حذف کنید.']; $done = true; }

if (!$done && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $f = $_POST;
  try {
    $dsn = "mysql:host={$f['db_host']};dbname={$f['db_name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $f['db_user'], $f['db_pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);

    // محافظ نصب مجدد: اگر از قبل مدیرکلی وجود دارد، نصب مجدد مجاز نیست
    $already = false;
    try { $already = (int)$pdo->query("SELECT COUNT(*) FROM users u JOIN roles r ON r.id=u.role_id WHERE r.level=1")->fetchColumn() > 0; }
    catch (Throwable $e) { $already = false; }
    if ($already) throw new Exception('سامانه قبلاً نصب شده است (مدیرکل موجود است). برای نصب مجدد ابتدا دیتابیس را خالی کنید.');

    // ۱) ساخت جداول (DDL در MySQL خودکار commit می‌شود)
    $sql = file_get_contents("$ROOT/db/mysql_schema.sql");
    $pdo->exec($sql);

    // درج داده‌ها داخل تراکنش
    $pdo->beginTransaction();

    // ۲) نقش‌ها
    $roles = [['مدیر کل',1,1],['معاونت نظارت و بازرسی',2,1],['رییس اداره بازرسی',3,1],['سربازرس ارشد',4,0],
      ['نیروی اداری ارشد',4,1],['مسئول پروژه',4,0],['سربازرس',5,0],['نیروی اداری',5,1],['بازرس',6,0],
      ['نماینده اجرایی',6,0],['اپراتور',7,0],['ناظر خط مبادی',7,0],['ناظر خط ثامن',7,0],['ناظر خط',7,0],['نظارت تصویری',7,0]];
    $rs = $pdo->prepare("INSERT INTO roles(title,level,is_admin) VALUES(?,?,?) ON DUPLICATE KEY UPDATE level=VALUES(level),is_admin=VALUES(is_admin)");
    foreach ($roles as $r) $rs->execute($r);

    // ۳) حساب مدیرکل
    $adminRole = $pdo->query("SELECT id FROM roles WHERE title='مدیر کل'")->fetchColumn();
    $hash = password_hash($f['admin_pass'], PASSWORD_BCRYPT);
    $pdo->prepare("INSERT INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw) VALUES(?,?,?,?,?,0)
                   ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),role_id=VALUES(role_id)")
        ->execute([$f['admin_user'], $f['admin_first'] ?: 'مدیر', $f['admin_last'] ?: 'کل', $hash, $adminRole]);

    // ۴) حساب‌های پرسنل (رمز ۱۲۳۴۵۶)
    if (is_file("$ROOT/seed/personnel.json")) {
      $people = json_decode(file_get_contents("$ROOT/seed/personnel.json"), true);
      $ph = password_hash('123456', PASSWORD_BCRYPT);
      $ins = $pdo->prepare("INSERT IGNORE INTO users(username,first_name,last_name,password_hash,role_id,must_change_pw) VALUES(?,?,?,?,?,1)");
      $roleId = $pdo->prepare("SELECT id FROM roles WHERE title=?");
      foreach ($people as $p) {
        $roleId->execute([$p['role_title']]); $rid = $roleId->fetchColumn() ?: $adminRole;
        $ins->execute([$p['national_id'], $p['first_name'], $p['last_name'], $ph, $rid]);
      }
    }

    // ۵) نوشتن .env
    $pdo->commit();
    $secret = bin2hex(random_bytes(32));
    $env = "DB_HOST={$f['db_host']}\nDB_NAME={$f['db_name']}\nDB_USER={$f['db_user']}\nDB_PASS={$f['db_pass']}\n".
           "JWT_SECRET=$secret\nPUBLIC_URL=".($f['public_url'] ?? '')."\n";
    file_put_contents("$ROOT/.env", $env);
    file_put_contents($LOCK, date('c'));
    $done = true; $msg = ['s', 'نصب با موفقیت انجام شد. اکنون می‌توانید وارد پنل شوید.'];
  } catch (Throwable $e) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); $msg = ['e', 'خطا: ' . $e->getMessage()]; }
}
$d = ['db_host'=>'localhost','db_name'=>'h301194_app','db_user'=>'h301194_app','public_url'=>'https://app.yousefipour.ir'];
?>
<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>نصب سامانه کنترل خطوط تاکسیرانی</title>
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
<style>
 body{font-family:Vazirmatn,sans-serif;background:#f4f6fb;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}
 .card{background:#fff;border-radius:18px;box-shadow:0 20px 50px -20px rgba(15,27,45,.3);width:540px;max-width:96vw;overflow:hidden}
 .h{background:linear-gradient(135deg,#0d7a5f,#0a5f4a);color:#fff;padding:22px}.h h1{font-size:18px;margin:0}
 .b{padding:22px}label{display:block;font-size:13px;color:#6b7890;margin:12px 0 5px}
 input{width:100%;border:1px solid #e4e9f2;border-radius:11px;padding:11px;font:inherit;box-sizing:border-box}
 .row{display:flex;gap:12px}.row>div{flex:1}
 button{margin-top:18px;background:#0d7a5f;color:#fff;border:0;border-radius:12px;padding:12px 20px;font:inherit;font-weight:700;cursor:pointer;width:100%}
 .msg{padding:11px;border-radius:10px;margin-bottom:14px;font-size:13px}
 .msg.s{background:#e3f6ec;color:#16a06a}.msg.e{background:#fde6ea;color:#e23b54}
 a.btn{display:block;text-align:center;text-decoration:none;background:#0d7a5f;color:#fff;border-radius:12px;padding:12px;margin-top:14px;font-weight:700}
</style></head><body>
<div class="card"><div class="h"><h1>نصب سامانه کنترل خطوط تاکسیرانی مشهد</h1></div>
<div class="b">
<?php if ($msg): ?><div class="msg <?=$msg[0]?>"><?=htmlspecialchars($msg[1])?></div><?php endif; ?>
<?php if ($done): ?>
  <a class="btn" href="/">ورود به پنل مدیریت</a>
  <a class="btn" href="/app" style="background:#f6c324;color:#5a4500">باز کردن نسخهٔ وب موبایل</a>
<?php else: ?>
<form method="post">
  <div class="row"><div><label>هاست دیتابیس</label><input name="db_host" value="<?=$d['db_host']?>"></div>
    <div><label>نام دیتابیس</label><input name="db_name" value="<?=$d['db_name']?>"></div></div>
  <div class="row"><div><label>کاربر دیتابیس</label><input name="db_user" value="<?=$d['db_user']?>"></div>
    <div><label>رمز دیتابیس</label><input name="db_pass" type="password"></div></div>
  <hr style="margin:18px 0;border:none;border-top:1px solid #e4e9f2">
  <div class="row"><div><label>نام مدیرکل</label><input name="admin_first" value="مدیر"></div>
    <div><label>نام خانوادگی</label><input name="admin_last" value="کل"></div></div>
  <div class="row"><div><label>نام کاربری مدیرکل (کد ملی)</label><input name="admin_user" required></div>
    <div><label>رمز عبور مدیرکل</label><input name="admin_pass" type="password" required></div></div>
  <input type="hidden" name="public_url" value="<?=$d['public_url']?>">
  <p style="font-size:12px;color:#6b7890">۶۸ حساب پرسنل با رمز ۱۲۳۴۵۶ به‌صورت خودکار ساخته می‌شوند.</p>
  <button type="submit">نصب نهایی</button>
</form>
<?php endif; ?>
</div></div></body></html>
