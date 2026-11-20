from copy import copy
import sys, zipfile, io
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.drawing.image import Image
from openpyxl.styles import Font, PatternFill
from PIL import Image as PILImage

mode, src, dst = sys.argv[1:]
if mode == "fixture":
    w = Workbook()
    s = w.active
    s.title = "سازمان"
    s["A1"] = "گزارش آزمایشی"
    s.merge_cells("A1:J1")
    s["A1"].font = Font(bold=True, size=14)
    s["A2"] = "Static note"
    s["A2"].comment = Comment("fixed", "QA")
    for row in range(3, 6):
        s.cell(row, 1, row-2)
        s.cell(row, 2, "Line A")
        s.cell(row, 3, "Inspector")
        s.cell(row, 5, "Sample")
        s.cell(row, 7, "OLD")
        for col in range(8, 11):
            s.cell(row, col, 99).comment = Comment("old", "QA")
            s.cell(row, col).fill = PatternFill("solid", fgColor="FFFF00")
    s.merge_cells("B3:B5")
    s.merge_cells("C3:C5")
    s["H6"] = "=SUM(H3:H5)"
    s.print_area = "A1:J6"
    s.page_setup.orientation = "portrait"
    s.column_dimensions["E"].width = 24
    for name in ["Other", "Third"]:
        x = w.create_sheet(name)
        x["A1"] = "Untouched"
        x["A2"] = "=1+2"
        x["B1"].comment = Comment("other note", "QA")
        x.print_area = "A1:B3"
    img = io.BytesIO()
    PILImage.new("RGB", (12,12), "blue").save(img, format="PNG")
    img.seek(0)
    s.add_image(Image(img), "L2")
    w.save(src)
elif mode == "verify":
    a,b = load_workbook(src),load_workbook(dst)
    s=b["سازمان"]
    assert b.sheetnames == a.sheetnames
    assert s["A1"].value == "گزارش آزمایشی - آبان ۱۴۰۵"
    assert copy(s["A1"].font) == copy(a["سازمان"]["A1"].font)
    assert s["A2"].comment.text == "fixed"
    assert s["H3"].comment.text == "جمعه ۱۲"
    assert s["H5"].comment is None and s["E5"].value is None
    assert s["H3"].value == 2.25 and s["H4"].value == 1.25
    assert s["H6"].value == "=SUM(H3:H5)"
    assert copy(s["H3"].fill) == copy(a["سازمان"]["H3"].fill)
    assert str(s.merged_cells) == str(a["سازمان"].merged_cells)
    assert s.page_setup.orientation == "portrait"
    assert s.column_dimensions["E"].width == 24
    assert s.print_area != a["سازمان"].print_area
    assert len(s._images) == 1
    for n in ["Other","Third"]:
        assert b[n]["A1"].value == a[n]["A1"].value
        assert b[n]["A2"].value == a[n]["A2"].value
        assert b[n]["B1"].comment.text == "other note"
        assert b[n].print_area == a[n].print_area
    values=[c.value for row in s for c in row]
    for i in range(1,5):
        assert values.count("T00"+str(i)) == 1
    assert "OLD" not in values
    with zipfile.ZipFile(src) as z1, zipfile.ZipFile(dst) as z2:
        for name in z1.namelist():
            if name.startswith(("xl/media/","xl/drawings/drawing","xl/worksheets/sheet2","xl/worksheets/sheet3","xl/worksheets/_rels/sheet2","xl/worksheets/_rels/sheet3")):
                assert z1.read(name)==z2.read(name), name
        assert z2.testzip() is None
    print("Workbook, notes, image and unrelated sheets verified")
