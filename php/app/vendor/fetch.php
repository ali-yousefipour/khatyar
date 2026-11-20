<?php
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
foreach (['react/react.production.min.js','react/react-dom.production.min.js','xlsx/xlsx.full.min.js','leaflet/leaflet.js','leaflet-draw/leaflet.draw.js','chartjs/chart.umd.min.js','vazirmatn/Vazirmatn-font-face.css','estedad/estedad.css'] as $file) {
 if (!is_file(__DIR__.'/'.$file) || filesize(__DIR__.'/'.$file)<100) { http_response_code(503); exit('PARTIAL'); }
}
echo 'READY';
