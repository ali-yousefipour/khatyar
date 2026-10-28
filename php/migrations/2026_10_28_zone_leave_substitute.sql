-- New and existing regions default to optional replacement until explicitly enabled.
ALTER TABLE zones ADD COLUMN leave_requires_substitute TINYINT(1) NOT NULL DEFAULT 0;
