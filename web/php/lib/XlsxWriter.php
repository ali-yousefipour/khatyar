<?php
/**
 * نویسندهٔ سبک فایل XLSX (بدون نیاز به کتابخانهٔ خارجی مثل PhpSpreadsheet).
 * فقط از افزونهٔ ZipArchive استفاده می‌کند (که برای این پروژه از قبل الزامی است).
 * قابلیت اصلی نسبت به CSV: امکان درج واقعی تصویر (عکس پرسنلی / امضا) داخل سلول‌های اکسل.
 *
 * استفاده:
 *   $xw = new XlsxWriter(['شناسه','نام', ...]);
 *   $xw->setColWidth(0, 8);
 *   $xw->setImageColWidth(2, 14); // ستون تصویر، عریض‌تر
 *   $row = $xw->addRow(['۱','علی', '']); // سلول تصویر خالی می‌ماند، بعداً تصویر رویش می‌نشیند
 *   $xw->setImage($row, 2, $jpegBytes);
 *   $xw->output('اطلاعات_کاربران.xlsx');
 */
class XlsxWriter {
  private $headers;
  private $rows = [];
  private $colWidths = [];   // colIdx(0-based) => width (کاراکتر)
  private $images = [];      // rowIdx(0-based داده، بدون سرستون) => [colIdx => ['data'=>bytes,'w'=>px,'h'=>px]]
  private $imageRowIdx = []; // ردیف‌هایی که حاوی تصویر هستند => ارتفاع لازم (pt)

  function __construct(array $headers) { $this->headers = array_values($headers); }

  function setColWidth($idx, $chars) { $this->colWidths[$idx] = $chars; }

  /** یک ردیف دادهٔ متنی/عددی اضافه می‌کند و شمارهٔ ردیف (0-based، بدون احتساب سرستون) را برمی‌گرداند. */
  function addRow(array $cells) { $this->rows[] = array_values($cells); return count($this->rows) - 1; }

  /**
   * یک تصویر را در سلول مشخص‌شده جاسازی می‌کند (تصویر واقعی درون اکسل، نه لینک).
   * $bytes باید بایت خام تصویر باشد (jpeg/png). در صورت وجود GD، برای یکنواختی به JPEG تبدیل می‌شود.
   */
  function setImage($rowIdx, $colIdx, $bytes, $maxBoxPx = 90) {
    if (!$bytes) return;
    $w = $h = $maxBoxPx; $jpeg = $bytes; $ext = 'jpeg';
    if (function_exists('imagecreatefromstring')) {
      $img = @imagecreatefromstring($bytes);
      if ($img !== false) {
        $ow = imagesx($img); $oh = imagesy($img);
        if ($ow > 0 && $oh > 0) {
          $scale = min($maxBoxPx / $ow, $maxBoxPx / $oh, 1);
          $w = max(1, (int)round($ow * $scale)); $h = max(1, (int)round($oh * $scale));
        }
        // پس‌زمینهٔ سفید (برای PNGهای شفاف مثل امضا) + خروجی یکدست JPEG
        ob_start();
        $canvas = imagecreatetruecolor(max($ow,1), max($oh,1));
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $ow, $oh, $white);
        imagecopy($canvas, $img, 0, 0, 0, 0, $ow, $oh);
        imagejpeg($canvas, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($canvas); imagedestroy($img);
      }
    }
    $this->images[$rowIdx][$colIdx] = ['data' => $jpeg, 'w' => $w, 'h' => $h, 'ext' => $ext];
    $ptHeight = max(20, round($h * 0.8));
    if (!isset($this->imageRowIdx[$rowIdx]) || $this->imageRowIdx[$rowIdx] < $ptHeight) $this->imageRowIdx[$rowIdx] = $ptHeight;
  }

  private static function colLetter($idx) {
    $s = '';
    $idx++;
    while ($idx > 0) { $m = ($idx - 1) % 26; $s = chr(65 + $m) . $s; $idx = intdiv($idx - 1, 26); }
    return $s;
  }
  private static function xmlEsc($v) {
    return htmlspecialchars((string)$v, ENT_QUOTES | ENT_XML1, 'UTF-8');
  }

  function output($filename, $sheetName = 'Sheet1') {
    $tmp = tempnam(sys_get_temp_dir(), 'xlsx_');
    $zip = new ZipArchive();
    $zip->open($tmp, ZipArchive::OVERWRITE);

    $zip->addFromString('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'.
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'.
      '<Default Extension="xml" ContentType="application/xml"/>'.
      '<Default Extension="jpeg" ContentType="image/jpeg"/>'.
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'.
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'.
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'.
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'.
      '</Types>');

    $zip->addFromString('_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'.
      '</Relationships>');

    $zip->addFromString('xl/workbook.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'.
      '<sheets><sheet name="'.self::xmlEsc(mb_substr($sheetName,0,31)).'" sheetId="1" r:id="rId1"/></sheets>'.
      '</workbook>');

    $zip->addFromString('xl/_rels/workbook.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'.
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'.
      '</Relationships>');

    $zip->addFromString('xl/styles.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'.
      '<fonts count="2"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font></fonts>'.
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'.
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'.
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'.
      '<cellXfs count="2">'.
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'.
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'.
      '</cellXfs>'.
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'.
      '</styleSheet>');

    // ---------- worksheet ----------
    $cols = '<cols>';
    $maxCol = count($this->headers);
    for ($c = 0; $c < $maxCol; $c++) {
      $w = $this->colWidths[$c] ?? 14;
      $cols .= '<col min="'.($c+1).'" max="'.($c+1).'" width="'.$w.'" customWidth="1"/>';
    }
    $cols .= '</cols>';

    $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'.
      '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>'.
      $cols.'<sheetData>';

    // سرستون
    $sheetXml .= '<row r="1" ht="20" customHeight="1">';
    foreach ($this->headers as $c => $h) {
      $sheetXml .= '<c r="'.self::colLetter($c).'1" s="1" t="inlineStr"><is><t xml:space="preserve">'.self::xmlEsc($h).'</t></is></c>';
    }
    $sheetXml .= '</row>';

    foreach ($this->rows as $ri => $row) {
      $excelRow = $ri + 2; // ردیف ۱ = سرستون
      $ht = isset($this->imageRowIdx[$ri]) ? ' ht="'.$this->imageRowIdx[$ri].'" customHeight="1"' : '';
      $sheetXml .= '<row r="'.$excelRow.'"'.$ht.'>';
      foreach ($row as $c => $v) {
        if (is_numeric($v) && $v !== '' && !preg_match('/^0\d/', (string)$v)) {
          $sheetXml .= '<c r="'.self::colLetter($c).$excelRow.'"><v>'.self::xmlEsc($v).'</v></c>';
        } else {
          $sheetXml .= '<c r="'.self::colLetter($c).$excelRow.'" t="inlineStr"><is><t xml:space="preserve">'.self::xmlEsc($v).'</t></is></c>';
        }
      }
      $sheetXml .= '</row>';
    }
    $sheetXml .= '</sheetData>';
    if ($this->images) $sheetXml .= '<drawing r:id="rIdDrawing1"/>';
    $sheetXml .= '</worksheet>';
    $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

    if ($this->images) {
      $zip->addFromString('xl/worksheets/_rels/sheet1.xml.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
        '<Relationship Id="rIdDrawing1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'.
        '</Relationships>');

      $anchors = ''; $mediaRels = ''; $n = 0;
      foreach ($this->images as $rowIdx => $cols2) {
        foreach ($cols2 as $colIdx => $img) {
          $n++;
          $mediaFile = 'image'.$n.'.jpeg';
          $zip->addFromString('xl/media/'.$mediaFile, $img['data']);
          $rid = 'rIdImg'.$n;
          $mediaRels .= '<Relationship Id="'.$rid.'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/'.$mediaFile.'"/>';
          $excelRow0 = $rowIdx + 1; // 0-based (ردیف داده پس از سرستون؛ سرستون=index0)
          $cx = max(1, $img['w']) * 9525; $cy = max(1, $img['h']) * 9525;
          $anchors .=
            '<xdr:oneCellAnchor>'.
              '<xdr:from><xdr:col>'.$colIdx.'</xdr:col><xdr:colOff>19050</xdr:colOff><xdr:row>'.$excelRow0.'</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from>'.
              '<xdr:ext cx="'.$cx.'" cy="'.$cy.'"/>'.
              '<xdr:pic>'.
                '<xdr:nvPicPr><xdr:cNvPr id="'.($n+1).'" name="img'.$n.'"/><xdr:cNvPicPr/></xdr:nvPicPr>'.
                '<xdr:blipFill><a:blip r:embed="'.$rid.'"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'.
                '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'.$cx.'" cy="'.$cy.'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'.
              '</xdr:pic>'.
              '<xdr:clientData/>'.
            '</xdr:oneCellAnchor>';
        }
      }
      $zip->addFromString('xl/drawings/drawing1.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
        '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'.
        $anchors.
        '</xdr:wsDr>');
      $zip->addFromString('xl/drawings/_rels/drawing1.xml.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
        $mediaRels.
        '</Relationships>');
    }

    $zip->close();

    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="'.$filename.'"');
    header('Content-Length: '.filesize($tmp));
    readfile($tmp);
    @unlink($tmp);
    exit;
  }
}
