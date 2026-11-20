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
for filename in ['react/react.production.min.js','react/react-dom.production.min.js','xlsx/xlsx.full.min.js','leaflet/leaflet.js','leaflet-draw/leaflet.draw.js']:
    assert 'vendor/'+filename in panel, filename
assert panel.index('react/react.production.min.js')<panel.index('react/react-dom.production.min.js')
print('PASS local runtime references and React dependency order')

# Vendor scripts must execute in document order before the deferred app modules.
scripts=re.findall(r'<script\b[^>]*>',panel,re.I)
vendor=[tag for tag in scripts if re.search(r'src="\/?vendor/',tag)]
assert len(vendor)==5
assert not any('chartjs/' in tag for tag in vendor)
source=Path('php/tools/panel_source.jsx').read_text(encoding='utf-8')
assert "script.src='vendor/chartjs/chart.umd.min.js'" in source
assert source.count('return khMountChart(()=>[')==5
assert 'if(!active)return;' in source
assert 'if(chart)chart.destroy()' in source
assert (root/'vendor/chartjs/chart.umd.min.js').is_file()
assert all(re.search(r'\bdefer\b',tag) and not re.search(r'\basync\b',tag) for tag in vendor)
assert panel.index('leaflet/leaflet.js')<panel.index('leaflet-draw/leaflet.draw.js')<panel.index('assets/panel.bundle.js')
print('PASS deferred vendor order')
