from pathlib import Path
import re
root=Path('php/app')
pages=['panel.html','app.html','landing.html','line-location.html','public-form.html','assets/login-accurate.css']
for filename in pages:
    text=(root/filename).read_text(encoding='utf-8')
    for match in re.finditer(r'<(?:script|link)\b[^>]*>|@import\s+[^;]+;',text,re.I):
        if re.search(r'https?://(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)',match.group(),re.I):
            raise SystemExit('External runtime dependency in '+filename)
panel=(root/'panel.html').read_text(encoding='utf-8')
for filename in ['react/react.production.min.js','react/react-dom.production.min.js','xlsx/xlsx.full.min.js','leaflet/leaflet.js','leaflet-draw/leaflet.draw.js','chartjs/chart.umd.min.js']:
    assert 'vendor/'+filename in panel, filename
assert panel.index('react/react.production.min.js')<panel.index('react/react-dom.production.min.js')
print('PASS local runtime references and React dependency order')
