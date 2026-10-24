<?php
// Regression: bill-import chunks must not hold hundreds of multi-table writes in one transaction.
final class FakeImportConnection {
  public int $commits=0;
  private bool $active=false;
  public function beginTransaction(): bool { $this->active=true; return true; }
  public function inTransaction(): bool { return $this->active; }
  public function commit(): bool { if (!$this->active) throw new RuntimeException('No transaction'); $this->commits++; $this->active=false; return true; }
  public function rollBack(): bool { $this->active=false; return true; }
}
class Db {
  public static FakeImportConnection $connection;
  public static int $writes=0;
  public static function pdo(): FakeImportConnection { return self::$connection; }
  public static function one($sql,$params=[]): ?array { return null; }
  public static function run($sql,$params=[]): void {
    if (str_contains($sql,'INSERT INTO bills(')) self::$writes++;
    else throw new RuntimeException('Unexpected SQL from minimal bill fixture');
  }
}
Db::$connection=new FakeImportConnection();
require_once __DIR__.'/../lib/Xlsx.php';
$header=['شناسه قبض','مبلغ','کد بابت','عنوان شخص/شرکت'];
$rows=[$header];
for ($i=0;$i<125;$i++) $rows[]=['BILL-'.$i,'5000','20','نمونه'];
$result=Importer::runRows('bills',$rows,0);
if ($result['imported']!==125 || $result['skipped']!==0 || Db::$writes!==125 || Db::$connection->commits!==3)
  throw new RuntimeException('Bill batching regression: '.json_encode(['result'=>$result,'writes'=>Db::$writes,'commits'=>Db::$connection->commits],JSON_UNESCAPED_UNICODE));
$source=file_get_contents(__DIR__.'/../lib/routes.php');
if (!str_contains($source,"(\$p['kind'] === 'bills') ? 76 : 301"))
  throw new RuntimeException('Chunk endpoint must bound bill requests');
echo "PASS bill-import: 125 writes in three <=50-row transactions; bounded HTTP chunks\n";
