import argparse
import hashlib
import math
from pathlib import Path

import openpyxl


def sql_string(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def identifier(value, width=None):
    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, (int, float)) and (not math.isfinite(value) or value != int(value)):
        raise ValueError("Fractional or invalid personnel identifier")
    digits = str(int(value)) if isinstance(value, (int, float)) else str(value).strip()
    digits = digits.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    if not digits.isdigit():
        raise ValueError("Personnel identifiers must contain digits only")
    if len(digits) > (width or 40):
        raise ValueError("Personnel identifier exceeds the supported length")
    return digits.zfill(width) if width else digits


def read_rows(source):
    workbook = openpyxl.load_workbook(source, data_only=True, read_only=True)
    sheet = workbook.active
    source_rows = list(sheet.values)
    if [str(value or "").strip() for value in source_rows[0]] != ["ردیف", "نام", "نام خانوادگی", "شماره پرسنلی", "کد ملی", "روز سنوات"]:
        raise ValueError("Unexpected workbook headers")
    rows = []
    for line, values in enumerate(source_rows[1:], start=2):
        if not isinstance(values[0], (int, float)):
            continue
        serial, first, last, personnel, national, days = values
        if not isinstance(days, (int, float)) or not math.isfinite(days) or abs(days - round(days)) > 0.000001 or not 0 <= days <= 1000000:
            raise ValueError(f"Invalid seniority days at worksheet row {line}")
        blank = not first and not last and not personnel and not national and round(days) == 0
        if (not first or not last) and not blank:
            raise ValueError(f"Missing name at worksheet row {line}")
        rows.append((int(serial), str(first or "").strip(), str(last or "").strip(), identifier(personnel), identifier(national, 10), round(days)))
    workbook.close()
    for position in [0, 3, 4]:
        present = [row[position] for row in rows if row[position] is not None]
        if len(set(present)) != len(present):
            raise ValueError("Duplicate source identifiers; resolve before import")
    return rows


def build_import(rows, checksum, apply):
    values = ",\n".join("(" + ",".join(sql_string(value) if index in [1, 2, 3, 4] else str(value) for index, value in enumerate(row)) + ",NULL)" for row in rows)
    setup = f"""SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @seniority_source = 'xlsx:{checksum}';
DROP TEMPORARY TABLE IF EXISTS seniority_source;
CREATE TEMPORARY TABLE seniority_source (
  source_row INT PRIMARY KEY, first_name VARCHAR(100),last_name VARCHAR(100),
  personnel_code VARCHAR(40),national_code VARCHAR(10),days INT UNSIGNED,
  manual_user_id INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO seniority_source VALUES
{values};
DROP TEMPORARY TABLE IF EXISTS seniority_candidates;
CREATE TEMPORARY TABLE seniority_candidates AS
SELECT source.source_row,person.id user_id,
  CASE WHEN source.manual_user_id IS NOT NULL THEN 0
    WHEN source.national_code IS NOT NULL AND
      COALESCE(NULLIF(TRIM(person.national_code),''),IF(TRIM(person.username) REGEXP '^[0-9]{{1,10}}$',TRIM(person.username),NULL)) IS NOT NULL AND
      LPAD(COALESCE(NULLIF(TRIM(person.national_code),''),TRIM(person.username)),10,'0')<>source.national_code THEN 1
    WHEN source.personnel_code IS NOT NULL AND NULLIF(TRIM(person.personnel_code),'') IS NOT NULL AND TRIM(person.personnel_code)<>source.personnel_code THEN 1
    ELSE 0 END identity_conflict
FROM seniority_source source JOIN (
  SELECT id,
    CONVERT(username USING utf8mb4) COLLATE utf8mb4_unicode_ci username,
    CONVERT(national_code USING utf8mb4) COLLATE utf8mb4_unicode_ci national_code,
    CONVERT(personnel_code USING utf8mb4) COLLATE utf8mb4_unicode_ci personnel_code
  FROM users
) person ON
  (source.manual_user_id IS NOT NULL AND person.id=source.manual_user_id) OR
  (source.manual_user_id IS NULL AND (
    (source.national_code IS NOT NULL AND (
      (TRIM(person.national_code) REGEXP '^[0-9]{{1,10}}$' AND LPAD(TRIM(person.national_code),10,'0')=source.national_code) OR
      (TRIM(person.username) REGEXP '^[0-9]{{1,10}}$' AND LPAD(TRIM(person.username),10,'0')=source.national_code))) OR
    (source.personnel_code IS NOT NULL AND TRIM(person.personnel_code)=source.personnel_code)));
DROP TEMPORARY TABLE IF EXISTS seniority_matches;
CREATE TEMPORARY TABLE seniority_matches AS
SELECT source.source_row,MIN(candidate.user_id) user_id,COUNT(candidate.user_id) candidate_count,
  COALESCE(MAX(candidate.identity_conflict),0) identity_conflict
FROM seniority_source source LEFT JOIN seniority_candidates candidate ON candidate.source_row=source.source_row GROUP BY source.source_row;
DROP TEMPORARY TABLE IF EXISTS seniority_user_counts;
CREATE TEMPORARY TABLE seniority_user_counts AS
SELECT user_id,COUNT(*) matched_rows FROM seniority_matches WHERE candidate_count=1 GROUP BY user_id;
DROP TEMPORARY TABLE IF EXISTS seniority_ready;
CREATE TEMPORARY TABLE seniority_ready AS
SELECT source.*,matched.user_id,
  CASE WHEN source.first_name='' AND source.last_name='' AND source.personnel_code IS NULL AND source.national_code IS NULL AND source.manual_user_id IS NULL THEN 'blank_source_row'
    WHEN source.personnel_code IS NULL AND source.national_code IS NULL AND source.manual_user_id IS NULL THEN 'manual_mapping_required'
    WHEN matched.candidate_count=0 THEN 'user_not_found'
    WHEN matched.candidate_count<>1 THEN 'ambiguous_match'
    WHEN matched.identity_conflict<>0 THEN 'identity_conflict'
    WHEN duplicates.matched_rows<>1 THEN 'duplicate_user_mapping'
    ELSE 'matched' END match_status
FROM seniority_source source JOIN seniority_matches matched ON matched.source_row=source.source_row
LEFT JOIN seniority_user_counts duplicates ON duplicates.user_id=matched.user_id;
SELECT source_row,first_name,last_name,personnel_code,national_code,days,user_id,match_status FROM seniority_ready ORDER BY source_row;
SELECT match_status,COUNT(*) personnel_count,SUM(days) days FROM seniority_ready GROUP BY match_status;
"""
    if not apply:
        return setup
    schema = (Path(__file__).resolve().parents[1] / "db" / "seniority_schema.sql").read_text(encoding="utf-8")
    return setup + "\n" + schema + "\n" + """START TRANSACTION;
INSERT IGNORE INTO personnel_seniority(user_id,base_days,base_through_jdate,source_ref)
SELECT user_id,days,'1405-06-31',@seniority_source FROM seniority_ready WHERE match_status='matched';
INSERT IGNORE INTO personnel_seniority_history(user_id,event_key,kind,period,total_before,total_after,delta_days,reason)
SELECT ready.user_id,CONCAT(@seniority_source,':',ready.user_id),'import','1405-06',0,ready.days,ready.days,'ورود اکسل سنوات تا پایان شهریور ۱۴۰۵'
FROM seniority_ready ready JOIN personnel_seniority saved ON saved.user_id=ready.user_id
WHERE ready.match_status='matched' AND
  CONVERT(saved.source_ref USING utf8mb4) COLLATE utf8mb4_unicode_ci =
  CONVERT(@seniority_source USING utf8mb4) COLLATE utf8mb4_unicode_ci;
COMMIT;
SELECT ready.source_row,ready.first_name,ready.last_name,ready.user_id,ready.days spreadsheet_days,
 saved.base_days,saved.base_through_jdate,
 CASE WHEN ready.match_status<>'matched' THEN ready.match_status
   WHEN CONVERT(saved.source_ref USING utf8mb4) COLLATE utf8mb4_unicode_ci =
        CONVERT(@seniority_source USING utf8mb4) COLLATE utf8mb4_unicode_ci THEN 'imported_or_already_imported'
   ELSE 'existing_baseline_preserved' END result
FROM seniority_ready ready LEFT JOIN personnel_seniority saved ON saved.user_id=ready.user_id ORDER BY ready.source_row;
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    rows = read_rows(args.source)
    checksum = hashlib.sha256(args.source.read_bytes()).hexdigest()
    args.output.mkdir(parents=True, exist_ok=True)
    for apply, name in [(False, "seniority_1405_06_preview.sql"), (True, "seniority_1405_06_apply.sql")]:
        (args.output / name).write_text(build_import(rows, checksum, apply), encoding="utf-8")
    unresolved = [row for row in rows if row[3] is None and row[4] is None]
    lines = ["ردیف اکسل\tنام\tنام خانوادگی\tروز سنوات\tشناسه کاربر برای تطبیق دستی"]
    lines.extend("\t".join(map(str, [row[0], row[1], row[2], row[5], ""])) for row in unresolved)
    (args.output / "manual_mapping.tsv").write_text("\n".join(lines) + "\n", encoding="utf-8-sig")
    print(f"Validated {len(rows)} rows; {sum(row[5] for row in rows)} days; {len(unresolved)} manual mappings; source SHA256 {checksum}")


if __name__ == "__main__":
    main()
