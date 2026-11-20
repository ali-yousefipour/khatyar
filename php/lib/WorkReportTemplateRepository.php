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
    public function all(): array {
        return $this->run('SELECT t.*,a.active_version_id,a.updated_at,a.updated_by,v.version_no FROM work_report_templates t JOIN work_report_template_state a ON a.template_id=t.id JOIN work_report_template_versions v ON v.id=a.active_version_id ORDER BY t.id')->fetchAll(PDO::FETCH_ASSOC);
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
            $this->db->commit();
        }catch(Throwable $e){if($this->db->inTransaction())$this->db->rollBack();throw $e;}
    }
}
