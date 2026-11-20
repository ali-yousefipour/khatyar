import datetime
import hashlib
import json
import os
import re
from pathlib import Path

bundle = Path("php/app/assets/panel.bundle.js")
raw = bundle.read_bytes()
source = raw.decode("utf-8")
# Decode escaped Unicode only for textual assertions, never modify the bundle.
decoded = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m[1], 16)), source)
for marker in ("WorkTemplateControls", "/admin/shift-report/templates",
               "مدیریت قالب‌ها", "قالب گزارش کارکرد", "پیش‌نمایش جانمایی", "/preview-batch", "data-kh-slot", "onPointerMove"):
    if marker not in decoded:
        raise SystemExit(f"Missing compiled feature marker: {marker}")
    print(f"Verified compiled marker: {marker}")
digest = hashlib.sha256(raw).hexdigest()
html = Path("php/app/panel.html")
text = html.read_text(encoding="utf-8")
pattern = r"""(<script\b[^>]*\bsrc=["'][^"']*?panel\.bundle\.js)(?:\?v=[^"'\s<>]+)?(?=["'])"""
text, count = re.subn(pattern, lambda m: m.group(1) + "?v=" + digest[:16], text, flags=re.I)
if count != 1:
    raise SystemExit(f"Expected exactly one panel script reference; found {count}")
html.write_text(text, encoding="utf-8")
Path("build-manifest.json").write_text(json.dumps({
    "source_sha": os.environ["GITHUB_SHA"],
    "bundle_sha256": digest,
    "built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "asset_version": digest[:16],
    "syntax_validation": "passed",
}, indent=2), encoding="utf-8")
print("Verified bundle SHA-256:", digest)
