"""Synthetic replica of the supplied organization's layout (no personal data)."""
import sys
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font
from openpyxl.comments import Comment
from copy import copy

mode, source, output = sys.argv[1:]
groups = [(3,11,[(3,11,"کاربر خطوط")]),(12,25,[(12,14,"اپراتور فاکتور سفر- خط داخلی (نوبت کاری 15%)"),(15,16,"اپراتور فاکتور سفر- خط داخلی (نوبت کاری 10%)"),(17,19,"اپراتور فاکتور سفر- خط خارجی"),(20,21,"ناظر خط داخلی"),(22,23,"ناظر خط خارجی"),(24,25,"بازرس مقیم")]),(26,34,[(26,28,"اپراتور فاکتور سفر (نوبت کاری 15%)"),(29,30,"اپراتور فاکتور سفر (نوبت کاری 10%)"),(31,32,"ناظر خط"),(33,34,"بازرس مقیم")]),(35,44,[(35,37,"اپراتور فاکتور سفر"),(38,40,"اپراتور فاکتور سفر داخل سالن پایانه"),(41,42,"ناظر خط"),(43,44,"بازرس مقیم")])]
for start, label in [(45,"شیرازی"),(52,"باب الجواد"),(59,"طبرسی"),(66,"نواب صفوی")]:
    groups.append((start,start+6,[(start,start+2,"اپراتور فاکتور سفر ("+label+")"),(start+3,start+5,"ناظر خط ("+label+")"),(start+6,start+6,"بازرس خط ("+label+")")]))
locations=["شرکت","فرودگاه شهید هاشمی نژاد","راه آهن","پایانه مسافربری","شیرازی","باب الجواد","طبرسی","نواب صفوی"]
combined=[(73,88,"ناظر خطوط ثابت"),(89,97,"ناظر خطوط گردشی"),(98,107,"بازرس مناطق تاکسیرانی"),(108,109,"نظارت تصویری")]
title="صورت وضعیت اضافه‌کاری پرسنل مدیریت پیمان خطوط تاکسیرانی شهر مشهد مقدس"
if mode=="fixture":
    w=Workbook();s=w.active;s.title="Sheet1"
    s["A1"]=title+"\n (مهر 1405)";s["A1"].font=Font(bold=True,size=14);s.merge_cells("A1:J1")
    s.append(["ردیف","محل خدمت","سمت","ردیف","نام","نام خانوادگی","شماره پرسنلی","ساعت جمعه کاری (ارسالی)","ساعت تعطیل کاری (ارسالی)","ساعت اضافه کاری (ارسالی)"])
    for row in range(3,110):
        s.cell(row,1,row-2);s.cell(row,5,"SAMPLE");s.cell(row,7,"OLD")
        for col in range(8,11):s.cell(row,col,99)
    for (start,end,roles),location in zip(groups,locations):
        s.cell(start,2,location);s.merge_cells(start_row=start,end_row=end,start_column=2,end_column=2)
        for a,b,label in roles:
            s.cell(a,3,label)
            if a!=b:s.merge_cells(start_row=a,end_row=b,start_column=3,end_column=3)
            for row in range(a,b+1):s.cell(row,4,row-a+1)
    for a,b,label in combined:
        s.cell(a,2,label);s.merge_cells(start_row=a,end_row=b,start_column=2,end_column=3)
        for row in range(a,b+1):s.cell(row,4,row-a+1)
    s["A110"]="مجموع";s.merge_cells("A110:G110")
    for col in "HIJ":s[col+"110"]="=SUM("+col+"3:"+col+"109)"
    s["A112"].number_format="0";s.page_setup.orientation="portrait"
    assert len(s.merged_cells.ranges)==37
    w.save(source)
else:
    a=load_workbook(source).active;s=load_workbook(output).active
    assert s["A1"].value==title+"\n (آبان ۱۴۰۵)"
    assert copy(s["A1"].font)==copy(a["A1"].font)
    assert str(s.merged_cells)==str(a.merged_cells)
    assert s["G3"].value=="QA002" and s["G73"].value=="QA001"
    assert s["G4"].value is None and s["H4"].value is None
    assert s["H3"].comment.text=="جمعه ۱۲"
    for col in "HIJ":assert s[col+"110"].value==a[col+"110"].value
    assert s.page_setup.orientation=="portrait"
    assert "$J$"+str(s.max_row) in s.print_area
    allcells=[c.value for row in s for c in row]
    for i in range(1,5):assert allcells.count("QA%03d"%i)==1
    assert "OLD" not in allcells and "SAMPLE" not in allcells
    total=next(row for row in s if row[0].value=="مجموع کل ساعات")
    assert [total[i].value for i in (6,7,8)]==[11,6,11]
    print("Organization layout: 107 slots, 37 merges, period, totals and supplements verified")
