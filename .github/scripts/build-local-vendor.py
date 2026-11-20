import pathlib, re, sys, urllib.request, urllib.parse
root=pathlib.Path(sys.argv[1])
def get(url):
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36'})
    with urllib.request.urlopen(request,timeout=45) as response:
        if response.status!=200 or urllib.parse.urlsplit(response.url).scheme!='https': raise ValueError(url)
        data=response.read()
    if len(data)<100 or data.lstrip().lower().startswith((b'<!doctype',b'<html')): raise ValueError('Invalid dependency: '+url)
    return data
def save(path,data):
    p=root/path
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_bytes(data)
files={
'react/react.production.min.js':'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
'react/react-dom.production.min.js':'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
'xlsx/xlsx.full.min.js':'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
'chartjs/chart.umd.min.js':'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
'leaflet/leaflet.js':'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
'leaflet/leaflet.css':'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
'leaflet-draw/leaflet.draw.js':'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js',
'leaflet-draw/leaflet.draw.css':'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css',
}
for name in ['marker-icon.png','marker-icon-2x.png','marker-shadow.png','layers.png','layers-2x.png']:
    files['leaflet/images/'+name]='https://unpkg.com/leaflet@1.9.4/dist/images/'+name
for name in ['spritesheet.png','spritesheet-2x.png','spritesheet.svg']:
    files['leaflet-draw/images/'+name]='https://unpkg.com/leaflet-draw@1.0.4/dist/images/'+name
for path,url in files.items(): save(path,get(url))
def font_css(path,url):
    css=get(url).decode('utf-8')
    parent=pathlib.PurePosixPath(path).parent
    seen={}
    def replace(m):
        raw=m.group(1).strip(' "\'')
        if raw.startswith('data:'): return m.group(0)
        absolute=urllib.parse.urljoin(url,raw)
        if absolute not in seen:
            ext=pathlib.PurePosixPath(urllib.parse.urlsplit(absolute).path).suffix
            if ext not in ['.woff2','.woff','.ttf','.otf']: raise ValueError('Unexpected font asset '+absolute)
            name='fonts/font-'+str(len(seen))+ext
            data=get(absolute)
            if data[:4] not in (b'wOF2',b'wOFF',b'\x00\x01\x00\x00',b'OTTO'): raise ValueError('Invalid font bytes')
            save(str(parent/name),data)
            seen[absolute]=name
        return 'url("'+seen[absolute]+'")'
    css=re.sub(r'url\(([^)]+)\)',replace,css)
    if not seen or '@font-face' not in css or re.search(r'@import|url\(["\']?https?://',css,re.I): raise ValueError('Incomplete local font CSS')
    save(path,css.encode())
font_css('vazirmatn/Vazirmatn-font-face.css','https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css')
font_css('estedad/estedad.css','https://fonts.googleapis.com/css2?family=Estedad:wght@400;500;600;700;800;900&display=swap')
