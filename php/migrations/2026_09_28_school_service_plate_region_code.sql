-- School service: store the two-digit regional/province code shown after «ایران» on standard Iranian plates.
-- Existing iran_code is retained for backward compatibility; new records use plate_region_code.
ALTER TABLE school_service_inspections
  ADD COLUMN plate_region_code VARCHAR(2) NULL AFTER iran_code;
