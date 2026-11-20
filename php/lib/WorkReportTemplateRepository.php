<?php
require_once __DIR__.'/WorkReportTemplateParser.php';
final class WorkReportTemplateRepository {
    public function __construct(private PDO $db){}
    public function ensureSchema(): void {
        $sql=file_get_contents(__DIR__.'/../migrations/20261120_work_report_templates.sql');
        if($sql===false)throw new RuntimeException('Template migration unavailable');
        foreach(explode(';',$sql) as $statement)if(trim($statement)!=='')$this->db->exec($statement);
    }
    private function run(string $sql,array $args=[]): PDOStatement {
        $q=$this->db->prepare($sql);$q->execute($args);return $q;
    }
    // SHA-256 of the approved, sanitized organization workbook, not a reconstructed template.
    public const ORGANIZATION_SHA256='0e99edf88411503a37f6a04154ac9a69b4e52100fd54ea398e77bc8a2914ea16';
    public static function organizationMapping(): array {
        return ['sheet'=>'Sheet1','first_row'=>4,'last_row'=>110,
            'heading'=>['cell'=>'A1','format'=>'{title} ({month_name} {year})'],
            'columns'=>['ordinal'=>'A','location'=>'B','role'=>'C','first_name'=>'E',
                'last_name'=>'F','personnel_code'=>'G','friday'=>'H','holiday'=>'I','overtime'=>'J']];
    }
    public function ensureOrganizationTemplate(): int {
        // The immutable seed version is also the durable installation marker. Do not
        // reactivate or reset defaults after an administrator intentionally changes them.
        $seedId=$this->run('SELECT template_id FROM work_report_template_versions WHERE sha256=? ORDER BY id LIMIT 1',[self::ORGANIZATION_SHA256])->fetchColumn();
        if($seedId!==false)return (int)$seedId;
        $lock='khatyar_work_template_'.(string)$this->db->query('SELECT MD5(DATABASE())')->fetchColumn();
        if((int)$this->run('SELECT GET_LOCK(?,10)',[$lock])->fetchColumn()!==1)throw new RuntimeException('Organization template installation lock unavailable');
        try {
            $seedId=$this->run('SELECT template_id FROM work_report_template_versions WHERE sha256=? ORDER BY id LIMIT 1',[self::ORGANIZATION_SHA256])->fetchColumn();
            if($seedId!==false)return (int)$seedId;
            $file=__DIR__.'/organization-template.xlsx';
            if(!is_file($file)||!hash_equals(self::ORGANIZATION_SHA256,(string)hash_file('sha256',$file)))throw new RuntimeException('Organization template asset missing or checksum mismatch');
            $structure=WorkReportTemplateParser::parse($file,self::organizationMapping());
            if(count($structure['slots'])!==107||count($structure['merges'])!==43)throw new RuntimeException('Organization template structure mismatch');
            $bytes=file_get_contents($file);
            if($bytes===false||!hash_equals(self::ORGANIZATION_SHA256,hash('sha256',$bytes)))throw new RuntimeException('Organization workbook changed while reading');
            // 0 is reserved here for an automated system installation, not a user.
            $actor=0;
            $this->db->beginTransaction();
            try {
                $ids=$this->run('SELECT id FROM work_report_templates WHERE title=? ORDER BY id FOR UPDATE',['قالب سازمان'])->fetchAll(PDO::FETCH_COLUMN);
                if(count($ids)>1)throw new RuntimeException('Duplicate organization template titles require administrator review');
                if(!$ids){
                    $this->run('INSERT INTO work_report_templates(title,description,enabled,created_by) VALUES(?,?,1,?)',
                        ['قالب سازمان','قالب رسمی سازمان؛ عین فایل مرجع پاک‌سازی‌شده با حفظ ساختار، فونت و فرمول‌ها',$actor]);
                    $id=(int)$this->db->lastInsertId();
                }else{
                    $id=(int)$ids[0];
                    $this->run('UPDATE work_report_templates SET enabled=1 WHERE id=?',[$id]);
                }
                $number=1+(int)$this->run('SELECT COALESCE(MAX(version_no),0) FROM work_report_template_versions WHERE template_id=?',[$id])->fetchColumn();
                $this->run('INSERT INTO work_report_template_versions(template_id,version_no,sha256,workbook,mapping_json,created_by) VALUES(?,?,?,?,?,?)',
                    [$id,$number,self::ORGANIZATION_SHA256,$bytes,json_encode($structure,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$actor]);
                $version=(int)$this->db->lastInsertId();
                $this->run('INSERT INTO work_report_template_state(template_id,active_version_id,updated_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE active_version_id=VALUES(active_version_id),updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP',[$id,$version,$actor]);
                // Install as the initial default; retain any other configured template.
                $this->run('INSERT IGNORE INTO work_report_template_default(singleton_id,template_id,updated_by) VALUES(1,?,?)',[$id,$actor]);
                $this->run('UPDATE work_report_template_default SET template_id=?,updated_by=? WHERE singleton_id=1 AND template_id IS NULL',[$id,$actor]);
                $this->db->commit();
                return $id;
            }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
        } finally {
            $this->run('SELECT RELEASE_LOCK(?)',[$lock]);
        }
    }
    public function all(): array {
        return $this->run('SELECT t.*,a.active_version_id,a.updated_at,a.updated_by,v.version_no,JSON_LENGTH(v.mapping_json,\'$.slots\') AS slot_count,JSON_LENGTH(v.mapping_json,\'$.groups\') AS group_count FROM work_report_templates t JOIN work_report_template_state a ON a.template_id=t.id JOIN work_report_template_versions v ON v.id=a.active_version_id ORDER BY t.id')->fetchAll(PDO::FETCH_ASSOC);
    }
    public function defaultId(): ?int {
        $id=$this->run('SELECT t.id FROM work_report_template_default d JOIN work_report_templates t ON t.id=d.template_id WHERE d.singleton_id=1 AND t.enabled=1')->fetchColumn();
        return $id===false?null:(int)$id;
    }
    public function setDefault(?int $id,int $actor): void {
        if($actor<=0)throw new InvalidArgumentException('Invalid actor');
        $this->db->beginTransaction();
        try{
            if($id!==null&&!$this->run('SELECT t.id FROM work_report_templates t JOIN work_report_template_state s ON s.template_id=t.id WHERE t.id=? AND t.enabled=1 FOR UPDATE',[$id])->fetchColumn())throw new InvalidArgumentException('Template unavailable');
            $this->run('INSERT INTO work_report_template_default(singleton_id,template_id,updated_by) VALUES(1,?,?) ON DUPLICATE KEY UPDATE template_id=VALUES(template_id),updated_by=VALUES(updated_by)',[$id,$actor]);
            $this->db->commit();
        }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
    public function versions(int $id): array {
        return $this->run('SELECT id,template_id,version_no,sha256,created_by,created_at FROM work_report_template_versions WHERE template_id=? ORDER BY version_no DESC',[$id])->fetchAll(PDO::FETCH_ASSOC);
    }
    public function get(int $id,?int $version=null,bool $enabledOnly=true): array {
        $sql='SELECT t.title,t.description,t.enabled,v.* FROM work_report_templates t JOIN work_report_template_state a ON a.template_id=t.id JOIN work_report_template_versions v ON v.template_id=t.id WHERE t.id=? AND v.id='.($version===null?'a.active_version_id':'?');
        $args=[$id];if($version!==null)$args[]=$version;
        if($enabledOnly)$sql.=' AND t.enabled=1';
        $row=$this->run($sql,$args)->fetch(PDO::FETCH_ASSOC);
        if(!$row)throw new InvalidArgumentException('Template not found');
        if(!hash_equals($row['sha256'],hash('sha256',$row['workbook'])))throw new RuntimeException('Template integrity failure');
        $row['structure']=json_decode($row['mapping_json'],true,512,JSON_THROW_ON_ERROR);return $row;
    }
    public function save(?int $id,string $title,string $description,string $file,array $mapping,int $actor): array {
        if($actor<=0||trim($title)===''||mb_strlen($title)>180||mb_strlen($description)>4000)throw new InvalidArgumentException('Invalid template metadata');
        $structure=WorkReportTemplateParser::parse($file,$mapping);
        $bytes=file_get_contents($file);
        if($bytes===false||!hash_equals($structure['sha256'],hash('sha256',$bytes)))throw new RuntimeException('Template changed while reading');
        $this->db->beginTransaction();
        try{
            if($id===null){
                $this->run('INSERT INTO work_report_templates(title,description,created_by) VALUES(?,?,?)',[$title,$description,$actor]);
                $id=(int)$this->db->lastInsertId();
            }else{
                if(!$this->run('SELECT id FROM work_report_templates WHERE id=? FOR UPDATE',[$id])->fetchColumn())throw new InvalidArgumentException('Template missing');
            }
            $number=1+(int)$this->run('SELECT COALESCE(MAX(version_no),0) FROM work_report_template_versions WHERE template_id=?',[$id])->fetchColumn();
            $this->run('INSERT INTO work_report_template_versions(template_id,version_no,sha256,workbook,mapping_json,created_by) VALUES(?,?,?,?,?,?)',[$id,$number,$structure['sha256'],$bytes,json_encode($structure,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$actor]);
            $version=(int)$this->db->lastInsertId();
            $this->run('INSERT INTO work_report_template_state(template_id,active_version_id,updated_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE active_version_id=VALUES(active_version_id),updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP',[$id,$version,$actor]);
            $this->db->commit();
            return ['id'=>$id,'version_id'=>$version,'version_no'=>$number,'structure'=>$structure];
        }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
    public function update(int $id,string $title,string $description,bool $enabled,int $version,int $actor): void {
        if(trim($title)===''||mb_strlen($title)>180||mb_strlen($description)>4000||$actor<=0)throw new InvalidArgumentException('Invalid template metadata');
        $this->db->beginTransaction();
        try{
            if(!$this->run('SELECT id FROM work_report_templates WHERE id=? FOR UPDATE',[$id])->fetchColumn())throw new InvalidArgumentException('Template missing');
            if(!$this->run('SELECT id FROM work_report_template_versions WHERE id=? AND template_id=?',[$version,$id])->fetchColumn())throw new InvalidArgumentException('Version missing');
            $this->run('UPDATE work_report_templates SET title=?,description=?,enabled=? WHERE id=?',[$title,$description,(int)$enabled,$id]);
            $this->run('UPDATE work_report_template_state SET active_version_id=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE template_id=?',[$version,$actor,$id]);
            if(!$enabled)$this->run('UPDATE work_report_template_default SET template_id=NULL,updated_by=? WHERE singleton_id=1 AND template_id=?',[$actor,$id]);
            $this->db->commit();
        }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
}
