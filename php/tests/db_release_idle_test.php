<?php
require __DIR__.'/../lib/Db.php';
function check($ok,$why){if(!$ok)throw new RuntimeException($why);}
class ConnectionProbe {
    public $transaction=false;
    function inTransaction(){return $this->transaction;}
}
$property=new ReflectionProperty(Db::class,'pdo');
$connection=new ConnectionProbe();
$property->setValue(null,$connection);
check(Db::releaseIdle()===true && $property->getValue()===null,'Idle connection retained');
$connection->transaction=true;
$property->setValue(null,$connection);
check(Db::releaseIdle()===false && $property->getValue()===$connection,'Transaction disconnected');
$connection->transaction=false;
check(Db::releaseIdle()===true,'Completed transaction not released');
check(Db::releaseIdle()===true,'Repeated release failed');
echo "PASS idle release, transaction protection and repeat release\n";
