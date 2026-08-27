# -*- coding: utf-8 -*-
"""
نرم‌افزار پشتیبان‌گیری و مرور آفلاین سامانهٔ تاکسیرانی (مبین شات مشهد)
- اتصال به سرور، دانلود بکاپ کامل (JSON) + تصاویر
- ایمپورت در پایگاه‌دادهٔ محلی SQLite
- مرور کامل آفلاین: پرسنل، خطوط، رانندگان، گزارش‌ها، چک‌لیست‌ها، ترددها، تصاویر و ...

اجرا:  python taxi_backup.py
نیازمندی‌ها:  requests  (pip install requests)  — بقیه از کتابخانهٔ استاندارد پایتون است.
ساخت فایل اجراییِ ویندوز:  pyinstaller --onefile --noconsole taxi_backup.py
"""
import os, sys, json, sqlite3, threading, base64, datetime, traceback
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

try:
    import requests
except ImportError:
    requests = None

APP_DIR = os.path.join(os.path.expanduser("~"), "TaxiBackup")
os.makedirs(APP_DIR, exist_ok=True)
DB_PATH = os.path.join(APP_DIR, "taxi_offline.db")
MEDIA_DIR = os.path.join(APP_DIR, "media")
CFG_PATH = os.path.join(APP_DIR, "config.json")
os.makedirs(MEDIA_DIR, exist_ok=True)

# ---------- تنظیمات ذخیره‌شده ----------
def load_cfg():
    try:
        with open(CFG_PATH, encoding="utf-8") as f: return json.load(f)
    except Exception:
        return {"base_url": "https://app.yousefipour.ir", "token": ""}

def save_cfg(cfg):
    try:
        with open(CFG_PATH, "w", encoding="utf-8") as f: json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception: pass

# ---------- نگاشت نوع MySQL به SQLite ----------
def sqlite_type(mysql_type):
    t = (mysql_type or "").lower()
    if any(x in t for x in ["int", "bit", "bool"]): return "INTEGER"
    if any(x in t for x in ["double", "float", "decimal", "real"]): return "REAL"
    return "TEXT"

# ---------- ایمپورت بکاپ JSON در SQLite ----------
def import_backup_json(json_path, log=print):
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    tables = data.get("tables", {})
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    meta = data.get("meta", {})
    cur.execute("CREATE TABLE IF NOT EXISTS _backup_meta (k TEXT, v TEXT)")
    for k, v in meta.items():
        cur.execute("INSERT INTO _backup_meta(k,v) VALUES(?,?)", (k, str(v)))
    total_rows = 0
    for tname, tdef in tables.items():
        cols = tdef.get("columns", [])
        if not cols: continue
        col_defs = ", ".join(f'"{c["name"]}" {sqlite_type(c.get("type"))}' for c in cols)
        cur.execute(f'DROP TABLE IF EXISTS "{tname}"')
        cur.execute(f'CREATE TABLE "{tname}" ({col_defs})')
        col_names = [c["name"] for c in cols]
        placeholders = ",".join("?" * len(col_names))
        rows = tdef.get("rows", [])
        if rows:
            cur.executemany(
                f'INSERT INTO "{tname}" ({",".join(chr(34)+c+chr(34) for c in col_names)}) VALUES ({placeholders})',
                rows
            )
        total_rows += len(rows)
        log(f"  جدول {tname}: {len(rows)} ردیف")
    con.commit()
    con.close()
    log(f"✓ ایمپورت کامل شد. مجموع {total_rows} ردیف در {len(tables)} جدول.")
    return total_rows, len(tables)

# ---------- لایهٔ دادهٔ آفلاین ----------
class OfflineDB:
    def __init__(self, path=DB_PATH):
        self.path = path
    def conn(self):
        c = sqlite3.connect(self.path)
        c.row_factory = sqlite3.Row
        return c
    def tables(self):
        try:
            with self.conn() as c:
                rows = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name").fetchall()
                return [r[0] for r in rows]
        except Exception:
            return []
    def query(self, sql, args=()):
        with self.conn() as c:
            return [dict(r) for r in c.execute(sql, args).fetchall()]
    def columns(self, table):
        try:
            with self.conn() as c:
                return [r[1] for r in c.execute(f'PRAGMA table_info("{table}")').fetchall()]
        except Exception:
            return []
    def count(self, table):
        try:
            with self.conn() as c:
                return c.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        except Exception:
            return 0
    def meta(self):
        try:
            with self.conn() as c:
                return {r[0]: r[1] for r in c.execute("SELECT k,v FROM _backup_meta").fetchall()}
        except Exception:
            return {}

# ---------- رابط کاربری ----------
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("سامانهٔ تاکسیرانی — پشتیبان و مرور آفلاین")
        self.geometry("1180x720")
        self.cfg = load_cfg()
        self.db = OfflineDB()
        self._build_style()
        self._build_ui()
        self.refresh_status()

    def _build_style(self):
        style = ttk.Style(self)
        try: style.theme_use("clam")
        except Exception: pass
        style.configure(".", font=("Tahoma", 10))
        style.configure("Treeview", rowheight=26, font=("Tahoma", 9))
        style.configure("Treeview.Heading", font=("Tahoma", 9, "bold"))
        style.configure("Accent.TButton", font=("Tahoma", 10, "bold"))

    def _build_ui(self):
        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True)
        self.tab_sync = ttk.Frame(nb); nb.add(self.tab_sync, text="  دریافت پشتیبان  ")
        self.tab_browse = ttk.Frame(nb); nb.add(self.tab_browse, text="  مرور داده‌ها  ")
        self.tab_media = ttk.Frame(nb); nb.add(self.tab_media, text="  تصاویر  ")
        self._build_sync_tab()
        self._build_browse_tab()
        self._build_media_tab()

    # ---- تب دریافت پشتیبان ----
    def _build_sync_tab(self):
        f = self.tab_sync
        top = ttk.LabelFrame(f, text="اتصال به سرور")
        top.pack(fill="x", padx=12, pady=10)
        ttk.Label(top, text="آدرس سرور:").grid(row=0, column=3, sticky="e", padx=6, pady=6)
        self.ent_url = ttk.Entry(top, width=42, justify="left")
        self.ent_url.insert(0, self.cfg.get("base_url", "")); self.ent_url.grid(row=0, column=2, padx=6, pady=6)
        ttk.Label(top, text="توکن ادمین:").grid(row=1, column=3, sticky="e", padx=6, pady=6)
        self.ent_token = ttk.Entry(top, width=42, justify="left", show="•")
        self.ent_token.insert(0, self.cfg.get("token", "")); self.ent_token.grid(row=1, column=2, padx=6, pady=6)
        ttk.Label(top, text="(توکن را از مرورگرِ پنل — بخش ذخیره‌شده — کپی کنید)",
                  foreground="#777").grid(row=2, column=2, columnspan=2, sticky="e", padx=6)

        self.var_light = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="حالت سبک (بدون تصاویر داخل دیتابیس — سریع‌تر)",
                        variable=self.var_light).grid(row=3, column=2, columnspan=2, sticky="e", padx=6, pady=4)
        self.var_media = tk.BooleanVar(value=True)
        ttk.Checkbutton(top, text="دانلود فایل‌های تصویر (آلبوم رسانه)",
                        variable=self.var_media).grid(row=4, column=2, columnspan=2, sticky="e", padx=6, pady=2)

        btns = ttk.Frame(f); btns.pack(fill="x", padx=12)
        ttk.Button(btns, text="⬇ دریافت و ایمپورت پشتیبان از سرور", style="Accent.TButton",
                   command=self.do_download).pack(side="right", padx=4, pady=6)
        ttk.Button(btns, text="📂 ایمپورت از فایل JSON محلی",
                   command=self.do_import_local).pack(side="right", padx=4, pady=6)
        ttk.Button(btns, text="💾 ذخیرهٔ تنظیمات اتصال",
                   command=self.save_conn).pack(side="right", padx=4, pady=6)

        self.lbl_status = ttk.Label(f, text="", foreground="#0a6", font=("Tahoma", 10, "bold"))
        self.lbl_status.pack(anchor="e", padx=14, pady=4)

        logf = ttk.LabelFrame(f, text="گزارش عملیات")
        logf.pack(fill="both", expand=True, padx=12, pady=8)
        self.txt_log = tk.Text(logf, height=14, wrap="word", font=("Consolas", 9))
        self.txt_log.pack(fill="both", expand=True, side="left")
        sb = ttk.Scrollbar(logf, command=self.txt_log.yview); sb.pack(side="right", fill="y")
        self.txt_log.config(yscrollcommand=sb.set)

    def log(self, msg):
        self.txt_log.insert("end", str(msg) + "\n"); self.txt_log.see("end"); self.update_idletasks()

    def save_conn(self):
        self.cfg["base_url"] = self.ent_url.get().strip().rstrip("/")
        self.cfg["token"] = self.ent_token.get().strip()
        save_cfg(self.cfg)
        messagebox.showinfo("ذخیره شد", "تنظیمات اتصال ذخیره شد.")

    def refresh_status(self):
        meta = self.db.meta()
        if meta:
            self.lbl_status.config(
                text=f"پشتیبان موجود: {meta.get('generated_at','?')} | نسخهٔ سایت: {meta.get('site_version','?')}",
                foreground="#0a6")
        else:
            self.lbl_status.config(text="هنوز پشتیبانی ایمپورت نشده است.", foreground="#c33")

    def do_download(self):
        if requests is None:
            messagebox.showerror("خطا", "کتابخانهٔ requests نصب نیست.\nدر CMD اجرا کنید:\npip install requests")
            return
        self.save_conn()
        threading.Thread(target=self._download_worker, daemon=True).start()

    def _download_worker(self):
        try:
            base = self.cfg["base_url"]; token = self.cfg["token"]
            if not base or not token:
                self.log("✗ آدرس سرور و توکن الزامی است."); return
            headers = {"Authorization": "Bearer " + token}
            light = "1" if self.var_light.get() else "0"
            url = f"{base}/api/admin/backup-json?light={light}"
            self.log(f"در حال دریافت پشتیبان از:\n{url}")
            r = requests.get(url, headers=headers, timeout=900, stream=True)
            if r.status_code != 200:
                self.log(f"✗ خطای سرور: {r.status_code} — {r.text[:200]}"); return
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            jpath = os.path.join(APP_DIR, f"backup_{ts}.json")
            total = 0
            with open(jpath, "wb") as f:
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk: f.write(chunk); total += len(chunk)
            self.log(f"✓ دانلود شد ({total//1024} کیلوبایت). در حال ایمپورت…")
            import_backup_json(jpath, self.log)
            if self.var_media.get():
                self._download_media(base, headers)
            self.log("✅ پشتیبان‌گیری کامل شد.")
            self.after(0, self.refresh_status)
            self.after(0, self.populate_tables)
            self.after(0, self.populate_media)
        except Exception as e:
            self.log("✗ خطا: " + str(e)); self.log(traceback.format_exc())

    def _download_media(self, base, headers):
        try:
            self.log("در حال دریافت فهرست تصاویر…")
            r = requests.get(f"{base}/api/admin/backup-media-list", headers=headers, timeout=120)
            if r.status_code != 200:
                self.log("  (فهرست تصاویر در دسترس نیست)"); return
            files = r.json().get("files", [])
            self.log(f"  {len(files)} فایل تصویر یافت شد. در حال دانلود…")
            ok = 0
            for i, fl in enumerate(files, 1):
                rel = fl["path"]
                dest = os.path.join(MEDIA_DIR, rel.replace("/", os.sep))
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                if os.path.exists(dest) and os.path.getsize(dest) == fl.get("size", -1):
                    ok += 1; continue
                try:
                    fr = requests.get(f"{base}/api/media?path={rel}", headers=headers, timeout=60)
                    if fr.status_code == 200:
                        with open(dest, "wb") as wf: wf.write(fr.content); ok += 1
                except Exception:
                    pass
                if i % 25 == 0: self.log(f"  … {i}/{len(files)}")
            self.log(f"✓ {ok} فایل تصویر ذخیره شد در: {MEDIA_DIR}")
        except Exception as e:
            self.log("  خطا در دانلود تصاویر: " + str(e))

    def do_import_local(self):
        path = filedialog.askopenfilename(title="انتخاب فایل پشتیبان JSON",
                                          filetypes=[("JSON", "*.json"), ("همه", "*.*")])
        if not path: return
        def work():
            try:
                self.log(f"ایمپورت از: {path}")
                import_backup_json(path, self.log)
                self.after(0, self.refresh_status); self.after(0, self.populate_tables)
            except Exception as e:
                self.log("✗ خطا: " + str(e))
        threading.Thread(target=work, daemon=True).start()

    # ---- تب مرور داده‌ها ----
    def _build_browse_tab(self):
        f = self.tab_browse
        left = ttk.Frame(f); left.pack(side="right", fill="y", padx=(0, 6), pady=8)
        ttk.Label(left, text="جدول‌ها:", font=("Tahoma", 10, "bold")).pack(anchor="e", padx=6)
        self.lst_tables = tk.Listbox(left, width=28, font=("Tahoma", 9))
        self.lst_tables.pack(fill="y", expand=True, padx=6, pady=4)
        self.lst_tables.bind("<<ListboxSelect>>", self.on_table_select)

        right = ttk.Frame(f); right.pack(side="right", fill="both", expand=True, pady=8)
        searchf = ttk.Frame(right); searchf.pack(fill="x", padx=6)
        ttk.Label(searchf, text="جستجو:").pack(side="right", padx=4)
        self.ent_search = ttk.Entry(searchf, width=30)
        self.ent_search.pack(side="right", padx=4)
        self.ent_search.bind("<Return>", lambda e: self.on_table_select())
        ttk.Button(searchf, text="🔍", width=4, command=self.on_table_select).pack(side="right")
        self.lbl_count = ttk.Label(searchf, text="", foreground="#06a")
        self.lbl_count.pack(side="left", padx=8)

        tf = ttk.Frame(right); tf.pack(fill="both", expand=True, padx=6, pady=6)
        self.tree = ttk.Treeview(tf, show="headings")
        vs = ttk.Scrollbar(tf, orient="vertical", command=self.tree.yview)
        hs = ttk.Scrollbar(tf, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vs.set, xscrollcommand=hs.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        vs.grid(row=0, column=1, sticky="ns"); hs.grid(row=1, column=0, sticky="ew")
        tf.rowconfigure(0, weight=1); tf.columnconfigure(0, weight=1)
        self.populate_tables()

    # نام‌های فارسی برای جدول‌های پرکاربرد
    TABLE_FA = {
        "users": "کاربران/پرسنل", "drivers": "رانندگان", "vehicles": "خودروها",
        "lines": "خطوط", "bills": "آبونمان", "reports": "گزارش‌ها",
        "checklist_submissions": "چک‌لیست‌ها", "staff_attendance": "تردد پرسنل",
        "attendances": "حضور رانندگان", "notices": "تذکرها", "requests": "درخواست‌ها",
        "official_visits": "حضور مسئولین", "user_commitments": "تعهدات انضباطی",
        "temp_line_drivers": "رانندگان موقت", "shifts": "شیفت‌ها",
        "holidays": "تعطیلات", "zones": "مناطق", "app_settings": "تنظیمات سایت",
        "covert_selfies": "سلفی‌های نامحسوس", "sms_log": "تاریخچهٔ پیامک",
    }

    def populate_tables(self):
        self.lst_tables.delete(0, "end")
        self._table_names = self.db.tables()
        for t in self._table_names:
            fa = self.TABLE_FA.get(t, "")
            label = f"{fa} ({t}) — {self.db.count(t)}" if fa else f"{t} — {self.db.count(t)}"
            self.lst_tables.insert("end", label)

    def on_table_select(self, event=None):
        sel = self.lst_tables.curselection()
        if not sel: return
        table = self._table_names[sel[0]]
        cols = self.db.columns(table)
        # ستون‌های تصویری حجیم را پنهان کن
        hide = {"attachment_data", "photo_data", "selfie", "vehicles_photo", "selfie_data", "photo", "html", "polygon"}
        show_cols = [c for c in cols if c not in hide]
        q = self.ent_search.get().strip()
        sql = f'SELECT * FROM "{table}"'
        args = ()
        if q:
            like = " OR ".join(f'"{c}" LIKE ?' for c in show_cols)
            sql += f" WHERE {like}"
            args = tuple(f"%{q}%" for _ in show_cols)
        sql += " LIMIT 2000"
        try:
            rows = self.db.query(sql, args)
        except Exception as e:
            rows = []; self.log(str(e))
        self.lbl_count.config(text=f"{len(rows)} ردیف (حداکثر ۲۰۰۰)")
        self.tree.delete(*self.tree.get_children())
        self.tree["columns"] = show_cols
        for c in show_cols:
            self.tree.heading(c, text=c)
            self.tree.column(c, width=120, anchor="e", stretch=False)
        for r in rows:
            vals = []
            for c in show_cols:
                v = r.get(c)
                v = "" if v is None else str(v)
                if len(v) > 80: v = v[:80] + "…"
                vals.append(v)
            self.tree.insert("", "end", values=vals)

    # ---- تب تصاویر ----
    def _build_media_tab(self):
        f = self.tab_media
        bar = ttk.Frame(f); bar.pack(fill="x", padx=10, pady=8)
        ttk.Label(bar, text="پوشهٔ تصاویر:").pack(side="right", padx=4)
        self.lbl_media_dir = ttk.Label(bar, text=MEDIA_DIR, foreground="#06a")
        self.lbl_media_dir.pack(side="right", padx=4)
        ttk.Button(bar, text="📂 باز کردن پوشه", command=self.open_media_folder).pack(side="left", padx=4)
        ttk.Button(bar, text="🔄 به‌روزرسانی", command=self.populate_media).pack(side="left", padx=4)
        self.lst_media = tk.Listbox(f, font=("Consolas", 9))
        self.lst_media.pack(fill="both", expand=True, padx=10, pady=6)
        self.populate_media()

    def open_media_folder(self):
        try:
            if sys.platform.startswith("win"): os.startfile(MEDIA_DIR)
            elif sys.platform == "darwin": os.system(f'open "{MEDIA_DIR}"')
            else: os.system(f'xdg-open "{MEDIA_DIR}"')
        except Exception as e:
            messagebox.showerror("خطا", str(e))

    def populate_media(self):
        self.lst_media.delete(0, "end")
        cnt = 0
        for root, _, files in os.walk(MEDIA_DIR):
            for fn in files:
                rel = os.path.relpath(os.path.join(root, fn), MEDIA_DIR)
                sz = os.path.getsize(os.path.join(root, fn))
                self.lst_media.insert("end", f"{rel}   ({sz//1024} KB)")
                cnt += 1
        self.lst_media.insert(0, f"— مجموع {cnt} فایل —")


if __name__ == "__main__":
    try:
        app = App()
        app.mainloop()
    except Exception as e:
        try:
            messagebox.showerror("خطای اجرا", str(e) + "\n\n" + traceback.format_exc())
        except Exception:
            print("خطا:", e); traceback.print_exc()
