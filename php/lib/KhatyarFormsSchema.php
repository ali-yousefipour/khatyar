<?php
/**
 * Schema repair for the forms builder. Kept separate from the legacy route
 * declarations to make migration failures visible and recoverable.
 */
final class KhatyarFormsSchema {
    private static bool $verified = false;

    private static function tableExists(string $table): bool {
        $row=Db::one("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$table]);
        return (int)($row['n']??0)>0;
    }
    private static function columns(string $table): array {
        $rows=Db::all("SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[$table]);
        $names=[];
        foreach($rows as $row)$names[(string)$row['name']]=true;
        return $names;
    }
    private static function hasIndex(string $table,string $name): bool {
        $r=Db::one("SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?",[$table,$name]);
        return (int)($r['n']??0)>0;
    }
    public static function ensure(): void {
        if(self::$verified)return;
        // Persistent readiness marker prevents repeated INFORMATION_SCHEMA
        // queries and DDL attempts for every forms request / PHP worker.
        // It is only written after the migration is fully verified.
        try {
            $ready=Db::one("SELECT value FROM app_settings WHERE `key`=? LIMIT 1",['forms_schema_ready_v2']);
            if((string)($ready['value']??'')==='verified'){
                self::$verified=true;
                return;
            }
            if(!self::tableExists('custom_forms')) {
                Db::run("CREATE TABLE IF NOT EXISTS custom_forms (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  title VARCHAR(200) NOT NULL,
                  `schema` JSON NOT NULL,
                  is_active TINYINT(1) NOT NULL DEFAULT 1,
                  public_enabled TINYINT(1) NOT NULL DEFAULT 0,
                  public_slug VARCHAR(40) NULL,
                  UNIQUE KEY public_slug_uq (public_slug)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            }
            if(!self::tableExists('form_submissions')) {
                Db::run("CREATE TABLE IF NOT EXISTS form_submissions (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  form_id INT NOT NULL,
                  user_id INT NULL,
                  driver_id INT NULL,
                  answers JSON NOT NULL,
                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  is_public TINYINT(1) NOT NULL DEFAULT 0,
                  submitter_name VARCHAR(150) NULL,
                  submitter_mobile VARCHAR(20) NULL,
                  KEY form_submissions_form_created_idx (form_id,created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            }
            $cols=self::columns('custom_forms');
            $required=[
                'public_enabled'=>'TINYINT(1) NOT NULL DEFAULT 0',
                'public_slug'=>'VARCHAR(40) NULL',
            ];
            foreach($required as $name=>$definition) {
                if(!isset($cols[$name]))Db::run("ALTER TABLE custom_forms ADD COLUMN `".$name."` ".$definition);
            }
            $sub=self::columns('form_submissions');
            if(isset($sub['user_id'])) {
                $nullable=Db::one("SELECT IS_NULLABLE n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='form_submissions' AND COLUMN_NAME='user_id'");
                if(strtoupper((string)($nullable['n']??''))==='NO')
                    Db::run("ALTER TABLE form_submissions MODIFY COLUMN user_id INT NULL");
            }
            foreach([
                'is_public'=>'TINYINT(1) NOT NULL DEFAULT 0',
                'submitter_name'=>'VARCHAR(150) NULL',
                'submitter_mobile'=>'VARCHAR(20) NULL',
            ] as $name=>$definition) {
                if(!isset($sub[$name]))Db::run("ALTER TABLE form_submissions ADD COLUMN `".$name."` ".$definition);
            }
            if(!self::hasIndex('custom_forms','public_slug_uq'))
                Db::run("ALTER TABLE custom_forms ADD UNIQUE KEY public_slug_uq (public_slug)");

            // Verify instead of caching success before the DDL actually worked.
            $custom=self::columns('custom_forms');
            $submissions=self::columns('form_submissions');
            foreach(['id','title','schema','is_active','public_enabled','public_slug'] as $column)
                if(!isset($custom[$column]))throw new RuntimeException('custom_forms missing '.$column);
            foreach(['id','form_id','user_id','answers','is_public','submitter_name','submitter_mobile'] as $column)
                if(!isset($submissions[$column]))throw new RuntimeException('form_submissions missing '.$column);
            // Commit readiness only when every required column exists.
            // The settings key is already used by the existing settings API.
            Db::run("INSERT INTO app_settings (`key`,value) VALUES (?,?)
                ON DUPLICATE KEY UPDATE value=VALUES(value)",['forms_schema_ready_v2','verified']);
            self::$verified=true;
        } catch(Throwable $error) {
            error_log('forms schema migration failed: '.get_class($error).': '.$error->getMessage());
            // Do not leak SQL credentials or full query text to the browser.
            Http::error('ساختار پایگاه داده فرم‌ها کامل نیست یا مجوز اصلاح جدول‌ها وجود ندارد. مدیر سرور باید مهاجرت فرم‌ها را اجرا کند.',503);
        }
    }
}
