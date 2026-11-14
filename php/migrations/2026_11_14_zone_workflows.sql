-- Per-region explicit approval workflows (2026-11-14).
-- Existing regions are intentionally NOT assigned a default workflow.
-- Administrators must select inspection/administrative mode and valid people
-- for each region in the redesigned Regional Management screen.
CREATE TABLE IF NOT EXISTS zone_workflows (
  zone_id INT NOT NULL PRIMARY KEY,
  mode VARCHAR(20) NOT NULL,
  admin_reviewer_id INT NULL,
  to_chief TINYINT(1) NOT NULL DEFAULT 1,
  to_head TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_zone_workflow_mode CHECK (mode IN ('inspection','administrative'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review regions still missing an explicit, validated workflow.
SELECT z.id,z.name,z.parent_id,COUNT(u.id) AS staff_count
FROM zones z LEFT JOIN zone_workflows w ON w.zone_id=z.id
LEFT JOIN users u ON u.zone_id=z.id AND u.is_active=1
WHERE w.zone_id IS NULL
GROUP BY z.id,z.name,z.parent_id
ORDER BY staff_count DESC,z.id;
