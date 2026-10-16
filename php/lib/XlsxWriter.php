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
  private $comments = [];
  private $rows = [];
  private $colWidths = [];   // colIdx(0-based) => width (کاراکتر)
  private $textCols = [];    // colIdx(0-based) => force values to remain text (IDs/codes with leading zeros)
  private $images = [];      // rowIdx(0-based داده، بدون سرستون) => [colIdx => ['data'=>bytes,'w'=>px,'h'=>px]]
  private $imageRowIdx = []; // ردیف‌هایی که حاوی تصویر هستند => ارتفاع لازم (pt)
  private $professionalStyle = false;
  private $reportHeading = null;

  function __construct(array $headers) { $this->headers = array_values($headers); }

  function setColWidth($idx, $chars) { $this->colWidths[$idx] = $chars; }
  function setTextCol($idx) { $this->textCols[$idx] = true; }
  /** Add an Excel note to a data cell (zero-based row and column). */
  function setComment($rowIdx,$colIdx,$text){ $this->comments[$rowIdx][$colIdx]=(string)$text; }

  /** قالب خواناتر ویژهٔ خروجی‌های مدیریتی: سرستون رنگی، ردیف‌های راه‌راه، فیلتر و تثبیت سرستون. */
  function setProfessionalStyle($enabled = true) { $this->professionalStyle = (bool)$enabled; }
  function setReportHeading($title, $subtitle, $summary) { $this->reportHeading = [(string)$title,(string)$subtitle,(string)$summary]; }

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
      ($this->comments ? '<Override PartName="/xl/comments1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>' : '').
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
      ($this->reportHeading ? '<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">&apos;'.self::xmlEsc(str_replace("'","''",mb_substr($sheetName,0,31))).'&apos;!$1:$4</definedName></definedNames>' : '').
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
      '<fonts count="4"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Tahoma"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="18"/><name val="Tahoma"/></font></fonts>'.
      '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF087F5B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F8F4"/><bgColor indexed="64"/></patternFill></fill></fills>'.
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7E5DE"/></left><right style="thin"><color rgb="FFD7E5DE"/></right><top style="thin"><color rgb="FFD7E5DE"/></top><bottom style="thin"><color rgb="FFD7E5DE"/></bottom><diagonal/></border></borders>'.
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'.
      '<cellXfs count="9">'.
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'.
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'.
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'.
      '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'.
      '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'.
      '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>'.
      '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>'.
      '<xf numFmtId="3" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf>'.
      '<xf numFmtId="3" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf>'.
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

    $headerRow = $this->reportHeading ? 4 : 1;
    $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'.
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'.
      ($this->reportHeading ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : '').
      '<sheetViews><sheetView rightToLeft="1" workbookViewId="0">'.($this->professionalStyle ? '<pane ySplit="'.$headerRow.'" topLeftCell="A'.($headerRow+1).'" activePane="bottomLeft" state="frozen"/>' : '').'</sheetView></sheetViews>'.
      $cols.'<sheetData>';
    if ($this->reportHeading) foreach ($this->reportHeading as $index=>$line) {
      $sheetXml .= '<row r="'.($index+1).'" ht="'.($index===0?40:30).'" customHeight="1"><c r="A'.($index+1).'" s="'.($index===0?5:6).'" t="inlineStr"><is><t xml:space="preserve">'.self::xmlEsc($line).'</t></is></c></row>';
    }

    // سرستون
    $headerHeight = $this->professionalStyle ? '34' : '20';
    $sheetXml .= '<row r="'.$headerRow.'" ht="'.$headerHeight.'" customHeight="1">';
    foreach ($this->headers as $c => $h) {
      $sheetXml .= '<c r="'.self::colLetter($c).$headerRow.'" s="'.($this->professionalStyle ? '3' : '1').'" t="inlineStr"><is><t xml:space="preserve">'.self::xmlEsc($h).'</t></is></c>';
    }
    $sheetXml .= '</row>';

    foreach ($this->rows as $ri => $row) {
      $excelRow = $ri + $headerRow + 1;
      $ht = isset($this->imageRowIdx[$ri]) ? ' ht="'.$this->imageRowIdx[$ri].'" customHeight="1"' : '';
      if (!$ht && $this->reportHeading) $ht = ' ht="28" customHeight="1"';
      $sheetXml .= '<row r="'.$excelRow.'"'.$ht.'>';
      foreach ($row as $c => $v) {
        if (is_numeric($v) && $v !== '' && empty($this->textCols[$c]) && !preg_match('/^0\d/', (string)$v)) {
        $cellStyle = $this->professionalStyle ? (($ri % 2) ? '4' : '2') : '0';
        if ($this->reportHeading) $cellStyle = ($ri % 2) ? '8' : '7';
        $sheetXml .= '<c r="'.self::colLetter($c).$excelRow.'"'.($cellStyle !== '0' ? ' s="'.$cellStyle.'"' : '').'><v>'.self::xmlEsc($v).'</v></c>';
        } else {
        $cellStyle = $this->professionalStyle ? (($ri % 2) ? '4' : '2') : '0';
        $sheetXml .= '<c r="'.self::colLetter($c).$excelRow.'"'.($cellStyle !== '0' ? ' s="'.$cellStyle.'"' : '').' t="inlineStr"><is><t xml:space="preserve">'.self::xmlEsc($v).'</t></is></c>';
        }
      }
      $sheetXml .= '</row>';
    }
    $sheetXml .= '</sheetData>';
    if ($this->professionalStyle && $maxCol > 0 && count($this->rows) > 0) $sheetXml .= '<autoFilter ref="A'.$headerRow.':'.self::colLetter($maxCol-1).(count($this->rows)+$headerRow).'"/>';
    if ($this->reportHeading && $maxCol>0) {
      $sheetXml .= '<mergeCells count="3">';
      for ($line=1;$line<=3;$line++) $sheetXml .= '<mergeCell ref="A'.$line.':'.self::colLetter($maxCol-1).$line.'"/>';
      $sheetXml .= '</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;Cصفحه &amp;P از &amp;N</oddFooter></headerFooter>';
    }
    if ($this->images) $sheetXml .= '<drawing r:id="rIdDrawing1"/>';
    if ($this->comments) $sheetXml .= '<legacyDrawing r:id="rIdComments"/>';
    $sheetXml .= '</worksheet>';
    $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

    if ($this->comments) {
      $notes=''; $vml=''; $shape=1024;
      foreach ($this->comments as $ri=>$cells) foreach($cells as $ci=>$body){
        $ref=self::colLetter($ci).($ri+$headerRow+1);
        $notes.='<comment ref="'.$ref.'" authorId="0"><text><t xml:space="preserve">'.self::xmlEsc($body).'</t></text></comment>';
        $shape++;
        // Compact note boxes: keep a readable fixed width and size height to the explanation lines.
        $noteLines=substr_count((string)$body,"\\n")+1;
        $noteHeight=min(110,max(48,18*$noteLines+12));
        $vml.='<v:shape id="_x0000_s'.$shape.'" type="#_x0000_t202" style="position:absolute;visibility:hidden;width:205pt;height:'.$noteHeight.'pt;z-index:1" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:left"/></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:AutoFill>False</x:AutoFill><x:Row>'.($ri+$headerRow).'</x:Row><x:Column>'.$ci.'</x:Column></x:ClientData></v:shape>';
      }
      $zip->addFromString('xl/comments1.xml','<?xml version="1.0" encoding="UTF-8"?><comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><authors><author>خطیار</author></authors><commentList>'.$notes.'</commentList></comments>');
      $zip->addFromString('xl/drawings/comments.vml','<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>'.$vml.'</xml>');
    }
    if ($this->comments && !$this->images) $zip->addFromString('xl/worksheets/_rels/sheet1.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/comments.vml"/><Relationship Id="rIdNotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments1.xml"/></Relationships>');

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
