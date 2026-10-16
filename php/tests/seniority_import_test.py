import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

module_path = Path(__file__).resolve().parents[1] / "tools" / "prepare_seniority_import.py"
spec = importlib.util.spec_from_file_location("seniority_import", module_path)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTests(unittest.TestCase):
    def read(self, rows):
        workbook = Mock()
        workbook.active.values = iter([("ردیف", "نام", "نام خانوادگی", "شماره پرسنلی", "کد ملی", "روز سنوات"), *rows])
        with patch.object(importer.openpyxl, "load_workbook", return_value=workbook):
            return importer.read_rows("unused.xlsx")

    def test_numeric_identifiers_and_float_roundoff(self):
        rows = self.read([(1, "نام", "خانوادگی", 5005, 12345678, 3956.9999999999977)])
        self.assertEqual(rows[0][3:], ("5005", "0012345678", 3957))

    def test_blank_numbered_rows_are_not_invented_personnel(self):
        rows = self.read([(9, None, None, None, None, 0)])
        self.assertEqual(rows[0], (9, "", "", None, None, 0))

    def test_fractional_days_rejected(self):
        with self.assertRaises(ValueError):
            self.read([(1, "نام", "خانوادگی", 5005, 12345678, 3.5)])

    def test_identifiers_are_never_truncated(self):
        for value in [12345678.5, "12345678901"]:
            with self.assertRaises(ValueError):
                importer.identifier(value, 10)

    def test_duplicate_identifiers_rejected(self):
        with self.assertRaises(ValueError):
            self.read([(1, "الف", "یک", 5005, 12345678, 3), (2, "ب", "دو", 5005, 87654321, 4)])

    def test_import_never_overwrites_or_matches_names(self):
        sql = importer.build_import([(1, "نام", "خانوادگی", "5005", "0012345678", 10)], "a" * 64, True)
        self.assertIn("INSERT IGNORE INTO personnel_seniority(", sql)
        self.assertNotIn("UPDATE personnel_seniority SET", sql)
        self.assertNotIn("person.first_name=", sql)
        self.assertIn("duplicate_user_mapping", sql)
        self.assertIn("identity_conflict", sql)
        self.assertIn("blank_source_row", sql)
        self.assertIn("1405-06-31", sql)
        self.assertIn("START TRANSACTION", sql)
        self.assertIn("COMMIT", sql)


if __name__ == "__main__":
    unittest.main()
