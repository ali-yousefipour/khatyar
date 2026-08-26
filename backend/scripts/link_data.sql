-- پیوند فیش‌ها به راننده و خودرو پس از import
UPDATE bills b SET driver_id = d.id
  FROM drivers d WHERE b.driver_id IS NULL AND b.national_id = d.national_id;

UPDATE bills b SET vehicle_id = v.id
  FROM vehicles v WHERE b.vehicle_id IS NULL AND b.plate = v.plate;

-- نمایهٔ کمکی برای کارایی جستجوی بدهی
CREATE INDEX IF NOT EXISTS idx_bills_driver ON bills(driver_id);

-- خلاصهٔ بارگذاری
SELECT
  (SELECT count(*) FROM lines)    AS lines,
  (SELECT count(*) FROM drivers)  AS drivers,
  (SELECT count(*) FROM vehicles) AS vehicles,
  (SELECT count(*) FROM bills)    AS bills,
  (SELECT count(*) FROM bills WHERE driver_id IS NOT NULL) AS bills_linked;
